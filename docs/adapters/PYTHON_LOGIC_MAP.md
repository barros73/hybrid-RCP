# 🐍 Python Logic & Dependency Map (Python Adapter)

**Python Traffic Light Status:**
- `[ ]` : Empty Script
- `[/]` : In Development (Missing Type Hints)
- `[X]` : Tested (Pytest Pass / Mypy Clean)
- `[!]` : Runtime Error (ImportError / TypeMismatch)

---

## 🌳 Python Functional Tree
app_root (Python_Core)
├── [X] Schema_Definitions (Pydantic models)
├── [/] Data_Analysis_Service (Sub-module)
│   ├── [X] Preprocessor
│   ├── [/] ML_Inference [! Error: Incompatible NumPy version]
│   └── [ ] Reporter
└── [ ] API_Gateway (FastAPI)

---

## 🧪 Type & Dependency Guard
**AI Rules:**
1. **Type Hinting:** The AI must enforce the use of `typing` (List, Dict, Optional) to simulate Rust-like safety.
2. **Virtual Env Sync:** The AI must monitor `requirements.txt` or `pyproject.toml`. If a block uses `pandas`, it must appear in the manifest.
3. **Docstrings:** Each block must have documentation for raised exceptions (`raises`).

---

## 📦 Environment Management
[pyproject.toml / requirements.txt]
├── [X] Base_Dependencies (Python ^3.10)
├── [/] Dev_Dependencies (black, mypy, pytest)
└── [!] Conflict_Check: Version mismatch between scipy and scikit-learn.
