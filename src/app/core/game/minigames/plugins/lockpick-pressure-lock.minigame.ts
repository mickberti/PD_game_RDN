import Phaser from "phaser";
import { HeroMinigameStats, SkillType } from "../game-event.model";
import { BaseMinigame } from "../base-minigame";
import { MinigameConfig, MinigameResult, MinigameResultGrade } from "../minigame.model";
import { MinigameResolverService } from "../minigame-resolver.service";
import { MINIGAME_BUTTON_ATLAS } from "../../phaser/config/game-atlas.config";
import { DEFAULT_PRESSURE_LOCK_CONFIG } from "./lockpick-pressure-lock.config";

type PressureLockDecorationApi = {
  playfield: Phaser.GameObjects.Container;
  scene: Phaser.Scene;
  width: number;
  height: number;
  registerObject: (object: Phaser.GameObjects.GameObject) => void;
};

type PressureLockDecorationHandle = {
  onProgress?: (progress: number, goal: number) => void;
  onUpdate?: (elapsedMs: number, progress: number, goal: number) => void;
  destroy?: () => void;
};

type PressureLockDefinition = {
  actionLabel: string;
  objectiveLabel: string;
  statusLabel: string;
  usedSkill: SkillType;
  accentColor: number;
  secondaryColor: number;
  progressColor: number;
  timerColor: number;
  objectiveCount: (config: MinigameConfig) => number;
  timeLimitMs: (config: MinigameConfig) => number;
  partialThreshold?: number;
  perfectRemainingRatio?: number;
  renderDecoration?: (api: PressureLockDecorationApi) => PressureLockDecorationHandle | void;
};

const { layout: PRESSURE_LAYOUT, defaults: PRESSURE_DEFAULTS } = DEFAULT_PRESSURE_LOCK_CONFIG;
const PLAYFIELD_WIDTH = PRESSURE_LAYOUT.playfieldWidth;
const PLAYFIELD_HEIGHT = PRESSURE_LAYOUT.playfieldHeight;
const STATUS_Y = PRESSURE_LAYOUT.statusY;
const COUNTER_Y = PRESSURE_LAYOUT.counterY;
const PROGRESS_Y = PRESSURE_LAYOUT.progressY;
const TIMER_Y = PRESSURE_LAYOUT.timerY;
const BUTTON_Y = PRESSURE_LAYOUT.buttonY;
const BUTTON_WIDTH = PRESSURE_LAYOUT.buttonWidth;
const BUTTON_HEIGHT = PRESSURE_LAYOUT.buttonHeight;
const BAR_WIDTH = PRESSURE_LAYOUT.barWidth;

class PressureLockPrototypeMinigame extends BaseMinigame {
  private readonly resolver = new MinigameResolverService();
  private readonly decorationObjects: Phaser.GameObjects.GameObject[] = [];
  private decorationHandle?: PressureLockDecorationHandle;
  private statusText?: Phaser.GameObjects.Text;
  private counterText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private progressFill?: Phaser.GameObjects.Rectangle;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private progress = 0;
  private elapsedMs = 0;
  private resolved = false;
  private goal = 1;
  private timeLimitMs: number = PRESSURE_DEFAULTS.timeLimitMs;

