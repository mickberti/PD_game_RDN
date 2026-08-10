import Phaser from "phaser";
import { HERO_ACTIONS, HeroAnimationAction } from "../../models/phaser-hero-animation.models";
import {
  CombatSequenceAction,
  MinigameAnimatedAtlasConfig,
  MinigameCombatEncounterConfig,
  MinigameConfig,
  MinigameHeroHudConfig,
  MinigameMetricDisplayMode,
  MinigameMonsterHudConfig,
  MinigameResultGrade,
  MinigameResult,
} from "./minigame.model";
import { MINIGAME_BUTTON_ATLAS, MINIGAME_UI_ATLAS } from "../phaser/config/game-atlas.config";

type ActionButtonVisualConfig = {
  atlasKey?: string;
  frameName?: string;
  iconScale?: number;
  iconSize?: number;
  tint?: number;
  offsetY?: number;
};

type CombatTimelineAction =
  | HeroAnimationAction
  | "defense"
  | "dodge";

type CombatAnimationStep = {
  action: CombatTimelineAction;
  durationMs: number;
};

type CombatAnimationTimeline = {
  hero: CombatAnimationStep[];
  monster: CombatAnimationStep[];
  totalDurationMs: number;
};

type CombatHudBar = {
  fill: Phaser.GameObjects.Rectangle;
  valueText: Phaser.GameObjects.Text;
  vertical?: boolean;
  total: number;
  size: number;
  baseY: number;
};

type CombatEncounterSnapshot = {
  hero: { hp: number; maxHp: number; mp: number; maxMp: number };
  monster: { name: string; hp: number; maxHp: number; mp: number; maxMp: number };
  totals: {
    heroDamageTaken: number;
    monsterDamageTaken: number;
    heroManaSpent: number;
    monsterManaSpent: number;
    roundsResolved: number;
  };
};

type CombatResolutionReport = {
  heroDamage: number;
  monsterDamage: number;
  heroManaSpent: number;
  monsterManaSpent: number;
  heroBlocked: boolean;
  monsterBlocked: boolean;
  heroDefeated: boolean;
  monsterDefeated: boolean;
};

export abstract class BaseMinigame<TResult = MinigameResult, TConfig = MinigameConfig> {
  private static readonly SHOW_DEBUG_HIT_AREAS = false;
  static readonly BACKGROUND_MINIGAME_IMAGE_SET = '_set2';
  protected readonly root = this.scene.add.container(0, 0).setDepth(4000).setScrollFactor(0);
  private infoOverlay?: Phaser.GameObjects.Container;
  protected heroHudSprite?: Phaser.GameObjects.Sprite;
  protected combatHeroSprite?: Phaser.GameObjects.Sprite;
  protected combatMonsterSprite?: Phaser.GameObjects.Sprite;
  protected combatEncounter?: CombatEncounterSnapshot;
  private readonly disposers: Array<() => void> = [];
  private readonly trackedTweens: Phaser.Tweens.Tween[] = [];
  private readonly trackedTimers: Phaser.Time.TimerEvent[] = [];
  private combatSequenceActiveUntil = 0;
  private completed = false;
  private destroyed = false;
  private readonly heroHudBars = new Map<"hp" | "mp" | "fatigue", CombatHudBar>();
  private readonly monsterHudBars = new Map<"hp" | "mp", CombatHudBar>();
  private heroHudAnchor?: { x: number; y: number };
  private monsterHudAnchor?: { x: number; y: number };
  private combatHeroAnchor?: { x: number; y: number };
  private combatMonsterAnchor?: { x: number; y: number };

  constructor(
    protected readonly scene: Phaser.Scene,
    protected readonly config: TConfig,
    private readonly onComplete: (result: TResult) => void,
  ) {}

  init(): void {
    this.combatEncounter = this.createCombatEncounterSnapshot((this.config as MinigameConfig).combatEncounter);
  }

  abstract create(): void;

