import { IFileSystem, nodeFileSystem } from '../utils/filesystem';
import { BlockNode, Conflict, ParseResult } from '../types';
import { ParserFactory } from './factory';
import * as path from 'path';
import * as fs from 'fs';

export class HybridManager {
    private fileSystem: IFileSystem;

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    // Parse workspace to find multiple entry points and merge them into a virtual root
    async parse(rootPath: string): Promise<ParseResult> {
        const entryPoints: string[] = [];

        // JS/TS (Node/NPM)
        const packagePath = path.join(rootPath, 'package.json');
        if (await this.fileSystem.exists(packagePath)) {
            const indexTs = path.join(rootPath, 'src', 'index.ts');
            const indexJs = path.join(rootPath, 'src', 'index.js');
            const appTs = path.join(rootPath, 'src', 'app.ts');
            if (await this.fileSystem.exists(indexTs)) entryPoints.push(indexTs);
            else if (await this.fileSystem.exists(indexJs)) entryPoints.push(indexJs);
            else if (await this.fileSystem.exists(appTs)) entryPoints.push(appTs);
        }

        // Fallbacks if specific files exist (C++, C, Go, JS, Py)
        const candidates = [
            'main.cpp', 'src/main.cpp',
            'main.c', 'src/main.c',
            'file1.c', 'file2.c', // For testing
            'main.go', 'cmd/main.go',
            'index.js', 'src/index.js',
            'app.ts', 'src/app.ts',
            'main.py', 'app.py'
        ];

        for (const c of candidates) {
            const p = path.join(rootPath, c);
            if (await this.fileSystem.exists(p)) {
                if (!entryPoints.includes(p)) entryPoints.push(p);
            }
        }

        // DEEP REALITY CRAWLER: If still 0 nodes found, scan src/ for any valid source
        if (entryPoints.length === 0) {
            const srcDir = path.join(rootPath, 'src');
            if (await this.fileSystem.exists(srcDir)) {
                const files = await this.deepScan(srcDir);
                entryPoints.push(...files);
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

        for (const entry of uniqueEntries) {
            try {
                const parser = ParserFactory.getParserForFile(entry, this.fileSystem);
                const result = await parser.parse(entry);

                // Add the project root (e.g., 'lib') as a child of the workspace
                virtualRoot.children.push(result.root);

                // Merge conflicts
                allConflicts.push(...result.conflicts);
            } catch (e) {
                console.warn(`Skipping ${entry}:`, e);
            }
        }

        return { root: virtualRoot, conflicts: allConflicts };
    }

    private async deepScan(dir: string): Promise<string[]> {
        const results: string[] = [];
        const items = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'target') {
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
