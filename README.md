# Hybrid-RCP: Visual & Semantic Orchestration (Rust, C++, Python)

**The missing link between Static Analysis and Architectural Clarity.**

Hybrid-RCP (Hybrid Code Planner) is a VS Code extension designed to bring **Cognitive Scalability** to large, multi-language codebases. It transforms linear code into a hierarchical block graph, allowing developers to visualize ownership, navigate dependencies, and detect architectural conflicts before code review.

Originally built for Rust, Hybrid-RCP now supports **C++** and **Python** through its adaptive parser system.

## The Vision: Antigravity-Ready Architecture

In ecosystems like Google's **Antigravity**, where monorepos span billions of lines of code across multiple languages, traditional tools often fail to capture the "why" behind architectural decisions.

Hybrid-RCP fills this gap by providing:

1.  **Visual Ownership Analysis**: See who owns what.
    *   **Rust:** Borrow Checker visualization (Green/Yellow/Red).
    *   **C++:** Header/Source relationships and memory safety hints.
    *   **Python:** Import dependencies and type hint validation.
2.  **Architectural Telemetry**: Visualize the "weight" of your code (LOC proxy), highlighting heavy blocks that slow down build times or increase cognitive load.
3.  **Dependency Hell Resolution**: Deep analysis of `Cargo.lock` (Rust) and dependency manifests to ensure consistency.
4.  **Rapid Onboarding**: New engineers can understand the system architecture in minutes by navigating the **Master Project Tree**.

## Features

-   **Multi-Language Support**:
    -   🦀 **Rust**: Full ownership and borrow checker visualization.
    -   ⚡ **C++**: Header/Implementation mapping (`.hpp` <-> `.cpp`) and memory management audits.
    -   🐍 **Python**: Module import graphs and type hinting enforcement.
-   **Interactive Block Graph**: Visualizes modules (Core, File, Folder, Inline) and their relationships.
-   **Traffic Light System**:
    -   🟢 **Green**: Safe Reference / Immutable Read
    -   🟡 **Yellow**: Mutable Write / Active Development
    -   🔴 **Red**: Conflict / Danger Zone (Ownership Violation, Circular Dependency)
-   **Compilation Cost Metric**: Nodes scale dynamically based on their Lines of Code (LOC).
-   **Conflict Detection**: Identifies language-specific "Red Line" violations:
    -   **Rust**: Multiple `&mut T`.
    -   **C++**: Raw pointers without smart pointer wrappers.
    -   **Python**: Missing type hints or dependency mismatches.

## Getting Started

1.  Open a project (Rust, C++, or Python) in VS Code.
2.  Run the command `Hybrid RCP: Analyze Project`.
3.  Select your entry point (e.g., `src/lib.rs`, `main.cpp`, `app.py`) if not automatically detected.
4.  Select your analysis depth.
5.  Explore the interactive graph and review the generated `conflicts-report.md`.

## Language-Specific Documentation

*   [Rust Architecture](docs/ARCHITECTURE.md)
*   [C++ Adapter Map](docs/adapters/CPP_SYSTEM_MAP.md)
*   [Python Logic Map](docs/adapters/PYTHON_LOGIC_MAP.md)

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
```bash
npx ts-node test-factory.ts # Verify parser selection
npx ts-node test-parser.ts # Verify Rust parser
npx ts-node test-cpp-parser.ts # Verify C++ parser
npx ts-node test-python-parser.ts # Verify Python parser
```

## Future Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for plans regarding Multi-User Collaboration and Bazel Integration.
