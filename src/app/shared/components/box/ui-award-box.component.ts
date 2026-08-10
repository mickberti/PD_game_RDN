import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AwardItem, FrameItem } from "../../../core/models/game.models";
import { UIButtonComponent } from "../../basic/ui-button.component";
import { UIProgressbarComponent } from "../../basic/ui-progress-bar.component";
import { defaultFrame, defaultAward } from "../../../core/models/mock/fantasy/utils-data";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";

@Component({
  selector: "ui-award-box",
  standalone: true,
  imports: [CommonModule, UIButtonComponent,  UIProgressbarComponent, UiSpriteComponent],
  template: `  <article class="reward" [ngClass]="[isLocked()]">
  
	<div class="r-icon sprite">
	  <ui-sprite [frame]="item.frame ?? defaultFrame" />
	</div>
	
    <div class="r-desc">
      <div class="r-desc-title">{{ item.title }}</div>
	  <div class="r-desc-subtitle">{{ item.subtitle }}</div>
	  @if(item.progress){
		<ui-progress-bar [progress]="item.progress" />
	  }
    </div>
	
	<div class="r-desc-action">
	    <ui-button variant="secondary" particleMode="part3" [disabled]="item.state !== 'collect'" (pressed)="collect.emit(item)">{{
	      item.state === "received"
	        ? "Received"
	        : item.state === "collect"
	          ? "Collect"
	          : "Locked"
	    }}</ui-button>
	</div>
	<div *ngIf="'locked' === isLocked()" class="lock">
	<ui-sprite [frame]="{ name:'icon-lock', effect:'none'}" />
	</div>
  </article>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIAwardBoxComponent {
  @Input() item: AwardItem = defaultAward;
  @Input() stat: "received" | "collect" | "locked"  = "collect";
  @Output() collect = new EventEmitter<AwardItem>();
  
  defaultFrame: FrameItem = defaultFrame;

  isLocked(){
	if(this.stat === 'locked' || !this.item.progress){
		return this.stat;
	}
	if(this.item.progress?.current < this.item.progress?.total){
		return 'locked';
	}

	return 'collect';
  }
}
export { UIAwardBoxComponent as UIAwardChestComponent };
