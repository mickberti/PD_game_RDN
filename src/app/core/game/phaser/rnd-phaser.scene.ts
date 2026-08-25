import * as Phaser from "phaser";
import { AlignmentPreview, FlowState, ImpulseResolutionPlan, LevelDefinition, PuzzleOperator, PuzzleState, QueueState } from "../rnd/puzzle.types";
import { getPuzzleScorePolicy, getPuzzleStars } from "../rnd/puzzle-score.policy";
import { atlasData as gameActionAtlas } from "../../../../assets/game/fantasy_bg/atlas/atlas-game-action-set1";
import { atlasData as effectAtlas } from "../../../../assets/game/fantasy_bg/atlas/atlas-effect-set1";
import { atlasData as gemAtlas } from "../../../../assets/game/fantasy_bg/atlas/atlas-gem-set1";
import { atlasData as uiIconAtlas } from "../../../../assets/ui/fantasy_bg/atlas/atlas-icons-set1";
import { RDN_BOARD_LAYOUTS, RDN_GEM_NUMERAL_CONFIG, RDN_MOTION, RDN_PHASER_VISUAL_CONFIG, RdnBoardLayout, getRdnBoardLayout, rdnGearTextureKey, rdnRingTextureKey } from "./rnd-board-layout.config";
import { LevelEffectConfigResolver } from "../rnd/effects/level-effect-config.resolver";
import { EffectEngineEvent, EffectScope, GemEffectType, LinkEffectType, ResolvedEffect } from "../rnd/effects/effects.models";
import { EffectPhaserRenderer, EffectGemPosition } from "./effects/effect-phaser.renderer";
import { EFFECT_PHASER_VISUAL, impulseImpactDelayMs } from "./effects/effect-phaser-visual.config";
import { EffectTutorialDefinition } from "../rnd/effects/effect-tutorial.config";
import { effectAssetFrame, isEffectVisuallyActive, TIMER_PRESENTATION, timerUnitOf } from "../rnd/effects/effect-presentation.config";

