import { GoParser } from './src/parsers/go-parser';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running Go Parser Test...');
    const mainPath = path.join(process.cwd(), 'test-workspace-go', 'main.go');

    console.log(`Parsing: ${mainPath}`);
    const parser = new GoParser(nodeFileSystem);

    try {
        const result = await parser.parse(mainPath);
        const root = result.root;

        // 1. Check Structs
        if (root.data && root.data.some(d => d.name === 'Data')) {
             console.log('✅ Found struct Data.');
        } else {
             console.error('❌ FAILED: Missing struct Data.');
        }

        // 2. Check Functions
        if (root.outputs && root.outputs.some(f => f.name === 'main')) {
             console.log('✅ Found main function.');
        } else {
             console.error('❌ FAILED: Missing main function.');
        }

        // 3. Check Conflicts (Goroutine)
        const conflict = result.conflicts.find(c => c.id.startsWith('goroutine'));
        if (conflict) {
            console.log('✅ Detected Goroutine usage.');
        } else {
            console.error('❌ FAILED: Missing goroutine detection.');
        }

    } catch (err) {
        console.error('Test error:', err);
    }
}

runTest();
