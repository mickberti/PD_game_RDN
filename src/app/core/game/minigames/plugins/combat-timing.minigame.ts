import Phaser from "phaser";
import { HeroMinigameStats } from "../game-event.model";
import { CombatSequenceAction, MinigameConfig, MinigameResult, MinigameResultGrade } from "../minigame.model";
import { MinigameResolverService } from "../minigame-resolver.service";
import { GAME_ATLAS } from "../../phaser/config/game-atlas.config";
import { BaseMinigame } from "../base-minigame";
import { DEFAULT_COMBAT_TIMING_CONFIG } from "./combat-timing.config";

type PhaseOutcome = {
  action: CombatSequenceAction;
  grade: MinigameResultGrade;
};

const { layout: COMBAT_TIMING_LAYOUT, buttonX: COMBAT_BUTTON_X, defaultZones: DEFAULT_ZONES } = DEFAULT_COMBAT_TIMING_CONFIG;
const COMBAT_BAR_Y = COMBAT_TIMING_LAYOUT.barY;
const CHARGE_BAR_HEIGHT = COMBAT_TIMING_LAYOUT.barHeight;
const CHARGE_BAR_WIDTH = COMBAT_TIMING_LAYOUT.barWidth;
const COMBAT_ACTION_TEXT_Y = COMBAT_TIMING_LAYOUT.actionTextY;
const COMBAT_STATUS_TEXT_Y = COMBAT_TIMING_LAYOUT.statusTextY;
const COMBAT_BUTTON_Y = COMBAT_TIMING_LAYOUT.buttonY;
const COMBAT_BUTTON_WIDTH = COMBAT_TIMING_LAYOUT.buttonWidth;
const COMBAT_BUTTON_HEIGHT = COMBAT_TIMING_LAYOUT.buttonHeight;

export class CombatTimingMinigame extends BaseMinigame {
  private readonly resolver = new MinigameResolverService();
  private readonly phaseOutcomes: PhaseOutcome[] = [];
  private marker!: Phaser.GameObjects.Rectangle;
  private markerTween?: Phaser.Tweens.Tween;
  private statusText?: Phaser.GameObjects.Text;
  private actionText?: Phaser.GameObjects.Text;
  private readonly actionButtons = new Map<CombatSequenceAction, Phaser.GameObjects.Container>();
  private currentAction: CombatSequenceAction = "attack";
  private resolved = false;
  private inputLocked = false;

  constructor(
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) {
    super(scene, config, onComplete);
  }

  create(): void {
    const panel = this.createPanel();
    const combatActors = this.createCombatActors({ y: -38, heroOffsetX: -62, monsterOffsetX: 62, heroMaxSize: 78, monsterMaxSize: 78 });
    if (combatActors.length > 0) {
      panel.add(combatActors);
    }
    const zones = this.config.zones ?? DEFAULT_ZONES;

    const bar = this.scene.add.rectangle(0, COMBAT_BAR_Y, CHARGE_BAR_WIDTH, CHARGE_BAR_HEIGHT, 0x7f1d1d, 1).setStrokeStyle(1, 0xf6d365, 0.85);
    const partial = this.scene.add.rectangle(0, COMBAT_BAR_Y, zones.partial, CHARGE_BAR_HEIGHT, 0xf59e0b, 0.86);
    const success = this.scene.add.rectangle(0, COMBAT_BAR_Y, zones.success, CHARGE_BAR_HEIGHT, 0x22c55e, 0.94);
    const perfect = this.scene.add.rectangle(0, COMBAT_BAR_Y, zones.perfect, CHARGE_BAR_HEIGHT, 0xfacc15, 1);
    this.marker = this.scene.add.rectangle(-CHARGE_BAR_WIDTH / 2, COMBAT_BAR_Y, CHARGE_BAR_HEIGHT + 2, 20, 0xf8fafc, 1).setStrokeStyle(2, 0x1f2937, 1);

    this.actionText = this.scene.add.text(0, COMBAT_ACTION_TEXT_Y, "", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.statusText = this.scene.add.text(0, COMBAT_STATUS_TEXT_Y, "Premi il pulsante corretto nel timing giusto", {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      align: "center",
      wordWrap: { width: 270 },
    }).setOrigin(0.5);

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
      this.bindPointer(button, () => this.resolvePhase(buttonConfig.action));
    });

