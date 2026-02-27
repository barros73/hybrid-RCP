import { JavascriptParser } from './src/parsers/js-parser';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running JS Parser Test...');
    const mainPath = path.join(process.cwd(), 'test-workspace-js', 'app.js');

    console.log(`Parsing: ${mainPath}`);
    const parser = new JavascriptParser(nodeFileSystem);

    try {
        const result = await parser.parse(mainPath);
        const root = result.root;

        // 1. Check Imports (require)
        if (root.imports.includes('express')) {
             console.log('✅ Found express import.');
        } else {
             console.error('❌ FAILED: Missing express import.');
        }

        // 2. Check Classes
        if (root.data && root.data.some(d => d.name === 'Service')) {
             console.log('✅ Found class Service.');
        } else {
             console.error('❌ FAILED: Missing class Service.');
        }

        // 3. Check Functions
        if (root.outputs && root.outputs.some(f => f.name === 'startServer')) {
             console.log('✅ Found function startServer.');
        } else {
             console.error('❌ FAILED: Missing function startServer.');
        }

        // 4. Check Conflicts (var usage)
        const conflict = result.conflicts.find(c => c.id.startsWith('var-usage'));
        if (conflict) {
            console.log('✅ Detected var usage.');
        } else {
            console.error('❌ FAILED: Missing var detection.');
        }

    } catch (err) {
        console.error('Test error:', err);
    }
}

runTest();
