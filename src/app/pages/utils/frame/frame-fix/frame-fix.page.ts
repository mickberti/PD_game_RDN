import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';
import { AtlasService } from '../../../../core/services/ui/assets/atlas.service';

interface AtlasFrame {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface AtlasData {
  frames: Record<string, AtlasFrame>;
  meta?: {
    image?: string;
    size?: {
      w?: number;
      h?: number;
    };
  };
}

interface IconFrame {
  name: string;
  fileName: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AtlasOption {
  id: string;
  label: string;
  data: AtlasData;
}

interface PreviewFormatOption {
  id: string;
  label: string;
  width: number;
  height: number;
}

type AtlasViewMode = 'grid' | 'animation';

interface AnimationSortParts {
  prefix: string;
  number: number;
  suffix: string;
}

interface ImportMetaWithGlob extends ImportMeta {
  glob?: <T = unknown>(pattern: string, options: { eager: true }) => Record<string, T>;
}

@Component({
  selector: 'app-frame-fix',
  standalone: true,
  imports: [CommonModule, IonContent, IonToolbar, IonFooter, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
  templateUrl: './frame-fix.page.html',
  styleUrls: ['./frame-fix.page.scss']
})
export class FrameFixPage {
	
  readonly gridColumnsOptions = [2, 3, 4, 5, 6, 8];
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


  atlasOptions = this.atlasService.configuredAtlasHeroOptions;

  selectedAtlasId = this.atlasOptions[0]?.id ?? '';
  gridColumns = 4;
  selectedPreviewFormatId = this.previewFormatOptions[2].id;
  showAtlasImagePreview = false;
  viewMode: AtlasViewMode = 'animation';
  animationFrameIndex = 0;
  icons: IconFrame[] = [];
  frameAdjustStep = 5;
  private dragState: {
    icon: IconFrame;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    scale: number;
  } | null = null;

  constructor(private readonly atlasService: AtlasService){
    this.reloadIcons();
  }

  get selectedAtlas(): AtlasOption {
    const fallback = this.atlasOptions[0];
    if (!fallback) {
      throw new Error('No atlas files found in configured folders.');
    }

    return this.atlasOptions.find((option) => option.id === this.selectedAtlasId) ?? fallback;
  }

  get sourceAtlasText(): string {
    return `export const atlasData = ${JSON.stringify(this.selectedAtlas.data, null, 2)};\n`;
  }
  get metaImage(): string {
    return this.selectedAtlas.data.meta?.image ?? '';
  }
  get metaWidth(): number {
    return this.selectedAtlas.data.meta?.size?.w ?? 0;
  }
  get metaHeight(): number {
    return this.selectedAtlas.data.meta?.size?.h ?? 0;
  }
  get activeAnimationIcon(): IconFrame | null {
    return this.icons[this.animationFrameIndex] ?? null;
  }
  get animationFrameLabel(): string {
    if (!this.icons.length) {
      return '0 / 0';
    }

    return `${this.animationFrameIndex + 1} / ${this.icons.length}`;
  }

  onAtlasChange(atlasId: string) {
    this.selectedAtlasId = atlasId;
    this.reloadIcons();
  }

  onGridColumnsChange(value: number | string) {
    const nextValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    this.gridColumns = Math.min(12, Math.max(1, Math.round(nextValue)));
  }

  onPreviewFormatChange(formatId: string) {
    this.selectedPreviewFormatId = formatId;
  }

  toggleAnimationMode() {
    this.viewMode = this.viewMode === 'animation' ? 'grid' : 'animation';
    this.clampAnimationFrameIndex();
  }

  showPreviousAnimationFrame() {
    if (!this.icons.length) {
      return;
    }

    this.animationFrameIndex = (this.animationFrameIndex - 1 + this.icons.length) % this.icons.length;
  }

  showNextAnimationFrame() {
    if (!this.icons.length) {
      return;
    }

    this.animationFrameIndex = (this.animationFrameIndex + 1) % this.icons.length;
  }

  sortAnimationFrames() {
    this.icons = [...this.icons].sort((a, b) => this.compareAnimationFrameNames(a.fileName, b.fileName));
    this.rebuildAtlasFramesFromIcons();
    this.clampAnimationFrameIndex();
  }
  onMetaImageChange(value: string) {
    this.ensureMeta();
    this.selectedAtlas.data.meta!.image = value;
  }
  onMetaSizeChange(field: 'w' | 'h', value: number | string) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    this.ensureMeta();
    this.selectedAtlas.data.meta!.size![field] = Math.max(1, Math.round(parsed));
  }
  onFrameNameChange(icon: IconFrame, value: string) {
    const normalized = value.trim();
    if (!normalized || normalized === icon.fileName || this.selectedAtlas.data.frames[normalized]) {
      return;
    }
    const currentFrame = this.selectedAtlas.data.frames[icon.fileName];
    delete this.selectedAtlas.data.frames[icon.fileName];
    this.selectedAtlas.data.frames[normalized] = currentFrame;
    icon.fileName = normalized;
    icon.name = normalized.replace('.png', '');
    this.rebuildAtlasFramesFromIcons();
  }


  getFieldValue(icon: IconFrame, field: "x" | "y" | "w" | "h") {
    return icon[field];
  }

  adjustIcon(icon: IconFrame, field: 'x' | 'y' | 'w' | 'h', delta: number) {
    const nextValue = field === 'w' || field === 'h' ? Math.max(1, icon[field] + delta) : Math.max(0, icon[field] + delta);

    icon[field] = nextValue;
    this.updateAtlasFrame(icon);
  }

  onFrameAdjustStepChange(value: number | string): void {
    const step = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(step)) this.frameAdjustStep = Math.max(1, Math.round(step));
  }

