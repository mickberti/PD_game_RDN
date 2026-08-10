import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import Phaser from 'phaser';
import { HERO_SPRITE_ATLAS_SETS, HeroSpriteAtlasSet, HeroSpriteDirection } from 'src/app/core/game/phaser/config/hero-atlas.config';
import { MONSTER_SPRITE_ATLAS_SETS, MonsterSpriteAtlasSet } from 'src/app/core/game/phaser/config/monster-atlas.config';
import { PhaserAtlasDataSet } from '../../../../core/models/phaser-game-state.model';
import { createHeroActionAnimationMap, HERO_ACTIONS, HeroActionAnimationMap, HeroActionOption, HeroFrameAction } from '../../../../core/models/phaser-hero-animation.models';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';

type HeroControlAction = HeroFrameAction | 'move-up' | 'move-down' | 'move-left' | 'move-right';
type FacingDirection = 'down' | 'up' | 'left' | 'right';

interface FrameTestAnimationConfig {
  zeroPad: number;
  suffix: string;
  yoyo: boolean;
  showOnStart: boolean;
  hideOnComplete: boolean;
  skipMissedFrames: boolean;
  scale: number;
  angle: number;
  originX: number;
  originY: number;
  previewWidth: number;
  previewHeight: number;
  movementSpeed: number;
}

interface FrameTestSceneConfig extends FrameTestAnimationConfig {
  atlasSet: HeroSpriteAtlasSet | MonsterSpriteAtlasSet;
  action: HeroFrameAction;
  actionConfigs: HeroActionAnimationMap;
}

@Component({
  selector: 'app-frame-test',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
  templateUrl: './frame-test.page.html',
  styleUrls: ['./frame-test.page.scss']
})
export class FrameTestPage implements AfterViewInit, OnDestroy {
  @ViewChild('phaserContainer', { static: true })
  private readonly phaserContainer!: ElementRef<HTMLDivElement>;

  readonly atlasSets = [...HERO_SPRITE_ATLAS_SETS, ...MONSTER_SPRITE_ATLAS_SETS];
  readonly actions = HERO_ACTIONS;
  readonly repeatPresets = [
    { label: 'Loop infinito', value: -1 },
    { label: 'Una volta', value: 0 },
    { label: '2 volte', value: 1 },
    { label: '3 volte', value: 2 }
  ];

  selectedSetId = this.atlasSets[0]?.id ?? '';
  selectedAction: HeroFrameAction = 'idle';
  actionConfigs: HeroActionAnimationMap = createHeroActionAnimationMap();
  config: FrameTestAnimationConfig = {
    zeroPad: 4,
    suffix: '',
    yoyo: false,
    showOnStart: true,
    hideOnComplete: false,
    skipMissedFrames: true,
    scale: 2,
    angle: 0,
    originX: 0.5,
    originY: 0.5,
    previewWidth: 620,
    previewHeight: 440,
    movementSpeed: 170
  };

  private game?: Phaser.Game;
  private scene?: FrameTestScene;

