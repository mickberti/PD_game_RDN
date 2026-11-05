# GEARITHM — piano per la release

Base: [audit FULL del 3 novembre 2026](PRODUCTION_READINESS.md). **NO-GO** finché i blocchi P0/P1 non sono chiusi con prove della candidata specifica. Le stime sono di lavoro tecnico, non includono attese di Play o disponibilità dei tester. Nessuna azione qui implica modifica automatica del gioco o della produzione.

| Ordine | ID audit | Priorità | Azione concreta e owner | Prova di chiusura / dipendenza |
| --- | --- | --- | --- | --- |
| 1 | AND-01, PLAY-01 | P0 | Proprietario Play/Firebase: decidere package definitivo confrontando listing e app Android Firebase | ID scritto e coerente in Play, Capacitor, Gradle e client Firebase; prerequisito per firma/login |
| 2 | FB-02, ECO-01 | P0 | Backend: esportare e revisionare regole Firestore effettivamente distribuite; testare due UID, non-admin, valute, premi, eventi e `meta/time` | Test deny/allow riproducibili, nessun client può aumentare saldi o modificare altri utenti; dipende dall'accesso Firebase |
| 3 | FB-03 | P0 | Backend/QA: riprodurre load fallito, edit offline, riconnessione, secondo device e conflitti | Progresso remoto più recente preservato e nessun premio duplicato; richiede account test |
| 4 | SEC-02, PLAY-03 | P0 | Prodotto/privacy: definire account deletion, backup e policy; leggere manifest release e SDK reali | Flusso e URL esterno testati se applicabili; Data Safety, app access, audience/rating/ads coerenti; dipende da build RC |
| 5 | AST-01 | P1 | QA mobile: verificare visivamente atlas e ascoltare le due cue recuperate; misurare il costo degli asset aggiunti | Audit statico già 0/0; preview e dispositivo ancora MANUAL |
| 6 | WEB-02, GAM-03 | P1 | Gameplay/QA: validare Free reale e risolvere il test del bilanciamento; frontend: smaltire 70 errori lint senza disabilitare regole | `npm run test:ci` 93/93 PASS e `npm run lint` PASS; smoke Free con seed e azioni riproducibili |
| 7 | GAM-02 | P1 | Level designer: mantenere v011 immutato e introdurre un gate di integrità + replay del pubblicato; valutare v012 solo se si adottano plance nuove | Hash JSON e replay 900/900 su motore corrente; check rigenerativo distinto e dichiarato FAIL per v011 |
| 8 | FB-01, FB-04, AND-05, GAM-01 | P0/P1 | QA mobile: installare RC su almeno due device Android; login Google, logout, restore, config, Adventure, Time Attack, Free, shop, touch/back/audio/WebGL, offline/reconnect | Matrice device/OS/account/esiti, nessun crash o perdita progressi; dipende da package e Firebase |
| 9 | AND-03, AND-04 | P0/P1 | Release engineer: ricostruire web, sincronizzare Capacitor, generare/validare AAB con firma proprietario e manifest unito | Hash AAB, versione/package/firma/permessi e installazione da track; dipende dalle correzioni e accesso firma |
| 10 | PLAY-02, PLAY-04 | P0/P1 | Proprietario Play: completare icona, feature graphic, screenshot, descrizioni, supporto, privacy URL, closed test e accesso produzione | Console senza task obbligatori aperti, test da track concluso; dipende da RC e requisiti account |
| 11 | QLT-01, QLT-02 | P1 | Release owner: definire monitoraggio crash/ANR, rollout graduale e rollback/hotfix; rieseguire audit RELEASE | Nessun P0/P1 aperto, evidenze linkate, decisione GO esplicita sulla versione caricata |

## Percorso più breve verificabile

Confermare identità e regole Firebase, riprodurre la riconciliazione, sistemare asset e harness, poi costruire una sola RC e testarla da Play. Le attività di privacy/Console possono procedere in parallelo, ma devono usare manifest e SDK della stessa RC. Non usare il PASS del build web come sostituto di firma, device o dati server.

### Stato dopo la Fase 1 tecnica (3 novembre 2026)

