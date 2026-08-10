import { Injectable, inject } from '@angular/core';

import { StatisticType } from '../../models/remote/progress.models';
import { GameStateService } from '../state/game-state.service';

@Injectable({ providedIn: 'root' })
export class StatisticProgressService {
  private readonly gameState = inject(GameStateService);

  increment(type: StatisticType, amount = 1): void {
    this.incrementMany({ [type]: amount });
  }

  incrementMany(updates: Partial<Record<StatisticType, number>>): void {
    const validUpdates = Object.entries(updates)
      .filter(([, amount]) => typeof amount === 'number' && amount > 0) as [StatisticType, number][];

    if (!validUpdates.length) return;

    this.gameState.mutateProgress((progress) => {
      const statistics = { ...progress.statistics };

      for (const [type, amount] of validUpdates) {
        statistics[type] = (statistics[type] ?? 0) + amount;
      }

      return {
        ...progress,
        statistics,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
  }
}
