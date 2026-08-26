import { AdventureGameConfig, LevelDefinition, PuzzleOperator, PuzzleSlotSolution, PuzzleSolutionMove } from "./puzzle.types";
import { PuzzleEngine } from "./puzzle.engine";
import { LevelEffectConfigResolver } from "./effects/level-effect-config.resolver";
import { EffectScope, GemEffectType, LinkEffectType, ResolvedEffect } from "./effects/effects.models";
import { DIFFICULTY_PROFILES, difficultyForLevel } from "./difficulty-profile.config";
import { RDN_RELEASE } from "./rdn-release.config";
import { createFreeModeEffectConfiguration, createProgressionEffectConfiguration, explicitEffectConfigurationForLevel, validateEffectComplexity } from "./effects/effect-progression.config";
import { LevelEffectConfiguration } from "./effects/level-effects.types";

export const RDN_MAX_LEVEL = 200;
export const RDN_MIN_SPHERES = 4;
export const RDN_MAX_SPHERES = 8;
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
const SPECIAL_OPERATOR_SPAWN_INTERVAL = 4;
const DOUBLE_SPECIAL_OPERATOR_SPAWN_INTERVAL = 12;
const specialOperatorsForLevel = (level: number, positions: number): PuzzleOperator[] => {
  // A special is an occasional tactical event, never the default state of a board.
  if (level < 20 || level % SPECIAL_OPERATOR_SPAWN_INTERVAL !== 0) return [];
  const candidates: PuzzleOperator[] = [
    ...(level >= 20 ? ["zero" as const] : []),
    ...(level >= 30 ? ["invert" as const] : []),
    ...(level >= 40 ? ["divide2" as const] : []),
    ...(level >= 60 ? ["skip" as const] : []),
    ...(level >= 80 ? ["divide3" as const] : []),
  ];
  // Boards up to seven spheres use exactly one special. Only an eight-sphere
  // board can occasionally host two, while preserving numeric operators.
  const requestedCount = positions === RDN_MAX_SPHERES && level % DOUBLE_SPECIAL_OPERATOR_SPAWN_INTERVAL === 0 ? 2 : 1;
  const count = Math.min(candidates.length, requestedCount, Math.max(0, positions - 2));
  const start = modulo(Math.floor(level / SPECIAL_OPERATOR_SPAWN_INTERVAL), Math.max(1, candidates.length));
  return Array.from({ length: count }, (_, index) => candidates[(start + index) % candidates.length]);
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
  const specialOperators = specialOperatorsForLevel(number, positions);
  const innerValues = gearOperators(positions, specialOperators, next);
  const allAdditives = additiveOperators(innerValues);
  const range = DIFFICULTY_PROFILES[difficultyForLevel(number)].numberRange;
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

const generatedMetadata = (number: number, board: GeneratedBoard) => { const profile = DIFFICULTY_PROFILES[difficultyForLevel(number)]; return { seed: board.seed, generatorVersion: RDN_RELEASE.generatorVersion, balanceVersion: RDN_RELEASE.balanceVersion, difficulty: profile.id, estimatedMinimumSolutionLength: board.optimalCost.impulses, branchingFactor: profile.activeFlowCount, featureFlags: profile.featureFlags }; };
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
 * Effects alter deltas, not the numeric generator.  Recalculate only the
 * authored starting values against the canonical move sequence so an effected
 * board retains a deterministic playable solution. Its star budget is then
 * calibrated from the replayed route and the declared effect complexity.
 */
const regenerateEffectAwareLevel = <T extends LevelDefinition>(level: T, configuration: LevelEffectConfiguration | undefined): T => {
  if (!configuration) return level;
  const issues = validateEffectComplexity(configuration, `${level.variant} level ${level.number}`);
  if (issues.length) throw new Error(issues.join(" "));
  const range = level.numberRange ?? DIFFICULTY_PROFILES[difficultyForLevel(level.number)].numberRange;
  let outerValues = [...level.outerValues];
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const candidate = { ...level, outerValues, solution: level.solution?.map((slot, index) => ({ ...slot, startValue: outerValues[index] })), effectConfiguration: configuration } as T;
    const result = replaySolution(candidate);
    if (result.won) {
      const allowance = effectStarAllowance(configuration, candidate.positions);
      const canonicalImpulses = result.impulses;
      const canonicalRotations = result.rotationSteps;
      return { ...candidate, starCost: { impulses: canonicalImpulses + allowance, rotationSteps: canonicalRotations + Math.ceil(allowance / 2) } };
    }
    const recalculated = outerValues.map((value, index) => value - result.outerValues[index]);
    if (recalculated.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max)) break;
    if (recalculated.every((value, index) => value === outerValues[index])) break;
    outerValues = recalculated;
  }
  // A tier is never allowed to ship an unsolvable generated board. The fallback
  // remains deterministic and legacy-compatible; development tests flag it.
  return level;
};

