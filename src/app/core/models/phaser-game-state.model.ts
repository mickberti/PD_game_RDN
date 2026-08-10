import { ChestTypeId, HeroItem, Progress, ResourceTypeId } from "./game.models";

export interface PhaserAtlasFrameEntry {
  frame: { x: number; y: number; w: number; h: number };
  rotated?: boolean;
  trimmed?: boolean;
  spriteSourceSize?: { x: number; y: number; w: number; h: number };
  sourceSize?: { w: number; h: number };
  pivot?: { x: number; y: number };
}

export interface PhaserAtlasDataSet {
  frames: Record<string, PhaserAtlasFrameEntry> | Array<PhaserAtlasFrameEntry & { filename: string }>;
  meta?: { image?: string; size?: { w: number; h: number }; [key: string]: unknown };
}

export type PhaserSceneState = 'boot' | 'ready' | 'playing' | 'paused' | 'won' | 'gameover';
/** @deprecated Use PhaserSceneState. */
export type GameState = PhaserSceneState;
export type PhaserGameplayEventType =
  | 'monster-hit'
  | 'hero-damaged'
  | 'hero-healed'
  | 'hero-low-health'
  | 'treasure-collected'
  | 'trap-hit'
  | 'hero-blocked'
  | 'slot-machine-gems'
  | 'minigame-started'
  | 'minigame-completed';

export interface PhaserGameplayRuntimeEvent {
  type: PhaserGameplayEventType;
  message: string;
  values: Record<string, number | string | boolean | null | undefined>;
  juiceEffect?: string | null;
}

export type GameResultStatus = import('./game.models').GameOutcomeStatus;

export interface GameResult {
  status: GameResultStatus;
  state: Extract<PhaserSceneState, 'won' | 'gameover'>;
  title: string;
  message: string;
  score: number;
  elapsedMs?: number;
  heroName: string;
  remainingHealth: number;
  remainingMana: number;
  remainingFatigue: number;
  completedAt: string;
  reason?: string;
  enemiesKilled?: number;
  attacksPerformed?: number;
  specialsPerformed?: number;
  damageDealt?: number;
  damageReceived?: number;
  damageReceivedEvents?: number;
  blocksPerformed?: number;
  treasuresCollected?: number;
  modeId?: string;
  matchLevel?: number;
}

export type GameTheme = 'Dungeon' | 'Bosco' | 'Canyon' | 'Montagna' | 'Deserto';

export type MonsterType = 'goblin' | 'slime' | 'bat' | 'skeletor';

export type PhaserControlsOrientation = 'horizontal' | 'vertical';
export type PhaserEventMinigameEncounterType = 'combat' | 'trap' | 'treasure';
export type PhaserEventMinigameModeId = 'strength' | 'dexterity' | 'intelligence' | 'luck';

export interface PhaserEventMinigameProbabilities {
  combat: number;
  trap: number;
  treasure: number;
}

export interface PhaserEventMinigameModeConfig {
  modeId: PhaserEventMinigameModeId;
  label: string;
  statId?: import("./game.models").AttributeType;
  focusEncounterType?: PhaserEventMinigameEncounterType;
  baseProbabilities: PhaserEventMinigameProbabilities;
  resolvedProbabilities: PhaserEventMinigameProbabilities;
  statValue: number;
  statMaxValue: number;
  statInfluencePercent: number;
  maxStatInfluencePercent: number;
}

export interface PhaserActionAreaParams {
  /** Forma geometrica effettiva dell'area. */
  shape?: 'rectangle' | 'circle';
  /** Per le aree circolari, centra l'area sul centro del collision body anziché davanti alla direzione corrente. */
  centered?: boolean;
  /** Variante visiva dell'effetto: 1-4 per attacco/speciale, 1-2 per difesa. */
  effectVariant?: number;
  /** Linguaggio visivo indipendente dalla forma dell'area di danno. */
  effectType?: 'melee-sweep' | 'area-burst' | 'beam' | 'projectile' | 'breath';
  /** Portata dal centro del collision body al bordo frontale dell'area, in pixel Phaser. */
  range?: number;
  /** Ampiezza laterale dell'area efficace, in pixel Phaser. */
  arcWidth?: number;
  /** Alias esplicito di offsetX, sommato allo spostamento in avanti. */
  forwardOffset?: number;
  /** Alias esplicito di offsetY, sommato allo spostamento laterale. */
  lateralOffset?: number;
  /** Offset locale lungo la direzione dell'azione; positivo = in avanti. */
  offsetX?: number;
  /** Offset locale perpendicolare; positivo = a destra di chi esegue l'azione. */
  offsetY?: number;
}

