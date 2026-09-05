import type { PuzzleOperator } from "../../puzzle.types";
import { EffectScope, ElementalAffinity, FlowCombineStrategy, GemEffectType, LinkDirection } from "../../effects/effects.models";
import type { LevelEffectConfiguration } from "../../effects/level-effects.types";
import type { EffectPresetKey } from "../../effects/effect-presets.config";
import { RDN_MAX_SPECIAL_OPERATORS } from "./levels.config";

export type RdnCatalogueEffectMode = "adventure" | "time-attack";

/** Complete per-mode board budget. Counts are explicit; no configurable maxima. */
export interface RdnModeBoardProgression {
  readonly effects: number;
  readonly optionalEffects: number;
  readonly optionalEffectsEvery: number;
  readonly specials: number;
  readonly optionalSpecials: number;
  readonly optionalSpecialEvery: number;
  readonly elementals: number;
  readonly optionalElementals: number;
  readonly optionalElementalEvery: number;
  readonly ensureOppositeElementForWall: boolean;
  readonly links: number;
  readonly optionalLinks: number;
  readonly optionalLinkEvery: number;
  readonly areaEffects: number;
  readonly optionalAreaEffects: number;
  readonly optionalAreaEffectEvery: number;
  readonly solutionAttemptsBeforeScaling: number;
  readonly structureAttemptsBeforeScaling: number;
}

export interface RdnModeBoardProgressionRule {
  readonly minSpheres: number;
  readonly adventure: RdnModeBoardProgression;
  readonly timeattack: RdnModeBoardProgression;
}



const modeBoardRule = (spheres: number, mode: RdnCatalogueEffectMode): RdnModeBoardProgression => {
  const rule = RDN_MODE_BOARD_PROGRESSION_RULES.reduce((active, candidate) => spheres >= candidate.minSpheres ? candidate : active, RDN_MODE_BOARD_PROGRESSION_RULES[0]);
  return mode === "time-attack" ? rule.timeattack : rule.adventure;
};
const optionalCount = (base: number, optional: number, every: number, key: number): number => base + (every > 0 && Math.floor(key) % every === 0 ? optional : 0);

export interface RdnEffectProgressionRule {
  readonly id: "LEGACY" | "SHIELD" | "WALL" | "MIRROR" | "AMPLIFY" | "INVERTER" | "ICE" | "TIMER" | "CORRUPTION" | "LINKS" | "AREA" | "STABLE";
  readonly minLevel: number;
  readonly maxLevel?: number;
  readonly maxGemEffects: number;
  readonly maxAreaEffects: number;
  /** Replay attempts before the generator scales one effect to its next safer preset. */
  readonly solutionAttemptsBeforeScaling: number;
  /** Alternate board seeds tried before the effect configuration is simplified. */
  readonly structureAttemptsBeforeScaling: number;
}

/**
 * CONFIGURAZIONE PER NUMERO DI SFERE.
 * Viene scelta la riga con `minSpheres` piu alto che non supera le sfere
 * presenti nel tabellone.
 *
 * - `gemEffects`: numero esatto richiesto per Adventure e Time Attack. Non
 *   dipende dal seed; le due modalitÃ  partono volutamente con lo stesso numero.
 * - `minGemEffects` / `maxGemEffects`: limiti di sicurezza usati dalla
 *   semplificazione finale e dal validatore.
 * - `guaranteedSpecials`: speciali sempre presenti nell'ingranaggio.
 * - `optionalSpecials`: speciali aggiuntivi quando scatta l'intervallo.
 * - `optionalSpecialEvery`: ogni quanti livelli/seed aggiungere gli
 *   `optionalSpecials`; 0 li disabilita. Il totale e sempre limitato a 2.
 * - `fixedLinks`: link sempre creati.
 * - `optionalLinks`: link aggiuntivi quando scatta l'intervallo.
 * - `optionalLinkEvery`: ogni quanti livelli/seed aggiungere gli
 *   `optionalLinks`; 0 li disabilita.
 * - `maxLinks`: tetto assoluto dei link per il tabellone, applicato anche dal
 *   validatore. Deve essere almeno `fixedLinks`.
 *
 * Esempio: `{ minSpheres: 7, guaranteedSpecials: 1, optionalSpecials: 1,
 * optionalSpecialEvery: 3 }` crea uno speciale sicuro e il secondo ogni tre
 * configurazioni. In Free l'intervallo usa anche il seed, quindi varia.
 */

/**
 * Canonical v008 board configuration. Edit this table to calibrate the two
 * catalogue modes independently. Equal values deliberately keep them aligned.
 */
