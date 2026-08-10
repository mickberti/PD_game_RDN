import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Progress } from "../../core/models/game.models";
import { UIProgressbarComponent } from "../basic/ui-progress-bar.component";

export type UIProgressStatKind = "heal" | "mana" | "experience" | "duration" | "fatigue";

export interface UIProgressStatItem {
  label: string;
  progress: Progress;
  kind: UIProgressStatKind;
}

@Component({
  selector: "ui-progress-stats",
  standalone: true,
  imports: [CommonModule, UIProgressbarComponent],
  template: `
    <section class="ui-progress-stats" [ngClass]="[styleClass, getLabelDisplay()]" [attr.aria-label]="ariaLabel">
      <div
        *ngFor="let item of items"
        class="ui-progress-stats-row hero-preview-progress-row"
        [ngClass]="['hero-preview-progress-' + item.kind, getLabelDisplay()]"
      >
        <span *ngIf="labelDisplay !== 'none'" class="ui-progress-stats-label hero-preview-progress-label">{{ item.label }}</span>
        <ui-progress-bar [progress]="item.progress" [labelDisplay]="labelDisplay"/>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIProgressStatsComponent {
  @Input() items: UIProgressStatItem[] = [];
  @Input() labelDisplay : 'none' | 'minimal' | 'complete' = 'complete';
  @Input() ariaLabel = "Progressi";
  @Input() styleClass = "";
  
  getLabelDisplay(){
	return 'label-'+this.labelDisplay;
  }
}