export interface PhaserHoldRepeatParams {
  /**
   * Numero massimo di azioni avviate automaticamente tenendo premuto il comando.
   * Valori <= 0 disabilitano il limite e mantengono il comportamento continuo.
   */
  attacksPerHold?: number;
  /** Millisecondi dopo i quali il limite per-hold viene riarmato se il comando resta premuto. */
  repeatAfterMs?: number;
}

export interface PhaserAttackActionParams extends PhaserActionAreaParams, PhaserHoldRepeatParams {}

export interface PhaserMonsterCombatParams {
  attack?: PhaserAttackActionParams;
  special?: PhaserAttackActionParams;
  defense?: PhaserActionAreaParams;
}

export interface PhaserCombatTuningParams {
  hero?: {
    attack?: PhaserAttackActionParams;
    special?: PhaserAttackActionParams;
    defense?: PhaserActionAreaParams;
  };
  monsters?: Partial<Record<MonsterType, PhaserMonsterCombatParams>>;
}

export interface PhaserSceneElementRenderParams {
  width?: number;
  height?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;
  mirrorOnRightHalf?: boolean;
}

export interface PhaserSceneHeroCollisionBody {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface PhaserSceneSpriteSizingParams {
  floor: PhaserSceneElementRenderParams;
  wallTop: PhaserSceneElementRenderParams;
  wallBot: PhaserSceneElementRenderParams;
  wallSide: PhaserSceneElementRenderParams;
  prop: PhaserSceneElementRenderParams;
  staticTrap: PhaserSceneElementRenderParams;
  dynamicTrap: PhaserSceneElementRenderParams;
  heroFallback: PhaserSceneElementRenderParams;
  /** Collider Arcade predefinito dell'eroe atlas: usato per collisioni e hit area. */
  heroAtlasCollisionBody: PhaserSceneHeroCollisionBody;
  /** Collider Arcade per id eroe; usa heroAtlasCollisionBody quando l'id non e' configurato. */
  heroAtlasCollisionBodyByHeroId: Record<string, PhaserSceneHeroCollisionBody>;
  heroFallbackCollisionBody: PhaserSceneHeroCollisionBody;
  /** Hitbox Arcade per ogni mostro atlas, calibrabile indipendentemente dagli sprite visuali. */
  monsterAtlasCollisionBody: Record<MonsterType, PhaserSceneHeroCollisionBody>;
}

export interface PhaserMobileControlButtonVisualConfig {
  frameAtlasKey?: string;
  frameName?: string;
  iconAtlasKey?: string;
  iconFrameName?: string;
  label?: string;
  radius?: number;
  iconScale?: number;
  frameScale?: number;
  tint?: number;
}

export interface PhaserMobileJoystickVisualConfig {
  radius?: number;
  knobRadius?: number;
  baseFillAlpha?: number;
  knobFillAlpha?: number;
  ringStrokeAlpha?: number;
}

export interface PhaserMobileControlsVisualConfig {
  attack: PhaserMobileControlButtonVisualConfig;
  special: PhaserMobileControlButtonVisualConfig;
  shield: PhaserMobileControlButtonVisualConfig;
  heal: PhaserMobileControlButtonVisualConfig;
  joystick?: PhaserMobileJoystickVisualConfig;
}

export interface PhaserWeightedFrameGroup {
  weight: number;
  frames: string[];
}

export interface PhaserWallFrameVariants {
  top: PhaserWeightedFrameGroup[];
  bot: PhaserWeightedFrameGroup[];
  side: PhaserWeightedFrameGroup[];
}

export interface PhaserBackgroundFrameVariants {
  floor: PhaserWeightedFrameGroup[];
  wall: PhaserWallFrameVariants;
  props: PhaserWeightedFrameGroup[];
  staticTrap: PhaserWeightedFrameGroup[];
  dynamicTrap: PhaserWeightedFrameGroup[];
}

export type PhaserTreasureType = 'coin' | 'gem' | 'chest' | 'resource';

export interface PhaserTreasureCountWeights {
  zero: number;
  one: number;
  two: number;
}

export interface PhaserTreasureFrameConfig {
  atlasKey?: string;
  frame?: string;
  fallbackTextureKey: string;
}

export type PhaserTreasureRewardKind = 'coins' | 'gems' | 'dust' | 'resource' | 'box';

export interface PhaserTreasureRewardConfig {
  kind: PhaserTreasureRewardKind;
  resourceTypeId?: ResourceTypeId;
  chestTypeId?: ChestTypeId;
  catalogItemId?: string;
}

export interface PhaserTreasureVisualVariant {
  weight: number;
  frame: PhaserTreasureFrameConfig;
  render?: PhaserSceneElementRenderParams;
  roomValueMin?: number;
  roomValueMax?: number;
  reward?: PhaserTreasureRewardConfig;
  /** Configura la chest come incontro slot obbligatorio anziché tesoro standard. */
  slotMachine?: {
    panelFrame: string;
  };
}

export interface PhaserTreasureTypeConfig {
  roomCountWeights: PhaserTreasureCountWeights;
  roomValueMin: number;
  roomValueMax: number;
  maxItemsPerMap: number;
  frame: PhaserTreasureFrameConfig;
  render: PhaserSceneElementRenderParams;
  reward?: PhaserTreasureRewardConfig;
  variants?: PhaserTreasureVisualVariant[];
}

export interface PhaserTreasureConfig {
  types: Record<PhaserTreasureType, PhaserTreasureTypeConfig>;
}

export interface PhaserGameParams {
  sections: number;
  /** Dimensioni in tile della sezione; omesse usano PHASER_SCENE_CONFIG. */
  sectionWidth?: number;
  sectionHeight?: number;
  theme: GameTheme;
  uiThemeId?: 'fantasy_bg' | 'fantasy' | 'sketch' | 'race';
  showEventModeProbabilities?: boolean;
  movementAxes: 4 | 8;
  tileSize?: number;
  playerSpeed?: number;
  enemySpeed?: number;
  initialLives?: number;
  treasuresPerSection?: number;
  trapsPerSection?: number;
  enemiesPerSection?: number;
  damageCooldown?: number;
  mobileControls?: boolean;
  /**
   * Orientamento dei pulsanti azione touch.
   * - horizontal mantiene la disposizione affiancata in basso;
   * - vertical impila ATK/SPL/SHD sulla destra per layout portrait.
   */
  controlsOrientation?: PhaserControlsOrientation;

