export const DEFAULT_PRESSURE_LOCK_CONFIG = {
  layout: { playfieldWidth: 268, playfieldHeight: 176, statusY: 74, counterY: 102, progressY: 128, timerY: 150, buttonY: 194, buttonWidth: 206, buttonHeight: 68, barWidth: 232 },
  defaults: { timeLimitMs: 2400, minimumTimeLimitMs: 900, partialThreshold: 0.45, perfectRemainingRatio: 0.31 },
} as const;
