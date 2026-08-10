import { Injectable } from "@angular/core";

import { ChestItem, EquipItem, FrameItem, HeroItem, ResourceItem, masteryType, variantsType } from "../../models/game.models";
import { ShopItem } from "../../models/shop.models";
import { PricingService } from "../economy/pricing.service";
import { GameUtilsService } from "../ui/formatting/game-utils.service";

export type ShopSourceItem = EquipItem | HeroItem | ResourceItem | ChestItem;

export interface BuildShopItemsOptions {
  type?: ShopItem["type"];
  defaultState?: ShopItem["state"];
  defaultStock?: number;
  defaultQuantity?: number;
  framePanels?: FrameItem[];
  priceMultiplier?: number;
}

export interface BuildDailyShopOptions {
  heroCount: number;
  equipCount: number;
  resourceCount: number;
  boxCount?: number;
  heroItems: HeroItem[];
  equipItems: EquipItem[];
  resourceItems: ResourceItem[];
  chestItems: ChestItem[];
  idSuffix?: string;
}

export interface BuildShopItemsByProgressOptions extends BuildDailyShopOptions {
  level: number;
}

const defaultShopFramePanels: FrameItem[] = [
  { name: "card-parchment-small", effect: "none" },
  { name: "card-blue-small", effect: "none" },
  { name: "card-parchment-red-banner", effect: "none" },
];

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pricing = new PricingService();

export const isHeroItem = (item: ShopSourceItem): item is HeroItem => {
  return item.itemType === "hero";
};

export const isEquipItem = (item: ShopSourceItem): item is EquipItem => {
  return item.itemType === "equip";
};

export const isResourceItem = (item: ShopSourceItem): item is ResourceItem => {
  return item.itemType === "resource";
};

export const isChestItem = (item: ShopSourceItem): item is ChestItem => {
  return item.itemType === "chest";
};

const resolveShopType = (item: ShopSourceItem, type?: ShopItem["type"]): ShopItem["type"] => {
  if (type) return type;
  if (isHeroItem(item)) return "hero";
  if (isEquipItem(item)) return "item";
  if (isChestItem(item)) return "box";
  return "resource";
};

const resolveQuantity = (
  shopType: ShopItem["type"],
  defaultQuantity?: number,
): number => {
  if (typeof defaultQuantity === "number") return Math.max(1, defaultQuantity);
  if (shopType === "resource") return randomInt(1, 100);
  if (shopType === "box") return randomInt(1, 3);
  return 1;
};

export const buildShopItemsFromItems = (
  items: ShopSourceItem[],
  options: BuildShopItemsOptions = {},
): ShopItem[] => {
  const {
    type,
    defaultState = "collect",
    defaultStock = 1,
    defaultQuantity,
    framePanels = defaultShopFramePanels,
    priceMultiplier: _priceMultiplier = 1,
  } = options;

  return items.map((item, index): ShopItem => {
    const framePanel = framePanels[index % framePanels.length];
    const shopType = resolveShopType(item, type);

    const title = isHeroItem(item) ? item.title : item.name;

    const subtitle = isHeroItem(item)
      ? `Hero · Level ${item.level}`
      : isEquipItem(item)
        ? `${item.type.title} · Level ${item.level} · XP ${item.experience.current}/${item.experience.total}`
        : `${item.type.title} · Level ${item.level}`;

    const quantity = resolveQuantity(shopType, defaultQuantity);
    const price = pricing.createDefaultShopPrice(item, quantity);

    return {
      id: `shop-${shopType}-${item.id}`,
      framePanel,
      item,
      type: shopType,
      title,
      subtitle,
      state: defaultState,
      price,
      stock: defaultStock,
      quantity,
    };
  });
};