  /**
   * HeroItem arriva dal dominio Angular.
   * La scena usa:
   * - hero.heal.current / hero.heal.total per HP attuali e massimi;
   * - hero.mana.current / hero.mana.total per mana e colpi speciali;
   * - hero.fatigue.current / hero.fatigue.total per stanchezza ed esaurimento;
   * - hero.stats per Forza, Destrezza, Costituzione, Intelligenza, Saggezza, Carisma;
   * - hero.equip per weapon, shield, armor, helmet, ring, artifact;
   * - hero.powerMultipliers per eventuali moltiplicatori globali di potenza.
   */
  hero?: HeroItem;



  /**
   * Abilita l'uso degli sprite atlas e delle animazioni nel gioco.
   * Se disabilitato, eroe, pavimenti, muri, oggetti scenici e trappole usano le texture generate a runtime.
   */
  useSpritesAndAnimations?: boolean;

  /** Disponibilita' tecnica degli atlas dell'eroe quando gli sprite sono abilitati. */
  useHeroAtlas?: boolean;
  heroAtlasKey?: string;
  heroAtlasImage?: string;
  heroAtlasJson?: string | PhaserAtlasDataSet;
  heroAtlasDirections?: Partial<Record<'up' | 'down' | 'horiz', { key: string; imageUrl: string; atlasData: PhaserAtlasDataSet; scale: number }>>;
  useMonsterAtlas?: boolean;
  monsterAtlasKey?: string;
  monsterAtlasImage?: string;
  monsterAtlasJson?: string | PhaserAtlasDataSet;
  monsterAtlasDirections?: Partial<Record<'up' | 'down' | 'horiz', { key: string; imageUrl: string; atlasData: PhaserAtlasDataSet; scale: number }>>;

  monsterLevel?: number;
  monsterTypes?: MonsterType[];
  modeId?: string;
  matchLevel?: number;

  /** Parametri di bilanciamento per range/dimensioni delle aree combattimento e ripetizione input. */
  combatTuning?: PhaserCombatTuningParams;
  /** Dimensioni configurabili degli elementi visuali della scena Phaser. */
  spriteSizing?: PhaserSceneSpriteSizingParams;
  /** Mostra i rettangoli dei body Arcade per la calibrazione delle hitbox. */
  showArcadeBodyDebug?: boolean;
  /** Mostra hitbox e aree di scudo reali per la calibrazione del combattimento. */
  showCombatAreaDebug?: boolean;
  /** Varianti pesate dei frame ambientali per floor e wall. */
  backgroundFrameVariants?: PhaserBackgroundFrameVariants;
  /** Configurazione delle tipologie tesoro generate nelle stanze. */
  treasureConfig?: PhaserTreasureConfig;
  /** Configurazione visuale del controller touch Phaser. */
  mobileControlsVisual?: PhaserMobileControlsVisualConfig;
  /** Profilo UX che regola con quale probabilita' proporre un minigioco nei vari incontri. */
  eventMinigameMode?: PhaserEventMinigameModeConfig;
  /** Saldo gemme passato alla scena per i minigiochi che usano il wallet. */
  slotMachineGems?: number;
}

export interface PhaserHudRuntimeSnapshot {
  health: number;
  mana: number;
  fatigue: number;
  experience: Progress;
}
