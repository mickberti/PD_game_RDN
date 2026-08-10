import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FrameItem, GlobalItem, IconItem } from "../../../core/models/game.models";
import { UIButtonComponent } from "../../basic/ui-button.component";
import { UIPillComponent } from "../../basic/ui-pill.component";
import { defaultFrame, defaultGlobalItem } from "../../../core/models/mock/fantasy/utils-data";

@Component({
  selector: "ui-power-up-box",
  standalone: true,
  imports: [ CommonModule, UIButtonComponent,  UIPillComponent],
  template: `  <article class="power-box" >
  
	<ui-pill *ngIf="item.icon" [frame]="item.price?.frame ?? defaultFrame" size="sm" styleClass="p-icon" />
	
	<div class="p-desc">
	  <div class="p-desc-title">{{ item.title }}</div>
	  <div class="p-desc-subtitle">{{ item.subtitle }}</div>
	  <ui-pill *ngIf="item.price?.frame" [frame]="item.price?.frame ?? defaultFrame" size="sm" [value]="item.price?.amount" size="xs" styleClass="" />
    </div>
	
    <ui-button variant="primary" [disabled]="item.state !== 'collect'">{{
      item.state
    }}</ui-button>
	
  </article>
  `,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIPowerUpBoxComponent {
	@Input() item: GlobalItem = defaultGlobalItem;
	
	defaultFrame: FrameItem = defaultFrame;
	
	defaultIcon: IconItem = { effect: "none", type: "coin", size: "sm" };

}
export { UIPowerUpBoxComponent as UIPowerUpChestComponent };
