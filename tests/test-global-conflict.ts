
import { HybridManager } from './src/parsers/hybrid-manager';
import { GlobalConflictAnalyzer } from './src/analyzers/global-conflict-analyzer';
import { GraphBuilder } from './src/graph-builder';
import { nodeFileSystem } from './src/utils/filesystem';
import * as path from 'path';

async function runTest() {
    console.log('Running Global Conflict Test...');
    const rootPath = path.join(process.cwd(), 'test-workspace-global');

    // 1. Parse (Hybrid)
    const manager = new HybridManager(nodeFileSystem);
    const result = await manager.parse(rootPath);

    // 2. Build Graph
    const builder = new GraphBuilder();
    const graph = builder.build(result.root);

    // 3. Analyze Global
    const conflicts = GlobalConflictAnalyzer.analyze(graph);

    console.log(`\nFound ${conflicts.length} global conflicts.`);

    // Assertions
    const funcConflict = conflicts.find(c => c.id.includes('duplicate-function-common_func'));
    if (funcConflict) {
        console.log('✅ Detected duplicate function: common_func');
    } else {
        console.error('❌ FAILED: Missing duplicate function detection.');
    }

    const structConflict = conflicts.find(c => c.id.includes('duplicate-struct-Data'));
    if (structConflict) {
        console.log('✅ Detected duplicate struct: Data');
    } else {
        console.error('❌ FAILED: Missing duplicate struct detection.');
    }

    // Check main is ignored (common name)
    const mainConflict = conflicts.find(c => c.id.includes('duplicate-function-main'));
    if (!mainConflict) {
        console.log('✅ Ignored common name: main');
    } else {
        console.error('❌ FAILED: Flagged main as duplicate.');
    }
}

runTest();
