/*
 * Hybrid-RCP - Drift Analyzer Sub-module
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

import * as fs from 'fs';

export class DriftAnalyzer {
    /**
     * Compares two RCP snapshots and identifies structural or logical drifts.
     */
    public compare(file1: string, file2: string): void {
        console.log(`🔍 Comparing Snapshots: ${file1} vs ${file2}...`);

        if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
            console.error('❌ Error: One or both snapshot files do not exist.');
            return;
        }

        const data1 = JSON.parse(fs.readFileSync(file1, 'utf-8'));
        const data2 = JSON.parse(fs.readFileSync(file2, 'utf-8'));

        const nodes1 = new Map<string, any>(data1.nodes.map((n: any) => [n.id, n]));
        const nodes2 = new Map<string, any>(data2.nodes.map((n: any) => [n.id, n]));

        console.log('\n--- 🌊 ARCHITECTURAL DRIFT REPORT ---');

        // Check for removals
        let removed = 0;
        for (const [id, node] of nodes1.entries()) {
            if (!nodes2.has(id)) {
                console.log(`🔴 REMOVED: [${node.type}] ${node.name} (${id})`);
                removed++;
            }
        }

        // Check for additions and changes
        let added = 0;
        let changed = 0;
        for (const [id, node] of nodes2.entries()) {
            const oldNode: any = nodes1.get(id);
            if (!oldNode) {
                console.log(`🟢 ADDED:   [${node.type}] ${node.name} (${id})`);
                added++;
            } else if (oldNode.logicHash !== node.logicHash) {
                console.log(`🟡 CHANGED: [${node.type}] ${node.name} (Logic Drift detected)`);
                console.log(`   Old Hash: ${oldNode.logicHash}`);
                console.log(`   New Hash: ${node.logicHash}`);
                changed++;
            }
        }

        if (removed === 0 && added === 0 && changed === 0) {
            console.log('✅ No drift detected between snapshots.');
        } else {
            console.log(`\nSummary: ${added} added, ${removed} removed, ${changed} changed.`);
        }
        console.log('--------------------------------------\n');
    }
}
