import { Injectable, inject } from '@angular/core';

import { PriceItem } from '../../models/game.models';
import { GameEvent, resolveEventAvailability, RuleItem, RuleType } from '../../models/remote/event.model';
import { GameProgress } from '../../models/remote/progress.models';
import { PricingService } from '../economy/pricing.service';
import { rewardMaxValue } from '../inventory/rewards/reward-display-policy';
import { isAvailableNow } from '../utils/availability/availability.util';

@Injectable({ providedIn: 'root' })
export class EventActivationService {
  private readonly pricing = inject(PricingService);

  resolvePrice(event: GameEvent): PriceItem {
    if (event.priceItem) {
      return this.pricing.createPrice(event.priceItem.type, event.priceItem.amount);
    }

    const rewardValue = rewardMaxValue(event.reward, 'coins') + rewardMaxValue(event.reward, 'gems') * 25 + rewardMaxValue(event.reward, 'stars') * 10;
    const rulesValue = (event.rules ?? []).reduce((total, rule) => total + Math.max(0, rule.amount - 1) * 200, 0);
    const type = event.type === 'highlight' || event.type === 'seasonal' ? 'gem' : 'coin';
    const divisor = type === 'gem' ? 25 : 1;
    return this.pricing.createPrice(type, Math.max(1, (rewardValue + rulesValue + event.priority) / divisor));
  }

  isAvailableForPurchase(event: GameEvent, now = new Date()): boolean {
    return event.enabled && isAvailableNow(resolveEventAvailability(event), now);
  }

  activationEndsAt(event: GameEvent, activatedAt: string | undefined, now = new Date()): string | undefined {
    if (!activatedAt) return undefined;
    const activated = new Date(activatedAt);
    if (Number.isNaN(activated.getTime())) return undefined;
    if (event.duration?.endAt) return event.duration.endAt;
    if (event.duration?.event) return resolveEventAvailability(event).endAt;

    const durationMs = ((event.duration?.days ?? 0) * 24 + (event.duration?.hours ?? 0)) * 60 * 60 * 1000;
    if (durationMs > 0) return new Date(activated.getTime() + durationMs).toISOString();
    return resolveEventAvailability(event).endAt ?? now.toISOString();
  }

  isActive(event: GameEvent, progress: GameProgress, now = new Date()): boolean {
    const activation = progress.activatedEvents?.[event.id];
    if (!activation?.activatedAt) return false;
    const endsAt = this.activationEndsAt(event, activation.activatedAt, now);
    return !endsAt || now <= new Date(endsAt);
  }

  remainingMs(event: GameEvent, progress: GameProgress, now = new Date()): number {
    const endsAt = this.activationEndsAt(event, progress.activatedEvents?.[event.id]?.activatedAt, now);
    return endsAt ? Math.max(0, new Date(endsAt).getTime() - now.getTime()) : 0;
  }

  canActivate(event: GameEvent, progress: GameProgress, now = new Date()): boolean {
    if (this.isActive(event, progress, now) || !this.isAvailableForPurchase(event, now)) return false;
    return this.pricing.canAfford(this.resolvePrice(event), {
      coin: progress.coins,
      gem: progress.gems,
      dust: progress.dust ?? 0,
    });
  }

  activeRules(events: GameEvent[], progress: GameProgress, now = new Date()): RuleItem[] {
    return events
      .filter((event) => this.isActive(event, progress, now))
      .reduce<RuleItem[]>((rules, event) => rules.concat(event.rules ?? []), []);
  }

  ruleMultiplier(events: GameEvent[], progress: GameProgress, type: RuleType, now = new Date()): number {
    return this.activeRules(events, progress, now)
      .filter((rule) => rule.type === type)
      .reduce((multiplier, rule) => multiplier * rule.amount, 1);
  }

  activate(event: GameEvent, progress: GameProgress, now = new Date()): GameProgress | null {
    if (this.isActive(event, progress, now) || !this.isAvailableForPurchase(event, now)) return null;
    const balances = this.pricing.debit(this.resolvePrice(event), {
      coin: progress.coins,
      gem: progress.gems,
      dust: progress.dust ?? 0,
    });
    if (!balances) return null;

    const coinReward = rewardMaxValue(event.reward, 'coins');
    const gemReward = rewardMaxValue(event.reward, 'gems');
    const activatedAt = now.toISOString();
    const endsAt = this.activationEndsAt(event, activatedAt, now);
    return {
      ...progress,
      coins: balances.coin + coinReward,
      gems: balances.gem + gemReward,
      dust: balances.dust,
      xp: progress.xp,
      activatedEvents: {
        ...(progress.activatedEvents ?? {}),
        [event.id]: { activatedAt, ...(endsAt ? { endsAt } : {}) },
      },
      lastUpdatedAt: activatedAt,
    };
  }
}
