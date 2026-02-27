import { HybridManager } from './src/parsers/hybrid-manager';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running Hybrid Manager Test...');
    const rootPath = path.join(process.cwd(), 'test-workspace-hybrid');

    console.log(`Analyzing Workspace: ${rootPath}`);
    const manager = new HybridManager(nodeFileSystem);

    try {
        const result = await manager.parse(rootPath);
        const root = result.root;

        console.log(`Virtual Root: ${root.name}`);
        console.log(`Direct Children (Project Roots): ${root.children.length}`);

        // Check for Rust Project (src/main.rs)
        const rustNode = root.children.find(c => c.filePath?.endsWith('src/main.rs'));
        if (rustNode) {
            console.log('✅ Found Rust project root (main.rs).');
        } else {
            console.error('❌ FAILED: Missing Rust project.');
        }

        // Check for C++ Project (main.cpp)
        const cppNode = root.children.find(c => c.filePath?.endsWith('main.cpp'));
        if (cppNode) {
            console.log('✅ Found C++ project root (main.cpp).');
        } else {
            console.error('❌ FAILED: Missing C++ project.');
        }

    } catch (err) {
        console.error('Test error:', err);
    }
}

runTest();
