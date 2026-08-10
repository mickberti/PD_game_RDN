import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import Phaser from 'phaser';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';
import { HERO_GAME_ATLAS_OPTIONS } from 'src/app/core/game/phaser/config/hero-atlas.config';
import { MONSTER_GAME_ATLAS_OPTIONS } from 'src/app/core/game/phaser/config/monster-atlas.config';

interface PhaserAtlasFrame {
  filename?: string;
  frame?: { x: number; y: number; w: number; h: number };
}

interface PhaserAtlasJson {
  frames: PhaserAtlasFrame[] | Record<string, PhaserAtlasFrame>;
  meta?: { image?: string };
}

interface GameAtlasOption {
  id: string;
  label: string;
  key: string;
  imageUrl: string;
  atlasData: PhaserAtlasJson;
}

interface SpritePrefixOption {
  prefix: string;
  frameNames: string[];
  start: number;
  end: number;
  zeroPad: number;
  suffix: string;
}

interface AnimationTesterConfig {
  atlasKey: string;
  atlasImageUrl: string;
  atlasData: PhaserAtlasJson;
  prefix: string;
  start: number;
  end: number;
  zeroPad: number;
  suffix: string;
  frameRate: number;
  duration: number;
  delay: number;
  repeat: number;
  repeatDelay: number;
  yoyo: boolean;
  showOnStart: boolean;
  hideOnComplete: boolean;
  skipMissedFrames: boolean;
  scale: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  originX: number;
  originY: number;
  previewWidth: number;
  previewHeight: number;
}

const GAME_ATLAS_OPTIONS: GameAtlasOption[] = [...HERO_GAME_ATLAS_OPTIONS, ...MONSTER_GAME_ATLAS_OPTIONS].map((option) => ({
  id: option.id,
  label: option.label,
  key: option.key,
  imageUrl: option.imageUrl,
  atlasData: option.atlasData
}));

@Component({
  selector: 'app-game-animation-tester',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
  templateUrl: './game-animation-tester.page.html',
  styleUrls: ['./game-animation-tester.page.scss']
})
export class GameAnimationTesterPage implements AfterViewInit, OnDestroy {
  @ViewChild('phaserContainer', { static: true })
  private readonly phaserContainer!: ElementRef<HTMLDivElement>;

  readonly atlasOptions = GAME_ATLAS_OPTIONS;
  readonly repeatPresets = [
    { label: 'Loop infinito', value: -1 },
    { label: 'Una volta', value: 0 },
    { label: '2 volte', value: 1 },
    { label: '3 volte', value: 2 }
  ];

  selectedAtlasId = this.atlasOptions[0]?.id ?? '';
  selectedPrefix = '';
  loadingAtlas = false;
  atlasError = '';
  frameNames: string[] = [];
  prefixOptions: SpritePrefixOption[] = [];

  config: AnimationTesterConfig = {
    atlasKey: this.atlasOptions[0]?.key ?? 'game-atlas-utils',
    atlasImageUrl: this.atlasOptions[0]?.imageUrl ?? '',
    atlasData: this.atlasOptions[0]?.atlasData ?? { frames: {} },
    prefix: '',
    start: 1,
    end: 1,
    zeroPad: 4,
    suffix: '',
    frameRate: 10,
    duration: 0,
    delay: 0,
    repeat: -1,
    repeatDelay: 0,
    yoyo: false,
    showOnStart: true,
    hideOnComplete: false,
    skipMissedFrames: true,
    scale: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    originX: 0.5,
    originY: 0.5,
    previewWidth: 520,
    previewHeight: 420
  };

  private game?: Phaser.Game;
  private scene?: AnimationPreviewScene;

  ngAfterViewInit(): void {
    this.createGame();
    void this.loadSelectedAtlas();
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
  }

  get selectedAtlas(): GameAtlasOption {
    return this.atlasOptions.find((atlas) => atlas.id === this.selectedAtlasId) ?? this.atlasOptions[0];
  }

