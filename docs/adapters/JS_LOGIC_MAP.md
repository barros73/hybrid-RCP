# 📜 JavaScript Logic & Async Map (JS Adapter)

**Stato Semafori JS:**
- `[ ]` : Script Vuoto / Scheletro
- `[/]` : In Sviluppo (Callback Hell Risk)
- `[X]` : Testato (Jest Pass / ESLint Clean)
- `[!]` : Errore Runtime (Undefined is not a function)

---

## 🌳 JS Functional Tree
app_root (JS_Core)
├── [X] Modules (ESM / CommonJS)
├── [/] Service_Layer (Sub-module)
│   ├── [X] Data_Fetcher
│   ├── [/] Processor [! Errore: Promise non gestita]
│   └── [ ] Logger
└── [ ] UI_Components (React/Vue/Vanilla)

---

## 🧪 Async & Scope Guard
**Regole per l'AI:**
1. **Async/Await:** Preferire `async/await` rispetto alle catene di `new Promise` o callback annidate.
2. **Scope Safety:** Segnalare l'uso di `var` come deprecato; suggerire `const` o `let`.
3. **Error Handling:** Ogni blocco `await` deve essere avvolto in un `try/catch` o avere un `.catch()`.

---

## 📦 Package Management
[package.json]
├── [X] Scripts (start, test, build)
├── [/] Dependencies (express, lodash)
└── [!] Conflict_Check: Versioni obsolete o vulnerabili (npm audit).
