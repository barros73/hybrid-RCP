# 🔨 C Architecture & Memory Map (C Adapter)

**Stato Semafori C:**
- `[ ]` : Nodo Inerte (Header .h)
- `[/]` : Implementazione in corso (.c)
- `[X]` : Validato (No Memory Leaks / Compilato)
- `[!]` : Conflitto Critico (Dangling Pointer / Linker Error)

---

## 🏗️ C Structural Tree (Headers & Links)
root (Core_C)
├── [X] Types_Definition (.h)
├── [/] Hardware_Interface (Sottoblocco)
│   ├── [X] Driver_Wrapper
│   └── [!] Buffer_Manager [! Errore: Possibile buffer overflow]
└── [ ] Math_Lib (Sottoblocco)

---

## 🧠 Memory & Ownership Audit (C Specific)
**Regole per l'AI:**
1. **Puntatori:** Se un blocco alloca memoria con `malloc`, l'AI deve verificare la presenza di una corrispondente `free`.
2. **Buffer Safety:** L'uso di `strcpy` o `sprintf` deve essere segnalato come rischioso; suggerire `strncpy` o `snprintf`.
3. **Linker Sync:** L'AI deve verificare che ogni funzione dichiarata nel `.h` abbia una implementazione nel `.c` per prevenire "Undefined Reference".

---

## 📦 Build System (Makefile Sync)
[Makefile]
├── [X] Compiler_Flags (-Wall -Wextra)
├── [/] Object_Files (%.o: %.c)
└── [ ] Linker_Libraries (-lm -lpthread)
