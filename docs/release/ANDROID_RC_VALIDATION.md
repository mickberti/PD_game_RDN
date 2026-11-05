# GEARITHM — validazione tecnica Android RC (4 novembre 2026)

**Esito: NO-GO.** La build web e la sincronizzazione Capacitor passano; non esiste ancora un APK/AAB validato. La compilazione Gradle standard è bloccata dal trust TLS del JDK verso Google Maven/Maven Central. Non sono disponibili dispositivi, firma o conferma dell'identificativo registrato su Play. Questa è una verifica locale sulla working tree corrente, non una RC pubblicabile.

## Identità e configurazione osservate

| Voce | Valore / prova | Stato |
| --- | --- | --- |
| Commit di base | `02e1df4384913618406e0dd33f9dae966a9e69ec`; working tree con modifiche preesistenti Fase 2B/2C, non incluse nel commit | Identità della RC non congelata |
| Package | `com.mberti.tec.pdGameRDN` in `capacitor.config.ts`, `android/app/build.gradle`, namespace Gradle, package Android di `google-services.json` e manifest release unito | PASS locale; ID Play **MANUAL** |
| Versione | `versionCode 20`, `versionName 1.0.20` | PASS locale; disponibilità del code su Play **MANUAL** |
| SDK | min 24, target 36, compile 36 (`android/variables.gradle`); manifest unito min 24/target 36 | PASS configurazione |
| Toolchain | JDK 21.0.12.1, Gradle 8.14.3, Android Gradle Plugin 8.13.0; SDK platform 36/36.1 e build tools 36.1.0 presenti | PASS locale fino al download mancante |
| Capacitor | core/CLI 8.3.0, Android 8.3.3; App 8.1.0, Haptics/Keyboard/Status Bar 8.0.2, Capgo Social Login 8.5.7; `webDir: www`, schema Android `https` | PASS inventario; runtime **NOT_RUN** |
| Firma release | `android/app/build.gradle` non definisce un `signingConfig` release | Nessuna build firmata; firma Play **MANUAL** |

