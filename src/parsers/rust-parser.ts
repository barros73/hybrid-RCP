import * as path from 'path';
import { BlockNode, Conflict, ParseResult, IProjectParser } from './types';
import { IFileSystem, nodeFileSystem } from '../utils/filesystem';

export { IFileSystem }; // Re-export for compatibility if needed, or remove later

export class RustParser implements IProjectParser {
    private fileSystem: IFileSystem;
    private conflicts: Conflict[] = [];

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    async parse(filePath: string): Promise<ParseResult> {
        this.conflicts = [];
        // Determine root name from file path (e.g. lib.rs -> lib, main.rs -> main)
        const name = path.basename(filePath, '.rs');
        const root = await this.parseFile(filePath, name, 'core');
        return { root, conflicts: this.conflicts };
    }

    private async parseFile(filePath: string, name: string, type: 'core' | 'file' | 'folder' | 'inline'): Promise<BlockNode> {
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
                    category: 'missing-file',
                    suggestedFix: `Create file at ${filePath} or remove 'mod ${name};' declaration.`
                });
                return node;
            }

            const content = await this.fileSystem.readFile(filePath);
            const lines = content.split('\n');
            node.endLine = lines.length;
            node.compilationCost = lines.length; // Approximate compilation cost using LOC

            // 1. Detect 'use' statements (simple regex)
            const useRegex = /use\s+([\w:{}]+);/g;
            let useMatch;
            while ((useMatch = useRegex.exec(content)) !== null) {
                node.imports.push(useMatch[1]);
            }

            // 2. Detect Structs (Block Data)
            const structRegex = /(pub\s+)?struct\s+(\w+)/g;
            let structMatch;
            while ((structMatch = structRegex.exec(content)) !== null) {
                node.data?.push({
                    name: structMatch[2],
                    isPublic: !!structMatch[1],
                    type: 'struct'
                });
            }

            // 3. Detect Functions (Outputs - Capabilities)
            // Regex captures: 1=pub, 2=name, 3=args, 4=return_type
            const fnRegex = /(pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)\s*(->\s*[^{]+)?/g;
            let fnMatch;
            while ((fnMatch = fnRegex.exec(content)) !== null) {
                const isPublic = !!fnMatch[1];
                const fnName = fnMatch[2];
                const args = fnMatch[3];
                // Check for self references in args
                const isMutable = args.includes('&mut self');
                const isReference = args.includes('&self');

                node.outputs?.push({
                    name: fnName,
                    type: isPublic ? 'pub fn' : 'fn',
                    args: args,
                    isMutable: isMutable,
                    isReference: isReference
                });
            }

            // 4. Detect basic Ownership Patterns (Heuristic)
            // Example: "static mut" is unsafe and a potential conflict source
            const staticMutRegex = /static\s+mut\s+(\w+)/g;
            let staticMatch;
            while ((staticMatch = staticMutRegex.exec(content)) !== null) {
                const varName = staticMatch[1];
                const lineIndex = content.substring(0, staticMatch.index).split('\n').length;
                this.conflicts.push({
                    id: `unsafe-static-mut-${varName}`,
                    description: `Detected 'static mut ${varName}'. This requires 'unsafe' blocks and is prone to data races.`,
                    location: { file: filePath, line: lineIndex },
                    severity: 'warning',
                    category: 'ownership-conflict',
                    suggestedFix: `Consider using 'lazy_static!' with 'Arc<Mutex<T>>' or 'RwLock<T>' for safe global mutable state.`
                });
            }

            // Detect existing Smart Pointers usage
            const smartPointerPatterns = [
                { pattern: /Arc\s*<\s*Mutex\s*</, name: 'Arc<Mutex>' },
                { pattern: /RwLock\s*</, name: 'RwLock' },
                { pattern: /RefCell\s*</, name: 'RefCell' }
            ];

            for (const sp of smartPointerPatterns) {
                if (sp.pattern.test(content)) {
                   // Just log for now, or maybe add to node info?
                   // For now we assume if they exist, the user is doing something right.
                }
            }

            // 5. Detect 'mod name;' (File modules)
            const modFileRegex = /mod\s+(\w+)\s*;/g;
            let match;
            while ((match = modFileRegex.exec(content)) !== null) {
                const modName = match[1];
                const lineIndex = content.substring(0, match.index).split('\n').length;

                // Determine potential file paths for the module
                const dir = path.dirname(filePath);
                const potentialPath1 = path.join(dir, `${modName}.rs`);
                const potentialPath2 = path.join(dir, modName, 'mod.rs');

                let foundPath = potentialPath1;
                let childType: 'file' | 'folder' = 'file';

                if (await this.fileSystem.exists(potentialPath1)) {
                    foundPath = potentialPath1;
                } else if (await this.fileSystem.exists(potentialPath2)) {
                    foundPath = potentialPath2;
                    childType = 'folder';
                } else {
                    // Start with potentialPath1 as default missing location
                    this.conflicts.push({
                        id: `missing-mod-${modName}`,
                        description: `Module file not found for 'mod ${modName};'.`,
                        location: { file: filePath, line: lineIndex },
                        severity: 'error',
                        category: 'missing-file',
                        suggestedFix: `Create '${modName}.rs' or '${modName}/mod.rs'.`
                    });
                }

                // Recursively parse even if missing (the child call will handle the "exists" check again and might return empty node)
                // But we only recurse if we found a path or want to show the missing structure
                const childNode = await this.parseFile(foundPath, modName, childType);
                childNode.startLine = lineIndex;
                node.children.push(childNode);
            }

            // 6. Detect 'mod name { ... }' (Inline modules)
            const modInlineRegex = /mod\s+(\w+)\s*\{/g;
            while ((match = modInlineRegex.exec(content)) !== null) {
                 const modName = match[1];
                 const lineIndex = content.substring(0, match.index).split('\n').length;

                 const childNode: BlockNode = {
                     id: `${filePath}#${modName}`,
                     name: modName,
                     type: 'inline',
                     filePath: filePath, // Inline modules reside in the same file
                     startLine: lineIndex,
                     endLine: lineIndex, // To be determined
                     compilationCost: 10, // Minimal cost for inline modules (placeholder)
                     children: [],
                     imports: [],
                     data: [],
                     inputs: [],
                     outputs: []
                 };
                 node.children.push(childNode);
            }

        } catch (error: any) {
            this.conflicts.push({
                id: `read-error-${filePath}`,
                description: `Error reading file ${filePath}: ${error.message}`,
                location: { file: filePath, line: 0 },
                severity: 'error',
                category: 'missing-file',
                suggestedFix: 'Check file permissions.'
            });
        }

        return node;
    }
}
