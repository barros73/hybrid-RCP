import { IFileSystem } from './rust-parser';
import { Conflict } from './types';

export class CargoManager {
    private fileSystem: IFileSystem;

    constructor(fileSystem: IFileSystem) {
        this.fileSystem = fileSystem;
    }

    async analyzeLockFile(lockPath: string): Promise<Map<string, string[]>> {
        if (!await this.fileSystem.exists(lockPath)) {
            console.warn(`Cargo.lock not found at ${lockPath}`);
            return new Map();
        }

        const content = await this.fileSystem.readFile(lockPath);
        const dependencyMap = new Map<string, string[]>();

        // Simple TOML parser for [[package]] sections
        // Note: This is a heuristic parser. A robust solution would use a TOML library.
        const packageRegex = /\[\[package\]\]\s*name\s*=\s*"([^"]+)"\s*version\s*=\s*"([^"]+)"/g;

        let match;
        while ((match = packageRegex.exec(content)) !== null) {
            const name = match[1];
            const version = match[2];

            if (!dependencyMap.has(name)) {
                dependencyMap.set(name, []);
            }
            dependencyMap.get(name)!.push(version);
        }

        return dependencyMap;
    }

    detectVersionConflicts(dependencyMap: Map<string, string[]>): Conflict[] {
        const conflicts: Conflict[] = [];

        dependencyMap.forEach((versions, name) => {
            if (versions.length > 1) {
                // Deduplicate versions
                const uniqueVersions = Array.from(new Set(versions));
                if (uniqueVersions.length > 1) {
                    conflicts.push({
                        id: `dependency-conflict-${name}`,
                        description: `Multiple versions of crate '${name}' detected in Cargo.lock: ${uniqueVersions.join(', ')}. This can increase build times and binary size.`,
                        location: { file: 'Cargo.lock', line: 0 },
                        severity: 'warning',
                        category: 'version-mismatch',
                        suggestedFix: `Check 'Cargo.toml' dependencies and run 'cargo update -p ${name}' to try deduping.`
                    });
                }
            }
        });

        return conflicts;
    }

    async addDependency(cargoPath: string, name: string, version: string, features: string[] = []): Promise<void> {
        if (!await this.fileSystem.exists(cargoPath)) {
            // For now, assume Cargo.toml must exist. In a real scenario, we might create it.
            console.warn(`Cargo.toml not found at ${cargoPath}, skipping dependency injection.`);
            return;
        }

        const content = await this.fileSystem.readFile(cargoPath);
        const dependencyLine = features.length > 0
            ? `${name} = { version = "${version}", features = [${features.map(f => `"${f}"`).join(', ')}] }`
            : `${name} = "${version}"`;

        // Check if dependency already exists (simple check)
        // Regex: name = ...
        const depRegex = new RegExp(`^\\s*${name}\\s*=`, 'm');
        if (depRegex.test(content)) {
            console.log(`Dependency '${name}' already exists in Cargo.toml.`);
            return;
        }

        // Find [dependencies] section
        const dependenciesRegex = /\[dependencies\]/g;
        const match = dependenciesRegex.exec(content);

        if (match) {
            // Insert after [dependencies]
            const insertionIndex = match.index + match[0].length;
            const newContent = content.slice(0, insertionIndex) + '\n' + dependencyLine + content.slice(insertionIndex);
            await this.fileSystem.writeFile(cargoPath, newContent);
            console.log(`Added dependency '${name}' to Cargo.toml.`);
        } else {
            // Append [dependencies] section if missing
            const newContent = content + '\n[dependencies]\n' + dependencyLine + '\n';
            await this.fileSystem.writeFile(cargoPath, newContent);
            console.log(`Created [dependencies] and added '${name}' to Cargo.toml.`);
        }
    }
}
