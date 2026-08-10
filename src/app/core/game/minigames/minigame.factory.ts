import Phaser from "phaser";
import { BaseMinigame } from "./base-minigame";
import { getMinigamePluginByType, isRegisteredMinigameType } from "./minigame-plugin.registry";
import { MinigameResult, MinigameType, ResolvedMinigameConfig } from "./minigame.model";

export class MinigameFactory {
  create(
    type: MinigameType,
    scene: Phaser.Scene,
    config: ResolvedMinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ): BaseMinigame {
    if (!isRegisteredMinigameType(type)) {
      throw new Error(`[MinigameFactory] Unsupported minigame type "${type}".`);
    }

    const plugin = getMinigamePluginByType(type);
    if (!plugin) {
      throw new Error(`[MinigameFactory] No plugin registered for minigame type "${type}".`);
    }

    return plugin.create(scene, config, onComplete);
  }
}
