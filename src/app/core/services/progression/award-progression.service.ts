import { Injectable } from '@angular/core';

import { AwardItem } from '../../models/game.models';
import { GameProgress, StatisticType } from '../../models/remote/progress.models';

@Injectable({ providedIn: 'root' })
export class AwardProgressionService {
  resolveVisibleAwards(awards: AwardItem[], progress: GameProgress, type?: string): AwardItem[] {
    const groupedAwards = awards
      .filter((award) => !type || award.type === type)
      .reduce((groups, award) => {
        const statisticType = award.statisticDefinition.type;
        return {
          ...groups,
          [statisticType]: [...(groups[statisticType] ?? []), award],
        };
      }, {} as Partial<Record<StatisticType, AwardItem[]>>);

    const visibleAwards: AwardItem[] = [];

    for (const [statisticType, statisticAwards] of Object.entries(groupedAwards) as [StatisticType, AwardItem[]][]) {
      const claimedTier = progress.claimedStatisticAwardTiers[statisticType as StatisticType] ?? 0;
      const sortedAwards = [...(statisticAwards ?? [])].sort((first, second) => (first.progress?.total ?? 0) - (second.progress?.total ?? 0));
      const nextAward = sortedAwards[claimedTier] ?? sortedAwards[sortedAwards.length - 1];

      if (nextAward) {
        visibleAwards.push(this.resolveAward(nextAward, progress));
      }
    }

    return visibleAwards;
  }

  resolveAward(award: AwardItem, progress: GameProgress): AwardItem {
    const statisticType = award.statisticDefinition.type;
    const total = award.progress?.total ?? 1;
    const current = progress.statistics[statisticType] ?? 0;
    const tierIndex = this.getAwardTierIndex(award.id);
    const claimedTier = progress.claimedStatisticAwardTiers[statisticType] ?? 0;
    const isClaimed = tierIndex > 0 && claimedTier >= tierIndex;

    return {
      ...award,
      progress: {
        descr: award.statisticDefinition.description,
        current: Math.min(current, total),
        total,
      },
      state: isClaimed ? 'received' : current >= total ? 'collect' : 'locked',
      reward: award.reward ? { ...award.reward, frame: { ...award.reward.frame } } : award.reward,
      frame: award.frame ? { ...award.frame } : award.frame,
      framePanel: award.framePanel ? { ...award.framePanel } : award.framePanel,
    };
  }

  claimAward(progress: GameProgress, award: AwardItem): GameProgress {
    const statisticType = award.statisticDefinition.type;
    const tierIndex = this.getAwardTierIndex(award.id);

    return {
      ...progress,
      claimedStatisticAwardTiers: {
        ...progress.claimedStatisticAwardTiers,
        [statisticType]: Math.max(progress.claimedStatisticAwardTiers[statisticType] ?? 0, tierIndex),
      },
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  private getAwardTierIndex(id: string): number {
    const parts = id.split('-');
    const value = Number(parts[parts.length - 1]);
    return Number.isFinite(value) ? value : 0;
  }
}
