import { JavascriptParser } from './src/parsers/js-parser';
import { GraphBuilder } from './src/graph-builder';
import { AiContextGenerator } from './src/generators/ai-context-generator';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running AI Context Generator Test...');
    const mainPath = path.join(process.cwd(), 'test-workspace-context', 'main.ts');

    // 1. Parse
    const parser = new JavascriptParser(nodeFileSystem);
    const result = await parser.parse(mainPath);

    // 2. Build Graph
    const builder = new GraphBuilder();
    const graph = builder.build(result.root);

    // 3. Generate Context
    const context = AiContextGenerator.generate(graph, 'TestProject');

    console.log('\n--- Generated Context ---');
    console.log(context);

    // Assertions
    if (context.includes('AI Project Context: TestProject')) {
        console.log('✅ Title Correct');
    } else {
        console.error('❌ Title Missing');
    }

    if (context.includes('Module Contracts')) {
        console.log('✅ Module Contracts Section Present');
    } else {
        console.error('❌ Module Contracts Missing');
    }

    if (context.includes('run() -> arrow-function')) { // Parser detects arrow or function.
        // JS Parser output type for class method might be 'function' or 'arrow-function' depending on regex.
        // Let's check regex in js-parser.ts:
        // Class methods not explicitly captured yet?
        // Wait, `classRegex` only captures class name.
        // `fnRegex` captures `function name()`.
        // Methods inside class `run() {}` are tricky with simple regex.
        // Let's check js-parser.ts again.
    }
}

runTest();
