/** Active catalogue progression facade. */
import { activeRdnCatalogueRuntime } from "../catalogues/catalogue.registry";
export type { RdnProgressionRule, RdnEffectProgressionRule } from "../catalogues/v008/progression-rules.config";
const progression = activeRdnCatalogueRuntime.progression as typeof import("../catalogues/v008/progression-rules.config");
export const RDN_PROGRESSION_RULES = progression.RDN_PROGRESSION_RULES;
export const RDN_EFFECT_PROGRESSION_RULES = progression.RDN_EFFECT_PROGRESSION_RULES;
export const RDN_EFFECT_SIMPLIFICATIONS = progression.RDN_EFFECT_SIMPLIFICATIONS;
export const RDN_GEM_EFFECT_FALLBACK_PRESETS = progression.RDN_GEM_EFFECT_FALLBACK_PRESETS;
export const rdnEffectRuleForLevel = progression.rdnEffectRuleForLevel;
export const rdnGemEffectCountForBoard = progression.rdnGemEffectCountForBoard;
export const rdnLinkCountForBoard = progression.rdnLinkCountForBoard;
export const rdnSpecialOperatorsForBoard = progression.rdnSpecialOperatorsForBoard;
export const rdnProgressionRuleForSpheres = progression.rdnProgressionRuleForSpheres;
export const rdnMaximumLinksForSpheres = progression.rdnMaximumLinksForSpheres;
export const rdnMaximumGemEffectsForSpheres = progression.rdnMaximumGemEffectsForSpheres;
