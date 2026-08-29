import { ChangeDetectionStrategy, Component, inject, Input } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { UiSpriteComponent } from "./ui-sprite.component";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";

@Component({
  selector: "ui-progress-stars",
  standalone: true,
  imports: [NgClass, CommonModule, UiSpriteComponent],
  template: `

	  <div class="ui-progressbar" [ngClass]="direction">
	    <div class="maestria">
	      @for (maestry of calculateStars(); track maestry) {
	        <div class="maestria-sprite">
	          <ui-sprite [frame]="{ name: maestry, effect: 'none' }" />
	        </div>
	      }
	    </div>
	  </div>

	`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIProgressStarsComponent {
  @Input() variant: "primary" | "secondary" | "complementary" | "light" | "dark"  = "primary";
  @Input() direction: "vertical" | "horizontal" = "horizontal";
  @Input() level: number = 0;
  @Input() mastery: number = 0;
  /** Level of an RDN game mode; its stars follow the board gem progression. */
  @Input() gameModeLevel: number = 0;
  readonly logger = inject(LoggerService);

  private utils = inject(GameUtilsService);

  calculateStars(): string[]{
	if(this.gameModeLevel > 0){
		return this.utils.calculateModeDifficultyStars(this.gameModeLevel);
	}else if(this.level > 0){
		const stars =  this.utils.calculateLevelStars(this.level);
		return stars;	
	}else if(this.mastery > 0){
		const stars =  this.utils.calculateMasteryStars(this.mastery);
		this.logger.logDebug("calculateStars", stars);
		return stars;
	  }else{
		return[];
	  }
	}
}