    panel.add([bar, partial, success, perfect, this.marker, this.actionText, this.statusText]);
    this.startPhase();
  }

  private startPhase(): void {
    if (this.isCombatEncounterFinished()) {
      this.finishSequence();
      return;
    }

    this.currentAction = this.pickCombatSequenceAction();
    this.inputLocked = false;
    this.statusText?.setText(`Round ${this.getCombatEncounterTotals().roundsResolved + 1}`);
    this.actionText?.setText(this.getActionLabel(this.currentAction)).setColor(this.getActionColor(this.currentAction));
    this.setCombatActorsIdle();

    const duration = Math.round((CHARGE_BAR_WIDTH / Math.max(1, this.config.cursorSpeed ?? 220)) * 1000);
    this.marker.setFillStyle(0xf8fafc, 1);
    this.marker.setX(-CHARGE_BAR_WIDTH / 2);
    this.markerTween?.stop();
    this.markerTween = this.trackTween(this.scene.tweens.add({
      targets: this.marker,
      x: CHARGE_BAR_WIDTH / 2,
      duration: Math.max(620, duration),
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    }));
  }

  private resolvePhase(selectedAction: CombatSequenceAction): void {
    if (this.resolved || this.inputLocked) {
      return;
    }

    this.inputLocked = true;
    this.markerTween?.stop();
    const expectedAction = this.currentAction;
    const grade = selectedAction === this.getRequiredInputAction(expectedAction)
      ? this.resolveTimingGrade()
      : "fail";

    this.phaseOutcomes.push({ action: expectedAction, grade });
    const sequenceDurationMs = this.playCombatResolution(expectedAction, grade);
    this.resolveCombatEncounterPhase(expectedAction, grade);
    this.flashActionButton(selectedAction, selectedAction === expectedAction ? 0x22c55e : 0xef4444);
    this.showPhaseFeedback(expectedAction, grade);
    if (this.isCombatEncounterFinished()) {
      this.finishSequence();
      return;
    }

    this.trackTimer(this.scene.time.delayedCall(sequenceDurationMs, () => {
      if (this.resolved) {
        return;
      }
      this.startPhase();
    }));
  }

  private resolveTimingGrade(): MinigameResultGrade {
    const centerDistance = Math.abs(this.marker.x);
    const zones = this.config.zones ?? DEFAULT_ZONES;

    if (centerDistance <= zones.perfect / 2) return "perfect";
    if (centerDistance <= zones.success / 2) return "success";
    if (centerDistance <= zones.partial / 2) return "partial";
    return "fail";
  }

  private finishSequence(): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    this.markerTween?.stop();
    const result = this.buildResult(this.phaseOutcomes, this.config.heroStats);
    this.showFinalFeedback(result.grade);
    this.completeWithDelay(result, 420);
  }

  private buildResult(outcomes: PhaseOutcome[], heroStats: HeroMinigameStats): MinigameResult {
    let offensivePower = 0;
    let totalPoints = 0;

    outcomes.forEach((outcome) => {
      const phaseValue = this.getPhaseValue(outcome.grade);
      totalPoints += phaseValue;

      const multiplier = outcome.action === "special" ? 1.35 : 1;
      if (outcome.grade === "perfect") offensivePower += 2.2 * multiplier;
      else if (outcome.grade === "success") offensivePower += 1.55 * multiplier;
      else if (outcome.grade === "partial") offensivePower += 0.8 * multiplier;
    });

    const totals = this.getCombatEncounterTotals();
    const average = outcomes.length > 0 ? totalPoints / outcomes.length : 0;
    const landedOffense = offensivePower > 0;
    let grade: MinigameResultGrade = "fail";

    if (this.didHeroWinCombatEncounter() && average >= 3.2 && totals.heroDamageTaken === 0) grade = "perfect";
    else if (this.didHeroWinCombatEncounter() && landedOffense) grade = "success";
    else if (landedOffense || totals.heroDamageTaken < totals.monsterDamageTaken) grade = "partial";

    grade = this.resolver.promoteSuccessByLuck(grade, this.config.heroStats);

    const baseScore = 110 + heroStats.strength * 6 + heroStats.dexterity * 5 + this.config.event.difficulty * 14;
    const score = Math.max(12, Math.round(baseScore + offensivePower * 48 + totals.monsterDamageTaken * 10 - totals.heroDamageTaken * 2));

    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade,
      score,
      usedSkill: "dexterity",
      fatigueGained: grade === "perfect" ? 4 : grade === "success" ? 3 : grade === "partial" ? 2 : 1,
      rewardMultiplier: grade === "perfect" ? 1.5 : grade === "success" ? 1 : grade === "partial" ? 0.75 : 0.25,
      damageTaken: totals.heroDamageTaken,
    };
  }

  private getPhaseValue(grade: MinigameResultGrade): number {
    switch (grade) {
      case "perfect": return 4;
      case "success": return 3;
      case "partial": return 2;
      default: return 0;
    }
  }

  private showPhaseFeedback(action: CombatSequenceAction, grade: MinigameResultGrade): void {
    const feedback = this.getGradePresentation(grade);
    this.marker.setFillStyle(feedback.color, 1);
    this.statusText?.setText(`${this.getActionLabel(action)}: ${feedback.label}`).setColor(feedback.textColor);
  }

  private showFinalFeedback(grade: MinigameResultGrade): void {
    const feedback = this.getGradePresentation(grade);
    this.statusText?.setText(feedback.label).setColor(feedback.textColor);
    this.actionText?.setText("Esito scontro").setColor(feedback.textColor);
  }

  private getGradePresentation(grade: MinigameResultGrade): { label: string; color: number; textColor: string } {
    switch (grade) {
      case "perfect": return { label: "Perfetto!", color: 0xfacc15, textColor: "#fde68a" };
      case "success": return { label: "Riuscito", color: 0x22c55e, textColor: "#bbf7d0" };
      case "partial": return { label: "Parziale", color: 0xf59e0b, textColor: "#fde68a" };
      default: return { label: "Fallito", color: 0xef4444, textColor: "#fca5a5" };
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
