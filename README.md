# hybrid-RST IDE (VS Code Extension Concept) 🦀

**hybrid-RST** è un'estensione per VS Code progettata per semplificare la gestione di programmi Rust complessi attraverso una visualizzazione a **"Blocchi Gerarchici" (Core + Sottoparti)** assistita dall'AI.

L'obiettivo è trasformare la gestione dei file `lib.rs`, `mod.rs` e `Cargo.toml` in un'esperienza visiva, prevenendo i conflitti di *Ownership* e *Borrowing* prima ancora della compilazione.

---

## 🎯 Il Problema
Rust ha una curva di apprendimento ripida a causa della gestione rigorosa della memoria e della struttura dei moduli. In progetti complessi:
* Il coordinamento tra `Cargo.toml` e la gerarchia dei file è verboso.
* Tracciare chi "possiede" un dato tra il Core e i sottoblocchi è difficile mentalmente.
* I conflitti di dipendenze emergono solo dopo il comando `cargo build`.

## 💡 La Soluzione: Logica a Blocchi
Ispirato a *CodeBlocks*, RustFlow introduce una gerarchia visiva:
1.  **Core:** Il motore centrale dell'applicazione (logica di business, stati globali).
2.  **Sottoparti (Sub-blocks):** Moduli isolati e specializzati.
3.  **Core dei Sottoblocchi:** Logica interna di ogni modulo.
4.  **Tracciamento Connessioni:** Visualizzazione in tempo reale di "chi pesca cosa" per evitare conflitti di accesso ai dati.

---

## 🚀 Funzionalità Chiave (MVP)

### 1. Visualizzatore di Dipendenze Dinamico
Un pannello laterale che genera un grafo dei moduli. Se il `Sottoblocco A` dipende dal `Core`, viene tracciata una linea. Se il `Sottoblocco B` tenta di accedere a un dato già "preso" dal `Sottoblocco A`, la linea diventa rossa (Conflitto di Ownership).

### 2. AI Architetto (Integration)
Sfruttando modelli LLM (come Gemini/Jules), l'estensione:
* Genera automaticamente le dichiarazioni `mod` e `pub use` necessarie.
* Sincronizza il `Cargo.toml` in base alle librerie usate nei blocchi visivi.
* Suggerisce l'uso di `Arc<Mutex<T>>` o `&T` analizzando le connessioni tra i blocchi.

### 3. Sincronizzazione Bidirezionale
Modificando lo schema visivo, il codice Rust viene aggiornato. Modificando il codice (es. aggiungendo un parametro a una funzione del Core), lo schema evidenzia i blocchi che necessitano di aggiornamento.

---

## 🛠 Architettura Tecnica
* **Frontend:** VS Code Webview API con **React Flow** o **D3.js** per il grafo.
* **Backend:** TypeScript per l'estensione VS Code.
* **Analisi Rust:** Integrazione con `rust-analyzer` tramite LSP per estrarre i metadati dei tipi e dei tratti.
* **AI Layer:** Connessione alle API Google Gemini per la logica di refactoring e risoluzione conflitti.

---

## 📌 Roadmap
- [ ] **Fase 1:** Visualizzazione statica della struttura `mod` di un progetto esistente.
- [ ] **Fase 2:** Creazione di file e moduli tramite interfaccia a blocchi (Drag & Drop).
- [ ] **Fase 3:** Integrazione AI per l'auto-compilazione del `Cargo.toml`.
- [ ] **Fase 4:** Analizzatore di Ownership visuale (Highlight dei potenziali errori di compilazione).

---

## 🤝 Contribuire
Sei un amante di Rust o un esperto di AI? Aiutaci a rendere Rust accessibile a tutti!
1. Fai il Fork del progetto.
2. Crea un branch per la tua feature: `git checkout -b feature/nuovo-blocco`.
3. Apri una Pull Request.

---
*Progetto ideato per semplificare l'architettura dei sistemi moderni.*
