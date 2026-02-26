import * as path from 'path';
import { BlockNode, Conflict, ParseResult, IProjectParser } from './types';
import { IFileSystem, nodeFileSystem } from '../utils/filesystem';

export class GoParser implements IProjectParser {
    private fileSystem: IFileSystem;
    private conflicts: Conflict[] = [];
    private visited: Set<string> = new Set();

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    async parse(filePath: string): Promise<ParseResult> {
        this.conflicts = [];
        this.visited.clear();
        // Go project structure: filePath usually points to main.go or a specific file
        const name = path.basename(filePath, '.go');
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

            // 1. Detect Package
            const packageRegex = /^package\s+(\w+)/m;
            const packageMatch = packageRegex.exec(content);
            if (packageMatch) {
                // If it's a main package, maybe we rename the node?
                // For now, keep file name but maybe note package
            }

            // 2. Detect Imports
            // import "fmt" or import ( ... )
            const importSingleRegex = /^import\s+"([^"]+)"/gm;
            let importMatch;
            while ((importMatch = importSingleRegex.exec(content)) !== null) {
                node.imports.push(importMatch[1]);
            }

            // Block imports (simple heuristic: grab everything inside import ( ... ))
            // This is hard with regex. We'll skip for MVP or use a simple line scanner
            // Simplified: scan lines for "..." inside import block
            let insideImport = false;
            for (const line of lines) {
                if (line.trim().startsWith('import (')) {
                    insideImport = true;
                    continue;
                }
                if (insideImport && line.trim().startsWith(')')) {
                    insideImport = false;
                    continue;
                }
                if (insideImport) {
                    const match = line.match(/"([^"]+)"/);
                    if (match) {
                        node.imports.push(match[1]);
                    }
                }
            }

            // 3. Detect Structs (Data)
            const structRegex = /type\s+(\w+)\s+struct/g;
            let structMatch;
            while ((structMatch = structRegex.exec(content)) !== null) {
                node.data?.push({
                    name: structMatch[1],
                    isPublic: /^[A-Z]/.test(structMatch[1]), // Go public/private rule
                    type: 'struct'
                });
            }

            // 4. Detect Interfaces
            const interfaceRegex = /type\s+(\w+)\s+interface/g;
            let ifaceMatch;
            while ((ifaceMatch = interfaceRegex.exec(content)) !== null) {
                node.data?.push({
                    name: ifaceMatch[1],
                    isPublic: /^[A-Z]/.test(ifaceMatch[1]),
                    type: 'interface'
                });
            }

            // 5. Detect Functions (Outputs)
            const fnRegex = /^func\s+(\w+)\s*\(([^)]*)\)/gm;
            let fnMatch;
            while ((fnMatch = fnRegex.exec(content)) !== null) {
                const fnName = fnMatch[1];
                const args = fnMatch[2];
                node.outputs?.push({
                    name: fnName,
                    type: 'func',
                    args: args,
                    isMutable: true,
                    isReference: args.includes('*') // Pointer receiver/arg
                });
            }

            // Methods: func (r *Receiver) Name(...)
            const methodRegex = /^func\s*\(([^)]+)\)\s+(\w+)\s*\(([^)]*)\)/gm;
            let methodMatch;
            while ((methodMatch = methodRegex.exec(content)) !== null) {
                const receiver = methodMatch[1];
                const fnName = methodMatch[2];
                const args = methodMatch[3];
                node.outputs?.push({
                    name: `${receiver}.${fnName}`, // method
                    type: 'method',
                    args: args,
                    isMutable: true,
                    isReference: receiver.includes('*')
                });
            }

            // 6. Concurrency Audit
            if (content.includes('go func')) {
                // Check for WaitGroup or Channel usage nearby? Hard.
                // Just flag usage.
                this.conflicts.push({
                    id: `goroutine-${name}`,
                    description: `Goroutine detected. Ensure proper termination using Context or WaitGroup to avoid leaks.`,
                    location: { file: filePath, line: 0 },
                    severity: 'info',
                    category: 'ownership-conflict',
                    suggestedFix: `Use 'sync.WaitGroup' or 'context.Context'.`
                });
            }

            if (content.includes('make(chan')) {
                 this.conflicts.push({
                    id: `channel-${name}`,
                    description: `Channel creation detected. Ensure buffered channels are used if appropriate to prevent deadlocks.`,
                    location: { file: filePath, line: 0 },
                    severity: 'info',
                    category: 'ownership-conflict'
                });
            }

            // 7. Hierarchy (Local packages?)
            // Go doesn't include files directly. It includes packages.
            // If main.go, scan the directory for other .go files?
            if (name === 'main' || filePath.endsWith('main.go')) {
                const dir = path.dirname(filePath);
                // In a real env, we'd list files in dir.
                // But IFileSystem only has readFile/exists.
                // We can't list files easily without adding listFiles to IFileSystem.
                // For MVP, we'll rely on explicit imports or just parsing the single file.
                // OR: Assume common file names if user provided a specific file.
                // Since we can't discover files, we stop here unless we update IFileSystem.
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
