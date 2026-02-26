import * as path from 'path';
import { IProjectParser } from './types';
import { RustParser } from './rust-parser';
import { CppParser } from './cpp-parser';
import { PythonParser } from './python-parser';
import { IFileSystem } from '../utils/filesystem';

export class ParserFactory {
    static getParserForFile(filePath: string, fileSystem: IFileSystem): IProjectParser {
        const ext = path.extname(filePath).toLowerCase();

        switch (ext) {
            case '.rs':
                return new RustParser(fileSystem);
            case '.cpp':
            case '.hpp':
            case '.h':
            case '.cc':
            case '.c':
            case '.cxx':
                return new CppParser(fileSystem);
            case '.py':
                return new PythonParser(fileSystem);
            default:
                throw new Error(`Unsupported file extension: ${ext}`);
        }
    }
}
