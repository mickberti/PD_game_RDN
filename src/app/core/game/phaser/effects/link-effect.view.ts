import * as Phaser from "phaser";
import { EffectScope, LinkDirection, LinkEffectType, ResolvedEffect } from "./effects.models";
import { EFFECT_PHASER_VISUAL } from "./effect-phaser-visual.config";

export interface LinkEffectGeometry { from: Phaser.Math.Vector2; to: Phaser.Math.Vector2; control: Phaser.Math.Vector2; radius: number; iconProgress: number; }

/** Visual-only link: its central icon and arrows describe the engine-defined direction. */
export class LinkEffectView extends Phaser.GameObjects.Container {
  readonly geometry: LinkEffectGeometry;
  private readonly animationStates: Array<{ progress: number }> = [];
  private readonly previewStates: Array<{ progress: number }> = [];
  private readonly previewObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly baseParticles: Phaser.GameObjects.Arc[] = [];
  private baseGraphic?: Phaser.GameObjects.Graphics;
  private direction = LinkDirection.BIDIRECTIONAL;
  private linkColor = 0xffffff;
  constructor(scene: Phaser.Scene, readonly effect: ResolvedEffect, geometry: LinkEffectGeometry, onInfo?: (effectId: string, pointer: Phaser.Input.Pointer) => void) {
    super(scene); this.geometry = geometry; scene.add.existing(this); this.setDepth(EFFECT_PHASER_VISUAL.linkDepth);
    const config = effect.config; if (config.scope !== EffectScope.LINK) return;
    // A chain is a normal directional conduit with a prerequisite, not an error.
    // Keep it blue so its selected-flow treatment is identical to the standard link.
    const color = config.type === LinkEffectType.AMPLIFY ? 0xffcd62 : config.type === LinkEffectType.INVERT ? 0xc890ff : 0x7edbff; this.linkColor = color;
    const visual = EFFECT_PHASER_VISUAL.links;
    const graphic = scene.add.graphics(); this.baseGraphic = graphic; graphic.lineStyle(visual.width + visual.outerGlowWidthExtra, color, visual.outerGlowAlpha); this.drawCurve(graphic); graphic.lineStyle(visual.width + visual.middleGlowWidthExtra, color, visual.middleGlowAlpha); this.drawCurve(graphic); graphic.lineStyle(visual.width, color, visual.coreAlpha); this.drawCurve(graphic);
    const direction = config.type === LinkEffectType.CHAIN ? LinkDirection.FORWARD : config.direction ?? LinkDirection.BIDIRECTIONAL; this.direction = direction;
    if (direction !== LinkDirection.REVERSE) this.drawArrow(graphic, this.pointAt(.93), this.tangentAt(.93), color);
    if (direction !== LinkDirection.FORWARD) this.drawArrow(graphic, this.pointAt(.07), this.tangentAt(.07).negate(), color);
    const iconPosition = this.pointAt(geometry.iconProgress); const frame = config.type === LinkEffectType.ECHO ? "effect-echo-link" : config.type === LinkEffectType.AMPLIFY ? "effect-double-link" : config.type === LinkEffectType.CHAIN ? "break-chain" : "effect-mirror-link"; const texture = config.type === LinkEffectType.CHAIN ? "rdn-effect-actions" : "rdn-effects";
    const background = scene.add.circle(iconPosition.x, iconPosition.y, 17, 0x101c18, .94).setStrokeStyle(2, color, 1).setInteractive({ useHandCursor: true });
    const icon = scene.add.image(iconPosition.x, iconPosition.y - 2, texture, frame).setDisplaySize(23, 23).setTint(color).setInteractive({ useHandCursor: true });
    if (onInfo) { background.on("pointerup", (pointer: Phaser.Input.Pointer) => onInfo(effect.id, pointer)); icon.on("pointerup", (pointer: Phaser.Input.Pointer) => onInfo(effect.id, pointer)); }
    this.add([graphic, background, icon]);
    if (direction !== LinkDirection.REVERSE) this.animateDirection(scene, color, true, 0);
    if (direction !== LinkDirection.FORWARD) this.animateDirection(scene, color, false, direction === LinkDirection.BIDIRECTIONAL ? 620 : 0);
  }
  pointAt(t: number): Phaser.Math.Vector2 { const oneMinus = 1 - t; return new Phaser.Math.Vector2(oneMinus * oneMinus * this.geometry.from.x + 2 * oneMinus * t * this.geometry.control.x + t * t * this.geometry.to.x, oneMinus * oneMinus * this.geometry.from.y + 2 * oneMinus * t * this.geometry.control.y + t * t * this.geometry.to.y); }
  /** Green, persistent preview: this link will receive the currently active operation. */
  setActiveFlowPreview(active: boolean): void {
    this.clearActiveFlowPreview();
    if (!active) return;
    this.baseGraphic?.setVisible(false); this.baseParticles.forEach((particle) => particle.setVisible(false));
    const activeFlow = EFFECT_PHASER_VISUAL.activeFlows;
    const overlay = this.scene.add.graphics();
    overlay.lineStyle(this.geometry.radius * activeFlow.linkGlowWidthRadiusRatio, activeFlow.color, activeFlow.alpha * activeFlow.linkGlowAlpha); this.drawCurve(overlay);
    overlay.lineStyle(this.geometry.radius * activeFlow.linkMiddleWidthRadiusRatio, activeFlow.color, activeFlow.alpha * activeFlow.linkMiddleAlpha); this.drawCurve(overlay);
    overlay.lineStyle(this.geometry.radius * activeFlow.linkCoreWidthRadiusRatio, activeFlow.color, activeFlow.alpha * activeFlow.linkCoreAlpha); this.drawCurve(overlay);
    this.addPreviewObject(overlay);
    if (this.direction !== LinkDirection.REVERSE) this.animateActiveFlowPreview(true, 0);
    if (this.direction !== LinkDirection.FORWARD) this.animateActiveFlowPreview(false, this.direction === LinkDirection.BIDIRECTIONAL ? activeFlow.particleStaggerMs : 0);
  }
  /** Gold current drawn over the green preview when the impulse is actually executed. */
  animatePropagation(delay: number): void {
    const visual = EFFECT_PHASER_VISUAL.links; const overlay = this.scene.add.graphics();
    overlay.lineStyle(visual.propagationTrailWidth + visual.propagationTrailGlowWidthExtra, visual.propagationTrailColor, visual.propagationTrailAlpha * .22); this.drawCurve(overlay);
    overlay.lineStyle(visual.propagationTrailWidth, visual.propagationTrailColor, visual.propagationTrailAlpha); this.drawCurve(overlay);
    this.add(overlay);
    this.scene.tweens.add({ targets: overlay, alpha: 0, delay, duration: visual.propagationDurationMs + visual.propagationParticleStaggerMs * (visual.propagationParticleCount - 1), ease: "Sine.Out", onComplete: () => overlay.destroy() });
  }
  setHighlighted(value: boolean): void { this.setAlpha(value ? 1 : .5); }
  setDisabled(value: boolean): void { this.setAlpha(value ? .26 : 1); }
  override destroy(fromScene?: boolean): void { this.clearActiveFlowPreview(); for (const state of this.animationStates) this.scene.tweens.killTweensOf(state); super.destroy(fromScene); }
  private tangentAt(t: number): Phaser.Math.Vector2 { const oneMinus = 1 - t; return this.geometry.control.clone().subtract(this.geometry.from).scale(2 * oneMinus).add(this.geometry.to.clone().subtract(this.geometry.control).scale(2 * t)).normalize(); }
  private addPreviewObject(object: Phaser.GameObjects.GameObject): void { this.add(object); this.moveTo(object, 1); this.previewObjects.push(object); }
  private clearActiveFlowPreview(): void { this.baseGraphic?.setVisible(true); this.baseParticles.forEach((particle) => particle.setVisible(true)); for (const state of this.previewStates) this.scene.tweens.killTweensOf(state); this.previewStates.length = 0; for (const object of this.previewObjects) object.destroy(); this.previewObjects.length = 0; }
  private animateActiveFlowPreview(forward: boolean, delay: number): void { const visual = EFFECT_PHASER_VISUAL.activeFlows; const halo = this.scene.add.circle(0, 0, visual.haloRadius, visual.color, visual.alpha * visual.haloAlphaMultiplier); const particle = this.scene.add.circle(0, 0, visual.particleRadius, this.linkColor, visual.alpha).setStrokeStyle(visual.particleStrokeWidth, this.linkColor, 1); this.addPreviewObject(halo); this.addPreviewObject(particle); const state = { progress: 0 }; this.previewStates.push(state); this.scene.tweens.add({ targets: state, progress: 1, delay, duration: visual.durationMs, repeat: -1, repeatDelay: visual.repeatDelayMs, ease: "Sine.InOut", onUpdate: () => { const progress = forward ? state.progress : 1 - state.progress; const point = this.pointAt(progress); const intensity = visual.intensityBase + Math.sin(state.progress * Math.PI) * visual.intensityRange; halo.setPosition(point.x, point.y).setScale(visual.haloMinScale + intensity * visual.haloScaleRange).setAlpha(intensity * visual.alpha * visual.haloFadeAlphaMultiplier); particle.setPosition(point.x, point.y).setScale(visual.particleMinScale + intensity * visual.particleScaleRange).setAlpha(intensity * visual.alpha); } }); }
  private animateDirection(scene: Phaser.Scene, color: number, forward: boolean, delay: number): void { const visual = EFFECT_PHASER_VISUAL.links; const particle = scene.add.circle(0, 0, visual.particleRadius, color, visual.particleAlpha); this.baseParticles.push(particle); this.add(particle); const state = { progress: 0 }; this.animationStates.push(state); scene.tweens.add({ targets: state, progress: 1, delay, duration: visual.particleDurationMs, repeat: -1, repeatDelay: visual.particleRepeatDelayMs, ease: "Sine.InOut", onUpdate: () => { const value = forward ? state.progress : 1 - state.progress; const point = this.pointAt(value); particle.setPosition(point.x, point.y).setScale(visual.particleMinScale + Math.sin(state.progress * Math.PI) * visual.particleScaleRange).setAlpha(visual.particleMinAlpha + Math.sin(state.progress * Math.PI) * visual.particleAlphaRange); } }); }
  private drawArrow(graphics: Phaser.GameObjects.Graphics, point: Phaser.Math.Vector2, tangent: Phaser.Math.Vector2, color: number): void { const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x); const tail = point.clone().subtract(tangent.clone().scale(13)); const left = tail.clone().add(normal.clone().scale(7)); const right = tail.clone().subtract(normal.clone().scale(7)); graphics.fillStyle(color, 1); graphics.fillTriangle(point.x, point.y, left.x, left.y, right.x, right.y); }
  private drawCurve(graphics: Phaser.GameObjects.Graphics): void { const { from, control, to } = this.geometry; const path = new Phaser.Curves.Path(from.x, from.y); path.quadraticBezierTo(to.x, to.y, control.x, control.y); path.draw(graphics, 24); }
}