export const RDN_MODE_BOARD_PROGRESSION_RULES: readonly RdnModeBoardProgressionRule[] =
  [
    {
      minSpheres: 4,
      adventure: {
        effects: 1,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 0,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        areaEffects: 0,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 500,
        structureAttemptsBeforeScaling: 30,
      },
      timeattack: {
        effects: 1,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 0,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        areaEffects: 0,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 500,
        structureAttemptsBeforeScaling: 30,
      },
    },
    {
      minSpheres: 5,
      adventure: {
        effects: 2,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 0,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        areaEffects: 1,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 500,
        structureAttemptsBeforeScaling: 30,
      },
      timeattack: {
        effects: 2,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 0,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        areaEffects: 1,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 500,
        structureAttemptsBeforeScaling: 30,
      },
    },
    {
      minSpheres: 6,
      adventure: {
        effects: 2,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 1,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 1,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        areaEffects: 1,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 750,
        structureAttemptsBeforeScaling: 60,
      },
      timeattack: {
        effects: 2,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 1,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 1,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        areaEffects: 1,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 750,
        structureAttemptsBeforeScaling: 60,
      },
    },
    {
      minSpheres: 7,
      adventure: {
        effects: 3,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        elementals: 1,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        links: 2,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        areaEffects: 2,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 1000,
        structureAttemptsBeforeScaling: 100,
      },
      timeattack: {
        effects: 3,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 1,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 1,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 2,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        areaEffects: 2,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 1000,
        structureAttemptsBeforeScaling: 100,
      },
    },
    {
      minSpheres: 8,
      adventure: {
        effects: 4,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        elementals: 2,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        links: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        areaEffects: 2,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 1500,
        structureAttemptsBeforeScaling: 150,
      },
      timeattack: {
        effects: 4,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 1,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        elementals: 2,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        links: 3,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        areaEffects: 1,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 1500,
        structureAttemptsBeforeScaling: 150,
      },
    },
    {
      minSpheres: 9,
      adventure: {
        effects: 5,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        elementals: 3,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        links: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        areaEffects: 2,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 2000,
        structureAttemptsBeforeScaling: 200,
      },
      timeattack: {
        effects: 4,
        optionalEffects: 0,
        optionalEffectsEvery: 0,
        specials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        elementals: 3,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        links: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        areaEffects: 2,
        optionalAreaEffects: 0,
        optionalAreaEffectEvery: 0,
        solutionAttemptsBeforeScaling: 2000,
        structureAttemptsBeforeScaling: 200,
      },
    },
  ] as const;


/**
 * CONFIGURAZIONE PER LIVELLO: onboarding ed effetti generati.
 * La riga attiva e quella il cui intervallo include il livello; omettere
 * `maxLevel` rende la riga valida fino alla fine del catalogo.
 *
 * - `id`: nome della fascia e chiave del pool in `RDN_GEM_EFFECT_PRESETS`.
 * - `minLevel` / `maxLevel`: intervallo della fascia.
 * - `maxGemEffects`: tetto della fascia di livello per gli effetti sulle
 *   gemme; il numero effettivo segue l'intervallo per sfere sopra.
 * - `maxAreaEffects`: 0 disabilita l'effetto area, 1 inserisce il preset area
 *   configurato sotto.
 * - `solutionAttemptsBeforeScaling`: tentativi di ricalcolo dei valori iniziali
 *   con la configurazione corrente, prima di scalare un effetto a un preset
 *   piu semplice della stessa categoria.
 * - `structureAttemptsBeforeScaling`: quanti tabelloni alternativi (seed,
 *   code, operatori e sequenza) provare mantenendo gli stessi effetti.
 *
 * I conteggi di gemme, link e area sono definiti esclusivamente dalla tabella
 * `RDN_MODE_BOARD_PROGRESSION_RULES`, in base a sfere e modalitÃ .
 */