  protected getDefinition(): PressureLockDefinition {
    return {
      actionLabel: "PRESSIONE",
      objectiveLabel: "Impulsi",
      statusLabel: "Prototype hook: pressure lock con anelli concentrici e feedback standard.",
      usedSkill: "intelligence",
      accentColor: 0x22c55e,
      secondaryColor: 0x14532d,
      progressColor: 0x4ade80,
      timerColor: 0xfacc15,
      objectiveCount: (config) => Math.max(3, 3 + Math.floor(config.event.difficulty / 2)),
      timeLimitMs: (config) => 3400 + config.heroStats.intelligence * 78 - config.event.difficulty * 50,
      partialThreshold: PRESSURE_DEFAULTS.partialThreshold,
      perfectRemainingRatio: PRESSURE_DEFAULTS.perfectRemainingRatio,
      renderDecoration: ({ scene, registerObject }) => {
        const outer = scene.add.circle(0, 0, 62, 0x14532d, 0.45).setStrokeStyle(4, 0xf6d365, 0.9);
        const middle = scene.add.circle(0, 0, 42, 0x166534, 0.5).setStrokeStyle(3, 0x4ade80, 0.85);
        const inner = scene.add.circle(0, 0, 18, 0x4ade80, 0.9).setStrokeStyle(2, 0xffffff, 0.95);
        const pulse = scene.add.circle(0, 0, 12, 0xffffff, 0.2).setStrokeStyle(2, 0xffffff, 0.6);
        [outer, middle, inner, pulse].forEach(registerObject);

        return {
          onProgress: (progress) => {
            inner.setScale(1 + progress * 0.08);
            inner.setFillStyle(progress % 2 === 0 ? 0x4ade80 : 0xfacc15, 0.95);
          },
          onUpdate: (elapsedMs) => {
            const oscillation = (Math.sin(elapsedMs / 190) + 1) / 2;
            pulse.setScale(1 + oscillation * 4.4);
            pulse.setAlpha(0.1 + oscillation * 0.42);
            outer.setRotation(elapsedMs / 1500);
            middle.setRotation(-elapsedMs / 1100);
          },
        };
      },
    };
  }

  override init(): void {
    const definition = this.getDefinition();
    this.goal = Math.max(1, Math.round(definition.objectiveCount(this.config)));
    this.timeLimitMs = Math.max(PRESSURE_DEFAULTS.minimumTimeLimitMs, Math.round(definition.timeLimitMs(this.config)));
    this.progress = 0;
    this.elapsedMs = 0;
    this.resolved = false;
  }

  override create(): void {
    const definition = this.getDefinition();
    const panel = this.createPanel();
    const playfield = this.scene.add.container(0, -24);
    const playfieldFrame = this.scene.add.rectangle(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT, 0x160f2f, 0.98)
      .setStrokeStyle(3, 0xf6d365, 0.95);
    const playfieldGlow = this.scene.add.rectangle(0, 0, PLAYFIELD_WIDTH - 14, PLAYFIELD_HEIGHT - 14, definition.secondaryColor, 0.22)
      .setStrokeStyle(2, definition.accentColor, 0.42);
    const playfieldHotspot = this.scene.add.rectangle(0, 0, PLAYFIELD_WIDTH - 12, PLAYFIELD_HEIGHT - 12, 0xffffff, 0.001);

    this.statusText = this.scene.add.text(0, STATUS_Y, definition.statusLabel, {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      align: "center",
      wordWrap: { width: 272 },
    }).setOrigin(0.5);
    this.counterText = this.scene.add.text(0, COUNTER_Y, "", {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      align: "center",
    }).setOrigin(0.5);
    this.timerText = this.scene.add.text(0, TIMER_Y + 18, "", {
      color: "#fde68a",
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      align: "center",
    }).setOrigin(0.5);
    const timeDisplayMode = this.config.timeDisplayMode;

    const progressTrack = this.scene.add.rectangle(0, PROGRESS_Y, BAR_WIDTH, 12, 0x2a1a46, 0.9)
      .setStrokeStyle(2, 0xf6d365, 0.8);
    this.progressFill = this.scene.add.rectangle(-BAR_WIDTH / 2, PROGRESS_Y, 0, 12, definition.progressColor, 1)
      .setOrigin(0, 0.5);
    const timerTrack = this.scene.add.rectangle(0, TIMER_Y, BAR_WIDTH, 10, 0x1f2937, 0.92)
      .setStrokeStyle(1, 0xa855f7, 0.72);
    this.timerFill = this.scene.add.rectangle(-BAR_WIDTH / 2, TIMER_Y, BAR_WIDTH, 10, definition.timerColor, 0.96)
      .setOrigin(0, 0.5);
    timerTrack.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerFill.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerText.setVisible(this.isMetricTextVisible(timeDisplayMode));

    const button = this.createActionButton(definition.actionLabel, 0, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, {
      atlasKey: MINIGAME_BUTTON_ATLAS.iconsSet4.key,
      frameName: "icon-lock",
      iconScale: 0.22,
    });

    panel.add([
      playfield,
      this.statusText,
      this.counterText,
      this.timerText,
      progressTrack,
      this.progressFill,
      timerTrack,
      this.timerFill,
      button,
    ]);
    playfield.add([playfieldFrame, playfieldGlow, playfieldHotspot]);

    this.bindPointer(playfieldHotspot, () => this.registerProgress());
    this.bindPointer(button, () => this.registerProgress());

    const decorationApi: PressureLockDecorationApi = {
      playfield,
      scene: this.scene,
      width: PLAYFIELD_WIDTH,
      height: PLAYFIELD_HEIGHT,
      registerObject: (object) => {
        playfield.add(object);
        this.decorationObjects.push(object);
      },
    };

    const decorationHandle = definition.renderDecoration?.(decorationApi);
    this.decorationHandle = decorationHandle ?? undefined;
    if (this.decorationHandle?.destroy) {
      this.trackDisposer(() => this.decorationHandle?.destroy?.());
    }

    this.elapsedMs = 0;
    this.refreshProgressVisuals();
    this.refreshTimerVisuals();
  }

