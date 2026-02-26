import * as path from 'path';
import { BlockNode, Conflict, ParseResult, IProjectParser } from './types';
import { IFileSystem, nodeFileSystem } from '../utils/filesystem';

export class CppParser implements IProjectParser {
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
            // Already visited, return a placeholder node or skip
            // To visualize cyclic dependency, we might want a special node type or just an edge.
            // But BlockNode requires structure.
            // Return empty node to stop recursion but indicate link?
            // Or better: Just skip adding as a child here. The graph builder will handle edges later if imports exist.
            // But for hierarchy, we need to stop.
            return {
                id: filePath,
                name: name,
                type: 'inline', // minimal type
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

            // 1. Detect Includes
            // #include <vector> or #include "myheader.h"
            const includeRegex = /#include\s+[<"]([^>"]+)[>"]/g;
            let includeMatch;
            while ((includeMatch = includeRegex.exec(content)) !== null) {
                node.imports.push(includeMatch[1]);
            }

            // 2. Detect Classes/Structs (Data)
            const classRegex = /\b(class|struct)\s+(\w+)/g;
            let classMatch;
            while ((classMatch = classRegex.exec(content)) !== null) {
                // Avoid forward declarations (heuristic: check if followed by ;)
                const index = classMatch.index + classMatch[0].length;
                const nextChar = content.substring(index).trim().charAt(0);
                if (nextChar !== ';') {
                     node.data?.push({
                        name: classMatch[2],
                        isPublic: true, // C++ default private, but struct public. Simplify for now.
                        type: classMatch[1]
                    });
                }
            }

            // 3. Detect Functions (Outputs)
            // Regex approximation: type name(args) { ... } or ;
            // This is hard in C++ without a real parser. We'll use a simplified heuristic.
            // Look for: Word Word(Args)
            // Avoiding control flow keywords like if, for, while, switch
            const fnRegex = /\b(void|int|float|double|char|bool|auto|[\w:]+)\s+(\w+)\s*\(([^)]*)\)\s*(const)?\s*[{;]/g;
            const keywords = ['if', 'for', 'while', 'switch', 'catch'];

            let fnMatch;
            while ((fnMatch = fnRegex.exec(content)) !== null) {
                const returnType = fnMatch[1];
                const fnName = fnMatch[2];
                const args = fnMatch[3];

                if (!keywords.includes(fnName)) {
                    node.outputs?.push({
                        name: fnName,
                        type: returnType, // Store return type in type field
                        args: args,
                        isMutable: !fnMatch[0].includes('const'), // naive const check
                        isReference: args.includes('&') || args.includes('*')
                    });
                }
            }

            // 4. Memory Audit (Raw Pointers)
            // Check for raw pointers `*` usage in args or return types, suggesting smart pointers
            // But `*` is also multiplication. We look for `Type * var` or `Type* var`
            const rawPointerRegex = /\b\w+\s*\*\s*\w+/g;
            let rawMatch;
            while ((rawMatch = rawPointerRegex.exec(content)) !== null) {
                // Filter out multiplication (heuristic: if inside function body, likely math, but harder to detect without scope)
                // We'll just look for it in function signatures (which we partly captured above) or just general warnings.
                // Better: Check imports for memory headers
            }

            // Check for smart pointers usage
            if (!content.includes('<memory>') && !content.includes('#include <memory>')) {
                 // If we see `new` or `delete`, suggest <memory>
                 if (content.includes('new ') || content.includes('delete ')) {
                      const lineIndex = content.split('new ')[0].split('\n').length; // very rough location
                      this.conflicts.push({
                        id: `raw-memory-${path.basename(filePath)}`,
                        description: `Detected manual memory management ('new'/'delete').`,
                        location: { file: filePath, line: lineIndex },
                        severity: 'warning',
                        category: 'ownership-conflict',
                        suggestedFix: `Use std::unique_ptr or std::shared_ptr and #include <memory>.`
                    });
                 }
            }

            // 5. Hierarchy / Project Structure
            // If this is a header file, try to find implementation
            if (filePath.endsWith('.hpp') || filePath.endsWith('.h')) {
                const cppPath = filePath.replace(/\.(hpp|h)$/, '.cpp');
                if (await this.fileSystem.exists(cppPath)) {
                    const childNode = await this.parseFile(cppPath, name + '.cpp', 'file');
                    // Add as child to represent implementation detail
                    node.children.push(childNode);
                } else {
                    // Header only? Valid.
                }
            }

            // If this is a main file (e.g. main.cpp), look for included local headers to treat as children/dependencies
            // Simple approach: if #include "foo.h", treat foo.h/foo.cpp as a child module or sibling?
            // In Rust, `mod foo` implies ownership/hierarchy. In C++, `#include` is just dependency.
            // But for visualization, we might want to show them.
            // Let's rely on imports list for graph edges, and file structure for hierarchy.
            // So if `src/foo.cpp` exists, and we scan `src/`, we should pick it up if we scan the folder.
            // BUT `parse(filePath)` starts from one file.
            // If we start at `main.cpp`, we can't easily discover the whole project unless we walk the directory or follow includes.
            // The Rust parser follows `mod` declarations. C++ doesn't have that.
            // Strategy: Scan the directory of the file for other C++ files if it's the root?
            // Or just follow local includes `#include "..."`.

            const localIncludeRegex = /#include\s+"([^"]+)"/g;
            let localMatch;
            while ((localMatch = localIncludeRegex.exec(content)) !== null) {
                const includePath = localMatch[1];
                const dir = path.dirname(filePath);
                const absolutePath = path.resolve(dir, includePath);

                // Avoid infinite recursion and cycles
                if (absolutePath !== filePath && !node.children.find(c => c.filePath === absolutePath)) {
                     if (await this.fileSystem.exists(absolutePath) && !this.visited.has(absolutePath)) {
                        const childName = path.basename(absolutePath, path.extname(absolutePath));
                        const childNode = await this.parseFile(absolutePath, childName, 'file');
                        // Only add non-empty nodes (if cycle was hit inside, it returns empty)
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
