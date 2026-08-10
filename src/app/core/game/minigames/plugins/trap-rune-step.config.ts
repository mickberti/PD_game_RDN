export const DEFAULT_TRAP_RUNE_STEP_CONFIG = {
  layout: { panelWidth: 322, gridY: -25, statusY: 128, roundY: 155, timerY: 181, roundBarY: 181, cellSize: 65, cellGap: 10 },
  colors: { defaultFill: 0x1f2340, previewFill: 0x312e81, defaultStroke: 0xe9d5ff, activeStroke: 0xf6d365, successGlow: 0x22c55e, errorGlow: 0xef4444 },
  defaults: { previewDurationMs: 1200, chooseTimeMs: 1800, roundTransitionMs: 900 },
} as const;
