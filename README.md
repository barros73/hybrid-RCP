# hybrid-RST IDE (VS Code Extension Concept) 🦀

**hybrid-RST** is a VS Code extension designed to simplify the management of complex Rust programs through an AI-assisted **"Hierarchical Block" (Core + Subparts)** visualization.

The goal is to transform the management of `lib.rs`, `mod.rs`, and `Cargo.toml` files into a visual experience, preventing *Ownership* and *Borrowing* conflicts before compilation.

---

## 🎯 The Problem
Rust has a steep learning curve due to its strict memory management and module structure. In complex projects:
* Coordination between `Cargo.toml` and the file hierarchy is verbose.
* Tracking who "owns" a piece of data between the Core and sub-blocks is mentally taxing.
* Dependency conflicts only surface after running `cargo build`.

## 💡 The Solution: Block Logic & Ownership Visualization
Inspired by *CodeBlocks*, RustFlow introduces a visual hierarchy where **Ownership** is the central citizen:

1.  **The "Semaphore" System on Connections:**
    *   **Green Line (Immutable Reference `&T`):** A Sub-block reads data from the Core. Multiple blocks can have green lines to the same data.
    *   **Yellow Line (Mutable Reference `&mut T`):** A Sub-block is modifying Core data. The AI "dims" all other connections to that data, enforcing Rust's single-writer rule.
    *   **Red Line (Ownership Conflict):** Two Sub-blocks attempt to write (`&mut`) to the same Core data. The IDE blocks the write and the AI suggests a solution.

2.  **Smart Pointer Container Suggester:**
    When a Red Line (conflict) is detected, instead of a cryptic error, the AI suggests "boxes" to wrap the data:
    *   **`RefCell<T>`:** If two blocks need read/write access at different times (runtime check).
    *   **`Arc<Mutex<T>>`:** If blocks run on different threads (Parallelism).
    *   **`Option<T>`:** If the Core needs to signal that data might be unavailable.

3.  **`Cargo.toml` as a "Block Manifest":**
    *   **Global Manifest (Core):** Defines library versions for everyone.
    *   **Local Features (Sub-blocks):** Each block declares only needed features.
    *   **AI Audit:** Adding a "Database" block automatically adds `tokio` and `sqlx` to TOML, verifying version compatibility.

---

## 🚀 Key Features (MVP)

### 1. Dynamic Dependency Viewer
A sidebar panel that generates a module graph. The AI analyzes the call graph and translates compiler errors into visual alerts.

### 2. AI Architect (Integration)
Leveraging LLM models (like Gemini/Jules), the extension:
* Analyzes predictive traits: "To connect Block B to Core, Block B must implement `Display`."
* Assisted Refactoring: Moving logic regenerates pointers and access permissions (`pub`, `pub(crate)`).
* Visualizes Data Lifecycle: Shows how data flows from Core outwards.

### 3. Bidirectional Synchronization
Modifying the visual schema updates the Rust code. Modifying the code updates the schema.

---

## 🛠 Technical Architecture
* **Frontend:** VS Code Webview API with **React Flow** or **D3.js** for the graph.
* **Backend:** TypeScript for the VS Code extension.
* **Rust Analysis:** Integration with `rust-analyzer` via LSP to extract type and trait metadata.
* **AI Layer:** Connection to Google Gemini APIs for refactoring logic and conflict resolution.

---

## 📌 Roadmap
- [ ] **Phase 1:** Static visualization of the `mod` structure of an existing project (Current Focus).
- [ ] **Phase 2:** Creation of files and modules via block interface (Drag & Drop).
- [ ] **Phase 3:** AI integration for `Cargo.toml` auto-compilation.
- [ ] **Phase 4:** Visual Ownership Analyzer (Highlighting potential compilation errors).

---

## 🤝 Contributing
Are you a Rust lover or an AI expert? Help us make Rust accessible to everyone!
1. Fork the project.
2. Create a branch for your feature: `git checkout -b feature/new-block`.
3. Open a Pull Request.

---
*Project designed to simplify modern system architecture.*
