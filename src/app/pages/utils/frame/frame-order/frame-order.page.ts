import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { HERO_GAME_ATLAS_OPTIONS, HeroGameAtlasOption } from 'src/app/core/game/phaser/config/hero-atlas.config';
import { MONSTER_GAME_ATLAS_OPTIONS, MonsterGameAtlasOption } from 'src/app/core/game/phaser/config/monster-atlas.config';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';

interface AtlasFrameEntry {
  frame: { x: number; y: number; w: number; h: number };
  rotated?: boolean;
  trimmed?: boolean;
  spriteSourceSize?: { x: number; y: number; w: number; h: number };
  sourceSize?: { w: number; h: number };
  pivot?: { x: number; y: number };
}

interface OrderedFrame {
  name: string;
  entry: AtlasFrameEntry;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PreviewFormatOption {
  id: string;
  label: string;
  width: number;
  height: number;
}

interface FrameNameParts {
  prefix: string;
  numberText: string;
  suffix: string;
}

@Component({
  selector: 'app-frame-order',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
  templateUrl: './frame-order.page.html',
  styleUrls: ['./frame-order.page.scss']
})
export class FrameOrderPage {
  readonly atlasOptions = [...HERO_GAME_ATLAS_OPTIONS, ...MONSTER_GAME_ATLAS_OPTIONS];
  readonly previewFormatOptions: PreviewFormatOption[] = [
    { id: 'square-sm', label: 'Quadrato SM (80x80)', width: 80, height: 80 },
    { id: 'square-md', label: 'Quadrato MD (160x160)', width: 160, height: 160 },
    { id: 'square-lg', label: 'Quadrato LG (320x320)', width: 320, height: 320 },
    { id: 'square-xlg', label: 'Quadrato XLG (640x640)', width: 640, height: 640 },
    { id: 'rect-sm', label: 'Rettangolare SM (120x80)', width: 120, height: 80 },
    { id: 'rect-md', label: 'Rettangolare MD (320x200)', width: 320, height: 200 },
    { id: 'rect-lg', label: 'Rettangolare LG (440x280)', width: 440, height: 280 },
    { id: 'rect-xlg', label: 'Rettangolare XLG (880x560)', width: 880, height: 560 }
  ];

  selectedAtlasId = this.atlasOptions[0]?.id ?? '';
  frames: OrderedFrame[] = this.buildFrames(this.selectedAtlas);
  selectedPreviewFormatId = this.previewFormatOptions[2].id;
  selectedFrameName = this.frames[0]?.name ?? '';
  draggedFrameName = '';

  get selectedAtlas(): HeroGameAtlasOption | MonsterGameAtlasOption {
    const fallback = this.atlasOptions[0];
    if (!fallback) {
      throw new Error('Nessun atlas eroe configurato.');
    }

    return this.atlasOptions.find((option) => option.id === this.selectedAtlasId) ?? fallback;
  }

  get selectedIndex(): number {
    return Math.max(0, this.frames.findIndex((frame) => frame.name === this.selectedFrameName));
  }

  get selectedFrame(): OrderedFrame | undefined {
    return this.frames[this.selectedIndex];
  }

  get selectedAtlasImage(): string {
    return this.selectedAtlas.imageUrl;
  }

  get selectedAtlasWidth(): number {
    return this.selectedAtlas.atlasData.meta?.size?.w ?? 1;
  }

  get selectedAtlasHeight(): number {
    return this.selectedAtlas.atlasData.meta?.size?.h ?? 1;
  }

  get selectedPreviewFormat(): PreviewFormatOption {
    return this.previewFormatOptions.find((option) => option.id === this.selectedPreviewFormatId) ?? this.previewFormatOptions[0];
  }

  get updatedAtlasText(): string {
    return `export const atlasData = ${JSON.stringify(this.buildUpdatedAtlas(), null, 2)};\n`;
  }

  onAtlasChange(atlasId: string): void {
    this.selectedAtlasId = atlasId;
    this.frames = this.buildFrames(this.selectedAtlas);
    this.selectedFrameName = this.frames[0]?.name ?? '';
  }

  onPreviewFormatChange(formatId: string): void {
    this.selectedPreviewFormatId = formatId;
  }

  selectFrame(frameName: string): void {
    this.selectedFrameName = frameName;
  }

  previousFrame(): void {
    if (!this.frames.length) return;
    const nextIndex = (this.selectedIndex - 1 + this.frames.length) % this.frames.length;
    this.selectedFrameName = this.frames[nextIndex].name;
  }

