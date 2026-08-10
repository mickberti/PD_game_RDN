import type { TimingZoneConfig } from "../minigame.model";

export const DEFAULT_LOCKPICK_TIMING_CONFIG = {
  layout: { barY: 137, textY: 72, statusY: 102, buttonX: 110, buttonY: 183, buttonWidth: 108, buttonHeight: 72, barWidth: 260 },
  defaultZones: { perfect: 28, success: 82, partial: 140 } satisfies TimingZoneConfig,
} as const;
