import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from "@angular/core";
import {  UIIconComponent } from "../../basic/ui-icon.component";
import { IconItem } from "../../../core/models/game.models";

@Component({
  selector: "ui-setting-box",
  standalone: true,
  imports: [CommonModule, UIIconComponent],
  template: `
    <article class="settings-row">
      <ui-icon *ngIf="icon" [icon]="icon"/>

      <div class="s-desc">
        <div class="s-desc-title">{{ title }}</div>
        <div *ngIf="subtitle" class="s-desc-subtitle">{{ subtitle }}</div>
      </div>

      <button class="toggle" [class.on]="isOn()" (click)="clickToggle()"><span></span></button>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UISettingBoxComponent {
  @Input() icon: IconItem = { effect: "none", type: "coin", size: "sm" };
  @Input() title = "--";
  @Input() subtitle = "";
  @Input() checked: boolean | null = null;
  @Output() toggle = new EventEmitter<void>();

  readonly status = signal(true);

  isOn(): boolean {
    return this.checked ?? this.status();
  }

  clickToggle(): void {
    if (this.checked === null) {
      this.status.update((value) => !value);
    }

    this.toggle.emit();
  }
}
export { UISettingBoxComponent as UISettingChestComponent };
