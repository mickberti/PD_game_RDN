import { PuzzleNumberRange } from "./puzzle.types";

export type PuzzleDifficulty = "EASY" | "NORMAL" | "HARD" | "EXPERT";
export interface DifficultyProfile {
  id: PuzzleDifficulty;
  numberRange: PuzzleNumberRange;
  minPositions: number;
  maxPositions: number;
  activeFlowCount: number;
  allowDivideByTwo: boolean;
  minimumSolutionDepth: number;
  moveBudget: number;
  featureFlags: readonly string[];
}

export const DIFFICULTY_PROFILES: Readonly<Record<PuzzleDifficulty, DifficultyProfile>> = {
  EASY: { id: "EASY", numberRange: { min: -24, max: 24, policy: "reject" }, minPositions: 4, maxPositions: 5, activeFlowCount: 1, allowDivideByTwo: false, minimumSolutionDepth: 1, moveBudget: 8, featureFlags: [] },
  NORMAL: { id: "NORMAL", numberRange: { min: -45, max: 45, policy: "reject" }, minPositions: 5, maxPositions: 6, activeFlowCount: 2, allowDivideByTwo: true, minimumSolutionDepth: 2, moveBudget: 16, featureFlags: ["signed-values", "divide-by-two"] },
  HARD: { id: "HARD", numberRange: { min: -72, max: 72, policy: "reject" }, minPositions: 6, maxPositions: 7, activeFlowCount: 3, allowDivideByTwo: true, minimumSolutionDepth: 3, moveBudget: 28, featureFlags: ["signed-values", "divide-by-two", "divide-by-three", "afflictions"] },
  EXPERT: { id: "EXPERT", numberRange: { min: -99, max: 99, policy: "reject" }, minPositions: 7, maxPositions: 8, activeFlowCount: 4, allowDivideByTwo: true, minimumSolutionDepth: 4, moveBudget: 42, featureFlags: ["signed-values", "divide-by-two", "divide-by-three", "afflictions", "colors"] },
};

export const difficultyForLevel = (level: number): PuzzleDifficulty => level <= 20 ? "EASY" : level <= 45 ? "NORMAL" : level <= 70 ? "HARD" : "EXPERT";
export const assertDifficultyProfile = (profile: DifficultyProfile): void => {
  if (!Number.isInteger(profile.minPositions) || profile.minPositions < 4 || profile.maxPositions < profile.minPositions || profile.activeFlowCount < 1 || profile.activeFlowCount > 4 || profile.activeFlowCount > profile.maxPositions || profile.numberRange.min >= 0 || profile.numberRange.max <= 0 || profile.numberRange.min >= profile.numberRange.max || profile.moveBudget < profile.minimumSolutionDepth) throw new Error(`Invalid difficulty profile ${profile.id}`);
};
Object.values(DIFFICULTY_PROFILES).forEach(assertDifficultyProfile);