- **AST-01, correzione statica completata:** audit asset 0 errori/0 warning. Mancano preview, ascolto e profilo memoria su Android; i binari ripristinati aggiungono circa 11,3 MB ai sorgenti.
- **WEB-01 completato:** build production e typecheck app+spec+config Capacitor passano. Il typecheck è suddiviso senza alleggerire `strict` o togliere spec; quattro cataloghi TS storici generati di circa 10 MB ciascuno, senza import runtime, non appartengono al gate applicativo.
- **WEB-02 parziale:** Karma compila ed esegue 93 test, 92 passano. Riparare il bilanciamento Free richiede una modifica gameplay separata; il lint produce 70 errori e 1 warning nel sorgente esistente, da smaltire per gruppi senza disabilitare le regole.
- **GAM-02 analisi completata, blocco aperto:** derivazione funzionale del v011 accertata; fork v012 e migrazione restano progettazione di Fase 2, senza riscrivere v011.
- **Gate manuali invariati:** Firebase, firma/manifest release, device, privacy e Play Console non sono stati verificati in questa fase.

### Dipendenze esterne e limiti

- Accesso proprietario a Play Console e Firebase Console per package, SHA, regole distribuite, Data Safety, firma, track e requisiti closed test. Non chiedere token, keystore o `google-services.json` in chat.
- Dispositivi e account test per login, progresso cross-device e gameplay. Il repository da solo non dimostra questi flussi.
- Il vecchio `tsc -p tsconfig.json` caricava anche quattro cataloghi TS legacy generati sotto `tools/rnd-catalogue/legacy` (circa 40 MB complessivi) e ha esaurito 8 GB di heap. Il nuovo gate `npm run typecheck` controlla app, tutti gli spec e `capacitor.config.ts` in progetti separati; gli artefatti legacy non sono importati dall'app e richiedono un controllo separato solo se riutilizzati.
- Lo shop corrente usa moneta virtuale. Ads e IAP futuri richiederanno un nuovo audit delle dichiarazioni, del consenso e della verifica server; non sono prerequisito per aggiungere monetizzazione alla prima release.

## Verifica Fase 1 sul commit corrente — 4 novembre 2026

Revisione verificata: `02e1df4384913618406e0dd33f9dae966a9e69ec`. Lo stato Git prima di questa verifica mostrava solo una modifica preesistente dell'utente a `AGENTS.md`, preservata. Le tabelle dell'[audit iniziale](PRODUCTION_READINESS.md) restano prova storica; questa matrice ne confronta i sei problemi tecnici richiesti. `PASS` è limitato al controllo eseguito, non equivale a idoneità Play o prova su dispositivo.

