import * as vscode from 'vscode';
import * as path from 'path';
import { ParserFactory } from './parsers/factory';
import { HybridManager } from './parsers/hybrid-manager';
import { IFileSystem } from './utils/filesystem';
import { GraphBuilder } from './graph-builder';
import { BlockManager } from './block-manager';
import { CargoManager } from './cargo-manager';
import { AiContextGenerator } from './generators/ai-context-generator';
import { GlobalConflictAnalyzer } from './analyzers/global-conflict-analyzer';
import { PatternAnalyzer } from './analyzers/pattern-analyzer';
import { BlockGraph } from './types';
import { IUserInterface } from './ui-interface';
import { DriftAnalyzer } from './sub-modules/drift';
import { ShieldAnalyzer } from './sub-modules/shield';
import { execSync } from 'child_process';

// Webview Panel for Graph Visualization
class HybridRstPanel {
    public static currentPanel: HybridRstPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, graph: BlockGraph) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, graph);
    }

    public static createOrShow(extensionUri: vscode.Uri, graph: BlockGraph) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (HybridRstPanel.currentPanel) {
            HybridRstPanel.currentPanel._panel.reveal(column);
            HybridRstPanel.currentPanel._update(graph);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'hybridRcpGraph',
            'Hybrid-RCP Graph',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        HybridRstPanel.currentPanel = new HybridRstPanel(panel, extensionUri, graph);
    }

    public dispose() {
        HybridRstPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(graph: BlockGraph) {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, graph);
    }

    private _getHtmlForWebview(webview: vscode.Webview, graph: BlockGraph): string {
        // Resolve path to local Cytoscape resource
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'cytoscape.min.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Convert BlockGraph to Cytoscape elements
        const nodes = graph.nodes.map(n => ({
            data: {
                id: n.id,
                label: `${n.name}\n(Loc: ${n.compilationCost || '?'})`,
                type: n.type,
                compilationCost: n.compilationCost || 10
            }
        }));

        const edges = graph.edges.map((e, i) => {
            let color = '#888';
            if (e.type === 'immutable') color = '#4caf50'; // Green
            if (e.type === 'mutable') color = '#ffeb3b'; // Yellow
            if (e.type === 'conflict') color = '#f44336'; // Red
            if (e.type === 'ownership') color = '#2196f3'; // Blue

            return {
                data: {
                    id: `e${i}`,
                    source: e.from,
                    target: e.to,
                    label: e.label || '',
                    color: color
                }
            };
        });

        const elements = JSON.stringify([...nodes, ...edges]);

        // Mock SHIELD & CIS data (In real usage, this comes from graph.conflicts)
        const shieldCount = graph.conflicts?.filter(c => c.severity === 'error').length || 0;
        const cisScore = 85; // Heuristic or derived from last export
        const cisColor = cisScore > 80 ? "#4caf50" : cisScore > 40 ? "#ffeb3b" : "#f44336";

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hybrid-RCP Graph</title>
    <script src="${scriptUri}"></script>
    <div id="cy"></div>
    
    <div class="footer">
        <div class="active-prompt">
            <strong>🤖 Active AI Prompt Context:</strong>
            <div id="prompt-content">Awaiting matrix-instruction update...</div>
        </div>
        <div class="metrics">
            <div class="metric-item">
                <span class="label">🛡️ SHIELD:</span>
                <span class="value" style="color: ${shieldCount > 0 ? '#f44336' : '#4caf50'}">${shieldCount} Issues</span>
            </div>
            <div class="metric-item">
                <span class="label">🎯 CIS:</span>
                <span class="value" style="color: ${cisColor}">${cisScore}%</span>
            </div>
            <div id="forge-status" class="forge-ready" style="display:none">
                ⚒️ FORGE: STABLE & Ready to Tag
            </div>
        </div>
    </div>

    <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 0; margin: 0; overflow: hidden; background-color: #0f0f0f; color: #ccc; }
        #cy { width: 100vw; height: calc(100vh - 80px); display: block; }
        .legend { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.85); padding: 12px; border-radius: 8px; font-size: 11px; pointer-events: none; border: 1px solid #333; }
        .legend-item { display: flex; align-items: center; margin-bottom: 6px; }
        .dot { width: 12px; height: 12px; border-radius: 3px; margin-right: 10px; }
        
        .footer { 
            position: absolute; bottom: 0; left: 0; width: 100%; height: 80px; 
            background: #1e1e1e; border-top: 1px solid #333; display: flex; 
            padding: 10px 20px; box-sizing: border-box; align-items: center; justify-content: space-between;
        }
        .active-prompt { flex: 1; max-width: 60%; font-size: 12px; color: #aaa; background: #252526; padding: 10px; border-radius: 4px; border: 1px solid #3c3c3c; overflow: hidden; }
        #prompt-content { font-family: monospace; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-top: 4px; color: #3794ef; }
        
        .metrics { display: flex; gap: 20px; font-size: 12px; align-items: center; }
        .metric-item { display: flex; flex-direction: column; align-items: flex-end; }
        .metric-item .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-item .value { font-weight: bold; font-size: 14px; }
        .forge-ready { background: #4caf5022; color: #4caf50; border: 1px solid #4caf50; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; animation: pulse 2s infinite; }
        
        @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
        }
    </style>
</head>
<body>
    <div class="legend">
        <div class="legend-item"><div class="dot" style="background:#2196f3"></div>Ownership (Blue)</div>
        <div class="legend-item"><div class="dot" style="background:#4caf50"></div>Immutable Read (Green)</div>
        <div class="legend-item"><div class="dot" style="background:#ffeb3b"></div>Mutable Write (Yellow)</div>
        <div class="legend-item"><div class="dot" style="background:#f44336"></div>Conflict (Red)</div>
    </div>
    <div id="cy"></div>
    <script>
        try {
            var cy = cytoscape({
                container: document.getElementById('cy'),
                elements: ${elements},
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#444',
                            'label': 'data(label)',
                            'color': '#fff',
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'text-wrap': 'wrap',
                            'width': 'mapData(compilationCost, 0, 1000, 60, 200)',
                            'height': 'mapData(compilationCost, 0, 1000, 60, 200)',
                            'padding': '10px',
                            'shape': 'round-rectangle',
                            'border-width': 1,
                            'border-color': '#777',
                            'font-size': '12px'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': 'data(color)',
                            'target-arrow-color': 'data(color)',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'label': 'data(label)',
                            'color': '#aaa',
                            'font-size': '10px',
                            'text-rotation': 'autorotate',
                            'text-background-opacity': 1,
                            'text-background-color': '#1e1e1e',
                            'text-background-padding': '2px'
                        }
                    }
                ],
                layout: {
                    name: 'cose',
                    animate: true
                }
            });

            // Adjust zoom
            cy.ready(() => {
                cy.fit();
                cy.center();
            });

            // Handle messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'updatePrompt':
                        document.getElementById('prompt-content').textContent = message.text;
                        break;
                    case 'forgeStatus':
                        const forgeEl = document.getElementById('forge-status');
                        forgeEl.style.display = message.isStable ? 'block' : 'none';
                        break;
                }
            });

        } catch (e) {
            console.error('Graph Error:', e);
            document.body.innerHTML += '<div style="color:red; padding:20px">Error loading graph: ' + e.message + '</div>';
        }
    </script>
