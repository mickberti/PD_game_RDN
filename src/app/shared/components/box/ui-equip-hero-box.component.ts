import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { UIProgressStarsComponent } from "../../basic/ui-progress-stars.component";
import { UIPreviewAttributesComponent } from "../ui-preview-attributes.component";
import { EquipItem, FrameItem } from "../../../core/models/game.models";
import { defaultEquip } from "../../../core/models/mock/fantasy/equip-data";

@Component({
  selector: "ui-equip-hero-box",
  standalone: true,
  imports: [CommonModule, UiSpriteComponent, UIProgressStarsComponent, UIPreviewAttributesComponent],
  template: `
  <button class="hero-equip-button" (click)="pressed.emit()">
  <div class="hero-equip-box">
	  <div class="hero-equip-bg">
	  	<ui-sprite [frame]="bgFrame" />
	  </div>
	  <div class="hero-equip-item">
	  	<ui-sprite [frame]="item.frame" />
	  </div>
	  @if (item.level) {
	  <div class="hero-equip-level">
	  	<ui-preview-attributes [level]="item.level" [attack]="item.attack" [defense]="item.defense" [speed]="item.velocita" direction="vertical"/>
	  </div>
	  }
	  <div class="hero-equip-maestria">
	  	<ui-progress-stars [mastery]="item.mastery" direction="vertical"/>
	  </div>
    @if (levelUpAvailable()) {
      <div class="level-up-indicator" aria-label="Upgrade livello equip disponibile">
        <ui-sprite [frame]="{ name: 'icon-arrow-up', effect: 'fx-power-glow' }" />
      </div>
    }
  </div>
  </button>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIEquipHeroBoxComponent {

  @Input() styleClass =  '';
  @Input() bgFrame: FrameItem = { name: 'icon-square-light', effect: 'none' };
  @Input() item: EquipItem = defaultEquip;
  @Output() pressed = new EventEmitter<void>();

  levelUpAvailable(): boolean {
    return this.item.experience.current >= this.item.experience.total;
  }
  
}
export { UIEquipHeroBoxComponent as UIEquipHeroChestComponent };
