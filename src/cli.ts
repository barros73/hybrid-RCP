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

import { Command } from 'commander';
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

const program = new Command();

program
    .name('hybrid-rcp')
    .description('Layer 3 of the Hybrid Ecosystem: Reality Check Procedure')
    .version('0.6.1');

program
    .option('--ai-format', 'Output in machine-readable JSON format');

function appendLog(cmd: string, message: string, workDir: string = process.cwd()): void {
    const hybridDir = path.join(workDir, '.hybrid');
    if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir, { recursive: true });
    const logPath = path.join(hybridDir, 'rcp-report.log');
    const timestampedOutput = `[${new Date().toISOString()}] COMMAND: ${cmd}\n${message.trim()}\n\n`;
    fs.appendFileSync(logPath, timestampedOutput);
}

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

        // Skip common build, version control, and temporary directories
        const ignoreDirs = ['target', '.git', 'node_modules', '.hybrid', '.gemini', 'dist', 'build', 'out'];
        if (stats.isDirectory() && !ignoreDirs.includes(file)) {
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
                    logicHash: result.root.logicHash,
                    outputs: result.root.outputs,
                    data: result.root.data
                });
            } catch (e) {
                // Silently skip files that fail to parse (e.g., malformed Rust)
            }
        }
    }
};

program
    .command('analyze-lock <lockPath>')
    .description('Analyze Cargo.lock for version conflicts')
    .action(async (lockPath) => {
        const options = program.opts();
        const fullLockPath = path.resolve(lockPath);
        const cargoManager = new CargoManager(nodeFileSystem);

        if (!options.aiFormat) console.log(`Analyzing Cargo.lock at: ${fullLockPath}`);
        try {
            const depMap = await cargoManager.analyzeLockFile(fullLockPath);
            const conflicts = cargoManager.detectVersionConflicts(depMap);

            if (options.aiFormat) {
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
            if (options.aiFormat) console.log(JSON.stringify({ error: err.message }));
            else console.error(`Error analyzing lock file: ${err.message}`);
        }
    });

program
    .command('create <parentFile> <blockName> <type>')
    .description('Create a new block')
    .action(async (parentFile, blockName, type) => {
        const options = program.opts();
        const parentPath = path.resolve(parentFile);
        if (type !== 'file' && type !== 'folder') {
            console.error('Error: type must be "file" or "folder"');
            process.exit(1);
        }

        const cargoManager = new CargoManager(nodeFileSystem);
        const manager = new BlockManager(nodeFileSystem, cargoManager, consoleUI);
        try {
            const newPath = await manager.createBlock(parentPath, blockName, type);
            if (options.aiFormat) console.log(JSON.stringify({ status: 'success', path: newPath }));
            else console.log(`✅ Block '${blockName}' created successfully at: ${newPath}`);
        } catch (err: any) {
            if (options.aiFormat) console.log(JSON.stringify({ error: err.message }));
            else console.error(`❌ Error creating block: ${err.message}`);
            process.exit(1);
        }
    });

program
    .command('export-structure [rootPath]')
    .description('Export high-resolution structure of the project')
    .action(async (rawRootPath) => {
        const options = program.opts();
        const rootPath = path.resolve(rawRootPath || process.cwd());
        if (!options.aiFormat) console.log(`🚀 Hybrid RCP: Exporting high-resolution structure for ${rootPath}...`);

        const { HybridManager } = require('./parsers/hybrid-manager');
        const hybridManager = new HybridManager(nodeFileSystem);

        try {
            const result = await hybridManager.parse(rootPath);
            const nodes: any[] = [];

            const flatten = (node: any) => {
                const flatNode = {
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    filePath: node.filePath,
                    logicHash: node.logicHash,
                    outputs: node.outputs,
                    data: node.data,
                    imports: node.imports || [],
                    tags: node.tags || []
                };
                nodes.push(flatNode);
                if (node.children) {
                    node.children.forEach((c: any) => flatten(c));
                }
            };

            // Flatten from virtual root children (skip virtual root itself if preferred, 
            // but usually we want the whole tree flattened)
            result.root.children.forEach((c: any) => flatten(c));

            const structure = {
                project: path.basename(rootPath),
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                nodes: nodes,
                edges: result.edges || [],
                conflicts: result.conflicts || []
            };

            const hybridDir = path.join(rootPath, '.hybrid');
            if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir, { recursive: true });

            const outputPath = path.join(hybridDir, 'hybrid-rcp.json');
            fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));

            if (options.aiFormat) {
                const out = JSON.stringify({ status: 'success', nodes: nodes.length, path: outputPath });
                console.log(out);
                appendLog('export-structure', out, rootPath);
            } else {
                const reportOutput = `
--- HYBRID RCP EXPORT REPORT ---
✅ Exported ${nodes.length} nodes
📂 Path: ${outputPath}
🕒 Timestamp: ${structure.timestamp}
--------------------------------
`;
                console.log(reportOutput);
                appendLog('export-structure', reportOutput, rootPath);
            }
        } catch (err: any) {
            if (options.aiFormat) console.log(JSON.stringify({ error: err.message }));
            else console.error(`❌ Error exporting structure: ${err.message}`);
            process.exit(1);
        }
    });

