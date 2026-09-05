import { AdventureGameConfig, DEFAULT_PUZZLE_NUMBER_RANGE, LevelDefinition, PuzzleDifficulty, PuzzleOperator, PuzzleSlotSolution, PuzzleSolutionMove } from "../../puzzle.types";
import { PuzzleEngine } from "../../puzzle.engine";
import { LevelEffectConfigResolver } from "../../effects/level-effect-config.resolver";
import { EffectConfig, EffectScope, ElementalAffinity, GemEffectType, LinkDirection, ResolvedEffect } from "../../effects/effects.models";
import { RDN_RELEASE } from "./rdn-release.config";
import { createFreeModeEffectConfiguration, createProgressionEffectConfiguration, explicitEffectConfigurationForLevel, validateEffectComplexity, withProgressionPresetVariation } from "./effect-progression.config";
import { LevelEffectConfiguration } from "../../effects/level-effects.types";
import { RDN_EFFECT_SIMPLIFICATIONS, RDN_GEM_EFFECT_FALLBACK_PRESETS, rdnEffectRuleForLevel, rdnElementalAffinitiesForBoard, rdnFixedLinksForBoard, rdnGenerationAttemptsForSpheres, rdnMinimumGemEffectsForBoard, rdnSpecialOperatorsForBoard, RdnModeBoardProgression } from "./progression-rules.config";
import { rdnEffectCombinationIssues } from "./effect-combination.config";
import { RDN_MAX_GEAR_OPERATOR_MAGNITUDE, RDN_MAX_LEVEL, RDN_MAX_OPERATIONS_PER_SPHERE, RDN_MAX_SPHERES, RDN_MAX_TIMER_DIRECT_IMPULSES, RDN_MIN_SPHERES, rdnSphereCountForLevel } from "./levels.config";

const DEFAULT_ACTIVE_FLOW_COUNT = 1;
const freeActiveFlowCount = (difficulty: PuzzleDifficulty): number => difficulty === "EASY" ? 1 : difficulty === "NORMAL" ? 2 : difficulty === "HARD" ? 3 : 4;
type CatalogueGenerationMode = "adventure" | "time-attack";
const catalogueGenerationEnvironment = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const catalogueGenerationBound = (key: "RDN_CATALOGUE_LEVEL_FROM" | "RDN_CATALOGUE_LEVEL_TO", fallback: number): number => {
  const value = catalogueGenerationEnvironment?.[key];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > RDN_MAX_LEVEL) throw new Error(`${key} deve essere compreso tra 1 e ${RDN_MAX_LEVEL}.`);
  return parsed;
};
const catalogueGenerationModes = (): readonly CatalogueGenerationMode[] => {
  const raw = catalogueGenerationEnvironment?.["RDN_CATALOGUE_MODES"];
  if (!raw) return ["adventure", "time-attack"];
  const modes = [...new Set(raw.split(",").map((value) => value.trim()).filter((value): value is CatalogueGenerationMode => value === "adventure" || value === "time-attack"))];
  if (!modes.length) throw new Error("RDN_CATALOGUE_MODES deve contenere adventure e/o time-attack.");
  return modes;
};
/** Deterministic catalogue: a level always produces the same board and solution. */
const modulo = (value: number, length: number): number => ((value % length) + length) % length;
const random = (seed: number): (() => number) => { let state = seed >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x1_0000_0000; }; };
/** Larger target values remain practical because later boards can use signed jumps up to 9. */
const impulsesPerValue = (number: number): number => number <= 3 ? 1 : Math.min(RDN_MAX_OPERATIONS_PER_SPHERE, 2 + Math.floor((number - 4) / 20));
const rotationDistance = (from: number, to: number, positions: number): number => Math.min(modulo(to - from, positions), modulo(from - to, positions));

interface GeneratedBoard { positions: 4 | 5 | 6 | 7 | 8 | 9; initialRotation: number; innerValues: PuzzleOperator[]; loaderQueues: PuzzleOperator[][]; outerValues: number[]; slotPhases: Array<Array<{ outerIndex: number }>>; optimalCost: { impulses: number; rotationSteps: number }; solution: PuzzleSlotSolution[]; solutionMoves: PuzzleSolutionMove[]; seed: number; }
interface ValuePlan { start: number; operators: PuzzleOperator[]; }

/** Division specials are introduced gradually on advanced boards. */
/** One-use action specials share the gear with DIV2/DIV3; ×2 remains HUD-only. */
const specialOperatorsForLevel = (level: number, positions: number, mode: "adventure" | "time-attack" = "adventure", variation = 0): PuzzleOperator[] => {
  return [...rdnSpecialOperatorsForBoard(level, positions, mode, variation)];
};
const gearOperators = (positions: number, specialOperators: readonly PuzzleOperator[], next: () => number, allowDuplicateSignedValues = false): PuzzleOperator[] => {
  const subtractorCount = positions - specialOperators.length;
  if (!allowDuplicateSignedValues && RDN_MAX_GEAR_OPERATOR_MAGNITUDE < Math.ceil(subtractorCount / 2)) {
    throw new Error(`RDN_MAX_GEAR_OPERATOR_MAGNITUDE=${RDN_MAX_GEAR_OPERATOR_MAGNITUDE} non consente ${subtractorCount} operatori numerici univoci per segno.`);
  }
  // Adventure and Time Attack expose a stable gear: each signed additive value
  // is unique. Free deliberately keeps duplicates because its gear changes per impulse.
  const usedNegative = new Set<number>(); const usedPositive = new Set<number>();
  const magnitudes = Array.from({ length: subtractorCount }, (_, index) => {
    const used = index % 2 === 0 ? usedNegative : usedPositive;
    let value = 1 + Math.floor(next() * RDN_MAX_GEAR_OPERATOR_MAGNITUDE);
    if (!allowDuplicateSignedValues) while (used.has(value)) value = value % RDN_MAX_GEAR_OPERATOR_MAGNITUDE + 1;
    used.add(value);
    return value;
  });
  return [...magnitudes.map((value, index) => index % 2 === 0 ? -value : value), ...specialOperators];
};
const additiveOperators = (operators: PuzzleOperator[]): number[] => operators.filter((operator): operator is number => typeof operator === "number" && operator !== 0);
/** Assigns plan signs so all numeric queue entries are as close as possible to a 50/50 split. */
const balancedPlanSigns = (plans: readonly ValuePlan[]): readonly boolean[] => {
  const counts = plans.map((plan) => plan.operators.filter((operator): operator is number => typeof operator === "number").length);
  const total = counts.reduce((sum, count) => sum + count, 0); const reachable: Array<readonly number[] | undefined> = Array(total + 1).fill(undefined); reachable[0] = [];
  counts.forEach((count, index) => { for (let sum = total - count; sum >= 0; sum -= 1) if (reachable[sum] && !reachable[sum + count]) reachable[sum + count] = [...reachable[sum]!, index]; });
  let selectedSum = 0;
  for (let sum = 0; sum <= total; sum += 1) if (reachable[sum] && Math.abs(total - sum * 2) < Math.abs(total - selectedSum * 2)) selectedSum = sum;
  const positivePlans = new Set(reachable[selectedSum]);
  return plans.map((_, index) => positivePlans.has(index));
};

