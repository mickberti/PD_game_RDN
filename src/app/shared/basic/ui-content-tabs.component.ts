import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { UiSpriteComponent } from './ui-sprite.component';
import { FrameItem, UiTabItem } from '../../core/models/game.models';
import { defaultFrame } from '../../core/models/mock/fantasy/utils-data';



@Component({
  selector: 'ui-content-tabs',
  standalone: true,
  imports: [NgFor, UiSpriteComponent,CommonModule],
  template: `
    <div class="ui-content-tabs" [ngClass]="[direction, styleClass]" role="tablist">
      <button
        *ngFor="let tab of tabs"
        type="button"
        class="ui-content-tab"
		[ngClass]="tabSize(tab)"
        role="tab"
        [attr.aria-selected]="selected === tab.id"
        [class.active]="selected === tab.id"
        (click)="select(tab.id)"
      >
        <div class="sprite">
          <ui-sprite [frame]="selected === tab.id ? activeFrame : frame" fit="stretch" anchor="center" />
        </div>
		
		<div class="frame">
		  <ui-sprite [frame]="tab.frame ?? defaultFrame" />
		</div>
		
      </button>
    </div>
  `,
  styles: [`

  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiContentTabsComponent {
  @Input() tabs: UiTabItem[] = [];
  @Input() selected = '';
  @Input() frame: FrameItem = {name:'icon-square-dark', effect:'none'}; //'top-arch-dark';
  @Input() activeFrame: FrameItem = {name:'icon-square-blue', effect:'none'}; //top-arch-blue';
  @Input() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Input() styleClass =  "";
  @Output() readonly selectedChange = new EventEmitter<string>();

  defaultFrame: FrameItem = defaultFrame;
  
  select(id: string): void {
    if (id === this.selected) {
      return;
    }
    this.selectedChange.emit(id);
  }
  
  tabSize(tab: UiTabItem): string{
  return 'ui-content-tab-' + (tab.size ? tab.size : 'md');
  }
}