/** Explicit checkpoint lessons take precedence over the deterministic progression. */
const applyProgressionEffects = <T extends LevelDefinition>(mode: "adventure" | "time-attack", level: T): T => regenerateEffectAwareLevel(level, explicitEffectConfigurationForLevel(level.number) ?? createProgressionEffectConfiguration(mode, level.number, level.positions, level.generation?.seed ?? level.number));

const persistent = (number: number): LevelDefinition => {
  // Keep the first board as the one-step tutorial. Levels 2 and 3 must already
  // be distinct playable boards, otherwise the solution catalogue repeats it too.
  const board = number === 1 ? tutorialBoard() : generateBoard(number, 17);
  const level = { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1 as const, variant: "persistent" as const, numberRange: DIFFICULTY_PROFILES[difficultyForLevel(number)].numberRange, activeFlowCount: DIFFICULTY_PROFILES[difficultyForLevel(number)].activeFlowCount, generation: generatedMetadata(number, board), adventure: adventureConfig(number, board), ...board };
  return applyProgressionEffects("adventure", level);
};
const loader = (number: number): LevelDefinition => {
  const board = number === 1 ? tutorialBoard() : generateBoard(number, 71);
  const level = { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1 as const, variant: "loader" as const, numberRange: DIFFICULTY_PROFILES[difficultyForLevel(number)].numberRange, activeFlowCount: DIFFICULTY_PROFILES[difficultyForLevel(number)].activeFlowCount, generation: generatedMetadata(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
  return applyProgressionEffects("time-attack", level);
};

export const RDN_LEVELS: readonly LevelDefinition[] = [
  ...Array.from({ length: RDN_MAX_LEVEL }, (_, index) => persistent(index + 1)),
  ...Array.from({ length: RDN_MAX_LEVEL }, (_, index) => loader(index + 1)),
];
export const getRdnLevel = (variant: "adventure" | "time-attack", number = 1): LevelDefinition => RDN_LEVELS.find((level) => level.variant === (variant === "adventure" ? "persistent" : "loader") && level.number === number) ?? RDN_LEVELS[0];

/** Seedable entry point for replay, support and future ranked runs. */
export const generateRdnPuzzle = (variant: "adventure" | "time-attack", difficulty: ReturnType<typeof difficultyForLevel>, seed: number, slotCount?: number, freeEffectsEnabled = false): LevelDefinition => {
  const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
  const board = generateBoard(number, Math.trunc(seed), slotCount, true); const profile = DIFFICULTY_PROFILES[difficulty]; const generation = { ...generatedMetadata(number, board), seed: board.seed, difficulty };
  const level = variant === "adventure"
    ? { id: `seeded-persistent-${generation.seed}`, number, title: `Meccanismo ${number}`, schemaVersion: 1 as const, variant: "persistent" as const, numberRange: profile.numberRange, activeFlowCount: profile.activeFlowCount, generation, adventure: adventureConfig(number, board), ...board }
    : { id: `seeded-loader-${generation.seed}`, number, title: `Caricatore ${number}`, schemaVersion: 1 as const, variant: "loader" as const, numberRange: profile.numberRange, activeFlowCount: profile.activeFlowCount, generation, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
  return regenerateEffectAwareLevel(level, createFreeModeEffectConfiguration(difficulty, level.positions, generation.seed, freeEffectsEnabled));
};

export interface PuzzleSolutionAudit { level: number; variant: "adventure" | "time-attack"; providedOperators: readonly PuzzleOperator[]; slots: readonly PuzzleSlotSolution[]; moves: readonly PuzzleSolutionMove[]; execution: readonly PuzzleSolutionExecutionStep[]; effects: readonly ResolvedEffect[]; finalValues: readonly number[]; verified: boolean; }
const applySolutionOperator = (value: number, operator: PuzzleOperator): number => operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator;
const verifiesSolution = (level: LevelDefinition): boolean => {
  // Effected boards are validated through the real engine because link and area
  // contributions intentionally make their solution non-local to one gem.
  if (level.effectConfiguration?.enabled) return replaySolution(level).won;
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
  return { level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], execution: simulation.execution, effects: effectResolution.effects, finalValues: simulation.state.outerValues, verified: effectResolution.issues.length === 0 && simulation.state.won && verifiesSolution(level) };
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
    return { level: level.number, valid: state.won };
  });
};

if (RDN_SOLUTION_TABLE.some((row) => !row.verified)) throw new Error("Invalid RDN solution table");
if (validateAdventureLevelBatch().some((row) => !row.valid)) throw new Error("Invalid Adventure level batch");