/** Builds a solvable sequence using only operators physically present in the generated gear. */
const subtractivePlan = (count: number, available: number[], next: () => number, maximumStart = 20): ValuePlan => {
  if (!available.length) throw new Error("RDN generator requires at least one compatible numeric operator");
  const minimumMagnitude = Math.min(...available.map((value) => Math.abs(value)));
  // Division tails can have a stricter range. Shorten only that target's plan instead
  // of inventing a missing +/-1 operator or producing an out-of-range start value.
  const safeCount = Math.max(1, Math.min(count, Math.floor(maximumStart / minimumMagnitude)));
  const values: number[] = [];
  let total = 0;
  for (let index = 0; index < safeCount; index += 1) {
    const remaining = safeCount - index - 1;
    const candidates = available.filter((value) => total + Math.abs(value) + remaining * minimumMagnitude <= maximumStart);
    const selected = candidates[Math.floor(next() * candidates.length)] ?? available[0];
    values.push(selected);
    total += Math.abs(selected);
  }
  // Additive operators must always move the generated target toward zero.
  return { start: total * (values[0] < 0 ? 1 : -1), operators: values };
};

const planForValue = (impulses: number, available: number[], next: () => number, maximumStart: number, forcedOperator?: PuzzleOperator): ValuePlan => {
  if (forcedOperator === "divide2" || forcedOperator === "divide3") {
    const divisor = forcedOperator === "divide2" ? 2 : 3;
    const tail = subtractivePlan(impulses - 1, available, next, Math.floor(maximumStart / divisor));
    return { start: tail.start * divisor, operators: [forcedOperator, ...tail.operators] };
  }
  if (forcedOperator === "zero") {
    const magnitude = 1 + Math.floor(next() * Math.max(1, maximumStart));
    return { start: next() < .5 ? -magnitude : magnitude, operators: [forcedOperator] };
  }
  if (forcedOperator === "invert") {
    const tail = subtractivePlan(Math.max(1, impulses - 1), available, next, maximumStart);
    return { start: -tail.start, operators: [forcedOperator, ...tail.operators] };
  }
  if (forcedOperator === "skip") {
    const tail = subtractivePlan(Math.max(1, impulses - 1), available, next, maximumStart);
    return { start: tail.start, operators: [forcedOperator, ...tail.operators] };
  }
  return subtractivePlan(impulses, available, next, maximumStart);
};

const generateBoard = (number: number, seedOffset: number, mode: "adventure" | "time-attack" = "adventure", slotCount?: number, balanceQueueSigns = false, allowDuplicateSignedGearValues = false): GeneratedBoard => {
  const positions = slotCount && slotCount >= RDN_MIN_SPHERES && slotCount <= RDN_MAX_SPHERES ? slotCount as GeneratedBoard["positions"] : rdnSphereCountForLevel(number);
  const impulses = impulsesPerValue(number);
  const seed = number * 977 + seedOffset;
  const next = random(seed);
  const specialOperators = specialOperatorsForLevel(number, positions, mode, seedOffset);
  const innerValues = gearOperators(positions, specialOperators, next, allowDuplicateSignedGearValues);
  const allAdditives = additiveOperators(innerValues);
  const range = DEFAULT_PUZZLE_NUMBER_RANGE;
  const maximumStart = Math.min(Math.abs(range.min), Math.abs(range.max));
  const planForIndex = (index: number, positive: boolean) => planForValue(impulses, allAdditives.filter((operator) => positive ? operator > 0 : operator < 0), next, maximumStart, specialOperators[index]);
  // Free boards use a temporary deterministic plan only to calculate the exact numeric queue weights,
  // then regenerate their real plans with the closest possible positive/negative split.
  const provisionalPlans = Array.from({ length: positions }, (_, index) => planForIndex(index, index % 2 !== 0));
  const planSigns = balanceQueueSigns ? balancedPlanSigns(provisionalPlans) : provisionalPlans.map((_, index) => index % 2 !== 0);
  const plans = balanceQueueSigns ? Array.from({ length: positions }, (_, index) => planForIndex(index, planSigns[index])) : provisionalPlans;
  const loaderQueues = Array.from({ length: positions }, () => [] as PuzzleOperator[]);
  const cursors = Array<number>(positions).fill(0);
  const rotations: number[] = [];
  const slotPhases: Array<Array<{ outerIndex: number }>> = [];
  const solutionMoves: PuzzleSolutionMove[] = [];

  // Each impulse enables one planned operation. The required alignment is deliberately shuffled,
  // so pressing impulse twice without rotating no longer resolves a board by accident.
  while (cursors.some((cursor, outerIndex) => cursor < plans[outerIndex].operators.length)) {
    const candidates = plans.map((plan, outerIndex) => cursors[outerIndex] < plan.operators.length ? outerIndex : -1).filter((outerIndex) => outerIndex >= 0);
    const outerIndex = candidates[Math.floor(next() * candidates.length)];
    const operator = plans[outerIndex].operators[cursors[outerIndex]];
    const innerIndex = innerValues.findIndex((value) => value === operator);
    loaderQueues[innerIndex].push(operator);
    const rotation = modulo(outerIndex - innerIndex, positions);
    rotations.push(rotation);
    slotPhases.push([{ outerIndex }]);
    solutionMoves.push({ outerIndex, rotation, operator });
    cursors[outerIndex] += 1;
  }

  // Avoid spawning on the first valid solution position except in tutorial levels.
  const initialRotation = modulo(rotations[0] + 1 + Math.floor(next() * Math.max(1, positions - 1)), positions);
  let previousRotation = initialRotation;
  let rotationSteps = 0;
  for (const rotation of rotations) { rotationSteps += rotationDistance(previousRotation, rotation, positions); previousRotation = rotation; }
  return { positions, initialRotation, innerValues, loaderQueues, outerValues: plans.map((plan) => plan.start), slotPhases, optimalCost: { impulses: slotPhases.length, rotationSteps }, solution: plans.map((plan) => ({ startValue: plan.start, operators: [...plan.operators] })), solutionMoves, seed };
};

