
import { RustParser, IFileSystem } from './src/rust-parser';
import * as assert from 'assert';

// Mock File System
const mockFS: IFileSystem = {
    readFile: async (p: string) => {
        if (p === 'src/lib.rs') {
            return "pub mod core;\npub mod utils;\nfn main() {}"; // 3 lines
        }
        if (p === 'src/core.rs') {
            return "pub struct Core {}"; // 1 line
        }
        // simulate inline mod parent
        if (p === 'src/inline.rs') {
             return "mod nested {\n  fn test() {}\n}"; // 3 lines
        }
        return '';
    },
    exists: async (p: string) => true,
    writeFile: async () => {},
    mkdir: async () => {}
};

async function testMetric() {
    const parser = new RustParser(mockFS);

    console.log('Testing Compilation Cost Metric...');

    // Test 1: File Module
    const result = await parser.parse('src/lib.rs');
    const libNode = result.root;

    console.log(`src/lib.rs cost: ${libNode.compilationCost}`);
    assert.strictEqual(libNode.compilationCost, 3, 'Expected 3 lines in src/lib.rs');

    const coreNode = libNode.children.find(c => c.name === 'core');
    if (coreNode) {
         console.log(`src/core.rs cost: ${coreNode.compilationCost}`);
         assert.strictEqual(coreNode.compilationCost, 1, 'Expected 1 line in src/core.rs');
    } else {
        assert.fail('Core child node not found');
    }

    // Test 2: Inline Module
    // Note: parser logic detects inline modules via regex "mod name {"
    const result2 = await parser.parse('src/inline.rs');
    const inlineNode = result2.root.children.find(c => c.name === 'nested');

    if (inlineNode) {
        console.log(`Inline 'nested' cost: ${inlineNode.compilationCost}`);
        assert.strictEqual(inlineNode.compilationCost, 10, 'Expected default 10 cost for inline module');
    } else {
        assert.fail('Inline nested node not found');
    }

    console.log('✅ Metric Test Passed!');
}

testMetric().catch(err => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
});
