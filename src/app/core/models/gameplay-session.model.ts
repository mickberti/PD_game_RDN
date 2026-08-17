import { PuzzleDifficulty } from "../game/rnd/difficulty-profile.config";

export type GameplaySessionVariant = "time-attack" | "adventure" | "free";

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
}

export interface GameplaySessionLaunchOptions {
  variant?: GameplaySessionVariant;
  overrides?: GameplaySessionLaunchOverrides | null;
}