/** The tutorial deliberately exposes one target per impulse: UI flow and applied operation stay identical. */
const tutorialBoard = (): GeneratedBoard => {
  const operators = [-1, -2, -3, -4] as const;
  const values = operators.map((operator) => -operator);
  return { positions: 4, initialRotation: 0, innerValues: [...operators], loaderQueues: operators.map((operator) => [operator]), outerValues: values, slotPhases: [[{ outerIndex: 0 }], [{ outerIndex: 1 }], [{ outerIndex: 2 }], [{ outerIndex: 3 }]], optimalCost: { impulses: 4, rotationSteps: 0 }, solution: operators.map((operator, index) => ({ startValue: values[index], operators: [operator] })), solutionMoves: operators.map((operator, outerIndex) => ({ outerIndex, rotation: 0, operator })), seed: 0 };
};

const generatedMetadata = (number: number, board: GeneratedBoard, difficulty: PuzzleDifficulty = "EASY", activeFlowCount = DEFAULT_ACTIVE_FLOW_COUNT) => ({ seed: board.seed, generatorVersion: RDN_RELEASE.generatorVersion, balanceVersion: RDN_RELEASE.balanceVersion, difficulty, estimatedMinimumSolutionLength: board.optimalCost.impulses, specialOperators: board.innerValues.filter((operator): operator is Exclude<PuzzleOperator, number> => typeof operator !== "number"), officialSolutionImpulses: board.optimalCost.impulses, officialSolutionRotationSteps: board.optimalCost.rotationSteps, branchingFactor: activeFlowCount, featureFlags: [] });
const adventureConfig = (number: number, board: GeneratedBoard): AdventureGameConfig => ({
  version: 1,
  seed: board.seed,
  levelVersion: "rdn-adventure-v1",
  objectives: { targetValues: [...board.outerValues], requireAllTargetsZero: true },
  enabledMechanics: ["fixed-operators", "special-inventory", "rotation", "impulse"],
  specialInventory: {
    divide2: board.innerValues.filter((operator) => operator === "divide2").length,
    divide3: board.innerValues.filter((operator) => operator === "divide3").length,
    zero: board.innerValues.filter((operator) => operator === "zero").length,
    invert: board.innerValues.filter((operator) => operator === "invert").length,
    skip: board.innerValues.filter((operator) => operator === "skip").length,
  },
});

export interface PuzzleSolutionExecutionStep {
  move: PuzzleSolutionMove;
  /** Every sphere whose displayed value changes during this impulse. */
  updates: readonly { outerIndex: number; value: number; viaLink: boolean }[];
}

const replaySolutionWithTrace = (level: LevelDefinition): { state: ReturnType<PuzzleEngine["createInitialState"]>; execution: readonly PuzzleSolutionExecutionStep[] } => {
  const engine = new PuzzleEngine();
  let state = engine.createInitialState(level);
  const execution: PuzzleSolutionExecutionStep[] = [];
  for (const move of level.solutionMoves ?? []) {
    const delta = modulo(move.rotation - state.rotation, level.positions);
    if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
    const plan = engine.planImpulse(level, state);
    const linkedTargets = new Set(plan.impacts.filter((impact) => impact.linkId).map((impact) => impact.targetId));
    const changedTargets = new Set(plan.impacts.map((impact) => impact.targetId));
    execution.push({
      move,
      updates: [...changedTargets].map((outerIndex) => ({ outerIndex, value: plan.finalValues[outerIndex], viaLink: linkedTargets.has(outerIndex) })),
    });
    state = engine.apply(level, state, { type: "IMPULSE" });
  }
  return { state, execution };
};
const replaySolution = (level: LevelDefinition): ReturnType<PuzzleEngine["createInitialState"]> => replaySolutionWithTrace(level).state;

/**
 * Timer limits are derived from the canonical route. This keeps the pressure
 * local to the timed gem while ensuring its own planned direct impulses fit
 * inside the displayed deadline.
 */
const withCalibratedTimerDeadlines = <T extends LevelDefinition>(level: T, configuration: LevelEffectConfiguration): LevelEffectConfiguration | undefined => {
  if (!configuration.effects?.length || configuration.sets?.length) return configuration;
  const effects = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects;
  const deadlines = new Map<number, number>();
  effects.forEach((effect, index) => {
    if (effect.config.type !== GemEffectType.TIMER) return;
    const target = effect.target;
    if (target.type !== EffectScope.GEM) return;
    const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === target.gem.index).length;
    if (directImpulses > RDN_MAX_TIMER_DIRECT_IMPULSES) return;
    deadlines.set(index, Math.max(effect.config.turns, directImpulses));
  });
  return {
    ...configuration,
    effects: configuration.effects.map((assignment, index) => {
      const deadline = deadlines.get(index);
      return deadline === undefined ? assignment : { ...assignment, overrides: { ...assignment.overrides, turns: deadline } as Partial<EffectConfig> };
    }),
  };
};

