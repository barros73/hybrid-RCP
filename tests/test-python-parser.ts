import { PythonParser } from './src/parsers/python-parser';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running Python Parser Test...');
    const mainPath = path.join(process.cwd(), 'test-workspace-python', 'main.py');

    console.log(`Parsing: ${mainPath}`);
    const parser = new PythonParser(nodeFileSystem);

    try {
        const result = await parser.parse(mainPath);

        console.log('\n--- Parser Result ---');
        console.log(`Found ${result.root.children.length} direct children.`);
        console.log(`Found ${result.conflicts.length} conflicts.`);

        const root = result.root;

        // main.py should have child math_lib (from import math_lib)
        const mathNode = root.children.find(c => c.name === 'math_lib');
        if (mathNode) {
            console.log('✅ Found math_lib module (from import).');

            // math_lib.py should define class Math
            if (mathNode.data && mathNode.data.some(d => d.name === 'Math' && d.type === 'class')) {
                 console.log('✅ Found class Math in math_lib.');
            } else {
                 console.error('❌ FAILED: Missing class Math definition.');
            }

            // math_lib.py should have method add
             if (mathNode.outputs && mathNode.outputs.some(f => f.name === 'add')) {
                 console.log('✅ Found method add in math_lib.');
             } else {
                 console.error('❌ FAILED: Missing method add.');
             }

        } else {
            console.warn('⚠️  Missing math_lib module (Check import logic).');
        }

        // Check outputs/functions in main
        if (root.outputs && root.outputs.some(f => f.name === 'main')) {
             console.log('✅ Found main function.');
        } else {
             console.error('❌ FAILED: Missing main function.');
        }

    } catch (err) {
        console.error('Test error:', err);
    }
}

runTest();
