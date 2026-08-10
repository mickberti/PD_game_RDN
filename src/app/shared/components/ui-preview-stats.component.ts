import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FrameItem } from '../../core/models/game.models';
import { UiSpriteComponent } from '../basic/ui-sprite.component';
import { UIPreviewAttributeDisplayMode, UIPreviewAttributesDirection } from './ui-preview-attributes.component';

export interface UIPreviewStatItem {
  label: string;
  frame?: FrameItem;
  value: string | number;
  compareValue?: string | number | null;
  delta?: number | null;
}

@Component({
  selector: 'ui-preview-stats',
  standalone: true,
  imports: [CommonModule, UiSpriteComponent],
  template: `
    <section
      class="preview-attributes"
      [class.preview-attributes-horizontal]="direction === 'horizontal'"
      [class.preview-attributes-vertical]="direction === 'vertical'"
      [attr.aria-label]="ariaLabel"
    >
      @for (item of items; track item.label) {
        <div class="preview-attributes-container">
          @if (displayMode === 'frame' && item.frame) {
            <ui-sprite class="preview-attribute-frame" [frame]="item.frame" [showScale]="false" [allowUpscale]="true" [attr.aria-label]="item.label" />
          } @else {
            <strong>{{ item.label }}</strong>
          }
          {{ item.value }}
          @if (delta(item) !== null) {
            <em class="preview-attribute-delta" [ngClass]="deltaClass(item)">{{ deltaLabel(item) }}</em>
          }
        </div>
      }
    </section>
  `,
})
export class UIPreviewStatsComponent {
  @Input() items: UIPreviewStatItem[] = [];
  @Input() direction: UIPreviewAttributesDirection = 'horizontal';
  @Input() displayMode: UIPreviewAttributeDisplayMode = 'frame';
  @Input() ariaLabel = 'Statistiche anteprima';

  delta(item: UIPreviewStatItem): number | null {
    if (item.delta !== undefined && item.delta !== null) return item.delta;
    if (typeof item.value !== 'number' || typeof item.compareValue !== 'number') return null;
    return item.value - item.compareValue;
  }

  deltaLabel(item: UIPreviewStatItem): string {
    const value = this.delta(item) ?? 0;
    if (value === 0) return '±0';
    return `${value > 0 ? '+' : ''}${value}`;
  }

  deltaClass(item: UIPreviewStatItem): string {
    const value = this.delta(item) ?? 0;
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  }
}
