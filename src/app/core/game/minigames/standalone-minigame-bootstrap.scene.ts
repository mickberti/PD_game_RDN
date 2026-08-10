import Phaser from "phaser";
import { MinigameOverlayPayload } from "./minigame.model";
import { GAME_ATLAS, MINIGAME_BUTTON_ATLAS, MINIGAME_UI_ATLAS } from "../phaser/config/game-atlas.config";

export class StandaloneMinigameBootstrapScene extends Phaser.Scene {
  constructor(private readonly payload: MinigameOverlayPayload) {
    super({ key: "StandaloneMinigameBootstrapScene" });
  }

  preload(): void {
    const heroHud = this.payload.config.heroHud;
    const combatVisuals = this.payload.config.combatVisuals;

    Object.values(MINIGAME_UI_ATLAS).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });

    Object.values(MINIGAME_BUTTON_ATLAS).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });

    Object.values(GAME_ATLAS).forEach((atlas) => {
      if (!this.textures.exists(atlas.key)) {
        this.load.atlas(atlas.key, atlas.imageUrl, atlas.data);
      }
    });

    if (heroHud?.portraitImageUrl && heroHud.portraitAtlasData && !this.textures.exists(heroHud.portraitAtlasKey)) {
      this.load.atlas(heroHud.portraitAtlasKey, heroHud.portraitImageUrl, heroHud.portraitAtlasData);
    }

    [
      combatVisuals?.heroDownAtlas,
      combatVisuals?.heroUpAtlas,
      combatVisuals?.heroHorizAtlas,
      combatVisuals?.monsterDownAtlas,
      combatVisuals?.monsterHorizAtlas,
    ].forEach((atlas) => {
      if (!atlas?.imageUrl || !atlas.atlasData || this.textures.exists(atlas.atlasKey)) {
        return;
      }

      this.load.atlas(atlas.atlasKey, atlas.imageUrl, atlas.atlasData);
    });
  }

  create(): void {
    this.applySmoothAtlasFilters();
    this.scene.launch("MinigameOverlayScene", this.payload);
    this.scene.stop();
  }

  private applySmoothAtlasFilters(): void {
    [
      ...Object.values(MINIGAME_UI_ATLAS).map((atlas) => atlas.key),
      ...Object.values(MINIGAME_BUTTON_ATLAS).map((atlas) => atlas.key),
      ...Object.values(GAME_ATLAS).map((atlas) => atlas.key),
      this.payload.config.heroHud?.portraitAtlasKey,
      this.payload.config.combatVisuals?.heroDownAtlas.atlasKey,
      this.payload.config.combatVisuals?.heroUpAtlas.atlasKey,
      this.payload.config.combatVisuals?.heroHorizAtlas.atlasKey,
      this.payload.config.combatVisuals?.monsterDownAtlas.atlasKey,
      this.payload.config.combatVisuals?.monsterHorizAtlas.atlasKey,
    ].forEach((textureKey) => {
      if (!textureKey || !this.textures.exists(textureKey)) {
        return;
      }

      this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
  }
}