  ngAfterViewInit(): void {
    this.scene = new FrameTestScene();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.phaserContainer.nativeElement,
      width: this.config.previewWidth,
      height: this.config.previewHeight,
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [this.scene]
    });
    this.applyConfig();
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
  }

  get selectedAtlasSet(): HeroSpriteAtlasSet | MonsterSpriteAtlasSet {
    return this.atlasSets.find((set) => set.id === this.selectedSetId) ?? this.atlasSets[0];
  }

  get selectedActionOption(): HeroActionOption {
    return this.actions.find((action) => action.id === this.selectedAction) ?? this.actions[0];
  }

  get generatedCode(): string {
    return `const heroFrameTestConfig = ${JSON.stringify(this.codeConfig(), null, 2)};

type HeroAnimationAction = 'idle' | 'run' | 'attack' | 'shield' | 'special' | 'hit';
let heroAnimationAction: HeroAnimationAction = 'idle';
let heroAnimationKey = '';
let heroAnimationLockUntil = 0;

const directionToAtlas = {
  down: heroFrameTestConfig.atlases.down.key,
  up: heroFrameTestConfig.atlases.up.key,
  left: heroFrameTestConfig.atlases.horiz.key,
  right: heroFrameTestConfig.atlases.horiz.key
};

const playHeroAnimation = (action: HeroAnimationAction, facing = 'down', force = false, lockMs = 0) => {
  const atlasKey = directionToAtlas[facing];
  const animationKey = atlasKey + '-' + action;
  const now = this.time.now;

  if (!force && now < heroAnimationLockUntil && action !== heroAnimationAction) return;
  if (!force && heroAnimationKey === animationKey && heroAnimationAction === action && heroSprite.anims.isPlaying) return;

  heroSprite
    .setTexture(atlasKey, 'standing0001')
    .setFlipX(facing === 'left')
    .setOrigin(heroFrameTestConfig.originX, heroFrameTestConfig.originY)
    .setScale(heroFrameTestConfig.scale)
    .setAngle(heroFrameTestConfig.angle);

  heroAnimationAction = action;
  heroAnimationKey = animationKey;
  heroAnimationLockUntil = lockMs > 0 ? now + lockMs : 0;
  heroSprite.play(animationKey, force);
};`;
  }


  applyConfig(): void {
    this.config = this.normalizeConfig(this.config);
    this.actionConfigs = this.normalizeActionConfigs(this.actionConfigs);
    this.scene?.applyConfig({
      ...this.config,
      atlasSet: this.selectedAtlasSet,
      action: this.selectedAction,
      actionConfigs: this.actionConfigs
    });
  }

  onAtlasSetChange(): void {
    this.applyConfig();
  }

  onActionChange(): void {
    this.applyConfig();
    this.playAction(this.selectedAction);
  }

  playAction(action: HeroControlAction): void {
    this.scene?.triggerAction(action);
  }

  copyCodeToClipboard(): void {
    void navigator.clipboard.writeText(this.generatedCode);
  }

  private codeConfig(): Record<string, unknown> {
    return {
      setId: this.selectedAtlasSet.id,
      atlases: this.selectedAtlasSet.directions,
      zeroPad: this.config.zeroPad,
      suffix: this.config.suffix,
      yoyo: this.config.yoyo,
      showOnStart: this.config.showOnStart,
      hideOnComplete: this.config.hideOnComplete,
      skipMissedFrames: this.config.skipMissedFrames,
      scale: this.config.scale,
      angle: this.config.angle,
      originX: this.config.originX,
      originY: this.config.originY,
      movementSpeed: this.config.movementSpeed,
      actions: this.actions.reduce((map, action) => ({ ...map, [action.id]: this.actionConfigs[action.id] }), {})
    };
  }

  private normalizeConfig(config: FrameTestAnimationConfig): FrameTestAnimationConfig {
    return {
      ...config,
      zeroPad: Math.max(0, Math.floor(Number(config.zeroPad) || 0)),
      scale: Math.max(0.1, Number(config.scale) || 1),
      angle: Number(config.angle) || 0,
      originX: Math.min(1, Math.max(0, Number(config.originX) || 0.5)),
      originY: Math.min(1, Math.max(0, Number(config.originY) || 0.5)),
      previewWidth: Math.max(240, Number(config.previewWidth) || 620),
      previewHeight: Math.max(240, Number(config.previewHeight) || 440),
      movementSpeed: Math.max(30, Number(config.movementSpeed) || 170)
    };
  }

  private normalizeActionConfigs(configs: HeroActionAnimationMap): HeroActionAnimationMap {
    return this.actions.reduce((map, defaults) => {
      const config = configs[defaults.id] ?? defaults;
      const start = Math.max(0, Math.floor(Number(config.start) || 0));
      const end = Math.max(start, Math.floor(Number(config.end) || start));

      map[defaults.id] = {
        ...defaults,
        ...config,
        start,
        end,
        frameRate: Math.max(1, Number(config.frameRate) || defaults.frameRate),
        duration: Math.max(0, Number(config.duration) || 0),
        delay: Math.max(0, Number(config.delay) || 0),
        repeat: Math.floor(Number(config.repeat) || 0),
        repeatDelay: Math.max(0, Number(config.repeatDelay) || 0)
      };

      return map;
    }, {} as HeroActionAnimationMap);
  }
}

