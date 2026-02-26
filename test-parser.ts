import { RustParser, nodeFileSystem } from './src/rust-parser';
import * as path from 'path';

async function runTest() {
    console.log('Running standalone parser test...');
    const libPath = path.join(process.cwd(), 'test-workspace', 'src', 'lib.rs');

    console.log(`Parsing: ${libPath}`);
    const parser = new RustParser(nodeFileSystem);

    try {
        const result = await parser.parse(libPath);

        console.log('\n--- Structure ---');
        console.log(JSON.stringify(result.root, null, 2));

        console.log('\n--- Conflicts ---');
        result.conflicts.forEach(c => {
            console.log(`[${c.severity.toUpperCase()}] ${c.description}`);
            if (c.suggestedFix) console.log(`    Suggestion: ${c.suggestedFix}`);
        });

        // Assertions (Simulated)
        const hasMissingFile = result.conflicts.some(c => c.id.includes('missing-mod-legacy'));
        const hasUnsafe = result.conflicts.some(c => c.id.includes('unsafe-static-mut'));

        if (hasMissingFile && hasUnsafe) {
            console.log('\n✅ TEST PASSED: Detected missing file and unsafe pattern.');
        } else {
            console.error('\n❌ TEST FAILED: Did not detect all expected conflicts.');
            process.exit(1);
        }

    } catch (err) {
        console.error('Test error:', err);
    }
}

runTest();
