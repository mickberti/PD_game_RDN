import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonToolbar,
  PopoverController,
} from "@ionic/angular/standalone";

import { ChestItem, ComponentEffect, ComponentSize, EquipItem, FrameItem, HeroItem, InventoryItem, OpenedRewardItem, PriceItem, ResourceItem, UiTabItem } from "../../core/models/game.models";
import { GameStateService } from "../../core/services/state/game-state.service";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";
import { ChestRewardService } from "../../core/services/inventory/rewards/box-reward.service";
import { HeroProgressService } from "../../core/services/progression/hero-progress.service";
import { InventoryMutationService } from "../../core/services/inventory/inventory-mutation.service";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UIItemDetailPopupComponent } from "src/app/shared/components/popup/ui-item-detail-popup.component";
import { UIContentPanelComponent } from "../../shared/basic/ui-content-panel.component";
import { UiRadialTabsComponent } from "../../shared/basic/ui-radial-tabs.component";
import { UIInventoryChestComponent } from "../../shared/components/box/ui-inventory-box.component";
import { UIButtonSpriteComponent } from "../../shared/basic/ui-button-sprite.component";
import { UIEquipFilterPopupComponent } from "src/app/shared/components/popup/ui-equip-filter-popup.component";
import { UIConfirmActionPopupComponent } from "src/app/shared/components/popup/ui-confirm-action-popup.component";
import { UIChestOpeningPopupComponent } from "src/app/shared/components/popup/ui-box-opening-popup.component";
import {
  ActionFeedbackFrameItem,
  UIActionFeedbackOverlayComponent,
} from "src/app/shared/components/ui-action-feedback-overlay.component";
import {
  defaultLevelRange,
  defaultMasteryRange,
} from "../../core/models/mock/fantasy/utils-data";

type InventoryCategory = "resources" | "equip" | "boxes" | "heroes";
type InventoryFilter = "all" | string;
type InventorySortDirection = "asc" | "desc";

