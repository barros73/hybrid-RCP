// ============================================================
// hybrid-RCP — SHIELD Sub-module
// Translates compiler/clippy/audit findings to RCP conflicts
// Copyright 2026 Fabrizio Baroni — Apache 2.0
// ============================================================

import { Conflict } from '../types';

export class ShieldAnalyzer {
    constructor() { }

    /**
     * Ingests JSON output from `cargo clippy --message-format=json` 
     * or `cargo audit --json` and maps it to RCP Conflicts.
     */
    public analyze(compilerJson: any[]): Conflict[] {
        const conflicts: Conflict[] = [];

        for (const item of compilerJson) {
            // 1. CARGO CLIPPY / COMPILER MESSAGE
            if (item.reason === 'compiler-message' && item.message) {
                const msg = item.message;
                const primarySpan = msg.spans.find((s: any) => s.is_primary);

                if (primarySpan) {
                    conflicts.push({
                        id: `clippy-${item.message.code?.code || Math.random().toString(36).substr(2, 9)}`,
                        description: msg.message,
                        location: {
                            file: primarySpan.file_name,
                            line: primarySpan.line_start
                        },
                        severity: msg.level === 'error' ? 'error' : 'warning',
                        category: 'quality',
                        suggestedFix: msg.rendered
                    });
                }
            }

            // 2. CARGO AUDIT VULNERABILITIES
            if (item.vulnerabilities) {
                for (const vuln of item.vulnerabilities) {
                    conflicts.push({
                        id: vuln.advisory.id,
                        description: `[${vuln.package.name}] ${vuln.advisory.title}`,
                        location: {
                            file: 'Cargo.lock',
                            line: 1
                        },
                        severity: 'error',
                        category: 'security',
                        suggestedFix: `Update ${vuln.package.name} to a secure version. ${vuln.advisory.url || ''}`
                    });
                }
            }
        }

        return conflicts;
    }

    /** Calculates ImpactScore based on node position in DAG */
    public calculateImpact(nodeId: string, graph: any): number {
        // TODO: Implement topological impact calculation
        return 0;
    }
}
