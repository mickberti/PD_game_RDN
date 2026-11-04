# GEARITHM — Production readiness

Audit **FULL**: 3 novembre 2026, revisione `05b034d1c7da5a0428691b315965e321c68a6751`, package locale `com.mberti.tec.pdGameRDN`, Android `1.0.20` (`versionCode 20`). Baseline Git pulita. **Decisione: NO-GO** per errori asset e gate di qualità falliti, oltre a gate P0 esterni senza evidenza. Nessuna percentuale di readiness: i controlli manuali e il comportamento su device non sono misurati. Il precedente [audit del 30 ottobre](../RELEASE_READINESS_GEARITHM.md) è contesto storico, non prova di superamento oggi.

## Esiti dei comandi — baseline FULL prima della Fase 1

| Verifica | Esito del 3 novembre 2026 | Portata |
| --- | --- | --- |
| `node .agents/skills/gearithm-android-release/scripts/audit-android.mjs` | PASS, exit 0; identità locale coerente, target SDK 36 | Non verifica Play/Firebase Console, firma o manifest finale |
| `node .agents/skills/gearithm-rdn-validation/scripts/audit-catalogue.mjs` | PASS, exit 0; v011 attiva, 900 livelli, zero errori strutturali | Non esegue replay/soluzione |
| `node .agents/skills/gearithm-assets-audit/scripts/audit-assets.mjs` | FAIL, exit 1; 14 errori atlas, 2 warning audio | File mancanti, frame fuori bordo e dimensioni PNG discordanti; audio `change-01/02.wav` |
| `npm run build` | PASS, exit 0; output `www`, avvisi Sass | Nessun test Android |
| `tsc --noEmit -p tsconfig.app.json` con heap 8 GB | PASS, exit 0 | Solo TypeScript app |
| `npm run typecheck` con heap 8 GB | NOT_RUN completo: terminato per OOM dopo circa 113 s, exit 1 | Il progetto TS globale non è verificato |
| `npm run lint` | FAIL, exit 1: nessuna configurazione ESLint | Problema già presente nell'audit storico |
| `npm test -- --watch=false --browsers=ChromeHeadless` | FAIL in compilazione: `src/test.ts`, SCSS e firme spec non allineati; 0 test eseguiti | Chrome parte, ma non esegue spec validi |
| `npm run rdn:catalogue:check` | FAIL, exit 1 dopo 900/900 livelli rigenerati: `sourceFingerprint` diverso dal manifest pubblicato | Il catalogo v011 è strutturalmente valido, ma non allineato al generatore corrente |

## Controlli — baseline FULL prima della Fase 1

`P0` blocca identità, dati o sicurezza; `P1` blocca la candidata; `P2` richiede correzione o accettazione motivata; `P3` è manutenzione. `MANUAL` indica prova su account/dispositivo assente, `NOT_RUN` verifica non completata. Ogni riga riporta requisito, evidenza, verifica residua e azione. Gli ID sono definiti nella [checklist](../../.agents/skills/gearithm-production-audit/references/release-checklist.md).