</body>
</html>`;
    }
}

// VS Code User Interface Implementation
const vscodeUI: IUserInterface = {
    showInformationMessage: async (msg, ...items) => {
        return vscode.window.showInformationMessage(msg, ...items);
    },
    showErrorMessage: async (msg) => {
        vscode.window.showErrorMessage(msg);
    }
};

// VS Code FileSystem Implementation
class VSCodeFileSystem implements IFileSystem {
    async readFile(filePath: string): Promise<string> {
        const uri = vscode.Uri.file(filePath);
        const bytes = await vscode.workspace.fs.readFile(uri);
        return new TextDecoder().decode(bytes);
    }

    async exists(filePath: string): Promise<boolean> {
        const uri = vscode.Uri.file(filePath);
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        const uri = vscode.Uri.file(filePath);
        const encoded = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(uri, encoded);
    }

    async mkdir(dirPath: string): Promise<void> {
        const uri = vscode.Uri.file(dirPath);
        await vscode.workspace.fs.createDirectory(uri);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Hybrid RCP extension is active');

    let disposable = vscode.commands.registerCommand('hybrid-rcp.analyzeProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const fsAdapter = new VSCodeFileSystem();

        // Detect entry point or Hybrid Mode
        const candidates = [
            path.join(rootPath, 'src', 'lib.rs'),
            path.join(rootPath, 'src', 'main.rs'),
            path.join(rootPath, 'main.cpp'),
            path.join(rootPath, 'src', 'main.cpp'),
            path.join(rootPath, 'main.c'),
            path.join(rootPath, 'src', 'main.c'),
            path.join(rootPath, 'main.go'),
            path.join(rootPath, 'cmd', 'main.go'),
            path.join(rootPath, 'main.js'),
            path.join(rootPath, 'index.js'),
            path.join(rootPath, 'src', 'index.js'),
            path.join(rootPath, 'app.js'),
            path.join(rootPath, 'main.py'),
            path.join(rootPath, 'app.py')
        ];

        let entryPath: string | undefined;
        let isHybrid = false;

        const foundCandidates = [];
        for (const p of candidates) {
            if (await fsAdapter.exists(p)) {
                foundCandidates.push(p);
            }
        }

        // Add Hybrid Option
        const quickPickItems = foundCandidates.map(p => ({ label: path.relative(rootPath, p), path: p }));
        quickPickItems.unshift({ label: '🌐 Auto-Detect Hybrid Workspace (Multi-Language)', path: 'HYBRID' });

        const selected = await vscode.window.showQuickPick(quickPickItems, { placeHolder: 'Select Entry Point or Hybrid Mode' });

        if (!selected) return;

        if (selected.path === 'HYBRID') {
            isHybrid = true;
        } else {
            entryPath = selected.path;
        }

        // 0. Prompt for Analysis Depth & Security
        const analysisOptions = await vscode.window.showQuickPick(
            [
                { label: 'Full Analysis', description: 'Deep scan + Dependencies' },
                { label: 'Full Analysis + 🛡️ SHIELD', description: 'Deep scan + Security/Audit (Clippy, Audit)' },
                { label: 'High Level', description: 'Top 2 levels only' }
            ],
            { placeHolder: 'Select Analysis Mode' }
        );

        if (!analysisOptions) return;

        let maxDepth = Infinity;
        let runShield = analysisOptions.label.includes('SHIELD');
        if (analysisOptions.label === 'High Level') {
            maxDepth = 2;
        }

        vscode.window.showInformationMessage(`Analyzing project structure...`);

        try {
            let result;
            if (isHybrid) {
                const manager = new HybridManager(fsAdapter);
                result = await manager.parse(rootPath);
            } else {
                if (!entryPath) return; // Should not happen
                const parser = ParserFactory.getParserForFile(entryPath, fsAdapter);
                result = await parser.parse(entryPath);
            }

            // 1. Build Graph
            const builder = new GraphBuilder();
            const graph = builder.build(result.root, maxDepth);

            // 1b. Run Global Conflict Analysis (Cross-File)
            const globalConflicts = GlobalConflictAnalyzer.analyze(graph);

            // 1c. Run Pattern Analysis (Secrets, Safety)
            const patternAnalyzer = new PatternAnalyzer(fsAdapter);
            const patternConflicts = await patternAnalyzer.analyze(graph);

            const allExtras = [...globalConflicts, ...patternConflicts];

            // 1d. Run SHIELD Audit
            if (runShield) {
                vscode.window.showInformationMessage('🛡️ SHIELD: Running security audit (clippy/audit)...');
                const shield = new ShieldAnalyzer();
                try {
                    const clippyOut = execSync('cargo clippy --message-format=json', { cwd: rootPath, stdio: 'pipe' }).toString();
                    const clippyJson = clippyOut.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
                    allExtras.push(...shield.analyze(clippyJson));
                } catch (e: any) {
                    if (e.stdout) {
                        try {
                            const clippyJson = e.stdout.toString().split('\n').filter((l: string) => l.trim()).map((l: string) => JSON.parse(l));
                            allExtras.push(...shield.analyze(clippyJson));
                        } catch (inner) { }
                    }
                }
            }

            if (graph.conflicts) {
                graph.conflicts.push(...allExtras);
            } else {
                graph.conflicts = allExtras;
            }

            const hybridDir = path.join(rootPath, '.hybrid');
            if (!await fsAdapter.exists(hybridDir)) await fsAdapter.mkdir(hybridDir);

            // 2. Generate JSON Structure
            const structureJson = JSON.stringify(graph, null, 2);
            const jsonPath = path.join(hybridDir, 'project-structure.json');
            await vscode.workspace.fs.writeFile(vscode.Uri.file(jsonPath), Buffer.from(structureJson));

            // 3. Generate Conflicts Report (Markdown)
            let conflictsMd = '# Hybrid-RCP Conflict Report\n\n';
            conflictsMd += 'This file lists structural and ownership conflicts detected in your Rust project. An AI agent can use this information to propose fixes.\n\n';

            // Collect all conflicts (parser + graph)
            const allConflicts = [...result.conflicts, ...(graph.conflicts || [])];

            if (allConflicts.length === 0) {
                conflictsMd += '✅ **No structural conflicts detected.**\n';
            } else {
                conflictsMd += `⚠️ **Found ${allConflicts.length} potential conflicts:**\n\n`;
                allConflicts.forEach(c => {
                    conflictsMd += `## Conflict: ${c.id}\n`;
                    conflictsMd += `- **Category**: ${c.category}\n`;
                    conflictsMd += `- **Description**: ${c.description}\n`;
                    conflictsMd += `- **Location**: \`${c.location.file}:${c.location.line}\`\n`;
                    conflictsMd += `- **Severity**: ${c.severity}\n`;
                    if (c.suggestedFix) {
                        conflictsMd += `- **Suggestion**: ${c.suggestedFix}\n`;
                    }
                    conflictsMd += '\n---\n';
                });
            }

            const reportPath = path.join(hybridDir, 'conflicts-report.md');
            const reportUri = vscode.Uri.file(reportPath);
            await vscode.workspace.fs.writeFile(reportUri, Buffer.from(conflictsMd));

            // 4. Generate AI Context
            const aiContext = AiContextGenerator.generate(graph, path.basename(rootPath));
            const aiContextPath = path.join(hybridDir, 'project-context.md');
            await vscode.workspace.fs.writeFile(vscode.Uri.file(aiContextPath), Buffer.from(aiContext));

            vscode.window.showInformationMessage(`Analysis complete! Reports generated: project-structure.json, conflicts-report.md, project-context.md`);

            // Open the report for the user
            const doc = await vscode.workspace.openTextDocument(reportUri);
            await vscode.window.showTextDocument(doc);

            // Show Graph in Webview
            HybridRstPanel.createOrShow(context.extensionUri, graph);

        } catch (err: any) {
            vscode.window.showErrorMessage(`Error analyzing project: ${err.message}`);
            console.error(err);
        }
    });

    context.subscriptions.push(disposable);

    let createBlockDisposable = vscode.commands.registerCommand('hybrid-rcp.createBlock', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        const rootPath = workspaceFolders[0].uri.fsPath;

        // 1. Get Block Name
        const blockName = await vscode.window.showInputBox({
            prompt: 'Enter Block Name (snake_case)',
            placeHolder: 'my_new_block'
        });
        if (!blockName) return;

        // 2. Get Block Type
        const blockType = await vscode.window.showQuickPick(['file', 'folder'], {
            placeHolder: 'Select Block Type (File or Folder Module)'
        });
        if (!blockType) return;

        // 3. Select Parent Module (Simple file picker for now, ideally graph selection)
        // For MVP, default to src/lib.rs or let user pick a file
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri: vscode.Uri.file(path.join(rootPath, 'src')),
            filters: { 'Rust Files': ['rs'] },
            openLabel: 'Select Parent Module'
        });

        if (!uris || uris.length === 0) return;
        const parentPath = uris[0].fsPath;

        const fsAdapter = new VSCodeFileSystem();
        const cargoManager = new CargoManager(fsAdapter);
        const manager = new BlockManager(fsAdapter, cargoManager, vscodeUI);

        try {
            const newPath = await manager.createBlock(parentPath, blockName, blockType as 'file' | 'folder');
            vscode.window.showInformationMessage(`Block '${blockName}' created at ${newPath}`);

            // Open the new file
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(newPath));
            await vscode.window.showTextDocument(doc);

        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to create block: ${err.message}`);
        }
    });

    context.subscriptions.push(createBlockDisposable);

    let analyzeLockDisposable = vscode.commands.registerCommand('hybrid-rcp.analyzeLock', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;

        const rootPath = workspaceFolders[0].uri.fsPath;
        const lockPath = path.join(rootPath, 'Cargo.lock');

        const fsAdapter = new VSCodeFileSystem();
        const cargoManager = new CargoManager(fsAdapter);

        try {
            const depMap = await cargoManager.analyzeLockFile(lockPath);
            const conflicts = cargoManager.detectVersionConflicts(depMap);

            if (conflicts.length > 0) {
                const message = `Found ${conflicts.length} version conflicts in Cargo.lock. Check conflicts-report.md?`;
                const selection = await vscode.window.showWarningMessage(message, 'Yes', 'No');

                if (selection === 'Yes') {
                    // Update the report file
                    let reportContent = '# Cargo Lock Analysis\n\n';
                    conflicts.forEach(c => {
                        reportContent += `## ${c.id}\n${c.description}\n**Fix:** ${c.suggestedFix}\n\n`;
                    });

                    const reportPath = path.join(rootPath, 'lock-conflicts.md');
                    await fsAdapter.writeFile(reportPath, reportContent);
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(reportPath));
                    await vscode.window.showTextDocument(doc);
                }
            } else {
                vscode.window.showInformationMessage(`Cargo.lock analysis passed. ${depMap.size} unique dependencies checked.`);
            }

        } catch (err: any) {
            vscode.window.showErrorMessage(`Error analyzing lock file: ${err.message}`);
        }
    });

    context.subscriptions.push(analyzeLockDisposable);

    let driftDisposable = vscode.commands.registerCommand('hybrid-rcp.runDrift', async () => {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: true,
            filters: { 'RCP Snapshots': ['json'] },
            openLabel: 'Select two snapshots to compare'
        });

        if (uris && uris.length === 2) {
            const analyzer = new DriftAnalyzer();
            analyzer.compare(uris[0].fsPath, uris[1].fsPath);
            vscode.window.showInformationMessage('Drift Analysis complete. Check the output log.');
        } else {
            vscode.window.showErrorMessage('Please select exactly two .json snapshots.');
        }
    });

    context.subscriptions.push(driftDisposable);
}

export function deactivate() { }
