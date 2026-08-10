import { ShopItem } from "../shop.models";



export interface MockShopItemMappingOptions {
  reset?: ShopItem['reset'];
  availability?: ShopItem['availability'];
}

export function mapMockShopItemToShopItem(
  item: ShopItem,
  _index: number,
  options: MockShopItemMappingOptions = {}
): ShopItem {
  return {
    ...item,
    reset: options.reset ?? item.reset,
    availability: options.availability ?? item.availability
  };
}

export function mapMockShopToShopItems(
  items: ShopItem[],
  options: MockShopItemMappingOptions = {}
): ShopItem[] {
  return items.map((item, index) => mapMockShopItemToShopItem(item, index, options));
}
