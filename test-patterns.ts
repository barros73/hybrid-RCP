
import { HybridManager } from './src/parsers/hybrid-manager';
import { PatternAnalyzer } from './src/analyzers/pattern-analyzer';
import { GlobalConflictAnalyzer } from './src/analyzers/global-conflict-analyzer';
import { GraphBuilder } from './src/graph-builder';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running Pattern Analyzer Test...');
    const rootPath = path.join(process.cwd(), 'test-workspace-patterns');

    // 1. Parse
    const manager = new HybridManager(nodeFileSystem);
    const result = await manager.parse(rootPath);

    // 2. Build Graph
    const builder = new GraphBuilder();
    const graph = builder.build(result.root);

    // 3. Analyze Patterns
    const patternAnalyzer = new PatternAnalyzer(nodeFileSystem);
    const patterns = await patternAnalyzer.analyze(graph);

    // 4. Analyze Global (Dead Code)
    const globals = GlobalConflictAnalyzer.analyze(graph);

    console.log(`\nFound ${patterns.length} pattern conflicts.`);
    console.log(`Found ${globals.length} global conflicts.`);

    // Check Secret
    if (patterns.some(c => c.id.includes('hardcoded-secret'))) {
        console.log('✅ Detected hardcoded secret.');
    } else {
        console.error('❌ FAILED: Missing secret detection.');
    }

    // Check Console Log
    if (patterns.some(c => c.id.includes('console-log'))) {
        console.log('✅ Detected console.log.');
    } else {
        console.error('❌ FAILED: Missing console.log detection.');
    }

    // Check TODOs
    if (patterns.some(c => c.id.includes('excessive-todos'))) {
        console.log('✅ Detected excessive TODOs.');
    } else {
        console.error('❌ FAILED: Missing TODO detection.');
    }

    // Check Dead Code
    if (globals.some(c => c.id.includes('dead-code-unused'))) {
        console.log('✅ Detected dead code (unused module).');
    } else {
        console.error('❌ FAILED: Missing dead code detection.');
    }
}

runTest();
