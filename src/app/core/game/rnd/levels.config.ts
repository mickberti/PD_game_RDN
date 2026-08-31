import { AdventureGameConfig, DEFAULT_PUZZLE_NUMBER_RANGE, LevelDefinition, PuzzleDifficulty, PuzzleOperator, PuzzleSlotSolution, PuzzleSolutionMove } from "./puzzle.types";
import { PuzzleEngine } from "./puzzle.engine";
import { LevelEffectConfigResolver } from "./effects/level-effect-config.resolver";
import { EffectConfig, EffectScope, GemEffectType, LinkEffectType, ResolvedEffect } from "./effects/effects.models";
import { RDN_RELEASE } from "./rdn-release.config";
import { createFreeModeEffectConfiguration, createProgressionEffectConfiguration, explicitEffectConfigurationForLevel, validateEffectComplexity } from "./effects/effect-progression.config";
import { LevelEffectConfiguration } from "./effects/level-effects.types";
import { RDN_EFFECT_SIMPLIFICATIONS, RDN_GEM_EFFECT_PRESETS, rdnEffectRuleForLevel, rdnProgressionRuleForSpheres, rdnSpecialOperatorsForBoard } from "./progression-rules.config";
import { GENERATED_RDN_LEVELS, GENERATED_RDN_SOLUTION_AUDIT } from "./generated/rnd-catalogue.manifest";

export const RDN_MAX_LEVEL = 350;
export const RDN_MIN_SPHERES = 4;
export const RDN_MAX_SPHERES = 8;
const DEFAULT_ACTIVE_FLOW_COUNT = 1;
const freeActiveFlowCount = (difficulty: PuzzleDifficulty): number => difficulty === "EASY" ? 1 : difficulty === "NORMAL" ? 2 : difficulty === "HARD" ? 3 : 4;
export const RDN_MAX_TIMER_DIRECT_IMPULSES = 10;
/** Number of levels in each sphere-count band; recalculated when the catalogue size changes. */
export const RDN_LEVELS_PER_SPHERE_INCREMENT = Math.ceil(RDN_MAX_LEVEL / (RDN_MAX_SPHERES - RDN_MIN_SPHERES + 1));

/** Deterministic catalogue: a level always produces the same board and solution. */
const modulo = (value: number, length: number): number => ((value % length) + length) % length;
const random = (seed: number): (() => number) => { let state = seed >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x1_0000_0000; }; };
export const rdnSphereCountForLevel = (number: number): 4 | 5 | 6 | 7 | 8 => {
  const band = Math.min(RDN_MAX_SPHERES - RDN_MIN_SPHERES, Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT));
  return (RDN_MIN_SPHERES + band) as 4 | 5 | 6 | 7 | 8;
};
/** Larger target values remain practical because later boards can use signed jumps up to 9. */
const impulsesPerValue = (number: number): number => number <= 3 ? 1 : Math.min(11, 2 + Math.floor((number - 4) / 20));
const rotationDistance = (from: number, to: number, positions: number): number => Math.min(modulo(to - from, positions), modulo(from - to, positions));

interface GeneratedBoard { positions: 4 | 5 | 6 | 7 | 8; initialRotation: number; innerValues: PuzzleOperator[]; loaderQueues: PuzzleOperator[][]; outerValues: number[]; slotPhases: Array<Array<{ outerIndex: number }>>; optimalCost: { impulses: number; rotationSteps: number }; solution: PuzzleSlotSolution[]; solutionMoves: PuzzleSolutionMove[]; seed: number; }
interface ValuePlan { start: number; operators: PuzzleOperator[]; }

