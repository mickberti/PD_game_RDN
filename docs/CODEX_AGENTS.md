# Agenti specializzati Codex per GEARITHM

La configurazione di progetto è in `.codex/config.toml`; i profili sono in `.codex/agents/*.toml`. Codex CLI locale: `0.162.0-alpha.17.2`. Le istruzioni di [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) e della [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference) documentano questo formato. La configurazione personale in `~/.codex/config.toml` resta separata e non è stata modificata.

| Agente | Selezionarlo per | Skill pertinenti |
| --- | --- | --- |
| `gameplay_developer` | Motore numerico, effetti, scena Phaser | `gearithm-effects-development`, `gearithm-rdn-validation` |
| `level_designer` | Generazione, difficoltà, soluzioni, cataloghi versionati | `gearithm-rdn-validation` |
| `mobile_performance` | Rendering, memoria, startup, asset e comportamento su Android | `gearithm-assets-audit`, `gearithm-android-release` |
| `backend_economy` | Auth, Firestore, progressi, shop, ricompense, eventi | `gearithm-state-review` |
| `qa_reviewer` | Revisione indipendente di diff, test e regressioni | Skill di dominio interessata |

Il coordinatore principale gestisce architettura e integrazione; per questo non esiste un `software_architect` separato. Ogni agente legge gli `AGENTS.md` applicabili e apre una Skill solo quando la richiesta tocca il suo ambito. I TOML definiscono responsabilità e formato dei risultati, senza duplicare procedure.

## Selezione e richiamo

Codex può scegliere il profilo dal nome e dalla `description` quando la richiesta autorizza la delega. Per richiamo esplicito, indicare il nome nel prompt:

- `Delega a gameplay_developer l'analisi del bug sul seed 7919; chiedi a qa_reviewer di verificare il diff quando pronto.`
- `Usa level_designer per controllare i livelli v011 del range 80–100; restituisci seed e fallimenti riproducibili.`
- `Fai esaminare a backend_economy la riconciliazione del progresso offline e chiedi una revisione indipendente a qa_reviewer.`
- `Usa mobile_performance per misurare il frame time su Android dopo il nuovo atlas effetti.`

La disponibilità dei profili è riletta dalle nuove sessioni Codex. In CLI, `/subagents` mostra i thread attivi. I profili non costituiscono una sandbox: gli agenti ereditano permessi e strumenti dalla sessione principale.

## Orchestrazione e consumo di token

1. Il coordinatore definisce obiettivo, confini dei file, input riproducibili e risultato richiesto; per un compito breve procede da solo.
2. Delega soltanto analisi indipendenti o file disgiunti. Per esempio, `level_designer` controlla cataloghi mentre `backend_economy` traccia premi; un solo agente alla volta modifica `gameplay-page.component.ts` o altri file condivisi.
3. Attende i risultati necessari prima di integrare. Usa un secondo agente per revisione read-only quando la modifica comporta rischio reale, poi esegue i controlli applicabili e restituisce un report unico.
4. Limita ogni incarico a una versione, un flusso o un diff. Chiede prove con riferimenti ai file, non panoramiche generiche. `.codex/config.toml` limita a **3** i subagent aperti contemporaneamente, escluso il coordinatore.

Per un cambiamento a effetti e premi: `gameplay_developer` analizza il motore, `backend_economy` il salvataggio del premio su file disgiunti, poi `qa_reviewer` verifica il diff integrato. Per un piccolo ritocco UI, il coordinatore lavora direttamente.

## Manutenzione e limiti

- Quando cambiano cartelle o Skill, aggiornare le descrizioni dei profili e questa tabella; lasciare regole tecniche nei rispettivi `AGENTS.md` e procedure nelle Skill.
- Validare TOML e nomi univoci; usare `codex --strict-config` o `codex doctor` per la configurazione effettivamente caricata, e un incarico di sola lettura per verificare la delega dopo l'avvio di una nuova sessione.
- Il limite di concorrenza non rende sicure modifiche simultanee agli stessi file. Evitare fork o attivazione dei cataloghi, build di release e scritture Firebase in test di riconoscimento.
- Lint e runner Karma hanno problemi preesistenti documentati in `docs/RELEASE_READINESS_GEARITHM.md`; non considerarli verificati per effetto della configurazione degli agenti.

## Verifica iniziale

- I sei TOML sono stati letti con `tomllib` (Python 3.13): nomi univoci, campi obbligatori presenti e limite di concorrenza pari a 3.
- `codex --strict-config doctor --summary` carica la configurazione, ma termina con un errore del provisioning del sandbox Windows; segnala anche avvisi locali su MCP e stato dei thread. Non è una prova di build o di qualità applicativa.
- Un nuovo `codex exec` in sandbox read-only ha ricevuto la richiesta esplicita di delegare a `qa_reviewer`; il coordinatore ha restituito il valore `3` e ha riferito di aver usato quel profilo. Il test non ha richiesto modifiche al repository.
