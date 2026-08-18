# RDN — release gate e riproducibilità

## Versioni e rollout

Ogni partita generata registra `generatorVersion` e `balanceVersion` (`rdn-generator-v2` / `rdn-balance-v1`). Le funzionalità non ancora rilasciate (`colors`, `afflictions`, `ranked`) sono dietro flag disattivati in `rdn-release.config.ts`: l'attivazione non modifica le regole della partita esistente. I salvataggi non compatibili vengono scartati in modo atomico e la partita riparte pulita.

Per riprodurre un problema servono solamente: variante, difficoltà, seed, numero di sfere, generator version e sequenza delle azioni. Non registrare valori della plancia, account o identificativi del dispositivo.

## Telemetria aggregata

Lo schema `RdnTelemetryEvent` comprende modalità, difficoltà, seed/versioni, durata, impulsi, passi di rotazione, bonus, esito e motivo di abbandono. L'`eventId` opaco consente di eliminare invii duplicati dopo resume/retry. Gli esiti `recovered`, `incompatible-save` e `context-lost` separano problemi tecnici da difficoltà di bilanciamento.

## Matrice di verifica

| Area | Copertura automatica | Verifica manuale/E2E |
| --- | --- | --- |
| Adventure × 4 difficoltà × 4–8 sfere | simulatore seed + replay | resume, salvataggio incompatibile, stelle |
| Time Attack × 4 difficoltà × 4–8 sfere | engine/code-path queue | pausa background, drag, countdown, coda esaurita |
| Free × 4 difficoltà × 4–8 sfere | generazione deterministica | modifica impostazioni e riavvio |
| Temi/atlas × meccaniche | unità di stato e flag | screenshot 4/5/6/7/8 sfere, flussi bloccati, DIV2 |
| Colori, afflizioni, ranked | flag disattivati + migrazioni | rollout graduale e rollback |

## Gate di rilascio

- Eseguire `npm run typecheck` e `npm run build` in configurazione production.
- Eseguire il simulatore con almeno 100 seed per difficoltà e per 5 dimensioni (2.000 plance): `failures` deve essere vuoto.
- Verificare budget: avvio ≤ 3 s, generazione ≤ 50 ms, frame ≤ 16,7 ms, bundle iniziale ≤ 2 MB, asset residenti ≤ 48 MB.
- Testare aggiornamento app, seed/versione precedente, resume incompatibile, telemetria duplicata, rete assente, memoria ridotta e perdita contesto WebGL. Una perdita di contesto deve ricreare la scena o portare al recovery, mai corrompere il salvataggio.

Le prove visuali restano necessarie su dispositivi mobili reali; le animazioni temporizzate sono candidate a screenshot/video di regressione e gli eventuali test instabili vanno registrati nel report di release, non ignorati.
