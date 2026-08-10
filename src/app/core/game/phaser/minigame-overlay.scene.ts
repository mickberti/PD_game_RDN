import Phaser from "phaser";
import { MinigameFactory } from "../minigames/minigame.factory";
import { MinigameConfig, MinigameOverlayPayload, MinigameResult } from "../minigames/minigame.model";
import { BaseMinigame } from "../minigames/base-minigame";

export class MinigameOverlayScene extends Phaser.Scene {
  private readonly minigameFactory = new MinigameFactory();
  private payload?: MinigameOverlayPayload;
  private minigame?: BaseMinigame;
  private backgroundBlocker?: Phaser.GameObjects.Rectangle;
  private introText?: Phaser.GameObjects.Text;
  private resultContainer?: Phaser.GameObjects.Container;
  private pendingResult?: MinigameResult;
  private completed = false;
  private started = false;
  private waitingForClose = false;
  private closing = false;
  private shutdownBound = false;

  constructor(private readonly initialPayload?: MinigameOverlayPayload) {
    super({ key: "MinigameOverlayScene" });
  }

  init(data?: MinigameOverlayPayload): void {
    this.payload = data ?? this.initialPayload;
    this.completed = false;
    this.started = false;
    this.waitingForClose = false;
    this.closing = false;
    this.pendingResult = undefined;
    this.shutdownBound = false;
  }

  create(): void {
    if (!this.payload) {
      this.scene.stop();
      return;
    }

    this.input.setTopOnly(true);

    // Backdrop opaco: gli spazi intorno al minigioco non devono mostrare
    // elementi della scena di gioco sottostante.
    this.backgroundBlocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x050816, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(3900)
      .setInteractive()
      .on("pointerdown", (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        pointer.event?.preventDefault?.();
        event.stopPropagation();
        if (this.waitingForClose) {
          this.closeAfterResult();
        }
      });

    this.showIntroState();
    this.trackStartDelay();

    if (!this.shutdownBound) {
      this.shutdownBound = true;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.introText?.destroy();
        this.resultContainer?.destroy(true);
        this.backgroundBlocker?.destroy();
        this.minigame?.destroy();
        this.minigame = undefined;
        this.payload = undefined;
      });
    }
  }

  private showIntroState(): void {
    this.introText = this.add.text(this.scale.width / 2, this.scale.height / 2, "Preparati...", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "28px",
      fontStyle: "bold",
      align: "center",
      stroke: "#2e1a47",
      strokeThickness: 5,
    })
      .setOrigin(0.5)
      .setDepth(4500);
  }

  private trackStartDelay(): void {
    const delayMs = Math.max(0, Number(this.payload?.config.introDelayMs ?? 1000));
    this.time.delayedCall(delayMs, () => this.startMinigame());
  }

  private startMinigame(): void {
    if (!this.payload || this.started) {
      return;
    }

    this.started = true;
    this.introText?.destroy();
    this.introText = undefined;
    this.minigame = this.createMinigame(this.payload.config);
    this.minigame.init();
    this.minigame.create();
  }

  private createMinigame(config: MinigameConfig): BaseMinigame {
    const onComplete = (result: MinigameResult) => this.finish(result);
    return this.minigameFactory.create(config.type, this, config, onComplete);
  }

  private finish(result: MinigameResult): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    this.pendingResult = result;

    // The minigame controls are still interactive after it reports completion.
    // Remove them before showing the result so they cannot swallow the tap used
    // to return to the parent scene.
    this.destroyMinigameSafely();
    const revealDelayMs = Math.max(0, Number(this.payload?.config.resultRevealDelayMs ?? 1500));
    this.time.delayedCall(revealDelayMs, () => this.showResultState());
  }

  private showResultState(): void {
    if (!this.pendingResult || this.waitingForClose) {
      return;
    }

    const result = this.pendingResult;
    this.waitingForClose = true;

    const container = this.add.container(this.scale.width / 2, this.scale.height / 2).setDepth(4600);
    const panel = this.add.rectangle(0, 0, 280, 154, 0x140f26, 0.94)
      .setStrokeStyle(3, 0xf6d365, 0.9)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        pointer.event?.preventDefault?.();
        event.stopPropagation();
        this.closeAfterResult();
      });
    const title = this.add.text(0, -38, this.getResultTitle(result), {
      color: this.getResultColor(result),
      fontFamily: "Trebuchet MS",
      fontSize: "28px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 8, `Punteggio ${Math.max(0, Math.round(result.score))}`, {
      color: "#f8fafc",
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      align: "center",
    }).setOrigin(0.5);
    const prompt = this.add.text(0, 50, "Clicca per continuare", {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);

    container.add([panel, title, subtitle, prompt]);
    this.resultContainer = container;
  }

  private closeAfterResult(): void {
    if (!this.pendingResult || this.closing) {
      return;
    }

    this.closing = true;
    const result = this.pendingResult;
    const payload = this.payload;
    try {
      payload?.onComplete?.(result);
    } catch (error) {
      console.error("[MinigameOverlayScene] Failed to handle minigame result.", error);
    } finally {
      // Never leave the parent scene paused: cleanup failures must not block
      // the main HUD or player movement.
      this.destroyMinigameSafely();
      if (payload?.parentSceneKey) {
        this.scene.resume(payload.parentSceneKey);
      }
      this.payload = undefined;
      this.pendingResult = undefined;
      this.scene.stop();
    }
  }

  private destroyMinigameSafely(): void {
    const minigame = this.minigame;
    this.minigame = undefined;
    if (!minigame) {
      return;
    }

    try {
      minigame.destroy();
    } catch (error) {
      console.error("[MinigameOverlayScene] Failed to clean up minigame.", error);
    }
  }

  private getResultTitle(result: MinigameResult): string {
    switch (result.grade) {
      case "perfect":
        return "Perfetto!";
      case "success":
        return "Riuscito";
      case "partial":
        return "Parziale";
      default:
        return "Fallito";
    }
  }

  private getResultColor(result: MinigameResult): string {
    switch (result.grade) {
      case "perfect":
        return "#fde68a";
      case "success":
        return "#bbf7d0";
      case "partial":
        return "#fdba74";
      default:
        return "#fca5a5";
    }
  }

  override update(time: number, delta: number): void {
    if (!this.completed) {
      this.minigame?.update(time, delta);
    }
  }
}
