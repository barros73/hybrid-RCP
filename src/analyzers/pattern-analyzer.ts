import { IFileSystem, nodeFileSystem } from '../utils/filesystem';
import { BlockGraph, Conflict } from '../types';

export class PatternAnalyzer {
    private fileSystem: IFileSystem;

    constructor(fileSystem: IFileSystem = nodeFileSystem) {
        this.fileSystem = fileSystem;
    }

    async analyze(graph: BlockGraph): Promise<Conflict[]> {
        const conflicts: Conflict[] = [];

        // Patterns to search for
        const patterns = [
            {
                id: 'hardcoded-secret',
                regex: /(api_key|secret|password|token)\s*=\s*['"][^'"]+['"]/i,
                message: 'Hardcoded secret detected.',
                severity: 'error'
            },
            {
                id: 'unwrap-panic',
                regex: /\.unwrap\(\)/,
                message: 'Usage of .unwrap() detected. Risk of panic in production.',
                severity: 'warning'
            },
            {
                id: 'console-log',
                regex: /console\.log\(/,
                message: 'Console.log detected. Ensure this is removed for production.',
                severity: 'info'
            },
            {
                id: 'todo-comment',
                regex: /\/\/\s*(TODO|FIXME):/,
                message: 'TODO/FIXME detected.',
                severity: 'info'
            }
        ];

        // Iterate over nodes and check file content
        // We need to read files again. This might be slow for large projects.
        // Optimization: Pass content from Parser?
        // Current Parser doesn't store full content in Node to save memory.
        // We'll read on demand for now.

        for (const node of graph.nodes) {
            // Ensure filePath is absolute or resolved relative to workspace root if needed
            // But Parser stores absolute paths usually.
            // If filePath is just a name, skip.
            if (!node.filePath || node.type === 'folder' || node.type === 'inline') continue;

            if (await this.fileSystem.exists(node.filePath)) {
                try {
                    const content = await this.fileSystem.readFile(node.filePath);

                    for (const pattern of patterns) {
                        const match = pattern.regex.exec(content);
                        if (match) {
                            // Find line number
                            const lines = content.substring(0, match.index).split('\n');
                            const lineNum = lines.length;

                            // For TODOs, maybe count them instead of reporting every single one?
                            if (pattern.id === 'todo-comment') {
                                const todoCount = (content.match(new RegExp(pattern.regex, 'g')) || []).length;
                                if (todoCount > 3) {
                                     conflicts.push({
                                        id: `excessive-todos-${node.name}`,
                                        description: `High density of TODOs (${todoCount}) in ${node.name}.`,
                                        location: { file: node.filePath, line: 0 },
                                        severity: 'info',
                                        category: 'ownership-conflict',
                                        suggestedFix: 'Review and resolve pending tasks.'
                                    });
                                }
                                continue; // Skip single report
                            }

                            conflicts.push({
                                id: `${pattern.id}-${node.name}`,
                                description: `${pattern.message} Match: ${match[0].substring(0, 30)}...`,
                                location: { file: node.filePath, line: lineNum },
                                severity: pattern.severity as 'error' | 'warning' | 'info',
                                category: 'ownership-conflict',
                                suggestedFix: 'Remove or refactor.'
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to analyze patterns in ${node.filePath}`);
                }
            }
        }

        return conflicts;
    }
}
