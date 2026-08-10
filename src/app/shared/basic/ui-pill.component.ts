import { ChangeDetectionStrategy, Component, inject, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ComponentSize, FrameItem,  } from "../../core/models/game.models";
import { defaultFrame } from "../../core/models/mock/fantasy/utils-data";
import { UiSpriteComponent } from "./ui-sprite.component";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";

@Component({
  selector: "ui-pill",
  standalone: true,
  imports: [ CommonModule, UiSpriteComponent],
  template: `<div  [ngClass]="[styleClass, 'pill-' + size]">
  	<div [ngClass]="'pill-frame-' + size">
		<ui-sprite [frame]="frame" />
	</div>
	<span [ngClass]="'pill-value-' + size" *ngIf="hasValue()">{{ formattedValue() }}</span>
  </div>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIPillComponent {
  private readonly utils = inject(GameUtilsService);

  @Input() frame: FrameItem = defaultFrame;
  @Input() size: ComponentSize = 'sm';
  @Input() value: string | number | null | undefined = "";
  @Input() styleClass: string = "";

  hasValue(): boolean {
    return this.value !== undefined && this.value !== null && this.value !== '';
  }

  formattedValue(): string {
    return this.utils.formatCompactNumber(this.value);
  }
}
