import { IFileSystem, nodeFileSystem } from '../utils/filesystem';
import { BlockNode, Conflict, ParseResult } from '../types';
import { ParserFactory } from './factory';
import * as path from 'path';

export class HybridManager {
    private fileSystem: IFileSystem;

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    // Parse workspace to find multiple entry points and merge them into a virtual root
    async parse(rootPath: string): Promise<ParseResult> {
        const entryPoints: string[] = [];

        // Rust
        const cargoPath = path.join(rootPath, 'Cargo.toml');
        if (await this.fileSystem.exists(cargoPath)) {
            const libPath = path.join(rootPath, 'src', 'lib.rs');
            const mainPath = path.join(rootPath, 'src', 'main.rs');
            if (await this.fileSystem.exists(libPath)) entryPoints.push(libPath);
            else if (await this.fileSystem.exists(mainPath)) entryPoints.push(mainPath);
        }

        // C++ (CMake)
        const cmakePath = path.join(rootPath, 'CMakeLists.txt');
        if (await this.fileSystem.exists(cmakePath)) {
            const mainCpp = path.join(rootPath, 'main.cpp');
            const srcMainCpp = path.join(rootPath, 'src', 'main.cpp');
            if (await this.fileSystem.exists(mainCpp)) entryPoints.push(mainCpp);
            else if (await this.fileSystem.exists(srcMainCpp)) entryPoints.push(srcMainCpp);
        }

        // Python
        const reqPath = path.join(rootPath, 'requirements.txt');
        const pyProjPath = path.join(rootPath, 'pyproject.toml');
        if (await this.fileSystem.exists(reqPath) || await this.fileSystem.exists(pyProjPath)) {
            const mainPy = path.join(rootPath, 'main.py');
            const appPy = path.join(rootPath, 'app.py');
            if (await this.fileSystem.exists(mainPy)) entryPoints.push(mainPy);
            else if (await this.fileSystem.exists(appPy)) entryPoints.push(appPy);
        }

        // Fallbacks if specific files exist (C++, C, Go, JS, Py)
        // Check main.cpp even if no CMakeLists.txt (Hybrid project might use Makefile or simple build)
        const candidates = [
            'main.cpp', 'src/main.cpp',
            'main.c', 'src/main.c',
            'main.go', 'cmd/main.go',
            'index.js', 'src/index.js',
            'main.py', 'app.py'
        ];

        for (const c of candidates) {
            const p = path.join(rootPath, c);
             if (await this.fileSystem.exists(p)) {
                 if (!entryPoints.includes(p)) entryPoints.push(p);
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
}
