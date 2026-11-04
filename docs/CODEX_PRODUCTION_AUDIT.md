# Audit di produzione GEARITHM

Usare `$gearithm-production-audit FULL` per una ricognizione completa, `$gearithm-production-audit QUICK` dopo modifiche circoscritte e `$gearithm-production-audit RELEASE` prima di sottoporre una build a Play. Si può chiedere `Delega a production_readiness un audit FULL read-only e integra il suo report`. Una nuova sessione Codex potrebbe essere necessaria per indicizzare il profilo. La Skill governa procedura e ID; il subagent raccoglie evidenze, il coordinatore aggiorna i documenti. Consultare le Skill di Android, RDN, asset e stato solo per i rispettivi controlli.

## Ambiti e output

| Modalità | Quando | Verifiche minime | Output |
| --- | --- | --- | --- |
| QUICK | Diff limitato o controllo periodico | Baseline Git, tre script read-only, controlli toccati e delta rispetto al report | Sintesi datata con ID cambiati |
| FULL | Nuova release candidate o audit iniziale | Tutti gli ID in `release-checklist.md`, build/typecheck/lint/test/catalogo quando eseguibili, controlli manuali espliciti | `docs/release/PRODUCTION_READINESS.md` e `RELEASE_ACTION_PLAN.md` |
| RELEASE | Subito prima di upload/rollout | FULL più AAB firmato, manifest release unito, test da Play e prove Console correnti | Decisione GO/NO-GO con riferimenti agli artefatti |

Il report registra data, revisione Git, versione/app ID, comandi ed exit code. Ogni ID ha requisito, stato, priorità, evidenza/percorso, metodo di verifica e correzione. `MANUAL` richiede un account o dispositivo; `NOT_RUN` è un comando non completato o non eseguito; `NOT_APPLICABLE` richiede prova che la funzione non sia distribuita. Un controllo statico non convalida regole Firebase distribuite, firma, comportamento Android o dichiarazioni Play.

Il coordinatore assegna eventualmente a `production_readiness` una raccolta read-only; può delegare RDN, economia o performance ai profili specialistici su ambiti distinti e consolidare un solo report. Evitare duplicazioni e deleghe per audit QUICK banali. Nessun audit firma, carica o pubblica una build, modifica dati Firebase o esegue commit. `npm run build` scrive `www`; `rdn:catalogue:check` può creare artefatti temporanei: confrontare lo stato Git prima e dopo.

Verifica iniziale: frontmatter YAML e TOML validati localmente; i 26 ID della checklist compaiono nel report FULL. `codex --strict-config doctor --summary` carica la configurazione, ma termina con un errore di provisioning del sandbox Windows; il riconoscimento e la delega effettiva del nuovo profilo non sono stati provati in una nuova sessione Codex.

## Cadenza e manutenzione

Eseguire QUICK a ogni modifica che tocchi un gate; FULL per ogni candidata; RELEASE con evidenze della specifica track. Aggiornare gli ID solo con migrazione esplicita nei report. Verificare le regole Play sulle [pagine ufficiali Google](https://support.google.com/googleplay/android-developer/) a ogni release. Tenere i valori sensibili fuori dai report; riportare solo esito, hash o identificativo non segreto dell'artefatto quando disponibile. Il report storico `docs/RELEASE_READINESS_GEARITHM.md` serve da contesto e non sostituisce prove correnti.
