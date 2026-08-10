import { AvailabilityWindow } from './event.model';
import { ShopItem } from '../shop.models';

/** @deprecated Use ShopItem. */
export type RemoteShopItem = ShopItem;

export function resolveShopItemAvailability(item: ShopItem): AvailabilityWindow {
  return item.availability ?? {};
}

export interface OwnedShopGood {
  itemId: string;
  itemTitle: string;
  purchaseCount: number;
  maxPurchases?: number;
  spent?: {
    coins?: number;
    gems?: number;
  };
  granted?: {
    coins?: number;
    gems?: number;
    itemId?: string;
    quantity?: number;
  };
}
