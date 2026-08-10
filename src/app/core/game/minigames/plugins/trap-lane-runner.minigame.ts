import Phaser from "phaser";
import { MinigameAnimatedAtlasConfig, MinigameConfig, MinigameResult } from "../minigame.model";
import { BaseMinigame } from "../base-minigame";
import { BACKGROUND_FRAMES, GAME_ATLAS } from "../../phaser/config/game-atlas.config";
import { DEFAULT_TRAP_LANE_RUNNER_CONFIG } from "./trap-lane-runner.config";

type LaneObstacle = {
  id: number;
  laneIndex: number;
  y: number;
  speed: number;
  body: Phaser.GameObjects.Image;
  preview?: Phaser.GameObjects.Image;
  collided: boolean;
};

const { layout: LANE_LAYOUT, defaults: LANE_DEFAULTS, obstacleScale: LANE_OBSTACLE_SCALE } = DEFAULT_TRAP_LANE_RUNNER_CONFIG;
const PLAYFIELD_WIDTH = LANE_LAYOUT.playfieldWidth;
const PLAYFIELD_HEIGHT = LANE_LAYOUT.playfieldHeight;
const PLAYFIELD_Y = LANE_LAYOUT.playfieldY;
const STATUS_Y = LANE_LAYOUT.statusY;
const INFO_Y = LANE_LAYOUT.infoY;
const TIMER_BAR_Y = LANE_LAYOUT.timerBarY;
const PLAYER_ROW_Y = LANE_LAYOUT.playerRowY;
const INPUT_ZONE_Y = LANE_LAYOUT.inputZoneY;
const INPUT_ZONE_WIDTH = LANE_LAYOUT.inputZoneWidth;
const INPUT_ZONE_HEIGHT = LANE_LAYOUT.inputZoneHeight;