  update(_time: number, _delta: number): void {}

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.disposers.splice(0).forEach((dispose) => dispose());
    this.trackedTweens.splice(0).forEach((tween) => tween.stop());
    this.trackedTimers.splice(0).forEach((timer) => timer.remove(false));
    this.infoOverlay?.destroy(true);
    this.infoOverlay = undefined;
    this.root.destroy(true);
  }

  protected complete(result: TResult): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    this.onComplete(result);
  }

  protected get width(): number {
    return Number(this.scene.scale.width);
  }

  protected get height(): number {
    return Number(this.scene.scale.height);
  }

  protected get centerX(): number {
    return this.width / 2;
  }

  protected get centerY(): number {
    return this.height / 2;
  }

  protected trackTween(tween: Phaser.Tweens.Tween): Phaser.Tweens.Tween {
    this.trackedTweens.push(tween);
    return tween;
  }

  protected trackTimer(timer: Phaser.Time.TimerEvent): Phaser.Time.TimerEvent {
    this.trackedTimers.push(timer);
    return timer;
  }

  protected trackDisposer(disposer: () => void): void {
    this.disposers.push(disposer);
  }

  protected completeWithDelay(result: TResult, delayMs = 320): void {
    this.trackTimer(this.scene.time.delayedCall(delayMs, () => this.complete(result)));
  }

  protected hasCombatEncounter(): boolean {
    return Boolean(this.combatEncounter);
  }

  protected isCombatEncounterFinished(): boolean {
    return Boolean(
      this.combatEncounter
      && (this.combatEncounter.hero.hp <= 0 || this.combatEncounter.monster.hp <= 0),
    );
  }

  protected didHeroWinCombatEncounter(): boolean {
    return Boolean(this.combatEncounter && this.combatEncounter.monster.hp <= 0 && this.combatEncounter.hero.hp > 0);
  }

  protected showTrapHeroDamageFeedback(damageTaken: number): void {
    if (damageTaken <= 0) {
      return;
    }

    this.showCombatFloatingText("hero", `-${Math.round(damageTaken)}`, "#fecaca");
    this.emitRuntimeGameplayEvent("hero-damaged", "Minigioco trappola: eroe colpito", {
      damage: Math.round(damageTaken),
      source: "trap-minigame",
    });
    this.scene.cameras.main.shake(120, 0.008);

    const spriteTarget = this.heroHudSprite ?? this.combatHeroSprite;
    if (spriteTarget) {
      this.trackTween(this.scene.tweens.add({
        targets: spriteTarget,
        alpha: 0.35,
        yoyo: true,
        repeat: 2,
        duration: 70,
        ease: "Sine.easeInOut",
      }));
    }
  }

  protected playTrapSuccessJuice(target?: Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle): void {
    this.playTrapButtonJuice(target, 0x22c55e, 1.08);
  }

  protected playTrapErrorJuice(target?: Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle): void {
    this.playTrapButtonJuice(target, 0xef4444, 1.05);
    this.scene.cameras.main.shake(80, 0.004);
  }

  protected getCombatEncounterTotals(): CombatEncounterSnapshot["totals"] {
    return this.combatEncounter?.totals ?? {
      heroDamageTaken: 0,
      monsterDamageTaken: 0,
      heroManaSpent: 0,
      monsterManaSpent: 0,
      roundsResolved: 0,
    };
  }

  protected pickCombatSequenceAction(): CombatSequenceAction {
    const encounter = this.combatEncounter;
    const actionPool: CombatSequenceAction[] = ["attack", "defense", "special"];
    if ((encounter?.monster.mp ?? 0) > 0) {
      actionPool.push("defenseSpecial");
    }

    return Phaser.Utils.Array.GetRandom(actionPool);
  }

  protected isCombatSequenceActive(): boolean {
    return this.scene.time.now < this.combatSequenceActiveUntil;
  }

  protected getRemainingCombatSequenceMs(): number {
    return Math.max(0, this.combatSequenceActiveUntil - this.scene.time.now);
  }

  protected animateButtonPress(target: Phaser.GameObjects.Container): void {
    this.trackTween(this.scene.tweens.add({
      targets: target,
      scaleX: 0.94,
      scaleY: 0.94,
      yoyo: true,
      duration: 90,
      ease: "Quad.easeOut",
    }));
  }

  protected flashButtonVisual(target: Phaser.GameObjects.Container, color: number): void {
    const visualTarget = target.getAll().find((child) =>
      child instanceof Phaser.GameObjects.Image
      || child instanceof Phaser.GameObjects.Sprite
      || child instanceof Phaser.GameObjects.Text,
    ) as (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Text | undefined);

    if (!visualTarget) {
      return;
    }

    const originalTint = "tintTopLeft" in visualTarget ? visualTarget.tintTopLeft : undefined;
    this.trackTween(this.scene.tweens.add({
      targets: target,
      scaleX: 1.06,
      scaleY: 1.06,
      yoyo: true,
      duration: 90,
      ease: "Quad.easeOut",
      onStart: () => {
        if ("setTint" in visualTarget) {
          visualTarget.setTint(color);
        }
      },
      onComplete: () => {
        if ("clearTint" in visualTarget) {
          if (originalTint !== undefined && originalTint !== 0xffffff) {
            visualTarget.setTint(originalTint);
            return;
          }
          visualTarget.clearTint();
        }
      },
    }));
  }

  protected bindPointer(
    target: Phaser.GameObjects.GameObject,
    handler: () => void,
  ): void {
    type InteractiveTarget = Phaser.GameObjects.GameObject & {
      setInteractive: (
        hitArea?: Phaser.Types.Input.InputConfiguration | Phaser.Geom.Rectangle,
        callback?: Phaser.Types.Input.HitAreaCallback
      ) => Phaser.GameObjects.GameObject;
      disableInteractive: () => Phaser.GameObjects.GameObject;
      on: (event: string, fn: (...args: unknown[]) => void) => Phaser.GameObjects.GameObject;
      off: (event: string, fn: (...args: unknown[]) => void) => Phaser.GameObjects.GameObject;
      width?: number;
      height?: number;
      displayWidth?: number;
      displayHeight?: number;
      setSize?: (width: number, height: number) => Phaser.GameObjects.GameObject;
      input?: Phaser.Types.Input.InteractiveObject;
    };

    const interactiveTarget = target as InteractiveTarget;
    const visualTarget = target as Phaser.GameObjects.Container;
    const isContainer = target instanceof Phaser.GameObjects.Container;
    const width = Math.max(1, Number(interactiveTarget.displayWidth ?? interactiveTarget.width ?? 0));
    const height = Math.max(1, Number(interactiveTarget.displayHeight ?? interactiveTarget.height ?? 0));

    if (isContainer && typeof interactiveTarget.setSize === "function") {
      interactiveTarget.setSize(width, height);
      interactiveTarget.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, width, height),
        Phaser.Geom.Rectangle.Contains,
      );
    } else {
      interactiveTarget.setInteractive({ useHandCursor: true });
    }

    if (interactiveTarget.input) {
      interactiveTarget.input.cursor = "pointer";
    }

    const handlePointerDown = (
      pointer: Phaser.Input.Pointer,
      _localX?: number,
      _localY?: number,
      event?: Phaser.Types.Input.EventData,
    ): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();

      if (visualTarget instanceof Phaser.GameObjects.Container) {
        this.animateButtonPress(visualTarget);
      }
    };

    const handlePointerUp = (
      pointer: Phaser.Input.Pointer,
      _localX?: number,
      _localY?: number,
      event?: Phaser.Types.Input.EventData,
    ): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();
      handler();
    };

    const handlePointerOut = (): void => {
      if (visualTarget instanceof Phaser.GameObjects.Container) {
        visualTarget.setScale(1);
      }
    };

    interactiveTarget.on("pointerdown", handlePointerDown as never);
    interactiveTarget.on("pointerup", handlePointerUp as never);
    interactiveTarget.on("pointerout", handlePointerOut as never);

    this.disposers.push(() => {
      interactiveTarget.off("pointerdown", handlePointerDown as never);
      interactiveTarget.off("pointerup", handlePointerUp as never);
      interactiveTarget.off("pointerout", handlePointerOut as never);
      interactiveTarget.disableInteractive();
    });
  }

  protected createPanel(): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(this.centerX -12, this.centerY);
    const panelFrame = this.getPanelFrameName();
    const { width: panelWidth, height: panelHeight } = this.getPanelDimensions();
    const panelConfig = this.config as MinigameConfig;
    const panelAtlas = this.getMinigameUiPanelAtlas();
    const frameExists = this.scene.textures.exists(panelAtlas.key)
      && this.scene.textures.get(panelAtlas.key).has(panelFrame);

    if (frameExists) {
      this.applyLinearFilterToTexture(panelAtlas.key);
    }

    const background = frameExists
      ? this.scene.add.image(0, 0, panelAtlas.key, panelFrame).setDisplaySize(panelWidth, panelHeight)
      : this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2e1a47, 0.96).setStrokeStyle(4, 0xf6d365, 0.95);

    const title = this.scene.add.text(12, -panelHeight / 2 - 30, panelConfig.title, {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "21px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: panelWidth - 100 },
    }).setOrigin(0.5, 0);
    const subtitle = this.scene.add.text(12, panelHeight / 2 + 10, panelConfig.subtitle, {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      align: "center",
      wordWrap: { width: panelWidth - 100 },
    }).setOrigin(0.5, 0);

    panel.add([background, title, subtitle]);
    const heroHud = this.createHeroHud(panelWidth, panelHeight, panelConfig.heroHud);
    if (heroHud.length > 0) {
      panel.add(heroHud);
    }
    const monsterHud = this.createMonsterHud(panelWidth, panelHeight, panelConfig.monsterHud, panelConfig.combatVisuals);
    if (monsterHud.length > 0) {
      panel.add(monsterHud);
    }
    this.createInfoButton(panel, panelWidth, panelHeight);
    this.root.add(panel);
    this.syncCombatHud();
    return panel;
  }

  /**
   * Dimensioni logiche del pannello di sfondo. I minigiochi che usano artwork
   * con un rapporto specifico possono fare override senza cambiare il canvas.
   */
  protected getPanelDimensions(): { width: number; height: number } {
    return {
      width: Math.max(1, this.width - 24),
      height: Math.max(1, this.height - 72),
    };
  }

  private createInfoButton(
    panel: Phaser.GameObjects.Container,
    panelWidth: number,
    panelHeight: number,
  ): void {
    const x = -panelWidth / 2 + 28;
    const y = panelHeight / 2 + 28;
    const button = this.scene.add.container(x, y).setSize(44, 44);
    const glow = this.scene.add.circle(0, 0, 20, 0x38bdf8, 0.16)
      .setStrokeStyle(2, 0x7dd3fc, 0.9);
    const icon = this.addAtlasIcon(0, 0, MINIGAME_BUTTON_ATLAS.iconsSet3.key, "icon-info", {
      maxSize: 32,
      tint: 0xe0f2fe,
    });
    button.add([glow, icon]);
    panel.add(button);

    button.setInteractive(new Phaser.Geom.Rectangle(0, 0, 44, 44), Phaser.Geom.Rectangle.Contains);
    if (button.input) button.input.cursor = "pointer";
    const onInfoPress = (pointer: Phaser.Input.Pointer, _x?: number, _y?: number, event?: Phaser.Types.Input.EventData): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();
      this.toggleInfoPanel();
    };
    button.on("pointerdown", onInfoPress as never);
    this.trackDisposer(() => {
      button.off("pointerdown", onInfoPress as never);
      button.disableInteractive();
    });
  }

  private toggleInfoPanel(): void {
    if (this.infoOverlay) {
      this.closeInfoPanel();
      return;
    }

    this.openInfoPanel();
  }

  private openInfoPanel(): void {
    const overlay = this.scene.add.container(0, 0).setDepth(4700).setScrollFactor(0);
    const width = Math.min(300, this.width - 80);
    const height = Math.min(430, this.height - 150);
    const centerX = this.centerX;
    const centerY = this.centerY;
    const panelConfig = this.config as MinigameConfig;
    const panelAtlas = MINIGAME_UI_ATLAS.panelSet2;
    const panelFrame = "minigame_skill_choice_panel_set2";
    const frameExists = this.scene.textures.exists(panelAtlas.key)
      && this.scene.textures.get(panelAtlas.key).has(panelFrame);

    const blocker = this.scene.add.rectangle(0, 0, this.width, this.height, 0x020617, 0.88)
      .setOrigin(0)
      .setInteractive();
    const background = frameExists
      ? this.scene.add.image(centerX, centerY, panelAtlas.key, panelFrame).setDisplaySize(width, height)
      : this.scene.add.rectangle(centerX, centerY, width, height, 0x101827, 0.98).setStrokeStyle(3, 0x7dd3fc, 0.9);
    const panelHitArea = this.scene.add.rectangle(centerX, centerY, width, height, 0xffffff, 0.001)
      .setInteractive();
    const title = this.scene.add.text(centerX, centerY - height / 2 + 24, `${panelConfig.title} · INFO`, {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "21px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: width - 52 },
    }).setOrigin(0.5, 0);
    const content = this.scene.add.text(centerX - width / 2 + 24, centerY - height / 2 + 70, this.buildInfoText(), {
      color: "#e2e8f0",
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      lineSpacing: 5,
      wordWrap: { width: width - 48 },
    });
    const close = this.scene.add.container(centerX + width / 2 - 28, centerY - height / 2 + 35).setSize(40, 40);
    const closeIcon = this.addAtlasIcon(0, 0, MINIGAME_BUTTON_ATLAS.iconsSet3.key, "icon-cancel", {
      maxSize: 30,
      tint: 0xfecaca,
    });
    close.add(closeIcon);

    overlay.add([blocker, background, panelHitArea, title, content, close]);
    this.infoOverlay = overlay;

    blocker.on("pointerdown", () => this.closeInfoPanel());
    panelHitArea.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    close.setInteractive(new Phaser.Geom.Rectangle(0, 0, 40, 40), Phaser.Geom.Rectangle.Contains);
    if (close.input) close.input.cursor = "pointer";
    close.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.closeInfoPanel();
    });
  }

  private closeInfoPanel(): void {
    this.infoOverlay?.destroy(true);
    this.infoOverlay = undefined;
  }

  private buildInfoText(): string {
    const config = this.config as MinigameConfig;
    const event = config.event;
    const secondarySkill = event.secondarySkill
      ? ` · ${event.secondarySkill} ${config.heroStats[event.secondarySkill]}`
      : "";
    const lines = [
      "COME SI GIOCA",
      this.getInfoInstructions(config.type),
      "",
      "PARAMETRI APPLICATI",
      `Difficolta: ${event.difficulty}/10`,
      `Skill: ${event.primarySkill} ${config.heroStats[event.primarySkill]}${secondarySkill}`,
      `Ricompensa base: ${Math.round(Number(event.rewardValue ?? 0))}`,
    ];

    if (config.timeLimitMs) {
      lines.push(`Tempo disponibile: ${(config.timeLimitMs / 1000).toFixed(1)} s`);
    }
    if (config.objectiveCount) {
      lines.push(`Obiettivi: ${config.objectiveCount}`);
    }
    if (config.zones) {
      lines.push(`Zone: perfetta ${Math.round(config.zones.perfect)} · successo ${Math.round(config.zones.success)} · parziale ${Math.round(config.zones.partial)}`);
    }
    const luckPromotionChance = this.getLuckPromotionChance(config.type, config.heroStats.luck);
    if (luckPromotionChance !== null) {
      lines.push(`Successo → perfetto con Fortuna: ${luckPromotionChance.toFixed(1)}%`);
    }
    if (config.slotMachine) {
      const slot = config.slotMachine;
      const totalWeight = slot.winRules.reduce((sum, rule) => sum + Math.max(0, rule.probabilityWeight), 0);
      lines.push("", "SLOT: PROBABILITA E PREMI", `Vincita per spin: ${(slot.winChance * 100).toFixed(1)}% · Costo: ${slot.spinCost} gemme`);
      slot.winRules.forEach((rule) => {
        const chance = totalWeight > 0 ? slot.winChance * rule.probabilityWeight / totalWeight * 100 : 0;
        lines.push(`${rule.label}: ${chance.toFixed(2)}% · +${rule.rewardGems} gemme`);
      });
    }

    return lines.join("\n");
  }

  private getLuckPromotionChance(type: MinigameConfig["type"], luck: number): number | null {
    const supportsLuckPromotion = type === "combatTiming"
      || type === "reflexSequence"
      || type === "lockpickTiming"
      || type === "pressureLock";
    return supportsLuckPromotion ? Phaser.Math.Clamp(luck * 0.5, 0, 25) : null;
  }

  private getInfoInstructions(type: MinigameConfig["type"]): string {
    const instructions: Record<MinigameConfig["type"], string> = {
      combatTiming: "Ferma il cursore nella zona migliore per infliggere il massimo danno.",
      combatTargetTap: "Tocca rapidamente i bersagli utili e evita quelli pericolosi.",
      combatTargetDir: "Trascina ogni bersaglio nella direzione mostrata prima che scompaia.",
      combatChargeRelease: "Carica l'azione e rilascia nella zona ideale.",
      slotMachine: "Premi l'icona Play o trascina verso il basso nell'area a destra per far girare i rulli.",
      reflexSequence: "Memorizza e ripeti la sequenza indicata prima dello scadere del tempo.",
      trapLaneRunner: "Cambia corsia per evitare gli ostacoli in arrivo.",
      trapRuneStep: "Memorizza la runa sicura e selezionala a ogni round.",
      lockpickTiming: "Allinea il cursore alle zone di precisione per aprire la serratura.",
      lockpickDualAxis: "Sposta e ruota il grimaldello mantenendolo nella zona sicura.",
      pressureLock: "Regola la pressione fino a completare tutti gli impulsi richiesti.",
    };
    return instructions[type];
  }

  protected createActionButton(
    label: string,
    x: number,
    y: number,
    width = 170,
    height = 54,
    visual?: ActionButtonVisualConfig,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);
    button.setSize(width, height);
    const hitbox = this.scene.add.rectangle(
      0,
      0,
      width,
      height,
      0x38bdf8,
      BaseMinigame.SHOW_DEBUG_HIT_AREAS ? 0.18 : 0.001,
    );
    if (BaseMinigame.SHOW_DEBUG_HIT_AREAS) {
      hitbox.setStrokeStyle(2, 0xe0f2fe, 0.95);
    }
    const buttonObjects: Phaser.GameObjects.GameObject[] = [];

    const frameExists = Boolean(
      visual?.atlasKey
      && visual?.frameName
      && this.scene.textures.exists(visual.atlasKey)
      && this.scene.textures.get(visual.atlasKey).has(visual.frameName),
    );

    if (frameExists && visual?.atlasKey && visual?.frameName) {
      const icon = this.addAtlasIcon(0, visual.offsetY ?? 0, visual.atlasKey, visual.frameName, {
        maxSize: visual.iconSize ?? this.resolveAtlasIconSize(visual.atlasKey, visual.frameName, visual.iconScale, width, height),
        tint: visual.tint,
      });
      buttonObjects.push(icon);
    } else {
      const text = this.scene.add.text(0, 0, label, {
        color: "#fff7ed",
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: width - 12 },
      }).setOrigin(0.5);
      buttonObjects.push(text);
    }

    buttonObjects.push(hitbox);
    button.add(buttonObjects);
    return button;
  }

  protected createCombatActors(options?: {
    x?: number;
    y?: number;
    heroOffsetX?: number;
    monsterOffsetX?: number;
    heroMaxSize?: number;
    monsterMaxSize?: number;
  }): Phaser.GameObjects.GameObject[] {
    const panelConfig = this.config as MinigameConfig;
    const combatVisuals = panelConfig.combatVisuals;
    if (panelConfig.event?.type !== "monster" || !combatVisuals) {
      return [];
    }

    this.ensureAtlasAnimations(combatVisuals.heroHorizAtlas);
    this.ensureAtlasAnimations(combatVisuals.heroDownAtlas);
    this.ensureAtlasAnimations(combatVisuals.monsterHorizAtlas);

    const centerX = options?.x ?? 0;
    const centerY = options?.y ?? 0;
    const heroX = centerX + (options?.heroOffsetX ?? -56);
    const monsterX = centerX + (options?.monsterOffsetX ?? 56);
    const heroMaxSize = options?.heroMaxSize ?? 76;
    const monsterMaxSize = options?.monsterMaxSize ?? 76;
    const aura = this.scene.add.ellipse(centerX, centerY - 6, 202, 128, 0xf6d365, 0.04)
      .setStrokeStyle(2, 0xf6d365, 0.08);
    const stage = this.scene.add.ellipse(centerX, centerY + 44, 184, 36, 0x0f172a, 0.72)
      .setStrokeStyle(2, 0xf6d365, 0.18);
    const heroShadow = this.scene.add.ellipse(heroX, centerY + 40, 48, 16, 0x020617, 0.42);
    const monsterShadow = this.scene.add.ellipse(monsterX, centerY + 40, 48, 16, 0x020617, 0.42);

    this.combatHeroSprite = this.createAnimatedSprite(
      heroX,
      centerY + 10,
      combatVisuals.heroHorizAtlas,
      heroMaxSize,
      false,
    );
    this.combatMonsterSprite = this.createAnimatedSprite(
      monsterX,
      centerY + 10,
      combatVisuals.monsterHorizAtlas,
      monsterMaxSize,
      true,
      combatVisuals.monsterScale,
    );
    this.playAnimatedSpriteAction(this.combatHeroSprite, combatVisuals.heroHorizAtlas, "idle");
    this.playAnimatedSpriteAction(this.combatMonsterSprite, combatVisuals.monsterHorizAtlas, "idle");
    this.combatHeroAnchor = { x: this.centerX + heroX, y: this.centerY + centerY - 20 };
    this.combatMonsterAnchor = { x: this.centerX + monsterX, y: this.centerY + centerY - 20 };

    return [aura, stage, heroShadow, monsterShadow, this.combatHeroSprite, this.combatMonsterSprite];
  }

  protected setCombatActorsIdle(): void {
    const panelConfig = this.config as MinigameConfig;
    const combatVisuals = panelConfig.combatVisuals;
    if (!combatVisuals) {
      return;
    }

    if (this.combatHeroSprite) {
      this.playAnimatedSpriteAction(this.combatHeroSprite, combatVisuals.heroHorizAtlas, "idle");
    }
    if (this.heroHudSprite) {
      this.playAnimatedSpriteAction(this.heroHudSprite, combatVisuals.heroDownAtlas, "idle");
    }
    if (this.combatMonsterSprite) {
      this.playAnimatedSpriteAction(this.combatMonsterSprite, combatVisuals.monsterHorizAtlas, "idle");
    }
  }

  protected playCombatAction(action: CombatSequenceAction, hitMonster = false): void {
    this.playCombatHeroAction(action, { fullSequence: true });
    if (hitMonster) {
      this.playCombatMonsterHit({ fullSequence: true });
    }
  }

  protected playCombatResolution(action: CombatSequenceAction, grade: MinigameResultGrade): number {
    const timeline = this.buildCombatTimeline(action, grade);
    this.playCombatTimeline(timeline);
    return timeline.totalDurationMs;
  }

  protected resolveCombatEncounterPhase(action: CombatSequenceAction, grade: MinigameResultGrade): CombatResolutionReport {
    const encounter = this.combatEncounter;
    const panelConfig = this.config as MinigameConfig;
    if (!encounter) {
      return {
        heroDamage: 0,
        monsterDamage: 0,
        heroManaSpent: 0,
        monsterManaSpent: 0,
        heroBlocked: false,
        monsterBlocked: false,
        heroDefeated: false,
        monsterDefeated: false,
      };
    }

    const heroAttackBase = Math.max(6, Math.round(panelConfig.heroStats.strength * 1.35 + panelConfig.event.difficulty * 2.2));
    const heroSpecialBase = Math.max(10, Math.round(panelConfig.heroStats.intelligence * 1.05 + panelConfig.heroStats.strength * 0.9 + panelConfig.event.difficulty * 2.8));
    const monsterAttackBase = Math.max(4, Math.round(Number(panelConfig.event.damageValue ?? 8) + panelConfig.event.difficulty * 0.8));
    const monsterSpecialBase = Math.max(monsterAttackBase + 4, Math.round(monsterAttackBase * 1.55));
    const heroSpecialManaCost = Math.max(6, Math.round(7 + panelConfig.event.difficulty * 0.9));
    const monsterSpecialManaCost = Math.max(5, Math.round(6 + panelConfig.event.difficulty * 0.8));
    const offenseMultiplier = grade === "perfect" ? 1 : grade === "success" ? 0.72 : grade === "partial" ? 0.42 : 0;

    let heroDamage = 0;
    let monsterDamage = 0;
    let heroManaSpent = 0;
    let monsterManaSpent = 0;
    let heroBlocked = false;
    let monsterBlocked = false;

    if (action === "attack") {
      monsterDamage = Math.round(heroAttackBase * offenseMultiplier);
      monsterBlocked = grade === "partial" || grade === "fail";
    } else if (action === "special") {
      heroManaSpent = Math.min(encounter.hero.mp, heroSpecialManaCost);
      encounter.hero.mp = Math.max(0, encounter.hero.mp - heroManaSpent);
      if (heroManaSpent < heroSpecialManaCost) {
        heroDamage = Math.round(monsterAttackBase * 0.45);
      } else {
        monsterDamage = Math.round(heroSpecialBase * (grade === "perfect" ? 1.28 : grade === "success" ? 0.94 : grade === "partial" ? 0.58 : 0));
      }
      monsterBlocked = grade === "partial" || grade === "fail" || heroManaSpent < heroSpecialManaCost;
    } else if (action === "defense") {
      heroDamage = Math.round(monsterAttackBase * (grade === "perfect" ? 0 : grade === "success" ? 0.24 : grade === "partial" ? 0.58 : 1));
      heroBlocked = grade !== "fail";
    } else {
      monsterManaSpent = Math.min(encounter.monster.mp, monsterSpecialManaCost);
      encounter.monster.mp = Math.max(0, encounter.monster.mp - monsterManaSpent);
      const specialMultiplier = monsterManaSpent < monsterSpecialManaCost
        ? 0.78
        : 1;
      heroDamage = Math.round(monsterSpecialBase * specialMultiplier * (grade === "perfect" ? 0.18 : grade === "success" ? 0.42 : grade === "partial" ? 0.82 : 1.12));
      heroBlocked = grade !== "fail";
    }

    encounter.hero.hp = Math.max(0, encounter.hero.hp - heroDamage);
    encounter.monster.hp = Math.max(0, encounter.monster.hp - monsterDamage);
    encounter.totals.heroDamageTaken += heroDamage;
    encounter.totals.monsterDamageTaken += monsterDamage;
    encounter.totals.heroManaSpent += heroManaSpent;
    encounter.totals.monsterManaSpent += monsterManaSpent;
    encounter.totals.roundsResolved += 1;
    this.syncCombatHud();
    this.showCombatResolutionTexts(action, heroDamage, monsterDamage, heroManaSpent, monsterManaSpent, heroBlocked, monsterBlocked);
    this.emitCombatResolutionEvents(action, heroDamage, monsterDamage, heroBlocked);
    this.playCombatJuice(action, grade, heroDamage, monsterDamage);

    return {
      heroDamage,
      monsterDamage,
      heroManaSpent,
      monsterManaSpent,
      heroBlocked,
      monsterBlocked,
      heroDefeated: encounter.hero.hp <= 0,
      monsterDefeated: encounter.monster.hp <= 0,
    };
  }

  protected playCombatHeroAction(
    action: CombatSequenceAction,
    options?: { fullSequence?: boolean; returnToIdle?: boolean },
  ): void {
    const combatVisuals = (this.config as MinigameConfig).combatVisuals;
    if (!combatVisuals) {
      return;
    }

    const mappedAction = this.mapCombatAction(action);
    if (this.combatHeroSprite) {
      this.playAnimatedSpriteAction(this.combatHeroSprite, combatVisuals.heroHorizAtlas, mappedAction, options);
    }
    if (this.heroHudSprite) {
      this.playAnimatedSpriteAction(this.heroHudSprite, combatVisuals.heroDownAtlas, mappedAction, options);
    }
  }

  protected playCombatMonsterAction(
    action: HeroAnimationAction,
    options?: { fullSequence?: boolean; returnToIdle?: boolean },
  ): void {
    const combatVisuals = (this.config as MinigameConfig).combatVisuals;
    if (!combatVisuals || !this.combatMonsterSprite) {
      return;
    }

    this.playAnimatedSpriteAction(this.combatMonsterSprite, combatVisuals.monsterHorizAtlas, action, options);
  }

  protected playCombatHeroHit(options?: { fullSequence?: boolean; returnToIdle?: boolean }): void {
    const combatVisuals = (this.config as MinigameConfig).combatVisuals;
    if (!combatVisuals) {
      return;
    }

    if (this.combatHeroSprite) {
      this.playAnimatedSpriteAction(this.combatHeroSprite, combatVisuals.heroHorizAtlas, "hit", options);
    }
    if (this.heroHudSprite) {
      this.playAnimatedSpriteAction(this.heroHudSprite, combatVisuals.heroDownAtlas, "hit", options);
    }
  }

  protected playCombatMonsterHit(options?: { fullSequence?: boolean; returnToIdle?: boolean }): void {
    const combatVisuals = (this.config as MinigameConfig).combatVisuals;
    if (!combatVisuals || !this.combatMonsterSprite) {
      return;
    }

    this.playAnimatedSpriteAction(this.combatMonsterSprite, combatVisuals.monsterHorizAtlas, "hit", options);
  }

  protected playCombatHeroIdle(): void {
    const combatVisuals = (this.config as MinigameConfig).combatVisuals;
    if (!combatVisuals) {
      return;
    }

    if (this.combatHeroSprite) {
      this.playAnimatedSpriteAction(this.combatHeroSprite, combatVisuals.heroHorizAtlas, "idle");
    }
    if (this.heroHudSprite) {
      this.playAnimatedSpriteAction(this.heroHudSprite, combatVisuals.heroDownAtlas, "idle");
    }
  }

  protected playCombatMonsterIdle(): void {
    const combatVisuals = (this.config as MinigameConfig).combatVisuals;
    if (!combatVisuals || !this.combatMonsterSprite) {
      return;
    }

    this.playAnimatedSpriteAction(this.combatMonsterSprite, combatVisuals.monsterHorizAtlas, "idle");
  }

  protected isMetricBarVisible(mode?: MinigameMetricDisplayMode): boolean {
    return (mode ?? "both") !== "text";
  }

  protected isMetricTextVisible(mode?: MinigameMetricDisplayMode): boolean {
    return (mode ?? "both") !== "bar";
  }

  protected applyLinearFilterToTexture(textureKey: string): void {
    if (!this.scene.textures.exists(textureKey)) {
      return;
    }

    this.scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  protected addAtlasIcon(
    x: number,
    y: number,
    atlasKey: string,
    frameName: string,
    options?: {
      maxSize?: number;
      scale?: number;
      tint?: number;
      originX?: number;
      originY?: number;
    },
  ): Phaser.GameObjects.Image {
    this.applyLinearFilterToTexture(atlasKey);

    const icon = this.scene.add
      .image(Math.round(x), Math.round(y), atlasKey, frameName)
      .setOrigin(options?.originX ?? 0.5, options?.originY ?? 0.5);
    const texture = this.scene.textures.exists(atlasKey)
      ? this.scene.textures.get(atlasKey)
      : undefined;
    const frame = texture?.get(frameName);
    const sourceWidth = Math.max(1, Math.round(Number(frame?.width ?? icon.width)));
    const sourceHeight = Math.max(1, Math.round(Number(frame?.height ?? icon.height)));
    const targetMaxSize = options?.maxSize
      ?? (options?.scale !== undefined
        ? Math.max(1, Math.round(Math.max(sourceWidth, sourceHeight) * options.scale))
        : undefined);

    if (targetMaxSize !== undefined) {
      const ratio = targetMaxSize / Math.max(sourceWidth, sourceHeight);
      icon.setDisplaySize(
        Math.max(1, Math.round(sourceWidth * ratio)),
        Math.max(1, Math.round(sourceHeight * ratio)),
      );
    }

    if (options?.tint !== undefined) {
      icon.setTint(options.tint);
    }

    return icon;
  }

  private resolveAtlasIconSize(
    atlasKey: string,
    frameName: string,
    iconScale: number | undefined,
    buttonWidth: number,
    buttonHeight: number,
  ): number {
    if (!this.scene.textures.exists(atlasKey)) {
      return Math.max(1, Math.round(Math.min(buttonWidth, buttonHeight) * 0.52));
    }

    const frame = this.scene.textures.get(atlasKey).get(frameName);
    const sourceMaxSize = Math.max(1, Math.round(Math.max(
      Number(frame?.width ?? 0),
      Number(frame?.height ?? 0),
    )));

    if (iconScale !== undefined) {
      return Math.max(1, Math.round(sourceMaxSize * iconScale));
    }

    return Math.max(1, Math.round(Math.min(buttonWidth, buttonHeight) * 0.52));
  }

  private createHeroHud(
    panelWidth: number,
    panelHeight: number,
    heroHud?: MinigameHeroHudConfig,
  ): Phaser.GameObjects.GameObject[] {
 
    const panelConfig = this.config as MinigameConfig;
    if (!heroHud || panelConfig.event?.type === "slot") {
      return [];
    }

    this.applyLinearFilterToTexture(heroHud.portraitAtlasKey);
    const combatVisuals = panelConfig.combatVisuals;
    if (combatVisuals) {
      this.ensureAtlasAnimations(combatVisuals.heroDownAtlas);
    }

    const topY = -panelHeight / 2 + 33;
    const portraitX = -panelWidth / 2 + 46;
    const portraitY = topY + 34;
    this.heroHudAnchor = { x: this.centerX + portraitX, y: this.centerY + portraitY - 28 };
    const portraitFrame = this.scene.add.rectangle(portraitX, portraitY, 54, 54, 0x0f172a, 0.88)
      .setStrokeStyle(2, 0xf6d365, 0.8);
    const portraitInset = this.scene.add.rectangle(portraitX, portraitY, 46, 46, 0x1e293b, 0.42)
      .setStrokeStyle(1, 0xffffff, 0.1);
    const barsX = portraitX + 35;
    const barWidth = 80;
    const barHeight = 8;
    const barGap = 16;
    const firstBarY = topY + 23;
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#f8fafc",
      fontFamily: "Trebuchet MS",
      fontSize: "9px",
      fontStyle: "bold",
      align: "left",
    };

    const barObjects: Phaser.GameObjects.GameObject[] = [
      //portraitFrame,
      //portraitInset,
    ];

    if (combatVisuals) {
      this.heroHudSprite = this.createAnimatedSprite(
        portraitX,
        portraitY + 1,
        combatVisuals.heroDownAtlas,
        42,
        false,
      );
      this.playAnimatedSpriteAction(this.heroHudSprite, combatVisuals.heroDownAtlas, "idle");
      barObjects.push(this.heroHudSprite);
    } else {
      const portrait = this.addAtlasIcon(portraitX, portraitY, heroHud.portraitAtlasKey, heroHud.portraitFrameName, {
        maxSize: 42,
      });
      barObjects.push(portrait);
    }

    const barConfigs = [
      { label: "HP", value: heroHud.health.current, total: heroHud.health.total, color: 0xef4444, textColor: "#fecaca" },
      { label: "MP", value: heroHud.mana.current, total: heroHud.mana.total, color: 0x38bdf8, textColor: "#bae6fd" },
      { label: "FT", value: heroHud.fatigue.current, total: heroHud.fatigue.total, color: 0xf97316, textColor: "#fdba74" },
    ];

    barConfigs.forEach((barConfig, index) => {
      const y = firstBarY + index * barGap;
      const label = this.scene.add.text(barsX, y, barConfig.label, labelStyle).setOrigin(0, 0.5).setColor(barConfig.textColor);
      const track = this.scene.add.rectangle(barsX + 15, y, barWidth, barHeight, 0x0f172a, 0.9)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0xffffff, 0.12);
      const ratio = Phaser.Math.Clamp(barConfig.value / Math.max(1, barConfig.total), 0, 1);
      const fill = this.scene.add.rectangle(barsX + 15, y, Math.max(2, Math.round(barWidth * ratio)), barHeight - 2, barConfig.color, 0.96)
        .setOrigin(0, 0.5);
      barObjects.push(label, track, fill);
      const valueText = this.scene.add.text(barsX + 108, y, `${Math.round(barConfig.value)}`, {
        ...labelStyle,
        fontSize: "8px",
        color: barConfig.textColor,
      }).setOrigin(1, 0.5);
      barObjects.push(valueText);
      if (barConfig.label === "HP") {
        this.heroHudBars.set("hp", { fill, valueText, total: Math.max(1, barConfig.total), size: barWidth, baseY: y });
      } else if (barConfig.label === "MP") {
        this.heroHudBars.set("mp", { fill, valueText, total: Math.max(1, barConfig.total), size: barWidth, baseY: y });
      } else {
        this.heroHudBars.set("fatigue", { fill, valueText, total: Math.max(1, barConfig.total), size: barWidth, baseY: y });
      }
    });

    return barObjects;
  }

  private createMonsterHud(
    panelWidth: number,
    panelHeight: number,
    monsterHud?: MinigameMonsterHudConfig,
    combatVisuals?: MinigameConfig["combatVisuals"],
  ): Phaser.GameObjects.GameObject[] {
    const panelConfig = this.config as MinigameConfig;
    if (!monsterHud || panelConfig.event?.type !== "monster") {
      return [];
    }

    const topY = -panelHeight / 2 + 42;
    const portraitX = panelWidth / 2 - 80;
    const portraitY = topY + 34;
    this.monsterHudAnchor = { x: this.centerX + portraitX, y: this.centerY + portraitY - 28 };
    const portraitFrame = this.scene.add.rectangle(portraitX, portraitY, 54, 54, 0x0f172a, 0.88)
      .setStrokeStyle(2, 0xf6d365, 0.8);
    const portraitInset = this.scene.add.rectangle(portraitX, portraitY, 46, 46, 0x1e293b, 0.42)
      .setStrokeStyle(1, 0xffffff, 0.1);
    const nameText = this.scene.add.text(portraitX, topY - 4, monsterHud.name, {
      color: "#f8fafc",
      fontFamily: "Trebuchet MS",
      fontSize: "9px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5, 0.5);
    const objects: Phaser.GameObjects.GameObject[] = [portraitFrame, portraitInset, nameText];

    if (combatVisuals?.monsterDownAtlas) {
      const monsterPortrait = this.createAnimatedSprite(
        portraitX,
        portraitY + 1,
        combatVisuals.monsterDownAtlas,
        42,
        true,
      );
      this.playAnimatedSpriteAction(monsterPortrait, combatVisuals.monsterDownAtlas, "idle");
      objects.push(monsterPortrait);
    }

    const barHeight = 52;
    const barWidth = 8;
    const trackY = topY + 34;
    const firstBarX = portraitX + 34;
    const barConfigs = [
      { key: "hp" as const, label: "HP", value: monsterHud.health.current, total: monsterHud.health.total, color: 0xef4444, textColor: "#fecaca" },
      { key: "mp" as const, label: "MP", value: monsterHud.mana.current, total: monsterHud.mana.total, color: 0x38bdf8, textColor: "#bae6fd" },
    ];

    barConfigs.forEach((barConfig, index) => {
      const x = firstBarX + index * 14;
      const label = this.scene.add.text(x, topY + 68, barConfig.label, {
        color: barConfig.textColor,
        fontFamily: "Trebuchet MS",
        fontSize: "8px",
        fontStyle: "bold",
        align: "center",
      }).setOrigin(0.5, 0);
      const track = this.scene.add.rectangle(x, trackY, barWidth, barHeight, 0x0f172a, 0.9)
        .setOrigin(0.5, 0.5)
        .setStrokeStyle(1, 0xffffff, 0.12);
      const ratio = Phaser.Math.Clamp(barConfig.value / Math.max(1, barConfig.total), 0, 1);
      const fillHeight = Math.max(2, Math.round(barHeight * ratio));
      const fill = this.scene.add.rectangle(x, trackY + (barHeight - fillHeight) / 2, barWidth - 2, fillHeight, barConfig.color, 0.96)
        .setOrigin(0.5, 0.5);
      const valueText = this.scene.add.text(x, topY - 2, `${Math.round(barConfig.value)}`, {
        color: barConfig.textColor,
        fontFamily: "Trebuchet MS",
        fontSize: "8px",
        fontStyle: "bold",
        align: "center",
      }).setOrigin(0.5, 0.5);
      objects.push(label, track, fill, valueText);
      this.monsterHudBars.set(barConfig.key, { fill, valueText, total: Math.max(1, barConfig.total), size: barHeight, vertical: true, baseY: trackY });
    });

    return objects;
  }

  private createCombatEncounterSnapshot(config?: MinigameCombatEncounterConfig): CombatEncounterSnapshot | undefined {
    if (!config) {
      return undefined;
    }

    return {
      hero: {
        hp: Math.max(0, Math.round(config.hero.hp)),
        maxHp: Math.max(1, Math.round(config.hero.maxHp)),
        mp: Math.max(0, Math.round(config.hero.mp)),
        maxMp: Math.max(1, Math.round(config.hero.maxMp)),
      },
      monster: {
        name: config.monster.name,
        hp: Math.max(0, Math.round(config.monster.hp)),
        maxHp: Math.max(1, Math.round(config.monster.maxHp)),
        mp: Math.max(0, Math.round(config.monster.mp)),
        maxMp: Math.max(1, Math.round(config.monster.maxMp)),
      },
      totals: {
        heroDamageTaken: 0,
        monsterDamageTaken: 0,
        heroManaSpent: 0,
        monsterManaSpent: 0,
        roundsResolved: 0,
      },
    };
  }

  private syncCombatHud(): void {
    if (!this.combatEncounter) {
      return;
    }

    this.updateHudBar(this.heroHudBars.get("hp"), this.combatEncounter.hero.hp, this.combatEncounter.hero.maxHp);
    this.updateHudBar(this.heroHudBars.get("mp"), this.combatEncounter.hero.mp, this.combatEncounter.hero.maxMp);
    this.updateHudBar(this.monsterHudBars.get("hp"), this.combatEncounter.monster.hp, this.combatEncounter.monster.maxHp);
    this.updateHudBar(this.monsterHudBars.get("mp"), this.combatEncounter.monster.mp, this.combatEncounter.monster.maxMp);
  }

  private updateHudBar(bar: CombatHudBar | undefined, current: number, total: number): void {
    if (!bar) {
      return;
    }

    const safeTotal = Math.max(1, Math.round(total));
    const safeCurrent = Math.max(0, Math.round(current));
    const ratio = Phaser.Math.Clamp(safeCurrent / safeTotal, 0, 1);
    if (bar.vertical) {
      const nextHeight = Math.max(2, Math.round(bar.size * ratio));
      bar.fill.setDisplaySize(bar.fill.displayWidth, nextHeight);
      bar.fill.y = bar.baseY + (bar.size - nextHeight) / 2;
    } else {
      bar.fill.setDisplaySize(Math.max(2, Math.round(bar.size * ratio)), bar.fill.displayHeight);
    }
    bar.valueText.setText(`${safeCurrent}`);
    bar.total = safeTotal;
  }

  private showCombatResolutionTexts(
    action: CombatSequenceAction,
    heroDamage: number,
    monsterDamage: number,
    heroManaSpent: number,
    monsterManaSpent: number,
    heroBlocked: boolean,
    monsterBlocked: boolean,
  ): void {
    if (monsterDamage > 0) {
      this.showCombatFloatingText("monster", `-${monsterDamage}`, "#fef3c7");
    } else if (monsterBlocked && (action === "attack" || action === "special")) {
      this.showCombatFloatingText("monster", "Parato", "#bae6fd");
    }

    if (heroDamage > 0) {
      this.showCombatFloatingText("hero", `-${heroDamage}`, "#fecaca");
    } else if (heroBlocked && (action === "defense" || action === "defenseSpecial")) {
      this.showCombatFloatingText("hero", action === "defenseSpecial" ? "Parata speciale" : "Parato", "#bae6fd");
    }

    if (heroManaSpent > 0) {
      this.showCombatFloatingText("hero", `MP -${heroManaSpent}`, "#93c5fd", -18);
    }
    if (monsterManaSpent > 0) {
      this.showCombatFloatingText("monster", `MP -${monsterManaSpent}`, "#93c5fd", -18);
    }
  }

  private showCombatFloatingText(target: "hero" | "monster", message: string, color: string, offsetY = 0): void {
    const hudAnchor = target === "hero" ? this.heroHudAnchor : this.monsterHudAnchor;
    const actorAnchor = target === "hero" ? this.combatHeroAnchor : this.combatMonsterAnchor;

    [hudAnchor, actorAnchor].forEach((anchor, index) => {
      if (!anchor) {
        return;
      }

      const text = this.scene.add.text(anchor.x, anchor.y + offsetY - index * 4, message, {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        color,
        stroke: "#000000",
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(4700 + index);
      this.trackTween(this.scene.tweens.add({
        targets: text,
        y: text.y - 22,
        alpha: 0,
        duration: 780,
        ease: "Quad.easeOut",
        onComplete: () => text.destroy(),
      }));
    });
  }

  private emitCombatResolutionEvents(
    action: CombatSequenceAction,
    heroDamage: number,
    monsterDamage: number,
    heroBlocked: boolean,
  ): void {
    if (monsterDamage > 0) {
      this.emitRuntimeGameplayEvent("monster-hit", `Minigioco: ${action}`, { damage: monsterDamage, special: action === "special" });
    }
    if (heroDamage > 0) {
      this.emitRuntimeGameplayEvent("hero-damaged", "Minigioco: eroe colpito", { damage: heroDamage, special: action === "defenseSpecial" });
    } else if (heroBlocked && (action === "defense" || action === "defenseSpecial")) {
      this.emitRuntimeGameplayEvent("hero-blocked", "Minigioco: colpo parato", { special: action === "defenseSpecial" });
    }
  }

  private playCombatJuice(action: CombatSequenceAction, grade: MinigameResultGrade, heroDamage: number, monsterDamage: number): void {
    if (heroDamage > 0) {
      this.scene.cameras.main.shake(120, action === "defenseSpecial" ? 0.01 : 0.007);
      return;
    }

    if (monsterDamage > 0) {
      this.scene.cameras.main.shake(100, grade === "perfect" ? 0.009 : 0.005);
      return;
    }

    if (action === "defense" || action === "defenseSpecial") {
      this.trackTween(this.scene.tweens.add({
        targets: this.root,
        scaleX: 1.015,
        scaleY: 1.015,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      }));
    }
  }

  private emitRuntimeGameplayEvent(
    type: import("../../models/phaser-game-state.model").PhaserGameplayEventType,
    message: string,
    values: Record<string, number | string | boolean | null | undefined>,
  ): void {
    const emitter = (this.config as MinigameConfig).runtimeEventEmitter;
    emitter?.(type, message, values);
  }

  private playTrapButtonJuice(
    target: Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | undefined,
    tint: number,
    scale: number,
  ): void {
    if (!target) {
      return;
    }

    if (target instanceof Phaser.GameObjects.Container) {
      this.flashButtonVisual(target, tint);
      this.trackTween(this.scene.tweens.add({
        targets: target,
        scaleX: scale,
        scaleY: scale,
        yoyo: true,
        duration: 110,
        ease: "Back.easeOut",
      }));
      return;
    }

    this.trackTween(this.scene.tweens.add({
      targets: target,
      scaleX: scale,
      scaleY: scale,
      yoyo: true,
      duration: 110,
      ease: "Back.easeOut",
      onStart: () => {
        if (target instanceof Phaser.GameObjects.Image) {
          target.setTint(tint);
          return;
        }
        target.setStrokeStyle(3, tint, 0.95);
      },
      onComplete: () => {
        if (target instanceof Phaser.GameObjects.Image) {
          target.clearTint();
          return;
        }
        target.setStrokeStyle(0, tint, 0);
      },
    }));
  }

  protected getPanelFrameName(): string {
    const panelConfig = this.config as MinigameConfig;
    switch (panelConfig.event?.type) {
      case "monster":
        return "minigame_combat_panel" + BaseMinigame.BACKGROUND_MINIGAME_IMAGE_SET;
      case "trap":
        return "minigame_trap_panel" + BaseMinigame.BACKGROUND_MINIGAME_IMAGE_SET;
      case "slot":
        return "slot-king_panel_set3";
      case "treasure":
      default:
        return "minigame_treasure_panel" + BaseMinigame.BACKGROUND_MINIGAME_IMAGE_SET;
    }
  }

  protected getMinigameUiPanelAtlas(): (typeof MINIGAME_UI_ATLAS)[keyof typeof MINIGAME_UI_ATLAS] {
    const panelConfig = this.config as MinigameConfig;
    if (panelConfig.event?.type === "slot") {
      return MINIGAME_UI_ATLAS.panelSet3;
    }
    const atlasSet = BaseMinigame.BACKGROUND_MINIGAME_IMAGE_SET === "_set2"
      ? "panelSet2"
      : "panelSet1";
    return MINIGAME_UI_ATLAS[atlasSet];
  }

  private createAnimatedSprite(
    x: number,
    y: number,
    atlas: MinigameAnimatedAtlasConfig,
    maxSize: number,
    flipX: boolean,
    scale?: number,
  ): Phaser.GameObjects.Sprite {
    this.applyLinearFilterToTexture(atlas.atlasKey);
    const sprite = this.scene.add.sprite(x, y, atlas.atlasKey, atlas.idleFrameName ?? "standing0001");
    if (typeof scale === "number" && Number.isFinite(scale) && scale > 0) {
      sprite.setScale(scale);
    } else {
      this.fitSpriteToMaxSize(sprite, maxSize);
    }
    sprite.setFlipX(flipX);
    return sprite;
  }

  private fitSpriteToMaxSize(sprite: Phaser.GameObjects.Sprite, maxSize: number): void {
    const frameWidth = Math.max(1, Math.round(Number(sprite.frame?.width ?? sprite.width)));
    const frameHeight = Math.max(1, Math.round(Number(sprite.frame?.height ?? sprite.height)));
    const ratio = maxSize / Math.max(frameWidth, frameHeight);
    sprite.setDisplaySize(
      Math.max(1, Math.round(frameWidth * ratio)),
      Math.max(1, Math.round(frameHeight * ratio)),
    );
  }

  protected ensureAtlasAnimations(atlas: MinigameAnimatedAtlasConfig): void {
    if (!this.scene.textures.exists(atlas.atlasKey)) {
      return;
    }

    HERO_ACTIONS.forEach((config) => {
      const animationKey = this.getAnimationKey(atlas.atlasKey, config.id);
      if (this.scene.anims.exists(animationKey)) {
        return;
      }

      this.scene.anims.create({
        key: animationKey,
        frames: this.scene.anims.generateFrameNames(atlas.atlasKey, {
          prefix: config.prefix,
          start: config.start,
          end: config.end,
          zeroPad: config.zeroPad ?? 4,
          suffix: config.suffix ?? "",
        }),
        frameRate: config.frameRate,
        repeat: config.id === "idle" ? -1 : 0,
      });

      const fullSequenceKey = this.getAnimationKey(atlas.atlasKey, config.id, true);
      if (this.scene.anims.exists(fullSequenceKey)) {
        return;
      }

      this.scene.anims.create({
        key: fullSequenceKey,
        frames: this.scene.anims.generateFrameNames(atlas.atlasKey, {
          prefix: config.prefix,
          start: config.start,
          end: config.end,
          zeroPad: config.zeroPad ?? 4,
          suffix: config.suffix ?? "",
        }),
        frameRate: config.frameRate,
        repeat: config.id === "idle" ? -1 : 0,
      });
    });
  }

  protected playAnimatedSpriteAction(
    sprite: Phaser.GameObjects.Sprite,
    atlas: MinigameAnimatedAtlasConfig,
    action: HeroAnimationAction,
    options?: { fullSequence?: boolean; returnToIdle?: boolean },
  ): void {
    const fullSequence = Boolean(options?.fullSequence && action !== "idle");
    const animationKey = this.getAnimationKey(atlas.atlasKey, action, fullSequence);
    if (!this.scene.anims.exists(animationKey)) {
      return;
    }

    sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    if (sprite.texture.key !== atlas.atlasKey) {
      sprite.setTexture(atlas.atlasKey, atlas.idleFrameName ?? "standing0001");
      this.fitSpriteToMaxSize(sprite, Math.max(sprite.displayWidth, sprite.displayHeight));
    }

    sprite.play(animationKey, true);
    if (action === "idle") {
      return;
    }

    if (options?.returnToIdle === false) {
      return;
    }

    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!sprite.active) {
        return;
      }
      this.playAnimatedSpriteAction(sprite, atlas, "idle");
    });
  }

  private getAnimationKey(atlasKey: string, action: HeroAnimationAction, fullSequence = false): string {
    return `minigame-${atlasKey}-${action}${fullSequence ? "-full" : ""}`;
  }

  private buildCombatTimeline(action: CombatSequenceAction, grade: MinigameResultGrade): CombatAnimationTimeline {
    switch (action) {
      case "attack":
        if (grade === "perfect") {
          return {
            hero: [
              { action: "attack", durationMs: 1500 },
              { action: "idle", durationMs: 2000 },
              { action: "idle", durationMs: 500 },
            ],
            monster: [
              { action: "defense", durationMs: 800 },
              { action: "hit", durationMs: 2700 },
              { action: "idle", durationMs: 500 },
            ],
            totalDurationMs: 4000,
          };
        }
        return {
          hero: [
            { action: "attack", durationMs: 1500 },
            { action: "idle", durationMs: 500 },
          ],
          monster: [
            { action: "defense", durationMs: 1500 },
            { action: "idle", durationMs: 500 },
          ],
          totalDurationMs: 2000,
        };
      case "defense":
        if (grade === "perfect") {
          return {
            hero: [
              { action: "defense", durationMs: 1500 },
              { action: "idle", durationMs: 500 },
            ],
            monster: [
              { action: "attack", durationMs: 1500 },
              { action: "idle", durationMs: 500 },
            ],
            totalDurationMs: 2000,
          };
        }
        return {
          hero: [
            { action: "defense", durationMs: 800 },
            { action: "hit", durationMs: 2700 },
            { action: "idle", durationMs: 500 },
          ],
          monster: [
            { action: "attack", durationMs: 1500 },
            { action: "idle", durationMs: 2000 },
            { action: "idle", durationMs: 500 },
          ],
          totalDurationMs: 4000,
        };
      case "defenseSpecial":
        if (grade === "perfect" || grade === "success") {
          return {
            hero: [
              { action: "defense", durationMs: 1500 },
              { action: "idle", durationMs: 500 },
            ],
            monster: [
              { action: "special", durationMs: 1500 },
              { action: "idle", durationMs: 500 },
            ],
            totalDurationMs: 2000,
          };
        }
        return {
          hero: [
            { action: "defense", durationMs: 800 },
            { action: "hit", durationMs: 2700 },
            { action: "idle", durationMs: 500 },
          ],
          monster: [
            { action: "special", durationMs: 1500 },
            { action: "idle", durationMs: 2000 },
            { action: "idle", durationMs: 500 },
          ],
          totalDurationMs: 4000,
        };
      case "special":
      default:
        if (grade === "perfect" || grade === "success") {
          return {
            hero: [
              { action: "special", durationMs: 1500 },
              { action: "idle", durationMs: 2000 },
              { action: "idle", durationMs: 500 },
            ],
            monster: [
              { action: "defense", durationMs: 800 },
              { action: "hit", durationMs: 2700 },
              { action: "idle", durationMs: 500 },
            ],
            totalDurationMs: 4000,
          };
        }
        return {
          hero: [
            { action: "special", durationMs: 1500 },
            { action: "idle", durationMs: 500 },
          ],
          monster: [
            { action: "defense", durationMs: 1500 },
            { action: "idle", durationMs: 500 },
          ],
          totalDurationMs: 2000,
        };
    }
  }

  private playCombatTimeline(timeline: CombatAnimationTimeline): void {
    this.combatSequenceActiveUntil = Math.max(this.combatSequenceActiveUntil, this.scene.time.now + timeline.totalDurationMs);
    this.scheduleCombatTrack(
      timeline.hero,
      (step) => {
        if (step.action === "hit") {
          this.playCombatHeroHit({ fullSequence: true, returnToIdle: false });
          return;
        }
        if (step.action === "idle") {
          this.playCombatHeroIdle();
          return;
        }
        if (step.action === "dodge") {
          this.playCombatHeroAction("defense", { fullSequence: true, returnToIdle: false });
          return;
        }
        this.playCombatHeroTimelineAction(step.action);
      },
    );
    this.scheduleCombatTrack(
      timeline.monster,
      (step) => {
        if (step.action === "hit") {
          this.playCombatMonsterHit({ fullSequence: true, returnToIdle: false });
          return;
        }
        if (step.action === "idle") {
          this.playCombatMonsterIdle();
          return;
        }
        this.playCombatMonsterAction(this.mapTimelineAction(step.action), { fullSequence: true, returnToIdle: false });
      },
    );
  }

  private scheduleCombatTrack(
    steps: CombatAnimationStep[],
    runner: (step: CombatAnimationStep) => void,
  ): void {
    let elapsedMs = 0;
    steps.forEach((step) => {
      const scheduledMs = elapsedMs;
      this.trackTimer(this.scene.time.delayedCall(scheduledMs, () => runner(step)));
      elapsedMs += step.durationMs;
    });
  }

  private mapTimelineAction(action: CombatTimelineAction): HeroAnimationAction {
    switch (action) {
      case "defense":
        return "shield";
      case "dodge":
        return "run";
      default:
        return action;
    }
  }

  private playCombatHeroTimelineAction(action: CombatTimelineAction): void {
    switch (action) {
      case "defense":
        this.playCombatHeroAction("defense", { fullSequence: true, returnToIdle: false });
        return;
      case "special":
        this.playCombatHeroAction("special", { fullSequence: true, returnToIdle: false });
        return;
      case "attack":
      default:
        this.playCombatHeroAction("attack", { fullSequence: true, returnToIdle: false });
        return;
    }
  }

  private mapCombatAction(action: CombatSequenceAction): HeroAnimationAction {
    switch (action) {
      case "attack":
        return "attack";
      case "defense":
      case "defenseSpecial":
        return "shield";
      case "special":
      default:
        return "special";
    }
  }
}
