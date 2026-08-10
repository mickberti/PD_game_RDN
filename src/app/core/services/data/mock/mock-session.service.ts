import { Injectable } from "@angular/core";

import { ChestItem, EquipItem, HeroItem, ResourceItem } from "../../../models/game.models";
import { ShopItem } from "../../../models/shop.models";
import { getChestItemsByLevel } from "../../../models/mock/fantasy/box-data";
import { getEquipItemsByLevelAndMasteryAndType } from "../../../models/mock/fantasy/equip-data";
import { getHeroItemsByLevelAndMasteryAndVariantAndStats } from "../../../models/mock/fantasy/hero-data";
import { getResourceItemsByLevel } from "../../../models/mock/fantasy/resource-data";
import { buildShopItemsByProgress } from "../../../models/mock/fantasy/shop-data";
import { GameUtilsService } from "../../ui/formatting/game-utils.service";

export interface MockSessionData {
  shop: ShopItem[];
  heroesPlayer: HeroItem[];
  heroesStore: HeroItem[];
  equipItemPlayer: EquipItem[];
  equipItemStore: EquipItem[];
  resourceItemsPlayer: ResourceItem[];
  resourceItemsStore: ResourceItem[];
  chestItemsPlayer: ChestItem[];
  chestItemsStore: ChestItem[];
}

@Injectable({ providedIn: "root" })
export class MockSessionService {
  createFantasySession(): MockSessionData {
    return {
      shop: this.createDefaultShop(),
      heroesPlayer: GameUtilsService.getRandomItemsFromList(
        getHeroItemsByLevelAndMasteryAndVariantAndStats(1, 1, 1, 20),
        10,
      ),
      heroesStore: GameUtilsService.getRandomItemsFromList(
        getHeroItemsByLevelAndMasteryAndVariantAndStats(5, 1, 2, 35),
        3,
      ),
      equipItemPlayer: this.createPlayerEquip(),
      equipItemStore: this.createStoreEquip(),
      resourceItemsPlayer: GameUtilsService.getRandomItemsFromList(getResourceItemsByLevel(3), 6),
      resourceItemsStore: GameUtilsService.getRandomItemsFromList(getResourceItemsByLevel(12), 4),
      chestItemsPlayer: GameUtilsService.getRandomItemsFromList(getChestItemsByLevel(5), 6),
      chestItemsStore: GameUtilsService.getRandomItemsFromList(getChestItemsByLevel(12), 4),
    };
  }

  createNonFantasySession(): Pick<MockSessionData, "shop" | "equipItemPlayer" | "equipItemStore"> {
    return {
      shop: this.createDefaultShop(),
      equipItemPlayer: this.createPlayerEquip(),
      equipItemStore: this.createStoreEquip(),
    };
  }

  private createDefaultShop(): ShopItem[] {
    return buildShopItemsByProgress({
      level: 5,
      heroCount: 3,
      equipCount: 6,
      resourceCount: 6,
      boxCount: 4,
    });
  }

  private createPlayerEquip(): EquipItem[] {
    return GameUtilsService.getRandomItemsFromList(getEquipItemsByLevelAndMasteryAndType(1, 1, 0), 10);
  }

  private createStoreEquip(): EquipItem[] {
    return GameUtilsService.getRandomItemsFromList(getEquipItemsByLevelAndMasteryAndType(5, 1, 2), 6);
  }
}