  adjustIconByStep(icon: IconFrame, field: 'x' | 'y' | 'w' | 'h', direction: -1 | 1): void {
    this.adjustIcon(icon, field, direction * this.frameAdjustStep);
  }

  onFieldInput(icon: IconFrame, field: 'x' | 'y' | 'w' | 'h', value: number | string) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    icon[field] = this.normalizeFieldValue(field, parsed);
    this.updateAtlasFrame(icon);
  }

  addAtlasElement() {
    const baseName = 'new-element';
    let index = 1;
    let fileName = `${baseName}-${index}`;

    while (this.selectedAtlas.data.frames[fileName]) {
      index += 1;
      fileName = `${baseName}-${index}`;
    }

    const newFrame: AtlasFrame = {
      frame: { x: 0, y: 0, w: 1, h: 1 }
    };

    this.selectedAtlas.data.frames[fileName] = newFrame;

    this.icons.push({
      name: fileName.replace('.png', ''),
      fileName,
      x: newFrame.frame.x,
      y: newFrame.frame.y,
      w: newFrame.frame.w,
      h: newFrame.frame.h
    });
  }

  copyAtlasToClipboard() {
    void navigator.clipboard.writeText(this.sourceAtlasText);
  }

  downloadAtlasFile() {
    const blob = new Blob([this.sourceAtlasText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'atlas.ts';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async saveAtlasFile() {
    const atlasText = this.sourceAtlasText;

    if ('showSaveFilePicker' in window) {
      const win = window as Window & {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<{
          createWritable: () => Promise<{ write: (content: string) => Promise<void>; close: () => Promise<void> }>;
        }>;
      };

      const handle = await win.showSaveFilePicker({
        suggestedName: 'atlas.ts',
        types: [{ description: 'TypeScript', accept: { 'text/typescript': ['.ts'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(atlasText);
      await writable.close();
      return;
    }

    this.downloadAtlasFile();
  }


  toggleAtlasImagePreview() {
    this.showAtlasImagePreview = !this.showAtlasImagePreview;
  }

  copyIconCssToClipboard(icon: IconFrame) {
    const css = this.buildIconCss(icon);
    void navigator.clipboard.writeText(css);
  }

  private buildIconCss(icon: IconFrame) {
    const className = `icon-${icon.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

    return `${className ? `.${className}` : '.icon-name'} {\n`
      + `\twidth: ${icon.w}px;\n`
      + `\theight: ${icon.h}px;\n`
      + `\tbackground-image: url("/${this.selectedAtlas.data.meta!.image}");\n`
      + `\tbackground-position: -${icon.x}px -${icon.y}px;\n`
      + `\tbackground-repeat: no-repeat;\n`
      + `\ttransform: translate(0%, 0%);\n`
      + `\ttransform-origin: top left;\n`
      + `}`;
  }

  onPreviewPointerDown(event: PointerEvent, icon: IconFrame) {
    const viewport = this.selectedPreviewFormat;
    const scale = Math.min(viewport.width / icon.w, viewport.height / icon.h);
    this.dragState = {
      icon,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: icon.x,
      startY: icon.y,
      scale
    };
  }

  onPreviewPointerMove(event: PointerEvent) {
    if (!this.dragState) {
      return;
    }

    const deltaX = (event.clientX - this.dragState.startClientX) / this.dragState.scale;
    const deltaY = (event.clientY - this.dragState.startClientY) / this.dragState.scale;

    this.dragState.icon.x = Math.max(0, Math.round(this.dragState.startX - deltaX));
    this.dragState.icon.y = Math.max(0, Math.round(this.dragState.startY - deltaY));
    this.updateAtlasFrame(this.dragState.icon);
  }

  onPreviewPointerUp() {
    this.dragState = null;
  }

  getIconStyle(icon: IconFrame) {
    const viewport = this.selectedPreviewFormat;
    const scale = Math.min(viewport.width / icon.w, viewport.height / icon.h);

    return {
      width: `${icon.w}px`,
      height: `${icon.h}px`,
      backgroundImage: `url(${this.selectedAtlas.data.meta!.image})`,
      backgroundPosition: `-${icon.x}px -${icon.y}px`,
      backgroundRepeat: 'no-repeat',
      transform: `translate(-50%, -50%) scale(${scale})`
    };
  }

  getIconViewportStyle() {
    return {
      width: `${this.selectedPreviewFormat.width}px`,
      height: `${this.selectedPreviewFormat.height}px`
    };
  }

  get selectedPreviewFormat(): PreviewFormatOption {
    return this.previewFormatOptions.find((option) => option.id === this.selectedPreviewFormatId) ?? this.previewFormatOptions[0];
  }

  getGridStyle() {
    return {
      gridTemplateColumns: `repeat(${this.gridColumns}, minmax(0, 1fr))`
    };
  }

  private reloadIcons() {
    this.icons = Object.entries(this.selectedAtlas.data.frames).map(([name, data]) => {
      const frame = data.frame;

      return {
        name: name.replace('.png', ''),
        fileName: name,
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h
      };
    });
    this.clampAnimationFrameIndex();
  }

  private rebuildAtlasFramesFromIcons() {
    const sortedFrames: Record<string, AtlasFrame> = {};

    for (const icon of this.icons) {
      const currentFrame = this.selectedAtlas.data.frames[icon.fileName];
      if (currentFrame) {
        sortedFrames[icon.fileName] = currentFrame;
      }
    }

    this.selectedAtlas.data.frames = sortedFrames;
  }

  private clampAnimationFrameIndex() {
    this.animationFrameIndex = Math.min(Math.max(this.animationFrameIndex, 0), Math.max(this.icons.length - 1, 0));
  }

  private compareAnimationFrameNames(firstName: string, secondName: string) {
    const firstParts = this.getAnimationSortParts(firstName);
    const secondParts = this.getAnimationSortParts(secondName);

    if (firstParts && secondParts) {
      const prefixCompare = firstParts.prefix.localeCompare(secondParts.prefix, undefined, { sensitivity: 'base' });
      if (prefixCompare !== 0) {
        return prefixCompare;
      }

      if (firstParts.number !== secondParts.number) {
        return firstParts.number - secondParts.number;
      }

      return firstParts.suffix.localeCompare(secondParts.suffix, undefined, { sensitivity: 'base' });
    }

    if (firstParts || secondParts) {
      return firstParts ? -1 : 1;
    }

    return firstName.localeCompare(secondName, undefined, { numeric: true, sensitivity: 'base' });
  }

  private getAnimationSortParts(fileName: string): AnimationSortParts | null {
    const match = fileName.match(/^(.*?)(\d+)(\.[^.]+)?$/);
    if (!match) {
      return null;
    }

    return {
      prefix: match[1],
      number: Number(match[2]),
      suffix: match[3] ?? ''
    };
  }

  private normalizeFieldValue(field: 'x' | 'y' | 'w' | 'h', value: number) {
    const rounded = Math.round(value);

    if (field === 'w' || field === 'h') {
      return Math.max(1, rounded);
    }

    return Math.max(0, rounded);
  }

  private updateAtlasFrame(icon: IconFrame) {
    const frame = this.selectedAtlas.data.frames[icon.fileName].frame;
    frame.x = icon.x;
    frame.y = icon.y;
    frame.w = icon.w;
    frame.h = icon.h;
  }
  private ensureMeta() {
    this.selectedAtlas.data.meta ??= {};
    this.selectedAtlas.data.meta.size ??= { w: 1, h: 1 };
  }

  private toLabel(value: string) {
    return value
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
