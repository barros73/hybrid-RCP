
import { BlockNode, BlockGraph, Connection } from './types';

export class GraphBuilder {
    build(root: BlockNode): BlockGraph {
        const nodes: BlockNode[] = [];
        const edges: Connection[] = [];

        // 1. Flatten the tree into nodes
        this.traverse(root, nodes);

        // 2. Generate Edges (Connections)
        this.generateEdges(nodes, edges);

        return { nodes, edges };
    }

    private traverse(node: BlockNode, list: BlockNode[]) {
        list.push(node);
        if (node.children) {
            node.children.forEach(child => this.traverse(child, list));
        }
    }

    private generateEdges(nodes: BlockNode[], edges: Connection[]) {
        // Map nodes by name for easier lookup (simplified, ignores paths for now)
        const nodeMap = new Map<string, BlockNode>();
        nodes.forEach(n => nodeMap.set(n.name, n));

        nodes.forEach(source => {
            // Heuristic 0: Parent-Child relationship (Ownership)
            source.children?.forEach(child => {
                edges.push({
                    from: source.id,
                    to: child.id,
                    type: 'ownership',
                    label: 'owns'
                });
            });

            // Heuristic 1: Imports create dependencies (Green Lines by default)
            source.imports.forEach(imp => {
                // If import is 'crate::core::Data', we look for 'core' or 'Data'
                const parts = imp.split('::');
                const targetName = parts[0] === 'crate' ? parts[1] : parts[0];

                // Avoid self-references
                if (targetName === source.name) return;

                const target = nodeMap.get(targetName);
                if (target) {
                    // Check if it's a "super" reference (Sub -> Parent)
                    if (targetName === 'super') {
                         // Resolve parent... complex without parent link in node.
                         // Skip for now.
                         return;
                    }

                    edges.push({
                        from: source.id,
                        to: target.id,
                        type: 'immutable',
                        label: `uses ${targetName}`
                    });
                }
            });

            // Heuristic 2: Mutable Function usage (Yellow Lines)
            // If a block calls a mutable function on another block, or takes it as &mut arg.
            // Since we don't parse function bodies deeply yet, we use a simpler heuristic:
            // If Block A has an import to Block B, AND Block A has a function that takes `&mut B`.

            // Let's iterate over imports again to refine the connection type.
            source.imports.forEach(imp => {
                const parts = imp.split('::');
                const targetName = parts[0] === 'crate' ? parts[1] : parts[0];
                if (targetName === source.name) return;

                const target = nodeMap.get(targetName);
                if (!target) return;

                // Check if Source has any function taking `&mut Target` or `&mut Target::Data`
                // We check the 'args' of source functions.
                // We look for `&mut Target` (simple check) or `&mut Data` (if Data is in Target).

                let isMutableUsage = false;

                if (source.outputs) {
                    for (const fn of source.outputs) {
                        if (fn.args) {
                            // Check for &mut Target
                            if (fn.args.includes(`&mut ${targetName}`)) {
                                isMutableUsage = true;
                                break;
                            }

                            // Check for &mut Data (if Target exports Data)
                            if (target.data) {
                                for (const d of target.data) {
                                    if (fn.args.includes(`&mut ${d.name}`)) {
                                        isMutableUsage = true;
                                        break;
                                    }
                                }
                            }
                            if (isMutableUsage) break;
                        }
                    }
                }

                if (isMutableUsage) {
                     // Find the existing Usage edge (not Ownership) and upgrade it
                     const edge = edges.find(e => e.from === source.id && e.to === target.id && e.type !== 'ownership');
                     if (edge) {
                         edge.type = 'mutable';
                         edge.label = `mutates ${targetName}`;
                     }
                }
            });
        });
    }
}
