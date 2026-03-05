import { BlockGraph, BlockNode, Conflict } from '../types';

export class GlobalConflictAnalyzer {
    static analyze(graph: BlockGraph): Conflict[] {
        const conflicts: Conflict[] = [];
        const structMap = new Map<string, BlockNode[]>();
        const functionMap = new Map<string, BlockNode[]>();

        // Collect all definitions
        graph.nodes.forEach(node => {
            // Structs / Classes
            if (node.data) {
                node.data.forEach(d => {
                    const structName = d.name;
                    if (!structMap.has(structName)) structMap.set(structName, []);
                    structMap.get(structName)!.push(node);
                });
            }

            // Functions (Public APIs)
            if (node.outputs) {
                node.outputs.forEach(fn => {
                    // Skip common names
                    if (['main', 'init', 'setup', 'run', 'test', 'new'].includes(fn.name)) return;
                    if (fn.name.startsWith('_')) return; // Private convention

                    const fnName = fn.name;
                    if (!functionMap.has(fnName)) functionMap.set(fnName, []);
                    functionMap.get(fnName)!.push(node);
                });
            }
        });

        // Detect Duplicates (Structs/Classes)
        for (const [name, nodes] of structMap.entries()) {
            if (nodes.length > 1) {
                // Determine severity based on language
                const isCppOrC = nodes.some(n => n.filePath?.endsWith('.c') || n.filePath?.endsWith('.cpp') || n.filePath?.endsWith('.h'));

                conflicts.push({
                    id: `duplicate-struct-${name}`,
                    description: `Duplicate definition of struct/class '${name}' found in ${nodes.length} locations: ${nodes.map(n => n.name).join(', ')}.`,
                    location: { file: nodes[0].filePath || 'unknown', line: 0 },
                    severity: isCppOrC ? 'error' : 'warning',
                    category: 'ownership-conflict',
                    suggestedFix: isCppOrC
                        ? `Ensure One Definition Rule (ODR). Use namespaces or 'static'.`
                        : `Consider renaming to avoid confusion.`
                });
            }
        }

        // Detect Duplicates (Functions)
        for (const [name, nodes] of functionMap.entries()) {
            if (nodes.length > 1) {
                const isCppOrC = nodes.some(n => n.filePath?.endsWith('.c') || n.filePath?.endsWith('.cpp'));

                conflicts.push({
                    id: `duplicate-function-${name}`,
                    description: `Duplicate definition of function '${name}' found in ${nodes.length} locations: ${nodes.map(n => n.name).join(', ')}.`,
                    location: { file: nodes[0].filePath || 'unknown', line: 0 },
                    severity: isCppOrC ? 'error' : 'warning',
                    category: 'ownership-conflict',
                    suggestedFix: isCppOrC
                        ? `Linker Error Risk (ODR). Use 'static' for internal linkage or rename.`
                        : `Consider renaming to avoid shadowing.`
                });
            }
        }

        // 3. Detect Circular Dependencies (A -> B -> A)
        // Using a DFS approach on the edges
        const adjacency = new Map<string, string[]>();
        graph.edges.forEach(e => {
            if (!adjacency.has(e.from)) adjacency.set(e.from, []);
            adjacency.get(e.from)!.push(e.to);
        });

        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycles = new Set<string>(); // Store stringified cycles to deduplicate

        function detectCycle(nodeId: string, path: string[]) {
            // If already on stack, it's a cycle
            if (recursionStack.has(nodeId)) {
                // Find where the cycle starts in the current path
                const index = path.indexOf(nodeId);
                if (index !== -1) {
                    const cyclePath = path.slice(index);
                    cyclePath.push(nodeId); // complete the loop visual
                    const cycleStr = cyclePath.join(' -> ');

                    // Check if we've seen this cycle (approximate check)
                    // We can sort nodes in cycle to normalize key? No, order matters.
                    // Just use the string for now.
                    if (!cycles.has(cycleStr)) {
                        cycles.add(cycleStr);
                        conflicts.push({
                            id: `circular-dependency-${nodeId}`,
                            description: `Circular dependency detected: ${cycleStr}`,
                            location: { file: nodeId.split('#')[0] || 'unknown', line: 0 },
                            severity: 'error',
                            category: 'ownership-conflict',
                            suggestedFix: `Break the cycle.`
                        });
                    }
                }
                return;
            }

            if (visited.has(nodeId)) return; // Already processed node

            visited.add(nodeId);
            recursionStack.add(nodeId);

            const neighbors = adjacency.get(nodeId) || [];
            for (const neighbor of neighbors) {
                detectCycle(neighbor, [...path, neighbor]);
            }

            recursionStack.delete(nodeId);
        }

        graph.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                detectCycle(node.id, [node.id]);
            }
        });

        // 4. Detect File Naming Collisions (e.g. src/utils.py vs test/utils.py)
        const fileNameMap = new Map<string, string[]>();
        graph.nodes.forEach(node => {
            if (node.filePath) {
                const baseName = node.filePath.split(/[/\\]/).pop(); // Handle / or \
                if (baseName) {
                    if (!fileNameMap.has(baseName)) fileNameMap.set(baseName, []);
                    fileNameMap.get(baseName)!.push(node.filePath);
                }
            }
        });

        fileNameMap.forEach((paths, name) => {
            if (paths.length > 1) {
                // Ignore common names like mod.rs, index.js, main.cpp, __init__.py
                if (['mod.rs', 'index.js', 'index.ts', 'main.rs', 'main.cpp', 'main.c', 'main.go', 'main.py', '__init__.py', 'lib.rs'].includes(name)) return;

                conflicts.push({
                    id: `duplicate-filename-${name}`,
                    description: `Multiple files named '${name}' found: ${paths.join(', ')}.`,
                    location: { file: paths[0], line: 0 },
                    severity: 'info', // Low severity, mostly confusing
                    category: 'ownership-conflict',
                    suggestedFix: `Ensure unique file names to prevent import ambiguity (especially in Python/C++).`
                });
            }
        });

        // 5. Detect Dead Code (Orphan Nodes)
        // Nodes with 0 incoming non-ownership edges (excluding entry points)
        const incomingEdges = new Map<string, number>();
        graph.nodes.forEach(n => incomingEdges.set(n.id, 0));
        graph.edges.forEach(e => {
            if (e.type !== 'ownership') {
                const count = incomingEdges.get(e.to) || 0;
                incomingEdges.set(e.to, count + 1);
            }
        });

        graph.nodes.forEach(node => {
            const incoming = incomingEdges.get(node.id) || 0;

            // Skip entry points and special files
            // Loose check for 'app' allows 'app.ts' to be entry point.
            // 'unused.ts' -> name 'unused'
            const isEntryPoint = ['main', 'lib', 'index', 'app', 'cli'].some(k => node.name.toLowerCase().includes(k));
            const isSpecial = node.name.startsWith('mod') || node.name === '__init__';

            // Only report if it's a file node or core (which implies file module)
            if (incoming === 0 && !isEntryPoint && !isSpecial && (node.type === 'file' || node.type === 'core')) {
                conflicts.push({
                    id: `dead-code-${node.name}`,
                    description: `Potential Orphan Module: '${node.name}' has 0 incoming dependencies.`,
                    location: { file: node.filePath || 'unknown', line: 0 },
                    severity: 'warning',
                    category: 'ownership-conflict',
                    suggestedFix: `Verify if this module is used. If not, delete it.`
                });
            }
        });

        return conflicts;
    }
}