  get selectedPrefixOption(): SpritePrefixOption | undefined {
    return this.prefixOptions.find((option) => option.prefix === this.selectedPrefix);
  }

  get generatedFrameNames(): string[] {
    const names: string[] = [];
    const start = Math.min(this.config.start, this.config.end);
    const end = Math.max(this.config.start, this.config.end);

    for (let index = start; index <= end; index += 1) {
      names.push(`${this.config.prefix}${String(index).padStart(this.config.zeroPad, '0')}${this.config.suffix}`);
    }

    return names;
  }

  get missingGeneratedFrames(): string[] {
    const available = new Set(this.frameNames);
    return this.generatedFrameNames.filter((frameName) => !available.has(frameName));
  }

  get generatedCode(): string {
    return `const animationConfig = ${JSON.stringify(this.animationCodeConfig(), null, 2)};

this.anims.create({
  key: 'hero-custom-animation',
  frames: this.anims.generateFrameNames(animationConfig.atlasKey, {
    prefix: animationConfig.prefix,
    start: animationConfig.start,
    end: animationConfig.end,
    zeroPad: animationConfig.zeroPad,
    suffix: animationConfig.suffix
  }),
  frameRate: animationConfig.frameRate,
  duration: animationConfig.duration || undefined,
  delay: animationConfig.delay,
  repeat: animationConfig.repeat,
  repeatDelay: animationConfig.repeatDelay,
  yoyo: animationConfig.yoyo,
  showOnStart: animationConfig.showOnStart,
  hideOnComplete: animationConfig.hideOnComplete,
  skipMissedFrames: animationConfig.skipMissedFrames
});

heroSprite
  .setOrigin(animationConfig.originX, animationConfig.originY)
  .setScale(animationConfig.scale)
  .setAngle(animationConfig.angle)
  .setFlip(animationConfig.flipX, animationConfig.flipY)
  .play('hero-custom-animation', true);`;
  }


  async onAtlasChange(): Promise<void> {
    await this.loadSelectedAtlas();
  }

  onPrefixChange(prefix: string): void {
    this.selectedPrefix = prefix;
    this.applyPrefixOption(this.selectedPrefixOption);
    this.applyAnimationConfig();
  }

  applyAnimationConfig(): void {
    this.config = this.normalizeConfig(this.config);
    this.scene?.applyConfig({ ...this.config });
  }

  replayAnimation(): void {
    this.scene?.replay();
  }

  copyConfigToClipboard(): void {
    const payload = {
      atlas: {
        key: this.config.atlasKey,
        image: this.config.atlasImageUrl,
        data: 'atlasData',
        frames: this.frameNames.length
      },
      animation: {
        prefix: this.config.prefix,
        start: this.config.start,
        end: this.config.end,
        zeroPad: this.config.zeroPad,
        suffix: this.config.suffix,
        frameRate: this.config.frameRate,
        duration: this.config.duration,
        delay: this.config.delay,
        repeat: this.config.repeat,
        repeatDelay: this.config.repeatDelay,
        yoyo: this.config.yoyo,
        showOnStart: this.config.showOnStart,
        hideOnComplete: this.config.hideOnComplete,
        skipMissedFrames: this.config.skipMissedFrames
      },
      sprite: {
        scale: this.config.scale,
        angle: this.config.angle,
        flipX: this.config.flipX,
        flipY: this.config.flipY,
        originX: this.config.originX,
        originY: this.config.originY
      }
    };

    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  }

  copyCodeToClipboard(): void {
    void navigator.clipboard.writeText(this.generatedCode);
  }

