# Future Work & Pending Features

## 1. Cargo.toml as "Block Manifest" (Hierarchical Management)
The IDE should manage `Cargo.toml` hierarchically to prevent version conflicts.

*   **Global Manifest (Core):** Defines library versions for the entire workspace.
*   **Local Features (Sub-blocks):** Each block declares only the features it needs.
*   **AI Audit:** When adding a new block (e.g., "Database"), the AI automatically adds necessary dependencies (e.g., `tokio`, `sqlx`) to `Cargo.toml`, ensuring version compatibility with the Core.

## 2. Block Interface Contract (Traits)
To standardize block interactions, the AI should enforce a `SubBlock` trait for new modules:

```rust
// The schema the AI must follow for every new block
pub trait SubBlock {
    type Input;  // What it consumes from Core
    type Output; // What it returns

    // The AI decides whether to use &self or &mut self
    // based on the block diagram connection type.
    fn execute(&mut self, data: Self::Input) -> Self::Output;
}
```

## 3. AI Architect System Prompt (Protocol)
For the "AI Architect" integration, the following system prompt guidelines should be used:

> "You are a Rust Architect AI. Your task is to translate the user's visual block connections into valid Rust code.
>
> **Constraints Analysis:** If the user connects two blocks with write access to the same Core data, you MUST reject the operation or propose a `Mutex<T>`.
>
> **Cargo.toml Management:** Whenever a block requires an external feature (e.g., 'Network'), update `Cargo.toml` in the Workspace by adding the correct dependency.
>
> **Tracking:** Maintain a JSON map of the project where every function is mapped to its parent block. If code is changed manually, update the visual graph."
