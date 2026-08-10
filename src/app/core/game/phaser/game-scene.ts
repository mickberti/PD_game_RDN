import Phaser from 'phaser';
import { GameEvent, GameEventType, HeroMinigameStats } from '../minigames/game-event.model';
import { buildStandaloneMinigameEvent } from '../minigames/minigame-launch.factory';
import { MinigameConfig, MinigameHeroHudConfig, MinigameMonsterHudConfig, MinigameOverlayPayload, MinigameResult, MinigameResultGrade } from '../minigames/minigame.model';
import { MinigameResolverService } from '../minigames/minigame-resolver.service';
import { getHeroSpriteAtlasSet, HeroSpriteDirection } from './config/hero-atlas.config';
import { buildHeroCombatTuning } from './config/combat-tuning.config';
import { getMonsterSpriteAtlasSet, MONSTER_SPRITE_ATLAS_SETS, MonsterSpriteDirection } from './config/monster-atlas.config';
import { PhaserGameEventsService } from '../../services/gameplay/phaser/phaser-game-events.service';
import {
  GameResult,
  PhaserBackgroundFrameVariants,
  PhaserGameplayRuntimeEvent,
  PhaserGameplayEventType,
  PhaserMobileControlButtonVisualConfig,
  PhaserMobileControlsVisualConfig,
  PhaserSceneState,
  GameTheme,
  MonsterType,
  PhaserGameParams,
  PhaserSceneElementRenderParams,
  PhaserSceneSpriteSizingParams,
  PhaserTreasureConfig,
  PhaserTreasureFrameConfig,
  PhaserTreasureTypeConfig,
  PhaserTreasureVisualVariant,
  PhaserTreasureType,
  PhaserEventMinigameEncounterType,
} from '../../models/phaser-game-state.model';
import { AttributeType, EquipItem, HeroItem, Progress } from '../../models/game.models';
import { HERO_ACTIONS, HeroAnimationAction } from '../../models/phaser-hero-animation.models';
import { HERO_FATIGUE_GAMEPLAY_CONFIG, HERO_HEAL_GAMEPLAY_CONFIG, MONSTER_GAMEPLAY_CONFIG, PHASER_SCENE_CONFIG } from './config/game-variables.config';
import {
  BACKGROUND_FRAMES,
  GAME_ATLAS,
  resolveMinigameButtonAtlas,
  resolveMinigameUiAtlas,
  resolveMobileUiAtlas,
  resolveTreasureAtlas,
} from './config/game-atlas.config';
import { CombatEffectType, GameEffectKey, GameEffectOptions, GameEffectsManager, HackSlashEffectTuning } from './effects/game-effects.manager';


type Section = {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
};

type TilePoint = { x: number; y: number };

type AttackDirection = 'up' | 'down' | 'left' | 'right';

type SceneSpriteKind = 'floor' | 'wallTop' | 'wallBot' | 'wallSide';
type TreasureSprite = Phaser.Physics.Arcade.Sprite & { treasureType?: PhaserTreasureType };

const FLOOR_TILE = 0;
const WALL_TILE = 1;
const PROP_TILE = 2;

type AttackConfig = {
  label: string;
  damage: number;
  range: number;
  cooldown: number;
  arcWidth: number;
  shape: 'rectangle' | 'circle';
  centered: boolean;
  effectVariant: number;
  effectType: CombatEffectType;
  forwardOffset: number;
  lateralOffset: number;
  offsetX: number;
  offsetY: number;
  knockback: number;
};

type CombatArea = Phaser.Geom.Rectangle | Phaser.Geom.Circle;
type CombatAreaShape = 'rectangle' | 'circle';

type HeroCombatProfile = {
  heroTitle: string;
  level: number;
  wisdom: number;
  maxHealth: number;
  currentHealth: number;
  maxMana: number;
  currentMana: number;
  maxFatigue: number;
  currentFatigue: number;
  healCharges: number;
  healCooldownMs: number;
  healAmount: number;
  healManaCost: number;
  attack: AttackConfig;
  special: AttackConfig & { manaCost: number };
  defense: number;
  defenseRange: number;
  defenseArcWidth: number;
  defenseShape: CombatAreaShape;
  defenseCentered: boolean;
  defenseEffectVariant: number;
  defenseEffectType: CombatEffectType;
  defenseForwardOffset: number;
  defenseLateralOffset: number;
  defenseOffsetX: number;
  defenseOffsetY: number;
  shieldEfficiency: number;
  shieldDrainPerSecond: number;
  manaRegenPerSecond: number;
};

type MobileButtonUiRefs = {
  fillCircle?: Phaser.GameObjects.Arc;
  labelText?: Phaser.GameObjects.Text;
  cooldownText?: Phaser.GameObjects.Text;
  iconImage?: Phaser.GameObjects.Image;
  cooldownShade?: Phaser.GameObjects.Rectangle;
  cooldownHourglass?: Phaser.GameObjects.Graphics;
};

type MonsterConfig = {
  label: string;
  baseHp: number;
  hpPerLevel: number;
  baseMana: number;
  manaPerLevel: number;
  damage: number;
  speedMultiplier: number;
  chaseRadius: number;
  score: number;
  tint: number;
  weaponRange: number;
  weaponCooldown: number;
  specialRange: number;
  specialCooldown: number;
  specialManaCost: number;
  weaponDamageMultiplier: number;
  specialDamageMultiplier: number;
  defenseRange: number;
  defenseArcWidth: number;
  canShield: boolean;
  shieldChance: number;
  shieldEfficiency: number;
  specialChance: number;
};

type EnemySprite = Phaser.Physics.Arcade.Sprite & {
  monsterType: MonsterType;
  monsterFacing?: AttackDirection;
};

type EventEncounterContext = {
  type: GameEventType;
  sprite: Phaser.Physics.Arcade.Sprite;
  trapKind?: 'static' | 'dynamic';
  enemy?: EnemySprite;
};

type ResolvedPhaserGameParams =
  Required<Omit<PhaserGameParams, 'hero' | 'monsterTypes' | 'eventMinigameMode'>> & {
    hero?: HeroItem;
    monsterTypes: MonsterType[];
    eventMinigameMode?: PhaserGameParams['eventMinigameMode'];
  };

export class GameScene extends Phaser.Scene {
  private readonly minigameResolver = new MinigameResolverService();
  private readonly defaultParams: ResolvedPhaserGameParams = {
    modeId: 'default',
    matchLevel: 1,
    uiThemeId: 'fantasy_bg',
    showEventModeProbabilities: PHASER_SCENE_CONFIG.showEventModeProbabilitiesInHud,
    sections: PHASER_SCENE_CONFIG.sections,
    sectionWidth: PHASER_SCENE_CONFIG.sectionWidth,
    sectionHeight: PHASER_SCENE_CONFIG.sectionHeight,
    theme: 'Dungeon',
    movementAxes: PHASER_SCENE_CONFIG.movementAxes,
    tileSize: PHASER_SCENE_CONFIG.tileSize,
    playerSpeed: PHASER_SCENE_CONFIG.playerSpeed,
    enemySpeed: PHASER_SCENE_CONFIG.enemySpeed,
    initialLives: PHASER_SCENE_CONFIG.initialLives,
    treasuresPerSection: PHASER_SCENE_CONFIG.treasuresPerSection,
    trapsPerSection: PHASER_SCENE_CONFIG.trapsPerSection,
    enemiesPerSection: PHASER_SCENE_CONFIG.enemiesPerSection,
    damageCooldown: PHASER_SCENE_CONFIG.damageCooldown,
    mobileControls: true,
    controlsOrientation: 'horizontal',
    useSpritesAndAnimations: true,
    useHeroAtlas: true,
    heroAtlasKey: getHeroSpriteAtlasSet().directions.down.key,
    heroAtlasImage: getHeroSpriteAtlasSet().directions.down.imageUrl,
    heroAtlasJson: getHeroSpriteAtlasSet().directions.down.atlasData,
    heroAtlasDirections: getHeroSpriteAtlasSet().directions,
    useMonsterAtlas: true,
    monsterAtlasKey: getMonsterSpriteAtlasSet().directions.down.key,
    monsterAtlasImage: getMonsterSpriteAtlasSet().directions.down.imageUrl,
    monsterAtlasJson: getMonsterSpriteAtlasSet().directions.down.atlasData,
    monsterAtlasDirections: getMonsterSpriteAtlasSet().directions,
    hero: undefined,
    monsterLevel: PHASER_SCENE_CONFIG.monsterLevel,
    monsterTypes: PHASER_SCENE_CONFIG.monsterTypes,
    spriteSizing: PHASER_SCENE_CONFIG.spriteSizing,
    showArcadeBodyDebug: false,
    showCombatAreaDebug: false,
    backgroundFrameVariants: PHASER_SCENE_CONFIG.backgroundFrameVariants,
    treasureConfig: PHASER_SCENE_CONFIG.treasureConfig,
    mobileControlsVisual: PHASER_SCENE_CONFIG.mobileControlsVisual,
    slotMachineGems: 0,
    combatTuning: { hero: buildHeroCombatTuning() }
  };

  private readonly monsters: Record<MonsterType, MonsterConfig> = MONSTER_GAMEPLAY_CONFIG;
  private effects!: GameEffectsManager;

  private params!: ResolvedPhaserGameParams;
  private eventsService?: PhaserGameEventsService;

  private score = 0;
  private enemiesKilled = 0;
  private attacksPerformed = 0;
  private specialsPerformed = 0;
  private damageDealt = 0;
  private damageReceived = 0;
  private damageReceivedEvents = 0;
  private blocksPerformed = 0;
  private treasuresCollected = 0;
  private currentCombo = 0;

  // `lives` viene mantenuto per compatibilità con PhaserGameEventsService,
  // ma nel gioco rappresenta gli HP correnti dell'eroe.
  private lives = 3;
  private heroHealth = 3;
  private heroMaxHealth = 3;
  private heroMana = 0;
  private heroMaxMana = 0;
  private heroFatigue = 0;
  private heroMaxFatigue = 1;
  private heroHealChargesRemaining = 0;
  private heroHealCooldownUntil = 0;
  private heroProfile!: HeroCombatProfile;
  private lastDamageTime = 0;
  private gameOver = false;

  private tileSize = 32;
  private sectionWidth = 18;
  private sectionHeight = 14;
  private mapWidth = 0;
  private mapHeight = 0;

  private levelData: number[][] = [];
  private readonly sceneryPropFrames = new Map<string, string>();
  private sections: Section[] = [];
  private startTile!: TilePoint;
  private finishTile!: TilePoint;

  private map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;

  private player!: Phaser.Physics.Arcade.Sprite;
  private playerVisual?: Phaser.GameObjects.Sprite;
  private treasures!: Phaser.Physics.Arcade.StaticGroup;
  private traps!: Phaser.Physics.Arcade.StaticGroup;
  private dynamicTraps!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private finishZone!: Phaser.Physics.Arcade.Sprite;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<
    'W' | 'A' | 'S' | 'D' | 'R' | 'Q' | 'SPACE' | 'SHIFT' | 'E',
    Phaser.Input.Keyboard.Key
  >;

  // Stato combattimento.
  private facing: AttackDirection = 'down';
  private isAttacking = false;
  private isShielding = false;
  private shieldEnergy = 100;
  private readonly shieldEnergyRegenPerMs = 0.014;
  private lastAttackTime = 0;
  private combatAreaDebugGraphic?: Phaser.GameObjects.Graphics;
  private debugAttackAreas: Array<{ area: CombatArea; color: number; until: number; label: string }> = [];
  private readonly combatAreaDebugTexts = new Map<string, Phaser.GameObjects.Text>();
  private lowHealthJuiceArmed = true;
  private healButtonCooldownMs = 0;
  private matchStartedAt = 0;
  private readonly heroAnimationActions = HERO_ACTIONS;
  private readonly monsterAnimationActions = HERO_ACTIONS;
  private heroAnimationAction: HeroAnimationAction = 'idle';
  private heroAnimationKey = '';
  private heroAnimationLockUntil = 0;
  private heroIdleSpecialTimer?: Phaser.Time.TimerEvent;
  private readonly heroIdleSpecialDelayMs = 8000;
  private minigameActive = false;

  private playerBars?: { hp: Phaser.GameObjects.Graphics; mana: Phaser.GameObjects.Graphics; fatigue: Phaser.GameObjects.Graphics };
  private arcadeBodyDebugGraphic?: Phaser.GameObjects.Graphics;

  // Joystick virtuale mobile.
  private joystickPointerId: number | null = null;
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private joystickVector = new Phaser.Math.Vector2(0, 0);
  private joystickRadius = 54;
  private readonly joystickDeadZone = 0.18;
  private readonly mobileJoystickActivationRatio = 0.55;

  // Pulsanti touch mobile.
  private attackButton?: Phaser.GameObjects.Container;
  private specialButton?: Phaser.GameObjects.Container;
  private shieldButton?: Phaser.GameObjects.Container;
  private healButton?: Phaser.GameObjects.Container;
  private attackPointerId: number | null = null;
  private specialPointerId: number | null = null;
  private healPointerId: number | null = null;
  private activeAttackAction: 'attack' | 'special' | null = null;
  private heldAttackAction: 'attack' | 'special' | null = null;
  private heldAttackCount = 0;
  private heldAttackWindowStartedAt = 0;

  constructor(params?: Partial<PhaserGameParams>, eventsService?: PhaserGameEventsService) {
    super({ key: 'GameScene' });
    this.params = { ...this.defaultParams, ...params };
    this.eventsService = eventsService;
  }

  init(data: Partial<PhaserGameParams> & { eventsService?: PhaserGameEventsService } = {}): void {
    this.params = { ...this.defaultParams, ...this.params, ...data };
    this.eventsService = data.eventsService ?? this.eventsService;
  }

  preload(): void {
    if (this.areEnvironmentSpritesEnabled()) {
      this.loadGameEnvironmentAtlases();
      this.loadTreasureAtlases();
    }

    if (this.params.mobileControls) {
      this.loadMobileUiAtlases();
    }

    this.loadMinigameUiAtlases();
    this.loadMinigameButtonAtlases();

    if (this.areHeroSpritesAndAnimationsEnabled()) {
      this.getHeroAtlasEntries().forEach((atlas) => {
        if (!this.textures.exists(atlas.key)) {
          this.load.atlas(atlas.key, atlas.imageUrl, atlas.atlasData);
        }
      });
    }

    if (this.areMonsterSpritesAndAnimationsEnabled()) {
      this.getMonsterAtlasEntries().forEach((atlas) => {
        if (!this.textures.exists(atlas.key)) {
          this.load.atlas(atlas.key, atlas.imageUrl, atlas.atlasData);
        }
      });
    }
  }

  create(): void {
    this.effects = new GameEffectsManager(this);
    // Gli oggetti Graphics vengono distrutti da Phaser a ogni scene.restart().
    // Azzeriamo i riferimenti per ricrearli indipendentemente dal rendering degli sprite.
    this.arcadeBodyDebugGraphic = undefined;
    this.combatAreaDebugGraphic = undefined;
    this.debugAttackAreas = [];
    this.clearCombatAreaDebugTexts();
    this.applySmoothAtlasFilters();
    this.score = 0;
    this.enemiesKilled = 0;
    this.attacksPerformed = 0;
    this.specialsPerformed = 0;
    this.damageDealt = 0;
    this.damageReceived = 0;
    this.damageReceivedEvents = 0;
    this.blocksPerformed = 0;
    this.treasuresCollected = 0;
    this.currentCombo = 0;
    this.heroProfile = this.buildHeroCombatProfile(this.params.hero);
    this.heroHealth = this.heroProfile.currentHealth;
    this.heroMaxHealth = this.heroProfile.maxHealth;
    this.heroMana = this.heroProfile.currentMana;
    this.heroMaxMana = this.heroProfile.maxMana;
    this.heroFatigue = this.heroProfile.currentFatigue;
    this.heroMaxFatigue = this.heroProfile.maxFatigue;
    this.heroHealChargesRemaining = this.heroProfile.healCharges;
    this.heroHealCooldownUntil = 0;
    this.healButtonCooldownMs = this.heroProfile.healCooldownMs;
    this.lowHealthJuiceArmed = true;
    this.matchStartedAt = 0;
    this.lives = this.heroHealth;
    this.lastDamageTime = 0;
    this.gameOver = false;
    this.tileSize = this.params.tileSize;
    this.facing = 'down';
    this.isAttacking = false;
    this.isShielding = false;
    this.shieldEnergy = 100;
    this.lastAttackTime = 0;
    this.attackPointerId = null;
    this.specialPointerId = null;
    this.healPointerId = null;
    this.activeAttackAction = null;
    this.heldAttackAction = null;
    this.heldAttackCount = 0;
    this.minigameActive = false;

    this.eventsService?.setResult(null);
    this.eventsService?.setElapsedMs(0);
    this.emitState('ready');
    this.emitScore();
    this.emitLives();

    this.createThemeTextures();
    this.generateLevelData();
    this.createTilemap();
    this.createEnvironmentSprites();
    this.createGroups();
    this.createMonsterAnimations();
    this.spawnGameplayElements();
    this.createHeroAnimations();
    this.createPlayer();
    this.createCollisions();
    this.createCamera();
    this.createUI();
    this.createInput();

    if (this.params.mobileControls) {
      this.createMobileControls();
    }

    this.emitLowHealthJuiceIfNeeded();
    this.matchStartedAt = this.time.now;
    this.emitState(this.shouldAwaitInitialRunSetupSelection() ? 'paused' : 'playing');
  }

  override update(time: number, delta: number): void {
    if (this.gameOver) return;

    this.emitElapsedMs(time);

    this.handlePlayerMovement();
    this.syncActorVisuals();
    this.handleCombatInput();
    this.updateShield(delta);
    this.updateEnemies(delta);
    this.updateDynamicTraps(time);
    this.updateStatusBars();
    this.updateShieldButtonState();
    this.updateHealButtonState();
    this.drawArcadeBodyDebug();
    this.drawCombatAreaDebug();

    if (this.keys?.R && Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.restartScene();
    }
  }


  // ---------------------------------------------------------------------------
  // Calcolo parametri RPG da HeroItem.
  // ---------------------------------------------------------------------------

  private buildHeroCombatProfile(hero?: HeroItem): HeroCombatProfile {
    const fallbackHero = this.createFallbackHero();
    const source = hero ?? fallbackHero;

    const strength = this.getHeroAttributeValue('Forza', source);
    const dexterity = this.getHeroAttributeValue('Destrezza', source);
    const constitution = this.getHeroAttributeValue('Costituzione', source);
    const intelligence = this.getHeroAttributeValue('Intelligenza', source);
    const wisdom = this.getHeroAttributeValue('Saggezza', source);
    const charisma = this.getHeroAttributeValue('Carisma', source);

    const weapon = this.getPrimaryEquip(source, 'weapon');
    const shield = this.getPrimaryEquip(source, 'shield');
    const equipAttack = this.sumEquipValue(source, 'attack');
    const equipDefense = this.sumEquipValue(source, 'defense');

    const weaponLevel = weapon?.level ?? 0;
    const shieldLevel = shield?.level ?? 0;
    const heroSpeed = this.resolveFiniteNumber(source.velocita, dexterity);

    const maxHealth = Math.max(
      1,
      Math.round(source.heal?.total ?? (100 + constitution * 2 + source.level * 5))
    );
    const currentHealth = Phaser.Math.Clamp(
      Math.round(source.heal?.current ?? maxHealth),
      1,
      maxHealth
    );

    const maxMana = Math.max(
      0,
      Math.round(source.mana?.total ?? (40 + intelligence * 1.4 + wisdom * 0.8))
    );
    const currentMana = Phaser.Math.Clamp(
      Math.round(source.mana?.current ?? maxMana),
      0,
      maxMana
    );

    const maxFatigue = Math.max(
      1,
      Math.round(source.fatigue?.total ?? (70 + charisma * 2 + source.level * 5))
    );
    const currentFatigue = Phaser.Math.Clamp(
      Math.round(source.fatigue?.current ?? 0),
      0,
      maxFatigue
    );

    const heroAttack = this.resolveFiniteNumber(source.attack, 6 + source.level * 1.8 + strength * 1.45 + dexterity * 0.55 + equipAttack * 1.25);
    const multiplier = this.getHeroPowerMultiplier(source);
    const baseAttack = Math.round(heroAttack * multiplier);

    const defense = Math.round(
      this.resolveFiniteNumber(source.defense, 3 + constitution * 0.95 + wisdom * 0.35 + equipDefense * 1.2 + shieldLevel * 2)
    );

    const attackTuning = this.params.combatTuning?.hero?.attack;
    const specialTuning = this.params.combatTuning?.hero?.special;
    const defenseTuning = this.params.combatTuning?.hero?.defense;

    const range = this.resolvePositiveNumber(
      attackTuning?.range,
      Phaser.Math.Clamp(48 + heroSpeed * 0.7 + weaponLevel * 2, 44, 96)
    );
    const cooldown = Phaser.Math.Clamp(520 - heroSpeed * 5 - weaponLevel * 8, 230, 680);
    const arcWidth = this.resolvePositiveNumber(
      attackTuning?.arcWidth,
      Phaser.Math.Clamp(38 + Math.floor(strength / 3), 32, 62)
    );

    const specialDamage = Math.round(
      baseAttack * 1.75 + intelligence * 1.8 + wisdom * 1.15 + equipAttack * 0.65
    );
    const specialManaCost = Math.max(8, Math.round(16 + source.level * 1.5 - wisdom * 0.15));
    const levelHealBonuses = HERO_HEAL_GAMEPLAY_CONFIG.bonusUseEveryLevels > 0
      ? Math.floor(Math.max(0, source.level - 1) / HERO_HEAL_GAMEPLAY_CONFIG.bonusUseEveryLevels)
      : 0;
    const healCharges = Math.max(
      HERO_HEAL_GAMEPLAY_CONFIG.minimumUsesPerRun,
      Math.floor(
        HERO_HEAL_GAMEPLAY_CONFIG.minimumUsesPerRun +
        wisdom * HERO_HEAL_GAMEPLAY_CONFIG.usesPerWisdomPoint +
        levelHealBonuses * HERO_HEAL_GAMEPLAY_CONFIG.bonusUsesPerLevelStep
      )
    );
    const healAmount = Math.max(
      1,
      Math.round(
        maxHealth * HERO_HEAL_GAMEPLAY_CONFIG.maxHealthRatio +
        HERO_HEAL_GAMEPLAY_CONFIG.flatAmount
      )
    );
    const healManaCost = Math.max(
      HERO_HEAL_GAMEPLAY_CONFIG.minimumManaCost,
      Math.round(specialManaCost * HERO_HEAL_GAMEPLAY_CONFIG.manaCostFromSpecialRatio)
    );

    const weaponName = weapon?.name ?? 'Attacco base';

    return {
      heroTitle: source.title,
      level: Math.max(1, source.level ?? 1),
      wisdom,
      maxHealth,
      currentHealth,
      maxMana,
      currentMana,
      maxFatigue,
      currentFatigue,
      healCharges,
      healCooldownMs: HERO_HEAL_GAMEPLAY_CONFIG.cooldownMs,
      healAmount,
      healManaCost,
      attack: {
        label: weaponName,
        damage: Math.max(1, baseAttack),
        range,
        cooldown,
        arcWidth,
        shape: attackTuning?.shape ?? 'rectangle',
        centered: attackTuning?.centered === true,
        effectVariant: this.resolveEffectVariant(attackTuning?.effectVariant, 1, 4),
        effectType: attackTuning?.effectType ?? 'melee-sweep',
        forwardOffset: this.resolveFiniteNumber(attackTuning?.forwardOffset, 0),
        lateralOffset: this.resolveFiniteNumber(attackTuning?.lateralOffset, 0),
        offsetX: this.resolveFiniteNumber(attackTuning?.offsetX, 0),
        offsetY: this.resolveFiniteNumber(attackTuning?.offsetY, 0),
        knockback: Phaser.Math.Clamp(90 + strength * 2 + weaponLevel * 6, 80, 230)
      },
      special: {
        label: 'Colpo speciale',
        damage: Math.max(1, specialDamage),
        range: this.resolvePositiveNumber(specialTuning?.range, Math.round(range * 1.2)),
        cooldown: Math.max(520, cooldown + 220),
        arcWidth: this.resolvePositiveNumber(specialTuning?.arcWidth, Math.round(arcWidth * 1.35)),
        shape: specialTuning?.shape ?? 'rectangle',
        centered: specialTuning?.centered === true,
        effectVariant: this.resolveEffectVariant(specialTuning?.effectVariant, 1, 4),
        effectType: specialTuning?.effectType ?? (specialTuning?.shape === 'circle' ? 'area-burst' : 'beam'),
        forwardOffset: this.resolveFiniteNumber(specialTuning?.forwardOffset, 0),
        lateralOffset: this.resolveFiniteNumber(specialTuning?.lateralOffset, 0),
        offsetX: this.resolveFiniteNumber(specialTuning?.offsetX, 0),
        offsetY: this.resolveFiniteNumber(specialTuning?.offsetY, 0),
        knockback: Phaser.Math.Clamp(150 + intelligence * 2 + wisdom, 120, 280),
        manaCost: specialManaCost
      },
      defense,
      defenseRange: this.resolvePositiveNumber(defenseTuning?.range, 24),
      defenseArcWidth: this.resolvePositiveNumber(defenseTuning?.arcWidth, 52),
      defenseShape: defenseTuning?.shape ?? 'rectangle',
      defenseCentered: defenseTuning?.centered === true,
      defenseEffectVariant: this.resolveEffectVariant(defenseTuning?.effectVariant, 1, 2),
      defenseEffectType: defenseTuning?.effectType ?? 'area-burst',
      defenseForwardOffset: this.resolveFiniteNumber(defenseTuning?.forwardOffset, 0),
      defenseLateralOffset: this.resolveFiniteNumber(defenseTuning?.lateralOffset, 0),
      defenseOffsetX: this.resolveFiniteNumber(defenseTuning?.offsetX, 0),
      defenseOffsetY: this.resolveFiniteNumber(defenseTuning?.offsetY, 0),
      shieldEfficiency: Phaser.Math.Clamp(0.45 + equipDefense / 140 + shieldLevel * 0.025, 0.45, 0.9),
      shieldDrainPerSecond: Phaser.Math.Clamp(28 - wisdom * 0.3 - shieldLevel, 12, 32),
      manaRegenPerSecond: Phaser.Math.Clamp(1.4 + wisdom * 0.08 + intelligence * 0.05, 1, 5)
    };
  }

