# Istruzioni per GEARITHM

## Ambito e responsabilità
- Si applica all'intero repository; gli `AGENTS.md` più vicini aggiungono solo regole del proprio ambito.
- Fatti verificati: app Angular 20, Ionic 8, Capacitor 8, Phaser 4, AngularFire/Firebase 11; Node 22.12.0 (`.nvmrc`, `.node-version`). `angular.json` costruisce la web app in `www`; `capacitor.config.ts` la usa per le piattaforme native. Il vecchio Angular 17 citato in `README.md` non descrive le dipendenze attuali.
- I confini sono `src/app` (UI e core), `src/app/core/game/phaser` (motore e scena), `src/app/core/services` (stato, dati e integrazioni), `src/assets` (risorse), `android` (progetto nativo). `scripts` e `tools/rnd-catalogue` gestiscono i cataloghi RDN.
- Per procedure ripetibili e richiamo delle Skill locali, consultare `docs/CODEX_SKILLS.md`; le Skill sono in `.agents/skills` e aggiungono controlli specifici senza sostituire queste istruzioni.
- Per ruoli delegabili e strategia di orchestrazione, consultare `docs/CODEX_AGENTS.md`; i profili sono in `.codex/agents`.

## Convenzioni e implementazione
- Seguire nomi e stile del file vicino: il codice esistente usa TypeScript, SCSS, componenti standalone e servizi `providedIn: 'root'`; virgolette e indentazione non sono uniformi.
- Prima di cambiare un contratto, seguire chiamanti, modelli e configurazioni; mantenere compatibilità di salvataggi, cataloghi e progressione. Le versioni pubblicate in `src/app/core/game/phaser/catalogues` e `src/assets/rnd/catalogues` richiedono il workflow documentato in `tools/rnd-catalogue/README.md`.
- Non modificare output generati (`www`, build native) come sorgente. Tenere separate modifiche dell'utente; evitare commit e comandi distruttivi salvo richiesta esplicita.

## Regressioni, controlli e completamento
- Evitare alterazioni non intenzionali di Adventure, Time Attack, Free, autenticazione e dati persistiti.
- Verifiche proporzionate: `npm run typecheck`; test mirati `*.spec.ts` per logica toccata; `npm run rdn:catalogue:check` per cataloghi; `npm run build` quando cambia integrazione/build. L'audit in `docs/RELEASE_READINESS_GEARITHM.md` segnala che lint e runner Karma sono già guasti: distinguere tali limiti dalle regressioni nuove. Non eseguire release o sincronizzazioni native per semplici documenti.
- Un'attività è completa quando percorsi e contratti coinvolti sono verificati, i controlli pertinenti passano o i limiti sono dichiarati, e `git status --short` distingue le modifiche fatte da quelle preesistenti.