program
    .command('analyze <libPath>')
    .description('Per-file structural analysis')
    .option('-d, --depth <number>', 'Maximum depth for analysis', 'Infinity')
    .option('--context', 'Generate AI Context markdown')
    .action(async (libPath, cmdOptions) => {
        const options = program.opts();
        const fullLibPath = path.resolve(libPath);
        const maxDepth = cmdOptions.depth === 'Infinity' ? Infinity : parseInt(cmdOptions.depth, 10);

        if (!options.aiFormat) console.log(`Analyzing: ${fullLibPath} (Depth: ${maxDepth === Infinity ? 'Full' : maxDepth})`);

        try {
            const parser = ParserFactory.getParserForFile(fullLibPath, nodeFileSystem);
            const result = await parser.parse(fullLibPath);

            if (result.conflicts.length > 0 && !options.aiFormat) {
                console.log(`\n⚠️  Found ${result.conflicts.length} parser conflicts:`);
                result.conflicts.forEach(c => console.log(`- [${c.severity}] ${c.description}`));
            }

            const builder = new GraphBuilder();
            const graph = builder.build(result.root, maxDepth);

            const globalConflicts = GlobalConflictAnalyzer.analyze(graph);
            const patternAnalyzer = new PatternAnalyzer(nodeFileSystem);
            const patternConflicts = await patternAnalyzer.analyze(graph);
            const allExtras = [...globalConflicts, ...patternConflicts];

            if (graph.conflicts) graph.conflicts.push(...allExtras);
            else graph.conflicts = allExtras;

            if (!options.aiFormat) {
                console.log('\n--- Block Graph ---');
                console.log(`Nodes: ${graph.nodes.length}`);
                console.log(`Edges: ${graph.edges.length}`);
                console.log('\nNodes:');
                graph.nodes.forEach(n => {
                    console.log(`- [${n.type.toUpperCase()}] ${n.name} (Data: ${n.data?.length || 0}, APIs: ${n.outputs?.length || 0})`);
                    if (n.data && n.data.length > 0) n.data.forEach(d => console.log(`    Struct: ${d.name}`));
                    if (n.outputs && n.outputs.length > 0) n.outputs.forEach(fn => console.log(`    Fn: ${fn.name} (${fn.isMutable ? 'mut' : 'immut'})`));
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
                        if (c.suggestedFix) console.log(`  💡 Fix: ${c.suggestedFix}`);
                    });
                }
            }

            if (cmdOptions.context) {
                const context = AiContextGenerator.generate(graph, path.basename(fullLibPath));
                const baseDir = path.dirname(fullLibPath);
                const hybridDir = path.join(baseDir, '.hybrid');
                if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir, { recursive: true });
                const contextPath = path.join(hybridDir, 'project-context.md');
                await nodeFileSystem.writeFile(contextPath, context);
                if (!options.aiFormat) console.log(`\n📄 Generated AI Context at: ${contextPath}`);
            }

            if (options.aiFormat) {
                const out = JSON.stringify(graph);
                console.log(out);
                appendLog('analyze', out);
            } else {
                appendLog('analyze', `Analyzed ${fullLibPath}. Found ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
            }
        } catch (err: any) {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        }
    });

program.parse(process.argv);
