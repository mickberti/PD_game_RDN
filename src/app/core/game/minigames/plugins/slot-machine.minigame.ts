import Phaser from "phaser";
import { BaseMinigame } from "../base-minigame";
import { MinigameConfig, MinigameResult } from "../minigame.model";
import {
  DEFAULT_SLOT_MACHINE_CONFIG,
  SlotMachineConfig,
  SlotMachineSymbol,
  SlotMachineWinRule,
} from "./slot-machine.config";
import { MINIGAME_BUTTON_ATLAS } from "../../phaser/config/game-atlas.config";

type ReelVisual = {
  container: Phaser.GameObjects.Container;
  symbolContainer: Phaser.GameObjects.Container;
  maskGraphics: Phaser.GameObjects.Graphics;
  mask: Phaser.Display.Masks.GeometryMask;
  centerSymbol?: Phaser.GameObjects.Container;
  finalSymbol?: SlotMachineSymbol;
  isSpinning: boolean;
};

export class SlotMachineMinigame extends BaseMinigame {
  // Dimensioni native del frame `slot-king_panel_set3` nell'atlas set3.
  private static readonly PANEL_ASPECT_RATIO = 460 / 562;
  private readonly slotConfig: SlotMachineConfig;
  private panel?: Phaser.GameObjects.Container;
  private readonly reels: ReelVisual[] = [];
  private gems = 0;
  private spinCount = 0;
  private totalRewardGems = 0;
  private wonSpins = 0;
  private jackpotSpins = 0;
  private spinning = false;
  private finished = false;
  private gemsText?: Phaser.GameObjects.Text;
  private spinsText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private spinButton?: Phaser.GameObjects.Container;
  private spinSwipeArea?: Phaser.GameObjects.Rectangle;
  private spinPromptRing?: Phaser.GameObjects.Arc;
  private spinPromptTween?: Phaser.Tweens.Tween;
  private swipeStart?: { pointerId: number; y: number };

  constructor(scene: Phaser.Scene, config: MinigameConfig, onComplete: (result: MinigameResult) => void) {
    super(scene, config, onComplete);
    this.slotConfig = config.slotMachine ?? DEFAULT_SLOT_MACHINE_CONFIG;
    this.gems = Math.max(0, Math.round(this.slotConfig.initialGems));
  }

  override create(): void {
    this.panel = this.createPanel();
    this.buildSlotMachine();
  }

  protected override createPanel(): Phaser.GameObjects.Container {
    const panel = super.createPanel();
    panel.setX(panel.x + 10);
    return panel;
  }

  protected override getPanelDimensions(): { width: number; height: number } {
    const maxWidth = Math.max(1, this.width - 24);
    const maxHeight = Math.max(1, this.height - 72);
    const width = Math.min(maxWidth, maxHeight * SlotMachineMinigame.PANEL_ASPECT_RATIO);

    return {
      width,
      height: width / SlotMachineMinigame.PANEL_ASPECT_RATIO,
    };
  }

  protected override getPanelFrameName(): string {
    return this.slotConfig.panelFrame ?? super.getPanelFrameName();
  }

  override destroy(): void {
    this.reels.forEach((reel) => {
      reel.symbolContainer.clearMask(false);
      reel.mask.destroy();
      reel.maskGraphics.destroy();
    });
    super.destroy();
  }