const timerDeadlineFailed = (state: ReturnType<PuzzleEngine["createInitialState"]>): boolean => (state.effectRuntime?.expiredTimerIds.length ?? 0) > 0;

const lastIndexFor = (effects: readonly NonNullable<LevelEffectConfiguration["effects"]>[number][], scope: EffectScope): number => { for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index].target.type === scope) return index; return -1; };

/** Generated effects may move together around the board before being weakened.
 * This preserves the composition and topology while avoiding an incompatible
 * target on an otherwise valid puzzle structure. */
const withRotatedEffectTargets = (configuration: LevelEffectConfiguration, positions: number, offset: number): LevelEffectConfiguration => {
  const rotate = (index: number): number => modulo(index + offset, positions);
  return {
    ...configuration,
    effects: configuration.effects?.map((effect) => {
      if (effect.target.type === EffectScope.GEM) return { ...effect, target: { ...effect.target, gemIndex: rotate(effect.target.gemIndex) } };
      if (effect.target.type === EffectScope.LINK) return { ...effect, target: { ...effect.target, fromGemIndex: rotate(effect.target.fromGemIndex), toGemIndex: rotate(effect.target.toGemIndex) } };
      return { ...effect, target: { ...effect.target, sourceGemIndex: rotate(effect.target.sourceGemIndex) } };
    }),
  };
};

const effectPlacementVariants = (configuration: LevelEffectConfiguration, positions: number, preserveTargets: boolean): readonly LevelEffectConfiguration[] => {
  if (preserveTargets || positions < 2) return [configuration];
  return Array.from({ length: positions }, (_, offset) => withRotatedEffectTargets(configuration, positions, offset));
};

/**
 * Risk-first degradation. Timer and corruption can invalidate a route by
 * themselves, so they are softened before sacrificing visible link/area
 * composition. Scope removal is deliberately reserved for the final stages.
 */
const effectConfigurationStages = (configuration: LevelEffectConfiguration, spheres: number, mode: "adventure" | "time-attack"): readonly (readonly LevelEffectConfiguration[])[] => {
  const effects = [...(configuration.effects ?? [])];
  const risk = (effect: typeof effects[number]): number => {
    if (effect.preset.startsWith("TIMER_")) return 0;
    if (effect.preset.startsWith("CORRUPTION_")) return 1;
    if (effect.target.type === EffectScope.AREA && (effect.preset.includes("_7") || effect.preset.endsWith("_ALL"))) return 2;
    if (effect.target.type === EffectScope.LINK && effect.preset !== "ECHO_LINK") return 3;
    if (effect.target.type === EffectScope.AREA) return 4;
    if (effect.preset === "AMPLIFIER_X3" || effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1") return 5;
    return 6;
  };
  const soften = (items: readonly typeof effects[number][]): typeof effects => {
    const candidate = items.map((effect, index) => ({ effect, index })).filter(({ effect }) => RDN_EFFECT_SIMPLIFICATIONS[effect.preset] !== undefined).sort((left, right) => risk(left.effect) - risk(right.effect) || left.index - right.index)[0];
    if (!candidate) return [...items];
    const preset = RDN_EFFECT_SIMPLIFICATIONS[candidate.effect.preset];
    if (!preset) return [...items];
    return items.map((effect, index) => index !== candidate.index ? effect : { ...effect, preset, overrides: effect.target.type === EffectScope.LINK ? { ...effect.overrides, direction: LinkDirection.FORWARD } : undefined });
  };
  const scaled: LevelEffectConfiguration[] = [];
  let scaledEffects = [...effects];
  while (true) {
    const next = soften(scaledEffects);
    if (next.every((effect, index) => effect.preset === scaledEffects[index].preset && effect.overrides === scaledEffects[index].overrides)) break;
    scaledEffects = next;
    scaled.push({ ...configuration, effects: scaledEffects });
  }
  // The complete simplification hierarchy already includes timer/corruption
  // fallbacks, so no separate risky-effect replacement stage is needed.
  const stabilizedEffects = scaledEffects;
  const stabilized: LevelEffectConfiguration[] = [];
  const optional: LevelEffectConfiguration[] = [];
  let reduced = [...stabilizedEffects];
  const fixedLinks = rdnFixedLinksForBoard(spheres, mode);
  while (reduced.filter((effect) => effect.target.type === EffectScope.LINK).length > fixedLinks) {
    reduced = reduced.filter((_, index) => index !== lastIndexFor(reduced, EffectScope.LINK));
    optional.push({ ...configuration, effects: reduced });
  }
  const emergency: LevelEffectConfiguration[] = [];
  const withoutArea = reduced.filter((effect) => effect.target.type !== EffectScope.AREA);
  if (withoutArea.length !== reduced.length) emergency.push({ ...configuration, effects: withoutArea });
  const gemOnly = withoutArea.filter((effect) => effect.target.type !== EffectScope.LINK);
  if (gemOnly.length !== withoutArea.length) emergency.push({ ...configuration, effects: gemOnly });
  const minimumGems = rdnMinimumGemEffectsForBoard(spheres, mode);
  let minimum = gemOnly;
  while (minimum.filter((effect) => effect.target.type === EffectScope.GEM).length > minimumGems) minimum = minimum.filter((_, index) => index !== lastIndexFor(minimum, EffectScope.GEM));
  const final = RDN_GEM_EFFECT_FALLBACK_PRESETS.map((preset) => ({ ...configuration, effects: minimum.map((effect) => effect.target.type === EffectScope.GEM ? { ...effect, preset, overrides: undefined } : effect) }));
  return [[configuration], scaled, stabilized, optional, emergency, final];
};

/** Reject timer placements that cannot meet their local direct-impulse deadline. */
const timerPlacementIsCompatible = (level: LevelDefinition, configuration: LevelEffectConfiguration): boolean => (configuration.effects ?? []).every((effect) => {
  if (!effect.preset.startsWith("TIMER_") || effect.target.type !== EffectScope.GEM) return true;
  const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === (effect.target as { gemIndex: number }).gemIndex).length;
  return directImpulses <= RDN_MAX_TIMER_DIRECT_IMPULSES;
});

