import { AreaEffectType, EffectConfig, EffectScope, GemEffectType, LinkEffectType } from "./effects.models";

/** Central catalogue: levels only reference these stable names. */
export const EFFECT_PRESETS = {
  SHIELD_1: { scope: EffectScope.GEM, type: GemEffectType.SHIELD, strength: 1 },
  SHIELD_2: { scope: EffectScope.GEM, type: GemEffectType.SHIELD, strength: 2 },
  SHIELD_3: { scope: EffectScope.GEM, type: GemEffectType.SHIELD, strength: 3 },
  WALL_2: { scope: EffectScope.GEM, type: GemEffectType.WALL, strength: 2 },
  WALL_3: { scope: EffectScope.GEM, type: GemEffectType.WALL, strength: 3 },
  WALL_4: { scope: EffectScope.GEM, type: GemEffectType.WALL, strength: 4 },
  MIRROR_1: { scope: EffectScope.GEM, type: GemEffectType.MIRROR },
  AMPLIFIER_X2: { scope: EffectScope.GEM, type: GemEffectType.AMPLIFIER, multiplier: 2 },
  AMPLIFIER_X3: { scope: EffectScope.GEM, type: GemEffectType.AMPLIFIER, multiplier: 3 },
  INVERTER_1: { scope: EffectScope.GEM, type: GemEffectType.INVERTER },
  ICE_1: { scope: EffectScope.GEM, type: GemEffectType.ICE, strength: 1 },
  ICE_2: { scope: EffectScope.GEM, type: GemEffectType.ICE, strength: 2 },
  ICE_3: { scope: EffectScope.GEM, type: GemEffectType.ICE, strength: 3 },
  TIMER_3: { scope: EffectScope.GEM, type: GemEffectType.TIMER, turns: 3 },
  TIMER_5: { scope: EffectScope.GEM, type: GemEffectType.TIMER, turns: 5 },
  TIMER_7: { scope: EffectScope.GEM, type: GemEffectType.TIMER, turns: 7 },
  CORRUPTION_1: { scope: EffectScope.GEM, type: GemEffectType.CORRUPTION, amount: 1 },
  CORRUPTION_2: { scope: EffectScope.GEM, type: GemEffectType.CORRUPTION, amount: 2 },
  ECHO_LINK: { scope: EffectScope.LINK, type: LinkEffectType.ECHO },
  DOUBLE_LINK: { scope: EffectScope.LINK, type: LinkEffectType.AMPLIFY, multiplier: 2 },
  INVERT_LINK: { scope: EffectScope.LINK, type: LinkEffectType.INVERT },
  BOMB_2: { scope: EffectScope.AREA, type: AreaEffectType.BOMB, strength: 2, radius: 1 },
} satisfies Record<string, EffectConfig>;

export type EffectPresetKey = keyof typeof EFFECT_PRESETS;