/** Division specials are introduced gradually on advanced boards. */
/** One-use action specials share the gear with DIV2/DIV3; ×2 remains HUD-only. */
const specialOperatorsForLevel = (level: number, positions: number, variation = 0): PuzzleOperator[] => {
  return [...rdnSpecialOperatorsForBoard(level, positions, variation)];
};
const gearOperators = (positions: number, specialOperators: readonly PuzzleOperator[], next: () => number): PuzzleOperator[] => {
  const subtractorCount = positions - specialOperators.length;
  // Values are intentionally non-sequential: every gear can contain any signed 1..9.
  const magnitudes = Array.from({ length: subtractorCount }, () => 1 + Math.floor(next() * 9));
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

const generateBoard = (number: number, seedOffset: number, slotCount?: number, balanceQueueSigns = false): GeneratedBoard => {
  const positions = slotCount && slotCount >= RDN_MIN_SPHERES && slotCount <= RDN_MAX_SPHERES ? slotCount as GeneratedBoard["positions"] : rdnSphereCountForLevel(number);
  const impulses = impulsesPerValue(number);
  const seed = number * 977 + seedOffset;
  const next = random(seed);
  const specialOperators = specialOperatorsForLevel(number, positions, seedOffset);
  const innerValues = gearOperators(positions, specialOperators, next);
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
const tutorialBoard = (): GeneratedBoard => ({ positions: 4, initialRotation: 0, innerValues: [-1, -1, -1, -1], loaderQueues: [[-1], [-1], [-1], [-1]], outerValues: [1, 1, 1, 1], slotPhases: [[{ outerIndex: 0 }], [{ outerIndex: 1 }], [{ outerIndex: 2 }], [{ outerIndex: 3 }]], optimalCost: { impulses: 4, rotationSteps: 0 }, solution: Array.from({ length: 4 }, () => ({ startValue: 1, operators: [-1] })), solutionMoves: Array.from({ length: 4 }, (_, outerIndex) => ({ outerIndex, rotation: 0, operator: -1 })), seed: 0 });

const generatedMetadata = (number: number, board: GeneratedBoard, difficulty: PuzzleDifficulty = "EASY", activeFlowCount = DEFAULT_ACTIVE_FLOW_COUNT) => ({ seed: board.seed, generatorVersion: RDN_RELEASE.generatorVersion, balanceVersion: RDN_RELEASE.balanceVersion, difficulty, estimatedMinimumSolutionLength: board.optimalCost.impulses, branchingFactor: activeFlowCount, featureFlags: [] });
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
 * Effects make a board harder to read and route even when the generated
 * canonical solution still has the same number of impulses.  This allowance
 * is part of the three-star target only: time limits and solver cost stay on
 * the actual canonical solution.
 */
const effectStarAllowance = (configuration: LevelEffectConfiguration, positions: number): number => {
  const effects = new LevelEffectConfigResolver().resolve(configuration, positions).effects;
  return effects.reduce((total, effect) => {
    if (effect.config.scope === EffectScope.GEM) {
      const config = effect.config;
      const weight = config.type === GemEffectType.SHIELD || config.type === GemEffectType.WALL || config.type === GemEffectType.ICE ? config.strength
        : config.type === GemEffectType.AMPLIFIER ? Math.max(1, config.multiplier - 1)
          : config.type === GemEffectType.TIMER || config.type === GemEffectType.CORRUPTION ? 2
            : 1;
      return total + weight;
    }
    if (effect.config.scope === EffectScope.LINK) return total + (effect.config.type === LinkEffectType.AMPLIFY ? 2 : 1);
    return total + Math.max(2, Math.abs(effect.config.strength ?? 1) * (effect.config.radius ?? 1));
  }, 0);
};

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

/** The prescribed fallback order. A phase is fully explored across all seeds before the next one begins. */
const effectConfigurationStages = (configuration: LevelEffectConfiguration, spheres: number): readonly (readonly LevelEffectConfiguration[])[] => {
  const effects = [...(configuration.effects ?? [])];
  const optional: LevelEffectConfiguration[] = [];
  let reduced = effects.filter((effect) => effect.target.type !== EffectScope.AREA);
  optional.push({ ...configuration, effects: reduced });
  const fixedLinks = rdnProgressionRuleForSpheres(spheres).fixedLinks;
  while (reduced.filter((effect) => effect.target.type === EffectScope.LINK).length > fixedLinks) {
    reduced = reduced.filter((_, index) => index !== lastIndexFor(reduced, EffectScope.LINK));
    optional.push({ ...configuration, effects: reduced });
  }
  const scaled: LevelEffectConfiguration[] = [];
  let scaledEffects = [...reduced];
  while (true) {
    const index = scaledEffects.findIndex((effect) => RDN_EFFECT_SIMPLIFICATIONS[effect.preset] !== undefined);
    if (index < 0) break;
    const preset = RDN_EFFECT_SIMPLIFICATIONS[scaledEffects[index].preset];
    if (!preset) break;
    scaledEffects = scaledEffects.map((effect, effectIndex) => effectIndex === index ? { ...effect, preset, overrides: undefined } : effect);
    scaled.push({ ...configuration, effects: scaledEffects });
  }
  const minimumGems = rdnProgressionRuleForSpheres(spheres).minGemEffects;
  let minimum = scaledEffects.filter((effect) => effect.target.type !== EffectScope.AREA && effect.target.type !== EffectScope.LINK);
  while (minimum.filter((effect) => effect.target.type === EffectScope.GEM).length > minimumGems) minimum = minimum.filter((_, index) => index !== lastIndexFor(minimum, EffectScope.GEM));
  const finalPresets = RDN_GEM_EFFECT_PRESETS.STABLE;
  const final = finalPresets.map((preset) => ({ ...configuration, effects: minimum.map((effect) => effect.target.type === EffectScope.GEM ? { ...effect, preset, overrides: undefined } : effect) }));
  return [[configuration], optional, scaled, final];
};

/** Reject timer placements that cannot meet their local direct-impulse deadline. */
const timerPlacementIsCompatible = (level: LevelDefinition, configuration: LevelEffectConfiguration): boolean => (configuration.effects ?? []).every((effect) => {
  if (!effect.preset.startsWith("TIMER_") || effect.target.type !== EffectScope.GEM) return true;
  const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === (effect.target as { gemIndex: number }).gemIndex).length;
  return directImpulses <= RDN_MAX_TIMER_DIRECT_IMPULSES;
});

const buildEffectCandidate = <T extends LevelDefinition>(level: T, outerValues: readonly number[], effectConfiguration: LevelEffectConfiguration): T => ({ ...level, outerValues: [...outerValues], solution: level.solution?.map((slot, index) => ({ ...slot, startValue: outerValues[index] })), effectConfiguration } as T);

const needsSignedValueCalibration = (configuration: LevelEffectConfiguration): boolean => (configuration.effects ?? []).some((effect) => effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1" || effect.preset === "CORRUPTION_1" || effect.preset === "CORRUPTION_2");

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
  const withStats = (candidate: T, solved: boolean): T => ({ ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: 1, calibrationAttempts, totalComplexity: (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0) + (candidate.effectConfiguration?.effects?.length ?? 0) * 10, failureReasons: solved ? [...failureReasons] : [...failureReasons, "NO_VALID_EFFECT_CONFIGURATION"] } } : candidate.generation } as T);
  const range = DEFAULT_PUZZLE_NUMBER_RANGE;
  const attemptsBeforeScaling = Math.max(1, rdnEffectRuleForLevel(level.number).solutionAttemptsBeforeScaling);
  if (!timerPlacementIsCompatible(level, configuration)) { failureReasons.add("TIMER_TARGET_TOO_MANY_DIRECT_IMPULSES"); return withStats(level, false); }
  {
    const candidateConfiguration = withCalibratedTimerDeadlines(level, configuration);
    if (!candidateConfiguration) { failureReasons.add("TIMER_DEADLINE_CALIBRATION_FAILED"); return withStats(level, false); }
    const issues = validateEffectComplexity(candidateConfiguration, `${level.variant} level ${level.number}`, level.positions);
    if (issues.length) { failureReasons.add("COMPLEXITY_INVALID"); throw new Error(issues.join(" ")); }
    let outerValues = [...level.outerValues];
    const useSignedCalibration = needsSignedValueCalibration(candidateConfiguration);
    for (let attempt = 0; attempt < attemptsBeforeScaling; attempt += 1) {
      calibrationAttempts += 1;
      const candidate = buildEffectCandidate(level, outerValues, candidateConfiguration);
      const result = replaySolution(candidate);
      if (result.won && !timerDeadlineFailed(result)) {
        const allowance = effectStarAllowance(candidateConfiguration, candidate.positions);
        const canonicalImpulses = result.impulses;
        const canonicalRotations = result.rotationSteps;
        return withStats({ ...candidate, starCost: { impulses: canonicalImpulses + allowance, rotationSteps: canonicalRotations + Math.ceil(allowance / 2) } }, true);
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
  const attempts = Math.max(1, rdnEffectRuleForLevel(number).structureAttemptsBeforeScaling);
  const first = build(0);
  // Effects are intentionally stable across board seeds: only the puzzle
  // structure varies while searching for a valid implementation.
  const requestedConfiguration = explicitEffectConfigurationForLevel(number) ?? createProgressionEffectConfiguration(mode, number, first.positions, number);
  let last = first;
  let totalCalibrations = 0;
  const failureReasons = new Set<string>();
  const stages = requestedConfiguration?.enabled ? effectConfigurationStages(requestedConfiguration, first.positions) : [[]];
  for (const stage of stages) {
    for (const configuration of stage) {
      for (let variation = 0; variation < attempts; variation += 1) {
        const candidate = applyProgressionEffects(mode, variation === 0 ? first : build(variation), configuration);
        last = candidate;
        const stats = candidate.generation?.generationStats;
        totalCalibrations += stats?.calibrationAttempts ?? 0;
        (stats?.failureReasons ?? []).forEach((reason) => failureReasons.add(reason));
        if (number < 10 || candidate.effectConfiguration?.enabled) {
          return { ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: variation + 1, calibrationAttempts: totalCalibrations, totalComplexity: stats?.totalComplexity ?? ((candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0)), failureReasons: [...failureReasons] } } : candidate.generation } as T;
        }
      }
    }
  }
  if (number >= 10 && requestedConfiguration?.enabled) throw new Error(`RDN ${mode} level ${number}: no valid effect-aware structure after ${attempts} seeds.`);
  const stats = last.generation?.generationStats;
  return { ...last, generation: last.generation ? { ...last.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: attempts, calibrationAttempts: totalCalibrations || stats?.calibrationAttempts || 0, totalComplexity: stats?.totalComplexity ?? ((last.optimalCost?.impulses ?? 0) + (last.optimalCost?.rotationSteps ?? 0)), failureReasons: [...failureReasons, "ALTERNATE_STRUCTURE_ATTEMPTS_EXHAUSTED"] } } : last.generation } as T;
};

