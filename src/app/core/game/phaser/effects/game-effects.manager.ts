import Phaser from "phaser";
import { COMBAT_EFFECT_VARIANTS_CONFIG } from '../config/game-effects-variants.config';

export enum GameEffectKey {
  HeroAttack = "hero-attack",
  HeroSpecial = "hero-special",
  HeroDefense = "hero-defense",
  MonsterAttack = "monster-attack",
  MonsterSpecial = "monster-special",
  MonsterDefense = "monster-defense",
  Heal = "heal",
  Poison = "poison",
  Explosion = "explosion",
  Hit = "hit",
}

export type EffectDirection = "up" | "down" | "left" | "right";
export type SlashEffectQuality = "low" | "medium" | "high";
export type CombatEffectType = 'melee-sweep' | 'area-burst' | 'beam' | 'projectile' | 'breath';

export interface SlashEffectConfig {
  enabled: boolean;
  originOffsetX: number;
  colorPrimary: number;
  colorSecondary: number;
  colorCore: number;
  alpha: number;
  duration: number;
  scale: number;
  arcCount: number;
  arcRadius: number;
  arcThickness: number;
  arcSpread: number;
  trailCount: number;
  sparkCount: number;
  sparkDistance: number;
  forwardOffset: number;
  verticalOffset: number;
  rotationOffsetDeg: number;
  blendMode: Phaser.BlendModes | number;
  cameraShake: boolean;
  cameraShakeDuration: number;
  cameraShakeIntensity: number;
}

export interface SpecialEffectConfig {
  enabled: boolean;
  originOffsetX: number;
  colorPrimary: number;
  colorSecondary: number;
  colorCore: number;
  alpha: number;
  duration: number;
  scale: number;
  ringCount: number;
  slashCount: number;
  radialBurstCount: number;
  radius: number;
  expansion: number;
  rotationSpeed: number;
  verticalOffset: number;
  blendMode: Phaser.BlendModes | number;
  cameraShake: boolean;
  cameraShakeDuration: number;
  cameraShakeIntensity: number;
}

export interface ShieldEffectConfig {
  enabled: boolean;
  originOffsetX: number;
  colorPrimary: number;
  colorSecondary: number;
  alpha: number;
  duration: number;
  scale: number;
  radius: number;
  ringThickness: number;
  pulseCount: number;
  verticalOffset: number;
  followTarget: boolean;
  blendMode: Phaser.BlendModes | number;
}

export interface HealEffectConfig {
  enabled: boolean;
  originOffsetX: number;
  colorPrimary: number;
  colorSecondary: number;
  colorCore: number;
  alpha: number;
  duration: number;
  scale: number;
  ringCount: number;
  moteCount: number;
  riseDistance: number;
  radius: number;
  verticalOffset: number;
  blendMode: Phaser.BlendModes | number;
}

export interface PoisonEffectConfig {
  enabled: boolean;
  originOffsetX: number;
  colorPrimary: number;
  colorSecondary: number;
  alpha: number;
  duration: number;
  scale: number;
  hazeCount: number;
  moteCount: number;
  riseDistance: number;
  radius: number;
  verticalOffset: number;
  wobble: number;
  blendMode: Phaser.BlendModes | number;
}

export interface ExplosionEffectConfig {
  enabled: boolean;
  originOffsetX: number;
  colorPrimary: number;
  colorSecondary: number;
  colorCore: number;
  alpha: number;
  duration: number;
  scale: number;
  ringCount: number;
  shardCount: number;
  radius: number;
  expansion: number;
  verticalOffset: number;
  blendMode: Phaser.BlendModes | number;
  cameraShake: boolean;
  cameraShakeDuration: number;
  cameraShakeIntensity: number;
}

export interface HitEffectConfig {
  enabled: boolean;
  originOffsetX: number;
  colorPrimary: number;
  colorSecondary: number;
  alpha: number;
  duration: number;
  scale: number;
  slashCount: number;
  sparkCount: number;
  radius: number;
  verticalOffset: number;
  blendMode: Phaser.BlendModes | number;
}

export interface HackSlashEffectTuning {
  enabled: boolean;
  globalScale: number;
  globalAlpha: number;
  globalDurationMultiplier: number;
  globalDepthOffset: number;
  slashQuality: SlashEffectQuality;
  heroAttack: SlashEffectConfig;
  heroSpecial: SpecialEffectConfig;
  heroDefense: ShieldEffectConfig;
  monsterAttack: SlashEffectConfig;
  monsterSpecial: SpecialEffectConfig;
  monsterDefense: ShieldEffectConfig;
  heal: HealEffectConfig;
  poison: PoisonEffectConfig;
  explosion: ExplosionEffectConfig;
  hit: HitEffectConfig;
}

export type EffectTuningOverride =
  | Partial<SlashEffectConfig>
  | Partial<SpecialEffectConfig>
  | Partial<ShieldEffectConfig>
  | Partial<HealEffectConfig>
  | Partial<PoisonEffectConfig>
  | Partial<ExplosionEffectConfig>
  | Partial<HitEffectConfig>;

type CombatEffectRole = 'heroAttack' | 'heroSpecial' | 'heroDefense' | 'monsterAttack' | 'monsterSpecial' | 'monsterDefense';

export interface CombatEffectArea {
  shape: 'rectangle' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  /** Punto iniziale dell'azione; presente per le aree rettangolari direzionali. */
  startX?: number;
  startY?: number;
  /** Bordo terminale dell'azione; presente per le aree rettangolari direzionali. */
  endX?: number;
  endY?: number;
}

/** Catalogo di varianti visive. Le dimensioni sono sempre derivate dalla CombatEffectArea. */
const COMBAT_EFFECT_VARIANTS: Record<CombatEffectRole, Record<number, EffectTuningOverride>> = COMBAT_EFFECT_VARIANTS_CONFIG;

export interface GameEffectOptions {
  x?: number;
  y?: number;
  offsetX?: number;
  offsetY?: number;
  depth?: number;
  scale?: number;
  alpha?: number;
  duration?: number;
  colorPrimary?: number;
  colorSecondary?: number;
  direction?: EffectDirection;
  followTarget?: boolean;
  force?: boolean;
  tuningOverride?: EffectTuningOverride;
  /** Area di combattimento effettiva: prevale su offset e dimensioni visive fisse. */
  combatArea?: CombatEffectArea;
  /** Variante del catalogo visivo relativa al ruolo corrente. */
  effectVariant?: number;
  /** Tipo di resa dell'area: non modifica mai la collisione. */
  effectType?: CombatEffectType;
}

