import { PuzzleDifficulty } from "../puzzle.types";
import { EffectScope, LinkDirection } from "./effects.models";
import { LevelEffectConfiguration } from "./level-effects.types";
import {
  RDN_EFFECT_CHECKPOINTS,
  RDN_EFFECT_FLOW_RULES,
  RDN_EFFECT_PROGRESSION_RULES,
  RDN_GEM_EFFECT_PRESETS,
  RDN_LINK_EFFECT_PRESETS,
  RDN_AREA_EFFECT_PRESETS,
  RdnEffectProgressionRule,
  rdnEffectRuleForLevel,
  rdnGemEffectCountForBoard,
  rdnLinkCountForBoard,
  rdnMaximumGemEffectsForSpheres,
  rdnMaximumLinksForSpheres,
} from "../progression-rules.config";

export type EffectProgressionMode = "adventure" | "time-attack" | "free";
export type EffectProgressionTier = RdnEffectProgressionRule;
export interface FreeEffectSelections { gem: boolean; link: boolean; area: boolean; }
export const EFFECT_PROGRESSION_TIERS = RDN_EFFECT_PROGRESSION_RULES;

const positiveModulo = (value: number, length: number): number => ((value % length) + length) % length;
const pick = <T>(items: readonly T[], seed: number): T => items[positiveModulo(seed, items.length)];

export const resolveEffectProgressionTier = rdnEffectRuleForLevel;

/** Every level from the first effect lesson onward uses its configured progression tier. */
export const shouldUseProgressionEffects = (level: number): boolean => level >= 10;

/** Backward-compatible export; edit the canonical catalogue instead. */
export const EFFECT_EXPLICIT_LEVEL_CONFIGURATIONS = RDN_EFFECT_CHECKPOINTS;
export const explicitEffectConfigurationForLevel = (level: number): LevelEffectConfiguration | undefined => RDN_EFFECT_CHECKPOINTS[level];

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

  const gemPresets = RDN_GEM_EFFECT_PRESETS[tier.id];
  const gemEffectCount = tier.id === "LEGACY" ? 0 : Math.min(tier.maxGemEffects, rdnGemEffectCountForBoard(key, gemCount));
  for (let index = 0; index < gemEffectCount; index += 1) {
    effects.push({ preset: pick(gemPresets, key + index), target: { type: EffectScope.GEM, gemIndex: positiveModulo(first + index, gemCount) } });
  }
  // Adventure and Time Attack must follow the visible level cadence exactly.
  // Free keeps the seed as variation so its optional link is not always fixed.
  const linkCount = rdnLinkCountForBoard(level, gemCount, mode === "free" ? seed : 0);
  for (let index = 0; index < linkCount; index += 1) {
    const fromGemIndex = positiveModulo(source + index, gemCount);
    const toGemIndex = positiveModulo(destination + index * 2, gemCount);
    effects.push({ preset: pick(RDN_LINK_EFFECT_PRESETS, key + 2 + index), target: { type: EffectScope.LINK, fromGemIndex, toGemIndex: toGemIndex === fromGemIndex ? positiveModulo(toGemIndex + 1, gemCount) : toGemIndex }, overrides: { direction: level >= 100 && (key + index) % 2 === 0 ? LinkDirection.BIDIRECTIONAL : LinkDirection.FORWARD } });
  }
  if (tier.maxAreaEffects > 0) effects.push({ preset: pick(RDN_AREA_EFFECT_PRESETS, key + 5), target: { type: EffectScope.AREA, sourceGemIndex: second } });
  return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES } : undefined;
};

export const createFreeModeEffectConfiguration = (difficulty: PuzzleDifficulty, gemCount: number, seed = 0, selections: FreeEffectSelections | boolean = false): LevelEffectConfiguration | undefined => {
  const enabled = typeof selections === "boolean"
    ? { gem: selections, link: selections, area: selections }
    : selections;
  if (!enabled.gem && !enabled.link && !enabled.area) return undefined;
  const progressionLevel = difficulty === "EASY" ? 20 : difficulty === "NORMAL" ? 40 : difficulty === "HARD" ? 60 : 81;
  // Each control must remain meaningful even when the selected difficulty
  // predates that category in the normal progression.
  const effects = [
    ...(enabled.gem ? createProgressionEffectConfiguration("free", progressionLevel, gemCount, seed)?.effects?.filter((effect) => effect.target.type === EffectScope.GEM) ?? [] : []),
    ...(enabled.link ? createProgressionEffectConfiguration("free", Math.max(progressionLevel, 72), gemCount, seed)?.effects?.filter((effect) => effect.target.type === EffectScope.LINK) ?? [] : []),
    ...(enabled.area ? createProgressionEffectConfiguration("free", Math.max(progressionLevel, 80), gemCount, seed)?.effects?.filter((effect) => effect.target.type === EffectScope.AREA) ?? [] : []),
  ];
  return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES } : undefined;
};

/** Development/test validator: link caps come from the sphere progression table. */
export const validateEffectComplexity = (configuration: LevelEffectConfiguration | undefined, label: string, spheres = 8): readonly string[] => {
  if (!configuration?.enabled) return [];
  const effects = configuration.effects ?? [];
  const gem = effects.filter((effect) => effect.target.type === EffectScope.GEM).length;
  const link = effects.filter((effect) => effect.target.type === EffectScope.LINK).length;
  const area = effects.filter((effect) => effect.target.type === EffectScope.AREA).length;
  const issues: string[] = [];
  const maximumGemEffects = rdnMaximumGemEffectsForSpheres(spheres);
  if (gem > maximumGemEffects) issues.push(`${label}: GEM effect count = ${gem}, maximum allowed = ${maximumGemEffects}.`);
  const maximumLinks = rdnMaximumLinksForSpheres(spheres);
  if (link > maximumLinks) issues.push(`${label}: LINK effect count = ${link}, maximum allowed = ${maximumLinks}.`);
  if (area > 1) issues.push(`${label}: AREA effect count = ${area}, maximum allowed = 1.`);
  return issues;
};
