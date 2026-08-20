import * as Phaser from "phaser";
import { EffectScope, LinkDirection, LinkEffectType, ResolvedEffect } from "../../rnd/effects/effects.models";
import { EFFECT_PHASER_VISUAL } from "./effect-phaser-visual.config";

export interface LinkEffectGeometry { from: Phaser.Math.Vector2; to: Phaser.Math.Vector2; control: Phaser.Math.Vector2; }

/** Visual-only persistent link. It has no knowledge of gameplay values or propagation rules. */
export class LinkEffectView extends Phaser.GameObjects.Container {
  readonly geometry: LinkEffectGeometry;
  constructor(scene: Phaser.Scene, readonly effect: ResolvedEffect, geometry: LinkEffectGeometry, onInfo?: (effectId: string) => void) {
    super(scene); this.geometry = geometry; scene.add.existing(this); this.setDepth(EFFECT_PHASER_VISUAL.linkDepth);
    const config = effect.config; if (config.scope !== EffectScope.LINK) return;
    const color = config.type === LinkEffectType.AMPLIFY ? 0xffcd62 : config.type === LinkEffectType.INVERT ? 0xc890ff : 0x7edbff;
    const graphic = scene.add.graphics(); graphic.lineStyle(EFFECT_PHASER_VISUAL.linkWidth, color, EFFECT_PHASER_VISUAL.linkAlpha); this.drawCurve(graphic);
    if (config.type === LinkEffectType.ECHO) { graphic.lineStyle(1, color, .9); this.drawCurve(graphic, 4); }
    const midpoint = this.pointAt(.5); const symbol = config.type === LinkEffectType.AMPLIFY ? `×${config.multiplier ?? 1}` : config.type === LinkEffectType.INVERT ? "±" : "≋";
    const label = scene.add.text(midpoint.x, midpoint.y, `${symbol} ${config.direction === LinkDirection.FORWARD ? "→" : "↔"}`, { fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: `#${color.toString(16).padStart(6, "0")}`, stroke: "#111814", strokeThickness: 3 }).setOrigin(.5);
    if (onInfo) label.setInteractive({ useHandCursor: true }).on("pointerdown", () => onInfo(effect.id));
    this.add([graphic, label]);
  }
  pointAt(t: number): Phaser.Math.Vector2 { const oneMinus = 1 - t; return new Phaser.Math.Vector2(oneMinus * oneMinus * this.geometry.from.x + 2 * oneMinus * t * this.geometry.control.x + t * t * this.geometry.to.x, oneMinus * oneMinus * this.geometry.from.y + 2 * oneMinus * t * this.geometry.control.y + t * t * this.geometry.to.y); }
  setHighlighted(value: boolean): void { this.setAlpha(value ? 1 : .5); }
  setDisabled(value: boolean): void { this.setAlpha(value ? .26 : 1); }
  private drawCurve(graphics: Phaser.GameObjects.Graphics, offset = 0): void { const { from, control, to } = this.geometry; const path = new Phaser.Curves.Path(from.x + offset, from.y + offset); path.quadraticBezierTo(to.x + offset, to.y + offset, control.x + offset, control.y + offset); path.draw(graphics, 18); }
}