const persistent = (number: number): LevelDefinition => {
  // Keep the first board as the one-step tutorial. Levels 2 and 3 must already
  // be distinct playable boards, otherwise the solution catalogue repeats it too.
  return effectAwareVariant(number, "adventure", (variation) => { const board = number === 1 ? tutorialBoard() : generateBoard(number, 17 + variation * 101); return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1 as const, variant: "persistent" as const, activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT, generation: generatedMetadata(number, board), adventure: adventureConfig(number, board), ...board }; });
};
const loader = (number: number): LevelDefinition => {
  return effectAwareVariant(number, "time-attack", (variation) => { const board = number === 1 ? tutorialBoard() : generateBoard(number, 71 + variation * 101); return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1 as const, variant: "loader" as const, activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT, generation: generatedMetadata(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves }; });
};

const generateRdnLevelCatalogue = (): readonly LevelDefinition[] => {
  const startedAt = performance.now();
  const total = RDN_MAX_LEVEL * 2;
  const levels: LevelDefinition[] = [];
  let completed = 0;
  let nextProgressLog = 5;
  const reportProgress = (): void => {
    const percentage = Math.floor(completed / total * 100);
    while (percentage >= nextProgressLog) {
      console.info(`[RDN] Generazione livelli: ${nextProgressLog}% (${completed}/${total})`);
      nextProgressLog += 5;
    }
  };

  console.info(`[RDN] Generazione livelli: 0% (0/${total})`);
  for (let number = 1; number <= RDN_MAX_LEVEL; number += 1) {
    levels.push(persistent(number));
    completed += 1;
    reportProgress();
  }
  for (let number = 1; number <= RDN_MAX_LEVEL; number += 1) {
    levels.push(loader(number));
    completed += 1;
    reportProgress();
  }
  console.info(`[RDN] Generazione completata: ${levels.length} livelli in ${(performance.now() - startedAt).toFixed(1)} ms.`);
  return levels;
};