  private animationCodeConfig(): Record<string, unknown> {
    return {
      atlasKey: this.config.atlasKey,
      prefix: this.config.prefix,
      start: this.config.start,
      end: this.config.end,
      zeroPad: this.config.zeroPad,
      suffix: this.config.suffix,
      frameRate: this.config.frameRate,
      duration: this.config.duration,
      delay: this.config.delay,
      repeat: this.config.repeat,
      repeatDelay: this.config.repeatDelay,
      yoyo: this.config.yoyo,
      showOnStart: this.config.showOnStart,
      hideOnComplete: this.config.hideOnComplete,
      skipMissedFrames: this.config.skipMissedFrames,
      scale: this.config.scale,
      angle: this.config.angle,
      flipX: this.config.flipX,
      flipY: this.config.flipY,
      originX: this.config.originX,
      originY: this.config.originY
    };
  }

  private createGame(): void {
    this.scene = new AnimationPreviewScene();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.phaserContainer.nativeElement,
      width: this.config.previewWidth,
      height: this.config.previewHeight,
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [this.scene]
    });
  }

  private async loadSelectedAtlas(): Promise<void> {
    const atlas = this.selectedAtlas;

    if (!atlas) return;

    this.loadingAtlas = true;
    this.atlasError = '';
    this.config.atlasKey = atlas.key;
    this.config.atlasImageUrl = atlas.imageUrl;
    this.config.atlasData = atlas.atlasData;

    try {
      this.frameNames = this.extractFrameNames(atlas.atlasData);
      this.prefixOptions = this.buildPrefixOptions(this.frameNames);
      this.selectedPrefix = this.prefixOptions[0]?.prefix ?? '';
      this.applyPrefixOption(this.selectedPrefixOption);
      this.applyAnimationConfig();
    } catch (error) {
      this.atlasError = error instanceof Error ? error.message : 'Errore sconosciuto durante il caricamento atlas.';
      this.frameNames = [];
      this.prefixOptions = [];
    } finally {
      this.loadingAtlas = false;
    }
  }

  private extractFrameNames(data: PhaserAtlasJson): string[] {
    if (Array.isArray(data.frames)) {
      return data.frames
        .map((frame) => frame.filename)
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    return Object.keys(data.frames ?? {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  private buildPrefixOptions(frameNames: string[]): SpritePrefixOption[] {
    const grouped = new Map<string, Array<{ name: string; index: number; zeroPad: number; suffix: string }>>();

    frameNames.forEach((name) => {
      const match = /^(.*?)(\d+)(\D*)$/.exec(name);
      const prefix = match?.[1] ?? name;
      const numeric = match?.[2] ?? '1';
      const suffix = match?.[3] ?? '';
      const index = Number(numeric);
      const zeroPad = numeric.length;
      const key = `${prefix}|||${suffix}`;
      const items = grouped.get(key) ?? [];
      items.push({ name, index, zeroPad, suffix });
      grouped.set(key, items);
    });

    return Array.from(grouped.entries())
      .map(([key, items]) => {
        const [prefix] = key.split('|||');
        const sorted = items.sort((a, b) => a.index - b.index);
        return {
          prefix,
          frameNames: sorted.map((item) => item.name),
          start: sorted[0]?.index ?? 1,
          end: sorted[sorted.length - 1]?.index ?? 1,
          zeroPad: sorted[0]?.zeroPad ?? 0,
          suffix: sorted[0]?.suffix ?? ''
        };
      })
      .sort((a, b) => a.prefix.localeCompare(b.prefix, undefined, { numeric: true }));
  }

  private applyPrefixOption(option?: SpritePrefixOption): void {
    if (!option) return;

    this.config.prefix = option.prefix;
    this.config.start = option.start;
    this.config.end = option.end;
    this.config.zeroPad = option.zeroPad;
    this.config.suffix = option.suffix;
  }

  private normalizeConfig(config: AnimationTesterConfig): AnimationTesterConfig {
    const start = Math.max(0, Math.floor(Number(config.start) || 0));
    const end = Math.max(start, Math.floor(Number(config.end) || start));
    const zeroPad = Math.max(0, Math.floor(Number(config.zeroPad) || 0));

    return {
      ...config,
      start,
      end,
      zeroPad,
      frameRate: Math.max(1, Number(config.frameRate) || 1),
      duration: Math.max(0, Number(config.duration) || 0),
      delay: Math.max(0, Number(config.delay) || 0),
      repeat: Math.floor(Number(config.repeat) || 0),
      repeatDelay: Math.max(0, Number(config.repeatDelay) || 0),
      scale: Math.max(0.1, Number(config.scale) || 1),
      angle: Number(config.angle) || 0,
      originX: Math.min(1, Math.max(0, Number(config.originX) || 0)),
      originY: Math.min(1, Math.max(0, Number(config.originY) || 0)),
      previewWidth: Math.max(240, Number(config.previewWidth) || 520),
      previewHeight: Math.max(240, Number(config.previewHeight) || 420)
    };
  }
}

class AnimationPreviewScene extends Phaser.Scene {
  private currentConfig?: AnimationTesterConfig;
  private sprite?: Phaser.GameObjects.Sprite;
  private statusText?: Phaser.GameObjects.Text;
  private lastAnimationKey = '';

  constructor() {
    super({ key: 'AnimationPreviewScene' });
  }

  create(): void {
    this.statusText = this.add.text(16, 16, 'Seleziona un atlas per iniziare', {
      color: '#f8fafc',
      fontFamily: 'monospace',
      fontSize: '14px'
    });

    if (this.currentConfig) {
      this.applyConfig(this.currentConfig);
    }
  }

  applyConfig(config: AnimationTesterConfig): void {
    this.currentConfig = config;

    if (!this.sys.isActive()) return;

    this.scale.resize(config.previewWidth, config.previewHeight);
    if (!this.textures.exists(config.atlasKey)) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.buildAnimation(config));
      this.load.atlas(config.atlasKey, config.atlasImageUrl, config.atlasData);
      this.load.start();
      this.setStatus('Caricamento atlas Phaser...');
      return;
    }

    this.buildAnimation(config);
  }

  replay(): void {
    if (!this.sprite || !this.lastAnimationKey) return;
    this.sprite.play(this.lastAnimationKey, true);
  }

  private buildAnimation(config: AnimationTesterConfig): void {
    const frameNames = this.buildFrameNames(config).filter((frameName) => this.textures.get(config.atlasKey).has(frameName));

    if (!frameNames.length) {
      this.setStatus('Nessun frame valido per il prefisso selezionato.');
      this.sprite?.destroy();
      this.sprite = undefined;
      return;
    }

    const animationKey = `${config.atlasKey}-${config.prefix}-${config.start}-${config.end}-${Date.now()}`;
    this.lastAnimationKey = animationKey;

    this.anims.create({
      key: animationKey,
      frames: frameNames.map((frameName) => ({ key: config.atlasKey, frame: frameName })),
      frameRate: config.frameRate,
      duration: config.duration || undefined,
      delay: config.delay,
      repeat: config.repeat,
      repeatDelay: config.repeatDelay,
      yoyo: config.yoyo,
      showOnStart: config.showOnStart,
      hideOnComplete: config.hideOnComplete,
      skipMissedFrames: config.skipMissedFrames
    });

    if (!this.sprite) {
      this.sprite = this.add.sprite(config.previewWidth / 2, config.previewHeight / 2, config.atlasKey, frameNames[0]);
    }

    this.sprite
      .setTexture(config.atlasKey, frameNames[0])
      .setPosition(config.previewWidth / 2, config.previewHeight / 2)
      .setOrigin(config.originX, config.originY)
      .setScale(config.scale)
      .setAngle(config.angle)
      .setFlip(config.flipX, config.flipY)
      .setVisible(true)
      .play(animationKey, true);

    this.setStatus(`${frameNames.length} frame: ${frameNames[0]} → ${frameNames[frameNames.length - 1]}`);
  }

  private buildFrameNames(config: AnimationTesterConfig): string[] {
    const names: string[] = [];

    for (let index = config.start; index <= config.end; index += 1) {
      names.push(`${config.prefix}${String(index).padStart(config.zeroPad, '0')}${config.suffix}`);
    }

    return names;
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }
}
