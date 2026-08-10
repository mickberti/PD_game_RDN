import Phaser from "phaser";
import { MinigameResult, MinigameResultGrade, ReflexSequenceInput } from "../minigame.model";
import { MinigameResolverService } from "../minigame-resolver.service";
import { GAME_ATLAS } from "../../phaser/config/game-atlas.config";
import { BaseMinigame } from "../base-minigame";
import { DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG, TrapReflexSequenceUxConfig } from "./trap-reflex-sequence.config";

type TrapDirectionFrame = { input: ReflexSequenceInput; frame: string; label: string };
type SequenceSlot = {
  x: number;
  y: number;
  frame: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Image;
};

const REFLEX_LAYOUT = DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG.layout;
const REFLEX_STATUS_Y = REFLEX_LAYOUT.statusY;
const REFLEX_TIMER_Y = REFLEX_LAYOUT.timerY;
const REFLEX_TIMER_BAR_Y = REFLEX_LAYOUT.timerBarY;
const REFLEX_BUTTON_Y = REFLEX_LAYOUT.buttonY;
const REFLEX_BUTTON_WIDTH = REFLEX_LAYOUT.buttonWidth;
const REFLEX_BUTTON_HEIGHT = REFLEX_LAYOUT.buttonHeight;
const REFLEX_BUTTON_X = REFLEX_LAYOUT.buttonX;
const ACTIVE_SYMBOL_COUNT = REFLEX_LAYOUT.activeSymbolCount;
const RUNE_ATLAS = GAME_ATLAS.trapsDirSet1.key;

const DIRECTION_SET: TrapDirectionFrame[] = [
  { input: "up", frame: "rune-direction-up", label: "UP" },
  { input: "upRight", frame: "rune-direction-up-right", label: "UR" },
  { input: "right", frame: "rune-direction-right", label: "RT" },
  { input: "downRight", frame: "rune-direction-down-right", label: "DR" },
  { input: "down", frame: "rune-direction-down", label: "DN" },
  { input: "downLeft", frame: "rune-direction-down-left", label: "DL" },
  { input: "left", frame: "rune-direction-left", label: "LT" },
  { input: "upLeft", frame: "rune-direction-up-left", label: "UL" },
  { input: "spikes", frame: "rune-trap-spikes", label: "SP" },
  { input: "fire", frame: "rune-trap-fire", label: "FI" },
  { input: "poison", frame: "rune-trap-poison", label: "PS" },
  { input: "blades", frame: "rune-trap-blades", label: "BL" },
];

export class ReflexSequenceMinigame extends BaseMinigame {
  private readonly resolver = new MinigameResolverService();
  private readonly ux: TrapReflexSequenceUxConfig = DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG;
  private readonly inputButtons = new Map<ReflexSequenceInput, Phaser.GameObjects.Container>();
  private readonly sequence: ReflexSequenceInput[] = [];
  private readonly targetSlots: SequenceSlot[] = [];
  private readonly playerSlots: SequenceSlot[] = [];
  private readonly buttonFrames = new Map<ReflexSequenceInput, string>();
  private panel?: Phaser.GameObjects.Container;
  private targetGrid?: Phaser.GameObjects.Container;
  private playerGrid?: Phaser.GameObjects.Container;
  private targetGridLabel?: Phaser.GameObjects.Text;
  private playerGridLabel?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private startedAt = 0;
  private errors = 0;
  private currentIndex = 0;
  private acceptingInput = false;
  private isShowingMemorySequence = false;
  private isAnimatingPlayerInput = false;
  private countdownEvent?: Phaser.Time.TimerEvent;
  private resolved = false;

  override create(): void {
    this.panel = this.createPanel();
    const usedDirections = Phaser.Utils.Array.Shuffle([...DIRECTION_SET]).slice(0, ACTIVE_SYMBOL_COUNT);
    usedDirections.forEach((item) => this.buttonFrames.set(item.input, item.frame));
    const sequenceLength = Phaser.Math.Clamp(Math.round(Number(this.config.sequenceLength ?? 3)), 3, 9);

    for (let index = 0; index < sequenceLength; index += 1) {
      this.sequence.push(Phaser.Utils.Array.GetRandom(usedDirections).input);
    }

    this.buildSequenceGrids(sequenceLength);
    this.buildHud();
    this.buildInputButtons(usedDirections);
    this.playPreview();
  }

