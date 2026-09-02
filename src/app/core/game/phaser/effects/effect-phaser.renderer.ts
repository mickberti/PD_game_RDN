import * as Phaser from "phaser";
import { AreaEffectType, EffectEngineEvent, EffectRuntimeState, EffectScope, GemEffectType, LinkEffectType, ResolvedEffect } from "./effects.models";
import { EFFECT_PHASER_VISUAL, impulseImpactDelayMs, impulseLinkStartDelayMs } from "./effect-phaser-visual.config";
import { LinkEffectGeometry, LinkEffectView } from "./link-effect.view";
import { effectAssetFrame, isEffectVisuallyActive } from "./effect-presentation.config";

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
  constructor(private readonly scene: Phaser.Scene, private readonly gems: ReadonlyMap<string, EffectGemPosition>, private readonly center: Phaser.Math.Vector2, private readonly onLinkInfo?: (effectId: string, pointer: Phaser.Input.Pointer) => void) {
    this.linkLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.linkDepth);
    this.previewGemLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.linkDepth + 2);
    this.gemLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.gemDepth);
    this.markerLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.gemDepth + 2);
    this.flowLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.flowDepth);
    this.dischargeLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.impulseDischarge.depth);
  }
  renderPersistent(effects: readonly ResolvedEffect[], runtime?: EffectRuntimeState, values: readonly number[] = []): void {
    for (const effect of effects) {
      if (!isEffectVisuallyActive(effect, values, runtime)) continue;
      if (effect.config.scope === EffectScope.LINK && effect.target.type === EffectScope.LINK) {
        const geometry = this.linkGeometry(effect); if (!geometry) continue;
        const view = new LinkEffectView(this.scene, effect, geometry, this.onLinkInfo); this.linkLayer.add(view); this.links.set(effect.id, view);
      }
      if (effect.config.scope === EffectScope.GEM && effect.target.type === EffectScope.GEM) this.drawGemEffect(effect, runtime, values);
      if (effect.config.scope === EffectScope.AREA && effect.target.type === EffectScope.AREA) this.drawAreaEffect(effect);
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
      case "AREA_ICE_TRIGGERED": this.flashGem(event.gemId, 0x8cecff); break;
      case "AREA_ICE_APPLIED": this.flashGem(event.gemId, 0x8cecff); break;
      case "AREA_INVERTER_TRIGGERED": this.flashGem(event.gemId, 0xc890ff); break;
      case "AREA_INVERTER_APPLIED": this.flashGem(event.gemId, 0xc890ff); break;
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
      const delay = impulseLinkStartDelayMs(event.generation);
      this.animateDischargeLink(link, reverse, delay);
      const destinationId = reverse ? link.effect.target.fromGem.id : link.effect.target.toGem.id;
      // Do not delay the logical impact until every decorative tail has completed.
      this.dischargeArrival(destinationId, impulseImpactDelayMs(event.generation));
    }
  }
  destroy(): void { this.links.clear(); this.markerCounts.clear(); this.linkLayer.destroy(true); this.previewGemLayer.destroy(true); this.gemLayer.destroy(true); this.markerLayer.destroy(true); this.flowLayer.destroy(true); this.dischargeLayer.destroy(true); }
  private linkGeometry(effect: ResolvedEffect): LinkEffectGeometry | null {
    if (effect.target.type !== EffectScope.LINK) return null; const from = this.gems.get(effect.target.fromGem.id); const to = this.gems.get(effect.target.toGem.id); if (!from || !to) return null;
    const start = new Phaser.Math.Vector2(from.x, from.y); const end = new Phaser.Math.Vector2(to.x, to.y); const midpoint = start.clone().add(end).scale(.5); let outward = midpoint.clone().subtract(this.center);
    if (outward.lengthSq() < 1) outward = end.clone().subtract(start).normalize().rotate(Math.PI / 2);
    else outward.normalize();
    const radius = Math.max(from.radius, to.radius);
    const total = this.gems.size; const distance = Math.abs(effect.target.fromGem.index - effect.target.toGem.index); const adjacent = Math.min(distance, total - distance) === 1;
    return { from: start, to: end, control: midpoint.add(outward.scale(radius * 2.2)), radius, iconProgress: adjacent ? .5 : EFFECT_PHASER_VISUAL.links.nonAdjacentIconProgress };
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
    // Persistent gem effects are represented only by their atlas icon and optional value badge.
    // Borders, shield rings, wall cracks and ice lines would compete with the gem numeral.
    const value = effect.config.type === GemEffectType.SHIELD ? (effect.config.consumable ? runtime?.shieldRemainingStrength[effect.id] ?? effect.config.strength : effect.config.strength)
      : effect.config.type === GemEffectType.WALL ? runtime?.wallRemainingStrength[effect.id] ?? effect.config.strength
        : effect.config.type === GemEffectType.ICE ? runtime?.iceRemainingStrength[effect.id] ?? effect.config.strength
          : effect.config.type === GemEffectType.TIMER ? runtime?.timerRemainingTurns[effect.id] ?? effect.config.turns
            : effect.config.type === GemEffectType.AMPLIFIER ? `×${effect.config.multiplier}`
              : effect.config.type === GemEffectType.CORRUPTION ? `+${effect.config.amount}` : "";
    if (typeof value === "number" && value <= 0) return;
    if (effect.config.type === GemEffectType.CORRUPTION && values[effect.target.gem.index] === 0) return;
    this.drawEffectMarker(effect.target.gem.id, this.iconFrame(effect), this.iconColor(effect), value === "" ? "" : String(value));
  }
  private drawAreaEffect(effect: ResolvedEffect): void { if (effect.target.type !== EffectScope.AREA || effect.config.scope !== EffectScope.AREA) return; const value = effect.config.type === AreaEffectType.BOMB && effect.config.value !== undefined ? `${effect.config.value > 0 ? "+" : ""}${effect.config.value}` : ""; this.drawEffectMarker(effect.target.sourceGem.id, this.iconFrame(effect), this.iconColor(effect), value, "bottom-right"); }
  private iconFrame(effect: ResolvedEffect): string { return effectAssetFrame(effect); }
  private iconColor(effect: ResolvedEffect): number {
    if (effect.config.scope === EffectScope.GEM) return effect.config.type === GemEffectType.SHIELD ? 0x72dfff : effect.config.type === GemEffectType.WALL ? 0xbca477 : effect.config.type === GemEffectType.ICE ? 0x8cecff : effect.config.type === GemEffectType.AMPLIFIER ? 0xffcd62 : effect.config.type === GemEffectType.TIMER ? 0xffcf75 : effect.config.type === GemEffectType.CORRUPTION ? 0xb35cff : effect.config.type === GemEffectType.INVERTER ? 0xc890ff : 0xdba0ff;
    if (effect.config.scope === EffectScope.LINK) return effect.config.type === LinkEffectType.ECHO ? 0x7edbff : effect.config.type === LinkEffectType.AMPLIFY ? 0xffcd62 : 0xc890ff;
    return effect.config.type === AreaEffectType.ICE ? 0x8cecff : effect.config.type === AreaEffectType.INVERTER ? 0xc890ff : 0xff9378;
  }
  /** Gem effects sit top-right; area effects reserve the bottom-right corner. */
  private drawEffectMarker(gemId: string, frame: string, color: number, value = "", placement: "top-right" | "bottom-right" = "top-right"): void {
    const gem = this.gems.get(gemId); if (!gem) return;
    const markerKey = `${gemId}:${placement}`;
    const count = this.markerCounts.get(markerKey) ?? 0; this.markerCounts.set(markerKey, count + 1);
    const offsets = placement === "top-right" ? [[.88, -.88], [.25, -1.02], [-.36, -.88]] as const : [[.88, .88], [.25, 1.02], [-.36, .88]] as const;
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
        const intensity = Math.sin(progress.value * Math.PI * .82);
        halo.setPosition(point.x - deltaY / length * weave, point.y + deltaX / length * weave).setScale(visual.haloMinScale + intensity * visual.haloScaleRange).setAlpha(intensity * visual.haloAlpha);
        particle.setPosition(point.x - deltaY / length * weave, point.y + deltaX / length * weave).setScale(visual.particleMinScale + intensity * visual.particleScaleRange).setAlpha(intensity * visual.particleAlpha);
      }, onComplete: () => { this.scene.tweens.add({ targets: [halo, particle], alpha: 0, scale: .3, duration: visual.arrivalBurstDurationMs, ease: "Cubic.Out", onComplete: () => { halo.destroy(); particle.destroy(); } }); } });
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
  private badge(x: number, y: number, text: string): Phaser.GameObjects.Container { const background = this.scene.add.circle(0, 0, 11, 0x151917, .98).setStrokeStyle(2, 0xe5bd62, 1); const label = this.scene.add.text(0, 0, text, { fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", color: "#ffffff", fontStyle: "bold", stroke: "#000000", strokeThickness: 2 }).setOrigin(.5); return this.scene.add.container(x, y, [background, label]); }
}
