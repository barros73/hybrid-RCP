
import { ParserFactory } from './parsers/factory';
import { nodeFileSystem } from './utils/filesystem';
import { GraphBuilder } from './graph-builder';
import { BlockManager } from './block-manager';
import { CargoManager } from './cargo-manager';
import { AiContextGenerator } from './generators/ai-context-generator';
import { GlobalConflictAnalyzer } from './analyzers/global-conflict-analyzer';
import { PatternAnalyzer } from './analyzers/pattern-analyzer';
import { consoleUI } from './ui-interface';
import * as path from 'path';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage:');
        console.error('  Analyze: ts-node src/cli.ts analyze <path-to-lib.rs>');
        console.error('  Create:  ts-node src/cli.ts create <parent-file> <block-name> <type:file|folder>');
        console.error('  Lock:    ts-node src/cli.ts analyze-lock <path-to-Cargo.lock>');
        process.exit(1);
    }

    const command = args[0];

    if (command === 'analyze-lock') {
        const lockPath = path.resolve(args[1]);
        const cargoManager = new CargoManager(nodeFileSystem);

        console.log(`Analyzing Cargo.lock at: ${lockPath}`);
        try {
            const depMap = await cargoManager.analyzeLockFile(lockPath);
            const conflicts = cargoManager.detectVersionConflicts(depMap);

            console.log(`\n📦 Found ${depMap.size} unique dependencies.`);

            if (conflicts.length > 0) {
                console.log(`\n⚠️  Found ${conflicts.length} version conflicts:`);
                conflicts.forEach(c => {
                    console.log(`- [${c.severity.toUpperCase()}] ${c.description}`);
                    if (c.suggestedFix) {
                        console.log(`  💡 Fix: ${c.suggestedFix}`);
                    }
                });
            } else {
                console.log('✅ No version conflicts detected.');
            }
        } catch (err: any) {
            console.error(`Error analyzing lock file: ${err.message}`);
        }
        return;
    }

    if (command === 'create') {
        if (args.length < 4) {
            console.error('Usage: create <parent-file> <block-name> <type:file|folder>');
            process.exit(1);
        }
        const parentPath = path.resolve(args[1]);
        const blockName = args[2];
        const type = args[3] as 'file' | 'folder';

        if (type !== 'file' && type !== 'folder') {
            console.error('Type must be "file" or "folder"');
            process.exit(1);
        }

        const cargoManager = new CargoManager(nodeFileSystem);
        const manager = new BlockManager(nodeFileSystem, cargoManager, consoleUI);
        try {
            const newPath = await manager.createBlock(parentPath, blockName, type);
            console.log(`✅ Block '${blockName}' created successfully at: ${newPath}`);
        } catch (err: any) {
            console.error(`❌ Error creating block: ${err.message}`);
            process.exit(1);
        }
        return;
    }

    // Default to 'analyze' if no command or explicit 'analyze'
    let libPath: string;
    let maxDepth = Infinity;

    if (command === 'analyze') {
        libPath = path.resolve(args[1]);
        if (args[2] === '--depth') {
            maxDepth = parseInt(args[3], 10) || Infinity;
        }
    } else {
        // Backward compatibility: if first arg is a path, treat as analyze
        libPath = path.resolve(args[0]);
        if (args[1] === '--depth') {
            maxDepth = parseInt(args[2], 10) || Infinity;
        }
    }

    console.log(`Analyzing: ${libPath} (Depth: ${maxDepth === Infinity ? 'Full' : maxDepth})`);

    try {
        const parser = ParserFactory.getParserForFile(libPath, nodeFileSystem);
        // 1. Parse Modules
        const result = await parser.parse(libPath);

        if (result.conflicts.length > 0) {
            console.log(`\n⚠️  Found ${result.conflicts.length} parser conflicts:`);
            result.conflicts.forEach(c => console.log(`- [${c.severity}] ${c.description}`));
        }

        // 2. Build Graph
        const builder = new GraphBuilder();
        const graph = builder.build(result.root, maxDepth);

        // 2b. Global Analysis
        const globalConflicts = GlobalConflictAnalyzer.analyze(graph);

        // 2c. Pattern Analysis
        const patternAnalyzer = new PatternAnalyzer(nodeFileSystem);
        const patternConflicts = await patternAnalyzer.analyze(graph);

        const allExtras = [...globalConflicts, ...patternConflicts];

        if (graph.conflicts) {
            graph.conflicts.push(...allExtras);
        } else {
            graph.conflicts = allExtras;
        }

        console.log('\n--- Block Graph ---');
        console.log(`Nodes: ${graph.nodes.length}`);
        console.log(`Edges: ${graph.edges.length}`);

        console.log('\nNodes:');
        graph.nodes.forEach(n => {
            console.log(`- [${n.type.toUpperCase()}] ${n.name} (Data: ${n.data?.length || 0}, APIs: ${n.outputs?.length || 0})`);
            if (n.data && n.data.length > 0) {
                n.data.forEach(d => console.log(`    Struct: ${d.name}`));
            }
            if (n.outputs && n.outputs.length > 0) {
                n.outputs.forEach(fn => console.log(`    Fn: ${fn.name} (${fn.isMutable ? 'mut' : 'immut'})`));
            }
        });

        console.log('\nEdges (Traffic Light):');
        graph.edges.forEach(e => {
            let color = '⚪';
            if (e.type === 'immutable') color = '🟢 (Green)';
            if (e.type === 'mutable') color = '🟡 (Yellow)';
            if (e.type === 'ownership') color = '🔵 (Owner)';
            if (e.type === 'conflict') color = '🔴 (Red)';

            console.log(`${color} ${e.from.split('/').pop()} -> ${e.to.split('/').pop()} : ${e.label}`);
        });

        if (graph.conflicts && graph.conflicts.length > 0) {
            console.log(`\n⚠️  Found ${graph.conflicts.length} structural conflicts:`);
            graph.conflicts.forEach(c => {
                console.log(`- [${c.severity.toUpperCase()}] ${c.description}`);
                if (c.suggestedFix) {
                    console.log(`  💡 Fix: ${c.suggestedFix}`);
                }
            });
        }

        // Generate Context
        if (args.includes('--context')) {
            const context = AiContextGenerator.generate(graph, path.basename(libPath));
            const contextPath = path.join(path.dirname(libPath), 'project-context.md');
            await nodeFileSystem.writeFile(contextPath, context);
            console.log(`\n📄 Generated AI Context at: ${contextPath}`);
        }

    } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

main();