| Problema | Stato 3 nov | Modifiche Fase 1 e file | Stato 4 nov / prove eseguite | Regressioni e limiti |
| --- | --- | --- | --- | --- |
| Atlas | FAIL: 14 errori | PNG storici recuperati in `src/assets/ui/fantasy_bg`; frame corretti in `atlas-box-set1.ts`, `atlas-res-icons-set1.ts`, `atlas-top-set1.ts`; quattro metadati orfani rimossi e `src/app/core/services/ui/assets/atlas.service.ts` riallineato | **PASS statico:** audit asset 23 atlas, 0 errori, exit 0 | Nessuna nuova anomalia nell'audit statico; preview, memoria e device NOT_RUN. Sei PNG aggiungono circa 11,3 MB insieme ai WAV |
| Audio | WARNING: 2 cue mancanti | `src/assets/audio/sfx/gem/change-01.wav`, `change-02.wav` recuperati dalle versioni storiche | **PASS statico:** audit asset 42 riferimenti, 0 warning, exit 0 | Ascolto e latenza su Android NOT_RUN |
| ESLint | FAIL: config assente | `eslint.config.cjs` usa plugin Angular/TypeScript installati e template inline | **FAIL:** `npm run lint` exit 1, 70 errori e 1 warning, riprodotti il 4 nov | Ora rileva debito esistente; nessuna regola disabilitata per ottenere PASS |
| Karma e spec | FAIL: bootstrap/SCSS assenti, 0 test eseguiti | `angular.json`, `src/test.ts`, `package.json` (`test:ci`), spec in `src/app/core/game/phaser` e `src/app/core/services` aggiornati alle API correnti | **FAIL:** `npm run test:ci` compila 93/93, esegue 93/93, supera 92/93; un test Free fallisce con scarti 2/4/5 per NORMAL/HARD/EXPERT | Il test fallito è mantenuto; l'analisi indica possibile difetto del bilanciamento, da verificare senza alterare v011 |
| Typecheck globale | NOT_RUN completo: OOM con heap 8 GB; check app PASS | `package.json` suddivide app, spec e config; `tsconfig.config.json` include `capacitor.config.ts` | **PASS:** `npm run typecheck` exit 0 il 4 nov, tutti e tre i progetti | Quattro TS legacy generati (~40 MB) non importati dall'app restano fuori dal gate applicativo, non una regressione nota |
| Catalogo RDN v011 (Adventure/Time Attack) | FAIL `rdn:catalogue:check`; audit strutturale PASS | Nessun JSON v011 né generatore modificato in Fase 1; analisi documentata in `PRODUCTION_READINESS.md` | **FAIL rigenerazione / PASS integrità strutturale:** audit 900 livelli complessivi, 0 errori oggi; replay 900/900 vittorie nella Fase 1. Il check rigenerativo non è stato rieseguito il 4 nov | Differenze funzionali dal livello 15 e `elapsedMs` variabile; v011 pubblicato resta immutato. Nessuna migrazione eseguita |

`npm run build` passa sul commit corrente con avvisi Sass. Nessuna build Android, prova visuale/audio, Firebase Console o Play Console è stata eseguita in questa verifica. La decisione complessiva resta **NO-GO** per WEB-02 e i gate manuali P0/P1.

### Decisione sul catalogo v012

Il manifest e i 900 JSON v011 restano coerenti; le 900 soluzioni pubblicate hanno vinto nel replay di Fase 1. La rigenerazione corrente diverge funzionalmente già al livello 15 (SHIELD_1 pubblicato contro WALL_1, valore esterno -12 contro -2) dopo la modifica alle fasce effetti in `6a14a30`. Una doppia generazione in memoria del livello 200 ha prodotto la stessa plancia dopo aver escluso `generationStats.elapsedMs`, variabile; non è una prova di determinismo per tutti i 900 livelli. Per la prima pubblicazione v012 **non è necessario** se si distribuisce v011 immutato e si introduce un gate di integrità/replay del pubblicato. Un fork del catalogo serve se si adottano le nuove plance; un cambiamento incompatibile del generatore Free può invece richiedere versionamento del runtime e dei salvataggi anche senza un nuovo catalogo pubblicato. I progressi remoti per modalità/livello non sono versionati; i run locali moderni includono v011 nella chiave, quelli legacy no. Prima di attivare una versione nuova occorrono regole esplicite per stelle, progressi, run sospesi e rollback.

## Modalità Free: rischio e validatore proposto

La UI passa seed, difficoltà, 4–9 sfere e selezioni effetti da `hub.page.ts` a `gameplay-page.component.ts`; `RdnPuzzleService.load()` usa `activeRdnCatalogueRuntime.generateRdnPuzzle('adventure', ...)`, producendo una plancia **persistent v011 generata in memoria**, non un livello JSON Adventure/Time Attack. `catalogues/v011/catalog.builder.ts` tenta 12/20/32/64 seed per EASY/NORMAL/HARD/EXPERT; i livelli-base sono 10/30/55/80. `PuzzleEngine` gestisce impulsi e vittoria quando tutti gli `outerValues` sono zero; il servizio Free rimpiazza dopo ogni operazione valida l'operatore dell'ingranaggio, con scelte numeriche ±1..2/3/5/7 secondo difficoltà e divisioni speciali da NORMAL/HARD. Gli effetti opzionali GEM/LINK/AREA dipendono da difficoltà e sfere (`catalogues/v011/effect-progression.config.ts`).