  nextFrame(): void {
    if (!this.frames.length) return;
    const nextIndex = (this.selectedIndex + 1) % this.frames.length;
    this.selectedFrameName = this.frames[nextIndex].name;
  }

  onDragStart(frameName: string): void {
    this.draggedFrameName = frameName;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(targetFrameName: string): void {
    if (!this.draggedFrameName || this.draggedFrameName === targetFrameName) return;

    const fromIndex = this.frames.findIndex((frame) => frame.name === this.draggedFrameName);
    const toIndex = this.frames.findIndex((frame) => frame.name === targetFrameName);

    if (fromIndex < 0 || toIndex < 0) return;

    const [movedFrame] = this.frames.splice(fromIndex, 1);
    this.frames.splice(toIndex, 0, movedFrame);
    this.draggedFrameName = '';
  }

  moveSelected(delta: number): void {
    const index = this.selectedIndex;
    const nextIndex = Math.min(this.frames.length - 1, Math.max(0, index + delta));

    if (index === nextIndex) return;

    const [frame] = this.frames.splice(index, 1);
    this.frames.splice(nextIndex, 0, frame);
  }

  resetOrder(): void {
    this.frames = this.buildFrames(this.selectedAtlas);
    this.selectedFrameName = this.frames[0]?.name ?? '';
  }

  copyUpdatedAtlasToClipboard(): void {
    void navigator.clipboard.writeText(this.updatedAtlasText);
  }

  renameSpritesByCurrentPosition(): void {
    const selectedFrame = this.selectedFrame;
    const groupedFrames = new Map<string, Array<{ frame: OrderedFrame; parts: FrameNameParts }>>();

    for (const frame of this.frames) {
      const parts = this.getFrameNameParts(frame.name);
      if (!parts) continue;

      const groupKey = `${parts.prefix}\u0000${parts.suffix}`;
      const group = groupedFrames.get(groupKey) ?? [];
      group.push({ frame, parts });
      groupedFrames.set(groupKey, group);
    }

    for (const group of groupedFrames.values()) {
      if (group.length < 2) continue;

      const sequence = group
        .map(({ parts }) => Number(parts.numberText))
        .sort((a, b) => a - b);
      const padding = Math.max(...group.map(({ parts }) => parts.numberText.length));

      group.forEach(({ frame, parts }, index) => {
        frame.name = `${parts.prefix}${String(sequence[index]).padStart(padding, '0')}${parts.suffix}`;
      });
    }

    this.selectedFrameName = selectedFrame?.name ?? this.frames[0]?.name ?? '';
  }

  getSpriteStyle(frame: OrderedFrame | undefined): Record<string, string> {
    if (!frame) return {};

    const viewport = this.selectedPreviewFormat;
    const scale = Math.min(viewport.width / frame.w, viewport.height / frame.h);

    return {
      width: `${frame.w}px`,
      height: `${frame.h}px`,
      backgroundImage: `url("${this.selectedAtlasImage}")`,
      backgroundPosition: `-${frame.x}px -${frame.y}px`,
      backgroundRepeat: 'no-repeat',
      //backgroundSize: `${this.selectedAtlasWidth}px ${this.selectedAtlasHeight}px`,
      transform: `translate(-50%, -50%) scale(${scale})`
    };
  }

  getSpriteViewportStyle(): Record<string, string> {
    return {
      width: `${this.selectedPreviewFormat.width}px`,
      height: `${this.selectedPreviewFormat.height}px`
    };
  }

  private getFrameNameParts(fileName: string): FrameNameParts | null {
    const match = fileName.match(/^(.*?)(\d+)(\.[^.]+)?$/);
    if (!match) {
      return null;
    }

    return {
      prefix: match[1],
      numberText: match[2],
      suffix: match[3] ?? ''
    };
  }

  private buildUpdatedAtlas(): HeroGameAtlasOption['atlasData'] | MonsterGameAtlasOption['atlasData'] {
    const frames = this.frames.reduce<Record<string, AtlasFrameEntry>>((updatedFrames, frame) => {
      updatedFrames[frame.name] = frame.entry;
      return updatedFrames;
    }, {});

    return {
      ...this.selectedAtlas.atlasData,
      frames
    };
  }

  private buildFrames(atlas: HeroGameAtlasOption | MonsterGameAtlasOption): OrderedFrame[] {
    return Object.entries(atlas.atlasData.frames as Record<string, AtlasFrameEntry>)
      .map(([name, entry]) => ({
        name,
        entry,
        x: entry.frame.x,
        y: entry.frame.y,
        w: entry.frame.w,
        h: entry.frame.h
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }
}
