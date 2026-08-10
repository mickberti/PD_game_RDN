import Phaser from "phaser";
import {
  CombatSequenceAction,
  MinigameConfig,
  MinigameResult,
  MinigameResultGrade,
} from "../minigame.model";
import { BaseMinigame } from "../base-minigame";
import { GAME_ATLAS } from "../../phaser/config/game-atlas.config";
import { DEFAULT_COMBAT_CHARGE_RELEASE_CONFIG } from "./combat-charge-release.config";

type PhaseOutcome = {
  action: CombatSequenceAction;
  chargeValue: number;
  grade: MinigameResultGrade;
  overcharged: boolean;
  luckSaved: boolean;
};

const { layout: CHARGE_LAYOUT, buttonX: COMBAT_BUTTON_X } = DEFAULT_COMBAT_CHARGE_RELEASE_CONFIG;
const CHARGE_BAR_WIDTH = CHARGE_LAYOUT.barWidth;
const CHARGE_BAR_HEIGHT = CHARGE_LAYOUT.barHeight;
const CHARGE_BAR_Y = CHARGE_LAYOUT.barY;
const STATUS_Y = CHARGE_LAYOUT.statusY;
const STEP_Y = CHARGE_LAYOUT.stepY;
const ACTION_TEXT_Y = CHARGE_LAYOUT.actionTextY;
const VALUE_Y = CHARGE_LAYOUT.valueY;
const HOLD_AREA_Y = CHARGE_LAYOUT.holdAreaY;
const HOLD_AREA_X = CHARGE_LAYOUT.holdAreaX;
const HOLD_AREA_WIDTH = CHARGE_LAYOUT.holdAreaWidth;
const HOLD_AREA_HEIGHT = CHARGE_LAYOUT.holdAreaHeight;
const COMBAT_STEP_SPACING = CHARGE_LAYOUT.stepSpacing;
const COMBAT_BUTTON_Y = CHARGE_LAYOUT.buttonY;
const COMBAT_BUTTON_WIDTH = CHARGE_LAYOUT.buttonWidth;
const COMBAT_BUTTON_HEIGHT = CHARGE_LAYOUT.buttonHeight;

export class CombatChargeReleaseMinigame extends BaseMinigame {
  private readonly phaseOutcomes: PhaseOutcome[] = [];
  private readonly actionButtons = new Map<CombatSequenceAction, Phaser.GameObjects.Container>();
  private chargeBarFill?: Phaser.GameObjects.Rectangle;
  private perfectZone?: Phaser.GameObjects.Rectangle;
  private marker?: Phaser.GameObjects.Rectangle;
  private holdArea?: Phaser.GameObjects.Container;
  private holdAreaIcon?: Phaser.GameObjects.Image;
  private holdAreaGlow?: Phaser.GameObjects.Arc;
  private holdAreaRing?: Phaser.GameObjects.Arc;
  private holdAreaCore?: Phaser.GameObjects.Arc;
  private holdAreaPulse?: Phaser.Tweens.Tween;
  private statusText?: Phaser.GameObjects.Text;
  private actionText?: Phaser.GameObjects.Text;
  private valueText?: Phaser.GameObjects.Text;
  private overchargePulse?: Phaser.Tweens.Tween;
  private currentCharge = 0;
  private holding = false;
  private finished = false;
  private currentAction: CombatSequenceAction = "attack";
  private lastPointerDownId: number | null = null;

  constructor(
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) {
    super(scene, config, onComplete);
  }

