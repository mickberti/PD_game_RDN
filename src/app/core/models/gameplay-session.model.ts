import { PuzzleDifficulty } from "../game/rnd/difficulty-profile.config";

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
