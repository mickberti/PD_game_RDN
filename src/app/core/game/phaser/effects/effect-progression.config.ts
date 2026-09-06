/** Active catalogue effect-progression facade. */
import { activeRdnCatalogueRuntime } from "../catalogues/catalogue.registry";
export type { EffectProgressionMode, EffectProgressionTier, FreeEffectSelections } from "../catalogues/v008/effect-progression.config";
const effects = activeRdnCatalogueRuntime.effects as typeof import("../catalogues/v008/effect-progression.config");
export const EFFECT_PROGRESSION_TIERS = effects.EFFECT_PROGRESSION_TIERS;
export const EFFECT_EXPLICIT_LEVEL_CONFIGURATIONS = effects.EFFECT_EXPLICIT_LEVEL_CONFIGURATIONS;
export const resolveEffectProgressionTier = effects.resolveEffectProgressionTier;
export const shouldUseProgressionEffects = effects.shouldUseProgressionEffects;
export const explicitEffectConfigurationForLevel = effects.explicitEffectConfigurationForLevel;
export const createProgressionEffectConfiguration = effects.createProgressionEffectConfiguration;
export const createFreeModeEffectConfiguration = effects.createFreeModeEffectConfiguration;
export const validateEffectComplexity = effects.validateEffectComplexity;
