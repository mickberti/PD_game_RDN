import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { UIButtonComponent } from "../../basic/ui-button.component";
import { UIIconComponent } from "../../basic/ui-icon.component";
import { ComponentMode, IconItem } from "../../../core/models/game.models";
import { UIPanelComponent } from "../../basic/ui-panel.component";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";

@Component({
  selector: "ui-prestige-box",
  standalone: true,
  imports: [CommonModule, UIIconComponent, UIButtonComponent, UIPanelComponent, UiSpriteComponent],
  template: `
  <ui-panel variant="light">
  <div class="prestige-box">
	<div class="prestige-content">
	  	<ui-icon [icon]="icon" />
	  	<div class="prestige-desc">
	  	  <div class="prestige-title">{{descrTitle}}</div>
	  	  <div class="prestige-subtitle">{{descrSubtitle}}</div>
	  	</div>
	</div>
  	<ui-button [variant]="variant">{{buttonLabel}}</ui-button>
	<div *ngIf="stat === 'locked'" class="lock">
	<ui-sprite [frame]="{ name:'icon-lock', effect:'none'}" />
	</div>
	</div>
	</ui-panel>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIPrestigeBoxComponent {
  @Input() variant: ComponentMode  = "primary";
  @Input() variantButton: ComponentMode  = "primary";
    @Input() stat: "received" | "collect" | "locked"  = "collect";
  @Input() styleClass =  "";
  @Input() icon: IconItem = {
    	effect: "fx-fire",
    	type: "trophy",
    	size: "md",
    };
  @Input() title: string | undefined =  "";
  @Input() descrTitle: string | undefined =  "";
  @Input() descrSubtitle: string | undefined =  "";
  @Input() buttonLabel: string | undefined =  "";
  

}
export { UIPrestigeBoxComponent as UIPrestigeChestComponent };
