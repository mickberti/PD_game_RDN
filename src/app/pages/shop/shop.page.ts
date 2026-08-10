import { ShopItem } from "../../core/models/shop.models";
import { Component, effect, inject, signal } from "@angular/core";
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonToolbar,
  PopoverController,
} from "@ionic/angular/standalone";

import { FrameItem, UiTabItem } from "../../core/models/game.models";
import { PlayerShop } from "../../core/models/remote/progress.models";
import { GameStateService } from "../../core/services/state/game-state.service";
import { ShopPurchaseService } from "../../core/services/inventory/shop-purchase.service";
import { InventoryMutationService } from "../../core/services/inventory/inventory-mutation.service";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UiRadialTabsComponent } from "src/app/shared/basic/ui-radial-tabs.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIPrestigeChestComponent } from "../../shared/components/box/ui-prestige-box.component";
import { UIBandComponent } from "../../shared/basic/ui-band.component";
import { UIFloatingPanelComponent } from "../../shared/basic/ui-floating-panel.component";
import { UIShopChestComponent } from "../../shared/components/box/ui-shop-box.component";
import { CommonModule } from "@angular/common";
import { UIItemDetailPopupComponent } from "src/app/shared/components/popup/ui-item-detail-popup.component";
import { UIActionFeedbackOverlayComponent } from "src/app/shared/components/ui-action-feedback-overlay.component";
import { FloatingNavigationService } from "../../core/services/app/navigation/floating-navigation.service";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";

type ShopTabId = keyof PlayerShop | "resources" | "chests";

@Component({
  selector: "app-shop",
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    UIHeaderComponent,
    IonFooter,
    UIBottomNavComponent,
    IonContent,
    UiRadialTabsComponent,
    UIPrestigeChestComponent,
    UIBandComponent,
    UIFloatingPanelComponent,
    UIShopChestComponent,
    CommonModule,
    UIActionFeedbackOverlayComponent,
  ],

  template: `
    <ion-header>
      <ion-toolbar>
        <ui-header title="Settings" backPath="/hub"></ui-header>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="screen shop-screen">
        <div class="shop-content">
          <ui-radial-tabs
            [tabs]="tabs"
            [selected]="type"
            (selectedChange)="onTabChange($event)"
          />
        </div>

        <ui-prestige-box
          *ngIf="false"
          variant="light"
          variantButton="secondary"
          buttonLabel="9.99 USD"
          descrTitle="Master Offer"
          descrSubtitle="300 Gems + 3 Epic Chess + 5 Gold Bags"
        />

        <ui-band *ngIf="false" variant="secondary" title="Pack"></ui-band>

        <section class="shop-grid">
          @for (item of shopItem; track item.id) {
            <ui-shop-box
              [item]="item"
              [canPurchase]="canBuy(item)"
              [inventoryPresent]="isInventoryPresent(item)"
              (info)="preview(item)"
              (buy)="buyItem(item)"
            />
          }
        </section>

        <ui-action-feedback-overlay
          [open]="!!purchaseFeedback()"
          [frame]="purchaseFeedback()?.frame"
          [text]="purchaseFeedback()?.text ?? ''"
          [variant]="purchaseFeedback()?.variant ?? 'gain'"
          [duration]="2500"
          ariaLabel="Oggetto acquistato"
          (closed)="purchaseFeedback.set(null)"
        />
      </div>
      <ui-floating-panel
        *ngIf="false"
        slot="fixed"
        title="Mario Rossi"
        subtitle="Cliente selezionato · Pratica #1234"
        initials="MR"
        status="active"
        [actions]="contextActions"
      >
      </ui-floating-panel>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ui-bottom-nav />
      </ion-toolbar>
    </ion-footer>
  `,
})
export class ShopPage {
  readonly gameState = inject(GameStateService);
  private readonly shopPurchase = inject(ShopPurchaseService);
  private readonly inventoryMutations = inject(InventoryMutationService);
  readonly nav = inject(AppNavigationService);
  readonly floating = inject(FloatingNavigationService);
  private readonly logger = inject(LoggerService);
  readonly purchaseFeedback = signal<{
    frame: FrameItem;
    text: string;
    variant: "gain" | "sell" | "collect" | "open";
  } | null>(null);
  private readonly popoverCtrl = inject(PopoverController);


