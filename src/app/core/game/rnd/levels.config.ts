import { LevelDefinition, PuzzleOperator, PuzzleSlotSolution, PuzzleSolutionMove } from "./puzzle.types";

export const RDN_MAX_LEVEL = 100;

/** Deterministic catalogue: a level always produces the same board and solution. */
const modulo = (value: number, length: number): number => ((value % length) + length) % length;
const random = (seed: number): (() => number) => { let state = seed >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x1_0000_0000; }; };
const positionsForLevel = (number: number): 4 | 5 | 6 | 8 => number <= 20 ? 4 : number <= 40 ? 5 : number <= 60 ? 6 : 8;
const impulsesPerValue = (number: number): number => number <= 3 ? 1 : Math.min(6, 2 + Math.floor((number - 4) / 16));
const rotationDistance = (from: number, to: number, positions: number): number => Math.min(modulo(to - from, positions), modulo(from - to, positions));

interface GeneratedBoard { positions: 4 | 5 | 6 | 8; initialRotation: number; innerValues: PuzzleOperator[]; loaderQueues: PuzzleOperator[][]; outerValues: number[]; slotPhases: Array<Array<{ outerIndex: number }>>; optimalCost: { impulses: number; rotationSteps: number }; solution: PuzzleSlotSolution[]; solutionMoves: PuzzleSolutionMove[]; }
interface ValuePlan { start: number; operators: PuzzleOperator[]; }

/** Multipliers appear only in advanced levels and are forced into the generated solution. */
const specialOperatorsForLevel = (level: number): PuzzleOperator[] => level >= 60 ? ["x2", "divide2"] : level >= 40 ? ["divide2"] : [];
const gearOperators = (positions: number, level: number, specialOperators: readonly PuzzleOperator[]): PuzzleOperator[] => {
  const subtractorCount = positions - specialOperators.length;
  const maxMagnitude = Math.min(9, 2 + Math.floor((level - 1) / 12));
  const magnitudes = Array.from({ length: subtractorCount }, (_, index) => index === 0 ? 1 : Math.min(maxMagnitude, index + 1));
  // The late 8-socket board explicitly exposes the upper bound and the neutral operator.
  if (positions === 8 && level >= 88) return [-1, -2, -3, -4, -9, 0, ...specialOperators];
  return [...magnitudes.map((value) => -value), ...specialOperators];
};
const subtractors = (operators: PuzzleOperator[]): number[] => operators.filter((operator): operator is number => typeof operator === "number" && operator < 0);

/** Produces a positive start value no greater than 20 which reaches zero in `count` subtractions. */
const subtractivePlan = (count: number, available: number[], next: () => number, maximumStart = 20): ValuePlan => {
  const values: number[] = [];
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const remaining = count - index - 1;
    const candidates = available.filter((value) => total + Math.abs(value) + remaining <= maximumStart);
    const selected = candidates[Math.floor(next() * candidates.length)] ?? -1;
    values.push(selected);
    total += Math.abs(selected);
  }
  return { start: total, operators: values };
};

const planForValue = (impulses: number, available: number[], next: () => number, forcedOperator?: PuzzleOperator): ValuePlan => {
  if (forcedOperator === "divide2") {
    const remainder = next() < .5 ? 0 : 1;
    const tail = subtractivePlan(impulses - 1, available, next, remainder === 0 ? 10 : 9);
    return { start: tail.start * 2 + remainder, operators: ["divide2", ...tail.operators] };
  }
  if (forcedOperator === "x2" && available.includes(-2)) {
    return { start: impulses - 1, operators: ["x2", ...Array(impulses - 1).fill(-2)] };
  }
  return subtractivePlan(impulses, available, next);
};

const generateBoard = (number: number, seedOffset: number): GeneratedBoard => {
  const positions = positionsForLevel(number);
  const impulses = impulsesPerValue(number);
  const next = random(number * 977 + seedOffset);
  const specialOperators = specialOperatorsForLevel(number);
  const innerValues = gearOperators(positions, number, specialOperators);
  const plans = Array.from({ length: positions }, (_, index) => planForValue(impulses, subtractors(innerValues), next, specialOperators[index]));
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
  for (const queue of loaderQueues) if (queue.length === 0) queue.push(0);
  return { positions, initialRotation, innerValues, loaderQueues, outerValues: plans.map((plan) => plan.start), slotPhases, optimalCost: { impulses: slotPhases.length, rotationSteps }, solution: plans.map((plan) => ({ startValue: plan.start, operators: [...plan.operators] })), solutionMoves };
};

const tutorialBoard = (): GeneratedBoard => ({ positions: 4, initialRotation: 0, innerValues: [-1, -1, -1, -1], loaderQueues: [[-1], [-1], [-1], [-1]], outerValues: [1, 1, 1, 1], slotPhases: [[{ outerIndex: 0 }, { outerIndex: 1 }, { outerIndex: 2 }, { outerIndex: 3 }]], optimalCost: { impulses: 1, rotationSteps: 0 }, solution: Array.from({ length: 4 }, () => ({ startValue: 1, operators: [-1] })), solutionMoves: Array.from({ length: 4 }, (_, outerIndex) => ({ outerIndex, rotation: 0, operator: -1 })) });

const persistent = (number: number): LevelDefinition => {
  const board = number <= 3 ? tutorialBoard() : generateBoard(number, 17);
  return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", ...board };
};
const loader = (number: number): LevelDefinition => {
  const board = number <= 3 ? tutorialBoard() : generateBoard(number, 71);
  return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
};

export const RDN_LEVELS: readonly LevelDefinition[] = [
  ...Array.from({ length: RDN_MAX_LEVEL }, (_, index) => persistent(index + 1)),
  ...Array.from({ length: RDN_MAX_LEVEL }, (_, index) => loader(index + 1)),
];
export const getRdnLevel = (variant: "adventure" | "time-attack", number = 1): LevelDefinition => RDN_LEVELS.find((level) => level.variant === (variant === "adventure" ? "persistent" : "loader") && level.number === number) ?? RDN_LEVELS[0];

export interface PuzzleSolutionAudit { level: number; variant: "adventure" | "time-attack"; providedOperators: readonly PuzzleOperator[]; slots: readonly PuzzleSlotSolution[]; moves: readonly PuzzleSolutionMove[]; verified: boolean; }
const applySolutionOperator = (value: number, operator: PuzzleOperator): number => operator === "x2" ? value * 2 : operator === "divide2" ? Math.trunc(value / 2) : value + operator;
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
/** Inspectable solution tables for the 100 levels of both gameplay variants. */
export const RDN_SOLUTION_TABLE: readonly PuzzleSolutionAudit[] = RDN_LEVELS.map((level) => ({ level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], verified: verifiesSolution(level) }));
export const getRdnSolutionTable = (variant: "adventure" | "time-attack"): readonly PuzzleSolutionAudit[] => RDN_SOLUTION_TABLE.filter((row) => row.variant === variant);

if (RDN_SOLUTION_TABLE.some((row) => !row.verified)) throw new Error("Invalid RDN solution table");
