import { Injectable, inject } from "@angular/core";

import { ChestItem, EquipItem, HeroItem, OpenedRewardItem, ResourceItem,  } from "../../../models/game.models";
import { GameStateService } from "../../state/game-state.service";
import { ProgressStoreService } from "../../state/progress-store.service";
import { ChestOpeningService } from "./box-opening.service";
import { InventoryMutationService } from "../inventory-mutation.service";

@Injectable({ providedIn: "root" })
export class ChestRewardService {
  private readonly boxOpening = inject(ChestOpeningService);
  private readonly inventoryMutations = inject(InventoryMutationService);
  private readonly progressStore = inject(ProgressStoreService);
  private readonly gameState = inject(GameStateService);

  openInventoryChest(box: ChestItem): OpenedRewardItem[] {
    if ((box.stock ?? 0) <= 0) return [];

    const rewards = this.progressStore.runProgressMutationBatch(() => {
      const rewards = this.boxOpening.openInventoryChest(box, {
        inventoryEquip: () => this.gameState.inventoryEquip(),
        inventoryHeroes: () => this.gameState.inventoryHeroes(),
        cloneHeroItem: (item) => this.inventoryMutations.cloneHeroItem(item),
        createInventoryCopyId: (baseId, existingIds) =>
          this.inventoryMutations.createInventoryCopyId(baseId, existingIds),
        catalogResources: () => this.gameState.catalog().resources,
        catalogEquip: () => this.gameState.catalog().equip,
        catalogHeroes: () => this.gameState.catalog().heroes,
        catalogChestes: () => this.gameState.catalog().boxes,
      });

      this.applyRewards(rewards);
      this.inventoryMutations.consumeInventoryChest(box.id);
      return rewards;
    });

    void this.progressStore.persistProgressNow().catch(() => undefined);
    return rewards;
  }

  private applyRewards(rewards: OpenedRewardItem[]): void {
    rewards.forEach((reward) => this.applyReward(reward));
  }

  applyReward(reward: OpenedRewardItem): void {
    if (reward.quantity <= 0) return;

    if (reward.rewardType === "coins") {
      this.addCurrencies({ coin: reward.quantity });
      return;
    }

    if (reward.rewardType === "gems") {
      this.addCurrencies({ gem: reward.quantity });
      return;
    }

    if (reward.rewardType === "stars") {
      this.addCurrencies({ dust: reward.quantity });
      return;
    }

    const item = reward.item;
    if (!item) return;

    if (this.inventoryMutations.isResourceItem(item)) {
      this.addResourceReward(item, reward.quantity);
      return;
    }

    if (this.inventoryMutations.isEquipItem(item)) {
      this.inventoryMutations.addInventoryEquip(item as EquipItem);
      return;
    }

    if (this.inventoryMutations.isHeroItem(item)) {
      this.inventoryMutations.addInventoryHero(item as HeroItem);
      return;
    }

    if (this.inventoryMutations.isChestItem(item)) {
      this.inventoryMutations.addInventoryChest(item as ChestItem, reward.quantity);
    }
  }

  private addCurrencies(delta: {
    coin?: number;
    gem?: number;
    dust?: number;
  }): void {
    const balances = {
      coin: this.gameState.coins(),
      gem: this.gameState.gems(),
      dust: this.gameState.dusts(),
    };
    this.updateCurrencyBalances({
      coin: balances.coin + (delta.coin ?? 0),
      gem: balances.gem + (delta.gem ?? 0),
      dust: balances.dust + (delta.dust ?? 0),
    });
  }

  private updateCurrencyBalances(balances: {
    coin: number;
    gem: number;
    dust: number;
  }): void {
    const currentProgress = this.gameState.progress();
    this.gameState.updateProgress({
      ...currentProgress,
      coins: balances.coin,
      gems: balances.gem,
      dust: balances.dust,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  private addResourceReward(item: ResourceItem, quantity: number): void {
    this.inventoryMutations.addInventoryResource(item, quantity);
    this.progressStore.mutateProgress((progress) => ({
      ...progress,
      [item.type.id]:
        ((progress as unknown as Record<string, number>)[item.type.id] ?? 0) +
        quantity,
      lastUpdatedAt: new Date().toISOString(),
    }));
  }
}
