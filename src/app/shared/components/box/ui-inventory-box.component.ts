import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EquipItem, HeroItem, InventoryItem } from "../../../core/models/game.models";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { defaulthero } from "../../../core/models/mock/fantasy/hero-data";
import { UIProgressStarsComponent } from "../../basic/ui-progress-stars.component";
import { UIPreviewAttributesComponent } from "../ui-preview-attributes.component";
import { GameUtilsService } from "../../../core/services/ui/formatting/game-utils.service";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";

@Component({
  selector: "ui-inventory-box",
  standalone: true,
  imports: [CommonModule, UiSpriteComponent, UIProgressStarsComponent, UIPreviewAttributesComponent],
  template: `
    <article
      class="inventory-card"
      [class.inventory-card-clickable]="cliccable || add"
      [class.inventory-card-add]="add"
      [class.delete-mode]="isDeleteMode && isDeletable"
      [class.locked]="isBrokenEquip(item)"
      (click)="pressed.emit(item)"
    >
      <div class="inventory-card-bg">
        <ui-sprite
          [frame]="{ name: cardFrame, effect: 'none' }"
          fit="stretch"
          anchor="center"
        />
      </div>

      @if (isDeleteMode && isDeletable && !add) {
        <button type="button" class="delete-inventory-action" (click)="emitDelete($event)">Elimina</button>
      }

      @if (add) {
        <div class="inventory-card-plus " aria-hidden="true">+</div>
        <div class="inventory-card-add-label">Shop</div>
      } @else {
        @if (itemStock(item) !== null) {
          <span class="inventory-card-stock">
            x{{ formattedNumber(itemStock(item)) }}
          </span>
        }

        <div class="inventory-card-icon">
          <ui-sprite
            [frame]="item.frame"
            fit="contain"
            anchor="center"
          />
        </div>
		

		@if (levelAvailable(item)) {
			<div class="hero-equip-level" >
				<ui-preview-attributes [level]="$any(item).level ?? 0" [attack]="$any(item).attack ?? 0" [defense]="$any(item).defense ?? 0" [speed]="$any(item).velocita ?? 0" direction="vertical"/>
			</div>
		}
		<div class="hero-equip-maestria">
			<ui-progress-stars [mastery]="item.mastery" direction="vertical"/>
		</div>
        @if (levelUpAvailable(item)) {
          <div class="level-up-indicator" aria-label="Upgrade livello disponibile">
            <ui-sprite [frame]="{ name: 'icon-arrow-up', effect: 'fx-power-glow' }" />
          </div>
        }
      }
    </article>
    @if (isBrokenEquip(item)) {
      <div class="lock" (click)="pressed.emit(item)">
        <ui-sprite [frame]="{ name:'icon-broken-sword-shield', effect:'none'}" />
      </div>
    }
  `,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIInventoryBoxComponent {
	private readonly utils = inject(GameUtilsService);
	readonly logger = inject(LoggerService);
	@Input() item: InventoryItem = defaulthero;
  @Input() styleClass =  "";
  @Input() cliccable:boolean =  false;
  @Input() add:boolean =  false;
  @Input() cardFrame:string =  "icon-hex-light";
  @Input() isDeleteMode = false;
  @Input() isDeletable = false;
  @Output() pressed = new EventEmitter<InventoryItem>();
  @Output() delete = new EventEmitter<void>();
  

	emitDelete(event: Event): void {
	  event.stopPropagation();
	  this.delete.emit();
	}
	

	levelAvailable(item: InventoryItem): item is HeroItem | EquipItem {
		this.logger.logDebug('[UIInventoryBoxComponent] levelAvailable', item);
	  return this.isHeroItem(item) || this.isEquipItem(item);
	}

	levelUpAvailable(item: InventoryItem): boolean {
	  const experience = 'experience' in item ? item.experience : null;
	  return !!experience && experience.current >= experience.total;
	}

	isBrokenEquip(item: InventoryItem): boolean {
	  return this.isEquipItem(item) && !!item.duration && item.duration.current === 0;
	}

	private isHeroItem(item: InventoryItem): item is HeroItem {
	  return item.itemType === "hero";
	}

	private isEquipItem(item: InventoryItem): item is EquipItem {
	  return item.itemType === "equip";
	}

	itemStock(item: InventoryItem): number | null {
	  return 'stock' in item && typeof item.stock === 'number'
	    ? item.stock
	    : null;
	}


  formattedNumber(value: number | null): string {
    return this.utils.formatCompactNumber(value);
  }

	
}
export { UIInventoryBoxComponent as UIInventoryChestComponent };