La generazione ricalibra le soluzioni con `PuzzleEngine`, ma **non** simula il rimpiazzo runtime degli operatori. Il solver esistente lavora su una plancia statica. `rdn-simulation.spec.ts` copre seed con effetti OFF e 4–8 sfere; altri spec verificano un seed, budget effetti e un reroll. Non esiste oggi un test che dimostri la risolvibilità Free per tutte le combinazioni di seed, 9 sfere, effetti, reroll, undo/restart e ripristino. Due rischi da investigare: un impulso può rendere l'ingranaggio diverso dal percorso risolto dal generatore; `UNDO`/`RESTART` ripristinano lo stato del motore ma non necessariamente operatori e stato PRNG del reroll. È inoltre da verificare la gestione del seed dopo `Continue` e di plance senza mosse utili: un puzzle incastrato potrebbe restare senza esito automatico.

Validatore proposto, read-only per default: input `(v011, difficoltà, seed, sfere 4..9, maschera effetti 0..7)`; genera due volte tramite la stessa API della UI e confronta la plancia escludendo solo `generationStats.elapsedMs`; verifica resolver, budget, segni e soluzioni statiche. Poi rigioca **attraverso `RdnPuzzleService.dispatch`**, includendo reroll, undo/restart e save/restore, e cerca un percorso vincente con budget esplicito. Un solver completo deve includere nel nodo valori, rotazione, fase, runtime effetti, operatori mutabili e PRNG; `puzzle-solver.ts` da solo non prova questo contratto. Esiti separati: `PASS` con azioni di vittoria, `FAIL` con configurazione invalida o impossibilità dimostrata, `INCONCLUSIVE` se scade il budget. Salvare solo tuple seed/azioni nei log, senza toccare cataloghi. Matrice QUICK: seed `0, 1, 12345, 2147483646` × 4 difficoltà × 6 taglie × effetti OFF/ALL. FULL: 20 seed deterministici × 4 × 6 × 8 maschere = 3840 casi, con replay dei fallimenti.

## Piano Fase 2 per dipendenze

### Necessario per la prima pubblicazione

I blocchi P0 su Firebase, identità Android e requisiti Play partono subito in parallelo ai controlli locali P1. L'ordine sotto descrive le dipendenze tecniche del lavoro nel repository, non autorizza a rimandare i P0.

| Ordine / priorità | Obiettivo; subagent e Skill | File e modifica prevista | Accettazione | Rischi e manuale |
| --- | --- | --- | --- | --- |
| 1 / P1 | Stabilire un gate v011 immutabile; `level_designer`, `gearithm-rdn-validation` | `scripts/generate-rdn-catalogue.mjs`, nuovo controllo di integrità/replay, `src/assets/rnd/catalogues/v011` **solo lettura**: distinguere check del pubblicato da rigenerazione | Hash manifest/JSON verificato e 900/900 soluzioni vinte sul motore corrente; nessuna differenza nei JSON | Il check attuale confronta sempre con `activeManifest()` anche con `--version v012`; non dichiararlo PASS per v011. QA indipendente |
| 2 / P1 | Diagnosticare e correggere bilanciamento e solvibilità Free; `gameplay_developer`, `gearithm-rdn-validation` e `gearithm-effects-development` se tocca effetti | `catalogues/v011/catalog.builder.ts`, `rnd-puzzle.service.ts`, `puzzle-solver.ts`, `puzzle-generation.spec.ts`, `rdn-simulation.spec.ts`; costruire prima il validatore e confrontare plance Free per seed e salvataggi esistenti. Cambi al builder v011 solo se riproducibilità e ripristino restano invariati; altrimenti fork/versionamento con migrazione esplicita | `npm run test:ci` 93/93 o più; QUICK/FULL con PASS di vittoria per i casi richiesti. Ogni INCONCLUSIVE va riesaminato con budget maggiore o prova riproducibile: se resta tale, il gate di solvibilità resta aperto. Replay Adventure/Time Attack invariato | Il builder v011 alimenta Free e i salvataggi versionati v011: una patch silenziosa può cambiare plance e run. Testare save/restore, undo/restart e progressi; review `qa_reviewer` |
| 3 / P1 | Smaltire debito ESLint; `mobile_performance` per Angular/Ionic, `qa_reviewer` per review | `src/app` e `eslint.config.cjs`; correggere i 70 errori per gruppi, senza spegnere regole o migrazioni generalizzate | `npm run lint` exit 0; `npm run typecheck`, `npm run test:ci` e build continuano a passare salvo difetto Free già tracciato | Rinominare output/constructor o toccare auth può cambiare API; diff piccoli, QA mirato |
| 4 / P1 | Verificare asset e flussi su Android; `mobile_performance`, `gearithm-assets-audit`, `gearithm-android-release` | `src/assets`, preview atlas e audio, build Android candidata; nessuna correzione preventiva | Preview/frame corretti, ascolto cue, memoria/startup e smoke Free/Adventure/Time Attack su almeno due device | Richiede dispositivi e test account; firmare/pubblicare solo nella fase autorizzata |
| 5 / P0 | Chiudere integrità dati e identità release; `backend_economy`, `gearithm-state-review`, poi `qa_reviewer` | Regole **distribuite** Firebase, flussi progress/shop, package/Firebase/Play; progettare fix solo dopo prove con due UID e offline/reconnect | Nessuna scrittura cross-user o valuta arbitraria; progressi preservati; package/SHA/login verificati | Console e proprietario necessari; nessuna modifica live senza test e piano rollout |
| 6 / P0/P1 | Preparare RC e gate Play; `production_readiness`, `gearithm-production-audit` con `gearithm-android-release` | Manifest release, AAB, policy, listing, track e report; aggiornare evidenze sulla stessa revisione | Nessun P0/P1 aperto, test da track e audit RELEASE con decisione GO motivata | Firma, privacy, Data Safety e Play Console sono manuali |