export const DEFAULT_HACK_SLASH_EFFECT_TUNING: HackSlashEffectTuning = {
  enabled: true,
  globalScale: 1,
  globalAlpha: 1,
  globalDurationMultiplier: 1,
  globalDepthOffset: 40,
  slashQuality: "medium",
  heroAttack: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0xffd166,
    colorSecondary: 0xff7a18,
    colorCore: 0xffffff,
    alpha: 0.95,
    duration: 300,
    scale: 1,
    arcCount: 2,
    arcRadius: 44,
    arcThickness: 8,
    arcSpread: 75,
    trailCount: 2,
    sparkCount: 6,
    sparkDistance: 34,
    forwardOffset: 26,
    verticalOffset: 30,
    rotationOffsetDeg: -5,
    blendMode: Phaser.BlendModes.ADD,
    cameraShake: false,
    cameraShakeDuration: 80,
    cameraShakeIntensity: 0.002,
  },
  heroSpecial: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0x8b5cf6,
    colorSecondary: 0x38bdf8,
    colorCore: 0xffffff,
    alpha: 0.9,
    duration: 1560,
    scale: 1.1,
    ringCount: 3,
    slashCount: 3,
    radialBurstCount: 12,
    radius: 58,
    expansion: 1.45,
    rotationSpeed: 90,
    verticalOffset: 30,
    blendMode: Phaser.BlendModes.ADD,
    cameraShake: true,
    cameraShakeDuration: 120,
    cameraShakeIntensity: 0.003,
  },
  heroDefense: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0x7dd3fc,
    colorSecondary: 0xe0f2fe,
    alpha: 0.75,
    duration: 260,
    scale: 1,
    radius: 42,
    ringThickness: 5,
    pulseCount: 1,
    verticalOffset: 30,
    followTarget: false,
    blendMode: Phaser.BlendModes.ADD,
  },
  monsterAttack: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0xff3b1f,
    colorSecondary: 0xff8a00,
    colorCore: 0xfff1c1,
    alpha: 0.86,
    duration: 190,
    scale: 0.92,
    arcCount: 1,
    arcRadius: 36,
    arcThickness: 7,
    arcSpread: 68,
    trailCount: 1,
    sparkCount: 2,
    sparkDistance: 24,
    forwardOffset: 18,
    verticalOffset: 30,
    rotationOffsetDeg: -24,
    blendMode: Phaser.BlendModes.ADD,
    cameraShake: false,
    cameraShakeDuration: 70,
    cameraShakeIntensity: 0.002,
  },
  monsterSpecial: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0x8b1cf6,
    colorSecondary: 0xef4444,
    colorCore: 0xffd1d1,
    alpha: 0.88,
    duration: 520,
    scale: 1.02,
    ringCount: 2,
    slashCount: 3,
    radialBurstCount: 10,
    radius: 48,
    expansion: 1.32,
    rotationSpeed: 78,
    verticalOffset: 30,
    blendMode: Phaser.BlendModes.ADD,
    cameraShake: false,
    cameraShakeDuration: 90,
    cameraShakeIntensity: 0.0025,
  },
  monsterDefense: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0x94a3b8,
    colorSecondary: 0xbfdbfe,
    alpha: 0.62,
    duration: 280,
    scale: 0.95,
    radius: 36,
    ringThickness: 4,
    pulseCount: 1,
    verticalOffset: 30,
    followTarget: false,
    blendMode: Phaser.BlendModes.ADD,
  },
  heal: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0x86efac,
    colorSecondary: 0xfef9c3,
    colorCore: 0xffffff,
    alpha: 0.86,
    duration: 3860,
    scale: 1,
    ringCount: 2,
    moteCount: 9,
    riseDistance: 54,
    radius: 24,
    verticalOffset: 30,
    blendMode: Phaser.BlendModes.ADD,
  },
  poison: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0x84cc16,
    colorSecondary: 0x9333ea,
    alpha: 0.54,
    duration: 820,
    scale: 1,
    hazeCount: 3,
    moteCount: 8,
    riseDistance: 42,
    radius: 22,
    verticalOffset: 30,
    wobble: 10,
    blendMode: Phaser.BlendModes.ADD,
  },
  explosion: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0xf97316,
    colorSecondary: 0xfacc15,
    colorCore: 0xffffff,
    alpha: 0.92,
    duration: 360,
    scale: 1,
    ringCount: 2,
    shardCount: 10,
    radius: 24,
    expansion: 1.9,
    verticalOffset: 30,
    blendMode: Phaser.BlendModes.ADD,
    cameraShake: false,
    cameraShakeDuration: 90,
    cameraShakeIntensity: 0.0025,
  },
  hit: {
    enabled: true,
    originOffsetX: 0,
    colorPrimary: 0xef4444,
    colorSecondary: 0xffffff,
    alpha: 0.92,
    duration: 150,
    scale: 1,
    slashCount: 2,
    sparkCount: 4,
    radius: 24,
    verticalOffset: 30,
    blendMode: Phaser.BlendModes.ADD,
  },
};

type EffectTarget = Phaser.GameObjects.GameObject & {
  x?: number;
  y?: number;
  depth?: number;
  displayHeight?: number;
  height?: number;
  getData?: (key: string) => unknown;
};

type TweenableEffectTarget = Phaser.GameObjects.Graphics | Phaser.GameObjects.Shape | Phaser.GameObjects.Container;

