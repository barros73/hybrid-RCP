# Hybrid-RCP: Visual & Semantic Orchestration for Rust

**The missing link between Static Analysis and Architectural Clarity.**

Hybrid-RCP (Rust Code Planner) is a VS Code extension designed to bring **Cognitive Scalability** to large Rust codebases. It transforms linear code into a hierarchical block graph, allowing developers to visualize ownership, navigate dependencies, and detect "Red Line" conflicts before code review.

## The Vision: Antigravity-Ready Architecture

In ecosystems like Google's **Antigravity**, where monorepos span billions of lines of code, traditional LSP (Language Server Protocol) tools are not enough. They tell you *what* is wrong, but not *why* the architecture is broken.

Hybrid-RCP fills this gap by providing:

1.  **Visual Ownership Analysis**: See who owns what. Green lines for immutable reads, Yellow for mutable writes, and **Red** for ownership conflicts.
2.  **Architectural Telemetry**: Visualize the "weight" of your code. Nodes are sized by **Compilation Cost** (LOC proxy), highlighting heavy blocks that slow down build times.
3.  **Dependency Hell Resolution**: Deep analysis of `Cargo.lock` to detect version conflicts and ensure consistency across micro-services.
4.  **Rapid Onboarding**: New engineers can understand the system architecture in minutes, not weeks, by navigating the **Master Project Tree**.

## Features

-   **Interactive Block Graph**: Visualizes modules (Core, File, Folder, Inline) and their relationships.
-   **Traffic Light System**:
    -   🟢 **Green**: Safe, Immutable Reference (`&T`)
    -   🟡 **Yellow**: Caution, Mutable Reference (`&mut T`)
    -   🔴 **Red**: Danger, Ownership Conflict (Multiple `&mut T`)
-   **Compilation Cost Metric**: Nodes scale dynamically based on their Lines of Code (LOC), identifying potential refactoring targets.
-   **Conflict Detection**: Identifies "Red Line" violations where multiple blocks attempt to mutate the same target, suggesting fixes like `Arc<Mutex<T>>` or `RefCell<T>`.
-   **Automated Dependency Management**: The AI Audit feature suggests and injects dependencies (e.g., `sqlx`, `tokio`) based on block names.

## Getting Started

1.  Open a Rust project in VS Code.
2.  Run the command `Hybrid RCP: Analyze Project`.
3.  Select your analysis depth (Full, High Level, or Custom).
4.  Explore the interactive graph and review the `conflicts-report.md`.

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
npx ts-node test-metric.ts # Verify compilation cost metric
npx ts-node test-parser.ts # Verify parser logic
```

## Future Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for our plans to support Multi-User Collaboration, Bazel Integration, and distributed "Red Line" enforcement.

## Architecture

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into the Block Node model and Graph Builder logic.