### Condizionale o rinviabile

| Quando | Intervento; agente/Skill | Accettazione e rischio |
| --- | --- | --- |
| Se si adottano nuove plance pubblicate o un fix Free rompe seed/salvataggi v011 | Per nuove plance Adventure/Time Attack, fork **v012** con `level_designer` e `gearithm-rdn-validation`: correggere il check della versione inattiva, stabilizzare il fingerprint e generare/simulare separatamente. Per Free soltanto, valutare versionamento runtime/salvataggi senza assumere che serva v012 | Replay e solvibilità completi, differenze documentate, scelta esplicita per stelle/progressi non versionati e run legacy/versionati; rollback provato. v012 non è prerequisito se il pubblicato v011 resta immutato e Free resta compatibile |
| Dopo i gate di pubblicazione | Ridurre avvisi Sass, ampliare telemetria e ottimizzare peso degli asset; `mobile_performance` e `qa_reviewer` | Nessuna regressione visiva o di startup, metriche dispositivo confrontabili; priorità P2/P3 secondo impatto misurato |

## Evidenze Fase 2B — Code Quality / ESLint, 4 novembre 2026

Baseline `npm run lint`: **70 errori, 1 warning**. Classificazione completa per regola: 28 `@typescript-eslint/no-unused-vars` (codice inutilizzato), 28 `no-explicit-any` (tipizzazione), 3 `no-unused-expressions` (espressioni senza effetto), 8 `@angular-eslint/prefer-inject` (iniezione Angular), 3 `no-output-native` (naming di output/eventi DOM); 1 warning `use-lifecycle-interface`. Nessuna violazione di template o di gestione subscription è stata segnalata dal lint. Le regole con maggiore rischio funzionale erano `no-output-native` (binding pubblici), `no-unused-expressions` (cache/catalogo e presentazione), `no-unused-vars` su parametri pubblici e mapping progressi, e `no-explicit-any` sul login.

**Risultato:** 70/70 errori e il warning corretti; 0 residui. Modifiche puntuali in 32 file applicativi: 16 UI/pagine/direttiva, 12 servizi/guard/modelli, 4 audio/Phaser legacy/scena. `eslint.config.cjs`, generatore Free, catalogo v011, spec, dipendenze e configurazioni di produzione invariati. I soli nomi pubblici cambiati sono gli output `select` → `modeSelected`, `toggle` → `toggled`, `cancel` → `cancelled`, con binding locali aggiornati. Nessuna modifica intenzionale alle regole di gioco, autenticazione o progressione; i percorsi manuali login/offline e UI su dispositivo restano da provare.

