import * as path from 'path';
import { BlockNode, Conflict, ParseResult, IProjectParser } from './types';
import { IFileSystem, nodeFileSystem } from '../utils/filesystem';

export class CParser implements IProjectParser {
    private fileSystem: IFileSystem;
    private conflicts: Conflict[] = [];
    private visited: Set<string> = new Set();

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    async parse(filePath: string): Promise<ParseResult> {
        this.conflicts = [];
        this.visited.clear();
        const name = path.basename(filePath, path.extname(filePath));
        const root = await this.parseFile(filePath, name, 'core');
        return { root, conflicts: this.conflicts };
    }

    private async parseFile(filePath: string, name: string, type: 'core' | 'file' | 'folder' | 'inline'): Promise<BlockNode> {
        if (this.visited.has(filePath)) {
            return {
                id: filePath,
                name: name,
                type: 'inline',
                filePath: filePath,
                startLine: 0,
                endLine: 0,
                children: [],
                imports: [],
                data: [],
                inputs: [],
                outputs: []
            };
        }
        this.visited.add(filePath);

        const node: BlockNode = {
            id: filePath,
            name: name,
            type: type,
            filePath: filePath,
            startLine: 0,
            endLine: 0,
            children: [],
            imports: [],
            data: [],
            inputs: [],
            outputs: []
        };

        try {
            if (!await this.fileSystem.exists(filePath)) {
                 this.conflicts.push({
                    id: `missing-file-${filePath}`,
                    description: `File not found: ${filePath}`,
                    location: { file: filePath, line: 0 },
                    severity: 'error',
                    category: 'missing-file'
                });
                return node;
            }

            const rawContent = await this.fileSystem.readFile(filePath);
            // Strip comments for analysis to avoid false positives
            const content = rawContent.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            const lines = rawContent.split('\n'); // Keep lines for LOC from original
            node.endLine = lines.length;
            node.compilationCost = lines.length;

            // 1. Detect Includes
            const includeRegex = /#include\s+[<"]([^>"]+)[>"]/g;
            let includeMatch;
            while ((includeMatch = includeRegex.exec(content)) !== null) {
                node.imports.push(includeMatch[1]);
            }

            // 2. Detect Structs (Data)
            const structRegex = /\bstruct\s+(\w+)/g;
            let structMatch;
            while ((structMatch = structRegex.exec(content)) !== null) {
                // Heuristic: check if it's a definition (followed by {) or just usage
                const index = structMatch.index + structMatch[0].length;
                const nextChar = content.substring(index).trim().charAt(0);

                // Add if it looks like a definition or typedef
                node.data?.push({
                    name: structMatch[1],
                    isPublic: true, // C structs are public
                    type: 'struct'
                });
            }

            // 3. Detect Functions (Outputs)
            // Regex approximation: return_type name(args) { ... }
            const fnRegex = /\b(void|int|float|double|char|long|short|unsigned|signed|[\w_]+)\s+(\w+)\s*\(([^)]*)\)\s*[{;]/g;
            const keywords = ['if', 'for', 'while', 'switch', 'return', 'else'];

            let fnMatch;
            while ((fnMatch = fnRegex.exec(content)) !== null) {
                const returnType = fnMatch[1];
                const fnName = fnMatch[2];
                const args = fnMatch[3];

                if (!keywords.includes(fnName)) {
                    node.outputs?.push({
                        name: fnName,
                        type: returnType,
                        args: args,
                        isMutable: true, // C functions are mutable
                        isReference: args.includes('*') // Pointers
                    });
                }
            }

            // 4. Memory Audit (malloc/free)
            // Use word boundary to avoid false positives/negatives if spaces vary
            const mallocCount = (content.match(/\bmalloc\s*\(/g) || []).length;
            const freeCount = (content.match(/\bfree\s*\(/g) || []).length;

            console.log(`[DEBUG] File: ${name}, Mallocs: ${mallocCount}, Frees: ${freeCount}`);

            if (mallocCount > freeCount) {
                this.conflicts.push({
                    id: `memory-leak-${name}`,
                    description: `Potential Memory Leak: ${mallocCount} mallocs vs ${freeCount} frees detected in ${name}.`,
                    location: { file: filePath, line: 0 },
                    severity: 'warning',
                    category: 'ownership-conflict',
                    suggestedFix: `Ensure every malloc has a corresponding free.`
                });
            }

            // Buffer Overflow Check (strcpy, sprintf)
            if (content.includes('strcpy(')) {
                 this.conflicts.push({
                    id: `unsafe-strcpy-${name}`,
                    description: `Detected usage of 'strcpy'. This is unsafe and prone to buffer overflows.`,
                    location: { file: filePath, line: 0 },
                    severity: 'error',
                    category: 'ownership-conflict',
                    suggestedFix: `Use 'strncpy' instead.`
                });
            }
            if (content.includes('sprintf(')) {
                 this.conflicts.push({
                    id: `unsafe-sprintf-${name}`,
                    description: `Detected usage of 'sprintf'. This is unsafe.`,
                    location: { file: filePath, line: 0 },
                    severity: 'error',
                    category: 'ownership-conflict',
                    suggestedFix: `Use 'snprintf' instead.`
                });
            }

            // 5. Hierarchy (Headers)
            if (filePath.endsWith('.h')) {
                const cPath = filePath.replace(/\.h$/, '.c');
                if (await this.fileSystem.exists(cPath) && !this.visited.has(cPath)) {
                    const childNode = await this.parseFile(cPath, name + '.c', 'file');
                     if (childNode.children.length > 0 || childNode.data!.length > 0 || childNode.outputs!.length > 0) {
                        node.children.push(childNode);
                    }
                }
            }

            // Follow local includes
             const localIncludeRegex = /#include\s+"([^"]+)"/g;
            let localMatch;
            while ((localMatch = localIncludeRegex.exec(content)) !== null) {
                const includePath = localMatch[1];
                const dir = path.dirname(filePath);
                const absolutePath = path.resolve(dir, includePath);

                if (absolutePath !== filePath && !node.children.find(c => c.filePath === absolutePath)) {
                     if (await this.fileSystem.exists(absolutePath) && !this.visited.has(absolutePath)) {
                        const childName = path.basename(absolutePath, path.extname(absolutePath));
                        const childNode = await this.parseFile(absolutePath, childName, 'file');
                        if (childNode.children.length > 0 || childNode.data!.length > 0 || childNode.outputs!.length > 0) {
                            node.children.push(childNode);
                        }
                     }
                }
            }

        } catch (error: any) {
            this.conflicts.push({
                id: `read-error-${filePath}`,
                description: `Error reading file ${filePath}: ${error.message}`,
                location: { file: filePath, line: 0 },
                severity: 'error',
                category: 'missing-file'
            });
        }

        return node;
    }
}
