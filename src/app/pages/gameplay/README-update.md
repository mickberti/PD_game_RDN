# Aggiornamento Phaser Angular

File modificati:
- phaser-game-state.model.ts
- phaser-game-events.service.ts
- game-scene.ts
- phaser-game-page.component.ts
- phaser-game-page.component.html
- phaser-game-page.component.scss

Novità:
- GameResult emesso da Phaser verso Angular a vittoria/sconfitta.
- Messaggio di risultato mostrato nella pagina prima della navigazione.
- Navigazione automatica verso /results con navigation state e queryParams.
- Mostri con IA combattimento: arma, speciale, scudo per tipologia.
- Barre HP/Mana sopra eroe e mostri.

Nota:
La route /results deve esistere nel progetto. Il risultato viene passato in navigation state come `gameResult`.
