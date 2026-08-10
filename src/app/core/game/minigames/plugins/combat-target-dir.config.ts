export type CombatTargetDirection = "up" | "down" | "left" | "right";

export interface CombatTargetDirConfig {
  layout: { playfieldY: number; playfieldWidth: number; playfieldHeight: number; statusY: number; scoreY: number };
  defaults: { objectiveCount: number; spawnIntervalMs: number; targetRadius: number; targetLifeMs: number; targetRingRadius: number };
  minSwipeDistance: number;
  directionMode: "4-way";
  directionToleranceDeg: number;
  hintColor: number;
  hintErrorColor: number;
  hintSuccessColor: number;
  hintRadiusOffset: number;
  hintPulseDuration: number;
  dragScale: number;
  releaseCommitDurationMs: number;
  successScore: number;
  failPenalty: number;
}

export const DEFAULT_COMBAT_TARGET_DIR_CONFIG: CombatTargetDirConfig = {
  layout: { playfieldY: -44, playfieldWidth: 252, playfieldHeight: 194, statusY: 185, scoreY: 160 },
  defaults: { objectiveCount: 8, spawnIntervalMs: 700, targetRadius: 28, targetLifeMs: 1000, targetRingRadius: 112 },
  minSwipeDistance: 28,
  directionMode: "4-way",
  directionToleranceDeg: 35,
  hintColor: 0x60a5fa,
  hintErrorColor: 0xef4444,
  hintSuccessColor: 0x22c55e,
  hintRadiusOffset: 10,
  hintPulseDuration: 520,
  dragScale: 1.08,
  releaseCommitDurationMs: 160,
  successScore: 1,
  failPenalty: 1,
};
