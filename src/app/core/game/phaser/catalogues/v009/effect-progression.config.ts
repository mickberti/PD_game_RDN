import { PuzzleDifficulty, SpecialPuzzleOperator } from "../../puzzle.types";
import { EffectScope, LinkDirection } from "../../effects/effects.models";
import { LevelEffectConfiguration } from "../../effects/level-effects.types";
import { EffectPresetKey } from "../../effects/effect-presets.config";
import { rdnEffectCombinationIssues } from "./effect-combination.config";
import { RDN_MAX_AREA_EFFECTS_PER_BOARD } from "./levels.config";
import {
  RDN_EFFECT_CHECKPOINTS,
  RDN_EFFECT_FLOW_RULES,
  RDN_EFFECT_PROGRESSION_RULES,
  RDN_GEM_EFFECT_PRESETS,
  RDN_LINK_EFFECT_PRESETS,
  RDN_AREA_EFFECT_PRESETS,
  RDN_GEM_EFFECT_FALLBACK_PRESETS,
  RdnEffectProgressionRule,
  rdnEffectRuleForLevel,
  rdnGemEffectCountForBoard,
  rdnAreaEffectCountForBoard,
  rdnLinkCountForBoard,
  rdnMaximumGemEffectsForSpheres,
  rdnMaximumLinksForSpheres,
} from "./progression-rules.config";

export type EffectProgressionMode = "adventure" | "time-attack" | "free";
export type EffectProgressionTier = RdnEffectProgressionRule;
export interface FreeEffectSelections { gem: boolean; link: boolean; area: boolean; }
export const EFFECT_PROGRESSION_TIERS = RDN_EFFECT_PROGRESSION_RULES;

const selectionNamespace = "rdn-v009-effect-selection";
const hash = (value: string): number => {
  let state = 2166136261;
  for (let index = 0; index < value.length; index += 1) { state ^= value.charCodeAt(index); state = Math.imul(state, 16777619); }
  return state >>> 0;
};
const randomFrom = (seed: number): (() => number) => { let state = seed || 0x6d2b79f5; return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 0x1_0000_0000; }; };
const shuffled = <T>(items: readonly T[], context: string): T[] => {
  const result = [...items]; const next = randomFrom(hash(`${selectionNamespace}:${context}`));
  for (let index = result.length - 1; index > 0; index -= 1) { const target = Math.floor(next() * (index + 1)); [result[index], result[target]] = [result[target], result[index]]; }
  return result;
};
const positiveModulo = (value: number, length: number): number => ((value % length) + length) % length;
const pick = <T>(items: readonly T[], context: string, index: number): T => shuffled(items, context)[index % items.length];
const selectionContext = (mode: EffectProgressionMode, level: number, gemCount: number, seed: number, scope: string): string => `${mode}:${level}:${gemCount}:${seed}:${scope}`;

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
  const layoutContext = selectionContext(mode, level, gemCount, seed, "layout");
  const first = positiveModulo(hash(`${layoutContext}:first`), gemCount);
  const second = positiveModulo(hash(`${layoutContext}:second`), gemCount);
  const source = positiveModulo(hash(`${layoutContext}:source`), gemCount);
  const destination = positiveModulo(hash(`${layoutContext}:destination`), gemCount);
  const effects: NonNullable<LevelEffectConfiguration["effects"]>[number][] = [];

  const gemPresets = RDN_GEM_EFFECT_PRESETS[tier.id];
  const catalogueMode = mode === "time-attack" ? "time-attack" : "adventure";
  const gemEffectCount = tier.id === "LEGACY" ? 0 : Math.min(tier.maxGemEffects, rdnGemEffectCountForBoard(level, catalogueMode, gemCount));
  for (let index = 0; index < gemEffectCount; index += 1) {
    effects.push({ preset: pick(gemPresets, selectionContext(mode, level, gemCount, seed, "gem"), index), target: { type: EffectScope.GEM, gemIndex: positiveModulo(first + index, gemCount) } });
  }
  // Adventure and Time Attack must follow the visible level cadence exactly.
  // Free keeps the seed as variation so its optional link is not always fixed.
  const linkCount = rdnLinkCountForBoard(level, gemCount, catalogueMode, mode === "free" ? seed : 0);
  const linkPresets = level >= 100 ? RDN_LINK_EFFECT_PRESETS : RDN_LINK_EFFECT_PRESETS.filter((preset) => preset !== "CHAIN_LINK");
  for (let index = 0; index < linkCount; index += 1) {
    const fromGemIndex = positiveModulo(source + index, gemCount);
    const toGemIndex = positiveModulo(destination + index * 2, gemCount);
    effects.push({ preset: pick(linkPresets, selectionContext(mode, level, gemCount, seed, "link"), index), target: { type: EffectScope.LINK, fromGemIndex, toGemIndex: toGemIndex === fromGemIndex ? positiveModulo(toGemIndex + 1, gemCount) : toGemIndex }, overrides: { direction: level >= 100 && hash(`${layoutContext}:direction:${index}`) % 2 === 0 ? LinkDirection.BIDIRECTIONAL : LinkDirection.FORWARD } });
  }
  const areaEffectCount = Math.min(tier.maxAreaEffects, RDN_MAX_AREA_EFFECTS_PER_BOARD, rdnAreaEffectCountForBoard(level, gemCount, catalogueMode, mode === "free" ? seed : 0));
  for (let index = 0; index < areaEffectCount; index += 1) effects.push({ preset: pick(RDN_AREA_EFFECT_PRESETS, selectionContext(mode, level, gemCount, seed, "area"), index), target: { type: EffectScope.AREA, sourceGemIndex: positiveModulo(second + index, gemCount) } });
  return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES } : undefined;
};