const buildEffectCandidate = <T extends LevelDefinition>(level: T, outerValues: readonly number[], effectConfiguration: LevelEffectConfiguration): T => ({ ...level, outerValues: [...outerValues], solution: level.solution?.map((slot, index) => ({ ...slot, startValue: outerValues[index] })), effectConfiguration } as T);

/** Assigns elemental affinity after the final barrier configuration is known. */
const withElementalOperators = <T extends LevelDefinition>(level: T, configuration: LevelEffectConfiguration, variation = 0): T => {
  const barriers = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects
    .flatMap((effect) => effect.config.scope === EffectScope.GEM && (effect.config.type === GemEffectType.FIRE || effect.config.type === GemEffectType.ICE) ? [effect.config.type] : []);
  const numericSlots = level.variant === "persistent"
    ? level.innerValues.map((operator, index) => typeof operator === "number" ? index : -1).filter((index) => index >= 0)
    : level.queues.map((queue, index) => queue.some((operator) => typeof operator === "number") ? index : -1).filter((index) => index >= 0);
  const mode = level.variant === "persistent" ? "adventure" : "time-attack";
  const affinities = rdnElementalAffinitiesForBoard(level.number, level.positions, mode, numericSlots.length, barriers, variation);
  const bySlot = new Map<number, ElementalAffinity>();
  numericSlots.forEach((slot, index) => { const affinity = affinities[index]; if (affinity) bySlot.set(slot, affinity); });
  if (level.variant === "persistent") return { ...level, innerElements: level.innerValues.map((operator, index) => typeof operator === "number" ? bySlot.get(index) ?? null : null) } as T;
  return { ...level, queueElements: level.queues.map((queue, index) => queue.map((operator) => typeof operator === "number" ? bySlot.get(index) ?? null : null)) } as T;
};

const needsSignedValueCalibration = (configuration: LevelEffectConfiguration): boolean => (configuration.effects ?? []).some((effect) => effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1" || effect.preset === "CORRUPTION_1" || effect.preset === "CORRUPTION_2");
const generationAttemptsForLevel = (level: Pick<LevelDefinition, "number" | "positions">, mode: "adventure" | "time-attack"): Pick<RdnModeBoardProgression, "solutionAttemptsBeforeScaling" | "structureAttemptsBeforeScaling"> => level.number > 100 ? rdnGenerationAttemptsForSpheres(level.positions, mode) : rdnEffectRuleForLevel(level.number);

/** Uses a one-unit probe for effects whose output slope can be -1 (for example INVERTER). */
const recalculatedOuterValues = <T extends LevelDefinition>(candidate: T, result: ReturnType<typeof replaySolution>, range: { min: number; max: number }, useSignedCalibration: boolean): number[] | undefined => {
  const recalculated = candidate.outerValues.map((value, index) => {
    if (!useSignedCalibration) return value - result.outerValues[index];
    // A probe may never create zero: outer values must always be non-zero for
    // a valid level definition. Prefer the positive direction, then negative.
    const probeStep = value < range.max && value !== -1 ? 1 : value > range.min && value !== 1 ? -1 : 0;
    if (probeStep === 0) return value - result.outerValues[index];
    const probeValues = [...candidate.outerValues];
    probeValues[index] += probeStep;
    const probeResult = replaySolution(buildEffectCandidate(candidate, probeValues, candidate.effectConfiguration!));
    const slope = (probeResult.outerValues[index] - result.outerValues[index]) / probeStep;
    const correction = slope === 0 ? -result.outerValues[index] : -result.outerValues[index] / slope;
    return value + correction;
  });
  return recalculated.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max) ? undefined : recalculated;
};

/**
 * Effects alter deltas, not the numeric generator.  Recalculate only the
 * authored starting values against the canonical move sequence so an effected
 * board retains a deterministic playable solution. Its star budget is then
 * calibrated from the replayed route and the declared effect complexity.
 */