| Verifica sulla revisione corrente | Esito |
| --- | --- |
| `npm run lint` | **PASS**, 0 errori, 0 warning |
| `npm run typecheck` | **PASS**, app + spec + config |
| `npm run build` | **PASS**, avvisi Sass preesistenti |
| `npm run test:ci` | **FAIL noto**, 93 compilati, 93 eseguiti, 92 superati; resta `puzzle-generation.spec.ts:34` (Free: scarti NORMAL 2, HARD 4, EXPERT 5) |

**WEB-02: PASS per il gate ESLint locale.** La suite Karma è operativa, ma GAM-03/Free e i gate manuali di release restano aperti; decisione complessiva **NO-GO**. Il `qa_reviewer` ha esaminato il diff applicativo senza finding concreti; restano smoke manuali di hub, impostazioni, login/logout Google e ciclo di vita dell'overlay. `git diff --check` passa; lo stato Git mostra i 32 file applicativi di questa fase, questo piano e `AGENTS.md` già modificato prima della fase e preservato.

## Evidenze Fase 2C — Firebase Security & Data Integrity, 4 novembre 2026

Il [rapporto tecnico](FIREBASE_SECURITY_AUDIT.md) ricostruisce path, letture/scritture, rischi e test di accettazione. **NO-GO**. La copia locale delle regole è tracciata nel repository ma non è configurata in `firebase.json` e non prova il deploy live. Lo scanner statico `node scripts/audit-local-firestore-rules.mjs` termina con exit 1 **atteso** e segnala quattro pattern: owner può scrivere `role` nel proprio profilo, owner può scrivere tutto il progress privato, ogni autenticato può scrivere `meta/time`, ogni autenticato può accedere a `sessions/*`. I quattro test del diagnostico passano; exit 0 non sarebbe un PASS di sicurezza. Emulator **NOT_RUN**: CLI e `@firebase/rules-unit-testing` assenti; regole live **MANUAL**.

| Priorità | Azione successiva e dipendenza | Accettazione / rollback |
| --- | --- | --- |
| P0 FB-02/ECO-01 | Ottenere la versione **distribuita** delle regole e testarla in Emulator isolato con UID A/B, anonimo e admin; progettare autorità di ruolo, saldi e claim prima di modificare client/server | Nessuna auto-promozione, scrittura saldo arbitraria o accesso cross-user; backup/versione regole e piano di migrazione/rollback dei dati economici |
| P0 FB-03 | Prove controllate di offline/reconnect, due device, crash entro debounce e cambio UID con save in corso; definire revisione e merge per campo | Progresso più recente preservato o conflitto esplicito; snapshot locale/remoto recuperabili |
| P0 SEC-02 | Definire cancellazione account/dati, risorsa web, privacy policy e backup Android con proprietario prodotto/privacy | Flusso e URL funzionanti, dati associati trattati secondo policy, Console Play coerente; verifica MANUAL |
| P0 FB-01 | Verificare SHA Play App Signing, login/logout/ripristino/revoca su build distribuita da track | Test account e dispositivo documentati; package locale coincide con `google-services.json`, la firma Play resta MANUAL |
| P1 FB-04/SEC-01 | Rivedere contratto `meta/time`, accessi config pubblica ed error/UID log nelle build; completare test auth/config | Tempo non alterabile da client arbitrario, config accessibile come previsto, log senza credenziali o dati privati |

Correzione sicura eseguita: rimossi log di risposta SocialLogin/RedirectResult, progress privato, email ed errori serializzati in `login1.page.ts`, `auth.service.ts`, `progress.service.ts`, senza alterare il flusso. `npm run lint`, `npm run typecheck` e `npm run build` PASS; `npm run test:ci` resta 92/93 per il test Free preesistente. Nessun deploy, dato live o Cloud Function. I gate release restano aperti fino a prove Emulator, regole live e test su dispositivo.