/** Re-selects only presets. Targets and category counts remain unchanged. */
export const withProgressionPresetVariation = (configuration: LevelEffectConfiguration, mode: EffectProgressionMode, level: number, seed: number): LevelEffectConfiguration => {
  const tier = resolveEffectProgressionTier(level);
  const gemPool = RDN_GEM_EFFECT_PRESETS[tier.id];
  const linkPool = level >= 100 ? RDN_LINK_EFFECT_PRESETS : RDN_LINK_EFFECT_PRESETS.filter((preset) => preset !== "CHAIN_LINK");
  let gemIndex = 0;
  let linkIndex = 0;
  let areaIndex = 0;
  return {
    ...configuration,
    effects: (configuration.effects ?? []).map((effect) => {
      if (effect.target.type === EffectScope.GEM) return { ...effect, preset: pick(gemPool, selectionContext(mode, level, 0, seed, "variation-gem"), gemIndex++) };
      if (effect.target.type === EffectScope.LINK) return { ...effect, preset: pick(linkPool, selectionContext(mode, level, 0, seed, "variation-link"), linkIndex++) };
      if (effect.target.type === EffectScope.AREA) return { ...effect, preset: pick(RDN_AREA_EFFECT_PRESETS, selectionContext(mode, level, 0, seed, "variation-area"), areaIndex++) };
      return effect;
    }),
  };
};

/**
 * Produces a valid effect combination before a board is calibrated. It starts
 * from a safe, varied base and reintroduces deterministic richer presets only
 * when the complete selection still satisfies the catalogue policy.
 */
export const policyCompatibleEffectConfiguration = (configuration: LevelEffectConfiguration, mode: EffectProgressionMode, level: number, spheres: number, seed: number, specialOperators: readonly SpecialPuzzleOperator[], enforceGemVariety = true, allowEnrichment = true): LevelEffectConfiguration => {
  const effects = [...(configuration.effects ?? [])];
  const tier = resolveEffectProgressionTier(level);
  let gemIndex = 0;
  let linkIndex = 0;
  let areaIndex = 0;
  const safe = effects.map((effect) => {
    if (effect.target.type === EffectScope.GEM) return { ...effect, preset: RDN_GEM_EFFECT_FALLBACK_PRESETS[gemIndex++ % RDN_GEM_EFFECT_FALLBACK_PRESETS.length] };
    if (effect.target.type === EffectScope.LINK) { linkIndex += 1; return { ...effect, preset: "ECHO_LINK" as EffectPresetKey, overrides: { ...effect.overrides, direction: LinkDirection.FORWARD } }; }
    return { ...effect, preset: (areaIndex++ % 2 === 0 ? "AREA_BOMB_MINUS_2" : "AREA_BOMB_PLUS_2") as EffectPresetKey };
  });
  const isValid = (candidate: readonly typeof safe[number][]) => !rdnEffectCombinationIssues(spheres, {
    presets: candidate.map((effect) => effect.preset),
    gemPresets: candidate.filter((effect) => effect.target.type === EffectScope.GEM).map((effect) => effect.preset),
    specialOperators,
  }, enforceGemVariety).length;
  if (isValid(effects)) return configuration;
  if (!isValid(safe)) return { ...configuration, effects: safe };
  if (!allowEnrichment) return { ...configuration, effects: safe };
  const selected = [...safe];
  effects.forEach((effect, index) => {
    const scope = effect.target.type === EffectScope.GEM ? "gem" : effect.target.type === EffectScope.LINK ? "link" : "area";
    const pool = scope === "gem" ? RDN_GEM_EFFECT_PRESETS[tier.id] : scope === "link" ? (level >= 100 ? RDN_LINK_EFFECT_PRESETS : RDN_LINK_EFFECT_PRESETS.filter((preset) => preset !== "CHAIN_LINK")) : RDN_AREA_EFFECT_PRESETS;
    for (const preset of shuffled(pool, selectionContext(mode, level, spheres, seed, `compatible-${scope}-${index}`))) {
      const candidate = selected.map((current, currentIndex) => currentIndex === index ? { ...current, preset } : current);
      if (isValid(candidate)) { selected[index] = candidate[index]; break; }
    }
  });
  return { ...configuration, effects: selected };
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
  if (area > RDN_MAX_AREA_EFFECTS_PER_BOARD) issues.push(`${label}: AREA effect count = ${area}, maximum allowed = ${RDN_MAX_AREA_EFFECTS_PER_BOARD}.`);
  return issues;
};
