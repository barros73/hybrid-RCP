import * as vscode from 'vscode';
import * as path from 'path';
import { RustParser, IFileSystem } from './rust-parser';
import { GraphBuilder } from './graph-builder';
import { BlockManager } from './block-manager';
import { CargoManager } from './cargo-manager';
import { TextDecoder, TextEncoder } from 'util';

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
        const manager = new BlockManager(fsAdapter, cargoManager);

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
}

export function deactivate() {}
