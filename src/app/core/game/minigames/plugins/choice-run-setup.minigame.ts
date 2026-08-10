import Phaser from "phaser";
import {
  buildEventMinigameModePreview,
  DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT,
  EVENT_MINIGAME_MODE_ORDER,
} from "../../phaser/config/event-minigame-mode.config";
import { FrameItem, HeroItem } from "../../../models/game.models";
import { PhaserEventMinigameModeId } from "../../../models/phaser-game-state.model";
import { BaseMinigame } from "../base-minigame";
import { DEFAULT_RUN_SETUP_CHOICE_CONFIG } from "./choice-run-setup.config";

export interface RunSetupChoiceConfig {
  hero: HeroItem;
}

type ChoiceButton = Phaser.GameObjects.Container & {
  background?: Phaser.GameObjects.Rectangle;
};

export class RunSetupChoiceMinigame extends BaseMinigame<PhaserEventMinigameModeId, RunSetupChoiceConfig> {
  create(): void {
    const { layout } = DEFAULT_RUN_SETUP_CHOICE_CONFIG;
    const panelWidth = Math.min(this.width - layout.panelHorizontalMargin, layout.maxPanelWidth);
    const panelHeight = Math.min(this.height - layout.panelVerticalMargin, layout.panelHeight);
    const frameName = "minigame_skill_choice_panel" + BaseMinigame.BACKGROUND_MINIGAME_IMAGE_SET;


    const root = this.scene.add.container(this.centerX, this.centerY);
    this.root.add(root);


    const panelAtlas = this.getMinigameUiPanelAtlas();
    const panel = this.scene.add.image(0, 0, panelAtlas.key, frameName).setDisplaySize(panelWidth, panelHeight);

    const title = this.scene.add.text(0, -panelHeight / 2 - layout.titleOffsetY, "Scegli il ritmo della run", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "24px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: panelWidth - 46 },
    }).setOrigin(0.5);

    const subtitle = this.scene.add.text(0, -panelHeight / 2 - layout.subtitleOffsetY, "La scelta decide quanto spesso compariranno i minigiochi durante l'esplorazione.", {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      align: "center",
      wordWrap: { width: panelWidth - 54 },
    }).setOrigin(0.5);

    root.add([panel, title, subtitle]);

    const options = EVENT_MINIGAME_MODE_ORDER.map((modeId) =>
      buildEventMinigameModePreview(modeId, this.config.hero, DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT),
    );

    const buttonWidth = Math.floor((panelWidth - layout.horizontalPadding) / 4);
    const buttonHeight = layout.buttonHeight;
    const columnGap = layout.columnGap;
    const totalWidth = buttonWidth * 4 + columnGap * 3;
    const startX = -totalWidth / 2 + buttonWidth / 2;

    options.forEach((option, index) => {
      const button = this.createChoiceButton(
        startX + index * (buttonWidth + columnGap),
        -8,
        buttonWidth,
        buttonHeight,
        option.modeId === "luck",
      );

      const titleText = this.scene.add.text(0, -buttonHeight / 2 + 90, option.label, {
        color: "#fff7ed",
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: buttonWidth - 14 },
      }).setOrigin(0.5);

      const description = option.statId
        ? `${option.statId} ${this.formatPercent(option.statInfluencePercent)}`
        : "Bilanciata";

      const detailText = this.scene.add.text(0, 90, description, {
        color: "#e9d5ff",
        fontFamily: "Trebuchet MS",
        fontSize: "10px",
        align: "center",
        wordWrap: { width: buttonWidth - 12 },
      }).setOrigin(0.5);

      const probabilitiesText = this.scene.add.text(0, 44, [
        `C ${this.formatPercent(option.resolvedProbabilities.combat)}`,
        `T ${this.formatPercent(option.resolvedProbabilities.trap)}`,
        `R ${this.formatPercent(option.resolvedProbabilities.treasure)}`,
      ], {
        color: "#d8c6f3",
        fontFamily: "Trebuchet MS",
        fontSize: "10px",
        align: "center",
        lineSpacing: 3,
      }).setOrigin(0.5);

      const icon = this.createIcon(option.iconFrame, 0, buttonHeight / 2 - 120);

      button.add([titleText, detailText, probabilitiesText,  icon]);
      root.add(button);
      this.bindChoice(button, () => this.finish(option.modeId));
    });

    const footer = this.scene.add.text(0, panelHeight / 2 + 34, "Tocca una modalita per iniziare", {
      color: "#d5c18b",
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      align: "center",
    }).setOrigin(0.5);
    root.add(footer);
  }

  private createChoiceButton(x: number, y: number, width: number, height: number, emphasize: boolean): ChoiceButton {
    const button = this.scene.add.container(x, y) as ChoiceButton;
    button.setSize(width, height);

    const shadow = this.scene.add.rectangle(0, 4, width, height, 0x000000, 0.24).setOrigin(0.5);
    const background = this.scene.add.rectangle(0, 0, width, height, emphasize ? 0x6b3f14 : 0x25143e, 0.94)
      .setOrigin(0.5)
      .setStrokeStyle(2, emphasize ? 0xfacc15 : 0xf6d365, 0.92);
    const glow = this.scene.add.rectangle(0, 0, width - 10, height - 10, emphasize ? 0x8b5cf6 : 0x312e81, 0.18)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0xffffff, 0.08);

    //button.background = background;
    button.setData("defaultStrokeColor", emphasize ? 0xfacc15 : 0xf6d365);
    //button.add([shadow, background, glow]);
    return button;
  }

  private bindChoice(target: ChoiceButton, handler: () => void): void {
    this.bindPointer(target, handler);

    target.on("pointerover", () => {
      target.background?.setStrokeStyle(2, 0xffffff, 0.98);
    });

    target.on("pointerout", () => {
      target.background?.setStrokeStyle(2, Number(target.getData("defaultStrokeColor") ?? 0xf6d365), 0.92);
    });
  }

  private finish(modeId: PhaserEventMinigameModeId): void {
    this.complete(modeId);
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private createIcon(frame: FrameItem, x: number, y: number): Phaser.GameObjects.GameObject {
    const resolvedTextureKey = this.findTextureKeyForFrame(frame.name);
    if (resolvedTextureKey) {
      return this.scene.add.image(x, y, resolvedTextureKey, frame.name).setDisplaySize(36, 36);
    }

    return this.scene.add.text(x, y, this.iconLabelFromFrame(frame.name), {
      color: "#fff7ed",
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
  }

  private findTextureKeyForFrame(frameName: string): string | null {
    for (const textureKey of this.scene.textures.getTextureKeys()) {
      if (textureKey === "__DEFAULT" || textureKey === "__MISSING") {
        continue;
      }

      const texture = this.scene.textures.get(textureKey);
      if (texture?.has(frameName)) {
        return textureKey;
      }
    }

    return null;
  }

  private iconLabelFromFrame(frameName: string): string {
    if (frameName.includes("fist")) return "ATK";
    if (frameName.includes("feather")) return "DEX";
    if (frameName.includes("magic")) return "INT";
    if (frameName.includes("mask")) return "LCK";
    return "RUN";
  }
}
