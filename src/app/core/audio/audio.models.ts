export type AudioCue =
  | "ui.tap" | "ui.confirm" | "ui.cancel" | "ui.open" | "ui.close"
  | "gear.rotate" | "gear.snap" | "pulse.start" | "pulse.travel"
  | "gem.change" | "gem.zero" | "link.travel" | "link.hit" | "bonus.activate"
  | "effect.shield" | "effect.wall" | "effect.mirror" | "effect.amplifier"
  | "effect.inverter" | "effect.freeze" | "effect.timer" | "effect.corruption"
  | "game.win" | "game.perfect" | "game.fail" | "time.warning" | "time.critical";

export type MusicCue = "menu.main" | "menu.shop" | "game.adventure" | "game.timeAttack" | "game.ranked" | "game.free";

export interface AudioCueConfig {
  readonly key: string;
  readonly sources: readonly string[];
  readonly volume?: number;
  readonly loop?: boolean;
  readonly cooldownMs?: number;
  readonly maxConcurrent?: number;
  readonly pitchVariation?: number;
  /** Alternate source sets; each set contains OGG first and MP3 fallback second. */
  readonly variants?: readonly (readonly string[])[];
  /** Production brief, kept alongside the runtime mapping to prevent incoherent assets. */
  readonly design: AudioDesignSpec;
}

export interface AudioDesignSpec {
  readonly durationMs: readonly [number, number];
  readonly character: string;
  readonly intensity: 1 | 2 | 3 | 4 | 5;
  readonly priority: 1 | 2 | 3 | 4 | 5;
}

export interface AudioSettings {
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly masterMuted: boolean;
  readonly musicMuted: boolean;
  readonly sfxMuted: boolean;
}

export type AudioAssetStatus = "NOT_LOADED" | "LOADED" | "MISSING" | "ERROR";
export interface AudioDebugCounters { requested: number; played: number; skippedCooldown: number; skippedConcurrency: number; failedPlayback: number; }
export interface AudioDebugEvent { timestamp: number; kind: "PLAY" | "SKIP" | "ERROR" | "MUSIC"; message: string; }
