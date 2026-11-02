# Asset grafici, cataloghi e audio

## Ambito e responsabilità
- Si applica a `src/assets`: sprite e atlas sotto `game`/`ui`, audio sotto `audio`, cataloghi JSON pubblicati sotto `rnd/catalogues`.
- Fatti verificati: `angular.json` copia integralmente questa directory in `www/assets`. I metadata atlas `*.ts` sono letti da `AtlasService` e dalla scena Phaser; `src/app/core/audio/audio.config.ts` è il manifest di cue e pack, con fallback di formato e limiti di mix.

## Convenzioni e implementazione
- Aggiornare immagine, frame name, coordinate, dimensioni e riferimenti nel servizio/scena insieme; mantenere i nomi usati dai componenti. Usare gli strumenti di preview già presenti nelle pagine `utils/components/atlas` e `utils/components/sprite` quando cambia un atlas.
- Per audio, allineare file reali, path del manifest e pack; rispettare varianti, volume, cooldown e concorrenza. Consultare `src/assets/audio/README.md`; i caricamenti mancanti sono tollerati, ma una cue essenziale va verificata su dispositivo.
- I JSON RDN sono dati pubblicati, non bozze da ritoccare a mano: usare `scripts/generate-rdn-catalogue.mjs` e il workflow in `tools/rnd-catalogue/README.md`. Controllare dimensione e memoria degli asset per mobile.

## Regressioni, controlli e completamento
- Evitare frame mancanti, sprite tagliati, path con maiuscole incoerenti, audio ripetuto e cataloghi disallineati dal runtime.
- Dopo cambi di atlas/audio, fare controllo visivo o ascolto mirato e `npm run build`; per cataloghi `npm run rdn:catalogue:check`. Non rigenerare cataloghi per modifiche grafiche o audio.
- Completato quando riferimenti e file coincidono, le risorse interessate si caricano su web e mobile, e il costo in memoria è accettabile.
