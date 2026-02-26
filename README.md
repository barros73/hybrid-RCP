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

## Getting Started

1.  Open a project in VS Code.
2.  Run the command `Hybrid RCP: Analyze Project`.
3.  Select your entry point (e.g., `src/lib.rs`, `main.cpp`, `main.go`, `app.js`) if not automatically detected.
4.  Select your analysis depth.
5.  Explore the interactive graph and review the generated `conflicts-report.md`.

## Language-Specific Documentation

*   [Rust Architecture](docs/ARCHITECTURE.md)
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

## Future Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for plans regarding Multi-User Collaboration and Bazel Integration.