const catalogueGenerationRequested = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.["RDN_GENERATE_CATALOGUE"] === "1";
const useGeneratedCatalogue = !catalogueGenerationRequested && GENERATED_RDN_LEVELS.length > 0;

export const RDN_LEVELS: readonly LevelDefinition[] = useGeneratedCatalogue ? GENERATED_RDN_LEVELS : generateRdnLevelCatalogue();
export const getRdnLevel = (variant: "adventure" | "time-attack", number = 1): LevelDefinition => RDN_LEVELS.find((level) => level.variant === (variant === "adventure" ? "persistent" : "loader") && level.number === number) ?? RDN_LEVELS[0];

/** Seedable entry point for replay, support and future ranked runs. */
export const generateRdnPuzzle = (variant: "adventure" | "time-attack", difficulty: PuzzleDifficulty, seed: number, slotCount?: number, freeEffectsEnabled: boolean | import("./effects/effect-progression.config").FreeEffectSelections = false): LevelDefinition => {
  const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
  const board = generateBoard(number, Math.trunc(seed), slotCount, true); const activeFlowCount = freeActiveFlowCount(difficulty); const generation = { ...generatedMetadata(number, board, difficulty, activeFlowCount), seed: board.seed, difficulty };
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
const generatedSolutionAudit = GENERATED_RDN_SOLUTION_AUDIT as unknown as readonly PuzzleSolutionAudit[];
export const RDN_SOLUTION_TABLE: readonly PuzzleSolutionAudit[] = useGeneratedCatalogue ? generatedSolutionAudit : RDN_LEVELS.map((level) => {
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