  override update(_time: number, delta: number): void {
    if (this.resolved) {
      return;
    }

    this.elapsedMs += delta;
    const elapsedMs = Math.max(0, this.elapsedMs);
    this.refreshTimerVisuals();
    this.decorationHandle?.onUpdate?.(elapsedMs, this.progress, this.goal);

    if (elapsedMs >= this.timeLimitMs) {
      this.finishWithGrade(this.resolveGrade());
    }
  }

  override destroy(): void {
    this.decorationHandle = undefined;
    this.decorationObjects.length = 0;
    super.destroy();
  }

  protected registerProgress(step = 1): void {
    if (this.resolved) {
      return;
    }

    this.progress = Phaser.Math.Clamp(this.progress + step, 0, this.goal);
    this.refreshProgressVisuals();
    this.decorationHandle?.onProgress?.(this.progress, this.goal);

    if (this.progress >= this.goal) {
      this.finishWithGrade(this.resolveGrade());
    }
  }

  protected finishWithGrade(grade: MinigameResultGrade): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    const feedback = this.getGradePresentation(grade);
    this.statusText?.setText(feedback.label).setColor(feedback.textColor);
    this.counterText?.setColor(feedback.textColor);
    this.timerText?.setColor(feedback.textColor);
    this.completeWithDelay(this.buildResult(grade), 340);
  }

  private refreshProgressVisuals(): void {
    const definition = this.getDefinition();
    const progressRatio = Phaser.Math.Clamp(this.progress / Math.max(1, this.goal), 0, 1);
    this.progressFill?.setSize(BAR_WIDTH * progressRatio, 12);
    this.counterText?.setText(`${definition.objectiveLabel}: ${this.progress}/${this.goal}`);
    this.trackTween(this.scene.tweens.add({
      targets: [this.progressFill, this.counterText].filter(Boolean),
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 90,
      yoyo: true,
      ease: "Quad.easeOut",
    }));
  }

  private refreshTimerVisuals(): void {
    const remainingMs = Math.max(0, this.timeLimitMs - this.elapsedMs);
    const remainingRatio = Phaser.Math.Clamp(remainingMs / Math.max(1, this.timeLimitMs), 0, 1);
    this.timerFill?.setSize(BAR_WIDTH * remainingRatio, 10);
    this.timerText?.setText(`Tempo ${(remainingMs / 1000).toFixed(1)}s`);
  }

  private resolveGrade(): MinigameResultGrade {
    const definition = this.getDefinition();
    const elapsedMs = Math.max(0, this.elapsedMs);
    const completionRatio = Phaser.Math.Clamp(this.progress / Math.max(1, this.goal), 0, 1);
    const remainingRatio = Phaser.Math.Clamp(1 - elapsedMs / Math.max(1, this.timeLimitMs), 0, 1);
    const partialThreshold = Phaser.Math.Clamp(definition.partialThreshold ?? 0.5, 0.2, 0.95);
    const perfectRemainingRatio = Phaser.Math.Clamp(definition.perfectRemainingRatio ?? 0.33, 0.1, 0.8);

    if (completionRatio >= 1 && remainingRatio >= perfectRemainingRatio) {
      return "perfect";
    }
    if (completionRatio >= 1) {
      return this.resolver.promoteSuccessByLuck("success", this.config.heroStats);
    }
    if (completionRatio >= partialThreshold) {
      return "partial";
    }

    return "fail";
  }

  private buildResult(grade: MinigameResultGrade): MinigameResult {
    const definition = this.getDefinition();
    const statValue = this.resolveSkillValue(definition.usedSkill, this.config.heroStats);
    const completionRatio = Phaser.Math.Clamp(this.progress / Math.max(1, this.goal), 0, 1);
    const remainingRatio = Phaser.Math.Clamp(1 - this.elapsedMs / Math.max(1, this.timeLimitMs), 0, 1);
    const baseScore = 90
      + this.config.event.difficulty * 18
      + this.goal * 24
      + statValue * 5
      + Math.round(remainingRatio * 42);
    const scoreMultiplier = grade === "perfect" ? 1.45 : grade === "success" ? 1.05 : grade === "partial" ? 0.6 : 0.18;
    const damageTaken = this.resolveDamageTaken(grade);

    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade,
      score: Math.max(10, Math.round(baseScore * scoreMultiplier + completionRatio * 32)),
      usedSkill: definition.usedSkill,
      fatigueGained: grade === "perfect" ? 2 : grade === "success" ? 3 : grade === "partial" ? 4 : 5,
      rewardMultiplier: grade === "perfect" ? 1.5 : grade === "success" ? 1 : grade === "partial" ? 0.55 : 0.15,
      damageTaken,
    };
  }

  private resolveDamageTaken(grade: MinigameResultGrade): number {
    const baseDamage = Math.max(0, Number(this.config.event.damageValue ?? 0));
    if (this.config.event.type === "treasure") {
      return 0;
    }

    const mitigation = this.config.event.type === "monster"
      ? Math.round(this.config.heroStats.strength * 0.24)
      : Math.round(this.config.heroStats.defense * 0.34);
    const reducedDamage = Math.max(0, baseDamage - mitigation);

    if (grade === "perfect" || grade === "success") {
      return 0;
    }
    if (grade === "partial") {
      return Math.round(reducedDamage * 0.45);
    }

    return reducedDamage;
  }

  private resolveSkillValue(skill: SkillType, heroStats: HeroMinigameStats): number {
    switch (skill) {
      case "strength":
        return heroStats.strength;
      case "dexterity":
        return heroStats.dexterity;
      case "intelligence":
        return heroStats.intelligence;
      case "defense":
        return heroStats.defense;
      case "luck":
        return heroStats.luck;
      case "fatigue":
      default:
        return heroStats.fatigue;
    }
  }

  private getGradePresentation(grade: MinigameResultGrade): { label: string; textColor: string } {
    switch (grade) {
      case "perfect":
        return { label: "Perfetto! Prototipo completato", textColor: "#fde68a" };
      case "success":
        return { label: "Successo! Prototipo stabile", textColor: "#bbf7d0" };
      case "partial":
        return { label: "Parziale. Integrazione valida", textColor: "#fdba74" };
      default:
        return { label: "Fallito. Hook attivo ma logica da rifinire", textColor: "#fca5a5" };
    }
  }
}

export class PressureLockMinigame extends PressureLockPrototypeMinigame {
  constructor(
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) {
    super(scene, config, onComplete);
  }
}