const regenerateEffectAwareLevel = <T extends LevelDefinition>(level: T, configuration: LevelEffectConfiguration | undefined): T => {
  if (!configuration) return level;
  const startedAt = performance.now();
  let calibrationAttempts = 0;
  const failureReasons = new Set<string>();
  const generationAttempts = generationAttemptsForLevel(level, level.variant === "persistent" ? "adventure" : "time-attack");
  const solutionAttemptsBeforeScaling = generationAttempts.solutionAttemptsBeforeScaling;
  const structureAttemptsBeforeScaling = generationAttempts.structureAttemptsBeforeScaling;
  const withStats = (candidate: T, solved: boolean, officialSolution?: { impulses: number; rotationSteps: number }): T => ({ ...candidate, generation: candidate.generation ? { ...candidate.generation, ...(officialSolution ? { officialSolutionImpulses: officialSolution.impulses, officialSolutionRotationSteps: officialSolution.rotationSteps } : {}), generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: 1, solutionAttempts: calibrationAttempts, calibrationAttempts, structureAttemptsBeforeScaling, solutionAttemptsBeforeScaling, totalComplexity: (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0) + (candidate.effectConfiguration?.effects?.length ?? 0) * 10, failureReasons: solved ? [...failureReasons] : [...failureReasons, "NO_VALID_EFFECT_CONFIGURATION"] } } : candidate.generation } as T);
  const range = DEFAULT_PUZZLE_NUMBER_RANGE;
  const attemptsBeforeScaling = solutionAttemptsBeforeScaling;
  if (!timerPlacementIsCompatible(level, configuration)) { failureReasons.add("TIMER_TARGET_TOO_MANY_DIRECT_IMPULSES"); return withStats(level, false); }
  {
    const candidateConfiguration = withCalibratedTimerDeadlines(level, configuration);
    if (!candidateConfiguration) { failureReasons.add("TIMER_DEADLINE_CALIBRATION_FAILED"); return withStats(level, false); }
    const issues = validateEffectComplexity(candidateConfiguration, `${level.variant} level ${level.number}`, level.positions);
    if (issues.length) { failureReasons.add("COMPLEXITY_INVALID"); throw new Error(issues.join(" ")); }
    let outerValues = [...level.outerValues];
    const useSignedCalibration = needsSignedValueCalibration(candidateConfiguration);
    const seenValueVectors = new Set<string>();
    for (let attempt = 0; attempt < attemptsBeforeScaling; attempt += 1) {
      const valueVector = outerValues.join(",");
      if (seenValueVectors.has(valueVector)) { failureReasons.add("CALIBRATION_VALUE_CYCLE"); break; }
      seenValueVectors.add(valueVector);
      calibrationAttempts += 1;
      const candidate = withElementalOperators(buildEffectCandidate(level, outerValues, candidateConfiguration), candidateConfiguration);
      const result = replaySolution(candidate);
      if (result.won && !timerDeadlineFailed(result)) {
        const canonicalImpulses = result.impulses;
        const canonicalRotations = result.rotationSteps;
        return withStats({ ...candidate, starCost: { impulses: canonicalImpulses, rotationSteps: canonicalRotations } }, true, { impulses: canonicalImpulses, rotationSteps: canonicalRotations });
      }
      failureReasons.add(timerDeadlineFailed(result) ? "TIMER_EXPIRED" : "REPLAY_NOT_WON");
      const recalculated = recalculatedOuterValues(candidate, result, range, useSignedCalibration);
      if (!recalculated) { failureReasons.add("VALUES_OUT_OF_RANGE_OR_NON_INTEGER"); break; }
      if (recalculated.every((value, index) => value === outerValues[index])) { failureReasons.add("VALUES_NO_LONGER_CHANGE"); break; }
      outerValues = recalculated;
    }
  }
  // A tier is never allowed to ship an unsolvable generated board. The fallback
  // remains deterministic and legacy-compatible; development tests flag it.
  return withStats(level, false);
};

/** Explicit checkpoint lessons take precedence over the deterministic progression. */
const applyProgressionEffects = <T extends LevelDefinition>(mode: "adventure" | "time-attack", level: T, configuration?: LevelEffectConfiguration): T => regenerateEffectAwareLevel(level, configuration ?? explicitEffectConfigurationForLevel(level.number) ?? createProgressionEffectConfiguration(mode, level.number, level.positions, level.generation?.seed ?? level.number));

const effectAwareVariant = <T extends LevelDefinition>(number: number, mode: "adventure" | "time-attack", build: (variation: number) => T): T => {
  const startedAt = performance.now();
  const first = build(0);
  const generationAttempts = generationAttemptsForLevel({ number, positions: first.positions }, mode);
  const attempts = generationAttempts.structureAttemptsBeforeScaling;
  const solutionAttemptsBeforeScaling = generationAttempts.solutionAttemptsBeforeScaling;
  const explicitConfiguration = explicitEffectConfigurationForLevel(number);
  const requestedConfiguration = explicitConfiguration ?? createProgressionEffectConfiguration(mode, number, first.positions, number);
  const effectSummary = requestedConfiguration?.effects?.map((effect) => effect.preset).join(", ") || "nessuno";
  console.info(`[RDN][${mode} ${number}] avvio: ${first.positions} sfere; strutture ${attempts}; soluzioni/candidato ${solutionAttemptsBeforeScaling}; effetti ${effectSummary}.`);
  if (!requestedConfiguration?.enabled) {
    console.info(`[RDN][${mode} ${number}] completato senza effetti in ${(performance.now() - startedAt).toFixed(1)} ms.`);
    return first;
  }
  let last = first;
  let totalSolutionAttempts = 0;
  let totalStructureAttempts = 0;
  const failureReasons = new Set<string>();
  const stages = effectConfigurationStages(requestedConfiguration, first.positions, mode);
  for (const [stageIndex, stage] of stages.entries()) {
    console.info(`[RDN][${mode} ${number}] stadio effetti ${stageIndex + 1}/${stages.length}: ${stage.length} configurazioni candidate.`);
    for (const configuration of stage) {
      for (const positionedConfiguration of effectPlacementVariants(configuration, first.positions, explicitConfiguration !== undefined)) {
        for (let variation = 0; variation < attempts; variation += 1) {
          const candidateConfiguration = stageIndex === 0 && explicitConfiguration === undefined
            ? withProgressionPresetVariation(positionedConfiguration, mode, number, number + variation * 97)
            : positionedConfiguration;
          const unconfiguredCandidate = variation === 0 ? first : build(variation);
          const combinationIssues = rdnEffectCombinationIssues(unconfiguredCandidate.positions, {
            presets: candidateConfiguration.effects?.map((effect) => effect.preset) ?? [],
            gemPresets: candidateConfiguration.effects?.filter((effect) => effect.target.type === EffectScope.GEM).map((effect) => effect.preset) ?? [],
            specialOperators: unconfiguredCandidate.generation?.specialOperators ?? [],
          }, stageIndex === 0);
          if (combinationIssues.length) {
            combinationIssues.forEach((reason) => failureReasons.add(reason));
            continue;
          }
          totalStructureAttempts += 1;
          const candidate = applyProgressionEffects(mode, unconfiguredCandidate, candidateConfiguration);
          last = candidate;
          const stats = candidate.generation?.generationStats;
          totalSolutionAttempts += stats?.solutionAttempts ?? stats?.calibrationAttempts ?? 0;
          (stats?.failureReasons ?? []).forEach((reason) => failureReasons.add(reason));
          if ((stats?.failureReasons ?? []).includes("NO_VALID_EFFECT_CONFIGURATION")) continue;
          const replay = replaySolution(candidate);
          if (replay.won && !timerDeadlineFailed(replay)) {
            const result = { ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts, calibrationAttempts: totalSolutionAttempts, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats?.totalComplexity ?? ((candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0)), failureReasons: [...failureReasons] } } : candidate.generation } as T;
            console.info(`[RDN][${mode} ${number}] risolto: stadio ${stageIndex + 1}/${stages.length}; strutture ${totalStructureAttempts}; soluzioni ${totalSolutionAttempts}; ${(performance.now() - startedAt).toFixed(1)} ms.`);
            return result;
          }
        }
      }
    }
  }
  if (number >= 10) throw new Error(`RDN ${mode} level ${number}: no valid effect-aware structure after ${totalStructureAttempts} attempts.`);
  const stats = last.generation?.generationStats;
  const fallback = { ...last, generation: last.generation ? { ...last.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, calibrationAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats?.totalComplexity ?? ((last.optimalCost?.impulses ?? 0) + (last.optimalCost?.rotationSteps ?? 0)), failureReasons: [...failureReasons, "ALTERNATE_STRUCTURE_ATTEMPTS_EXHAUSTED"] } } : last.generation } as T;
  console.info(`[RDN][${mode} ${number}] scalato: strutture ${totalStructureAttempts}; soluzioni ${totalSolutionAttempts}; ragioni ${[...failureReasons].join(", ") || "nessuna"}; ${(performance.now() - startedAt).toFixed(1)} ms.`);
  return fallback;
};

