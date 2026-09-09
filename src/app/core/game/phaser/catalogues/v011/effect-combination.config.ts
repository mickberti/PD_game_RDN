import type { SpecialPuzzleOperator } from "../../puzzle.types";
import type { EffectPresetKey } from "../../effects/effect-presets.config";

/**
 * Guardrails for combinations which are individually valid but collectively
 * make a generated board disproportionately hard to calibrate.  They are
 * deliberately catalogue-only: runtime accepts every valid published level.
 */
export type RdnCombinationRiskKey = EffectPresetKey | SpecialPuzzleOperator;

export interface RdnEffectCombinationPolicy {
  readonly maxRiskByMinimumSpheres: readonly { readonly minSpheres: number; readonly maxRisk: number; readonly maxInvasiveEffects: number }[];
  readonly riskGroups: readonly { readonly id: string; readonly risk: number; readonly members: readonly RdnCombinationRiskKey[] }[];
  /** Any pair of groups below is never selected on the same board. */
  readonly exclusiveGroupPairs: readonly (readonly [string, string])[];
  /** Initial selections keep gem effects varied; emergency fallback may opt out. */
  readonly requireDistinctInitialGemPresets: boolean;
}

export const RDN_EFFECT_COMBINATION_POLICY: RdnEffectCombinationPolicy = {
  maxRiskByMinimumSpheres: [
    { minSpheres: 4, maxRisk: 5, maxInvasiveEffects: 1 },
    { minSpheres: 5, maxRisk: 8, maxInvasiveEffects: 2 },
    { minSpheres: 6, maxRisk: 11, maxInvasiveEffects: 2 },
    { minSpheres: 7, maxRisk: 14, maxInvasiveEffects: 3 },
    { minSpheres: 8, maxRisk: 17, maxInvasiveEffects: 3 },
    { minSpheres: 9, maxRisk: 20, maxInvasiveEffects: 4 },
    { minSpheres: 10, maxRisk: 22, maxInvasiveEffects: 4 },
  ],
  riskGroups: [
    { id: "corruption", risk: 5, members: ["CORRUPTION_1", "CORRUPTION_2"] },
    { id: "timer", risk: 5, members: ["TIMER_3", "TIMER_5", "TIMER_7", "TIMER_10"] },
    { id: "chain", risk: 4, members: ["CHAIN_LINK"] },
    { id: "global-area", risk: 5, members: ["AREA_BOMB_MINUS_7", "AREA_BOMB_PLUS_7", "AREA_ICE_ALL", "AREA_INVERTER_ALL"] },
    { id: "wide-area", risk: 3, members: ["AREA_BOMB_MINUS_4", "AREA_BOMB_PLUS_4", "AREA_ICE_TWO_ADJACENT", "AREA_INVERTER_TWO_ADJACENT"] },
    { id: "area-disruptor", risk: 3, members: ["AREA_ICE_ADJACENT", "AREA_INVERTER_ADJACENT"] },
    { id: "transform", risk: 3, members: ["MIRROR_1", "INVERTER_1", "AMPLIFIER_X3", "INVERT_LINK", "DOUBLE_LINK"] },
    { id: "strong-barrier", risk: 2, members: ["WALL_3", "WALL_4", "ICE_3", "FIRE_3"] },
    { id: "special-division", risk: 3, members: ["divide2", "divide3"] },
    { id: "special-control", risk: 2, members: ["zero", "invert", "skip"] },
  ],
  exclusiveGroupPairs: [
    ["corruption", "timer"],
    ["corruption", "chain"],
    ["timer", "chain"],
    ["corruption", "global-area"],
    ["timer", "global-area"],
    ["chain", "global-area"],
    ["special-division", "timer"],
    ["special-division", "corruption"],
  ],
  requireDistinctInitialGemPresets: true,
};

const policyForSpheres = (spheres: number) => RDN_EFFECT_COMBINATION_POLICY.maxRiskByMinimumSpheres
  .reduce((active, candidate) => spheres >= candidate.minSpheres ? candidate : active, RDN_EFFECT_COMBINATION_POLICY.maxRiskByMinimumSpheres[0]);

const groupFor = (key: RdnCombinationRiskKey): RdnEffectCombinationPolicy["riskGroups"][number] | undefined =>
  RDN_EFFECT_COMBINATION_POLICY.riskGroups.find((group) => group.members.includes(key));

export interface RdnEffectCombinationCandidate {
  readonly presets: readonly EffectPresetKey[];
  readonly gemPresets: readonly EffectPresetKey[];
  readonly specialOperators: readonly SpecialPuzzleOperator[];
}

/** Returns stable diagnostic codes, suitable for generation statistics and logs. */
export const rdnEffectCombinationIssues = (spheres: number, candidate: RdnEffectCombinationCandidate, enforceGemVariety = true): readonly string[] => {
  const policy = policyForSpheres(spheres);
  const keys: readonly RdnCombinationRiskKey[] = [...candidate.presets, ...candidate.specialOperators];
  const groups = keys.flatMap((key) => {
    const group = groupFor(key);
    return group ? [group] : [];
  });
  const uniqueGroups = new Set(groups.map((group) => group.id));
  const risk = groups.reduce((total, group) => total + group.risk, 0);
  const issues: string[] = [];
  if (risk > policy.maxRisk) issues.push("EFFECT_COMBINATION_RISK_BUDGET_EXCEEDED");
  if (groups.length > policy.maxInvasiveEffects) issues.push("EFFECT_COMBINATION_INVASIVE_COUNT_EXCEEDED");
  for (const [left, right] of RDN_EFFECT_COMBINATION_POLICY.exclusiveGroupPairs) {
    if (uniqueGroups.has(left) && uniqueGroups.has(right)) issues.push(`EFFECT_COMBINATION_EXCLUSIVE_${left.toUpperCase()}_${right.toUpperCase()}`);
  }
  if (enforceGemVariety && RDN_EFFECT_COMBINATION_POLICY.requireDistinctInitialGemPresets && new Set(candidate.gemPresets).size !== candidate.gemPresets.length) {
    issues.push("EFFECT_COMBINATION_DUPLICATE_GEM_PRESET");
  }
  return issues;
};
