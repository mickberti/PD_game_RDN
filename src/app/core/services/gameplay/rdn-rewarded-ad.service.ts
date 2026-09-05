import { Injectable } from "@angular/core";

type RewardedAdProvider = { showRdnRewardedAd?: () => Promise<boolean> };

/**
 * Thin boundary for the native rewarded-ad integration.  A reward is never
 * granted merely because the player pressed the button: the provider must
 * resolve `true` after the video has completed.
 */
@Injectable({ providedIn: "root" })
export class RdnRewardedAdService {
  async showLevelCompletionAd(): Promise<boolean> {
    const provider = (globalThis as typeof globalThis & { rdnRewardedAds?: RewardedAdProvider }).rdnRewardedAds;
    if (!provider?.showRdnRewardedAd) return false;
    try { return await provider.showRdnRewardedAd() === true; } catch { return false; }
  }
}
