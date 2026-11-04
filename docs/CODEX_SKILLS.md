# Skill Codex di GEARITHM

Le Skill sono in `.agents/skills/<nome>/SKILL.md`, formato supportato dalla skill-creator di Codex; il CLI locale rilevato è `codex-cli 0.162.0-alpha.17.2`. Il frontmatter `name`/`description` consente la selezione automatica quando il runtime indicizza le Skill di progetto. Per richiamarle esplicitamente, usare `$nome` nel prompt; se una sessione avviata prima della creazione non le vede, avviarne una nuova. Gli script richiedono Node 22.12.0 (`.nvmrc`); non contattano servizi né scrivono dati.

| Skill | Attivazione | Risultato |
| --- | --- | --- |
| `gearithm-rdn-validation` | Regole numeriche, rotazioni, impulsi, generazione o cataloghi | Audit strutturale, replay/test mirati, caso riproducibile |
| `gearithm-effects-development` | Aggiunta o modifica effetti GEM/LINK/AREA | Tracciamento preset → motore → evento → Phaser |
| `gearithm-state-review` | Angular/Ionic, Auth, Firestore, progressi, shop, economia, eventi | Revisione dei flussi di stato e dei limiti server |
| `gearithm-assets-audit` | Sprite, atlas, texture, audio | Path e limiti dei frame, riferimenti audio |
| `gearithm-android-release` | Capacitor, Gradle, APK/AAB o preparazione Play | Coerenza locale di identità/versione e gate device/release |
| `gearithm-production-audit` | Audit QUICK, FULL o RELEASE dell'intera candidata | Report per controlli stabili, piano d'azione e decisione GO/NO-GO |

## Richiamo ed esempi

- `$gearithm-rdn-validation Riproduci il bug del seed 7919 in Adventure EXPERT, verifica impulso e soluzione su v011.`
- `$gearithm-effects-development Aggiungi una variante LINK e verifica resolver, replay, evento e rendering.`
- `$gearithm-state-review Esamina un acquisto shop dopo perdita rete e login con un altro UID.`
- `$gearithm-assets-audit Verifica il nuovo atlas effetti e le cue audio collegate.`
- `$gearithm-android-release Prepara una checklist verificabile per la build debug Android corrente.`

## Script read-only

Da radice repository:

```powershell
node .agents/skills/gearithm-rdn-validation/scripts/audit-catalogue.mjs
node .agents/skills/gearithm-rdn-validation/scripts/audit-catalogue.mjs --version v010
node .agents/skills/gearithm-assets-audit/scripts/audit-assets.mjs
node .agents/skills/gearithm-assets-audit/scripts/audit-assets.mjs --atlas src/assets/game/fantasy_bg/atlas/atlas-effect-set1.ts
node .agents/skills/gearithm-android-release/scripts/audit-android.mjs --expected-app-id com.mberti.tec.pdGameRDN
```

Gli script restituiscono `0` se i controlli richiesti passano, `1` per difetti rilevati, `2` per input/file non leggibili. L'audit RDN controlla struttura, indici e target sui JSON pubblicati: **non** esegue il motore né dimostra che una soluzione vinca. Per questo usare gli spec e `rdn-simulation.ts`; `npm run rdn:catalogue:check` confronta la generazione ma può creare un bundle temporaneo in `scripts`. Per generare senza pubblicare usare `npm run rdn:catalogue -- --no-save` con i parametri supportati dallo script esistente; non usare `rdn:catalogue:activate` in un audit.

L'audit asset completo controlla metadata atlas, dimensioni PNG e path statici del manifest audio. I path audio mancanti sono warning perché il runtime tollera fallback; non equivalgono a un test d'ascolto. Al momento dell'introduzione delle Skill, l'audit completo segnala **14 errori atlas preesistenti** (immagini assenti, frame fuori dai limiti o dimensione PNG discordante) e **2 warning audio**; un atlas effetti isolato passa. Verificare i riferimenti nel codice e la preview prima di correggere gli asset.

L'audit Android confronta appId, namespace, applicationId, client package in `google-services.json`, webDir e versioni locali. Non controlla firma, SHA, Play Console, permessi del manifest finale o comportamento installato. Il report `docs/RELEASE_READINESS_GEARITHM.md` registra gate esterni ancora aperti.

## Verifica e manutenzione

- Dopo modifiche al motore usare spec mirati, simulazione e catalog check; dopo cambi di UI/servizi usare typecheck e flusso manuale interessato. L'audit di release documenta che lint e runner Karma sono già guasti: registrarli come limiti esistenti, senza chiamarli test superati.
- Dopo cambi a una Skill, verificare frontmatter e nome cartella, eseguire lo script con un caso positivo e uno negativo quando applicabile, e controllare `git status --short`. Il validatore ufficiale `skill-creator/scripts/quick_validate.py` richiede PyYAML, assente nell'interprete Python locale al momento della creazione; il frontmatter è stato verificato con `js-yaml` già presente in `node_modules`.
- Aggiornare i controlli quando cambiano schema dei cataloghi, preset, layout atlas o configurazione Android. Non copiare modelli di produzione nelle Skill; usare i file sorgente come autorità. I documenti `docs/effect-system.md` e `docs/rnd-release.md` possono descrivere versioni storiche: verificare sempre la versione attiva e i modelli correnti.

## Scelte di consolidamento

Gameplay, livelli, generatore e regression test RDN sono riuniti in `gearithm-rdn-validation`; la generazione reale resta nello script esistente. Angular review, Firebase review ed economia sono riuniti in `gearithm-state-review`, perché condividono `GameStateService` e la persistenza. Diagnosi bug è una modalità delle Skill di dominio, non una Skill generica separata. Performance Phaser resta una verifica mirata nel workflow effetti/gameplay e nei gate device di release; non è stato introdotto un benchmark sintetico senza una baseline affidabile.
