import { PuzzleDifficulty } from "../game/phaser/puzzle.types";

export type GameplaySessionVariant = "time-attack" | "adventure" | "free" | "effect-playground";

export interface GameplaySession {
  /** Changes on every launch, including when the player reopens the same mode. */
  launchId: string;
  modeId: string;
  modeTitle: string;
  matchLevel: number;
  mastery: number;
  variant: GameplaySessionVariant;
}

export interface GameplaySessionLaunchOverrides {
  freeDifficulty?: PuzzleDifficulty;
  freeSeed?: number;
  freeSlotCount?: number;
  /** Chosen visual theme for the Free board. */
  freeTheme?: 1 | 2 | 3;
  /** Optional Free-only effects. Omitted/false preserves the legacy Free board. */
  freeEffectsEnabled?: boolean;
  /** Free mode lets each effect family be enabled independently. */
  freeEffectSelections?: FreeEffectSelections;
}

export interface FreeEffectSelections {
  gem: boolean;
  link: boolean;
  area: boolean;
}

export interface GameplaySessionLaunchOptions {
  variant?: GameplaySessionVariant;
  overrides?: GameplaySessionLaunchOverrides | null;
}
