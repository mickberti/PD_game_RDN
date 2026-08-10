import Phaser from "phaser";
import { RunSetupChoiceConfig, RunSetupChoiceMinigame } from "../minigames/plugins/choice-run-setup.minigame";
import { BaseMinigame } from "../minigames/base-minigame";
import { HeroItem } from "../../models/game.models";
import { PhaserEventMinigameModeId } from "../../models/phaser-game-state.model";

export interface RunSetupOverlayPayload {
  hero: HeroItem;
  onSelect: (modeId: PhaserEventMinigameModeId) => void;
  parentSceneKey?: string;
}

export class RunSetupOverlayScene extends Phaser.Scene {
  private payload?: RunSetupOverlayPayload;
  private minigame?: BaseMinigame<PhaserEventMinigameModeId, RunSetupChoiceConfig>;
  private completed = false;
  private shutdownBound = false;

  constructor() {
    super({ key: "RunSetupOverlayScene" });
  }

  init(data: RunSetupOverlayPayload): void {
    this.payload = data;
    this.completed = false;
    this.shutdownBound = false;
  }

  create(): void {
    if (!this.payload) {
      this.scene.stop();
      return;
    }

    this.input.setTopOnly(true);

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x050816, 0.78)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(3900)
      .setInteractive()
      .on("pointerdown", (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        pointer.event?.preventDefault?.();
        event.stopPropagation();
      });

    const minigame = new RunSetupChoiceMinigame(
      this,
      { hero: this.payload.hero },
      (modeId) => this.finish(modeId),
    );
    this.minigame = minigame;
    minigame.create();

    if (!this.shutdownBound) {
      this.shutdownBound = true;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.minigame?.destroy();
        this.minigame = undefined;
        this.payload = undefined;
      });
    }
  }

  private finish(modeId: PhaserEventMinigameModeId): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    const payload = this.payload;
    this.minigame?.destroy();
    this.minigame = undefined;

    try {
      payload?.onSelect(modeId);
      if (payload?.parentSceneKey) {
        this.scene.resume(payload.parentSceneKey);
      }
    } finally {
      this.payload = undefined;
      this.scene.stop();
    }
  }
}