export const buildDailyShopItems = ({
  heroCount,
  equipCount,
  resourceCount,
  boxCount = 0,
  heroItems,
  equipItems,
  resourceItems,
  chestItems,
  idSuffix,
}: BuildDailyShopOptions): ShopItem[] => {
  const randomHeroes = GameUtilsService.getRandomItemsFromList(heroItems, heroCount);
  const randomEquip = GameUtilsService.getRandomItemsFromList(equipItems, equipCount);
  const randomResources = GameUtilsService.getRandomItemsFromList(resourceItems, resourceCount);
  const randomChestes = GameUtilsService.getRandomItemsFromList(chestItems, boxCount);

  const heroShopItems = buildShopItemsFromItems(randomHeroes, {
    type: "hero",
    defaultStock: 1,
    defaultQuantity: 1,
  });

  const equipShopItems = buildShopItemsFromItems(randomEquip, {
    type: "item",
    defaultStock: 1,
    defaultQuantity: 1,
  });

  const resourceShopItems = buildShopItemsFromItems(randomResources, {
    type: "resource",
    defaultStock: 5,
  });

  const boxShopItems = buildShopItemsFromItems(randomChestes, {
    type: "box",
    defaultStock: 3,
  });

  const items = [
    ...heroShopItems,
    ...equipShopItems,
    ...resourceShopItems,
    ...boxShopItems,
  ];

  return idSuffix
    ? items.map((item) => ({ ...item, id: `${item.id}-${idSuffix}` }))
    : items;
};

export const getShopUnlocksByPlayerLevel = (
  level: number
): { mastery: masteryType; variant: variantsType; stats: number } => {
  const safeLevel = Math.max(1, Math.floor(level));

  return {
    mastery: Math.min(10, Math.max(1, Math.ceil(safeLevel / 5))) as masteryType,
    variant: Math.min(5, Math.max(1, Math.ceil(safeLevel / 10))) as variantsType,
    stats: 999,
  };
};

const getHeroAverageStats = (hero: HeroItem): number => {
  if (!hero.stats.length) return 0;
  const total = hero.stats.reduce((sum, stat) => sum + stat.progress.current, 0);
  return Math.round(total / hero.stats.length);
};

const filterHeroesByProgress = (
  level: number,
  mastery: masteryType,
  variant: variantsType,
  stats: number,
  heroes: HeroItem[],
): HeroItem[] => {
  return heroes
    .filter((hero) => hero.level <= level && hero.variant <= variant && hero.mastery <= mastery && getHeroAverageStats(hero) <= stats)
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      if (a.variant !== b.variant) return a.variant - b.variant;
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      const statsA = getHeroAverageStats(a);
      const statsB = getHeroAverageStats(b);
      if (statsA !== statsB) return statsA - statsB;
      return a.title.localeCompare(b.title);
    });
};

export const buildShopItemsByProgress = ({
  level,
  heroCount,
  equipCount,
  resourceCount,
  boxCount = 0,
  heroItems,
  equipItems,
  resourceItems,
  chestItems,
  idSuffix,
}: BuildShopItemsByProgressOptions): ShopItem[] => {
  const unlocks = getShopUnlocksByPlayerLevel(level);
  const availableHeroes = filterHeroesByProgress(level, unlocks.mastery, unlocks.variant, unlocks.stats, heroItems);
  const availableEquip = equipItems
    .filter((item) => item.level <= level && item.mastery <= unlocks.mastery && item.variant <= unlocks.variant);
  const availableResources = resourceItems
    .filter((item) => item.level <= level)
    .sort((a, b) => a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name));
  const availableChestes = chestItems
    .filter((item) => item.level <= level)
    .sort((a, b) => a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name));

  return buildDailyShopItems({
    heroCount,
    equipCount,
    resourceCount,
    boxCount,
    heroItems: availableHeroes.length ? availableHeroes : heroItems,
    equipItems: availableEquip.length ? availableEquip : equipItems,
    resourceItems: availableResources.length ? availableResources : resourceItems,
    chestItems: availableChestes.length ? availableChestes : chestItems,
    idSuffix,
  });
};

@Injectable({ providedIn: "root" })
export class ShopGenerationService {
  buildShopItemsFromItems(items: ShopSourceItem[], options: BuildShopItemsOptions = {}): ShopItem[] {
    return buildShopItemsFromItems(items, options);
  }

  buildShopItemsByProgress(options: BuildShopItemsByProgressOptions): ShopItem[] {
    return buildShopItemsByProgress(options);
  }

  getShopUnlocksByPlayerLevel(level: number): { mastery: masteryType; variant: variantsType; stats: number } {
    return getShopUnlocksByPlayerLevel(level);
  }
}