export class GameEffectsManager {
  private readonly lastPlayed = new WeakMap<Phaser.GameObjects.GameObject, Map<GameEffectKey, number>>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tuning: HackSlashEffectTuning = DEFAULT_HACK_SLASH_EFFECT_TUNING,
  ) {}

  play(key: GameEffectKey, target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    if (!target || !this.tuning.enabled || !this.canPlay(key, target, options)) {
      return;
    }

    switch (key) {
      case GameEffectKey.HeroAttack:
        this.playHeroAttack(target, options);
        break;
      case GameEffectKey.HeroSpecial:
        this.playHeroSpecial(target, options);
        break;
      case GameEffectKey.HeroDefense:
        this.playHeroDefense(target, options);
        break;
      case GameEffectKey.MonsterAttack:
        this.playMonsterAttack(target, options);
        break;
      case GameEffectKey.MonsterSpecial:
        this.playMonsterSpecial(target, options);
        break;
      case GameEffectKey.MonsterDefense:
        this.playMonsterDefense(target, options);
        break;
      case GameEffectKey.Heal:
        this.playHeal(target, options);
        break;
      case GameEffectKey.Poison:
        this.playPoison(target, options);
        break;
      case GameEffectKey.Explosion:
        this.playExplosion(target, options);
        break;
      case GameEffectKey.Hit:
        this.playHit(target, options);
        break;
    }
  }

  private playHeroAttack(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.adaptSlashToArea(this.resolveSlashConfig(this.tuning.heroAttack, options, 'heroAttack'), options?.combatArea);
    if (!config.enabled) {
      return;
    }

    const direction = this.resolveDirection(target, options?.direction);
    const effectType = options?.effectType ?? 'melee-sweep';
    const area = options?.combatArea;
    // Il fendente storico è un arco dinamico: va mantenuto per i melee-sweep.
    // Gli altri tipi rendono invece la geometria completa dell'area reale.
    const areaEffect = effectType !== 'melee-sweep' && area?.shape === 'rectangle'
      ? this.createRectangularCombatEffect(area, direction, config, effectType, this.getCombatPoint(target, options).depth)
      : effectType !== 'melee-sweep' && area?.shape === 'circle'
        ? this.createCircularCombatEffect(area, config, effectType, this.getCombatPoint(target, options).depth)
        : undefined;
    if (areaEffect) {
      this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
      this.tweenAndDestroy(areaEffect, config.duration, config.scale * 1.08, 0);
      return;
    }
    const point = this.getMeleeSweepPoint(target, options, config, direction);
    const offset = options?.combatArea ? { x: 0, y: 0 } : this.getDirectionalOffset(direction, config.forwardOffset);
    const container = this.createSlashCrescent(point.x + offset.x, point.y + offset.y, config, direction, point.depth);
    this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
    this.tweenAndDestroy(container, config.duration, config.scale * 1.22, config.rotationOffsetDeg * -0.2);
  }

  private playMonsterAttack(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.adaptSlashToArea(this.resolveSlashConfig(this.tuning.monsterAttack, options, 'monsterAttack'), options?.combatArea);
    if (!config.enabled) {
      return;
    }

    const direction = this.resolveDirection(target, options?.direction);
    const effectType = options?.effectType ?? 'melee-sweep';
    const area = options?.combatArea;
    // Mantiene il crescent originale dei mostri per i normali attacchi melee.
    const areaEffect = effectType !== 'melee-sweep' && area?.shape === 'rectangle'
      ? this.createRectangularCombatEffect(area, direction, config, effectType, this.getCombatPoint(target, options).depth)
      : effectType !== 'melee-sweep' && area?.shape === 'circle'
        ? this.createCircularCombatEffect(area, config, effectType, this.getCombatPoint(target, options).depth)
        : undefined;
    if (areaEffect) {
      this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
      this.tweenAndDestroy(areaEffect, config.duration, config.scale * 1.06, 0);
      return;
    }
    const point = this.getMeleeSweepPoint(target, options, config, direction);
    const offset = options?.combatArea ? { x: 0, y: 0 } : this.getDirectionalOffset(direction, config.forwardOffset);
    const container = this.createSlashCrescent(point.x + offset.x, point.y + offset.y, config, direction, point.depth);
    this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
    this.tweenAndDestroy(container, config.duration, config.scale * 1.16, config.rotationOffsetDeg * 0.35);
  }

  private playHeroSpecial(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.adaptSpecialToArea(this.resolveSpecialConfig(this.tuning.heroSpecial, options, 'heroSpecial'), options?.combatArea);
    if (!config.enabled) {
      return;
    }

    const direction = this.resolveDirection(target, options?.direction);
    const effectType = options?.effectType ?? 'area-burst';
    const area = options?.combatArea;
    const rectangle = area?.shape === 'rectangle'
      ? this.createRectangularCombatEffect(area, direction, config, effectType, this.getCombatPoint(target, options).depth)
      : undefined;
    if (rectangle) {
      this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
      this.tweenAndDestroy(rectangle, config.duration, config.scale * config.expansion, 0);
      return;
    }
    const point = this.getCombatPoint(target, options, config.originOffsetX, config.verticalOffset);
    const container = this.createSpecialSlashBurst(point.x, point.y, config, point.depth);
    this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
    this.tweenAndDestroy(container, config.duration, config.scale * config.expansion, config.rotationSpeed * 0.12);
  }

  private playMonsterSpecial(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.adaptSpecialToArea(this.resolveSpecialConfig(this.tuning.monsterSpecial, options, 'monsterSpecial'), options?.combatArea);
    if (!config.enabled) {
      return;
    }

    const direction = this.resolveDirection(target, options?.direction);
    const effectType = options?.effectType ?? 'area-burst';
    const area = options?.combatArea;
    const rectangle = area?.shape === 'rectangle'
      ? this.createRectangularCombatEffect(area, direction, config, effectType, this.getCombatPoint(target, options).depth)
      : undefined;
    if (rectangle) {
      this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
      this.tweenAndDestroy(rectangle, config.duration, config.scale * config.expansion, 0);
      return;
    }
    const point = this.getCombatPoint(target, options, config.originOffsetX, config.verticalOffset);
    const container = this.createSpecialSlashBurst(point.x, point.y, config, point.depth);
    this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
    this.tweenAndDestroy(container, config.duration, config.scale * config.expansion, -config.rotationSpeed * 0.1);
  }

  private playHeroDefense(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.adaptShieldToArea(this.resolveShieldConfig(this.tuning.heroDefense, options, 'heroDefense'), options?.combatArea);
    if (!config.enabled) {
      return;
    }

    const point = this.getCombatPoint(target, options, config.originOffsetX, config.verticalOffset);
    const direction = this.resolveDirection(target, options?.direction);
    if (options?.combatArea?.shape === 'circle') {
      const container = this.createOrbitingCircularShield(config, point.x, point.y, point.depth);
      // L'istanza deve restare visibile almeno per un'orbita completa.
      this.tweenAndDestroy(container, Math.max(config.duration, 850), config.scale * 1.04, 0);
      return;
    }
    const offset = options?.combatArea ? { x: 0, y: 0 } : this.getDirectionalOffset(direction, Math.round(config.radius * 0.55));
    const container = this.scene.add.container(point.x + offset.x, point.y + offset.y);
    container.setDepth(point.depth);
    container.setScale(config.scale);

    const arcane = this.createShieldBarrier(config, direction);
    container.add(arcane);
    this.tweenAndDestroy(container, config.duration, config.scale * 1.08, 0);
  }

  private playMonsterDefense(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.adaptShieldToArea(this.resolveShieldConfig(this.tuning.monsterDefense, options, 'monsterDefense'), options?.combatArea);
    if (!config.enabled) {
      return;
    }

    const point = this.getCombatPoint(target, options, config.originOffsetX, config.verticalOffset);
    const direction = this.resolveDirection(target, options?.direction);
    if (options?.combatArea?.shape === 'circle') {
      const container = this.createOrbitingCircularShield(config, point.x, point.y, point.depth, true);
      this.tweenAndDestroy(container, Math.max(config.duration, 1000), config.scale * 1.03, 0);
      return;
    }
    const container = this.scene.add.container(point.x, point.y);
    container.setDepth(point.depth);
    container.setScale(config.scale);

    const aura = this.createShieldBarrier(config, direction, true);
    container.add(aura);
    this.tweenAndDestroy(container, config.duration, config.scale * 1.06, 0);
  }

  private playHeal(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.resolveHealConfig(this.tuning.heal, options);
    if (!config.enabled) {
      return;
    }

    const point = this.getTargetPoint(target, options, config.originOffsetX, config.verticalOffset);
    const container = this.scene.add.container(point.x, point.y);
    container.setDepth(point.depth);
    container.setScale(config.scale);

    for (let index = 0; index < config.ringCount; index += 1) {
      const radius = Math.max(10, config.radius - index * 7);
      const ring = this.scene.add.circle(0, 0, radius, config.colorPrimary, 0.04 * config.alpha)
        .setStrokeStyle(Math.max(2, 4 - index), index === 0 ? config.colorSecondary : config.colorPrimary, 0.84 * config.alpha)
        .setBlendMode(config.blendMode);
      container.add(ring);
      this.scene.tweens.add({
        targets: ring,
        scale: 1.55 + index * 0.12,
        alpha: 0,
        duration: config.duration,
        ease: "Cubic.Out",
      });
    }

    const glow = this.scene.add.circle(0, 0, Math.max(8, config.radius * 0.42), config.colorCore, 0.12 * config.alpha)
      .setBlendMode(config.blendMode);
    container.add(glow);

    for (let index = 0; index < config.moteCount; index += 1) {
      const mote = this.scene.add.circle(
        Phaser.Math.Between(-14, 14),
        Phaser.Math.Between(-4, 16),
        Phaser.Math.Between(2, 4),
        index % 3 === 0 ? config.colorSecondary : config.colorPrimary,
        0.86 * config.alpha,
      ).setBlendMode(config.blendMode);
      container.add(mote);
      this.scene.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-8, 8),
        y: mote.y - Phaser.Math.Between(Math.round(config.riseDistance * 0.6), config.riseDistance),
        scale: Phaser.Math.FloatBetween(1.1, 1.6),
        alpha: 0,
        duration: Phaser.Math.Between(Math.round(config.duration * 0.6), config.duration),
        ease: "Sine.Out",
      });
    }

    this.tweenAndDestroy(container, config.duration, config.scale * 1.12, 0);
  }

  private playPoison(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.resolvePoisonConfig(this.tuning.poison, options);
    if (!config.enabled) {
      return;
    }

    const point = this.getTargetPoint(target, options, config.originOffsetX, config.verticalOffset);
    const container = this.scene.add.container(point.x, point.y);
    container.setDepth(point.depth);
    container.setScale(config.scale);

    for (let index = 0; index < config.hazeCount; index += 1) {
      const haze = this.scene.add.ellipse(
        Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(0, 10),
        config.radius + Phaser.Math.Between(-8, 6),
        Math.max(10, config.radius * 0.7 + Phaser.Math.Between(-4, 6)),
        index % 2 === 0 ? config.colorPrimary : config.colorSecondary,
        0.08 * config.alpha,
      ).setBlendMode(config.blendMode);
      container.add(haze);
      this.scene.tweens.add({
        targets: haze,
        x: haze.x + Phaser.Math.Between(-config.wobble, config.wobble),
        y: haze.y - Phaser.Math.Between(Math.round(config.riseDistance * 0.35), Math.round(config.riseDistance * 0.6)),
        scaleX: 1.2,
        scaleY: 1.1,
        alpha: 0,
        duration: config.duration,
        ease: "Sine.Out",
      });
    }

    for (let index = 0; index < config.moteCount; index += 1) {
      const mote = this.scene.add.circle(
        Phaser.Math.Between(-14, 14),
        Phaser.Math.Between(0, 18),
        Phaser.Math.Between(2, 4),
        index % 2 === 0 ? config.colorPrimary : config.colorSecondary,
        0.7 * config.alpha,
      ).setBlendMode(config.blendMode);
      container.add(mote);
      this.scene.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-config.wobble, config.wobble),
        y: mote.y - Phaser.Math.Between(Math.round(config.riseDistance * 0.45), config.riseDistance),
        alpha: 0,
        duration: Phaser.Math.Between(Math.round(config.duration * 0.55), config.duration),
        ease: "Sine.Out",
      });
    }

    this.tweenAndDestroy(container, config.duration, config.scale * 1.06, 0);
  }

  private playExplosion(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.resolveExplosionConfig(this.tuning.explosion, options);
    if (!config.enabled) {
      return;
    }

    const point = this.getTargetPoint(target, options, config.originOffsetX, config.verticalOffset);
    const container = this.scene.add.container(point.x, point.y);
    container.setDepth(point.depth);
    container.setScale(config.scale);

    const flash = this.scene.add.circle(0, 0, Math.max(8, config.radius * 0.42), config.colorCore, 0.24 * config.alpha)
      .setBlendMode(config.blendMode);
    container.add(flash);

    for (let index = 0; index < config.ringCount; index += 1) {
      const ring = this.scene.add.circle(0, 0, Math.max(10, config.radius - index * 5), config.colorPrimary, 0.05 * config.alpha)
        .setStrokeStyle(Math.max(2, 4 - index), index === 0 ? config.colorSecondary : config.colorPrimary, 0.92 * config.alpha)
        .setBlendMode(config.blendMode);
      container.add(ring);
      this.scene.tweens.add({
        targets: ring,
        scale: config.expansion + index * 0.1,
        alpha: 0,
        duration: config.duration,
        ease: "Cubic.Out",
      });
    }

    const shards = this.createShardBurst(config.shardCount, config.radius, config.colorPrimary, config.colorSecondary, config.blendMode, 3);
    container.add(shards);
    this.applyCameraShake(config.cameraShake, config.cameraShakeDuration, config.cameraShakeIntensity);
    this.tweenAndDestroy(container, config.duration, config.scale * 1.08, 10);
  }

  private playHit(target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): void {
    const config = this.resolveHitConfig(this.tuning.hit, options);
    if (!config.enabled) {
      return;
    }

    const point = this.getTargetPoint(target, options, config.verticalOffset);
    const container = this.scene.add.container(point.x, point.y);
    container.setDepth(point.depth);
    container.setScale(config.scale);

    for (let index = 0; index < config.slashCount; index += 1) {
      const slash = this.createMiniHitSlash(config, index);
      container.add(slash);
    }

    const sparks = this.createShardBurst(config.sparkCount, config.radius, config.colorPrimary, config.colorSecondary, config.blendMode, 2);
    container.add(sparks);
    this.tweenAndDestroy(container, config.duration, config.scale * 1.12, 6);
  }

  private createSlashCrescent(
    x: number,
    y: number,
    config: SlashEffectConfig,
    direction: EffectDirection,
    depth: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(depth);
    container.setScale(config.scale * this.tuning.globalScale);
    container.setRotation(Phaser.Math.DegToRad(this.getDirectionalAngle(direction) + config.rotationOffsetDeg));

    const arcCount = this.resolveQualityCount(config.arcCount);
    for (let index = 0; index < arcCount; index += 1) {
      const radius = config.arcRadius - index * 7;
      const width = Math.max(2, config.arcThickness - index * 2);
      const arc = this.createArcGraphic(
        radius,
        config.arcSpread - index * 8,
        index === 0 ? config.colorPrimary : index === arcCount - 1 ? config.colorCore : config.colorSecondary,
        width,
        config.alpha * (index === 0 ? 1 : 0.82 - index * 0.08),
        config.blendMode,
      );
      arc.setAngle(index === 0 ? 0 : -10 + index * 8);
      arc.setY(index * -2);
      container.add(arc);
    }

    const trailCount = this.resolveQualityCount(config.trailCount);
    for (let index = 0; index < trailCount; index += 1) {
      const trail = this.scene.add.ellipse(
        -8 - index * 10,
        2 + index * 2,
        24 - index * 5,
        8 - index,
        index === 0 ? config.colorSecondary : config.colorPrimary,
        0.12 * config.alpha,
      ).setBlendMode(config.blendMode);
      trail.setAngle(-16 + index * 7);
      container.add(trail);
    }

    const sparks = this.createSparkBursts(
      this.resolveQualityCount(config.sparkCount),
      config.colorSecondary,
      config.alpha,
      Math.max(12, config.sparkDistance - 10),
      config.sparkDistance,
      config.blendMode,
    );
    container.add(sparks);
    return container;
  }

  /**
   * Rende un'area rettangolare usando i suoi veri estremi: lunghezza = range,
   * spessore = arcWidth. Il rendering resta quindi aderente alla hit area.
   */
  private createRectangularCombatEffect(
    area: CombatEffectArea,
    direction: EffectDirection,
    config: SlashEffectConfig | SpecialEffectConfig,
    effectType: CombatEffectType,
    depth: number,
  ): Phaser.GameObjects.Container {
    const endpoints = this.getRectangleEndpoints(area, direction);
    const length = Math.max(1, Phaser.Math.Distance.Between(endpoints.startX, endpoints.startY, endpoints.endX, endpoints.endY));
    const thickness = direction === 'left' || direction === 'right' ? area.height : area.width;
    const container = this.scene.add.container(endpoints.startX, endpoints.startY);
    container.setDepth(depth);
    container.setScale(config.scale * this.tuning.globalScale);
    container.setRotation(Math.atan2(endpoints.endY - endpoints.startY, endpoints.endX - endpoints.startX));

    const effect = this.scene.add.graphics().setBlendMode(config.blendMode);
    const halfThickness = Math.max(1, thickness / 2);
    const outlineWidth = Math.max(2, Math.min(6, thickness * 0.12));
    effect.lineStyle(outlineWidth, config.colorPrimary, config.alpha);

    switch (effectType) {
      case 'breath':
        effect.fillStyle(config.colorPrimary, config.alpha * 0.2);
        effect.fillTriangle(0, -halfThickness * 0.22, 0, halfThickness * 0.22, length, halfThickness);
        effect.lineBetween(0, -halfThickness * 0.22, length, -halfThickness);
        effect.lineBetween(0, halfThickness * 0.22, length, halfThickness);
        effect.lineBetween(length, -halfThickness, length, halfThickness);
        break;
      case 'projectile': {
        effect.destroy();
        this.createFireballProjectile(container, length, thickness, config);
        return container;
      }
      case 'melee-sweep':
        effect.fillStyle(config.colorPrimary, config.alpha * 0.13);
        effect.fillRect(0, -halfThickness, length, thickness);
        effect.strokeRect(0, -halfThickness, length, thickness);
        effect.lineStyle(Math.max(2, outlineWidth - 1), config.colorSecondary, config.alpha * 0.82);
        effect.lineBetween(length, -halfThickness, length, halfThickness);
        break;
      case 'area-burst':
        effect.fillStyle(config.colorPrimary, config.alpha * 0.1);
        effect.fillRect(0, -halfThickness, length, thickness);
        effect.strokeRect(0, -halfThickness, length, thickness);
        effect.lineStyle(Math.max(2, outlineWidth - 2), config.colorSecondary, config.alpha * 0.72);
        effect.lineBetween(0, 0, length, 0);
        break;
      case 'beam':
        // La scia energetica avanza nell'area senza visualizzarne il rettangolo.
        effect.destroy();
        this.createLuminousBeamTrail(container, length, thickness, config);
        return container;
      default:
        effect.fillStyle(config.colorPrimary, config.alpha * 0.1);
        effect.fillRect(0, -halfThickness, length, thickness);
        effect.strokeRect(0, -halfThickness, length, thickness);
        effect.lineStyle(Math.max(2, outlineWidth - 2), config.colorSecondary, config.alpha * 0.72);
        effect.lineBetween(0, 0, length, 0);
        break;
    }

    container.add(effect);
    return container;
  }

  /** Palla di fuoco che attraversa l'area e lascia scie luminose persistenti. */
  private createFireballProjectile(
    container: Phaser.GameObjects.Container,
    length: number,
    thickness: number,
    config: SlashEffectConfig | SpecialEffectConfig,
  ): void {
    const travelDuration = Phaser.Math.Clamp(Math.round(config.duration * 0.52), 220, 720);
    const radius = Phaser.Math.Clamp(thickness * 0.24, 6, 18);
    const projectile = this.scene.add.container(0, 0);
    container.add(projectile);

    const outerGlow = this.scene.add.circle(0, 0, radius * 2.1, config.colorPrimary, config.alpha * 0.16)
      .setBlendMode(config.blendMode);
    const middleGlow = this.scene.add.circle(0, 0, radius * 1.35, config.colorSecondary, config.alpha * 0.5)
      .setBlendMode(config.blendMode);
    const core = this.scene.add.circle(0, 0, radius, 0xffffff, config.alpha * 0.96)
      .setBlendMode(config.blendMode);
    projectile.add([outerGlow, middleGlow, core]);

    this.scene.tweens.add({
      targets: projectile,
      x: length,
      duration: travelDuration,
      ease: 'Quad.In',
    });
    this.scene.tweens.add({
      targets: [outerGlow, middleGlow],
      scale: 1.3,
      alpha: 0.18 * config.alpha,
      duration: 120,
      yoyo: true,
      repeat: Math.max(1, Math.floor(travelDuration / 240)),
      ease: 'Sine.InOut',
    });

    const trailCount = Phaser.Math.Clamp(Math.round(length / 18), 5, 14);
    for (let index = 0; index < trailCount; index += 1) {
      const progress = index / trailCount;
      const trail = this.scene.add.ellipse(
        length * progress,
        Phaser.Math.FloatBetween(-radius * 0.22, radius * 0.22),
        radius * Phaser.Math.FloatBetween(1.4, 2.5),
        radius * Phaser.Math.FloatBetween(0.55, 0.95),
        index % 2 === 0 ? config.colorPrimary : config.colorSecondary,
        config.alpha * Phaser.Math.FloatBetween(0.3, 0.58),
      ).setBlendMode(config.blendMode);
      container.add(trail);
      this.scene.tweens.add({
        targets: trail,
        scaleX: Phaser.Math.FloatBetween(2.1, 3.2),
        scaleY: Phaser.Math.FloatBetween(1.4, 2),
        alpha: 0,
        duration: Math.round(travelDuration * 0.62),
        delay: Math.round(progress * travelDuration),
        ease: 'Sine.Out',
      });
    }

    const impact = this.scene.add.circle(length, 0, radius * 0.85, config.colorSecondary, 0)
      .setBlendMode(config.blendMode);
    container.add(impact);
    this.scene.tweens.add({
      targets: impact,
      scale: 2.8,
      alpha: config.alpha * 0.72,
      duration: Math.round(travelDuration * 0.42),
      delay: Math.round(travelDuration * 0.82),
      ease: 'Cubic.Out',
      yoyo: true,
    });
  }

  /** Scia energetica larga che avanza senza mostrare il contorno dell'hit area. */
  private createLuminousBeamTrail(
    container: Phaser.GameObjects.Container,
    length: number,
    thickness: number,
    config: SlashEffectConfig | SpecialEffectConfig,
  ): void {
    const travelDuration = Phaser.Math.Clamp(Math.round(config.duration * 0.48), 200, 680);
    const beamThickness = Phaser.Math.Clamp(thickness * 0.62, 10, 54);
    const head = this.scene.add.container(0, 0);
    container.add(head);

    const headGlow = this.scene.add.ellipse(0, 0, beamThickness * 2.2, beamThickness * 1.45, config.colorPrimary, config.alpha * 0.2)
      .setBlendMode(config.blendMode);
    const headCore = this.scene.add.ellipse(0, 0, beamThickness * 1.1, beamThickness * 0.72, config.colorSecondary, config.alpha * 0.88)
      .setBlendMode(config.blendMode);
    head.add([headGlow, headCore]);
    this.scene.tweens.add({ targets: head, x: length, duration: travelDuration, ease: 'Quad.InOut' });
    this.scene.tweens.add({
      targets: [headGlow, headCore],
      scaleY: 1.35,
      alpha: config.alpha * 0.24,
      duration: 100,
      yoyo: true,
      repeat: Math.max(1, Math.floor(travelDuration / 200)),
      ease: 'Sine.InOut',
    });

    const trailCount = Phaser.Math.Clamp(Math.round(length / 13), 7, 18);
    for (let index = 0; index < trailCount; index += 1) {
      const progress = index / trailCount;
      const trail = this.scene.add.ellipse(
        length * progress,
        Phaser.Math.FloatBetween(-beamThickness * 0.12, beamThickness * 0.12),
        beamThickness * Phaser.Math.FloatBetween(1.6, 2.8),
        beamThickness * Phaser.Math.FloatBetween(0.7, 1.05),
        index % 2 === 0 ? config.colorPrimary : config.colorSecondary,
        config.alpha * Phaser.Math.FloatBetween(0.28, 0.56),
      ).setBlendMode(config.blendMode);
      container.add(trail);
      this.scene.tweens.add({
        targets: trail,
        scaleX: Phaser.Math.FloatBetween(1.9, 3.1),
        scaleY: Phaser.Math.FloatBetween(1.25, 1.8),
        alpha: 0,
        duration: Math.round(travelDuration * 0.68),
        delay: Math.round(progress * travelDuration),
        ease: 'Sine.Out',
      });
    }
  }

  private createCircularCombatEffect(
    area: CombatEffectArea,
    config: SlashEffectConfig,
    effectType: CombatEffectType,
    depth: number,
  ): Phaser.GameObjects.Container {
    const radius = Math.max(1, area.radius ?? Math.max(area.width, area.height) / 2);
    const container = this.scene.add.container(area.x, area.y);
    container.setDepth(depth);
    container.setScale(config.scale * this.tuning.globalScale);

    const effect = this.scene.add.graphics().setBlendMode(config.blendMode);
    const thickness = Math.max(2, Math.min(6, radius * 0.16));
    effect.fillStyle(config.colorPrimary, effectType === 'area-burst' ? config.alpha * 0.18 : config.alpha * 0.1);
    effect.fillCircle(0, 0, radius);
    effect.lineStyle(thickness, config.colorPrimary, config.alpha);
    effect.strokeCircle(0, 0, radius);
    effect.lineStyle(Math.max(2, thickness - 2), config.colorSecondary, config.alpha * 0.75);
    effect.strokeCircle(0, 0, Math.max(1, radius * 0.62));
    container.add(effect);
    return container;
  }

  private getRectangleEndpoints(
    area: CombatEffectArea,
    direction: EffectDirection,
  ): { startX: number; startY: number; endX: number; endY: number } {
    if (area.startX !== undefined && area.startY !== undefined && area.endX !== undefined && area.endY !== undefined) {
      return { startX: area.startX, startY: area.startY, endX: area.endX, endY: area.endY };
    }

    const length = direction === 'left' || direction === 'right' ? area.width : area.height;
    const offset = this.getDirectionalOffset(direction, length / 2);
    return {
      startX: area.x - offset.x,
      startY: area.y - offset.y,
      endX: area.x + offset.x,
      endY: area.y + offset.y,
    };
  }

  private createSpecialSlashBurst(
    x: number,
    y: number,
    config: SpecialEffectConfig,
    depth: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(depth);
    container.setScale(config.scale * this.tuning.globalScale);

    for (let index = 0; index < config.ringCount; index += 1) {
      const radius = Math.max(12, config.radius - index * 11);
      const ring = this.scene.add.circle(0, 0, radius, index === 0 ? config.colorPrimary : config.colorSecondary, 0.03 * config.alpha)
        .setStrokeStyle(Math.max(2, 4 - index), index === config.ringCount - 1 ? config.colorCore : config.colorPrimary, 0.76 * config.alpha)
        .setBlendMode(config.blendMode);
      container.add(ring);
    }

    for (let index = 0; index < config.slashCount; index += 1) {
      const slash = this.createArcGraphic(
        Math.max(18, config.radius - 10 + index * 4),
        72,
        index % 2 === 0 ? config.colorPrimary : config.colorSecondary,
        5 - Math.min(2, index),
        config.alpha * 0.88,
        config.blendMode,
      );
      slash.setAngle((360 / config.slashCount) * index);
      container.add(slash);
      this.scene.tweens.add({
        targets: slash,
        angle: slash.angle + config.rotationSpeed * (index % 2 === 0 ? 1 : -1),
        duration: config.duration,
        ease: "Sine.InOut",
      });
    }

    const burst = this.createShardBurst(
      this.resolveQualityCount(config.radialBurstCount),
      Math.round(config.radius * 0.85),
      config.colorPrimary,
      config.colorSecondary,
      config.blendMode,
      3,
    );
    container.add(burst);

    const core = this.scene.add.circle(0, 0, Math.max(8, config.radius * 0.18), config.colorCore, 0.18 * config.alpha)
      .setBlendMode(config.blendMode);
    container.add(core);
    return container;
  }

  private createShieldBarrier(
    config: ShieldEffectConfig,
    direction: EffectDirection,
    fractured = false,
  ): Phaser.GameObjects.Container {
    const barrier = this.scene.add.container(0, 0);
    barrier.setRotation(Phaser.Math.DegToRad(this.getDirectionalAngle(direction)));

    const mainArc = this.createArcGraphic(
      config.radius,
      110,
      config.colorPrimary,
      config.ringThickness,
      config.alpha,
      config.blendMode,
      -55,
      55,
    );
    barrier.add(mainArc);

    const innerArc = this.createArcGraphic(
      Math.max(12, config.radius - 8),
      88,
      config.colorSecondary,
      Math.max(2, config.ringThickness - 2),
      config.alpha * 0.82,
      config.blendMode,
      -44,
      44,
    );
    barrier.add(innerArc);

    const runeCount = fractured ? 3 : 4;
    for (let index = 0; index < runeCount; index += 1) {
      const angle = Phaser.Math.DegToRad(-38 + index * (76 / Math.max(1, runeCount - 1)));
      const node = this.scene.add.circle(
        Math.cos(angle) * (config.radius - 2),
        Math.sin(angle) * (config.radius - 2),
        fractured ? 2 : 3,
        index % 2 === 0 ? config.colorSecondary : config.colorPrimary,
        config.alpha * 0.8,
      ).setBlendMode(config.blendMode);
      barrier.add(node);
    }

    return barrier;
  }

  /** Due sfere contrapposte percorrono il bordo della difesa circolare. */
  private createOrbitingCircularShield(
    config: ShieldEffectConfig,
    x: number,
    y: number,
    depth: number,
    fractured = false,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(depth);
    container.setScale(config.scale * this.tuning.globalScale);
    const orbit = this.scene.add.container(0, 0);
    container.add(orbit);
    const radius = Math.max(10, config.radius);

    const perimeter = this.scene.add.circle(0, 0, radius, config.colorPrimary, 0.025 * config.alpha)
      .setStrokeStyle(Math.max(1, config.ringThickness - 2), config.colorSecondary, config.alpha * 0.42)
      .setBlendMode(config.blendMode);
    orbit.add(perimeter);

    [-1, 1].forEach((side, index) => {
      const orbiter = this.scene.add.container(side * radius, 0);
      const trail = this.scene.add.ellipse(0, side * 13, Math.max(8, radius * 0.36), Math.max(3, config.ringThickness), config.colorSecondary, config.alpha * 0.34)
        .setBlendMode(config.blendMode);
      trail.setAngle(90);
      const glow = this.scene.add.circle(0, 0, Math.max(7, config.ringThickness + 3), index === 0 ? config.colorPrimary : config.colorSecondary, config.alpha * 0.24)
        .setBlendMode(config.blendMode);
      const orb = this.scene.add.circle(0, 0, Math.max(4, config.ringThickness), index === 0 ? config.colorSecondary : config.colorPrimary, config.alpha)
        .setStrokeStyle(1, 0xffffff, config.alpha * 0.9)
        .setBlendMode(config.blendMode);
      orbiter.add([trail, glow, orb]);
      orbit.add(orbiter);
    });

    this.scene.tweens.add({
      targets: orbit,
      angle: fractured ? -360 : 360,
      duration: fractured ? 2300 : 1850,
      repeat: -1,
      ease: 'Linear',
    });
    return container;
  }

  private createMiniHitSlash(config: HitEffectConfig, index: number): Phaser.GameObjects.Graphics {
    const slash = this.scene.add.graphics();
    slash.lineStyle(4 - Math.min(index, 2), index === 0 ? config.colorPrimary : config.colorSecondary, config.alpha * 0.95);
    slash.beginPath();
    slash.moveTo(-config.radius * 0.55, config.radius * 0.28);
    slash.lineTo(config.radius * 0.6, -config.radius * 0.35);
    slash.strokePath();
    slash.setBlendMode(config.blendMode);
    slash.setAngle(-18 + index * 14);
    return slash;
  }

  private createArcGraphic(
    radius: number,
    spreadDeg: number,
    color: number,
    thickness: number,
    alpha: number,
    blendMode: Phaser.BlendModes | number,
    startOffsetDeg?: number,
    endOffsetDeg?: number,
  ): Phaser.GameObjects.Graphics {
    const startDeg = startOffsetDeg ?? -(spreadDeg / 2);
    const endDeg = endOffsetDeg ?? spreadDeg / 2;
    const graphic = this.scene.add.graphics();
    graphic.lineStyle(thickness, color, alpha);
    graphic.beginPath();
    graphic.arc(0, 0, radius, Phaser.Math.DegToRad(startDeg), Phaser.Math.DegToRad(endDeg), false);
    graphic.strokePath();
    graphic.setBlendMode(blendMode);
    return graphic;
  }

  private createSparkBursts(
    count: number,
    color: number,
    alpha: number,
    minDistance: number,
    maxDistance: number,
    blendMode: Phaser.BlendModes | number,
  ): Phaser.GameObjects.Rectangle[] {
    return Array.from({ length: count }, () => {
      const angle = Phaser.Math.FloatBetween(-0.65, 0.65);
      const distance = Phaser.Math.Between(minDistance, maxDistance);
      const spark = this.scene.add.rectangle(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        Phaser.Math.Between(8, 16),
        2,
        color,
        alpha,
      );
      spark.setAngle(Phaser.Math.RadToDeg(angle));
      spark.setBlendMode(blendMode);
      return spark;
    });
  }

  private createShardBurst(
    count: number,
    radius: number,
    colorPrimary: number,
    colorSecondary: number,
    blendMode: Phaser.BlendModes | number,
    thickness: number,
  ): Phaser.GameObjects.Rectangle[] {
    return Array.from({ length: count }, (_value, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, count) + Phaser.Math.FloatBetween(-0.08, 0.08);
      const distance = Phaser.Math.Between(Math.round(radius * 0.55), radius);
      const burst = this.scene.add.rectangle(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        Phaser.Math.Between(8, 18),
        thickness,
        index % 2 === 0 ? colorPrimary : colorSecondary,
        0.9,
      );
      burst.setAngle(Phaser.Math.RadToDeg(angle));
      burst.setBlendMode(blendMode);
      return burst;
    });
  }

  private tweenAndDestroy(container: Phaser.GameObjects.Container, duration: number, targetScale: number, angleDelta: number): void {
    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      scale: targetScale,
      angle: container.angle + angleDelta,
      duration,
      ease: "Cubic.Out",
      onComplete: () => container.destroy(),
    });
  }

  private canPlay(key: GameEffectKey, target: Phaser.GameObjects.GameObject, options?: GameEffectOptions): boolean {
    if (options?.force) {
      return true;
    }

    const now = this.scene.time.now;
    const targetTimes = this.lastPlayed.get(target) ?? new Map<GameEffectKey, number>();
    const cooldownMs = this.cooldownFor(key);
    const lastPlayedAt = targetTimes.get(key) ?? 0;
    if (now - lastPlayedAt < cooldownMs) {
      return false;
    }

    targetTimes.set(key, now);
    this.lastPlayed.set(target, targetTimes);
    return true;
  }

  private cooldownFor(key: GameEffectKey): number {
    switch (key) {
      case GameEffectKey.HeroDefense:
      case GameEffectKey.MonsterDefense:
        return 220;
      case GameEffectKey.Poison:
        return 260;
      case GameEffectKey.Hit:
        return 90;
      case GameEffectKey.Explosion:
      case GameEffectKey.HeroSpecial:
      case GameEffectKey.MonsterSpecial:
        return 0;
      default:
        return 100;
    }
  }

  private resolveDirection(target: Phaser.GameObjects.GameObject, direction?: EffectDirection): EffectDirection {
    if (direction) {
      return direction;
    }

    const targetWithData = target as EffectTarget;
    const fromData = targetWithData.getData?.("facing") ?? targetWithData.getData?.("monsterFacing");
    return fromData === "up" || fromData === "down" || fromData === "left" || fromData === "right" ? fromData : "right";
  }

  private getTargetPoint(
    target: Phaser.GameObjects.GameObject,
    options?: GameEffectOptions,
    configOffsetX = 0,
    configOffsetY = 0,
  ): { x: number; y: number; depth: number } {
    const anyTarget = target as EffectTarget;
    const x = Number(options?.x ?? anyTarget.x ?? 0) + configOffsetX + Number(options?.offsetX ?? 0);
    const baseY = Number(options?.y ?? anyTarget.y ?? 0);
    const height = Number(anyTarget.displayHeight ?? anyTarget.height ?? 48);
    const y = baseY - height * 0.25 + configOffsetY + Number(options?.offsetY ?? 0);
    const depth = Number(options?.depth ?? anyTarget.depth ?? 0) + this.tuning.globalDepthOffset;
    return { x, y, depth };
  }

  private getCombatPoint(
    target: Phaser.GameObjects.GameObject,
    options: GameEffectOptions | undefined,
    configOffsetX = 0,
    configOffsetY = 0,
    useAreaStart = false,
  ): { x: number; y: number; depth: number } {
    const point = this.getTargetPoint(target, options, configOffsetX, configOffsetY);
    const area = options?.combatArea;
    if (!area) return point;

    return {
      x: useAreaStart ? area.startX ?? area.x : area.x,
      y: useAreaStart ? area.startY ?? area.y : area.y,
      depth: point.depth,
    };
  }

  /**
   * Il crescent ha il proprio bordo frontale a `arcRadius` dal suo centro.
   * Per un melee rettangolare posizioniamo quel bordo esattamente su area-end,
   * anziché lasciare il centro dell'effetto ancorato ad area-start.
   */
  private getMeleeSweepPoint(
    target: Phaser.GameObjects.GameObject,
    options: GameEffectOptions | undefined,
    config: SlashEffectConfig,
    direction: EffectDirection,
  ): { x: number; y: number; depth: number } {
    const fallback = this.getCombatPoint(target, options, config.originOffsetX, config.verticalOffset, true);
    const area = options?.combatArea;
    if (area?.shape !== 'rectangle' || area.endX === undefined || area.endY === undefined) {
      return fallback;
    }

    const angle = Phaser.Math.DegToRad(this.getDirectionalAngle(direction) + config.rotationOffsetDeg);
    return {
      x: area.endX - Math.cos(angle) * config.arcRadius,
      y: area.endY - Math.sin(angle) * config.arcRadius,
      depth: fallback.depth,
    };
  }

  private combatVariantOverride(role: CombatEffectRole | undefined, variant = 1): EffectTuningOverride {
    if (!role) return {};
    return COMBAT_EFFECT_VARIANTS[role][Math.max(1, Math.round(variant))] ?? COMBAT_EFFECT_VARIANTS[role][1];
  }

  private adaptSlashToArea(config: SlashEffectConfig, area?: CombatEffectArea): SlashEffectConfig {
    if (!area) return config;
    const extent = Math.max(area.width, area.height);
    return { ...config, scale: 1, arcRadius: Math.max(12, extent / 2), sparkDistance: Math.max(10, extent * 0.45), forwardOffset: 0, verticalOffset: 0 };
  }

  private adaptSpecialToArea(config: SpecialEffectConfig, area?: CombatEffectArea): SpecialEffectConfig {
    if (!area) return config;
    return { ...config, scale: 1, radius: Math.max(12, area.radius ?? Math.max(area.width, area.height) / 2), verticalOffset: 0 };
  }

  private adaptShieldToArea(config: ShieldEffectConfig, area?: CombatEffectArea): ShieldEffectConfig {
    if (!area) return config;
    return { ...config, scale: 1, radius: Math.max(12, area.radius ?? Math.max(area.width, area.height) / 2), verticalOffset: 0 };
  }

  private getDirectionalOffset(direction: EffectDirection, distance: number): { x: number; y: number } {
    switch (direction) {
      case "up":
        return { x: 0, y: -distance };
      case "down":
        return { x: 0, y: distance };
      case "left":
        return { x: -distance, y: 0 };
      case "right":
      default:
        return { x: distance, y: 0 };
    }
  }

  private getDirectionalAngle(direction: EffectDirection): number {
    switch (direction) {
      case "up":
        return -90;
      case "down":
        return 90;
      case "left":
        return 180;
      case "right":
      default:
        return 0;
    }
  }

  private applyCameraShake(enabled: boolean, duration: number, intensity: number): void {
    if (enabled) {
      this.scene.cameras.main.shake(duration, intensity);
    }
  }

  private resolveSlashConfig(base: SlashEffectConfig, options?: GameEffectOptions, role?: CombatEffectRole): SlashEffectConfig {
    const override = { ...this.combatVariantOverride(role, options?.effectVariant), ...(options?.tuningOverride ?? {}) } as Partial<SlashEffectConfig>;
    return {
      ...base,
      ...override,
      scale: Number(options?.scale ?? override.scale ?? base.scale) * this.tuning.globalScale,
      alpha: Number(options?.alpha ?? override.alpha ?? base.alpha) * this.tuning.globalAlpha,
      duration: Math.round(Number(options?.duration ?? override.duration ?? base.duration) * this.tuning.globalDurationMultiplier),
      colorPrimary: Number(options?.colorPrimary ?? override.colorPrimary ?? base.colorPrimary),
      colorSecondary: Number(options?.colorSecondary ?? override.colorSecondary ?? base.colorSecondary),
    };
  }

  private resolveSpecialConfig(base: SpecialEffectConfig, options?: GameEffectOptions, role?: CombatEffectRole): SpecialEffectConfig {
    const override = { ...this.combatVariantOverride(role, options?.effectVariant), ...(options?.tuningOverride ?? {}) } as Partial<SpecialEffectConfig>;
    return {
      ...base,
      ...override,
      scale: Number(options?.scale ?? override.scale ?? base.scale) * this.tuning.globalScale,
      alpha: Number(options?.alpha ?? override.alpha ?? base.alpha) * this.tuning.globalAlpha,
      duration: Math.round(Number(options?.duration ?? override.duration ?? base.duration) * this.tuning.globalDurationMultiplier),
      colorPrimary: Number(options?.colorPrimary ?? override.colorPrimary ?? base.colorPrimary),
      colorSecondary: Number(options?.colorSecondary ?? override.colorSecondary ?? base.colorSecondary),
    };
  }

  private resolveShieldConfig(base: ShieldEffectConfig, options?: GameEffectOptions, role?: CombatEffectRole): ShieldEffectConfig {
    const override = { ...this.combatVariantOverride(role, options?.effectVariant), ...(options?.tuningOverride ?? {}) } as Partial<ShieldEffectConfig>;
    return {
      ...base,
      ...override,
      scale: Number(options?.scale ?? override.scale ?? base.scale) * this.tuning.globalScale,
      alpha: Number(options?.alpha ?? override.alpha ?? base.alpha) * this.tuning.globalAlpha,
      duration: Math.round(Number(options?.duration ?? override.duration ?? base.duration) * this.tuning.globalDurationMultiplier),
      colorPrimary: Number(options?.colorPrimary ?? override.colorPrimary ?? base.colorPrimary),
      colorSecondary: Number(options?.colorSecondary ?? override.colorSecondary ?? base.colorSecondary),
      followTarget: Boolean(options?.followTarget ?? override.followTarget ?? base.followTarget),
    };
  }

  private resolveHealConfig(base: HealEffectConfig, options?: GameEffectOptions): HealEffectConfig {
    const override = (options?.tuningOverride ?? {}) as Partial<HealEffectConfig>;
    return {
      ...base,
      ...override,
      scale: Number(options?.scale ?? override.scale ?? base.scale) * this.tuning.globalScale,
      alpha: Number(options?.alpha ?? override.alpha ?? base.alpha) * this.tuning.globalAlpha,
      duration: Math.round(Number(options?.duration ?? override.duration ?? base.duration) * this.tuning.globalDurationMultiplier),
      colorPrimary: Number(options?.colorPrimary ?? override.colorPrimary ?? base.colorPrimary),
      colorSecondary: Number(options?.colorSecondary ?? override.colorSecondary ?? base.colorSecondary),
    };
  }

  private resolvePoisonConfig(base: PoisonEffectConfig, options?: GameEffectOptions): PoisonEffectConfig {
    const override = (options?.tuningOverride ?? {}) as Partial<PoisonEffectConfig>;
    return {
      ...base,
      ...override,
      scale: Number(options?.scale ?? override.scale ?? base.scale) * this.tuning.globalScale,
      alpha: Number(options?.alpha ?? override.alpha ?? base.alpha) * this.tuning.globalAlpha,
      duration: Math.round(Number(options?.duration ?? override.duration ?? base.duration) * this.tuning.globalDurationMultiplier),
      colorPrimary: Number(options?.colorPrimary ?? override.colorPrimary ?? base.colorPrimary),
      colorSecondary: Number(options?.colorSecondary ?? override.colorSecondary ?? base.colorSecondary),
    };
  }

  private resolveExplosionConfig(base: ExplosionEffectConfig, options?: GameEffectOptions): ExplosionEffectConfig {
    const override = (options?.tuningOverride ?? {}) as Partial<ExplosionEffectConfig>;
    return {
      ...base,
      ...override,
      scale: Number(options?.scale ?? override.scale ?? base.scale) * this.tuning.globalScale,
      alpha: Number(options?.alpha ?? override.alpha ?? base.alpha) * this.tuning.globalAlpha,
      duration: Math.round(Number(options?.duration ?? override.duration ?? base.duration) * this.tuning.globalDurationMultiplier),
      colorPrimary: Number(options?.colorPrimary ?? override.colorPrimary ?? base.colorPrimary),
      colorSecondary: Number(options?.colorSecondary ?? override.colorSecondary ?? base.colorSecondary),
    };
  }

  private resolveHitConfig(base: HitEffectConfig, options?: GameEffectOptions): HitEffectConfig {
    const override = (options?.tuningOverride ?? {}) as Partial<HitEffectConfig>;
    return {
      ...base,
      ...override,
      scale: Number(options?.scale ?? override.scale ?? base.scale) * this.tuning.globalScale,
      alpha: Number(options?.alpha ?? override.alpha ?? base.alpha) * this.tuning.globalAlpha,
      duration: Math.round(Number(options?.duration ?? override.duration ?? base.duration) * this.tuning.globalDurationMultiplier),
      colorPrimary: Number(options?.colorPrimary ?? override.colorPrimary ?? base.colorPrimary),
      colorSecondary: Number(options?.colorSecondary ?? override.colorSecondary ?? base.colorSecondary),
    };
  }

  private resolveQualityCount(value: number): number {
    switch (this.tuning.slashQuality) {
      case "low":
        return Math.max(1, Math.round(value * 0.6));
      case "high":
        return Math.max(1, Math.round(value * 1.2));
      default:
        return value;
    }
  }
}
