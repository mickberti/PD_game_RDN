import * as Phaser from "phaser";

export type ParticleAttractionTargetMode = "STATIC_TARGET" | "TRACK_TARGET";
export type ParticleAttractionPoint = Readonly<{ x: number; y: number }>;

/** Presentation settings only: no game rules or game-specific objects belong here. */
export interface ParticleAttractionVisualConfig {
  particleCount: number;
  durationMs: number;
  explosionDurationMs: number;
  apexPauseMs: number;
  /** Particles are emitted in small waves while retaining slight variation inside each wave. */
  launchGroupSize: number;
  groupStartDelayMs: number;
  /** Staggers only the attraction after every particle has reached its apex. */
  attractionGroupSize: number;
  attractionGroupDelayMs: number;
  maxStartDelayMs: number;
  maxArrivalDelayMs: number;
  minJumpHeight: number;
  maxJumpHeight: number;
  horizontalSpread: number;
  minScale: number;
  maxScale: number;
  rotationDeg: number;
  particleRadius: number;
  particleColor: number;
  particleAlpha: number;
  finalAlpha: number;
  particleStrokeWidth: number;
  particleStrokeColor: number;
  trailRadius: number;
  trailAlpha: number;
  trajectoryTrailWidth: number;
  /** Multiplier for the overall visible trajectory size, independent from its opacity. */
  trajectoryTrailSize: number;
  /** Opacity of the drawn trajectory, independent from the particle halo. */
  trajectoryTrailAlpha: number;
  trajectoryTrailSegments: number;
  depth: number;
  reducedMotion: boolean;
  targetMode: ParticleAttractionTargetMode;
  /** Stable visual variation; the caller may supply a seed to replay the same look. */
  randomSeed: number;
}

export interface ParticleAttractionRequest {
  origin: ParticleAttractionPoint;
  /** A callback allows TRACK_TARGET without coupling this effect to a game object type. */
  target: ParticleAttractionPoint | (() => ParticleAttractionPoint | undefined);
  /** Optional semantic tint, alternated with the base colour by the reusable effect. */
  accentColor?: number;
  onParticleArrival?: (index: number) => void;
  onComplete?: () => void;
}

type ParticlePair = { particle: Phaser.GameObjects.Arc; halo: Phaser.GameObjects.Arc; trajectory: Phaser.GameObjects.Graphics };
type ActiveParticle = { pair: ParticlePair; progress: { value: number }; trailPoints: ParticleAttractionPoint[]; color: number };

/**
 * Reusable fountain-to-target visual. Each particle owns one progress tween and
 * one continuous piecewise Bezier path: launch, tiny apex hold, attraction.
 */
