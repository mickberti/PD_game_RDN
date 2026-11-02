# Motore RDN e Phaser

## Ambito e responsabilità
- Si applica a `src/app/core/game/phaser`, inclusi `effects`, `config` e `catalogues` versionati.
- Fatti verificati: `PuzzleEngine` applica azioni e serializza lo stato; `puzzle-solver.ts`, `catalog.builder.ts` e `rdn-simulation.ts` coprono generazione, soluzione e replay; `RdnPhaserScene` presenta la partita e inoltra azioni. I cataloghi v004–v011 sono registrati in `catalogue.registry.ts`; `active-catalogue.config.ts` indica v011.

## Convenzioni e implementazione
- Tenere regole e risultati deterministici nel motore; scena, renderer e particelle rappresentano eventi semantici. Gli effetti opzionali sono risolti da `LevelEffectConfigResolver`/`EffectFlowEngine`; un livello senza `effectConfiguration` mantiene il percorso storico. Consultare `docs/effect-system.md` per ordine di fasi, limiti, progressione e playground.
- Preservare seed, versioni, sequenza di azioni e compatibilità dei salvataggi. Per nuove regole cambiare un catalogo con il workflow di fork, generazione, check e attivazione in `tools/rnd-catalogue/README.md`; non riscrivere versioni già pubblicate senza piano di migrazione.
- Rispettare Adventure, Time Attack e Free, inclusi i default degli effetti; il playground usa lo stesso motore ma non persiste premi/progresso. Liberare tween, timer, texture/listener e oggetti di scena nel ciclo di vita Phaser.

## Regressioni, controlli e completamento
- Evitare dipendenze della logica da frame rate, animazioni o tempo reale; evitare divergenza fra preview, risoluzione e replay.
- Per motore/effetti eseguire gli spec pertinenti (`puzzle.engine`, generazione, flow, resolver, progressione) e `npm run typecheck`; per cataloghi `npm run rdn:catalogue:check` e simulazione descritta in `docs/rnd-release.md`. Per rendering, controllare visivamente plance e pause/resume su mobile.
- Completato quando stesso seed e stesse azioni riproducono esito e salvataggio, gli eventi visivi corrispondono al motore e le varianti interessate restano coerenti.