const persistent = (number: number): LevelDefinition => {
  // Keep the first board as the one-step tutorial. Levels 2 and 3 must already
  // be distinct playable boards, otherwise the solution catalogue repeats it too.
  return effectAwareVariant(number, "adventure", (variation) => { const board = number === 1 ? tutorialBoard() : generateBoard(number, 17 + variation * 101, "adventure"); return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1 as const, variant: "persistent" as const, activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT, generation: generatedMetadata(number, board), adventure: adventureConfig(number, board), ...board }; });
};
const loader = (number: number): LevelDefinition => {
  return effectAwareVariant(number, "time-attack", (variation) => { const board = number === 1 ? tutorialBoard() : generateBoard(number, 71 + variation * 101, "time-attack"); return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1 as const, variant: "loader" as const, activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT, generation: generatedMetadata(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves }; });
};

const generateRdnLevelCatalogue = (): readonly LevelDefinition[] => {
  const startedAt = performance.now();
  const firstLevel = catalogueGenerationBound("RDN_CATALOGUE_LEVEL_FROM", 1);
  const lastLevel = catalogueGenerationBound("RDN_CATALOGUE_LEVEL_TO", RDN_MAX_LEVEL);
  if (firstLevel > lastLevel) throw new Error("L'intervallo di generazione RDN non Ã¨ valido.");
  const modes = catalogueGenerationModes();
  const numbers = Array.from({ length: lastLevel - firstLevel + 1 }, (_, index) => firstLevel + index);
  const total = numbers.length * modes.length;
  const levels: LevelDefinition[] = [];
  let completed = 0;
  let nextProgressLog = 5;
  const reportProgress = (): void => {
    const percentage = Math.floor(completed / total * 100);
    if (completed === total) {
      console.info(`[RDN] Generazione livelli: 100% (${completed}/${total})`);
      nextProgressLog = 105;
      return;
    }
    while (percentage >= nextProgressLog) {
      console.info(`[RDN] Generazione livelli: ${nextProgressLog}% (${completed}/${total})`);
      nextProgressLog += 5;
    }
  };

  console.info(`[RDN] Generazione v008: livelli ${firstLevel}-${lastLevel}; modalitÃ  ${modes.join(", ")}; totale ${total}.`);
  console.info(`[RDN] Generazione livelli: 0% (0/${total})`);
  for (const mode of modes) {
    console.info(`[RDN] Avvio modalitÃ  ${mode}: ${numbers.length} livelli.`);
    for (const number of numbers) {
      levels.push(mode === "adventure" ? persistent(number) : loader(number));
      completed += 1;
      reportProgress();
    }
  }
  console.info(`[RDN] Generazione completata: ${levels.length} livelli in ${(performance.now() - startedAt).toFixed(1)} ms.`);
  return levels;
};

const catalogueGenerationRequested = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.["RDN_GENERATE_CATALOGUE"] === "1";
/** The application loads published catalogues through RdnCatalogueService.
 * This in-module generation path is deliberately developer-only. */
const useGeneratedCatalogue = catalogueGenerationRequested;

/** Upgrades pre-generated persistent boards without altering their declared solution:
 * a duplicated additive was never needed twice because the solver always selected
 * its first matching gear slot. */
const removeDuplicateSignedGearValues = (level: LevelDefinition): LevelDefinition => {
  if (level.variant !== "persistent") return level;
  const usedNegative = new Set<number>(); const usedPositive = new Set<number>();
  const innerValues = level.innerValues.map((operator) => {
    if (typeof operator !== "number") return operator;
    const used = operator < 0 ? usedNegative : usedPositive;
    const sign = operator < 0 ? -1 : 1; let magnitude = Math.abs(operator);
    while (used.has(magnitude)) magnitude = magnitude % RDN_MAX_GEAR_OPERATOR_MAGNITUDE + 1;
    used.add(magnitude);
    return sign * magnitude;
  });
  return innerValues.every((value, index) => value === level.innerValues[index]) ? level : { ...level, innerValues };
};

