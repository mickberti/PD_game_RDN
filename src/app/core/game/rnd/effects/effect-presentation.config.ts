import { EffectRuntimeState, EffectScope, GemEffectType, ResolvedEffect, TimerUnit } from "./effects.models";

/** Runtime states consumed by every visual surface; only ACTIVE is actionable or visible. */
export type EffectVisualState = "ACTIVE" | "CONSUMED" | "REMOVED" | "EXPIRED" | "SUPPRESSED";

/** The engine currently implements only impulse timers. A seconds timer must be added as a level rule before it can be authored. */
export const TIMER_PRESENTATION = {
  defaultUnit: TimerUnit.IMPULSES,
  decrementMoment: "dopo ogni impulso diretto ricevuto dalla gemma",
  expiryConsequence: "il livello termina con una sconfitta",
  attentionAt: 2,
  criticalAt: 1,
} as const;

/** Central effect-type to atlas-frame map. `missing-effect` is deliberately a development fallback only. */
export const EFFECT_ASSET_FRAME: Readonly<Record<string, string>> = {
  SHIELD: "effect-shield", WALL: "effect-wall", ICE: "effect-ice", MIRROR: "effect-mirror-sign", AMPLIFIER: "effect-amplifier", INVERTER: "effect-inverter", TIMER: "effect-timer", CORRUPTION: "effect-corruption",
  ECHO: "effect-echo-link", AMPLIFY: "effect-double-link", INVERT: "effect-mirror-link", BOMB: "effect-area-bomb",
};

export const effectAssetFrame = (effect: ResolvedEffect): string => EFFECT_ASSET_FRAME[effect.config.type] ?? "missing-effect";

export const effectVisualState = (effect: ResolvedEffect, values: readonly number[], runtime?: EffectRuntimeState): EffectVisualState => {
  if (effect.config.enabled === false) return "SUPPRESSED";
  const targetValue = effect.target.type === EffectScope.GEM ? values[effect.target.gem.index] : effect.target.type === EffectScope.LINK ? Math.min(Math.abs(values[effect.target.fromGem.index]), Math.abs(values[effect.target.toGem.index])) : values[effect.target.sourceGem.index];
  if (targetValue === 0) return "REMOVED";
  if (effect.config.scope !== EffectScope.GEM) return "ACTIVE";
  if (effect.config.type === GemEffectType.TIMER) {
    if (runtime?.expiredTimerIds.includes(effect.id)) return "EXPIRED";
    if (runtime?.completedTimerIds.includes(effect.id)) return "REMOVED";
  }
  if (effect.config.type === GemEffectType.WALL && (runtime?.wallRemainingStrength[effect.id] ?? effect.config.strength) <= 0) return "CONSUMED";
  if (effect.config.type === GemEffectType.ICE && (runtime?.iceRemainingStrength[effect.id] ?? effect.config.strength) <= 0) return "CONSUMED";
  if (effect.config.type === GemEffectType.SHIELD && effect.config.consumable && (runtime?.shieldRemainingStrength[effect.id] ?? effect.config.strength) <= 0) return "CONSUMED";
  return "ACTIVE";
};

export const isEffectVisuallyActive = (effect: ResolvedEffect, values: readonly number[], runtime?: EffectRuntimeState): boolean => effectVisualState(effect, values, runtime) === "ACTIVE";

export const timerUnitOf = (effect: ResolvedEffect): TimerUnit => effect.config.scope === EffectScope.GEM && effect.config.type === GemEffectType.TIMER ? effect.config.unit ?? TIMER_PRESENTATION.defaultUnit : TIMER_PRESENTATION.defaultUnit;
