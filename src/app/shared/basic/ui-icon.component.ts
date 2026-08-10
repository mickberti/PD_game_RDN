import { NgClass } from "@angular/common";
import { Component, Input } from "@angular/core";
import { IconItem } from "../../core/models/game.models";
import { defaultIcon } from "../../core/models/mock/fantasy/utils-data";


@Component({
	selector: "ui-icon",
	standalone: true,
	imports: [NgClass],
	template: `<div class="icon-wrapper" [ngClass]="['icon-wrapper-' + icon.size, icon.effect !== 'none' ? icon.effect : '']"><span
    class="icon"
    [ngClass]="[
      'icon-' + icon.type,
	  'icon-' + icon.size,
       styleClass,
	   
    ]"
  ></span></div>`,
})
export class UIIconComponent {
	@Input({ required: true }) icon: IconItem = defaultIcon;
	@Input() styleClass: string = "";
}
