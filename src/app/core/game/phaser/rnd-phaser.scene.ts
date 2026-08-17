import * as Phaser from "phaser";
import { AlignmentPreview, LevelDefinition, PuzzleOperator, PuzzleState } from "../rnd/puzzle.types";
import { getPuzzleScorePolicy, getPuzzleStars } from "../rnd/puzzle-score.policy";
import { atlasData as gameActionAtlas } from "../../../../assets/game/fantasy_bg/atlas/atlas-game-action-set1";
import { RDN_BOARD_LAYOUTS, RDN_PHASER_VISUAL_CONFIG, RdnBoardLayout, getRdnBoardLayout, rdnGearTextureKey, rdnRingTextureKey } from "./rnd-board-layout.config";

export interface RdnSceneModel { level: LevelDefinition; state: PuzzleState; previews: AlignmentPreview[]; nextPreviews: AlignmentPreview[]; outcome: "win" | "lose" | null; timeRemaining: number | null; showInfo: boolean; }
export interface RdnSceneActions { rotate(direction: "CW" | "CCW", steps: number): void; impulse(): void; restart(): void; undo(): void; continue(): void; retry(): void; exit(): void; info(): void; closeInfo(): void; }
const formatOperator = (value: PuzzleOperator | null): string => value === null ? "—" : value === "x2" ? "×2" : value === "divide2" ? "÷2" : value > 0 ? `+${value}` : String(value);
const VISUAL_SET_COUNT = 3;
const BASE_SET_BY_VARIANT = { persistent: 1, loader: 2 } as const;
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
  private layout: RdnBoardLayout = getRdnBoardLayout(6);
  /** Unwrapped rotation used by tweens; Phaser's `angle` property itself wraps at +/-180°. */
  private visualAngle = 0;
  private trailFlows: Array<{ progress: number }> = [];
  private trailEffects: Phaser.GameObjects.Graphics[] = [];
  private lastZeroBurstKey = "";
  /** Value spheres are outside the gear container so they can render above energy trails. */
  private innerSlots: Array<{ sphere: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text; localX: number; localY: number }> = [];
  constructor(private readonly actions: RdnSceneActions) { super("rdn-board"); }
  preload(): void {
    this.load.atlas("rdn-actions", "assets/game/fantasy_bg/game-action-set1.png", gameActionAtlas);
    for (let set = 1; set <= VISUAL_SET_COUNT; set += 1) {
      this.load.image(`rdn-bg-${set}`, `assets/game/bg/bg-set${set}.png`);
    }
    for (let set = 1; set <= VISUAL_SET_COUNT; set += 1) for (const layout of Object.values(RDN_BOARD_LAYOUTS)) { this.load.image(rdnRingTextureKey(layout, set), `assets/game/ring/ring-${layout.positions}-set${set}.png`); this.load.image(rdnGearTextureKey(layout, set), `assets/game/gear/gear-${layout.positions}-set${set}.png`); }
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
    if (!this.model) return; const { width, height } = this.scale; const m = this.model; const cx = width / 2; const cy = height * .49; const outerR = Math.min(width * .43, height * .27); const visualSet = this.visualSet(m.level); this.layout = getRdnBoardLayout(m.level.positions); const layout = this.layout; const wheelR = outerR * layout.gear.diameter / 2; const ringX = cx + outerR * layout.ring.offsetX; const ringY = cy + outerR * layout.ring.offsetY; const gearX = cx + outerR * layout.gear.offsetX; const gearY = cy + outerR * layout.gear.offsetY;
    for (const flow of this.trailFlows) this.tweens.killTweensOf(flow);
    this.trailFlows = [];
    for (const effect of this.trailEffects) this.tweens.killTweensOf(effect);
    this.trailEffects = [];
    this.children.removeAll(true);
    this.innerSlots = [];
    this.addBackground(cx, height / 2, width, height, `rdn-bg-${visualSet}`);
    this.add.rectangle(cx, height / 2, width, height, 0x07100c, .22).setDepth(-3);
    this.button(38, 48, "⌂", () => this.actions.exit());
    this.label(cx - width * .25, 46, m.level.variant === "persistent" ? "AVVENTURA" : "TIME ATTACK", 11, 0xf3d27c); this.label(cx - width * .25, 73, String(m.level.number), 30, 0xf3d27c);
    if (m.timeRemaining !== null) { this.label(cx - width * .04, 46, "TEMPO", 10, 0xf3d27c); this.label(cx - width * .04, 73, this.formatTime(m.timeRemaining), 22, 0xf3d27c); }
    this.label(cx + width * .12, 46, "IMPULSI", 10, 0xf3d27c); this.label(cx + width * .12, 73, String(m.state.impulses), 27, 0xf3d27c);
    this.label(cx + width * .29, 46, "ROT.", 10, 0xf3d27c); this.label(cx + width * .29, 73, String(m.state.rotationSteps), 27, 0xf3d27c);
    this.button(width - 38, 48, "↻", () => this.actions.restart()); const info = this.add.circle(cx, 48, 27, 0x183e28).setStrokeStyle(2, 0x62cc83).setInteractive(); info.on("pointerdown", () => this.actions.info()); this.label(cx, 48, "i", 24, 0x9df3a8);
    this.addDecor(ringX, ringY, outerR * layout.ring.diameter, rdnRingTextureKey(layout, visualSet), layout.ring.angle); this.drawConnections(ringX, ringY, gearX, gearY, outerR, m);
    for (let index = 0; index < m.state.outerValues.length; index += 1) { const point = this.point(ringX, ringY, outerR * layout.outerSlots.radius, index, m.level.positions, layout.outerSlots.angleOffset); const preview = m.previews.find((item) => item.slot.outerIndex === index); this.sphere(point.x, point.y, outerR * layout.outerSlots.sphereRadius, m.state.outerValues[index], m.state.outerValues[index] === 0 ? 0x355047 : 0x08718d); if (preview) this.resultBadge(point.x + outerR * layout.outerSlots.badgeOffsetX, point.y + outerR * layout.outerSlots.badgeOffsetY, format(preview.result), preview.trend); }
    if (m.state.impulses === 0) this.lastZeroBurstKey = "";
    const burstKey = `${m.level.id}-${m.state.impulses}`;
    if (m.state.impulses > 0 && burstKey !== this.lastZeroBurstKey) {
      for (const result of m.state.lastImpulseResults) if (result.result === 0) { const point = this.point(ringX, ringY, outerR * layout.outerSlots.radius, result.outerIndex, m.level.positions, layout.outerSlots.angleOffset); this.zeroBurst(point.x, point.y, outerR * layout.outerSlots.sphereRadius); }
      this.lastZeroBurstKey = burstKey;
    }
    this.wheelCenter = { x: gearX, y: gearY, radius: wheelR }; this.wheel = this.add.container(gearX, gearY); this.wheel.add(this.addGear(outerR * layout.gear.diameter, rdnGearTextureKey(layout, visualSet)));
    for (let index = 0; index < m.level.positions; index += 1) { const point = this.point(0, 0, wheelR * layout.innerSlots.radius, index, m.level.positions, layout.innerSlots.angleOffset); const innerIndex = index; const value = m.level.variant === "persistent" ? m.level.innerValues[innerIndex] : m.level.queues[innerIndex][m.state.queueCursors[innerIndex]] ?? null; const sphereRadius = outerR * layout.innerSlots.sphereRadius; const sphere = this.add.circle(gearX + point.x, gearY + point.y, sphereRadius, 0x6c1747).setStrokeStyle(3, 0xab7b57).setDepth(4); const text = this.add.text(gearX + point.x, gearY + point.y, formatOperator(value), { fontFamily: "Arial", fontSize: `${Math.round(sphereRadius * .96)}px`, color: "#ffffff", fontStyle: "bold" }).setOrigin(.5).setDepth(5); this.innerSlots.push({ sphere, text, localX: point.x, localY: point.y }); }
    const impulse = this.add.circle(gearX, gearY, wheelR * layout.impulse.radius, 0x2b6240).setStrokeStyle(5, 0xd6b75d).setDepth(2).setInteractive(); impulse.on("pointerdown", () => this.fireImpulse(impulse)); this.actionIcon(gearX, gearY, wheelR * layout.impulse.iconSize, "action-lightning", 3);
    // Containers do not provide a hit area by themselves. This transparent disk makes
    // drag input dependable for mouse, touch, and pointer devices. It stays below the
    // impulse object in display order, so the impulse keeps priority at the centre.
    const wheelHit = this.add.circle(gearX, gearY, wheelR, 0xffffff, .001).setInteractive();
    wheelHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
    wheelHit.on("pointermove", (pointer: Phaser.Input.Pointer) => this.drag(pointer));
    wheelHit.on("pointerup", () => this.release());
    wheelHit.on("pointerout", () => this.release());
    this.setWheelAngle(m.state.rotationTurns * 360 / m.level.positions); this.wheel.setSize(wheelR * 2, wheelR * 2);
    this.bonus(cx - 95, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset, "action-heal", "3"); this.bonus(cx, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset, "action-defense", "3"); this.bonus(cx + 95, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset, "action-holy-star", "3");
    if (m.outcome) this.dialog(cx, cy, m.outcome, m); else if (m.showInfo) this.infoDialog(cx, cy, m);
  }
  private beginDrag(pointer: Phaser.Input.Pointer): void { if (this.busy || !this.model || this.model.outcome || this.model.showInfo) return; const dx = pointer.x - this.wheelCenter.x; const dy = pointer.y - this.wheelCenter.y; const distance = Math.hypot(dx, dy); if (distance > this.wheelCenter.radius || distance < this.wheelCenter.radius * .3) return; this.dragging = true; this.dragStart = Math.atan2(dy, dx); this.dragDelta = 0; }
  private drag(pointer: Phaser.Input.Pointer): void { if (!this.dragging || !this.wheel || !pointer.isDown || !this.model) return; const a = Math.atan2(pointer.y - this.wheelCenter.y, pointer.x - this.wheelCenter.x); let delta = (a - this.dragStart) * 180 / Math.PI; if (delta > 180) delta -= 360; if (delta < -180) delta += 360; this.dragDelta = delta; this.setWheelAngle(this.model.state.rotationTurns * 360 / this.model.level.positions + delta); }
  private release(): void { if (!this.dragging || !this.model || !this.wheel) return; this.dragging = false; const minimumDragAngle = 3; const snapAngle = 360 / this.model.level.positions; const base = this.model.state.rotationTurns * snapAngle; if (Math.abs(this.dragDelta) < minimumDragAngle) { this.setWheelAngle(base); this.dragDelta = 0; return; } const direction = this.dragDelta > 0 ? 1 : -1; const step = direction * Math.max(1, Math.round(Math.abs(this.dragDelta) / snapAngle)); const target = base + step * snapAngle; this.busy = true; this.tweens.add({ targets: this, visualAngle: target, duration: 260, ease: "Cubic.Out", onUpdate: () => this.setWheelAngle(this.visualAngle), onComplete: () => { this.actions.rotate(step > 0 ? "CW" : "CCW", Math.abs(step)); this.dragDelta = 0; this.busy = false; } }); }
  private setWheelAngle(angle: number): void { if (!this.wheel) return; this.visualAngle = angle; this.wheel.setAngle(((angle + this.layout.gear.angle + 180) % 360 + 360) % 360 - 180); this.keepLabelsUpright(); }
  private keepLabelsUpright(): void { if (!this.wheel) return; const angle = this.wheel.rotation; const cos = Math.cos(angle); const sin = Math.sin(angle); for (const slot of this.innerSlots) { const x = this.wheel.x + slot.localX * cos - slot.localY * sin; const y = this.wheel.y + slot.localX * sin + slot.localY * cos; slot.sphere.setPosition(x, y); slot.text.setPosition(x, y).setAngle(0); } }
  private fireImpulse(core: Phaser.GameObjects.Arc): void { if (this.busy || !this.model || this.model.state.won || this.model.outcome || this.model.showInfo) return; this.busy = true; this.tweens.add({ targets: core, scaleX: 1.22, scaleY: 1.22, yoyo: true, duration: 90, repeat: 1 }); this.cameras.main.flash(110, 90, 235, 150); this.cameras.main.shake(90, .006); this.time.delayedCall(160, () => { this.actions.impulse(); this.busy = false; }); }
  private drawConnections(ringX: number, ringY: number, sourceX: number, sourceY: number, radius: number, model: RdnSceneModel): void {
    const active = model.previews.filter((preview) => preview.active);
    const activeIndexes = new Set(active.map((preview) => preview.slot.outerIndex));
    for (const preview of active) this.drawTrail(ringX, ringY, sourceX, sourceY, radius, preview.slot.outerIndex, model.level.positions, 0x59e77c, .95, 1.32);
    for (const preview of model.nextPreviews) if (preview.active && !activeIndexes.has(preview.slot.outerIndex)) this.drawTrail(ringX, ringY, sourceX, sourceY, radius, preview.slot.outerIndex, model.level.positions, 0xf3ce55, .68, 1.1);
  }
  /** A curved conduit from the impulse core that coils once around the target sphere. */
  private drawTrail(ringX: number, ringY: number, sourceX: number, sourceY: number, radius: number, outerIndex: number, total: number, color: number, alpha: number, widthMultiplier = 1): void {
    const config = this.layout.trail; const point = this.point(ringX, ringY, radius * this.layout.outerSlots.radius, outerIndex, total, this.layout.outerSlots.angleOffset); const angle = Math.atan2(point.y - sourceY, point.x - sourceX); const unitX = Math.cos(angle); const unitY = Math.sin(angle);
    const startX = sourceX + unitX * radius * config.startRadius; const startY = sourceY + unitY * radius * config.startRadius; const sphereRadius = radius * config.sphereRadius; const endX = point.x - unitX * sphereRadius; const endY = point.y - unitY * sphereRadius;
    const trace = (width: number, opacity: number): Phaser.GameObjects.Graphics => { const graphics = this.add.graphics().setDepth(1); graphics.lineStyle(width, color, opacity); graphics.lineBetween(startX, startY, endX, endY); graphics.strokeCircle(point.x, point.y, sphereRadius); return graphics; };
    const pulseGlow = trace(radius * config.glowWidth * widthMultiplier, alpha * .15).setAlpha(.28); this.trailEffects.push(pulseGlow); this.tweens.add({ targets: pulseGlow, alpha: .92, duration: 1050, ease: "Sine.InOut", yoyo: true, repeat: -1 });
    trace(radius * config.middleWidth * widthMultiplier, alpha * .12); trace(radius * config.coreWidth * widthMultiplier, alpha * .43);
    for (let index = 0; index < 2; index += 1) this.animateTrailFlow(startX, startY, endX, endY, point.x, point.y, sphereRadius, angle, color, alpha, index * 520);
  }
  private animateTrailFlow(startX: number, startY: number, endX: number, endY: number, sphereX: number, sphereY: number, sphereRadius: number, startAngle: number, color: number, alpha: number, delay: number): void {
    const flow = { progress: 0 }; this.trailFlows.push(flow); const particle = this.add.circle(startX, startY, 3, color, alpha * .8).setDepth(3);
    this.tweens.add({ targets: flow, progress: 1, delay, duration: 1450, repeat: -1, repeatDelay: 250, ease: "Sine.InOut", onUpdate: () => { const t = flow.progress; if (t < .72) { const p = t / .72; particle.setPosition(startX + (endX - startX) * p, startY + (endY - startY) * p); } else { const p = (t - .72) / .28; const a = startAngle + Math.PI + p * Math.PI * 2; particle.setPosition(sphereX + Math.cos(a) * sphereRadius, sphereY + Math.sin(a) * sphereRadius); } particle.setAlpha((.18 + Math.sin(t * Math.PI) * .45) * alpha); } });
  }
  /** Adventure uses set 1 and Time Attack set 2; later hundreds rotate through the remaining themes. */
  private visualSet(level: LevelDefinition): number { const baseSet = BASE_SET_BY_VARIANT[level.variant]; return ((baseSet - 1 + Math.floor((level.number - 1) / 100)) % VISUAL_SET_COUNT) + 1; }
  private addBackground(x: number, y: number, width: number, height: number, key: string): void { const background = this.add.image(x, y, key); const scale = RDN_PHASER_VISUAL_CONFIG.backgroundScalePercent / 100; background.setDisplaySize(width * scale, height * scale).setDepth(-4); }
  private addDecor(x: number, y: number, diameter: number, key: string, angle: number): void { const ring = this.add.image(x, y, key); ring.setScale(diameter / Math.max(ring.width, ring.height)).setAngle(angle); }
  private addGear(diameter: number, key: string): Phaser.GameObjects.Image { const gear = this.add.image(0, 0, key); return gear.setScale(diameter / Math.max(gear.width, gear.height)); }
  private point(cx: number, cy: number, radius: number, index: number, total: number, angleOffset = 0): { x: number; y: number } { const a = -Math.PI / 2 + angleOffset * Math.PI / 180 + index * Math.PI * 2 / total; return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }; }
  private sphere(x: number, y: number, radius: number, value: number, color: number): void { this.add.circle(x, y, radius, color).setStrokeStyle(Math.max(2, radius * .12), 0x9e7845); this.label(x, y, format(value), Math.max(14, Math.round(radius * .88)), 0xffffff); }
  private zeroBurst(x: number, y: number, radius: number): void { const flash = this.add.circle(x, y, radius, 0xd9fff3, 1).setDepth(10); const shockwave = this.add.circle(x, y, radius * .7, 0x64f4c8, 0).setStrokeStyle(Math.max(2, radius * .16), 0xb8ffe9, .95).setDepth(10); this.tweens.add({ targets: flash, scale: 5.2, alpha: 0, duration: 680, ease: "Cubic.Out", onComplete: () => flash.destroy() }); this.tweens.add({ targets: shockwave, scale: 4.5, alpha: .86, duration: 120, ease: "Quad.Out", yoyo: true, hold: 70, onComplete: () => shockwave.destroy() }); for (let index = 0; index < 28; index += 1) { const angle = index * Math.PI * 2 / 28 + Math.PI / 28; const distance = radius * (2.1 + (index % 5) * .3); const spark = this.add.circle(x, y, Math.max(2, radius * (.1 + (index % 3) * .035)), 0x8dffe2, .98).setDepth(11); this.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, scale: .08, alpha: 0, duration: 760, delay: index * 11, ease: "Cubic.Out", onComplete: () => spark.destroy() }); } }
  private resultBadge(x: number, y: number, value: string, trend: AlignmentPreview["trend"]): void { const background = trend === "zero" ? 0x287a47 : trend === "closer" ? 0x176b79 : trend === "farther" ? 0x882f3b : 0x82652a; const icon = trend === "zero" ? "✓" : trend === "closer" ? "↓" : trend === "farther" ? "↑" : "•"; this.add.rectangle(x, y, 43, 18, background, .94).setStrokeStyle(1, 0xe1bd63); this.label(x, y, `${value}${icon}`, 10, 0xffffff); }
  private formatTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
  private label(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text { return this.add.text(x, y, value, { fontFamily: "Arial", fontSize: `${size}px`, color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setOrigin(.5); }
  private button(x: number, y: number, value: string, action: () => void, depth = 0): void { const button = this.add.circle(x, y, 24, 0x3b2b19).setStrokeStyle(2, 0xbd914a).setDepth(depth).setInteractive(); button.on("pointerdown", action); this.label(x, y, value, 24, 0xffe3a0).setDepth(depth + 1); }
  private actionIcon(x: number, y: number, size: number, frame: string, depth = 0): void { this.add.image(x, y, "rdn-actions", frame).setDisplaySize(size, size).setDepth(depth); }
  private bonus(x: number, y: number, frame: string, count: string): void { this.add.circle(x, y, 31, 0x245438).setStrokeStyle(3, 0xb18b48); this.actionIcon(x, y, 75, frame, 3); this.add.circle(x + 23, y + 23, 12, 0x241b12).setStrokeStyle(1, 0xb18b48).setDepth(4); this.label(x + 23, y + 23, count, 12, 0xffffff).setDepth(5); }
  private infoDialog(cx: number, cy: number, model: RdnSceneModel): void { const depth = 20; const policy = getPuzzleScorePolicy(model.level); this.add.rectangle(cx, cy, 330, 238, 0x151914, .97).setStrokeStyle(3, 0xc49b50).setDepth(depth).setInteractive(); this.label(cx, cy - 88, "PUNTEGGIO LIVELLO", 18, 0xf8dc8b).setDepth(depth + 1); this.label(cx, cy - 48, `★★★  ${policy.perfectImpulses} impulsi · ${policy.perfectRotationSteps} rotazioni`, 13, 0xffdf70).setDepth(depth + 1); this.label(cx, cy - 16, `★★   fino a ${policy.twoStarImpulseLimit} impulsi`, 13, 0xffdf70).setDepth(depth + 1); this.label(cx, cy + 16, `★    fino a ${policy.oneStarImpulseLimit} impulsi`, 13, 0xffdf70).setDepth(depth + 1); this.label(cx, cy + 49, `SCONFITTA  oltre ${policy.oneStarImpulseLimit} impulsi`, 12, 0xfb8c8c).setDepth(depth + 1); this.button(cx, cy + 88, "×", () => this.actions.closeInfo(), depth + 2); }
  private dialog(cx: number, cy: number, outcome: "win" | "lose", model: RdnSceneModel): void { const depth = 20; this.add.rectangle(cx, cy, 310, 180, 0x151914, .96).setStrokeStyle(3, 0xc49b50).setDepth(depth); this.label(cx, cy - 50, outcome === "win" ? "LIVELLO COMPLETATO" : "TENTATIVO FALLITO", 19, 0xf8dc8b).setDepth(depth + 1); if (outcome === "win") { const stars = getPuzzleStars(model.level, model.state); this.label(cx, cy - 15, "★".repeat(stars) + "☆".repeat(3 - stars), 27, 0xffdf70).setDepth(depth + 1); this.button(cx - 62, cy + 48, "▶", () => this.actions.continue(), depth + 2); this.label(cx - 62, cy + 80, "PROSEGUI", 10, 0xf8dc8b).setDepth(depth + 4); } else { this.button(cx - 62, cy + 48, "↻", () => this.actions.retry(), depth + 2); this.label(cx - 62, cy + 80, "RITENTA", 10, 0xf8dc8b).setDepth(depth + 4); } this.button(cx + 62, cy + 48, "×", () => this.actions.exit(), depth + 2); this.label(cx + 62, cy + 80, "ESCI", 10, 0xf8dc8b).setDepth(depth + 4); }
}
