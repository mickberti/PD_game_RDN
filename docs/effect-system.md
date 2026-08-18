# RDN Effect System

Gli effetti sono opzionali: un livello senza `effectConfiguration` segue il percorso storico del `PuzzleEngine`. La generazione dei valori delle gemme avviene prima ed è indipendente dalla configurazione effetti.

## Effetto su una gemma

```ts
import { EffectScope } from "../src/app/core/game/rnd/effects/effects.models";

effectConfiguration: {
  enabled: true,
  effects: [{
    preset: "SHIELD_2",
    target: { type: EffectScope.GEM, gemIndex: 1 },
  }],
}
```

## Link

```ts
effects: [{
  preset: "DOUBLE_LINK",
  target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 2 },
}]
```

`ECHO_LINK`, `DOUBLE_LINK` e `INVERT_LINK` propagano rispettivamente lo stesso valore, il valore moltiplicato e il valore con segno invertito. La direzione può essere impostata nell'override con `LinkDirection.FORWARD` o `LinkDirection.BIDIRECTIONAL`.

## Bomba

```ts
effects: [{
  preset: "BOMB_2",
  target: { type: EffectScope.AREA, sourceGemIndex: 4 },
}]
```

Quando la gemma sorgente raggiunge esattamente zero, la bomba emette contributi `-strength` alle gemme nell'anello entro `radius`.

## Effect set e override

```ts
effectConfiguration: {
  enabled: true,
  sets: ["BASIC_LINKS"],
  effects: [{
    preset: "SHIELD_2",
    target: { type: EffectScope.GEM, gemIndex: 3 },
    overrides: { strength: 4 },
  }],
}
```

L'override è limitato alla singola assegnazione; non modifica `EFFECT_PRESETS`. I set disponibili sono `BEGINNER_PROTECTION` (uno shield), `BASIC_LINKS` (un echo link) e `ADVANCED_FLOW` (amplify più bomb).

## Esempio completo

```ts
effectConfiguration: {
  enabled: true,
  flowRules: { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: FlowCombineStrategy.SUM },
  sets: ["BASIC_LINKS"],
  effects: [
    { preset: "SHIELD_2", target: { type: EffectScope.GEM, gemIndex: 0 } },
    { preset: "WALL_3", target: { type: EffectScope.GEM, gemIndex: 3 } },
    { preset: "DOUBLE_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 2 } },
    { preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: 4 } },
  ],
}
```

Questo protegge la prima gemma, blocca i primi tre impatti sulla quarta, amplifica il flusso 1→2 e fa esplodere la quinta quando arriva a zero.

## Nuovo preset o tipo

Per aggiungere un preset esistente, inserirlo in `effect-presets.config.ts`. Per un nuovo tipo, aggiungere il valore al relativo enum e al modello discriminato, la semantica nel `EffectFlowEngine`, un evento semantico e infine la sua vista nel renderer Phaser. Non introdurre calcoli o decisioni nella scena Phaser.

## Diagnostica

In sviluppo è possibile impostare `globalThis.__RDN_EFFECT_DEBUG__ = true`: il motore registra configurazioni non valide, eventi di flow e stato residuo dei muri. I demo isolati sono in `effect-demo-levels.config.ts` e non fanno parte di `RDN_LEVELS`.

## Effect Playground

Disponibile solo a un utente admin in ambiente development: **Settings → Strumenti amministratore → 🧪 Effect Playground**. La rotta è inoltre protetta e in produzione rimanda all'hub.

Gli scenari dichiarativi sono in `effect-playground.config.ts`: `GEM_EFFECTS`, `LINK_EFFECTS`, `AREA_EFFECTS`, `FLOW_BRANCHING`, `FLOW_CONVERGENCE`, `FLOW_CYCLE` e `ALL_EFFECTS`. I controlli `‹` e `›` cambiano scenario e ricreano integralmente livello, runtime state, link e particelle; il normale Restart ricrea ad esempio `WALL_3` alla forza iniziale.

Per cambiare valori deterministici, operatori, un target o un link, modificare esclusivamente lo scenario scelto nello stesso file. Il Playground usa il normale `PuzzleEngine`, `EffectFlowEngine` e renderer Phaser: non è una simulazione parallela e non persiste punteggio, stelle, ranking o progressione.
