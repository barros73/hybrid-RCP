# 🦀 Rust Logic & Ownership Map (Rust Adapter)

**Rust Traffic Light Status:**
- `[ ]` : Inert Module (Declared but empty)
- `[/]` : In Development (Cargo Check in progress)
- `[X]` : Validated (No Borrow Checker Errors / Tests Pass)
- `[!]` : Ownership Conflict (Multiple Mutable Borrows / Lifetime Error)

---

## 🏗️ Rust Module Tree (Crates & Modules)
crate_root (Rust_Core)
├── [X] lib.rs (Main Entry)
├── [/] logic (Sub-module)
│   ├── [X] parser
│   ├── [/] analyzer [! Error: Multiple &mut T detected]
│   └── [ ] reporter
└── [ ] utils (Helper module)

---

## 🛡️ Ownership & Borrowing Guard
**AI Rules:**
1. **Ownership:** Each block must clarify data ownership. If a block receives a `&mut`, the AI must signal the "Yellow" status.
2. **Lifetimes:** If a block returns a reference, a lifetime (`'a`) must be specified to prevent dangling references.
3. **Crate Sync:** The AI must monitor `Cargo.toml`. If an external dependency is added, it must be reflected in the global graph.

---

## 📦 Build System (Cargo Sync)
[Cargo.toml]
├── [X] Core_Dependencies (serde, tokio)
├── [/] Dev_Dependencies (proptest, cargo-audit)
└── [!] Conflict_Check: Version mismatch in dependency tree (Cargo.lock analysis required).
