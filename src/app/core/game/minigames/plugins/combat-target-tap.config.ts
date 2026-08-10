import type { CombatSequenceAction } from "../minigame.model";

export const DEFAULT_COMBAT_TARGET_TAP_CONFIG = {
  layout: { playfieldY: -44, playfieldWidth: 252, playfieldHeight: 194, statusY: 240, scoreY: 130, buttonY: 185, buttonWidth: 80, buttonHeight: 80 },
  buttonX: { attack: -108, defense: 5, defenseSpecial: 5, special: 116 } satisfies Record<CombatSequenceAction, number>,
  defaults: { objectiveCount: 8, spawnIntervalMs: 700, targetRadius: 28, targetLifeMs: 1000, targetRingRadius: 112 },
} as const;
