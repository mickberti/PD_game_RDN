import { AreaEffectType, EffectConfig, EffectScope, GemEffectType, LinkEffectType } from "./effects.models";

/** Central catalogue: levels only reference these stable names. */
export const EFFECT_PRESETS = {
  SHIELD_1: { scope: EffectScope.GEM, type: GemEffectType.SHIELD, strength: 1 },
  SHIELD_2: { scope: EffectScope.GEM, type: GemEffectType.SHIELD, strength: 2 },
  WALL_2: { scope: EffectScope.GEM, type: GemEffectType.WALL, strength: 2 },
  WALL_3: { scope: EffectScope.GEM, type: GemEffectType.WALL, strength: 3 },
  MIRROR_1: { scope: EffectScope.GEM, type: GemEffectType.MIRROR },
  ECHO_LINK: { scope: EffectScope.LINK, type: LinkEffectType.ECHO },
  DOUBLE_LINK: { scope: EffectScope.LINK, type: LinkEffectType.AMPLIFY, multiplier: 2 },
  INVERT_LINK: { scope: EffectScope.LINK, type: LinkEffectType.INVERT },
  BOMB_2: { scope: EffectScope.AREA, type: AreaEffectType.BOMB, strength: 2, radius: 1 },
} satisfies Record<string, EffectConfig>;

export type EffectPresetKey = keyof typeof EFFECT_PRESETS;
