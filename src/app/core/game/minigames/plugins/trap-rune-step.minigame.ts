import Phaser from "phaser";
import { BaseMinigame } from "../base-minigame";
import { MinigameConfig, MinigameResult, MinigameResultGrade } from "../minigame.model";
import { GAME_ATLAS } from "../../phaser/config/game-atlas.config";
import { DEFAULT_TRAP_RUNE_STEP_CONFIG } from "./trap-rune-step.config";

type RuneDescriptor = {
  atlasKey: string;
  completeFrame: string;
  brokenFrame: string;
  color: string;
};

type RuneCell = {
  index: number;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
  rune?: RuneDescriptor;
};

type RuneRoundState = {
  previewTargetIndex: number;
  choiceTargetIndex: number;
  targetRune: RuneDescriptor;
  previewRunes: RuneDescriptor[];
  choiceRunes: RuneDescriptor[];
};

type RunePhaseMode = "preview" | "choose" | null;

const { layout: RUNE_LAYOUT, colors: RUNE_COLORS } = DEFAULT_TRAP_RUNE_STEP_CONFIG;
const PANEL_WIDTH = RUNE_LAYOUT.panelWidth;
const GRID_Y = RUNE_LAYOUT.gridY;
const STATUS_Y = RUNE_LAYOUT.statusY;
const ROUND_Y = RUNE_LAYOUT.roundY;
const TIMER_Y = RUNE_LAYOUT.timerY;
const ROUND_BAR_Y = RUNE_LAYOUT.roundBarY;
const RUNE_DEFAULT_FILL = RUNE_COLORS.defaultFill;
const RUNE_PREVIEW_FILL = RUNE_COLORS.previewFill;
const RUNE_DEFAULT_STROKE = RUNE_COLORS.defaultStroke;
const RUNE_ACTIVE_STROKE = RUNE_COLORS.activeStroke;
const RUNE_SUCCESS_GLOW = RUNE_COLORS.successGlow;
const RUNE_ERROR_GLOW = RUNE_COLORS.errorGlow;

const RUNE_POOL: RuneDescriptor[] = [
  { atlasKey: GAME_ATLAS.runesSet1.key, completeFrame: "rune-purple-spiral-complete", brokenFrame: "rune-purple-spiral-broken", color: "#c4b5fd" },
  { atlasKey: GAME_ATLAS.runesSet1.key, completeFrame: "rune-purple-star-complete", brokenFrame: "rune-purple-star-broken", color: "#ddd6fe" },
  { atlasKey: GAME_ATLAS.runesSet1.key, completeFrame: "rune-purple-moon-complete", brokenFrame: "rune-purple-moon-broken", color: "#e9d5ff" },
  { atlasKey: GAME_ATLAS.runesSet1.key, completeFrame: "rune-purple-triangle-complete", brokenFrame: "rune-purple-triangle-broken", color: "#d8b4fe" },
  { atlasKey: GAME_ATLAS.runesSet2.key, completeFrame: "rune-red-spiral-complete", brokenFrame: "rune-red-spiral-broken", color: "#fca5a5" },
  { atlasKey: GAME_ATLAS.runesSet2.key, completeFrame: "rune-red-star-complete", brokenFrame: "rune-red-star-broken", color: "#fda4af" },
  { atlasKey: GAME_ATLAS.runesSet2.key, completeFrame: "rune-red-trident-complete", brokenFrame: "rune-red-trident-broken", color: "#fb7185" },
  { atlasKey: GAME_ATLAS.runesSet2.key, completeFrame: "rune-red-eye-complete", brokenFrame: "rune-red-eye-broken", color: "#fecaca" },
  { atlasKey: GAME_ATLAS.runesSet3.key, completeFrame: "rune-purple-sun-complete", brokenFrame: "rune-purple-sun-broken", color: "#93c5fd" },
  { atlasKey: GAME_ATLAS.runesSet3.key, completeFrame: "rune-purple-asterisk-complete", brokenFrame: "rune-purple-asterisk-broken", color: "#67e8f9" },
  { atlasKey: GAME_ATLAS.runesSet3.key, completeFrame: "rune-purple-moon-complete", brokenFrame: "rune-purple-moon-broken", color: "#a5f3fc" },
  { atlasKey: GAME_ATLAS.runesSet3.key, completeFrame: "rune-purple-triangle-complete", brokenFrame: "rune-purple-triangle-broken", color: "#bfdbfe" },
];

