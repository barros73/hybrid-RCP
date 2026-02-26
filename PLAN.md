# Development Plan: Rust Modules Parser for VS Code Extension

This plan outlines the steps to create the skeleton of a VS Code extension that includes a TypeScript function to analyze a `lib.rs` file and extract the module structure as "blocks", ready to be used by an AI.

## Objective
Create a `parseRustModules` function integrated into a minimal VS Code extension, capable of reading `lib.rs`, identifying modules (`mod name;` and `mod name { ... }`), and returning a graph/tree data structure.

## Steps

1.  **VS Code Extension Project Initialization**
    *   Create `package.json` with minimal dependencies (`typescript`, `@types/node`, `@types/vscode`).
    *   Create `tsconfig.json` for TypeScript compilation.
    *   Create the `src` folder.
    *   **Verification:** Run `ls -R` to confirm the structure.
    *   Run `npm install`.

2.  **Define Data Structure (Interfaces)**
    *   Create `src/types.ts`.
    *   Define the `BlockNode` interface with properties: `name`, `type` ('file' | 'inline' | 'core'), `filePath`, `children`, `startLine`, `endLine`.
    *   **Verification:** Read `src/types.ts`.

3.  **Implement Parser (Core Logic)**
    *   Create `src/rust-parser.ts`.
    *   Implement the function `parseRustModules(content: string, basePath: string): BlockNode[]`.
    *   Use Regex to locate `mod` declarations:
        *   `mod name;` -> File module. Calculate expected path (`name.rs` or `name/mod.rs`).
        *   `mod name { ... }` -> Inline module. Parse the content.
    *   Add detailed JSDoc documentation.
    *   **Verification:** Read `src/rust-parser.ts`.

4.  **VS Code Integration**
    *   Create `src/extension.ts`.
    *   Implement `activate(context: vscode.ExtensionContext)`.
    *   Register the command `hybrid-rst.parseLib` which reads `lib.rs`, invokes `parseRustModules`, and prints the JSON to the Output Channel.
    *   **Verification:** Read `src/extension.ts`.

5.  **Verification and Testing (Headless)**
    *   Create a standalone test script `test-parser.ts`.
    *   Import `parseRustModules` and test with simulated Rust strings.
    *   Run the script with `ts-node test-parser.ts` (or compile and run with node) and verify the JSON output.
    *   **Verification:** Check the test output to ensure modules are extracted correctly.

6.  **Pre-commit**
    *   Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.

7.  **Submission**
    *   Submit the changes with an appropriate message.
