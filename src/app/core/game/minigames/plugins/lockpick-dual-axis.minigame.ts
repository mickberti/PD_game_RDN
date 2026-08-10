import Phaser from "phaser";
import { BaseMinigame } from "../base-minigame";
import { MinigameConfig, MinigameResult, MinigameResultGrade } from "../minigame.model";
import { MINIGAME_BUTTON_ATLAS } from "../../phaser/config/game-atlas.config";
import { DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG } from "./lockpick-dual-axis.config";

const { layout: DUAL_AXIS_LAYOUT } = DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG;
const LOCK_X = DUAL_AXIS_LAYOUT.lockX;
const LOCK_Y = DUAL_AXIS_LAYOUT.lockY;
const VERTICAL_BAR_HEIGHT = DUAL_AXIS_LAYOUT.verticalBarHeight;
const VERTICAL_BAR_WIDTH = DUAL_AXIS_LAYOUT.verticalBarWidth;
const ROTATION_BAR_WIDTH = DUAL_AXIS_LAYOUT.rotationBarWidth;
const ROTATION_BAR_HEIGHT = DUAL_AXIS_LAYOUT.rotationBarHeight;
const ROTATION_BAR_Y = DUAL_AXIS_LAYOUT.rotationBarY;
const STRESS_BAR_Y = DUAL_AXIS_LAYOUT.stressBarY;
const TIMER_BAR_Y = DUAL_AXIS_LAYOUT.timerBarY;
const STATUS_Y = DUAL_AXIS_LAYOUT.statusY;
const INFO_Y = DUAL_AXIS_LAYOUT.infoY;
const HOLD_Y = DUAL_AXIS_LAYOUT.holdY;
const HOLD_WIDTH = DUAL_AXIS_LAYOUT.holdWidth;
const HOLD_HEIGHT = DUAL_AXIS_LAYOUT.holdHeight;

export class LockpickDualAxisMinigame extends BaseMinigame {
  private statusText?: Phaser.GameObjects.Text;
  private infoText?: Phaser.GameObjects.Text;
  private lockpickGlow?: Phaser.GameObjects.Rectangle;
  private correctZoneVisual?: Phaser.GameObjects.Rectangle;
  private pickCursor?: Phaser.GameObjects.Rectangle;
  private rotationFill?: Phaser.GameObjects.Rectangle;
  private stressFill?: Phaser.GameObjects.Rectangle;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private lockCore?: Phaser.GameObjects.Arc;
  private rotateZone?: Phaser.GameObjects.Rectangle;
  private lockpickGuide?: Phaser.GameObjects.Rectangle;
  private draggingPick = false;
  private rotating = false;
  private finished = false;
  private verticalValue = 50;
  private correctCenter = 50;
  private rotation = 0;
  private stress = 0;
  private elapsedMs = 0;
  private timeLimitMs = 6000;
  private vibrationTween?: Phaser.Tweens.Tween;
  private countdownEvent?: Phaser.Time.TimerEvent;
  private readonly hiddenZoneAlpha = 0.18;
  private gameOutHandler?: () => void;

  constructor(
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) {
    super(scene, config, onComplete);
  }

