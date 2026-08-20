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

## GEM Effects

Gli effetti `EffectScope.GEM` sono locali: trasformano solo il contributo ricevuto dalla propria gemma, il suo valore o il loro runtime. Non creano link, non propagano e non generano effetti AREA. Il motore li risolve in modo deterministico; Phaser riceve soltanto gli eventi semantici.

| Effect | Phase | Parametri | Blocca operazione | Modifica operazione | Modifica valore autonomamente |
| --- | --- | --- | --- | --- | --- |
| SHIELD | BEFORE | `strength`, `consumable?` | no | sì | no |
| WALL | BEFORE | `strength` | sì | no | no |
| MIRROR | BEFORE | — | no | sì | no |
| AMPLIFIER | BEFORE | `multiplier` | no | sì | no |
| INVERTER | AFTER | — | no | no | sì |
| ICE | BEFORE | `strength` | sì | no | no |
| TIMER | TURN_END | `turns` | no | no | no |
| CORRUPTION | TURN_END | `amount`, `intervalTurns?` | no | no | sì |

Priority BEFORE: `WALL`/`ICE`, `SHIELD`, `MIRROR`, `AMPLIFIER`; una barriera blocca le fasi successive per quel contributo. `INVERTER` avviene dopo la mutazione. A fine impulso, dopo che Flow/Link/AREA sono stati risolti, viene applicata prima `CORRUPTION` e poi `TIMER` una sola volta.

- **SHIELD** riduce il modulo del contributo; se `consumable`, una protezione usata perde un punto runtime. Eventi: `SHIELD_ABSORBED`, `SHIELD_DEPLETED`.
- **WALL** e **ICE** assorbono un impatto per punto di resistenza. L’impatto che li rompe non modifica la gemma. Eventi distinti: `WALL_HIT`/`WALL_BROKEN`, `ICE_HIT`/`ICE_BROKEN`.
- **MIRROR** inverte il segno del contributo; **AMPLIFIER** lo moltiplica. Eventi: `MIRROR_APPLIED`, `GEM_AMPLIFIER_APPLIED`.
- **INVERTER** inverte il valore ottenuto dopo l’operazione, mantenendo `0`. Evento: `GEM_INVERTER_APPLIED`.
- **TIMER** scala una sola volta per impulso globale, termina quando la gemma arriva a zero e altrimenti emette `TIMER_TICK`/`TIMER_EXPIRED`.
- **CORRUPTION** aumenta il modulo della gemma ogni `intervalTurns`; non riattiva mai una gemma a zero. Evento: `CORRUPTION_APPLIED`.

Preset disponibili: `SHIELD_1..3`, `WALL_2..4`, `MIRROR_1`, `AMPLIFIER_X2/X3`, `INVERTER_1`, `ICE_1..3`, `TIMER_3/5/7`, `CORRUPTION_1/2`.

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

## Game Mode Effect Progression

La configurazione centrale e dichiarativa e' in `effect-progression.config.ts`. Una configurazione esplicita su un livello ha sempre precedenza; in sua assenza il resolver di progressione produce una configurazione deterministica usando modalita', numero livello, seed e numero di gemme. Ogni configurazione e' validata: massimo **2 GEM**, **1 LINK** e **1 AREA**.

| Range | GEM | LINK | AREA |
| --- | --- | --- | --- |
| 1-19 | nessuno | nessuno | nessuno |
| 20 | Shield | nessuno | nessuno |
| 40 | Wall | Echo | nessuno |
| 60 | Shield / Wall / Mirror | Amplify x2 | nessuno |
| 80 | tutti | Echo / Amplify / Invert | Bomb |
| 81+ | tutti, bilanciati | massimo uno | massimo uno |

Fino al livello 80 gli effetti sono presenti solo nei quattro livelli di introduzione 20, 40, 60 e 80. Da 81 in poi la progressione e' stabile e deterministica. I valori iniziali e la soluzione dei livelli con effetti vengono ricalcolati sulla sequenza di gioco reale; il generatore di gemme e le regole matematiche non vengono modificati.

Time Attack usa lo stesso indice di livello e la stessa progressione. In Free, il selettore `Effetti: ON/OFF` e' disattivato di default: OFF mantiene il comportamento legacy; ON mappa `EASY`, `NORMAL`, `HARD`, `EXPERT` ai profili 20, 40, 60 e 81+ rispettivamente. La factory Free e' `createFreeModeEffectConfiguration` e non genera mai configurazioni oltre i limiti sopra indicati.

## Effect Playground

Disponibile solo a un utente admin in ambiente development: **Settings → Strumenti amministratore → 🧪 Effect Playground**. La rotta è inoltre protetta e in produzione rimanda all'hub.

Gli scenari dichiarativi sono in `effect-playground.config.ts`: `GEM_EFFECTS`, `LINK_EFFECTS`, `AREA_EFFECTS`, `FLOW_BRANCHING`, `FLOW_CONVERGENCE`, `FLOW_CYCLE` e `ALL_EFFECTS`. I controlli `‹` e `›` cambiano scenario e ricreano integralmente livello, runtime state, link e particelle; il normale Restart ricrea ad esempio `WALL_3` alla forza iniziale.

Per cambiare valori deterministici, operatori, un target o un link, modificare esclusivamente lo scenario scelto nello stesso file. Il Playground usa il normale `PuzzleEngine`, `EffectFlowEngine` e renderer Phaser: non è una simulazione parallela e non persiste punteggio, stelle, ranking o progressione.
