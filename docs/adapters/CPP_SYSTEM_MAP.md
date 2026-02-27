# 🛠️ C++ Architecture & Memory Map (C++ Adapter)

**C++ Traffic Light Status:**
- `[ ]` : Inert Node (Header only)
- `[/]` : Implementation in progress (.cpp)
- `[X]` : Validated (No Memory Leaks / Compiled)
- `[!]` : Critical Conflict (Dangling Pointer / Linker Error)

---

## 🏗️ C++ Structural Tree (Headers & Links)
root (Core_CPP)
├── [X] Types_Definition (.hpp)
├── [/] Hardware_Interface (Sub-block)
│   ├── [X] Driver_Wrapper
│   └── [!] Memory_Pool [! Error: Possible double free]
└── [ ] Math_Engine (Sub-block)

---

## 🧠 Memory & Ownership Audit (C++ Specific)
**AI Rules:**
1. **Pointers:** If a block passes a `raw pointer (*)`, the AI must suggest converting it to `std::unique_ptr` or `std::shared_ptr`.
2. **RAII:** Each resource (file, socket, memory) must be associated with a block destructor.
3. **Linker Sync:** The AI must verify that every function declared in the `.h` has a counterpart in the `.cpp` to prevent "Undefined Reference".

---

## 📦 Build System (CMake/Makefile Sync)
[CMakeLists.txt]
├── [X] Project_Target_Setup
├── [/] External_Libs (find_package)
└── [ ] Optimization_Flags (-O3, -march=native)
