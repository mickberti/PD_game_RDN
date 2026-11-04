# GEARITHM — piano per la release

Base: [audit FULL del 3 novembre 2026](PRODUCTION_READINESS.md). **NO-GO** finché i blocchi P0/P1 non sono chiusi con prove della candidata specifica. Le stime sono di lavoro tecnico, non includono attese di Play o disponibilità dei tester. Nessuna azione qui implica modifica automatica del gioco o della produzione.

| Ordine | ID audit | Priorità | Azione concreta e owner | Prova di chiusura / dipendenza |
| --- | --- | --- | --- | --- |
| 1 | AND-01, PLAY-01 | P0 | Proprietario Play/Firebase: decidere package definitivo confrontando listing e app Android Firebase | ID scritto e coerente in Play, Capacitor, Gradle e client Firebase; prerequisito per firma/login |
| 2 | FB-02, ECO-01 | P0 | Backend: esportare e revisionare regole Firestore effettivamente distribuite; testare due UID, non-admin, valute, premi, eventi e `meta/time` | Test deny/allow riproducibili, nessun client può aumentare saldi o modificare altri utenti; dipende dall'accesso Firebase |
| 3 | FB-03 | P0 | Backend/QA: riprodurre load fallito, edit offline, riconnessione, secondo device e conflitti | Progresso remoto più recente preservato e nessun premio duplicato; richiede account test |
| 4 | SEC-02, PLAY-03 | P0 | Prodotto/privacy: definire account deletion, backup e policy; leggere manifest release e SDK reali | Flusso e URL esterno testati se applicabili; Data Safety, app access, audience/rating/ads coerenti; dipende da build RC |
| 5 | AST-01 | P1 | Asset/gameplay: correggere 14 errori atlas, verificare due cue audio mancanti secondo uso reale | Audit asset exit 0 e preview/ascolto su device; non riscrivere frame senza controllo visivo |
| 6 | WEB-02, GAM-03 | P1 | QA/frontend: ripristinare ESLint e harness Karma, aggiornare spec alle firme correnti | `npm run lint` e suite mirata passano con conteggio spec >0; replay effetti incluso |
| 7 | GAM-02 | P1 | Level designer: preservare v011; progettare fork v012 separato dopo la deriva funzionale delle fasce effetti (commit `6a14a30`) e stabilizzare il fingerprint rispetto a `elapsedMs` | v012: generazione/check/replay/simulazione completi; migrazione esplicita di progressi e partite sospese prima dell'attivazione. Le 900 soluzioni v011 pubblicate vincono ancora col motore corrente |
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
