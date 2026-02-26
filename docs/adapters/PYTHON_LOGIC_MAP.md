# 🐍 Python Logic & Dependency Map (Python Adapter)

**Stato Semafori Python:**
- `[ ]` : Script Vuoto
- `[/]` : In Sviluppo (Mancano Type Hints)
- `[X]` : Testato (Pytest Pass / Mypy Clean)
- `[!]` : Errore Runtime (ImportError / TypeMismatch)

---

## 🌳 Python Functional Tree
app_root (Python_Core)
├── [X] Schema_Definitions (Pydantic models)
├── [/] Data_Analysis_Service (Sub-module)
│   ├── [X] Preprocessor
│   ├── [/] ML_Inference [! Errore: Versione NumPy incompatibile]
│   └── [ ] Reporter
└── [ ] API_Gateway (FastAPI)

---

## 🧪 Type & Dependency Guard
**Regole per l'AI:**
1. **Type Hinting:** L'AI deve imporre l'uso di `typing` (List, Dict, Optional) per simulare la sicurezza di Rust.
2. **Virtual Env Sync:** L'AI deve monitorare `requirements.txt` o `pyproject.toml`. Se un blocco usa `pandas`, deve apparire nel manifesto.
3. **Docstrings:** Ogni blocco deve avere la documentazione delle eccezioni sollevate (`raises`).

---

## 📦 Environment Management
[pyproject.toml / requirements.txt]
├── [X] Base_Dependencies (Python ^3.10)
├── [/] Dev_Dependencies (black, mypy, pytest)
└── [!] Conflict_Check: Version mismatch tra scipy e scikit-learn.