class FrameTestScene extends Phaser.Scene {
  private config?: FrameTestSceneConfig;
  private hero?: Phaser.Physics.Arcade.Sprite;
  private statusText?: Phaser.GameObjects.Text;
  private facing: FacingDirection = 'down';
  private currentAction: HeroFrameAction = 'idle';
  private heroAnimationAction: HeroFrameAction = 'idle';
  private heroAnimationKey = '';
  private heroAnimationLockUntil = 0;
  private joystickPointerId: number | null = null;
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private joystickVector = new Phaser.Math.Vector2(0, 0);
  private readonly joystickRadius = 54;
  private readonly joystickDeadZone = 0.18;
  private attackButton?: Phaser.GameObjects.Container;
  private specialButton?: Phaser.GameObjects.Container;
  private shieldButton?: Phaser.GameObjects.Container;
  private hitButton?: Phaser.GameObjects.Container;
  private attackPointerId: number | null = null;
  private specialPointerId: number | null = null;
  private hitPointerId: number | null = null;
  private shieldPointerId: number | null = null;
  private activeHeldAction: Exclude<HeroFrameAction, 'idle' | 'run' | 'shield'> | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'SHIFT' | 'E' | 'H', Phaser.Input.Keyboard.Key>;

  constructor() {
    super({ key: 'FrameTestScene' });
  }

  create(): void {
    this.statusText = this.add.text(16, 16, 'Pronto: usa joystick e pulsanti HUD dentro Phaser.', {
      color: '#f8fafc',
      fontFamily: 'monospace',
      fontSize: '14px'
    }).setScrollFactor(0).setDepth(10);

    this.createInput();
    this.createHudControls();

    if (this.config) this.applyConfig(this.config);
  }

  override update(): void {
    this.handleMovement();
    this.handleKeyboardActions();
  }

