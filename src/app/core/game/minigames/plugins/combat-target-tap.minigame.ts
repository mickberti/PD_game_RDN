import Phaser from "phaser";
import { CombatSequenceAction, MinigameConfig, MinigameResult } from "../minigame.model";
import { BaseMinigame } from "../base-minigame";
import { GAME_ATLAS } from "../../phaser/config/game-atlas.config";
import { DEFAULT_COMBAT_TARGET_TAP_CONFIG } from "./combat-target-tap.config";

type CombatTapAction = CombatSequenceAction;
type CombatTapTargetType = CombatTapAction | "danger";

type ActiveTarget = {
  id: number;
  type: CombatTapTargetType;
  x: number;
  y: number;
  radius: number;
  container: Phaser.GameObjects.Container;
  hitArea: Phaser.GameObjects.Arc;
  countdownText?: Phaser.GameObjects.Text;
  consumed: boolean;
  expiresAt: number;
  expireTimer: Phaser.Time.TimerEvent;
  pulseTween?: Phaser.Tweens.Tween;
};

const { layout: TAP_LAYOUT, buttonX: COMBAT_BUTTON_X, defaults: TAP_DEFAULTS } = DEFAULT_COMBAT_TARGET_TAP_CONFIG;
const PLAYFIELD_Y = TAP_LAYOUT.playfieldY;
const PLAYFIELD_WIDTH = TAP_LAYOUT.playfieldWidth;
const PLAYFIELD_HEIGHT = TAP_LAYOUT.playfieldHeight;
const STATUS_Y = TAP_LAYOUT.statusY;
const SCORE_Y = TAP_LAYOUT.scoreY;
const COMBAT_BUTTON_Y = TAP_LAYOUT.buttonY;
const COMBAT_BUTTON_WIDTH = TAP_LAYOUT.buttonWidth;
const COMBAT_BUTTON_HEIGHT = TAP_LAYOUT.buttonHeight;

const TYPE_COLORS: Record<CombatTapTargetType, {
  fill: number;
  stroke: number;
  text: string;
  frameName?: string;
  iconScale?: number;
}> = {
  attack: { fill: 0x7f1d1d, stroke: 0xfca5a5, text: "Attack", frameName: "action-attack", iconScale: 0.22 },
  defense: { fill: 0x0f3b66, stroke: 0x93c5fd, text: "Defense", frameName: "action-defense", iconScale: 0.22 },
  defenseSpecial: { fill: 0x312e81, stroke: 0xc4b5fd, text: "Defense Special", frameName: "action-defense", iconScale: 0.22 },
  special: { fill: 0x4c1d95, stroke: 0xddd6fe, text: "Special", frameName: "action-tornado", iconScale: 0.22 },
  danger: { fill: 0x1f2937, stroke: 0xf87171, text: "Danger", frameName: "action-poison", iconScale: 0.22 },
};

export class CombatTargetTapMinigame extends BaseMinigame {
  private readonly activeTargets: ActiveTarget[] = [];
  private readonly targetPlan: CombatTapTargetType[] = [];
  private panel?: Phaser.GameObjects.Container;
  private playfieldFrame?: Phaser.GameObjects.Rectangle;
  private playfieldCenter?: Phaser.GameObjects.Arc;
  private statusText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private timeBarFill?: Phaser.GameObjects.Rectangle;
  private readonly actionButtons = new Map<CombatTapAction, Phaser.GameObjects.Container>();
  private spawnedTargets = 0;
  private resolvedTargets = 0;
  private score = 0;
  private nextTargetId = 1;
  private spawnLoop?: Phaser.Time.TimerEvent;
  private countdownEvent?: Phaser.Time.TimerEvent;
  private finished = false;
  private heldAction?: CombatTapAction;
  private heldActionPointerId?: number;
  private interactionLockedUntil = 0;
  private actionVisualEffectId = 0;

  constructor(
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) {
    super(scene, config, onComplete);
  }

