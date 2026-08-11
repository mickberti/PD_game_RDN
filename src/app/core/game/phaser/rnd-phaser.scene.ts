import * as Phaser from "phaser";
import { AlignmentPreview, LevelDefinition, PuzzleState } from "../rnd/puzzle.types";

export interface RdnSceneModel { level: LevelDefinition; state: PuzzleState; previews: AlignmentPreview[]; nextPreviews: AlignmentPreview[]; outcome: "win" | "lose" | null; }
export interface RdnSceneActions { rotate(direction: "CW" | "CCW", steps: number): void; impulse(): void; restart(): void; undo(): void; continue(): void; retry(): void; exit(): void; }
const VISUAL_SET_COUNT = 3;
const BASE_SET_BY_VARIANT = { persistent: 1, loader: 1 } as const;
const format = (value: number | null): string => value === null ? "—" : value > 0 ? `+${value}` : String(value);

/** Phaser-only presentation layer. It never calculates puzzle rules. */
export class RdnPhaserScene extends Phaser.Scene {
  private model?: RdnSceneModel;
  private dragStart = 0;
  private dragDelta = 0;
  private dragging = false;
  private busy = false;
  private wheelCenter = { x: 0, y: 0, radius: 0 };
  private wheel?: Phaser.GameObjects.Container;
  /** Unwrapped rotation used by tweens; Phaser's `angle` property itself wraps at +/-180°. */
  private visualAngle = 0;
  /** Labels are counter-rotated so the values stay readable while the gear turns. */
  private readableLabels: Phaser.GameObjects.Text[] = [];
  constructor(private readonly actions: RdnSceneActions) { super("rdn-board"); }
  preload(): void {
    for (let set = 1; set <= VISUAL_SET_COUNT; set += 1) {
      this.load.image(`rdn-bg-${set}`, `assets/game/bg/bg-set${set}.png`);
      this.load.image(`rdn-ring-${set}`, `assets/game/ring/ring-set${set}.png`);
      this.load.image(`rdn-gear-${set}`, `assets/game/gear/gear-set${set}.png`);
    }
  }
  create(): void {
    this.scale.on("resize", () => this.render());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.drag(pointer));
    this.input.on("pointerup", () => this.release());
    this.render();
  }
  setModel(model: RdnSceneModel): void { this.model = model; if (this.sys.isActive()) this.render(); }
  render(): void {
    if (!this.model) return; const { width, height } = this.scale; const m = this.model; const cx = width / 2; const cy = height * .49; const outerR = Math.min(width * .43, height * .27); const wheelR = outerR * .72; const visualSet = this.visualSet(m.level);
    this.children.removeAll(true);
    this.readableLabels = [];
    this.addBackground(cx, height / 2, width, height, `rdn-bg-${visualSet}`);
    this.add.rectangle(cx, height / 2, width, height, 0x07100c, .22).setDepth(-3);
    this.add.rectangle(cx, 48, width - 14, 78, 0x211c14).setStrokeStyle(2, 0xa57c3b);
    this.label(cx - width * .25, 26, m.level.variant === "persistent" ? "AVVENTURA" : "TIME ATTACK", 11, 0xf3d27c); this.label(cx - width * .25, 53, String(m.level.number), 30, 0xf3d27c);
    this.label(cx + width * .10, 26, "IMPULSI", 10, 0xf3d27c); this.label(cx + width * .10, 53, String(m.state.impulses), 27, 0xf3d27c);
    this.label(cx + width * .27, 26, "ROT.", 10, 0xf3d27c); this.label(cx + width * .27, 53, String(m.state.rotationSteps), 27, 0xf3d27c);
    this.button(width - 38, 48, "↻", () => this.actions.restart()); this.add.circle(cx, 48, 27, 0x183e28).setStrokeStyle(2, 0x62cc83); this.label(cx, 48, "△", 24, 0x9df3a8);
    this.addDecor(cx, cy, outerR * 2.2, `rdn-ring-${visualSet}`); this.drawConnections(cx, cy, outerR, m);
    for (let index = 0; index < m.state.outerValues.length; index += 1) { const point = this.point(cx, cy, outerR, index, m.level.positions); const preview = m.previews.find((item) => item.slot.outerIndex === index); this.sphere(point.x, point.y, 34, m.state.outerValues[index], m.state.outerValues[index] === 0 ? 0x355047 : 0x08718d); if (preview) this.resultBadge(point.x - 23, point.y + 26, format(preview.result), preview.trend); }
    this.wheelCenter = { x: cx, y: cy, radius: wheelR }; this.wheel = this.add.container(cx, cy); this.wheel.add(this.addGear(wheelR * 2, `rdn-gear-${visualSet}`));
    for (let index = 0; index < m.level.positions; index += 1) { const point = this.point(0, 0, wheelR * .64, index, m.level.positions); const innerIndex = index; const value = m.level.variant === "persistent" ? m.level.innerValues[innerIndex] : m.level.queues[innerIndex][m.state.queueCursors[innerIndex]] ?? null; const sphere = this.add.circle(point.x, point.y, 29, 0x6c1747).setStrokeStyle(3, 0xab7b57); const text = this.add.text(point.x, point.y, format(value), { fontFamily: "Arial", fontSize: "28px", color: "#ffffff", fontStyle: "bold" }).setOrigin(.5); this.readableLabels.push(text); this.wheel.add([sphere, text]); }
    const impulse = this.add.circle(cx, cy, wheelR * .28, 0x2b6240).setStrokeStyle(5, 0xd6b75d).setDepth(2).setInteractive(); impulse.on("pointerdown", () => this.fireImpulse(impulse)); this.label(cx, cy - 8, "△", 32, 0xffe89c); this.label(cx, cy + 20, "IMPULSO", 11, 0xffe89c);
    // Containers do not provide a hit area by themselves. This transparent disk makes
    // drag input dependable for mouse, touch, and pointer devices. It stays below the
    // impulse object in display order, so the impulse keeps priority at the centre.
    const wheelHit = this.add.circle(cx, cy, wheelR, 0xffffff, .001).setInteractive();
    wheelHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
    wheelHit.on("pointermove", (pointer: Phaser.Input.Pointer) => this.drag(pointer));
    wheelHit.on("pointerup", () => this.release());
    wheelHit.on("pointerout", () => this.release());
    this.setWheelAngle(m.state.rotationTurns * 360 / m.level.positions); this.wheel.setSize(wheelR * 2, wheelR * 2);
    this.bonus(cx - 95, height - 50, "⚗", "3"); this.bonus(cx, height - 50, "⚒", "3"); this.bonus(cx + 95, height - 50, "✥", "3");
    if (m.outcome) this.dialog(cx, cy, m.outcome);
  }
  private beginDrag(pointer: Phaser.Input.Pointer): void { if (this.busy || !this.model) return; const dx = pointer.x - this.wheelCenter.x; const dy = pointer.y - this.wheelCenter.y; const distance = Math.hypot(dx, dy); if (distance > this.wheelCenter.radius || distance < this.wheelCenter.radius * .3) return; this.dragging = true; this.dragStart = Math.atan2(dy, dx); this.dragDelta = 0; }
  private drag(pointer: Phaser.Input.Pointer): void { if (!this.dragging || !this.wheel || !pointer.isDown || !this.model) return; const a = Math.atan2(pointer.y - this.wheelCenter.y, pointer.x - this.wheelCenter.x); let delta = (a - this.dragStart) * 180 / Math.PI; if (delta > 180) delta -= 360; if (delta < -180) delta += 360; this.dragDelta = delta; this.setWheelAngle(this.model.state.rotationTurns * 360 / this.model.level.positions + delta); }
  private release(): void { if (!this.dragging || !this.model || !this.wheel) return; this.dragging = false; const minimumDragAngle = 3; const snapAngle = 360 / this.model.level.positions; const base = this.model.state.rotationTurns * snapAngle; if (Math.abs(this.dragDelta) < minimumDragAngle) { this.setWheelAngle(base); this.dragDelta = 0; return; } const direction = this.dragDelta > 0 ? 1 : -1; const step = direction * Math.max(1, Math.round(Math.abs(this.dragDelta) / snapAngle)); const target = base + step * snapAngle; this.busy = true; this.tweens.add({ targets: this, visualAngle: target, duration: 260, ease: "Cubic.Out", onUpdate: () => this.setWheelAngle(this.visualAngle), onComplete: () => { this.actions.rotate(step > 0 ? "CW" : "CCW", Math.abs(step)); this.dragDelta = 0; this.busy = false; } }); }
  private setWheelAngle(angle: number): void { if (!this.wheel) return; this.visualAngle = angle; this.wheel.setAngle(((angle + 180) % 360 + 360) % 360 - 180); this.keepLabelsUpright(); }
  private keepLabelsUpright(): void { if (!this.wheel) return; for (const label of this.readableLabels) label.setAngle(-this.wheel.angle); }
  private fireImpulse(core: Phaser.GameObjects.Arc): void { if (this.busy || !this.model || this.model.state.won) return; this.busy = true; this.tweens.add({ targets: core, scaleX: 1.22, scaleY: 1.22, yoyo: true, duration: 90, repeat: 1 }); this.cameras.main.flash(110, 90, 235, 150); this.cameras.main.shake(90, .006); this.time.delayedCall(160, () => { this.actions.impulse(); this.busy = false; }); }
  private drawConnections(cx: number, cy: number, radius: number, model: RdnSceneModel): void { for (const preview of model.previews) { const p = this.point(cx, cy, radius, preview.slot.outerIndex, model.level.positions); this.add.line(cx, cy, cx, cy, p.x, p.y, 0x59e77c, .9).setLineWidth(4); } for (const preview of model.nextPreviews) if (!model.previews.some((current) => current.slot.outerIndex === preview.slot.outerIndex)) { const p = this.point(cx, cy, radius, preview.slot.outerIndex, model.level.positions); this.add.line(cx, cy, cx, cy, p.x, p.y, 0xe9c14d, .65).setLineWidth(2); } }
  /** Level 1-100 use set 1, then the art rotates through the remaining sets. */
  private visualSet(level: LevelDefinition): number { const baseSet = BASE_SET_BY_VARIANT[level.variant]; return ((baseSet - 1 + Math.floor((level.number - 1) / 100)) % VISUAL_SET_COUNT) + 1; }
  private addBackground(x: number, y: number, width: number, height: number, key: string): void { const background = this.add.image(x, y, key); background.setScale(Math.max(width / background.width, height / background.height)).setDepth(-4); }
  private addDecor(x: number, y: number, diameter: number, key: string): void { const ring = this.add.image(x, y, key); ring.setScale(diameter / Math.max(ring.width, ring.height)); }
  private addGear(diameter: number, key: string): Phaser.GameObjects.Image { const gear = this.add.image(0, 0, key); return gear.setScale(diameter / Math.max(gear.width, gear.height)); }
  private point(cx: number, cy: number, radius: number, index: number, total: number): { x: number; y: number } { const a = -Math.PI / 2 + index * Math.PI * 2 / total; return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }; }
  private sphere(x: number, y: number, radius: number, value: number, color: number): void { this.add.circle(x, y, radius, color).setStrokeStyle(4, 0x9e7845); this.label(x, y, format(value), 30, 0xffffff); }
  private resultBadge(x: number, y: number, value: string, trend: AlignmentPreview["trend"]): void { const background = trend === "zero" ? 0x287a47 : trend === "closer" ? 0x176b79 : trend === "farther" ? 0x882f3b : 0x82652a; const icon = trend === "zero" ? "✓" : trend === "closer" ? "↓" : trend === "farther" ? "↑" : "•"; this.add.rectangle(x, y, 43, 18, background, .94).setStrokeStyle(1, 0xe1bd63); this.label(x, y, `${value}${icon}`, 10, 0xffffff); }
  private label(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text { return this.add.text(x, y, value, { fontFamily: "Arial", fontSize: `${size}px`, color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setOrigin(.5); }
  private button(x: number, y: number, value: string, action: () => void): void { const button = this.add.circle(x, y, 24, 0x3b2b19).setStrokeStyle(2, 0xbd914a).setInteractive(); button.on("pointerdown", action); this.label(x, y, value, 24, 0xffe3a0); }
  private bonus(x: number, y: number, icon: string, count: string): void { this.add.circle(x, y, 31, 0x245438).setStrokeStyle(3, 0xb18b48); this.label(x, y, icon, 22, 0xf6db8b); this.add.circle(x + 23, y + 23, 12, 0x241b12).setStrokeStyle(1, 0xb18b48); this.label(x + 23, y + 23, count, 12, 0xffffff); }
  private dialog(cx: number, cy: number, outcome: "win" | "lose"): void { this.add.rectangle(cx, cy, 310, 180, 0x151914, .96).setStrokeStyle(3, 0xc49b50); this.label(cx, cy - 50, outcome === "win" ? "LIVELLO COMPLETATO" : "NESSUNA MOSSA", 19, 0xf8dc8b); if (outcome === "win") { this.label(cx, cy - 15, "★★★", 27, 0xffdf70); this.button(cx - 62, cy + 48, "▶", () => this.actions.continue()); this.label(cx - 62, cy + 80, "PROSEGUI", 10, 0xf8dc8b); } else { this.button(cx - 62, cy + 48, "↻", () => this.actions.retry()); this.label(cx - 62, cy + 80, "RITENTA", 10, 0xf8dc8b); } this.button(cx + 62, cy + 48, "×", () => this.actions.exit()); this.label(cx + 62, cy + 80, "ESCI", 10, 0xf8dc8b); }
}
