import Phaser from "phaser";
import { BaseMinigame } from "../base-minigame";
import { CombatSequenceAction, MinigameConfig, MinigameResult } from "../minigame.model";
import { GAME_ATLAS } from "../../phaser/config/game-atlas.config";
import {
  CombatTargetDirection,
  DEFAULT_COMBAT_TARGET_DIR_CONFIG,
} from "./combat-target-dir.config";

type CombatDirTargetType = CombatSequenceAction | "danger";

type ActiveTarget = {
  id: number;
  type: CombatDirTargetType;
  direction?: CombatTargetDirection;
  x: number;
  y: number;
  radius: number;
  container: Phaser.GameObjects.Container;
  hitArea: Phaser.GameObjects.Arc;
  countdownText: Phaser.GameObjects.Text;
  consumed: boolean;
  expiresAt: number;
  expireTimer: Phaser.Time.TimerEvent;
  pulseTween?: Phaser.Tweens.Tween;
  hintTween?: Phaser.Tweens.Tween;
  dragTrail?: Phaser.GameObjects.Graphics;
};

const PLAYFIELD_Y = DEFAULT_COMBAT_TARGET_DIR_CONFIG.layout.playfieldY;
const PLAYFIELD_WIDTH = DEFAULT_COMBAT_TARGET_DIR_CONFIG.layout.playfieldWidth;
const PLAYFIELD_HEIGHT = DEFAULT_COMBAT_TARGET_DIR_CONFIG.layout.playfieldHeight;
const STATUS_Y = DEFAULT_COMBAT_TARGET_DIR_CONFIG.layout.statusY;
const SCORE_Y = DEFAULT_COMBAT_TARGET_DIR_CONFIG.layout.scoreY;


const TYPE_COLORS: Record<CombatDirTargetType, { fill: number; stroke: number; icon?: string }> = {
  attack: { fill: 0x7f1d1d, stroke: 0xfca5a5, icon: "action-attack" },
  defense: { fill: 0x0f3b66, stroke: 0x93c5fd, icon: "action-defense" },
  defenseSpecial: { fill: 0x312e81, stroke: 0xc4b5fd, icon: "action-defense" },
  special: { fill: 0x4c1d95, stroke: 0xddd6fe, icon: "action-tornado" },
  danger: { fill: 0x1f2937, stroke: 0xf87171, icon: "action-poison" },
};

/**
 * Variante swipe di combat-target-tap. I target azione vengono risolti
 * direttamente dal gesto direzionale; i tre pulsanti di azione inferiori
 * non vengono creati in questa implementazione.
 */
export class CombatTargetDirMinigame extends BaseMinigame {
  private readonly activeTargets: ActiveTarget[] = [];
  private readonly targetPlan: CombatDirTargetType[] = [];
  private panel?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private spawnedTargets = 0;
  private score = 0;
  private nextTargetId = 1;
  private spawnLoop?: Phaser.Time.TimerEvent;
  private countdownEvent?: Phaser.Time.TimerEvent;
  private finished = false;
  private dragTargetId?: number;
  private dragPointerId?: number;
  private dragStartX = 0;
  private dragStartY = 0;
  private activeFeedbackTween?: Phaser.Tweens.Tween;
  private activeFeedbackFlash?: Phaser.GameObjects.Arc;

  constructor(
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) {
    super(scene, config, onComplete);
  }

  override create(): void {
    this.panel = this.createPanel();
    const actors = this.createCombatActors({ y: PLAYFIELD_Y + 6, heroOffsetX: -62, monsterOffsetX: 62, heroMaxSize: 78, monsterMaxSize: 78 });
    if (actors.length) this.panel.add(actors);
    this.buildFrame();
    this.prepareTargetPlan();
    this.bindGlobalPointer();
    this.startGameplay();
  }

  override destroy(): void {
    this.destroyActiveTargets();
    this.spawnLoop?.remove(false);
    this.countdownEvent?.remove(false);
    this.activeFeedbackTween?.stop();
    this.activeFeedbackFlash?.destroy();
    super.destroy();
  }