  override destroy(): void {
    this.countdownEvent?.remove(false);
    this.countdownEvent = undefined;
    super.destroy();
  }

  private buildSequenceGrids(sequenceLength: number): void {
    const panel = this.panel;
    if (!panel) {
      return;
    }
    this.targetGridLabel = this.scene.add.text(0, -164, "MEMORIZZA", this.getGridLabelStyle()).setOrigin(0.5);
    this.playerGridLabel = this.scene.add.text(0, -164, "LA TUA SEQUENZA", this.getGridLabelStyle()).setOrigin(0.5).setVisible(false);
    panel.add([this.targetGridLabel, this.playerGridLabel]);
    this.targetGrid = this.scene.add.container(0, 0);
    panel.add(this.targetGrid);
    this.buildGrid(this.targetGrid, this.targetSlots, sequenceLength, this.ux.grid.sequenceGridY, 0x8b5cf6);
    this.playerGrid = this.scene.add.container(0, 0);
    this.playerGrid.setVisible(false);
    panel.add(this.playerGrid);
    this.buildGrid(this.playerGrid, this.playerSlots, sequenceLength, this.ux.grid.sequenceGridY, 0x22d3ee);
  }

  private getGridLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: "#ddd6fe",
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      fontStyle: "bold",
      align: "center",
    };
  }

  private buildGrid(
    parent: Phaser.GameObjects.Container,
    slots: SequenceSlot[],
    sequenceLength: number,
    gridY: number,
    accent: number,
  ): void {
    const { columns, rows } = this.getSequenceGridLayout(sequenceLength);
    const {
      cellSize,
      cellGap,
      cellAlpha,
      cellStrokeAlpha,
      perspectiveRowSpreadX,
      perspectiveRowLiftY,
      perspectiveRowGapGrowth,
    } = this.ux.grid;
    const totalWidth = columns * cellSize + (columns - 1) * cellGap;
    const startX = -totalWidth / 2 + cellSize / 2;
    const rowOffsets = Array.from({ length: rows }, (_value, row) => {
      if (row === 0) {
        return 0;
      }
      const accumulatedGapGrowth = (row * (row - 1) / 2) * perspectiveRowGapGrowth;
      return row * (cellSize + cellGap - perspectiveRowLiftY) + accumulatedGapGrowth;
    });
    const totalHeight = (rowOffsets[rows - 1] ?? 0) + cellSize;
    const startY = gridY - totalHeight / 2 + cellSize / 2;

    for (let index = 0; index < sequenceLength; index += 1) {
      const col = index % columns;
      const row = Math.floor(index / columns);
      // Stesso accenno di prospettiva della griglia di trap-rune-step: ogni riga
      // successiva si apre sui lati e si sposta leggermente verso l'alto.
      const sidePerspective = col === 0 ? -1 : col === columns - 1 ? 1 : 0;
      const x = Math.round(startX + col * (cellSize + cellGap) + sidePerspective * row * perspectiveRowSpreadX);
      const y = Math.round(startY + (rowOffsets[row] ?? 0));
      const glow = this.scene.add.circle(x, y, cellSize * 0.63, accent, 0).setStrokeStyle(3, accent, 0);
      const frame = this.scene.add.circle(x, y, cellSize / 2, 0x1f2340, cellAlpha)
        .setStrokeStyle(2, accent, cellStrokeAlpha);
      const icon = this.addAtlasIcon(x, y, RUNE_ATLAS, "rune-direction-up", {
        maxSize: Math.round(cellSize * 0.8),
      }).setVisible(false);
      parent.add([glow, frame, icon]);
      slots.push({ x, y, frame, glow, icon });
    }
  }

  private getSequenceGridLayout(sequenceLength: number): { columns: number; rows: number } {
    const columns = this.ux.grid.columns;
    return { columns, rows: Math.ceil(sequenceLength / columns) };
  }

  private buildHud(): void {
    const panel = this.panel;
    if (!panel) {
      return;
    }
    this.statusText = this.scene.add.text(0, REFLEX_STATUS_Y, "Osserva il rituale delle rune.", {
      color: "#fef3c7", fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold", align: "center", wordWrap: { width: 270 },
    }).setOrigin(0.5);
    this.timerText = this.scene.add.text(0, REFLEX_TIMER_Y, "", {
      color: "#e9d5ff", fontFamily: "Trebuchet MS", fontSize: "14px", align: "center",
    }).setOrigin(0.5);
    const timerTrack = this.scene.add.rectangle(0, REFLEX_TIMER_BAR_Y, REFLEX_LAYOUT.timerBarWidth, REFLEX_LAYOUT.timerBarHeight, 0x111827, 0.92).setStrokeStyle(1, 0xa855f7, 0.72);
    this.timerFill = this.scene.add.rectangle(-REFLEX_LAYOUT.timerBarWidth / 2, REFLEX_TIMER_BAR_Y, REFLEX_LAYOUT.timerBarWidth, REFLEX_LAYOUT.timerBarHeight, 0x22d3ee, 0.95).setOrigin(0, 0.5);
    const timeDisplayMode = this.config.timeDisplayMode;
    timerTrack.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerFill.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerText.setVisible(this.isMetricTextVisible(timeDisplayMode));
    panel.add([this.statusText, this.timerText, timerTrack, this.timerFill]);
  }

  private buildInputButtons(usedDirections: TrapDirectionFrame[]): void {
    const panel = this.panel;
    if (!panel) {
      return;
    }
    usedDirections.forEach((direction, index) => {
      const button = this.createActionButton(direction.label, REFLEX_BUTTON_X[index] ?? 0, REFLEX_BUTTON_Y, REFLEX_BUTTON_WIDTH, REFLEX_BUTTON_HEIGHT, {
        atlasKey: RUNE_ATLAS, frameName: direction.frame, iconScale: 0.28,
      });
      this.decorateRuneButton(button, Math.round(Math.max(REFLEX_BUTTON_WIDTH, REFLEX_BUTTON_HEIGHT) / 2));
      button.setVisible(false);
      panel.add(button);
      this.inputButtons.set(direction.input, button);
      this.bindPointer(button, () => this.handleInput(direction.input));
    });
  }

  private playPreview(): void {
    this.isShowingMemorySequence = true;
    this.acceptingInput = false;
    this.revealMemoryRuneAt(0);
  }

  private revealMemoryRuneAt(index: number): void {
    if (this.resolved) {
      return;
    }
    if (index >= this.sequence.length) {
      this.statusText?.setText("Tieni la sequenza in mente...");
      const previewHoldMs = Math.max(260, Number(this.config.previewDurationMs ?? 900));
      this.trackTimer(this.scene.time.delayedCall(previewHoldMs, () => this.beginInputPhase()));
      return;
    }
    this.animateMemoryRuneReveal(this.sequence[index], index, () => {
      this.trackTimer(this.scene.time.delayedCall(this.ux.memoryReveal.interRuneDelay, () => this.revealMemoryRuneAt(index + 1)));
    });
  }

  private animateMemoryRuneReveal(runeId: ReflexSequenceInput, index: number, onComplete: () => void): void {
    const panel = this.panel;
    const slot = this.targetSlots[index];
    if (!panel || !slot) {
      onComplete();
      return;
    }
    const icon = this.addAtlasIcon(0, -12, RUNE_ATLAS, this.getFrame(runeId), { maxSize: Math.round(this.ux.grid.cellSize * 0.8) })
      .setScale(0.7)
      .setAlpha(0);
    panel.add(icon);
    this.trackTween(this.scene.tweens.add({
      targets: icon,
      alpha: 1,
      scaleX: this.ux.memoryReveal.centerScale,
      scaleY: this.ux.memoryReveal.centerScale,
      duration: this.ux.memoryReveal.fadeInDuration,
      ease: "Cubic.Out",
      onComplete: () => this.trackTween(this.scene.tweens.add({
        targets: icon,
        angle: this.ux.memoryReveal.rotationDegrees,
        duration: this.ux.memoryReveal.rotationDuration,
        ease: "Quart.Out",
        onComplete: () => this.trackTimer(this.scene.time.delayedCall(this.ux.memoryReveal.holdDuration, () => {
          this.trackTween(this.scene.tweens.add({
            targets: icon,
            x: slot.x,
            y: slot.y,
            angle: 0,
            scaleX: this.ux.memoryReveal.cellScale,
            scaleY: this.ux.memoryReveal.cellScale,
            duration: this.ux.memoryReveal.moveToCellDuration,
            ease: "Back.Out",
            onComplete: () => {
              slot.icon.setTexture(RUNE_ATLAS, this.getFrame(runeId)).setVisible(true).clearTint();
              slot.frame.setFillStyle(0x312e81, 0.42).setStrokeStyle(2, 0xf6d365, 0.72);
              icon.destroy();
              this.playRuneArrivalGlow(slot.x, slot.y, this.ux.grid.cellSize * 0.63, 0xf6d365);
              onComplete();
            },
          }));
        })),
      })),
    }));
  }

  private beginInputPhase(): void {
    if (this.resolved) {
      return;
    }
    this.targetGrid?.setVisible(false);
    this.targetGridLabel?.setVisible(false);
    this.playerGrid?.setVisible(true);
    this.playerGridLabel?.setVisible(true);
    this.targetSlots.forEach((slot) => {
      slot.icon.setVisible(false);
      slot.glow.setStrokeStyle(3, 0xf6d365, 0);
      slot.frame.setFillStyle(0x1f2340, this.ux.grid.cellAlpha).setStrokeStyle(2, 0x8b5cf6, this.ux.grid.cellStrokeAlpha);
    });
    this.isShowingMemorySequence = false;
    this.inputButtons.forEach((button) => button.setVisible(true));
    this.acceptingInput = true;
    this.startedAt = this.scene.time.now;
    this.statusText?.setText("Ripeti la sequenza nell'ordine corretto.");
    this.startCountdown();
  }

  private startCountdown(): void {
    this.countdownEvent = this.trackTimer(this.scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        const remaining = this.getRemainingTimeMs();
        this.timerText?.setText(`Tempo: ${(remaining / 1000).toFixed(1)}s`);
        this.timerFill?.setSize(REFLEX_LAYOUT.timerBarWidth * Phaser.Math.Clamp(remaining / Math.max(1, this.config.timeLimitMs ?? 1), 0, 1), REFLEX_LAYOUT.timerBarHeight);
        if (remaining <= 0) {
          this.finishFromTimeout();
        }
      },
    }));
  }

  private handleInput(input: ReflexSequenceInput): void {
    if (!this.acceptingInput || this.resolved || this.isShowingMemorySequence || this.isAnimatingPlayerInput) {
      return;
    }
    const expected = this.sequence[this.currentIndex];
    const button = this.inputButtons.get(input);
    if (!button) {
      return;
    }
    if (input !== expected) {
      this.errors += 1;
      this.playWrongInputJuice(button.x, button.y, this.currentIndex);
      this.playTrapErrorJuice(button);
      if (this.errors >= 2) {
        this.finishFailed();
      }
      return;
    }

    this.isAnimatingPlayerInput = true;
    this.animateCorrectPlayerRuneInput(input, button.x, button.y, this.currentIndex, () => {
      this.currentIndex += 1;
      this.isAnimatingPlayerInput = false;
      if (this.currentIndex >= this.sequence.length) {
        this.finishCompleted();
      }
    });
  }

  private animateCorrectPlayerRuneInput(
    runeId: ReflexSequenceInput,
    sourceX: number,
    sourceY: number,
    targetIndex: number,
    onComplete: () => void,
  ): void {
    const panel = this.panel;
    const slot = this.playerSlots[targetIndex];
    if (!panel || !slot) {
      onComplete();
      return;
    }
    const icon = this.addAtlasIcon(sourceX, sourceY, RUNE_ATLAS, this.getFrame(runeId), { maxSize: Math.round(this.ux.grid.cellSize * 0.8) });
    panel.add(icon);
    this.trackTween(this.scene.tweens.add({
      targets: icon,
      x: 0,
      y: -12,
      scaleX: this.ux.playerInput.centerScale,
      scaleY: this.ux.playerInput.centerScale,
      duration: 250,
      ease: "Cubic.Out",
      onComplete: () => this.playCorrectRuneCenterShine(0, -12, 0xfef3c7, () => {
        this.trackTween(this.scene.tweens.add({
          targets: icon,
          x: slot.x,
          y: slot.y,
          scaleX: this.ux.playerInput.cellScale,
          scaleY: this.ux.playerInput.cellScale,
          duration: this.ux.playerInput.moveToCellDuration,
          ease: "Back.Out",
          onComplete: () => {
            slot.icon.setTexture(RUNE_ATLAS, this.getFrame(runeId)).setVisible(true).clearTint();
            slot.frame.setFillStyle(0x064e3b, 0.34).setStrokeStyle(2, 0x22c55e, 0.9);
            icon.destroy();
            this.playRuneArrivalGlow(slot.x, slot.y, this.ux.grid.cellSize * 0.63, 0x22c55e);
            this.playTrapSuccessJuice(this.inputButtons.get(runeId));
            onComplete();
          },
        }));
      }),
    }));
  }

  private playRuneArrivalGlow(x: number, y: number, radius: number, color = 0xf6d365): void {
    const panel = this.panel;
    if (!panel) {
      return;
    }
    const glow = this.scene.add.circle(x, y, radius, color, 0).setStrokeStyle(3, color, 0.78);
    // Lo inseriamo dietro a griglie e icone: illumina la cella senza coprire la runa.
    panel.addAt(glow, 0);
    this.trackTween(this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.72, to: 0 },
      scaleX: { from: 0.85, to: 1.25 },
      scaleY: { from: 0.85, to: 1.25 },
      duration: this.ux.memoryReveal.arrivalGlowDuration,
      ease: "Sine.Out",
      onComplete: () => glow.destroy(),
    }));
  }

  private playCorrectRuneCenterShine(x: number, y: number, color = 0xfef3c7, onComplete?: () => void): void {
    const panel = this.panel;
    if (!panel) {
      onComplete?.();
      return;
    }
    const shine = this.scene.add.circle(x, y, 34, color, 0.08).setStrokeStyle(3, color, 0.9);
    panel.add(shine);
    this.trackTween(this.scene.tweens.add({
      targets: shine,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: this.ux.playerInput.correctShineDuration,
      ease: "Cubic.Out",
      onComplete: () => {
        shine.destroy();
        onComplete?.();
      },
    }));
  }

  private playWrongInputJuice(sourceX: number, sourceY: number, targetIndex: number): void {
    const panel = this.panel;
    const slot = this.playerSlots[targetIndex];
    const playerGrid = this.playerGrid;
    if (!panel || !slot || !playerGrid) {
      return;
    }
    const flash = this.scene.add.circle(slot.x, slot.y, this.ux.grid.cellSize * 0.68, 0xef4444, 0.08)
      .setStrokeStyle(3, 0xef4444, 0.92);
    const wave = this.scene.add.circle(sourceX, sourceY, 18, 0xef4444, 0.12).setStrokeStyle(2, 0xef4444, 0.68);
    panel.add([flash, wave]);
    slot.frame.setStrokeStyle(2, 0xef4444, 0.95);
    this.trackTween(this.scene.tweens.add({
      targets: playerGrid,
      x: { from: -5, to: 5 },
      duration: 45,
      yoyo: true,
      repeat: 3,
      ease: "Sine.InOut",
      onComplete: () => playerGrid.setX(0),
    }));
    [flash, wave].forEach((effect, index) => this.trackTween(this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scaleX: index === 0 ? 1.2 : 1.9,
      scaleY: index === 0 ? 1.2 : 1.9,
      duration: this.ux.playerInput.errorJuiceDuration,
      ease: "Quad.Out",
      onComplete: () => effect.destroy(),
    })));
  }

  private finishCompleted(): void {
    this.acceptingInput = false;
    const remainingRatio = this.getRemainingTimeMs() / Math.max(1, this.config.timeLimitMs ?? 1);
    let grade: MinigameResultGrade = this.errors === 0 ? "success" : "partial";
    if (this.errors === 0 && remainingRatio >= 0.4) {
      grade = "perfect";
    }
    this.finishWithGrade(this.resolver.promoteSuccessByLuck(grade, this.config.heroStats));
  }

  private finishFromTimeout(): void {
    this.acceptingInput = false;
    this.finishWithGrade(this.currentIndex >= 2 ? "partial" : "fail");
  }

  private finishFailed(): void {
    this.acceptingInput = false;
    this.finishWithGrade(this.currentIndex >= 2 ? "partial" : "fail");
  }

  private finishWithGrade(grade: MinigameResultGrade): void {
    if (this.resolved) {
      return;
    }
    this.resolved = true;
    this.acceptingInput = false;
    this.countdownEvent?.remove(false);
    this.showGradeFeedback(grade);
    const result = this.buildResult(grade);
    this.showTrapHeroDamageFeedback(result.damageTaken);
    this.completeWithDelay(result, 420);
  }

  private showGradeFeedback(grade: MinigameResultGrade): void {
    const feedback = this.getGradePresentation(grade);
    this.statusText?.setText(feedback.label).setColor(feedback.textColor);
    [...this.targetSlots, ...this.playerSlots].forEach((slot) => {
      slot.frame.setStrokeStyle(2, feedback.color, 0.95);
      slot.glow.setStrokeStyle(3, feedback.color, 0.5);
    });
  }

  private getGradePresentation(grade: MinigameResultGrade): { label: string; color: number; textColor: string } {
    switch (grade) {
      case "perfect": return { label: "Perfetto! Trappola disinnescata", color: 0x22c55e, textColor: "#bbf7d0" };
      case "success": return { label: "Sequenza completata", color: 0x14b8a6, textColor: "#99f6e4" };
      case "partial": return { label: "Passi per un soffio", color: 0xf59e0b, textColor: "#fde68a" };
      default: return { label: "Trappola scattata", color: 0xef4444, textColor: "#fca5a5" };
    }
  }

  private buildResult(grade: MinigameResultGrade): MinigameResult {
    const damageBase = Math.max(0, Number(this.config.event.damageValue ?? 12));
    const defenseReduction = Math.round(this.config.heroStats.defense * 0.35);
    const reducedDamage = Math.max(0, damageBase - defenseReduction);
    const speedBonus = Math.max(0, (this.config.timeLimitMs ?? 0) - (this.scene.time.now - this.startedAt));
    const baseScore = 85 + this.sequence.length * 26 + this.config.heroStats.dexterity * 5 + Math.round(speedBonus / 120);
    if (grade === "perfect") return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore * 1.35), usedSkill: "dexterity", fatigueGained: 2, rewardMultiplier: 1.15, damageTaken: 0 };
    if (grade === "success") return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore), usedSkill: "dexterity", fatigueGained: 2, rewardMultiplier: 1, damageTaken: Math.max(1, Math.round(reducedDamage * 0.18)) };
    if (grade === "partial") return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore * 0.58), usedSkill: "dexterity", fatigueGained: 3, rewardMultiplier: 0.5, damageTaken: Math.max(1, Math.round(reducedDamage * 0.5)) };
    return { eventId: this.config.event.id, eventType: this.config.event.type, grade, score: Math.round(baseScore * 0.2), usedSkill: "dexterity", fatigueGained: 4, rewardMultiplier: 0, damageTaken: Math.max(1, Math.round(reducedDamage * 0.9)) };
  }

  private getRemainingTimeMs(): number {
    return Math.max(0, Number(this.config.timeLimitMs ?? 0) - (this.scene.time.now - this.startedAt));
  }

  private getFrame(input: ReflexSequenceInput): string {
    return this.buttonFrames.get(input) ?? "rune-direction-up";
  }

  private decorateRuneButton(button: Phaser.GameObjects.Container, radius: number): void {
    const outerGlow = this.scene.add.circle(0, 0, radius + 8, 0x22c55e, 0.08).setStrokeStyle(2, 0x22c55e, 0.18);
    const glow = this.scene.add.circle(0, 0, radius + 4, 0xffffff, 0).setStrokeStyle(3, 0x93c5fd, 0.24);
    const frame = this.scene.add.circle(0, 0, radius, 0x1f2340, 0.96).setStrokeStyle(3, 0xe9d5ff, 0.42);
    button.addAt([outerGlow, glow, frame], 0);
  }
}