## Evidenze Fase 2D — Android Release Candidate, 4 novembre 2026

Il [rapporto Android RC](ANDROID_RC_VALIDATION.md) registra i comandi, il manifest release unito e la matrice smoke. Revisione di base `02e1df4384913618406e0dd33f9dae966a9e69ec` con working tree già modificata dalle Fasi 2B/2C; non è stata congelata una RC. **NO-GO**.

| Gate | Evidenza ottenuta | Stato e prossimo passo |
| --- | --- | --- |
| AND-01/AND-02 | Audit Android exit 0: package/namespace/Firebase locale `com.mberti.tec.pdGameRDN`, v20/1.0.20, min24/target36/compile36 | PASS solo locale. Confermare ID e versionCode disponibili nella Console Play e SHA Play App Signing prima della firma |
| AND-03 | `npm run build` e `npx cap sync android` PASS, copia web coerente (356,10 MiB non compressi); nessun diff Android tracciato | **FAIL**: `assembleRelease` standard bloccato in `:capacitor-app:extractReleaseAnnotations` perché il JDK rifiuta il certificato TLS di Google Maven/Maven Central per `lint-gradle:31.13.0`; offline la dipendenza non è in cache. Riparare trust/download, ricostruire senza task esclusi e registrare hash APK/AAB |
| AND-04/SEC-02 | Manifest release unito disponibile: package/versione/SDK corretti, `allowBackup=true`, permessi AD_ID e quattro AdServices portati da Facebook SDK attraverso Social Login | Nessun APK/AAB release della fase, firma o manifest binario RC. Decidere backup e necessità dei permessi/SDK con privacy; verificare Data Safety e account deletion. Non firmare finché ID Play non è confermato |
| AST-01 | Audit asset 23 atlas/42 audio, 0 errori e 0 warning; icone/splash native presenti | PASS statico, **NOT_RUN** visivo/audio/performance su Android e contenuto pacchetto |
| AND-05/GAM-01/FB-01 | `adb devices -l` non rileva dispositivi | **NOT_RUN**. Due device API24 e API36: installazione, login Google da track, tre modalità, shop/inventario, save/restore, touch/Back/WebGL/audio, offline e metriche startup/FPS/PSS/crash |

Il tentativo diagnostico offline che escludeva `extractReleaseAnnotations` è fallito per l'input `typedefs.txt` mancante e **non** costituisce un gate di build. Nessun artefatto RC o relativo hash è disponibile; un APK debug storico del 30 ottobre non prova questa fase. I gate Firebase FB-02/FB-03/ECO-01, il test Free 92/93 e la verifica Play restano aperti.

## Conferme del proprietario da Play/Firebase Console — 4 novembre 2026

- Play mostra `com.mberti.tec.pdGameRDN`; non è stata caricata alcuna versione. L'app Android Firebase nel progetto `pd-game-rdn` mostra lo stesso package e una SHA-1 presente. Il database Firestore è `(default)`. **AND-01 package confermato tramite dichiarazione del proprietario**; `versionCode 20` non risulta usato. Confronto tra SHA-1 Firebase e certificato Play App Signing, login da track e firma restano aperti.
- Il proprietario ha trascritto dalla Console le regole Firestore pubblicate il 13 agosto 2026. Confermano i pattern P0 di auto-promozione tramite `users/{uid}.role`, scrittura owner ampia dei dati economici e accesso autenticato indiscriminato a `sessions`; confermano anche la scrittura autenticata a `meta/time`. **FB-02/ECO-01 restano NO-GO**, con evidenza live riferita dal proprietario. Prossimo gate: test in Emulator isolato, disegno di autorità/ruoli e piano di migrazione/rollback prima di qualunque deploy. Nessuna regola live è stata modificata.

## Evidenze test Firestore Emulator — 4 novembre 2026

