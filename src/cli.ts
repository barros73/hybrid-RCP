
import { RustParser, nodeFileSystem } from './rust-parser';
import { GraphBuilder } from './graph-builder';
import { BlockManager } from './block-manager';
import { CargoManager } from './cargo-manager';
import * as path from 'path';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage:');
        console.error('  Analyze: ts-node src/cli.ts analyze <path-to-lib.rs>');
        console.error('  Create:  ts-node src/cli.ts create <parent-file> <block-name> <type:file|folder>');
        process.exit(1);
    }

    const command = args[0];

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
        const manager = new BlockManager(nodeFileSystem, cargoManager);
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
    if (command === 'analyze') {
        libPath = path.resolve(args[1]);
    } else {
        // Backward compatibility: if first arg is a path, treat as analyze
        libPath = path.resolve(args[0]);
    }

    console.log(`Analyzing: ${libPath}`);

    const parser = new RustParser(nodeFileSystem);

    try {
        // 1. Parse Modules
        const result = await parser.parse(libPath);

        if (result.conflicts.length > 0) {
            console.log(`\n⚠️  Found ${result.conflicts.length} parser conflicts:`);
            result.conflicts.forEach(c => console.log(`- [${c.severity}] ${c.description}`));
        }

        // 2. Build Graph
        const builder = new GraphBuilder();
        const graph = builder.build(result.root);

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

    } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

main();
