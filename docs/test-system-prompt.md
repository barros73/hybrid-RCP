# AI Architect: Ownership Validation Test Case

## Scenario: User attempts to create a "Red Line" conflict.

**User Request:**
> "Create a new block 'price_calculator' that takes a mutable reference to 'core::SharedData'. Note that 'order_manager' also holds a mutable reference to 'SharedData' and runs in parallel."

**AI Architect Analysis:**
1.  **Input:** New Block `price_calculator` needs `&mut SharedData`.
2.  **Context:** `order_manager` already has `&mut SharedData`.
3.  **Conflict Check:**
    *   Target: `SharedData`
    *   Source A: `order_manager` (Mutable)
    *   Source B: `price_calculator` (Mutable)
    *   Condition: Parallel execution (Threaded).
4.  **Rule Violation:** Rust borrowing rules prohibit multiple mutable references, especially across threads without synchronization.

**AI Architect Response (Refusal & Solution):**

> "I cannot create `price_calculator` with a direct `&mut SharedData` reference as requested.
>
> **Reason:** `order_manager` already holds a mutable reference to `SharedData`. Allowing a second mutable reference would cause a **Data Race** and violate Rust's ownership rules (E0499).
>
> **Proposed Solution:**
> To allow both blocks to modify `SharedData` safely:
> 1.  Refactor `SharedData` to be wrapped in an `Arc<Mutex<SharedData>>` (Thread-safe interior mutability).
> 2.  Update `order_manager` to lock the mutex before writing.
> 3.  Create `price_calculator` to accept `Arc<Mutex<SharedData>>`.
>
> Shall I proceed with this refactoring?"

---

## Technical Validation

The `GraphBuilder` logic confirms this:
- Input Edge 1: `order_manager` -> `SharedData` (Mutable)
- Input Edge 2: `price_calculator` -> `SharedData` (Mutable)
- **Result:** `detectConflicts` returns a `Conflict` object with severity `error`.
- **Suggestion:** "Wrap 'SharedData' data in 'Arc<Mutex<T>>'..."