  private createFallbackHero(): HeroItem {
    const progress = (descr: string, current: number, total: number): Progress => ({ descr, current, total });

    return {
      itemType: 'hero',
      id: 'fallback-hero',
      title: 'Eroe',
      description: 'Eroe di default usato se Angular non passa HeroItem.',
      level: 1,
	  mastery: 1,
	  variant: 0,
      heal: progress('Vita', this.params.initialLives, this.params.initialLives),
      mana: progress('Mana', 30, 30),
      fatigue: progress('Stanchezza', 0, 30),
      experience: progress('Esperienza', 0, 100),
      stats: [
        this.createFallbackAttribute('Forza', 'Forza', 10),
        this.createFallbackAttribute('Destrezza', 'Destrezza', 10),
        this.createFallbackAttribute('Costituzione', 'Costituzione', 10),
        this.createFallbackAttribute('Intelligenza', 'Intelligenza', 10),
        this.createFallbackAttribute('Saggezza', 'Saggezza', 10),
        this.createFallbackAttribute('Carisma', 'Carisma', 10)
      ],
      equip: [],
      frame: { name: 'hero', effect: 'none' }
    };
  }

  private createFallbackAttribute(id: AttributeType, title: string, value: number) {
    return {
      id,
      title,
      description: title,
      bonus: 0,
      malus: 0,
      progress: { descr: title, current: value, total: 100 }
    };
  }

  private getHeroAttributeValue(title: string, hero: HeroItem = this.params.hero ?? this.createFallbackHero()): number {
    const normalized = this.normalizeText(title);

    const stat = hero.stats?.find(item =>
      this.normalizeText(item.title) === normalized ||
      this.normalizeText(item.id) === normalized
    );

    return Math.max(0, Number(stat?.progress?.current ?? 0) + Number(stat?.bonus ?? 0) - Number(stat?.malus ?? 0));
  }

  private getPrimaryEquip(hero: HeroItem, equipTypeId: string): EquipItem | undefined {
    return hero.equip?.find(item => this.getEquipTypeId(item) === equipTypeId);
  }

  private getEquipTypeId(item: EquipItem): string {
    return this.normalizeText(item.type?.id || item.type?.title || '');
  }

  private sumEquipValue(hero: HeroItem, key: 'attack' | 'defense'): number {
    return (hero.equip ?? []).reduce((total, item) => {
      const duration = item.duration;
      const isUsable = !duration || duration.current > 0;
      return isUsable ? total + Number(item[key] ?? 0) : total;
    }, 0);
  }

  private getHeroPowerMultiplier(hero: HeroItem): number {
    return (hero.powerMultipliers ?? []).reduce((total, item) => {
      const value = Number(item.value ?? 0);
      return total + (Number.isFinite(value) ? value : 0);
    }, 1);
  }

  private resolvePositiveNumber(value: number | undefined, fallback: number): number {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
  }

  private resolveFiniteNumber(value: number | undefined, fallback: number): number {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  private resolveEffectVariant(value: number | undefined, minimum: number, maximum: number): number {
    return Phaser.Math.Clamp(Math.round(this.resolveFiniteNumber(value, minimum)), minimum, maximum);
  }

  private resolveCombatEffectType(value: unknown, fallback: CombatEffectType): CombatEffectType {
    return value === 'melee-sweep' || value === 'area-burst' || value === 'beam' || value === 'projectile' || value === 'breath'
      ? value
      : fallback;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // ---------------------------------------------------------------------------
  // Comunicazione Phaser -> Angular.
  // ---------------------------------------------------------------------------

  private emitScore(): void {
    this.eventsService?.setScore(this.score);
  }

  private emitElapsedMs(currentTimeMs: number): void {
    const elapsedMs = this.matchStartedAt > 0 ? currentTimeMs - this.matchStartedAt : 0;
    this.eventsService?.setElapsedMs(elapsedMs);
  }

  private emitLives(): void {
    const health = this.lives;
    const mana = Math.floor(this.heroMana);
    const fatigue = Math.floor(this.heroFatigue);

    if (this.eventsService?.lives$.value !== health) {
      this.eventsService?.setLives(health);
    }

    if (this.eventsService?.mana$.value !== mana) {
      this.eventsService?.setMana(mana);
    }

    if (this.eventsService?.fatigue$.value !== fatigue) {
      this.eventsService?.setFatigue(fatigue);
    }

    this.emitExperience();
  }

  private emitExperience(): void {
    const baseProgress = this.params.hero?.experience ?? this.createFallbackHero().experience;
    if (!baseProgress) return;

    const previewGain = Math.max(
      0,
      Math.round(this.score / 12 + this.enemiesKilled * 8 + this.treasuresCollected * 5)
    );
    const nextExperience: Progress = {
      ...baseProgress,
      current: Math.min(baseProgress.total, Math.max(0, baseProgress.current + previewGain)),
    };
    const current = this.eventsService?.experience$.value;
    if (!current || current.current !== nextExperience.current || current.total !== nextExperience.total) {
      this.eventsService?.setExperience(nextExperience);
    }
  }

  private emitState(state: PhaserSceneState): void {
    this.eventsService?.setState(state);
  }

  private emitResult(result: GameResult): void {
    this.eventsService?.setResult(result);
  }

  private emitGameplayEvent(
    type: PhaserGameplayEventType,
    message: string,
    values: PhaserGameplayRuntimeEvent['values'],
  ): void {
    const event: PhaserGameplayRuntimeEvent = {
      type,
      message,
      values,
      juiceEffect: PHASER_SCENE_CONFIG.gameplayEventJuice[type] ?? null,
    };

    if (PHASER_SCENE_CONFIG.debugGameplayEvents) {
      console.debug('[GameplayEvent]', type, message, values);
    }

    this.eventsService?.emitGameplayEvent(event);
  }

  public restartScene(): void {
    this.scene.restart({
      ...this.params,
      eventsService: this.eventsService
    });
  }

  public launchDebugMinigame(type: GameEventType): void {
    if (!this.usesEventMinigames()) {
      console.info('[MinigameDebug] Available only in adventure/event mode.');
      return;
    }

    const event = this.createDebugEvent(type);
    const contextSprite = this.physics.add.sprite(this.player.x, this.player.y, this.getTexturePrefix() + 'treasure');
    contextSprite.setVisible(false);
    this.launchEventMinigame(event, {
      type,
      sprite: contextSprite,
    });
  }

  // ---------------------------------------------------------------------------
  // Tema e texture generate a runtime.
  // ---------------------------------------------------------------------------

  private getTheme(): GameTheme {
    const allowed: GameTheme[] = ['Dungeon', 'Bosco', 'Canyon', 'Montagna', 'Deserto'];
    return allowed.includes(this.params.theme) ? this.params.theme : 'Dungeon';
  }

  private getThemePalette(): Record<string, number> {
    const palettes: Record<GameTheme, Record<string, number>> = {
      Dungeon: {
        floor: 0x4b4b5c, wall: 0x1f1f2e, detail: 0x707084,
        player: 0x5dade2, treasure: 0xf1c40f, trap: 0xe74c3c,
        enemy: 0x9b59b6, finish: 0x2ecc71, joystick: 0xffffff,
        attack: 0xf97316, shield: 0x38bdf8
      },
      Bosco: {
        floor: 0x4f8f3a, wall: 0x254d1f, detail: 0x7fb069,
        player: 0x3498db, treasure: 0xffd166, trap: 0x6b2f1a,
        enemy: 0x8e5a2a, finish: 0xa3e635, joystick: 0xffffff,
        attack: 0xf97316, shield: 0x38bdf8
      },
      Canyon: {
        floor: 0xb5651d, wall: 0x5f2f14, detail: 0xd98b3a,
        player: 0x48cae4, treasure: 0xffba08, trap: 0xd00000,
        enemy: 0x6d597a, finish: 0x90be6d, joystick: 0xffffff,
        attack: 0xf97316, shield: 0x38bdf8
      },
      Montagna: {
        floor: 0x8d99ae, wall: 0x2b2d42, detail: 0xcbd5e1,
        player: 0x38bdf8, treasure: 0xfacc15, trap: 0xef4444,
        enemy: 0x334155, finish: 0x22c55e, joystick: 0xffffff,
        attack: 0xf97316, shield: 0x38bdf8
      },
      Deserto: {
        floor: 0xd6b56d, wall: 0x8a5a24, detail: 0xf3d58b,
        player: 0x0ea5e9, treasure: 0xf59e0b, trap: 0xdc2626,
        enemy: 0x92400e, finish: 0x84cc16, joystick: 0xffffff,
        attack: 0xf97316, shield: 0x38bdf8
      }
    };

    return palettes[this.getTheme()];
  }

  private createThemeTextures(): void {
    const p = this.getThemePalette();
    const s = this.tileSize;
    const texturePrefix = this.getTexturePrefix();

    const g = this.add.graphics();

    // Tileset: tile 0 = pavimento, tile 1 = muro, tile 2 = spazio oggetto bloccante.
    g.fillStyle(p['floor'], 1);
    g.fillRect(0, 0, s, s);
    g.lineStyle(1, p['detail'], 0.35);
    g.strokeRect(3, 3, s - 6, s - 6);

    g.fillStyle(p['wall'], 1);
    g.fillRect(s, 0, s, s);
    g.lineStyle(2, p['detail'], 0.45);
    g.strokeRect(s + 4, 4, s - 8, s - 8);

    g.fillStyle(p['floor'], 1);
    g.fillRect(s * 2, 0, s, s);
    g.lineStyle(2, p['wall'], 0.45);
    g.strokeRoundedRect(s * 2 + 6, 6, s - 12, s - 12, 4);

    this.refreshTexture(texturePrefix + 'tiles', s * 3, s, g);
    g.clear();

    // Eroe.
    g.fillStyle(p['player'], 1);
    g.fillCircle(16, 16, 13);
    g.lineStyle(3, 0xffffff, 0.75);
    g.strokeCircle(16, 16, 13);
    g.fillStyle(0xffffff, 0.7);
    g.fillTriangle(16, 4, 12, 13, 20, 13);
    this.refreshTexture(texturePrefix + 'player', 32, 32, g);
    g.clear();

    // Tesoro.
    g.fillStyle(p['treasure'], 1);
    g.fillCircle(12, 12, 10);
    g.lineStyle(2, 0xffffff, 0.55);
    g.strokeCircle(12, 12, 10);
    this.refreshTexture(texturePrefix + 'treasure', 24, 24, g);
    g.clear();

    // Tesori specifici per tipologia.
    g.fillStyle(p['treasure'], 1);
    g.fillCircle(14, 14, 11);
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(14, 14, 11);
    this.refreshTexture(texturePrefix + 'treasure-coin', 28, 28, g);
    g.clear();

    g.fillStyle(0x7c3aed, 1);
    g.fillTriangle(14, 2, 26, 14, 14, 26);
    g.fillTriangle(14, 2, 2, 14, 14, 26);
    g.lineStyle(2, 0xffffff, 0.45);
    g.strokeTriangle(14, 2, 26, 14, 14, 26);
    g.strokeTriangle(14, 2, 2, 14, 14, 26);
    this.refreshTexture(texturePrefix + 'treasure-gem', 28, 28, g);
    g.clear();

    g.fillStyle(0xb45309, 1);
    g.fillRoundedRect(4, 7, 26, 20, 4);
    g.fillStyle(0xfacc15, 0.9);
    g.fillRect(14, 11, 6, 8);
    g.lineStyle(2, 0xffffff, 0.35);
    g.strokeRoundedRect(4, 7, 26, 20, 4);
    this.refreshTexture(texturePrefix + 'treasure-chest', 34, 34, g);
    g.clear();

    g.fillStyle(0xef4444, 1);
    g.fillCircle(10, 18, 7);
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(20, 10, 6);
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(24, 20, 5);
    this.refreshTexture(texturePrefix + 'treasure-resource', 32, 32, g);
    g.clear();

    // Trappola.
    g.fillStyle(p['trap'], 1);
    g.fillTriangle(16, 2, 30, 30, 2, 30);
    g.lineStyle(2, 0x000000, 0.25);
    g.strokeTriangle(16, 2, 30, 30, 2, 30);
    this.refreshTexture(texturePrefix + 'trap', 32, 32, g);
    g.clear();

    // Oggetto scenico generico usato quando gli atlas ambientali sono disabilitati.
    g.fillStyle(p['detail'], 1);
    g.fillRoundedRect(5, 7, 22, 18, 5);
    g.lineStyle(2, p['wall'], 0.45);
    g.strokeRoundedRect(5, 7, 22, 18, 5);
    this.refreshTexture(texturePrefix + 'prop', 32, 32, g);
    g.clear();

    // Mostro base: il tipo specifico viene differenziato con tint, scala e vita.
    g.fillStyle(p['enemy'], 1);
    g.fillCircle(16, 16, 13);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(11, 13, 3);
    g.fillCircle(21, 13, 3);
    g.fillStyle(0x000000, 1);
    g.fillCircle(11, 13, 1.4);
    g.fillCircle(21, 13, 1.4);
    g.lineStyle(2, 0xffffff, 0.35);
    g.strokeCircle(16, 16, 13);
    this.refreshTexture(texturePrefix + 'monster', 32, 32, g);
    g.clear();

    // Arrivo.
    g.fillStyle(p['finish'], 1);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(3, 0xffffff, 0.75);
    g.strokeRect(3, 3, 26, 26);
    this.refreshTexture(texturePrefix + 'finish', 32, 32, g);

    g.destroy();
  }

  private refreshTexture(key: string, width: number, height: number, graphics: Phaser.GameObjects.Graphics): void {
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    graphics.generateTexture(key, width, height);
  }

  private getTexturePrefix(): string {
    return `topdown-${this.getTheme()}-`;
  }

  private getSpriteSizing(): PhaserSceneSpriteSizingParams {
    return this.params.spriteSizing;
  }

  private getHeroAtlasScale(direction: HeroSpriteDirection = this.getHeroDirection()): number {
    if (this.params.hero) {
      return Math.max(0.01, getHeroSpriteAtlasSet(this.params.hero).directions[direction].scale);
    }

    return Math.max(0.01, this.params.heroAtlasDirections?.[direction]?.scale ?? 0.38);
  }

  private getMonsterAtlasScale(monsterType: MonsterType, direction: MonsterSpriteDirection = 'down'): number {
    return Math.max(0.01, getMonsterSpriteAtlasSet(monsterType).directions[direction].scale);
  }

  private getHeroAtlasCollisionBody(): PhaserSceneSpriteSizingParams['heroAtlasCollisionBody'] {
    const spriteSizing = this.getSpriteSizing();
    const heroId = this.params.hero?.id;
    const configuredHeroId = this.findConfiguredHeroId(spriteSizing.heroAtlasCollisionBodyByHeroId, heroId);
    return configuredHeroId
      ? spriteSizing.heroAtlasCollisionBodyByHeroId[configuredHeroId]
      : spriteSizing.heroAtlasCollisionBody;
  }

  private findConfiguredHeroId(config: Record<string, unknown>, heroId?: string): string | undefined {
    return heroId && Object.keys(config).find((id) => heroId === id || heroId.startsWith(`${id}-`));
  }

  private getBackgroundFrameVariants(): PhaserBackgroundFrameVariants {
    return this.params.backgroundFrameVariants;
  }

  private getTreasureConfig(): PhaserTreasureConfig {
    return this.params.treasureConfig;
  }

  private getMobileControlsVisual(): PhaserMobileControlsVisualConfig {
    return this.params.mobileControlsVisual ?? PHASER_SCENE_CONFIG.mobileControlsVisual;
  }

  public updateEventMinigameMode(config: NonNullable<PhaserGameParams["eventMinigameMode"]>): void {
    this.params = {
      ...this.params,
      eventMinigameMode: config,
    };
  }

  public applyDebugEffectsTuning(tuning: HackSlashEffectTuning): void {
    this.effects = new GameEffectsManager(
      this,
      JSON.parse(JSON.stringify(tuning)) as HackSlashEffectTuning,
    );
  }

  public playDebugEffect(
    effectKey: GameEffectKey,
    targetId: 'hero' | 'monster' | 'center',
    options?: GameEffectOptions,
  ): boolean {
    if (!this.effects) {
      return false;
    }

    if (targetId === 'center') {
      const x = this.cameras.main.worldView.centerX;
      const y = this.cameras.main.worldView.centerY;
      const anchor = this.add.zone(x, y, 1, 1);
      this.effects.play(effectKey, anchor, {
        ...options,
        x,
        y,
        followTarget: false,
        direction: options?.direction ?? this.facing,
      });
      anchor.destroy();
      return true;
    }

    const target = targetId === 'monster'
      ? this.getNearestActiveEnemy()
      : this.player;

    if (!target?.active) {
      return false;
    }

    const resolvedDirection = targetId === 'monster'
      ? ((target as EnemySprite).monsterFacing ?? 'left')
      : this.facing;

    this.effects.play(effectKey, target, {
      ...options,
      direction: options?.direction ?? resolvedDirection,
    });

    return true;
  }

  private getUiThemeId(): PhaserGameParams['uiThemeId'] {
    return this.params.uiThemeId ?? 'fantasy_bg';
  }

  private getNearestActiveEnemy(): EnemySprite | undefined {
    let nearestEnemy: EnemySprite | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.enemies?.children.iterate((child) => {
      const enemy = child as EnemySprite | undefined;
      if (!enemy?.active || !this.player?.active) {
        return true;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }

      return true;
    });

    return nearestEnemy;
  }

  private loadGameEnvironmentAtlases(): void {
    Object.values(GAME_ATLAS).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });
  }

  private applySmoothAtlasFilters(): void {
    this.getSmoothAtlasKeys().forEach((textureKey) => this.applyLinearFilterToTexture(textureKey));
  }

  private getSmoothAtlasKeys(): string[] {
    const uiThemeId = this.getUiThemeId();

    return [...new Set([
      GAME_ATLAS.actions.key,
      ...Object.values(resolveTreasureAtlas(uiThemeId)).map((atlas) => atlas.key),
      ...Object.values(resolveMobileUiAtlas(uiThemeId)).map((atlas) => atlas.key),
      ...Object.values(resolveMinigameUiAtlas(uiThemeId)).map((atlas) => atlas.key),
      ...Object.values(resolveMinigameButtonAtlas(uiThemeId)).map((atlas) => atlas.key),
      ...this.getHeroAtlasEntries().map((atlas) => atlas.key),
      ...this.getMonsterAtlasEntries().map((atlas) => atlas.key),
    ])];
  }

