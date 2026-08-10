export type GameplaySessionVariant = "time-attack" | "adventure";

export interface GameplaySession {
  modeId: string;
  modeTitle: string;
  matchLevel: number;
  mastery: number;
  variant: GameplaySessionVariant;
}

export interface GameplaySessionLaunchOverrides {
  /** Spazio riservato ai parametri di lancio del prossimo motore di gioco. */
}

export interface GameplaySessionLaunchOptions {
  variant?: GameplaySessionVariant;
  overrides?: GameplaySessionLaunchOverrides | null;
}
