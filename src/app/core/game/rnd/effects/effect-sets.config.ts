import { EffectScope } from "./effects.models";
import type { LevelEffectSet } from "./level-effects.types";

/** Reusable, opt-in effect groups. They do nothing until a level names the set. */
export const EFFECT_SETS = {
  /** One shield on the first ring gem; suitable for a first protected-target lesson. */
  BEGINNER_PROTECTION: {
    effects: [{ preset: "SHIELD_1", target: { type: EffectScope.GEM, gemIndex: 0 } }],
  },
  BASIC_LINKS: {
    effects: [{ preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 1 } }],
  },
  ADVANCED_FLOW: {
    effects: [
      { preset: "DOUBLE_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 1 } },
      { preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: 2 } },
    ],
  },
} satisfies Record<string, LevelEffectSet>;
