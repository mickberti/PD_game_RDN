import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ScoreItem } from "../../../core/models/game.models";
import { UIIconComponent } from "../../basic/ui-icon.component";
@Component({
  selector: "ui-ranking-box",
  standalone: true,
  imports: [CommonModule, UIIconComponent],
  template: `  
  <article class="ranking-box" >
  
  	<div class="rk-rank">{{ item.rank }}</div>
  	<ui-icon *ngIf="item.icon" [icon]="item.icon" styleClass="rk-icon"/>
	
    <div class="rk-desc">
      <div class="rk-desc-title">{{ item.title }}</div>
	  <div class="rk-desc-subtitle">{{ item.subtitle }}</div>
    </div>
	
  </article>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIRankingBoxComponent {
  @Input() item: ScoreItem = {
	   rank: 1,
	   icon: { effect: "none", type: "kart", size: "sm" },
	   title: "",
	   subtitle: "",
	   color: "yellow"};

}
export { UIRankingBoxComponent as UIRankingChestComponent };
