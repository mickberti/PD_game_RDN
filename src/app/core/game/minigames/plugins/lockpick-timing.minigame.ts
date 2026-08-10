import Phaser from "phaser";
import { MinigameResult, MinigameResultGrade } from "../minigame.model";
import { MinigameResolverService } from "../minigame-resolver.service";
import { MINIGAME_BUTTON_ATLAS } from "../../phaser/config/game-atlas.config";
import { BaseMinigame } from "../base-minigame";
import { DEFAULT_LOCKPICK_TIMING_CONFIG } from "./lockpick-timing.config";

const { layout: LOCKPICK_LAYOUT, defaultZones: DEFAULT_ZONES } = DEFAULT_LOCKPICK_TIMING_CONFIG;
const LOCKPICK_BAR_Y = LOCKPICK_LAYOUT.barY;
const LOCKPICK_TEXT_Y = LOCKPICK_LAYOUT.textY;
const LOCKPICK_STATUS_Y = LOCKPICK_LAYOUT.statusY;
const LOCKPICK_BUTTON_X = LOCKPICK_LAYOUT.buttonX;
const LOCKPICK_BUTTON_Y = LOCKPICK_LAYOUT.buttonY;
const LOCKPICK_BUTTON_WIDTH = LOCKPICK_LAYOUT.buttonWidth;
const LOCKPICK_BUTTON_HEIGHT = LOCKPICK_LAYOUT.buttonHeight;

export class LockpickTimingMinigame extends BaseMinigame {
  private readonly resolver = new MinigameResolverService();
  private readonly barWidth = LOCKPICK_LAYOUT.barWidth;
  private actionButton?: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Rectangle;
  private markerTween?: Phaser.Tweens.Tween;
  private lockText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private requiredLocks = 1;
  private unlockedLocks = 0;
  private failures = 0;
  private perfectLocks = 0;
  private resolved = false;
  private inputLocked = false;