Il [rapporto Firebase](FIREBASE_SECURITY_AUDIT.md) registra una suite isolata con due utenti fittizi e le regole locali corrispondenti al testo trascritto dalla Console. **11 casi eseguiti: 3 PASS, 8 FAIL, exit 1.** Confermati in Emulator auto-promozione ad admin e accesso al profilo altrui, saldo/acquisto arbitrari (anche nel percorso effettivo letto da `ShopService`), lettura/scrittura di sessioni altrui e scrittura di `meta/time`. Isolamento base dei profili, aggiornamento ordinario del proprio profilo e lettura pubblica senza scrittura di config passano. È un gate riproducibile del ruleset, non una modifica dei dati live; FB-02/ECO-01 restano P0 e FB-04 P1. Prima del deploy servono autorità server per ruoli e transazioni economiche, compatibilità client, migrazione/rollback e suite Emulator verde. SHA Play App Signing e login da track restano MANUAL.

## Prototipo di correzione Firestore — 5 novembre 2026

Il [disegno di remediation](FIREBASE_REMEDIATION_DESIGN.md) documenta il contratto client, la migrazione necessaria e una candidata **solo Emulator**. La suite estesa a 15 casi ha prodotto **4 PASS / 11 FAIL** sulle regole correnti e **14 PASS / 1 FAIL** sulla candidata, entrambe exit 1. La candidata blocca auto-promozione, campi profilo privilegiati, acquisti forgiati, sessioni cross-user e payload arbitrari su `meta/time`; preserva aggiornamento profilo con `role` invariato e sync via `serverTimestamp()`. La write arbitraria del saldo nel progress resta **FAIL P0**. Il QA ha richiesto protezione di `createdAt`/`profileId` e backfill legacy: i primi casi sono ora testati, il backfill dei valori null/vuoti resta da provare. Nessun deploy è autorizzato dal risultato parziale: vanno progettate autorità economica, claim admin, revisione dei progressi, migrazione e rollback. `firebase.json`, dati live e codice applicativo invariati in questo intervento.

## Decisione economia senza backend — 5 novembre 2026

Il proprietario sceglie di mantenere il salvataggio diretto Firestore per monete esclusivamente virtuali, senza server applicativo. La [variante locale senza backend](FIREBASE_REMEDIATION_DESIGN.md#scelta-senza-backend--5-novembre-2026) passa **15/16** casi Emulator e termina con exit 1: il caso negativo di saldo arbitrario resta **FAIL tecnico / rischio prodotto accettato**; il test non viene eliminato. Il salvataggio owner del progress passa. Prima di distribuire le regole servono inventario admin, prova del ruolo esistente, backfill legacy, schermata profilo coerente e smoke completo dei flussi. FB-02 può avanzare per gli altri permessi solo dopo tali prove; ECO-01 anti-manomissione non diventa PASS. Nessuna regola o dato live è stato modificato.

## Preparazione deploy regole Firestore — 5 novembre 2026

Il file candidato `firestore.rules` è collegato a `firebase.json` e testato tramite Emulator isolato con **18 PASS / 1 FAIL accettato su 19**. Corretti il form profilo (ruolo in sola lettura) e il fallback di `profileId` legacy vuoto. Admin preesistente, backfill `createdAt:null`/`profileId:''`, reset progress e anonimo ora passano nell'Emulator. `typecheck`, lint e build PASS; Karma 92/93, con il solo difetto Free preesistente. [Checklist di pubblicazione](FIRESTORE_RULES_DEPLOY_CHECKLIST.md) e hash preparati. Il CLI autenticato ha confermato l'accesso a `pd-game-rdn`; con TLS verificato, dry-run e **deploy delle sole regole Firestore** sono PASS (exit 0). Firebase CLI ha riportato compilazione, rilascio e `Deploy complete!` il 5 novembre 2026 alle 10:28 CET circa. Il proprietario ha verificato prima del deploy che tutti gli admin esistenti sono suoi e che il testo live era ancora quello trascritto (13/08/2026); dopo il deploy ha confermato dalla Console la data aggiornata al 5 novembre e il testo attivo coincidente con `firestore.rules`. È una conferma del proprietario, non una lettura diretta dell'agente. Smoke su dispositivo ancora aperto (`adb devices -l`: nessun dispositivo). Il gate anti-manomissione ECO-01 resta FAIL tecnico accettato, gli altri gate release restano indipendenti.
