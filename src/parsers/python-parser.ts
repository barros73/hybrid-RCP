import * as path from 'path';
import { BlockNode, Conflict, ParseResult, IProjectParser } from './types';
import { IFileSystem, nodeFileSystem } from '../utils/filesystem';

export class PythonParser implements IProjectParser {
    private fileSystem: IFileSystem;
    private conflicts: Conflict[] = [];
    private visited: Set<string> = new Set();

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    async parse(filePath: string): Promise<ParseResult> {
        this.conflicts = [];
        this.visited.clear();
        const name = path.basename(filePath, '.py');
        const root = await this.parseFile(filePath, name, 'core');

        // Check for requirements.txt or pyproject.toml in root directory
        const dir = path.dirname(filePath);
        const hasReq = await this.fileSystem.exists(path.join(dir, 'requirements.txt'));
        const hasPyProj = await this.fileSystem.exists(path.join(dir, 'pyproject.toml'));

        if (!hasReq && !hasPyProj) {
             this.conflicts.push({
                id: `missing-dependencies-manifest`,
                description: `No requirements.txt or pyproject.toml found.`,
                location: { file: filePath, line: 0 },
                severity: 'warning',
                category: 'missing-file',
                suggestedFix: `Create requirements.txt or pyproject.toml.`
            });
        }

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

            // 1. Detect Imports
            // import module
            // from module import x
            const importRegex = /^(?:from|import)\s+([\w\.]+)/gm;
            let importMatch;
            while ((importMatch = importRegex.exec(content)) !== null) {
                node.imports.push(importMatch[1]);
            }

            // 2. Detect Classes (Data)
            const classRegex = /^\s*class\s+(\w+)(?:\(([^)]+)\))?:/gm;
            let classMatch;
            while ((classMatch = classRegex.exec(content)) !== null) {
                node.data?.push({
                    name: classMatch[1],
                    isPublic: !classMatch[1].startsWith('_'),
                    type: 'class'
                });
            }

            // 3. Detect Functions (Outputs)
            const fnRegex = /^\s*def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^{:]+))?:/gm;
            let fnMatch;
            while ((fnMatch = fnRegex.exec(content)) !== null) {
                const fnName = fnMatch[1];
                const args = fnMatch[2];
                const returnType = fnMatch[3] ? fnMatch[3].trim() : 'Any';

                node.outputs?.push({
                    name: fnName,
                    type: returnType,
                    args: args,
                    isMutable: true, // Python is mutable by default
                    isReference: true // Python is pass-by-object-reference
                });
            }

            // 4. Type Hinting Check
            if (!content.includes('typing') && !content.includes('->') && !content.includes(': List') && !content.includes(': Dict')) {
                // Heuristic check for lack of type hints
                // Only warn if file is substantial (> 10 lines)
                if (lines.length > 10) {
                     this.conflicts.push({
                        id: `missing-type-hints-${name}`,
                        description: `File ${name} appears to lack Type Hints.`,
                        location: { file: filePath, line: 0 },
                        severity: 'info',
                        category: 'ownership-conflict', // reusing category for code quality
                        suggestedFix: `Use 'typing' module and add type hints.`
                    });
                }
            }

            // 5. Hierarchy (Imports as Children)
            // If we import a local module, treat as child?
            // e.g. `from . import module` or `import module` where module.py exists locally.
            // Python imports are complex.
            // Simple logic: Scan imports. If import X matches local file X.py or X/__init__.py, parse it.

            for (const imp of node.imports) {
                // Handle relative imports (starts with .)
                let possiblePath = '';
                const dir = path.dirname(filePath);

                if (imp.startsWith('.')) {
                    // This is hard without full resolution logic.
                    // For MVP, just skip relative resolution or assume sibling.
                    continue;
                }

                // Try sibling file
                const siblingPath = path.join(dir, `${imp}.py`);
                const siblingDir = path.join(dir, imp, '__init__.py');

                let targetPath = '';
                if (await this.fileSystem.exists(siblingPath)) {
                    targetPath = siblingPath;
                } else if (await this.fileSystem.exists(siblingDir)) {
                    targetPath = siblingDir;
                }

                if (targetPath && !this.visited.has(targetPath)) {
                    const childName = path.basename(imp); // or logical name
                    const childNode = await this.parseFile(targetPath, childName, 'file');
                     if (childNode.children.length > 0 || childNode.data!.length > 0 || childNode.outputs!.length > 0) {
                        node.children.push(childNode);
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