  private applyLinearFilterToTexture(textureKey: string): void {
    if (!this.textures.exists(textureKey)) {
      return;
    }

    this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  private getHeroAtlasEntries(): Array<{ direction: HeroSpriteDirection; key: string; imageUrl: string; atlasData: Phaser.Types.Loader.FileTypes.JSONFileConfig | string | object }> {
    if (this.params.hero) {
      const atlasSet = getHeroSpriteAtlasSet(this.params.hero);
      return (Object.entries(atlasSet.directions) as Array<[HeroSpriteDirection, typeof atlasSet.directions.down]>).map(([direction, atlas]) => ({
        direction,
        key: atlas.key,
        imageUrl: atlas.imageUrl,
        atlasData: atlas.atlasData,
      }));
    }

    const directionalAtlases = this.params.heroAtlasDirections;

    if (directionalAtlases?.down || directionalAtlases?.up || directionalAtlases?.horiz) {
      return (Object.entries(directionalAtlases) as Array<[HeroSpriteDirection, NonNullable<typeof directionalAtlases.down>]>).map(([direction, atlas]) => ({
        direction,
        key: atlas.key,
        imageUrl: atlas.imageUrl,
        atlasData: atlas.atlasData
      }));
    }

    return [{
      direction: 'down',
      key: this.params.heroAtlasKey || 'hero-down-set1',
      imageUrl: this.params.heroAtlasImage,
      atlasData: this.params.heroAtlasJson
    }];
  }

  private getHeroAtlasKey(direction: HeroSpriteDirection = this.getHeroDirection()): string {
    if (this.params.hero) {
      return getHeroSpriteAtlasSet(this.params.hero).directions[direction].key;
    }

    return this.params.heroAtlasDirections?.[direction]?.key || this.params.heroAtlasKey || 'hero-down-set1';
  }

  private getMonsterAtlasEntries(): Array<{ direction: MonsterSpriteDirection; key: string; imageUrl: string; atlasData: Phaser.Types.Loader.FileTypes.JSONFileConfig | string | object }> {
    return MONSTER_SPRITE_ATLAS_SETS.flatMap((set) =>
      (Object.entries(set.directions) as Array<[MonsterSpriteDirection, typeof set.directions.down]>).map(([direction, atlas]) => ({
        direction,
        key: atlas.key,
        imageUrl: atlas.imageUrl,
        atlasData: atlas.atlasData
      }))
    );
  }

  private getMonsterAtlasKey(monsterType: MonsterType, direction: MonsterSpriteDirection): string {
    return getMonsterSpriteAtlasSet(monsterType).directions[direction].key;
  }

  private getHeroDirection(): HeroSpriteDirection {
    if (this.facing === 'up') return 'up';
    if (this.facing === 'left' || this.facing === 'right') return 'horiz';
    return 'down';
  }

  private heroAnimKey(
    action: HeroAnimationAction,
    direction: HeroSpriteDirection = this.getHeroDirection(),
    fullSequence = false,
  ): string {
    return `${this.getHeroAtlasKey(direction)}-${action}${fullSequence ? '-full' : ''}`;
  }

  private areEnvironmentSpritesEnabled(): boolean {
    return this.params.useSpritesAndAnimations;
  }

  private areHeroSpritesAndAnimationsEnabled(): boolean {
    return this.params.useSpritesAndAnimations && this.params.useHeroAtlas;
  }

  private areMonsterSpritesAndAnimationsEnabled(): boolean {
    return this.params.useSpritesAndAnimations && this.params.useMonsterAtlas !== false;
  }

  private isHeroAtlasAvailable(direction: HeroSpriteDirection = this.getHeroDirection()): boolean {
    if (!this.areHeroSpritesAndAnimationsEnabled()) return false;

    const key = this.getHeroAtlasKey(direction);
    if (!this.textures.exists(key)) return false;

    const texture = this.textures.get(key);
    return texture.has('standing0001');
  }

  private isMonsterAtlasAvailable(monsterType: MonsterType, direction: MonsterSpriteDirection): boolean {
    if (!this.areMonsterSpritesAndAnimationsEnabled()) return false;

    const key = this.getMonsterAtlasKey(monsterType, direction);
    if (!this.textures.exists(key)) return false;

    const texture = this.textures.get(key);
    return texture.has('standing0001');
  }

  private createHeroAnimations(): void {
    if (!this.isHeroAtlasAvailable()) return;

    this.getHeroAtlasEntries().forEach((atlas) => {
      if (!this.isHeroAtlasAvailable(atlas.direction)) return;

      this.heroAnimationActions.forEach((config) => {
        const variants = [
          { key: this.heroAnimKey(config.id, atlas.direction, false), repeat: config.repeat },
          { key: this.heroAnimKey(config.id, atlas.direction, true), repeat: config.id === 'idle' ? -1 : 0 },
        ];

        variants.forEach((variant) => {
          if (this.anims.exists(variant.key)) return;

          this.anims.create({
            key: variant.key,
            frames: this.anims.generateFrameNames(atlas.key, {
              prefix: config.prefix,
              start: config.start,
              end: config.end,
              zeroPad: config.zeroPad ?? 4,
              suffix: config.suffix ?? ''
            }),
            frameRate: config.frameRate,
            duration: config.duration || undefined,
            delay: config.delay,
            repeat: variant.repeat,
            repeatDelay: config.repeatDelay
          });
        });
      });
    });
  }

  private createMonsterAnimations(): void {
    this.getMonsterAtlasEntries().forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) return;

      this.monsterAnimationActions.forEach((config) => {
        const variants = [
          { key: `${atlas.key}-${config.id}`, repeat: config.repeat },
          { key: `${atlas.key}-${config.id}-full`, repeat: config.id === 'idle' ? -1 : 0 },
        ];

        variants.forEach((variant) => {
          if (this.anims.exists(variant.key)) return;

          this.anims.create({
            key: variant.key,
            frames: this.anims.generateFrameNames(atlas.key, {
              prefix: config.prefix,
              start: config.start,
              end: config.end,
              zeroPad: config.zeroPad ?? 4,
              suffix: config.suffix ?? ''
            }),
            frameRate: config.frameRate,
            duration: config.duration || undefined,
            delay: config.delay,
            repeat: variant.repeat,
            repeatDelay: config.repeatDelay
          });
        });
      });
    });
  }

  private playHeroAnimation(
    action: HeroAnimationAction,
    force = false,
    lockMs = 0,
    options?: { fullSequence?: boolean },
  ): void {
    const visual = this.playerVisual;
    if (!this.player || !visual || !this.isHeroAtlasAvailable()) return;

    if (action !== 'idle') {
      this.cancelHeroIdleSpecialTimer();
    }

    const now = this.time.now;
    if (!force && now < this.heroAnimationLockUntil && action !== this.heroAnimationAction) {
      return;
    }

    const direction = this.getHeroDirection();
    const atlasKey = this.getHeroAtlasKey(direction);
    const key = this.heroAnimKey(action, direction, Boolean(options?.fullSequence && action !== 'idle'));
    if (!this.anims.exists(key)) return;

    const isSameAnimation = this.heroAnimationAction === action && this.heroAnimationKey === key;
    if (!force && isSameAnimation && visual.anims.isPlaying) {
      visual.setFlipX(this.facing === 'left');
      if (action === 'idle') this.startHeroIdleSpecialTimer();
      return;
    }

    const textureChanged = visual.texture.key !== atlasKey;
    const scale = this.getHeroAtlasScale(direction);
    const scaleChanged = visual.scaleX !== scale || visual.scaleY !== scale;
    if (textureChanged) {
      visual.setTexture(atlasKey, 'standing0001');
    }
    if (scaleChanged) {
      visual.setScale(scale);
    }

    this.syncVisualToBody(this.player, visual, this.getHeroAtlasCollisionBody());
    visual.setFlipX(this.facing === 'left');

    this.heroAnimationAction = action;
    this.heroAnimationKey = key;
    this.heroAnimationLockUntil = lockMs > 0 ? now + lockMs : 0;
    visual.play(key, force);

    if (action === 'idle') this.startHeroIdleSpecialTimer();
  }

  private startHeroIdleSpecialTimer(): void {
    if (this.heroIdleSpecialTimer || !this.player || this.isAttacking || this.isShielding || this.activeAttackAction) return;

    this.heroIdleSpecialTimer = this.time.delayedCall(this.heroIdleSpecialDelayMs, () => {
      this.heroIdleSpecialTimer = undefined;

      if (
        !this.player?.active ||
        this.heroAnimationAction !== 'idle' ||
        this.isAttacking ||
        this.isShielding ||
        this.activeAttackAction
      ) {
        return;
      }

      this.playHeroActionAnimation('special', 1400);
    });
  }

  private cancelHeroIdleSpecialTimer(): void {
    this.heroIdleSpecialTimer?.remove(false);
    this.heroIdleSpecialTimer = undefined;
  }

  private playHeroActionAnimation(
    action: 'attack' | 'special' | 'hit' | 'shield',
    lockMs = 320,
    options?: { fullSequence?: boolean },
  ): void {
    if (!this.isHeroAtlasAvailable()) return;

    const visual = this.playerVisual;
    if (!visual) return;
    visual.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    this.playHeroAnimation(action, true, lockMs, { fullSequence: options?.fullSequence ?? true });

    visual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.heroAnimationLockUntil = 0;
      this.updateHeroSpriteAnimation();
    });
  }

  private updateHeroSpriteAnimation(): void {
    if (!this.player || !this.isHeroAtlasAvailable()) return;

    this.playerVisual?.setFlipX(this.facing === 'left');

    if (this.activeAttackAction) {
      this.playHeroAnimation(this.activeAttackAction === 'special' ? 'attack' : this.activeAttackAction);
      return;
    }

    if (this.isAttacking) return;

    if (this.isShielding) {
      this.playHeroAnimation('shield');
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const moving = Boolean(body && (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5));
    this.playHeroAnimation(moving ? 'run' : 'idle');
  }

  private getEnemyDirection(enemy: EnemySprite): MonsterSpriteDirection {
    const facing = enemy.monsterFacing ?? 'down';
    if (facing === 'up') return 'up';
    if (facing === 'left' || facing === 'right') return 'horiz';
    return 'down';
  }

  private syncEnemyFacingFromVelocity(enemy: EnemySprite): void {
    const body = enemy.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    if (Math.abs(body.velocity.x) > Math.abs(body.velocity.y) && Math.abs(body.velocity.x) > 5) {
      enemy.monsterFacing = body.velocity.x >= 0 ? 'right' : 'left';
      return;
    }

    if (Math.abs(body.velocity.y) > 5) {
      enemy.monsterFacing = body.velocity.y >= 0 ? 'down' : 'up';
    }
  }

  private enemyAnimKey(
    enemy: EnemySprite,
    action: HeroAnimationAction,
    direction: MonsterSpriteDirection = this.getEnemyDirection(enemy),
    fullSequence = false,
  ): string {
    return `${this.getMonsterAtlasKey(enemy.monsterType, direction)}-${action}${fullSequence ? '-full' : ''}`;
  }

  private playEnemyAnimation(
    enemy: EnemySprite,
    action: HeroAnimationAction,
    force = false,
    lockMs = 0,
    options?: { fullSequence?: boolean },
  ): void {
    const visual = this.getEnemyVisual(enemy);
    if (!visual) return;
    const direction = this.getEnemyDirection(enemy);
    if (!this.isMonsterAtlasAvailable(enemy.monsterType, direction)) return;

    const now = this.time.now;
    const lockUntil = Number(enemy.getData('animationLockUntil') ?? 0);
    const currentAction = enemy.getData('animationAction') as HeroAnimationAction | undefined;

    if (!force && now < lockUntil && action !== currentAction) {
      return;
    }

    const atlasKey = this.getMonsterAtlasKey(enemy.monsterType, direction);
    const key = this.enemyAnimKey(enemy, action, direction, Boolean(options?.fullSequence && action !== 'idle'));
    if (!this.anims.exists(key)) return;

    const currentKey = String(enemy.getData('animationKey') ?? '');
    const isSameAnimation = currentAction === action && currentKey === key;
    if (!force && isSameAnimation && visual.anims.isPlaying) {
      visual.setFlipX(enemy.monsterFacing === 'left');
      return;
    }

    const textureChanged = visual.texture.key !== atlasKey;
    const scale = this.getMonsterAtlasScale(enemy.monsterType, direction);
    const scaleChanged = visual.scaleX !== scale || visual.scaleY !== scale;
    if (textureChanged) {
      visual.setTexture(atlasKey, 'standing0001');
    }
    if (scaleChanged) {
      visual.setScale(scale);
    }

    this.syncVisualToBody(enemy, visual, this.getSpriteSizing().monsterAtlasCollisionBody[enemy.monsterType]);
    visual.setFlipX(enemy.monsterFacing === 'left');
    enemy.setData('animationAction', action);
    enemy.setData('animationKey', key);
    enemy.setData('animationLockUntil', lockMs > 0 ? now + lockMs : 0);
    visual.play(key, force);
  }

  private playEnemyActionAnimation(
    enemy: EnemySprite,
    action: 'attack' | 'special' | 'hit' | 'shield',
    lockMs = 320,
    options?: { fullSequence?: boolean },
  ): void {
    if (!this.isMonsterAtlasAvailable(enemy.monsterType, this.getEnemyDirection(enemy))) return;

    const visual = this.getEnemyVisual(enemy);
    if (!visual) return;
    visual.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    this.playEnemyAnimation(enemy, action, true, lockMs, { fullSequence: options?.fullSequence ?? true });

    visual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      enemy.setData('animationLockUntil', 0);
      this.updateEnemySpriteAnimation(enemy);
    });
  }

  private updateEnemySpriteAnimation(enemy: EnemySprite): void {
    if (!enemy.active || !this.isMonsterAtlasAvailable(enemy.monsterType, this.getEnemyDirection(enemy))) return;

    this.syncEnemyFacingFromVelocity(enemy);
    this.getEnemyVisual(enemy)?.setFlipX(enemy.monsterFacing === 'left');

    if (Boolean(enemy.getData('isShielding'))) {
      this.playEnemyAnimation(enemy, 'shield');
      return;
    }

    const body = enemy.body as Phaser.Physics.Arcade.Body | null;
    const moving = Boolean(body && (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5));
    this.playEnemyAnimation(enemy, moving ? 'run' : 'idle');
  }

  private faceEnemyTowardPlayer(enemy: EnemySprite): void {
    if (!this.player?.active) return;

    const deltaX = this.player.x - enemy.x;
    const deltaY = this.player.y - enemy.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      enemy.monsterFacing = deltaX >= 0 ? 'right' : 'left';
      return;
    }

    enemy.monsterFacing = deltaY >= 0 ? 'down' : 'up';
  }

  // ---------------------------------------------------------------------------
  // Generazione mappa procedurale a sezioni.
  // ---------------------------------------------------------------------------

  private generateLevelData(): void {
    const sectionCount = Phaser.Math.Clamp(Math.floor(this.params.sections), 2, 30);

    this.sectionWidth = Phaser.Math.Clamp(
      Math.floor(Number(this.params.sectionWidth) || PHASER_SCENE_CONFIG.sectionWidth),
      14,
      60,
    );
    this.sectionHeight = Phaser.Math.Clamp(
      Math.floor(Number(this.params.sectionHeight) || PHASER_SCENE_CONFIG.sectionHeight),
      11,
      40,
    );
    this.mapWidth = sectionCount * this.sectionWidth;
    this.mapHeight = this.sectionHeight;

    this.levelData = Array.from({ length: this.mapHeight }, () =>
      Array.from({ length: this.mapWidth }, () => WALL_TILE)
    );
    this.sceneryPropFrames.clear();

    this.sections = [];

    for (let i = 0; i < sectionCount; i++) {
      const baseX = i * this.sectionWidth;
      const roomW = Phaser.Math.Between(10, Math.min(14, this.sectionWidth - 4));
      const roomH = Phaser.Math.Between(7, Math.min(10, this.sectionHeight - 4));
      const roomX = baseX + Phaser.Math.Between(2, this.sectionWidth - roomW - 2);
      const roomY = Phaser.Math.Between(2, this.sectionHeight - roomH - 2);

      const section: Section = {
        index: i,
        x: roomX,
        y: roomY,
        w: roomW,
        h: roomH,
        centerX: Math.floor(roomX + roomW / 2),
        centerY: Math.floor(roomY + roomH / 2)
      };

      this.carveRoom(section);
      this.sections.push(section);

      if (i > 0) {
        const prev = this.sections[i - 1];
        this.carveCorridor(prev.centerX, prev.centerY, section.centerX, section.centerY);
      }
    }

    this.startTile = {
      x: this.sections[0].centerX,
      y: this.sections[0].centerY
    };

    const last = this.sections[this.sections.length - 1];
    this.finishTile = {
      x: last.centerX,
      y: last.centerY
    };

    this.generateSceneryPropLayout();
  }

  private loadTreasureAtlases(): void {
    Object.values(resolveTreasureAtlas(this.getUiThemeId())).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });
  }

  private loadMobileUiAtlases(): void {
    Object.values(resolveMobileUiAtlas(this.getUiThemeId())).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });
  }

  private loadMinigameUiAtlases(): void {
    Object.values(resolveMinigameUiAtlas(this.getUiThemeId())).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });
  }

  private loadMinigameButtonAtlases(): void {
    Object.values(resolveMinigameButtonAtlas(this.getUiThemeId())).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });
  }

  private carveRoom(room: Section): void {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.levelData[y][x] = FLOOR_TILE;
      }
    }
  }

  private carveCorridor(x1: number, y1: number, x2: number, y2: number): void {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      this.safeFloor(x, y1);
      this.safeFloor(x, y1 - 1);
      this.safeFloor(x, y1 + 1);
    }

    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      this.safeFloor(x2, y);
      this.safeFloor(x2 - 1, y);
      this.safeFloor(x2 + 1, y);
    }
  }

  private safeFloor(x: number, y: number): void {
    if (y >= 1 && y < this.mapHeight - 1 && x >= 1 && x < this.mapWidth - 1) {
      this.levelData[y][x] = FLOOR_TILE;
    }
  }

  private generateSceneryPropLayout(): void {
    this.sections.forEach((section) => {
      const propCount = Math.max(1, Math.floor((section.w * section.h) / 42));

      for (let i = 0; i < propCount; i++) {
        const tile = this.getRandomFloorTileInSection(section, true);
        if (Phaser.Math.Distance.Between(tile.x, tile.y, section.centerX, section.centerY) < 3) continue;
        if (!this.canPlaceSceneryProp(tile.x, tile.y)) continue;

        this.levelData[tile.y][tile.x] = PROP_TILE;
        this.sceneryPropFrames.set(
          this.tileKey(tile.x, tile.y),
          this.pickWeightedFrame(this.getBackgroundFrameVariants().props, BACKGROUND_FRAMES.props)
        );
      }
    });
  }

  private canPlaceSceneryProp(x: number, y: number): boolean {
    const nearStart = Phaser.Math.Distance.Between(x, y, this.startTile.x, this.startTile.y) < 4;
    const nearFinish = Phaser.Math.Distance.Between(x, y, this.finishTile.x, this.finishTile.y) < 3;
    return this.levelData[y]?.[x] === FLOOR_TILE && !nearStart && !nearFinish;
  }

  private tileKey(x: number, y: number): string {
    return `${x}:${y}`;
  }

  private createTilemap(): void {
    const texturePrefix = this.getTexturePrefix();

    this.map = this.make.tilemap({
      data: this.levelData,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });

    const tileset = this.map.addTilesetImage(
      texturePrefix + 'tiles',
      texturePrefix + 'tiles',
      this.tileSize,
      this.tileSize
    );

    if (!tileset) {
      throw new Error('Tileset non creato: verifica le texture generate dalla GameScene.');
    }

	// cast non-nullable: createLayer può restituire `TilemapLayer | null` nelle definizioni Phaser
	this.groundLayer = this.map.createLayer(0, tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    this.groundLayer.setCollision([WALL_TILE, PROP_TILE]);
    this.groundLayer.setAlpha(this.areEnvironmentSpritesEnabled() ? 0 : 1);

    this.physics.world.setBounds(
      0,
      0,
      this.mapWidth * this.tileSize,
      this.mapHeight * this.tileSize
    );
  }



  private createEnvironmentSprites(): void {
    if (!this.areEnvironmentSpritesEnabled()) {
      this.renderSceneryProps();
      return;
    }

    const background = this.add.group();

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const spriteConfig = this.resolveBackgroundSprite(x, y);
        if (!spriteConfig) continue;

        const sprite = this.add.image(
          this.tileToWorldX(x),
          this.tileToWorldY(y),
          spriteConfig.atlasKey,
          spriteConfig.frame
        );
        this.applyElementRenderConfig(sprite, spriteConfig.renderConfig, x);
        sprite.setDepth(spriteConfig.depthBase + y);
        background.add(sprite);
      }
    }

    this.renderSceneryProps();
  }

  private resolveBackgroundSprite(
    x: number,
    y: number
  ): { atlasKey: string; frame: string; depthBase: number; renderConfig: PhaserSceneElementRenderParams } | null {
    if (this.isRoomGroundTile(x, y)) {
      return {
        atlasKey: GAME_ATLAS.floor.key,
        frame: this.pickWeightedFrame(this.getBackgroundFrameVariants().floor, BACKGROUND_FRAMES.floor),
        depthBase: -1000,
        renderConfig: this.getSpriteSizing().floor
      };
    }

    if (!this.isWallOnWalkableBorder(x, y)) return null;

    const wallKind = this.getWallSpriteKind(x, y);
    return {
      atlasKey: GAME_ATLAS.walls.key,
      frame: this.pickWallFrame(wallKind),
      depthBase: -900,
      renderConfig: this.getSpriteSizing()[wallKind]
    };
  }

  private isRoomGroundTile(x: number, y: number): boolean {
    const tile = this.levelData[y]?.[x];
    return tile === FLOOR_TILE || tile === PROP_TILE;
  }

  private isWallOnWalkableBorder(x: number, y: number): boolean {
    return this.levelData[y]?.[x] === WALL_TILE && this.hasFloorNeighbor(x, y);
  }

  private hasFloorNeighbor(x: number, y: number): boolean {
    return this.isRoomGroundTile(x, y - 1)
      || this.isRoomGroundTile(x, y + 1)
      || this.isRoomGroundTile(x - 1, y)
      || this.isRoomGroundTile(x + 1, y);
  }

  private getWallSpriteKind(x: number, y: number): Extract<SceneSpriteKind, 'wallTop' | 'wallBot' | 'wallSide'> {
    if (this.isRoomGroundTile(x, y + 1)) return 'wallTop';
    if (this.isRoomGroundTile(x, y - 1)) return 'wallBot';
    return 'wallSide';
  }

  private pickWallFrame(kind: Extract<SceneSpriteKind, 'wallTop' | 'wallBot' | 'wallSide'>): string {
    const wallVariants = this.getBackgroundFrameVariants().wall;
    if (kind === 'wallTop') return this.pickWeightedFrame(wallVariants.top, BACKGROUND_FRAMES.wallTop);
    if (kind === 'wallBot') return this.pickWeightedFrame(wallVariants.bot, BACKGROUND_FRAMES.wallMid);
    return this.pickWeightedFrame(wallVariants.side, BACKGROUND_FRAMES.wallSide);
  }

  private renderSceneryProps(): void {
    const useEnvironmentSprites = this.areEnvironmentSpritesEnabled();
    this.sceneryPropFrames.forEach((frame, key) => {
      const [xText, yText] = key.split(':');
      const tile = { x: Number(xText), y: Number(yText) };
      const prop = this.add.image(
        this.tileToWorldX(tile.x),
        this.tileToWorldY(tile.y),
        useEnvironmentSprites ? GAME_ATLAS.props.key : this.getTexturePrefix() + 'prop',
        useEnvironmentSprites ? frame : undefined
      );
      this.applyElementRenderConfig(prop, this.getSpriteSizing().prop, tile.x);
      prop.setDepth(-200 + tile.y);
    });
  }

  private applyElementRenderConfig(
    sprite: Phaser.GameObjects.Image | Phaser.Physics.Arcade.Sprite,
    config: PhaserSceneElementRenderParams,
    tileX?: number
  ): void {
    if (config.originX !== undefined || config.originY !== undefined) {
      sprite.setOrigin(config.originX ?? 0.5, config.originY ?? 0.5);
    }

    if (config.width !== undefined && config.height !== undefined) {
      sprite.setDisplaySize(config.width, config.height);
    }

    if (config.scale !== undefined) {
      sprite.setScale(config.scale);
    } else if (config.scaleX !== undefined || config.scaleY !== undefined) {
      sprite.setScale(config.scaleX ?? 1, config.scaleY ?? 1);
    }

    if ('setFlipX' in sprite) {
      const shouldMirror = Boolean(config.mirrorOnRightHalf && tileX !== undefined && tileX >= Math.floor(this.mapWidth / 2));
      sprite.setFlipX(shouldMirror);
    }
  }

  private pickRandomFrame(frames: readonly string[]): string {
    const frame = frames[Phaser.Math.Between(0, frames.length - 1)];
    if (!frame) throw new Error('No background frame configured.');
    return frame;
  }

  private pickWeightedFrame(
    groups: Array<{ weight: number; frames: string[] }>,
    fallbackFrames: readonly string[]
  ): string {
    const validGroups = groups.filter((group) => group.weight > 0 && group.frames.length > 0);
    if (!validGroups.length) {
      return this.pickRandomFrame(fallbackFrames);
    }

    const totalWeight = validGroups.reduce((sum, group) => sum + group.weight, 0);
    let roll = Phaser.Math.FloatBetween(0, totalWeight);

    for (const group of validGroups) {
      roll -= group.weight;
      if (roll <= 0) {
        return this.pickRandomFrame(group.frames);
      }
    }

    return this.pickRandomFrame(validGroups[validGroups.length - 1]?.frames ?? fallbackFrames);
  }

  // ---------------------------------------------------------------------------
  // Oggetti gameplay.
  // ---------------------------------------------------------------------------

  private createGroups(): void {
    this.treasures = this.physics.add.staticGroup();
    this.traps = this.physics.add.staticGroup();
    this.dynamicTraps = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemies = this.physics.add.group({ allowGravity: false });
  }

  private spawnGameplayElements(): void {
    const treasureTotals = this.createTreasureSpawnTotals();

    this.sections.forEach((section, index) => {
      const isStart = index === 0;
      const isFinish = index === this.sections.length - 1;

      const trapCount = isStart ? 0 : this.params.trapsPerSection;
      const enemyCount = isStart ? 0 : this.params.enemiesPerSection;

      this.spawnSectionTreasures(section, treasureTotals);

      for (let i = 0; i < trapCount; i++) {
        const tile = this.getRandomFloorTileInSection(section);
        Phaser.Math.Between(0, 100) < 45
          ? this.spawnDynamicTrap(tile.x, tile.y)
          : this.spawnStaticTrap(tile.x, tile.y);
      }

      for (let i = 0; i < enemyCount; i++) {
        const tile = this.getRandomFloorTileInSection(section);
        this.spawnEnemy(tile.x, tile.y, section);
      }

      if (isFinish) {
        this.finishZone = this.physics.add.staticSprite(
          this.tileToWorldX(this.finishTile.x),
          this.tileToWorldY(this.finishTile.y),
          this.getTexturePrefix() + 'finish'
        );
      }
    });
  }

  private createTreasureSpawnTotals(): Record<PhaserTreasureType, number> {
    const config = this.getTreasureConfig().types;
    return {
      coin: config.coin.maxItemsPerMap,
      gem: config.gem.maxItemsPerMap,
      chest: config.chest.maxItemsPerMap,
      resource: config.resource.maxItemsPerMap
    };
  }

  private spawnSectionTreasures(section: Section, remainingByType: Record<PhaserTreasureType, number>): void {
    const treasureTypes = Object.entries(this.getTreasureConfig().types) as Array<[PhaserTreasureType, PhaserTreasureConfig['types'][PhaserTreasureType]]>;
    const occupiedTiles = new Set<string>();

    treasureTypes.forEach(([type, config]) => {
      const remaining = remainingByType[type];
      if (remaining <= 0) return;

      const count = Math.min(remaining, this.rollTreasureRoomCount(config.roomCountWeights));
      if (count <= 0) return;
      for (let index = 0; index < count; index++) {
        const variant = this.pickTreasureVariant(config);
        const value = this.rollTreasureValue(config, variant);
        const tile = this.getRandomFloorTileInSection(section, false, occupiedTiles);
        occupiedTiles.add(this.tileKey(tile.x, tile.y));
        this.spawnTreasure(tile.x, tile.y, type, value, variant);
        remainingByType[type] = Math.max(0, remainingByType[type] - 1);
      }
    });
  }

  private rollTreasureRoomCount(weights: { zero: number; one: number; two: number }): number {
    const total = Math.max(0, weights.zero) + Math.max(0, weights.one) + Math.max(0, weights.two);
    if (total <= 0) return 0;

    let roll = Phaser.Math.FloatBetween(0, total);
    roll -= Math.max(0, weights.zero);
    if (roll <= 0) return 0;
    roll -= Math.max(0, weights.one);
    if (roll <= 0) return 1;
    return 2;
  }

  private rollTreasureValue(config: PhaserTreasureTypeConfig, variant?: PhaserTreasureVisualVariant): number {
    const min = Math.max(1, Math.floor(variant?.roomValueMin ?? config.roomValueMin));
    const max = Math.max(min, Math.floor(variant?.roomValueMax ?? config.roomValueMax));
    return Phaser.Math.Between(min, max);
  }

  private getRandomFloorTileInSection(section: Section, avoidProps = false, blockedTiles?: Set<string>): TilePoint {
    for (let attempts = 0; attempts < 120; attempts++) {
      const x = Phaser.Math.Between(section.x + 1, section.x + section.w - 2);
      const y = Phaser.Math.Between(section.y + 1, section.y + section.h - 2);

      const nearStart = Phaser.Math.Distance.Between(x, y, this.startTile.x, this.startTile.y) < 4;
      const nearFinish = Phaser.Math.Distance.Between(x, y, this.finishTile.x, this.finishTile.y) < 3;

      const isFloorTile = this.levelData[y]?.[x] === FLOOR_TILE;
      const isFreePropSlot = !avoidProps || !this.sceneryPropFrames.has(this.tileKey(x, y));
      const isBlocked = Boolean(blockedTiles?.has(this.tileKey(x, y)));
      if (isFloorTile && isFreePropSlot && !isBlocked && !nearStart && !nearFinish) {
        return { x, y };
      }
    }

    return { x: section.centerX, y: section.centerY };
  }

  private tileToWorldX(tileX: number): number {
    return tileX * this.tileSize + this.tileSize / 2;
  }

  private tileToWorldY(tileY: number): number {
    return tileY * this.tileSize + this.tileSize / 2;
  }

  private spawnTreasure(tileX: number, tileY: number, type: PhaserTreasureType, value: number, variant?: PhaserTreasureVisualVariant): void {
    const config = this.getTreasureConfig().types[type];
    const frameConfig = variant?.frame ?? config.frame;
    const renderConfig = variant?.render ?? config.render;
    const rewardConfig = variant?.reward ?? config.reward ?? { kind: 'coins' as const };
    const useAtlasFrame =
      this.areEnvironmentSpritesEnabled() &&
      this.isTreasureAtlasFrameAvailable(frameConfig);
    const textureKey = useAtlasFrame
      ? (frameConfig.atlasKey as string)
      : this.getTexturePrefix() + frameConfig.fallbackTextureKey;
    const textureFrame = useAtlasFrame ? frameConfig.frame : undefined;
    const treasure = this.treasures.create(
      this.tileToWorldX(tileX),
      this.tileToWorldY(tileY),
      textureKey,
      textureFrame
    ) as TreasureSprite;

    treasure.treasureType = type;
    treasure.setData('treasureType', type);
    treasure.setData('treasureValue', value);
    treasure.setData('treasureFrame', frameConfig.frame ?? null);
    treasure.setData('treasureRewardKind', rewardConfig.kind);
    treasure.setData('treasureResourceTypeId', rewardConfig.resourceTypeId ?? null);
    treasure.setData('treasureChestTypeId', rewardConfig.chestTypeId ?? null);
    treasure.setData('treasureCatalogItemId', rewardConfig.catalogItemId ?? null);
    treasure.setData('treasureSlotPanelFrame', variant?.slotMachine?.panelFrame ?? null);
    this.applyElementRenderConfig(treasure, renderConfig, tileX);
    treasure.setDepth(-120 + tileY);
    if (treasure.displayWidth > 0 && treasure.displayHeight > 0) {
      treasure.body?.setSize(Math.max(14, treasure.displayWidth * 0.82), Math.max(14, treasure.displayHeight * 0.82), true);
    }
    treasure.refreshBody();
  }

  private pickTreasureVariant(config: PhaserTreasureTypeConfig): PhaserTreasureVisualVariant | undefined {
    if (!config.variants?.length) {
      return undefined;
    }

    const totalWeight = config.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.weight) || 0), 0);
    if (totalWeight <= 0) {
      return config.variants[0];
    }

    let roll = Math.random() * totalWeight;
    for (const variant of config.variants) {
      roll -= Math.max(0, Number(variant.weight) || 0);
      if (roll <= 0) {
        return variant;
      }
    }

    return config.variants[config.variants.length - 1];
  }

  private isTreasureAtlasFrameAvailable(frameConfig: PhaserTreasureFrameConfig): boolean {
    if (!frameConfig.atlasKey || !frameConfig.frame || !this.textures.exists(frameConfig.atlasKey)) {
      return false;
    }

    const texture = this.textures.get(frameConfig.atlasKey);
    return texture.has(frameConfig.frame);
  }

  private spawnStaticTrap(tileX: number, tileY: number): void {
    const useEnvironmentSprites = this.areEnvironmentSpritesEnabled();
    const trap = this.traps.create(
      this.tileToWorldX(tileX),
      this.tileToWorldY(tileY),
      useEnvironmentSprites ? GAME_ATLAS.floor.key : this.getTexturePrefix() + 'trap',
      useEnvironmentSprites
        ? this.pickWeightedFrame(this.getBackgroundFrameVariants().staticTrap, BACKGROUND_FRAMES.staticTrap)
        : undefined
    ) as Phaser.Physics.Arcade.Sprite;

    this.applyElementRenderConfig(trap, this.getSpriteSizing().staticTrap, tileX);
    if (trap.displayWidth > 0 && trap.displayHeight > 0) {
      trap.body?.setSize(trap.displayWidth, trap.displayHeight, true);
    }
    trap.refreshBody();
  }

  private spawnDynamicTrap(tileX: number, tileY: number): void {
    const useEnvironmentSprites = this.areEnvironmentSpritesEnabled();
    const trapConfig = this.getSpriteSizing().dynamicTrap;
    const trap = this.dynamicTraps.create(
      this.tileToWorldX(tileX),
      this.tileToWorldY(tileY),
      useEnvironmentSprites ? GAME_ATLAS.floor.key : this.getTexturePrefix() + 'trap',
      useEnvironmentSprites
        ? this.pickWeightedFrame(this.getBackgroundFrameVariants().dynamicTrap, BACKGROUND_FRAMES.dynamicTrap)
        : undefined
    ) as Phaser.Physics.Arcade.Sprite;

    this.applyElementRenderConfig(trap, trapConfig, tileX);
    if (trap.displayWidth > 0 && trap.displayHeight > 0) {
      trap.body?.setSize(trap.displayWidth, trap.displayHeight, true);
    }
    trap.setImmovable(true);
    trap.setData('baseX', trap.x);
    trap.setData('baseY', trap.y);
    trap.setData('axis', Phaser.Math.Between(0, 1) === 0 ? 'x' : 'y');
    trap.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
    trap.setData('range', Phaser.Math.Between(36, 76));
  }

  private spawnEnemy(tileX: number, tileY: number, section: Section): void {
    const allowedTypes = this.getAllowedMonsterTypes();
    const monsterType = Phaser.Utils.Array.GetRandom(allowedTypes);
    const config = this.monsters[monsterType];
    const monsterAtlasSet = getMonsterSpriteAtlasSet(monsterType);
    const useMonsterAtlas = this.isMonsterAtlasAvailable(monsterType, 'down');

    const level = Math.max(1, Math.floor(this.params.monsterLevel + section.index / 2));
    const maxHp = config.baseHp + config.hpPerLevel * level;
    const maxMana = config.baseMana + config.manaPerLevel * level;
    const speed = Math.round(this.params.enemySpeed * config.speedMultiplier + level * 2);
    const heroLevelPressure = Math.max(0, this.heroProfile.level - level) * 0.015;

    const enemy = this.enemies.create(
      this.tileToWorldX(tileX),
      this.tileToWorldY(tileY),
      useMonsterAtlas ? monsterAtlasSet.directions.down.key : this.getTexturePrefix() + 'monster',
      useMonsterAtlas ? 'standing0001' : undefined
    ) as EnemySprite;

    enemy.monsterType = monsterType;
    enemy.monsterFacing = 'down';
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(1, 1);
    enemy.setVisible(false);
    if (!useMonsterAtlas) {
      enemy.setTint(config.tint);
    }
    enemy.setData('monsterType', monsterType);
    enemy.setData('monsterLabel', config.label);
    enemy.setData('level', level);
    enemy.setData('maxHp', maxHp);
    enemy.setData('hp', maxHp);
    enemy.setData('maxMana', maxMana);
    enemy.setData('mana', maxMana);
    enemy.setData('contactDamage', config.damage * 8 + Math.floor(level * 1.5));
    enemy.setData('speed', speed);
    enemy.setData('chaseRadius', config.chaseRadius);
    enemy.setData('score', config.score + level * 5);
    enemy.setData('mode', Phaser.Math.Between(0, 100) < 55 ? 'patrol' : 'chase');
    enemy.setData('changeDirAt', 0);
    enemy.setData('nextWeaponAttackAt', this.time.now + Phaser.Math.Between(500, 1200));
    enemy.setData('nextSpecialAttackAt', this.time.now + Phaser.Math.Between(1200, 2400));
    enemy.setData('shieldCheckAt', this.time.now + Phaser.Math.Between(350, 1200));
    enemy.setData('shieldUntil', 0);
    enemy.setData('isShielding', false);
    const monsterTuning = this.params.combatTuning?.monsters?.[monsterType];

    enemy.setData('weaponRange', this.resolvePositiveNumber(monsterTuning?.attack?.range, config.weaponRange));
    enemy.setData('weaponArcWidth', this.resolvePositiveNumber(monsterTuning?.attack?.arcWidth, 28));
    enemy.setData('weaponShape', monsterTuning?.attack?.shape ?? 'rectangle');
    enemy.setData('weaponCentered', monsterTuning?.attack?.centered === true);
    enemy.setData('weaponEffectVariant', this.resolveEffectVariant(monsterTuning?.attack?.effectVariant, 1, 4));
    enemy.setData('weaponEffectType', this.resolveCombatEffectType(monsterTuning?.attack?.effectType, 'melee-sweep'));
    enemy.setData('weaponForwardOffset', this.resolveFiniteNumber(monsterTuning?.attack?.forwardOffset, 0));
    enemy.setData('weaponLateralOffset', this.resolveFiniteNumber(monsterTuning?.attack?.lateralOffset, 0));
    enemy.setData('weaponOffsetX', this.resolveFiniteNumber(monsterTuning?.attack?.offsetX, 0));
    enemy.setData('weaponOffsetY', this.resolveFiniteNumber(monsterTuning?.attack?.offsetY, 0));
    enemy.setData('weaponCooldown', Math.max(520, config.weaponCooldown - level * 18));
    enemy.setData('specialRange', this.resolvePositiveNumber(monsterTuning?.special?.range, config.specialRange));
    enemy.setData('specialArcWidth', this.resolvePositiveNumber(monsterTuning?.special?.arcWidth, 42));
    enemy.setData('specialShape', monsterTuning?.special?.shape ?? 'rectangle');
    enemy.setData('specialCentered', monsterTuning?.special?.centered === true);
    enemy.setData('specialEffectVariant', this.resolveEffectVariant(monsterTuning?.special?.effectVariant, 1, 4));
    enemy.setData('specialEffectType', this.resolveCombatEffectType(monsterTuning?.special?.effectType, monsterTuning?.special?.shape === 'circle' ? 'area-burst' : 'beam'));
    enemy.setData('specialForwardOffset', this.resolveFiniteNumber(monsterTuning?.special?.forwardOffset, 0));
    enemy.setData('specialLateralOffset', this.resolveFiniteNumber(monsterTuning?.special?.lateralOffset, 0));
    enemy.setData('specialOffsetX', this.resolveFiniteNumber(monsterTuning?.special?.offsetX, 0));
    enemy.setData('specialOffsetY', this.resolveFiniteNumber(monsterTuning?.special?.offsetY, 0));
    enemy.setData('defenseRange', this.resolvePositiveNumber(monsterTuning?.defense?.range, config.defenseRange));
    enemy.setData('defenseArcWidth', this.resolvePositiveNumber(monsterTuning?.defense?.arcWidth, config.defenseArcWidth));
    enemy.setData('defenseShape', monsterTuning?.defense?.shape ?? 'rectangle');
    enemy.setData('defenseCentered', monsterTuning?.defense?.centered === true);
    enemy.setData('defenseEffectVariant', this.resolveEffectVariant(monsterTuning?.defense?.effectVariant, 1, 2));
    enemy.setData('defenseEffectType', this.resolveCombatEffectType(monsterTuning?.defense?.effectType, 'area-burst'));
    enemy.setData('defenseForwardOffset', this.resolveFiniteNumber(monsterTuning?.defense?.forwardOffset, 0));
    enemy.setData('defenseLateralOffset', this.resolveFiniteNumber(monsterTuning?.defense?.lateralOffset, 0));
    enemy.setData('defenseOffsetX', this.resolveFiniteNumber(monsterTuning?.defense?.offsetX, 0));
    enemy.setData('defenseOffsetY', this.resolveFiniteNumber(monsterTuning?.defense?.offsetY, 0));
    enemy.setData('specialCooldown', Math.max(1200, config.specialCooldown - level * 25));
    enemy.setData('specialManaCost', config.specialManaCost);
    enemy.setData('weaponDamageMultiplier', config.weaponDamageMultiplier);
    enemy.setData('specialDamageMultiplier', config.specialDamageMultiplier);
    enemy.setData('canShield', config.canShield);
    enemy.setData('shieldChance', Phaser.Math.Clamp(config.shieldChance + heroLevelPressure, 0, 0.72));
    enemy.setData('shieldEfficiency', config.shieldEfficiency);
    enemy.setData('specialChance', Phaser.Math.Clamp(config.specialChance + heroLevelPressure, 0, 0.74));
    enemy.setData('animationLockUntil', 0);
    enemy.setData('animationAction', 'idle');
    enemy.setData('animationKey', '');

    if (useMonsterAtlas) {
      const visual = this.add.sprite(enemy.x, enemy.y, monsterAtlasSet.directions.down.key, 'standing0001');
      visual.setScale(this.getMonsterAtlasScale(monsterType)).setDepth(810);
      enemy.setData('visualSprite', visual);
      this.playEnemyAnimation(enemy, 'idle', true);
    } else {
      const visual = this.add.sprite(enemy.x, enemy.y, this.getTexturePrefix() + 'monster');
      if (monsterType === 'skeletor') visual.setScale(1.18);
      if (monsterType === 'bat') visual.setScale(0.86);
      visual.setTint(config.tint).setDepth(810);
      enemy.setData('visualSprite', visual);
    }

    this.applyPhysicalBodySize(
      enemy,
      this.getSpriteSizing().monsterAtlasCollisionBody[monsterType],
    );
    this.syncEnemyVisual(enemy);

    this.createEnemyWidgets(enemy);
    this.pickEnemyPatrolDirection(enemy);
  }

  private getAllowedMonsterTypes(): MonsterType[] {
    const available = Object.keys(this.monsters) as MonsterType[];
    const requested = this.params.monsterTypes?.filter((type): type is MonsterType =>
      available.includes(type as MonsterType)
    );

    return requested?.length ? requested : available;
  }

  private createPlayer(): void {
    const useAtlas = this.isHeroAtlasAvailable();
    const spriteSizing = this.getSpriteSizing();
    const spawnX = this.tileToWorldX(this.startTile.x);
    const spawnY = this.tileToWorldY(this.startTile.y);

    this.player = this.physics.add.sprite(
      spawnX,
      spawnY,
      useAtlas ? this.getHeroAtlasKey('down') : this.getTexturePrefix() + 'player',
      useAtlas ? 'standing0001' : undefined
    );

    this.player.setCollideWorldBounds(true);
    this.player.setVisible(false);

    if (useAtlas) {
      this.playerVisual = this.add.sprite(spawnX, spawnY, this.getHeroAtlasKey('down'), 'standing0001');
      this.playerVisual.setScale(this.getHeroAtlasScale()).setDepth(820);
      this.playHeroAnimation('idle', true);
    } else {
      this.playerVisual = this.add.sprite(spawnX, spawnY, this.getTexturePrefix() + 'player');
      this.applyElementRenderConfig(this.playerVisual, spriteSizing.heroFallback);
    }
    this.applyPhysicalBodySize(this.player, this.getHeroAtlasCollisionBody());
    this.syncActorVisuals();
    this.createPlayerBars();
  }

  /**
   * Mantiene il body in coordinate del mondo costante tra atlas e fallback.
   * Phaser scala il body con il Game Object, perciò compensiamo la scala visuale
   * corrente e usiamo sempre la calibratura definita per l'atlas.
   */
  /** Configura un body fisico indipendente dalle dimensioni e dai pivot dell'atlas. */
  private applyPhysicalBodySize(
    actor: Phaser.Physics.Arcade.Sprite,
    bodyConfig: { width: number; height: number; offsetX: number; offsetY: number },
  ): void {
    const body = actor.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    actor.setScale(1);
    body.setSize(bodyConfig.width, bodyConfig.height);
    body.setOffset(actor.displayOriginX - bodyConfig.width / 2, actor.displayOriginY - bodyConfig.height / 2);
  }

  private getEnemyVisual(enemy: EnemySprite): Phaser.GameObjects.Sprite | undefined {
    const visual = enemy.getData('visualSprite');
    return visual instanceof Phaser.GameObjects.Sprite && visual.active ? visual : undefined;
  }

  private syncVisualToBody(
    actor: Phaser.Physics.Arcade.Sprite,
    visual: Phaser.GameObjects.Sprite,
    bodyConfig: { width: number; height: number; offsetX: number; offsetY: number },
  ): void {
    visual.setPosition(
      actor.x + visual.displayOriginX * visual.scaleX - bodyConfig.offsetX - bodyConfig.width / 2,
      actor.y + visual.displayOriginY * visual.scaleY - bodyConfig.offsetY - bodyConfig.height / 2,
    );
  }

  private syncEnemyVisual(enemy: EnemySprite): void {
    const visual = this.getEnemyVisual(enemy);
    if (!visual) return;
    this.syncVisualToBody(enemy, visual, this.getSpriteSizing().monsterAtlasCollisionBody[enemy.monsterType]);
  }

  private syncActorVisuals(): void {
    if (this.playerVisual?.active) {
      this.syncVisualToBody(this.player, this.playerVisual, this.getHeroAtlasCollisionBody());
    }
    this.enemies.children.iterate(child => {
      const enemy = child as EnemySprite | undefined;
      if (enemy?.active) this.syncEnemyVisual(enemy);
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Collisioni.
  // ---------------------------------------------------------------------------

  private createCollisions(): void {
    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.enemies, this.groundLayer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.dynamicTraps, this.groundLayer);

    this.physics.add.overlap(this.player, this.treasures, (_player, treasure) => {
      const treasureSprite = treasure as Phaser.Physics.Arcade.Sprite;
      const isSlotChest = typeof treasureSprite.getData('treasureSlotPanelFrame') === 'string';
      const shouldLaunchMinigame = isSlotChest || this.shouldLaunchEncounterMinigame(treasureSprite, 'treasure');
      console.log('[createCollisions] ', this.usesEventMinigames(), shouldLaunchMinigame);
      if (this.usesEventMinigames() && shouldLaunchMinigame) {
        this.tryStartTreasureMinigame(treasureSprite);
        return;
      }
      this.collectTreasure(treasureSprite);
    });

    this.physics.add.overlap(this.player, this.traps, (_player, trap) => {
      const trapSprite = trap as Phaser.Physics.Arcade.Sprite;
      console.log('[createCollisions] ', this.usesEventMinigames(), this.shouldLaunchEncounterMinigame(trapSprite, 'trap'));
      if (this.usesEventMinigames() && this.shouldLaunchEncounterMinigame(trapSprite, 'trap')) {
        this.tryStartTrapMinigame(trapSprite, 'static', 12);
        return;
      }
      this.handleTrapHit('static', 12);
    });
    this.physics.add.overlap(this.player, this.dynamicTraps, (_player, trap) => {
      const trapSprite = trap as Phaser.Physics.Arcade.Sprite;
      console.log('[createCollisions] ', this.usesEventMinigames(), this.shouldLaunchEncounterMinigame(trapSprite, 'trap'));
      if (this.usesEventMinigames() && this.shouldLaunchEncounterMinigame(trapSprite, 'trap')) {
        this.tryStartTrapMinigame(trapSprite, 'dynamic', 14);
        return;
      }
      this.handleTrapHit('dynamic', 14);
    });
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      const monster = enemy as EnemySprite;
      console.log('[createCollisions] ', this.usesEventMinigames(), this.shouldLaunchEncounterMinigame(monster, 'combat'));
      if (this.usesEventMinigames() && this.shouldLaunchEncounterMinigame(monster, 'combat')) {
        this.tryStartMonsterMinigame(monster);
        return;
      }
      const damage = Number(monster.getData('contactDamage') ?? 1);
      this.damagePlayer(damage, monster);
    });
    this.physics.add.overlap(this.player, this.finishZone, () => this.finishGame());
  }

  private collectTreasure(
    treasure: Phaser.Physics.Arcade.Sprite,
    overrides?: { treasureValue?: number; rewardMultiplier?: number; grade?: MinigameResultGrade },
  ): void {
    treasure.disableBody(true, true);
    const treasureType = String(treasure.getData('treasureType') ?? 'unknown');
    const treasureValue = Math.max(0, Number(overrides?.treasureValue ?? treasure.getData('treasureValue') ?? 10));
    const rewardKind = String(treasure.getData('treasureRewardKind') ?? 'coins');
    const resourceTypeId = treasure.getData('treasureResourceTypeId') as string | null | undefined;
    const chestTypeId = treasure.getData('treasureChestTypeId') as string | null | undefined;
    const catalogItemId = treasure.getData('treasureCatalogItemId') as string | null | undefined;
    this.treasuresCollected += 1;
    this.eventsService?.setTreasures(this.treasuresCollected);
    this.score += treasureValue;
    this.emitScore();
    this.emitGameplayEvent('treasure-collected', `Tesoro raccolto: ${treasureType}`, {
      treasureType,
      treasureValue,
      rewardKind,
      resourceTypeId: resourceTypeId ?? null,
      chestTypeId: chestTypeId ?? null,
      catalogItemId: catalogItemId ?? null,
      rewardMultiplier: overrides?.rewardMultiplier ?? 1,
      minigameGrade: overrides?.grade ?? null,
      treasuresCollected: this.treasuresCollected,
      score: this.score,
    });
    this.updateUI();
  }

  private handleTrapHit(trapKind: 'static' | 'dynamic', damage: number): void {
    this.emitGameplayEvent('trap-hit', `Trappola colpita: ${trapKind}`, {
      trapKind,
      damage,
      heroHealthBefore: this.heroHealth,
      heroFatigueBefore: this.heroFatigue,
    });
    this.damagePlayer(damage, undefined);
  }

  private tryStartTreasureMinigame(treasure: Phaser.Physics.Arcade.Sprite): void {
    if (!this.canStartEventMinigame(treasure)) {
      return;
    }

    const event = this.createTreasureGameEvent(treasure);
    this.launchEventMinigame(event, {
      type: 'treasure',
      sprite: treasure,
    });
  }

  private tryStartTrapMinigame(trap: Phaser.Physics.Arcade.Sprite, trapKind: 'static' | 'dynamic', damage: number): void {
    if (!this.canStartEventMinigame(trap)) {
      return;
    }

    const event = this.createTrapGameEvent(trapKind, damage, trap);
    this.launchEventMinigame(event, {
      type: 'trap',
      sprite: trap,
      trapKind,
    });
  }

  private tryStartMonsterMinigame(enemy: EnemySprite): void {
    if (!this.canStartEventMinigame(enemy)) {
      return;
    }

    const event = this.createMonsterGameEvent(enemy);
    this.launchEventMinigame(event, {
      type: 'monster',
      sprite: enemy,
      enemy,
    });
  }

  private launchEventMinigame(event: GameEvent, context: EventEncounterContext): void {
    if (this.minigameActive) {
      return;
    }

    const heroStats = this.buildHeroMinigameStats();
    const config = this.minigameResolver.resolve(event, heroStats);
    config.heroHud = this.buildMinigameHeroHud();
    config.monsterHud = this.buildMinigameMonsterHud(context.enemy);
    config.combatVisuals = this.buildMinigameCombatVisuals(context.enemy?.monsterType);
    config.combatEncounter = this.buildMinigameCombatEncounter(context.enemy);
    if (config.slotMachine) {
      config.slotMachine = {
        ...config.slotMachine,
        initialGems: Math.max(0, Math.round(this.params.slotMachineGems)),
        panelFrame: String(context.sprite.getData('treasureSlotPanelFrame') ?? config.slotMachine.panelFrame ?? '') || undefined,
      };
    }
    config.runtimeEventEmitter = (type, message, values) => this.emitGameplayEvent(type, message, values);
    const payload: MinigameOverlayPayload = {
      event,
      heroStats,
      config,
      parentSceneKey: String(this.sys.settings.key),
      onComplete: (result) => this.handleMinigameResult(context, result),
    };

    this.minigameActive = true;
    context.sprite.setData('minigameLocked', true);
    context.sprite.setData('minigameCooldownUntil', this.time.now + 400);
    this.suspendGameplayForMinigame(context.enemy);
    this.emitGameplayEvent('minigame-started', `Evento: ${event.title}`, {
      eventId: event.id,
      eventType: event.type,
      difficulty: event.difficulty,
      minigameType: payload.config.type,
    });
    this.scene.launch('MinigameOverlayScene', payload);
    this.scene.pause();
  }

  private handleMinigameResult(context: EventEncounterContext, result: MinigameResult): void {
    this.minigameActive = false;
    this.resumeGameplayAfterMinigame();

    if (context.sprite.active) {
      context.sprite.setData('minigameLocked', false);
      context.sprite.setData('minigameCooldownUntil', this.time.now + 650);
    }

    console.info('[MinigameResult]', result);
    this.emitGameplayEvent('minigame-completed', `Esito evento: ${result.grade}`, {
      eventId: result.eventId,
      eventType: result.eventType,
      grade: result.grade,
      score: result.score,
      fatigueGained: result.fatigueGained,
      damageTaken: result.damageTaken,
      rewardMultiplier: result.rewardMultiplier,
    });
    this.applyMinigameScore(result);
    this.applyMinigameFatigue(result.fatigueGained);

    if (context.type === 'treasure') {
      this.applyTreasureMinigameResult(context.sprite, result);
      return;
    }

    if (context.type === 'slot') {
      this.applySlotChestMinigameResult(context.sprite, result);
      return;
    }

    if (context.type === 'trap') {
      this.applyTrapMinigameResult(context, result);
      return;
    }

    this.applyMonsterMinigameResult(context, result);
  }

  private buildMinigameHeroHud(): MinigameHeroHudConfig {
    const atlas = getHeroSpriteAtlasSet(this.params.hero).directions.down;

    return {
      portraitAtlasKey: atlas.key,
      portraitImageUrl: atlas.imageUrl,
      portraitAtlasData: atlas.atlasData,
      portraitFrameName: 'standing0001',
      health: {
        current: Math.max(0, Math.round(this.heroHealth)),
        total: Math.max(1, Math.round(this.heroMaxHealth)),
      },
      mana: {
        current: Math.max(0, Math.round(this.heroMana)),
        total: Math.max(1, Math.round(this.heroMaxMana)),
      },
      fatigue: {
        current: Math.max(0, Math.round(this.heroFatigue)),
        total: Math.max(1, Math.round(this.heroMaxFatigue)),
      },
    };
  }

  private buildMinigameMonsterHud(enemy?: EnemySprite): MinigameMonsterHudConfig | undefined {
    if (!enemy) {
      return undefined;
    }

    const maxHealth = Math.max(1, Math.round(Number(enemy.getData('maxHp') ?? enemy.getData('hp') ?? 1)));
    const maxMana = Math.max(1, Math.round(Number(enemy.getData('maxMana') ?? enemy.getData('specialManaCost') ?? 1) * 3));
    const currentMana = Math.max(0, Math.round(Number(enemy.getData('mana') ?? maxMana)));

    return {
      name: String(enemy.getData('monsterLabel') ?? 'Mostro'),
      health: {
        current: Math.max(0, Math.round(Number(enemy.getData('hp') ?? maxHealth))),
        total: maxHealth,
      },
      mana: {
        current: currentMana,
        total: maxMana,
      },
    };
  }

  private buildMinigameCombatEncounter(enemy?: EnemySprite): MinigameConfig["combatEncounter"] | undefined {
    const monsterHud = this.buildMinigameMonsterHud(enemy);
    if (!monsterHud) {
      return undefined;
    }

    return {
      hero: {
        hp: Math.max(0, Math.round(this.heroHealth)),
        maxHp: Math.max(1, Math.round(this.heroMaxHealth)),
        mp: Math.max(0, Math.round(this.heroMana)),
        maxMp: Math.max(1, Math.round(this.heroMaxMana)),
      },
      monster: {
        name: monsterHud.name,
        hp: monsterHud.health.current,
        maxHp: monsterHud.health.total,
        mp: monsterHud.mana.current,
        maxMp: monsterHud.mana.total,
      },
    };
  }

  private buildMinigameCombatVisuals(monsterType?: MonsterType): MinigameConfig["combatVisuals"] {
    const heroAtlasSet = getHeroSpriteAtlasSet(this.params.hero);
    const monsterAtlasSet = getMonsterSpriteAtlasSet(monsterType);

    return {
      monsterScale: monsterAtlasSet.directions.down.scale,
      heroDownAtlas: {
        atlasKey: heroAtlasSet.directions.down.key,
        imageUrl: heroAtlasSet.directions.down.imageUrl,
        atlasData: heroAtlasSet.directions.down.atlasData,
        idleFrameName: 'standing0001',
      },
      heroUpAtlas: {
        atlasKey: heroAtlasSet.directions.up.key,
        imageUrl: heroAtlasSet.directions.up.imageUrl,
        atlasData: heroAtlasSet.directions.up.atlasData,
        idleFrameName: 'standing0001',
      },
      heroHorizAtlas: {
        atlasKey: heroAtlasSet.directions.horiz.key,
        imageUrl: heroAtlasSet.directions.horiz.imageUrl,
        atlasData: heroAtlasSet.directions.horiz.atlasData,
        idleFrameName: 'standing0001',
      },
      monsterDownAtlas: {
        atlasKey: monsterAtlasSet.directions.down.key,
        imageUrl: monsterAtlasSet.directions.down.imageUrl,
        atlasData: monsterAtlasSet.directions.down.atlasData,
        idleFrameName: 'standing0001',
      },
      monsterHorizAtlas: {
        atlasKey: monsterAtlasSet.directions.horiz.key,
        imageUrl: monsterAtlasSet.directions.horiz.imageUrl,
        atlasData: monsterAtlasSet.directions.horiz.atlasData,
        idleFrameName: 'standing0001',
      },
    };
  }

  private applyTreasureMinigameResult(treasure: Phaser.Physics.Arcade.Sprite, result: MinigameResult): void {
    const baseValue = Math.max(0, Number(treasure.getData('treasureValue') ?? 10));
    const rewardKind = String(treasure.getData('treasureRewardKind') ?? 'coins');
    const isChestReward = rewardKind === 'box';

    // Le chest sono ricompense discrete: la qualità del minigioco non deve
    // trasformare uno scrigno in più scrigni tramite l'arrotondamento del moltiplicatore.
    if (isChestReward && result.rewardMultiplier <= 0) {
      this.deactivateEncounterSprite(treasure);
      return;
    }

    const adjustedValue = isChestReward
      ? 1
      : Math.max(0, Math.round(baseValue * result.rewardMultiplier));
    this.collectTreasure(treasure, {
      treasureValue: adjustedValue,
      rewardMultiplier: isChestReward ? 1 : result.rewardMultiplier,
      grade: result.grade,
    });
  }

  private applySlotChestMinigameResult(treasure: Phaser.Physics.Arcade.Sprite, result: MinigameResult): void {
    this.deactivateEncounterSprite(treasure);
    if (result.grade !== 'perfect') {
      return;
    }

    const chestTypeId = treasure.getData('treasureChestTypeId') as string | null | undefined;
    const catalogItemId = treasure.getData('treasureCatalogItemId') as string | null | undefined;
    this.treasuresCollected += 1;
    this.eventsService?.setTreasures(this.treasuresCollected);
    this.emitGameplayEvent('treasure-collected', 'Jackpot slot: chest vinta', {
      treasureType: 'chest',
      treasureValue: 1,
      rewardKind: 'box',
      chestTypeId: chestTypeId ?? null,
      catalogItemId: catalogItemId ?? null,
      rewardMultiplier: 1,
      minigameGrade: result.grade,
      treasuresCollected: this.treasuresCollected,
      score: this.score,
    });
    this.updateUI();
  }

  private applyTrapMinigameResult(context: EventEncounterContext, result: MinigameResult): void {
    this.deactivateEncounterSprite(context.sprite);

    if (result.damageTaken > 0) {
      this.damagePlayer(result.damageTaken, undefined);
    } else {
      this.showFloatingText(this.player.x, this.player.y - 28, 'Schivata!', '#bbf7d0');
    }

    this.emitGameplayEvent('trap-hit', `Trappola risolta: ${context.trapKind ?? 'trap'}`, {
      trapKind: context.trapKind ?? 'trap',
      grade: result.grade,
      damage: result.damageTaken,
      fatigueGained: result.fatigueGained,
      scoreAwarded: result.score,
    });
  }

  private applyMonsterMinigameResult(context: EventEncounterContext, result: MinigameResult): void {
    const enemy = context.enemy;
    if (!enemy?.active) {
      return;
    }

    if (result.damageTaken > 0) {
      this.damagePlayer(result.damageTaken, enemy);
    }

    const knockback = result.grade === 'perfect' ? 220 : result.grade === 'success' ? 170 : 120;
    if (result.grade === 'fail') {
      this.knockbackSource(enemy, knockback);
      return;
    }

    const enemyDamage = this.calculateMinigameMonsterDamage(enemy, result);
    this.damageMonster(enemy, enemyDamage, knockback, result.grade === 'perfect');
  }

  private deactivateEncounterSprite(sprite: Phaser.Physics.Arcade.Sprite): void {
    const candidate = sprite as Phaser.Physics.Arcade.Sprite & {
      body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
      disableBody?: (disableGameObject?: boolean, hideGameObject?: boolean) => void;
      refreshBody?: () => void;
    };

    if (typeof candidate.disableBody === 'function' && candidate.body) {
      candidate.disableBody(true, true);
      return;
    }

    if (candidate.body && 'enable' in candidate.body) {
      candidate.body.enable = false;
    }

    candidate.setActive(false);
    candidate.setVisible(false);
    candidate.refreshBody?.();
  }

  private calculateMinigameMonsterDamage(enemy: EnemySprite, result: MinigameResult): number {
    const hp = Number(enemy.getData('hp') ?? 1);
    const successRatio = result.grade === 'perfect' ? 1 : result.grade === 'success' ? 0.82 : 0.4;
    const powerBase = this.heroProfile.attack.damage + this.heroProfile.special.damage * 0.35 + result.score * 0.08;
    return Math.max(1, Math.round(Math.min(hp, powerBase * successRatio)));
  }

  private applyMinigameFatigue(amount: number): void {
    if (amount <= 0) {
      return;
    }

    this.heroFatigue = Phaser.Math.Clamp(this.heroFatigue + amount, 0, this.heroMaxFatigue);
    this.updateUI();
  }

  private applyMinigameScore(result: MinigameResult): void {
    const scoreDelta = Math.max(0, Math.round(result.score * 0.45));
    if (scoreDelta <= 0) {
      return;
    }

    this.score += scoreDelta;
    this.emitScore();
  }

  private canStartEventMinigame(sprite: Phaser.Physics.Arcade.Sprite): boolean {
    if (!this.usesEventMinigames() || this.minigameActive || !sprite.active) {
      return false;
    }

    if (Boolean(sprite.getData('minigameLocked'))) {
      return false;
    }

    const cooldownUntil = Number(sprite.getData('minigameCooldownUntil') ?? 0);
    return this.time.now >= cooldownUntil;
  }

  private usesEventMinigames(): boolean {
    return this.params.modeId !== 'time-attack';
  }

  private shouldAwaitInitialRunSetupSelection(): boolean {
    return this.usesEventMinigames() && !this.params.eventMinigameMode;
  }

  private shouldLaunchEncounterMinigame(
    sprite: Phaser.Physics.Arcade.Sprite,
    type: PhaserEventMinigameEncounterType,
  ): boolean {
    const decisionKey = this.getEncounterMinigameDecisionKey(type);
    const storedDecision = sprite.getData(decisionKey);
    if (typeof storedDecision === 'boolean') {
      return storedDecision;
    }

    const probability = this.resolveEncounterMinigameProbability(type);
    const randomValue = Math.random();
    const shouldLaunch = randomValue <= probability;
    sprite.setData(decisionKey, shouldLaunch);

    console.log('[shouldLaunchEncounterMinigame]', {
      encounterId: this.resolveEncounterDebugId(sprite, type),
      type,
      probability,
      probabilityPercent: probability * 100,
      randomValue,
      shouldLaunch
    });

    return shouldLaunch;
  }

  private getEncounterMinigameDecisionKey(type: PhaserEventMinigameEncounterType): string {
    return `encounterMinigameDecision:${type}`;
  }

  private resolveEncounterDebugId(
    sprite: Phaser.Physics.Arcade.Sprite,
    type: PhaserEventMinigameEncounterType,
  ): string {
    if (type === 'combat') {
      return String(sprite.getData('monsterLabel') ?? 'monster');
    }

    if (type === 'trap') {
      return `trap-${Math.round(sprite.x)}-${Math.round(sprite.y)}`;
    }

    return `treasure-${Math.round(sprite.x)}-${Math.round(sprite.y)}`;
  }

  private resolveEncounterMinigameProbability(type: PhaserEventMinigameEncounterType): number {
    const probabilities = this.params.eventMinigameMode?.resolvedProbabilities;
    if (!probabilities) {
      return 1;
    }

    if (type === 'combat') {
      return Phaser.Math.Clamp(Number(probabilities.combat ?? 1), 0, 1);
    }

    if (type === 'trap') {
      return Phaser.Math.Clamp(Number(probabilities.trap ?? 1), 0, 1);
    }

    return Phaser.Math.Clamp(Number(probabilities.treasure ?? 1), 0, 1);
  }

  private buildHeroMinigameStats(): HeroMinigameStats {
    return {
      strength: this.getHeroAttributeValue('Forza'),
      dexterity: this.getHeroAttributeValue('Destrezza'),
      intelligence: this.getHeroAttributeValue('Intelligenza'),
      defense: Math.max(1, Math.round(this.heroProfile.defense)),
      luck: this.getHeroAttributeValue('Carisma'),
      fatigue: Math.round(this.heroFatigue),
    };
  }

  private createMonsterGameEvent(enemy: EnemySprite): GameEvent {
    const label = String(enemy.getData('monsterLabel') ?? 'Mostro');
    const level = Math.max(1, Number(enemy.getData('level') ?? this.params.matchLevel ?? 1));
    const difficulty = Phaser.Math.Clamp(level + Math.floor(this.params.matchLevel / 2), 1, 10);
    const damageValue = Math.max(4, Math.round(Number(enemy.getData('contactDamage') ?? 12) * 0.45));

    return {
      id: `monster-${label.toLowerCase()}-${Math.round(enemy.x)}-${Math.round(enemy.y)}`,
      type: 'monster',
      title: label,
      difficulty,
      primarySkill: 'dexterity',
      secondarySkill: 'strength',
      riskLevel: difficulty,
      rewardValue: Math.max(8, Number(enemy.getData('score') ?? 20)),
      damageValue,
    };
  }

  private createTrapGameEvent(trapKind: 'static' | 'dynamic', damage: number, trap: Phaser.Physics.Arcade.Sprite): GameEvent {
    const difficulty = Phaser.Math.Clamp(Math.round((damage + this.params.matchLevel) / 2), 1, 10);

    return {
      id: `trap-${trapKind}-${Math.round(trap.x)}-${Math.round(trap.y)}`,
      type: 'trap',
      title: trapKind === 'dynamic' ? 'Lama mobile' : 'Trappola antica',
      difficulty,
      primarySkill: 'dexterity',
      secondarySkill: 'defense',
      riskLevel: difficulty,
      damageValue: damage,
    };
  }

  private createTreasureGameEvent(treasure: Phaser.Physics.Arcade.Sprite): GameEvent {
    const treasureType = String(treasure.getData('treasureType') ?? 'treasure');
    const rewardValue = Math.max(4, Number(treasure.getData('treasureValue') ?? 10));
    const difficulty = Phaser.Math.Clamp(Math.round(this.params.matchLevel / 2 + rewardValue / 8), 1, 10);
    const slotPanelFrame = treasure.getData('treasureSlotPanelFrame');

    if (typeof slotPanelFrame === 'string' && slotPanelFrame.length > 0) {
      return {
        id: `slot-chest-${Math.round(treasure.x)}-${Math.round(treasure.y)}`,
        type: 'slot',
        minigameType: 'slotMachine',
        title: 'Slot dello scrigno',
        difficulty,
        primarySkill: 'luck',
        secondarySkill: 'intelligence',
        riskLevel: Math.max(1, difficulty - 1),
        rewardValue: 1,
        damageValue: 0,
      };
    }

    return {
      id: `treasure-${treasureType}-${Math.round(treasure.x)}-${Math.round(treasure.y)}`,
      type: 'treasure',
      title: 'Tesoro sigillato',
      difficulty,
      primarySkill: 'dexterity',
      secondarySkill: 'intelligence',
      riskLevel: Math.max(1, difficulty - 1),
      rewardValue,
      damageValue: 0,
    };
  }

  private createDebugEvent(type: GameEventType): GameEvent {
    return buildStandaloneMinigameEvent(type);
  }

  private damagePlayer(amount: number, source?: Phaser.Physics.Arcade.Sprite): void {
    const now = this.time.now;
    if (now - this.lastDamageTime < this.params.damageCooldown) {
      return;
    }
    console.log('[GAME-SCENE] damagePlayer', { amount, source: source?.texture.key, now, lastDamageTime: this.lastDamageTime });
    this.lastDamageTime = now;

    const shieldBlocked = this.isShielding && this.shieldEnergy > 5 && this.isSourceInFront(source);
    const defenseReduction = Math.floor(this.heroProfile.defense / 12);
    const shieldReduction = shieldBlocked
      ? Math.ceil(amount * this.heroProfile.shieldEfficiency) + defenseReduction
      : defenseReduction;

    const finalDamage = Math.max(0, Math.round(amount - shieldReduction));

      if (shieldBlocked) {
        this.blocksPerformed += 1;
        this.shieldEnergy = Math.max(0, this.shieldEnergy - 12);
        this.effects.play(GameEffectKey.HeroDefense, this.player, {
          direction: this.facing,
          followTarget: true,
          force: true,
      combatArea: this.toEffectArea(this.getHeroShieldArea()),
      effectVariant: this.heroProfile.defenseEffectVariant,
      effectType: this.heroProfile.defenseEffectType,
        });
        this.knockbackSource(source, 140);
        this.emitGameplayEvent('hero-blocked', 'Colpo parato dallo scudo', {
          incomingDamage: amount,
          blockedDamage: shieldReduction,
          remainingShield: Math.round(this.shieldEnergy),
        });
      }

      if (finalDamage > 0) {
            console.log('[GAME-SCENE] finalDamage', finalDamage);

      this.damageReceived += finalDamage;
      this.damageReceivedEvents += 1;
      this.currentCombo = 0;
      this.eventsService?.setCombo(this.currentCombo);
      this.playHeroActionAnimation('hit');
      this.effects.play(GameEffectKey.Hit, this.player, {
        direction: this.facing,
        followTarget: true,
        force: true,
      });
      this.heroHealth = Math.max(0, this.heroHealth - finalDamage);
      this.lives = this.heroHealth;
      this.cameras.main.shake(120, 0.006);
      this.playerVisual?.setTint(0xff0000);
        this.showFloatingText(this.player.x, this.player.y - 28, `-${finalDamage}`, '#fecaca');
        this.time.delayedCall(140, () => {
          if (this.playerVisual?.active) this.playerVisual.clearTint();
        });
        this.emitGameplayEvent('hero-damaged', 'Eroe colpito', {
          source: source ? String(source.getData('monsterType') ?? source.texture.key) : 'trap-or-environment',
          incomingDamage: amount,
          finalDamage,
          heroHealthAfter: this.heroHealth,
          heroManaAfter: Math.floor(this.heroMana),
          heroFatigueAfter: Math.floor(this.heroFatigue),
        });
        this.emitLowHealthJuiceIfNeeded();
      } else if (shieldBlocked) {
        this.showFloatingText(this.player.x, this.player.y - 28, 'Parato', '#bae6fd');
      }

    this.emitLives();
    this.updateUI();

    if (this.heroHealth <= 0) {
      this.endGame('hero-defeated');
    }
  }

  private isSourceInFront(source?: Phaser.Physics.Arcade.Sprite): boolean {
    if (!source) return true;
    return this.isCombatAreaIntersectingBody(
      this.getHeroShieldArea(),
      this.getArcadeBodyBounds(source),
    );
  }

  private knockbackSource(source: Phaser.Physics.Arcade.Sprite | undefined, force: number): void {
    if (!source) return;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, source.x, source.y);
    source.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
  }

  // ---------------------------------------------------------------------------
  // Input desktop + mobile.
  // ---------------------------------------------------------------------------

  private createInput(): void {
    this.input.addPointer(4);

    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();

    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      R: Phaser.Input.Keyboard.KeyCodes.R,
      Q: Phaser.Input.Keyboard.KeyCodes.Q,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      E: Phaser.Input.Keyboard.KeyCodes.E
    }) as Record<
      'W' | 'A' | 'S' | 'D' | 'R' | 'Q' | 'SPACE' | 'SHIFT' | 'E',
      Phaser.Input.Keyboard.Key
    >;
  }

  private handlePlayerMovement(): void {
    if (this.minigameActive) {
      this.player.setVelocity(0, 0);
      return;
    }

    const speed = this.params.playerSpeed;
    let vx = this.joystickVector.x * speed;
    let vy = this.joystickVector.y * speed;

    const cursors = this.cursors;
    const keys = this.keys;
    const keyboardAvailable = !!cursors && !!keys;

    if (keyboardAvailable) {
      const left = cursors.left.isDown || keys.A.isDown;
      const right = cursors.right.isDown || keys.D.isDown;
      const up = cursors.up.isDown || keys.W.isDown;
      const down = cursors.down.isDown || keys.S.isDown;

      if (left || right || up || down) {
        vx = left ? -speed : right ? speed : 0;
        vy = up ? -speed : down ? speed : 0;
      }
    }

    if (this.params.movementAxes === 4 && vx !== 0 && vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy)) vy = 0;
      else vx = 0;
    }

    if (this.params.movementAxes === 8 && vx !== 0 && vy !== 0 && keyboardAvailable) {
      const isKeyboardDiagonal =
        (cursors.left.isDown || keys.A.isDown || cursors.right.isDown || keys.D.isDown) &&
        (cursors.up.isDown || keys.W.isDown || cursors.down.isDown || keys.S.isDown);

      if (isKeyboardDiagonal && this.joystickVector.lengthSq() === 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
    }

    const nextFacing = this.resolveFacingFromVelocity(vx, vy);
    if (nextFacing) {
      this.facing = nextFacing;
    }

    const shieldSlowdown = this.isShielding ? 0.55 : 1;
    this.player.setVelocity(vx * shieldSlowdown, vy * shieldSlowdown);
    this.updateHeroSpriteAnimation();
  }

  private handleCombatInput(): void {
    if (this.minigameActive) {
      this.setShielding(false);
      return;
    }

    const keyboardSpecialDown = this.keys?.E.isDown ?? false;
    const keyboardAttackDown = this.keys?.SPACE.isDown ?? false;
    if (this.keys?.Q && Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
      this.healHero();
    }

    if (this.keys?.SHIFT && Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
      this.activateShield();
    }

    const wantsSpecial = keyboardSpecialDown || this.specialPointerId !== null;
    const wantsAttack = keyboardAttackDown || this.attackPointerId !== null;
    const nextAttackAction = wantsSpecial ? 'special' : wantsAttack ? 'attack' : null;
    const attackActionChanged = nextAttackAction !== this.activeAttackAction;

    this.activeAttackAction = nextAttackAction;

    if (attackActionChanged) {
      this.heldAttackAction = nextAttackAction;
      this.heldAttackCount = 0;
      this.heldAttackWindowStartedAt = this.time.now;
    }

    if (wantsSpecial && ((this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) || attackActionChanged || !this.isAttacking)) {
      this.attack(true);
    } else if (wantsAttack && ((this.keys?.SPACE && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) || attackActionChanged || !this.isAttacking)) {
      this.attack(false);
    }

    if (!nextAttackAction) {
      this.heldAttackAction = null;
      this.heldAttackCount = 0;
      this.heldAttackWindowStartedAt = 0;
    }

    if (attackActionChanged) {
      this.updateHeroSpriteAnimation();
    }
  }

  private createMobileControls(): void {
    const p = this.getThemePalette();
    const visuals = this.getMobileControlsVisual();
    const buttonPositions = this.getMobileActionButtonPositions(Number(this.scale.width), Number(this.scale.height));
    this.joystickRadius = visuals.joystick?.radius ?? 58;

    this.joystickBase = this.add.circle(92, Number(this.scale.height) - 92, this.joystickRadius, p['joystick'], visuals.joystick?.baseFillAlpha ?? 0.2);
    this.joystickThumb = this.add.circle(92, Number(this.scale.height) - 92, visuals.joystick?.knobRadius ?? 24, p['joystick'], visuals.joystick?.knobFillAlpha ?? 0.42);
    this.joystickBase.setStrokeStyle(4, 0xd4a017, visuals.joystick?.ringStrokeAlpha ?? 0.72);
    this.createJoystickDecorations(92, Number(this.scale.height) - 92, this.joystickRadius);

    this.joystickBase.setScrollFactor(0).setDepth(1500);
    this.joystickThumb.setScrollFactor(0).setDepth(1501);

    this.attackButton = this.createMobileButton(
      buttonPositions.attack.x,
      buttonPositions.attack.y,
      visuals.attack,
      p['attack'],
      undefined,
      pointer => {
        this.attackPointerId = pointer.id;
        this.activeAttackAction = 'attack';
        this.heldAttackAction = 'attack';
        this.heldAttackCount = 0;
        this.heldAttackWindowStartedAt = this.time.now;
        this.attack(false);
        this.updateHeroSpriteAnimation();
      },
      pointer => {
        if (pointer.id === this.attackPointerId) {
          this.attackPointerId = null;
          if (this.activeAttackAction === 'attack') this.activeAttackAction = null;
          this.heldAttackAction = null;
          this.heldAttackCount = 0;
          this.heldAttackWindowStartedAt = 0;
          this.updateHeroSpriteAnimation();
        }
      }
    );

    this.specialButton = this.createMobileButton(
      buttonPositions.special.x,
      buttonPositions.special.y,
      visuals.special,
      0xa855f7,
      undefined,
      pointer => {
        this.specialPointerId = pointer.id;
        this.activeAttackAction = 'special';
        this.heldAttackAction = 'special';
        this.heldAttackCount = 0;
        this.heldAttackWindowStartedAt = this.time.now;
        this.attack(true);
        this.updateHeroSpriteAnimation();
      },
      pointer => {
        if (pointer.id === this.specialPointerId) {
          this.specialPointerId = null;
          if (this.activeAttackAction === 'special') this.activeAttackAction = null;
          this.heldAttackAction = null;
          this.heldAttackCount = 0;
          this.heldAttackWindowStartedAt = 0;
          this.updateHeroSpriteAnimation();
        }
      }
    );

    this.shieldButton = this.createMobileButton(
      buttonPositions.shield.x,
      buttonPositions.shield.y,
      visuals.shield,
      p['shield'],
      () => this.activateShield(),
      undefined,
      undefined,
      true
    );

    this.healButton = this.createMobileButton(
      buttonPositions.heal.x,
      buttonPositions.heal.y,
      visuals.heal,
      0x22c55e,
      undefined,
      pointer => {
        this.healPointerId = pointer.id;
        this.healHero();
      },
      pointer => {
        if (pointer.id === this.healPointerId) {
          this.healPointerId = null;
        }
      },
      true
    );
    this.attachButtonCooldownVisuals(this.shieldButton, visuals.shield.radius ?? 31);
    this.attachButtonCooldownVisuals(this.healButton, visuals.heal.radius ?? 31);
    this.updateShieldButtonState();
    this.updateHealButtonState();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.isPointerOnMobileActionButton(pointer)) return;

      if (pointer.x <= Number(this.scale.width) * this.mobileJoystickActivationRatio && this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.updateJoystick(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.releaseMobilePointer(pointer));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.releaseMobilePointer(pointer));

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (this.joystickPointerId === null) {
        this.joystickBase?.setPosition(92, gameSize.height - 92);
        this.joystickThumb?.setPosition(92, gameSize.height - 92);
      }

      const resizedButtonPositions = this.getMobileActionButtonPositions(gameSize.width, gameSize.height);

      this.attackButton?.setPosition(resizedButtonPositions.attack.x, resizedButtonPositions.attack.y);
      this.specialButton?.setPosition(resizedButtonPositions.special.x, resizedButtonPositions.special.y);
      this.shieldButton?.setPosition(resizedButtonPositions.shield.x, resizedButtonPositions.shield.y);
      this.healButton?.setPosition(resizedButtonPositions.heal.x, resizedButtonPositions.heal.y);
    });
  }


  private getMobileActionButtonPositions(width: number, height: number): Record<'attack' | 'special' | 'shield' | 'heal', TilePoint> {
    if (this.params.controlsOrientation === 'vertical') {
      const x = width - 40;

      return {
        attack: { x, y: height - 74 },
        special: { x: x - 74, y: height - 74 },
        shield: { x, y: height - 150 },
        heal: { x: x - 74, y: height - 150 }
      };
    }

    return {
      shield: { x: width - 88, y: height - 166 },
      special: { x: width - 168, y: height - 132 },
      attack: { x: width - 168, y: height - 56 },
      heal: { x: width - 248, y: height - 92 }
    };
  }

  private isPointerOnMobileActionButton(pointer: Phaser.Input.Pointer): boolean {
    return [this.attackButton, this.specialButton, this.shieldButton, this.healButton].some(button => {
      if (!button?.active || !button.visible) return false;

      return Phaser.Math.Distance.Between(pointer.x, pointer.y, button.x, button.y) <= 42;
    });
  }

  private releaseMobilePointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointerId) {
      this.releaseJoystick();
    }

    if (pointer.id === this.attackPointerId) {
      this.attackPointerId = null;
      if (this.activeAttackAction === 'attack') this.activeAttackAction = null;
      this.heldAttackAction = null;
      this.heldAttackCount = 0;
      this.updateHeroSpriteAnimation();
    }

    if (pointer.id === this.specialPointerId) {
      this.specialPointerId = null;
      if (this.activeAttackAction === 'special') this.activeAttackAction = null;
      this.heldAttackAction = null;
      this.heldAttackCount = 0;
      this.updateHeroSpriteAnimation();
    }

    if (pointer.id === this.healPointerId) {
      this.healPointerId = null;
    }
  }

  private suspendGameplayForMinigame(enemy?: EnemySprite): void {
    enemy?.setVelocity(0, 0);
    this.player.setVelocity(0, 0);
    this.resetGameplayInputState();
    this.input.enabled = false;
    this.physics.world.pause();
  }

  private resumeGameplayAfterMinigame(): void {
    this.physics.world.resume();
    this.input.enabled = true;
    this.resetGameplayInputState();
    this.player.setVelocity(0, 0);
  }

  private resetGameplayInputState(): void {
    this.releaseJoystick();
    this.attackPointerId = null;
    this.specialPointerId = null;
    this.healPointerId = null;
    this.activeAttackAction = null;
    this.heldAttackAction = null;
    this.heldAttackCount = 0;
    this.heldAttackWindowStartedAt = 0;
    this.setShielding(false);
    this.keys?.SPACE.reset();
    this.keys?.SHIFT.reset();
    this.keys?.E.reset();
    this.keys?.Q.reset();
    this.keys?.W.reset();
    this.keys?.A.reset();
    this.keys?.S.reset();
    this.keys?.D.reset();
    this.cursors?.up.reset();
    this.cursors?.down.reset();
    this.cursors?.left.reset();
    this.cursors?.right.reset();
    this.updateHeroSpriteAnimation();
  }

  private createMobileButton(
    x: number,
    y: number,
    visual: PhaserMobileControlButtonVisualConfig,
    color: number,
    onTap?: () => void,
    onDown?: (pointer: Phaser.Input.Pointer) => void,
    onUp?: (pointer: Phaser.Input.Pointer) => void,
    showCounterLabel = false
  ): Phaser.GameObjects.Container {
    const radius = visual.radius ?? 31;
    const objects: Phaser.GameObjects.GameObject[] = [];
    const uiRefs: MobileButtonUiRefs = {};

    /*
    const frameOuter = this.add.circle(0, 0, radius + 8, 0x120a1f, 0.28);
    frameOuter.setStrokeStyle(3, 0xd4a017, 0.88);
    objects.push(frameOuter);

    const frameInner = this.add.circle(0, 0, radius + 3, 0xffffff, 0.05);
    frameInner.setStrokeStyle(1, 0xfbf2c4, 0.32);
    objects.push(frameInner);
    */
    if (visual.frameAtlasKey && visual.frameName && this.isUiAtlasFrameAvailable(visual.frameAtlasKey, visual.frameName)) {
      const frame = this.add.image(0, 0, visual.frameAtlasKey, visual.frameName);
      frame.setScale(visual.frameScale ?? 0.94);
      if (visual.tint) {
        frame.setTint(visual.tint);
      }
      objects.push(frame);
      uiRefs.iconImage = frame;
    }

    const circle = this.add.circle(0, 0, radius, color, 0.24);
    circle.setStrokeStyle(2, 0xffffff, 0.05);
    objects.push(circle);
    uiRefs.fillCircle = circle;

    if (showCounterLabel) {
      const cooldownText = this.add.text(0, -(radius + 14), '', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#fde68a',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      objects.push(cooldownText);
      uiRefs.cooldownText = cooldownText;
    }

    if (showCounterLabel) {
      const text = this.add.text(0, radius + 16, '', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#f8e7b5',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      objects.push(text);
      uiRefs.labelText = text;
    }

    const container = this.add.container(x, y, objects);
    container.setSize((radius + 12) * 2, (radius + 12) * 2);
    container.setScrollFactor(0);
    container.setDepth(1510);
    container.setDataEnabled();
    container.setData('radius', radius);
    container.setData('uiRefs', uiRefs);
    container.setInteractive(
      new Phaser.Geom.Circle(radius + 12, radius + 12, radius + 10),
      //new Phaser.Geom.Circle(0, 0, radius + 10),
      Phaser.Geom.Circle.Contains
    );

    
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      //circle.setAlpha(0.72);
      onDown?.(pointer);
      onTap?.();
    });

    container.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      //circle.setAlpha(1);
      onUp?.(pointer);
    });

    container.on('pointerout', (pointer: Phaser.Input.Pointer) => {
      //circle.setAlpha(1);
      onUp?.(pointer);
    });

    return container;
  }

  private isUiAtlasFrameAvailable(atlasKey: string, frameName: string): boolean {
    if (!this.textures.exists(atlasKey)) {
      return false;
    }

    return this.textures.get(atlasKey).has(frameName);
  }

  private attachButtonCooldownVisuals(button: Phaser.GameObjects.Container, radius: number): void {
    const uiRefs = (button.getData('uiRefs') as MobileButtonUiRefs | undefined) ?? {};

    const cooldownShade = this.add.rectangle(0, 0, (radius + 2) * 2, 0, 0x050505, 0.72);
    cooldownShade.setVisible(false);

    const cooldownHourglass = this.add.graphics();
    cooldownHourglass.setVisible(false);

    button.add([cooldownShade, cooldownHourglass]);
    if (uiRefs.labelText) {
      button.bringToTop(uiRefs.labelText);
    }
    if (uiRefs.cooldownText) {
      button.bringToTop(uiRefs.cooldownText);
    }
    button.bringToTop(cooldownHourglass);

    uiRefs.cooldownShade = cooldownShade;
    uiRefs.cooldownHourglass = cooldownHourglass;
    button.setData('uiRefs', uiRefs);
  }

  private updateHealButtonState(): void {
    if (!this.healButton) return;

    const uiRefs = this.healButton.getData('uiRefs') as MobileButtonUiRefs | undefined;
    if (!uiRefs?.fillCircle) return;

    const cooldownRemaining = Math.max(0, this.heroHealCooldownUntil - this.time.now);
    const isCoolingDown = cooldownRemaining > 0;
    const isExhausted = this.heroHealChargesRemaining <= 0;
    const isDisabled = this.gameOver || isExhausted || isCoolingDown;
    const cooldownRatio = this.healButtonCooldownMs > 0
      ? Phaser.Math.Clamp(cooldownRemaining / this.healButtonCooldownMs, 0, 1)
      : 0;
    const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

    uiRefs.fillCircle.setAlpha(isDisabled ? 0.42 : 1);
    uiRefs.fillCircle.setFillStyle(0x22c55e, isDisabled ? 0.16 : 0.26);
    uiRefs.iconImage?.setAlpha(isDisabled ? 0.55 : 1);
    uiRefs.labelText?.setText(String(this.heroHealChargesRemaining));
    uiRefs.labelText?.setColor(isExhausted ? '#fca5a5' : '#f8e7b5');
    uiRefs.labelText?.setAlpha(isDisabled ? 0.72 : 1);
    uiRefs.cooldownText?.setText(isCoolingDown ? `${cooldownSeconds}s` : '');
    uiRefs.cooldownText?.setColor(isExhausted ? '#fca5a5' : '#fde68a');
    uiRefs.cooldownText?.setAlpha(isCoolingDown || isExhausted ? 1 : 0.82);

    if (this.healButton.input) {
      this.healButton.input.enabled = !isDisabled;
    }

    if (uiRefs.cooldownShade) {
      if (isCoolingDown || isExhausted) {
        const radius = Number(this.healButton.getData('radius') ?? 31) + 2;
        const fillRatio = isExhausted ? 1 : cooldownRatio;
        const fillHeight = Math.max(0, radius * 2 * fillRatio);
        uiRefs.cooldownShade.setVisible(true);
        uiRefs.cooldownShade.setAlpha(isExhausted ? 0.84 : 0.72);
        uiRefs.cooldownShade.setSize(radius * 2, fillHeight);
        uiRefs.cooldownShade.setPosition(0, -radius + fillHeight / 2);
      } else {
        uiRefs.cooldownShade.setVisible(false);
        uiRefs.cooldownShade.setAlpha(0);
        uiRefs.cooldownShade.setSize(uiRefs.cooldownShade.width, 0);
      }
    }

    if (uiRefs.cooldownHourglass) {
      uiRefs.cooldownHourglass.clear();

      if (isCoolingDown || isExhausted) {
        const accentAlpha = isExhausted ? 0.82 : 0.28 + cooldownRatio * 0.42;
        uiRefs.cooldownHourglass.setVisible(true);
        uiRefs.cooldownHourglass.lineStyle(2, 0xf8e7b5, accentAlpha);
        uiRefs.cooldownHourglass.beginPath();
        uiRefs.cooldownHourglass.moveTo(-7, -10);
        uiRefs.cooldownHourglass.lineTo(7, -10);
        uiRefs.cooldownHourglass.lineTo(2, -1);
        uiRefs.cooldownHourglass.lineTo(-2, -1);
        uiRefs.cooldownHourglass.closePath();
        uiRefs.cooldownHourglass.strokePath();
        uiRefs.cooldownHourglass.beginPath();
        uiRefs.cooldownHourglass.moveTo(-2, 1);
        uiRefs.cooldownHourglass.lineTo(2, 1);
        uiRefs.cooldownHourglass.lineTo(7, 10);
        uiRefs.cooldownHourglass.lineTo(-7, 10);
        uiRefs.cooldownHourglass.closePath();
        uiRefs.cooldownHourglass.strokePath();
        uiRefs.cooldownHourglass.lineBetween(-7, -10, -7, -12);
        uiRefs.cooldownHourglass.lineBetween(7, -10, 7, -12);
        uiRefs.cooldownHourglass.lineBetween(-7, 10, -7, 12);
        uiRefs.cooldownHourglass.lineBetween(7, 10, 7, 12);
      } else {
        uiRefs.cooldownHourglass.setVisible(false);
      }
    }
  }

  private updateShieldButtonState(): void {
    if (!this.shieldButton) return;

    const uiRefs = this.shieldButton.getData('uiRefs') as MobileButtonUiRefs | undefined;
    if (!uiRefs?.fillCircle) return;

    const isRecharging = !this.isShielding && this.shieldEnergy < 100;
    const isDisabled = this.gameOver || this.isShielding || isRecharging;
    const rechargeRatio = Phaser.Math.Clamp((100 - this.shieldEnergy) / 100, 0, 1);
    const rechargeRemaining = isRecharging
      ? (100 - this.shieldEnergy) / this.shieldEnergyRegenPerMs
      : 0;
    const rechargeSeconds = Math.ceil(rechargeRemaining / 1000);

    uiRefs.fillCircle.setAlpha(isDisabled ? 0.42 : 1);
    uiRefs.fillCircle.setFillStyle(this.getThemePalette()['shield'], isDisabled ? 0.16 : 0.26);
    uiRefs.iconImage?.setAlpha(isDisabled ? 0.55 : 1);
    uiRefs.labelText?.setText(this.isShielding ? 'ATTIVO' : '');
    uiRefs.labelText?.setColor('#f8e7b5');
    uiRefs.labelText?.setAlpha(isDisabled ? 0.72 : 1);
    uiRefs.cooldownText?.setText(isRecharging ? `${rechargeSeconds}s` : '');
    uiRefs.cooldownText?.setColor('#fde68a');
    uiRefs.cooldownText?.setAlpha(isRecharging ? 1 : 0.82);

    if (this.shieldButton.input) {
      this.shieldButton.input.enabled = !isDisabled;
    }

    if (uiRefs.cooldownShade) {
      if (isRecharging) {
        const radius = Number(this.shieldButton.getData('radius') ?? 31) + 2;
        const fillHeight = Math.max(0, radius * 2 * rechargeRatio);
        uiRefs.cooldownShade.setVisible(true);
        uiRefs.cooldownShade.setAlpha(0.72);
        uiRefs.cooldownShade.setSize(radius * 2, fillHeight);
        uiRefs.cooldownShade.setPosition(0, -radius + fillHeight / 2);
      } else {
        uiRefs.cooldownShade.setVisible(false);
        uiRefs.cooldownShade.setAlpha(0);
        uiRefs.cooldownShade.setSize(uiRefs.cooldownShade.width, 0);
      }
    }

    if (uiRefs.cooldownHourglass) {
      this.drawCooldownHourglass(uiRefs.cooldownHourglass, isRecharging, rechargeRatio);
    }
  }

  private drawCooldownHourglass(
    hourglass: Phaser.GameObjects.Graphics,
    isVisible: boolean,
    progressRatio: number
  ): void {
    hourglass.clear();

    if (!isVisible) {
      hourglass.setVisible(false);
      return;
    }

    const accentAlpha = 0.28 + progressRatio * 0.42;
    hourglass.setVisible(true);
    hourglass.lineStyle(2, 0xf8e7b5, accentAlpha);
    hourglass.beginPath();
    hourglass.moveTo(-7, -10);
    hourglass.lineTo(7, -10);
    hourglass.lineTo(2, -1);
    hourglass.lineTo(-2, -1);
    hourglass.closePath();
    hourglass.strokePath();
    hourglass.beginPath();
    hourglass.moveTo(-2, 1);
    hourglass.lineTo(2, 1);
    hourglass.lineTo(7, 10);
    hourglass.lineTo(-7, 10);
    hourglass.closePath();
    hourglass.strokePath();
    hourglass.lineBetween(-7, -10, -7, -12);
    hourglass.lineBetween(7, -10, 7, -12);
    hourglass.lineBetween(-7, 10, -7, 12);
    hourglass.lineBetween(7, 10, 7, 12);
  }

  private createJoystickDecorations(x: number, y: number, radius: number): void {
    const accentColor = 0xd4a017;
    const markers = [
      { x: 0, y: -radius - 4 },
      { x: radius + 4, y: 0 },
      { x: 0, y: radius + 4 },
      { x: -radius - 4, y: 0 }
    ];

    markers.forEach((marker) => {
      const diamond = this.add.rectangle(x + marker.x, y + marker.y, 11, 11, accentColor, 0.92);
      diamond.setAngle(45);
      diamond.setScrollFactor(0);
      diamond.setDepth(1502);
      diamond.setStrokeStyle(2, 0xfbf2c4, 0.75);
    });
  }

  private resolveFacingFromVelocity(vx: number, vy: number): AttackDirection | null {
    const threshold = 1;

    if (vy > threshold) return 'down';
    if (vy < -threshold) return 'up';
    if (vx < -threshold) return 'left';
    if (vx > threshold) return 'right';

    return null;
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase || !this.joystickThumb) return;

    const base = new Phaser.Math.Vector2(this.joystickBase.x, this.joystickBase.y);
    const current = new Phaser.Math.Vector2(pointer.x, pointer.y);
    const delta = current.subtract(base);
    const distance = Phaser.Math.Clamp(delta.length(), 0, this.joystickRadius);

    if (delta.length() > 0) {
      delta.normalize();
    }

    this.joystickThumb.setPosition(
      this.joystickBase.x + delta.x * distance,
      this.joystickBase.y + delta.y * distance
    );

    const strength = distance / this.joystickRadius;

    if (strength < this.joystickDeadZone) {
      this.joystickVector.set(0, 0);
    } else {
      this.joystickVector.set(delta.x * strength, delta.y * strength);
    }
  }

  private releaseJoystick(): void {
    this.joystickPointerId = null;
    this.joystickVector.set(0, 0);

    this.joystickBase?.setPosition(92, Number(this.scale.height) - 92);
    this.joystickThumb?.setPosition(92, Number(this.scale.height) - 92);
  }

  // ---------------------------------------------------------------------------
  // Combattimento: attacco, danno ai mostri, scudo.
  // ---------------------------------------------------------------------------

  private attack(isSpecial = false): void {
    const action: 'attack' | 'special' = isSpecial ? 'special' : 'attack';
    const attackConfig = isSpecial ? this.heroProfile.special : this.heroProfile.attack;
    const holdTuning = isSpecial ? this.params.combatTuning?.hero?.special : this.params.combatTuning?.hero?.attack;
    const attacksPerHold = Number(holdTuning?.attacksPerHold ?? 1);
    const repeatAfterMs = Number(holdTuning?.repeatAfterMs ?? 0);
    const now = this.time.now;

    if (this.heldAttackAction !== action) {
      this.heldAttackAction = action;
      this.heldAttackCount = 0;
      this.heldAttackWindowStartedAt = now;
    }

    if (!this.heldAttackWindowStartedAt) {
      this.heldAttackWindowStartedAt = now;
    }

    if (attacksPerHold > 0 && this.heldAttackCount >= attacksPerHold) {
      if (repeatAfterMs > 0 && now - this.heldAttackWindowStartedAt >= repeatAfterMs) {
        this.heldAttackCount = 0;
        this.heldAttackWindowStartedAt = now;
      } else {
        return;
      }
    }

    if (this.isAttacking || this.time.now - this.lastAttackTime < attackConfig.cooldown) {
      return;
    }

    if (isSpecial && this.heroMana < this.heroProfile.special.manaCost) {
      this.showFloatingText(this.player.x, this.player.y - 34, 'Mana insufficiente', '#93c5fd');
      return;
    }

    if (isSpecial) {
      this.specialsPerformed += 1;
      this.heroMana = Math.max(0, this.heroMana - this.heroProfile.special.manaCost);
      this.addHeroFatigue(HERO_FATIGUE_GAMEPLAY_CONFIG.specialAttackAmount);
    } else {
      this.attacksPerformed += 1;
      this.addHeroFatigue(HERO_FATIGUE_GAMEPLAY_CONFIG.normalAttackAmount);
    }

    this.isAttacking = true;
    this.heldAttackCount += 1;
    this.lastAttackTime = this.time.now;

    this.playHeroAnimation('attack', true);

    const hitbox = this.getCombatArea(
      this.player,
      this.facing,
      attackConfig.range,
      attackConfig.arcWidth,
      attackConfig.shape,
      attackConfig.offsetX,
      attackConfig.offsetY,
      attackConfig.centered,
      attackConfig.forwardOffset,
      attackConfig.lateralOffset,
    );

    this.addDebugAttackArea(
      hitbox,
      isSpecial ? 0xa855f7 : 0xfacc15,
      260,
      `${isSpecial ? 'Speciale' : 'Attacco'}: ${attackConfig.effectType} · ${attackConfig.shape}`,
    );
    this.effects.play(isSpecial ? GameEffectKey.HeroSpecial : GameEffectKey.HeroAttack, this.player, {
      direction: this.facing,
      offsetY: -8,
      followTarget: true,
      force: isSpecial,
      combatArea: this.toEffectArea(hitbox, this.facing),
      effectVariant: attackConfig.effectVariant,
      effectType: attackConfig.effectType,
    });

    let attackHit = false;

    this.enemies.children.iterate(child => {
      const enemy = child as EnemySprite | undefined;
      if (!enemy?.active) return true;

      const enemyBounds = this.getArcadeBodyBounds(enemy);

      if (this.isCombatAreaIntersectingBody(hitbox, enemyBounds)) {
        attackHit = true;
        if (this.usesEventMinigames() && this.shouldLaunchEncounterMinigame(enemy, 'combat')) {
          this.tryStartMonsterMinigame(enemy);
          return false;
        }
        this.damageMonster(enemy, attackConfig.damage, attackConfig.knockback, isSpecial);
      }

      return true;
    });

    if (attackHit) {
      this.currentCombo += 1;
      this.eventsService?.setCombo(this.currentCombo);
    }

    this.emitLives();
    this.updateUI();

    this.time.delayedCall(Math.min(260, attackConfig.cooldown), () => {
      this.isAttacking = false;
      this.updateHeroSpriteAnimation();
    });
  }

  private healHero(): void {
    if (this.isAttacking || this.gameOver) return;
    if (this.heroHealth >= this.heroMaxHealth) {
      this.showFloatingText(this.player.x, this.player.y - 34, 'HP pieni', '#bbf7d0');
      return;
    }

    if (this.heroHealChargesRemaining <= 0) {
      this.showFloatingText(this.player.x, this.player.y - 34, 'Cure esaurite', '#fca5a5');
      return;
    }

    const cooldownRemaining = this.heroHealCooldownUntil - this.time.now;
    if (cooldownRemaining > 0) {
      this.showFloatingText(this.player.x, this.player.y - 34, `Ricarica ${Math.ceil(cooldownRemaining / 1000)}s`, '#fde68a');
      return;
    }

    const manaCost = this.heroProfile.healManaCost;
    if (this.heroMana < manaCost) {
      this.showFloatingText(this.player.x, this.player.y - 34, 'Mana insufficiente', '#93c5fd');
      return;
    }

    const healAmount = this.heroProfile.healAmount;
    this.heroMana = Math.max(0, this.heroMana - manaCost);
    this.heroHealth = Math.min(this.heroMaxHealth, this.heroHealth + healAmount);
    this.heroHealChargesRemaining = Math.max(0, this.heroHealChargesRemaining - 1);
    this.heroHealCooldownUntil = this.time.now + this.heroProfile.healCooldownMs;
    this.lives = this.heroHealth;
    this.playHeroAnimation('special', true, 240);
    this.playHealEffect();
    this.effects.play(GameEffectKey.Heal, this.player, {
      offsetY: -6,
      followTarget: true,
      force: true,
    });
    this.showFloatingText(this.player.x, this.player.y - 34, `+${healAmount} (${this.heroHealChargesRemaining})`, '#86efac');
    this.emitGameplayEvent('hero-healed', 'Cura eseguita', {
      healAmount,
      manaCost,
      healChargesRemaining: this.heroHealChargesRemaining,
      healCooldownMs: this.heroProfile.healCooldownMs,
      heroHealthAfter: this.heroHealth,
      heroManaAfter: Math.floor(this.heroMana),
    });
    this.emitLives();
    this.updateUI();
  }

  private isHeroHealthCritical(): boolean {
    if (this.gameOver || this.heroHealth <= 0 || this.heroMaxHealth <= 0) {
      return false;
    }

    return this.heroHealth / this.heroMaxHealth < 0.2;
  }

  private updateLowHealthJuiceArming(): void {
    this.lowHealthJuiceArmed = this.isHeroHealthCritical();
  }

  private emitLowHealthJuiceIfNeeded(): void {
    console.log('[GAME-SCENE] Checking low health juice arming...', this.isHeroHealthCritical());
    if (!this.isHeroHealthCritical()) {
      this.updateLowHealthJuiceArming();
      return;
    }

    this.lowHealthJuiceArmed = true;
    
    this.emitGameplayEvent('hero-low-health', 'HP critici', {
      heroHealthAfter: this.heroHealth,
      heroMaxHealth: this.heroMaxHealth,
      healthRatio: this.heroHealth / this.heroMaxHealth,
      criticalThresholdRatio: 0.2,
    });
  }

  private addHeroFatigue(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.heroFatigue = Math.min(this.heroMaxFatigue, this.heroFatigue + amount);
  }

  private playHealEffect(): void {
    this.playerVisual?.setTint(0x4ade80);
    this.time.delayedCall(180, () => {
      if (this.playerVisual?.active) this.playerVisual.clearTint();
    });

    const ring = this.add.circle(this.player.x, this.player.y, 18, 0x22c55e, 0.18);
    ring.setStrokeStyle(4, 0x86efac, 0.9);
    ring.setDepth(930);

    this.tweens.add({
      targets: ring,
      scale: 2.1,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy()
    });

    for (let index = 0; index < 8; index += 1) {
      const bubble = this.add.circle(
        this.player.x + Phaser.Math.Between(-12, 12),
        this.player.y + Phaser.Math.Between(-10, 12),
        Phaser.Math.Between(4, 8),
        Phaser.Math.RND.pick([0x22c55e, 0x4ade80, 0x86efac]),
        0.82
      );
      bubble.setStrokeStyle(1, 0xdcfce7, 0.9);
      bubble.setDepth(932);

      this.tweens.add({
        targets: bubble,
        x: bubble.x + Phaser.Math.Between(-18, 18),
        y: bubble.y - Phaser.Math.Between(26, 54),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(1.15, 1.8),
        duration: Phaser.Math.Between(420, 760),
        ease: 'Sine.Out',
        onComplete: () => bubble.destroy()
      });
    }
  }

  private getCombatArea(
    source: Phaser.Physics.Arcade.Sprite,
    direction: AttackDirection,
    range: number,
    width: number,
    shape: CombatAreaShape = 'rectangle',
    offsetX = 0,
    offsetY = 0,
    centered = false,
    forwardOffset = 0,
    lateralOffset = 0,
  ): CombatArea {
    const origin = this.getCombatOrigin(source);
    const safeRange = Math.max(0, range);
    const safeWidth = Math.max(1, width);
    // offsetX / offsetY are local action coordinates: forward and lateral.
    // The optional named offsets are retained as additive compatibility aliases.
    const directionalOffset = this.getDirectionalOffset(
      direction,
      offsetX + forwardOffset,
      offsetY + lateralOffset,
    );

    if (shape === 'circle') {
      const radius = Math.max(1, safeWidth / 2);
      if (centered) {
        return new Phaser.Geom.Circle(origin.x + directionalOffset.x, origin.y + directionalOffset.y, radius);
      }

      // The range is measured from the centre of the Arcade body to the leading edge.
      const forwardDistance = Math.max(0, safeRange - radius);
      const centerX = origin.x + (direction === 'right' ? forwardDistance : direction === 'left' ? -forwardDistance : 0) + directionalOffset.x;
      const centerY = origin.y + (direction === 'down' ? forwardDistance : direction === 'up' ? -forwardDistance : 0) + directionalOffset.y;
      return new Phaser.Geom.Circle(centerX, centerY, radius);
    }

    if (direction === 'left' || direction === 'right') {
      return new Phaser.Geom.Rectangle(
        (direction === 'right' ? origin.x : origin.x - safeRange) + directionalOffset.x,
        origin.y - safeWidth / 2 + directionalOffset.y,
        safeRange,
        safeWidth,
      );
    }

    return new Phaser.Geom.Rectangle(
      origin.x - safeWidth / 2 + directionalOffset.x,
      (direction === 'down' ? origin.y : origin.y - safeRange) + directionalOffset.y,
      safeWidth,
      safeRange,
    );
  }

  private getCombatOrigin(source: Phaser.Physics.Arcade.Sprite): Phaser.Math.Vector2 {
    const body = this.getArcadeBodyBounds(source);
    return new Phaser.Math.Vector2(body.centerX, body.centerY);
  }

  private getDirectionalOffset(direction: AttackDirection, forwardOffset: number, lateralOffset: number): Phaser.Math.Vector2 {
    const forward = this.resolveFiniteNumber(forwardOffset, 0);
    const lateral = this.resolveFiniteNumber(lateralOffset, 0);

    switch (direction) {
      case 'up': return new Phaser.Math.Vector2(lateral, -forward);
      case 'down': return new Phaser.Math.Vector2(-lateral, forward);
      case 'left': return new Phaser.Math.Vector2(-forward, -lateral);
      case 'right': return new Phaser.Math.Vector2(forward, lateral);
    }
  }

  private toEffectArea(
    area: CombatArea,
    direction?: AttackDirection,
  ): { shape: CombatAreaShape; x: number; y: number; width: number; height: number; radius?: number; startX?: number; startY?: number; endX?: number; endY?: number } {
    return area instanceof Phaser.Geom.Circle
      ? { shape: 'circle', x: area.x, y: area.y, width: area.radius * 2, height: area.radius * 2, radius: area.radius }
      : {
        shape: 'rectangle',
        x: area.centerX,
        y: area.centerY,
        width: area.width,
        height: area.height,
        ...(direction ? this.getCombatAreaEndpoints(area, direction) : {}),
      };
  }

  private getCombatAreaEndpoints(area: Phaser.Geom.Rectangle, direction: AttackDirection): { startX: number; startY: number; endX: number; endY: number } {
    switch (direction) {
      case 'left': return { startX: area.right, startY: area.centerY, endX: area.x, endY: area.centerY };
      case 'right': return { startX: area.x, startY: area.centerY, endX: area.right, endY: area.centerY };
      case 'up': return { startX: area.centerX, startY: area.bottom, endX: area.centerX, endY: area.y };
      case 'down': return { startX: area.centerX, startY: area.y, endX: area.centerX, endY: area.bottom };
    }
  }

  private isCombatAreaIntersectingBody(area: CombatArea, body: Phaser.Geom.Rectangle): boolean {
    return area instanceof Phaser.Geom.Circle
      ? Phaser.Geom.Intersects.CircleToRectangle(area, body)
      : Phaser.Geom.Intersects.RectangleToRectangle(area, body);
  }

  private getArcadeBodyBounds(sprite: Phaser.Physics.Arcade.Sprite): Phaser.Geom.Rectangle {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;
    return body
      ? new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height)
      : sprite.getBounds();
  }

  private getHeroShieldArea(): CombatArea {
    return this.getCombatArea(
      this.player,
      this.facing,
      this.heroProfile.defenseRange,
      this.heroProfile.defenseArcWidth,
      this.heroProfile.defenseShape,
      this.heroProfile.defenseOffsetX,
      this.heroProfile.defenseOffsetY,
      this.heroProfile.defenseCentered,
      this.heroProfile.defenseForwardOffset,
      this.heroProfile.defenseLateralOffset,
    );
  }

  private getEnemyShieldArea(enemy: EnemySprite): CombatArea {
    return this.getCombatArea(
      enemy,
      enemy.monsterFacing ?? 'down',
      Number(enemy.getData('defenseRange') ?? 60),
      Number(enemy.getData('defenseArcWidth') ?? 52),
      (enemy.getData('defenseShape') as CombatAreaShape | undefined) ?? 'rectangle',
      Number(enemy.getData('defenseOffsetX') ?? 0),
      Number(enemy.getData('defenseOffsetY') ?? 0),
      Boolean(enemy.getData('defenseCentered')),
      Number(enemy.getData('defenseForwardOffset') ?? 0),
      Number(enemy.getData('defenseLateralOffset') ?? 0),
    );
  }

  private getEnemyActionArea(enemy: EnemySprite, action: 'weapon' | 'special'): CombatArea {
    return this.getCombatArea(
      enemy,
      enemy.monsterFacing ?? 'down',
      Number(enemy.getData(`${action}Range`) ?? (action === 'weapon' ? 44 : 88)),
      Number(enemy.getData(`${action}ArcWidth`) ?? (action === 'weapon' ? 28 : 42)),
      (enemy.getData(`${action}Shape`) as CombatAreaShape | undefined) ?? 'rectangle',
      Number(enemy.getData(`${action}OffsetX`) ?? 0),
      Number(enemy.getData(`${action}OffsetY`) ?? 0),
      Boolean(enemy.getData(`${action}Centered`)),
      Number(enemy.getData(`${action}ForwardOffset`) ?? 0),
      Number(enemy.getData(`${action}LateralOffset`) ?? 0),
    );
  }

  private addDebugAttackArea(area: CombatArea, color: number, duration: number, label: string): void {
    if (!this.params.showCombatAreaDebug) return;

    this.debugAttackAreas.push({
      area: area instanceof Phaser.Geom.Circle
        ? new Phaser.Geom.Circle(area.x, area.y, area.radius)
        : new Phaser.Geom.Rectangle(area.x, area.y, area.width, area.height),
      color,
      until: this.time.now + duration,
      label,
    });
  }

  private drawArcadeBodyDebug(): void {
    if (!this.params.showArcadeBodyDebug) {
      this.arcadeBodyDebugGraphic?.clear();
      return;
    }

    this.arcadeBodyDebugGraphic ??= this.add.graphics().setDepth(2000);
    this.arcadeBodyDebugGraphic.clear();
    this.arcadeBodyDebugGraphic.lineStyle(2, 0x38bdf8, 0.95);
    const playerBody = this.getArcadeBodyBounds(this.player);
    this.arcadeBodyDebugGraphic.strokeRect(playerBody.x, playerBody.y, playerBody.width, playerBody.height);

    this.arcadeBodyDebugGraphic.lineStyle(2, 0xf97316, 0.95);
    this.enemies.children.iterate(child => {
      const enemy = child as EnemySprite | undefined;
      if (!enemy?.active) return true;
      const body = this.getArcadeBodyBounds(enemy);
      this.arcadeBodyDebugGraphic?.strokeRect(body.x, body.y, body.width, body.height);
      return true;
    });
  }

  private drawCombatAreaDebug(): void {
    if (!this.params.showCombatAreaDebug) {
      this.combatAreaDebugGraphic?.clear();
      this.clearCombatAreaDebugTexts();
      return;
    }

    this.combatAreaDebugGraphic ??= this.add.graphics().setDepth(1999);
    this.combatAreaDebugGraphic.clear();
    const now = this.time.now;
    this.debugAttackAreas = this.debugAttackAreas.filter(entry => entry.until > now);

    const activeLabels = new Set<string>();
    this.debugAttackAreas.forEach(({ area, color, label }, index) => {
      this.combatAreaDebugGraphic?.lineStyle(2, color, 0.95);
      if (area instanceof Phaser.Geom.Circle) {
        this.combatAreaDebugGraphic?.strokeCircle(area.x, area.y, area.radius);
      } else {
        this.combatAreaDebugGraphic?.strokeRect(area.x, area.y, area.width, area.height);
      }
      const key = `action-${index}`;
      activeLabels.add(key);
      this.updateCombatAreaDebugText(key, area, label, color);
    });

    if (this.isShielding) {
      const area = this.getHeroShieldArea();
      this.combatAreaDebugGraphic.lineStyle(2, 0x38bdf8, 0.95);
      this.drawCombatAreaOutline(area, 0x38bdf8);
      activeLabels.add('hero-defense');
      this.updateCombatAreaDebugText('hero-defense', area, `Difesa: ${this.heroProfile.defenseEffectType} · ${this.heroProfile.defenseShape}`, 0x38bdf8);
    }

    let enemyIndex = 0;
    this.enemies.children.iterate(child => {
      const enemy = child as EnemySprite | undefined;
      if (!enemy?.active || !Boolean(enemy.getData('isShielding'))) return true;
      const area = this.getEnemyShieldArea(enemy);
      this.drawCombatAreaOutline(area, 0x22d3ee);
      const key = `enemy-defense-${enemyIndex++}`;
      activeLabels.add(key);
      this.updateCombatAreaDebugText(
        key,
        area,
        `Difesa ${String(enemy.getData('monsterType') ?? 'mostro')}: ${String(enemy.getData('defenseEffectType') ?? 'area-burst')} · ${String(enemy.getData('defenseShape') ?? 'rectangle')}`,
        0x22d3ee,
      );
      return true;
    });

    this.combatAreaDebugTexts.forEach((text, key) => {
      if (!activeLabels.has(key)) {
        text.destroy();
        this.combatAreaDebugTexts.delete(key);
      }
    });
  }

  private updateCombatAreaDebugText(key: string, area: CombatArea, label: string, color: number): void {
    const x = area instanceof Phaser.Geom.Circle ? area.x : area.centerX;
    const y = area instanceof Phaser.Geom.Circle ? area.y - area.radius - 5 : area.y - 5;
    const text = this.combatAreaDebugTexts.get(key) ?? this.add.text(x, y, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', stroke: '#111827', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(2001);
    text.setPosition(x, y).setText(label).setTint(color);
    this.combatAreaDebugTexts.set(key, text);
  }

  private clearCombatAreaDebugTexts(): void {
    this.combatAreaDebugTexts.forEach(text => text.destroy());
    this.combatAreaDebugTexts.clear();
  }

  private drawCombatAreaOutline(area: CombatArea, color: number): void {
    this.combatAreaDebugGraphic?.lineStyle(2, color, 0.95);
    if (area instanceof Phaser.Geom.Circle) {
      this.combatAreaDebugGraphic?.strokeCircle(area.x, area.y, area.radius);
    } else {
      this.combatAreaDebugGraphic?.strokeRect(area.x, area.y, area.width, area.height);
    }
  }

  private damageMonster(enemy: EnemySprite, damage: number, knockback: number, isSpecial = false): void {
    const hp = Number(enemy.getData('hp'));
    const maxHp = Number(enemy.getData('maxHp') ?? hp);
    const isMonsterShielding = Boolean(enemy.getData('isShielding'))
      && this.isCombatAreaIntersectingBody(
        this.getEnemyShieldArea(enemy),
        this.getArcadeBodyBounds(this.player),
      );
    const shieldEfficiency = Number(enemy.getData('shieldEfficiency') ?? 0);

    const rawDamage = Math.max(1, Math.round(damage));
    const blockedDamage = isMonsterShielding
      ? Math.floor(rawDamage * shieldEfficiency * (isSpecial ? 0.55 : 1))
      : 0;

    const finalDamage = Math.max(1, rawDamage - blockedDamage);
    const nextHp = Math.max(0, hp - finalDamage);
    this.damageDealt += finalDamage;
    enemy.setData('hp', nextHp);
    this.effects.play(GameEffectKey.Hit, enemy, {
      followTarget: true,
      force: isSpecial,
      colorPrimary: isMonsterShielding ? 0x93c5fd : undefined,
    });

    const label = String(enemy.getData('monsterLabel'));
    const damageLabel = isMonsterShielding
      ? `Parato -${finalDamage}`
      : `${isSpecial ? 'SPL ' : ''}-${finalDamage}`;

    this.showFloatingText(
      enemy.x,
      enemy.y - 30,
      damageLabel,
      isMonsterShielding ? '#bae6fd' : isSpecial ? '#e9d5ff' : '#fef3c7'
    );

    if (this.areMonsterSpritesAndAnimationsEnabled()) {
      this.playEnemyActionAnimation(enemy, 'hit', 240);
    } else {
      this.getEnemyVisual(enemy)?.setTint(isMonsterShielding ? 0x7dd3fc : 0xffffff);
      this.time.delayedCall(90, () => {
        const type = enemy.getData('monsterType') as MonsterType;
        if (enemy?.active && type) {
          this.getEnemyVisual(enemy)?.setTint(this.monsters[type].tint);
        }
      });
    }

    this.knockbackSource(enemy, isMonsterShielding ? Math.round(knockback * 0.35) : knockback);
    this.emitGameplayEvent('monster-hit', `Colpito ${label}`, {
      monsterType: String(enemy.getData('monsterType') ?? 'unknown'),
      damage: finalDamage,
      blocked: isMonsterShielding,
      special: isSpecial,
      enemyHpAfter: Math.max(0, nextHp),
      enemyMaxHp: maxHp,
    });

    if (nextHp <= 0) {
      this.enemiesKilled += 1;
      const charisma = this.getHeroAttributeValue('Carisma');
      const scoreValue = Number(enemy.getData('score') ?? 20) + Math.floor(charisma / 4);
      this.score += scoreValue;
      this.emitScore();
      this.showFloatingText(enemy.x, enemy.y - 40, `${label} +${scoreValue}`, '#bbf7d0');
      this.destroyEnemyWidgets(enemy);
      this.getEnemyVisual(enemy)?.destroy();
      enemy.disableBody(true, true);
      this.updateUI();
    } else {
      this.updateCombatText(enemy);
    }
  }

  private setShielding(active: boolean): void {
    this.isShielding = active && this.shieldEnergy > 0;

    if (!this.isShielding) {
      this.updateHeroSpriteAnimation();
      return;
    }

    const shieldArea = this.getHeroShieldArea();
    this.updateHeroSpriteAnimation();
    this.effects.play(GameEffectKey.HeroDefense, this.player, {
      direction: this.facing,
      offsetY: -4,
      followTarget: true,
      combatArea: this.toEffectArea(shieldArea),
      effectVariant: this.heroProfile.defenseEffectVariant,
      effectType: this.heroProfile.defenseEffectType,
    });

  }

  private activateShield(): void {
    if (this.gameOver || this.isShielding || this.shieldEnergy < 100) return;
    this.setShielding(true);
  }

  private updateShield(delta: number): void {
    this.heroMana = Math.min(
      this.heroMaxMana,
      this.heroMana + (this.heroProfile.manaRegenPerSecond * delta) / 1000
    );

    if (this.isShielding && this.shieldEnergy > 0) {
      this.shieldEnergy = Math.max(0, this.shieldEnergy - (this.heroProfile.shieldDrainPerSecond * delta) / 1000);

      if (this.shieldEnergy <= 0) {
        this.setShielding(false);
      }
    } else {
      this.shieldEnergy = Math.min(100, this.shieldEnergy + delta * this.shieldEnergyRegenPerMs);
    }

    if (this.isShielding) {
      this.setShielding(true);
    }

    this.updateUI();
  }

  private showFloatingText(x: number, y: number, message: string, color: string): void {
    const text = this.add.text(x, y, message, {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(1800);

    this.tweens.add({
      targets: text,
      y: y - 24,
      alpha: 0,
      duration: 620,
      onComplete: () => text.destroy()
    });
  }

  private updateCombatText(enemy?: EnemySprite): void {
    void enemy;
  }

  // ---------------------------------------------------------------------------
  // IA nemici e trappole.
  // ---------------------------------------------------------------------------

  private updateEnemies(delta: number): void {
    let nearestEnemy: EnemySprite | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.enemies.children.iterate(child => {
      const enemy = child as EnemySprite | undefined;
      if (!enemy?.active) return true;

      this.regenerateEnemyMana(enemy, delta);
      this.updateEnemyShieldState(enemy);

      const mode = enemy.getData('mode') as 'patrol' | 'chase';
      const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const chaseRadius = Number(enemy.getData('chaseRadius'));
      const speed = Number(enemy.getData('speed'));
      const weaponRange = Number(enemy.getData('weaponRange') ?? 44);
      const specialRange = Number(enemy.getData('specialRange') ?? 88);

      if (distanceToPlayer < nearestDistance) {
        nearestDistance = distanceToPlayer;
        nearestEnemy = enemy;
      }

      this.tryEnemyShield(enemy, distanceToPlayer);

      if (distanceToPlayer <= Math.max(weaponRange, specialRange)) {
        enemy.setVelocity(0, 0);
        this.tryEnemyAttack(enemy, distanceToPlayer);
      } else if (mode === 'chase' && distanceToPlayer < chaseRadius) {
        this.physics.moveToObject(enemy, this.player, speed);
      } else {
        this.updatePatrolEnemy(enemy);
      }

      this.updateEnemySpriteAnimation(enemy);
      return true;
    });

    if (nearestEnemy && nearestDistance < 140) {
      this.updateCombatText(nearestEnemy);
    } else {
      this.updateCombatText(undefined);
    }
  }

  private regenerateEnemyMana(enemy: EnemySprite, delta: number): void {
    const maxMana = Number(enemy.getData('maxMana') ?? 0);
    const mana = Number(enemy.getData('mana') ?? 0);
    const level = Number(enemy.getData('level') ?? 1);

    if (maxMana <= 0) return;

    enemy.setData('mana', Math.min(maxMana, mana + (1.2 + level * 0.08) * delta / 1000));
  }

  private updateEnemyShieldState(enemy: EnemySprite): void {
    const shieldUntil = Number(enemy.getData('shieldUntil') ?? 0);
    const active = this.time.now < shieldUntil;
    enemy.setData('isShielding', active);

  }

  private tryEnemyShield(enemy: EnemySprite, distanceToPlayer: number): void {
    if (!Boolean(enemy.getData('canShield'))) return;

    const now = this.time.now;
    if (now < Number(enemy.getData('shieldCheckAt') ?? 0)) return;

    const mana = Number(enemy.getData('mana') ?? 0);
    const chance = Number(enemy.getData('shieldChance') ?? 0);
    const defenseRange = Number(enemy.getData('defenseRange') ?? 60);
    const defenseArcWidth = Number(enemy.getData('defenseArcWidth') ?? 52);
    const isHeroThreatening = distanceToPlayer <= Math.max(defenseRange, defenseArcWidth, this.heroProfile.attack.range + 34) || this.isAttacking;

    enemy.setData('shieldCheckAt', now + Phaser.Math.Between(650, 1150));

    if (!isHeroThreatening || mana < 6 || Math.random() > chance) return;

    const duration = Phaser.Math.Between(520, 980);
    enemy.setData('mana', Math.max(0, mana - 6));
    enemy.setData('shieldUntil', now + duration);
    enemy.setData('isShielding', true);
    this.faceEnemyTowardPlayer(enemy);
    const shieldArea = this.getEnemyShieldArea(enemy);
    this.playEnemyActionAnimation(enemy, 'shield', duration);
    this.effects.play(GameEffectKey.MonsterDefense, enemy, {
      followTarget: true,
      force: true,
      combatArea: this.toEffectArea(shieldArea),
      effectVariant: Number(enemy.getData('defenseEffectVariant') ?? 1),
      effectType: this.resolveCombatEffectType(enemy.getData('defenseEffectType'), 'area-burst'),
    });
    this.showFloatingText(enemy.x, enemy.y - 42, 'Scudo', '#bae6fd');
  }

  private tryEnemyAttack(enemy: EnemySprite, distanceToPlayer: number): void {
    const now = this.time.now;
    const specialRange = Number(enemy.getData('specialRange') ?? 88);
    const specialCost = Number(enemy.getData('specialManaCost') ?? 999);
    const mana = Number(enemy.getData('mana') ?? 0);
    const specialChance = Number(enemy.getData('specialChance') ?? 0);
    const canSpecial =
      distanceToPlayer <= specialRange &&
      mana >= specialCost &&
      now >= Number(enemy.getData('nextSpecialAttackAt') ?? 0) &&
      Math.random() < specialChance;

    if (canSpecial) {
      this.enemySpecialAttack(enemy);
      return;
    }

    const weaponRange = Number(enemy.getData('weaponRange') ?? 44);
    const canWeapon =
      distanceToPlayer <= weaponRange &&
      now >= Number(enemy.getData('nextWeaponAttackAt') ?? 0);

    if (canWeapon) {
      this.enemyWeaponAttack(enemy);
    }
  }

  private enemyWeaponAttack(enemy: EnemySprite): void {
    const now = this.time.now;
    const cooldown = Number(enemy.getData('weaponCooldown') ?? 1000);

    enemy.setData('nextWeaponAttackAt', now + cooldown);
    this.faceEnemyTowardPlayer(enemy);
    this.playEnemyActionAnimation(enemy, 'attack', 280);
    const hitbox = this.getEnemyActionArea(enemy, 'weapon');
    this.addDebugAttackArea(hitbox, 0xef4444, 280, `Attacco ${String(enemy.getData('monsterType') ?? 'mostro')}: ${String(enemy.getData('weaponEffectType') ?? 'melee-sweep')} · ${String(enemy.getData('weaponShape') ?? 'rectangle')}`);
    this.effects.play(GameEffectKey.MonsterAttack, enemy, {
      direction: enemy.monsterFacing,
      followTarget: true,
      combatArea: this.toEffectArea(hitbox, enemy.monsterFacing ?? 'down'),
      effectVariant: Number(enemy.getData('weaponEffectVariant') ?? 1),
      effectType: this.resolveCombatEffectType(enemy.getData('weaponEffectType'), 'melee-sweep'),
    });
    if (this.usesEventMinigames() && this.shouldLaunchEncounterMinigame(enemy, 'combat')) {
      this.tryStartMonsterMinigame(enemy);
      return;
    }

    const baseDamage = Number(enemy.getData('contactDamage') ?? 1);
    const multiplier = Number(enemy.getData('weaponDamageMultiplier') ?? 1);
    const damage = Math.max(1, Math.round(baseDamage * multiplier));
    this.damagePlayerIfHit(enemy, hitbox, damage);
  }

  private enemySpecialAttack(enemy: EnemySprite): void {
    const now = this.time.now;
    const cooldown = Number(enemy.getData('specialCooldown') ?? 2600);
    const cost = Number(enemy.getData('specialManaCost') ?? 12);
    const mana = Number(enemy.getData('mana') ?? 0);

    enemy.setData('mana', Math.max(0, mana - cost));
    enemy.setData('nextSpecialAttackAt', now + cooldown);
    enemy.setData('nextWeaponAttackAt', now + 420);

    this.faceEnemyTowardPlayer(enemy);
    this.playEnemyActionAnimation(enemy, 'attack', 320);
    const hitbox = this.getEnemyActionArea(enemy, 'special');
    this.addDebugAttackArea(hitbox, 0xa855f7, 320, `Speciale ${String(enemy.getData('monsterType') ?? 'mostro')}: ${String(enemy.getData('specialEffectType') ?? 'area-burst')} · ${String(enemy.getData('specialShape') ?? 'rectangle')}`);
    this.effects.play(GameEffectKey.MonsterSpecial, enemy, {
      direction: enemy.monsterFacing,
      followTarget: true,
      force: true,
      combatArea: this.toEffectArea(hitbox, enemy.monsterFacing ?? 'down'),
      effectVariant: Number(enemy.getData('specialEffectVariant') ?? 1),
      effectType: this.resolveCombatEffectType(enemy.getData('specialEffectType'), 'area-burst'),
    });
    if (this.usesEventMinigames() && this.shouldLaunchEncounterMinigame(enemy, 'combat')) {
      this.tryStartMonsterMinigame(enemy);
      return;
    }

    const baseDamage = Number(enemy.getData('contactDamage') ?? 1);
    const multiplier = Number(enemy.getData('specialDamageMultiplier') ?? 1.6);
    const level = Number(enemy.getData('level') ?? 1);
    const damage = Math.max(1, Math.round(baseDamage * multiplier + level));
    this.damagePlayerIfHit(enemy, hitbox, damage);
  }

  private damagePlayerIfHit(enemy: EnemySprite, hitbox: CombatArea, damage: number): void {
    if (this.isCombatAreaIntersectingBody(hitbox, this.getArcadeBodyBounds(this.player))) {
      this.damagePlayer(damage, enemy);
    }
  }

  private updatePatrolEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (this.time.now > Number(enemy.getData('changeDirAt'))) {
      this.pickEnemyPatrolDirection(enemy);
    }
  }

  private pickEnemyPatrolDirection(enemy: Phaser.Physics.Arcade.Sprite): void {
    const speed = Number(enemy.getData('speed') ?? this.params.enemySpeed);
    const directions = [
      { x: speed, y: 0 },
      { x: -speed, y: 0 },
      { x: 0, y: speed },
      { x: 0, y: -speed }
    ];

    const dir = Phaser.Utils.Array.GetRandom(directions);
    enemy.setVelocity(dir.x, dir.y);
    if ('monsterFacing' in enemy) {
      (enemy as EnemySprite).monsterFacing = dir.x > 0 ? 'right' : dir.x < 0 ? 'left' : dir.y < 0 ? 'up' : 'down';
    }
    enemy.setData('changeDirAt', this.time.now + Phaser.Math.Between(900, 1800));
  }

  private updateDynamicTraps(time: number): void {
    this.dynamicTraps.children.iterate(child => {
      const trap = child as Phaser.Physics.Arcade.Sprite | undefined;
      if (!trap?.active) return true;

      const axis = trap.getData('axis') as 'x' | 'y';
      const baseX = Number(trap.getData('baseX'));
      const baseY = Number(trap.getData('baseY'));
      const phase = Number(trap.getData('phase'));
      const range = Number(trap.getData('range'));
      const offset = Math.sin(time / 450 + phase) * range;

      if (axis === 'x') trap.x = baseX + offset;
      else trap.y = baseY + offset;

      trap.body?.updateFromGameObject();
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Barre vita/mana sopra eroe e mostri.
  // ---------------------------------------------------------------------------

  private createPlayerBars(): void {
    this.playerBars = {
      hp: this.add.graphics().setDepth(1300),
      mana: this.add.graphics().setDepth(1300),
      fatigue: this.add.graphics().setDepth(1300)
    };
  }

  private createEnemyWidgets(enemy: EnemySprite): void {
    const hpBar = this.add.graphics().setDepth(1290);
    const manaBar = this.add.graphics().setDepth(1290);
    const levelText = this.add.text(enemy.x, enemy.y - 53, '', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fde68a',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1291);
    enemy.setData('hpBar', hpBar);
    enemy.setData('manaBar', manaBar);
    enemy.setData('levelText', levelText);
  }

  private destroyEnemyWidgets(enemy: EnemySprite): void {
    const hpBar = enemy.getData('hpBar') as Phaser.GameObjects.Graphics | undefined;
    const manaBar = enemy.getData('manaBar') as Phaser.GameObjects.Graphics | undefined;
    const levelText = enemy.getData('levelText') as Phaser.GameObjects.Text | undefined;
    hpBar?.destroy();
    manaBar?.destroy();
    levelText?.destroy();
  }

  private updateStatusBars(): void {
    if (this.player?.active && this.playerBars) {
      this.drawBar(this.playerBars.hp, this.player.x - 24, this.player.y - 52, 48, 5, this.heroHealth, this.heroMaxHealth, 0x22c55e);
      this.drawBar(this.playerBars.mana, this.player.x - 24, this.player.y - 45, 48, 4, this.heroMana, this.heroMaxMana, 0x38bdf8);
      this.drawBar(this.playerBars.fatigue, this.player.x - 24, this.player.y - 39, 48, 3, this.heroFatigue, this.heroMaxFatigue, 0xf97316);
    }

    this.enemies.children.iterate(child => {
      const enemy = child as EnemySprite | undefined;
      if (!enemy?.active) return true;

      const hpBar = enemy.getData('hpBar') as Phaser.GameObjects.Graphics | undefined;
      const manaBar = enemy.getData('manaBar') as Phaser.GameObjects.Graphics | undefined;
      const levelText = enemy.getData('levelText') as Phaser.GameObjects.Text | undefined;

      levelText?.setPosition(enemy.x, enemy.y - 53);
      levelText?.setText(`LV. ${Math.max(1, Math.floor(Number(enemy.getData('level') ?? 1)))}`);

      if (hpBar) {
        this.drawBar(hpBar, enemy.x - 22, enemy.y - 39, 44, 4, Number(enemy.getData('hp') ?? 0), Number(enemy.getData('maxHp') ?? 1), 0xef4444);
      }

      if (manaBar) {
        this.drawBar(manaBar, enemy.x - 22, enemy.y - 33, 44, 3, Number(enemy.getData('mana') ?? 0), Number(enemy.getData('maxMana') ?? 1), 0x60a5fa);
      }

      return true;
    });
  }

  private drawBar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    current: number,
    total: number,
    color: number
  ): void {
    const safeTotal = Math.max(1, total);
    const ratio = Phaser.Math.Clamp(current / safeTotal, 0, 1);

    graphics.clear();
    graphics.fillStyle(0x000000, 0.68);
    graphics.fillRect(x - 1, y - 1, width + 2, height + 2);
    graphics.fillStyle(0xffffff, 0.24);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(color, 0.92);
    graphics.fillRect(x, y, width * ratio, height);
  }

  // ---------------------------------------------------------------------------
  // Camera, UI, stati partita.
  // ---------------------------------------------------------------------------

  private createCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(
      0,
      0,
      this.mapWidth * this.tileSize,
      this.mapHeight * this.tileSize
    );
  }

  private createUI(): void {
    this.updateUI();
  }

  private updateUI(): void {
    this.emitLives();
  }

  private finishGame(): void {
    if (this.gameOver) return;

    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.emitState('won');
    this.emitResult({
      status: 'win',
      state: 'won',
      title: 'Vittoria!',
      message: `${this.heroProfile.heroTitle} ha completato il percorso con ${this.score} punti.`,
      score: this.score,
      elapsedMs: Math.max(0, this.time.now - this.matchStartedAt),
      heroName: this.heroProfile.heroTitle,
      remainingHealth: this.heroHealth,
      remainingMana: Math.floor(this.heroMana),
      remainingFatigue: Math.floor(this.heroFatigue),
      completedAt: new Date().toISOString(),
      reason: 'finish-zone',
      modeId: this.params.modeId,
      matchLevel: this.params.matchLevel,
      ...this.buildStatisticResult(),
    });
  }

  private endGame(reason: 'hero-defeated' | 'hero-exhausted' = 'hero-defeated'): void {
    if (this.gameOver) return;

    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.playerVisual?.setTint(0x333333);
    this.emitState('gameover');
    this.emitResult({
      status: 'lose',
      state: 'gameover',
      title: 'Sconfitta',
      message: reason === 'hero-exhausted'
        ? `${this.heroProfile.heroTitle} è esausto e non può più combattere. Punteggio finale: ${this.score}.`
        : `${this.heroProfile.heroTitle} è stato sconfitto. Punteggio finale: ${this.score}.`,
      score: this.score,
      elapsedMs: Math.max(0, this.time.now - this.matchStartedAt),
      heroName: this.heroProfile.heroTitle,
      remainingHealth: this.heroHealth,
      remainingMana: Math.floor(this.heroMana),
      remainingFatigue: Math.floor(this.heroFatigue),
      completedAt: new Date().toISOString(),
      reason,
      modeId: this.params.modeId,
      matchLevel: this.params.matchLevel,
      ...this.buildStatisticResult(),
    });
  }

  private buildStatisticResult(): Partial<GameResult> {
    return {
      enemiesKilled: this.enemiesKilled,
      attacksPerformed: this.attacksPerformed,
      specialsPerformed: this.specialsPerformed,
      damageDealt: this.damageDealt,
      damageReceived: this.damageReceived,
      damageReceivedEvents: this.damageReceivedEvents,
      blocksPerformed: this.blocksPerformed,
      treasuresCollected: this.treasuresCollected,
    };
  }

  private showCenteredMessage(message: string): void {
    const text = this.add.text(
      Number(this.scale.width) / 2,
      Number(this.scale.height) / 2,
      message,
      {
        fontFamily: 'Arial',
        fontSize: '30px',
        align: 'center',
        color: '#ffffff',
        backgroundColor: '#000000cc',
        padding: { x: 18, y: 14 }
      }
    );

    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(2200);
  }
}
