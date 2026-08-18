import * as Phaser from "phaser";
import { AlignmentPreview, FlowState, LevelDefinition, PuzzleOperator, PuzzleState, QueueState } from "../rnd/puzzle.types";
import { getPuzzleScorePolicy, getPuzzleStars } from "../rnd/puzzle-score.policy";
import { atlasData as gameActionAtlas } from "../../../../assets/game/fantasy_bg/atlas/atlas-game-action-set1";
import { atlasData as gemAtlas } from "../../../../assets/game/fantasy_bg/atlas/atlas-gem-set1";
import { RDN_BOARD_LAYOUTS, RDN_MOTION, RDN_PHASER_VISUAL_CONFIG, RdnBoardLayout, getRdnBoardLayout, rdnGearTextureKey, rdnRingTextureKey } from "./rnd-board-layout.config";
import { LevelEffectConfigResolver } from "../rnd/effects/level-effect-config.resolver";
import { EffectPhaserRenderer, EffectGemPosition } from "./effects/effect-phaser.renderer";

export interface RdnHudAction { icon: string; charges: number; disabled: boolean; }
export interface RdnSceneModel { level: LevelDefinition; state: PuzzleState; previews: AlignmentPreview[]; nextPreviews: AlignmentPreview[]; flows: FlowState[]; queueStates: readonly QueueState[]; actions: readonly RdnHudAction[]; modeLabel: string; freeSettings?: { difficulty: "EASY" | "NORMAL" | "HARD" | "EXPERT"; slotCount: number; }; playground?: { scenario: string; index: number; total: number; lines: readonly string[] }; outcome: "win" | "lose" | null; timeRemaining: number | null; timeRemainingMs?: number | null; timeTotalSeconds?: number; showInfo: boolean; }
export interface RdnSceneActions { rotate(direction: "CW" | "CCW", steps: number): void; impulse(): void; action(slot: number): void; restart(): void; undo(): void; continue(): void; retry(): void; exit(): void; info(): void; closeInfo(): void; nextPlaygroundScenario?(): void; previousPlaygroundScenario?(): void; }
const formatOperator = (value: PuzzleOperator | null): string => value === null ? "—" : value === "divide2" ? "÷2" : value === "divide3" ? "÷3" : value > 0 ? `+${value}` : String(value);
const VISUAL_SET_COUNT = 3;
const BASE_SET_BY_VARIANT = { persistent: 1, loader: 2 } as const;
const format = (value: number | null): string => value === null ? "—" : value > 0 ? `+${value}` : String(value);
const GEM_THEME_CONFIG = {
  1: { frame: "gem-sphere-green", tint: 0xffffff },
  2: { frame: "gem-sphere-green", tint: 0xffffff },
  3: { frame: "gem-sphere-green", tint: 0xffffff },
} as const;

