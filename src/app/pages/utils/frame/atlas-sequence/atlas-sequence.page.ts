import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import Phaser from 'phaser';
import { HERO_SPRITE_ATLAS_SETS, HeroSpriteAtlasSet } from 'src/app/core/game/phaser/config/hero-atlas.config';
import { MONSTER_SPRITE_ATLAS_SETS, MonsterSpriteAtlasSet } from 'src/app/core/game/phaser/config/monster-atlas.config';
import { HERO_ACTIONS, HeroActionOption, HeroFrameAction } from 'src/app/core/models/phaser-hero-animation.models';
import { PhaserAtlasDataSet } from 'src/app/core/models/phaser-game-state.model';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';

type AtlasSet = HeroSpriteAtlasSet | MonsterSpriteAtlasSet;
type Orientation = 'down' | 'up' | 'right' | 'left';

interface SequenceConfig {
  atlasSet: AtlasSet;
  action: HeroActionOption;
  orientation: Orientation;
}

@Component({
  selector: 'app-atlas-sequence',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
  templateUrl: './atlas-sequence.page.html',
  styleUrls: ['./atlas-sequence.page.scss']
})
export class AtlasSequencePage implements AfterViewInit, OnDestroy {
  @ViewChild('phaserContainer', { static: true })
  private readonly phaserContainer!: ElementRef<HTMLDivElement>;

  readonly atlasSets: AtlasSet[] = [...HERO_SPRITE_ATLAS_SETS, ...MONSTER_SPRITE_ATLAS_SETS];
  readonly actions = HERO_ACTIONS;
  readonly orientations: Array<{ id: Orientation; label: string }> = [
    { id: 'down', label: 'Giù' },
    { id: 'up', label: 'Su' },
    { id: 'right', label: 'Destra' },
    { id: 'left', label: 'Sinistra' }
  ];

  selectedSetId = this.atlasSets[0]?.id ?? '';
  selectedAction: HeroFrameAction = 'idle';
  selectedOrientation: Orientation = 'down';

  private game?: Phaser.Game;
  private scene?: AtlasSequenceScene;

  ngAfterViewInit(): void {
    this.scene = new AtlasSequenceScene();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.phaserContainer.nativeElement,
      width: 640,
      height: 440,
      backgroundColor: '#0b1220',
      scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [this.scene]
    });
    this.applySelection();
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
  }

  get selectedAtlasSet(): AtlasSet {
    return this.atlasSets.find((set) => set.id === this.selectedSetId) ?? this.atlasSets[0];
  }

  get selectedActionOption(): HeroActionOption {
    return this.actions.find((action) => action.id === this.selectedAction) ?? this.actions[0];
  }

  applySelection(): void {
    this.scene?.applyConfig({
      atlasSet: this.selectedAtlasSet,
      action: this.selectedActionOption,
      orientation: this.selectedOrientation
    });
  }
}

class AtlasSequenceScene extends Phaser.Scene {
  private config?: SequenceConfig;
  private sprite?: Phaser.GameObjects.Sprite;
  private label?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'AtlasSequenceScene' });
  }

  create(): void {
    this.label = this.add.text(20, 18, '', {
      color: '#e2e8f0',
      fontFamily: 'monospace',
      fontSize: '15px'
    });
    if (this.config) this.renderSequence();
  }

  applyConfig(config: SequenceConfig): void {
    this.config = config;
    if (!this.sys.isActive()) return;

    const atlas = this.getAtlas(config);
    const textureKey = this.textureKey(config);
    if (!this.textures.exists(textureKey)) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.renderSequence());
      this.load.atlas(textureKey, atlas.imageUrl, atlas.atlasData as PhaserAtlasDataSet);
      this.load.start();
      this.label?.setText('Caricamento atlas...');
      return;
    }

    this.renderSequence();
  }

  private renderSequence(): void {
    if (!this.config) return;

    const textureKey = this.textureKey(this.config);
    const animationKey = `sequence-${this.config.atlasSet.id}-${this.config.orientation}-${this.config.action.id}`;
    const texture = this.textures.get(textureKey);
    const frames = this.frameNames(this.config.action).filter((name) => texture.has(name));

    if (!frames.length) {
      this.sprite?.destroy();
      this.sprite = undefined;
      this.label?.setText(`Nessun frame trovato per ${this.config.action.prefix}.`);
      return;
    }

    if (this.anims.exists(animationKey)) this.anims.remove(animationKey);
    this.anims.create({
      key: animationKey,
      frames: frames.map((frame) => ({ key: textureKey, frame })),
      frameRate: this.config.action.frameRate,
      repeat: -1
    });

    if (!this.sprite) this.sprite = this.add.sprite(320, 235, textureKey, frames[0]);
    this.sprite
      .setTexture(textureKey, frames[0])
      .setPosition(320, 235)
      .setScale(3)
      .setFlipX(this.config.orientation === 'left')
      .play(animationKey, true);

    this.label?.setText(`${this.config.atlasSet.label} · ${this.config.action.label} · ${this.orientationLabel(this.config.orientation)} · loop`);
  }

  private getAtlas(config: SequenceConfig) {
    const direction = config.orientation === 'up' ? 'up' : config.orientation === 'down' ? 'down' : 'horiz';
    return config.atlasSet.directions[direction];
  }

  private textureKey(config: SequenceConfig): string {
    return `atlas-sequence-${config.atlasSet.id}-${config.orientation === 'up' ? 'up' : config.orientation === 'down' ? 'down' : 'horiz'}`;
  }

  private frameNames(action: HeroActionOption): string[] {
    const names: string[] = [];
    for (let index = action.start; index <= action.end; index += 1) {
      names.push(`${action.prefix}${String(index).padStart(action.zeroPad ?? 4, '0')}${action.suffix ?? ''}`);
    }
    return names;
  }

  private orientationLabel(orientation: Orientation): string {
    return ({ down: 'Giù', up: 'Su', right: 'Destra', left: 'Sinistra' })[orientation];
  }
}
