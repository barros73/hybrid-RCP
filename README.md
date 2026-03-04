# Hybrid-RCP: v0.6.1 - 2026-03-04
## Visual & Semantic Orchestration (Rust, C++, Python, C, Go, JS)

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
    -   🦀 **Rust**: Comprehensive ownership analysis, `use` / `mod` dependency extraction, and borrow checker visualization.
    -   ⚡ **C++**: Header/Implementation mapping (`.hpp` <-> `.cpp`) and memory management audits (new/delete tracking).
    -   🐍 **Python**: Module import graphs and type hinting enforcement.
    -   🔨 **C**: `malloc`/`free` pairing checks and unsafe function detection.
    -   📜 **JS/TS**: Module imports (ESM/CJS), Class hierarchy, and scope audits.
-   **Architecture Conflict Detector**:
    -   🔴 **Ownership Violations**: Detects multiple components attempting to mutate shared state (e.g., `app_state` in Rust).
    -   🔴 **Missing Modules**: Flags `mod` declarations in Rust where the corresponding file is missing.
    -   🟡 **Memory Safety**: Identifies manual memory management (`new`/`delete`) in C++ that should be replaced by smart pointers.
-   **Global Dependency Mapping (The Spatial Map)**:
    -   Extracts project-wide `imports`/`exports` to build a complete directed graph of the "Physical Reality".
    -   Outputs `edges` in `hybrid-rcp.json` for 3D/2D graph visualization in MATRIX.
-   **Traffic Light Ownership**:
    -   🟢 **Green**: Stable Reference / Immutable Read.
    -   🟡 **Yellow**: Active Development / Mutable Write.
    -   🔴 **Red**: Conflict / Danger Zone (Ownership Violation, Memory Leak).
-   **AI Context Generation**: Auto-generates `project-context.md` optimized for LLMs, providing a compact architectural map.

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

## 🛠️ CLI Reference & Operational Manual

### Usage
```bash
node dist/cli.js <command> <path/params> [options]
```

### Global Options
- `--ai-format`: Hidden flag across all commands that suppresses human-readable console metrics, returning pristine JSON. Essential for M2M communication and LLM Agents ingestion.

---

### Commands Deep Dive

#### 1. `export-structure` (The Mapper)
Performs a deep, recursive semantic scan of the target workspace.
- **Action**: Bypasses formatting (via `logicHash`), ignores build folders (`target`, `node_modules`), parses Rust (and other supported languages), and maps the abstract syntax tree into a unified graphical JSON.
- **Output**: Generates `.hybrid/hybrid-rcp.json`, which serves as the "Reality Layer" for the MATRIX engine.
- **Example**: `hybrid-rcp export-structure . --ai-format`

#### 2. `analyze-lock` (The Dependency Auditor)
Evaluates `Cargo.lock` or similar lockfiles for dependency hell.
- **Action**: Computes a map of all dependencies and flags conflicting versions of the same library, providing severity ratings and suggested fixes to prevent build failures.
- **Example**: `hybrid-rcp analyze-lock Cargo.lock`

#### 🔮 Upcoming AST Semantic Enhancements (For AI Context)
To provide true "Super-Context" to LLM Agents, the RCP parser is expanding its extraction schema for `hybrid-rcp.json`. The next iteration will extract:
1.  **Endpoints & Signatures**: Public methods, properties, and I/O types (e.g., `fetchMarket(symbol: string): Promise<MarketData>`).
2.  **Memory Constraints**: Rust Borrowing/Lifetimes and encapsulated private imports to prevent AI hallucination of concurrent logic.
3.  **Real AST Edges**: Direct parsing of file `imports` to populate the `edges` array (e.g., `CoreAggregator` -> `UsMarketPoller`), enabling 3D Graph visualization and "Next Best Action" matrix calculations.
4.  **`logicHash` Injection**: A condensed MD5 of the raw structural code, used by `hybrid-matrix simulate` to detect if AI patches destructively mutate the skeleton.

#### 3. `analyze` (The Inspector)
Executes a highly-focused, granular architectural check on a specific file or module.
- **Action**: Evaluates traffic-light ownership (Immutable read, Mutable write, Conflicts) and detects global architectural violations (circular paths, ODR violations).
- **Options**:
  - `--depth <N>`: Limits the recursion depth for dependencies.
  - `--context`: Generates an AI-optimized `project-context.md` locally inside `.hybrid/`.
- **Example**: `hybrid-rcp analyze src/lib.rs --context`

#### 4. `create` (The Scaffolder)
Safely engineers boilerplate logic.
- **Action**: Instantiates a new file or folder (`mod.rs`) construct while guaranteeing that the parent files are securely updated with the proper export statements, preventing orphan code logic.
- **Example**: `hybrid-rcp create src/network handler file`

---

## 📜 Global Ecosystem Logging (Audit Trail)

RCP operations (like deep systemic exports and pattern analysis) append their historical activity to a centralized execution ledger.

**Log Location:**
**`📁 .hybrid/rcp-report.log`**

**Example Log Entry:**
```text
[2026-02-28T14:43:00.000Z] COMMAND: export-structure
--- HYBRID RCP EXPORT REPORT ---
✅ Exported 152 nodes
📂 Path: /project/.hybrid/hybrid-rcp.json
🕒 Timestamp: 2026-02-28T14:43:00.000Z
--------------------------------
```

---

## Ecosystem Integration
RCP provides the "Physical Layer" (Reality) for the Hybrid ecosystem:
1. **Analyze Reality**: `hybrid-rcp export-structure .`
2. **Cross-Reference**: `hybrid-MATRIX connect`
3. **Generate Instructions**: `hybrid-MATRIX bridge`

---
*Copyright 2026 Fabrizio Baroni. Licensed under the Apache License, Version 2.0.*