export class TrapLaneRunnerMinigame extends BaseMinigame {
  private playfield?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;
  private infoText?: Phaser.GameObjects.Text;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private leftButton?: Phaser.GameObjects.Container;
  private rightButton?: Phaser.GameObjects.Container;
  private playerMarker?: Phaser.GameObjects.Container;
  private playerSprite?: Phaser.GameObjects.Sprite;
  private playerIdleAtlas?: MinigameAnimatedAtlasConfig;
  private playerRunAtlas?: MinigameAnimatedAtlasConfig;
  private laneGuideLines: Phaser.GameObjects.GameObject[] = [];
  private obstacles: LaneObstacle[] = [];
  private laneCenters: number[] = [];
  private playerLane = 0;
  private nextObstacleId = 1;
  private collisionCount = 0;
  private elapsedMs = 0;
  private timeLimitMs: number = LANE_DEFAULTS.timeLimitMs;
  private moveElapsedMs = Number.POSITIVE_INFINITY;
  private finished = false;
  private spawnTimer?: Phaser.Time.TimerEvent;
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
    this.statusText = this.scene.add.text(0, STATUS_Y, "Tocca a sinistra o destra per cambiare corsia.", {
      color: "#fef3c7",
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 282 },
    }).setOrigin(0.5);
    this.infoText = this.scene.add.text(0, INFO_Y, "", {
      color: "#dbeafe",
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      align: "center",
    }).setOrigin(0.5);
    const timerTrack = this.scene.add.rectangle(0, TIMER_BAR_Y, PLAYFIELD_WIDTH, 12, 0x111827, 0.94)
      .setStrokeStyle(2, 0xf6d365, 0.75);
    this.timerFill = this.scene.add.rectangle(-(PLAYFIELD_WIDTH / 2) + 2, TIMER_BAR_Y, PLAYFIELD_WIDTH - 4, 12, 0x22d3ee, 0.96)
      .setOrigin(0, 0.5);
    const timeDisplayMode = this.config.timeDisplayMode;
    timerTrack.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.timerFill.setVisible(this.isMetricBarVisible(timeDisplayMode));
    this.infoText.setVisible(this.isMetricTextVisible(timeDisplayMode));

    this.playfield = this.scene.add.container(0, 0);
    this.buildLanes();
    this.buildPlayerMarker();
    this.buildInputZones(panel);

    panel.add([this.statusText, this.infoText, timerTrack, this.timerFill, this.playfield]);

    this.bindGlobalInput();
    this.startRun();
  }

  override update(_time: number, delta: number): void {
    if (this.finished) {
      return;
    }

    this.elapsedMs += delta;
    this.moveElapsedMs += delta;

    const playerCollisionY = PLAYER_ROW_Y + 6;
    const fieldBottom = PLAYFIELD_Y + 30;

    this.obstacles = this.obstacles.filter((obstacle) => {
      obstacle.y += (delta / 1000) * obstacle.speed;
      const travelProgress = this.getObstacleTravelProgress(obstacle.y);
      obstacle.body
        .setPosition(this.getPerspectiveLaneX(obstacle.laneIndex, travelProgress), obstacle.y)
        .setScale(Phaser.Math.Linear(LANE_OBSTACLE_SCALE.initial, LANE_OBSTACLE_SCALE.final, travelProgress));

      if (obstacle.preview) {
        const previewActive = obstacle.y < PLAYFIELD_Y - PLAYFIELD_HEIGHT + 14;
        obstacle.preview.setVisible(previewActive);
      }

      if (!obstacle.collided && obstacle.laneIndex === this.playerLane && obstacle.y >= playerCollisionY - 8 && obstacle.y <= playerCollisionY + 8) {
        obstacle.collided = true;
        this.handleCollision(obstacle);
      }

      if (obstacle.y > fieldBottom) {
        obstacle.preview?.destroy();
        obstacle.body.destroy();
        return false;
      }

      return true;
    });
  }

  override destroy(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;
    this.countdownEvent?.remove(false);
    this.countdownEvent = undefined;
    this.destroyObstacles();
    super.destroy();
  }

  private startRun(): void {
    this.elapsedMs = 0;
    this.moveElapsedMs = Number.POSITIVE_INFINITY;
    this.timeLimitMs = Math.max(1000, Number(this.config.timeLimitMs ?? LANE_DEFAULTS.timeLimitMs));
    this.refreshInfo();
    this.spawnObstacle();
    this.spawnTimer = this.trackTimer(this.scene.time.addEvent({
      delay: Math.max(120, Number(this.config.spawnIntervalMs ?? LANE_DEFAULTS.spawnIntervalMs)),
      loop: true,
      callback: () => {
        if (!this.finished) {
          this.spawnObstacle();
        }
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

        this.refreshInfo();
        if (this.getRemainingTimeMs() <= 0) {
          this.finishRun(false);
        }
      },
    }));
  }

  private getRemainingTimeMs(): number {
    return Math.max(0, this.timeLimitMs - this.elapsedMs);
  }

  private buildLanes(): void {
    const laneCount = LANE_LAYOUT.laneCount;
    const laneWidth = (PLAYFIELD_WIDTH / laneCount) - 10;
    const left = (-PLAYFIELD_WIDTH / 2) + 17;
    this.laneCenters = [];

    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      const centerX = left + laneWidth * laneIndex + laneWidth / 2;
      this.laneCenters.push(centerX);

      if (laneIndex < laneCount - 1) {
        const bottomX = left + laneWidth * (laneIndex + 1);
        const side = laneIndex === 0 ? -1 : 1;
        const topX = bottomX - side * LANE_LAYOUT.lanePerspectiveSpreadX * 0.5;
        const divider = this.scene.add.line(0, 0, topX, PLAYFIELD_Y - PLAYFIELD_HEIGHT / 2 + 6, bottomX, PLAYFIELD_Y + PLAYFIELD_HEIGHT / 2 - 6, 0x93c5fd, 0.001)
          .setLineWidth(2, 2);
        this.playfield?.add(divider);
        this.laneGuideLines.push(divider);
      }
    }
  }

  private buildPlayerMarker(): void {
    const startLane = Math.floor(this.laneCenters.length / 2);
    this.playerLane = startLane;
    const marker = this.scene.add.container(this.laneCenters[startLane] ?? 0, PLAYER_ROW_Y);
    const heroUpAtlas = this.config.combatVisuals?.heroUpAtlas;
    const heroHorizAtlas = this.config.combatVisuals?.heroHorizAtlas;

    if (heroUpAtlas) {
      this.playerIdleAtlas = heroUpAtlas;
      this.playerRunAtlas = heroHorizAtlas ?? heroUpAtlas;
      this.ensureAtlasAnimations(this.playerIdleAtlas);
      this.ensureAtlasAnimations(this.playerRunAtlas);
      this.applyLinearFilterToTexture(heroUpAtlas.atlasKey);
      this.applyLinearFilterToTexture(this.playerRunAtlas.atlasKey);

      this.playerSprite = this.scene.add.sprite(0, 0, heroUpAtlas.atlasKey, heroUpAtlas.idleFrameName ?? "standing0001");
      this.playerSprite.setDisplaySize(52, 52);
      marker.add([this.playerSprite]);
      this.showPlayerIdle();
    } else {
      const fallback = this.scene.add.rectangle(0, 0, 24, 24, 0x2dd4bf, 0.96).setStrokeStyle(2, 0xffffff, 0.9);
      marker.add([fallback]);
    }

    this.playerMarker = marker;
    this.playfield?.add(marker);
  }

  private buildInputZones(panel: Phaser.GameObjects.Container): void {
    this.leftButton = this.createActionButton("LEFT", -110, INPUT_ZONE_Y, INPUT_ZONE_WIDTH, INPUT_ZONE_HEIGHT, {
      atlasKey: GAME_ATLAS.trapsDirSet1.key,
      frameName: "rune-direction-left",
      iconScale: 0.28,
    });
    this.rightButton = this.createActionButton("RIGHT",110, INPUT_ZONE_Y, INPUT_ZONE_WIDTH, INPUT_ZONE_HEIGHT, {
      atlasKey: GAME_ATLAS.trapsDirSet1.key,
      frameName: "rune-direction-right",
      iconScale: 0.28,
    });
    panel.add([this.leftButton, this.rightButton]);
  }

  private bindGlobalInput(): void {
    const handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
      pointer.event?.preventDefault?.();
      if (this.finished) {
        return;
      }

      const localY = pointer.worldY - this.centerY;
      if (localY >= INPUT_ZONE_Y - INPUT_ZONE_HEIGHT / 2 - 8) {
        return;
      }

      if (pointer.worldX < this.centerX) {
        this.tryMove(-1);
        return;
      }

      this.tryMove(1);
    };

    this.scene.input.on("pointerdown", handlePointerDown);
    this.trackDisposer(() => this.scene.input.off("pointerdown", handlePointerDown));
    if (this.leftButton) {
      this.bindPointer(this.leftButton, () => this.tryMove(-1));
    }
    if (this.rightButton) {
      this.bindPointer(this.rightButton, () => this.tryMove(1));
    }
  }

  private tryMove(direction: -1 | 1): void {
    const moveCooldownMs = Math.max(0, Number(this.config.moveCooldownMs ?? LANE_DEFAULTS.moveCooldownMs));
    if (this.moveElapsedMs < moveCooldownMs) {
      return;
    }

    const nextLane = Phaser.Math.Clamp(this.playerLane + direction, 0, this.laneCenters.length - 1);
    if (nextLane === this.playerLane) {
      return;
    }

    this.moveElapsedMs = 0;
    this.playerLane = nextLane;
    this.statusText?.setText(direction < 0 ? "Scatto a sinistra" : "Scatto a destra").setColor("#e0f2fe");
    this.playPlayerRun(direction);
    if (this.playerMarker) {
      this.trackTween(this.scene.tweens.add({
        targets: this.playerMarker,
        x: this.laneCenters[nextLane],
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => this.showPlayerIdle(),
      }));
    }
  }

  private playPlayerRun(direction: -1 | 1): void {
    if (!this.playerSprite || !this.playerRunAtlas) {
      return;
    }

    this.playerSprite.setFlipX(direction < 0);
    this.playAnimatedSpriteAction(this.playerSprite, this.playerRunAtlas, "run", { returnToIdle: false });
  }

  private showPlayerIdle(): void {
    if (!this.playerSprite || !this.playerIdleAtlas || this.finished) {
      return;
    }

    this.playerSprite.setFlipX(false);
    this.playAnimatedSpriteAction(this.playerSprite, this.playerIdleAtlas, "idle");
  }

  private spawnObstacle(): void {
    if (!this.playfield || this.finished) {
      return;
    }

    const laneIndex = Phaser.Math.Between(0, this.laneCenters.length - 1);
    const laneWidth = PLAYFIELD_WIDTH / this.laneCenters.length;
    const obstacleWidth = Math.max(18, laneWidth - 10);
    const startY = PLAYFIELD_Y - PLAYFIELD_HEIGHT + 10;
    const trapFrame = Phaser.Utils.Array.GetRandom([
      ...BACKGROUND_FRAMES.staticTrap,
      ...BACKGROUND_FRAMES.dynamicTrap,
    ]) ?? "trap-spikes-01";
    const body = this.scene.add.image(
      this.getPerspectiveLaneX(laneIndex, 0),
      startY,
      GAME_ATLAS.floor.key,
      trapFrame,
    );
    body.setDisplaySize(obstacleWidth, 38).setScale(LANE_OBSTACLE_SCALE.initial).setAlpha(0.98);
    const previewDurationMs = Math.max(0, Number(this.config.previewDurationMs ?? 0));
    const preview = previewDurationMs > 0
      ? this.scene.add.image(
        this.getPerspectiveLaneX(laneIndex, 0),
        PLAYFIELD_Y - PLAYFIELD_HEIGHT + 10,
        GAME_ATLAS.floor.key,
        trapFrame,
      ).setDisplaySize(obstacleWidth, 18).setAlpha(0.35)
      : undefined;

    if (preview) {
      this.playfield.add(preview);
      this.trackTimer(this.scene.time.delayedCall(previewDurationMs, () => preview.setVisible(false)));
    }

    this.playfield.add(body);
    // Le trappole vengono aggiunte durante il gioco: riportiamo l'eroe in cima
    // al contenitore per non nasconderlo dietro agli ostacoli in arrivo.
    if (this.playerMarker) {
      this.playfield.bringToTop(this.playerMarker);
    }
    this.obstacles.push({
      id: this.nextObstacleId++,
      laneIndex,
      y: startY,
      speed: Math.max(34, Number(this.config.obstacleSpeed ?? LANE_DEFAULTS.obstacleSpeed) * 0.72),
      body,
      preview,
      collided: false,
    });
  }

  private getObstacleTravelProgress(y: number): number {
    const startY = PLAYFIELD_Y - PLAYFIELD_HEIGHT + 10;
    return Phaser.Math.Clamp((y - startY) / Math.max(1, PLAYER_ROW_Y - startY), 0, 1);
  }

  private getPerspectiveLaneX(laneIndex: number, progress: number): number {
    const baseX = this.laneCenters[laneIndex] ?? 0;
    const side = laneIndex === 0 ? -1 : laneIndex === this.laneCenters.length - 1 ? 1 : 0;
    return baseX - side * LANE_LAYOUT.lanePerspectiveSpreadX * (1 - progress);
  }

  private handleCollision(obstacle: LaneObstacle): void {
    this.collisionCount += 1;
    obstacle.body.setTint(0xf59e0b);
    this.statusText?.setText("Collisione! Spostati subito.").setColor("#fca5a5");
    this.playPlayerHit();

    if (this.playerMarker) {
      this.trackTween(this.scene.tweens.add({
        targets: this.playerMarker,
        alpha: 0.35,
        yoyo: true,
        repeat: 2,
        duration: 70,
        ease: "Sine.easeInOut",
      }));
    }

    if (this.collisionCount >= 3) {
      this.finishRun(false);
    }
  }

  private playPlayerHit(): void {
    if (!this.playerSprite || !this.playerIdleAtlas) {
      return;
    }

    this.playerSprite.setFlipX(false);
    this.playAnimatedSpriteAction(this.playerSprite, this.playerIdleAtlas, "hit");
  }

  private refreshInfo(): void {
    const remainingMs = this.getRemainingTimeMs();
    const remainingRatio = Phaser.Math.Clamp(remainingMs / Math.max(1, this.timeLimitMs), 0, 1);
    this.timerFill?.setSize((PLAYFIELD_WIDTH - 4) * remainingRatio, 12);
    this.infoText?.setText(`Corsia ${this.playerLane + 1}/${this.laneCenters.length} · Collisioni ${this.collisionCount} · ${(remainingMs / 1000).toFixed(1)}s`);
  }

  private finishRun(technicalTimeout: boolean): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;
    this.countdownEvent?.remove(false);
    this.countdownEvent = undefined;
    this.destroyObstacles();

    const grade = technicalTimeout
      ? "fail"
      : this.collisionCount === 0
        ? "perfect"
        : this.collisionCount === 1
          ? "success"
          : this.collisionCount === 2
            ? "partial"
            : "fail";

    const feedback = grade === "perfect"
      ? { text: "Perfetto! Nessuna collisione.", color: "#bbf7d0" }
      : grade === "success"
        ? { text: "Quasi impeccabile. Una sola collisione.", color: "#d9f99d" }
        : grade === "partial"
          ? { text: "Hai resistito, ma con qualche colpo.", color: "#fdba74" }
          : { text: "Le trappole ti hanno travolto.", color: "#fca5a5" };
    this.statusText?.setText(feedback.text).setColor(feedback.color);
    const result = this.buildResult(grade);
    this.showTrapHeroDamageFeedback(result.damageTaken);
    this.completeWithDelay(result, 360);
  }

  private buildResult(grade: MinigameResult["grade"]): MinigameResult {
    const damageBase = Math.max(0, Number(this.config.event.damageValue ?? 0));
    const defenseMitigation = Math.max(0, Math.round(this.config.heroStats.defense * 0.12));
    const reducedDamage = Math.max(0, damageBase - defenseMitigation);
    const survivalBonus = Math.max(0, Math.round(this.timeLimitMs / 120));
    const score = Math.max(10, Math.round(
      120
      + this.config.heroStats.dexterity * 7
      + this.laneCenters.length * 12
      + survivalBonus
      - this.collisionCount * 26,
    ));

    if (grade === "perfect") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score,
        usedSkill: "dexterity",
        fatigueGained: 4,
        rewardMultiplier: 1.2,
        damageTaken: 0,
      };
    }
    if (grade === "success") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.round(score * 0.92),
        usedSkill: "dexterity",
        fatigueGained: 3,
        rewardMultiplier: 1,
        damageTaken: Math.max(1, Math.round(reducedDamage * 0.2)),
      };
    }
    if (grade === "partial") {
      return {
        eventId: this.config.event.id,
        eventType: this.config.event.type,
        grade,
        score: Math.round(score * 0.64),
        usedSkill: "dexterity",
        fatigueGained: 2,
        rewardMultiplier: 0.6,
        damageTaken: Math.round(reducedDamage * 0.6),
      };
    }

    return {
      eventId: this.config.event.id,
      eventType: this.config.event.type,
      grade,
      score: Math.round(score * 0.28),
      usedSkill: "dexterity",
      fatigueGained: 1,
      rewardMultiplier: 0.1,
      damageTaken: Math.max(1, reducedDamage),
    };
  }

  private destroyObstacles(): void {
    this.obstacles.forEach((obstacle) => {
      obstacle.preview?.destroy();
      obstacle.body.destroy();
    });
    this.obstacles = [];
  }
}
