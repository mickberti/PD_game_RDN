import { PuzzleDifficulty } from "../difficulty-profile.config";
import { EffectScope, FlowCombineStrategy, LinkDirection } from "./effects.models";
import { LevelEffectConfiguration } from "./level-effects.types";

export type EffectProgressionMode = "adventure" | "time-attack" | "free";

export interface EffectProgressionTier {
  readonly id: "LEGACY" | "INTRO_GEM" | "INTRO_LINK" | "INTRO_AMPLIFY" | "INTRO_ALL" | "STABLE";
  readonly minLevel: number;
  readonly maxLevel?: number;
  readonly maxGemEffects: number;
  readonly maxLinkEffects: number;
  readonly maxAreaEffects: number;
}

/**
 * Before level 81 effects are tutorial milestones only. From 81 onwards every
 * board has a deterministic, bounded configuration selected by this table.
 */
export const EFFECT_PROGRESSION_TIERS: readonly EffectProgressionTier[] = [
  { id: "LEGACY", minLevel: 1, maxLevel: 19, maxGemEffects: 0, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "INTRO_GEM", minLevel: 20, maxLevel: 39, maxGemEffects: 1, maxLinkEffects: 0, maxAreaEffects: 0 },
  { id: "INTRO_LINK", minLevel: 40, maxLevel: 59, maxGemEffects: 1, maxLinkEffects: 1, maxAreaEffects: 0 },
  { id: "INTRO_AMPLIFY", minLevel: 60, maxLevel: 79, maxGemEffects: 2, maxLinkEffects: 1, maxAreaEffects: 0 },
  { id: "INTRO_ALL", minLevel: 80, maxLevel: 80, maxGemEffects: 2, maxLinkEffects: 1, maxAreaEffects: 1 },
  { id: "STABLE", minLevel: 81, maxGemEffects: 2, maxLinkEffects: 1, maxAreaEffects: 1 },
] as const;

const milestone = (level: number): boolean => level === 20 || level === 40 || level === 60 || level === 80;
const positiveModulo = (value: number, length: number): number => ((value % length) + length) % length;
const pick = <T>(items: readonly T[], seed: number): T => items[positiveModulo(seed, items.length)];

export const resolveEffectProgressionTier = (level: number): EffectProgressionTier => EFFECT_PROGRESSION_TIERS.find((tier) => level >= tier.minLevel && (tier.maxLevel === undefined || level <= tier.maxLevel)) ?? EFFECT_PROGRESSION_TIERS[0];

/** A declared level configuration wins over this generated progression configuration. */
export const shouldUseProgressionEffects = (level: number): boolean => level >= 81 || milestone(level);

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

  if (tier.id === "INTRO_GEM") effects.push({ preset: "SHIELD_1", target: { type: EffectScope.GEM, gemIndex: first } });
  else if (tier.id === "INTRO_LINK") {
    effects.push({ preset: "WALL_2", target: { type: EffectScope.GEM, gemIndex: first } });
    effects.push({ preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: source, toGemIndex: destination }, overrides: { direction: LinkDirection.FORWARD } });
  } else if (tier.id === "INTRO_AMPLIFY") {
    effects.push({ preset: pick(["SHIELD_2", "WALL_3", "MIRROR_1"] as const, key), target: { type: EffectScope.GEM, gemIndex: first } });
    effects.push({ preset: "DOUBLE_LINK", target: { type: EffectScope.LINK, fromGemIndex: source, toGemIndex: destination }, overrides: { direction: LinkDirection.FORWARD } });
  } else {
    effects.push({ preset: pick(["SHIELD_2", "WALL_3", "MIRROR_1"] as const, key), target: { type: EffectScope.GEM, gemIndex: first } });
    if (tier.maxGemEffects > 1 && key % 3 === 0) effects.push({ preset: pick(["SHIELD_1", "WALL_2", "MIRROR_1"] as const, key + 1), target: { type: EffectScope.GEM, gemIndex: second } });
    effects.push({ preset: pick(["ECHO_LINK", "DOUBLE_LINK", "INVERT_LINK"] as const, key + 2), target: { type: EffectScope.LINK, fromGemIndex: source, toGemIndex: destination }, overrides: { direction: level >= 100 && key % 2 === 0 ? LinkDirection.BIDIRECTIONAL : LinkDirection.FORWARD } });
    if (tier.maxAreaEffects > 0 && (tier.id === "INTRO_ALL" || key % 2 === 0)) effects.push({ preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: second } });
  }
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