  override create(): void {
    const panel = this.createPanel();
    const combatActors = this.createCombatActors({ y: -18, heroOffsetX: -62, monsterOffsetX: 62, heroMaxSize: 78, monsterMaxSize: 78 });
    if (combatActors.length > 0) {
      panel.add(combatActors);
    }
    this.statusText = this.scene.add.text(0, STATUS_Y, "Tieni premuto HOLD e premi l'azione richiesta.", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 276 },
    }).setOrigin(0.5);

    this.actionText = this.scene.add.text(0, ACTION_TEXT_Y, "", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.valueText = this.scene.add.text(0, VALUE_Y, "Carica 0%", {
      color: "#cbd5e1",
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      align: "center",
    }).setOrigin(0.5);

    const barTrack = this.scene.add.rectangle(0, CHARGE_BAR_Y, CHARGE_BAR_WIDTH, CHARGE_BAR_HEIGHT, 0x111827, 0.96)
      .setStrokeStyle(3, 0xf6d365, 0.85);
    const earlyZone = this.scene.add.rectangle(this.valueToBarX(20), CHARGE_BAR_Y, this.valueWidthToPixels(40), CHARGE_BAR_HEIGHT , 0x7c2d12, 0.72);
    const successZone = this.scene.add.rectangle(this.valueToBarX(52.5), CHARGE_BAR_Y, this.valueWidthToPixels(25), CHARGE_BAR_HEIGHT, 0x2563eb, 0.3);
    const overchargeZone = this.scene.add.rectangle(this.valueToBarX(95), CHARGE_BAR_Y, this.valueWidthToPixels(10), CHARGE_BAR_HEIGHT , 0x7f1d1d, 0.45);
    this.perfectZone = this.scene.add.rectangle(
      this.valueToBarX(Number(this.config.targetCenter ?? 68)),
      CHARGE_BAR_Y,
      this.valueWidthToPixels(Number(this.config.perfectZoneWidth ?? 12)),
      CHARGE_BAR_HEIGHT - 2,
      0xfacc15,
      0.68,
    ).setStrokeStyle(2, 0xfef08a, 0.95);
    this.chargeBarFill = this.scene.add.rectangle(
      -CHARGE_BAR_WIDTH / 2 + 2,
      CHARGE_BAR_Y,
      0,
      CHARGE_BAR_HEIGHT - 1,
      0xfb923c,
      0.95,
    ).setOrigin(0, 0.5);
    this.marker = this.scene.add.rectangle(-CHARGE_BAR_WIDTH / 2, CHARGE_BAR_Y, 6, CHARGE_BAR_HEIGHT + 2, 0xffffff, 1)
      .setStrokeStyle(2, 0x1f2937, 1);

    const hintRow = this.scene.add.text(0, 92, "Presto · Buono · Perfetto · Overcharge", {
      color: "#fda4af",
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      align: "center",
    }).setOrigin(0.5);

    this.holdArea = this.createHoldArea();
    this.buildActionButtons(panel);
    panel.add([
      this.statusText,
      this.actionText,
      this.valueText,
      barTrack,
      earlyZone,
      successZone,
      overchargeZone,
      this.perfectZone,
      this.chargeBarFill,
      this.marker,
      this.holdArea,
    ]);

    this.bindPointerLifecycle();
    this.refreshChargeVisuals();
    this.startPhase();
  }

  override update(_time: number, delta: number): void {
    if (this.finished) {
      return;
    }

    const chargeSpeed = Number(this.config.chargeSpeed ?? 0.55);
    const chargeStep = (delta / 16.6667) * chargeSpeed;
    this.currentCharge += this.holding ? chargeStep : -chargeStep * 1.1;
    this.currentCharge = Phaser.Math.Clamp(this.currentCharge, 0, 118);
    this.refreshChargeVisuals();

    if (this.holding && this.currentCharge >= 90 && !this.overchargePulse) {
      this.startOverchargePulse();
    }

    if (!this.holding && this.overchargePulse) {
      this.stopOverchargePulse();
    }

    if (this.holding && this.currentCharge >= 118) {
      this.resolveCurrentPhase(true);
    }
  }

  override destroy(): void {
    this.stopOverchargePulse();
    this.holdAreaPulse?.stop();
    super.destroy();
  }

  private createHoldArea(): Phaser.GameObjects.Container {
    const hold = this.scene.add.container(HOLD_AREA_X, HOLD_AREA_Y);
    hold.setSize(HOLD_AREA_WIDTH, HOLD_AREA_HEIGHT);
    const actionColor = this.getActionFlashColor(this.currentAction);
    this.holdAreaGlow = this.scene.add.circle(0, 0, HOLD_AREA_WIDTH / 2 + 10, actionColor, 0.08);
    this.holdAreaRing = this.scene.add.circle(0, 0, HOLD_AREA_WIDTH / 2 + 5, 0xffffff, 0)
      .setStrokeStyle(3, actionColor, 0.92);
    this.holdAreaCore = this.scene.add.circle(0, 0, HOLD_AREA_WIDTH / 2, 0x251a42, 0.94)
      .setStrokeStyle(2, actionColor, 1);
    this.holdAreaIcon = this.addAtlasIcon(0, 0, GAME_ATLAS.actions.key, "action-lightning", {
      scale: 0.3,
    });
    const hitbox = this.scene.add.rectangle(0, 0, HOLD_AREA_WIDTH, HOLD_AREA_HEIGHT, 0xffffff, 0.001);
    hold.add([this.holdAreaGlow, hitbox, this.holdAreaRing, this.holdAreaCore, this.holdAreaIcon]);
    this.holdAreaPulse = this.trackTween(this.scene.tweens.add({
      targets: [this.holdAreaRing, this.holdAreaCore, this.holdAreaGlow],
      scaleX: 1.07,
      scaleY: 1.07,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }));
    return hold;
  }

  private buildActionButtons(panel: Phaser.GameObjects.Container): void {
    const buttonConfigs: Array<{ action: CombatSequenceAction; label: string; x: number }> = [
      { action: "attack", label: "ATTACCO", x: COMBAT_BUTTON_X.attack },
      { action: "defense", label: "DIFESA", x: COMBAT_BUTTON_X.defense },
      { action: "special", label: "SPECIALE", x: COMBAT_BUTTON_X.special },
    ];

    buttonConfigs.forEach((buttonConfig) => {
      const button = this.createActionButton(
        buttonConfig.label,
        buttonConfig.x,
        COMBAT_BUTTON_Y,
        COMBAT_BUTTON_WIDTH,
        COMBAT_BUTTON_HEIGHT,
        this.getActionButtonVisual(buttonConfig.action),
      );
      panel.add(button);
      this.actionButtons.set(buttonConfig.action, button);
      this.bindPointer(button, () => this.triggerAction(buttonConfig.action));
    });
  }

  private bindPointerLifecycle(): void {
    const hitTarget = this.holdArea;
    if (!hitTarget) {
      return;
    }

    const interactiveTarget = hitTarget as Phaser.GameObjects.Container & {
      input?: Phaser.Types.Input.InteractiveObject;
    };
    interactiveTarget.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, HOLD_AREA_WIDTH, HOLD_AREA_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
          
    if (interactiveTarget.input) {
      interactiveTarget.input.cursor = "pointer";
    }

    const handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
      pointer.event?.preventDefault?.();
      if (this.finished || this.holding) {
        return;
      }
      this.lastPointerDownId = pointer.id;
      this.beginHold();
    };
    const handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
      pointer.event?.preventDefault?.();
      if (this.lastPointerDownId !== null && pointer.id !== this.lastPointerDownId) {
        return;
      }
      this.endHold();
    };
    const handlePointerOut = (pointer: Phaser.Input.Pointer): void => {
      pointer.event?.preventDefault?.();
      if (this.lastPointerDownId !== null && pointer.id !== this.lastPointerDownId) {
        return;
      }
      this.endHold();
    };
    const handleGameOut = (): void => {
      this.endHold();
    };

    interactiveTarget.on("pointerdown", handlePointerDown as never);
    interactiveTarget.on("pointerup", handlePointerUp as never);
    interactiveTarget.on("pointerout", handlePointerOut as never);
    this.scene.input.on("pointerup", handlePointerUp);
    this.scene.input.on("pointerupoutside", handlePointerUp);
    this.scene.input.on("gameout", handleGameOut);
    this.trackDisposer(() => {
      interactiveTarget.off("pointerdown", handlePointerDown as never);
      interactiveTarget.off("pointerup", handlePointerUp as never);
      interactiveTarget.off("pointerout", handlePointerOut as never);
      interactiveTarget.disableInteractive();
      this.scene.input.off("pointerup", handlePointerUp);
      this.scene.input.off("pointerupoutside", handlePointerUp);
      this.scene.input.off("gameout", handleGameOut);
    });
  }

  private startPhase(): void {
    if (this.isCombatEncounterFinished()) {
      this.finishSequence();
      return;
    }

    this.currentAction = this.pickCombatSequenceAction();
    this.currentCharge = 0;
    this.refreshChargeVisuals();
    this.updateHoldAreaAction(this.currentAction);
    this.setCombatActorsIdle();
    this.actionText?.setText(this.getActionLabel(this.currentAction)).setColor(this.getActionColor(this.currentAction));
    this.statusText?.setText(`Round ${this.getCombatEncounterTotals().roundsResolved + 1}: tieni HOLD e premi ${this.getActionLabel(this.currentAction)}.`).setColor("#e9d5ff");
    this.actionButtons.forEach((button) => button.setScale(1));
  }

  private beginHold(): void {
    if (this.finished) {
      return;
    }

    this.holding = true;
    const expectedAction = this.currentAction;
    this.statusText?.setText(`HOLD attivo: premi ${this.getActionLabel(expectedAction ?? "attack")} al momento giusto.`).setColor("#fde68a");
    this.animateHoldArea(true);
    this.refreshChargeVisuals();
  }

  private endHold(): void {
    if (!this.holding) {
      return;
    }

    this.holding = false;
    this.lastPointerDownId = null;
    this.stopOverchargePulse();
    this.animateHoldArea(false);
    this.statusText?.setText("HOLD rilasciato: la barra sta scendendo. Premi di nuovo per ricaricare.").setColor("#cbd5e1");
  }

  private triggerAction(action: CombatSequenceAction): void {
    if (this.finished) {
      return;
    }

    if (!this.holding) {
      this.statusText?.setText("Tieni premuto HOLD prima di usare un'azione.").setColor("#fde68a");
      this.flashHoldArea(0xf59e0b);
      return;
    }

    const expectedAction = this.currentAction;
    if (!expectedAction) {
      return;
    }

    this.actionButtons.forEach((button, key) => {
      button.setScale(key === action ? 1.08 : 1);
      this.flashButtonVisual(button, key === action ? this.getActionFlashColor(action) : 0xffffff);
    });

    if (action !== this.getRequiredInputAction(expectedAction)) {
      this.statusText?.setText(`Azione errata: serviva ${this.getActionLabel(expectedAction)}.`).setColor("#fca5a5");
      this.flashActionButton(action, 0xef4444);
      this.flashHoldArea(0xef4444);
      this.resolvePhase({
        action: expectedAction,
        chargeValue: this.currentCharge,
        grade: "fail",
        overcharged: false,
        luckSaved: false,
      });
      return;
    }

    this.resolveCurrentPhase(false);
  }

  private resolveCurrentPhase(forcedOvercharge: boolean): void {
    const expectedAction = this.currentAction;
    if (!expectedAction || this.finished) {
      return;
    }

    this.holding = false;
    this.lastPointerDownId = null;
    this.stopOverchargePulse();
    this.animateHoldArea(false);

    const outcome = this.resolveOutcome(expectedAction, forcedOvercharge);
    this.resolvePhase(outcome);
  }

  private resolveOutcome(action: CombatSequenceAction, forcedOvercharge: boolean): PhaseOutcome {
    const value = this.currentCharge;
    const perfectCenter = Number(this.config.targetCenter ?? 70);
    const perfectHalfWidth = Number(this.config.perfectZoneWidth ?? 12) / 2;
    const inPerfect = value >= perfectCenter - perfectHalfWidth && value <= perfectCenter + perfectHalfWidth;
    const inSuccess = value >= 40 && value <= 65;
    const isOvercharged = forcedOvercharge || value > 100;
    const minimumPartial = 18;
    let grade: MinigameResultGrade;
    let luckSaved = false;

    if (isOvercharged) {
      const luckChance = Phaser.Math.Clamp(this.config.heroStats.luck * 1.5, 0, 35);
      luckSaved = Phaser.Math.Between(1, 100) <= luckChance;
      grade = luckSaved ? "partial" : "fail";
    } else if (inPerfect) {
      grade = "perfect";
    } else if (inSuccess) {
      grade = "success";
    } else if (value >= minimumPartial) {
      grade = "partial";
    } else {
      grade = "fail";
    }

    return {
      action,
      chargeValue: value,
      grade,
      overcharged: isOvercharged,
      luckSaved,
    };
  }

  private resolvePhase(outcome: PhaseOutcome): void {
    this.phaseOutcomes.push(outcome);
    const sequenceDurationMs = this.showOutcome(outcome);
    this.resolveCombatEncounterPhase(outcome.action, outcome.grade);
    this.actionButtons.forEach((button) => button.setScale(1));
    this.currentCharge = 0;
    this.refreshChargeVisuals();

    if (this.isCombatEncounterFinished()) {
      this.finishSequence();
      return;
    }

    this.trackTimer(this.scene.time.delayedCall(sequenceDurationMs, () => {
      if (this.finished) {
        return;
      }
      this.startPhase();
    }));
  }

  private showOutcome(outcome: PhaseOutcome): number {
    const message = outcome.overcharged
      ? outcome.luckSaved
        ? `${this.getActionLabel(outcome.action)} salvata dalla fortuna!`
        : `Overcharge su ${this.getActionLabel(outcome.action)}.`
      : outcome.grade === "perfect"
        ? `${this.getActionLabel(outcome.action)} perfetta!`
        : outcome.grade === "success"
          ? `${this.getActionLabel(outcome.action)} ben caricata.`
          : outcome.grade === "partial"
            ? `${this.getActionLabel(outcome.action)} utile ma imprecisa.`
            : `${this.getActionLabel(outcome.action)} sprecata.`;
    const color = outcome.grade === "perfect"
      ? "#fde68a"
      : outcome.grade === "success"
        ? "#bbf7d0"
        : outcome.grade === "partial"
          ? "#fdba74"
          : "#fca5a5";

    this.statusText?.setText(message).setColor(color);
    this.valueText?.setText(`Rilascio ${outcome.chargeValue.toFixed(1)}%`);
    const sequenceDurationMs = this.playCombatResolution(outcome.action, outcome.grade);
    this.flashActionButton(outcome.action, outcome.grade === "fail" ? 0xef4444 : 0x22c55e);
    return sequenceDurationMs;
  }

  private finishSequence(): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.holding = false;
    this.stopOverchargePulse();
    const grade = this.resolveFinalGrade();
    const result = this.buildResult(grade);
    const feedback = this.getGradePresentation(grade);
    this.statusText?.setText(feedback.label).setColor(feedback.textColor);
    this.actionText?.setText("Esito cariche").setColor(feedback.textColor);
    this.completeWithDelay(result, 380);
  }

  private resolveFinalGrade(): MinigameResultGrade {
    let totalPoints = 0;
    let landedPower = 0;
    const totals = this.getCombatEncounterTotals();

    this.phaseOutcomes.forEach((outcome) => {
      totalPoints += this.getPhaseValue(outcome.grade);
      const actionMultiplier = outcome.action === "special" ? 1.3 : outcome.action === "defense" ? 0.9 : 1;
      if (outcome.grade === "perfect") landedPower += 2.2 * actionMultiplier;
      else if (outcome.grade === "success") landedPower += 1.6 * actionMultiplier;
      else if (outcome.grade === "partial") landedPower += 0.85 * actionMultiplier;
    });

    const average = this.phaseOutcomes.length > 0 ? totalPoints / this.phaseOutcomes.length : 0;
    if (this.didHeroWinCombatEncounter() && average >= 3.4 && totals.heroDamageTaken === 0) return "perfect";
    if (this.didHeroWinCombatEncounter() && landedPower > 0) return "success";
    if (landedPower > 0 || average >= 1.2 || totals.monsterDamageTaken > totals.heroDamageTaken) return "partial";
    return "fail";
  }

  private buildResult(grade: MinigameResultGrade): MinigameResult {
    const totals = this.getCombatEncounterTotals();
    const bestCharge = this.phaseOutcomes.reduce((best, attempt) => Math.max(best, attempt.chargeValue), 0);
    const accuracyBonus = grade === "perfect" ? 48 : grade === "success" ? 28 : grade === "partial" ? 12 : 0;
    const strengthBonus = this.config.heroStats.strength * 8;
    const sequenceBonus = this.phaseOutcomes.reduce((sum, outcome) => {
      const weight = outcome.action === "special" ? 1.25 : outcome.action === "defense" ? 0.9 : 1.1;
      return sum + this.getPhaseValue(outcome.grade) * 14 * weight;
    }, 0);
    const score = Math.max(
      8,
      Math.round(90 + strengthBonus + bestCharge * 1.8 + accuracyBonus + sequenceBonus + this.config.event.difficulty * 10),
    );

    if (grade === "perfect") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score,
        usedSkill: "strength",
        fatigueGained: 6,
        rewardMultiplier: 1.6,
        damageTaken: totals.heroDamageTaken,
      };
    }

    if (grade === "success") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score,
        usedSkill: "strength",
        fatigueGained: 4,
        rewardMultiplier: 1.1,
        damageTaken: totals.heroDamageTaken,
      };
    }

    if (grade === "partial") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.round(score * 0.72),
        usedSkill: "strength",
        fatigueGained: 3,
        rewardMultiplier: 0.7,
        damageTaken: totals.heroDamageTaken,
      };
    }

    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade,
      score: Math.round(score * 0.3),
      usedSkill: "strength",
      fatigueGained: 2,
      rewardMultiplier: 0.2,
      damageTaken: totals.heroDamageTaken,
    };
  }

  private refreshChargeVisuals(): void {
    const clamped = Phaser.Math.Clamp(this.currentCharge, 0, 110);
    const ratio = clamped / 100;
    const width = Math.max(0, (CHARGE_BAR_WIDTH - 4) * Math.min(1, ratio));
    this.chargeBarFill?.setSize(width, CHARGE_BAR_HEIGHT - 4);
    this.marker?.setX(this.valueToBarX(Math.min(100, clamped)));
    this.valueText?.setText(`Carica ${clamped.toFixed(1)}%`);

    if (this.chargeBarFill) {
      const fillColor = clamped >= 90 ? 0xef4444 : clamped >= 40 ? 0xf59e0b : 0xfb923c;
      this.chargeBarFill.setFillStyle(fillColor, 0.96);
    }
  }

  private valueToBarX(value: number): number {
    const normalized = Phaser.Math.Clamp(value / 100, 0, 1);
    return -CHARGE_BAR_WIDTH / 2 + normalized * CHARGE_BAR_WIDTH;
  }

  private valueWidthToPixels(value: number): number {
    return (value / 100) * CHARGE_BAR_WIDTH;
  }

  private startOverchargePulse(): void {
    if (!this.holdArea || this.overchargePulse) {
      return;
    }

    this.overchargePulse = this.trackTween(this.scene.tweens.add({
      targets: this.holdArea,
      x: { from: -3, to: 3 },
      duration: 54,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }));
  }

  private stopOverchargePulse(): void {
    this.overchargePulse?.stop();
    this.overchargePulse = undefined;
    this.holdArea?.setX(HOLD_AREA_X);
  }

  private animateHoldArea(pressed: boolean): void {
    if (!this.holdArea) {
      return;
    }

    this.trackTween(this.scene.tweens.add({
      targets: this.holdArea,
      scaleX: pressed ? 0.97 : 1,
      scaleY: pressed ? 0.97 : 1,
      duration: 110,
      ease: "Quad.easeOut",
    }));
  }

  private flashHoldArea(color: number): void {
    if (!this.holdArea) {
      return;
    }

    this.trackTween(this.scene.tweens.add({
      targets: this.holdArea,
      alpha: 0.65,
      duration: 80,
      yoyo: true,
      repeat: 1,
      ease: "Quad.easeOut",
      onStart: () => {
        if (this.holdAreaIcon) {
          this.holdAreaIcon.setTint(color);
        }
      },
      onComplete: () => {
        this.holdArea?.setAlpha(1);
        this.holdAreaIcon?.clearTint();
      },
    }));
  }

  private updateHoldAreaAction(action: CombatSequenceAction): void {
    const visual = this.getActionButtonVisual(action);
    if (!visual.frameName || !this.holdAreaIcon) {
      return;
    }

    this.holdAreaIcon.setFrame(visual.frameName);
    const actionColor = this.getActionFlashColor(action);
    this.holdAreaGlow?.setFillStyle(actionColor, 0.08);
    this.holdAreaRing?.setStrokeStyle(3, actionColor, 0.92);
    this.holdAreaCore?.setStrokeStyle(2, actionColor, 1);
  }

  private getPhaseValue(grade: MinigameResultGrade): number {
    switch (grade) {
      case "perfect": return 4;
      case "success": return 3;
      case "partial": return 2;
      default: return 0;
    }
  }

  private getGradePresentation(grade: MinigameResultGrade): { label: string; textColor: string } {
    switch (grade) {
      case "perfect": return { label: "Catena di cariche perfetta!", textColor: "#fde68a" };
      case "success": return { label: "Sequenza ben eseguita", textColor: "#bbf7d0" };
      case "partial": return { label: "Sequenza utile ma instabile", textColor: "#fdba74" };
      default: return { label: "Le cariche si sono spezzate", textColor: "#fca5a5" };
    }
  }

  private getActionLabel(action: CombatSequenceAction): string {
    switch (action) {
      case "attack": return "ATTACCO";
      case "defense": return "DIFESA";
      case "defenseSpecial": return "DIFESA SPECIALE";
      default: return "SPECIALE";
    }
  }

  private getActionColor(action: CombatSequenceAction): string {
    switch (action) {
      case "attack": return "#fecaca";
      case "defense": return "#bae6fd";
      case "defenseSpecial": return "#c4b5fd";
      default: return "#e9d5ff";
    }
  }

  private getRequiredInputAction(action: CombatSequenceAction): CombatSequenceAction {
    return action === "defenseSpecial" ? "defense" : action;
  }

  private getActionFlashColor(action: CombatSequenceAction): number {
    switch (action) {
      case "attack":
        return 0xef4444;
      case "defense":
        return 0x3b82f6;
      default:
        return 0xa855f7;
    }
  }

  private flashActionButton(action: CombatSequenceAction, color: number): void {
    const button = this.actionButtons.get(action);
    if (button) {
      this.flashButtonVisual(button, color);
    }
  }

  private getActionButtonVisual(action: CombatSequenceAction) {
    switch (action) {
      case "attack":
        return { atlasKey: GAME_ATLAS.actions.key, frameName: "action-attack", iconScale: 0.38 };
      case "defense":
        return { atlasKey: GAME_ATLAS.actions.key, frameName: "action-defense", iconScale: 0.38 };
      default:
        return { atlasKey: GAME_ATLAS.actions.key, frameName: "action-tornado", iconScale: 0.38 };
    }
  }
}