| ID / area | Requisito | Stato / priorità | Evidenza e percorso | Verifica residua → azione |
| --- | --- | --- | --- | --- |
| AND-01 Android | Identità unica Play/Firebase | MANUAL P0 | Script Android PASS; `capacitor.config.ts`, `android/app/build.gradle`; audit storico registra un ID alternativo richiesto | Confrontare scheda Play e app Firebase → fissare package definitivo prima di ricompilare |
| AND-02 Android | Versione e SDK conformi | PASS P1 | `android/variables.gradle`, `android/app/build.gradle`: min 24, target/compile 36, v20 | Confrontare `versionCode` con ultima versione Play prima upload → incrementare se già usato |
| AND-03 Android | Web e pacchetto stessa revisione | NOT_RUN P1 | `npm run build` PASS; nessun sync/native build corrente | Eseguire sync e bundle da questa revisione; registrare hash artefatto |
| AND-04 Android | AAB, firma, manifest release | MANUAL P0 | Nessun AAB firmato/manifest release verificato in questo audit; `android/app/src/main/AndroidManifest.xml` abilita backup | Ispezionare manifest unito e firma su RC → risolvere permessi/backup e validare AAB |
| AND-05 Android | Smoke su dispositivi | MANUAL P1 | Nessun device run corrente | Provare login, restore, back, touch, audio, pause/resume, WebGL su due device |
| WEB-01 Angular | Build e typecheck app | PASS P1 | Build e `tsconfig.app.json` passano; `npm run typecheck` globale OOM | Tenere build/app check nel gate; ridurre memoria del check globale separatamente |
| WEB-02 Angular | Lint e suite test | FAIL P1 | `npm run lint` exit 1, Karma compila con errori e 0 spec | Ripristinare config ESLint, entry/style test e spec; rerun CI |
| WEB-03 Angular | Guard e debug di produzione | WARNING P2 | `src/app/app.routes.ts`, `src/app/pages/settings/settings.page.ts`; audit storico segnala correzioni locali | Ispezionare bundle/route production e provare accessi non autorizzati |
| GAM-01 Gameplay | Tre modalità su device | MANUAL P1 | `src/app/pages/gameplay/gameplay-page.component.ts`, `src/app/core/game/phaser`; nessun smoke attuale | Provare Adventure, Time Attack e Free con completamento, pausa e ripresa |
| GAM-02 Gameplay | Catalogo v011 e generazione | FAIL P1 | Audit strutturale PASS: 900 livelli; `rdn:catalogue:check` exit 1 per `sourceFingerprint` non aggiornato; `active-catalogue.config.ts`, `src/assets/rnd/catalogues`, `scripts/generate-rdn-catalogue.mjs:150` | Analizzare differenza tra sorgente e v011; usare workflow di fork/versioning, senza sovrascrivere il pubblicato |
| GAM-03 Gameplay | Replay ed effetti GEM/LINK/AREA | NOT_RUN P1 | Spec presenti in `src/app/core/game/phaser`; Karma non compila | Riparare suite, eseguire spec mirati e replay, poi smoke visivo |
| AST-01 Asset | Atlas e audio coerenti | FAIL P1 | Audit asset exit 1: 14 errori atlas, 2 warning audio; `src/assets/game`, `src/assets/audio` | Correggere metadata/file e verificare preview/ascolto su device; rerun script |
| FB-01 Firebase | Sign-In su build Play | MANUAL P0 | `src/app/core/services/auth`, `android/app/google-services.json` locale | Verificare registrazione Android e SHA Play/debug, login/logout/restore da track |
| FB-02 Firebase | Regole dati distribuite | MANUAL P0 | `firebase.json` vuoto; snapshot in `docs/firebase/firestore.rules.current.txt`; scritture client in `progress.service.ts` | Test con due UID e non-admin sulle regole live/Emulator → impedire cross-user e saldi arbitrari |
| FB-03 Firebase | Riconciliazione progressi | WARNING P0 | `game-state.service.ts`, `progress-store.service.ts` usano fallback/cache e retry; rischio annotato nell'audit storico | Riprodurre offline/reconnect e due device → evitare overwrite di progresso più recente |
| FB-04 Firebase | Config/documenti pubblici | MANUAL P1 | `config.service.ts` legge Firestore `gameConfigs/public` con fallback | Verificare documenti, lettura e autorizzazioni nell'ambiente release |
| ECO-01 Economia | Integrità monete/premi | MANUAL P0 | Shop virtuale in `src/app/pages/shop/shop.page.ts`; progresso scritto dal client | Verificare regole/operazioni atomiche e replay acquisto/eventi con due account |
| ECO-02 Economia | Ads/IAP coerenti | NOT_APPLICABLE P2 | `rdn-rewarded-ad.service.ts` usa solo provider opzionale; nessun SDK IAP/ads rilevato in `package.json` | Se introdotti, rivalutare Play Billing, consenso e Data Safety |
| SEC-01 Sicurezza | Secret e log auth | WARNING P1 | `src/app/core/services/auth/login-service.ts`; audit storico dice log token rimossi; ricerca file non ha rilevato keystore tracciati | Verificare diff/build release, secret scan e log su device prima upload |
| SEC-02 Privacy | Cancellazione, backup, policy | MANUAL P0 | Google login presente; `AndroidManifest.xml` ha `allowBackup=true`; nessuna procedura di cancellazione verificata | Definire cancellazione in-app e URL esterno se account creati, privacy e backup |
| PLAY-01 Google Play | Target API e identità | WARNING P0 | targetSdk 36 locale; package Play definitivo sconosciuto | Verificare regola API corrente e listing Play per package scelto |
| PLAY-02 Google Play | Scheda e supporto | MANUAL P1 | Asset store, screenshot, descrizioni e URL non verificabili nel repository | Approvare e caricare asset/testi/contatto in Console |
| PLAY-03 Google Play | Dichiarazioni | MANUAL P0 | Manifest release e comportamento SDK non verificati | Completare Data Safety, app access, rating, audience, ads con evidenze effettive |
| PLAY-04 Google Play | Track e accesso | MANUAL P0 | Nessuna prova di firma, install da Play, accesso produzione o closed test | Verificare requisiti account e test chiuso, poi installazione dalla track |
| QLT-01 Qualità | Crash/ANR e rollout | MANUAL P1 | Nessuna telemetria o owner/rollback corrente verificati | Definire monitoraggio Play Vitals, soglie stop e responsabile |
| QLT-02 Qualità | Evidenza e decisione | PASS P1 | Questo report e piano associato registrano limiti e NO-GO | Aggiornare data/esiti per ogni RC prima di cambiare decisione |

## Riferimenti Google correnti

