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
  private readonly chainOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private chainDestinationIcon?: Phaser.GameObjects.Image;
  private baseGraphic?: Phaser.GameObjects.Graphics;
  private direction = LinkDirection.BIDIRECTIONAL;
  private linkColor = 0xffffff;
  constructor(scene: Phaser.Scene, readonly effect: ResolvedEffect, geometry: LinkEffectGeometry, onInfo?: (effectId: string, pointer: Phaser.Input.Pointer) => void, overlayLayer?: Phaser.GameObjects.Container) {
    super(scene); this.geometry = geometry; scene.add.existing(this); this.setDepth(EFFECT_PHASER_VISUAL.linkDepth);
    const config = effect.config; if (config.scope !== EffectScope.LINK) return;
    const color = config.type === LinkEffectType.AMPLIFY ? 0xffcd62 : config.type === LinkEffectType.INVERT ? 0xc890ff : 0x7edbff; this.linkColor = color;
    const visual = EFFECT_PHASER_VISUAL.links;
    const chain = config.type === LinkEffectType.CHAIN;
    const graphic = scene.add.graphics(); this.baseGraphic = graphic;
    if (chain) this.drawChainLinks(scene, graphic);
    else { graphic.lineStyle(visual.width + visual.outerGlowWidthExtra, color, visual.outerGlowAlpha); this.drawCurve(graphic); graphic.lineStyle(visual.width + visual.middleGlowWidthExtra, color, visual.middleGlowAlpha); this.drawCurve(graphic); graphic.lineStyle(visual.width, color, visual.coreAlpha); this.drawCurve(graphic); }
    const direction = config.type === LinkEffectType.CHAIN ? LinkDirection.FORWARD : config.direction ?? LinkDirection.BIDIRECTIONAL; this.direction = direction;
    if (!chain && direction !== LinkDirection.REVERSE) this.drawArrow(graphic, this.pointAt(.93), this.tangentAt(.93), color);
    if (!chain && direction !== LinkDirection.FORWARD) this.drawArrow(graphic, this.pointAt(.07), this.tangentAt(.07).negate(), color);
    const iconPosition = this.pointAt(geometry.iconProgress); const frame = config.type === LinkEffectType.ECHO ? "effect-echo-link" : config.type === LinkEffectType.AMPLIFY ? "effect-double-link" : config.type === LinkEffectType.CHAIN ? "effect-chain-link" : "effect-mirror-link"; const texture = "rdn-effects";
    const size = Math.max(13, geometry.radius * .72) + 5;
    const background = scene.add.circle(iconPosition.x, iconPosition.y, size * .56, 0x101c18, .94).setStrokeStyle(Math.max(1, size * .08), color, 1).setInteractive({ useHandCursor: true });
    const icon = scene.textures.getFrame(texture, frame)
      ? scene.add.image(iconPosition.x, iconPosition.y - 2, texture, frame).setDisplaySize(size, size)
      : scene.add.circle(iconPosition.x, iconPosition.y - 2, size * .38, color, .72);
    icon.setInteractive({ useHandCursor: true });
    if (onInfo) { background.on("pointerup", (pointer: Phaser.Input.Pointer) => onInfo(effect.id, pointer)); icon.on("pointerup", (pointer: Phaser.Input.Pointer) => onInfo(effect.id, pointer)); }
    this.add([graphic, background, icon]);
    if (chain) { this.animateChainBond(scene); this.bringToTop(background); this.bringToTop(icon); if (overlayLayer) this.drawChainRestraint(scene, overlayLayer); }
    else {
      if (direction !== LinkDirection.REVERSE) this.animateDirection(scene, color, true, 0);
      if (direction !== LinkDirection.FORWARD) this.animateDirection(scene, color, false, direction === LinkDirection.BIDIRECTIONAL ? 620 : 0);
    }
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
  /** Shatters the destination emblem before the resolved Chain is removed from the board. */
  breakDestinationIcon(): boolean {
    const icon = this.chainDestinationIcon; if (!icon?.active) return false;
    this.scene.tweens.killTweensOf(icon); icon.setVisible(false);
    const frame = this.scene.textures.getFrame(icon.texture.key, icon.frame.name); if (!frame) { icon.destroy(); return true; }
    const config = EFFECT_PHASER_VISUAL.links.chain.destinationIcon.shatter; if (!config.enabled) { icon.destroy(); return true; }
    const columns = 4; const rows = Math.ceil(config.fragments / columns); const cropWidth = frame.width / columns; const cropHeight = frame.height / rows; const parent = icon.parentContainer;
    for (let index = 0; index < config.fragments; index += 1) { const column = index % columns; const row = Math.floor(index / columns); const angle = Math.PI * 2 * index / config.fragments + .2; const fragment = this.scene.add.image(icon.x + (column - (columns - 1) / 2) * icon.displayWidth / columns, icon.y + (row - (rows - 1) / 2) * icon.displayHeight / rows, icon.texture.key, icon.frame.name).setCrop(column * cropWidth, row * cropHeight, cropWidth, cropHeight).setDisplaySize(icon.displayWidth / columns, icon.displayHeight / rows).setAlpha(config.alpha); parent?.add(fragment); const distance = icon.displayWidth * config.distanceRatio * (.7 + (index % 3) * .17); this.scene.tweens.add({ targets: fragment, x: fragment.x + Math.cos(angle) * distance, y: fragment.y + Math.sin(angle) * distance, angle: (index % 2 ? -1 : 1) * 360 * config.rotation, alpha: 0, scaleX: config.finalScale, scaleY: config.finalScale, duration: config.durationMs, ease: "Cubic.Out", onComplete: () => fragment.destroy() }); }
    icon.destroy(); return true;
  }
  /** Uses the standard resolved-effect reveal before the captive emblem is shattered. */
  presentDestinationEffect(onComplete: () => void): boolean {
    const persistentIcon = this.chainDestinationIcon; if (!persistentIcon?.active) return false;
    const config = EFFECT_PHASER_VISUAL.impactFeedback.absorbedIcon;
    const icon = this.scene.add.image(persistentIcon.x, persistentIcon.y - this.geometry.radius * config.offsetYRatio, persistentIcon.texture.key, persistentIcon.frame.name)
      .setDisplaySize(this.geometry.radius * config.sizeRatio, this.geometry.radius * config.sizeRatio)
      .setAlpha(0)
      .setScale(config.initialScale);
    persistentIcon.parentContainer?.add(icon);
    this.scene.tweens.add({ targets: icon, alpha: config.alpha, scaleX: config.finalScale, scaleY: config.finalScale, duration: config.fadeInMs, ease: "Sine.Out", onComplete: () => {
      this.scene.tweens.add({ targets: icon, alpha: config.alpha, duration: Math.max(1, config.durationMs - config.fadeInMs), ease: "Linear", onComplete: () => { icon.destroy(); onComplete(); } });
    } });
    return true;
  }
  setHighlighted(value: boolean): void { this.setAlpha(value ? 1 : .5); }
  setDisabled(value: boolean): void { this.setAlpha(value ? .26 : 1); }
  override destroy(fromScene?: boolean): void { this.clearActiveFlowPreview(); for (const state of this.animationStates) this.scene.tweens.killTweensOf(state); for (const object of this.chainOverlayObjects) this.scene.tweens.killTweensOf(object); super.destroy(fromScene); }
  private tangentAt(t: number): Phaser.Math.Vector2 { const oneMinus = 1 - t; return this.geometry.control.clone().subtract(this.geometry.from).scale(2 * oneMinus).add(this.geometry.to.clone().subtract(this.geometry.control).scale(2 * t)).normalize(); }
  private addPreviewObject(object: Phaser.GameObjects.GameObject): void { this.add(object); this.moveTo(object, 1); this.previewObjects.push(object); }
  private clearActiveFlowPreview(): void { this.baseGraphic?.setVisible(true); this.baseParticles.forEach((particle) => particle.setVisible(true)); for (const state of this.previewStates) this.scene.tweens.killTweensOf(state); this.previewStates.length = 0; for (const object of this.previewObjects) object.destroy(); this.previewObjects.length = 0; }
  private animateActiveFlowPreview(forward: boolean, delay: number): void { const visual = EFFECT_PHASER_VISUAL.activeFlows; const halo = this.scene.add.circle(0, 0, visual.haloRadius, visual.color, visual.alpha * visual.haloAlphaMultiplier); const particle = this.scene.add.circle(0, 0, visual.particleRadius, this.linkColor, visual.alpha).setStrokeStyle(visual.particleStrokeWidth, this.linkColor, 1); this.addPreviewObject(halo); this.addPreviewObject(particle); const state = { progress: 0 }; this.previewStates.push(state); this.scene.tweens.add({ targets: state, progress: 1, delay, duration: visual.durationMs, repeat: -1, repeatDelay: visual.repeatDelayMs, ease: "Sine.InOut", onUpdate: () => { const progress = forward ? state.progress : 1 - state.progress; const point = this.pointAt(progress); const intensity = visual.intensityBase + Math.sin(state.progress * Math.PI) * visual.intensityRange; halo.setPosition(point.x, point.y).setScale(visual.haloMinScale + intensity * visual.haloScaleRange).setAlpha(intensity * visual.alpha * visual.haloFadeAlphaMultiplier); particle.setPosition(point.x, point.y).setScale(visual.particleMinScale + intensity * visual.particleScaleRange).setAlpha(intensity * visual.alpha); } }); }
  private animateDirection(scene: Phaser.Scene, color: number, forward: boolean, delay: number): void { const visual = EFFECT_PHASER_VISUAL.links; const particle = scene.add.circle(0, 0, visual.particleRadius, color, visual.particleAlpha); this.baseParticles.push(particle); this.add(particle); const state = { progress: 0 }; this.animationStates.push(state); scene.tweens.add({ targets: state, progress: 1, delay, duration: visual.particleDurationMs, repeat: -1, repeatDelay: visual.particleRepeatDelayMs, ease: "Sine.InOut", onUpdate: () => { const value = forward ? state.progress : 1 - state.progress; const point = this.pointAt(value); particle.setPosition(point.x, point.y).setScale(visual.particleMinScale + Math.sin(state.progress * Math.PI) * visual.particleScaleRange).setAlpha(visual.particleMinAlpha + Math.sin(state.progress * Math.PI) * visual.particleAlphaRange); } }); }
  /** Alternating oval links replace the conduit and make the dependency tangible. */
  private drawChainLinks(scene: Phaser.Scene, shadow: Phaser.GameObjects.Graphics): void {
    const config = EFFECT_PHASER_VISUAL.links.chain; const distance = Phaser.Math.Distance.Between(this.geometry.from.x, this.geometry.from.y, this.geometry.control.x, this.geometry.control.y) + Phaser.Math.Distance.Between(this.geometry.control.x, this.geometry.control.y, this.geometry.to.x, this.geometry.to.y);
    const count = Phaser.Math.Clamp(Math.round(distance / Math.max(8, this.geometry.radius * config.linkSpacingRatio)), 12, 36); const width = Phaser.Math.Clamp(this.geometry.radius * config.linkWidthRatio, 11, 22); const height = Math.max(6, this.geometry.radius * config.linkHeightRatio); const stroke = Math.max(2, this.geometry.radius * config.linkStrokeRatio);
    shadow.lineStyle(stroke + 8, config.energyColor, config.edgeGlowAlpha * .42); this.drawCurve(shadow);
    for (let index = 1; index < count; index += 1) { const t = index / count; const point = this.pointAt(t); const tangent = this.tangentAt(t); const angle = Phaser.Math.RadToDeg(Math.atan2(tangent.y, tangent.x)) + (index % 2 ? -config.linkAlternatingAngleDeg : config.linkAlternatingAngleDeg); const glowLink = scene.add.ellipse(point.x, point.y, width + 3, height + 3, config.energyColor, 0).setStrokeStyle(stroke + 5, config.energyColor, config.edgeGlowAlpha).setAngle(angle); const shadowLink = scene.add.ellipse(point.x + 1, point.y + 2, width, height, config.shadowColor, 0).setStrokeStyle(stroke + 3, config.shadowColor, .48).setAngle(angle); const link = scene.add.ellipse(point.x, point.y, width, height, config.metalColor, 0).setStrokeStyle(stroke, index % 2 ? config.edgeColor : config.metalColor, config.linkAlpha).setAngle(angle); this.add([glowLink, shadowLink, link]); }
  }
  /** Active-flow-like energy continuously reinforces the source-to-prison relation. */
  private animateChainBond(scene: Phaser.Scene): void {
    const config = EFFECT_PHASER_VISUAL.links.chain;
    for (let index = 0; index < config.particleCount; index += 1) { const halo = scene.add.circle(0, 0, this.geometry.radius * config.haloRadiusRatio, config.energyColor, config.haloAlpha); const particle = scene.add.circle(0, 0, Math.max(2, this.geometry.radius * config.particleRadiusRatio), 0xf3fff6, .95).setStrokeStyle(2, config.energyColor, 1); this.baseParticles.push(halo, particle); this.add([halo, particle]); const state = { progress: 0 }; const phaseOffset = index * Math.PI * 2 / config.particleCount; this.animationStates.push(state); scene.tweens.add({ targets: state, progress: 1, delay: index * config.particleStaggerMs, duration: config.particleDurationMs, repeat: -1, repeatDelay: config.particleRepeatDelayMs, ease: "Sine.InOut", onUpdate: () => { const center = this.pointAt(state.progress); const tangent = this.tangentAt(state.progress); const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x); const orbit = state.progress * Math.PI * 2 * config.particleOrbitTurns + phaseOffset; const offset = Math.sin(orbit) * this.geometry.radius * config.particleOrbitRadiusRatio; const depth = (Math.cos(orbit) + 1) / 2; const intensity = .28 + Math.sin(state.progress * Math.PI) * .72; const x = center.x + normal.x * offset; const y = center.y + normal.y * offset; halo.setPosition(x, y).setScale(.55 + intensity * .45 + depth * .25).setAlpha(intensity * config.haloAlpha * (.55 + depth * .45)); particle.setPosition(x, y).setScale(.62 + intensity * .3 + depth * .42).setAlpha(.3 + intensity * .35 + depth * .35); } }); }
  }
  /** A transparent chain emblem replaces the previous bands, marking the captive destination. */
  private drawChainRestraint(scene: Phaser.Scene, overlayLayer: Phaser.GameObjects.Container): void {
    const config = EFFECT_PHASER_VISUAL.links.chain.destinationIcon; const target = this.geometry.to; const group = scene.add.container(); const icon = scene.add.image(target.x, target.y, "rdn-effects", "effect-chain-link").setDisplaySize(this.geometry.radius * config.sizeRatio, this.geometry.radius * config.sizeRatio).setAlpha(config.alpha); this.chainDestinationIcon = icon; group.add(icon);
    overlayLayer.add(group); this.chainOverlayObjects.push(group, icon); scene.tweens.add({ targets: icon, alpha: config.pulseAlpha, scale: config.pulseScale, duration: config.pulseMs, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }
  private drawArrow(graphics: Phaser.GameObjects.Graphics, point: Phaser.Math.Vector2, tangent: Phaser.Math.Vector2, color: number): void { const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x); const tail = point.clone().subtract(tangent.clone().scale(13)); const left = tail.clone().add(normal.clone().scale(7)); const right = tail.clone().subtract(normal.clone().scale(7)); graphics.fillStyle(color, 1); graphics.fillTriangle(point.x, point.y, left.x, left.y, right.x, right.y); }
  private drawCurve(graphics: Phaser.GameObjects.Graphics): void { const { from, control, to } = this.geometry; const path = new Phaser.Curves.Path(from.x, from.y); path.quadraticBezierTo(to.x, to.y, control.x, control.y); path.draw(graphics, 24); }
}