  override create(): void {
    const panel = this.createPanel();
    this.statusText = this.scene.add.text(0, STATUS_Y, "", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 282 },
    }).setOrigin(0.5);
    this.infoText = this.scene.add.text(0, INFO_Y, "", {
      color: "#dbeafe",
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      align: "center",
    }).setOrigin(0.5);
    const timerTrack = this.scene.add.rectangle(0, TIMER_BAR_Y, 220, 10, 0x111827, 0.92)
      .setStrokeStyle(1, 0xa855f7, 0.72);
    this.timerFill = this.scene.add.rectangle(-110, TIMER_BAR_Y, 220, 10, 0x22d3ee, 0.95).setOrigin(0, 0.5);
    const timeDisplayMode = this.config.timeDisplayMode;
    timerTrack.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerFill.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.infoText.setVisible(this.isMetricTextVisible(timeDisplayMode));

    const verticalTrack = this.scene.add.rectangle(LOCK_X, LOCK_Y, VERTICAL_BAR_WIDTH, VERTICAL_BAR_HEIGHT, 0x0f172a, 0.96)
      .setStrokeStyle(3, 0xf6d365, 0.84);
    this.correctZoneVisual = this.scene.add.rectangle(
      LOCK_X,
      LOCK_Y,
      VERTICAL_BAR_WIDTH - 6,
      Number(this.config.correctZoneHeight ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.correctZoneHeight),
      0x22c55e,
      this.hiddenZoneAlpha,
    ).setStrokeStyle(2, 0x86efac, 0.32);
    this.lockpickGlow = this.scene.add.rectangle(LOCK_X, LOCK_Y, 34, 18, 0xfacc15, 0.16).setStrokeStyle(2, 0xfef08a, 0.45);
    this.pickCursor = this.scene.add.rectangle(LOCK_X, LOCK_Y, 34, 14, 0xf8fafc, 0.95).setStrokeStyle(2, 0x1f2937, 0.9);
    const rotationTrack = this.scene.add.rectangle(44, ROTATION_BAR_Y, ROTATION_BAR_WIDTH, ROTATION_BAR_HEIGHT, 0x111827, 0.96)
      .setStrokeStyle(3, 0xf6d365, 0.82);
    this.rotationFill = this.scene.add.rectangle(
      44 - ROTATION_BAR_WIDTH / 2 + 2,
      ROTATION_BAR_Y,
      0,
      ROTATION_BAR_HEIGHT - 4,
      0x60a5fa,
      0.96,
    ).setOrigin(0, 0.5);
    const stressTrack = this.scene.add.rectangle(44, STRESS_BAR_Y, ROTATION_BAR_WIDTH, 14, 0x1f2937, 0.96)
      .setStrokeStyle(2, 0xa855f7, 0.72);
    this.stressFill = this.scene.add.rectangle(
      44 - ROTATION_BAR_WIDTH / 2 + 2,
      STRESS_BAR_Y,
      0,
      10,
      0xef4444,
      0.95,
    ).setOrigin(0, 0.5);

    this.lockCore = this.scene.add.circle(92, 18, 46, 0x111827, 0.98).setStrokeStyle(4, 0xf6d365, 0.92);
    const lockInner = this.scene.add.circle(92, 18, 24, 0x1d4ed8, 0.35).setStrokeStyle(2, 0x93c5fd, 0.5);
    this.lockpickGuide = this.scene.add.rectangle(92, 18, 88, 8, 0xf8fafc, 0.88).setStrokeStyle(1, 0x7c3aed, 0.5);
    this.rotateZone = this.scene.add.rectangle(44, HOLD_Y, HOLD_WIDTH, HOLD_HEIGHT, 0x1f2937, 0.9)
      .setStrokeStyle(4, 0xf6d365, 0.86);
    const rotateGlow = this.scene.add.rectangle(44, HOLD_Y, HOLD_WIDTH - 10, HOLD_HEIGHT - 10, 0x312e81, 0.24)
      .setStrokeStyle(2, 0x93c5fd, 0.45);
    const rotateIcon = this.addAtlasIcon(44, HOLD_Y - 10, MINIGAME_BUTTON_ATLAS.iconsSet4.key, "icon-lock", {
      scale: 0.22,
    });
    const rotateHint = this.scene.add.text(44, HOLD_Y + 14, "Tieni premuto mentre il pick e' nella zona giusta", {
      color: "#cbd5e1",
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      align: "center",
      wordWrap: { width: HOLD_WIDTH - 18 },
    }).setOrigin(0.5);

    panel.add([
      this.statusText,
      this.infoText,
      timerTrack,
      this.timerFill,
      verticalTrack,
      this.correctZoneVisual,
      this.lockpickGlow,
      this.pickCursor,
      rotationTrack,
      this.rotationFill,
      stressTrack,
      this.stressFill,
      this.lockCore,
      lockInner,
      this.lockpickGuide,
      this.rotateZone,
      rotateGlow,
      rotateIcon,
      rotateHint,
    ]);

    this.correctCenter = Phaser.Math.Between(18, 82);
    this.positionCorrectZone();
    this.elapsedMs = 0;
    this.timeLimitMs = Math.max(3000, Number(this.config.timeLimitMs ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.timeLimitMs));
    this.bindVerticalDrag();
    this.bindRotationHold();
    this.startCountdown();
    this.refreshFeedback();
  }

  override update(_time: number, delta: number): void {
    if (this.finished) {
      return;
    }

    this.elapsedMs += delta;
    const deltaSeconds = delta / 1000;
    const alignment = this.getAlignment();
    const nearRatio = this.getNearRatio();

    if (this.rotating) {
      if (alignment === "correct") {
        const rotationGain = Number(this.config.rotationSpeed ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.rotationSpeed) * deltaSeconds;
        this.rotation = Phaser.Math.Clamp(this.rotation + rotationGain, 0, 100);
        this.stress = Phaser.Math.Clamp(this.stress - Number(this.config.stressDecay ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.stressDecay) * 0.25 * deltaSeconds, 0, 100);
      } else {
        const misalignmentFactor = alignment === "near" ? 0.4 : 1;
        const rotationGain = Number(this.config.rotationSpeed ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.rotationSpeed) * 0.12 * deltaSeconds;
        this.rotation = Phaser.Math.Clamp(this.rotation + rotationGain, 0, 100);
        this.stress = Phaser.Math.Clamp(this.stress + Number(this.config.stressGain ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.stressGain) * misalignmentFactor * deltaSeconds, 0, 100);
      }
    } else {
      this.stress = Phaser.Math.Clamp(this.stress - Number(this.config.stressDecay ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.stressDecay) * deltaSeconds, 0, 100);
    }

    if (this.rotation >= 100) {
      this.finish(this.resolveSuccessGrade());
      return;
    }

    if (this.stress >= 100) {
      this.finish("fail");
      return;
    }

    if (this.getRemainingTimeMs() <= 0) {
      this.finish(this.rotation >= 85 ? "partial" : "fail");
      return;
    }

    this.refreshFeedback(nearRatio);
  }

  override destroy(): void {
    this.vibrationTween?.stop();
    this.vibrationTween = undefined;
    this.countdownEvent?.remove(false);
    this.countdownEvent = undefined;
    super.destroy();
  }

  private startCountdown(): void {
    this.countdownEvent?.remove(false);
    this.countdownEvent = this.trackTimer(this.scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (this.finished) {
          return;
        }

        this.refreshFeedback();
      },
    }));
  }

  private getRemainingTimeMs(): number {
    return Math.max(0, this.timeLimitMs - this.elapsedMs);
  }

  private bindVerticalDrag(): void {
    if (!this.pickCursor) {
      return;
    }

    this.pickCursor.setInteractive({ draggable: true });
    const dragHandler = (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number): void => {
      if (this.finished) {
        return;
      }
      const minY = LOCK_Y - VERTICAL_BAR_HEIGHT / 2;
      const maxY = LOCK_Y + VERTICAL_BAR_HEIGHT / 2;
      const clampedY = Phaser.Math.Clamp(dragY, minY, maxY);
      this.verticalValue = Phaser.Math.Clamp(((clampedY - minY) / VERTICAL_BAR_HEIGHT) * 100, 0, 100);
      this.pickCursor?.setY(clampedY);
      this.lockpickGlow?.setY(clampedY);
      this.refreshFeedback();
    };
    const dragStartHandler = (): void => {
      this.draggingPick = true;
    };
    const dragEndHandler = (): void => {
      this.draggingPick = false;
    };

    this.scene.input.setDraggable(this.pickCursor, true);
    this.pickCursor.on("drag", dragHandler as never);
    this.pickCursor.on("dragstart", dragStartHandler as never);
    this.pickCursor.on("dragend", dragEndHandler as never);
    this.trackDisposer(() => {
      this.pickCursor?.off("drag", dragHandler as never);
      this.pickCursor?.off("dragstart", dragStartHandler as never);
      this.pickCursor?.off("dragend", dragEndHandler as never);
      this.pickCursor?.disableInteractive(); 
    });
  }

  private bindRotationHold(): void {
    if (!this.rotateZone) {
      return;
    }

    this.rotateZone.setInteractive();
    const handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
      pointer.event?.preventDefault?.();
      if (this.finished) {
        return;
      }
      this.rotating = true;
      this.refreshFeedback();
    };
    const handlePointerUp = (): void => {
      this.rotating = false;
      this.refreshFeedback();
    };
    const handlePointerOut = (): void => {
      this.rotating = false;
      this.refreshFeedback();
    };
    const handleGameOut = (): void => {
      this.rotating = false;
      this.refreshFeedback();
    };
    this.gameOutHandler = handleGameOut;

    this.rotateZone.on("pointerdown", handlePointerDown as never);
    this.rotateZone.on("pointerup", handlePointerUp as never);
    this.rotateZone.on("pointerout", handlePointerOut as never);
    this.scene.input.on("pointerup", handlePointerUp);
    this.scene.input.on("pointerupoutside", handlePointerUp);
    this.scene.input.on("gameout", handleGameOut);
    this.trackDisposer(() => {
      this.rotateZone?.off("pointerdown", handlePointerDown as never);
      this.rotateZone?.off("pointerup", handlePointerUp as never);
      this.rotateZone?.off("pointerout", handlePointerOut as never);
      this.rotateZone?.disableInteractive();
      this.scene.input.off("pointerup", handlePointerUp);
      this.scene.input.off("pointerupoutside", handlePointerUp);
      if (this.gameOutHandler) {
        this.scene.input.off("gameout", this.gameOutHandler);
      }
      this.gameOutHandler = undefined;
    });
  }

  private positionCorrectZone(): void {
    const minY = LOCK_Y - VERTICAL_BAR_HEIGHT / 2;
    const zoneY = minY + (this.correctCenter / 100) * VERTICAL_BAR_HEIGHT;
    this.correctZoneVisual?.setY(zoneY);
  }

  private getAlignment(): "correct" | "near" | "far" {
    const halfZone = Number(this.config.correctZoneHeight ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.correctZoneHeight) / 2;
    const distance = Math.abs(this.verticalValue - this.correctCenter);
    if (distance <= halfZone / 2) {
      return "correct";
    }
    if (distance <= halfZone) {
      return "near";
    }
    return "far";
  }

  private getNearRatio(): number {
    const halfZone = Math.max(1, Number(this.config.correctZoneHeight ?? DEFAULT_LOCKPICK_DUAL_AXIS_CONFIG.defaults.correctZoneHeight) / 2);
    const distance = Math.abs(this.verticalValue - this.correctCenter);
    return Phaser.Math.Clamp(1 - distance / (halfZone * 1.8), 0, 1);
  }

  private refreshFeedback(nearRatio = this.getNearRatio()): void {
    const alignment = this.getAlignment();
    const stressRatio = Phaser.Math.Clamp(this.stress / 100, 0, 1);
    const rotationRatio = Phaser.Math.Clamp(this.rotation / 100, 0, 1);
    const remainingMs = this.getRemainingTimeMs();
    this.timerFill?.setSize(220 * Phaser.Math.Clamp(remainingMs / Math.max(1, this.timeLimitMs), 0, 1), 10);

    this.rotationFill?.setSize((ROTATION_BAR_WIDTH - 4) * rotationRatio, ROTATION_BAR_HEIGHT - 4);
    this.stressFill?.setSize((ROTATION_BAR_WIDTH - 4) * stressRatio, 10);
    this.lockpickGuide?.setAngle(rotationRatio * 72);

    if (this.infoText) {
      this.infoText.setText(`Rotazione ${this.rotation.toFixed(0)}% | Stress ${this.stress.toFixed(0)}% | ${(remainingMs / 1000).toFixed(1)}s`);
    }

    if (alignment === "correct") {
      this.statusText?.setText("").setColor("#bbf7d0");
      this.lockpickGlow?.setFillStyle(0x22c55e, 0.24).setStrokeStyle(2, 0xfacc15, 0.86);
      this.pickCursor?.setFillStyle(0xfef08a, 1);
      this.correctZoneVisual?.setFillStyle(0x16a34a, 0.22).setStrokeStyle(2, 0xbbf7d0, 0.52);
      this.stopVibration();
    } else if (alignment === "near") {
      this.statusText?.setText("").setColor("#fde68a");
      this.lockpickGlow?.setFillStyle(0xf59e0b, 0.18 + nearRatio * 0.14).setStrokeStyle(2, 0xfef08a, 0.58);
      this.pickCursor?.setFillStyle(0xf8fafc, 1);
      this.correctZoneVisual?.setFillStyle(0x22c55e, this.hiddenZoneAlpha).setStrokeStyle(2, 0x86efac, 0.36);
      this.stopVibration();
    } else {
      this.statusText?.setText("").setColor("#fca5a5");
      this.lockpickGlow?.setFillStyle(0xef4444, 0.15).setStrokeStyle(2, 0xfca5a5, 0.4);
      this.pickCursor?.setFillStyle(0xf8fafc, 1);
      this.correctZoneVisual?.setFillStyle(0x22c55e, this.hiddenZoneAlpha).setStrokeStyle(2, 0x86efac, 0.24);
      if (this.rotating) {
        this.startVibration();
      } else {
        this.stopVibration();
      }
    }

    if (this.rotating && alignment !== "correct") {
      this.lockCore?.setStrokeStyle(4, 0xef4444, 0.85);
    } else if (this.rotating) {
      this.lockCore?.setStrokeStyle(4, 0xf6d365, 0.95);
    } else {
      this.lockCore?.setStrokeStyle(4, 0xf6d365, 0.82);
    }
  }

  private resolveSuccessGrade(): MinigameResultGrade {
    if (this.stress < 15) {
      return "perfect";
    }
    if (this.stress < 60) {
      return "success";
    }
    return "partial";
  }

  private finish(grade: MinigameResultGrade): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.rotating = false;
    this.draggingPick = false;
    this.stopVibration();
    this.countdownEvent?.remove(false);
    this.countdownEvent = undefined;
    const result = this.buildResult(grade);
    this.completeWithDelay(result, 380);
  }

  private buildResult(grade: MinigameResultGrade): MinigameResult {
    const baseScore = 110
      + this.config.heroStats.dexterity * 7
      + this.config.heroStats.intelligence * 5
      + Math.round(this.rotation * 1.6)
      - Math.round(this.stress * 0.8);

    if (grade === "perfect") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.max(12, Math.round(baseScore * 1.45)),
        usedSkill: "dexterity",
        fatigueGained: 4,
        rewardMultiplier: 1.6,
        damageTaken: 0,
      };
    }
    if (grade === "success") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.max(12, Math.round(baseScore * 1.1)),
        usedSkill: "dexterity",
        fatigueGained: 3,
        rewardMultiplier: 1.2,
        damageTaken: 0,
      };
    }
    if (grade === "partial") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.max(10, Math.round(baseScore * 0.72)),
        usedSkill: "dexterity",
        fatigueGained: 2,
        rewardMultiplier: 0.75,
        damageTaken: 0,
      };
    }

    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade,
      score: Math.max(8, Math.round(baseScore * 0.22)),
      usedSkill: "dexterity",
      fatigueGained: 1,
      rewardMultiplier: 0,
      damageTaken: 0,
    };
  }

  private startVibration(): void {
    if (!this.lockpickGuide || this.vibrationTween) {
      return;
    }
    this.vibrationTween = this.trackTween(this.scene.tweens.add({
      targets: this.lockpickGuide,
      x: { from: 90, to: 94 },
      duration: 42,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }));
  }

  private stopVibration(): void {
    this.vibrationTween?.stop();
    this.vibrationTween = undefined;
    this.lockpickGuide?.setX(92);
  }
}
