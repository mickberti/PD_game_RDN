import { ShopItem } from "../../../models/shop.models";
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs
} from '@angular/fire/firestore';
import { LoggerService } from '../../infrastructure/logging/logger.service';
import { TimeService } from '../../utils/time.service';
import { OwnedShopGood, resolveShopItemAvailability } from '../../../models/remote/shop-item.model';
import { isAvailableNow } from '../../utils/availability/availability.util';

export function resolveAvailableShopItems(items: ShopItem[], now: Date): ShopItem[] {
  return items
    .filter(item => item.state !== 'locked' && isAvailableNow(resolveShopItemAvailability(item), now));
}

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);
  private readonly timeService = inject(TimeService);

  private shopCache: ShopItem[] | null = null;
  private shopPromise: Promise<ShopItem[]> | null = null;

  async getShopItems(forceRefresh = false): Promise<ShopItem[]> {
    await this.timeService.sync(forceRefresh);

    if (this.shopCache && !forceRefresh) {
      this.logger.logDebug('[ShopService]: returning cached items');
      return this.shopCache;
    }

    if (this.shopPromise && !forceRefresh) {
      this.logger.logDebug('[ShopService]: returning existing promise');
      return this.shopPromise;
    }

    this.logger.logDebug('[ShopService]: Load shop from Firestore');

    this.shopPromise = (async () => {
      try {
        const ref = collection(this.firestore, 'shopItems');
        const snap = await getDocs(ref);

        const items = resolveAvailableShopItems(
          snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopItem)),
          this.timeService.nowDate()
        );

        this.logger.logDebug('[ShopService]: Load OK', items);

        this.shopCache = items;
        return items;
      } finally {
        this.shopPromise = null;
      }
    })();

    return this.shopPromise;
  }

  async getOwnedGoods(userId: string): Promise<OwnedShopGood[]> {
    if (!userId) {
      return [];
    }

    const purchasesRef = collection(this.firestore, `users/${userId}/private/progress/purchases`);
    const snapshot = await getDocs(purchasesRef);

    return snapshot.docs
      .map(docSnap => {
        const data = docSnap.data() as Partial<OwnedShopGood>;
        return {
          itemId: data.itemId ?? docSnap.id,
          itemTitle: data.itemTitle ?? docSnap.id,
          purchaseCount: data.purchaseCount ?? 0,
          maxPurchases: data.maxPurchases,
          spent: data.spent,
          granted: data.granted
        } satisfies OwnedShopGood;
      })
      .sort((a, b) => b.purchaseCount - a.purchaseCount);
  }

  clearCache() {
    this.shopCache = null;
  }
}