  override create(): void {
    this.panel = this.createPanel();
    //const combatActors = this.createCombatActors({ y: PLAYFIELD_Y + 6, heroOffsetX: -34, monsterOffsetX: 34, heroMaxSize: 56, monsterMaxSize: 56 });
    const combatActors = this.createCombatActors({ y: PLAYFIELD_Y + 6, heroOffsetX: -62, monsterOffsetX: 62, heroMaxSize: 78, monsterMaxSize: 78 });
    
    if (combatActors.length > 0) {
      this.panel.add(combatActors);
    }
    this.buildFrame();
    this.buildActionButtons();
    this.prepareTargetPlan();
    this.bindGlobalPointer();
    this.startGameplay();
  }

  override update(_time: number, _delta: number): void {
    if (this.finished) {
      return;
    }
  }

  override destroy(): void {
    this.destroyActiveTargets();
    this.spawnLoop?.remove(false);
    this.spawnLoop = undefined;
    this.countdownEvent?.remove(false);
    this.countdownEvent = undefined;
    super.destroy();
  }

  private buildFrame(): void {
    const panel = this.panel;
    if (!panel) {
      return;
    }

    this.playfieldFrame = this.scene.add.rectangle(0, PLAYFIELD_Y, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT, 0x120f24, 0.98)
      .setStrokeStyle(3, 0xf6d365, 0.84);

    const ringRadius = this.getRingRadius();
    const ringGlow = this.scene.add.circle(0, PLAYFIELD_Y + 40, ringRadius + 7, 0xf59e0b, 0.06)
      .setStrokeStyle(10, 0xf59e0b, 0.08);
    //this.playfieldCenter = this.scene.add.circle(0, PLAYFIELD_Y + 40, ringRadius, 0xffffff, 0)
    //  .setStrokeStyle(3, 0xf6d365, 0.28);
    const ringInner = this.scene.add.circle(0, PLAYFIELD_Y + 40, Math.max(18, ringRadius - 18), 0xffffff, 0)
      .setStrokeStyle(1, 0xffffff, 0.09);

    this.statusText = this.scene.add.text(0, STATUS_Y, "Arma l'azione e tocca il bersaglio uguale.", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 274 },
    }).setOrigin(0.5);
    this.scoreText = this.scene.add.text(0, SCORE_Y, "Score 0", {
      color: "#e9d5ff",
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      align: "center",
    }).setOrigin(0.5);

    
    panel.add([
      ringGlow,
      //this.playfieldCenter,
      ringInner,
      this.statusText,
      this.scoreText,
    ]);
  }

  private buildActionButtons(): void {
    if (!this.panel) {
      return;
    }

    const buttonConfigs: Array<{ action: CombatTapAction; label: string; x: number }> = [
      { action: "attack", label: "ATTACCO", x: COMBAT_BUTTON_X.attack },
      { action: "defense", label: "DIFESA", x: COMBAT_BUTTON_X.defense },
      { action: "special", label: "SPECIALE", x: COMBAT_BUTTON_X.special },
    ];

    buttonConfigs.forEach((buttonConfig) => {
      const button = this.createActionButton(
        buttonConfig.label,
        buttonConfig.x,
        COMBAT_BUTTON_Y,
        COMBAT_BUTTON_WIDTH,
        COMBAT_BUTTON_HEIGHT,
        this.getActionButtonVisual(buttonConfig.action),
      );
      this.panel?.add(button);
      this.actionButtons.set(buttonConfig.action, button);
      this.bindHoldActionButton(button, buttonConfig.action);
    });
  }

  private prepareTargetPlan(): void {
    // Il piano è solo una coda di spawn: la durata dello scontro dipende dagli HP,
    // come in combat-timing, non dal numero di target generati in questo blocco.
    const totalTargets = Math.max(4, Number(this.config.objectiveCount ?? TAP_DEFAULTS.objectiveCount));
    const maxDangerTargets = Math.max(1, Math.floor(totalTargets * 0.28));
    let dangerCount = 0;

    for (let index = 0; index < totalTargets; index += 1) {
      const roll = Phaser.Math.Between(1, 100);
      const type = roll > 84 && dangerCount < maxDangerTargets
        ? "danger"
        : this.pickCombatSequenceAction();

      if (type === "danger") {
        dangerCount += 1;
      }

      this.targetPlan.push(type);
    }

    if (!this.targetPlan.length) {
      this.targetPlan[0] = "attack";
    }

  }

  private startGameplay(): void {
    this.updateTimeFeedback();
    this.spawnTarget();
    this.spawnLoop = this.trackTimer(this.scene.time.addEvent({
      delay: Math.max(250, Number(this.config.spawnIntervalMs ?? TAP_DEFAULTS.spawnIntervalMs)),
      loop: true,
      callback: () => {
        if (this.finished) {
          return;
        }

        if (this.spawnedTargets >= this.targetPlan.length) {
          if (this.isCombatEncounterFinished()) {
            this.spawnLoop?.remove(false);
            this.spawnLoop = undefined;
            if (this.activeTargets.length === 0) {
              this.finishMinigame();
            }
            return;
          }
          this.prepareTargetPlan();
        }

        if (this.isInteractionLocked()) {
          return;
        }

        // Il minigioco è una sequenza: il prossimo bersaglio arriva solo dopo
        // che quello corrente è stato risolto o è scaduto.
        if (this.activeTargets.length > 0) {
          return;
        }

        this.spawnTarget();
      },
    }));
    this.startCountdown();
  }

  private startCountdown(): void {
    this.countdownEvent?.remove(false);
    this.countdownEvent = this.trackTimer(this.scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (this.finished) {
          return;
        }

        this.updateTimeFeedback();
        if (this.isCombatEncounterFinished()) {
          this.finishMinigame();
        }
      },
    }));
  }

  private updateTimeFeedback(): void {
    this.timeBarFill?.setSize(PLAYFIELD_WIDTH - 4, 12);
    this.refreshTargetCountdowns();
  }

  private bindGlobalPointer(): void {
    const handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
      pointer.event?.preventDefault?.();
      this.releaseHeldAction(pointer.id);
    };

    this.scene.input.on("pointerup", handlePointerUp);
    this.trackDisposer(() => this.scene.input.off("pointerup", handlePointerUp));

    // Su mouse e touchscreen a un solo dito non si possono generare due pointerdown
    // contemporanei. Mentre il pulsante resta premuto, quindi, attraversare il bersaglio
    // nell'anello vale come il suo tocco; con due dita resta valido anche il tap diretto.
    const handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
      if (!pointer.isDown || pointer.id !== this.heldActionPointerId) {
        return;
      }
      const target = this.activeTargets.find((item) => !item.consumed && item.hitArea.getBounds().contains(pointer.worldX, pointer.worldY));
      if (target) {
        this.handleTargetPressed(target.id);
      }
    };
    this.scene.input.on("pointermove", handlePointerMove);
    this.trackDisposer(() => this.scene.input.off("pointermove", handlePointerMove));
  }

  private spawnTarget(): void {
    const type = this.targetPlan[this.spawnedTargets];
    if (!type || !this.panel) {
      return;
    }

    const radius = Math.max(18, Number(this.config.targetRadius ?? TAP_DEFAULTS.targetRadius));
    const { x, y } = this.resolveSpawnPosition(radius);
    const visuals = TYPE_COLORS[type];
    const lifeMs = Math.max(250, Number(this.config.targetLifeMs ?? TAP_DEFAULTS.targetLifeMs));
    const targetContainer = this.scene.add.container(x, y);

    const ring = this.scene.add.circle(0, 0, radius + 5, 0xffffff, 0).setStrokeStyle(3, visuals.stroke, 0.92);
    const core = this.scene.add.circle(0, 0, radius, visuals.fill, 0.94).setStrokeStyle(2, visuals.stroke, 1);
    const glow = this.scene.add.circle(0, 0, radius + 10, visuals.stroke, 0.08);
    const target = this.scene.add.circle(0, 0, radius + 14, 0xffffff, 0.001);
    const countdownText = this.scene.add.text(0, -(radius + 20), "", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      fontStyle: "bold",
      stroke: "#120f24",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5);
    const children: Phaser.GameObjects.GameObject[] = [glow, target, ring, core];

    if (visuals.frameName) {
      const icon = this.addAtlasIcon(0, 0, GAME_ATLAS.actions.key, visuals.frameName, {
        scale: visuals.iconScale ?? 0.22,
      });
      children.push(icon);
    }

    children.push(countdownText);
    targetContainer.add(children);
    this.panel.add(targetContainer);

    const pulseTween = this.trackTween(this.scene.tweens.add({
      targets: [ring, core, glow],
      scaleX: 1.07,
      scaleY: 1.07,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }));

    const activeTarget: ActiveTarget = {
      id: this.nextTargetId++,
      type,
      x,
      y,
      radius,
      container: targetContainer,
      hitArea: target,
      countdownText,
      consumed: false,
      expiresAt: this.scene.time.now + lifeMs,
      expireTimer: undefined as unknown as Phaser.Time.TimerEvent,
      pulseTween,
    };

    target.setInteractive(new Phaser.Geom.Circle(0, 0, radius + 14), Phaser.Geom.Circle.Contains);
    if (target.input) {
      target.input.cursor = "pointer";
    }
    const handleTargetPointerDown = (
      pointer: Phaser.Input.Pointer,
      _localX?: number,
      _localY?: number,
      event?: Phaser.Types.Input.EventData,
    ): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();
      this.handleTargetPressed(activeTarget.id);
    };
    target.on("pointerdown", handleTargetPointerDown as never);
    this.trackDisposer(() => {
      target.off("pointerdown", handleTargetPointerDown as never);
      target.disableInteractive();
    });

    activeTarget.expireTimer = this.trackTimer(this.scene.time.delayedCall(lifeMs, () => this.expireTarget(activeTarget.id)));
    this.activeTargets.push(activeTarget);
    this.spawnedTargets += 1;
    this.refreshSingleTargetCountdown(activeTarget);
  }

  private resolveSpawnPosition(radius: number): { x: number; y: number } {
    const ringRadius = this.getRingRadius();
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const rawX = Math.cos(angle) * ringRadius;
    const rawY = PLAYFIELD_Y + Math.sin(angle) * ringRadius;
    const maxX = PLAYFIELD_WIDTH / 2 - radius - 8;
    const minX = -maxX;
    const maxY = PLAYFIELD_Y + PLAYFIELD_HEIGHT / 2 - radius - 8;
    const minY = PLAYFIELD_Y - PLAYFIELD_HEIGHT / 2 + radius + 8;

    return {
      x: Phaser.Math.Clamp(rawX, minX, maxX),
      y: Phaser.Math.Clamp(rawY, minY, maxY),
    };
  }

  private getRingRadius(): number {
    return Phaser.Math.Clamp(
      Number(this.config.targetRingRadius ?? TAP_DEFAULTS.targetRingRadius),
      78,
      Math.min(PLAYFIELD_WIDTH / 1.5, PLAYFIELD_HEIGHT / 1.5),
    );
  }

  private armHeldAction(action: CombatTapAction, pointerId: number): void {
    if (this.finished || this.isInteractionLocked()) {
      return;
    }

    this.heldAction = action;
    this.heldActionPointerId = pointerId;
    this.setCombatActorsIdle();
    this.statusText?.setText(`Tieni premuto ${this.getActionLabel(action)} e tocca la stessa icona nell'anello.`).setColor(this.getActionColor(action));

    this.actionButtons.forEach((button, key) => {
      button.setScale(key === action ? 1.08 : 1);
      this.flashButtonVisual(button, key === action ? this.getActionFlashColor(action) : 0xffffff);
    });
  }

  private releaseHeldAction(pointerId?: number): void {
    if (pointerId !== undefined && this.heldActionPointerId !== pointerId) {
      return;
    }

    this.heldAction = undefined;
    this.heldActionPointerId = undefined;
    this.actionButtons.forEach((button) => button.setScale(1));
  }

  private handleTargetPressed(targetId: number): void {
    if (this.finished || this.isInteractionLocked()) {
      return;
    }

    const hitTarget = this.activeTargets.find((target) => target.id === targetId);
    if (!hitTarget || hitTarget.consumed) {
      return;
    }

    if (hitTarget.type === "danger") {
      this.score -= 15;
      this.statusText?.setText("Veleno colpito! Penalità.").setColor("#fca5a5");
      this.resolveTarget(hitTarget, true);
      this.refreshScore();
      return;
    }

    if (!this.heldAction) {
      this.score -= 6;
      this.statusText?.setText("Tieni premuto un'azione in basso, poi tocca la stessa icona nell'anello.").setColor("#fde68a");
      this.playResolutionWithActionReset(hitTarget.type, "fail");
      this.flashTargetMismatch(hitTarget, 0xf59e0b);
      this.refreshScore();
      return;
    }

    if (this.heldAction !== this.getRequiredInputAction(hitTarget.type)) {
      this.score -= 10;
      this.statusText?.setText(`Azione errata: serviva ${this.getActionLabel(hitTarget.type)}.`).setColor("#fca5a5");
      this.playResolutionWithActionReset(hitTarget.type, "fail");
      this.resolveCombatEncounterPhase(this.toCombatSequenceAction(hitTarget.type), "fail");
      this.flashActionButton(this.heldAction, 0xef4444);
      this.flashTargetMismatch(hitTarget, 0xef4444);
      this.refreshScore();
      return;
    }

    this.score += this.resolveTargetValue(hitTarget.type);
    this.statusText?.setText(`${this.getActionLabel(hitTarget.type)} riuscito!`).setColor("#bbf7d0");
    this.playResolutionWithActionReset(hitTarget.type, "perfect");
    this.resolveCombatEncounterPhase(this.toCombatSequenceAction(hitTarget.type), "perfect");
    this.flashActionButton(this.getRequiredInputAction(hitTarget.type), 0x22c55e);
    this.resolveTarget(hitTarget, true);
    this.refreshScore();
    if (this.isCombatEncounterFinished()) {
      this.finishMinigame();
    }
  }

  private flashTargetMismatch(target: ActiveTarget, color: number): void {
    this.trackTween(this.scene.tweens.add({
      targets: target.container,
      alpha: 0.55,
      duration: 80,
      yoyo: true,
      repeat: 1,
      ease: "Quad.easeOut",
      onStart: () => {
        const flash = this.scene.add.circle(target.x, target.y, target.radius + 8, color, 0.14).setStrokeStyle(2, color, 0.6);
        this.panel?.add(flash);
        this.trackTween(this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scaleX: 1.35,
          scaleY: 1.35,
          duration: 170,
          ease: "Quad.easeOut",
          onComplete: () => flash.destroy(),
        }));
      },
    }));
  }

  private expireTarget(targetId: number): void {
    if (this.isInteractionLocked()) {
      this.trackTimer(this.scene.time.delayedCall(this.getRemainingLockMs(), () => this.expireTarget(targetId)));
      return;
    }

    const target = this.activeTargets.find((item) => item.id === targetId);
    if (!target || target.consumed) {
      return;
    }

    this.score -= 8;
    this.statusText?.setText(`Hai mancato ${this.getActionLabel(target.type)}.`).setColor("#fde68a");
    this.playResolutionWithActionReset(target.type, "fail");
    this.resolveCombatEncounterPhase(this.toCombatSequenceAction(target.type), "fail");
    this.refreshScore();

    this.resolveTarget(target, false);
    if (this.isCombatEncounterFinished()) {
      this.finishMinigame();
    }
  }

  private resolveTarget(target: ActiveTarget, tapped: boolean): void {
    if (target.consumed) {
      return;
    }

    target.consumed = true;
    target.expireTimer.remove(false);
    target.pulseTween?.stop();
    target.hitArea.disableInteractive();
    this.resolvedTargets += 1;
    this.updateTimeFeedback();

    const accent = tapped ? 0x22c55e : 0xf59e0b;

    this.trackTween(this.scene.tweens.add({
      targets: target.container,
      alpha: 0,
      scaleX: tapped ? 1.28 : 0.72,
      scaleY: tapped ? 1.28 : 0.72,
      duration: 180,
      ease: "Quad.easeOut",
      onStart: () => {
        const flash = this.scene.add.circle(target.x, target.y, target.radius + 12, accent, 0.22).setStrokeStyle(3, accent, 0.72);
        this.panel?.add(flash);
        this.trackTween(this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scaleX: 1.6,
          scaleY: 1.6,
          duration: 180,
          ease: "Quad.easeOut",
          onComplete: () => flash.destroy(),
        }));
      },
      onComplete: () => {
        target.container.destroy(true);
      },
    }));

    const index = this.activeTargets.findIndex((item) => item.id === target.id);
    if (index >= 0) {
      this.activeTargets.splice(index, 1);
    }
  }

  private resolveTargetValue(type: CombatTapTargetType): number {
    switch (type) {
      case "attack":
        return 10 + Math.max(0, Math.round(this.config.heroStats.strength));
      case "defense":
      case "defenseSpecial":
        return 8 + Math.max(0, Math.round(this.config.heroStats.defense));
      case "special":
        return 15 + Math.max(0, Math.round(this.config.heroStats.luck));
      case "danger":
      default:
        return 0;
    }
  }

  private refreshScore(): void {
    this.scoreText?.setText(`Score ${this.score}`);
  }

  private clearSelectedAction(): void {
    this.releaseHeldAction();
  }

  private bindHoldActionButton(button: Phaser.GameObjects.Container, action: CombatTapAction): void {
    button.setInteractive(
      new Phaser.Geom.Rectangle( 0, 0, COMBAT_BUTTON_WIDTH, COMBAT_BUTTON_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );

    if (button.input) {
      button.input.cursor = "pointer";
    }

    const handlePointerDown = (
      pointer: Phaser.Input.Pointer,
      _localX?: number,
      _localY?: number,
      event?: Phaser.Types.Input.EventData,
    ): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();
      this.animateButtonPress(button);
      this.armHeldAction(action, pointer.id);
    };

    const handlePointerUp = (
      pointer: Phaser.Input.Pointer,
      _localX?: number,
      _localY?: number,
      event?: Phaser.Types.Input.EventData,
    ): void => {
      pointer.event?.preventDefault?.();
      event?.stopPropagation();
      this.releaseHeldAction(pointer.id);
    };

    const handlePointerOut = (
      pointer: Phaser.Input.Pointer,
      event?: Phaser.Types.Input.EventData,
    ): void => {
      event?.stopPropagation();
      if (!pointer.isDown) {
        this.releaseHeldAction(pointer.id);
      }
    };

    button.on("pointerdown", handlePointerDown as never);
    button.on("pointerup", handlePointerUp as never);
    button.on("pointerout", handlePointerOut as never);
    this.trackDisposer(() => {
      button.off("pointerdown", handlePointerDown as never);
      button.off("pointerup", handlePointerUp as never);
      button.off("pointerout", handlePointerOut as never);
      button.disableInteractive();
    });
  }

  private refreshTargetCountdowns(): void {
    this.activeTargets.forEach((target) => this.refreshSingleTargetCountdown(target));
  }

  private refreshSingleTargetCountdown(target: ActiveTarget): void {
    if (!target.countdownText || target.consumed) {
      return;
    }

    const remainingMs = Math.max(0, target.expiresAt - this.scene.time.now);
    const remainingSeconds = (remainingMs / 1000).toFixed(1);
    target.countdownText.setText(`${remainingSeconds}s`);
    target.countdownText.setColor(remainingMs <= 450 ? "#fca5a5" : "#fef3c7");
  }

  private lockInteraction(durationMs: number): void {
    this.interactionLockedUntil = Math.max(this.interactionLockedUntil, this.scene.time.now + durationMs);
  }

  private playResolutionWithActionReset(action: CombatTapTargetType, grade: MinigameResult["grade"]): void {
    const durationMs = this.playCombatResolution(this.toCombatSequenceAction(action), grade);
    this.lockInteraction(durationMs);

    // I lampi del pulsante possono sovrapporsi alla tint dell'azione precedente.
    // Al termine della timeline di combattimento forziamo il ritorno allo sprite base.
    const effectId = ++this.actionVisualEffectId;
    this.trackTimer(this.scene.time.delayedCall(durationMs + 220, () => {
      if (effectId !== this.actionVisualEffectId || this.finished) {
        return;
      }
      this.actionButtons.forEach((button) => {
        button.getAll().forEach((child) => {
          if (
            (child instanceof Phaser.GameObjects.Image || child instanceof Phaser.GameObjects.Sprite)
            && "clearTint" in child
          ) {
            child.clearTint();
          }
        });
      });
    }));
  }

  private isInteractionLocked(): boolean {
    return this.scene.time.now < this.interactionLockedUntil;
  }

  private getRemainingLockMs(): number {
    return Math.max(0, this.interactionLockedUntil - this.scene.time.now);
  }

  private finishMinigame(): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.destroyActiveTargets();
    this.spawnLoop?.remove(false);
    this.spawnLoop = undefined;
    this.countdownEvent?.remove(false);
    this.countdownEvent = undefined;
    const result = this.buildResult();
    const feedback = this.getFeedbackLabel(result.grade);
    this.statusText?.setText(feedback.text).setColor(feedback.color);
    this.completeWithDelay(result, 380);
  }

  private buildResult(): MinigameResult {
    const totals = this.getCombatEncounterTotals();
    const grade = this.didHeroWinCombatEncounter()
      ? totals.heroDamageTaken === 0 ? "perfect" : "success"
      : "fail";

    if (grade === "perfect") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.max(0, Math.round(this.score)),
        usedSkill: "dexterity",
        fatigueGained: 5,
        rewardMultiplier: 1.5,
        damageTaken: totals.heroDamageTaken,
      };
    }

    if (grade === "success") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.max(0, Math.round(this.score)),
        usedSkill: "dexterity",
        fatigueGained: 4,
        rewardMultiplier: 1,
        damageTaken: totals.heroDamageTaken,
      };
    }

    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade,
      score: Math.max(0, Math.round(this.score)),
      usedSkill: "dexterity",
      fatigueGained: 2,
      rewardMultiplier: 0.25,
      damageTaken: totals.heroDamageTaken,
    };
  }

  private getFeedbackLabel(grade: MinigameResult["grade"]): { text: string; color: string } {
    switch (grade) {
      case "perfect":
        return { text: "Combo perfette!", color: "#fde68a" };
      case "success":
        return { text: "Manovra riuscita!", color: "#bbf7d0" };
      case "partial":
        return { text: "Hai retto lo scontro, ma a fatica.", color: "#fdba74" };
      default:
        return { text: "Sei stato travolto dal ritmo dello scontro.", color: "#fca5a5" };
    }
  }

  private destroyActiveTargets(): void {
    while (this.activeTargets.length > 0) {
      const target = this.activeTargets.pop();
      target?.expireTimer.remove(false);
      target?.pulseTween?.stop();
      target?.container.destroy(true);
    }
  }

  private getActionLabel(action: CombatTapTargetType): string {
    switch (action) {
      case "attack":
        return "ATTACCO";
      case "defense":
        return "DIFESA";
      case "defenseSpecial":
        return "DIFESA SPECIALE";
      case "danger":
        return "VELENO";
      default:
        return "SPECIALE";
    }
  }

  private getActionColor(action: CombatTapAction): string {
    switch (action) {
      case "attack":
        return "#fecaca";
      case "defense":
        return "#bae6fd";
      case "defenseSpecial":
        return "#c4b5fd";
      default:
        return "#e9d5ff";
    }
  }

  private getActionFlashColor(action: CombatTapAction): number {
    switch (action) {
      case "attack":
        return 0xef4444;
      case "defense":
        return 0x3b82f6;
      case "defenseSpecial":
        return 0x8b5cf6;
      default:
        return 0xa855f7;
    }
  }

  private flashActionButton(action: CombatTapAction, color: number): void {
    const button = this.actionButtons.get(action);
    if (button) {
      this.flashButtonVisual(button, color);
    }
  }

  private getActionButtonVisual(action: CombatTapAction) {
    switch (action) {
      case "attack":
        return { atlasKey: GAME_ATLAS.actions.key, frameName: "action-attack", iconScale: 0.38 };
      case "defense":
        return { atlasKey: GAME_ATLAS.actions.key, frameName: "action-defense", iconScale: 0.38 };
      default:
        return { atlasKey: GAME_ATLAS.actions.key, frameName: "action-tornado", iconScale: 0.38 };
    }
  }

  private getRequiredInputAction(action: CombatTapAction): CombatTapAction {
    return action === "defenseSpecial" ? "defense" : action;
  }

  private toCombatSequenceAction(action: CombatTapTargetType): CombatSequenceAction {
    return action === "danger" ? "attack" : action;
  }
}
