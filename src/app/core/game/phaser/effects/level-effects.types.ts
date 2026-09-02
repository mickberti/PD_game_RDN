import type { EffectPresetKey } from "./effect-presets.config";
import type { EffectConfig, EffectTarget, FlowRules } from "./effects.models";

export interface LevelEffectAssignment {
  preset: EffectPresetKey;
  target: EffectTarget;
  /** Only scalar preset settings may be changed; scope and type are validated by the resolver. */
  overrides?: Partial<EffectConfig>;
}

export interface LevelEffectSet {
  effects: readonly LevelEffectAssignment[];
}

export type EffectSetKey = "BEGINNER_PROTECTION" | "BASIC_LINKS" | "ADVANCED_FLOW";

export interface LevelEffectConfiguration {
  enabled: boolean;
  sets?: readonly EffectSetKey[];
  effects?: readonly LevelEffectAssignment[];
  flowRules?: Partial<FlowRules>;
}
