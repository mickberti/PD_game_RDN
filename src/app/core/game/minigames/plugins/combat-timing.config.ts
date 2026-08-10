import type { CombatSequenceAction, TimingZoneConfig } from "../minigame.model";

export const DEFAULT_COMBAT_TIMING_CONFIG = {
  layout: { barY: 118, barWidth: 204, barHeight: 10, actionTextY: 60, statusTextY: 80, buttonY: 185, buttonWidth: 80, buttonHeight: 80 },
  buttonX: { attack: -110, defense: 5, defenseSpecial: 5, special: 120 } satisfies Record<CombatSequenceAction, number>,
  defaultZones: { perfect: 32, success: 92, partial: 156 } satisfies TimingZoneConfig,
} as const;
