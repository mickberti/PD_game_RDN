import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { ComponentMode } from "../../core/models/game.models";
import { UiSpriteComponent } from "./ui-sprite.component";

@Component({
  selector: "ui-panel",
  standalone: true,
  imports: [NgClass, CommonModule, UiSpriteComponent],
  template: `<section class="ui-panel" [ngClass]="[getClasses(), styleClass, stat, variant]">
  	<span class="panel-title" *ngIf="title">{{title}}</span>
	<div class="panel-content">
    <ng-content></ng-content>
	</div>
	<div *ngIf="stat === 'locked'" class="lock">
	<ui-sprite [frame]="{ name:'icon-lock', effect:'none'}" />
	</div>
  </section>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIPanelComponent {
  @Input() variant: ComponentMode  = "none";  
  @Input() stat: "received" | "collect" | "locked"  = "collect";
  @Input() styleClass =  "";
  @Input() title: string | undefined =  "";
  
  getClasses() {
	//elenco completo di classi da applicare al pannello, in base alle proprietà
	//"panel-sm-light"
	//"panel-sm-light-title"
	//"panel-sm-strong"
	//"panel-sm-strong-title"

	//"panel-md-light"
	//"panel-md-light-title"
	//"panel-md-strong"
	//"panel-md-strong-title"

	
	  return "panel" + (this.title ? "-title" : "")+ "-" + this.variant;
  }
}
