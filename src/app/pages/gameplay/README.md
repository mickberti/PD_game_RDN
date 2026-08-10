# Aggiornamento Phaser + Angular con HeroItem

Questa versione rimuove `heroWeapon` dai parametri e usa direttamente `hero?: HeroItem`.

## File da copiare

```txt
game.models.ts
phaser-game-state.model.ts
phaser-game-events.service.ts
game-scene.ts
phaser-game-page.component.ts
phaser-game-page.component.html
phaser-game-page.component.scss
```

Se `game.models.ts` esiste già nel tuo progetto, non duplicarlo: aggiorna soltanto gli import in `phaser-game-state.model.ts`, `game-scene.ts` e `phaser-game-page.component.ts` con il path corretto.

## Parametri Phaser

```ts
const params: PhaserGameParams = {
  sections: 10,
  theme: 'Dungeon',
  movementAxes: 8,
  hero: heroItem,
  monsterLevel: 1,
  monsterTypes: ['goblin', 'slime', 'bat', 'skeletor'],
  mobileControls: true
};
```

## Dati usati da HeroItem

La scena calcola il profilo di combattimento da:

- `hero.heal.current` e `hero.heal.total`: HP correnti e massimi;
- `hero.mana.current` e `hero.mana.total`: mana corrente e massimo;
- `hero.stats`: attributi RPG;
- `hero.equip`: armi, scudi, armature, elmi, anelli e artefatti;
- `hero.powerMultipliers`: moltiplicatori globali.

## Formula sintetica

- `Forza`: aumenta danno base e knockback.
- `Destrezza`: aumenta range e riduce cooldown.
- `Costituzione`: aumenta HP e difesa.
- `Intelligenza`: aumenta danno speciale e mana massimo.
- `Saggezza`: migliora mana, rigenerazione e consumo dello scudo.
- `Carisma`: aggiunge bonus punteggio quando uccidi un mostro.
- `equip.attack`: aumenta attacco normale e speciale.
- `equip.defense`: aumenta difesa e qualità della parata.

## Controlli

Desktop:

- WASD/frecce: movimento;
- Spazio: attacco base;
- E: colpo speciale;
- Q: cura;
- Shift: attiva lo scudo fino a esaurimento;
- R: restart.

Mobile:

- joystick virtuale a sinistra;
- `ATK`: attacco base;
- `SPL`: colpo speciale;
- `CURA`: cura con ricarica;
- `SHD`: attiva lo scudo fino a esaurimento; torna disponibile a ricarica completa.

## Nota sul service

`PhaserGameEventsService.lives$` viene mantenuto per compatibilità ma ora contiene gli HP correnti dell'eroe.