/** The original pre-generated tutorial used four -1 values. Upgrade it at load
 * time so the active catalogue obeys the same uniqueness rule as new boards. */
const upgradeLegacyTutorial = (level: LevelDefinition): LevelDefinition => {
  if (level.number !== 1) return level;
  const board = tutorialBoard();
  return level.variant === "persistent"
    ? { ...level, ...board, innerValues: board.innerValues }
    : { ...level, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
};

export const prepareRdnCatalogueLevel = (level: LevelDefinition): LevelDefinition => removeDuplicateSignedGearValues(upgradeLegacyTutorial(level));
export const RDN_LEVELS: readonly LevelDefinition[] = useGeneratedCatalogue ? generateRdnLevelCatalogue().map(prepareRdnCatalogueLevel) : [];
/** @deprecated Runtime callers must use RdnCatalogueService.getLevel(). */
export const getRdnLevel = (variant: "adventure" | "time-attack", number = 1): LevelDefinition => {
  const level = RDN_LEVELS.find((item) => item.variant === (variant === "adventure" ? "persistent" : "loader") && item.number === number);
  if (!level) throw new Error("Il catalogo RDN non Ã¨ caricato. Usa RdnCatalogueService.");
  return level;
};

/** Seedable entry point for replay, support and future ranked runs. */
export const generateRdnPuzzle = (variant: "adventure" | "time-attack", difficulty: PuzzleDifficulty, seed: number, slotCount?: number, freeEffectsEnabled: boolean | import("./effect-progression.config").FreeEffectSelections = false): LevelDefinition => {
  const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
  const board = generateBoard(number, Math.trunc(seed), "adventure", slotCount, true, true); const activeFlowCount = freeActiveFlowCount(difficulty); const generation = { ...generatedMetadata(number, board, difficulty, activeFlowCount), seed: board.seed, difficulty };
  const level = variant === "adventure"
    ? { id: `seeded-persistent-${generation.seed}`, number, title: `Meccanismo ${number}`, schemaVersion: 1 as const, variant: "persistent" as const, activeFlowCount, generation, adventure: adventureConfig(number, board), ...board }
    : { id: `seeded-loader-${generation.seed}`, number, title: `Caricatore ${number}`, schemaVersion: 1 as const, variant: "loader" as const, activeFlowCount, generation, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
  return regenerateEffectAwareLevel(level, createFreeModeEffectConfiguration(difficulty, level.positions, generation.seed, freeEffectsEnabled));
};

export interface PuzzleSolutionAudit { level: number; variant: "adventure" | "time-attack"; providedOperators: readonly PuzzleOperator[]; slots: readonly PuzzleSlotSolution[]; moves: readonly PuzzleSolutionMove[]; execution: readonly PuzzleSolutionExecutionStep[]; effects: readonly ResolvedEffect[]; finalValues: readonly number[]; verified: boolean; }
const applySolutionOperator = (value: number, operator: PuzzleOperator): number => operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator;
const verifiesSolution = (level: LevelDefinition): boolean => {
  // Effected boards are validated through the real engine because link and area
  // contributions intentionally make their solution non-local to one gem.
  if (level.effectConfiguration?.enabled) { const state = replaySolution(level); return state.won && !timerDeadlineFailed(state); }
  const solution = level.solution ?? [];
  const moves = level.solutionMoves ?? [];
  const requiredMoves = level.slotPhases.reduce((total, phase) => total + phase.length, 0);
  if (solution.length !== level.positions || moves.length !== requiredMoves) return false;
  const values = solution.map((slot) => slot.startValue);
  const cursors = Array(level.positions).fill(0);
  const queueCursors = Array(level.positions).fill(0);
  for (const move of moves) {
    const innerIndex = modulo(move.outerIndex - move.rotation, level.positions);
    const operator = level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][queueCursors[innerIndex]++];
    if (operator !== move.operator || solution[move.outerIndex].operators[cursors[move.outerIndex]] !== move.operator) return false;
    values[move.outerIndex] = applySolutionOperator(values[move.outerIndex], move.operator);
    cursors[move.outerIndex] += 1;
  }
  return values.every((value) => value === 0) && cursors.every((cursor, index) => cursor === solution[index].operators.length);
};
/** Inspectable solution tables for every authored level of both gameplay variants. */
export const RDN_SOLUTION_TABLE: readonly PuzzleSolutionAudit[] = RDN_LEVELS.map((level) => {
  const effectResolution = new LevelEffectConfigResolver().resolve(level.effectConfiguration, level.positions);
  const simulation = replaySolutionWithTrace(level);
  return { level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], execution: simulation.execution, effects: effectResolution.effects, finalValues: simulation.state.outerValues, verified: effectResolution.issues.length === 0 && simulation.state.won && !timerDeadlineFailed(simulation.state) && verifiesSolution(level) };
});
export const getRdnSolutionTable = (variant: "adventure" | "time-attack"): readonly PuzzleSolutionAudit[] => RDN_SOLUTION_TABLE.filter((row) => row.variant === variant);

/** Replays every authored Adventure solution through the current engine rules. */
export const validateAdventureLevelBatch = (): readonly { level: number; valid: boolean }[] => {
  const engine = new PuzzleEngine();
  return RDN_LEVELS.filter((level) => level.variant === "persistent").map((level) => {
    let state = engine.createInitialState(level);
    for (const move of level.solutionMoves ?? []) {
      const delta = modulo(move.rotation - state.rotation, level.positions);
      if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
      state = engine.apply(level, state, { type: "IMPULSE" });
    }
    return { level: level.number, valid: state.won && !timerDeadlineFailed(state) };
  });
};

if (!useGeneratedCatalogue) {
  if (RDN_SOLUTION_TABLE.some((row) => !row.verified)) throw new Error("Invalid RDN solution table");
  if (validateAdventureLevelBatch().some((row) => !row.valid)) throw new Error("Invalid Adventure level batch");
}
