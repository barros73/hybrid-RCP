import { CParser } from '../src/parsers/c-parser';
import { nodeFileSystem } from '../src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running C Parser Test...');
    const mainPath = path.join(process.cwd(), 'tests', 'test-workspace-c', 'main.c');

    console.log(`Parsing: ${mainPath}`);
    const parser = new CParser(nodeFileSystem);

    try {
        const result = await parser.parse(mainPath);
        const root = result.root;

        console.log(`Children: ${root.children.length}`);
        console.log(`Conflicts: ${result.conflicts.length}`);

        // 1. Check Children (utils.c should be found via #include "utils.h")
        // Since utils.h is header, and logic looks for utils.c
        const utilsNode = root.children.find(c => c.name.includes('utils'));
        if (utilsNode) {
            console.log('✅ Found utils module.');
        } else {
             console.error('❌ FAILED: Missing utils module.');
        }

        // 2. Check Conflicts (malloc vs free)
        const leak = result.conflicts.find(c => c.id.startsWith('memory-leak'));
        if (leak) {
            console.log('✅ Detected Memory Leak (malloc without free).');
        } else {
            console.error('❌ FAILED: Missing memory leak detection.');
        }

    } catch (err) {
        console.error('Test error:', err);
    }
}

runTest();
