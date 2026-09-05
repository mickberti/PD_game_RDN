import { ShopItem } from "../../models/shop.models";
import { Injectable, inject } from "@angular/core";

import { CHEST_TYPES, ChestItem, ChestTypeId, EquipItem, HeroItem, PriceItem, RESOURCE_TYPES, ResourceItem, ResourceTypeId,  } from "../../models/game.models";
import { GameProgress } from "../../models/remote/progress.models";
import { GameStateService } from "../state/game-state.service";
import { CurrencyBalances, LevelResourceCost } from "../economy/pricing.service";
import { LevelProgressionService } from "../progression/level-progression.service";
import { PricingService } from "../economy/pricing.service";
import { StatisticProgressService } from "../progression/statistic-progress.service";

@Injectable({ providedIn: "root" })
export class InventoryMutationService {
  private readonly gameState = inject(GameStateService);
  private readonly pricing = inject(PricingService);
  private readonly levelProgression = inject(LevelProgressionService);
  private readonly statistics = inject(StatisticProgressService);

  addInventoryResource(item: ResourceItem, stock = 1): boolean {
    const added = this.addStackableInventoryItem("resources", item, stock);
    return added;
  }

  addInventoryChest(item: ChestItem, stock = 1): boolean {
    return this.addStackableInventoryItem("boxes", item, stock);
  }

  addInventoryEquip(item: EquipItem): boolean {
    if (
      this.gameState.inventoryEquip().length >=
      this.gameState.maxInventoryItemsPerCategory
    )
      return false;
    this.gameState.updateInventory({
      equip: [...this.gameState.inventoryEquip(), { ...item }],
    });
    return true;
  }

  addInventoryHero(item: HeroItem): boolean {
    if (
      this.gameState.inventoryHeroes().length >=
      this.gameState.maxInventoryItemsPerCategory
    )
      return false;
    const hero = this.levelProgression.recalculateHeroProgression(item);
    this.gameState.updateInventory({
      heroes: [...this.gameState.inventoryHeroes(), hero],
    });
    return true;
  }

  updateInventoryHero(id: string, patch: Partial<HeroItem>): void {
    const existing = this.gameState
      .inventoryHeroes()
      .find((item) => item.id === id);
    if (!existing) return;
    this.replaceInventoryHero(
      this.levelProgression.recalculateHeroProgression({
        ...existing,
        ...patch,
      }),
    );
  }