/** Phaser-only presentation layer. It never calculates puzzle rules. */
export class RdnPhaserScene extends Phaser.Scene {
  private model?: RdnSceneModel;
  private dragStart = 0;
  private dragDelta = 0;
  private dragging = false;
  private busy = false;
  private renderPending = false;
  private wheelCenter = { x: 0, y: 0, radius: 0 };
  private wheel?: Phaser.GameObjects.Container;
  private layout: RdnBoardLayout = getRdnBoardLayout(6);
  /** Unwrapped rotation used by tweens; Phaser's `angle` property itself wraps at +/-180°. */
  private visualAngle = 0;
  private trailFlows: Array<{ progress: number }> = [];
  private trailEffects: Phaser.GameObjects.Graphics[] = [];
  private lastZeroBurstKey = "";
  private lastOperationFloatKey = "";
  private operationFloatStartedAt = 0;
  private readonly effectResolver = new LevelEffectConfigResolver();
  private effectRenderer?: EffectPhaserRenderer;
  private lastEffectVisualKey = "";
  /** Value spheres are outside the gear container so they can render above energy trails. */
  private innerSlots: Array<{ sphere: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; badge?: Phaser.GameObjects.Container; localX: number; localY: number }> = [];
  constructor(private readonly actions: RdnSceneActions) { super("rdn-board"); }
  preload(): void {
    this.load.atlas("rdn-actions", "assets/game/fantasy_bg/game-action-set1.png", gameActionAtlas);
    this.load.atlas("rdn-gems", "assets/game/fantasy_bg/gem-set1.png", gemAtlas);
    for (let set = 1; set <= VISUAL_SET_COUNT; set += 1) {
      this.load.image(`rdn-bg-${set}`, `assets/game/bg/bg-set${set}.png`);
    }
    for (let set = 1; set <= VISUAL_SET_COUNT; set += 1) for (const layout of Object.values(RDN_BOARD_LAYOUTS)) { this.load.image(rdnRingTextureKey(layout, set), `assets/game/ring/ring-${layout.positions}-set${set}.png`); this.load.image(rdnGearTextureKey(layout, set), `assets/game/gear/gear-${layout.positions}-set${set}.png`); }
  }
  create(): void {
    // Phaser canvas text does not automatically repaint when a web font arrives.
    void document.fonts.load('400 32px "Carattere"').then(() => this.requestRender()).catch(() => undefined);
    this.scale.on("resize", () => this.requestRender());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.drag(pointer));
    this.input.on("pointerup", () => this.release());
    this.render();
  }
  setModel(model: RdnSceneModel): void { this.model = model; this.requestRender(); }
  private requestRender(): void {
    if (!this.sys.isActive()) return;
    if (this.dragging || this.busy) { this.renderPending = true; return; }
    this.renderPending = false;
    this.render();
  }
  private flushPendingRender(): void { if (this.renderPending) this.requestRender(); }
  render(): void {
    if (!this.model) return; const { width, height } = this.scale; const m = this.model; const cx = width / 2; const cy = height * .49; const outerR = Math.min(width * RDN_PHASER_VISUAL_CONFIG.boardWidthRadiusRatio, height * RDN_PHASER_VISUAL_CONFIG.boardHeightRadiusRatio); const visualSet = this.visualSet(m.level); this.layout = getRdnBoardLayout(m.level.positions); const layout = this.layout; const wheelR = outerR * layout.gear.diameter / 2; const ringX = cx + outerR * layout.ring.offsetX; const ringY = cy + outerR * layout.ring.offsetY; const gearX = cx + outerR * layout.gear.offsetX; const gearY = cy + outerR * layout.gear.offsetY;
    for (const flow of this.trailFlows) this.tweens.killTweensOf(flow);
    this.trailFlows = [];
    for (const effect of this.trailEffects) this.tweens.killTweensOf(effect);
    this.trailEffects = [];
    this.effectRenderer?.destroy();
    this.effectRenderer = undefined;
    this.children.removeAll(true);
    this.innerSlots = [];
    this.addBackground(cx, height / 2, width, height, `rdn-bg-${visualSet}`);
    this.add.rectangle(cx, height / 2, width, height, 0x07100c, .22).setDepth(-3);
    this.button(38, 48, "⌂", () => this.actions.exit());
    this.label(cx - width * .25, 46, m.modeLabel, 11, 0xf3d27c); this.label(cx - width * .25, 73, m.freeSettings ? m.freeSettings.difficulty : String(m.level.number), 22, 0xf3d27c);
    if (m.timeRemaining !== null) { this.label(cx - width * .04, 46, "TEMPO", 10, 0xf3d27c); this.label(cx - width * .04, 73, this.formatTime(m.timeRemaining), 22, 0xf3d27c); }
    this.label(cx + width * .12, 46, "IMPULSI", 10, 0xf3d27c); this.label(cx + width * .12, 73, String(m.state.impulses), 27, 0xf3d27c);
    this.label(cx + width * .29, 46, "ROT.", 10, 0xf3d27c); this.label(cx + width * .29, 73, String(m.state.rotationSteps), 27, 0xf3d27c);
    this.button(width - 38, 48, "↻", () => this.actions.restart()); const info = this.add.circle(cx, 48, 27, 0x183e28).setStrokeStyle(2, 0x62cc83).setInteractive(); info.on("pointerdown", () => this.actions.info()); this.label(cx, 48, "i", 24, 0x9df3a8);
    this.addDecor(ringX, ringY, outerR * layout.ring.diameter, rdnRingTextureKey(layout, visualSet), layout.ring.angle); this.drawCountdownArc(ringX, ringY, outerR * layout.ring.diameter / 2, m); this.drawConnections(ringX, ringY, gearX, gearY, outerR, m);
    const effectGemPositions = new Map<string, EffectGemPosition>();
    for (let index = 0; index < m.state.outerValues.length; index += 1) { const point = this.point(ringX, ringY, outerR * layout.outerSlots.radius, index, m.level.positions, layout.outerSlots.angleOffset); const sphereRadius = outerR * layout.outerSlots.sphereRadius; effectGemPositions.set(`target-${index}`, { x: point.x, y: point.y, radius: sphereRadius }); const preview = m.previews.find((item) => item.slot.outerIndex === index); this.sphere(point.x, point.y, sphereRadius, m.state.outerValues[index], m.state.targetVisualStates[index] === "OFF", index, visualSet); if (preview) this.resultBadge(point.x + outerR * layout.outerSlots.badgeOffsetX, point.y + outerR * layout.outerSlots.badgeOffsetY, format(preview.result), preview.trend); }
    const resolvedEffects = this.effectResolver.resolve(m.level.effectConfiguration, m.level.positions).effects;
    if (resolvedEffects.length) {
      this.effectRenderer = new EffectPhaserRenderer(this, effectGemPositions, new Phaser.Math.Vector2(ringX, ringY));
      this.effectRenderer.renderPersistent(resolvedEffects, m.state.effectRuntime?.wallRemainingStrength);
      const visualKey = `${m.level.id}-${m.state.impulses}`;
      if (m.state.lastEffectEvents?.length && visualKey !== this.lastEffectVisualKey) { this.effectRenderer.play(m.state.lastEffectEvents); this.lastEffectVisualKey = visualKey; }
    }
    const rejectedOperation = m.state.lastOperationResults.find((result) => !result.valid);
    if (rejectedOperation) this.label(cx, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset - 52, this.operationFeedback(rejectedOperation.rejectedReason), 12, 0xffcf75);
    else if (m.flows.find((flow) => !flow.interactable)?.blockedReason) this.label(cx, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset - 52, this.operationFeedback(m.flows.find((flow) => !flow.interactable)?.blockedReason), 12, 0xffcf75);
    if (m.state.impulses === 0) { this.lastZeroBurstKey = ""; this.lastOperationFloatKey = ""; this.lastEffectVisualKey = ""; this.operationFloatStartedAt = 0; }
    const burstKey = `${m.level.id}-${m.state.impulses}`;
    if (m.state.impulses > 0 && burstKey !== this.lastZeroBurstKey) {
      for (const result of m.state.lastImpulseResults) if (result.result === 0) { const point = this.point(ringX, ringY, outerR * layout.outerSlots.radius, result.outerIndex, m.level.positions, layout.outerSlots.angleOffset); this.zeroBurst(point.x, point.y, outerR * layout.outerSlots.sphereRadius); }
      this.lastZeroBurstKey = burstKey;
    }
    this.wheelCenter = { x: gearX, y: gearY, radius: wheelR }; this.wheel = this.add.container(gearX, gearY); this.wheel.add(this.addGear(outerR * layout.gear.diameter, rdnGearTextureKey(layout, visualSet)));
    const blockedSources = new Set(m.flows.filter((flow) => flow.active && !flow.interactable).map((flow) => flow.sourceId));
    for (let index = 0; index < m.level.positions; index += 1) { const point = this.point(0, 0, wheelR * layout.innerSlots.radius, index, m.level.positions, layout.innerSlots.angleOffset); const innerIndex = index; const queue = m.level.variant === "loader" ? m.queueStates[innerIndex] : undefined; const rawValue = m.level.variant === "persistent" ? m.level.innerValues[innerIndex] : queue?.current ?? null; const consumed = (rawValue === "divide2" || rawValue === "divide3") && m.state.consumedSpecialOperatorIndexes.includes(innerIndex); const exhausted = queue?.exhausted ?? false; const value = consumed || exhausted ? null : rawValue; const sphereRadius = outerR * layout.innerSlots.sphereRadius; const blocked = blockedSources.has(innerIndex); const deactivated = blocked || consumed || exhausted; const gem = this.gem(gearX + point.x, gearY + point.y, sphereRadius, index, visualSet, deactivated, rawValue === "divide2" || rawValue === "divide3").setDepth(4); const text = this.sphereLabel(gearX + point.x, gearY + point.y, consumed || exhausted ? "" : formatOperator(value), sphereRadius, deactivated ? 0xd8d8d8 : 0xffffff).setDepth(5); const badge = queue ? this.queueBadge(gearX + point.x + sphereRadius * .72, gearY + point.y + sphereRadius * .72, queue.remainingCount, exhausted) : undefined; this.innerSlots.push({ sphere: gem, text, badge, localX: point.x, localY: point.y }); }
    const impulse = this.add.circle(gearX, gearY, wheelR * layout.impulse.radius, 0x2b6240).setStrokeStyle(5, 0xd6b75d).setDepth(2).setInteractive(); impulse.on("pointerdown", () => this.fireImpulse(impulse)); this.actionIcon(gearX, gearY, wheelR * layout.impulse.iconSize, "action-holy-star", 3);
    // Containers do not provide a hit area by themselves. This transparent disk makes
    // drag input dependable for mouse, touch, and pointer devices. It stays below the
    // impulse object in display order, so the impulse keeps priority at the centre.
    const wheelHit = this.add.circle(gearX, gearY, wheelR, 0xffffff, .001).setInteractive();
    wheelHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
    wheelHit.on("pointermove", (pointer: Phaser.Input.Pointer) => this.drag(pointer));
    wheelHit.on("pointerup", () => this.release());
    wheelHit.on("pointerout", () => this.release());
    this.setWheelAngle(m.state.rotationTurns * 360 / m.level.positions); this.wheel.setSize(wheelR * 2, wheelR * 2);
    const operationFloatKey = `${m.level.id}-${m.state.impulses}`;
    if (m.state.impulses > 0 && operationFloatKey !== this.lastOperationFloatKey) {
      this.lastOperationFloatKey = operationFloatKey;
      this.operationFloatStartedAt = this.time.now;
    }
    const operationFloatElapsed = this.time.now - this.operationFloatStartedAt;
    if (m.state.impulses > 0 && operationFloatElapsed < RDN_MOTION.operationFloatMs) {
      for (const result of m.state.lastOperationResults.filter((item) => item.valid)) {
        const target = this.point(ringX, ringY, outerR * layout.outerSlots.radius, result.outerIndex, m.level.positions, layout.outerSlots.angleOffset);
        this.operationFloat(target.x, target.y, outerR * layout.outerSlots.sphereRadius, result.operator, operationFloatElapsed);
      }
    }
    m.actions.forEach((action, index) => this.bonus(cx + (index - 1) * 95, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset, action, () => this.actions.action(index)));
    if (m.playground) this.playgroundOverlay(width, height, m.playground);
    if (m.outcome) this.dialog(cx, cy, m.outcome, m); else if (m.showInfo) m.freeSettings ? this.freeInfoDialog(cx, cy, m.freeSettings) : this.infoDialog(cx, cy, m);
  }
  private beginDrag(pointer: Phaser.Input.Pointer): void { if (this.busy || !this.model || this.model.outcome || this.model.showInfo) return; const dx = pointer.x - this.wheelCenter.x; const dy = pointer.y - this.wheelCenter.y; const distance = Math.hypot(dx, dy); if (distance > this.wheelCenter.radius || distance < this.wheelCenter.radius * .3) return; this.dragging = true; this.dragStart = Math.atan2(dy, dx); this.dragDelta = 0; }
  private drag(pointer: Phaser.Input.Pointer): void { if (!this.dragging || !this.wheel || !pointer.isDown || !this.model) return; const a = Math.atan2(pointer.y - this.wheelCenter.y, pointer.x - this.wheelCenter.x); let delta = (a - this.dragStart) * 180 / Math.PI; if (delta > 180) delta -= 360; if (delta < -180) delta += 360; this.dragDelta = delta; this.setWheelAngle(this.model.state.rotationTurns * 360 / this.model.level.positions + delta); }
  private release(): void { if (!this.dragging || !this.model || !this.wheel) return; this.dragging = false; const minimumDragAngle = 3; const snapAngle = 360 / this.model.level.positions; const base = this.model.state.rotationTurns * snapAngle; if (Math.abs(this.dragDelta) < minimumDragAngle) { this.setWheelAngle(base); this.dragDelta = 0; this.flushPendingRender(); return; } const direction = this.dragDelta > 0 ? 1 : -1; const step = direction * Math.max(1, Math.round(Math.abs(this.dragDelta) / snapAngle)); const target = base + step * snapAngle; this.busy = true; this.tweens.add({ targets: this, visualAngle: target, duration: RDN_MOTION.dragSnapMs, ease: "Cubic.Out", onUpdate: () => this.setWheelAngle(this.visualAngle), onComplete: () => { this.actions.rotate(step > 0 ? "CW" : "CCW", Math.abs(step)); this.dragDelta = 0; this.busy = false; this.flushPendingRender(); } }); }
  private setWheelAngle(angle: number): void { if (!this.wheel) return; this.visualAngle = angle; this.wheel.setAngle(((angle + this.layout.gear.angle + 180) % 360 + 360) % 360 - 180); this.keepLabelsUpright(); }
  private keepLabelsUpright(): void { if (!this.wheel) return; const angle = this.wheel.rotation; const cos = Math.cos(angle); const sin = Math.sin(angle); for (const slot of this.innerSlots) { const x = this.wheel.x + slot.localX * cos - slot.localY * sin; const y = this.wheel.y + slot.localX * sin + slot.localY * cos; slot.sphere.setPosition(x, y); slot.text.setPosition(x, y).setAngle(0); slot.badge?.setPosition(x + slot.sphere.displayWidth * .33, y + slot.sphere.displayHeight * .33).setAngle(0); } }
  private fireImpulse(core: Phaser.GameObjects.Arc): void { if (this.busy || !this.model || this.model.state.won || this.model.outcome || this.model.showInfo) return; this.busy = true; this.tweens.add({ targets: core, scaleX: 1.22, scaleY: 1.22, yoyo: true, duration: RDN_MOTION.impulseChargeMs, repeat: 1 }); this.cameras.main.flash(110, 90, 235, 150); this.cameras.main.shake(90, .006); this.time.delayedCall(RDN_MOTION.impulseDispatchDelayMs, () => { this.actions.impulse(); this.busy = false; this.flushPendingRender(); }); }
  private drawConnections(ringX: number, ringY: number, sourceX: number, sourceY: number, radius: number, model: RdnSceneModel): void {
    const currentTargets = new Set(model.flows.map((flow) => flow.targetId));
    for (const flow of model.flows) {
      if (flow.interactable) this.drawTrail(ringX, ringY, sourceX, sourceY, radius, flow.targetId, model.level.positions, 0x59e77c, .95, 1.48, true);
      else {
        this.drawTrail(ringX, ringY, sourceX, sourceY, radius, flow.targetId, model.level.positions, 0x929292, .76, 1.48, false);
        this.drawBlockedGearSegment(ringX, ringY, sourceX, sourceY, radius, flow.targetId, model.level.positions);
      }
    }
    // The yellow path is a topology preview, not a validity hint: it remains visible
    // even when the next operation will become blocked (for example a spent DIV2).
    for (const preview of model.nextPreviews) if (!currentTargets.has(preview.slot.outerIndex)) this.drawTrail(ringX, ringY, sourceX, sourceY, radius, preview.slot.outerIndex, model.level.positions, 0xf3ce55, .78, 1.48, true);
  }
  /** A blocked move remains readable: green up to the gear, gray from there to the target. */
  private drawBlockedGearSegment(ringX: number, ringY: number, sourceX: number, sourceY: number, radius: number, outerIndex: number, total: number): void {
    const config = this.layout.trail;
    const point = this.point(ringX, ringY, radius * this.layout.outerSlots.radius, outerIndex, total, this.layout.outerSlots.angleOffset);
    const angle = Math.atan2(point.y - sourceY, point.x - sourceX);
    const startX = sourceX + Math.cos(angle) * radius * config.startRadius;
    const startY = sourceY + Math.sin(angle) * radius * config.startRadius;
    // This is the edge of the rotating gear, immediately before the outgoing gray conduit.
    const endX = sourceX + Math.cos(angle) * radius * this.layout.gear.diameter * .34;
    const endY = sourceY + Math.sin(angle) * radius * this.layout.gear.diameter * .34;
    const graphics = this.add.graphics().setDepth(2);
    graphics.lineStyle(radius * config.glowWidth * 1.48, 0x59e77c, .22);
    graphics.lineBetween(startX, startY, endX, endY);
    graphics.lineStyle(radius * config.middleWidth * 1.48, 0x59e77c, .58);
    graphics.lineBetween(startX, startY, endX, endY);
    graphics.lineStyle(radius * config.coreWidth * 1.48, 0x8fffb0, .92);
    graphics.lineBetween(startX, startY, endX, endY);
  }
  /** A curved conduit from the impulse core that coils once around the target sphere. */
  private drawTrail(ringX: number, ringY: number, sourceX: number, sourceY: number, radius: number, outerIndex: number, total: number, color: number, alpha: number, widthMultiplier = 1, animate = true): void {
    const config = this.layout.trail; const point = this.point(ringX, ringY, radius * this.layout.outerSlots.radius, outerIndex, total, this.layout.outerSlots.angleOffset); const angle = Math.atan2(point.y - sourceY, point.x - sourceX); const unitX = Math.cos(angle); const unitY = Math.sin(angle);
    const startX = sourceX + unitX * radius * config.startRadius; const startY = sourceY + unitY * radius * config.startRadius; const sphereRadius = radius * config.sphereRadius; const endX = point.x - unitX * sphereRadius; const endY = point.y - unitY * sphereRadius;
    const trace = (width: number, opacity: number): Phaser.GameObjects.Graphics => { const graphics = this.add.graphics().setDepth(1); graphics.lineStyle(width, color, opacity); graphics.lineBetween(startX, startY, endX, endY); graphics.strokeCircle(point.x, point.y, sphereRadius); return graphics; };
    const pulseGlow = trace(radius * config.glowWidth * widthMultiplier, animate ? alpha * .15 : alpha * .28).setAlpha(animate ? .28 : .58); if (animate) { this.trailEffects.push(pulseGlow); this.tweens.add({ targets: pulseGlow, alpha: .92, duration: 1050, ease: "Sine.InOut", yoyo: true, repeat: -1 }); }
    trace(radius * config.middleWidth * widthMultiplier, animate ? alpha * .12 : alpha * .42); trace(radius * config.coreWidth * widthMultiplier, animate ? alpha * .43 : alpha * .78);
    if (animate) for (let index = 0; index < 2; index += 1) this.animateTrailFlow(startX, startY, endX, endY, point.x, point.y, sphereRadius, angle, color, alpha, index * 520);
  }
  private animateTrailFlow(startX: number, startY: number, endX: number, endY: number, sphereX: number, sphereY: number, sphereRadius: number, startAngle: number, color: number, alpha: number, delay: number): void {
    const flow = { progress: 0 }; this.trailFlows.push(flow); const particle = this.add.circle(startX, startY, 3, color, alpha * .8).setDepth(3);
    this.tweens.add({ targets: flow, progress: 1, delay, duration: 1450, repeat: -1, repeatDelay: 250, ease: "Sine.InOut", onUpdate: () => { const t = flow.progress; if (t < .72) { const p = t / .72; particle.setPosition(startX + (endX - startX) * p, startY + (endY - startY) * p); } else { const p = (t - .72) / .28; const a = startAngle + Math.PI + p * Math.PI * 2; particle.setPosition(sphereX + Math.cos(a) * sphereRadius, sphereY + Math.sin(a) * sphereRadius); } particle.setAlpha((.18 + Math.sin(t * Math.PI) * .45) * alpha); } });
  }
  /** Adventure uses set 1 and Time Attack set 2; later hundreds rotate through the remaining themes. */
  private visualSet(level: LevelDefinition): number { const baseSet = BASE_SET_BY_VARIANT[level.variant]; const levelNumber = Math.max(1, level.number); return ((baseSet - 1 + Math.floor((levelNumber - 1) / 100)) % VISUAL_SET_COUNT) + 1; }
  private addBackground(x: number, y: number, width: number, height: number, key: string): void { const background = this.add.image(x, y, key); const scale = RDN_PHASER_VISUAL_CONFIG.backgroundScalePercent / 100; background.setDisplaySize(width * scale, height * scale).setDepth(-4); }
  private addDecor(x: number, y: number, diameter: number, key: string, angle: number): void { const ring = this.add.image(x, y, key); ring.setScale(diameter / Math.max(ring.width, ring.height)).setAngle(angle); }
  private addGear(diameter: number, key: string): Phaser.GameObjects.Image { const gear = this.add.image(0, 0, key); return gear.setScale(diameter / Math.max(gear.width, gear.height)); }
  private point(cx: number, cy: number, radius: number, index: number, total: number, angleOffset = 0): { x: number; y: number } { const a = -Math.PI / 2 + angleOffset * Math.PI / 180 + index * Math.PI * 2 / total; return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }; }
  private gem(x: number, y: number, radius: number, _index: number, visualSet: number, off: boolean, special = false): Phaser.GameObjects.Image { const theme = GEM_THEME_CONFIG[visualSet as 1 | 2 | 3]; const frame = special ? "gem-sphere-purple" : theme.frame; const gem = this.add.image(x, y, "rdn-gems", frame).setDisplaySize(radius * 2.18, radius * 2.18); return off ? gem.setTint(0x858585).setAlpha(.78) : gem.setTint(theme.tint); }
  private sphere(x: number, y: number, radius: number, value: number, off: boolean, index: number, visualSet: number): void { this.gem(x, y, radius, index, visualSet, off); this.sphereLabel(x, y, off ? "0" : format(value), radius, off ? 0xe6e6e6 : 0xffffff); }
  /** Numerals occupy 80% of a gem diameter; multi-character operators scale down only to avoid clipping. */
  private sphereLabel(x: number, y: number, value: string, radius: number, color: number): Phaser.GameObjects.Text { const diameter = radius * 2.18; const text = this.label(x, y, value, Math.round(diameter * .8), color, true); const availableWidth = diameter * .8; if (text.width > availableWidth) text.setScale(availableWidth / text.width); return text; }
  private operationFloat(x: number, y: number, radius: number, operator: PuzzleOperator | null, elapsedMs = 0): void { if (operator === null) return; const verticalOffset = 10; const startY = y - radius * .9 - verticalOffset; const endY = y - radius * 2.45 - verticalOffset; const progress = Math.max(0, Math.min(1, elapsedMs / RDN_MOTION.operationFloatMs)); const text = this.sphereLabel(x, startY + (endY - startY) * progress, formatOperator(operator), radius * 1.15, operator === "divide2" || operator === "divide3" ? 0xdca8ff : 0xc5ffe0).setDepth(14); const scaleX = text.scaleX; const scaleY = text.scaleY; const initialScale = .78 + .22 * progress; text.setScale(scaleX * initialScale, scaleY * initialScale).setAlpha(1 - progress); this.tweens.add({ targets: text, y: endY, alpha: 0, scaleX, scaleY, duration: Math.max(1, RDN_MOTION.operationFloatMs - elapsedMs), ease: "Cubic.Out", onComplete: () => text.destroy() }); }
  private zeroBurst(x: number, y: number, radius: number): void { const flash = this.add.circle(x, y, radius, 0xd9fff3, 1).setDepth(10); const shockwave = this.add.circle(x, y, radius * .7, 0x64f4c8, 0).setStrokeStyle(Math.max(2, radius * .16), 0xb8ffe9, .95).setDepth(10); this.tweens.add({ targets: flash, scale: 5.2, alpha: 0, duration: RDN_MOTION.zeroImpactMs, ease: "Cubic.Out", onComplete: () => flash.destroy() }); this.tweens.add({ targets: shockwave, scale: 4.5, alpha: .86, duration: 120, ease: "Quad.Out", yoyo: true, hold: 70, onComplete: () => shockwave.destroy() }); for (let index = 0; index < RDN_MOTION.maxZeroParticles; index += 1) { const angle = index * Math.PI * 2 / RDN_MOTION.maxZeroParticles + Math.PI / RDN_MOTION.maxZeroParticles; const distance = radius * (2.1 + (index % 5) * .3); const spark = this.add.circle(x, y, Math.max(2, radius * (.1 + (index % 3) * .035)), 0x8dffe2, .98).setDepth(11); this.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, scale: .08, alpha: 0, duration: RDN_MOTION.zeroImpactMs, delay: index * 11, ease: "Cubic.Out", onComplete: () => spark.destroy() }); } }
  private resultBadge(x: number, y: number, value: string, trend: AlignmentPreview["trend"]): void { const background = trend === "zero" ? 0x287a47 : trend === "closer" ? 0x176b79 : trend === "farther" ? 0x882f3b : 0x82652a; const icon = trend === "zero" ? "✓" : trend === "closer" ? "↓" : trend === "farther" ? "↑" : "•"; this.add.rectangle(x, y, 43, 18, background, .94).setStrokeStyle(1, 0xe1bd63); this.label(x, y, `${value}${icon}`, 10, 0xffffff); }
  private queueBadge(x: number, y: number, remaining: number, exhausted: boolean): Phaser.GameObjects.Container { const color = exhausted ? 0x5d5d5d : 0x241b12; const border = exhausted ? 0x9a9a9a : 0xb18b48; const background = this.add.circle(0, 0, 11, color).setStrokeStyle(1, border); const text = this.label(0, 0, String(remaining), 11, exhausted ? 0xd8d8d8 : 0xffffff); return this.add.container(x, y, [background, text]).setDepth(6); }
  private drawCountdownArc(cx: number, cy: number, radius: number, model: RdnSceneModel): void {
    if (model.timeRemainingMs === null || model.timeRemainingMs === undefined || !model.timeTotalSeconds) return;
    const ratio = Math.max(0, Math.min(1, model.timeRemainingMs / (model.timeTotalSeconds * 1000)));
    const color = ratio > .5 ? 0x63e586 : ratio > .25 ? 0xf3ce55 : 0xef6b69;
    // Decorative only: it stays behind the ring and never participates in pointer input.
    const graphics = this.add.graphics().setDepth(-2).disableInteractive();
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * ratio;
    const arcRadius = radius * .985;
    for (const [width, alpha] of [[.145, .12], [.095, .29], [.048, .72]] as const) {
      graphics.lineStyle(Math.max(4, radius * width), color, alpha);
      graphics.beginPath();
      graphics.arc(cx, cy, arcRadius, start, end, false);
      graphics.strokePath();
    }
  }
  private formatTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
  private playgroundOverlay(width: number, height: number, playground: NonNullable<RdnSceneModel["playground"]>): void { const x = width * .5; const y = height - 42; this.add.rectangle(x, y, Math.min(width - 20, 360), 58, 0x101c18, .9).setStrokeStyle(1, 0x6edfff).setDepth(30); this.label(x, y - 14, `EFFECT PLAYGROUND · ${playground.scenario}`, 11, 0x9cf5ff).setDepth(31); this.label(x, y + 7, playground.lines.slice(0, 2).join("  |  "), 9, 0xe6dfc3).setDepth(31); this.button(x - 145, y, "‹", () => this.actions.previousPlaygroundScenario?.(), 32); this.button(x + 145, y, "›", () => this.actions.nextPlaygroundScenario?.(), 32); }
  private operationFeedback(reason: AlignmentPreview["rejectedReason"]): string { return reason === "DIVIDE_BY_TWO_REQUIRES_NON_ZERO_EVEN_INTEGER" ? "DIV2 richiede un valore pari diverso da zero" : reason === "DIVIDE_BY_TWO_CONSUMED" ? "DIV2 gia usato" : reason === "DIVIDE_BY_THREE_REQUIRES_NON_ZERO_MULTIPLE_OF_THREE" ? "DIV3 richiede un multiplo di 3 diverso da zero" : reason === "DIVIDE_BY_THREE_CONSUMED" ? "DIV3 gia usato" : reason === "RESULT_OUT_OF_RANGE" ? "Mossa fuori intervallo" : "Mossa non disponibile"; }
  private freeInfoDialog(cx: number, cy: number, settings: NonNullable<RdnSceneModel["freeSettings"]>): void { const depth = 20; this.add.rectangle(cx, cy, 330, 238, 0x151914, .97).setStrokeStyle(3, 0xc49b50).setDepth(depth).setInteractive(); this.label(cx, cy - 84, "INFO FREE", 18, 0xf8dc8b).setDepth(depth + 1); this.label(cx, cy - 43, `Difficolta: ${settings.difficulty}`, 15, 0xffdf70).setDepth(depth + 1); this.label(cx, cy - 14, `Gemme operative: ${settings.slotCount}`, 15, 0xffdf70).setDepth(depth + 1); this.label(cx, cy + 22, "Partite illimitate", 13, 0xe6dfc3).setDepth(depth + 1); this.label(cx, cy + 47, "Nessuna vita o penalita", 13, 0xe6dfc3).setDepth(depth + 1); this.button(cx, cy + 86, "X", () => this.actions.closeInfo(), depth + 2); }
  private label(x: number, y: number, value: string, size: number, color: number, digital = false): Phaser.GameObjects.Text { return this.add.text(x, y, value, { fontFamily: digital ? '"Carattere", cursive' : "Arial", fontSize: `${size}px`, color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: digital ? "normal" : "bold", stroke: "#111814", strokeThickness: Math.max(2, Math.round(size * .14)) }).setOrigin(.5); }
  private button(x: number, y: number, value: string, action: () => void, depth = 0): void { const button = this.add.circle(x, y, 24, 0x3b2b19).setStrokeStyle(2, 0xbd914a).setDepth(depth).setInteractive(); button.on("pointerdown", action); this.label(x, y, value, 24, 0xffe3a0).setDepth(depth + 1); }
  private actionIcon(x: number, y: number, size: number, frame: string, depth = 0): void { this.add.image(x, y, "rdn-actions", frame).setDisplaySize(size, size).setDepth(depth); }
  private bonus(x: number, y: number, action: RdnHudAction, activate: () => void): void { const button = this.add.circle(x, y, 31, action.disabled ? 0x4d4d4d : 0x245438).setStrokeStyle(3, action.disabled ? 0x888888 : 0xb18b48).setInteractive(); button.on("pointerdown", () => { if (!action.disabled) activate(); }); this.actionIcon(x, y, 90, action.icon, 3); this.add.circle(x + 23, y + 23, 12, 0x241b12).setStrokeStyle(1, 0xb18b48).setDepth(4); this.label(x + 23, y + 23, String(action.charges), 12, 0xffffff).setDepth(5); }
  private infoDialog(cx: number, cy: number, model: RdnSceneModel): void {
    const depth = 20;
    this.add.rectangle(cx, cy, 330, model.level.variant === "persistent" ? 340 : 238, 0x151914, .97).setStrokeStyle(3, 0xc49b50).setDepth(depth).setInteractive();
    if (model.level.variant === "persistent") {
      const config = model.level.adventure;
      const div2 = config?.specialInventory.divide2 ?? 0;
      const div3 = config?.specialInventory.divide3 ?? 0;
      const consumed = (operator: "divide2" | "divide3") => model.state.consumedSpecialOperatorIndexes.filter((index) => model.level.variant === "persistent" && model.level.innerValues[index] === operator).length;
      const limits = config?.limits;
      const policy = getPuzzleScorePolicy(model.level);
      this.label(cx, cy - 145, "RISORSE ADVENTURE", 18, 0xf8dc8b).setDepth(depth + 1);
      this.label(cx, cy - 115, "Operatori numerici: fissi e infiniti", 13, 0xe6dfc3).setDepth(depth + 1);
      this.label(cx, cy - 90, `DIV2: ${Math.max(0, div2 - consumed("divide2"))}/${div2} monouso`, 14, 0xffdf70).setDepth(depth + 1);
      if (div3 > 0) this.label(cx, cy - 62, `DIV3: ${Math.max(0, div3 - consumed("divide3"))}/${div3} monouso`, 14, 0xffdf70).setDepth(depth + 1);
      /* Legacy compact star summary; replaced by the three threshold lines below.
      this.label(cx, cy + 15, `STELLE: ★★★ ${policy.perfectImpulses} · ★★ ${policy.twoStarImpulseLimit} impulsi`, 11, 0xffdf70).setDepth(depth + 1);
      this.label(cx, cy + 42, "Obiettivo: tutte le gemme a zero", 12, 0xe6dfc3).setDepth(depth + 1);
      */
      /* Position superseded by the complete star breakdown below.
      this.label(cx, cy + 76, "Obiettivo: tutte le gemme a zero", 12, 0xe6dfc3).setDepth(depth + 1);
      */
      this.label(cx, cy - 32, "RISULTATO STELLE", 13, 0xf8dc8b).setDepth(depth + 1);
      this.label(cx, cy - 4, "★★★  " + policy.perfectImpulses + " impulsi", 13, 0xffdf70).setDepth(depth + 1);
      this.label(cx, cy + 22, "★★   fino a " + policy.twoStarImpulseLimit + " impulsi", 13, 0xffdf70).setDepth(depth + 1);
      this.label(cx, cy + 48, "★    fino a " + policy.oneStarImpulseLimit + " impulsi", 13, 0xffdf70).setDepth(depth + 1);
      this.label(cx, cy + 76, "Obiettivo: tutte le gemme a zero", 12, 0xe6dfc3).setDepth(depth + 1);
      /* Additional Adventure notes are intentionally omitted here: the three star thresholds above are the score rule. 
      this.label(cx, cy + 98, "Obiettivo: tutte le gemme a zero", 12, 0xe6dfc3).setDepth(depth + 1);
      this.label(cx, cy + 120, limits?.maxImpulses !== undefined ? `Limite: ${limits.maxImpulses} impulsi` : "Nessun limite di sconfitta", 11, limits?.maxImpulses !== undefined ? 0xfb8c8c : 0x9df3a8).setDepth(depth + 1);
      */
    } else {
      const policy = getPuzzleScorePolicy(model.level);
      this.label(cx, cy - 88, "PUNTEGGIO LIVELLO", 18, 0xf8dc8b).setDepth(depth + 1);
      this.label(cx, cy - 48, `★★★  ${policy.perfectImpulses} impulsi · ${policy.perfectRotationSteps} rotazioni`, 13, 0xffdf70).setDepth(depth + 1);
      this.label(cx, cy - 16, `★★   fino a ${policy.twoStarImpulseLimit} impulsi`, 13, 0xffdf70).setDepth(depth + 1);
      this.label(cx, cy + 16, `★    fino a ${policy.oneStarImpulseLimit} impulsi`, 13, 0xffdf70).setDepth(depth + 1);
      this.label(cx, cy + 49, `SCONFITTA  oltre ${policy.oneStarImpulseLimit} impulsi`, 12, 0xfb8c8c).setDepth(depth + 1);
    }
    this.button(cx, cy + (model.level.variant === "persistent" ? 112 : 88), "×", () => this.actions.closeInfo(), depth + 2);
  }
  private dialog(cx: number, cy: number, outcome: "win" | "lose", model: RdnSceneModel): void { const depth = 20; this.add.rectangle(cx, cy, 310, 180, 0x151914, .96).setStrokeStyle(3, 0xc49b50).setDepth(depth); this.label(cx, cy - 50, outcome === "win" ? "LIVELLO COMPLETATO" : "TENTATIVO FALLITO", 19, 0xf8dc8b).setDepth(depth + 1); if (outcome === "win") { const stars = getPuzzleStars(model.level, model.state); this.label(cx, cy - 15, "★".repeat(stars) + "☆".repeat(3 - stars), 27, 0xffdf70).setDepth(depth + 1); this.button(cx - 62, cy + 48, "▶", () => this.actions.continue(), depth + 2); this.label(cx - 62, cy + 80, "PROSEGUI", 10, 0xf8dc8b).setDepth(depth + 4); } else { this.button(cx - 62, cy + 48, "↻", () => this.actions.retry(), depth + 2); this.label(cx - 62, cy + 80, "RITENTA", 10, 0xf8dc8b).setDepth(depth + 4); } this.button(cx + 62, cy + 48, "×", () => this.actions.exit(), depth + 2); this.label(cx + 62, cy + 80, "ESCI", 10, 0xf8dc8b).setDepth(depth + 4); }
}