  applyConfig(config: FrameTestSceneConfig): void {
    this.config = config;
    if (!this.sys.isActive()) return;

    this.scale.resize(config.previewWidth, config.previewHeight);
    this.repositionHudControls(config.previewWidth, config.previewHeight);

    const missingAtlas = Object.values(config.atlasSet.directions).find((atlas) => !this.textures.exists(atlas.key));
    if (missingAtlas) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.buildHero());
      Object.values(config.atlasSet.directions).forEach((atlas) => {
        if (!this.textures.exists(atlas.key)) this.load.atlas(atlas.key, atlas.imageUrl, atlas.atlasData as PhaserAtlasDataSet);
      });
      this.load.start();
      this.setStatus('Caricamento atlas direzionali eroe...');
      return;
    }

    this.buildHero();
  }

  triggerAction(action: HeroControlAction): void {
    if (!this.config || !this.hero) return;

    const movementDirections: Partial<Record<HeroControlAction, FacingDirection>> = {
      'move-up': 'up',
      'move-down': 'down',
      'move-left': 'left',
      'move-right': 'right'
    };
    const movement = movementDirections[action];

    if (movement) {
      this.facing = movement;
      this.moveHero(movement);
      this.playHeroAnimation('run');
      return;
    }

    this.playAction(action as HeroFrameAction);
  }

  private playAction(action: HeroFrameAction): void {
    if (!this.config || !this.hero) return;

    if (action === 'idle') {
      this.hero.setVelocity(0, 0);
      this.joystickVector.set(0, 0);
      this.attackPointerId = null;
      this.specialPointerId = null;
      this.hitPointerId = null;
      this.shieldPointerId = null;
      this.activeHeldAction = null;
      this.playHeroAnimation('idle', true);
      return;
    }

    if (action === 'shield') {
      this.playHeroAnimation('shield');
      return;
    }

    this.hero.setVelocity(0, 0);
    this.playHeroAnimation(action, true, 360);
  }


  private buildHero(): void {
    if (!this.config) return;

    this.createAnimations();
    const atlasKey = this.getAtlasKey();

    if (!this.hero) {
      this.hero = this.physics.add.sprite(this.config.previewWidth / 2, this.config.previewHeight / 2, atlasKey, 'standing0001');
      this.hero.body?.setSize(42, 48);
    }

    this.hero
      .setTexture(atlasKey, 'standing0001')
      .setPosition(this.config.previewWidth / 2, this.config.previewHeight / 2)
      .setOrigin(this.config.originX, this.config.originY)
      .setScale(this.config.scale)
      .setAngle(this.config.angle)
      .setFlipX(this.facing === 'left')
      .setCollideWorldBounds(true);

    this.playHeroAnimation(this.currentAction, true);
  }

  private createAnimations(): void {
    if (!this.config) return;

    Object.entries(this.config.atlasSet.directions).forEach(([direction, atlas]) => {
      Object.values(this.config?.actionConfigs ?? {}).forEach((actionConfig) => {
        const action = actionConfig.id;
        const key = `${atlas.key}-${action}`;
        if (this.anims.exists(key)) this.anims.remove(key);
        const texture = this.textures.get(atlas.key);
        const frames = this.buildFrameNames(actionConfig).filter((frameName) => texture.has(frameName));
        if (!frames.length) return;
        this.anims.create({
          key,
          frames: frames.map((frame) => ({ key: atlas.key, frame })),
          frameRate: actionConfig.frameRate,
          duration: actionConfig.duration || undefined,
          delay: actionConfig.delay,
          repeat: actionConfig.repeat,
          repeatDelay: actionConfig.repeatDelay,
          yoyo: this.config?.yoyo ?? false,
          showOnStart: this.config?.showOnStart ?? true,
          hideOnComplete: this.config?.hideOnComplete ?? false,
          skipMissedFrames: this.config?.skipMissedFrames ?? true
        });
      });
      void direction;
    });
  }

  private moveHero(direction: FacingDirection): void {
    if (!this.hero || !this.config) return;

    const speed = this.config.movementSpeed;
    const velocity: Record<FacingDirection, [number, number]> = {
      up: [0, -speed],
      down: [0, speed],
      left: [-speed, 0],
      right: [speed, 0]
    };
    const [x, y] = velocity[direction];
    this.hero.setVelocity(x, y);
  }

  private playHeroAnimation(action: HeroFrameAction, force = false, lockMs = 0): void {
    if (!this.hero || !this.config) return;

    const now = this.time.now;
    if (!force && now < this.heroAnimationLockUntil && action !== this.heroAnimationAction) {
      return;
    }

    const atlasKey = this.getAtlasKey();
    const key = `${atlasKey}-${action}`;
    if (!this.anims.exists(key)) return;

    const isSameAnimation = this.heroAnimationKey === key && this.heroAnimationAction === action;
    if (!force && isSameAnimation && this.hero.anims.isPlaying) {
      this.hero.setFlipX(this.facing === 'left');
      this.setStatus(`${this.facing.toUpperCase()} · ${action} · ${atlasKey}`);
      return;
    }

    if (this.hero.texture.key !== atlasKey) {
      this.hero.setTexture(atlasKey, 'standing0001');
    }

    this.hero
      .setOrigin(this.config.originX, this.config.originY)
      .setScale(this.config.scale)
      .setAngle(this.config.angle)
      .setFlipX(this.facing === 'left');

    this.heroAnimationAction = action;
    this.heroAnimationKey = key;
    this.currentAction = action;
    this.heroAnimationLockUntil = lockMs > 0 ? now + lockMs : 0;
    this.hero.play(key, force);
    this.setStatus(`${this.facing.toUpperCase()} · ${action} · ${atlasKey}`);

    if (lockMs > 0) {
      this.hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.heroAnimationKey === key) {
          this.heroAnimationLockUntil = 0;
          this.updateHeroIdleOrRun();
        }
      });
    }
  }

  private updateHeroIdleOrRun(): void {
    if (!this.hero) return;

    if (this.activeHeldAction) {
      this.playHeroAnimation(this.activeHeldAction);
      return;
    }

    if (this.shieldPointerId !== null) {
      this.playHeroAnimation('shield');
      return;
    }

    const body = this.hero.body as Phaser.Physics.Arcade.Body | null;
    const moving = Boolean(body && (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5));
    this.playHeroAnimation(moving ? 'run' : 'idle');
  }

  private setHeldAction(action: Exclude<HeroFrameAction, 'idle' | 'run' | 'shield'> | null): void {
    if (!this.hero || this.activeHeldAction === action) return;

    this.activeHeldAction = action;
    if (action) {
      this.hero.setVelocity(0, 0);
      this.playHeroAnimation(action, true);
      return;
    }

    this.updateHeroIdleOrRun();
  }

  private createInput(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      H: Phaser.Input.Keyboard.KeyCodes.H
    }) as Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'SHIFT' | 'E' | 'H', Phaser.Input.Keyboard.Key>;
  }

  private handleMovement(): void {
    if (!this.hero || !this.config) return;

    if (this.activeHeldAction) {
      this.hero.setVelocity(0, 0);
      this.updateHeroIdleOrRun();
      return;
    }

    const speed = this.config.movementSpeed;
    let vx = this.joystickVector.x * speed;
    let vy = this.joystickVector.y * speed;

    if (this.cursors && this.keys) {
      const left = this.cursors.left.isDown || this.keys.A.isDown;
      const right = this.cursors.right.isDown || this.keys.D.isDown;
      const up = this.cursors.up.isDown || this.keys.W.isDown;
      const down = this.cursors.down.isDown || this.keys.S.isDown;

      if (left || right || up || down) {
        vx = left ? -speed : right ? speed : 0;
        vy = up ? -speed : down ? speed : 0;

        if (vx !== 0 && vy !== 0) {
          vx *= Math.SQRT1_2;
          vy *= Math.SQRT1_2;
        }
      }
    }

    if (vx < -1) this.facing = 'left';
    else if (vx > 1) this.facing = 'right';
    else if (vy < -1) this.facing = 'up';
    else if (vy > 1) this.facing = 'down';

    const shieldSlowdown = this.shieldPointerId !== null ? 0.55 : 1;
    this.hero.setVelocity(vx * shieldSlowdown, vy * shieldSlowdown);
    this.updateHeroIdleOrRun();
  }

  private handleKeyboardActions(): void {
    if (!this.keys) return;

    const nextHeldAction = this.keys.E.isDown ? 'special' : this.keys.SPACE.isDown ? 'attack' : this.keys.H.isDown ? 'hit' : null;
    this.setHeldAction(nextHeldAction);

    const shieldPointerWasActive = this.shieldPointerId !== null;
    if (this.keys.SHIFT.isDown && !shieldPointerWasActive) {
      this.shieldPointerId = -1;
      this.updateHeroIdleOrRun();
    } else if (!this.keys.SHIFT.isDown && this.shieldPointerId === -1) {
      this.shieldPointerId = null;
      this.updateHeroIdleOrRun();
    }
  }

  private createHudControls(): void {
    this.joystickBase = this.add.circle(92, Number(this.scale.height) - 92, this.joystickRadius, 0xffffff, 0.16);
    this.joystickThumb = this.add.circle(92, Number(this.scale.height) - 92, 24, 0xffffff, 0.35);
    this.joystickBase.setScrollFactor(0).setDepth(1500);
    this.joystickThumb.setScrollFactor(0).setDepth(1501);

    this.attackButton = this.createHudButton(
      Number(this.scale.width) - 86,
      Number(this.scale.height) - 90,
      'ATK',
      0xf97316,
      undefined,
      pointer => {
        this.attackPointerId = pointer.id;
        this.setHeldAction('attack');
      },
      pointer => {
        if (pointer.id === this.attackPointerId) {
          this.attackPointerId = null;
          if (this.activeHeldAction === 'attack') this.setHeldAction(null);
        }
      }
    );
    this.specialButton = this.createHudButton(
      Number(this.scale.width) - 168,
      Number(this.scale.height) - 90,
      'SPL',
      0xa855f7,
      undefined,
      pointer => {
        this.specialPointerId = pointer.id;
        this.setHeldAction('special');
      },
      pointer => {
        if (pointer.id === this.specialPointerId) {
          this.specialPointerId = null;
          if (this.activeHeldAction === 'special') this.setHeldAction(null);
        }
      }
    );
    this.shieldButton = this.createHudButton(
      Number(this.scale.width) - 250,
      Number(this.scale.height) - 76,
      'SHD',
      0x38bdf8,
      undefined,
      pointer => {
        this.shieldPointerId = pointer.id;
        this.playAction('shield');
      },
      pointer => {
        if (pointer.id === this.shieldPointerId) {
          this.shieldPointerId = null;
          this.updateHeroIdleOrRun();
        }
      }
    );
    this.hitButton = this.createHudButton(
      Number(this.scale.width) - 332,
      Number(this.scale.height) - 90,
      'HIT',
      0xef4444,
      undefined,
      pointer => {
        this.hitPointerId = pointer.id;
        this.setHeldAction('hit');
      },
      pointer => {
        if (pointer.id === this.hitPointerId) {
          this.hitPointerId = null;
          if (this.activeHeldAction === 'hit') this.setHeldAction(null);
        }
      }
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x <= Number(this.scale.width) * 0.55 && this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.joystickBase?.setPosition(pointer.x, pointer.y);
        this.joystickThumb?.setPosition(pointer.x, pointer.y);
        this.updateJoystick(pointer);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) this.updateJoystick(pointer);
    });

    const releasePointer = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) this.releaseJoystick();
      if (pointer.id === this.attackPointerId) {
        this.attackPointerId = null;
        if (this.activeHeldAction === 'attack') this.setHeldAction(null);
      }
      if (pointer.id === this.specialPointerId) {
        this.specialPointerId = null;
        if (this.activeHeldAction === 'special') this.setHeldAction(null);
      }
      if (pointer.id === this.hitPointerId) {
        this.hitPointerId = null;
        if (this.activeHeldAction === 'hit') this.setHeldAction(null);
      }
      if (pointer.id === this.shieldPointerId) {
        this.shieldPointerId = null;
        this.updateHeroIdleOrRun();
      }
    };

    this.input.on('pointerup', releasePointer);
    this.input.on('pointerupoutside', releasePointer);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => this.repositionHudControls(gameSize.width, gameSize.height));
  }

  private createHudButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onTap?: () => void,
    onDown?: (pointer: Phaser.Input.Pointer) => void,
    onUp?: (pointer: Phaser.Input.Pointer) => void
  ): Phaser.GameObjects.Container {
    const circle = this.add.circle(0, 0, 31, color, 0.34);
    circle.setStrokeStyle(2, 0xffffff, 0.55);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [circle, text]);
    container.setSize(68, 68);
    container.setScrollFactor(0);
    container.setDepth(1510);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 34), Phaser.Geom.Circle.Contains);

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      circle.setAlpha(0.72);
      onDown?.(pointer);
      onTap?.();
    });

    const release = (pointer: Phaser.Input.Pointer) => {
      circle.setAlpha(1);
      onUp?.(pointer);
    };

    container.on('pointerup', release);
    container.on('pointerout', release);

    return container;
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase || !this.joystickThumb) return;

    const base = new Phaser.Math.Vector2(this.joystickBase.x, this.joystickBase.y);
    const current = new Phaser.Math.Vector2(pointer.x, pointer.y);
    const delta = current.subtract(base);
    const distance = Phaser.Math.Clamp(delta.length(), 0, this.joystickRadius);

    if (delta.length() > 0) delta.normalize();

    this.joystickThumb.setPosition(this.joystickBase.x + delta.x * distance, this.joystickBase.y + delta.y * distance);

    const strength = distance / this.joystickRadius;
    if (strength < this.joystickDeadZone) this.joystickVector.set(0, 0);
    else this.joystickVector.set(delta.x * strength, delta.y * strength);
  }

  private releaseJoystick(): void {
    this.joystickPointerId = null;
    this.joystickVector.set(0, 0);
    this.joystickBase?.setPosition(92, Number(this.scale.height) - 92);
    this.joystickThumb?.setPosition(92, Number(this.scale.height) - 92);
  }

  private repositionHudControls(width = Number(this.scale.width), height = Number(this.scale.height)): void {
    if (this.joystickPointerId === null) {
      this.joystickBase?.setPosition(92, height - 92);
      this.joystickThumb?.setPosition(92, height - 92);
    }

    this.attackButton?.setPosition(width - 86, height - 90);
    this.specialButton?.setPosition(width - 168, height - 90);
    this.shieldButton?.setPosition(width - 250, height - 76);
    this.hitButton?.setPosition(width - 332, height - 90);
  }


  private buildFrameNames(actionConfig: HeroActionOption): string[] {
    if (!this.config) return [];
    const names: string[] = [];
    const zeroPad = actionConfig.zeroPad ?? this.config.zeroPad;
    const suffix = actionConfig.suffix ?? this.config.suffix;

    for (let index = actionConfig.start; index <= actionConfig.end; index += 1) {
      names.push(`${actionConfig.prefix}${String(index).padStart(zeroPad, '0')}${suffix}`);
    }
    return names;
  }

  private getAtlasKey(): string {
    const direction: HeroSpriteDirection = this.facing === 'up' ? 'up' : this.facing === 'down' ? 'down' : 'horiz';
    return this.config?.atlasSet.directions[direction].key ?? 'hero-down-set1';
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }
}