  private buildFrame(): void {
    if (!this.panel) return;

    //const frame = this.scene.add.rectangle(0, PLAYFIELD_Y, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT, 0x120f24, 0.98)
    //  .setStrokeStyle(3, 0xf6d365, 0.84);
    //const inset = this.scene.add.rectangle(0, PLAYFIELD_Y, PLAYFIELD_WIDTH - 10, PLAYFIELD_HEIGHT - 10, 0x201433, 0.92)
    //  .setStrokeStyle(1, 0xc084fc, 0.32);

    const ringRadius = this.getRingRadius();
    const glow = this.scene.add.circle(0, PLAYFIELD_Y + 40, ringRadius + 7, 0x60a5fa, 0.06)
      .setStrokeStyle(10, 0x60a5fa, 0.08);
    const ring = this.scene.add.circle(0, PLAYFIELD_Y + 40, ringRadius, 0xffffff, 0)
      .setStrokeStyle(3, 0xf6d365, 0.28);

    this.statusText = this.scene.add.text(0, STATUS_Y, "Trascina ogni azione nella direzione della freccia.", {
      color: "#fef3c7", fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold", align: "center", wordWrap: { width: 274 },
    }).setOrigin(0.5);
    this.scoreText = this.scene.add.text(0, SCORE_Y, "Score 0", {
      color: "#e9d5ff", fontFamily: "Trebuchet MS", fontSize: "14px", align: "center",
    }).setOrigin(0.5);

    const showBar = this.isMetricBarVisible(this.config.timeDisplayMode);

    //this.panel.add([frame, inset, glow, ring, this.statusText, this.scoreText, timeTrack]);
    this.panel.add([glow, ring, this.statusText, this.scoreText]);
  }

  private prepareTargetPlan(): void {
    // Il piano è una coda di spawn rifornita durante lo scontro; il numero effettivo
    // di eventi è determinato dalla morte di eroe o mostro.
    const total = Math.max(4, Number(this.config.objectiveCount ?? DEFAULT_COMBAT_TARGET_DIR_CONFIG.defaults.objectiveCount));
    const maxDanger = Math.max(1, Math.floor(total * 0.28));
    let dangers = 0;
    for (let index = 0; index < total; index += 1) {
      const isDanger = Phaser.Math.Between(1, 100) > 84 && dangers < maxDanger;
      const type = isDanger ? "danger" : this.pickCombatSequenceAction();
      if (type === "danger") dangers += 1;
      this.targetPlan.push(type);
    }
    if (!this.targetPlan.some((target) => target !== "danger")) this.targetPlan[0] = "attack";
  }

