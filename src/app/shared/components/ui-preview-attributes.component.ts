import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FrameItem } from '../../core/models/game.models';
import { UiSpriteComponent } from '../basic/ui-sprite.component';

export type UIPreviewAttributesDirection = 'horizontal' | 'vertical';
export type UIPreviewAttributeDisplayMode = 'frame' | 'label';
export type UIPreviewAttributeKey = 'level' | 'attack' | 'defense' | 'speed';

interface UIPreviewAttributeItem {
  key: UIPreviewAttributeKey;
  label: string;
  frame: FrameItem;
  value: number;
  compareValue?: number | null;
}

@Component({
  selector: 'ui-preview-attributes',
  standalone: true,
  imports: [CommonModule, UiSpriteComponent],
  template: `
    <section
      class="preview-attributes"
      [class.preview-attributes-horizontal]="direction === 'horizontal'"
      [class.preview-attributes-vertical]="direction === 'vertical'"
      [attr.aria-label]="ariaLabel"
    >
      @for (attribute of attributes; track attribute.key) {
        <div class="preview-attributes-container">
          @if (displayMode === 'frame') {
            <ui-sprite class="preview-attribute-frame" [frame]="attribute.frame" [showScale]="false" [allowUpscale]="true" [attr.aria-label]="attribute.label" />
          } @else {
            <strong>{{ attribute.label }}</strong>
          }
          {{ attribute.value | number:'1.0-0' }}
          @if (delta(attribute) !== null) {
            <em class="preview-attribute-delta" [ngClass]="deltaClass(attribute)">{{ deltaLabel(attribute) }}</em>
          }
        </div>
      }
    </section>
  `,
})
export class UIPreviewAttributesComponent {
  @Input() level = 0;
  @Input() attack = 0;
  @Input() defense = 0;
  @Input() speed = 0;
  @Input() compareLevel?: number | null;
  @Input() compareAttack?: number | null;
  @Input() compareDefense?: number | null;
  @Input() compareSpeed?: number | null;
  @Input() direction: UIPreviewAttributesDirection = 'horizontal';
  @Input() displayMode: UIPreviewAttributeDisplayMode = 'frame';
  @Input() ariaLabel = 'Attributi anteprima';

  get attributes(): UIPreviewAttributeItem[] {
    return [
      { key: 'level', label: 'LV', frame: { name: 'crown', effect: 'none' }, value: this.level, compareValue: this.compareLevel },
      { key: 'attack', label: 'ATK', frame: { name: 'sword', effect: 'none' }, value: this.attack, compareValue: this.compareAttack },
      { key: 'defense', label: 'DEF', frame: { name: 'shield', effect: 'none' }, value: this.defense, compareValue: this.compareDefense },
      { key: 'speed', label: 'VEL', frame: { name: 'map', effect: 'none' }, value: this.speed, compareValue: this.compareSpeed },
    ];
  }

  delta(attribute: UIPreviewAttributeItem): number | null {
    if (attribute.compareValue === undefined || attribute.compareValue === null) return null;
    return attribute.value - attribute.compareValue;
  }

  deltaLabel(attribute: UIPreviewAttributeItem): string {
    const value = this.delta(attribute) ?? 0;
    if (value === 0) return '±0';
    return `${value > 0 ? '+' : ''}${value}`;
  }

  deltaClass(attribute: UIPreviewAttributeItem): string {
    const value = this.delta(attribute) ?? 0;
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  }
}
