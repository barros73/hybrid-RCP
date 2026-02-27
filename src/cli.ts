#!/usr/bin/env node
/*
 * Hybrid-RCP - Visual & Semantic Code Orchestrator
 * Copyright 2026 Fabrizio Baroni
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
import * as fs from 'fs';

/**
 * Recursively walks through the directory, parsing all Rust files found.
 * 
 * @param dir The directory to scan.
 * @param nodes The collection of parsed nodes to populate.
 * @param parser The Rust parser instance.
 * @param progress Callback to report file processing.
 */
const walkProject = async (dir: string, nodes: any[], parser: any, progress?: (file: string) => void) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);

        // Skip common build and version control directories
        if (stats.isDirectory() && !['target', '.git', 'node_modules', '.hybrid'].includes(file)) {
            await walkProject(fullPath, nodes, parser, progress);
        } else if (file.endsWith('.rs')) {
            if (progress) progress(fullPath);
            try {
                // Parse the Rust file using the ecosystem's native parser
                const result = await parser.parse(fullPath);
                nodes.push({
                    id: fullPath,
                    type: result.root.type,
                    filePath: fullPath,
                    outputs: result.root.outputs,
                    data: result.root.data
                });
            } catch (e) {
                // Silently skip files that fail to parse (e.g., malformed Rust)
            }
        }
    }
};

