/** Economy tuning for completed RDN Adventure and Time Attack levels. */
export const RDN_LEVEL_COIN_REWARDS = {
  byStars: { 1: 5, 2: 20, 3: 50 },
  /** A perfect level remains replayable without permitting its full reward again. */
  perfectReplayCoins: 5,
  rewardedAdMultiplier: 2,
} as const;

export const rdnCoinsForStars = (stars: number): number => RDN_LEVEL_COIN_REWARDS.byStars[Math.max(1, Math.min(3, Math.floor(stars))) as 1 | 2 | 3];
