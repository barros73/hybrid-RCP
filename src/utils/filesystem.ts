import * as fs from 'fs';

// Abstract file system interface to allow testing without VS Code
export interface IFileSystem {
    readFile(path: string): Promise<string>;
    exists(path: string): Promise<boolean>;
    writeFile(path: string, content: string): Promise<void>;
    mkdir?(path: string): Promise<void>; // Optional mkdir
}

// Default implementation using Node.js fs (for testing/CLI)
export const nodeFileSystem: IFileSystem = {
    readFile: async (p: string) => fs.promises.readFile(p, 'utf-8'),
    exists: async (p: string) => {
        try {
            await fs.promises.access(p);
            return true;
        } catch {
            return false;
        }
    },
    writeFile: async (p: string, c: string) => fs.promises.writeFile(p, c, 'utf-8'),
    mkdir: async (p: string) => fs.promises.mkdir(p, { recursive: true }).then(() => {})
};
