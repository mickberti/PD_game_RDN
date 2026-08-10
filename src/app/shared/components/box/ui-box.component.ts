import { ChangeDetectionStrategy, Component, inject, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FrameItem, GlobalItem } from "../../../core/models/game.models";
import { UIPillComponent } from "../../basic/ui-pill.component";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { defaultFrame, defaultShop } from "../../../core/models/mock/fantasy/utils-data";
import { GameUtilsService } from "../../../core/services/ui/formatting/game-utils.service";

@Component({
  selector: "ui-box",
  standalone: true,
  imports: [ CommonModule, UIPillComponent, UiSpriteComponent],
  template: `<div class="ui-box" [ngClass]="styleClass" *ngIf="!value">

          <div class="sprite">
            <ui-sprite [frame]="item.framePanel ?? defaultFrame" />
          </div>

          <div class="stock">
            <span >{{ formattedNumber(item.stock) }}</span>
          </div>

          <div class="frame">
            <ui-sprite [frame]="item.frame ?? defaultFrame" />
          </div>

          <div class="price">
            <ui-pill *ngIf="item.price?.frame" [frame]="item.price?.frame ?? defaultFrame" [value]="item.price?.amount" />
          </div>

        </div>

        <div class="box-slot" [ngClass]="styleClass" *ngIf="value">
            <span class="value" >{{ formattedNumber(value) }}</span>
          </div>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIBoxComponent {
  private readonly utils = inject(GameUtilsService);
  @Input() item: GlobalItem = defaultShop;
  @Input() styleClass =  "";
  @Input() value: string | number | null = null;

  defaultFrame: FrameItem = defaultFrame;

  formattedNumber(value: string | number | null | undefined): string {
    return this.utils.formatCompactNumber(value);
  }

}
export { UIBoxComponent as UIChestComponent };