export const RDN_EFFECT_PROGRESSION_RULES: readonly RdnEffectProgressionRule[] = [
  { id: "LEGACY", minLevel: 1, maxLevel: 9, maxGemEffects: 0, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 0, structureAttemptsBeforeScaling: 0 },
  { id: "SHIELD", minLevel: 10, maxLevel: 19, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "WALL", minLevel: 20, maxLevel: 29, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "MIRROR", minLevel: 30, maxLevel: 34, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "AMPLIFY", minLevel: 35, maxLevel: 39, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "INVERTER", minLevel: 40, maxLevel: 44, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "ICE", minLevel: 45, maxLevel: 49, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "TIMER", minLevel: 50, maxLevel: 59, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "CORRUPTION", minLevel: 60, maxLevel: 69, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "LINKS", minLevel: 70, maxLevel: 79, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "AREA", minLevel: 80, maxLevel: 100, maxGemEffects: 2, maxAreaEffects: 1, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
  { id: "STABLE", minLevel: 101, maxGemEffects: 5, maxAreaEffects: 2, solutionAttemptsBeforeScaling: 1000, structureAttemptsBeforeScaling: 150 },
] as const;

/**
 * ECCEZIONI MANUALI: la configurazione di questa mappa ha precedenza sulle
 * regole generate. La chiave e il numero del livello; `gemIndex`,
 * `fromGemIndex`, `toGemIndex` e `sourceGemIndex` sono indici zero-based.
 */
export const RDN_EFFECT_CHECKPOINTS: Readonly<Record<number, LevelEffectConfiguration>> = {
  15: { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: EffectScope.GEM, gemIndex: 0 } }] },
  25: { enabled: true, effects: [{ preset: "WALL_1", target: { type: EffectScope.GEM, gemIndex: 1 } }] },
  35: { enabled: true, effects: [{ preset: "MIRROR_1", target: { type: EffectScope.GEM, gemIndex: 2 } }, { preset: "AMPLIFIER_X2", target: { type: EffectScope.GEM, gemIndex: 0 } }] },
  45: { enabled: true, effects: [{ preset: "INVERTER_1", target: { type: EffectScope.GEM, gemIndex: 1 } }, { preset: "ICE_2", target: { type: EffectScope.GEM, gemIndex: 3 } }] },
  55: { enabled: true, effects: [{ preset: "TIMER_5", target: { type: EffectScope.GEM, gemIndex: 0 } }, { preset: "CORRUPTION_1", target: { type: EffectScope.GEM, gemIndex: 2 } }] },
  65: { enabled: true, effects: [{ preset: "TIMER_7", target: { type: EffectScope.GEM, gemIndex: 1 } }, { preset: "CORRUPTION_2", target: { type: EffectScope.GEM, gemIndex: 3 } }, { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 2 }, overrides: { direction: LinkDirection.FORWARD } }] },
  75: { enabled: true, effects: [{ preset: "AMPLIFIER_X3", target: { type: EffectScope.GEM, gemIndex: 0 } }, { preset: "ICE_3", target: { type: EffectScope.GEM, gemIndex: 4 } }, { preset: "INVERT_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 3 }, overrides: { direction: LinkDirection.FORWARD } }, { preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: 2 } }] },
};

/**
 * POOL PER FASCIA: per ogni `id` della tabella livelli, elenco dei preset
 * candidati per gli effetti gemma. Il generatore ne sceglie uno in modo
 * deterministico; aggiungere o rimuovere un preset qui modifica solo la fascia.
 */
export const RDN_GEM_EFFECT_PRESETS: Readonly<
  Record<RdnEffectProgressionRule["id"], readonly EffectPresetKey[]>
> = {
  LEGACY: [],
  SHIELD: ["SHIELD_1", "SHIELD_2", "SHIELD_3"],
  WALL: ["WALL_1"],
  MIRROR: ["MIRROR_1"],
  AMPLIFY: ["AMPLIFIER_X2", "AMPLIFIER_X3"],
  INVERTER: ["INVERTER_1"],
  ICE: ["ICE_1", "ICE_2", "ICE_3", "FIRE_1", "FIRE_2", "FIRE_3"],
  TIMER: ["TIMER_3", "TIMER_5", "TIMER_7", "TIMER_10"],
  CORRUPTION: ["CORRUPTION_1", "CORRUPTION_2"],
  LINKS: ["SHIELD_1", "WALL_1","MIRROR_1","AMPLIFIER_X2","INVERTER_1","ICE_1","FIRE_1","CORRUPTION_1"],
  AREA: ["SHIELD_1", "WALL_1","MIRROR_1","AMPLIFIER_X2","INVERTER_1","ICE_1","FIRE_1","CORRUPTION_1"],
  STABLE: [
    "SHIELD_1",
    "SHIELD_2",
    "SHIELD_3",
    "WALL_1",
    "WALL_2",
    "WALL_3",
    "WALL_4",
    "MIRROR_1",
    "AMPLIFIER_X2",
    "AMPLIFIER_X3",
    "INVERTER_1",
    "ICE_1",
    "ICE_2",
    "ICE_3",
    "FIRE_1",
    "FIRE_2",
    "FIRE_3",
    "TIMER_3",
    "TIMER_5",
    "TIMER_7",
    "TIMER_10",
    "CORRUPTION_1",
    "CORRUPTION_2",
  ],
};

/** Pool dei preset link scelti dal generatore. */
export const RDN_LINK_EFFECT_PRESETS: readonly EffectPresetKey[] = ["ECHO_LINK", "DOUBLE_LINK", "INVERT_LINK", "CHAIN_LINK"];
/** Pool area per i livelli generati: valori firmati, gelo e inversione con portate diverse. */
export const RDN_AREA_EFFECT_PRESETS: readonly EffectPresetKey[] = ["AREA_BOMB_MINUS_2", "AREA_BOMB_PLUS_2", "AREA_BOMB_MINUS_4", "AREA_BOMB_PLUS_4", "AREA_BOMB_MINUS_7", "AREA_BOMB_PLUS_7", "AREA_ICE_ADJACENT", "AREA_ICE_TWO_ADJACENT", "AREA_ICE_ALL", "AREA_INVERTER_ADJACENT", "AREA_INVERTER_TWO_ADJACENT", "AREA_INVERTER_ALL"];
/** CompatibilitÃ  per configurazioni esterne che usavano il preset singolo. */
export const RDN_AREA_EFFECT_PRESET: EffectPresetKey = "BOMB_2";
/** Regole di propagazione comuni a tutti gli effetti generati. */
export const RDN_EFFECT_FLOW_RULES = { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: FlowCombineStrategy.SUM } as const;
/** Speciali disponibili nell'ingranaggio; l'ordine definisce la rotazione di scelta. */
export const RDN_SPECIAL_OPERATOR_CANDIDATES: readonly Exclude<PuzzleOperator, number>[] = ["zero", "invert", "divide2", "skip", "divide3"];

/** Next safer preset for an effect. Missing entries have no weaker same-category version. */
export const RDN_EFFECT_SIMPLIFICATIONS: Readonly<Partial<Record<EffectPresetKey, EffectPresetKey>>> = {
  SHIELD_3: "SHIELD_2", SHIELD_2: "SHIELD_1",
  WALL_1: "SHIELD_3", WALL_2: "WALL_1", WALL_3: "WALL_2", WALL_4: "WALL_3",
  MIRROR_1: "WALL_4",
  AMPLIFIER_X2: "MIRROR_1", AMPLIFIER_X3: "AMPLIFIER_X2",
  INVERTER_1: "AMPLIFIER_X3",
  ICE_1: "INVERTER_1", ICE_2: "ICE_1", ICE_3: "ICE_2",
  FIRE_1: "ICE_3", FIRE_2: "FIRE_1", FIRE_3: "FIRE_2",
  TIMER_3: "FIRE_3", TIMER_5: "TIMER_3", TIMER_7: "TIMER_5", TIMER_10: "TIMER_7",
  CORRUPTION_1: "TIMER_10", CORRUPTION_2: "CORRUPTION_1",
  DOUBLE_LINK: "ECHO_LINK", INVERT_LINK: "ECHO_LINK",
  BOMB_2: "BOMB_1",
  AREA_BOMB_MINUS_7: "AREA_BOMB_MINUS_4", AREA_BOMB_MINUS_4: "AREA_BOMB_MINUS_2",
  AREA_BOMB_PLUS_7: "AREA_BOMB_PLUS_4", AREA_BOMB_PLUS_4: "AREA_BOMB_PLUS_2",
  AREA_ICE_ALL: "AREA_ICE_TWO_ADJACENT", AREA_ICE_TWO_ADJACENT: "AREA_ICE_ADJACENT",
  AREA_INVERTER_ALL: "AREA_INVERTER_TWO_ADJACENT", AREA_INVERTER_TWO_ADJACENT: "AREA_INVERTER_ADJACENT",
};

/** Last-resort GEM presets, tried after same-category scaling fails. Ordered from simpler to richer. */
export const RDN_GEM_EFFECT_FALLBACK_PRESETS: readonly EffectPresetKey[] = ["SHIELD_1", "WALL_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "FIRE_1"];

export const rdnEffectRuleForLevel = (level: number): RdnEffectProgressionRule => RDN_EFFECT_PROGRESSION_RULES.find((rule) => level >= rule.minLevel && (rule.maxLevel === undefined || level <= rule.maxLevel)) ?? RDN_EFFECT_PROGRESSION_RULES[0];

export const rdnGenerationAttemptsForSpheres = (spheres: number, mode: RdnCatalogueEffectMode): Pick<RdnModeBoardProgression, "solutionAttemptsBeforeScaling" | "structureAttemptsBeforeScaling"> => {
  const rule = modeBoardRule(spheres, mode);
  return { solutionAttemptsBeforeScaling: rule.solutionAttemptsBeforeScaling, structureAttemptsBeforeScaling: rule.structureAttemptsBeforeScaling };
};
export const rdnFixedLinksForBoard = (spheres: number, mode: RdnCatalogueEffectMode): number => modeBoardRule(spheres, mode).links;
export const rdnMinimumGemEffectsForBoard = (spheres: number, mode: RdnCatalogueEffectMode): number => modeBoardRule(spheres, mode).effects;

export const rdnSpecialOperatorsForBoard = (level: number, spheres: number, mode: RdnCatalogueEffectMode, variation = 0): readonly Exclude<PuzzleOperator, number>[] => {
  const rule = modeBoardRule(spheres, mode);
  const key = Math.floor(level + variation);
  const count = Math.min(spheres, RDN_MAX_SPECIAL_OPERATORS, optionalCount(rule.specials, rule.optionalSpecials, rule.optionalSpecialEvery, key));
  const start = ((key % RDN_SPECIAL_OPERATOR_CANDIDATES.length) + RDN_SPECIAL_OPERATOR_CANDIDATES.length) % RDN_SPECIAL_OPERATOR_CANDIDATES.length;
  return Array.from({ length: count }, (_, index) => RDN_SPECIAL_OPERATOR_CANDIDATES[(start + index) % RDN_SPECIAL_OPERATOR_CANDIDATES.length]);
};

/**
 * Elemental operator affinities are deterministic and independent of Phaser.
 * Opposite affinities are reserved first, so a FIRE/ICE wall always has a
 * configured bypass when the board contains a numeric gear slot.
 */
export const rdnElementalAffinitiesForBoard = (level: number, spheres: number, mode: RdnCatalogueEffectMode, numericSlots: number, barrierTypes: readonly GemEffectType[], variation = 0): readonly ElementalAffinity[] => {
  const rule = modeBoardRule(spheres, mode);
  const key = Math.floor(level + variation);
  const opposite = rule.ensureOppositeElementForWall
    ? [...new Set(barrierTypes.flatMap((type): ElementalAffinity[] => type === GemEffectType.FIRE ? ["ice"] : type === GemEffectType.ICE ? ["fire"] : []))]
    : [];
  const count = Math.min(numericSlots, Math.max(optionalCount(rule.elementals, rule.optionalElementals, rule.optionalElementalEvery, key), opposite.length));
  return Array.from({ length: count }, (_, index) => opposite[index] ?? ((key + index) % 2 === 0 ? "fire" : "ice"));
};

export const rdnLinkCountForBoard = (level: number, spheres: number, mode: RdnCatalogueEffectMode, variation = 0): number => {
  const rule = modeBoardRule(spheres, mode);
  return Math.min(spheres - 1, optionalCount(rule.links, rule.optionalLinks, rule.optionalLinkEvery, level + variation));
};

export const rdnAreaEffectCountForBoard = (level: number, spheres: number, mode: RdnCatalogueEffectMode, variation = 0): number => {
  const rule = modeBoardRule(spheres, mode);
  return optionalCount(rule.areaEffects, rule.optionalAreaEffects, rule.optionalAreaEffectEvery, level + variation);
};

export const rdnMaximumLinksForSpheres = (spheres: number): number => Math.max(...(["adventure", "time-attack"] as const).map((mode) => optionalCount(modeBoardRule(spheres, mode).links, modeBoardRule(spheres, mode).optionalLinks, modeBoardRule(spheres, mode).optionalLinkEvery, 0)));

/** Maximum GEM effects allowed by the active sphere row. */
export const rdnMaximumGemEffectsForSpheres = (spheres: number): number => Math.max(...(["adventure", "time-attack"] as const).map((mode) => optionalCount(modeBoardRule(spheres, mode).effects, modeBoardRule(spheres, mode).optionalEffects, modeBoardRule(spheres, mode).optionalEffectsEvery, 0)));

/** Exact requested GEM-effect count, independent from preset/placement seed. */
export const rdnGemEffectCountForBoard = (level: number, mode: RdnCatalogueEffectMode, spheres: number): number => {
  const rule = modeBoardRule(spheres, mode);
  return optionalCount(rule.effects, rule.optionalEffects, rule.optionalEffectsEvery, level);
};
