import { CppParser } from './src/parsers/cpp-parser';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running C++ Parser Test...');
    const mainPath = path.join(process.cwd(), 'test-workspace-cpp', 'main.cpp');

    console.log(`Parsing: ${mainPath}`);
    const parser = new CppParser(nodeFileSystem);

    try {
        const result = await parser.parse(mainPath);

        console.log('\n--- Parser Result ---');
        console.log(`Found ${result.root.children.length} direct children.`);
        console.log(`Found ${result.conflicts.length} conflicts.`);

        const root = result.root;
        // main.cpp should have child math (from include "math.hpp")
        // math.hpp should have child math.cpp (implementation)

        // Debug prints
        // console.log(JSON.stringify(root, null, 2));

        const mathNode = root.children.find(c => c.name === 'math');
        if (mathNode) {
            console.log('✅ Found math module (from #include "math.hpp").');

            // math.hpp should define class Math
            if (mathNode.data && mathNode.data.some(d => d.name === 'Math' && d.type === 'class')) {
                 console.log('✅ Found class Math in math.hpp.');
            } else {
                 console.error('❌ FAILED: Missing class Math definition.');
            }

            // math.hpp should have math.cpp as child
             const mathImpl = mathNode.children.find(c => c.name.includes('math.cpp'));
             if (mathImpl) {
                 console.log('✅ Found math.cpp implementation child.');
             } else {
                 console.warn('⚠️  Missing math.cpp implementation child (Optional, check logic).');
             }

        } else {
            console.error('❌ FAILED: Missing math module.');
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
