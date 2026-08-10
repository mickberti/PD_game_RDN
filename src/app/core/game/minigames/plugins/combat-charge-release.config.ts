import type { CombatSequenceAction } from "../minigame.model";

export const DEFAULT_COMBAT_CHARGE_RELEASE_CONFIG = {
  layout: {
    barWidth: 244, barHeight: 10, barY: 118, statusY: 250, stepY: -100, actionTextY: 60, valueY: 80,
    holdAreaY: 60, holdAreaX: -120, holdAreaWidth: 60, holdAreaHeight: 60, stepSpacing: 50,
    buttonY: 185, buttonWidth: 80, buttonHeight: 80,
  },
  buttonX: { attack: -105, defense: 5, defenseSpecial: 5, special: 115 } satisfies Record<CombatSequenceAction, number>,
} as const;
