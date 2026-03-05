import { ParserFactory } from '../src/parsers/factory';
import { nodeFileSystem } from '../src/utils/filesystem';
import { RustParser } from '../src/parsers/rust-parser';
import { CppParser } from '../src/parsers/cpp-parser';
import { PythonParser } from '../src/parsers/python-parser';

function runTest() {
    console.log('Running Factory Test...');

    const rustParser = ParserFactory.getParserForFile('lib.rs', nodeFileSystem);
    if (rustParser instanceof RustParser) {
        console.log('✅ .rs -> RustParser');
    } else {
        console.error('❌ .rs failed');
    }

    const cppParser = ParserFactory.getParserForFile('main.cpp', nodeFileSystem);
    if (cppParser instanceof CppParser) {
        console.log('✅ .cpp -> CppParser');
    } else {
        console.error('❌ .cpp failed');
    }

    const pyParser = ParserFactory.getParserForFile('app.py', nodeFileSystem);
    if (pyParser instanceof PythonParser) {
        console.log('✅ .py -> PythonParser');
    } else {
        console.error('❌ .py failed');
    }

    try {
        ParserFactory.getParserForFile('unknown.xyz', nodeFileSystem);
        console.error('❌ Unknown extension should throw');
    } catch (e) {
        console.log('✅ Unknown extension threw error as expected');
    }
}

runTest();
