export const DEFAULT_TRAP_LANE_RUNNER_CONFIG = {
  layout: {
    playfieldWidth: 258, playfieldHeight: 178, playfieldY: 0, statusY: 88, infoY: 115, timerBarY: 131, playerRowY: 22,
    inputZoneY: 195, inputZoneWidth: 80, inputZoneHeight: 80, laneCount: 3, lanePerspectiveSpreadX: 18,
  },
  obstacleScale: { initial: 0.72, final: 1.00 },
  defaults: { timeLimitMs: 6000, spawnIntervalMs: 700, obstacleSpeed: 180, moveCooldownMs: 180 },
} as const;
