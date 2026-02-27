/*
 * Hybrid-RCP - Visual & Semantic Code Orchestrator
 * Copyright 2026 Fabrizio Baroni
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { BlockNode, Conflict, ParseResult, IProjectParser } from './types';
import { IFileSystem, nodeFileSystem } from '../utils/filesystem';

export { IFileSystem }; // Re-export for compatibility if needed, or remove later

export class RustParser implements IProjectParser {
    private fileSystem: IFileSystem;
    private conflicts: Conflict[] = [];

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    private computeLogicHash(code: string): string {
        // Strip comments and normalize whitespace for "AST-like" stability
        const normalized = code
            .replace(/\/\/.*$/gm, '') // Remove single line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        return crypto.createHash('md5').update(normalized).digest('hex');
    }

    async parse(filePath: string): Promise<ParseResult> {
        this.conflicts = [];
        const content = await this.fileSystem.readFile(filePath);
        const name = path.basename(filePath, '.rs');
        const root = await this.parseString(content, name, filePath, 'core');
        return { root, conflicts: this.conflicts };
    }

    public async parseString(content: string, name: string, id: string, type: 'core' | 'file' | 'folder' | 'inline'): Promise<BlockNode> {
        const node = await this.parseStructure(content, name, id, type);
        return node;
    }

    public extractConstruct(content: string, constructName: string): string | null {
        // Search for struct or function with the given name
        const structRegex = new RegExp(`(pub\\s+)?struct\\s+(${constructName})\\s*\\{[\\s\\S]*?\\}`, 'g');
        const fnRegex = new RegExp(`(pub\\s+)?fn\\s+(${constructName})\\s*\\([^)]*\\)\\s*(->\\s*[^{]+)?\\s*\\{[\\s\\S]*?\\}`, 'g');

        const structMatch = structRegex.exec(content);
        if (structMatch) return structMatch[0];

        const fnMatch = fnRegex.exec(content);
        if (fnMatch) return fnMatch[0];

        return null;
    }

    private async parseFile(filePath: string, name: string, type: 'core' | 'file' | 'folder' | 'inline'): Promise<BlockNode> {
        if (!await this.fileSystem.exists(filePath)) {
            this.conflicts.push({
                id: `missing-file-${filePath}`,
                description: `File not found: ${filePath}`,
                location: { file: filePath, line: 0 },
                severity: 'error',
                category: 'missing-file',
                suggestedFix: `Create file at ${filePath} or remove 'mod ${name};' declaration.`
            });
            return {
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
        }

        const content = await this.fileSystem.readFile(filePath);
        return this.parseStructure(content, name, filePath, type);
    }

    private async parseStructure(content: string, name: string, id: string, type: 'core' | 'file' | 'folder' | 'inline'): Promise<BlockNode> {
        const filePath = id.includes('#') ? id.split('#')[0] : id;
        const node: BlockNode = {
            id: id,
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
            const structRegex = /(pub\s+)?struct\s+(\w+)\s*\{([\s\S]*?)\}/g;
            let structMatch;
            while ((structMatch = structRegex.exec(content)) !== null) {
                node.data?.push({
                    name: structMatch[2],
                    isPublic: !!structMatch[1],
                    type: 'struct',
                    logicHash: this.computeLogicHash(structMatch[0])
                });
            }

            // 3. Detect Functions (Outputs - Capabilities)
            // Regex captures: 1=pub, 2=name, 3=args, 4=return_type, 5=body
            const fnRegex = /(pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)\s*(->\s*[^{]+)?\s*\{([\s\S]*?)\}/g;
            let fnMatch;
            while ((fnMatch = fnRegex.exec(content)) !== null) {
                const isPublic = !!fnMatch[1];
                const fnName = fnMatch[2];
                const args = fnMatch[3];
                const isMutable = args.includes('&mut self');
                const isReference = args.includes('&self');

                node.outputs?.push({
                    name: fnName,
                    type: isPublic ? 'pub fn' : 'fn',
                    args: args,
                    isMutable: isMutable,
                    isReference: isReference,
                    logicHash: this.computeLogicHash(fnMatch[0])
                });
            }

            // File-level logic hash
            node.logicHash = this.computeLogicHash(content);

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
