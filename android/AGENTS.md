# Android e Capacitor

## Ambito e responsabilità
- Si applica a `android`. La configurazione Capacitor condivisa è nel `capacitor.config.ts` alla radice.
- Fatti verificati: `android/app/build.gradle` usa applicationId `com.mberti.tec.pdGameRDN`, versionCode 20/versionName 1.0.20; `android/variables.gradle` imposta minSdk 24 e compile/targetSdk 36; Gradle Android plugin 8.13.0. `MainActivity.java` è l'entry point nativo. La web app proviene da `www`.

## Convenzioni e implementazione
- Modificare il sorgente appropriato: UI/gameplay in `src`, configurazione Capacitor alla radice, integrazione nativa in `android`. Dopo cambi web destinati ad Android, costruire la web app prima della sincronizzazione Capacitor; controllare i diff dei file generati da sync.
- Preservare applicationId, firma, versione, asset/icona/splash e configurazione login Google/Firebase nelle release. `android/app/google-services.json` è presente e applicato condizionalmente dal Gradle script; verificare che corrisponda al package definitivo senza riportarne il contenuto nei log. `docs/RELEASE_READINESS_GEARITHM.md` segnala un'identità package ancora da confermare prima della pubblicazione.
- Verificare ciclo di vita, back button, audio, touch, autenticazione e recovery WebGL su dispositivo per cambi che li coinvolgono. Non dichiarare pronta una release solo perché la build web passa.

## Regressioni, controlli e completamento
- Evitare disallineamento fra `www` e pacchetto nativo, cambi accidentali di applicationId/versione o sostituzione di file gestiti da Capacitor senza controllo.
- Per modifiche native: `npm run build`, sync Capacitor e build/test Gradle pertinenti in ambiente Android configurato; seguire `docs/rnd-release.md` per il gate di release. Per soli documenti, basta controllare i percorsi e il diff.
- Completato quando variante Android installabile e flussi toccati funzionano sul dispositivo target, con versione e artefatti di release verificati.