async function main() {
    const args = process.argv.slice(2);
    const aiFormat = args.includes('--ai-format');

    if (args.length === 0) {
        console.error('Usage:');
        console.error('  Analyze: ts-node src/cli.ts analyze <path-to-lib.rs> [--ai-format]');
        console.error('  Create:  ts-node src/cli.ts create <parent-file> <block-name> <type:file|folder> [--ai-format]');
        console.error('  Lock:    ts-node src/cli.ts analyze-lock <path-to-Cargo.lock> [--ai-format]');
        console.error('  Export:  ts-node src/cli.ts export-structure <workspace-root> [--ai-format]');
        process.exit(1);
    }

    const command = args[0];

    // Command: analyze-lock
    if (command === 'analyze-lock') {
        const lockPath = path.resolve(args[1]);
        const cargoManager = new CargoManager(nodeFileSystem);

        if (!aiFormat) console.log(`Analyzing Cargo.lock at: ${lockPath}`);
        try {
            const depMap = await cargoManager.analyzeLockFile(lockPath);
            const conflicts = cargoManager.detectVersionConflicts(depMap);

            if (aiFormat) {
                console.log(JSON.stringify({
                    status: 'success',
                    dependencies: depMap.size,
                    conflicts: conflicts.map(c => ({ severity: c.severity, msg: c.description }))
                }));
            } else {
                console.log(`\n📦 Found ${depMap.size} unique dependencies.`);
                if (conflicts.length > 0) {
                    console.log(`\n⚠️  Found ${conflicts.length} version conflicts:`);
                    conflicts.forEach(c => {
                        console.log(`- [${c.severity.toUpperCase()}] ${c.description}`);
                        if (c.suggestedFix) console.log(`  💡 Fix: ${c.suggestedFix}`);
                    });
                } else {
                    console.log('✅ No version conflicts detected.');
                }
            }
        } catch (err: any) {
            if (aiFormat) console.log(JSON.stringify({ error: err.message }));
            else console.error(`Error analyzing lock file: ${err.message}`);
        }
        return;
    }

    // Command: create
    if (command === 'create') {
        if (args.length < 4) {
            console.error('Usage: create <parent-file> <block-name> <type:file|folder>');
            process.exit(1);
        }
        const parentPath = path.resolve(args[1]);
        const blockName = args[2];
        const type = args[3] as 'file' | 'folder';

        const cargoManager = new CargoManager(nodeFileSystem);
        const manager = new BlockManager(nodeFileSystem, cargoManager, consoleUI);
        try {
            const newPath = await manager.createBlock(parentPath, blockName, type);
            if (aiFormat) console.log(JSON.stringify({ status: 'success', path: newPath }));
            else console.log(`✅ Block '${blockName}' created successfully at: ${newPath}`);
        } catch (err: any) {
            if (aiFormat) console.log(JSON.stringify({ error: err.message }));
            else console.error(`❌ Error creating block: ${err.message}`);
            process.exit(1);
        }
        return;
    }

    // Command: export-structure
    if (command === 'export-structure') {
        const rootPath = path.resolve(args[1] || process.cwd());
        if (!aiFormat) console.log(`🚀 Hybrid RCP: Exporting high-resolution structure for ${rootPath}...`);

        const RustParser = require('./parsers/rust-parser').RustParser;
        const parser = new RustParser(nodeFileSystem);
        const nodes: any[] = [];
        let count = 0;

        try {
            await walkProject(rootPath, nodes, parser, (file) => {
                count++;
                if (!aiFormat && count % 10 === 0) {
                    process.stdout.write(`\r🔍 Scanned ${count} Rust files...`);
                }
            });
            if (!aiFormat) process.stdout.write(`\n`);

            const structure = {
                project: path.basename(rootPath),
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                nodes: nodes,
                edges: []
            };

            const hybridDir = path.join(rootPath, '.hybrid');
            if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir);

            const outputPath = path.join(hybridDir, 'hybrid-rcp.json');
            fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));

            if (aiFormat) {
                console.log(JSON.stringify({ status: 'success', nodes: nodes.length, path: outputPath }));
            } else {
                const reportOutput = `
--- HYBRID RCP EXPORT REPORT ---
✅ Exported ${nodes.length} nodes
📂 Path: ${outputPath}
🕒 Timestamp: ${structure.timestamp}
--------------------------------
`;
                console.log(reportOutput);
                const logPath = path.join(hybridDir, 'rcp-report.log');
                const timestampedOutput = `[${new Date().toISOString()}]\n${reportOutput.trim()}\n\n`;
                fs.appendFileSync(logPath, timestampedOutput);
                console.log(`Report appended at: ${logPath}`);
            }
        } catch (err: any) {
            if (aiFormat) console.log(JSON.stringify({ error: err.message }));
            else console.error(`❌ Error exporting structure: ${err.message}`);
            process.exit(1);
        }
        return;
    }

    // Default: analyze
    // Per-file structural analysis (backward compatibility)
    let libPath: string;
    let maxDepth = Infinity;

    if (command === 'analyze') {
        libPath = path.resolve(args[1]);
        if (args[2] === '--depth') {
            maxDepth = parseInt(args[3], 10) || Infinity;
        }
    } else {
        // Fallback: treat first argument as path if no explicit command
        libPath = path.resolve(args[0]);
        if (args[1] === '--depth') {
            maxDepth = parseInt(args[2], 10) || Infinity;
        }
    }

    console.log(`Analyzing: ${libPath} (Depth: ${maxDepth === Infinity ? 'Full' : maxDepth})`);

    try {
        const parser = ParserFactory.getParserForFile(libPath, nodeFileSystem);

        // 1. Parse individual modules
        const result = await parser.parse(libPath);

        if (result.conflicts.length > 0) {
            console.log(`\n⚠️  Found ${result.conflicts.length} parser conflicts:`);
            result.conflicts.forEach(c => console.log(`- [${c.severity}] ${c.description}`));
        }

        // 2. Build the graph representation
        const builder = new GraphBuilder();
        const graph = builder.build(result.root, maxDepth);

        // 3. Perform Global and Pattern analysis
        const globalConflicts = GlobalConflictAnalyzer.analyze(graph);
        const patternAnalyzer = new PatternAnalyzer(nodeFileSystem);
        const patternConflicts = await patternAnalyzer.analyze(graph);

        const allExtras = [...globalConflicts, ...patternConflicts];

        if (graph.conflicts) {
            graph.conflicts.push(...allExtras);
        } else {
            graph.conflicts = allExtras;
        }

        // Output results to console
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

        // Generate AI Context markdown if requested
        if (args.includes('--context')) {
            const context = AiContextGenerator.generate(graph, path.basename(libPath));
            const contextPath = path.join(path.dirname(libPath), 'project-context.md');
            await nodeFileSystem.writeFile(contextPath, context);
            if (!aiFormat) console.log(`\n📄 Generated AI Context at: ${contextPath}`);
        }

        if (aiFormat) {
            console.log(JSON.stringify(graph));
        }

    } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

// Start the CLI application
main();
