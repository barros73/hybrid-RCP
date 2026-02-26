import * as path from 'path';
import { BlockNode, Conflict, ParseResult, IProjectParser } from './types';
import { IFileSystem, nodeFileSystem } from '../utils/filesystem';

export class JavascriptParser implements IProjectParser {
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

            const content = await this.fileSystem.readFile(filePath);
            const lines = content.split('\n');
            node.endLine = lines.length;
            node.compilationCost = lines.length;

            // 1. Detect Imports (ESM / CommonJS)
            // import ... from '...'
            const esmImportRegex = /^import\s+.*\s+from\s+['"]([^'"]+)['"]/gm;
            let esmMatch;
            while ((esmMatch = esmImportRegex.exec(content)) !== null) {
                node.imports.push(esmMatch[1]);
            }

            // require('...')
            const cjsRequireRegex = /require\(['"]([^'"]+)['"]\)/g;
            let cjsMatch;
            while ((cjsMatch = cjsRequireRegex.exec(content)) !== null) {
                node.imports.push(cjsMatch[1]);
            }

            // 2. Detect Classes (Data)
            const classRegex = /^class\s+(\w+)/gm;
            let classMatch;
            while ((classMatch = classRegex.exec(content)) !== null) {
                node.data?.push({
                    name: classMatch[1],
                    isPublic: true, // Assuming exports for now, heuristic
                    type: 'class'
                });
            }

            // 3. Detect Functions (Outputs)
            const fnRegex = /^function\s+(\w+)\s*\(([^)]*)\)/gm;
            let fnMatch;
            while ((fnMatch = fnRegex.exec(content)) !== null) {
                const fnName = fnMatch[1];
                const args = fnMatch[2];
                node.outputs?.push({
                    name: fnName,
                    type: 'function',
                    args: args,
                    isMutable: true,
                    isReference: true // Objects in JS
                });
            }

            // Const/Let Functions: const foo = () => ...
            const arrowFnRegex = /const\s+(\w+)\s*=\s*(\([^)]*\)|[\w]+)\s*=>/gm;
            let arrowMatch;
            while ((arrowMatch = arrowFnRegex.exec(content)) !== null) {
                node.outputs?.push({
                    name: arrowMatch[1],
                    type: 'arrow-function',
                    args: arrowMatch[2],
                    isMutable: true,
                    isReference: true
                });
            }

            // 4. Async/Await & Var usage
            if (content.includes('async function') || content.includes('await ')) {
                 // Check for try/catch inside async functions?
                 // Heuristic: check if 'await' is used but no 'try' or '.catch'
                 // This is simplistic regex but good for MVP
            }

            const varCount = (content.match(/\bvar\s+\w+/g) || []).length;
            if (varCount > 0) {
                 this.conflicts.push({
                    id: `var-usage-${name}`,
                    description: `Detected 'var' usage (${varCount} times). Prefer 'const' or 'let' for block scoping.`,
                    location: { file: filePath, line: 0 },
                    severity: 'warning',
                    category: 'ownership-conflict',
                    suggestedFix: `Replace 'var' with 'const' or 'let'.`
                });
            }

            // 5. Hierarchy (Local modules)
            for (const imp of node.imports) {
                if (imp.startsWith('./') || imp.startsWith('../')) {
                    const dir = path.dirname(filePath);
                    // Resolve relative path
                    // Try .js, .jsx, .ts, .tsx if generic
                    const extensions = ['.js', '.jsx', '.ts', '.tsx', ''];
                    let resolvedPath: string | undefined;

                    for (const ext of extensions) {
                        const candidate = path.resolve(dir, imp + ext);
                        if (await this.fileSystem.exists(candidate)) {
                            resolvedPath = candidate;
                            break;
                        }
                    }

                    if (resolvedPath && !this.visited.has(resolvedPath)) {
                        const childName = path.basename(resolvedPath, path.extname(resolvedPath));
                        const childNode = await this.parseFile(resolvedPath, childName, 'file');
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
