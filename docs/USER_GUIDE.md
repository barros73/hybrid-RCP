# Hybrid-RCP User Guide

Welcome to **Hybrid-RCP**, the visual architecture and static analysis tool designed for cognitive scalability. This guide will help you install, configure, and use the extension effectively in VS Code (including Antigravity environments).

---

## 1. Installation

### From VSIX (Manual)
1.  Download the `.vsix` file.
2.  Open VS Code.
3.  Go to **Extensions** view (`Ctrl+Shift+X`).
4.  Click the `...` menu -> **Install from VSIX...**.
5.  Select the file and reload.

### From Source (Development)
1.  Clone the repository.
2.  Run `npm install` in the root directory.
3.  Run `npm run compile`.
4.  Press `F5` to launch the Extension Host.

---

## 2. Analyzing a Project

Hybrid-RCP supports **Rust**, **C++**, **C**, **Python**, **Go**, and **JavaScript/TypeScript**.

### Step-by-Step
1.  **Open your project** in VS Code (the root folder containing `Cargo.toml`, `package.json`, `go.mod`, etc.).
2.  Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
3.  Type and select: **`Hybrid RCP: Analyze Project`**.

### Configuration
1.  **Entry Point:** The extension tries to auto-detect your main file (e.g., `src/lib.rs`, `main.cpp`, `app.py`). If ambiguous, a dropdown will appear.
2.  **Depth:** Select how deep the graph should traverse:
    *   **High Level (Top 2 Levels):** Good for big picture.
    *   **Full Analysis:** Good for detailed debugging.
    *   **Custom:** Enter a number (e.g., 5).

### Hybrid Workspaces (Multi-Language)
If your project uses multiple languages (e.g., a Rust core with a C++ frontend, or Python scripts calling C):
1.  Select **`🌐 Auto-Detect Hybrid Workspace`** when prompted for the entry point.
2.  The extension will scan for *all* supported project files (`Cargo.toml`, `CMakeLists.txt`, `requirements.txt`, `package.json`, etc.) and merge them into a single graph.

---

## 3. Visualizing the Graph

Once analysis is complete, a **Hybrid-RCP Graph** panel will open.

### The Traffic Light System (Colors)
*   🟢 **Green Lines:** Safe, immutable references (Reading data).
*   🟡 **Yellow Lines:** Mutable references (Writing data).
*   🔴 **Red Lines:** **CONFLICTS**. Multiple blocks writing to the same data, memory leaks, or dangerous patterns.
*   🔵 **Blue Lines:** Ownership (Parent -> Child).

### Node Size
*   **Big Nodes:** Heavy code (High Lines of Code). Consider refactoring.
*   **Small Nodes:** Lightweight modules.

### Navigation
*   **Zoom/Pan:** Use mouse wheel and drag.
*   **Click Node:** (Future) Will jump to code definition.

---

## 4. Reports & AI Context

The extension generates three key files in your project root:

1.  `project-structure.json`: Raw graph data.
2.  `conflicts-report.md`: A human-readable list of errors.
    *   **Action:** Open this file to see specific line numbers for:
        *   **Memory Leaks:** (C/C++) Mismatched `malloc/free` or `new/delete`.
        *   **Concurrency Issues:** (Go) Unmanaged Goroutines.
        *   **Global Conflicts:** Duplicate function names across files or circular dependencies.
3.  `project-context.md`: **AI-Optimized Context**.
    *   **Action:** Copy the content of this file and paste it into ChatGPT, Gemini, or Claude.
    *   **Prompt Example:** *"I am pasting my project architecture below. Based on this, help me refactor the 'UserAuth' module to avoid the circular dependency with 'Database'."*

---

## 5. Creating New Blocks (Rust Only)

1.  Command Palette: **`Hybrid RCP: Create New Block`**.
2.  Enter name (e.g., `payment_service`).
3.  Select Type: `File` or `Folder`.
4.  Select Parent Module.
5.  **AI Audit:** The system may suggest adding dependencies to `Cargo.toml` (e.g., `tokio` for async blocks).

---

## 6. Supported Languages & Features

| Language | Key Features Detected |
| :--- | :--- |
| **Rust** | Ownership, Borrowing, `&mut` conflicts. |
| **C++** | `#include` hierarchy, `new`/`delete` mismatch (Memory Leaks). |
| **C** | `malloc`/`free` mismatch, unsafe `strcpy`/`sprintf`. |
| **Python** | Imports, Missing Type Hints, `requirements.txt` check. |
| **Go** | Unmanaged Goroutines, Unbuffered Channels. |
| **JS/TS** | `var` usage (scoping issues), Import/Require graph. |

---

## 7. Remote SSH & Cloud Development (Antigravity)

Hybrid-RCP is fully compatible with **VS Code Remote - SSH** and cloud-based IDEs (e.g., GitHub Codespaces, Google Cloud Workstations).

### How it works
The extension runs entirely on the **Remote Host** (where your code is stored).
1.  **Parsing:** The Rust/C++/Python/etc. parsers run on the server, saving bandwidth.
2.  **Visualization:** The extension automatically forwards the interactive Graph UI to your local VS Code instance.

### Setup
No special configuration is needed. Just install the extension in the **Remote** workspace (VS Code will usually prompt you to "Install in SSH: <Host>").

---

## 8. Troubleshooting

*   **"No entry point found":** Ensure your project follows standard conventions (`src/main...`, `app...`) or pick the file manually when prompted.
*   **Graph is empty:** Check if your code uses standard import/include syntax.
*   **Extension not activating:** Check the `Output` panel in VS Code (select "Hybrid RCP" in the dropdown).

---
*Generated by Hybrid-RCP Team for Antigravity Compatibility.*
