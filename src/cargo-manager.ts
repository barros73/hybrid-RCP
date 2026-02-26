import { IFileSystem } from './rust-parser';

export class CargoManager {
    private fileSystem: IFileSystem;

    constructor(fileSystem: IFileSystem) {
        this.fileSystem = fileSystem;
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
