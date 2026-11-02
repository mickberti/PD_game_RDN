# Release readiness — GEARITHM

Audit: 30 ottobre 2026. Nessun account, servizio Firebase o track Play è stato modificato. Non è stata creata una build firmata. Le modifiche Git preesistenti in `audio.service.ts`, `gameplay-page.component.ts` e `firebase-debug.log` appartengono all'utente.

## Stato iniziale verificato

- `package.json`: Angular 20, Ionic 8, Phaser 4.2.1, Capacitor Android/Core 8.3.x, Firebase JS 11.10; plugin social login Capgo 8.5.7. `npm ls` conferma le versioni Capacitor installate. Script: `build`, `typecheck`, `lint`, `test`. `README.md` è ancora quello del prototipo Angular 17. Nessun `AGENTS.md` trovato.
- `angular.json`: build production predefinita, output `www`, environment production sostituito. `npm run build` riuscito, con avvisi Sass; `npm run typecheck` iniziale ha esaurito l'heap di 4 GB, mentre `tsc --noEmit -p tsconfig.app.json` con heap 8 GB passa. `npm run lint` fallisce: manca la configurazione ESLint. `npm test -- --watch=false --browsers=ChromeHeadless` fallisce già in compilazione: `src/test.ts`, `src/global.scss` e `src/theme/variables.scss` assenti e spec non allineati alle firme/tipi correnti; Chrome non si avvia nel sandbox. Prova su dispositivo non eseguita.
- `npx cap sync android` riuscito; cinque plugin Android rilevati. `android/variables.gradle`: minSdk 24, compileSdk/targetSdk 36. `android/app/build.gradle`: `applicationId` e namespace `com.mberti.tec.pdGameRDN`, versionCode 20, versionName 1.0.20, R8 disattivato. `:app:assembleDebug` riuscito dopo download Gradle; il primo tentativo locale era bloccato da certificato SSL del wrapper. Nessuna build release firmata verificata.
- `capacitor.config.ts`, Gradle, risorse Android e `android/app/google-services.json` usano l'ID vecchio; la richiesta indica `com.mberti.tec.vgGameApp`. Non cambiare l'ID finché non siano verificati package Play definitivo, registrazione app Android Firebase e configurazione Google Sign-In. Il nome Android iniziale era `pd-game-rdn`; l'HTML aveva già GEARITHM.
- Manifest principale: INTERNET e backup abilitato. Manifest debug unito: anche VIBRATE, USE_CREDENTIALS, BIOMETRIC/FINGERPRINT, AD_ID, AdServices e Install Referrer da dipendenze; `debuggable=true` è atteso nella variante debug. Verificare manifest **release** e uso effettivo prima di compilare Data Safety. L'app non integra un SDK AdMob nel `package.json`.
- `app.routes.ts`, `boot.page.ts`, `auth.service.ts`: boot, Google login, recupero sessione, guard e gestione errore presenti. `login-service.ts` aveva log di token e risposta OAuth; `loginOffline()` è uno stub. Un test end-to-end su Android, logout e ripristino sessione resta necessario.
- `progress-store.service.ts`: snapshot locale per UID, salvataggio Firestore con debounce e retry online/focus. `progress.service.ts`: documento `users/{uid}/private/progress` scritto dal client. `config.service.ts` legge `gameConfigs/public` da Firestore e ripiega sui default; non è Firebase Remote Config SDK. `game-state.service.ts` può ripiegare sul progresso corrente/default quando Firestore fallisce: verificare su dispositivo che il successivo salvataggio non sovrascriva un progresso remoto più recente. `time.service.ts` scrive su `meta/time`, quindi le regole devono consentirlo o va rivisto il meccanismo.
- `firebase.json` è vuoto; nessuna regola Firestore/Storage versionata. Production e development puntano allo stesso progetto Firebase; non emergono secret server nel codice ispezionato. Le chiavi pubbliche di configurazione Firebase non sono credenziali server. Autorizzazione per utente, ruolo admin e integrità di monete/progressione non verificabili dal repository. Analytics, Crashlytics e metriche tutorial/livelli/retention non risultano integrati.
- `android/app/src/main/res`: icona adattiva e splash esistono. L'icona di gioco `gearithm-icon-g-main.png` è 1024×1024, ma non è un asset Play 512×512 verificato; `ic_launcher.png` xxxhdpi è 192×192. Mancano feature graphic 1024×500, screenshot Play, descrizioni IT/EN, privacy policy, termini, email supporto e changelog verificati nel repository. Etichette e schermate mescolano IT/EN; settings mostra link social/informativi senza azione e una versione fissa.

