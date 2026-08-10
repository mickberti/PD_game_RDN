import { ShopItem } from "../../../core/models/shop.models";
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ComponentEffect, EquipItem, FrameItem, HeroItem, IconItem } from "../../../core/models/game.models";
import { UIPillComponent } from "../../basic/ui-pill.component";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { defaultFrame, defaultIcon, defaultShop } from "../../../core/models/mock/fantasy/utils-data";
import { UIProgressStarsComponent } from "../../basic/ui-progress-stars.component";
import { UIPreviewAttributesComponent } from "../ui-preview-attributes.component";
import { LoggerService } from "../../../core/services/infrastructure/logging/logger.service";

@Component({
  selector: "ui-shop-box",
  standalone: true,
  imports: [CommonModule, UIPillComponent, UiSpriteComponent, UIProgressStarsComponent, UIPreviewAttributesComponent],
  template: `<div class="ui-shop-box-wrapper"><div class="ui-shop-box" [ngClass]="[styleClass, isLocked()]" (click)="emitInfo()">

          <div class="sprite">
            <ui-sprite [frame]="item.framePanel" />
          </div>

          <div class="action">

            <div class="stock">
              <span >{{ formattedNumber(item.stock) }}</span>
            </div>

          </div>

          <div class="frame">
            <ui-sprite [frame]="item.item.frame" [badge]="quantityBadge()" />
          </div>

          @if (levelAvailable(item.item)) {
            <div class="equip-box-level">
              <ui-preview-attributes [level]="$any(item.item).level ?? 0" [attack]="$any(item.item).attack ?? 0" [defense]="$any(item.item).defense ?? 0" [speed]="$any(item.item).velocita ?? 0" direction="vertical"/>
            </div>
		      }
        <div class="equip-box-maestria">
          <ui-progress-stars [mastery]="item.item.mastery" direction="vertical"/>
        </div>
          
          @if (levelUpAvailable()) {
            <div class="level-up-indicator" aria-label="Upgrade livello disponibile">
              <ui-sprite [frame]="{ name: 'icon-arrow-up', effect: 'fx-new' }" />
            </div>
          }
		  
          <div class="price">
            <ui-pill *ngIf="item.price?.frame" [frame]="item.price?.frame ?? defaultFrame" size="sm" [value]="item.price?.amount" />
          </div>

          <div class="item-status">
              <button class="box-action" >
                <ui-sprite [frame]="{name: inventoryFrameName(), effect:inventoryFrameEffect()}"/>
              </button>
          </div>
		  </div>

      <div *ngIf="'locked' === isLocked()" class="lock">
		    <ui-sprite [frame]="{ name:'icon-lock', effect:'none'}" />
		  </div>
    </div>
`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIShopBoxComponent {
  @Input() item: ShopItem = defaultShop;
  @Input() styleClass =  "";
  @Input() canPurchase: boolean | null = null;
  @Input() inventoryPresent: boolean | null = null;
  @Output() info = new EventEmitter<void>();
  @Output() buy = new EventEmitter<ShopItem>();
  @Output() inventory = new EventEmitter<ShopItem>();

  private readonly logger = inject(LoggerService);
  
  defaultFrame: FrameItem = defaultFrame;
  defaultIcon: IconItem = defaultIcon;

  emitInfo() {
    this.info.emit();
  }

  emitBuy(item: ShopItem) {
    if (!this.canBuy()) return;
    this.buy.emit(item);
  }

  emitInventory(item: ShopItem) {
    this.inventory.emit(item);
  }

  isInventoryPresent(): boolean {
    return this.inventoryPresent ?? false;
  }

  inventoryFrameName(): string {
    return this.isInventoryPresent() ? "inventory" : "scroll";
  }
  
  inventoryFrameEffect(): ComponentEffect {
    return this.isInventoryPresent() ? "none" : "fx-new";
  }

  quantityBadge(): string {
    return `x${this.formattedNumber(this.item.quantity ?? 1)}`;
  }

  formattedNumber(value: string | number | null | undefined): string {
    const normalized = typeof value === 'string' ? Number(value) : value;
    if (typeof normalized !== 'number' || !Number.isFinite(normalized)) {
      return String(value ?? '');
    }

    const abs = Math.abs(normalized);
    if (abs >= 1_000_000_000) return `${this.trimCompactNumber(normalized / 1_000_000_000)}B`;
    if (abs >= 1_000_000) return `${this.trimCompactNumber(normalized / 1_000_000)}M`;
    if (abs >= 1_000) return `${this.trimCompactNumber(normalized / 1_000)}K`;

    return String(normalized);
  }

  private trimCompactNumber(value: number): string {
    return value.toFixed(1).replace(/\.0$/, '');
  }

  levelAvailable(item: ShopItem["item"]): item is HeroItem | EquipItem {
    return this.isHeroItem(item) || this.isEquipItem(item);
  }

  levelUpAvailable(): boolean {
    const experience = 'experience' in this.item.item ? this.item.item.experience : null;
    return !!experience && experience.current >= experience.total;
  }

  private isHeroItem(item: ShopItem["item"]): item is HeroItem {
    return item.itemType === "hero";
  }

  private isEquipItem(item: ShopItem["item"]): item is EquipItem {
    return item.itemType === "equip";
  }

  canBuy(): boolean {
    return this.canPurchase ?? this.item.state === "collect";
  }

  isLocked(){
	this.logger.logDebug('[UIShopBoxComponent]', this.item);
    return this.canBuy() ? "collect" : "locked";
  }
}
export { UIShopBoxComponent as UIShopChestComponent };
