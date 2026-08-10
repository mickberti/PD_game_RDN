import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { NgFor } from "@angular/common";

import { FrameItem, UiTabItem } from "../../core/models/game.models";
import { UIButtonSpriteComponent } from "./ui-button-sprite.component";

@Component({
  selector: "ui-radial-tabs",
  standalone: true,
  imports: [NgFor, UIButtonSpriteComponent],
  template: `
    <div class="ui-radial-tabs" role="tablist">
      <div class="ui-radial-tabs-row" *ngFor="let row of tabRows(); trackBy: trackByRow">
        <div class="ui-radial-tab-wrap" *ngFor="let tab of row; trackBy: trackByTabId">
          <ui-button-sprite
            role="tab"
            [attr.aria-selected]="selected === tab.id"
            [attr.aria-label]="tab.title"
            [title]="tab.title"
            [frame]="tab.frame || fallbackFrame"
            [size]="tab.size || 'lg'"
            [active]="selected === tab.id"
            (pressed)="select(tab.id)"
          />
          <span class="ui-radial-tab-label">{{ tab.title }}</span>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiRadialTabsComponent {
  @Input() tabs: UiTabItem[] = [];
  @Input() selected = "";
  @Input() fallbackFrame: FrameItem = { name: "inventory", effect: "none" };
  @Output() readonly selectedChange = new EventEmitter<string>();

  tabRows(): UiTabItem[][] {
    const rows: UiTabItem[][] = [];
    const rowPattern = [2, 3, 2];
    let tabIndex = 0;
    let patternIndex = 0;

    while (tabIndex < this.tabs.length) {
      const rowSize = rowPattern[patternIndex % rowPattern.length];
      rows.push(this.tabs.slice(tabIndex, tabIndex + rowSize));
      tabIndex += rowSize;
      patternIndex += 1;
    }

    return rows;
  }

  select(id: string): void {
    if (id === this.selected) {
      return;
    }

    this.selectedChange.emit(id);
  }

  trackByRow(index: number): number {
    return index;
  }

  trackByTabId(_index: number, tab: UiTabItem): string {
    return tab.id;
  }
}