Secondo [Google Play](https://support.google.com/googleplay/android-developer/answer/11926878), dal 31 agosto 2026 le nuove app Android normali devono targettare API 36: il progetto lo fa. Per i nuovi account personali creati dopo il 13 novembre 2023 può essere richiesto un closed test con 12 tester opt-in per 14 giorni consecutivi: verificare l'applicabilità in [Play Console](https://support.google.com/googleplay/android-developer/answer/14151465).

**Readiness iniziale prudente: 45%.** Residuo stimato: sviluppo 2–4 giornate, test 2–3 giornate, attività manuali/asset 2–4 giornate, più l'eventuale periodo di closed testing obbligatorio. La percentuale non è una misura automatica.

## Problemi, priorità e correzioni

| Priorità | Problema | Evidenza | Impatto | Azione | Bloccante |
|---|---|---|---|---|---|
| P0 | Identità package discordante | `capacitor.config.ts`, Gradle, `google-services.json` | Play/Firebase/Sign-In | Confermare ID definitivo e registrare l'app corretta | Sì |
| P0 | Regole e dati server non verificati | `firebase.json` vuoto, scritture client | Accesso negato o manomissione | Verificare regole e testare due utenti | Sì |
| P0 | Possibile sovrascrittura dopo fallback progresso | `game-state.service.ts` e `progress-store.service.ts` | Perdita progressi | Test offline/online e definire riconciliazione prima del rilascio | Sì |
| P1 | Token/risposta OAuth nei log e pagina diagnostica pubblica | `login-service.ts`, `app.routes.ts` | Esposizione sessione | Rimossi log, stato token e route diagnostiche production | Risolto localmente |
| P1 | Mock e boost visibili in produzione | `settings.page.ts`, `game-state.service.ts` | Integrità gioco | Nascosti e bloccati nel codice production | Risolto localmente |
| P1 | Login Offline non funzionante | `login-service.ts` | Primo avvio ingannevole | Nascosto in produzione | Risolto localmente |
| P1 | Identità store incompleta | risorse Android, inventario `docs/` | Scheda/review | Nome Android corretto; asset, policy e testi manuali | Parziale |
| P1 | Permessi pubblicitari transitivi | manifest unito debug | Data Safety/review | Verificare manifest release e dipendenze | Sì |
| P2 | Lint/test non eseguibili, test su device assenti | `npm run lint`, `npm test`, audit | Gate incompleto | Configurare lint, aggiornare test e provare RC su device | No |
| P2 | Crash/retention non misurati | dipendenze e codice | Diagnostica scarsa | Analytics/Crashlytics con disclosure coerente | No |
| P3 | Sass deprecation, README e versione UI statica | build/README/settings | Manutenzione | Sistemare dopo RC | No |

### Modifiche locali applicate e verifica

- `login-service.ts`: rimossi log e memorizzazione di token/risposta OAuth; errori login mostrati senza dettagli sensibili. `login.page.ts`: pulsante Offline nascosto in production. `app.routes.ts`: pagine login diagnostiche 0/1/2 escluse dalla build production.
- `settings.page.ts`: mock, bypass boot, boost statistiche/valuta e falso link supporto nascosti in production; i relativi metodi di debug hanno guardia. `game-state.service.ts`: production forza provider remoto anche se localStorage conserva una selezione mock precedente. Le funzioni restano in sviluppo. `capacitor.config.ts` e `strings.xml`: nome GEARITHM; settings allinea la versione visibile a 1.0.20.
- Verifiche: `npm run build` passa prima e dopo le modifiche (avvisi Sass); `tsc --noEmit -p tsconfig.app.json` con `NODE_OPTIONS=--max-old-space-size=8192` passa; `npx cap sync android` e `android/gradlew.bat :app:assembleDebug` passano anche dopo l'ultima build web; `git diff --check` passa. `npm run lint` e `npm test` falliscono per i problemi sopra. Nessuna verifica interattiva su telefono né test Google Sign-In eseguiti.

## Piano esecutivo in ordine di dipendenza

| ID | Priorità | Obiettivo e modifica precisa | File | Criterio e comando di verifica | Dipende da | Est. | Esterno |
|---|---|---|---|---|---|---:|---|
| REL-001 | P0 | Confermare se la scheda Play esistente usa l'ID vecchio o quello richiesto; fissare l'ID definitivo senza migrazione dati improvvisata | `capacitor.config.ts`, `android/app/build.gradle`, `strings.xml`, package Java, `google-services.json` | Identico ID in tutti i punti; `npx cap sync android`, `gradlew :app:assembleDebug` | — | 2 h | Decisione Play/Firebase necessaria |
| REL-002 | P0 | Registrare/verificare app Android Firebase e fingerprint SHA-1/SHA-256 per Google Sign-In; aggiornare il JSON Android solo tramite download ufficiale | `android/app/google-services.json`, `src/environments/*` | Login Google, logout, riavvio e restore sessione funzionano su APK installato | REL-001 | 3 h | Firebase Console, accesso proprietario |
| REL-003 | P0 | Verificare regole reali per `users/{uid}/private/progress`, profili, catalogo e `meta/time`; testare lettura/scrittura con due UID e client non admin | Nessuna regola versionata; `progress.service.ts`, `player.service.ts`, `time.service.ts` | Utente A non scrive B, non assegna ruolo/admin o valuta non prevista; test Emulator Suite o console rules | REL-002 | 5 h | Firebase Console; eventuale design server |
| REL-004 | P0 | Riprodurre perdita rete durante load/save, poi riconnettere; evitare write di fallback default e definire conflitti locale/remoto prima della RC | `game-state.service.ts`, `progress-store.service.ts`, `progress.service.ts` | Progressi preesistenti non regrediscono; test device con rete off/on e due installazioni | REL-003 | 6 h | Serve account test Firebase |
| REL-005 | P1 | Verificare manifest release, rimuovere solo permessi AD_ID/AdServices realmente superflui e controllare backup dati | `AndroidManifest.xml`, `android/app/build.gradle` | `gradlew :app:processReleaseMainManifest`; permessi coerenti con Data Safety | REL-001 | 3 h | Scelta privacy |
| REL-006 | P1 | Validare flusso login/errori, progresso, tutorial, livelli e logout su almeno due versioni Android e dispositivo piccolo | Codice app e checklist QA | Smoke test documentato, 0 crash bloccanti; `npm run build`, `npx cap sync android`, `gradlew :app:assembleDebug` | REL-002–005 | 8 h | Tester/dispositivi |
| REL-007 | P1 | Preparare privacy policy, email supporto, descrizioni IT/EN, icona 512², feature 1024×500 e screenshot reali | `docs/` e asset store da creare | URL privacy raggiungibile e asset accettati da Play Console | REL-006 | 8 h | Decisioni legali, grafiche e contatto |
| REL-008 | P1 | Creare RC AAB con versione/codice concordati, firma Play App Signing, verificare package e manifest | `android/app/build.gradle` | `gradlew :app:bundleRelease`; `bundletool validate` e test installazione da Play | REL-001–007 | 4 h | Firma gestita dall'utente; non caricare keystore qui |
| REL-009 | P1 | Configurare scheda Play, Data Safety, content rating, audience, accesso per reviewer e closed test | Play Console | Tutti i controlli Play completi; report pre-review senza P0/P1 | REL-007–008 | 5 h | Operazione manuale |
| REL-010 | P1 | Eseguire closed test e raccogliere crash/feedback; se applicabile 12 tester continuativi per 14 giorni | Play Console | Requisito Play soddisfatto; smoke test e feedback registrati | REL-009 | 6 h + attesa | Tester/Play Console |
| REL-011 | P1 | Richiedere accesso produzione se necessario, pubblicare al 5%, poi 20/50/100% con gate metrici sotto | Play Console | Nessun aumento crash/ANR o perdita progressi; review approvata | REL-010 | 4 h | Pubblicazione manuale |
| REL-012 | P2 | Configurare ESLint per Angular 20, riparare riferimenti `src/test.ts`/SCSS in `angular.json` e aggiornare spec alle API correnti | config ESLint, `angular.json`, spec | `npm run lint`, `npm test -- --watch=false` | REL-006 | 5 h | Nessuna |
| REL-013 | P2 | Integrare Crashlytics/Analytics con eventi avvio, tutorial, livello, abbandono e retention, dopo policy/consenso | `package.json`, Android, servizi analytics | Eventi e crash di test visibili, Data Safety aggiornata | REL-007 | 8 h | Firebase/legale |
| REL-014 | P3 | V1.1 rewarded ad opzionale solo dopo fine livello, frequency cap, consenso CMP UMP e fail-safe senza premio se non completato | `rdn-rewarded-ad.service.ts`, Android, UI | Test EEA/non EEA, offline, no banner in partita, no annunci forzati | REL-011, REL-013 | 12 h | AdMob/CMP/privacy |
| REL-015 | P3 | V1.1 IAP per cosmetici o convenienza non competitiva; verifica acquisto server, restore e rimborsi | shop/progress, backend da progettare | Acquisto e restore su due dispositivi; entitlement server verificato | REL-011, REL-003 | 16 h | Play Billing, prodotto/legale |

## Checklist release candidate

- [x] Build web production, sync Capacitor e Gradle debug riusciti.
- [x] targetSdk/compileSdk 36; nome launcher GEARITHM.
- [x] Rimossi i log di autenticazione sensibili; controlli mock/boost nascosti in produzione.
- [ ] Decidere package definitivo e allineare Firebase/Sign-In.
- [ ] Regole Firestore verificate; progressi protetti e test offline/online superati.
- [ ] Manifest release e Data Safety coerenti; eventuali permessi transitivi giustificati o rimossi.
- [ ] Login, logout, restore, tutorial e livelli testati su Android reale.
- [ ] Privacy policy, supporto, asset e testi IT/EN approvati.
- [ ] Versione/codice incrementati se già usati in Play; AAB firmato e validato dall'utente.

## Checklist manuale Google Play Console

- [ ] Controllare se esiste già una scheda per ciascuno dei due package; confermare quale è definitivo.
- [ ] Verificare identità sviluppatore e Play App Signing; scegliere paesi, fascia d'età e categoria gioco.
- [ ] Caricare asset, descrizioni, URL privacy e contatto supporto; completare rating, target audience, ads declaration e Data Safety in base al manifest release e agli SDK effettivi.
- [ ] Fornire account/istruzioni di accesso ai reviewer se il gioco richiede login; verificare che non restino pulsanti inattivi o tool di debug.
- [ ] Abilitare closed testing e controllare eventuale requisito 12 tester/14 giorni.

## Checklist Firebase

- [ ] Confermare progetto production, package Android e fingerprint di firma debug/Play; testare Google Sign-In con la build distribuita da Play.
- [ ] Esaminare regole Firestore/Storage pubblicate, App Check se previsto, accesso cross-user e ruolo admin; non modificare regole live senza test.
- [ ] Verificare che `gameConfigs/public`, catalogo, profili e `meta/time` esistano e siano leggibili/scrivibili secondo necessità.
- [ ] Testare progressione e riconciliazione offline; verificare quote/indici; definire crash reporting e analytics con disclosure.

## Closed testing e rollout

- [ ] Closed: installare da Play, avvio pulito, login, tutorial, livelli, shop con monete di gioco, logout/reinstallazione, ripristino, offline/online e dispositivi con Android 7+; registrare difetti per versione/telefono.
- [ ] 5%: attendere almeno 24 ore e controllare crash/ANR, login e report di perdita progresso; interrompere rollout in presenza di P0/P1.
- [ ] 20%: attendere almeno 24 ore, controllare trend e recensioni/feedback rispetto al 5%.
- [ ] 50%: attendere almeno 24 ore, verificare nuovamente stabilità e dati.
- [ ] 100%: procedere solo con metriche stabili e nessun difetto bloccante; mantenere piano di hotfix con versionCode maggiore.

## Monetizzazione V1.1

Stato iniziale: rewarded ad = interfaccia senza provider; AdMob, CMP, banner, interstitial, Billing e restore = **NON PRESENTE**, pianificati **POST-LANCIO V1.1**. Shop/premi con valuta di gioco = **DA COMPLETARE PRIMA DEL LANCIO** per verifica regole/integrità, non per introdurre IAP. La prima release può essere senza annunci e IAP. Per V1.1 usare rewarded solo su scelta esplicita dopo un livello, mai banner nel gameplay né interstitial forzati, limite di frequenza, CMP/consenso GDPR quando richiesto, Data Safety aggiornata, test di mancata disponibilità annuncio; IAP solo con verifica server e restore, senza vantaggi pay-to-win.

## Decisioni e azioni dell'utente

1. **Prima azione:** controllare in Play Console quale package è associato alla scheda GEARITHM (se già esiste), confrontarlo con le app Android registrate in Firebase, e comunicare soltanto l'ID package definitivo: `com.mberti.tec.pdGameRDN` oppure `com.mberti.tec.vgGameApp`. Non inviare file di configurazione, token o chiavi.
2. Confermare URL e testo privacy/termini, email supporto, asset grafici e descrizioni approvati.
3. Verificare/gestire regole Firebase, fingerprint di firma, test account e Data Safety tramite i rispettivi account.
4. Gestire firma AAB, closed test, accesso produzione e rollout in Play Console. Nessuna pubblicazione è stata effettuata in questo lavoro.
