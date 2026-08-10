import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { UiSpriteComponent } from './ui-sprite.component';
import { FrameItem, UiTabItem } from '../../core/models/game.models';



@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [NgFor, UiSpriteComponent],
  template: `
    <div class="ui-tabs" role="tablist">
      <button
        *ngFor="let tab of tabs"
        type="button"
        class="ui-tab"
        role="tab"
        [attr.aria-selected]="selected === tab.id"
        [class.active]="selected === tab.id"
        (click)="select(tab.id)"
      >
        <div class="sprite">
          <ui-sprite [frame]="selected === tab.id ? activeFrame : frame" fit="stretch" anchor="center" />
        </div>
        <span class="label">{{ tab.title }}</span>
      </button>
    </div>
  `,
  styles: [`

  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiTabsComponent {
  @Input() tabs: UiTabItem[] = [];
  @Input() selected = '';
  @Input() frame: FrameItem = { name: 'bar-corner-dark', effect: 'none' }; //'top-arch-dark';
  @Input() activeFrame: FrameItem = { name: 'bar-corner-blue', effect: 'none' }; //top-arch-blue';

  @Output() readonly selectedChange = new EventEmitter<string>();

  select(id: string): void {
    if (id === this.selected) {
      return;
    }
    this.selectedChange.emit(id);
  }
}