export class ParticleAttractionEffect {
  private readonly pool: ParticlePair[] = [];
  private readonly active = new Set<ActiveParticle>();
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene) {}

  play(config: ParticleAttractionVisualConfig, request: ParticleAttractionRequest): void {
    if (this.destroyed || !this.scene.sys.isActive()) return;
    const staticTarget = typeof request.target === "function" ? request.target() : request.target;
    if (!staticTarget) return;
    let remaining = Math.max(1, config.particleCount);
    for (let index = 0; index < config.particleCount; index += 1) {
      const variation = this.variation(config.randomSeed, index);
      const groupDelay = Math.floor(index / Math.max(1, config.launchGroupSize)) * config.groupStartDelayMs;
      const startDelay = config.reducedMotion ? 0 : groupDelay + variation.start * config.maxStartDelayMs;
      const arrivalDelay = config.reducedMotion ? 0 : variation.arrival * config.maxArrivalDelayMs;
      const attractionDelay = config.reducedMotion ? 0 : Math.floor(index / Math.max(1, config.attractionGroupSize)) * config.attractionGroupDelayMs;
      const color = index % 2 === 0 || request.accentColor === undefined ? config.particleColor : request.accentColor;
      const pair = this.acquire(config, request.origin, color);
      const progress = { value: 0 };
      const active = { pair, progress, trailPoints: [], color };
      this.active.add(active);
      this.scene.tweens.add({
        targets: progress,
        value: 1,
        delay: startDelay,
        duration: Math.max(1, config.durationMs + arrivalDelay + attractionDelay),
        ease: "Linear",
        onUpdate: () => {
          const currentTarget = config.targetMode === "TRACK_TARGET" && typeof request.target === "function" ? request.target() ?? staticTarget : staticTarget;
          const position = this.positionParticle(pair, progress.value, config.durationMs + arrivalDelay + attractionDelay, attractionDelay, request.origin, currentTarget, config, variation, color);
          this.drawTrajectory(active, position.point, config, position.attraction);
        },
        onComplete: () => {
          if (this.destroyed) return;
          request.onParticleArrival?.(index);
          this.release(active);
          remaining -= 1;
          if (remaining === 0) request.onComplete?.();
        },
      });
    }
  }

  stop(): void {
    for (const active of [...this.active]) this.release(active);
  }

  destroy(): void {
    this.stop(); this.destroyed = true;
    for (const pair of this.pool) { pair.particle.destroy(); pair.halo.destroy(); pair.trajectory.destroy(); }
    this.pool.length = 0;
  }

  private acquire(config: ParticleAttractionVisualConfig, origin: ParticleAttractionPoint, color: number): ParticlePair {
    const pair = this.pool.pop() ?? {
      halo: this.scene.add.circle(origin.x, origin.y, config.trailRadius, color, config.trailAlpha),
      particle: this.scene.add.circle(origin.x, origin.y, config.particleRadius, color, config.particleAlpha),
      trajectory: this.scene.add.graphics(),
    };
    pair.halo.setPosition(origin.x, origin.y).setRadius(config.trailRadius).setFillStyle(color, config.trailAlpha).setDepth(config.depth).setVisible(true).setActive(true).setScale(1);
    pair.trajectory.clear().setDepth(config.depth).setVisible(true).setActive(true);
    pair.particle.setPosition(origin.x, origin.y).setRadius(config.particleRadius).setFillStyle(color, config.particleAlpha).setStrokeStyle(config.particleStrokeWidth, config.particleStrokeColor, 1).setDepth(config.depth + 1).setVisible(true).setActive(true).setScale(config.minScale).setAngle(0);
    return pair;
  }

  private release(active: ActiveParticle): void {
    this.scene.tweens.killTweensOf(active.progress);
    this.active.delete(active);
    const { pair } = active;
    if (!pair.particle.active || !pair.halo.active) return;
    pair.particle.setVisible(false).setActive(false);
    pair.halo.setVisible(false).setActive(false);
    pair.trajectory.clear().setVisible(false).setActive(false);
    this.pool.push(pair);
  }

  private positionParticle(pair: ParticlePair, progress: number, totalDurationMs: number, attractionDelayMs: number, origin: ParticleAttractionPoint, target: ParticleAttractionPoint, config: ParticleAttractionVisualConfig, variation: { side: number; height: number; bend: number; scale: number; spin: number; start: number; arrival: number }, color: number): { point: ParticleAttractionPoint; attraction: number } {
    const elapsedMs = progress * totalDurationMs;
    const explosionEndMs = config.explosionDurationMs;
    const pauseEndMs = explosionEndMs + config.apexPauseMs;
    const attractionStartMs = pauseEndMs + attractionDelayMs;
    const apex = { x: origin.x + variation.side * config.horizontalSpread, y: origin.y - Phaser.Math.Linear(config.minJumpHeight, config.maxJumpHeight, variation.height) };
    let point: ParticleAttractionPoint;
    let scaleProgress: number;
    let attraction = 0;
    if (elapsedMs <= explosionEndMs) {
      const t = Phaser.Math.Easing.Cubic.Out(elapsedMs / explosionEndMs);
      point = this.cubic(origin, { x: origin.x + variation.side * config.horizontalSpread * .32, y: origin.y - Phaser.Math.Linear(config.minJumpHeight, config.maxJumpHeight, variation.height) * .58 }, apex, apex, t);
      scaleProgress = t * .72;
    } else if (elapsedMs <= attractionStartMs) {
      // The curve arrives and leaves with zero velocity: this short hold is readable but never mechanical.
      point = apex;
      scaleProgress = .72;
    } else {
      const t = Phaser.Math.Easing.Quadratic.In((elapsedMs - attractionStartMs) / Math.max(1, totalDurationMs - attractionStartMs));
      attraction = t;
      const dx = target.x - apex.x; const dy = target.y - apex.y;
      const bendX = -dy * variation.bend; const bendY = dx * variation.bend;
      point = this.cubic(apex, apex, { x: target.x - dx * .2 + bendX, y: target.y - dy * .2 + bendY }, target, t);
      scaleProgress = .72 + t * .28;
    }
    const baseScale = Phaser.Math.Linear(config.minScale, config.maxScale, Math.min(1, scaleProgress)) * variation.scale;
    const dissolve = progress < .87 ? 1 : Phaser.Math.Linear(1, 0, (progress - .87) / .13);
    const alpha = Phaser.Math.Linear(config.particleAlpha, config.finalAlpha, progress) * dissolve;
    pair.halo.setPosition(point.x, point.y).setFillStyle(color, config.trailAlpha).setAlpha(config.trailAlpha * dissolve).setScale(baseScale * 1.45);
    pair.particle.setPosition(point.x, point.y).setAlpha(alpha).setScale(baseScale * (progress > .84 ? Phaser.Math.Linear(1, .72, (progress - .84) / .16) : 1)).setAngle(config.rotationDeg * variation.spin * progress);
    return { point, attraction };
  }

  private drawTrajectory(active: ActiveParticle, point: ParticleAttractionPoint, config: ParticleAttractionVisualConfig, attraction: number): void {
    const points = active.trailPoints;
    points.push(point);
    if (points.length > config.trajectoryTrailSegments) points.shift();
    const graphics = active.pair.trajectory.clear();
    // The trace becomes deliberately stronger after the fountain phase, making the attraction easy to read.
    if (points.length < 2 || attraction <= 0) return;
    graphics.lineStyle(config.trajectoryTrailWidth * config.trajectoryTrailSize, active.color, config.trajectoryTrailAlpha * (.45 + attraction * .55));
    for (let index = 1; index < points.length; index += 1) graphics.lineBetween(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
  }

  private cubic(p0: ParticleAttractionPoint, p1: ParticleAttractionPoint, p2: ParticleAttractionPoint, p3: ParticleAttractionPoint, t: number): ParticleAttractionPoint {
    const u = 1 - t;
    return { x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x, y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y };
  }

  private variation(seed: number, index: number): { side: number; height: number; bend: number; scale: number; spin: number; start: number; arrival: number } {
    const value = (salt: number) => { const x = Math.sin((seed + index * 17.17 + salt) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    return { side: value(1) * 2 - 1, height: value(2), bend: (value(3) * 2 - 1) * .16, scale: .84 + value(4) * .3, spin: value(5) * 2 - 1, start: value(6), arrival: value(7) };
  }
}
