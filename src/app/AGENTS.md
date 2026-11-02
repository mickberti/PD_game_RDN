# Angular e Ionic

## Ambito e responsabilità
- Si applica a `src/app`, salvo istruzioni più specifiche. Qui vivono route, pagine, componenti condivisi, modelli e integrazione della scena di gioco.
- Fatti verificati: `app.config.ts` registra router, Ionic standalone, Firebase Auth e Firestore; `app.routes.ts` carica molte pagine con `loadComponent` e usa `AuthGuard`/`AdminGuard`. Le pagine sono in `pages`, UI riusabile in `shared`, modelli e servizi in `core`.

## Convenzioni e implementazione
- Seguire i componenti standalone e i file `*.page.ts` / `*.component.ts` già presenti; mantenere gli SCSS e gli asset vicino alle convenzioni esistenti. Usare signals/computed dove già modellano stato di vista e servizi; rispettare Observable/RxJS dove governano Auth e flussi asincroni. Non imporre una migrazione generale.
- Tenere la logica di partita nei servizi/motore; `pages/gameplay/gameplay-page.component.ts` orchestra la scena e la UI. Preservare la pulizia di listener, timer, sottoscrizioni e istanze Phaser quando una pagina viene ricreata.
- Per nuove route, mantenere i guard e i limiti di ambiente degli strumenti amministrativi e di debug. Per UX mobile verificare navigazione Ionic, input touch, pause/resume e layout a schermo ridotto.

## Regressioni, controlli e completamento
- Evitare accessi diretti alla pagina di gioco o admin che aggirino i guard; evitare doppie istanze della scena e stato UI divergente dai servizi.
- Per componenti/route: `npm run typecheck`, test mirati se presenti, e controllo manuale del flusso coinvolto; build per cambi di import o bootstrap.
- Completato quando navigazione, stato visibile, ciclo di vita e comportamento mobile interessati sono verificati senza introdurre nuove fonti di verità.


## Multi-Agent Orchestration

Use specialized subagents when delegation provides
a measurable benefit in quality, isolation or speed.

### Delegation rules

- Simple changes: handle directly without subagents.
- Gameplay mechanics: prefer gameplay_developer.
- Level configuration: prefer level_designer.
- Angular and mobile performance: prefer mobile_performance.
- Firebase and economy: prefer backend_economy.
- Architecture changes: prefer software_architect.
- Complex changes: request independent qa_reviewer review.

### Efficiency rules

- Do not spawn agents for trivial tasks.
- Do not delegate the same analysis to multiple agents.
- Respect the configured concurrency limit.
- Prefer independent, bounded tasks.
- Avoid concurrent edits to the same files.
- Delegate investigation and review when useful.
- Keep the main agent responsible for integration.
- Reuse existing Skills when applicable.
- Do not spawn additional agents merely because
  concurrency capacity is available.

### Completion

The main agent must consolidate subagent findings,
resolve conflicts and report verification results.
