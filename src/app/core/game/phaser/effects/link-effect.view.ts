import * as Phaser from "phaser";
import { EffectScope, LinkDirection, LinkEffectType, ResolvedEffect } from "../../rnd/effects/effects.models";
import { EFFECT_PHASER_VISUAL } from "./effect-phaser-visual.config";

export interface LinkEffectGeometry { from: Phaser.Math.Vector2; to: Phaser.Math.Vector2; control: Phaser.Math.Vector2; }

/** Visual-only link: its central icon and arrows describe the engine-defined direction. */
export class LinkEffectView extends Phaser.GameObjects.Container {
  readonly geometry: LinkEffectGeometry;
  private readonly animationStates: Array<{ progress: number }> = [];
  constructor(scene: Phaser.Scene, readonly effect: ResolvedEffect, geometry: LinkEffectGeometry, onInfo?: (effectId: string) => void) {
    super(scene); this.geometry = geometry; scene.add.existing(this); this.setDepth(EFFECT_PHASER_VISUAL.linkDepth);
    const config = effect.config; if (config.scope !== EffectScope.LINK) return;
    const color = config.type === LinkEffectType.AMPLIFY ? 0xffcd62 : config.type === LinkEffectType.INVERT ? 0xc890ff : 0x7edbff;
    const graphic = scene.add.graphics(); graphic.lineStyle(EFFECT_PHASER_VISUAL.linkWidth + 8, color, .12); this.drawCurve(graphic); graphic.lineStyle(EFFECT_PHASER_VISUAL.linkWidth + 4, color, .28); this.drawCurve(graphic); graphic.lineStyle(EFFECT_PHASER_VISUAL.linkWidth, color, .9); this.drawCurve(graphic);
    const direction = config.direction ?? LinkDirection.BIDIRECTIONAL;
    if (direction !== LinkDirection.REVERSE) this.drawArrow(graphic, this.pointAt(.93), this.tangentAt(.93), color);
    if (direction !== LinkDirection.FORWARD) this.drawArrow(graphic, this.pointAt(.07), this.tangentAt(.07).negate(), color);
    const midpoint = this.pointAt(.5); const frame = config.type === LinkEffectType.ECHO ? "echo-link" : config.type === LinkEffectType.AMPLIFY ? "double-link" : "mirror-link";
    const background = scene.add.circle(midpoint.x, midpoint.y, 17, 0x101c18, .94).setStrokeStyle(2, color, 1).setInteractive({ useHandCursor: true });
    const icon = scene.add.image(midpoint.x, midpoint.y - 2, "rdn-effects", frame).setDisplaySize(23, 23).setTint(color);
    const directionLabel = scene.add.text(midpoint.x, midpoint.y + 17, direction === LinkDirection.FORWARD ? "→" : direction === LinkDirection.REVERSE ? "←" : "↔", { fontFamily: "Arial, Helvetica, sans-serif", fontSize: "13px", fontStyle: "bold", color: "#ffffff", stroke: "#111814", strokeThickness: 3 }).setOrigin(.5);
    if (onInfo) background.on("pointerdown", () => onInfo(effect.id));
    this.add([graphic, background, icon, directionLabel]);
    if (direction !== LinkDirection.REVERSE) this.animateDirection(scene, color, true, 0);
    if (direction !== LinkDirection.FORWARD) this.animateDirection(scene, color, false, direction === LinkDirection.BIDIRECTIONAL ? 620 : 0);
  }
  pointAt(t: number): Phaser.Math.Vector2 { const oneMinus = 1 - t; return new Phaser.Math.Vector2(oneMinus * oneMinus * this.geometry.from.x + 2 * oneMinus * t * this.geometry.control.x + t * t * this.geometry.to.x, oneMinus * oneMinus * this.geometry.from.y + 2 * oneMinus * t * this.geometry.control.y + t * t * this.geometry.to.y); }
  setHighlighted(value: boolean): void { this.setAlpha(value ? 1 : .5); }
  setDisabled(value: boolean): void { this.setAlpha(value ? .26 : 1); }
  override destroy(fromScene?: boolean): void { for (const state of this.animationStates) this.scene.tweens.killTweensOf(state); super.destroy(fromScene); }
  private tangentAt(t: number): Phaser.Math.Vector2 { const oneMinus = 1 - t; return this.geometry.control.clone().subtract(this.geometry.from).scale(2 * oneMinus).add(this.geometry.to.clone().subtract(this.geometry.control).scale(2 * t)).normalize(); }
  private animateDirection(scene: Phaser.Scene, color: number, forward: boolean, delay: number): void { const particle = scene.add.circle(0, 0, 3.5, color, .95); this.add(particle); const state = { progress: 0 }; this.animationStates.push(state); scene.tweens.add({ targets: state, progress: 1, delay, duration: 1320, repeat: -1, repeatDelay: 220, ease: "Sine.InOut", onUpdate: () => { const value = forward ? state.progress : 1 - state.progress; const point = this.pointAt(value); particle.setPosition(point.x, point.y).setScale(.7 + Math.sin(state.progress * Math.PI) * .75).setAlpha(.2 + Math.sin(state.progress * Math.PI) * .78); } }); }
  private drawArrow(graphics: Phaser.GameObjects.Graphics, point: Phaser.Math.Vector2, tangent: Phaser.Math.Vector2, color: number): void { const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x); const tail = point.clone().subtract(tangent.clone().scale(13)); const left = tail.clone().add(normal.clone().scale(7)); const right = tail.clone().subtract(normal.clone().scale(7)); graphics.fillStyle(color, 1); graphics.fillTriangle(point.x, point.y, left.x, left.y, right.x, right.y); }
  private drawCurve(graphics: Phaser.GameObjects.Graphics): void { const { from, control, to } = this.geometry; const path = new Phaser.Curves.Path(from.x, from.y); path.quadraticBezierTo(to.x, to.y, control.x, control.y); path.draw(graphics, 24); }
}
