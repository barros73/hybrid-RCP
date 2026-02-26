# Additional Conflict Scenarios

Hybrid-RCP is designed to detect "Red Line" architecture violations. Beyond the current implementation, here are other critical conflict scenarios that can be analyzed:

## 1. Architectural Violations
*   **Layering Violations:** Detecting if a low-level "Core" module imports a high-level "UI" module (Dependency Inversion violation).
*   **Dead Code (Orphans):** Modules that are never imported or used by the main entry points.
*   **Big Ball of Mud:** Nodes with excessive coupling (too many incoming/outgoing edges).

## 2. Safety & Security
*   **Hardcoded Secrets:** Detection of `api_key`, `password`, or `token` strings in source code.
*   **Unsafe Operations:**
    *   **Rust:** Usage of `.unwrap()` or `.expect()` in production code (Panic risk).
    *   **JS/TS:** Usage of `eval()` or `innerHTML`.
    *   **SQL:** Raw string concatenation in queries (SQL Injection risk).

## 3. Concurrency & Performance
*   **Blocking I/O in Async:** Calling synchronous file/network operations inside an `async fn`.
*   **Lock Contention:** Nested mutex locks `mutex.lock()... mutex2.lock()` (Deadlock risk).

## 4. Code Quality
*   **Debug Leftovers:** `console.log`, `print!`, or `fmt.Println` in production branches.
*   **TODO Density:** Modules with an excessive number of `TODO` or `FIXME` comments.
*   **God Classes:** Classes/Structs with too many methods (>20) or lines of code (>1000).

## Implementation Status
*   [x] Circular Dependencies
*   [x] Duplicate Symbols
*   [x] Memory/Resource Leaks (Basic)
*   [ ] Dead Code (Planned)
*   [ ] Hardcoded Secrets (Planned)
*   [ ] Unwrap/Panic Checks (Planned)
