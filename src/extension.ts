import * as vscode from 'vscode';
import * as path from 'path';
import { RustParser, IFileSystem } from './rust-parser';
import { GraphBuilder } from './graph-builder';
import { BlockManager } from './block-manager';
import { CargoManager } from './cargo-manager';
import { TextDecoder, TextEncoder } from 'util';
import { BlockGraph } from './types';
import { IUserInterface } from './ui-interface';

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
            'hybridRstGraph',
            'Hybrid-RST Graph',
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
            data: { id: n.id, label: n.name, type: n.type }
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

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hybrid-RST Graph</title>
    <script src="${scriptUri}"></script>
    <style>
        body { font-family: sans-serif; padding: 0; margin: 0; overflow: hidden; background-color: #1e1e1e; color: #ccc; }
        #cy { width: 100vw; height: 100vh; display: block; }
        .legend { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px; font-size: 12px; pointer-events: none; }
        .legend-item { display: flex; align-items: center; margin-bottom: 5px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
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
                            'width': 'label',
                            'height': 'label',
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
    console.log('Hybrid RST extension is active');

    let disposable = vscode.commands.registerCommand('hybrid-rst.analyzeProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        // We look for src/lib.rs as the entry point for a library crate
        const libPath = path.join(rootPath, 'src', 'lib.rs');

        const fsAdapter = new VSCodeFileSystem();

        // Basic check if lib.rs exists
        if (!await fsAdapter.exists(libPath)) {
            vscode.window.showErrorMessage(`Could not find src/lib.rs in ${rootPath}. Please open a Rust library project.`);
            return;
        }

        vscode.window.showInformationMessage('Analyzing Rust project structure...');

        try {
            const parser = new RustParser(fsAdapter);
            const result = await parser.parse(libPath);

            // 1. Build Graph
            const builder = new GraphBuilder();
            const graph = builder.build(result.root);

            // 2. Generate JSON Structure
            const structureJson = JSON.stringify(graph, null, 2);
            const jsonPath = path.join(rootPath, 'project-structure.json');
            await vscode.workspace.fs.writeFile(vscode.Uri.file(jsonPath), Buffer.from(structureJson));

            // 3. Generate Conflicts Report (Markdown)
            let conflictsMd = '# Hybrid-RST Conflict Report\n\n';
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

            const reportPath = path.join(rootPath, 'conflicts-report.md');
            const reportUri = vscode.Uri.file(reportPath);
            await vscode.workspace.fs.writeFile(reportUri, Buffer.from(conflictsMd));

            vscode.window.showInformationMessage(`Analysis complete! Reports generated: project-structure.json, conflicts-report.md`);

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

    let createBlockDisposable = vscode.commands.registerCommand('hybrid-rst.createBlock', async () => {
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

    let analyzeLockDisposable = vscode.commands.registerCommand('hybrid-rst.analyzeLock', async () => {
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
}

export function deactivate() {}
