import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { ComponentMode, FrameItem, Progress } from "../../../core/models/game.models";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { UIProgressbarComponent } from "../../basic/ui-progress-bar.component";
import { defaultFrame } from "../../../core/models/mock/fantasy/utils-data";

@Component({
  selector: "ui-attribute-box",
  standalone: true,
  imports: [NgClass, CommonModule, UiSpriteComponent, UIProgressbarComponent],
  template: `
  <div>
	  
	  <div class="ui-attributebox" [ngClass]="direction">
		  <div class="attributebox-icon">
			  <ui-sprite *ngIf="frame" [frame]="frame" />
		  </div>
		  <div class="attributebox-descr">
		  	<span *ngIf="title" class="attributebox-title" [ngClass]="variant">{{title}}</span>
	      	<ui-progress-bar [direction]="direction" [progress]="progress"/>
		  </div>
	    </div>
	</div>
	`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIAttributeBoxComponent {
  @Input() variant: ComponentMode  = "none"; 
  @Input() direction: "vertical" | "horizontal" = "horizontal";
  @Input() styleClass =  "";
  @Input() frame: FrameItem = defaultFrame ;
  @Input() title =  "";
  @Input() progress: Progress =   {
  	descr: 'descr', 
  	current: 50, 
  	total: 100 
  };

}
export { UIAttributeBoxComponent as UIAttributeChestComponent };
