import { AdventureGameConfig, LevelDefinition, PuzzleOperator, PuzzleSlotSolution, PuzzleSolutionMove } from "./puzzle.types";
import { PuzzleEngine } from "./puzzle.engine";
import { DIFFICULTY_PROFILES, difficultyForLevel } from "./difficulty-profile.config";
import { RDN_RELEASE } from "./rdn-release.config";

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
const specialOperatorsForLevel = (level: number): PuzzleOperator[] => [
  ...(level >= 40 ? ["divide2" as const] : []),
  ...(level >= 80 ? ["divide3" as const] : []),
];
const gearOperators = (positions: number, specialOperators: readonly PuzzleOperator[], next: () => number): PuzzleOperator[] => {
  const subtractorCount = positions - specialOperators.length;
  // Values are intentionally non-sequential: every gear can contain any signed 1..9.
  const magnitudes = Array.from({ length: subtractorCount }, () => 1 + Math.floor(next() * 9));
  return [...magnitudes.map((value, index) => index % 2 === 0 ? -value : value), ...specialOperators];
};
const additiveOperators = (operators: PuzzleOperator[]): number[] => operators.filter((operator): operator is number => typeof operator === "number" && operator !== 0);

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
  return subtractivePlan(impulses, available, next, maximumStart);
};

const generateBoard = (number: number, seedOffset: number, slotCount?: number): GeneratedBoard => {
  const positions = slotCount && slotCount >= RDN_MIN_SPHERES && slotCount <= RDN_MAX_SPHERES ? slotCount as GeneratedBoard["positions"] : rdnSphereCountForLevel(number);
  const impulses = impulsesPerValue(number);
  const seed = number * 977 + seedOffset;
  const next = random(seed);
  const specialOperators = specialOperatorsForLevel(number);
  const innerValues = gearOperators(positions, specialOperators, next);
  const allAdditives = additiveOperators(innerValues);
  const range = DIFFICULTY_PROFILES[difficultyForLevel(number)].numberRange;
  const maximumStart = Math.min(Math.abs(range.min), Math.abs(range.max));
  const plans = Array.from({ length: positions }, (_, index) => planForValue(impulses, allAdditives.filter((operator) => index % 2 === 0 ? operator < 0 : operator > 0), next, maximumStart, specialOperators[index]));
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
  },
});

const persistent = (number: number): LevelDefinition => {
  // Keep the first board as the one-step tutorial. Levels 2 and 3 must already
  // be distinct playable boards, otherwise the solution catalogue repeats it too.
  const board = number === 1 ? tutorialBoard() : generateBoard(number, 17);
  return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", numberRange: DIFFICULTY_PROFILES[difficultyForLevel(number)].numberRange, activeFlowCount: DIFFICULTY_PROFILES[difficultyForLevel(number)].activeFlowCount, generation: generatedMetadata(number, board), adventure: adventureConfig(number, board), ...board };
};
const loader = (number: number): LevelDefinition => {
  const board = number === 1 ? tutorialBoard() : generateBoard(number, 71);
  return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", numberRange: DIFFICULTY_PROFILES[difficultyForLevel(number)].numberRange, activeFlowCount: DIFFICULTY_PROFILES[difficultyForLevel(number)].activeFlowCount, generation: generatedMetadata(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
};

export const RDN_LEVELS: readonly LevelDefinition[] = [
  ...Array.from({ length: RDN_MAX_LEVEL }, (_, index) => persistent(index + 1)),
  ...Array.from({ length: RDN_MAX_LEVEL }, (_, index) => loader(index + 1)),
];
export const getRdnLevel = (variant: "adventure" | "time-attack", number = 1): LevelDefinition => RDN_LEVELS.find((level) => level.variant === (variant === "adventure" ? "persistent" : "loader") && level.number === number) ?? RDN_LEVELS[0];

/** Seedable entry point for replay, support and future ranked runs. */
export const generateRdnPuzzle = (variant: "adventure" | "time-attack", difficulty: ReturnType<typeof difficultyForLevel>, seed: number, slotCount?: number): LevelDefinition => {
  const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
  const board = generateBoard(number, Math.trunc(seed), slotCount); const profile = DIFFICULTY_PROFILES[difficulty]; const generation = { ...generatedMetadata(number, board), seed: board.seed, difficulty };
  return variant === "adventure"
    ? { id: `seeded-persistent-${generation.seed}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", numberRange: profile.numberRange, activeFlowCount: profile.activeFlowCount, generation, adventure: adventureConfig(number, board), ...board }
    : { id: `seeded-loader-${generation.seed}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", numberRange: profile.numberRange, activeFlowCount: profile.activeFlowCount, generation, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
};

export interface PuzzleSolutionAudit { level: number; variant: "adventure" | "time-attack"; providedOperators: readonly PuzzleOperator[]; slots: readonly PuzzleSlotSolution[]; moves: readonly PuzzleSolutionMove[]; verified: boolean; }
const applySolutionOperator = (value: number, operator: PuzzleOperator): number => operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : value + operator;
const verifiesSolution = (level: LevelDefinition): boolean => {
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
export const RDN_SOLUTION_TABLE: readonly PuzzleSolutionAudit[] = RDN_LEVELS.map((level) => ({ level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], verified: verifiesSolution(level) }));
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
