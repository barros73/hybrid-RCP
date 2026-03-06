import { IFileSystem, nodeFileSystem } from '../utils/filesystem';
import { BlockNode, Conflict, ParseResult, Connection } from '../types';
import { ParserFactory } from './factory';
import { GraphBuilder } from '../graph-builder';
import * as path from 'path';
import * as fs from 'fs';

// Directories to exclude from scanning — language-agnostic
const EXCLUDED_DIRS = ['.git', 'node_modules', 'target', 'dist', 'build', 'out', '.hybrid', '.gemini', 'obj', 'bin', 'debug', 'release'];

export class HybridManager {
    private fileSystem: IFileSystem;

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    // Parse workspace to find multiple entry points and merge them into a virtual root
    async parse(rootPath: string): Promise<ParseResult> {
        const entryPoints: string[] = [];

        // 1. Look for standard entry points
        const candidates = [
            'src/index.ts', 'src/index.js', 'src/app.ts', 'src/main.rs',
            'main.cpp', 'src/main.cpp', 'main.c', 'src/main.c',
            'main.go', 'cmd/main.go', 'main.py', 'app.py'
        ];

        for (const c of candidates) {
            const p = path.join(rootPath, c);
            if (await this.fileSystem.exists(p)) {
                entryPoints.push(p);
            }
        }

        // 2. Scan src/ and crates/ for any valid source files
        const searchDirs = ['src', 'crates'];
        for (const dirName of searchDirs) {
            const dirPath = path.join(rootPath, dirName);
            if (await this.fileSystem.exists(dirPath)) {
                const files = await this.deepScan(dirPath);
                for (const f of files) {
                    if (!entryPoints.includes(f)) entryPoints.push(f);
                }
            }
        }

        // 3. Fallback: Scan root for standalone source files
        const rootFiles = await fs.promises.readdir(rootPath, { withFileTypes: true });
        for (const item of rootFiles) {
            if (!item.isDirectory()) {
                const ext = path.extname(item.name).toLowerCase();
                if (['.rs', '.ts', '.js', '.py', '.c', '.cpp', '.h', '.hpp', '.go'].includes(ext)) {
                    const p = path.join(rootPath, item.name);
                    if (!entryPoints.includes(p)) entryPoints.push(p);
                }
            }
        }

        // Deduplicate
        const uniqueEntries = Array.from(new Set(entryPoints));

        // Create Virtual Root
        const virtualRoot: BlockNode = {
            id: 'workspace-root',
            name: 'Workspace (Hybrid)',
            type: 'folder',
            filePath: rootPath,
            startLine: 0,
            endLine: 0,
            children: [],
            imports: [],
            data: [],
            inputs: [],
            outputs: []
        };

        const allConflicts: Conflict[] = [];
        let allEdges: Connection[] = [];

        for (const entry of uniqueEntries) {
            try {
                const parser = ParserFactory.getParserForFile(entry, this.fileSystem);
                const result = await parser.parse(entry);

                // Add the project root (e.g., 'lib') as a child of the workspace
                virtualRoot.children.push(result.root);
                allConflicts.push(...result.conflicts);
            } catch (e) {
                // Silently skip unparseable files
            }
        }

        // 4. Build Global Graph (The Spatial Map)
        const builder = new GraphBuilder();
        const graph = builder.build(virtualRoot);
        allEdges = graph.edges;
        if (graph.conflicts) allConflicts.push(...graph.conflicts);

        return { root: virtualRoot, conflicts: allConflicts, edges: allEdges };
    }

    private async deepScan(dir: string): Promise<string[]> {
        const results: string[] = [];
        const items = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                if (!EXCLUDED_DIRS.includes(item.name)) {
                    results.push(...(await this.deepScan(fullPath)));
                }
            } else {
                const ext = path.extname(item.name).toLowerCase();
                if (['.rs', '.ts', '.js', '.py', '.go', '.cpp', '.c', '.hpp', '.h'].includes(ext)) {
                    results.push(fullPath);
                }
            }
        }
        return results;
    }
}