  contextActions = this.floating.contextActions;
  readonly tabs: UiTabItem[] = [
    {
      id: "daily",
      title: "Daily",
      frame: { name: "icon-coin-bag", effect: "none" },
      route: "",
      size: "lg",
    },
    {
      id: "weekly",
      title: "Weekly",
      frame: { name: "icon-shop-s2", effect: "none" },
      route: "",
      size: "lg",
    },
    {
      id: "season",
      title: "Season",
      frame: { name: "icon-shop-s2", effect: "none" },
      route: "",
      size: "lg",
    },
    {
      id: "resources",
      title: "Risorse",
      frame: { name: "resource-dust-red", effect: "none" },
      route: "",
      size: "lg",
    },
    {
      id: "chests",
      title: "Chest",
      frame: { name: "chest", effect: "none" },
      route: "",
      size: "lg",
    },
  ];

  type: ShopTabId = "daily";
  shopItem: ShopItem[] = [];

  private readonly shopItemsSync = effect(() => {
    const shop = this.gameState.playerShop();
	this.logger.logDebug(
	  "[ShopPage] effect",
	  shop
	);
    this.updateShopItems(shop);
  });

  ngOnInit(): void {
    this.type = this.resolveRouteTab();

    this.updateShopItems();
  }

  onTabChange(tabId: string): void {
    this.type = this.isShopTab(tabId) ? tabId : "daily";
    this.updateShopItems();
    this.nav.go(`shop/${this.type}`);
  }

  private updateShopItems(
    shop = this.gameState.playerShop()
  ): void {
    const shopItems = this.getShopItemsForCurrentTab(shop).map((item) => ({
      ...item,
      stock: this.shopPurchase.remainingStock(item) ?? item.stock,
    }));
	  this.logger.logDebug(
	    "[ShopPage] updateShopItems",
	    this.type, shopItems
	  );
    this.shopItem = shopItems;
  }

  private getShopItemsForCurrentTab(shop: PlayerShop): ShopItem[] {
    const allShopItems = [
      ...shop.daily.item,
      ...shop.weekly.item,
      ...shop.season.item,
    ];

    if (this.type === "resources") {
      return allShopItems.filter((item) => item.type === "resource");
    }

    if (this.type === "chests") {
      return allShopItems.filter((item) => item.type === "box");
    }

    return shop[this.type].item.filter(
      (item) => item.type !== "resource" && item.type !== "box",
    );
  }

  private resolveRouteTab(): ShopTabId {
    const route = this.nav.getCurrentRoute();
    const routeParts = route.split("/").filter(Boolean);
    const category = routeParts[routeParts.length - 1];
    return category && this.isShopTab(category) ? category : "daily";
  }

  private isShopTab(tabId: string): tabId is ShopTabId {
    return (
      tabId === "daily" ||
      tabId === "weekly" ||
      tabId === "season" ||
      tabId === "resources" ||
      tabId === "chests"
    );
  }

  async buyItem(item: ShopItem): Promise<void> {
    const purchased = await this.shopPurchase.purchaseShopItem(item);
    if (!purchased) return;

    this.updateShopItems();
    this.purchaseFeedback.set({
      frame: item.item.frame,
      text: `+${item.quantity ?? 1}`,
      variant: item.type === "box" ? "open" : "gain",
    });
  }

  canBuy(item: ShopItem): boolean {
    return this.shopPurchase.canPurchaseShopItem(item);
  }

  isInventoryPresent(item: ShopItem): boolean {
    return this.inventoryMutations.isInventoryPresent(item);
  }

  async preview(item: ShopItem): Promise<void> {
    let pop: HTMLIonPopoverElement | undefined;

    pop = await this.popoverCtrl.create({
      component: UIItemDetailPopupComponent,
      componentProps: {
        item: item.item,
        actionLabel: "Acquista",
        actionPrice: item.price,
        actionDisabled: !this.canBuy(item),
        actionDisabledReason: this.shopPurchase.purchaseBlockedReason(item),
        showUpgrade: false,
        onAction: () => {
          this.buyItem(item);
          pop?.dismiss();
        },
        onDismiss: (d?: any) => pop?.dismiss(d),
      },
      translucent: true,
      cssClass: "equip-preview-popover",
    });

    await pop.present();
  }
}
