import * as Phaser from "phaser";
import { EffectEngineEvent, EffectRuntimeState, EffectScope, GemEffectType, LinkEffectType, ResolvedEffect } from "../../rnd/effects/effects.models";
import { EFFECT_PHASER_VISUAL } from "./effect-phaser-visual.config";
import { LinkEffectGeometry, LinkEffectView } from "./link-effect.view";

export interface EffectGemPosition { x: number; y: number; radius: number; }

/** Bridges semantic engine events to Phaser presentation only. */
export class EffectPhaserRenderer {
  private readonly gemLayer: Phaser.GameObjects.Container;
  private readonly previewGemLayer: Phaser.GameObjects.Container;
  private readonly markerLayer: Phaser.GameObjects.Container;
  private readonly linkLayer: Phaser.GameObjects.Container;
  private readonly flowLayer: Phaser.GameObjects.Container;
  private readonly dischargeLayer: Phaser.GameObjects.Container;
  private readonly links = new Map<string, LinkEffectView>();
  private readonly markerCounts = new Map<string, number>();
  constructor(private readonly scene: Phaser.Scene, private readonly gems: ReadonlyMap<string, EffectGemPosition>, private readonly center: Phaser.Math.Vector2, private readonly onLinkInfo?: (effectId: string) => void) {
    this.linkLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.linkDepth);
    this.previewGemLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.linkDepth + 2);
    this.gemLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.gemDepth);
    this.markerLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.gemDepth + 2);
    this.flowLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.flowDepth);
    this.dischargeLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.impulseDischarge.depth);
  }
  renderPersistent(effects: readonly ResolvedEffect[], runtime?: EffectRuntimeState, values: readonly number[] = []): void {
    for (const effect of effects) {
      if (!this.isEffectActive(effect, values)) continue;
      if (effect.config.scope === EffectScope.LINK && effect.target.type === EffectScope.LINK) {
        const geometry = this.linkGeometry(effect); if (!geometry) continue;
        const view = new LinkEffectView(this.scene, effect, geometry, this.onLinkInfo); this.linkLayer.add(view); this.links.set(effect.id, view);
      }
      if (effect.config.scope === EffectScope.GEM && effect.target.type === EffectScope.GEM) this.drawGemEffect(effect, runtime, values);
      if (effect.config.scope === EffectScope.AREA && effect.target.type === EffectScope.AREA) this.drawBomb(effect);
    }
  }
  /** Mirrors the engine's pre-impulse traversal on the static link visuals. */
  setActiveLinkPreview(events: readonly EffectEngineEvent[]): void {
    const activeLinkIds = new Set(events.filter((event) => event.type === "FLOW_PROPAGATED" && event.linkId).map((event) => event.linkId!));
    for (const [id, link] of this.links) link.setActiveFlowPreview(activeLinkIds.has(id));
    this.previewGemLayer.removeAll(true);
    const reachedGemIds = new Set(events.filter((event) => event.type === "FLOW_PROPAGATED" && event.gemId).map((event) => event.gemId!));
    for (const gemId of reachedGemIds) this.drawActiveTargetRing(gemId);
  }
  play(events: readonly EffectEngineEvent[]): void {
    for (const event of events) switch (event.type) {
      case "FLOW_PROPAGATED": this.animateFlow(event); break;
      case "FLOW_ARRIVED": this.pulseGem(event.gemId, 0x9cf5ff, 1.25, event.generation * EFFECT_PHASER_VISUAL.links.propagationStageDelayMs); break;
      case "FLOW_MERGED": this.pulseGem(event.gemId, 0xffdf70, 1.55); break;
      case "SHIELD_ABSORBED": this.flashGem(event.gemId, 0x72dfff); break;
      case "SHIELD_DEPLETED": this.breakWall(event.gemId, 0x72dfff); break;
      case "WALL_HIT": this.flashGem(event.gemId, 0xbca477); break;
      case "WALL_BROKEN": this.breakWall(event.gemId); break;
      case "MIRROR_APPLIED": this.flashGem(event.gemId, 0xdba0ff); break;
      case "GEM_AMPLIFIER_APPLIED": this.pulseGem(event.gemId, 0xffcd62, 1.65); break;
      case "GEM_INVERTER_APPLIED": this.flashGem(event.gemId, 0xc890ff); break;
      case "ICE_HIT": this.flashGem(event.gemId, 0x9cf5ff); break;
      case "ICE_BROKEN": this.breakWall(event.gemId, 0x9cf5ff); break;
      case "TIMER_TICK": this.pulseGem(event.gemId, event.remainingTurns !== undefined && event.remainingTurns <= 2 ? 0xff8d76 : 0xffdf70, 1.18); break;
      case "TIMER_EXPIRED": this.flashGem(event.gemId, 0xff675d); break;
      case "CORRUPTION_APPLIED": this.pulseGem(event.gemId, 0xb35cff, 1.48); break;
      case "BOMB_TRIGGERED": this.bombBurst(event.gemId); break;
    }
  }
  /**
   * Continues the central impulse through the already-previewed effect links.
   * It runs before the engine commits the move, keeping the scenic current
   * visible even when a gem is consumed by that same impulse.
   */
  playImpulseDischarge(events: readonly EffectEngineEvent[]): void {
    const visual = EFFECT_PHASER_VISUAL.impulseDischarge;
    for (const event of events) {
      if (event.type !== "FLOW_PROPAGATED" || !event.linkId || !event.gemId) continue;
      const link = this.links.get(event.linkId);
      if (!link || link.effect.target.type !== EffectScope.LINK) continue;
      const reverse = link.effect.target.fromGem.id === event.gemId;
      const delay = visual.directDurationMs + Math.max(0, event.generation - 1) * visual.linkGenerationDelayMs;
      this.animateDischargeLink(link, reverse, delay);
      const destinationId = reverse ? link.effect.target.fromGem.id : link.effect.target.toGem.id;
      this.dischargeArrival(destinationId, delay + visual.linkSegmentDurationMs + (visual.particleCount - 1) * visual.particleStaggerMs);
    }
  }
  destroy(): void { this.links.clear(); this.markerCounts.clear(); this.linkLayer.destroy(true); this.previewGemLayer.destroy(true); this.gemLayer.destroy(true); this.markerLayer.destroy(true); this.flowLayer.destroy(true); this.dischargeLayer.destroy(true); }
  private linkGeometry(effect: ResolvedEffect): LinkEffectGeometry | null {
    if (effect.target.type !== EffectScope.LINK) return null; const from = this.gems.get(effect.target.fromGem.id); const to = this.gems.get(effect.target.toGem.id); if (!from || !to) return null;
    const start = new Phaser.Math.Vector2(from.x, from.y); const end = new Phaser.Math.Vector2(to.x, to.y); const midpoint = start.clone().add(end).scale(.5); let outward = midpoint.clone().subtract(this.center);
    if (outward.lengthSq() < 1) outward = end.clone().subtract(start).normalize().rotate(Math.PI / 2);
    else outward.normalize();
    const radius = Math.max(from.radius, to.radius);
    return { from: start, to: end, control: midpoint.add(outward.scale(radius * 2.2)), radius };
  }
  private isEffectActive(effect: ResolvedEffect, values: readonly number[]): boolean {
    if (effect.target.type === EffectScope.GEM) return values[effect.target.gem.index] !== 0;
    if (effect.target.type === EffectScope.LINK) return values[effect.target.fromGem.index] !== 0 && values[effect.target.toGem.index] !== 0;
    return values[effect.target.sourceGem.index] !== 0;
  }
  /** Ring under the sphere: propagated gems read like direct active-flow targets. */
  private drawActiveTargetRing(gemId: string): void {
    const gem = this.gems.get(gemId); if (!gem) return;
    const visual = EFFECT_PHASER_VISUAL.activeFlows; const ringRadius = gem.radius * visual.linkTargetRingRadiusRatio; const graphics = this.scene.add.graphics();
    graphics.lineStyle(gem.radius * visual.linkGlowWidthRadiusRatio, visual.color, visual.alpha * visual.linkGlowAlpha); graphics.strokeCircle(gem.x, gem.y, ringRadius);
    graphics.lineStyle(gem.radius * visual.linkMiddleWidthRadiusRatio, visual.color, visual.alpha * visual.linkMiddleAlpha); graphics.strokeCircle(gem.x, gem.y, ringRadius);
    graphics.lineStyle(gem.radius * visual.linkCoreWidthRadiusRatio, visual.color, visual.alpha * visual.linkCoreAlpha); graphics.strokeCircle(gem.x, gem.y, ringRadius);
    this.previewGemLayer.add(graphics);
  }
  private drawGemEffect(effect: ResolvedEffect, runtime?: EffectRuntimeState, values: readonly number[] = []): void {
    if (effect.target.type !== EffectScope.GEM || effect.config.scope !== EffectScope.GEM) return; const gem = this.gems.get(effect.target.gem.id); if (!gem) return;
    const graphics = this.scene.add.graphics(); const radius = gem.radius;
    if (effect.config.type === GemEffectType.SHIELD) { const remaining = effect.config.consumable ? runtime?.shieldRemainingStrength[effect.id] ?? effect.config.strength : effect.config.strength; if (remaining <= 0) return; graphics.lineStyle(Math.max(2, radius * .09), 0x6edfff, .9); graphics.strokeCircle(gem.x, gem.y, radius * 1.26); this.gemLayer.add(graphics); this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), String(remaining)); return; }
    if (effect.config.type === GemEffectType.WALL || effect.config.type === GemEffectType.ICE) { const remaining = effect.config.type === GemEffectType.WALL ? runtime?.wallRemainingStrength[effect.id] ?? effect.config.strength : runtime?.iceRemainingStrength[effect.id] ?? effect.config.strength; if (remaining <= 0) return; const color = effect.config.type === GemEffectType.WALL ? 0xb79a6c : 0x8cecff; graphics.lineStyle(Math.max(3, radius * .14), color, .95); graphics.strokeCircle(gem.x, gem.y, radius * 1.13); for (let index = 0; index < Math.max(0, effect.config.strength - remaining); index += 1) graphics.lineBetween(gem.x - radius * .55 + index * 5, gem.y - radius * .4, gem.x + radius * .25, gem.y + radius * .45); this.gemLayer.add(graphics); this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), String(remaining)); return; }
    if (effect.config.type === GemEffectType.AMPLIFIER) { graphics.lineStyle(Math.max(2, radius * .09), 0xffcd62, .95); graphics.strokeCircle(gem.x, gem.y, radius * 1.22); this.gemLayer.add(graphics); this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), `×${effect.config.multiplier}`); return; }
    if (effect.config.type === GemEffectType.INVERTER) { graphics.lineStyle(Math.max(2, radius * .09), 0xc890ff, .95); graphics.strokeCircle(gem.x, gem.y, radius * 1.2); this.gemLayer.add(graphics); this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), "±"); return; }
    if (effect.config.type === GemEffectType.TIMER) { const remaining = runtime?.timerRemainingTurns[effect.id] ?? effect.config.turns; if (runtime?.completedTimerIds.includes(effect.id) || runtime?.expiredTimerIds.includes(effect.id)) return; graphics.lineStyle(Math.max(2, radius * .09), 0xffcf75, .95); graphics.strokeCircle(gem.x, gem.y, radius * 1.2); this.gemLayer.add(graphics); this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), String(remaining)); return; }
    if (effect.config.type === GemEffectType.CORRUPTION) { if (values[effect.target.gem.index] === 0) return; graphics.lineStyle(Math.max(2, radius * .09), 0xb35cff, .92); graphics.strokeCircle(gem.x, gem.y, radius * 1.18); graphics.strokeCircle(gem.x, gem.y, radius * .78); this.gemLayer.add(graphics); this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), `+${effect.config.amount}`); return; }
    graphics.lineStyle(Math.max(2, radius * .08), 0xd7a2ff, .9); graphics.lineBetween(gem.x - radius * .62, gem.y - radius * .62, gem.x + radius * .62, gem.y + radius * .62); graphics.lineBetween(gem.x - radius * .62, gem.y + radius * .62, gem.x + radius * .62, gem.y - radius * .62); this.gemLayer.add(graphics); this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), "±");
  }
  private drawBomb(effect: ResolvedEffect): void { if (effect.target.type !== EffectScope.AREA) return; this.drawEffectMarker(effect.target.sourceGem.id, this.iconFrame(effect), this.iconColor(effect)); }
  /** Reuses the existing action atlas until dedicated effect artwork is available. */
  private iconFrame(effect: ResolvedEffect): string {
    if (effect.config.scope === EffectScope.GEM) return effect.config.type === GemEffectType.SHIELD ? "shield" : effect.config.type === GemEffectType.WALL ? "wall" : effect.config.type === GemEffectType.ICE ? "ice" : effect.config.type === GemEffectType.AMPLIFIER ? "amplifier" : effect.config.type === GemEffectType.INVERTER ? "inverter" : effect.config.type === GemEffectType.TIMER ? "timer" : effect.config.type === GemEffectType.CORRUPTION ? "corruption" : "mirror-sign";
    if (effect.config.scope === EffectScope.LINK) return effect.config.type === LinkEffectType.ECHO ? "echo-link" : effect.config.type === LinkEffectType.AMPLIFY ? "double-link" : "mirror-link";
    return "area-bomb";
  }
  private iconColor(effect: ResolvedEffect): number {
    if (effect.config.scope === EffectScope.GEM) return effect.config.type === GemEffectType.SHIELD ? 0x72dfff : effect.config.type === GemEffectType.WALL ? 0xbca477 : effect.config.type === GemEffectType.ICE ? 0x8cecff : effect.config.type === GemEffectType.AMPLIFIER ? 0xffcd62 : effect.config.type === GemEffectType.TIMER ? 0xffcf75 : effect.config.type === GemEffectType.CORRUPTION ? 0xb35cff : effect.config.type === GemEffectType.INVERTER ? 0xc890ff : 0xdba0ff;
    if (effect.config.scope === EffectScope.LINK) return effect.config.type === LinkEffectType.ECHO ? 0x7edbff : effect.config.type === LinkEffectType.AMPLIFY ? 0xffcd62 : 0xc890ff;
    return 0xff9378;
  }
  /** Markers sit in the upper-right corner; further effects fan left to remain legible. */
  private drawEffectMarker(gemId: string, frame: string, color: number, value = ""): void {
    const gem = this.gems.get(gemId); if (!gem) return;
    const count = this.markerCounts.get(gemId) ?? 0; this.markerCounts.set(gemId, count + 1);
    const offsets = [[.88, -.88], [.25, -1.02], [-.36, -.88]] as const;
    const [offsetX, offsetY] = offsets[Math.min(count, offsets.length - 1)];
    const size = Math.max(13, gem.radius * .72) + 5;
    const x = gem.x + gem.radius * offsetX; const y = gem.y + gem.radius * offsetY;
    const background = this.scene.add.circle(x, y, size * .56, 0x101c18, .92).setStrokeStyle(Math.max(1, size * .08), color, .95);
    const icon = this.scene.add.image(x, y, "rdn-effects", frame).setDisplaySize(size, size).setTint(color);
    const children: Phaser.GameObjects.GameObject[] = [background, icon];
    if (value) children.push(this.badge(x + size * .44, y - size * .44, value).setScale(.82));
    this.markerLayer.add(children);
  }
  private animateFlow(event: EffectEngineEvent): void { const link = event.linkId ? this.links.get(event.linkId) : undefined; if (!link || !event.gemId || link.effect.target.type !== EffectScope.LINK) return; const reverse = link.effect.target.fromGem.id === event.gemId; const from = reverse ? link.geometry.to : link.geometry.from; const visual = EFFECT_PHASER_VISUAL.links; const stageDelay = event.generation * visual.propagationStageDelayMs; link.animatePropagation(stageDelay); for (let index = 0; index < visual.propagationParticleCount; index += 1) { const particle = this.scene.add.circle(from.x, from.y, visual.propagationParticleRadius, visual.propagationParticleColor, visual.propagationParticleAlpha); this.flowLayer.add(particle); const progress = { value: 0 }; this.scene.tweens.add({ targets: progress, value: 1, delay: stageDelay + index * visual.propagationParticleStaggerMs, duration: visual.propagationDurationMs, ease: "Sine.InOut", onUpdate: () => { const point = link.pointAt(reverse ? 1 - progress.value : progress.value); particle.setPosition(point.x, point.y).setScale(1 + progress.value * (visual.propagationParticleScale - 1)); }, onComplete: () => particle.destroy() }); } }
  private animateDischargeLink(link: LinkEffectView, reverse: boolean, delay: number): void {
    const visual = EFFECT_PHASER_VISUAL.impulseDischarge;
    for (let tail = 0; tail < visual.tailCount; tail += 1) for (let index = 0; index < visual.particleCount; index += 1) {
      const initial = link.pointAt(reverse ? 1 : 0);
      const halo = this.scene.add.circle(initial.x, initial.y, visual.haloRadius, visual.haloColor, visual.haloAlpha);
      const particle = this.scene.add.circle(initial.x, initial.y, visual.particleRadius, visual.color, visual.particleAlpha).setStrokeStyle(visual.particleStrokeWidth, visual.particleStrokeColor, 1);
      this.dischargeLayer.add([halo, particle]);
      const progress = { value: 0 }; const phase = tail * visual.tailPhaseSpread + index * visual.phaseSpread;
      this.scene.tweens.add({ targets: progress, value: 1, delay: delay + index * visual.particleStaggerMs, duration: visual.linkSegmentDurationMs, ease: "Sine.InOut", onUpdate: () => {
        const t = reverse ? 1 - progress.value : progress.value; const point = link.pointAt(t); const near = link.pointAt(Math.min(1, Math.max(0, t + (reverse ? -.012 : .012))));
        const deltaX = near.x - point.x; const deltaY = near.y - point.y; const length = Math.max(1, Math.hypot(deltaX, deltaY));
        const weave = Math.sin(progress.value * Math.PI * 2 * visual.weaveTurns + phase) * visual.weaveAmplitude;
        const intensity = Math.sin(progress.value * Math.PI);
        halo.setPosition(point.x - deltaY / length * weave, point.y + deltaX / length * weave).setScale(visual.haloMinScale + intensity * visual.haloScaleRange).setAlpha(intensity * visual.haloAlpha);
        particle.setPosition(point.x - deltaY / length * weave, point.y + deltaX / length * weave).setScale(visual.particleMinScale + intensity * visual.particleScaleRange).setAlpha(intensity * visual.particleAlpha);
      }, onComplete: () => { halo.destroy(); particle.destroy(); } });
    }
  }
  private dischargeArrival(gemId: string, delay: number): void {
    const gem = this.gems.get(gemId); if (!gem) return; const visual = EFFECT_PHASER_VISUAL.impulseDischarge;
    for (let index = 0; index < visual.arrivalBurstCount; index += 1) {
      const angle = index * Math.PI * 2 / visual.arrivalBurstCount + .23;
      const spark = this.scene.add.circle(gem.x, gem.y, Math.max(1.4, visual.particleRadius * .8), visual.color, visual.particleAlpha); this.dischargeLayer.add(spark);
      this.scene.tweens.add({ targets: spark, x: gem.x + Math.cos(angle) * visual.arrivalBurstDistance, y: gem.y + Math.sin(angle) * visual.arrivalBurstDistance, alpha: 0, scale: .3, delay, duration: visual.arrivalBurstDurationMs, ease: "Cubic.Out", onComplete: () => spark.destroy() });
    }
  }
  private pulseGem(gemId: string | undefined, color: number, scale = 1.25, delay = 0): void { const gem = gemId ? this.gems.get(gemId) : undefined; if (!gem) return; const pulse = this.scene.add.circle(gem.x, gem.y, gem.radius, color, .22); this.flowLayer.add(pulse); this.scene.tweens.add({ targets: pulse, scale, alpha: 0, delay, duration: EFFECT_PHASER_VISUAL.gemHighlightDuration, onComplete: () => pulse.destroy() }); }
  private flashGem(gemId: string | undefined, color: number): void { this.pulseGem(gemId, color, 1.42); }
  private breakWall(gemId: string | undefined, color = 0xc1a16f): void { const gem = gemId ? this.gems.get(gemId) : undefined; if (!gem) return; for (let index = 0; index < 6; index += 1) { const shard = this.scene.add.rectangle(gem.x, gem.y, 4, 4, color).setRotation(index); this.flowLayer.add(shard); const angle = index * Math.PI * 2 / 6; this.scene.tweens.add({ targets: shard, x: gem.x + Math.cos(angle) * gem.radius * 1.7, y: gem.y + Math.sin(angle) * gem.radius * 1.7, alpha: 0, duration: EFFECT_PHASER_VISUAL.wallBreakDuration, onComplete: () => shard.destroy() }); } }
  private bombBurst(gemId: string | undefined): void { const gem = gemId ? this.gems.get(gemId) : undefined; if (!gem) return; const blast = this.scene.add.circle(gem.x, gem.y, gem.radius * .7, 0xff886e, .7); this.flowLayer.add(blast); this.scene.tweens.add({ targets: blast, scale: 4, alpha: 0, duration: EFFECT_PHASER_VISUAL.bombDuration, ease: "Cubic.Out", onComplete: () => blast.destroy() }); }
  private badge(x: number, y: number, text: string): Phaser.GameObjects.Container { const background = this.scene.add.circle(0, 0, 11, 0x151917, .98).setStrokeStyle(2, 0xe5bd62, 1); const label = this.scene.add.text(0, 0, text, { fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", color: "#ffffff", fontStyle: "bold", stroke: "#000000", strokeThickness: 2 }).setOrigin(.5); return this.scene.add.container(x, y, [background, label]); }
}
