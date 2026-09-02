import { PuzzleEngine } from "./puzzle.engine";
import { PuzzleDifficulty } from "./puzzle.types";
import { generateRdnPuzzle } from "./catalog.builder";
import { RDN_RELEASE } from "./config/rdn-release.config";

const modulo = (value: number, length: number): number => ((value % length) + length) % length;

export interface RdnSimulationFailure {
  seed: number;
  difficulty: PuzzleDifficulty;
  slotCount: number;
  reason: "solution-not-won" | "invalid-generated-level";
}
export interface RdnSimulationReport {
  generatorVersion: string;
  samples: number;
  solved: number;
  failures: readonly RdnSimulationFailure[];
  averageImpulses: number;
  byDifficulty: Readonly<Record<PuzzleDifficulty, { samples: number; solved: number; averageImpulses: number }>>;
}

/** Headless deterministic release gate: replays declared solutions for seeds and board sizes. */
export const simulateRdnGeneration = (samplesPerDifficulty = 100, slotCounts: readonly (4 | 5 | 6 | 7 | 8)[] = [4, 5, 6, 7, 8]): RdnSimulationReport => {
  const engine = new PuzzleEngine();
  const difficulties: readonly PuzzleDifficulty[] = ["EASY", "NORMAL", "HARD", "EXPERT"];
  const failures: RdnSimulationFailure[] = [];
  const counters = new Map<PuzzleDifficulty, { samples: number; solved: number; impulses: number }>();
  for (const difficulty of difficulties) counters.set(difficulty, { samples: 0, solved: 0, impulses: 0 });

  for (const difficulty of difficulties) for (const slotCount of slotCounts) for (let index = 0; index < samplesPerDifficulty; index += 1) {
    const seed = (index + 1) * 7919 + slotCount * 101;
    const bucket = counters.get(difficulty)!;
    bucket.samples += 1;
    try {
      const level = generateRdnPuzzle("adventure", difficulty, seed, slotCount);
      let state = engine.createInitialState(level);
      for (const move of level.solutionMoves ?? []) {
        const clockwise = modulo(move.rotation - state.rotation, level.positions);
        if (clockwise) state = engine.apply(level, state, { type: "ROTATE", direction: clockwise <= level.positions / 2 ? "CW" : "CCW", steps: clockwise <= level.positions / 2 ? clockwise : level.positions - clockwise });
        state = engine.apply(level, state, { type: "IMPULSE" });
      }
      bucket.impulses += state.impulses;
      if (state.won) bucket.solved += 1;
      else failures.push({ seed, difficulty, slotCount, reason: "solution-not-won" });
    } catch {
      failures.push({ seed, difficulty, slotCount, reason: "invalid-generated-level" });
    }
  }

  const byDifficulty = Object.fromEntries(difficulties.map((difficulty) => {
    const value = counters.get(difficulty)!;
    return [difficulty, { samples: value.samples, solved: value.solved, averageImpulses: value.samples ? value.impulses / value.samples : 0 }];
  })) as RdnSimulationReport["byDifficulty"];
  const samples = [...counters.values()].reduce((total, value) => total + value.samples, 0);
  const solved = [...counters.values()].reduce((total, value) => total + value.solved, 0);
  const impulses = [...counters.values()].reduce((total, value) => total + value.impulses, 0);
  return { generatorVersion: RDN_RELEASE.generatorVersion, samples, solved, failures, averageImpulses: samples ? impulses / samples : 0, byDifficulty };
};
