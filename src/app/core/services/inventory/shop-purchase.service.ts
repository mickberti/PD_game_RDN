import { ShopItem } from "../../models/shop.models";
import { Injectable, inject } from '@angular/core';


import { GameProgress } from '../../models/remote/progress.models';

import { GameStateService } from '../state/game-state.service';
import { ProgressStoreService } from '../state/progress-store.service';
import { LoggerService } from '../infrastructure/logging/logger.service';
import { InventoryMutationService } from './inventory-mutation.service';

@Injectable({ providedIn: 'root' })
export class ShopPurchaseService {
  private readonly gameState = inject(GameStateService);
  private readonly progressStore = inject(ProgressStoreService);
  private readonly inventoryMutations = inject(InventoryMutationService);
  private readonly logger = inject(LoggerService);

  canAffordShopItem(item: ShopItem): boolean {
    const coinsPrice = item.price?.type === 'coin' ? item.price.amount : 0;
    const gemsPrice = item.price?.type === 'gem' ? item.price.amount : 0;
	const dustPrice = item.price?.type === 'dust' ? item.price.amount : 0;

    return this.isValidShopAmount(coinsPrice)
      && this.isValidShopAmount(gemsPrice)
      && coinsPrice <= this.gameState.coins()
      && gemsPrice <= this.gameState.gems()
	  && dustPrice <= this.gameState.dusts();
  }

  canPurchaseShopItem(shopItem: ShopItem): boolean {
    return this.purchaseBlockedReason(shopItem) === null;
  }

  purchaseBlockedReason(shopItem: ShopItem): string | null {
    const item = this.gameState.shop().find((item) => item.id === shopItem.id);
    if (!item) return 'Oggetto non disponibile nello shop.';
    if (item.state === 'locked') return 'Oggetto bloccato.';
    if (!this.hasValidShopReward(item)) return 'Quantità premio non valida.';
    if (!this.canAffordShopItem(item)) return this.insufficientFundsReason(item);
    if (!this.canPurchaseStock(item)) return 'Stock esaurito per questa offerta.';
    if (!this.inventoryMutations.canBuyShopItem(shopItem)) return 'Oggetto non acquistabile.';
    return null;
  }

  async purchaseShopItem(shopItem: ShopItem): Promise<boolean> {
    const remoteItem = this.gameState.shop().find((item) => item.id === shopItem.id);
    if (!remoteItem || !this.canPurchaseShopItem(shopItem)) {
      return false;
    }

    const purchased = this.progressStore.runProgressMutationBatch(
      () => this.applyShopPurchase(remoteItem, shopItem),
      { saveOnComplete: false },
    );

    if (purchased && this.gameState.isRemoteMode()) {
      await this.savePurchasedProgress(this.gameState.progress());
    }

    return purchased;
  }

  applyShopPurchase(item: ShopItem, legacyItem?: ShopItem): boolean {
    if (item.state === 'locked' || !this.canAffordShopItem(item) || !this.canPurchaseStock(item) || !this.hasValidShopReward(item)) {
      return false;
    }

    const inventoryUpdated = this.addRewardItemToInventory(item, legacyItem);
    if (!inventoryUpdated) return false;

    const currentProgress = this.gameState.progress();
    const now = new Date().toISOString();
    const purchaseCount = this.shopItemPurchaseCount(item.id) + 1;
    const nextProgress: GameProgress = {
      ...currentProgress,
      coins: currentProgress.coins - (item.price?.type === 'coin' ? item.price.amount : 0),
      gems: currentProgress.gems - (item.price?.type === 'gem' ? item.price.amount : 0),
      dust: currentProgress.dust - (item.price?.type === 'dust' ? item.price.amount : 0),
      statistics: {
        ...currentProgress.statistics,
      },
      purchasedShopItems: {
        ...(currentProgress.purchasedShopItems ?? {}),
        [item.id]: {
          purchaseCount,
          lastPurchasedAt: now,
        },
      },
      lastUpdatedAt: now,
    };

    this.gameState.updateProgress(nextProgress);
    return true;
  }

  canPurchaseStock(item: ShopItem): boolean {
    return typeof item.stock !== 'number'
      || (Number.isInteger(item.stock) && item.stock > 0 && this.shopItemPurchaseCount(item.id) < item.stock);
  }

  shopItemPurchaseCount(itemId: string): number {
    return this.gameState.progress().purchasedShopItems?.[itemId]?.purchaseCount ?? 0;
  }

  remainingStock(item: ShopItem): number | undefined {
    if (typeof item.stock !== 'number') return undefined;
    return Math.max(item.stock - this.shopItemPurchaseCount(item.id), 0);
  }

  hasValidShopReward(item: ShopItem): boolean {
    const quantity = item.quantity ?? 1;

    return Number.isInteger(quantity)
      && quantity > 0;
  }

  isValidShopAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount >= 0;
  }

  private insufficientFundsReason(item: ShopItem): string {
    const price = item.price;
    if (!price) return 'Valuta insufficiente.';

    const currentAmount = price.type === 'coin'
      ? this.gameState.coins()
      : price.type === 'gem'
        ? this.gameState.gems()
        : this.gameState.dusts();
    return `Valuta insufficiente: servono ${price.amount}, disponibili ${currentAmount}.`;
  }

  private addRewardItemToInventory(item: ShopItem, legacyItem?: ShopItem): boolean {
    const quantity = item.quantity ?? legacyItem?.quantity ?? 1;

    return this.inventoryMutations.addShopItemToInventory({
      ...item,
      item: legacyItem?.item ?? item.item,
      type: legacyItem?.type ?? item.type,
      quantity,
    }, quantity);
  }

  private async savePurchasedProgress(progress: GameProgress): Promise<void> {
    const uid = this.gameState.user()?.uid;
    if (!uid) return;

    try {
      await this.progressStore.persistProgressIfRemote(progress, { awaitSave: true });
    } catch (error) {
      this.logger.logError('[ShopPurchaseService] purchase progress save failed', error);
      throw error;
    }
  }
}