  create(): void {
    const panel = this.createPanel();
    const zones = this.config.zones ?? DEFAULT_ZONES;
    this.requiredLocks = Math.max(1, Number(this.config.requiredLocks ?? 1));

    const bar = this.scene.add.rectangle(0, LOCKPICK_BAR_Y, this.barWidth, 10, 0x1e3a8a, 1).setStrokeStyle(1, 0xf6d365, 0.8);
    const partial = this.scene.add.rectangle(0, LOCKPICK_BAR_Y, zones.partial, 10, 0x9333ea, 0.75);
    const success = this.scene.add.rectangle(0, LOCKPICK_BAR_Y, zones.success, 10, 0x22c55e, 0.92);
    const perfect = this.scene.add.rectangle(0, LOCKPICK_BAR_Y, zones.perfect, 10, 0xfacc15, 1);
    this.marker = this.scene.add.rectangle(-this.barWidth / 2, LOCKPICK_BAR_Y, 12, 20, 0xffffff, 1).setStrokeStyle(2, 0x111827, 1);
    this.lockText = this.scene.add.text(0, LOCKPICK_TEXT_Y, "", {
      color: "#f8fafc",
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.statusText = this.scene.add.text(0, LOCKPICK_STATUS_Y, "Sblocca tutte le serrature", {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      align: "center",
    }).setOrigin(0.5);
    const button = this.createActionButton("SCASSINA", LOCKPICK_BUTTON_X, LOCKPICK_BUTTON_Y, LOCKPICK_BUTTON_WIDTH, LOCKPICK_BUTTON_HEIGHT, {
      atlasKey: MINIGAME_BUTTON_ATLAS.iconsSet4.key,
      frameName: "icon-lock",
      iconScale: 0.22,
    });
    this.actionButton = button;

    panel.add([bar, partial, success, perfect, this.marker, this.lockText, this.statusText, button]);
    this.bindPointer(button, () => this.resolveAttempt());

    this.refreshLockText();
    this.startMarkerTween();
  }

  private startMarkerTween(): void {
    this.markerTween?.stop();
    const duration = Math.round((this.barWidth / Math.max(1, this.config.cursorSpeed ?? 200)) * 1500);
    this.marker.setX(-this.barWidth / 2);
    this.markerTween = this.trackTween(this.scene.tweens.add({
      targets: this.marker,
      x: this.barWidth / 2,
      duration: Math.max(900, duration),
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    }));
  }

  private resolveAttempt(): void {
    if (this.resolved || this.inputLocked) {
      return;
    }

    this.inputLocked = true;
    this.markerTween?.stop();
    const zones = this.config.zones ?? DEFAULT_ZONES;
    const distance = Math.abs(this.marker.x);

    if (distance <= zones.perfect / 2) {
      this.unlockedLocks += 1;
      this.perfectLocks += 1;
      this.statusText?.setText("Serratura perfetta!");
      this.marker.setFillStyle(0xfacc15, 1);
      this.actionButton && this.flashButtonVisual(this.actionButton, 0xfacc15);
    } else if (distance <= zones.success / 2) {
      this.unlockedLocks += 1;
      this.statusText?.setText("Serratura aperta");
      this.marker.setFillStyle(0x22c55e, 1);
      this.actionButton && this.flashButtonVisual(this.actionButton, 0x22c55e);
    } else if (distance <= zones.partial / 2) {
      this.failures += 1;
      this.statusText?.setText("Quasi... riprova");
      this.marker.setFillStyle(0xf59e0b, 1);
      this.actionButton && this.flashButtonVisual(this.actionButton, 0xf59e0b);
    } else {
      this.failures += 1;
      this.statusText?.setText("Grimaldello scivolato");
      this.marker.setFillStyle(0xef4444, 1);
      this.actionButton && this.flashButtonVisual(this.actionButton, 0xef4444);
    }

    this.refreshLockText();
    this.trackTween(this.scene.tweens.add({
      targets: this.marker,
      scaleX: 1.16,
      scaleY: 1.16,
      yoyo: true,
      duration: 130,
      ease: "Sine.easeOut",
    }));

    if (this.unlockedLocks >= this.requiredLocks) {
      const baseGrade: MinigameResultGrade = this.perfectLocks >= this.requiredLocks ? "perfect" : "success";
      this.finish(this.resolver.promoteSuccessByLuck(baseGrade, this.config.heroStats));
      return;
    }

    if (this.failures >= Math.max(1, Number(this.config.maxFailures ?? this.requiredLocks + 1))) {
      this.finish(this.unlockedLocks >= Math.ceil(this.requiredLocks / 2) ? "partial" : "fail");
      return;
    }

    this.trackTimer(this.scene.time.delayedCall(260, () => {
      this.inputLocked = false;
      this.marker.setFillStyle(0xffffff, 1);
      this.startMarkerTween();
    }));
  }

  private finish(grade: MinigameResultGrade): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    this.inputLocked = true;
    this.showGradeFeedback(grade);
    this.completeWithDelay(this.buildResult(grade), 420);
  }

  private showGradeFeedback(grade: MinigameResultGrade): void {
    const feedback = this.getGradePresentation(grade);
    this.marker.setFillStyle(feedback.color, 1);
    this.statusText?.setText(feedback.label).setColor(feedback.textColor);
  }

  private buildResult(grade: MinigameResultGrade): MinigameResult {
    const baseReward = Math.max(1, Number(this.config.event.rewardValue ?? 12));
    const baseScore = 95 + baseReward * 4 + this.requiredLocks * 28 + this.config.heroStats.intelligence * 5;

    if (grade === "perfect") {
      return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore * 1.55), usedSkill: "dexterity", fatigueGained: 2, rewardMultiplier: 1.75, damageTaken: 0 };
    }
    if (grade === "success") {
      return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore * 1.1), usedSkill: "dexterity", fatigueGained: 2, rewardMultiplier: 1.2, damageTaken: 0 };
    }
    if (grade === "partial") {
      return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore * 0.58), usedSkill: "dexterity", fatigueGained: 3, rewardMultiplier: 0.6, damageTaken: 0 };
    }

    return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore * 0.18), usedSkill: "dexterity", fatigueGained: 4, rewardMultiplier: 0.1, damageTaken: 0 };
  }

  private refreshLockText(): void {
    this.lockText?.setText(`Serrature ${this.unlockedLocks}/${this.requiredLocks} - Errori ${this.failures}`);
  }

  private getGradePresentation(grade: MinigameResultGrade): { label: string; color: number; textColor: string } {
    switch (grade) {
      case "perfect": return { label: "Scrigno aperto perfettamente!", color: 0xfacc15, textColor: "#fde68a" };
      case "success": return { label: "Scrigno aperto", color: 0x22c55e, textColor: "#bbf7d0" };
      case "partial": return { label: "Apertura parziale", color: 0xf59e0b, textColor: "#fde68a" };
      default: return { label: "Serratura bloccata", color: 0xef4444, textColor: "#fca5a5" };
    }
  }
}