@Component({
  selector: "app-inventory",
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonFooter,
    IonHeader,
    IonToolbar,
    UIHeaderComponent,
    UIBottomNavComponent,
    UIContentPanelComponent,
    UiRadialTabsComponent,
    UIInventoryChestComponent,
    UIButtonSpriteComponent,
    UIConfirmActionPopupComponent,
    UIChestOpeningPopupComponent,
    UIActionFeedbackOverlayComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ui-header title="Inventory" backPath="/hub"></ui-header>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="screen inventory-screen">
        <div class="inventory-content">
          <ui-radial-tabs
            [tabs]="tabs"
            [selected]="selectedCategory()"
            (selectedChange)="onCategoryChange($event)"
          />
        </div>
        <ui-content-panel
          variant="none"
          [verticalSelected]="selectedFilter()"
          [verticalTabs]="activeFilters()"
          (verticalChange)="onFilterChange($event)"
        >
          <section class="inventory-title">
            <div class="inventory-title-copy">
              <div class="inventory-eyebrow">{{ selectedTabLabel() }}</div>
              @if (selectedCategory() === "equip") {
                <small class="inventory-filter-summary">
                  Maestria {{ activeMasteryRange().lower }}-{{
                    activeMasteryRange().upper
                  }}
                  · L {{ activeLevelRange().lower }}-{{
                    activeLevelRange().upper
                  }}
                </small>
              }
            </div>
            <div class="inventory-title-actions">
              <span
                >{{ formattedNumber(visibleItems().length) }}/{{
                  formattedNumber(state.maxInventoryItemsPerCategory)
                }}</span
              >
              <ui-button-sprite
                [frame]="{ name: 'icon-sort', effect: 'none' }"
                [active]="sortDirection() === 'desc'"
                [ariaLabel]="sortDirectionLabel()"
                (pressed)="toggleSortDirection()"
              />
              @if (selectedCategory() === "equip") {
                <ui-button-sprite
                  [frame]="{ name: 'icon-filter', effect: 'none' }"
                  (pressed)="openFilterModal()"
                />
              }
              @if (canDeleteSelectedCategory()) {
                <ui-button-sprite
                  [frame]="{
                    name: isDeleteMode() ? 'icon-confirm' : 'icon-cancel',
                    effect: 'none',
                  }"
                  (pressed)="toggleDeleteMode()"
                />
              }
            </div>
          </section>

          <section
            class="inventory-grid"
            [attr.aria-label]="selectedTabLabel()"
          >
            @for (item of visibleItems(); track item.id) {
              <ui-inventory-box
                [item]="item"
                [cardFrame]="cardFrame(item)"
                [cliccable]="true"
                [isDeleteMode]="isDeleteMode()"
                [isDeletable]="canDeleteItem(item)"
                (pressed)="onInventoryItemClick(item)"
                (delete)="confirmDeleteItem.set(item)"
              />
            }
            <ui-inventory-box
              [add]="true"
              cardFrame="icon-hex-light"
              [cliccable]="true"
              (pressed)="goToShopFromAddChest()"
            />
          </section>
        </ui-content-panel>

        <ui-action-feedback-overlay
          [open]="!!actionFeedback()"
          [frame]="actionFeedback()?.frame"
          [frames]="actionFeedback()?.frames ?? []"
          [text]="actionFeedback()?.text ?? ''"
          [variant]="actionFeedback()?.variant ?? 'sell'"
          [duration]="actionFeedback()?.duration ?? 2500"
          [frameDelay]="actionFeedback()?.frameDelay ?? 0"
          ariaLabel="Feedback azione inventario"
          (closed)="actionFeedback.set(null)"
        />

        @if (confirmDeleteItem(); as item) {
          <ui-confirm-action-popup
            [open]="true"
            [text]="deleteConfirmText(item)"
            [frame]="item.frame"
            [price]="inventoryItemRefundPrice(item)"
            pricePrefix="Ricavi"
            confirmLabel="Elimina"
            ariaLabel="Conferma eliminazione inventario"
            (cancel)="confirmDeleteItem.set(null)"
            (confirm)="deleteInventoryItem()"
          />
        }

        <ui-box-opening-popup
          [open]="!!selectedChest()"
          [box]="selectedChest()"
          [stock]="selectedChest() ? selectedChestStock(selectedChest()!) : 0"
          [boxOpening]="boxOpening()"
          (close)="closeChestDetail()"
          (openChest)="openSelectedChest($event)"
        />
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ui-bottom-nav />
      </ion-toolbar>
    </ion-footer>
  `,
})
export class InventoryPage {
  readonly state = inject(GameStateService);
  readonly inventoryResources = this.state.inventoryResources;
  readonly inventoryChestes = this.state.inventoryChestes;
  readonly inventoryEquip = this.state.inventoryEquip;
  readonly inventoryHeroes = this.state.inventoryHeroes;
  readonly inventoryMutations = inject(InventoryMutationService);
  private readonly heroProgress = inject(HeroProgressService);
  private readonly boxRewards = inject(ChestRewardService);
  private readonly nav = inject(AppNavigationService);
  private readonly utils = inject(GameUtilsService);
  private readonly popoverCtrl = inject(PopoverController);

  readonly tabs = [
    this.createTabItem("resources", "Risorse", "icon-gems", "none", "lg"),
    this.createTabItem("equip", "Equip", "icon-sword-shield", "none", "lg"),
    this.createTabItem("boxes", "Chest", "chest", "none", "lg"),
    this.createTabItem("heroes", "Eroi", "icon-hero-avatar", "none", "lg"),
  ] satisfies UiTabItem[];

  readonly selectedCategory = signal<InventoryCategory>("resources");
  readonly selectedFilter = signal<InventoryFilter>("all");
  readonly selectedChest = signal<ChestItem | null>(null);
  readonly boxOpening = signal(false);
  readonly confirmDeleteItem = signal<InventoryItem | null>(null);
  readonly isDeleteMode = signal(false);
  readonly sortDirection = signal<InventorySortDirection>("asc");
  readonly activeMasteryRange = signal<{ lower: number; upper: number }>(
    defaultMasteryRange,
  );
  readonly activeLevelRange = signal<{ lower: number; upper: number }>(
    defaultLevelRange,
  );
  readonly actionFeedback = signal<{
    frame?: FrameItem;
    frames?: ActionFeedbackFrameItem[];
    text: string;
    variant: "gain" | "sell" | "collect" | "open";
    duration?: number;
    frameDelay?: number;
  } | null>(null);

  readonly activeFilters = computed<UiTabItem[]>(() => {
    const category = this.selectedCategory();

    const baseFilters: UiTabItem[] = [
      this.createTabItem("all", "Tutti", "inventory", "none", "sm"),
    ];

    switch (category) {
      case "resources":
        return [
          ...baseFilters,
          ...this.uniqueById(
            this.inventoryResources().map((item) =>
              this.createTabItem(
                item.type.id,
                item.type.title,
                item.frame.name,
                "none",
                "sm",
              ),
            ),
          ),
        ];

      case "equip":
        return [
          ...baseFilters,
          ...this.uniqueById(
            this.inventoryEquip().map((item) =>
              this.createTabItem(
                item.type.id,
                item.type.title,
                item.frame.name,
                "none",
                "sm",
              ),
            ),
          ),
        ];

      case "boxes":
        return [
          ...baseFilters,
          ...this.uniqueById(
            this.inventoryChestes().map((item) =>
              this.createTabItem(
                item.type.id,
                item.type.title,
                item.frame.name,
                "none",
                "sm",
              ),
            ),
          ),
        ];

      case "heroes":
        return [...baseFilters];
    }
  });

  readonly visibleItems = computed<InventoryItem[]>(() => {
    const category = this.selectedCategory();
    const filter = this.selectedFilter();
    const items = this.itemsByCategory(category);

    const filteredItems =
      filter === "all"
        ? items
        : items.filter((item) => this.matchesFilter(category, item, filter));

    const rangedItems =
      category === "equip"
        ? filteredItems.filter((item) => this.matchesEquipRange(item))
        : filteredItems;

    return this.sortInventoryItems(rangedItems).slice(
      0,
      this.state.maxInventoryItemsPerCategory,
    );
  });

  onInventoryItemClick(item: InventoryItem): void {
    if (this.isDeleteMode() && this.canDeleteItem(item)) {
      this.confirmDeleteItem.set(item);
      return;
    }

    if (this.isChestItem(item)) {
      this.selectedChest.set(item);
      return;
    }

    void this.previewInventoryItem(item);
  }

  goToShopFromAddChest(): void {
    const category = this.selectedCategory();
    const shopCategory =
      category === "equip" || category === "heroes" ? "item" : "deal";
    void this.nav.go(`shop/${shopCategory}`);
  }

  async previewInventoryItem(item: InventoryItem): Promise<void> {
    let pop: HTMLIonPopoverElement | undefined;

    pop = await this.popoverCtrl.create({
      component: UIItemDetailPopupComponent,
      componentProps: {
        item,
        actionLabel: this.detailActionLabel(item),
        onAction: () => {
          pop?.dismiss({ action: "open" });
          this.openInventoryItemDestination(item);
        },
        onDismiss: (d?: any) => pop?.dismiss(d),
      },
      translucent: true,
      cssClass: "equip-preview-popover",
    });

    await pop.present();
  }

  async openFilterModal(): Promise<void> {
    let pop: HTMLIonPopoverElement | undefined;

    pop = await this.popoverCtrl.create({
      component: UIEquipFilterPopupComponent,
      componentProps: {
        experienceRange: this.activeMasteryRange(),
        levelRange: this.activeLevelRange(),
        onDismiss: (data?: any) => pop?.dismiss(data),
        onApply: (filters: {
          experience: { lower: number; upper: number };
          level: { lower: number; upper: number };
        }) => pop?.dismiss({ action: "apply", filters }),
      },
      translucent: true,
      cssClass: "equip-filter-popover",
    });

    await pop.present();

    const { data } = await pop.onWillDismiss();
    if (data?.action === "apply" && data.filters) {
      this.activeMasteryRange.set({ ...data.filters.experience });
      this.activeLevelRange.set({ ...data.filters.level });
    }
  }

  toggleDeleteMode(): void {
    if (!this.canDeleteSelectedCategory()) {
      this.isDeleteMode.set(false);
      this.confirmDeleteItem.set(null);
      return;
    }

    this.isDeleteMode.update((value) => !value);
    this.confirmDeleteItem.set(null);
    this.selectedChest.set(null);
  }

  deleteInventoryItem(): void {
    const item = this.confirmDeleteItem();
    if (!item || !this.canDeleteItem(item)) return;

    if (this.isEquipItem(item)) {
      this.inventoryMutations.deleteInventoryEquipWithRefund(item.id);
      this.showDeleteFeedback(item);
    } else if (this.isHeroItem(item)) {
      const removedCurrentHero = this.state.currentHero()?.id === item.id;
      this.inventoryMutations.deleteInventoryHeroWithRefund(item.id);

      if (removedCurrentHero) {
        const nextHero = this.inventoryHeroes()[0];
        if (nextHero) {
          this.heroProgress.setSelectedHero(nextHero);
        }
      }
      this.showDeleteFeedback(item);
    }

    this.confirmDeleteItem.set(null);
  }

  private showDeleteFeedback(item: InventoryItem): void {
    this.actionFeedback.set({
      frame: item.frame,
      text: "Eliminato",
      variant: "sell",
    });
  }

  canDeleteSelectedCategory(): boolean {
    const category = this.selectedCategory();
    return category === "equip" || category === "heroes";
  }

  canDeleteItem(item: InventoryItem): boolean {
    return this.isEquipItem(item) || this.isHeroItem(item);
  }

  closeChestDetail(): void {
    this.selectedChest.set(null);
    this.boxOpening.set(false);
  }

  openSelectedChest(box: ChestItem): void {
    if (this.boxOpening()) {
      return;
    }

    const currentChest = this.inventoryChestes().find((item) => item.id === box.id);
    if (!currentChest) {
      this.closeChestDetail();
      return;
    }

    this.boxOpening.set(true);
    const rewards = this.boxRewards.openInventoryChest(currentChest);
    this.showOpenedChestFeedback(rewards);

    setTimeout(() => {
      this.boxOpening.set(false);
      const updatedChest =
        this.inventoryChestes().find((item) => item.id === box.id) ?? null;
      this.selectedChest.set(updatedChest);
      if (!updatedChest) {
        this.closeChestDetail();
      }
    }, 2000);
  }

  private showOpenedChestFeedback(rewards: OpenedRewardItem[]): void {
    if (!rewards.length) {
      return;
    }

    this.actionFeedback.set({
      frames: rewards.map((reward) => ({
        frame: reward.frame,
        text: `${reward.title} x${this.formattedNumber(reward.quantity)}`,
        duration: 1800,
        delayAfter: 120,
      })),
      text: "",
      variant: "open",
      duration: 1800,
      frameDelay: 120,
    });
  }

  formattedNumber(value: number): string {
    return this.utils.formatCompactNumber(value);
  }

  selectedChestStock(box: ChestItem): number {
    return (
      this.inventoryChestes().find((item) => item.id === box.id)?.stock ??
      box.stock ??
      0
    );
  }

  onCategoryChange(categoryId: string): void {
    if (!this.isInventoryCategory(categoryId)) {
      return;
    }

    this.selectedCategory.set(categoryId);
    this.selectedFilter.set("all");
    this.isDeleteMode.set(false);
    this.confirmDeleteItem.set(null);
    this.selectedChest.set(null);
  }

  onFilterChange(filterId: string): void {
    this.selectedFilter.set(filterId);
  }

  toggleSortDirection(): void {
    this.sortDirection.update((direction) =>
      direction === "asc" ? "desc" : "asc",
    );
  }

  sortDirectionLabel(): string {
    return this.sortDirection() === "asc"
      ? "Ordine inventario ascendente"
      : "Ordine inventario discendente";
  }

  selectedTabLabel(): string {
    return (
      this.tabs.find((tab) => tab.id === this.selectedCategory())?.title ??
      "Inventario"
    );
  }

  itemName(item: InventoryItem): string {
    return "name" in item ? item.name : item.title;
  }

  inventoryItemRefundPrice(item: InventoryItem): PriceItem | null {
    if (this.isEquipItem(item) || this.isHeroItem(item)) {
      return this.inventoryMutations.inventoryItemRefundPrice(item);
    }
    return null;
  }

  deleteConfirmText(item: InventoryItem): string {
    return `Vuoi davvero eliminare ${this.itemName(item)} dall'inventario?`;
  }

  itemSubtitle(item: InventoryItem): string {
    if (this.isEquipItem(item)) {
      return `ATK ${item.attack} · DEF ${item.defense}`;
    }

    if (this.hasTypedCategory(item)) {
      return item.type.title;
    }

    if ("description" in item) {
      return item.description;
    }

    return "Oggetto inventario";
  }

  cardFrame(item: InventoryItem): string {
    if (this.isHeroItem(item) || this.isEquipItem(item)) {
      return "icon-hex-light";
    }

    if ("stock" in item) {
      return "icon-hex-light";
    }

    return "icon-diamond-blue";
  }

  private detailActionLabel(item: InventoryItem): string | undefined {
    if (this.isHeroItem(item)) return "Vai all'eroe";
    if (this.isEquipItem(item)) return "Vai a equip";
    return undefined;
  }

  private openInventoryItemDestination(item: InventoryItem): void {
    if (this.isHeroItem(item)) {
      this.heroProgress.setSelectedHero(item);
      void this.nav.go("hero");
      return;
    }

    if (this.isEquipItem(item)) {
      const equippedHero = this.findHeroEquippedWith(item);
      if (equippedHero) {
        this.heroProgress.setSelectedHero(equippedHero);
      }
      void this.nav.go(`hero/equip/${item.type.id}`);
    }
  }

  private findHeroEquippedWith(item: EquipItem): HeroItem | undefined {
    return this.inventoryHeroes().find((hero) =>
      hero.equip.some((equip) => equip.id === item.id),
    );
  }

  private isHeroItem(item: InventoryItem): item is HeroItem {
    return item.itemType === "hero";
  }

  private isEquipItem(item: InventoryItem): item is EquipItem {
    return item.itemType === "equip";
  }

  private isResourceItem(item: InventoryItem): item is ResourceItem {
    return item.itemType === "resource";
  }

  private itemsByCategory(category: InventoryCategory): InventoryItem[] {
    switch (category) {
      case "resources":
        return this.inventoryResources();

      case "equip":
        return this.inventoryEquip();

      case "boxes":
        return this.inventoryChestes();

      case "heroes":
        return this.inventoryHeroes();
    }
  }


  private sortInventoryItems(items: InventoryItem[]): InventoryItem[] {
    const directionMultiplier = this.sortDirection() === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
      const variantDiff = this.itemVariant(a) - this.itemVariant(b);
      if (variantDiff !== 0) return variantDiff * directionMultiplier;

      const masteryDiff = this.itemMastery(a) - this.itemMastery(b);
      if (masteryDiff !== 0) return masteryDiff * directionMultiplier;

      const levelDiff = this.itemLevel(a) - this.itemLevel(b);
      if (levelDiff !== 0) return levelDiff * directionMultiplier;

      return (
        this.itemName(a).localeCompare(this.itemName(b)) * directionMultiplier
      );
    });
  }

  private itemVariant(item: InventoryItem): number {
    return "variant" in item ? item.variant : 0;
  }

  private itemMastery(item: InventoryItem): number {
    return "mastery" in item ? item.mastery : 0;
  }

  private itemLevel(item: InventoryItem): number {
    return "level" in item ? item.level : 0;
  }

  private matchesEquipRange(item: InventoryItem): boolean {
    if (!this.isEquipItem(item)) return true;

    const mastery = this.activeMasteryRange();
    const level = this.activeLevelRange();

    return (
      item.mastery >= mastery.lower &&
      item.mastery <= mastery.upper &&
      item.level >= level.lower &&
      item.level <= level.upper
    );
  }

  private matchesFilter(
    category: InventoryCategory,
    item: InventoryItem,
    filter: string,
  ): boolean {
    if (category === "heroes" && "state" in item) {
      return item.state === filter;
    }

    if (this.hasTypedCategory(item)) {
      return item.type.id === filter;
    }

    return true;
  }

  isChestItem(item: InventoryItem): item is ChestItem {
    return item.itemType === "chest";
  }

  private isInventoryCategory(value: string): value is InventoryCategory {
    return (
      value === "resources" ||
      value === "equip" ||
      value === "boxes" ||
      value === "heroes"
    );
  }

  private hasTypedCategory(
    item: InventoryItem,
  ): item is InventoryItem & { type: { id: string; title: string } } {
    return (
      "type" in item &&
      typeof item.type === "object" &&
      item.type !== null &&
      "id" in item.type &&
      "title" in item.type
    );
  }

  private createTabItem(
    id: string,
    title: string,
    frameName: string,
    effect: ComponentEffect = "none",
    size: ComponentSize = "md",
  ): UiTabItem {
    return {
      id,
      title,
      frame: {
        name: frameName,
        effect,
      },
      route: "",
      size,
    };
  }

  private uniqueById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();

    return items.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
  }
}
