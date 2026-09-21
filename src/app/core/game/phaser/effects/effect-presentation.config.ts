import { EffectEngineEvent, EffectRuntimeState, EffectScope, GemEffectType, ResolvedEffect, TimerUnit } from "./effects.models";

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
  SHIELD: "effect-shield", WALL: "effect-wall", ICE: "effect-ice", FIRE: "fire", MIRROR: "effect-mirror-sign", AMPLIFIER: "effect-amplifier", INVERTER: "effect-inverter", TIMER: "effect-timer", CORRUPTION: "effect-corruption",
  ECHO: "effect-echo-link", AMPLIFY: "effect-double-link", INVERT: "effect-mirror-link", CHAIN: "effect-chain-link", BOMB: "effect-area-bomb",
};

export const effectAssetFrame = (effect: ResolvedEffect): string => EFFECT_ASSET_FRAME[effect.config.type] ?? "missing-effect";
export const effectAssetTexture = (effect: ResolvedEffect): string => effect.config.scope === EffectScope.GEM && effect.config.type === GemEffectType.FIRE ? "rdn-effect-actions" : "rdn-effects";
/** Atlas source used by Angular UI surfaces; Phaser uses the texture names above. */
export const effectAssetAtlasSource = (effect: ResolvedEffect): "effects" | "effect-actions" => effectAssetTexture(effect) === "rdn-effect-actions" ? "effect-actions" : "effects";

/**
 * The same order used by the flow resolver for effects on one gem. Keeping it
 * here makes the static marker stack describe the actual execution sequence.
 */
export const gemEffectExecutionPriority = (type: GemEffectType): number =>
  type === GemEffectType.WALL || type === GemEffectType.ICE || type === GemEffectType.FIRE ? 10
    : type === GemEffectType.SHIELD ? 20
      : type === GemEffectType.MIRROR ? 30
        : type === GemEffectType.AMPLIFIER ? 40
          : type === GemEffectType.INVERTER ? 90 : 100;

/**
 * Predicts whether the next impulse will involve this declared effect. Effect
 * types cannot be duplicated on one gem, so the engine's gem/type events are
 * sufficient and no event identifier is needed.
 */
export const willGemEffectApplyOnNextImpulse = (effect: ResolvedEffect, events: readonly EffectEngineEvent[]): boolean => {
  if (effect.config.scope !== EffectScope.GEM || effect.target.type !== EffectScope.GEM) return false;
  const gemTargetId = effect.target.gem.id;
  // Effects outside every flow of this impulse are not being evaluated: keep
  // their markers fully visible. Attenuation is reserved for an effect whose
  // gem is reached but which the arriving value cannot activate.
  if (!events.some((event) => event.type === "FLOW_ARRIVED" && event.gemId === gemTargetId)) return true;
  const hasGemEvent = (...types: EffectEngineEvent["type"][]): boolean => events.some((event) => event.gemId === gemTargetId && types.includes(event.type));
  const hasNonZeroTransformedValue = (type: "MIRROR_APPLIED" | "GEM_AMPLIFIER_APPLIED"): boolean => events.some((event) => event.type === type && event.gemId === gemTargetId && event.effectiveValue !== 0);
  switch (effect.config.type) {
    case GemEffectType.SHIELD: return hasGemEvent("SHIELD_ABSORBED");
    case GemEffectType.WALL: return hasGemEvent("WALL_HIT");
    case GemEffectType.ICE: return hasGemEvent("ICE_HIT", "ELEMENTAL_BLOCKED", "ELEMENTAL_BYPASSED");
    case GemEffectType.FIRE: return hasGemEvent("FIRE_HIT", "ELEMENTAL_BLOCKED", "ELEMENTAL_BYPASSED");
    case GemEffectType.MIRROR: return hasNonZeroTransformedValue("MIRROR_APPLIED");
    case GemEffectType.AMPLIFIER: return hasNonZeroTransformedValue("GEM_AMPLIFIER_APPLIED");
    case GemEffectType.INVERTER: return hasGemEvent("GEM_INVERTER_APPLIED");
    case GemEffectType.TIMER: return hasGemEvent("TIMER_TICK", "TIMER_COMPLETED", "TIMER_EXPIRED");
    case GemEffectType.CORRUPTION: return hasGemEvent("CORRUPTION_APPLIED");
  }
};

/** Zero-input transformations are emitted by the resolver for traceability, but have no player-facing effect. */
export const shouldPresentEffectEvent = (event: EffectEngineEvent): boolean =>
  (event.type === "MIRROR_APPLIED" || event.type === "GEM_AMPLIFIER_APPLIED") ? event.effectiveValue !== 0 : true;

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
  if (effect.config.type === GemEffectType.FIRE && (runtime?.fireRemainingStrength[effect.id] ?? effect.config.strength) <= 0) return "CONSUMED";
  if (effect.config.type === GemEffectType.SHIELD && effect.config.consumable && (runtime?.shieldRemainingStrength[effect.id] ?? effect.config.strength) <= 0) return "CONSUMED";
  return "ACTIVE";
};

export const isEffectVisuallyActive = (effect: ResolvedEffect, values: readonly number[], runtime?: EffectRuntimeState): boolean => effectVisualState(effect, values, runtime) === "ACTIVE";

export const timerUnitOf = (effect: ResolvedEffect): TimerUnit => effect.config.scope === EffectScope.GEM && effect.config.type === GemEffectType.TIMER ? effect.config.unit ?? TIMER_PRESENTATION.defaultUnit : TIMER_PRESENTATION.defaultUnit;
