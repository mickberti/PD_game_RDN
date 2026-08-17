import { LevelDefinition, PuzzleState } from "./puzzle.types";

export interface PuzzleScorePolicy {
  perfectImpulses: number;
  perfectRotationSteps: number;
  twoStarImpulseLimit: number;
  oneStarImpulseLimit: number;
}

/** Score limits scale with the authored solution complexity, not with fixed absolute numbers. */
export const getPuzzleScorePolicy = (level: LevelDefinition): PuzzleScorePolicy => {
  const perfectImpulses = level.optimalCost?.impulses ?? 1;
  const perfectRotationSteps = level.optimalCost?.rotationSteps ?? 0;
  return {
    perfectImpulses,
    perfectRotationSteps,
    twoStarImpulseLimit: perfectImpulses + Math.max(1, Math.ceil(perfectImpulses * .2)),
    oneStarImpulseLimit: perfectImpulses + Math.max(1, Math.ceil(perfectImpulses * .3)),
  };
};

export const getPuzzleStars = (level: LevelDefinition, state: PuzzleState): number => {
  const policy = getPuzzleScorePolicy(level);
  if (state.impulses <= policy.perfectImpulses && state.rotationSteps <= policy.perfectRotationSteps) return 3;
  if (state.impulses <= policy.twoStarImpulseLimit) return 2;
  return 1;
};

export const hasPuzzleFailed = (level: LevelDefinition, state: PuzzleState): boolean => state.impulses > getPuzzleScorePolicy(level).oneStarImpulseLimit;
