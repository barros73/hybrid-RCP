# Hybrid-RCP: Visual & Semantic Orchestration (Rust, C++, Python, C, Go, JS)

**The missing link between Static Analysis and Architectural Clarity.**

Hybrid-RCP (Hybrid Code Planner) is a VS Code extension designed to bring **Cognitive Scalability** to large, multi-language codebases. It transforms linear code into a hierarchical block graph, allowing developers to visualize ownership, navigate dependencies, and detect architectural conflicts before code review.

Originally built for Rust, Hybrid-RCP now supports **C++**, **Python**, **C**, **Go**, and **JavaScript/TypeScript** through its adaptive parser system.

## The Vision: Antigravity-Ready Architecture

In ecosystems like Google's **Antigravity**, where monorepos span billions of lines of code across multiple languages, traditional tools often fail to capture the "why" behind architectural decisions.

Hybrid-RCP fills this gap by providing:

1.  **Visual Ownership Analysis**: See who owns what.
    *   **Rust:** Borrow Checker visualization (Green/Yellow/Red).
    *   **C/C++:** Header/Source relationships, Memory Safety (Malloc/Free), and Pointer tracking.
    *   **Python/JS:** Imports, Modules, and Type Safety hints.
    *   **Go:** Concurrency patterns (Goroutines/Channels) and Package dependency graphs.
2.  **Architectural Telemetry**: Visualize the "weight" of your code (LOC proxy), highlighting heavy blocks that slow down build times or increase cognitive load.
3.  **Dependency Hell Resolution**: Deep analysis of `Cargo.lock` (Rust), `go.mod` (Go), `package.json` (JS) and dependency manifests to ensure consistency.
4.  **Rapid Onboarding**: New engineers can understand the system architecture in minutes by navigating the **Master Project Tree**.

## Features

-   **Multi-Language Support**:
    -   🦀 **Rust**: Full ownership and borrow checker visualization.
    -   ⚡ **C++**: Header/Implementation mapping (`.hpp` <-> `.cpp`) and memory management audits.
    -   🐍 **Python**: Module import graphs and type hinting enforcement.
    -   🔨 **C**: `malloc`/`free` pairing checks and unsafe function detection (`strcpy`).
    -   🐹 **Go**: Goroutine leak detection and Channel deadlock warnings.
    -   📜 **JavaScript/TypeScript**: `var` usage audits, Module imports (ESM/CJS), and Class hierarchy.
-   **Interactive Block Graph**: Visualizes modules (Core, File, Folder, Inline) and their relationships.
-   **Traffic Light System**:
    -   🟢 **Green**: Safe Reference / Immutable Read
    -   🟡 **Yellow**: Mutable Write / Active Development
    -   🔴 **Red**: Conflict / Danger Zone (Ownership Violation, Memory Leak, Race Condition)
-   **Compilation Cost Metric**: Nodes scale dynamically based on their Lines of Code (LOC).
-   **Conflict Detection**: Identifies language-specific "Red Line" violations:
    -   **Rust**: Multiple `&mut T`.
    -   **C/C++**: Memory Leaks (Malloc > Free), Raw Pointers.
    -   **Go**: Unmanaged Goroutines.
    -   **JS**: `var` scope issues.
-   **Global Conflict Detection**: Analyzes the entire workspace to find:
    -   **Duplicate Symbols**: Functions or structs with the same name in different files (ODR violations).
    -   **Circular Dependencies**: A -> B -> A loops that break builds.
    -   **File Naming Collisions**: Ambiguous file names (e.g., `utils.py` in multiple folders).
-   **Hybrid Workspace Support**: Seamlessly analyzes projects mixing languages (e.g., Rust + C++ FFI, Python + C extensions) by merging them into a single "Super Graph".
-   **AI Context Generation**: Auto-generates a `project-context.md` file optimized for LLMs (Gemini, ChatGPT), providing a compact architectural map and token estimates.

## Getting Started

### Prerequisites
- **Node.js**: Version 16.x or higher.
- **npm**: Standard Node package manager.
- **Rust Toolchain**: (Optional) Required if you are analyzing Rust projects.
- **VS Code**: Required for the interactive Webview extension.

### 🚀 Quick Installation
For a fully automated setup of the entire Hybrid ecosystem (including RCP), run:
```bash
curl -sSL https://raw.githubusercontent.com/barros73/hybrid-BIM/main/install.sh | bash
```

### Manual Setup
1.  Open a project in VS Code.
2.  Run the command `Hybrid RCP: Analyze Project`.
3.  Select your entry point (e.g., `src/lib.rs`, `main.cpp`, `main.go`, `app.js`) if not automatically detected.
4.  Select your analysis depth.
5.  Explore the interactive graph and review the generated `conflicts-report.md` and `project-context.md`.

## AI Integration (Context for LLMs)

Hybrid-RCP generates a `project-context.md` file in your root directory. This file is designed to be pasted into LLM prompts to give the AI a perfect understanding of your project's structure without reading every file.

**It includes:**
*   **Tree View**: Hierarchy of modules/classes with token estimates.
*   **Contracts**: Public API signatures and types.
*   **Dependency Graph**: Explicit flow of data and ownership.
*   **Conflict List**: Active architectural violations.

## Language-Specific Documentation

*   **[User Guide](docs/USER_GUIDE.md)** (Start Here)
*   [Rust Logic Map](docs/adapters/RUST_LOGIC_MAP.md)
*   [C Adapter Map](docs/adapters/C_SYSTEM_MAP.md)
*   [C++ Adapter Map](docs/adapters/CPP_SYSTEM_MAP.md)
*   [Python Logic Map](docs/adapters/PYTHON_LOGIC_MAP.md)
*   [Go Logic Map](docs/adapters/GO_LOGIC_MAP.md)
*   [JS Logic Map](docs/adapters/JS_LOGIC_MAP.md)

## Development

### Prerequisites
-   Node.js & npm
-   VS Code

### Build & Run
```bash
npm install
npm run compile
# Press F5 in VS Code to launch the Extension Host
```

### Testing
Run parser-specific tests:
```bash
npx ts-node test-factory.ts
npx ts-node test-parser.ts       # Rust
npx ts-node test-c-parser.ts     # C
npx ts-node test-cpp-parser.ts   # C++
npx ts-node test-python-parser.ts # Python
npx ts-node test-go-parser.ts    # Go
npx ts-node test-js-parser.ts    # JS
```

## CLI Reference

### Usage
```bash
node /path/to/hybrid-RCP/dist/cli.js <command> <path/params> [options]
```

### Commands
| Command | Description |
| :--- | :--- |
| `export-structure <root>` | Performs a recursive scan of the project and exports a high-fidelity JSON map to `.hybrid/hybrid-rcp.json`. |
| `analyze <file>` | Performs detailed structural and ownership analysis on a single source file. |
| `analyze-lock <file>` | Scans `Cargo.lock` for version conflicts and dependency mismatches. |
| `create <parent> <name> <type>` | Creates a new module/block (type: `file` \| `folder`) and automatically updates the parent's `mod.rs` (if Rust). |

### Options
- `--depth <N>`: (For `analyze`) Limit the recursion depth of the dependency analysis.
- `--context`: (For `analyze`) Generates a `project-context.md` file optimized for AI agent context (LLMs).

---

## Ecosystem Integration
RCP provides the "Physical Layer" (Reality) for the Hybrid ecosystem:
1. **Analyze Reality**: `hybrid-rcp export-structure .`
2. **Bridge with Intent**: Use `hybrid-TREE` and `hybrid-MATRIX` to link these nodes to requirements.

---

## License
This project is licensed under the Apache License, Version 2.0.
