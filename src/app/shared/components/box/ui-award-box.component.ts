import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AwardItem, FrameItem } from "../../../core/models/game.models";
import { UIProgressbarComponent } from "../../basic/ui-progress-bar.component";
import { defaultFrame, defaultAward } from "../../../core/models/mock/fantasy/utils-data";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";

@Component({
  selector: "ui-award-box",
  standalone: true,
  imports: [CommonModule, UIProgressbarComponent, UiSpriteComponent],
  template: `  <article class="reward" [ngClass]="[isLocked()]">
  
	<button
	  type="button"
	  class="r-icon sprite"
	  [class.r-icon--collectable]="isCollectable()"
	  [class.fx-golden]="isCollectable()"
	  [disabled]="!isCollectable()"
	  [attr.aria-label]="isCollectable() ? 'Raccogli ' + rewardCoins() + ' monete' : 'Ricompensa non disponibile'"
	  (click)="collect.emit(item)"
	>
	  <ui-sprite [frame]="item.frame ?? defaultFrame" />
	  @if (rewardCoins() > 0) {
	    <span class="r-icon-amount">{{ rewardCoins() }}</span>
	  }
	</button>
	
    <div class="r-desc">
      <div class="r-desc-title">{{ item.title }}</div>
	  <div class="r-desc-subtitle">{{ item.subtitle }}</div>
	  @if(item.progress){
		<ui-progress-bar [progress]="item.progress" />
	  }
    </div>
  </article>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIAwardBoxComponent {
  @Input() item: AwardItem = defaultAward;
  @Input() stat: "received" | "collect" | "locked"  = "collect";
  @Output() collect = new EventEmitter<AwardItem>();
  
  defaultFrame: FrameItem = defaultFrame;

  isCollectable(): boolean {
    return this.item.state === "collect";
  }

  rewardCoins(): number {
    return this.item.reward?.type === "coin" ? (this.item.reward.amount ?? 0) : 0;
  }

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
