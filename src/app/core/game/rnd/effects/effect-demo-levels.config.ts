import { PersistentLevelDefinition } from "../puzzle.types";
import { FlowCombineStrategy, EffectScope } from "./effects.models";
import { LevelEffectConfiguration } from "./level-effects.types";

const demoLevel = (id: string, positions: 4 | 5, effectConfiguration: LevelEffectConfiguration): PersistentLevelDefinition => ({
  id: `effect-demo-${id}`,
  number: 0,
  title: `Demo effetti ${id}`,
  schemaVersion: 1,
  variant: "persistent",
  positions,
  initialRotation: 0,
  outerValues: Array(positions).fill(6),
  innerValues: Array(positions).fill(-2),
  slotPhases: [[{ outerIndex: 0 }]],
  effectConfiguration,
});

/** Isolated fixtures for development and tests; never appended to RDN_LEVELS or player progression. */
export const RDN_EFFECT_DEMO_LEVELS = {
  SHIELD: demoLevel("shield", 4, { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: EffectScope.GEM, gemIndex: 1 } }] }),
  WALL: demoLevel("wall", 4, { enabled: true, effects: [{ preset: "WALL_3", target: { type: EffectScope.GEM, gemIndex: 2 } }] }),
  AMPLIFY_LINK: demoLevel("amplify", 4, { enabled: true, effects: [{ preset: "DOUBLE_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 2 } }] }),
  CONVERGENCE: demoLevel("convergence", 4, { enabled: true, effects: [
    { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 1 } },
    { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 2 } },
    { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 3 } },
    { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 2, toGemIndex: 3 } },
  ] }),
  COMBINATION: demoLevel("combination", 5, {
    enabled: true,
    flowRules: { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: FlowCombineStrategy.SUM },
    sets: ["BASIC_LINKS"],
    effects: [
      { preset: "SHIELD_2", target: { type: EffectScope.GEM, gemIndex: 0 } },
      { preset: "WALL_3", target: { type: EffectScope.GEM, gemIndex: 3 } },
      { preset: "DOUBLE_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 2 } },
      { preset: "INVERT_LINK", target: { type: EffectScope.LINK, fromGemIndex: 2, toGemIndex: 4 } },
      { preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: 4 } },
    ],
  }),
  SHIELD_OVERRIDE: demoLevel("shield-override", 4, { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: EffectScope.GEM, gemIndex: 3 }, overrides: { strength: 4 } }] }),
} as const;
