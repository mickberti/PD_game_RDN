import { PuzzleDifficulty } from "../difficulty-profile.config";
import { EffectScope, FlowCombineStrategy, LinkDirection } from "./effects.models";
import { LevelEffectConfiguration } from "./level-effects.types";

export type EffectProgressionMode = "adventure" | "time-attack" | "free";

export interface EffectProgressionTier {
  readonly id: "LEGACY" | "SHIELD" | "WALL" | "MIRROR_AMPLIFY" | "INVERTER_ICE" | "TIMER" | "CORRUPTION" | "LINKS" | "AREA" | "STABLE";
  readonly minLevel: number;
  readonly maxLevel?: number;
  readonly maxGemEffects: number;
  readonly maxLinkEffects: number;
  readonly maxAreaEffects: number;
}

/**
 * Before level 81 an effect lesson appears every ten levels. From 81 onwards
 * every board has a deterministic, bounded full configuration.
 */
export const EFFECT_PROGRESSION_TIERS: readonly EffectProgressionTier[] = [
  { id: "LEGACY", minLevel: 1, maxLevel: 9, maxGemEffects: 0, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "SHIELD", minLevel: 10, maxLevel: 19, maxGemEffects: 1, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "WALL", minLevel: 20, maxLevel: 29, maxGemEffects: 1, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "MIRROR_AMPLIFY", minLevel: 30, maxLevel: 39, maxGemEffects: 1, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "INVERTER_ICE", minLevel: 40, maxLevel: 49, maxGemEffects: 1, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "TIMER", minLevel: 50, maxLevel: 59, maxGemEffects: 1, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "CORRUPTION", minLevel: 60, maxLevel: 69, maxGemEffects: 1, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "LINKS", minLevel: 70, maxLevel: 79, maxGemEffects: 1, maxLinkEffects: 1, maxAreaEffects: 0 },
  { id: "AREA", minLevel: 80, maxLevel: 80, maxGemEffects: 2, maxLinkEffects: 1, maxAreaEffects: 1 },
  { id: "STABLE", minLevel: 81, maxGemEffects: 2, maxLinkEffects: 1, maxAreaEffects: 1 },
] as const;

const milestone = (level: number): boolean => level >= 10 && level <= 80 && level % 10 === 0;
const positiveModulo = (value: number, length: number): number => ((value % length) + length) % length;
const pick = <T>(items: readonly T[], seed: number): T => items[positiveModulo(seed, items.length)];

export const resolveEffectProgressionTier = (level: number): EffectProgressionTier => EFFECT_PROGRESSION_TIERS.find((tier) => level >= tier.minLevel && (tier.maxLevel === undefined || level <= tier.maxLevel)) ?? EFFECT_PROGRESSION_TIERS[0];

/** A declared level configuration wins over this generated progression configuration. */
export const shouldUseProgressionEffects = (level: number): boolean => level >= 81 || milestone(level);

/**
 * Hand-authored checkpoints. They override generated milestones and are the
 * intended place to tune an individual lesson without changing other levels.
 */
