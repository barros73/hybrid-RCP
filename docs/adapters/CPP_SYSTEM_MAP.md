# 🛠️ C++ Architecture & Memory Map (C++ Adapter)

**Stato Semafori C++:**
- `[ ]` : Nodo Inerte (Solo Header)
- `[/]` : Implementazione in corso (.cpp)
- `[X]` : Validato (No Memory Leaks / Compilato)
- `[!]` : Conflitto Critico (Dangling Pointer / Linker Error)

---

## 🏗️ C++ Structural Tree (Headers & Links)
root (Core_CPP)
├── [X] Types_Definition (.hpp)
├── [/] Hardware_Interface (Sottoblocco)
│   ├── [X] Driver_Wrapper
│   └── [!] Memory_Pool [! Errore: Possibile doppia deallocazione]
└── [ ] Math_Engine (Sottoblocco)

---

## 🧠 Memory & Ownership Audit (C++ Specific)
**Regole per l'AI:**
1. **Puntatori:** Se un blocco passa un `raw pointer (*)`, l'AI deve suggerire la conversione in `std::unique_ptr` o `std::shared_ptr`.
2. **RAII:** Ogni risorsa (file, socket, memoria) deve essere associata a un distruttore di blocco.
3. **Linker Sync:** L'AI deve verificare che ogni funzione dichiarata nel `.h` abbia una controparte nel `.cpp` per prevenire "Undefined Reference".

---

## 📦 Build System (CMake/Makefile Sync)
[CMakeLists.txt]
├── [X] Project_Target_Setup
├── [/] External_Libs (find_package)
└── [ ] Optimization_Flags (-O3, -march=native)