export class TrapRuneStepMinigame extends BaseMinigame {
  private cells: RuneCell[] = [];
  private statusText?: Phaser.GameObjects.Text;
  private roundText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private roundFill?: Phaser.GameObjects.Rectangle;
  private currentRound = 0;
  private correctRounds = 0;
  private errors = 0;
  private awaitingChoice = false;
  private finished = false;
  private activeRound?: RuneRoundState;
  private phaseMode: RunePhaseMode = null;
  private phaseElapsedMs = 0;
  private phaseDurationMs = 0;
  private phaseTimer?: Phaser.Time.TimerEvent;
  private countdownEvent?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) {
    super(scene, config, onComplete);
  }

  override create(): void {
    const panel = this.createPanel();
    this.statusText = this.scene.add.text(0, STATUS_Y, "Memorizza la runa completa evidenziata e scegli la sua versione spezzata.", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: PANEL_WIDTH - 42 },
    }).setOrigin(0.5);
    this.roundText = this.scene.add.text(0, ROUND_Y, "", {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      align: "center",
    }).setOrigin(0.5);
    this.timerText = this.scene.add.text(0, TIMER_Y + 18, "", {
      color: "#cbd5e1",
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      align: "center",
    }).setOrigin(0.5);
    const timerTrack = this.scene.add.rectangle(0, TIMER_Y, 240, 12, 0x111827, 0.96)
      .setStrokeStyle(2, 0xf6d365, 0.76);
    this.timerFill = this.scene.add.rectangle(-118, TIMER_Y, 236, 12, 0x22d3ee, 0.95).setOrigin(0, 0.5);
    const timeDisplayMode = this.config.timeDisplayMode;
    timerTrack.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerFill.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerText.setVisible(this.isMetricTextVisible(timeDisplayMode));

    const roundTrack = this.scene.add.rectangle(0, ROUND_BAR_Y, 240, 10, 0x1f2937, 0.9)
      .setStrokeStyle(1, 0xa855f7, 0.7);
    this.roundFill = this.scene.add.rectangle(-118, ROUND_BAR_Y, 0, 10, 0xc084fc, 0.94).setOrigin(0, 0.5);

    //panel.add([this.statusText, this.roundText, this.timerText, timerTrack, this.timerFill, roundTrack, this.roundFill]);
    panel.add([this.statusText, this.roundText, this.timerText, timerTrack, this.timerFill]);
    this.buildGrid(panel);
    this.startRound();
  }

  override update(_time: number, delta: number): void {
    if (this.finished || !this.phaseMode) {
      return;
    }

    this.phaseElapsedMs += delta;
  }

  override destroy(): void {
    this.phaseTimer?.remove(false);
    this.countdownEvent?.remove(false);
    super.destroy();
  }

  private buildGrid(panel: Phaser.GameObjects.Container): void {
    //const cellCount = Math.max(4, Math.min(9, Number(this.config.gridSize ?? 6)));
    //const columns = cellCount >= 6 ? 3 : 2;
    const cellCount = 9;
    const columns = 3;
    const rows = Math.ceil(cellCount / columns);
    //const cellSize = rows >= 3 ? 68 : 82;
    const cellSize = RUNE_LAYOUT.cellSize;
    const gap = RUNE_LAYOUT.cellGap;
    const totalWidth = columns * cellSize + (columns - 1) * gap;
    const totalHeight = rows * cellSize + (rows - 1) * gap;
    const startX = -totalWidth / 2 + cellSize / 2;
    const startY = GRID_Y - totalHeight / 2 + cellSize / 2;

    for (let index = 0; index < cellCount; index += 1) {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * (cellSize + gap) + (((col === 0) ? -1 : (col === 2) ? 1 : 0) * (row * 5));
      const y = startY + row * (cellSize + gap) - row * 5;
      const container = this.scene.add.container(x, y);
      container.setSize(cellSize, cellSize);
      const glowRadius = Math.round((cellSize ) / 2);
      const glow = this.scene.add.circle(0, 0, glowRadius, 0xffffff, 0)
        .setStrokeStyle(3, 0x93c5fd, 0);
      const background = this.scene.add.rectangle(0, 0, cellSize, cellSize, 0x1e1b4b, 0.96)
        .setStrokeStyle(3, 0xf6d365, 0.76);
      const icon = this.addAtlasIcon(0, 0, GAME_ATLAS.runesSet1.key, "rune-purple-eye-complete", {
        maxSize: Math.round(cellSize * 0.85),
      });
      container.add([glow, icon]);
      panel.add(container);

      this.cells.push({ index, container, background, icon, glow });
      this.bindPointer(container, () => this.handleCellSelection(index));
    }

    this.setCellsInteractive(false);
  }

  private startRound(): void {
    if (this.finished) {
      return;
    }

    const totalRounds = this.getRounds();
    if (this.currentRound >= totalRounds) {
      this.finishMinigame();
      return;
    }

    this.currentRound += 1;
    this.awaitingChoice = false;
    this.activeRound = this.buildRoundState();
    this.paintPreview(this.activeRound);
    this.setCellsInteractive(false);
    this.refreshRoundInfo();
    this.beginPhase("preview", Math.max(320, Number(this.config.previewDurationMs ?? DEFAULT_TRAP_RUNE_STEP_CONFIG.defaults.previewDurationMs)), () => this.beginChoicePhase());
  }

  private beginChoicePhase(): void {
    if (this.finished || !this.activeRound) {
      return;
    }

    this.awaitingChoice = true;
    this.paintChoiceState(this.activeRound);
    this.setCellsInteractive(true);
    this.statusText?.setText("Scegli la runa spezzata che corrisponde a quella completa.").setColor("#dbeafe");
    this.beginPhase("choose", Math.max(500, Number(this.config.chooseTimeMs ?? DEFAULT_TRAP_RUNE_STEP_CONFIG.defaults.chooseTimeMs)), () => this.handleMiss());
  }

  private beginPhase(mode: RunePhaseMode, durationMs: number, onExpire: () => void): void {
    this.phaseMode = mode;
    this.phaseElapsedMs = 0;
    this.phaseDurationMs = durationMs;
    this.phaseTimer?.remove(false);
    this.phaseTimer = this.trackTimer(this.scene.time.delayedCall(durationMs, onExpire));
    this.startCountdown();
  }

  private startCountdown(): void {
    this.countdownEvent?.remove(false);
    this.countdownEvent = this.trackTimer(this.scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (this.finished || !this.phaseMode) {
          return;
        }

        this.refreshPhaseTimer();
      },
    }));
  }

  private refreshPhaseTimer(): void {
    const remainingMs = Math.max(0, this.phaseDurationMs - this.phaseElapsedMs);
    const ratio = Phaser.Math.Clamp(remainingMs / Math.max(1, this.phaseDurationMs), 0, 1);
    this.timerFill?.setSize(236 * ratio, 12);
    this.timerText?.setText(`Tempo ${(remainingMs / 1000).toFixed(1)}s`);
  }

  private handleCellSelection(cellIndex: number): void {
    if (this.finished || !this.awaitingChoice || !this.activeRound) {
      return;
    }

    this.awaitingChoice = false;
    this.phaseMode = null;
    this.setCellsInteractive(false);
    this.phaseTimer?.remove(false);

    const isCorrect = cellIndex === this.activeRound.choiceTargetIndex;
    if (isCorrect) {
      this.correctRounds += 1;
      this.paintResolvedState(cellIndex, true);
      this.statusText?.setText("Runa corretta!").setColor("#bbf7d0");
      this.playTrapSuccessJuice(this.cells[cellIndex]?.container);
      this.advanceAfterDelay();
      return;
    }

    const luckSaved = this.tryLuckSave();
    if (luckSaved) {
      this.correctRounds += 1;
      this.paintResolvedState(cellIndex, true, true);
      this.statusText?.setText("La fortuna ti salva dalla runa errata.").setColor("#fde68a");
      this.playTrapSuccessJuice(this.cells[cellIndex]?.container);
      this.advanceAfterDelay();
      return;
    }

    this.errors += 1;
    this.paintResolvedState(cellIndex, false);
    this.statusText?.setText("Runa sbagliata!").setColor("#fca5a5");
    this.playTrapErrorJuice(this.cells[cellIndex]?.container);
    this.advanceAfterDelay();
  }

  private handleMiss(): void {
    if (this.finished || !this.awaitingChoice || !this.activeRound) {
      return;
    }

    this.awaitingChoice = false;
    this.phaseMode = null;
    this.setCellsInteractive(false);
    this.errors += 1;
    this.paintResolvedState(-1, false);
    this.statusText?.setText("Tempo scaduto.").setColor("#fca5a5");
    this.playTrapErrorJuice(this.cells[this.activeRound.choiceTargetIndex]?.container);
    this.advanceAfterDelay();
  }

  private advanceAfterDelay(): void {
    this.paintRoundProgress();
    this.trackTimer(this.scene.time.delayedCall(
      Math.max(350, Number(this.config.roundTransitionMs ?? DEFAULT_TRAP_RUNE_STEP_CONFIG.defaults.roundTransitionMs)),
      () => {
          if (!this.finished) {
            this.startRound();
          }
        },
      ));
  }

  private finishMinigame(): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.awaitingChoice = false;
    this.phaseMode = null;
    this.setCellsInteractive(false);
    this.phaseTimer?.remove(false);
    this.countdownEvent?.remove(false);
    const totalRounds = this.getRounds();
    const grade = this.errors === 0 && this.correctRounds === totalRounds
      ? "perfect"
      : this.errors <= 1
        ? "success"
        : this.correctRounds >= Math.ceil(totalRounds / 2)
          ? "partial"
          : "fail";
    const feedback = grade === "perfect"
      ? { text: "Percorso runico perfetto!", color: "#bbf7d0" }
      : grade === "success"
        ? { text: "Hai letto quasi tutte le rune.", color: "#d9f99d" }
        : grade === "partial"
          ? { text: "Solo parte del percorso era corretto.", color: "#fdba74" }
          : { text: "Le rune ti hanno confuso del tutto.", color: "#fca5a5" };
    this.statusText?.setText(feedback.text).setColor(feedback.color);
    const result = this.buildResult(grade);
    this.showTrapHeroDamageFeedback(result.damageTaken);
    this.completeWithDelay(result, 420);
  }

  private buildRoundState(): RuneRoundState {
    const shuffledRunes = Phaser.Utils.Array.Shuffle([...RUNE_POOL]);
    const targetRune = shuffledRunes[0];
    const decoys = shuffledRunes.slice(1, this.cells.length);
    const previewTargetIndex = Phaser.Math.Between(0, this.cells.length - 1);
    const choiceTargetIndex = Phaser.Math.Between(0, this.cells.length - 1);
    const previewRunes = Array.from({ length: this.cells.length }, (_, index) =>
      index === previewTargetIndex ? targetRune : decoys[index < previewTargetIndex ? index : index - 1] ?? targetRune,
    );
    const choiceRunes = Phaser.Utils.Array.Shuffle([...previewRunes]);
    const existingTargetIndex = choiceRunes.findIndex((rune) => rune === targetRune);

    if (existingTargetIndex >= 0) {
      const [existingTargetRune] = choiceRunes.splice(existingTargetIndex, 1);
      choiceRunes.splice(choiceTargetIndex, 0, existingTargetRune);
    }

    return { previewTargetIndex, choiceTargetIndex, targetRune, previewRunes, choiceRunes };
  }

  private paintPreview(round: RuneRoundState): void {
    this.cells.forEach((cell, index) => {
      const rune = round.previewRunes[index];
      cell.rune = rune;
      const isTarget = index === round.previewTargetIndex;
      cell.icon.setTexture(rune.atlasKey, rune.completeFrame);
      cell.icon.setDisplaySize(cell.icon.displayWidth, cell.icon.displayHeight);
      cell.background.setFillStyle(RUNE_PREVIEW_FILL, 0.98);
      cell.background.setStrokeStyle(3, RUNE_ACTIVE_STROKE, isTarget ? 0.95 : 0.72);
      cell.glow
        .setFillStyle(0xffffff, isTarget ? 0.06 : 0.03)
        .setStrokeStyle(4, isTarget ? RUNE_SUCCESS_GLOW : RUNE_ACTIVE_STROKE, isTarget ? 0.78 : 0.38);
      cell.icon.setTint(Phaser.Display.Color.HexStringToColor(isTarget ? rune.color : "#c4b5fd").color);
      cell.container.setScale(isTarget ? 1.06 : 1);

      if (isTarget) {
        const baseX = cell.container.x;
        this.trackTween(this.scene.tweens.add({
          targets: cell.container,
          x: { from: baseX - 3, to: baseX + 3 },
          duration: 90,
          yoyo: true,
          repeat: 3,
          ease: "Sine.easeInOut",
          onUpdate: () => {
            cell.glow.setStrokeStyle(4, RUNE_SUCCESS_GLOW, 0.85);
          },
          onComplete: () => {
            cell.container.setX(baseX);
          },
        }));
      }
    });
  }

  private paintChoiceState(round: RuneRoundState): void {
    this.cells.forEach((cell, index) => {
      const rune = round.choiceRunes[index];
      cell.icon.setTexture(rune.atlasKey, rune.brokenFrame);
      cell.background.setFillStyle(RUNE_DEFAULT_FILL, 0.98);
      cell.background.setStrokeStyle(3, RUNE_DEFAULT_STROKE, 0.35);
      cell.glow
        .setFillStyle(0xffffff, 0.02)
        .setStrokeStyle(4, RUNE_DEFAULT_STROKE, 0.22);
      cell.icon.setTint(Phaser.Display.Color.HexStringToColor(rune.color).color);
      cell.container.setScale(1);
    });
  }

  private paintResolvedState(cellIndex: number, success: boolean, neutral = false): void {
    this.cells.forEach((cell, index) => {
      const isTarget = this.activeRound?.choiceTargetIndex === index;
      const isSelected = cellIndex === index;
      const glowColor = success
        ? neutral ? 0xf59e0b : RUNE_SUCCESS_GLOW
        : isTarget ? RUNE_SUCCESS_GLOW : isSelected ? RUNE_ERROR_GLOW : RUNE_DEFAULT_STROKE;
      const strokeAlpha = success || isTarget || isSelected ? 0.95 : 0.18;
      cell.background.setFillStyle(isTarget ? RUNE_PREVIEW_FILL : RUNE_DEFAULT_FILL, isTarget ? 0.92 : 0.82);
      cell.background.setStrokeStyle(3, glowColor, strokeAlpha);
      cell.glow
        .setFillStyle(0xffffff, success || isSelected || isTarget ? 0.04 : 0.02)
        .setStrokeStyle(4, glowColor, success || isSelected ? 0.55 : 0.35);
      cell.container.setScale(isSelected || isTarget ? 1.04 : 1);
    });
  }

  private refreshRoundInfo(): void {
    this.roundText?.setText(`Round ${this.currentRound}/${this.getRounds()} · Corretti ${this.correctRounds} · Errori ${this.errors}`);
    this.paintRoundProgress();
    this.refreshPhaseTimer();
  }

  private paintRoundProgress(): void {
    const totalRounds = Math.max(1, this.getRounds());
    const ratio = Phaser.Math.Clamp((this.currentRound - 1 + (this.awaitingChoice ? 0.5 : 0)) / totalRounds, 0, 1);
    this.roundFill?.setSize(236 * ratio, 10);
  }

  private setCellsInteractive(enabled: boolean): void {
    this.cells.forEach((cell) => {
      if (enabled) {
        cell.container.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, cell.background.width, cell.background.height),
          Phaser.Geom.Rectangle.Contains,
        );
        if (cell.container.input) {
          cell.container.input.cursor = "pointer";
        }
        return;
      }

      cell.container.disableInteractive();
    });
  }

  private tryLuckSave(): boolean {
    const chance = Phaser.Math.Clamp(this.config.heroStats.luck * 1.8, 0, 30);
    return Phaser.Math.Between(1, 100) <= chance;
  }

  private buildResult(grade: MinigameResultGrade): MinigameResult {
    const damageBase = Math.max(0, Number(this.config.event.damageValue ?? 0));
    const score = Math.max(10, Math.round(
      90
      + this.correctRounds * 34
      + this.config.heroStats.intelligence * 6
      + this.config.heroStats.dexterity * 4
      - this.errors * 24,
    ));

    if (grade === "perfect") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score,
        usedSkill: "intelligence",
        fatigueGained: 3,
        rewardMultiplier: 1.25,
        damageTaken: 0,
      };
    }
    if (grade === "success") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.round(score * 0.9),
        usedSkill: "intelligence",
        fatigueGained: 2,
        rewardMultiplier: 1,
        damageTaken: Math.max(1, Math.round(damageBase * 0.2)),
      };
    }
    if (grade === "partial") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.round(score * 0.58),
        usedSkill: "intelligence",
        fatigueGained: 2,
        rewardMultiplier: 0.5,
        damageTaken: Math.max(1, Math.round(damageBase * 0.55)),
      };
    }

    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade,
      score: Math.round(score * 0.22),
      usedSkill: "intelligence",
      fatigueGained: 1,
      rewardMultiplier: 0.1,
      damageTaken: Math.max(1, Math.round(damageBase * 0.9)),
    };
  }

  private getRounds(): number {
    return Math.max(1, Number(this.config.rounds ?? 3));
  }
}