  updateInventoryEquip(id: string, patch: Partial<EquipItem>): void {
    this.gameState.updateInventory({
      equip: this.gameState
        .inventoryEquip()
        .map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  equipRepairPrice(equip: EquipItem): PriceItem {
    return this.pricing.createEquipRepairPrice(equip);
  }

  canRepairEquip(equip: EquipItem): boolean {
    return (
      equip.duration.current <= 0 &&
      this.pricing.canAfford(
        this.equipRepairPrice(equip),
        this.currencyBalances(),
      )
    );
  }

  canEquipHero(equip: EquipItem): boolean {
    return !equip.duration || equip.duration.current > 0;
  }

  repairEquip(equip: EquipItem): boolean {
    return this.gameState.runProgressMutationBatch(() => {
      if (
        !this.canRepairEquip(equip) ||
        !this.spend(this.equipRepairPrice(equip))
      )
        return false;

      const repairedEquip: EquipItem = {
        ...equip,
        duration: {
          ...equip.duration,
          current: equip.duration.total,
        },
      };

      this.updateInventoryEquip(equip.id, repairedEquip);

      for (const hero of this.gameState.inventoryHeroes()) {
        if (!hero.equip.some((item) => item.id === equip.id)) continue;
        this.updateInventoryHero(hero.id, {
          equip: hero.equip.map((item) =>
            item.id === equip.id ? repairedEquip : item,
          ),
        });
      }

      return true;
    });
  }

  equipHero(
    hero: HeroItem,
    equip: EquipItem,
    typeId = equip.type?.id,
  ): boolean {
    if (!typeId || !this.canEquipHero(equip)) return false;
    const updatedEquip = hero.equip.some((item) => item.type?.id === typeId)
      ? hero.equip.map((item) => (item.type?.id === typeId ? equip : item))
      : [...hero.equip, equip];
    this.updateInventoryHero(hero.id, { equip: updatedEquip });
    return true;
  }

  unequipHero(hero: HeroItem, equipOrTypeId: EquipItem | string): boolean {
    const typeId =
      typeof equipOrTypeId === "string"
        ? equipOrTypeId
        : equipOrTypeId.type?.id;
    if (!typeId) return false;
    const updatedEquip = hero.equip.filter((item) => item.type?.id !== typeId);
    if (updatedEquip.length === hero.equip.length) return false;
    this.updateInventoryHero(hero.id, { equip: updatedEquip });
    return true;
  }

  removeInventoryEquip(id: string): void {
    this.gameState.runProgressMutationBatch(() => {
      this.gameState.updateInventory({
        equip: this.gameState.inventoryEquip().filter((item) => item.id !== id),
      });
      this.unequipInventoryItemFromHeroes(id);
    });
  }

  removeInventoryHero(id: string): void {
    const heroes = this.gameState
      .inventoryHeroes()
      .filter((item) => item.id !== id);
    this.gameState.updateInventory({
      heroes,
      selectedHeroId:
        this.gameState.currentHero()?.id === id
          ? heroes[0]?.id
          : this.gameState.progress().inventory.selectedHeroId,
    });
  }

  deleteInventoryEquipWithRefund(id: string): boolean {
    const item = this.gameState
      .inventoryEquip()
      .find((current) => current.id === id);
    if (!item) return false;
    const balances = this.pricing.credit(
      this.inventoryItemRefundPrice(item),
      this.currencyBalances(),
    );
    const currentProgress = this.gameState.progress();
    const equip = this.gameState
      .inventoryEquip()
      .filter((current) => current.id !== id);
    const heroes = this.gameState
      .inventoryHeroes()
      .map((hero) =>
        hero.equip.some((equipItem) => equipItem.id === id)
          ? this.levelProgression.recalculateHeroProgression({
              ...hero,
              equip: hero.equip.filter((equipItem) => equipItem.id !== id),
            })
          : hero,
      );
    this.gameState.setProgress({
      ...currentProgress,
      coins: balances.coin,
      gems: balances.gem,
      dust: balances.dust,
      inventory: { ...currentProgress.inventory, equip, heroes },
      lastUpdatedAt: new Date().toISOString(),
    });
    return true;
  }

  deleteInventoryHeroWithRefund(id: string): boolean {
    const item = this.gameState
      .inventoryHeroes()
      .find((current) => current.id === id);
    if (!item) return false;
    const balances = this.pricing.credit(
      this.inventoryItemRefundPrice(item),
      this.currencyBalances(),
    );
    const currentProgress = this.gameState.progress();
    const heroes = this.gameState
      .inventoryHeroes()
      .filter((current) => current.id !== id);
    this.gameState.setProgress({
      ...currentProgress,
      coins: balances.coin,
      gems: balances.gem,
      dust: balances.dust,
      inventory: {
        ...currentProgress.inventory,
        heroes,
        selectedHeroId:
          this.gameState.currentHero()?.id === id
            ? heroes[0]?.id
            : currentProgress.inventory.selectedHeroId,
      },
      lastUpdatedAt: new Date().toISOString(),
    });
    return true;
  }

  inventoryItemRefundPrice(item: EquipItem | HeroItem): PriceItem | null {
    return this.pricing.createRefundPrice(
      item,
      this.pricing.config.deleteRefundMultiplier,
    );
  }

  spendInventoryResource(cost: LevelResourceCost): boolean {
    if (this.resourceStock(cost.item.id) < cost.amount) return false;
    this.gameState.updateInventory({
      resources: this.gameState
        .inventoryResources()
        .map((item) =>
          item.id === cost.item.id
            ? { ...item, stock: Math.max((item.stock ?? 0) - cost.amount, 0) }
            : item,
        )
        .filter((item) => (item.stock ?? 0) > 0),
    });
    return true;
  }

  consumeInventoryChest(id: string): void {
    this.gameState.updateInventory({
      boxes: this.gameState
        .inventoryChestes()
        .map((item) =>
          item.id === id
            ? { ...item, stock: Math.max((item.stock ?? 0) - 1, 0) }
            : item,
        )
        .filter((item) => (item.stock ?? 0) > 0),
    });
  }

  isInventoryPresent(shopItem: ShopItem): boolean {
    const item = shopItem.item;
    switch (shopItem.type) {
      case "resource":
        return (
          this.isResourceItem(item) &&
          this.gameState
            .inventoryResources()
            .some((current) => current.id === item.id)
        );
      case "box":
        return (
          this.isChestItem(item) &&
          this.gameState
            .inventoryChestes()
            .some((current) => current.id === item.id)
        );
      case "item":
        return (
          this.isEquipItem(item) &&
          this.gameState
            .inventoryEquip()
            .some(
              (current) =>
                current.id === item.id ||
                current.id.startsWith(`${item.id}-copy-`),
            )
        );
      case "hero":
        return (
          this.isHeroItem(item) &&
          this.gameState
            .inventoryHeroes()
            .some((current) => current.id === item.id)
        );
      default:
        return false;
    }
  }

  canBuyShopItem(shopItem: ShopItem): boolean {
    return !(typeof shopItem.stock === "number" && shopItem.stock <= 0);
  }

  addShopItemToInventory(
    shopItem: ShopItem,
    quantity = shopItem.quantity ?? 1,
  ): boolean {
    if (quantity <= 0 || !this.canBuyShopItem(shopItem)) return false;
    const item = shopItem.item;
    switch (shopItem.type) {
      case "resource":
        return (
          this.isResourceItem(item) && this.addInventoryResource(item, quantity)
        );
      case "box":
        return this.isChestItem(item) && this.addInventoryChest(item, quantity);
      case "item":
        return this.isEquipItem(item) && this.addPurchasedEquipItem(item);
      case "hero":
        return (
          this.isHeroItem(item) &&
          this.addInventoryHero(this.createPurchasedHeroItem(item))
        );
      default:
        return false;
    }
  }

  createInventoryCopyId(baseId: string, existingIds: Set<string>): string {
    if (!existingIds.has(baseId)) return baseId;
    let copyIndex = 1;
    let copyId = `${baseId}-copy-${copyIndex}`;
    while (existingIds.has(copyId)) {
      copyIndex += 1;
      copyId = `${baseId}-copy-${copyIndex}`;
    }
    return copyId;
  }

  cloneHeroItem(item: HeroItem): HeroItem {
    return {
      ...item,
      equip: item.equip.map((equip) => ({ ...equip })),
      stats: item.stats.map((stat) => ({
        ...stat,
        progress: { ...stat.progress },
      })),
    };
  }

  isResourceItem(item: ShopItem["item"]): item is ResourceItem {
    return item.itemType === "resource";
  }

  isChestItem(item: ShopItem["item"]): item is ChestItem {
    return item.itemType === "chest";
  }

  isEquipItem(item: ShopItem["item"]): item is EquipItem {
    return item.itemType === "equip";
  }

  isHeroItem(item: ShopItem["item"]): item is HeroItem {
    return item.itemType === "hero";
  }

  private currencyBalances(): CurrencyBalances {
    return {
      coin: this.gameState.coins(),
      gem: this.gameState.gems(),
      dust: this.gameState.dusts(),
    };
  }

  private spend(price?: PriceItem): boolean {
    if (!price) return false;
    const balances = this.pricing.debit(price, this.currencyBalances());
    if (!balances) return false;
    this.applyCurrencyBalances(balances);
    return true;
  }

  private applyCurrencyBalances(balances: CurrencyBalances): void {
    const currentProgress = this.gameState.progress();
    this.gameState.updateProgress({
      ...currentProgress,
      coins: balances.coin,
      gems: balances.gem,
      dust: balances.dust,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  private replaceInventoryHero(hero: HeroItem): void {
    const selectedHeroId =
      this.gameState.currentHero()?.id === hero.id
        ? hero.id
        : this.gameState.progress().inventory.selectedHeroId;
    this.gameState.updateInventory({
      heroes: this.gameState
        .inventoryHeroes()
        .map((item) => (item.id === hero.id ? hero : item)),
      selectedHeroId,
    });
  }

  private addStackableInventoryItem<T extends ResourceItem | ChestItem>(
    key: "resources" | "boxes",
    item: T,
    stock: number,
  ): boolean {
    if (stock <= 0) return false;
    const items =
      key === "resources"
        ? this.gameState.inventoryResources()
        : this.gameState.inventoryChestes();
    const existingItem = items.find((current) => current.id === item.id);
    if (existingItem) {
      this.gameState.updateInventory({
        [key]: items.map((current) =>
          current.id === item.id
            ? { ...current, stock: (current.stock ?? 0) + stock }
            : current,
        ),
      } as Partial<GameProgress["inventory"]>);
      return true;
    }
    if (items.length >= this.gameState.maxInventoryItemsPerCategory)
      return false;
    this.gameState.updateInventory({
      [key]: [...items, { ...item, stock }],
    } as Partial<GameProgress["inventory"]>);
    return true;
  }


  private createPurchasedHeroItem(item: HeroItem): HeroItem {
    const existingIds = new Set(
      this.gameState.inventoryHeroes().map((current) => current.id),
    );
    return {
      ...this.cloneHeroItem(item),
      id: this.createInventoryCopyId(item.id, existingIds),
    };
  }

  private addPurchasedEquipItem(item: EquipItem): boolean {
    const existingIds = new Set(
      this.gameState.inventoryEquip().map((current) => current.id),
    );
    return this.addInventoryEquip({
      ...item,
      id: this.createInventoryCopyId(item.id, existingIds),
    });
  }

  private unequipInventoryItemFromHeroes(equipId: string): void {
    this.gameState.updateInventory({
      heroes: this.gameState
        .inventoryHeroes()
        .map((hero) =>
          hero.equip.some((equip) => equip.id === equipId)
            ? this.levelProgression.recalculateHeroProgression({
                ...hero,
                equip: hero.equip.filter((equip) => equip.id !== equipId),
              })
            : hero,
        ),
    });
  }

  private resourceStock(resourceId: string): number {
    return (
      this.gameState.inventoryResources().find((item) => item.id === resourceId)
        ?.stock ?? 0
    );
  }
}
