export type GameplaySessionVariant = "time-attack" | "adventure";
export type GameplayDebugMinigameType = "monster" | "trap" | "treasure";

export interface GameplaySession {
  modeId: string;
  modeTitle: string;
  matchLevel: number;
  mastery: number;
  variant: GameplaySessionVariant;
}

export interface GameplaySessionLaunchOverrides {
  sections?: number;
  theme?: import("./phaser-game-state.model").GameTheme;
  movementAxes?: 4 | 8;
  initialLives?: number;
  treasuresPerSection?: number;
  trapsPerSection?: number;
  enemiesPerSection?: number;
  mobileControls?: boolean;
  controlsOrientation?: import("./phaser-game-state.model").PhaserControlsOrientation;
  useSpritesAndAnimations?: boolean;
  useHeroAtlas?: boolean;
  useMonsterAtlas?: boolean;
  monsterLevel?: number;
  monsterTypes?: import("./phaser-game-state.model").MonsterType[];
  combatTuning?: import("./phaser-game-state.model").PhaserCombatTuningParams;
  spriteSizing?: import("./phaser-game-state.model").PhaserSceneSpriteSizingParams;
  showArcadeBodyDebug?: boolean;
  showCombatAreaDebug?: boolean;
  eventMinigameMode?: import("./phaser-game-state.model").PhaserEventMinigameModeConfig;
}

export interface GameplaySessionLaunchOptions {
  variant?: GameplaySessionVariant;
  overrides?: GameplaySessionLaunchOverrides | null;
  debugMinigame?: GameplayDebugMinigameType | null;
}