La [regola target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) richiede API 36 per nuove app e aggiornamenti ordinari dal 31 agosto 2026; il valore locale è coerente. Le [regole per nuovi account personali](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-419) possono richiedere 12 tester continuativi per 14 giorni, secondo account e track. La [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), gli [asset della scheda](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-en) e la [cancellazione account](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en&rd=1) richiedono verifica in Console e nei flussi reali. [Play Billing](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) è pertinente se si introducono pagamenti per beni digitali; lo shop attuale usa moneta del gioco. Rileggere le pagine ufficiali al momento della candidatura.

## Analisi mirata GAM-02 — 3 novembre 2026

`sourceFingerprint` non è un hash dei file sorgente: `scripts/generate-rdn-catalogue.mjs` lo calcola sui JSON `levels` e `audit`. Il fingerprint `fb7ca48efbcf423b` corrisponde ai JSON v011 pubblicati. Il generatore corrente differisce **anche nel gameplay**: il commit `6a14a30` ha anticipato le fasce SHIELD/WALL/MIRROR/AMPLIFY; al livello Adventure 15 la rigenerazione usa `WALL_1` anziché `SHIELD_1` e un valore iniziale passa da −12 a −2. Modifiche successive agli eventi del motore cambiano alcune tracce audit. Inoltre l'output contiene `generationStats.elapsedMs`, dipendente dal tempo di esecuzione, che può cambiare l'hash anche a parità di plancia.

Due generazioni in memoria del livello 200 hanno prodotto la stessa plancia e lo stesso audit dopo aver escluso `elapsedMs`: determinismo dimostrato per quel campione. Un replay read-only delle **900 soluzioni pubblicate** con il motore corrente ha dato 900 vittorie e zero timer scaduti; ciò convalida la risolvibilità osservata del pubblicato, non la correttezza di ogni possibile plancia rigenerata. `GameProgress` conserva modalità/numero/stelle senza versione catalogo; i salvataggi recenti della partita includono la versione, quello Adventure legacy controlla ID/configVersion/levelVersion/seed ma non il fingerprint della plancia. Preservare v011. Un eventuale v012 richiede fork, replay completo, scelta esplicita per progressi e partite sospese e attivazione separata.

## Remediation tecnica Fase 1 — 3 novembre 2026

Questa sezione aggiorna i gate tecnici del primo audit; i gate manuali Firebase, Android firmato e Play restano invariati. **Decisione ancora NO-GO.** Nessuna regola gameplay o catalogo pubblicato è stata modificata.

| ID | Stato attuale | Evidenza nuova e limite |
| --- | --- | --- |
| AST-01 | PASS statico; verifica device MANUAL | Audit asset: 23 atlas, 42 riferimenti audio, **0 errori e 0 warning**. Sei PNG e due WAV storici ripristinati; quattro atlas senza consumer tolti dal registro; frame corretti secondo i PNG. Preview visiva, ascolto e memoria su mobile non eseguiti. |
| WEB-01 | PASS | `npm run build` exit 0 con avvisi Sass; `npm run typecheck` controlla app, spec e configurazione Capacitor in progetti separati. La vecchia invocazione unica su `tsconfig.json` caricava anche quattro cataloghi TS legacy generati (~40 MB), non importati dall'app, ed esauriva 8 GB. |
| WEB-02 | FAIL | `npm run test:ci` compila **93/93** test e li esegue in ChromeHeadless: **92 superati, 1 fallito**. ESLint 9/Angular ESLint 20 ora analizza TypeScript, HTML e template inline ma trova **70 errori e 1 warning** nel codice esistente; `npm run lint` exit 1. |
| GAM-03 | WARNING | Spec mirati progressione 5/5, effetti 15/15, servizio puzzle 3/3. Il replay Karma dei 450 Adventure pubblicati passa. Resta il test Free sul bilanciamento dei segni; smoke mobile non eseguito. |
| GAM-02 | FAIL | Il disallineamento v011 è funzionale e di metadati; le 900 soluzioni pubblicate vincono col motore corrente, ma il check di rigenerazione resta exit 1. |

Il solo fallimento Karma rimasto riproduce code Free con scarto tra operatori positivi e negativi pari a **2/4/5** per NORMAL/HARD/EXPERT (atteso ≤1) in `puzzle-generation.spec.ts`. Il generatore bilancia piani provvisori ma ricrea i piani dopo l'avanzamento del PRNG; può cambiare il numero finale di operatori. Serve un intervento gameplay separato e test di soluzioni, escluso dai vincoli di questa fase. Il lint rivela debito già presente nei sorgenti: `no-unused-vars`, `no-explicit-any`, `prefer-inject`, `no-output-native` e `no-unused-expressions` sono tra le regole coinvolte. La configurazione ora è eseguibile; non si dichiara il gate superato.

Revisione indipendente `qa_reviewer`: nessuna regressione nuova confermata nel diff. Due lacune individuate e corrette durante la revisione: `capacitor.config.ts` aggiunto al typecheck separato e template Angular inline aggiunti al lint. Il reviewer ha rieseguito audit asset (0/0) e `git diff --check` (PASS); non ha ripetuto build, Karma o lint. Preview e ascolto su Android restano manuali.
