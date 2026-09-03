import { EFFECT_PRESETS } from "./effect-presets.config";
import { EFFECT_SETS } from "./effect-sets.config";
import { EffectConfig, EffectScope, EffectTarget, FlowCombineStrategy, FlowRules, ResolvedEffect, ResolvedEffectTarget, RuntimeGemReference } from "./effects.models";
import { LevelEffectAssignment, LevelEffectConfiguration } from "./level-effects.types";

export interface LevelEffectResolution {
  effects: readonly ResolvedEffect[];
  issues: readonly string[];
  flowRules?: Partial<FlowRules>;
}

/**
 * Pure authoring-time configuration resolver. It never mutates a level, game state,
 * or Phaser objects; effect execution is intentionally introduced in a later phase.
 */
export class LevelEffectConfigResolver {
  resolve(configuration: LevelEffectConfiguration | null | undefined, gemCount: number): LevelEffectResolution {
    if (!configuration || !configuration.enabled) return { effects: [], issues: [] };

    const issues: string[] = [];
    const assignments: LevelEffectAssignment[] = [];
    for (const setKey of configuration.sets ?? []) {
      const set = EFFECT_SETS[setKey];
      if (!set) { issues.push(`Unknown effect set: ${setKey}`); continue; }
      assignments.push(...set.effects);
    }
    assignments.push(...(configuration.effects ?? []));

    const effects: ResolvedEffect[] = [];
    assignments.forEach((assignment, index) => {
      const effect = this.resolveAssignment(assignment, gemCount, issues, index);
      if (effect) effects.push(effect);
    });
    const gemTypesByIndex = new Map<number, Set<string>>();
    for (const effect of effects) if (effect.target.type === EffectScope.GEM && effect.config.scope === EffectScope.GEM) {
      const types = gemTypesByIndex.get(effect.target.gem.index) ?? new Set<string>(); types.add(effect.config.type); gemTypesByIndex.set(effect.target.gem.index, types);
    }
    for (const [index, types] of gemTypesByIndex) if (["WALL", "ICE", "FIRE"].filter((type) => types.has(type)).length > 1) issues.push(`Gem ${index} cannot contain more than one barrier.`);
    return { effects, issues, flowRules: this.resolveFlowRules(configuration.flowRules, issues) };
  }

  private resolveAssignment(assignment: LevelEffectAssignment, gemCount: number, issues: string[], index: number): ResolvedEffect | null {
    const preset = EFFECT_PRESETS[assignment.preset];
    if (!preset) { issues.push(`Unknown effect preset: ${assignment.preset}`); return null; }
    if (assignment.target.type !== preset.scope) { issues.push(`Effect target scope does not match preset: ${assignment.preset}`); return null; }
    const config = this.mergePreset(preset, assignment.overrides, issues, assignment.preset);
    if (!config) return null;
    const target = this.resolveTarget(assignment.target, gemCount, issues);
    if (!target) return null;
    return { id: config.id ?? `${assignment.preset}-${index}`, config, target };
  }

  private mergePreset(preset: EffectConfig, overrides: Partial<EffectConfig> | undefined, issues: string[], presetKey: string): EffectConfig | null {
    if (overrides?.scope !== undefined && overrides.scope !== preset.scope) { issues.push(`Effect override cannot change scope: ${presetKey}`); return null; }
    if (overrides?.type !== undefined && overrides.type !== preset.type) { issues.push(`Effect override cannot change type: ${presetKey}`); return null; }
    const merged = { ...preset, ...overrides } as EffectConfig;
    const strength = "strength" in merged ? merged.strength : undefined;
    const radius = "radius" in merged ? merged.radius : undefined;
    const multiplier = "multiplier" in merged ? merged.multiplier : undefined;
    const turns = "turns" in merged ? merged.turns : undefined;
    const amount = "amount" in merged ? merged.amount : undefined;
    const intervalTurns = "intervalTurns" in merged ? merged.intervalTurns : undefined;
    if ((strength !== undefined && (!Number.isFinite(strength) || strength <= 0)) || (radius !== undefined && (!Number.isInteger(radius) || radius <= 0)) || (multiplier !== undefined && (!Number.isFinite(multiplier) || multiplier <= 0)) || (turns !== undefined && (!Number.isInteger(turns) || turns <= 0)) || (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) || (intervalTurns !== undefined && (!Number.isInteger(intervalTurns) || intervalTurns <= 0))) { issues.push(`Invalid effect override values: ${presetKey}`); return null; }
    return merged;
  }

  private resolveTarget(target: EffectTarget, gemCount: number, issues: string[]): ResolvedEffectTarget | null {
    const gem = (index: number): RuntimeGemReference | null => {
      if (!Number.isInteger(index) || index < 0 || index >= gemCount) { issues.push(`Invalid gem index: ${index}`); return null; }
      return { id: `target-${index}`, index };
    };
    if (target.type === EffectScope.GEM) { const resolved = gem(target.gemIndex); return resolved ? { type: EffectScope.GEM, gem: resolved } : null; }
    if (target.type === EffectScope.AREA) { const resolved = gem(target.sourceGemIndex); return resolved ? { type: EffectScope.AREA, sourceGem: resolved } : null; }
    if (target.fromGemIndex === target.toGemIndex) { issues.push("Link effect requires two distinct gems"); return null; }
    const fromGem = gem(target.fromGemIndex); const toGem = gem(target.toGemIndex);
    return fromGem && toGem ? { type: EffectScope.LINK, fromGem, toGem } : null;
  }
  private resolveFlowRules(rules: Partial<FlowRules> | undefined, issues: string[]): Partial<FlowRules> | undefined {
    if (!rules) return undefined;
    const resolved: Partial<FlowRules> = {};
    if (rules.maxDepth !== undefined) { if (!Number.isInteger(rules.maxDepth) || rules.maxDepth < 0) issues.push("Flow rule maxDepth must be a non-negative integer"); else resolved.maxDepth = rules.maxDepth; }
    if (rules.allowMultipleIncomingFlows !== undefined) { if (typeof rules.allowMultipleIncomingFlows !== "boolean") issues.push("Flow rule allowMultipleIncomingFlows must be boolean"); else resolved.allowMultipleIncomingFlows = rules.allowMultipleIncomingFlows; }
    if (rules.combineStrategy !== undefined) { if (rules.combineStrategy !== FlowCombineStrategy.SUM) issues.push(`Unsupported flow combine strategy: ${String(rules.combineStrategy)}`); else resolved.combineStrategy = rules.combineStrategy; }
    return resolved;
  }
}