  private buildSlotMachine(): void {
    if (!this.panel) return;
    const { layout } = this.slotConfig;
    this.gemsText = this.scene.add.text(layout.gemsText.x, layout.gemsText.y, "", { color: "#7dd3fc", fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold" });
    this.spinsText = this.scene.add.text(layout.spinsText.x, layout.spinsText.y, "", {
      color: "#fef3c7", fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold",
    }).setOrigin(1, 0);
    this.statusText = this.scene.add.text(layout.statusText.x, layout.statusText.y, "Premi SPIN per tentare la fortuna.", {
      color: "#fef3c7", fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold", align: "center", wordWrap: { width: 278 },
    }).setOrigin(0.5);
    
    /*
    this.createSpinPrompt(layout.spinButton.x, layout.spinButton.y);
    this.spinButton = this.createActionButton(
      "SPIN",
      layout.spinButton.x,
      layout.spinButton.y,
      58,
      58,
      {
        atlasKey: MINIGAME_BUTTON_ATLAS.iconsSet3.key,
        frameName: "icon-play",
        iconScale: 0.22,
      },
    );*/
    //this.panel.add([this.gemsText, this.spinsText, this.statusText, this.spinButton]);
    this.panel.add([this.gemsText, this.spinsText, this.statusText]);
    this.createSwipeArea();

    layout.reels.forEach((position, index) => this.createReel(
      position.x,
      position.y,
      this.slotConfig.symbols[index % this.slotConfig.symbols.length],
    ));

    //this.bindSpinButton(this.spinButton);
    //this.startSpinPromptAnimation();
    this.refreshCounters();
    if (!this.canAffordSpin()) {
      this.finishSession("Gemme insufficienti per effettuare uno spin.", "#fca5a5");
    }
  }

  private createReel(x: number, y: number, initialSymbol: SlotMachineSymbol): void {
    const animation = this.slotConfig.animation;
    const container = this.scene.add.container(x, y);
    const background = this.scene.add.rectangle(0, 0, animation.reelWidth, animation.reelHeight, 0x251a42, 0.98)
      .setStrokeStyle(2, 0xc4b5fd, 0.72);
    const symbolContainer = this.scene.add.container(0, 0);
    // La graphics della Geometry Mask non deve essere un figlio visibile del rullo:
    // Phaser la usa come sorgente di clipping anche se non viene inserita nella display list.
    const maskGraphics = this.scene.make.graphics({ x: this.centerX + x, y: this.centerY + y });
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRoundedRect(-animation.reelWidth / 2 + 4, -animation.reelHeight / 2 + 4, animation.reelWidth - 8, animation.reelHeight - 8, 10);
    const mask = maskGraphics.createGeometryMask();
    symbolContainer.setMask(mask);
    //container.add([background, symbolContainer]);
    container.add([symbolContainer])
    this.panel?.add(container);

    const reel: ReelVisual = { container, symbolContainer, maskGraphics, mask, isSpinning: false };
    this.reels.push(reel);
    this.populateStaticReel(reel, initialSymbol);
  }

  private bindSpinButton(button: Phaser.GameObjects.Container): void {
    button.setInteractive(new Phaser.Geom.Rectangle(-34, -34, 68, 68), Phaser.Geom.Rectangle.Contains);
    if (button.input) button.input.cursor = "pointer";
    const onPress = (pointer: Phaser.Input.Pointer, _x?: number, _y?: number, event?: Phaser.Types.Input.EventData): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();
      this.spin();
    };
    button.on("pointerdown", onPress as never);
    this.trackDisposer(() => {
      button.off("pointerdown", onPress as never);
      button.disableInteractive();
    });
  }

  private createSpinPrompt(x: number, y: number): void {
    this.spinPromptRing = this.scene.add.circle(x, y, 39, 0xfacc15, 0.08)
      .setStrokeStyle(2, 0xfacc15, 0.9);
    this.panel?.add(this.spinPromptRing);
  }

  private startSpinPromptAnimation(): void {
    if (!this.spinPromptRing || this.finished) {
      return;
    }

    this.spinPromptRing.setVisible(true).setScale(1).setAlpha(0.9);
    if (this.spinPromptTween) {
      this.spinPromptTween.resume();
      return;
    }

    this.spinPromptTween = this.trackTween(this.scene.tweens.add({
      targets: this.spinPromptRing,
      scaleX: 1.22,
      scaleY: 1.22,
      alpha: 0.25,
      duration: 440,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    }));
  }

  private stopSpinPromptAnimation(): void {
    this.spinPromptTween?.pause();
    this.spinPromptRing?.setVisible(false).setScale(1).setAlpha(0.9);
  }

  private createSwipeArea(): void {
    if (!this.panel) {
      return;
    }

    const { swipeArea } = this.slotConfig.layout;
    const area = this.scene.add.rectangle(
      swipeArea.x,
      swipeArea.y,
      swipeArea.width,
      swipeArea.height,
      0x38bdf8,
      0.001,
    ).setStrokeStyle(2, 0x7dd3fc, 0.01);

    this.spinSwipeArea = area;
    this.panel.add([area]);
    this.createSwipeDirectionCue(swipeArea.x, swipeArea.y, swipeArea.height);
    area.setInteractive();
    if (area.input) area.input.cursor = "pointer";

    const onDown = (pointer: Phaser.Input.Pointer): void => {
      if (this.spinning || this.finished) {
        return;
      }
      pointer.event?.preventDefault?.();
      this.swipeStart = { pointerId: pointer.id, y: pointer.y };
    };
    const onUp = (pointer: Phaser.Input.Pointer): void => {
      if (!this.swipeStart || pointer.id !== this.swipeStart.pointerId) {
        return;
      }

      const distance = pointer.y - this.swipeStart.y;
      this.swipeStart = undefined;
      if (distance >= swipeArea.minSwipeDistance) {
        this.spin();
      }
    };

    area.on("pointerdown", onDown as never);
    this.scene.input.on("pointerup", onUp);
    this.scene.input.on("pointerupoutside", onUp);
    this.trackDisposer(() => {
      area.off("pointerdown", onDown as never);
      area.disableInteractive();
      this.scene.input.off("pointerup", onUp);
      this.scene.input.off("pointerupoutside", onUp);
    });
  }

  private createSwipeDirectionCue(x: number, y: number, height: number): void {
    const startY = y - height / 2 + 28;

    [0, 1, 2].forEach((index) => {
      const arrow = this.addAtlasIcon(x, startY + index * 65, MINIGAME_BUTTON_ATLAS.iconsSet4.key, "icon-arrow-down", {
        maxSize: 34,
        tint: 0x7dd3fc,
      }).setAlpha(0.28);
      this.panel?.add(arrow);

      this.trackTween(this.scene.tweens.add({
        targets: arrow,
        y: arrow.y + 10,
        alpha: 0.7,
        duration: 460,
        delay: index * 170,
        ease: "Sine.easeOut",
        yoyo: true,
        repeat: -1,
        repeatDelay: 260,
      }));
    });
  }

  private spin(): void {
    if (this.spinning || this.finished) return;
    if (this.spinCount >= this.maxSpins) {
      this.finishSession(`Limite di ${this.maxSpins} spin raggiunto.`, "#fef3c7");
      return;
    }
    if (!this.canAffordSpin()) {
      this.finishSession("Gemme insufficienti per effettuare un altro spin.", "#fca5a5");
      return;
    }
    this.gems -= this.slotConfig.spinCost;
    this.spinCount += 1;
    this.emitGemChange(-this.slotConfig.spinCost);
    this.refreshCounters();
    this.spinning = true;
    this.spinButton?.disableInteractive();
    this.spinSwipeArea?.disableInteractive();
    this.stopSpinPromptAnimation();
    this.setStatus("I rulli stanno girando...", "#d8b4fe");
    const result = this.resolveSpinResult();
    let stopped = 0;

    this.reels.forEach((reel, index) => {
      this.animateReelSpin(
        reel,
        result.symbols[index],
        this.slotConfig.spinDurationMs + index * this.slotConfig.reelDelayMs,
        () => {
          stopped += 1;
          if (stopped === this.reels.length) this.finishSpin(result);
        },
      );
    });
  }

  private animateReelSpin(
    reel: ReelVisual,
    finalSymbol: SlotMachineSymbol,
    duration: number,
    onComplete: () => void,
  ): void {
    const animation = this.slotConfig.animation;
    const step = animation.symbolSize + animation.symbolGap;
    const cycles = Phaser.Math.Between(animation.reelCyclesMin, animation.reelCyclesMax);
    const finalIndex = cycles + Math.floor(animation.visibleSymbolCount / 2);
    const count = finalIndex + Math.ceil(animation.visibleSymbolCount / 2) + 1;
    reel.isSpinning = true;
    reel.finalSymbol = finalSymbol;
    reel.centerSymbol = undefined;
    reel.symbolContainer.removeAll(true);
    reel.symbolContainer.y = 0;

    for (let index = 0; index < count; index += 1) {
      const symbol = index === finalIndex ? finalSymbol : this.pickWeightedSymbol();
      reel.symbolContainer.add(this.createSymbolView(symbol, index * step));
    }

    this.trackTween(this.scene.tweens.add({
      targets: reel.symbolContainer,
      y: -finalIndex * step,
      duration,
      ease: "Cubic.Out",
      onComplete: () => {
        reel.isSpinning = false;
        this.populateStaticReel(reel, finalSymbol);
        this.playReelStopEffect(reel);
        onComplete();
      },
    }));
  }

  private populateStaticReel(reel: ReelVisual, center: SlotMachineSymbol): void {
    const animation = this.slotConfig.animation;
    const step = animation.symbolSize + animation.symbolGap;
    const middle = Math.floor(animation.visibleSymbolCount / 2);
    reel.symbolContainer.removeAll(true);
    reel.symbolContainer.y = 0;
    reel.centerSymbol = undefined;
    for (let index = 0; index < animation.visibleSymbolCount; index += 1) {
      const symbol = index === middle ? center : this.pickWeightedSymbol();
      const view = this.createSymbolView(symbol, (index - middle) * step);
      reel.symbolContainer.add(view);
      if (index === middle) reel.centerSymbol = view;
    }
  }

  private createSymbolView(symbol: SlotMachineSymbol, y: number): Phaser.GameObjects.Container {
    const size = this.slotConfig.animation.symbolSize;
    const view = this.scene.add.container(0, y);
    const marker = this.scene.add.circle(0, 0, size * 0.42, symbol.fallbackColor, 0.22).setStrokeStyle(2, symbol.fallbackColor, 0.95);
    view.add(marker);
    const hasFrame = !!symbol.atlasKey && !!symbol.frameName && this.scene.textures.exists(symbol.atlasKey) && this.scene.textures.get(symbol.atlasKey).has(symbol.frameName);
    if (hasFrame && symbol.atlasKey && symbol.frameName) {
      view.add(this.addAtlasIcon(0, 0, symbol.atlasKey, symbol.frameName, { maxSize: size * 0.78 }));
      return view;
    }
    view.add(this.scene.add.text(0, 0, symbol.label.slice(0, 3).toUpperCase(), {
      color: "#ffffff", fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold",
    }).setOrigin(0.5));
    return view;
  }

  private playReelStopEffect(reel: ReelVisual): void {
    const animation = this.slotConfig.animation;
    if (!animation.reelStopBounce) return;
    this.trackTween(this.scene.tweens.add({
      targets: reel.container,
      y: reel.container.y + animation.reelStopBounceDistance,
      duration: animation.reelStopBounceDuration,
      yoyo: true,
      ease: "Quad.Out",
    }));
  }

  private finishSpin(result: { symbols: SlotMachineSymbol[]; winRule: SlotMachineWinRule | null }): void {
    this.spinning = false;
    let outcomeMessage: string;
    let outcomeColor: string;
    if (result.winRule) {
      this.gems += result.winRule.rewardGems;
      this.totalRewardGems += result.winRule.rewardGems;
      this.wonSpins += 1;
      if (result.winRule.isJackpot) {
        this.jackpotSpins += 1;
      }
      this.emitGemChange(result.winRule.rewardGems);
      this.refreshCounters();
      outcomeMessage = `${result.winRule.message} +${result.winRule.rewardGems} gemme`;
      outcomeColor = "#bbf7d0";
      this.playWinningReelEffects(result.winRule);
      this.playWinningContainerEffect();
    } else {
      outcomeMessage = "Nessuna combinazione vincente.";
      outcomeColor = "#fecaca";
      this.scene.cameras.main.shake(120, 0.004);
    }

    if (this.spinCount >= this.maxSpins) {
      this.finishSession(`${outcomeMessage}\nLimite di ${this.maxSpins} spin raggiunto.`, outcomeColor);
      return;
    }
    if (!this.canAffordSpin()) {
      this.finishSession(`${outcomeMessage}\nNon hai abbastanza gemme per un altro spin.`, outcomeColor);
      return;
    }

    this.setStatus(outcomeMessage, outcomeColor);
    this.enableSpinButton();
  }

  private playWinningReelEffects(rule: SlotMachineWinRule): void {
    const animation = this.slotConfig.animation;
    this.reels.forEach((reel, index) => {
      if (rule.pattern[index] === "*") return;
      const symbol = reel.centerSymbol;
      if (!symbol) return;
      const glow = this.scene.add.circle(0, 0, animation.symbolSize * 0.5, animation.winIconGlowColor, 0.18)
        .setStrokeStyle(2, animation.winIconGlowColor, 0.7);
      symbol.addAt(glow, 0);
      this.trackTween(this.scene.tweens.add({
        targets: [symbol, glow],
        scaleX: animation.winIconPulseScale,
        scaleY: animation.winIconPulseScale,
        alpha: 0.7,
        duration: animation.winIconPulseDuration,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
        onComplete: () => glow.destroy(),
      }));
    });
  }

  private playWinningContainerEffect(): void {
    if (!this.panel) return;
    const animation = this.slotConfig.animation;
    const glow = this.scene.add.rectangle(0, -4, 306, animation.reelHeight + 106, animation.winFrameGlowColor, 0.06)
      .setStrokeStyle(4, animation.winFrameGlowColor, 0.9);
    this.panel.addAt(glow, 1);
    this.trackTween(this.scene.tweens.add({
      targets: glow,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0,
      duration: animation.winFramePulseDuration,
      repeat: 1,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => glow.destroy(),
    }));
  }

  private resolveSpinResult(): { symbols: SlotMachineSymbol[]; winRule: SlotMachineWinRule | null } {
    if (Math.random() < this.slotConfig.winChance) {
      const rule = this.pickWeightedRule();
      return { symbols: this.buildSymbolsFromRule(rule), winRule: rule };
    }
    let symbols: SlotMachineSymbol[] = [];
    do {
      symbols = Array.from({ length: this.slotConfig.reelCount }, () => this.pickWeightedSymbol());
    } while (this.findWinningRule(symbols));
    return { symbols, winRule: null };
  }

  private buildSymbolsFromRule(rule: SlotMachineWinRule): SlotMachineSymbol[] {
    return rule.pattern.map((symbolId) => symbolId === "*" ? this.pickWeightedSymbol() : this.findSymbol(symbolId));
  }

  private findWinningRule(symbols: readonly SlotMachineSymbol[]): SlotMachineWinRule | null {
    return this.slotConfig.winRules
      .filter((rule) => rule.pattern.every((expected, index) => expected === "*" || symbols[index]?.id === expected))
      .sort((left, right) => right.rewardGems - left.rewardGems)[0] ?? null;
  }

  private pickWeightedRule(): SlotMachineWinRule {
    return this.pickWeighted(this.slotConfig.winRules, (rule) => rule.probabilityWeight) ?? this.slotConfig.winRules[0];
  }

  private pickWeightedSymbol(): SlotMachineSymbol {
    return this.pickWeighted(this.slotConfig.symbols, (symbol) => symbol.weight) ?? this.slotConfig.symbols[0];
  }

  private pickWeighted<T>(values: readonly T[], getWeight: (value: T) => number): T | undefined {
    const total = values.reduce((sum, value) => sum + Math.max(0, getWeight(value)), 0);
    let roll = Math.random() * Math.max(1, total);
    return values.find((value) => (roll -= Math.max(0, getWeight(value))) <= 0) ?? values[values.length - 1];
  }

  private findSymbol(id: string): SlotMachineSymbol {
    return this.slotConfig.symbols.find((symbol) => symbol.id === id) ?? this.slotConfig.symbols[0];
  }

  private refreshCounters(): void {
    this.gemsText?.setText(`Gemme: ${this.gems}   Costo: ${this.slotConfig.spinCost}`);
    this.spinsText?.setText(`Spin: ${this.spinCount}/${this.maxSpins}`);
  }

  private get maxSpins(): number {
    return Math.max(1, Math.round(this.slotConfig.maxSpins));
  }

  private canAffordSpin(): boolean {
    return this.gems >= this.slotConfig.spinCost;
  }

  private enableSpinButton(): void {
    if (this.finished) return;

    if (this.spinButton) {
      this.spinButton.setInteractive(new Phaser.Geom.Rectangle(-34, -34, 68, 68), Phaser.Geom.Rectangle.Contains);
      if (this.spinButton.input) this.spinButton.input.cursor = "pointer";
    }

    this.spinSwipeArea?.setInteractive();
    if (this.spinSwipeArea?.input) this.spinSwipeArea.input.cursor = "pointer";
    this.startSpinPromptAnimation();
  }

  private finishSession(message: string, color: string): void {
    if (this.finished) return;
    this.finished = true;
    this.spinButton?.disableInteractive();
    this.spinSwipeArea?.disableInteractive();
    this.stopSpinPromptAnimation();
    this.setStatus(message, color);
    this.trackTimer(this.scene.time.delayedCall(1200, () => this.complete(this.buildResult())));
  }

  private emitGemChange(delta: number): void {
    this.config.runtimeEventEmitter?.("slot-machine-gems", "Slot machine", { delta, gems: this.gems });
  }

  private setStatus(message: string, color: string): void {
    this.statusText?.setText(message).setColor(color);
  }

  private buildResult(): MinigameResult {
    const won = this.wonSpins > 0;
    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade: this.jackpotSpins > 0 ? "perfect" : won ? "success" : "fail",
      score: this.totalRewardGems,
      usedSkill: "luck",
      fatigueGained: 0,
      rewardMultiplier: won ? 1 : 0,
      damageTaken: 0,
    };
  }
}