export interface RdnHudAction { icon: string; charges: number; disabled: boolean; }
export interface RdnSceneModel { level: LevelDefinition; state: PuzzleState; previews: AlignmentPreview[]; nextPreviews: AlignmentPreview[]; flows: FlowState[]; effectPreviewEvents: readonly EffectEngineEvent[]; queueStates: readonly QueueState[]; actions: readonly RdnHudAction[]; modeLabel: string; freeSettings?: { difficulty: "EASY" | "NORMAL" | "HARD" | "EXPERT"; slotCount: number; effectsEnabled: boolean; }; playground?: { scenario: string; index: number; total: number; lines: readonly string[] }; tutorial: EffectTutorialDefinition | null; selectedGemIndex: number | null; selectedLinkEffectId: string | null; outcome: "win" | "lose" | null; timeRemaining: number | null; timeRemainingMs?: number | null; timeTotalSeconds?: number; showInfo: boolean; }
export interface RdnSceneActions { rotate(direction: "CW" | "CCW", steps: number): void; impulse(): ImpulseResolutionPlan | null; action(slot: number): void; restart(): void; undo(): void; continue(): void; retry(): void; exit(): void; info(): void; closeInfo(): void; dismissTutorial(id: string): void; gemInfo(index: number): void; linkInfo(effectId: string): void; nextPlaygroundScenario?(): void; previousPlaygroundScenario?(): void; }
const formatOperator = (value: PuzzleOperator | null): string => value === null ? "—" : value === "divide2" ? "÷2" : value === "divide3" ? "÷3" : value === "zero" ? "0" : value === "invert" ? "±" : value === "skip" ? "≫" : value > 0 ? `+${value}` : String(value);
const VISUAL_SET_COUNT = 3;
const BASE_SET_BY_VARIANT = { persistent: 1, loader: 2 } as const;
const format = (value: number | null): string => value === null ? "—" : value > 0 ? `+${value}` : String(value);
const GEM_THEME_CONFIG = {
  1: { frame: "gem-sphere-green", tint: 0xffffff },
  2: { frame: "gem-sphere-green", tint: 0xffffff },
  3: { frame: "gem-sphere-green", tint: 0xffffff },
} as const;
const UI_ICON_BY_BUTTON_LABEL: Readonly<Record<string, string>> = { "⌂": "icon-home", "↻": "icon-reload", "▶": "icon-forward", "›": "icon-forward", "‹": "icon-backward", "×": "icon-close", "x": "icon-close", "X": "icon-close", "OK": "icon-confirm" };

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
  /** Direct operation labels are pre-rendered together with an effect discharge. */
  private skipOperationFloatKey = "";
  private operationFloatStartedAt = 0;
  private readonly effectResolver = new LevelEffectConfigResolver();
  private effectRenderer?: EffectPhaserRenderer;
  private lastEffectVisualKey = "";
  /** Persistent Time Attack HUD: updated without rebuilding the board every timer tick. */
  private countdownArc?: Phaser.GameObjects.Graphics;
  private countdownCaption?: Phaser.GameObjects.Text;
  private countdownValue?: Phaser.GameObjects.Text;
  /** Value spheres are outside the gear container so they can render above energy trails. */
  private innerSlots: Array<{ sphere: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; badge?: Phaser.GameObjects.Container; localX: number; localY: number }> = [];
  /** Kept during an impulse so each number can change at its own arrival instant. */
  private outerSlots = new Map<number, { gem: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }>();
  private readonly impactObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly impactSlots = new Map<number, number>();
  /** Short-lived feedback circles are recycled within the scene to cap allocations on dense flows. */
  private impactParticlePool: Phaser.GameObjects.Arc[] = [];
  private infoScrollOffset = 0;
  private infoScrollMax = 0;
  private infoScrollDragY: number | null = null;
  private infoScrollForGem: number | null = null;
  private lastHudStarCount: number | null = null;
  private lastHudImpulseCount = -1;
  constructor(private readonly actions: RdnSceneActions) { super("rdn-board"); }
  preload(): void {
    this.load.atlas("rdn-actions", "assets/game/fantasy_bg/game-action-set1.png", gameActionAtlas);
    this.load.atlas("rdn-effects", "assets/game/fantasy_bg/effect-set1.png", effectAtlas);
    this.load.atlas("rdn-gems", "assets/game/fantasy_bg/gem-set1.png", gemAtlas);
    this.load.atlas("rdn-ui-icons", "assets/ui/fantasy_bg/icon-set1.png", uiIconAtlas);
    for (let set = 1; set <= VISUAL_SET_COUNT; set += 1) {
      this.load.image(`rdn-bg-${set}`, `assets/game/bg/bg-set${set}.png`);
    }
    for (let set = 1; set <= VISUAL_SET_COUNT; set += 1) for (const layout of Object.values(RDN_BOARD_LAYOUTS)) { this.load.image(rdnRingTextureKey(layout, set), `assets/game/ring/ring-${layout.positions}-set${set}.png`); this.load.image(rdnGearTextureKey(layout, set), `assets/game/gear/gear-${layout.positions}-set${set}.png`); }
  }
  create(): void {
    // Phaser canvas text does not automatically repaint when a web font arrives.
    this.scale.on("resize", () => this.requestRender());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.drag(pointer));
    this.input.on("pointerup", () => this.release());
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => this.scrollInfo(deltaY));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearImpactFeedback());
    this.render();
  }
  setModel(model: RdnSceneModel): void {
    if (model.selectedGemIndex !== this.model?.selectedGemIndex) { this.infoScrollForGem = null; this.infoScrollOffset = 0; this.infoScrollMax = 0; }
    const countdownOnlyUpdate = this.isCountdownOnlyUpdate(model);
    this.model = model;
    if (countdownOnlyUpdate) { this.updateCountdownHud(model); return; }
    this.requestRender();
  }
  /** Angular emits a new model every 250 ms in Time Attack; these changes must not reset Phaser tweens. */
  private isCountdownOnlyUpdate(next: RdnSceneModel): boolean {
    const previous = this.model;
    return !!previous && previous.timeRemaining !== null && next.timeRemaining !== null && previous.level === next.level && previous.state === next.state && previous.outcome === next.outcome && previous.showInfo === next.showInfo && previous.tutorial === next.tutorial && previous.selectedGemIndex === next.selectedGemIndex && previous.selectedLinkEffectId === next.selectedLinkEffectId && previous.modeLabel === next.modeLabel && previous.timeTotalSeconds === next.timeTotalSeconds;
  }
  private requestRender(): void {
    if (!this.sys.isActive()) return;
    if (this.dragging || this.busy) { this.renderPending = true; return; }
    this.renderPending = false;
    this.render();
  }
  private flushPendingRender(): void { if (this.renderPending) this.requestRender(); }
  /** Uses the same score policy as the completion dialog, avoiding a separate HUD rule. */
  private starProgressHud(cx: number, y: number, model: RdnSceneModel): void {
    const policy = getPuzzleScorePolicy(model.level);
    const stars = getPuzzleStars(model.level, model.state);
    const progressed = model.state.impulses > this.lastHudImpulseCount;
    const lostStar = this.lastHudStarCount !== null && stars < this.lastHudStarCount;
    const reduced = EFFECT_PHASER_VISUAL.impactFeedback.reducedMotion || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    this.add.rectangle(cx, y, 184, 30, 0x101c18, .88).setStrokeStyle(1, 0xb18b48, .9).setDepth(18);
    for (let index = 0; index < 3; index += 1) {
      const available = index < stars;
      const star = this.label(cx - 45 + index * 45, y, available ? "★" : "☆", 23, available ? 0xffdf70 : 0x5d675f).setDepth(19);
      if (!reduced && lostStar && index >= stars && index < (this.lastHudStarCount ?? 0)) this.tweens.add({ targets: star, alpha: 0, scaleX: 1.45, scaleY: 1.45, duration: 180, ease: "Cubic.Out" });
      else if (!reduced && progressed && available) this.tweens.add({ targets: star, scaleX: 1.12, scaleY: 1.12, duration: 120, yoyo: true, ease: "Sine.Out" });
    }
    const next = stars === 3 ? "3 stelle" : stars === 2 ? `★ fino a ${policy.oneStarImpulseLimit}` : "1 stella garantita";
    this.label(cx + 37, y, next, 10, stars === 1 ? 0xffcf75 : 0xe6dfc3).setDepth(19);
    this.lastHudStarCount = stars;
    this.lastHudImpulseCount = model.state.impulses;
  }
  render(): void {
    if (!this.model) return; const { width, height } = this.scale; const m = this.model; const cx = width / 2; const cy = height * .49; const outerR = Math.min(width * RDN_PHASER_VISUAL_CONFIG.boardWidthRadiusRatio, height * RDN_PHASER_VISUAL_CONFIG.boardHeightRadiusRatio); const visualSet = this.visualSet(m.level); this.layout = getRdnBoardLayout(m.level.positions); const layout = this.layout; const wheelR = outerR * layout.gear.diameter / 2; const ringX = cx + outerR * layout.ring.offsetX; const ringY = cy + outerR * layout.ring.offsetY; const gearX = cx + outerR * layout.gear.offsetX; const gearY = cy + outerR * layout.gear.offsetY;
    for (const flow of this.trailFlows) this.tweens.killTweensOf(flow);
    this.trailFlows = [];
    for (const effect of this.trailEffects) this.tweens.killTweensOf(effect);
    this.trailEffects = [];
    this.effectRenderer?.destroy();
    this.effectRenderer = undefined;
    this.countdownArc = undefined;
    this.countdownCaption = undefined;
    this.countdownValue = undefined;
    this.clearImpactFeedback();
    this.impactParticlePool = [];
    this.children.removeAll(true);
    this.innerSlots = [];
    this.outerSlots.clear();
    this.addBackground(cx, height / 2, width, height, `rdn-bg-${visualSet}`);
    this.add.rectangle(cx, height / 2, width, height, 0x07100c, .22).setDepth(-3);
    this.button(38, 48, "⌂", () => this.actions.exit());
    this.label(cx - width * .25, 46, m.modeLabel, 11, 0xf3d27c); this.label(cx - width * .25, 73, m.freeSettings ? m.freeSettings.difficulty : String(m.level.number), 22, 0xf3d27c);
    if (m.timeRemaining !== null) this.createCountdownHud(cx - width * .04, m);
    this.label(cx + width * .12, 46, "IMPULSI", 10, 0xf3d27c); this.label(cx + width * .12, 73, String(m.state.impulses), 27, 0xf3d27c);
    this.label(cx + width * .29, 46, "ROT.", 10, 0xf3d27c); this.label(cx + width * .29, 73, String(m.state.rotationSteps), 27, 0xf3d27c);
    this.starProgressHud(cx, 111, m);
    this.button(width - 38, 48, "↻", () => this.actions.restart()); const info = this.add.circle(cx, 48, 27, 0x183e28).setInteractive(); info.on("pointerdown", () => this.actions.info()); this.add.image(cx, 48, "rdn-ui-icons", "icon-info").setDisplaySize(48, 48).setDepth(1);
    this.addDecor(ringX, ringY, outerR * layout.ring.diameter, rdnRingTextureKey(layout, visualSet), layout.ring.angle); this.drawConnections(ringX, ringY, gearX, gearY, outerR, m);
    const effectGemPositions = new Map<string, EffectGemPosition>();
    const numeralConfig = RDN_GEM_NUMERAL_CONFIG[layout.positions];
    for (let index = 0; index < m.state.outerValues.length; index += 1) { const point = this.point(ringX, ringY, outerR * layout.outerSlots.radius, index, m.level.positions, layout.outerSlots.angleOffset); const sphereRadius = outerR * layout.outerSlots.sphereRadius; effectGemPositions.set(`target-${index}`, { x: point.x, y: point.y, radius: sphereRadius }); const preview = m.previews.find((item) => item.slot.outerIndex === index); const sphere = this.sphere(point.x, point.y, sphereRadius, m.state.outerValues[index], m.state.targetVisualStates[index] === "OFF", index, visualSet, outerR * numeralConfig.outerFontSizeRatio, numeralConfig.reservedWidthRatio); sphere.gem.setInteractive().on("pointerdown", () => this.actions.gemInfo(index)); this.outerSlots.set(index, sphere); if (preview) this.resultBadge(point.x + outerR * layout.outerSlots.badgeOffsetX, point.y + outerR * layout.outerSlots.badgeOffsetY, format(preview.result), preview.trend); }
    const resolvedEffects = this.effectResolver.resolve(m.level.effectConfiguration, m.level.positions).effects;
    if (resolvedEffects.length) {
      this.effectRenderer = new EffectPhaserRenderer(this, effectGemPositions, new Phaser.Math.Vector2(ringX, ringY), (effectId) => this.actions.linkInfo(effectId));
      this.effectRenderer.renderPersistent(resolvedEffects, m.state.effectRuntime, m.state.outerValues);
      this.effectRenderer.setActiveLinkPreview(m.effectPreviewEvents);
      const visualKey = `${m.level.id}-${m.state.impulses}`;
      if (m.state.lastEffectEvents?.length && visualKey !== this.lastEffectVisualKey) { this.effectRenderer.play(m.state.lastEffectEvents); this.lastEffectVisualKey = visualKey; }
    }
    this.targetEffectsHud(width, m, resolvedEffects);
    const rejectedOperation = m.state.lastOperationResults.find((result) => !result.valid);
    if (rejectedOperation) this.label(cx, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset - 52, this.operationFeedback(rejectedOperation.rejectedReason), 12, 0xffcf75);
    else if (m.flows.find((flow) => !flow.interactable)?.blockedReason) this.label(cx, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset - 52, this.operationFeedback(m.flows.find((flow) => !flow.interactable)?.blockedReason), 12, 0xffcf75);
    if (m.state.impulses === 0) { this.lastZeroBurstKey = ""; this.lastOperationFloatKey = ""; this.skipOperationFloatKey = ""; this.lastEffectVisualKey = ""; this.operationFloatStartedAt = 0; }
    const burstKey = `${m.level.id}-${m.state.impulses}`;
    if (m.state.impulses > 0 && burstKey !== this.lastZeroBurstKey) {
      for (const result of m.state.lastImpulseResults) if (result.result === 0) { const point = this.point(ringX, ringY, outerR * layout.outerSlots.radius, result.outerIndex, m.level.positions, layout.outerSlots.angleOffset); this.zeroBurst(point.x, point.y, outerR * layout.outerSlots.sphereRadius); }
      this.lastZeroBurstKey = burstKey;
    }
    this.wheelCenter = { x: gearX, y: gearY, radius: wheelR }; this.wheel = this.add.container(gearX, gearY); this.wheel.add(this.addGear(outerR * layout.gear.diameter, rdnGearTextureKey(layout, visualSet)));
    const blockedSources = new Set(m.flows.filter((flow) => flow.active && !flow.interactable).map((flow) => flow.sourceId));
    for (let index = 0; index < m.level.positions; index += 1) { const point = this.point(0, 0, wheelR * layout.innerSlots.radius, index, m.level.positions, layout.innerSlots.angleOffset); const innerIndex = index; const queue = m.level.variant === "loader" ? m.queueStates[innerIndex] : undefined; const rawValue = m.level.variant === "persistent" ? m.level.innerValues[innerIndex] : queue?.current ?? null; const consumed = typeof rawValue === "string" && m.state.consumedSpecialOperatorIndexes.includes(innerIndex); const exhausted = queue?.exhausted ?? false; const value = consumed || exhausted ? null : rawValue; const sphereRadius = outerR * layout.innerSlots.sphereRadius; const blocked = blockedSources.has(innerIndex); const deactivated = blocked || consumed || exhausted; const gem = this.gem(gearX + point.x, gearY + point.y, sphereRadius, index, visualSet, deactivated, typeof rawValue === "string").setDepth(4); const text = this.sphereLabel(gearX + point.x, gearY + point.y, consumed || exhausted ? "" : formatOperator(value), sphereRadius, deactivated ? 0xd8d8d8 : 0xffffff, outerR * numeralConfig.innerFontSizeRatio, numeralConfig.reservedWidthRatio).setDepth(5); const badge = queue ? this.queueBadge(gearX + point.x + sphereRadius * .72, gearY + point.y + sphereRadius * .72, queue.remainingCount, exhausted) : undefined; this.innerSlots.push({ sphere: gem, text, badge, localX: point.x, localY: point.y }); }
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
    if (m.state.impulses > 0 && operationFloatKey !== this.skipOperationFloatKey && operationFloatElapsed < RDN_MOTION.operationFloatMs) {
      for (const result of m.state.lastOperationResults.filter((item) => item.valid)) {
        const target = this.point(ringX, ringY, outerR * layout.outerSlots.radius, result.outerIndex, m.level.positions, layout.outerSlots.angleOffset);
        this.operationFloat(target.x, target.y, outerR * layout.outerSlots.sphereRadius, result.operator, operationFloatElapsed);
      }
    }
    m.actions.forEach((action, index) => this.bonus(cx + (index - (m.actions.length - 1) / 2) * 84, height - RDN_PHASER_VISUAL_CONFIG.actionButtonsBottomOffset, action, () => this.actions.action(index)));
    if (m.playground) this.playgroundOverlay(width, height, m.playground);
    if (m.tutorial) this.tutorialDialog(cx, cy, m.tutorial); else if (m.outcome) this.dialog(cx, cy, m.outcome, m); else if (m.selectedLinkEffectId !== null) this.linkInfoDialog(cx, cy, m, m.selectedLinkEffectId); else if (m.selectedGemIndex !== null) this.gemInfoDialog(cx, cy, m, m.selectedGemIndex); else if (m.showInfo) m.playground ? this.playgroundInfoDialog(cx, cy) : m.freeSettings ? this.freeInfoDialog(cx, cy, m.freeSettings) : this.infoDialog(cx, cy, m);
  }
  private beginDrag(pointer: Phaser.Input.Pointer): void { if (this.model?.selectedGemIndex !== null && this.infoScrollMax > 0) { this.infoScrollDragY = pointer.y; return; } if (this.busy || !this.model || this.model.outcome || this.model.showInfo || this.model.tutorial) return; const dx = pointer.x - this.wheelCenter.x; const dy = pointer.y - this.wheelCenter.y; const distance = Math.hypot(dx, dy); if (distance > this.wheelCenter.radius || distance < this.wheelCenter.radius * .3) return; this.dragging = true; this.dragStart = Math.atan2(dy, dx); this.dragDelta = 0; }
  private drag(pointer: Phaser.Input.Pointer): void { if (this.infoScrollDragY !== null) { const delta = this.infoScrollDragY - pointer.y; this.infoScrollDragY = pointer.y; this.scrollInfo(delta); return; } if (!this.dragging || !this.wheel || !pointer.isDown || !this.model) return; const a = Math.atan2(pointer.y - this.wheelCenter.y, pointer.x - this.wheelCenter.x); let delta = (a - this.dragStart) * 180 / Math.PI; if (delta > 180) delta -= 360; if (delta < -180) delta += 360; this.dragDelta = delta; this.setWheelAngle(this.model.state.rotationTurns * 360 / this.model.level.positions + delta); }
  private release(): void { if (this.infoScrollDragY !== null) { this.infoScrollDragY = null; return; } if (!this.dragging || !this.model || !this.wheel) return; this.dragging = false; const minimumDragAngle = 3; const snapAngle = 360 / this.model.level.positions; const base = this.model.state.rotationTurns * snapAngle; if (Math.abs(this.dragDelta) < minimumDragAngle) { this.setWheelAngle(base); this.dragDelta = 0; this.flushPendingRender(); return; } const direction = this.dragDelta > 0 ? 1 : -1; const step = direction * Math.max(1, Math.round(Math.abs(this.dragDelta) / snapAngle)); const target = base + step * snapAngle; this.busy = true; this.tweens.add({ targets: this, visualAngle: target, duration: RDN_MOTION.dragSnapMs, ease: "Cubic.Out", onUpdate: () => this.setWheelAngle(this.visualAngle), onComplete: () => { this.actions.rotate(step > 0 ? "CW" : "CCW", Math.abs(step)); this.dragDelta = 0; this.busy = false; this.flushPendingRender(); } }); }
  private scrollInfo(delta: number): void { if (!this.model || this.model.selectedGemIndex === null || this.infoScrollMax <= 0) return; const next = Phaser.Math.Clamp(this.infoScrollOffset + delta, 0, this.infoScrollMax); if (next === this.infoScrollOffset) return; this.infoScrollOffset = next; this.render(); }
  private setWheelAngle(angle: number): void { if (!this.wheel) return; this.visualAngle = angle; this.wheel.setAngle(((angle + this.layout.gear.angle + 180) % 360 + 360) % 360 - 180); this.keepLabelsUpright(); }
  private keepLabelsUpright(): void { if (!this.wheel) return; const angle = this.wheel.rotation; const cos = Math.cos(angle); const sin = Math.sin(angle); for (const slot of this.innerSlots) { const x = this.wheel.x + slot.localX * cos - slot.localY * sin; const y = this.wheel.y + slot.localX * sin + slot.localY * cos; slot.sphere.setPosition(x, y); slot.text.setPosition(x, y).setAngle(0); slot.badge?.setPosition(x + slot.sphere.displayWidth * .33, y + slot.sphere.displayHeight * .33).setAngle(0); } }
  private fireImpulse(core: Phaser.GameObjects.Arc): void { if (this.busy || !this.model || this.model.state.won || this.model.outcome || this.model.showInfo || this.model.tutorial) return; const before = this.model; this.busy = true; const plan = this.actions.impulse(); if (!plan) { this.busy = false; return; } this.tweens.add({ targets: core, scaleX: 1.22, scaleY: 1.22, yoyo: true, duration: RDN_MOTION.impulseChargeMs, repeat: 1 }); this.cameras.main.flash(110, 90, 235, 150); this.cameras.main.shake(90, .006); const transactionDuration = this.playImpulseDischarge(before, plan); this.time.delayedCall(transactionDuration, () => { this.busy = false; this.flushPendingRender(); }); }
  /** One-shot, multi-particle current from the impulse to every currently active gem. */
  private playImpulseDischarge(model: RdnSceneModel, plan: ImpulseResolutionPlan): number {
    const visual = EFFECT_PHASER_VISUAL.impulseDischarge; const { width, height } = this.scale; const layout = this.layout;
    const outerRadius = Math.min(width * .39, height * .31); const centerX = width / 2; const centerY = height * .49;
    const ringX = centerX + outerRadius * layout.ring.offsetX; const ringY = centerY + outerRadius * layout.ring.offsetY;
    const startX = this.wheelCenter.x; const startY = this.wheelCenter.y;
    for (const flow of model.flows.filter((item) => item.interactable)) {
      const destination = this.point(ringX, ringY, outerRadius * layout.outerSlots.radius, flow.targetId, model.level.positions, layout.outerSlots.angleOffset);
      this.animateImpulseDischargeSegment(startX, startY, destination.x, destination.y, 0, `target-${flow.targetId}`);
    }
    this.effectRenderer?.playImpulseDischarge(model.effectPreviewEvents);
    if (model.effectPreviewEvents.length) {
      this.skipOperationFloatKey = `${model.level.id}-${model.state.impulses + 1}`;
    }
    let end = 0;
    for (const impact of plan.impacts) {
      const delay = impulseImpactDelayMs(impact.generation);
      const effectPresentations = this.effectPresentationsForImpact(plan.effectEvents, impact);
      end = Math.max(end, delay + this.impactTimelineDurationMs(impact, effectPresentations));
      this.time.delayedCall(delay, () => this.presentImpulseImpact(impact, effectPresentations));
    }
    return end;
  }
  private animateImpulseDischargeSegment(startX: number, startY: number, endX: number, endY: number, delay: number, destinationGemId: string): void {
    const visual = EFFECT_PHASER_VISUAL.impulseDischarge; const dx = endX - startX; const dy = endY - startY; const length = Math.max(1, Math.hypot(dx, dy));
    for (let tail = 0; tail < visual.tailCount; tail += 1) for (let index = 0; index < visual.particleCount; index += 1) {
      const halo = this.add.circle(startX, startY, visual.haloRadius, visual.haloColor, visual.haloAlpha).setDepth(visual.depth);
      const particle = this.add.circle(startX, startY, visual.particleRadius, visual.color, visual.particleAlpha).setStrokeStyle(visual.particleStrokeWidth, visual.particleStrokeColor, 1).setDepth(visual.depth + 1);
      const progress = { value: 0 }; const phase = tail * visual.tailPhaseSpread + index * visual.phaseSpread;
      this.tweens.add({ targets: progress, value: 1, delay: delay + index * visual.particleStaggerMs, duration: visual.directDurationMs, ease: "Sine.InOut", onUpdate: () => {
        const baseX = startX + dx * progress.value; const baseY = startY + dy * progress.value; const weave = Math.sin(progress.value * Math.PI * 2 * visual.weaveTurns + phase) * visual.weaveAmplitude; const intensity = Math.sin(progress.value * Math.PI * .82);
        const x = baseX - dy / length * weave; const y = baseY + dx / length * weave;
        halo.setPosition(x, y).setScale(visual.haloMinScale + intensity * visual.haloScaleRange).setAlpha(intensity * visual.haloAlpha);
        particle.setPosition(x, y).setScale(visual.particleMinScale + intensity * visual.particleScaleRange).setAlpha(intensity * visual.particleAlpha);
      }, onComplete: () => { this.tweens.add({ targets: [halo, particle], alpha: 0, scale: .3, duration: visual.arrivalBurstDurationMs, ease: "Cubic.Out", onComplete: () => { halo.destroy(); particle.destroy(); } }); } });
    }
    // The leading particle determines the logical arrival; trailing particles stay scenic only.
    this.impulseDischargeArrival(destinationGemId, delay + visual.directDurationMs);
  }
  private impulseDischargeArrival(gemId: string, delay: number): void {
    const index = Number(gemId.replace("target-", "")); const model = this.model; if (!model || !Number.isInteger(index)) return;
    const { width, height } = this.scale; const outerRadius = Math.min(width * .39, height * .31); const point = this.point(width / 2 + outerRadius * this.layout.ring.offsetX, height * .49 + outerRadius * this.layout.ring.offsetY, outerRadius * this.layout.outerSlots.radius, index, model.level.positions, this.layout.outerSlots.angleOffset); const visual = EFFECT_PHASER_VISUAL.impulseDischarge;
    for (let sparkIndex = 0; sparkIndex < visual.arrivalBurstCount; sparkIndex += 1) { const angle = sparkIndex * Math.PI * 2 / visual.arrivalBurstCount + .23; const spark = this.add.circle(point.x, point.y, Math.max(1.4, visual.particleRadius * .8), visual.color, visual.particleAlpha).setDepth(visual.depth + 1); this.tweens.add({ targets: spark, x: point.x + Math.cos(angle) * visual.arrivalBurstDistance, y: point.y + Math.sin(angle) * visual.arrivalBurstDistance, alpha: 0, scale: .3, delay, duration: visual.arrivalBurstDurationMs, ease: "Cubic.Out", onComplete: () => spark.destroy() }); }
  }
  /** Values arrive with their own flow, so chained gems never wait for the first target's label. */
  private playDischargeValueFloats(model: RdnSceneModel, ringX: number, ringY: number, outerRadius: number): void {
    const visual = EFFECT_PHASER_VISUAL.impulseDischarge; const occurrences = new Map<string, number>();
    for (const event of model.effectPreviewEvents) {
      if (event.type !== "FLOW_ARRIVED" || !event.gemId || !event.value) continue;
      const index = Number(event.gemId.replace("target-", "")); if (!Number.isInteger(index)) continue;
      const count = occurrences.get(event.gemId) ?? 0; occurrences.set(event.gemId, count + 1);
      const target = this.point(ringX, ringY, outerRadius * this.layout.outerSlots.radius, index, model.level.positions, this.layout.outerSlots.angleOffset);
      const delay = event.generation === 0 ? visual.directDurationMs + (visual.particleCount - 1) * visual.particleStaggerMs : visual.directDurationMs + (event.generation - 1) * visual.linkGenerationDelayMs + visual.linkSegmentDurationMs + (visual.particleCount - 1) * visual.particleStaggerMs;
      this.dischargeValueFloat(target.x + (count % 2 ? 13 : -13), target.y, outerRadius * this.layout.outerSlots.sphereRadius, event.value, delay);
    }
  }
  private dischargeValueFloat(x: number, y: number, radius: number, value: number, delay: number): void {
    const visual = EFFECT_PHASER_VISUAL.impulseDischarge; const text = this.sphereLabel(x, y - radius * .9 - 10, format(value), radius * 1.15, visual.valueFloatColor).setDepth(visual.depth + 2); const scaleX = text.scaleX; const scaleY = text.scaleY;
    text.setScale(scaleX * .78, scaleY * .78).setAlpha(0);
    this.tweens.add({ targets: text, y: y - radius * .9 - 10 - visual.valueFloatRise, alpha: 0, scaleX, scaleY, delay, duration: visual.valueFloatDurationMs, ease: "Cubic.Out", onStart: () => text.setAlpha(1), onComplete: () => text.destroy() });
  }
  /** Presentation-only commit: the plan is already calculated, this only reveals it at impact. */
  private presentImpulseImpact(impact: ImpulseResolutionPlan["impacts"][number], effectPresentations: readonly { frame: string; breaks: boolean }[] = []): void {
    const slot = this.outerSlots.get(impact.targetId); if (!slot) return;
    this.events.emit("IMPULSE_GEM_IMPACT", impact);
    const gemTintBeforeImpact = slot.gem.tintTopLeft;
    slot.text.setText(format(impact.resultValue)).setColor(impact.resultValue === 0 ? "#e6e6e6" : "#ffffff");
    if (impact.resultValue === 0) slot.gem.setTint(0x909090);
    const radius = Math.max(slot.gem.displayWidth, slot.gem.displayHeight) / 2;
    const zero = impact.resultValue === 0 && impact.previousValue !== 0;
    const absorbed = !zero && impact.resultValue === impact.previousValue;
    if (zero) this.lastZeroBurstKey = `${this.model?.level.id}-${this.model?.state.impulses}`;
    this.playImpactFeedback(slot.gem, slot.text, impact.targetId, radius, zero ? "zero" : absorbed ? "absorbed" : "normal", effectPresentations, gemTintBeforeImpact);
    const blockedByBarrier = effectPresentations.some((effect) => effect.frame === "effect-wall" || effect.frame === "effect-ice");
    const absorbedByShield = effectPresentations.some((effect) => effect.frame === "effect-shield");
    const displayedOperation = blockedByBarrier || absorbedByShield || impact.operation === null ? format(impact.appliedValue) : formatOperator(impact.operation);
    this.showImpactLabel(impact.targetId, slot.text.x, slot.text.y, radius, displayedOperation, zero);
  }
  private playImpactFeedback(gem: Phaser.GameObjects.Image, gemValue: Phaser.GameObjects.Text, targetId: number, radius: number, variant: "normal" | "absorbed" | "zero", effectPresentations: readonly { frame: string; breaks: boolean }[] = [], gemTintBeforeImpact?: number): void {
    const visual = EFFECT_PHASER_VISUAL.impactFeedback; const style = visual[variant]; const reduce = visual.reducedMotion || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const x = gem.x; const y = gem.y; const count = reduce ? Math.max(2, Math.ceil(style.particles / 3)) : style.particles;
    if (variant !== "zero") {
      const flash = this.acquireImpactCircle(x, y, radius * .8, style.color, .28, visual.depth);
      this.tweens.add({ targets: flash, scale: 1.45, alpha: 0, duration: reduce ? 120 : style.durationMs, ease: "Cubic.Out", onComplete: () => this.releaseImpact(flash) });
    }
    const ring = style.ring;
    if (ring.enabled) {
      const contactRing = this.trackImpact(this.add.circle(x, y, radius * ring.radiusRatio, style.color, 0).setStrokeStyle(Math.max(2, radius * ring.strokeWidthRatio), ring.color, ring.alpha).setDepth(visual.depth + 1));
      this.tweens.add({ targets: contactRing, scale: ring.targetScale, alpha: ring.alpha, duration: reduce ? 110 : ring.durationMs, yoyo: true, hold: ring.holdMs, ease: "Sine.Out", onComplete: () => this.releaseImpact(contactRing) });
    }
    for (let index = 0; index < count; index += 1) { const angle = Math.PI * 2 * index / count + targetId * .43; const distance = radius * style.distanceRatio * (.9 + (index % 3) * .2); const color = index % 6 === 4 ? style.secondaryParticleColor : index % 6 === 5 ? style.tertiaryParticleColor : style.particleColor; const spark = this.acquireImpactCircle(x, y, Math.max(9.6, radius * style.particleRadiusRatio), color, 1, visual.depth + 2); this.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, scale: .12, alpha: 0, duration: reduce ? 140 : style.durationMs, delay: reduce ? 0 : index * 12, ease: "Cubic.Out", onComplete: () => this.releaseImpact(spark) }); }
    this.showImpactEffectIcons(x, y, radius, effectPresentations, reduce);
    if (variant === "zero" && !reduce) this.showZeroGemShatter(gem, gemValue, gemTintBeforeImpact ?? 0xffffff);
    this.events.emit("IMPULSE_FEEDBACK_SOUND", { variant });
    this.triggerImpactHaptic(variant === "zero");
  }
  private effectPresentationsForImpact(events: readonly EffectEngineEvent[], impact: ImpulseResolutionPlan["impacts"][number]): readonly { frame: string; breaks: boolean }[] {
    const gemId = `target-${impact.targetId}`;
    const eventsForGem = events.filter((event) => event.gemId === gemId && event.generation === impact.generation);
    const presentations = eventsForGem.flatMap((event) => {
      const frame = this.effectFrameForEvent(event);
      if (!frame) return [];
      const breakingType = event.type === "WALL_HIT" ? "WALL_BROKEN" : event.type === "ICE_HIT" ? "ICE_BROKEN" : event.type === "SHIELD_ABSORBED" ? "SHIELD_DEPLETED" : undefined;
      return [{ frame, breaks: !!breakingType && eventsForGem.some((candidate) => candidate.type === breakingType) }];
    });
    // Inverter is applied after the value mutation; retain a semantic fallback so
    // its icon is still presented if its event belongs to a later resolution phase.
    if (!presentations.some((effect) => effect.frame === "effect-inverter") && this.model) {
      const inverter = this.effectResolver.resolve(this.model.level.effectConfiguration, this.model.level.positions).effects.find((effect) => effect.config.type === GemEffectType.INVERTER && effect.target.type === EffectScope.GEM && effect.target.gem.id === gemId);
      if (inverter && impact.resultValue !== impact.previousValue) presentations.push({ frame: "effect-inverter", breaks: false });
    }
    return presentations;
  }
  private effectFrameForEvent(event: EffectEngineEvent): string | undefined {
    if (event.type === "SHIELD_ABSORBED") return "effect-shield";
    if (event.type === "WALL_HIT") return "effect-wall";
    if (event.type === "ICE_HIT") return "effect-ice";
    if (event.type === "MIRROR_APPLIED") return "effect-mirror-sign";
    if (event.type === "GEM_AMPLIFIER_APPLIED") return "effect-amplifier";
    if (event.type === "GEM_INVERTER_APPLIED") return "effect-inverter";
    if (event.type === "TIMER_TICK" || event.type === "TIMER_EXPIRED" || event.type === "TIMER_COMPLETED") return "effect-timer";
    if (event.type === "CORRUPTION_APPLIED") return "effect-corruption";
    if (event.type === "BOMB_TRIGGERED" || event.type === "AREA_TRIGGERED") return "effect-area-bomb";
    if (event.type === "FLOW_PROPAGATED" && event.linkId && this.model) {
      const effect = this.effectResolver.resolve(this.model.level.effectConfiguration, this.model.level.positions).effects.find((item) => item.id === event.linkId);
      return effect ? effectAssetFrame(effect) : undefined;
    }
    return undefined;
  }
  private showImpactEffectIcons(x: number, y: number, radius: number, effects: readonly { frame: string; breaks: boolean }[], reduced: boolean): void {
    let delay = 0;
    for (const effect of effects) { this.showAbsorbedEffectIcon(x, y, radius, effect.frame, effect.breaks, reduced, delay); delay += this.effectIconTimelineDurationMs(effect.breaks); }
  }
  private showAbsorbedEffectIcon(x: number, y: number, radius: number, frame: string, breaks: boolean, reduced: boolean, delay = 0): void {
    const config = EFFECT_PHASER_VISUAL.impactFeedback.absorbedIcon;
    const icon = this.trackImpact(this.add.image(x, y - radius * config.offsetYRatio, "rdn-effects", frame).setDisplaySize(radius * config.sizeRatio, radius * config.sizeRatio).setDepth(EFFECT_PHASER_VISUAL.impactFeedback.depth + config.depthOffset).setAlpha(0).setScale(config.initialScale));
    const fadeIn = reduced ? 0 : config.fadeInMs; const hold = reduced ? 0 : config.holdMs; const fadeOut = reduced ? 120 : config.fadeOutMs;
    this.tweens.add({ targets: icon, alpha: config.alpha, scaleX: config.finalScale, scaleY: config.finalScale, delay, duration: fadeIn, ease: "Sine.Out", onComplete: () => {
      if (breaks && config.shatter.enabled && !reduced) this.tweens.add({ targets: icon, alpha: config.alpha, duration: Math.max(1, config.durationMs - fadeIn), ease: "Linear", onComplete: () => { this.shatterImage("rdn-effects", frame, x, y - radius * config.offsetYRatio, radius * config.sizeRatio * config.finalScale); this.releaseImpact(icon); } });
      else this.tweens.add({ targets: icon, alpha: 0, delay: hold, duration: fadeOut, ease: "Sine.In", onComplete: () => this.releaseImpact(icon) });
    } });
  }
  /** Keep the original coloured gem visible for the icon phase, then break that sprite apart. */
  private showZeroGemShatter(gem: Phaser.GameObjects.Image, gemValue: Phaser.GameObjects.Text, tint: number): void {
    const icon = EFFECT_PHASER_VISUAL.impactFeedback.zeroGemIcon;
    const size = Math.max(gem.displayWidth, gem.displayHeight);
    const shardGem = this.trackImpact(this.add.image(gem.x, gem.y, gem.texture.key, gem.frame.name)
      .setDisplaySize(size * icon.sizeRatio / icon.finalScale, size * icon.sizeRatio / icon.finalScale)
      .setTint(tint).setDepth(EFFECT_PHASER_VISUAL.impactFeedback.depth + icon.depthOffset)
      .setAlpha(0).setScale(icon.initialScale));
    const zeroValue = this.trackImpact(this.add.text(gem.x, gem.y, "0", {
      fontFamily: gemValue.style.fontFamily,
      fontSize: gemValue.style.fontSize,
      fontStyle: gemValue.style.fontStyle,
      color: "#ffffff",
      stroke: gemValue.style.stroke,
      strokeThickness: gemValue.style.strokeThickness,
    }).setOrigin(gemValue.originX, gemValue.originY).setScale(gemValue.scaleX, gemValue.scaleY)
      .setDepth(EFFECT_PHASER_VISUAL.impactFeedback.depth + EFFECT_PHASER_VISUAL.impactFeedback.label.depthOffset)
      .setAlpha(0));
    this.tweens.add({ targets: zeroValue, alpha: 1, duration: icon.fadeInMs, ease: "Sine.Out" });
    this.tweens.add({ targets: shardGem, alpha: icon.alpha, scaleX: icon.finalScale, scaleY: icon.finalScale, duration: icon.fadeInMs, ease: "Sine.Out", onComplete: () => {
      if (icon.shatter.enabled) this.tweens.add({ targets: shardGem, alpha: icon.alpha, duration: Math.max(1, icon.durationMs - icon.fadeInMs), ease: "Linear", onComplete: () => {
        this.shatterImage(gem.texture.key, gem.frame.name, gem.x, gem.y - size * icon.offsetYRatio, size * icon.sizeRatio, tint, true);
        this.releaseImpact(shardGem);
        this.releaseImpact(zeroValue);
      } });
      else this.tweens.add({ targets: [shardGem, zeroValue], alpha: 0, delay: icon.holdMs, duration: icon.fadeOutMs, ease: "Sine.In", onComplete: () => { this.releaseImpact(shardGem); this.releaseImpact(zeroValue); } });
    } });
  }
  private shatterImage(textureKey: string, frame: string | number, x: number, y: number, size: number, tint?: number, zeroGem = false): void {
    const config = zeroGem ? EFFECT_PHASER_VISUAL.impactFeedback.zeroGemIcon.shatter : EFFECT_PHASER_VISUAL.impactFeedback.absorbedIcon.shatter;
    const textureFrame = this.textures.getFrame(textureKey, frame); if (!textureFrame) return;
    const columns = 4; const rows = Math.ceil(config.fragments / columns); const cropWidth = textureFrame.width / columns; const cropHeight = textureFrame.height / rows;
    for (let index = 0; index < config.fragments; index += 1) {
      const column = index % columns; const row = Math.floor(index / columns); const angle = Math.PI * 2 * index / config.fragments + .18;
      const fragment = this.trackImpact(this.add.image(x + (column - (columns - 1) / 2) * size / columns, y + (row - (rows - 1) / 2) * size / rows, textureKey, frame).setCrop(column * cropWidth, row * cropHeight, cropWidth, cropHeight).setDisplaySize(size / columns, size / rows).setAlpha(config.alpha).setDepth(EFFECT_PHASER_VISUAL.impactFeedback.depth + EFFECT_PHASER_VISUAL.impactFeedback.absorbedIcon.depthOffset));
      if (tint !== undefined) fragment.setTint(tint);
      const distance = size * config.distanceRatio * (.7 + (index % 3) * .17);
      this.tweens.add({ targets: fragment, x: fragment.x + Math.cos(angle) * distance, y: fragment.y + Math.sin(angle) * distance, angle: (index % 2 ? -1 : 1) * 360 * config.rotation, alpha: 0, scaleX: config.finalScale, scaleY: config.finalScale, duration: config.durationMs, ease: "Cubic.Out", onComplete: () => this.releaseImpact(fragment) });
    }
  }
  /** Base impact overlaps its local effect sequence; only icons on one gem are serial. */
  private impactTimelineDurationMs(impact: ImpulseResolutionPlan["impacts"][number], effects: readonly { frame: string; breaks: boolean }[]): number {
    const visual = EFFECT_PHASER_VISUAL.impactFeedback;
    const base = impact.resultValue === 0 && impact.previousValue !== 0 ? Math.max(visual.zero.durationMs, this.zeroGemShatterTimelineDurationMs()) : visual.settleMs;
    const effectSequence = effects.reduce((total, effect) => total + this.effectIconTimelineDurationMs(effect.breaks), 0);
    return Math.max(base, effectSequence);
  }
  private effectIconTimelineDurationMs(breaks: boolean): number {
    const icon = EFFECT_PHASER_VISUAL.impactFeedback.absorbedIcon;
    return icon.durationMs + (breaks && icon.shatter.enabled ? icon.shatter.durationMs : 0);
  }
  private zeroGemShatterTimelineDurationMs(): number {
    const gem = EFFECT_PHASER_VISUAL.impactFeedback.zeroGemIcon;
    return gem.durationMs + (gem.shatter.enabled ? gem.shatter.durationMs : 0);
  }
  private showImpactLabel(targetId: number, x: number, y: number, radius: number, value: string, zero: boolean): void {
    const visual = EFFECT_PHASER_VISUAL.impactFeedback; const slot = this.impactSlots.get(targetId) ?? 0; this.impactSlots.set(targetId, (slot + 1) % visual.label.maxSlots);
    const offset = (slot - (visual.label.maxSlots - 1) / 2) * visual.label.slotOffset; const startY = y - radius * 1.18 - slot * 8; const text = this.trackImpact(this.sphereLabel(x + offset, startY, value, radius * visual.label.sizeRatio, zero ? 0xffffff : visual.label.color).setDepth(visual.depth + visual.label.depthOffset)); text.setShadow(0, 0, zero ? "#8dffe2" : "#4fffa0", 9, true, true).setAlpha(0); const endY = startY - radius * visual.label.riseRatio; this.tweens.add({ targets: text, alpha: 1, duration: 80, ease: "Sine.Out" }); this.tweens.add({ targets: text, y: endY, delay: visual.label.holdMs, duration: visual.label.durationMs, alpha: 0, ease: "Cubic.Out", onComplete: () => this.releaseImpact(text) });
  }
  private trackImpact<T extends Phaser.GameObjects.GameObject>(object: T): T { this.impactObjects.add(object); return object; }
  private acquireImpactCircle(x: number, y: number, radius: number, color: number, alpha: number, depth: number): Phaser.GameObjects.Arc { const circle = this.impactParticlePool.pop() ?? this.add.circle(x, y, radius, color, alpha); circle.setActive(true).setVisible(true).setPosition(x, y).setRadius(radius).setFillStyle(color, alpha).setAlpha(alpha).setStrokeStyle(0, 0, 0).setScale(1).setDepth(depth); return this.trackImpact(circle); }
  private releaseImpact(object: Phaser.GameObjects.GameObject): void { this.tweens.killTweensOf(object); this.impactObjects.delete(object); if (object instanceof Phaser.GameObjects.Arc) { object.setVisible(false).setActive(false); this.impactParticlePool.push(object); return; } if (object.active) object.destroy(); }
  private clearImpactFeedback(): void { for (const object of this.impactObjects) { this.tweens.killTweensOf(object); if (object instanceof Phaser.GameObjects.Arc) object.destroy(); else if (object.active) object.destroy(); } this.impactObjects.clear(); this.impactParticlePool.forEach((object) => object.destroy()); this.impactParticlePool = []; this.impactSlots.clear(); }
  private triggerImpactHaptic(zero: boolean): void { const haptics = EFFECT_PHASER_VISUAL.impactFeedback.haptics; const vibrate = typeof navigator === "undefined" ? undefined : navigator.vibrate; if (!haptics.enabled || typeof vibrate !== "function") return; try { vibrate.call(navigator, zero ? haptics.zeroMs : haptics.normalMs); } catch { /* Haptics are optional and must never disrupt gameplay. */ } }
  private drawConnections(ringX: number, ringY: number, sourceX: number, sourceY: number, radius: number, model: RdnSceneModel): void {
    const currentTargets = new Set(model.flows.map((flow) => flow.targetId));
    // The yellow path is a topology preview, not a validity hint: it remains visible
    // even when the next operation will become blocked (for example a spent DIV2).
    // Draw it first so the active green flow always remains the visual priority.
    for (const preview of model.nextPreviews) if (!currentTargets.has(preview.slot.outerIndex)) this.drawTrail(ringX, ringY, sourceX, sourceY, radius, preview.slot.outerIndex, model.level.positions, EFFECT_PHASER_VISUAL.yellowFlows, true);
    for (const flow of model.flows) {
      if (flow.interactable) this.drawTrail(ringX, ringY, sourceX, sourceY, radius, flow.targetId, model.level.positions, EFFECT_PHASER_VISUAL.activeFlows, true);
      else {
        this.drawTrail(ringX, ringY, sourceX, sourceY, radius, flow.targetId, model.level.positions, EFFECT_PHASER_VISUAL.blockedFlows, false);
        this.drawBlockedGearSegment(ringX, ringY, sourceX, sourceY, radius, flow.targetId, model.level.positions);
      }
    }
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
    graphics.lineStyle(radius * config.glowWidth * EFFECT_PHASER_VISUAL.activeFlows.widthMultiplier, EFFECT_PHASER_VISUAL.activeFlows.color, .22);
    graphics.lineBetween(startX, startY, endX, endY);
    graphics.lineStyle(radius * config.middleWidth * EFFECT_PHASER_VISUAL.activeFlows.widthMultiplier, EFFECT_PHASER_VISUAL.activeFlows.color, .58);
    graphics.lineBetween(startX, startY, endX, endY);
    graphics.lineStyle(radius * config.coreWidth * EFFECT_PHASER_VISUAL.activeFlows.widthMultiplier, EFFECT_PHASER_VISUAL.activeFlows.coreTrailColor, .92);
    graphics.lineBetween(startX, startY, endX, endY);
  }
  /** A curved conduit from the impulse core that coils once around the target sphere. */
  private drawTrail(ringX: number, ringY: number, sourceX: number, sourceY: number, radius: number, outerIndex: number, total: number, flowVisual: typeof EFFECT_PHASER_VISUAL.activeFlows | typeof EFFECT_PHASER_VISUAL.yellowFlows | typeof EFFECT_PHASER_VISUAL.blockedFlows, animate = true): void {
    const { color, alpha, widthMultiplier } = flowVisual;
    const config = this.layout.trail; const point = this.point(ringX, ringY, radius * this.layout.outerSlots.radius, outerIndex, total, this.layout.outerSlots.angleOffset); const angle = Math.atan2(point.y - sourceY, point.x - sourceX); const unitX = Math.cos(angle); const unitY = Math.sin(angle);
    const startX = sourceX + unitX * radius * config.startRadius; const startY = sourceY + unitY * radius * config.startRadius; const sphereRadius = radius * config.sphereRadius; const endX = point.x - unitX * sphereRadius; const endY = point.y - unitY * sphereRadius;
    const trace = (width: number, opacity: number): Phaser.GameObjects.Graphics => { const graphics = this.add.graphics().setDepth(1); graphics.lineStyle(width, color, opacity); graphics.lineBetween(startX, startY, endX, endY); graphics.strokeCircle(point.x, point.y, sphereRadius); return graphics; };
    const pulseGlow = trace(radius * config.glowWidth * widthMultiplier, animate && "glowTraceAlphaMultiplier" in flowVisual ? alpha * flowVisual.glowTraceAlphaMultiplier : alpha * .28).setAlpha(animate && "glowInitialAlpha" in flowVisual ? flowVisual.glowInitialAlpha : .58); if (animate && "glowPulseDurationMs" in flowVisual) { this.trailEffects.push(pulseGlow); this.tweens.add({ targets: pulseGlow, alpha: flowVisual.glowPeakAlpha, duration: flowVisual.glowPulseDurationMs, ease: "Sine.InOut", yoyo: true, repeat: -1 }); }
    trace(radius * config.middleWidth * widthMultiplier, animate ? alpha * .22 : alpha * .42); trace(radius * config.coreWidth * widthMultiplier, animate ? alpha * .72 : alpha * .78);
    if (animate && "particleCount" in flowVisual) for (let index = 0; index < flowVisual.particleCount; index += 1) this.animateTrailFlow(startX, startY, endX, endY, point.x, point.y, sphereRadius, angle, flowVisual, index * flowVisual.particleStaggerMs);
  }
  private animateTrailFlow(startX: number, startY: number, endX: number, endY: number, sphereX: number, sphereY: number, sphereRadius: number, startAngle: number, flowVisual: typeof EFFECT_PHASER_VISUAL.activeFlows | typeof EFFECT_PHASER_VISUAL.yellowFlows, delay: number): void {
    const flow = { progress: 0 }; this.trailFlows.push(flow);
    const halo = this.add.circle(startX, startY, flowVisual.haloRadius, flowVisual.color, flowVisual.alpha * flowVisual.haloAlphaMultiplier).setDepth(3);
    const particle = this.add.circle(startX, startY, flowVisual.particleRadius, flowVisual.coreColor, flowVisual.alpha).setStrokeStyle(flowVisual.particleStrokeWidth, flowVisual.color, 1).setDepth(4);
    this.tweens.add({ targets: flow, progress: 1, delay, duration: flowVisual.durationMs, repeat: -1, repeatDelay: flowVisual.repeatDelayMs, ease: "Sine.InOut", onUpdate: () => {
      const t = flow.progress; let x: number; let y: number;
      if (t < flowVisual.directPathRatio) { const p = t / flowVisual.directPathRatio; x = startX + (endX - startX) * p; y = startY + (endY - startY) * p; }
      else { const p = (t - flowVisual.directPathRatio) / (1 - flowVisual.directPathRatio); const a = startAngle + Math.PI + p * Math.PI * 2; x = sphereX + Math.cos(a) * sphereRadius; y = sphereY + Math.sin(a) * sphereRadius; }
      const intensity = flowVisual.intensityBase + Math.sin(t * Math.PI) * flowVisual.intensityRange;
      halo.setPosition(x, y).setScale(flowVisual.haloMinScale + intensity * flowVisual.haloScaleRange).setAlpha(intensity * flowVisual.alpha * flowVisual.haloFadeAlphaMultiplier);
      particle.setPosition(x, y).setScale(flowVisual.particleMinScale + intensity * flowVisual.particleScaleRange).setAlpha(intensity * flowVisual.alpha);
    } });
  }
  /** Adventure uses set 1 and Time Attack set 2; later hundreds rotate through the remaining themes. */
  private visualSet(level: LevelDefinition): number { const baseSet = BASE_SET_BY_VARIANT[level.variant]; const levelNumber = Math.max(1, level.number); return ((baseSet - 1 + Math.floor((levelNumber - 1) / 100)) % VISUAL_SET_COUNT) + 1; }
  private addBackground(x: number, y: number, width: number, height: number, key: string): void { const background = this.add.image(x, y, key); const scale = RDN_PHASER_VISUAL_CONFIG.backgroundScalePercent / 100; background.setDisplaySize(width * scale, height * scale).setDepth(-4); }
  private addDecor(x: number, y: number, diameter: number, key: string, angle: number): void { const ring = this.add.image(x, y, key); ring.setScale(diameter / Math.max(ring.width, ring.height)).setAngle(angle); }
  private addGear(diameter: number, key: string): Phaser.GameObjects.Image { const gear = this.add.image(0, 0, key); return gear.setScale(diameter / Math.max(gear.width, gear.height)); }
  private point(cx: number, cy: number, radius: number, index: number, total: number, angleOffset = 0): { x: number; y: number } { const a = -Math.PI / 2 + angleOffset * Math.PI / 180 + index * Math.PI * 2 / total; return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }; }
  private gem(x: number, y: number, radius: number, _index: number, visualSet: number, off: boolean, special = false): Phaser.GameObjects.Image { const theme = GEM_THEME_CONFIG[visualSet as 1 | 2 | 3]; const frame = special ? "gem-sphere-purple" : theme.frame; const gem = this.add.image(x, y, "rdn-gems", frame).setDisplaySize(radius * 2.18, radius * 2.18); return off ? gem.setTint(0x858585).setAlpha(.78) : gem.setTint(theme.tint); }
  private sphere(x: number, y: number, radius: number, value: number, off: boolean, index: number, visualSet: number, fontSize: number, reservedWidthRatio: number): { gem: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text } { const gem = this.gem(x, y, radius, index, visualSet, off).setDepth(6); const text = this.sphereLabel(x, y, off ? "0" : format(value), radius, off ? 0xe6e6e6 : 0xffffff, fontSize, reservedWidthRatio).setDepth(7); return { gem, text }; }
  /** Every gem reserves -99, so signed one- and two-digit values share a stable visual scale. */
  private sphereLabel(x: number, y: number, value: string, radius: number, color: number, fontSize = Math.round(radius * 2.18 * .8), reservedWidthRatio = .8): Phaser.GameObjects.Text { const diameter = radius * 2.18; const text = this.label(x, y, "-99", Math.round(fontSize), color, true); const reservedWidth = text.width; text.setText(value); const scale = Math.min(1, diameter * reservedWidthRatio / reservedWidth); text.setScale(scale); return text; }
  private operationFloat(x: number, y: number, radius: number, operator: PuzzleOperator | null, elapsedMs = 0): void { if (operator === null) return; const verticalOffset = 10; const startY = y - radius * .9 - verticalOffset; const endY = y - radius * 2.45 - verticalOffset; const progress = Math.max(0, Math.min(1, elapsedMs / RDN_MOTION.operationFloatMs)); const text = this.sphereLabel(x, startY + (endY - startY) * progress, formatOperator(operator), radius * 1.15, operator === "divide2" || operator === "divide3" ? 0xdca8ff : 0xc5ffe0).setDepth(14); const scaleX = text.scaleX; const scaleY = text.scaleY; const initialScale = .78 + .22 * progress; text.setScale(scaleX * initialScale, scaleY * initialScale).setAlpha(1 - progress); this.tweens.add({ targets: text, y: endY, alpha: 0, scaleX, scaleY, duration: Math.max(1, RDN_MOTION.operationFloatMs - elapsedMs), ease: "Cubic.Out", onComplete: () => text.destroy() }); }
  private zeroBurst(x: number, y: number, radius: number): void { const flash = this.add.circle(x, y, radius, 0xd9fff3, 1).setDepth(10); const shockwave = this.add.circle(x, y, radius * .7, 0x64f4c8, 0).setStrokeStyle(Math.max(2, radius * .16), 0xb8ffe9, .95).setDepth(10); this.tweens.add({ targets: flash, scale: 5.2, alpha: 0, duration: RDN_MOTION.zeroImpactMs, ease: "Cubic.Out", onComplete: () => flash.destroy() }); this.tweens.add({ targets: shockwave, scale: 4.5, alpha: .86, duration: 120, ease: "Quad.Out", yoyo: true, hold: 70, onComplete: () => shockwave.destroy() }); for (let index = 0; index < RDN_MOTION.maxZeroParticles; index += 1) { const angle = index * Math.PI * 2 / RDN_MOTION.maxZeroParticles + Math.PI / RDN_MOTION.maxZeroParticles; const distance = radius * (2.1 + (index % 5) * .3); const spark = this.add.circle(x, y, Math.max(2, radius * (.1 + (index % 3) * .035)), 0x8dffe2, .98).setDepth(11); this.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, scale: .08, alpha: 0, duration: RDN_MOTION.zeroImpactMs, delay: index * 11, ease: "Cubic.Out", onComplete: () => spark.destroy() }); } }
  private resultBadge(x: number, y: number, value: string, trend: AlignmentPreview["trend"]): void { const background = trend === "zero" ? 0x287a47 : trend === "closer" ? 0x176b79 : trend === "farther" ? 0x882f3b : 0x82652a; const icon = trend === "zero" ? "✓" : trend === "closer" ? "↓" : trend === "farther" ? "↑" : "•"; this.add.rectangle(x, y, 43, 18, background, .94).setStrokeStyle(1, 0xe1bd63).setDepth(8); this.label(x, y, `${value}${icon}`, 10, 0xffffff).setDepth(9); }
  private queueBadge(x: number, y: number, remaining: number, exhausted: boolean): Phaser.GameObjects.Container { const color = exhausted ? 0x5d5d5d : 0x241b12; const border = exhausted ? 0x9a9a9a : 0xb18b48; const background = this.add.circle(0, 0, 11, color).setStrokeStyle(1, border); const text = this.label(0, 0, String(remaining), 11, exhausted ? 0xd8d8d8 : 0xffffff); return this.add.container(x, y, [background, text]).setDepth(6); }
  private createCountdownHud(x: number, model: RdnSceneModel): void {
    this.countdownCaption = this.label(x, 46, "TEMPO", 10, 0xf3d27c);
    this.countdownValue = this.label(x, 73, this.formatTime(model.timeRemaining ?? 0), 22, 0xf3d27c);
    this.countdownArc = this.add.graphics().setDepth(-2).disableInteractive();
    this.updateCountdownHud(model);
  }
  private updateCountdownHud(model: RdnSceneModel): void {
    if (!this.countdownArc || !this.countdownValue || !this.countdownCaption) { if (this.sys.isActive()) this.requestRender(); return; }
    if (model.timeRemaining === null || model.timeRemainingMs === null || model.timeRemainingMs === undefined || !model.timeTotalSeconds) { this.countdownArc.clear(); this.countdownCaption.setVisible(false); this.countdownValue.setVisible(false); return; }
    const ratio = Math.max(0, Math.min(1, model.timeRemainingMs / (model.timeTotalSeconds * 1000)));
    const color = ratio > .5 ? 0x63e586 : ratio > .25 ? 0xf3ce55 : 0xef6b69;
    this.countdownValue.setText(this.formatTime(model.timeRemaining)).setColor(`#${color.toString(16).padStart(6, "0")}`);
    const { width, height } = this.scale; const outerRadius = Math.min(width * RDN_PHASER_VISUAL_CONFIG.boardWidthRadiusRatio, height * RDN_PHASER_VISUAL_CONFIG.boardHeightRadiusRatio); const layout = this.layout;
    this.drawCountdownArc(width / 2 + outerRadius * layout.ring.offsetX, height * .49 + outerRadius * layout.ring.offsetY, outerRadius * layout.ring.diameter / 2, ratio, color);
  }
  private drawCountdownArc(cx: number, cy: number, radius: number, ratio: number, color: number): void {
    const graphics = this.countdownArc; if (!graphics) return;
    graphics.clear();
    // Decorative only: it stays behind the ring and never participates in pointer input.
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
  /** Development-only visual key for the declarative effect scenarios. */
  private playgroundInfoDialog(cx: number, cy: number): void {
    const depth = 20;
    this.add.rectangle(cx, cy, 354, 430, 0x101c18, .98).setStrokeStyle(2, 0x6edfff).setDepth(depth).setInteractive();
    this.label(cx, cy - 180, "LEGENDA EFFETTI", 18, 0x9cf5ff).setDepth(depth + 1);
    const rows: ReadonlyArray<readonly [string, string, number, string]> = [
      ["SHIELD", "assorbe gli impatti fino alla forza indicata", 0x72dfff, "effect-shield"],
      ["WALL", "blocca il flusso; il numero mostra la resistenza", 0xbca477, "effect-wall"],
      ["MIRROR", "inverte il contributo ricevuto dalla gemma", 0xdba0ff, "effect-mirror-sign"],
      ["ECHO", "propaga lo stesso valore al bersaglio", 0x7edbff, "effect-echo-link"],
      ["AMPLIFY x2", "propaga il valore moltiplicato", 0xffcd62, "effect-double-link"],
      ["INVERT", "propaga il valore con segno invertito", 0xc890ff, "effect-mirror-link"],
      ["BOMB", "a zero colpisce le gemme adiacenti", 0xff9378, "effect-area-bomb"],
    ];
    rows.forEach(([name, description, color, icon], index) => {
      const y = cy - 135 + index * 42;
      this.effectLegendIcon(cx - 142, y, icon, color, depth + 1);
      this.label(cx - 124, y, name, 14, color).setOrigin(0, .5).setDepth(depth + 1);
      this.add.text(cx - 8, y, description, { fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#e6dfc3", stroke: "#111814", strokeThickness: 2, wordWrap: { width: 168, useAdvancedWrap: true } }).setOrigin(0, .5).setDepth(depth + 1);
    });
    this.label(cx, cy + 153, "Le particelle sugli archi mostrano la propagazione del flow.", 10, 0xe6dfc3).setDepth(depth + 1);
    this.button(cx, cy + 186, "x", () => this.actions.closeInfo(), depth + 2);
  }
  /** Compact HUD for the first active target: it mirrors the gem info dialog and never decides rules. */
  private targetEffectsHud(width: number, model: RdnSceneModel, effects: readonly ResolvedEffect[]): void {
    const preview = model.previews.find((item) => item.active) ?? model.previews[0];
    if (!preview) return;
    const targetIndex = preview.slot.outerIndex;
    const gemEffects = effects.filter((effect) => this.isEffectActive(effect, model.state.outerValues, model.state.effectRuntime) && effect.config.scope !== EffectScope.LINK && (effect.target.type === EffectScope.GEM ? effect.target.gem.index === targetIndex : effect.target.type === EffectScope.AREA ? effect.target.sourceGem.index === targetIndex : false));
    const activeLinkIds = new Set(model.effectPreviewEvents.filter((event) => event.type === "FLOW_PROPAGATED" && event.linkId).map((event) => event.linkId!));
    const linkEffects = effects.filter((effect) => effect.config.scope === EffectScope.LINK && activeLinkIds.has(effect.id) && this.isEffectActive(effect, model.state.outerValues, model.state.effectRuntime));
    const categoryCount = Number(gemEffects.length > 0) + Number(linkEffects.length > 0);
    const x = width - 100; const y = 144; const cardWidth = 184; const cardHeight = 64 + categoryCount * 37;
    this.add.rectangle(x, y, cardWidth, cardHeight, 0x101c18, .88).setStrokeStyle(1, 0xc49b50, .9).setDepth(16);
    this.label(x, y - cardHeight / 2 + 13, `BERSAGLIO ${targetIndex + 1}`, 10, 0xf8dc8b).setDepth(17);
    const previewY = y - cardHeight / 2 + 31;
    const previewColor = preview.trend === "zero" ? 0x287a47 : preview.trend === "closer" ? 0x176b79 : preview.trend === "farther" ? 0x882f3b : 0x82652a;
    const previewIcon = preview.trend === "zero" ? "✓" : preview.trend === "closer" ? "↓" : preview.trend === "farther" ? "↑" : "•";
    // Overlay the raw-operation label below with the complete, effect-aware result.
    this.add.rectangle(x, previewY, cardWidth - 10, 24, 0x101c18, 1).setDepth(18);
    this.label(x - 35, previewY, `${format(preview.outerValue)}  →`, 14, 0xe6dfc3).setDepth(19);
    this.add.rectangle(x + 36, previewY, 43, 18, previewColor, .94).setStrokeStyle(1, 0xe1bd63).setDepth(19);
    this.label(x + 36, previewY, `${format(preview.result)}${previewIcon}`, 10, 0xffffff).setDepth(20);
    this.label(x, y - cardHeight / 2 + 31, `${format(preview.outerValue)}  →  ${format(preview.result)}`, 14, preview.result === 0 ? 0x9df3a8 : 0xffffff).setDepth(17);
    if (!categoryCount) { this.label(x, y + 14, "Nessun effetto attivo", 10, 0xe6dfc3).setDepth(17); return; }
    let categoryY = previewY + 30;
    const drawCategory = (label: string, categoryEffects: readonly ResolvedEffect[], actionFor: (effect: ResolvedEffect) => () => void): void => {
      if (!categoryEffects.length) return;
      this.label(x - 76, categoryY, label, 9, 0xf8dc8b).setOrigin(0, .5).setDepth(17);
      const shown = categoryEffects.slice(0, 4); const spacing = 31;
      shown.forEach((effect, index) => this.targetEffectHudIcon(x - 8 + index * spacing, categoryY, effect, actionFor(effect), true));
      if (categoryEffects.length > shown.length) this.label(x + 67, categoryY, `+${categoryEffects.length - shown.length}`, 9, 0xe6dfc3).setDepth(18);
      categoryY += 37;
    };
    drawCategory("GEMMA", gemEffects, () => () => this.actions.gemInfo(targetIndex));
    drawCategory("LINK", linkEffects, (effect) => () => this.actions.linkInfo(effect.id));
  }
  private targetEffectHudIcon(x: number, y: number, effect: ResolvedEffect, action: () => void, active = false): void { const color = this.effectColor(effect); const background = this.add.circle(x, y, 13, 0x151917, .96).setStrokeStyle(1, color, 1).setDepth(17).setInteractive({ useHandCursor: true }); const icon = this.add.image(x, y, "rdn-effects", this.effectIconFrame(effect)).setDisplaySize(21, 21).setTint(color).setDepth(18); background.on("pointerdown", action); icon.setInteractive({ useHandCursor: true }).on("pointerdown", action); if (active) this.tweens.add({ targets: [background, icon], scale: EFFECT_PHASER_VISUAL.hudActiveEffectPulseScale, duration: EFFECT_PHASER_VISUAL.hudActiveEffectPulseDurationMs, ease: "Sine.InOut", yoyo: true, repeat: -1 }); }
  private gemInfoDialog(cx: number, cy: number, model: RdnSceneModel, index: number): void {
    const depth = 20; const effects = this.effectsForGem(model, index);
    if (this.infoScrollForGem !== index) { this.infoScrollForGem = index; this.infoScrollOffset = 0; }
    const height = Math.min(Math.max(300, this.scale.height - 36), 610);
    const contentTop = cy - height / 2 + 112; const contentBottom = cy + height / 2 - 62; const viewportHeight = contentBottom - contentTop;
    const contentHeight = Math.max(44, effects.length * 168); this.infoScrollMax = Math.max(0, contentHeight - viewportHeight); this.infoScrollOffset = Math.min(this.infoScrollOffset, this.infoScrollMax);
    this.add.rectangle(cx, cy, 342, height, 0x101c18, .98).setStrokeStyle(2, 0x6edfff).setDepth(depth).setInteractive();
    const headerY = cy - height / 2 + 57; const off = model.state.targetVisualStates[index] === "OFF";
    const headerSphere = this.sphere(cx - 112, headerY, 27, model.state.outerValues[index], off, index, this.visualSet(model.level), 44, .8);
    headerSphere.gem.setDepth(depth + 2); headerSphere.text.setDepth(depth + 3);
    this.label(cx - 46, headerY - 13, `GEMMA ${index + 1}`, 18, 0x9cf5ff).setOrigin(0, .5).setDepth(depth + 2);
    this.label(cx - 46, headerY + 15, off ? "RISOLTA" : "ATTIVA", 12, off ? 0x9df3a8 : 0xffdf70).setOrigin(0, .5).setDepth(depth + 2);
    const maskShape = this.make.graphics({ x: 0, y: 0 }); maskShape.fillStyle(0xffffff); maskShape.fillRect(cx - 154, contentTop, 308, viewportHeight);
    const content = this.add.container(0, -this.infoScrollOffset).setDepth(depth + 1).setMask(maskShape.createGeometryMask());
    content.once(Phaser.GameObjects.Events.DESTROY, () => maskShape.destroy());
    // Canvas renderers can ignore a container geometry mask in edge cases. These covers
    // enforce the viewport boundary without affecting its touch/wheel interactions.
    this.add.rectangle(cx, (cy - height / 2 + contentTop) / 2, 338, contentTop - (cy - height / 2), 0x101c18, 1).setDepth(depth + 1.5);
    this.add.rectangle(cx, (contentBottom + cy + height / 2) / 2, 338, cy + height / 2 - contentBottom, 0x101c18, 1).setDepth(depth + 1.5);
    if (!effects.length) content.add(this.label(cx, contentTop + 22, "Nessun effetto attivo", 13, 0xe6dfc3).setDepth(depth + 1));
    effects.forEach((effect, effectIndex) => {
      const y = contentTop + 30 + effectIndex * 168;
      const color = this.effectColor(effect); const iconBackground = this.add.circle(cx - 119, y, 25, 0x101c18, .95).setStrokeStyle(2, color, .95); const icon = this.add.image(cx - 119, y, "rdn-effects", this.effectIconFrame(effect)).setDisplaySize(41, 41).setTint(color);
      const title = this.label(cx - 80, y, this.effectLabel(effect, model), 15, color).setOrigin(0, .5);
      const [nature, behavior, solution] = this.effectDetails(effect, model);
      const details = this.wrappedLabel(cx - 80, y + 24, `${nature}\n${behavior}\n${solution}`, 194, 13, 0xe6dfc3, depth + 1); content.add([iconBackground, icon, title, details]);
    });
    if (this.infoScrollMax > 0) { const railY = (contentTop + contentBottom) / 2; this.add.rectangle(cx + 157, railY, 4, viewportHeight, 0x5b695f, .45).setDepth(depth + 2); const thumbHeight = Math.max(24, viewportHeight * viewportHeight / contentHeight); const thumbY = contentTop + thumbHeight / 2 + (viewportHeight - thumbHeight) * (this.infoScrollOffset / this.infoScrollMax); this.add.rectangle(cx + 157, thumbY, 7, thumbHeight, 0x9df3a8, .9).setDepth(depth + 3); }
    this.button(cx + 145, cy - height / 2 + 28, "x", () => this.actions.closeInfo(), depth + 3);
  }
  private linkInfoDialog(cx: number, cy: number, model: RdnSceneModel, effectId: string): void {
    const effect = this.effectResolver.resolve(model.level.effectConfiguration, model.level.positions).effects.find((candidate) => candidate.id === effectId && candidate.target.type === EffectScope.LINK && this.isEffectActive(candidate, model.state.outerValues, model.state.effectRuntime));
    if (!effect || effect.target.type !== EffectScope.LINK) return;
    const depth = 20;
    const fromIndex = effect.target.fromGem.index;
    const toIndex = effect.target.toGem.index;
    const color = this.effectColor(effect);
    this.add.rectangle(cx, cy, 350, 382, 0x101c18, .98).setStrokeStyle(2, color).setDepth(depth).setInteractive();
    this.label(cx, cy - 156, "COLLEGAMENTO EFFETTO", 17, 0x9cf5ff).setDepth(depth + 1);
    this.effectLegendIcon(cx - 119, cy - 116, this.effectIconFrame(effect), color, depth + 1);
    this.label(cx - 97, cy - 116, this.effectLabel(effect, model), 15, color).setOrigin(0, .5).setDepth(depth + 1);
    const forwardOnly = effect.config.scope === EffectScope.LINK && effect.config.direction === "FORWARD";
    const reverseOnly = effect.config.scope === EffectScope.LINK && effect.config.direction === "REVERSE";
    this.label(cx, cy - 77, `Direzione: ${forwardOnly ? "origine → destinazione" : reverseOnly ? "destinazione → origine" : "bidirezionale"}`, 12, 0xe6dfc3).setDepth(depth + 1);
    this.label(cx, cy - 47, `Gemma ${fromIndex + 1}: ${format(model.state.outerValues[fromIndex])}   ·   Gemma ${toIndex + 1}: ${format(model.state.outerValues[toIndex])}`, 14, 0xffffff).setDepth(depth + 1);
    const [nature, behavior, solution] = this.effectDetails(effect, model);
    this.wrappedLabel(cx - 145, cy - 18, `${nature}\n${behavior}\n${solution}`, 290, 14, 0xe6dfc3, depth + 1);
    this.label(cx, cy + 124, "Tocca una gemma per vederne tutti gli effetti.", 10, 0xe6dfc3).setDepth(depth + 1);
    this.button(cx, cy + 151, "x", () => this.actions.closeInfo(), depth + 2);
  }
  private effectsForGem(model: RdnSceneModel, index: number): readonly ResolvedEffect[] {
    return this.effectResolver.resolve(model.level.effectConfiguration, model.level.positions).effects.filter((effect) => this.isEffectActive(effect, model.state.outerValues, model.state.effectRuntime) && (effect.target.type === EffectScope.GEM ? effect.target.gem.index === index : effect.target.type === EffectScope.LINK ? effect.target.fromGem.index === index || effect.target.toGem.index === index : effect.target.sourceGem.index === index));
  }
  private isEffectActive(effect: ResolvedEffect, values: readonly number[], runtime?: PuzzleState["effectRuntime"]): boolean { return isEffectVisuallyActive(effect, values, runtime); }
  private effectIconFrame(effect: ResolvedEffect): string { return effectAssetFrame(effect); }
  private effectColor(effect: ResolvedEffect): number { if (effect.config.scope === EffectScope.GEM) return effect.config.type === GemEffectType.SHIELD ? 0x72dfff : effect.config.type === GemEffectType.WALL ? 0xbca477 : effect.config.type === GemEffectType.ICE ? 0x8cecff : effect.config.type === GemEffectType.AMPLIFIER ? 0xffcd62 : effect.config.type === GemEffectType.TIMER ? 0xffcf75 : effect.config.type === GemEffectType.CORRUPTION ? 0xb35cff : effect.config.type === GemEffectType.INVERTER ? 0xc890ff : 0xdba0ff; if (effect.config.scope === EffectScope.LINK) return effect.config.type === LinkEffectType.ECHO ? 0x7edbff : effect.config.type === LinkEffectType.AMPLIFY ? 0xffcd62 : 0xc890ff; return 0xff9378; }
  private effectLabel(effect: ResolvedEffect, model: RdnSceneModel): string { if (effect.config.scope === EffectScope.GEM) { const config = effect.config; const detail = config.type === GemEffectType.WALL ? model.state.effectRuntime?.wallRemainingStrength[effect.id] ?? config.strength : config.type === GemEffectType.ICE ? model.state.effectRuntime?.iceRemainingStrength[effect.id] ?? config.strength : config.type === GemEffectType.TIMER ? model.state.effectRuntime?.timerRemainingTurns[effect.id] ?? config.turns : config.type === GemEffectType.AMPLIFIER ? `x${config.multiplier}` : config.type === GemEffectType.SHIELD ? config.strength : undefined; return `${config.type}${detail === undefined ? "" : ` ${detail}`}`; } if (effect.config.scope === EffectScope.LINK && effect.target.type === EffectScope.LINK) return `${effect.config.type}${effect.config.multiplier ? ` x${effect.config.multiplier}` : ""} ${effect.target.fromGem.index + 1} -> ${effect.target.toGem.index + 1}`; if (effect.config.scope === EffectScope.AREA) return `${effect.config.type} raggio ${effect.config.radius ?? 1}`; return effect.config.type; }
  private effectDetails(effect: ResolvedEffect, model: RdnSceneModel): readonly [string, string, string] {
    if (effect.config.scope === EffectScope.GEM) {
      if (effect.config.type === GemEffectType.SHIELD) { const strength = effect.config.strength ?? 1; return ["Natura: barriera difensiva.", `Fa: assorbe fino a ${strength} punti da ogni flusso in arrivo.`, "Soluzione: supera l'assorbimento con un impulso più forte."]; }
      if (effect.config.type === GemEffectType.WALL) { const remaining = model.state.effectRuntime?.wallRemainingStrength[effect.id] ?? effect.config.strength ?? 1; return ["Natura: ostacolo consumabile.", `Fa: annulla un flusso; resistenza rimasta: ${remaining} colpi.`, "Soluzione: colpiscila fino a romperla, poi applica il valore."]; }
      if (effect.config.type === GemEffectType.ICE) { const remaining = model.state.effectRuntime?.iceRemainingStrength[effect.id] ?? effect.config.strength; return ["Natura: barriera di ghiaccio.", `Fa: annulla un flusso; gelo rimasto: ${remaining} colpi.`, "Soluzione: scongelala con gli impatti, poi applica il valore."]; }
      if (effect.config.type === GemEffectType.AMPLIFIER) return ["Natura: amplificatore locale.", `Fa: moltiplica ogni contributo in arrivo per ${effect.config.multiplier}.`, "Soluzione: usa impulsi piccoli e calcola il valore amplificato."];
      if (effect.config.type === GemEffectType.INVERTER) return ["Natura: invertitore locale.", "Fa: dopo l'operazione inverte il valore ottenuto dalla gemma.", "Soluzione: pianifica prima il valore intermedio e poi il suo segno."];
      if (effect.config.type === GemEffectType.TIMER) { const remaining = model.state.effectRuntime?.timerRemainingTurns[effect.id] ?? effect.config.turns; const unit = timerUnitOf(effect); const measure = unit === "SECONDS" ? "secondi" : "impulsi"; const state = remaining <= TIMER_PRESENTATION.criticalAt ? "critico" : remaining <= TIMER_PRESENTATION.attentionAt ? "attenzione" : "normale"; return [`Natura: timer in ${measure}, stato ${state}.`, `Obiettivo: porta questa gemma a zero. Restano ${remaining} ${measure}; il contatore cala ${TIMER_PRESENTATION.decrementMoment}.`, `Alla scadenza ${TIMER_PRESENTATION.expiryConsequence}. Risolvila prima dell'ultimo impulso.`]; }
      if (effect.config.type === GemEffectType.CORRUPTION) return ["Natura: corruzione locale.", `Fa: ogni ${effect.config.intervalTurns ?? 1} turno aumenta il valore assoluto di ${effect.config.amount}.`, "Soluzione: risolvila rapidamente: a zero la corruzione si ferma."];
      return ["Natura: specchio numerico.", "Fa: inverte il segno di ogni flusso in arrivo.", "Soluzione: invia l'operazione dal segno opposto a quello desiderato."];
    }
    if (effect.config.scope === EffectScope.LINK) {
      if (effect.config.type === LinkEffectType.ECHO) return ["Natura: collegamento di propagazione.", "Fa: trasferisce lo stesso valore all'altra gemma.", "Soluzione: pianifica l'effetto su entrambe le gemme collegate."];
      if (effect.config.type === LinkEffectType.AMPLIFY) return ["Natura: collegamento amplificatore.", `Fa: trasferisce il valore moltiplicato per ${effect.config.multiplier ?? 1}.`, "Soluzione: usa valori piccoli e controlla il risultato sulla gemma collegata."];
      return ["Natura: collegamento invertitore.", "Fa: trasferisce il valore cambiandone il segno.", "Soluzione: scegli un impulso opposto al risultato che vuoi ottenere in arrivo."];
    }
    return ["Natura: esplosione ad area.", `Fa: quando questa gemma arriva a zero, applica -${Math.abs(effect.config.strength ?? 1)} alle gemme entro raggio ${effect.config.radius ?? 1}.`, "Soluzione: portala a zero quando la riduzione ai vicini è utile."];
  }
  private effectLegendIcon(x: number, y: number, frame: string, color: number, depth: number): void { const background = this.add.circle(x, y, 14, 0x101c18, .95).setStrokeStyle(1, color, .95).setDepth(depth); this.add.image(x, y, "rdn-effects", frame).setDisplaySize(23, 23).setTint(color).setDepth(depth + 1); background.setDepth(depth); }
  private tutorialDialog(cx: number, cy: number, tutorial: EffectTutorialDefinition): void {
    const depth = 40;
    const color = Number.parseInt(tutorial.color.slice(1), 16);
    this.add.rectangle(cx, cy, 360, 410, 0x101c18, .985).setStrokeStyle(3, color).setDepth(depth).setInteractive();
    this.label(cx, cy - 166, "NUOVO EFFETTO", 15, 0xf8dc8b).setDepth(depth + 1);
    this.effectLegendIcon(cx - 112, cy - 120, tutorial.iconFrame, color, depth + 1);
    this.label(cx - 88, cy - 120, tutorial.title.toUpperCase(), 20, color).setOrigin(0, .5).setDepth(depth + 1);
    this.wrappedLabel(cx - 144, cy - 80, tutorial.summary, 288, 15, 0xffffff, depth + 1);
    this.label(cx - 144, cy - 28, "COSA FA", 12, 0xf8dc8b).setOrigin(0, 0).setDepth(depth + 1);
    this.wrappedLabel(cx - 144, cy - 10, tutorial.behavior, 288, 14, 0xe6dfc3, depth + 1);
    this.label(cx - 144, cy + 58, "COME GESTIRLO", 12, 0xf8dc8b).setOrigin(0, 0).setDepth(depth + 1);
    this.wrappedLabel(cx - 144, cy + 76, tutorial.strategy, 288, 14, 0xe6dfc3, depth + 1);
    this.button(cx, cy + 157, "OK", () => this.actions.dismissTutorial(tutorial.id), depth + 2);
  }
  private wrappedLabel(x: number, y: number, value: string, width: number, size: number, color: number, depth: number): Phaser.GameObjects.Text { return this.add.text(x, y, value, { fontFamily: "Arial", fontSize: `${size}px`, color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold", stroke: "#111814", strokeThickness: 1, lineSpacing: 3, wordWrap: { width } }).setOrigin(0, 0).setDepth(depth); }
  private operationFeedback(reason: AlignmentPreview["rejectedReason"]): string { return reason === "DIVIDE_BY_TWO_REQUIRES_NON_ZERO_EVEN_INTEGER" ? "DIV2 richiede un valore pari diverso da zero" : reason === "DIVIDE_BY_TWO_CONSUMED" ? "DIV2 gia usato" : reason === "DIVIDE_BY_THREE_REQUIRES_NON_ZERO_MULTIPLE_OF_THREE" ? "DIV3 richiede un multiplo di 3 diverso da zero" : reason === "DIVIDE_BY_THREE_CONSUMED" ? "DIV3 gia usato" : reason === "SPECIAL_OPERATOR_CONSUMED" ? "Operatore speciale gia usato" : reason === "RESULT_OUT_OF_RANGE" ? "Mossa fuori intervallo" : "Mossa non disponibile"; }
  private freeInfoDialog(cx: number, cy: number, settings: NonNullable<RdnSceneModel["freeSettings"]>): void { const depth = 20; this.add.rectangle(cx, cy, 330, 262, 0x151914, .97).setStrokeStyle(3, 0xc49b50).setDepth(depth).setInteractive(); this.label(cx, cy - 96, "INFO FREE", 18, 0xf8dc8b).setDepth(depth + 1); this.label(cx, cy - 55, `Difficolta: ${settings.difficulty}`, 15, 0xffdf70).setDepth(depth + 1); this.label(cx, cy - 26, `Gemme operative: ${settings.slotCount}`, 15, 0xffdf70).setDepth(depth + 1); this.label(cx, cy + 3, `Effetti: ${settings.effectsEnabled ? "ATTIVI" : "DISATTIVI"}`, 14, settings.effectsEnabled ? 0x9df3a8 : 0xe6dfc3).setDepth(depth + 1); this.label(cx, cy + 33, "Partite illimitate", 13, 0xe6dfc3).setDepth(depth + 1); this.label(cx, cy + 58, "Nessuna vita o penalita", 13, 0xe6dfc3).setDepth(depth + 1); this.button(cx, cy + 98, "X", () => this.actions.closeInfo(), depth + 2); }
  private label(x: number, y: number, value: string, size: number, color: number, digital = false): Phaser.GameObjects.Text { return this.add.text(x, y, value, { fontFamily: digital ? "Arial, Helvetica, sans-serif" : "Arial", fontSize: `${size}px`, color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold", stroke: "#111814", strokeThickness: Math.max(2, Math.round(size * .14)) }).setOrigin(.5); }
  private button(x: number, y: number, value: string, action: () => void, depth = 0): void { const button = this.add.circle(x, y, 24, 0x3b2b19).setDepth(depth).setInteractive(); button.on("pointerdown", action); const frame = UI_ICON_BY_BUTTON_LABEL[value]; if (frame) this.add.image(x, y, "rdn-ui-icons", frame).setDisplaySize(48, 48).setDepth(depth + 1); else this.label(x, y, value, 24, 0xffe3a0).setDepth(depth + 1); }
  private actionIcon(x: number, y: number, size: number, frame: string, depth = 0): void { this.add.image(x, y, "rdn-actions", frame).setDisplaySize(size, size).setDepth(depth); }
  private bonus(x: number, y: number, action: RdnHudAction, activate: () => void): void { const button = this.add.circle(x, y, 31, action.disabled ? 0x4d4d4d : 0x245438).setInteractive(); button.on("pointerdown", () => { if (!action.disabled) activate(); }); this.actionIcon(x, y, 90, action.icon, 3); this.add.circle(x + 23, y + 23, 12, 0x241b12).setStrokeStyle(1, 0xb18b48).setDepth(4); this.label(x + 23, y + 23, String(action.charges), 12, 0xffffff).setDepth(5); }
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
