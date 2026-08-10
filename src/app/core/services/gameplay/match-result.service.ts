import { Injectable, inject } from '@angular/core';

import { ChestItem } from '../../models/game.models';
import { StatisticType } from '../../models/remote/progress.models';
import { GameResult } from '../../models/phaser-game-state.model';
import { GameStateService } from '../state/game-state.service';
import { InventoryMutationService } from '../inventory/inventory-mutation.service';
import { StatisticProgressService } from '../progression/statistic-progress.service';
import { EventActivationService } from '../progression/event-activation.service';

const LAST_MATCH_RESULT_STORAGE_KEY = 'lastMatchResultDetails';

export interface MatchRewardBreakdown {
  collectedCoins: number;
  bonusCoins: number;
  collectedGems: number;
  bonusGems: number;
  boxes: number;
  boxName?: string;
}

export interface MatchResultDetails {
  result: GameResult;
  modeId: string;
  matchLevel: number;
  reward: MatchRewardBreakdown;
  statisticsIncremented: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class MatchResultService {
  private readonly state = inject(GameStateService);
  private readonly inventory = inject(InventoryMutationService);
  private readonly statistics = inject(StatisticProgressService);
  private readonly eventActivation = inject(EventActivationService);

  private lastDetails: MatchResultDetails | null = null;

  getLastDetails(): MatchResultDetails | null {
    if (this.lastDetails) {
      return this.lastDetails;
    }

    const persisted = this.readPersistedDetails();
    if (persisted) {
      this.lastDetails = persisted;
    }

    return this.lastDetails;
  }

  completeMatch(result: GameResult, modeId: string, matchLevel: number): MatchResultDetails {
    const normalizedModeId = modeId || 'default';
    const normalizedLevel = Math.max(1, Math.floor(matchLevel || 1));
    const reward = this.calculateReward(result, normalizedLevel);
    const statisticsIncremented = this.buildStatisticIncrements(result, reward);

    this.state.runProgressMutationBatch(() => {
      this.applyCurrencies(reward);
      this.applyBoxReward(reward);
      this.statistics.incrementMany(statisticsIncremented as Partial<Record<StatisticType, number>>);
	  if (result.status === 'win') {
	    this.incrementModeLevel(normalizedModeId);
	  }

    });

    this.lastDetails = {
      result,
      modeId: normalizedModeId,
      matchLevel: normalizedLevel,
      reward,
      statisticsIncremented,
    };
    this.persistLastDetails(this.lastDetails);

    return this.lastDetails;
  }

  private persistLastDetails(details: MatchResultDetails): void {
    try {
      sessionStorage.setItem(LAST_MATCH_RESULT_STORAGE_KEY, JSON.stringify(details));
    } catch {
      // Ignore storage errors and keep the in-memory fallback.
    }
  }

  private readPersistedDetails(): MatchResultDetails | null {
    try {
      const raw = sessionStorage.getItem(LAST_MATCH_RESULT_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as MatchResultDetails;
    } catch {
      return null;
    }
  }

  private calculateReward(result: GameResult, matchLevel: number): MatchRewardBreakdown {
    const treasures = result.treasuresCollected ?? Math.floor((result.score ?? 0) / 10);
    const scoreProgress = Math.max(0, Math.floor((result.score ?? 0) / 10));
    const winMultiplier = result.status === 'win' ? 1 : 0;

    const progress = this.state.progress();
    const events = this.state.events();
    const coinMultiplier = this.eventActivation.ruleMultiplier(events, progress, 'coinRewardMultiplier');
    const gemMultiplier = this.eventActivation.ruleMultiplier(events, progress, 'gemRewardMultiplier');

    return {
      collectedCoins: Math.floor(treasures * 5 * coinMultiplier),
      collectedGems: Math.floor(Math.floor(treasures / 5) * gemMultiplier),
      bonusCoins: Math.floor(winMultiplier * (100 + matchLevel * 25 + scoreProgress) * coinMultiplier),
      bonusGems: Math.floor(winMultiplier * (Math.floor(matchLevel / 2) + Math.floor((result.score ?? 0) / 250)) * gemMultiplier),
      boxes: winMultiplier * (matchLevel % 5 === 0 ? 2 : 1),
      boxName: this.firstChest()?.name,
    };
  }

  private buildStatisticIncrements(result: GameResult, reward: MatchRewardBreakdown): Record<string, number> {
    return {
      enemiesKilled: result.enemiesKilled ?? 0,
      attacksPerformed: result.attacksPerformed ?? 0,
      specialsPerformed: result.specialsPerformed ?? 0,
      damageDealt: result.damageDealt ?? 0,
      damageReceived: result.damageReceived ?? 0,
      blocksPerformed: result.blocksPerformed ?? 0,
      battlesWon: result.status === 'win' ? 1 : 0,
      coinsEarned: reward.collectedCoins + reward.bonusCoins,
      resourcesCollected: reward.boxes,
    };
  }

  private applyCurrencies(reward: MatchRewardBreakdown): void {
    const coinDelta = reward.bonusCoins;
    const gemDelta = reward.bonusGems;
    const progress = this.state.progress();

    this.state.mutateProgress((current) => ({
      ...current,
      coins: progress.coins + coinDelta,
      gems: progress.gems + gemDelta,
      lastUpdatedAt: new Date().toISOString(),
    }));
  }

  private applyBoxReward(reward: MatchRewardBreakdown): void {
    const chest = this.firstChest();
    if (!chest || reward.boxes <= 0) return;
    this.inventory.addInventoryChest(chest, reward.boxes);
  }

  private incrementModeLevel(modeId: string): void {
    this.state.mutateProgress((progress) => ({
      ...progress,
      gameModeLevels: {
        ...(progress.gameModeLevels ?? {}),
        [modeId]: (progress.gameModeLevels?.[modeId] ?? 1) + 1,
      },
      lastUpdatedAt: new Date().toISOString(),
    }));
  }

  private firstChest(): ChestItem | undefined {
    return this.state.inventoryChestes()[0] ?? this.state.catalog().boxes[0];
  }
}