  private startGameplay(): void {
    this.updateTimeFeedback();
    this.spawnTarget();
    this.spawnLoop = this.trackTimer(this.scene.time.addEvent({
      delay: Math.max(250, Number(this.config.spawnIntervalMs ?? DEFAULT_COMBAT_TARGET_DIR_CONFIG.defaults.spawnIntervalMs)),
      loop: true,
      callback: () => {
        if (this.finished) return;
        if (this.spawnedTargets >= this.targetPlan.length) {
          if (this.isCombatEncounterFinished()) {
            this.spawnLoop?.remove(false);
            this.spawnLoop = undefined;
            if (!this.activeTargets.length) this.finishMinigame();
            return;
          }
          this.prepareTargetPlan();
        }
        this.spawnTarget();
      },
    }));
    this.countdownEvent = this.trackTimer(this.scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (this.finished) return;
        this.updateTimeFeedback();
        if (this.isCombatEncounterFinished()) this.finishMinigame();
      },
    }));
  }

  private bindGlobalPointer(): void {
    const onMove = (pointer: Phaser.Input.Pointer): void => this.updateDrag(pointer);
    const onUp = (pointer: Phaser.Input.Pointer): void => this.finishDrag(pointer);
    this.scene.input.on("pointermove", onMove);
    this.scene.input.on("pointerup", onUp);
    this.trackDisposer(() => {
      this.scene.input.off("pointermove", onMove);
      this.scene.input.off("pointerup", onUp);
    });
  }

  private spawnTarget(): void {
    const type = this.targetPlan[this.spawnedTargets];
    if (!type || !this.panel) return;
    const radius = Math.max(18, Number(this.config.targetRadius ?? DEFAULT_COMBAT_TARGET_DIR_CONFIG.defaults.targetRadius));
    const { x, y } = this.resolveSpawnPosition(radius);
    const visual = TYPE_COLORS[type];
    const lifeMs = Math.max(250, Number(this.config.targetLifeMs ?? DEFAULT_COMBAT_TARGET_DIR_CONFIG.defaults.targetLifeMs));
    const direction = type === "danger" ? undefined : this.getRandomDirection();
    const hitRadius = direction
      ? radius + 15
      : radius;
    const container = this.scene.add.container(x, y);
    const children: Phaser.GameObjects.GameObject[] = [];
    const directionalHint = direction ? this.createDirectionalHint(radius, direction) : undefined;

    if (directionalHint) children.push(directionalHint.container);
    const target = this.scene.add.circle(0, 0, radius + 14, 0xffffff, 0.0001);
    //const target = this.scene.add.circle(0, 0, hitRadius, 0xffffff, 1);
    const targetGlow = this.scene.add.circle(0, 0, radius + 10, visual.stroke, 0.08);
    const ring = this.scene.add.circle(0, 0, radius + 5, 0xffffff, 0).setStrokeStyle(3, visual.stroke, 0.92);
    const core = this.scene.add.circle(0, 0, radius, visual.fill, 0.94).setStrokeStyle(2, visual.stroke, 1);
    const icon = this.addAtlasIcon(0, 0, GAME_ATLAS.actions.key, visual.icon ?? "action-attack", { scale: 0.22 });
    const countdown = this.scene.add.text(0, -(radius + 20), "", {
      color: "#fef3c7", fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", stroke: "#120f24", strokeThickness: 4,
    }).setOrigin(0.5);
    children.push(targetGlow, target, ring, core, icon, countdown);
    container.add(children);
    this.panel.add(container);

    const active: ActiveTarget = {
      id: this.nextTargetId++, type, direction, x, y, radius, container, hitArea: target, countdownText: countdown,
      consumed: false, expiresAt: this.scene.time.now + lifeMs, expireTimer: undefined as unknown as Phaser.Time.TimerEvent,
      hintTween: directionalHint?.tween,
    };
    active.pulseTween = this.trackTween(this.scene.tweens.add({
      targets: [ring, core, targetGlow], scaleX: 1.07, scaleY: 1.07, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    }));
    target.setInteractive(new Phaser.Geom.Circle(hitRadius, hitRadius, hitRadius), Phaser.Geom.Circle.Contains);
    if (target.input) target.input.cursor = "pointer";
    const onDown = (pointer: Phaser.Input.Pointer, _x?: number, _y?: number, event?: Phaser.Types.Input.EventData): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();
      this.startDrag(active.id, pointer);
    };
    target.on("pointerdown", onDown as never);
    this.trackDisposer(() => {
      target.off("pointerdown", onDown as never);
      // Il contenitore del target può essere già stato distrutto da
      // destroyActiveTargets() prima che BaseMinigame esegua i disposer.
      // In quel caso Phaser rimuove `scene` e disableInteractive() genera errore.
      if (target.scene?.sys) {
        target.disableInteractive();
      }
    });
    active.expireTimer = this.trackTimer(this.scene.time.delayedCall(lifeMs, () => this.expireTarget(active.id)));
    this.activeTargets.push(active);
    this.spawnedTargets += 1;
    this.refreshSingleTargetCountdown(active);
  }

  private createDirectionalHint(
    radius: number,
    direction: CombatTargetDirection,
  ): { container: Phaser.GameObjects.Container; tween: Phaser.Tweens.Tween } {
    const config = DEFAULT_COMBAT_TARGET_DIR_CONFIG;
    const hint = this.scene.add.container(0, 0);
    const graphics = this.scene.add.graphics();
    const distance = radius + config.hintRadiusOffset;
    const vector = this.directionVector(direction);
    const tipX = vector.x * distance;
    const tipY = vector.y * distance;
    const sideX = -vector.y * 7;
    const sideY = vector.x * 7;
    graphics.lineStyle(2, config.hintColor, 0.75);
    graphics.strokeCircle(0, 0, distance);
    graphics.fillStyle(config.hintColor, 0.95);
    graphics.fillTriangle(tipX + vector.x * 36, tipY + vector.y * 36, tipX - vector.x * 13 + sideX, tipY - vector.y * 13 + sideY, tipX - vector.x * 13 - sideX, tipY - vector.y * 13 - sideY);
    hint.add(graphics);
    const tween = this.trackTween(this.scene.tweens.add({
      targets: hint, scaleX: 1.08, scaleY: 1.08, alpha: 0.58, duration: config.hintPulseDuration, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    }));
    return { container: hint, tween };
  }

  private startDrag(targetId: number, pointer: Phaser.Input.Pointer): void {
    if (this.finished || this.dragTargetId !== undefined) return;
    const target = this.activeTargets.find((item) => item.id === targetId);
    if (!target || target.consumed) return;
    if (target.type === "danger") {
      this.score -= 15;
      this.statusText?.setText("Pericolo colpito! Penalita.").setColor("#fca5a5");
      this.flashTarget(target, DEFAULT_COMBAT_TARGET_DIR_CONFIG.hintErrorColor);
      this.resolveTarget(target, true, DEFAULT_COMBAT_TARGET_DIR_CONFIG.hintErrorColor);
      this.refreshScore();
      return;
    }
    this.dragTargetId = target.id;
    this.dragPointerId = pointer.id;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    target.container.setScale(DEFAULT_COMBAT_TARGET_DIR_CONFIG.dragScale);
    target.dragTrail = this.scene.add.graphics();
    target.container.add(target.dragTrail);
    this.statusText?.setText("Segui la freccia fino al completamento.").setColor("#dbeafe");
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.dragPointerId || this.dragTargetId === undefined) return;
    const target = this.activeTargets.find((item) => item.id === this.dragTargetId);
    if (!target || target.consumed) return;
    target.dragTrail?.clear();
    target.dragTrail?.lineStyle(3, DEFAULT_COMBAT_TARGET_DIR_CONFIG.hintColor, 0.8);
    target.dragTrail?.lineBetween(0, 0, pointer.x - this.dragStartX, pointer.y - this.dragStartY);
    const direction = this.getSwipeDirection(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
    if (direction) {
      this.resolveDragOutcome(target, direction);
    }
  }

  private finishDrag(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.dragPointerId || this.dragTargetId === undefined) return;
    const target = this.activeTargets.find((item) => item.id === this.dragTargetId);
    if (!target || target.consumed || !target.direction || this.finished) return;
    if (target.type === "danger") return;
    const actual = this.getSwipeDirection(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
    if (actual) {
      this.resolveDragOutcome(target, actual);
      return;
    }

    // Un rilascio anticipato non annulla il gesto: lo completiamo brevemente
    // nella direzione richiesta, così l'azione resta valida anche su mobile.
    this.clearDrag();
    this.statusText?.setText("Azione confermata...").setColor("#dbeafe");
    this.trackTimer(this.scene.time.delayedCall(DEFAULT_COMBAT_TARGET_DIR_CONFIG.releaseCommitDurationMs, () => {
      if (!target.consumed && !this.finished) {
        this.resolveDragOutcome(target, target.direction!);
      }
    }));
  }

  private resolveDragOutcome(target: ActiveTarget, actual: CombatTargetDirection): void {
    if (target.consumed || !target.direction || this.finished || target.type === "danger") return;
    this.clearDrag();
    if (this.isDirectionCorrect(actual, target.direction)) {
      this.score += this.resolveTargetValue(target.type);
      this.statusText?.setText("Perfetto!").setColor("#bbf7d0");
      this.playCombatResolution(target.type, "perfect");
      this.resolveCombatEncounterPhase(target.type, "perfect");
      this.flashTarget(target, DEFAULT_COMBAT_TARGET_DIR_CONFIG.hintSuccessColor);
      this.resolveTarget(target, true, DEFAULT_COMBAT_TARGET_DIR_CONFIG.hintSuccessColor);
    } else {
      this.score -= 8 * DEFAULT_COMBAT_TARGET_DIR_CONFIG.failPenalty;
      this.statusText?.setText(actual ? "Direzione errata!" : "Swipe troppo corto!").setColor("#fca5a5");
      this.playCombatResolution(target.type, "fail");
      this.resolveCombatEncounterPhase(target.type, "fail");
      this.flashTarget(target, DEFAULT_COMBAT_TARGET_DIR_CONFIG.hintErrorColor);
      this.resolveTarget(target, false, DEFAULT_COMBAT_TARGET_DIR_CONFIG.hintErrorColor);
    }
    this.refreshScore();
    if (this.isCombatEncounterFinished()) this.finishMinigame();
  }

  private clearDrag(): void {
    const target = this.activeTargets.find((item) => item.id === this.dragTargetId);
    target?.dragTrail?.destroy();
    if (target && !target.consumed) target.container.setScale(1);
    this.dragTargetId = undefined;
    this.dragPointerId = undefined;
  }

  private expireTarget(targetId: number): void {
    const target = this.activeTargets.find((item) => item.id === targetId);
    if (!target || target.consumed) return;
    if (target.type !== "danger") {
      if (this.dragTargetId === target.id) this.clearDrag();
      this.score -= 8;
      this.statusText?.setText(`Hai mancato ${this.getActionLabel(target.type)}.`).setColor("#fde68a");
      this.playCombatResolution(target.type, "fail");
      this.resolveCombatEncounterPhase(target.type, "fail");
      this.refreshScore();
    }
    this.resolveTarget(target, false, 0xf59e0b);
    if (this.isCombatEncounterFinished()) this.finishMinigame();
  }

  private resolveTarget(target: ActiveTarget, positive: boolean, accent: number): void {
    if (target.consumed) return;
    target.consumed = true;
    target.expireTimer.remove(false);
    target.pulseTween?.stop();
    target.hintTween?.stop();
    target.hitArea.disableInteractive();
    const index = this.activeTargets.findIndex((item) => item.id === target.id);
    if (index >= 0) this.activeTargets.splice(index, 1);
    this.trackTween(this.scene.tweens.add({
      targets: target.container, alpha: 0, scaleX: positive ? 1.28 : 0.72, scaleY: positive ? 1.28 : 0.72, duration: 180, ease: "Quad.easeOut",
      onComplete: () => target.container.destroy(true),
    }));
    this.updateTimeFeedback();
  }

  private flashTarget(target: ActiveTarget, color: number): void {
    this.activeFeedbackTween?.stop();
    this.activeFeedbackTween = undefined;
    this.activeFeedbackFlash?.destroy();
    const flash = this.scene.add.circle(target.x, target.y, target.radius + 12, color, 0.22).setStrokeStyle(3, color, 0.72);
    this.activeFeedbackFlash = flash;
    this.panel?.add(flash);
    this.activeFeedbackTween = this.trackTween(this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (this.activeFeedbackFlash === flash) {
          this.activeFeedbackFlash = undefined;
          this.activeFeedbackTween = undefined;
        }
        flash.destroy();
      },
    }));
  }

  private resolveSpawnPosition(radius: number): { x: number; y: number } {
    const ringRadius = this.getRingRadius();
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const maxX = PLAYFIELD_WIDTH / 2 - radius - 8;
    const maxY = PLAYFIELD_Y + PLAYFIELD_HEIGHT / 2 - radius - 8;
    return {
      x: Phaser.Math.Clamp(Math.cos(angle) * ringRadius, -maxX, maxX),
      y: Phaser.Math.Clamp(PLAYFIELD_Y + Math.sin(angle) * ringRadius, PLAYFIELD_Y - PLAYFIELD_HEIGHT / 2 + radius + 8, maxY),
    };
  }

  private getRingRadius(): number {
    return Phaser.Math.Clamp(
      Number(this.config.targetRingRadius ?? DEFAULT_COMBAT_TARGET_DIR_CONFIG.defaults.targetRingRadius),
      78,
      Math.min(PLAYFIELD_WIDTH / 1.5, PLAYFIELD_HEIGHT / 1.5),
    );
  }

  private getRandomDirection(): CombatTargetDirection {
    return Phaser.Utils.Array.GetRandom(["up", "down", "left", "right"] as CombatTargetDirection[]) ?? "up";
  }

  private getSwipeDirection(startX: number, startY: number, endX: number, endY: number): CombatTargetDirection | null {
    const dx = endX - startX;
    const dy = endY - startY;
    if (Math.hypot(dx, dy) < DEFAULT_COMBAT_TARGET_DIR_CONFIG.minSwipeDistance) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  private isDirectionCorrect(actual: CombatTargetDirection | null, expected: CombatTargetDirection): boolean {
    return actual === expected;
  }

  private directionVector(direction: CombatTargetDirection): { x: number; y: number } {
    switch (direction) {
      case "up": return { x: 0, y: -1 };
      case "down": return { x: 0, y: 1 };
      case "left": return { x: -1, y: 0 };
      default: return { x: 1, y: 0 };
    }
  }

  private updateTimeFeedback(): void {
    this.activeTargets.forEach((target) => this.refreshSingleTargetCountdown(target));
  }

  private refreshSingleTargetCountdown(target: ActiveTarget): void {
    if (target.consumed) return;
    const remaining = Math.max(0, target.expiresAt - this.scene.time.now);
    target.countdownText.setText(`${(remaining / 1000).toFixed(1)}s`).setColor(remaining <= 450 ? "#fca5a5" : "#fef3c7");
  }

  private resolveTargetValue(type: CombatDirTargetType): number {
    switch (type) {
      case "attack": return 10 + Math.max(0, Math.round(this.config.heroStats.strength));
      case "defense": return 8 + Math.max(0, Math.round(this.config.heroStats.defense));
      case "special": return 15 + Math.max(0, Math.round(this.config.heroStats.luck));
      default: return 0;
    }
  }

  private refreshScore(): void {
    this.scoreText?.setText(`Score ${this.score}`);
  }

  private finishMinigame(): void {
    if (this.finished) return;
    this.finished = true;
    this.clearDrag();
    this.destroyActiveTargets();
    this.spawnLoop?.remove(false);
    this.countdownEvent?.remove(false);
    const result = this.buildResult();
    const feedback = this.getFeedbackLabel(result.grade);
    this.statusText?.setText(feedback.text).setColor(feedback.color);
    this.completeWithDelay(result, 380);
  }

  private buildResult(): MinigameResult {
    const totals = this.getCombatEncounterTotals();
    const grade = this.didHeroWinCombatEncounter()
      ? totals.heroDamageTaken === 0 ? "perfect" : "success"
      : "fail";
    const values = grade === "perfect"
      ? { fatigueGained: 5, rewardMultiplier: 1.5 }
      : grade === "success"
        ? { fatigueGained: 4, rewardMultiplier: 1 }
        : { fatigueGained: 2, rewardMultiplier: 0.25 };
    return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.max(0, Math.round(this.score)), usedSkill: "dexterity", damageTaken: totals.heroDamageTaken, ...values };
  }

  private getFeedbackLabel(grade: MinigameResult["grade"]): { text: string; color: string } {
    if (grade === "perfect") return { text: "Combo perfette!", color: "#fde68a" };
    if (grade === "success") return { text: "Manovra riuscita!", color: "#bbf7d0" };
    if (grade === "partial") return { text: "Hai retto lo scontro, ma a fatica.", color: "#fdba74" };
    return { text: "Sei stato travolto dal ritmo dello scontro.", color: "#fca5a5" };
  }

  private destroyActiveTargets(): void {
    while (this.activeTargets.length) {
      const target = this.activeTargets.pop();
      target?.expireTimer.remove(false);
      target?.pulseTween?.stop();
      target?.hintTween?.stop();
      target?.container.destroy(true);
    }
  }

  private getActionLabel(action: CombatDirTargetType): string {
    if (action === "attack") return "ATTACCO";
    if (action === "defense") return "DIFESA";
    if (action === "defenseSpecial") return "DIFESA SPECIALE";
    if (action === "special") return "SPECIALE";
    return "PERICOLO";
  }
}