Il target 36 è coerente con i [requisiti Play per nuove app e aggiornamenti dal 31 agosto 2026](https://support.google.com/googleplay/android-developer/answer/11926878) e con [Capacitor 8](https://capacitorjs.com/docs/updating/8-0). La conformità non prova installazione, comportamento Android 16 o accettazione Play.

## Build e contenuto

| Controllo eseguito | Risultato |
| --- | --- |
| `node .agents/skills/gearithm-android-release/scripts/audit-android.mjs` | exit 0; package/namespace/Firebase Android coerenti, versione 20/1.0.20, SDK 24/36, 0 errori |
| `npm run build` | **PASS**, `www` prodotto; avvisi Sass preesistenti |
| `npx cap sync android` | **PASS**; copia della web app e aggiornamento di 5 plugin, nessun diff Android tracciato |
| `./gradlew.bat :app:assembleRelease --no-daemon --console=plain` | **FAIL ambientale** in `:capacitor-app:extractReleaseAnnotations`: `com.android.tools.lint:lint-gradle:31.13.0` non scaricabile; `PKIX path building failed` su Google Maven e Maven Central |
| Stesso comando con `--offline` | **FAIL**: `lint-gradle:31.13.0` non presente nella cache Gradle |
| Tentativo diagnostico offline con `-x ...:extractReleaseAnnotations` sui plugin | **FAIL atteso** in `:capacitor-app:syncReleaseLibJars`: manca `typedefs.txt`, prodotto dal task saltato. Nessun gate release può usare questa scorciatoia; non sono state cambiate configurazioni |
| `adb devices -l` | Nessun dispositivo collegato; test dispositivo **NOT_RUN** |

**Artefatti RC:** nessun APK/AAB release completato in questa fase, dunque dimensione, hash SHA-256, firma, manifest binario, installabilità e asset *nel pacchetto RC* **NOT_RUN**. Esiste un `app-debug.apk` storico del 30 ottobre 2026, estraneo alla presente build e non usato come evidenza. `www` contiene 328 file, 373.393.031 byte (356,10 MiB); il payload copiato in `android/app/src/main/assets/public` ha gli stessi byte. È una misura della directory web non compressa, non una stima dell'APK o del download Play. La working tree contiene già modifiche applicative delle fasi precedenti: la build non identifica da sola un commit riproducibile.

### Manifest release parzialmente verificato

Gradle ha prodotto `android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml` prima del blocco. Riporta package/versione/SDK sopra, `INTERNET` dal progetto, `VIBRATE` da Capacitor Haptics e `USE_CREDENTIALS` da Social Login. `USE_BIOMETRIC` e `USE_FINGERPRINT` provengono da AndroidX Biometric. `AD_ID` e quattro permessi `ACCESS_ADSERVICES_*` provengono da `facebook-core:18.1.3` incluso dal plugin Social Login; il merge contiene anche activity Facebook e un callback `fbconnect` esportato. La provenienza è confermata in `android/app/build/outputs/logs/manifest-merger-release-report.txt`. L'app usa Google Sign-In: verificare l'effettiva necessità di Facebook/AdServices e l'impatto su Data Safety prima della firma. Non è stata effettuata una rimozione di permessi senza prova funzionale.

Il manifest unito ha `android:allowBackup="true"` e non mostra `dataExtractionRules`; la policy di backup/cancellazione dati resta il blocco SEC-02. L'activity principale è esportata per il launcher; FileProvider non è esportato. I componenti esportati delle librerie richiedono verifica nell'artefatto finale. Le [modifiche di comportamento Android 16](https://developer.android.com/about/versions/16/behavior-changes-16) richiedono test reali di edge-to-edge, Back predittivo e layout su schermi grandi.

### Asset statici e risorse native

`node .agents/skills/gearithm-assets-audit/scripts/audit-assets.mjs` **PASS**: 23 atlas e 42 riferimenti audio, 0 errori, 0 warning. Sono presenti icone mipmap standard/round/foreground e adaptive icon XML, più 11 splash per fallback, orientamento e densità. Le sorgenti `src/assets` occupano circa 352,16 MiB; il peso di avvio, i frame, l'audio e la memoria restano da misurare su dispositivi. Audit statico e copia in `public` non provano il contenuto di un APK né la resa visiva.

## Stato dei gate dell'audit FULL

| ID | Stato dopo questa fase | Evidenza mancante / problema |
| --- | --- | --- |
| AND-01 | **MANUAL P0** | ID Play effettivamente registrato e Android app Firebase/SHA Play App Signing |
| AND-02 | **PASS locale / MANUAL Play** | Configurazione versione/SDK coerente; controllare che versionCode 20 sia disponibile su Play |
| AND-03 | **FAIL** | Web+sync PASS, ma assembleRelease standard non completa; manca hash del pacchetto |
| AND-04 | **FAIL / MANUAL P0** | Manifest unito analizzato, ma niente AAB/firma; backup e permessi AdServices richiedono decisione privacy |
| AND-05 | **NOT_RUN** | Nessun dispositivo collegato |
| AST-01 | **PASS statico / NOT_RUN dispositivo** | Preview, ascolto, animazioni e memoria reali |
| GAM-01 | **NOT_RUN** | Tre modalità su Android, incluso Free corrente, senza nuove regole |
| FB-01 | **PASS package locale / MANUAL login Play** | Login, logout, session restore e SHA su build distribuita |

Restano aperti anche i gate FB-02/FB-03/ECO-01 e il test Free 92/93 descritti nel [piano di release](RELEASE_ACTION_PLAN.md) e nel [rapporto Firebase](FIREBASE_SECURITY_AUDIT.md). Nessuna conclusione qui li chiude.

## Matrice smoke da eseguire sulla stessa build

**D1:** telefono Android API 24, 3–4 GB RAM, baseline minima. **D2:** dispositivo Android 16/API 36, preferibilmente tablet o foldable, almeno 6 GB RAM, per edge-to-edge, Back e schermi grandi. Registrare modello, patch, WebView, RAM, account, versione installata e hash artefatto; ripetere login e salvataggi con due UID e due dispositivi. Tutte le celle sono **NOT_RUN**.

| Area | Prova su D1 e D2 | Esito |
| --- | --- | --- |
| Installazione | Installare stessa RC; primo avvio, cold/warm start, icona, splash, schermo iniziale e assenza crash | NOT_RUN |
| Account | Google login, logout, restore dopo kill/reboot, account revocato/errore rete; confronto con SHA Play quando disponibile | NOT_RUN |
| Modalità | Adventure, Time Attack e Free attuale: entrare, ruotare ingranaggio, usare touch/impulsi, vincere, pausa e ripresa | NOT_RUN |
| Stato | Shop, inventario, premi, salvataggio/ripristino, interruzione in fase di save, due device, offline e riconnessione senza overwrite | NOT_RUN |
| Grafica | Atlas/sprite/texture, effetti e animazioni, WebGL dopo background, rotazione e cambio pagina, layout edge-to-edge/schermo grande | NOT_RUN |
| Audio/input | Musica, SFX incluse le due cue recuperate, mute/interruzione audio, touch, rotazione ingranaggio e Back/predictive Back | NOT_RUN |
| Prestazioni | Dimensione download/installazione, tempo cold/warm, FPS/frame drop in gioco/effetti, PSS/native heap, logcat crash/ANR | NOT_RUN |

## Chiusura tecnica richiesta

1. Riparare la catena TLS del JDK o fornire cache Maven verificata, poi ripetere **senza task esclusi** `npm run build`, `npx cap sync android`, `./gradlew.bat :app:assembleRelease` e `:app:bundleRelease`. Conservare log e hash SHA-256 dell'artefatto; verificare manifest binario, package/versione/permessi e firma. La causa TLS è ambientale; non cambiare dipendenze per aggirarla.
2. Confermare ID Play, versionCode disponibile, Firebase Android e SHA Play; decidere backup, account deletion e necessità delle librerie/permessi Facebook-AdServices con responsabile privacy. Aggiornare manifest/config solo dopo decisione e test, con nuova build.
3. Produrre l'AAB firmato con le credenziali esistenti del proprietario, senza mostrarle, e provarlo dalla track prevista. Eseguire la matrice sui due dispositivi e registrare risultati, crash, performance e immagini/audio osservati. Nessun upload è stato effettuato in questa fase.

## AI Execution Report

- **Subagents effettivi:** `mobile_performance` (`android_asset_review`) ha eseguito audit asset, inventario dimensioni/risorse e piano smoke, senza modifiche. `qa_reviewer` (`android_rc_qa`) ha revisionato report, piano e manifest, segnalando la presenza dell'APK debug storico; la formulazione degli artefatti RC è stata corretta. Nessun altro finding concreto.
- **Skill effettive:** `gearithm-android-release` (audit Android e procedura build), `gearithm-assets-audit` (script asset). Nessuna nuova Skill o agente.
- **File modificati in Fase 2D:** questo rapporto e `docs/release/RELEASE_ACTION_PLAN.md`; nessun codice/configurazione applicativa o Android tracciata modificata.
- **Limiti:** nessun artefatto RC validato, firma, Console Play/Firebase o dispositivo; questi controlli non sono PASS.

## Conferme Console successive — 4 novembre 2026

Il proprietario comunica che la scheda Play usa `com.mberti.tec.pdGameRDN` e che nessuna versione è stata ancora caricata; l'app Android registrata nel progetto Firebase `pd-game-rdn` ha lo stesso package e almeno una SHA-1. Queste sono evidenze riferite dal proprietario, successive alla build qui descritta: **AND-01 package PASS per confronto dichiarato Play/Firebase/repository**, **AND-02 versionCode 20 non risulta usato secondo il proprietario**. La SHA-1 registrata non è ancora stata confrontata con la fingerprint del certificato Play App Signing. Firma, bundle, login su track e test dispositivo restano MANUAL/NOT_RUN. L'identificativo `1:...:web:...` inizialmente fornito era un Firebase Web App ID; il database Firestore è stato poi confermato come `(default)`.
