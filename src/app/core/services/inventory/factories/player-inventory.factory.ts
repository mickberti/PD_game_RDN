import { PLAYER_STATE_CONFIG } from "../../../game/phaser/config/game-variables.config";
import { ChestItem, EquipItem, HeroItem, ResourceItem } from "../../../models/game.models";
import { mockHeroItems } from "../../../models/mock/fantasy/hero-data";
import { recalculateHeroProgression } from "../../progression/level-progression.service";

export interface InitialPlayerInventory {
  resources: ResourceItem[];
  boxes: ChestItem[];
  equip: EquipItem[];
  heroes: HeroItem[];
  selectedHeroId?: string;
}

export interface InitialPlayerInventoryOptions {
  stock?: (min: number, max: number) => number;
  recalculateHero?: (hero: HeroItem) => HeroItem;
}

type CloneableInventoryItem = ResourceItem | ChestItem | EquipItem | HeroItem;

export const cloneInventoryItem = <T extends CloneableInventoryItem>(item: T): T => structuredClone(item);

const cloneInventoryItems = <T extends CloneableInventoryItem>(items: readonly T[]): T[] => items.map(cloneInventoryItem);

const defaultStock = (min: number, max: number): number => {
  return crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1) + min;
};

const withInitialStock = <T extends ResourceItem | ChestItem>(items: readonly T[], stock: (min: number, max: number) => number): T[] => {
  const { min, max } = PLAYER_STATE_CONFIG.initialStackStockRange;

  return items
    .map((item) => ({
      ...cloneInventoryItem(item),
      stock: stock(min, max),
    }))
    .filter(({ stock: itemStock }) => itemStock > 0);
};

export const createInitialPlayerInventory = (
  mock: { resourceItemsPlayer: readonly ResourceItem[]; chestItemsPlayer: readonly ChestItem[]; equipItemPlayer: readonly EquipItem[]; heroesPlayer: readonly HeroItem[] },
  options: InitialPlayerInventoryOptions = {},
): InitialPlayerInventory => {
  const stock = options.stock ?? defaultStock;
  const recalculateHero = options.recalculateHero ?? recalculateHeroProgression;
  const sourceHeroes = mock.heroesPlayer.length > 0 ? mock.heroesPlayer : mockHeroItems;
  const heroes = sourceHeroes
    .slice(0, PLAYER_STATE_CONFIG.initialHeroCount)
    .map((hero) => recalculateHero(cloneInventoryItem(hero)));

  return {
    resources: withInitialStock(mock.resourceItemsPlayer, stock),
    boxes: withInitialStock(mock.chestItemsPlayer, stock),
    equip: cloneInventoryItems(mock.equipItemPlayer.slice(0, PLAYER_STATE_CONFIG.initialEquipCount)),
    heroes,
    selectedHeroId: heroes[0]?.id,
  };
};
