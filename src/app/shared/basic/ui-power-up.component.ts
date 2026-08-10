import { ChangeDetectionStrategy, Component, inject, Input } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { UIIconComponent } from "./ui-icon.component";
import { GlobalItem, IconItem } from "../../core/models/game.models";
import { defaultGlobalItem, defaultIcon } from "../../core/models/mock/fantasy/utils-data";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";

@Component({
  selector: "ui-power-up",
  standalone: true,
  imports: [UIIconComponent, CommonModule],
  template: `<div class="power-slot" [ngClass]="styleClass" *ngIf="!value">
        <ui-icon [icon]="item.icon ?? defaultIcon" />
        <div class="stock">
          <small >{{ formattedNumber(item.stock) }}</small>
        </div>
        </div>

        <div class="power-slot" [ngClass]="styleClass" *ngIf="value">
            <strong class="value" >{{ formattedNumber(value) }}</strong>
          </div>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIPowerUpComponent {
  private readonly utils = inject(GameUtilsService);
  @Input() item: GlobalItem = defaultGlobalItem;
  @Input() styleClass =  "";
  @Input() value: string | number | null = null;

  defaultIcon: IconItem = defaultIcon;

  formattedNumber(value: string | number | null | undefined): string {
    return this.utils.formatCompactNumber(value);
  }
}