export const EFFECT_EXPLICIT_LEVEL_CONFIGURATIONS: Readonly<Record<number, LevelEffectConfiguration>> = {
  15: { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: EffectScope.GEM, gemIndex: 0 } }] },
  25: { enabled: true, effects: [{ preset: "WALL_3", target: { type: EffectScope.GEM, gemIndex: 1 } }] },
  35: { enabled: true, effects: [{ preset: "MIRROR_1", target: { type: EffectScope.GEM, gemIndex: 2 } }, { preset: "AMPLIFIER_X2", target: { type: EffectScope.GEM, gemIndex: 0 } }] },
  45: { enabled: true, effects: [{ preset: "INVERTER_1", target: { type: EffectScope.GEM, gemIndex: 1 } }, { preset: "ICE_2", target: { type: EffectScope.GEM, gemIndex: 3 } }] },
  55: { enabled: true, effects: [{ preset: "TIMER_5", target: { type: EffectScope.GEM, gemIndex: 0 } }, { preset: "CORRUPTION_1", target: { type: EffectScope.GEM, gemIndex: 2 } }] },
  65: { enabled: true, effects: [{ preset: "TIMER_7", target: { type: EffectScope.GEM, gemIndex: 1 } }, { preset: "CORRUPTION_2", target: { type: EffectScope.GEM, gemIndex: 3 } }, { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 2 }, overrides: { direction: LinkDirection.FORWARD } }] },
  75: { enabled: true, effects: [{ preset: "AMPLIFIER_X3", target: { type: EffectScope.GEM, gemIndex: 0 } }, { preset: "ICE_3", target: { type: EffectScope.GEM, gemIndex: 4 } }, { preset: "INVERT_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 3 }, overrides: { direction: LinkDirection.FORWARD } }, { preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: 2 } }] },
};

export const explicitEffectConfigurationForLevel = (level: number): LevelEffectConfiguration | undefined => EFFECT_EXPLICIT_LEVEL_CONFIGURATIONS[level];

/**
 * Produces a bounded declarative configuration. It contains no Phaser or engine
 * logic and is deterministic for a mode, level and ring size.
 */
export const createProgressionEffectConfiguration = (mode: EffectProgressionMode, level: number, gemCount: number, seed = 0): LevelEffectConfiguration | undefined => {
  if (gemCount < 4 || !shouldUseProgressionEffects(level)) return undefined;
  const tier = resolveEffectProgressionTier(level);
  const key = level * 37 + gemCount * 11 + seed + (mode === "time-attack" ? 7 : mode === "free" ? 13 : 0);
  const first = positiveModulo(key, gemCount);
  const second = positiveModulo(first + 2, gemCount);
  const source = positiveModulo(first + 1, gemCount);
  const destination = positiveModulo(source + 1, gemCount);
  const effects: NonNullable<LevelEffectConfiguration["effects"]>[number][] = [];

  const gemPresets = tier.id === "SHIELD" ? ["SHIELD_1", "SHIELD_2", "SHIELD_3"] as const
    : tier.id === "WALL" ? ["WALL_2", "WALL_3", "WALL_4"] as const
      : tier.id === "MIRROR_AMPLIFY" ? ["MIRROR_1", "AMPLIFIER_X2", "AMPLIFIER_X3"] as const
        : tier.id === "INVERTER_ICE" ? ["INVERTER_1", "ICE_1", "ICE_2", "ICE_3"] as const
          : tier.id === "TIMER" ? ["TIMER_3", "TIMER_5", "TIMER_7"] as const
            : tier.id === "CORRUPTION" ? ["CORRUPTION_1", "CORRUPTION_2"] as const
              : ["SHIELD_1", "SHIELD_2", "SHIELD_3", "WALL_2", "WALL_3", "WALL_4", "MIRROR_1", "AMPLIFIER_X2", "AMPLIFIER_X3", "INVERTER_1", "ICE_1", "ICE_2", "ICE_3", "TIMER_3", "TIMER_5", "TIMER_7", "CORRUPTION_1", "CORRUPTION_2"] as const;
  if (tier.id !== "LEGACY") effects.push({ preset: pick(gemPresets, key), target: { type: EffectScope.GEM, gemIndex: first } });
  if (tier.maxGemEffects > 1 && key % 3 === 0) effects.push({ preset: pick(gemPresets, key + 1), target: { type: EffectScope.GEM, gemIndex: second } });
  if (tier.maxLinkEffects > 0) effects.push({ preset: pick(["ECHO_LINK", "DOUBLE_LINK", "INVERT_LINK"] as const, key + 2), target: { type: EffectScope.LINK, fromGemIndex: source, toGemIndex: destination }, overrides: { direction: level >= 100 && key % 2 === 0 ? LinkDirection.BIDIRECTIONAL : LinkDirection.FORWARD } });
  if (tier.maxAreaEffects > 0) effects.push({ preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: second } });
  return effects.length ? { enabled: true, effects, flowRules: { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: FlowCombineStrategy.SUM } } : undefined;
};

export const createFreeModeEffectConfiguration = (difficulty: PuzzleDifficulty, gemCount: number, seed = 0, enabled = false): LevelEffectConfiguration | undefined => {
  if (!enabled) return undefined;
  const progressionLevel = difficulty === "EASY" ? 20 : difficulty === "NORMAL" ? 40 : difficulty === "HARD" ? 60 : 81;
  return createProgressionEffectConfiguration("free", progressionLevel, gemCount, seed);
};

/** Development/test validator: no mode configuration may exceed these caps. */
export const validateEffectComplexity = (configuration: LevelEffectConfiguration | undefined, label: string): readonly string[] => {
  if (!configuration?.enabled) return [];
  const effects = configuration.effects ?? [];
  const gem = effects.filter((effect) => effect.target.type === EffectScope.GEM).length;
  const link = effects.filter((effect) => effect.target.type === EffectScope.LINK).length;
  const area = effects.filter((effect) => effect.target.type === EffectScope.AREA).length;
  const issues: string[] = [];
  if (gem > 2) issues.push(`${label}: GEM effect count = ${gem}, maximum allowed = 2.`);
  if (link > 1) issues.push(`${label}: LINK effect count = ${link}, maximum allowed = 1.`);
  if (area > 1) issues.push(`${label}: AREA effect count = ${area}, maximum allowed = 1.`);
  return issues;
};
