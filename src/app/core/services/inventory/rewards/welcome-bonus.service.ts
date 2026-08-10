import { Injectable, inject } from "@angular/core";

import { WELCOME_BONUS_BOX } from "../../../config/welcome-bonus.config";
import { ChestItem, OpenedRewardItem } from "../../../models/game.models";
import { ChestOpeningService } from "./box-opening.service";
import { GameStateService } from "../../state/game-state.service";
import { InventoryMutationService } from "../inventory-mutation.service";
import { ProgressStoreService } from "../../state/progress-store.service";
import { ChestRewardService } from "./box-reward.service";

@Injectable({ providedIn: "root" })
export class WelcomeBonusService {
  private readonly boxOpening = inject(ChestOpeningService);
  private readonly boxRewards = inject(ChestRewardService);
  private readonly inventoryMutations = inject(InventoryMutationService);
  private readonly progressStore = inject(ProgressStoreService);
  private readonly gameState = inject(GameStateService);

  readonly bonusChest: ChestItem = WELCOME_BONUS_BOX;

  hasClaimed(): boolean {
    return this.gameState.progress().welcomeBonusClaimed === true;
  }

  claim(): OpenedRewardItem[] {
    if (this.hasClaimed()) return [];

    const rewards = this.progressStore.runProgressMutationBatch(() => {
      const rewards = this.boxOpening.openInventoryChest(this.bonusChest, {
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

      rewards.forEach((reward) => this.applyReward(reward));
      this.progressStore.mutateProgress((progress) => ({
        ...progress,
        welcomeBonusClaimed: true,
        lastUpdatedAt: new Date().toISOString(),
      }));
      return rewards;
    });

    void this.progressStore.persistProgressNow().catch(() => undefined);
    return rewards;
  }

  private applyReward(reward: OpenedRewardItem): void {
    const item = reward.item;
    if (reward.rewardType === "box" && item && this.inventoryMutations.isChestItem(item)) {
      this.inventoryMutations.addInventoryChest(item, reward.quantity);
      return;
    }

    this.boxRewards.applyReward(reward);
  }
}
