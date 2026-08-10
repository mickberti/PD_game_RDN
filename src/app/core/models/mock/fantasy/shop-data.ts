import { ShopItem } from "../../shop.models";
import { ChestItem, EquipItem, HeroItem, ResourceItem } from "../../game.models";
import {
  buildShopItemsByProgress as buildCoreShopItemsByProgress,
  buildShopItemsFromItems,
  getShopUnlocksByPlayerLevel,
  type BuildShopItemsOptions,
  type ShopSourceItem,
} from "../../../services/shop/shop-generation.service";
import { chestItemsMock } from "./box-data";
import { equipItemsVariantMock } from "./equip-data";
import { mockHeroItems } from "./hero-data";
import { resourceItemsMock } from "./resource-data";

export {
  buildShopItemsFromItems,
  getShopUnlocksByPlayerLevel,
  type BuildShopItemsOptions,
  type ShopSourceItem,
};

export interface BuildShopItemsByProgressOptions {
  level: number;
  heroCount: number;
  equipCount: number;
  resourceCount: number;
  boxCount?: number;
  heroItems?: HeroItem[];
  equipItems?: EquipItem[];
  resourceItems?: ResourceItem[];
  chestItems?: ChestItem[];
  idSuffix?: string;
}

export const resourceShopItemsMock: ShopItem[] = buildShopItemsFromItems(
  resourceItemsMock,
  {
    type: "resource",
    defaultState: "collect",
    defaultStock: 10,
  },
);

export const buildShopItemsByProgress = ({
  level,
  heroCount,
  equipCount,
  resourceCount,
  boxCount = 0,
  heroItems = mockHeroItems,
  equipItems = equipItemsVariantMock,
  resourceItems = resourceItemsMock,
  chestItems = chestItemsMock,
  idSuffix,
}: BuildShopItemsByProgressOptions): ShopItem[] => {
  return buildCoreShopItemsByProgress({
    level,
    heroCount,
    equipCount,
    resourceCount,
    boxCount,
    heroItems,
    equipItems,
    resourceItems,
    chestItems,
    idSuffix,
  });
};
