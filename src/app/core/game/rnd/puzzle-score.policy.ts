import { LevelDefinition, PuzzleState } from "./puzzle.types";

export interface PuzzleScorePolicy {
  perfectImpulses: number;
  perfectRotationSteps: number;
  twoStarImpulseLimit: number;
  oneStarImpulseLimit: number;
}

/** Score limits use the effect-aware star budget when a level has one. */
export const getPuzzleScorePolicy = (level: LevelDefinition): PuzzleScorePolicy => {
  const scoreCost = level.starCost ?? level.optimalCost;
  const perfectImpulses = scoreCost?.impulses ?? 1;
  const perfectRotationSteps = scoreCost?.rotationSteps ?? 0;
  return {
    perfectImpulses,
    perfectRotationSteps,
    twoStarImpulseLimit: perfectImpulses + Math.max(1, Math.ceil(perfectImpulses * .2)),
    oneStarImpulseLimit: perfectImpulses + Math.max(1, Math.ceil(perfectImpulses * .3)),
  };
};

export const getPuzzleStars = (level: LevelDefinition, state: PuzzleState): number => {
  const policy = getPuzzleScorePolicy(level);
  // Adventure rewards the solution length: rotations remain tactical and do not reduce stars.
  if (state.impulses <= policy.perfectImpulses && (level.variant === "persistent" || state.rotationSteps <= policy.perfectRotationSteps)) return 3;
  if (state.impulses <= policy.twoStarImpulseLimit) return 2;
  return 1;
};

/** A timer expiry always fails; other limits depend on the active game mode. */
export const hasPuzzleFailed = (level: LevelDefinition, state: PuzzleState): boolean => {
  if ((state.effectRuntime?.expiredTimerIds.length ?? 0) > 0) return true;
  if (level.variant === "persistent") {
    const limits = level.adventure?.limits;
    return (limits?.maxImpulses !== undefined && state.impulses > limits.maxImpulses)
      || (limits?.maxRotationSteps !== undefined && state.rotationSteps > limits.maxRotationSteps);
  }
  return state.impulses > getPuzzleScorePolicy(level).oneStarImpulseLimit;
};
