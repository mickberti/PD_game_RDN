import { ChangeDetectionStrategy, Component, inject, Input } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { Progress } from "../../core/models/game.models";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";

@Component({
  selector: "ui-progress-bar",
  standalone: true,
  imports: [NgClass, CommonModule],
  template: `

	  <div class="ui-progressbar" [ngClass]="[direction, getLabelDisplay()]">
	      <div class="progressbar" [ngClass]="variant"><span [style.width.%]="(progress.current/progress.total)*100"></span></div>
	      <span *ngIf="labelDisplay !== 'none'" class="progressbar-progress" [ngClass]="variant">{{ formattedProgressValue(progress.current)}}/{{formattedProgressValue(progress.total)}}</span>
	  </div>

	`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIProgressbarComponent {
  private readonly utils = inject(GameUtilsService);

  @Input() variant: "primary" | "secondary" | "complementary" | "light" | "dark"  = "primary";
  @Input() direction: "vertical" | "horizontal" = "horizontal";
  @Input() labelDisplay : 'none' | 'minimal' | 'complete' = 'complete';
  @Input() progress: Progress =   {
  	descr: 'descr', 
  	current: 50, 
  	total: 100 
  };

  getLabelDisplay(){
  return 'label-'+this.labelDisplay;
  }

  formattedProgressValue(value: number): string {
    return this.utils.formatCompactNumber(value);
  }
  
}
