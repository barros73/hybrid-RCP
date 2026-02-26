import * as path from 'path';
import { IProjectParser } from './types';
import { RustParser } from './rust-parser';
import { CppParser } from './cpp-parser';
import { PythonParser } from './python-parser';
import { CParser } from './c-parser';
import { GoParser } from './go-parser';
import { JavascriptParser } from './js-parser';
import { IFileSystem } from '../utils/filesystem';

export class ParserFactory {
    static getParserForFile(filePath: string, fileSystem: IFileSystem): IProjectParser {
        const ext = path.extname(filePath).toLowerCase();

        switch (ext) {
            case '.rs':
                return new RustParser(fileSystem);
            case '.cpp':
            case '.hpp':
            case '.cc':
            case '.cxx':
                return new CppParser(fileSystem);
            case '.c':
                return new CParser(fileSystem);
            case '.py':
                return new PythonParser(fileSystem);
            case '.go':
                return new GoParser(fileSystem);
            case '.js':
            case '.jsx':
            case '.ts': // JS Parser handles basic TS structure (imports/classes)
            case '.tsx':
                return new JavascriptParser(fileSystem);
            default:
                // Fallback for headers if ambiguous
                if (ext === '.h') return new CParser(fileSystem);
                throw new Error(`Unsupported file extension: ${ext}`);
        }
    }
}
