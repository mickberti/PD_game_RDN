import * as Phaser from "phaser";
import { EffectEngineEvent, EffectScope, GemEffectType, ResolvedEffect } from "../../rnd/effects/effects.models";
import { EFFECT_PHASER_VISUAL } from "./effect-phaser-visual.config";
import { LinkEffectGeometry, LinkEffectView } from "./link-effect.view";

export interface EffectGemPosition { x: number; y: number; radius: number; }

/** Bridges semantic engine events to Phaser presentation only. */
export class EffectPhaserRenderer {
  private readonly gemLayer: Phaser.GameObjects.Container;
  private readonly linkLayer: Phaser.GameObjects.Container;
  private readonly flowLayer: Phaser.GameObjects.Container;
  private readonly links = new Map<string, LinkEffectView>();
  constructor(private readonly scene: Phaser.Scene, private readonly gems: ReadonlyMap<string, EffectGemPosition>, private readonly center: Phaser.Math.Vector2) {
    this.linkLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.linkDepth);
    this.gemLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.gemDepth);
    this.flowLayer = scene.add.container().setDepth(EFFECT_PHASER_VISUAL.flowDepth);
  }
  renderPersistent(effects: readonly ResolvedEffect[], wallState: Readonly<Record<string, number>> = {}): void {
    for (const effect of effects) {
      if (effect.config.scope === EffectScope.LINK && effect.target.type === EffectScope.LINK) {
        const geometry = this.linkGeometry(effect); if (!geometry) continue;
        const view = new LinkEffectView(this.scene, effect, geometry); this.linkLayer.add(view); this.links.set(effect.id, view);
      }
      if (effect.config.scope === EffectScope.GEM && effect.target.type === EffectScope.GEM) this.drawGemEffect(effect, wallState[effect.id]);
      if (effect.config.scope === EffectScope.AREA && effect.target.type === EffectScope.AREA) this.drawBomb(effect);
    }
  }
  play(events: readonly EffectEngineEvent[]): void {
    for (const event of events) switch (event.type) {
      case "FLOW_PROPAGATED": this.animateFlow(event); break;
      case "FLOW_ARRIVED": this.pulseGem(event.gemId, 0x9cf5ff); break;
      case "FLOW_MERGED": this.pulseGem(event.gemId, 0xffdf70, 1.55); break;
      case "SHIELD_ABSORBED": this.flashGem(event.gemId, 0x72dfff); break;
      case "WALL_HIT": this.flashGem(event.gemId, 0xbca477); break;
      case "WALL_BROKEN": this.breakWall(event.gemId); break;
      case "MIRROR_APPLIED": this.flashGem(event.gemId, 0xdba0ff); break;
      case "BOMB_TRIGGERED": this.bombBurst(event.gemId); break;
    }
  }
  destroy(): void { this.links.clear(); this.linkLayer.destroy(true); this.gemLayer.destroy(true); this.flowLayer.destroy(true); }
  private linkGeometry(effect: ResolvedEffect): LinkEffectGeometry | null {
    if (effect.target.type !== EffectScope.LINK) return null; const from = this.gems.get(effect.target.fromGem.id); const to = this.gems.get(effect.target.toGem.id); if (!from || !to) return null;
    const start = new Phaser.Math.Vector2(from.x, from.y); const end = new Phaser.Math.Vector2(to.x, to.y); const midpoint = start.clone().add(end).scale(.5); let outward = midpoint.clone().subtract(this.center);
    if (outward.lengthSq() < 1) outward = end.clone().subtract(start).normalize().rotate(Math.PI / 2);
    else outward.normalize();
    return { from: start, to: end, control: midpoint.add(outward.scale(Math.max(from.radius, to.radius) * 2.2)) };
  }
  private drawGemEffect(effect: ResolvedEffect, wallRemaining?: number): void {
    if (effect.target.type !== EffectScope.GEM || effect.config.scope !== EffectScope.GEM) return; const gem = this.gems.get(effect.target.gem.id); if (!gem) return;
    const graphics = this.scene.add.graphics(); const radius = gem.radius;
    if (effect.config.type === GemEffectType.SHIELD) { graphics.lineStyle(Math.max(2, radius * .09), 0x6edfff, .9); graphics.strokeCircle(gem.x, gem.y, radius * 1.26); this.gemLayer.add(graphics); this.gemLayer.add(this.badge(gem.x + radius * .74, gem.y - radius * .74, String(effect.config.strength ?? 1), 0x174e70)); return; }
    if (effect.config.type === GemEffectType.WALL) { const remaining = wallRemaining ?? effect.config.strength ?? 1; graphics.lineStyle(Math.max(3, radius * .14), 0xb79a6c, .95); graphics.strokeCircle(gem.x, gem.y, radius * 1.13); for (let index = 0; index < Math.max(0, (effect.config.strength ?? 1) - remaining); index += 1) graphics.lineBetween(gem.x - radius * .55 + index * 5, gem.y - radius * .4, gem.x + radius * .25, gem.y + radius * .45); this.gemLayer.add(graphics); this.gemLayer.add(this.badge(gem.x + radius * .76, gem.y - radius * .76, String(remaining), 0x59432b)); return; }
    graphics.lineStyle(Math.max(2, radius * .08), 0xd7a2ff, .9); graphics.lineBetween(gem.x - radius * .62, gem.y - radius * .62, gem.x + radius * .62, gem.y + radius * .62); graphics.lineBetween(gem.x - radius * .62, gem.y + radius * .62, gem.x + radius * .62, gem.y - radius * .62); this.gemLayer.add(graphics);
  }
  private drawBomb(effect: ResolvedEffect): void { if (effect.target.type !== EffectScope.AREA) return; const gem = this.gems.get(effect.target.sourceGem.id); if (!gem) return; const mark = this.scene.add.text(gem.x, gem.y - gem.radius * .68, "✹", { fontFamily: "Arial", fontSize: `${Math.max(13, gem.radius * .72)}px`, color: "#ff9378", stroke: "#35130e", strokeThickness: 3 }).setOrigin(.5); this.gemLayer.add(mark); }
  private animateFlow(event: EffectEngineEvent): void { const link = event.linkId ? this.links.get(event.linkId) : undefined; if (!link || !event.gemId || link.effect.target.type !== EffectScope.LINK) return; const reverse = link.effect.target.fromGem.id === event.gemId; const from = reverse ? link.geometry.to : link.geometry.from; const particle = this.scene.add.circle(from.x, from.y, 4, 0xf5e58a, .98); this.flowLayer.add(particle); const progress = { value: 0 }; this.scene.tweens.add({ targets: progress, value: 1, duration: EFFECT_PHASER_VISUAL.flowDuration, ease: "Sine.InOut", onUpdate: () => { const point = link.pointAt(reverse ? 1 - progress.value : progress.value); particle.setPosition(point.x, point.y).setScale(1 + progress.value * (EFFECT_PHASER_VISUAL.flowParticleScale - 1)); }, onComplete: () => particle.destroy() }); }
  private pulseGem(gemId: string | undefined, color: number, scale = 1.25): void { const gem = gemId ? this.gems.get(gemId) : undefined; if (!gem) return; const pulse = this.scene.add.circle(gem.x, gem.y, gem.radius, color, .22); this.flowLayer.add(pulse); this.scene.tweens.add({ targets: pulse, scale, alpha: 0, duration: EFFECT_PHASER_VISUAL.gemHighlightDuration, onComplete: () => pulse.destroy() }); }
  private flashGem(gemId: string | undefined, color: number): void { this.pulseGem(gemId, color, 1.42); }
  private breakWall(gemId: string | undefined): void { const gem = gemId ? this.gems.get(gemId) : undefined; if (!gem) return; for (let index = 0; index < 6; index += 1) { const shard = this.scene.add.rectangle(gem.x, gem.y, 4, 4, 0xc1a16f).setRotation(index); this.flowLayer.add(shard); const angle = index * Math.PI * 2 / 6; this.scene.tweens.add({ targets: shard, x: gem.x + Math.cos(angle) * gem.radius * 1.7, y: gem.y + Math.sin(angle) * gem.radius * 1.7, alpha: 0, duration: EFFECT_PHASER_VISUAL.wallBreakDuration, onComplete: () => shard.destroy() }); } }
  private bombBurst(gemId: string | undefined): void { const gem = gemId ? this.gems.get(gemId) : undefined; if (!gem) return; const blast = this.scene.add.circle(gem.x, gem.y, gem.radius * .7, 0xff886e, .7); this.flowLayer.add(blast); this.scene.tweens.add({ targets: blast, scale: 4, alpha: 0, duration: EFFECT_PHASER_VISUAL.bombDuration, ease: "Cubic.Out", onComplete: () => blast.destroy() }); }
  private badge(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container { const background = this.scene.add.circle(0, 0, 10, color).setStrokeStyle(1, 0xffffff, .7); const label = this.scene.add.text(0, 0, text, { fontFamily: "Arial", fontSize: "11px", color: "#ffffff", fontStyle: "bold" }).setOrigin(.5); return this.scene.add.container(x, y, [background, label]); }
}
