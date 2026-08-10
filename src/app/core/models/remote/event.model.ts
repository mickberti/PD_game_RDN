import { FrameItem, PriceItem, RewardItem } from "../game.models";

export type ResetType = 'daily' | 'event' | 'never' | 'interval';
export type EventType = 'highlight' | 'seasonal' | 'daily' | 'tournament';
export type EventMode = 'solo' | 'coop' | 'pvp';
export type AvailabilityStatus = 'active' | 'upcoming' | 'past';
export type RuleType = 'xpRewardMultiplier' | 'gemRewardMultiplier' | 'coinRewardMultiplier' | 'attackGameMultiplier' | 'defenceGameMultiplier' | 'specialGameMultiplier';

export interface ResetPolicy {
  type: ResetType;
  intervalHours?: number;
}

export interface AvailabilityWindow {
  startAt?: string;
  endAt?: string;
  weekdays?: number[];
  weeksOfYear?: number[];
}

export interface DurationWindow {
  startAt?: string;
  endAt?: string;
  hours?: number;
  days?: number;
  event?: boolean;
}

export interface EventBanner {
  imageUrl: string;
  ctaRoute: string;
}



export interface RuleItem {
  frame: FrameItem;
  type: RuleType;
  amount: number;
}

/** @deprecated Use RuleItem[]. */
export interface EventRules {
  xpRewardMultiplier?: number;
  gemRewardMultiplier?: number;
  coinRewardMultiplier?: number;
  attackGameMultiplier?: number;
  defenceGameMultiplier?: number;
  specialGameMultiplier?: number;
}

export interface GameEvent {
  id: string;
  title: string;
  subtitle?: string;
  framePanel?: FrameItem;
  frame?: FrameItem;
  enabled: boolean;
  priority: number;
  type?: EventType;
  mode?: EventMode;
  reset?: ResetPolicy;
  priceItem?: PriceItem;
  reward?: RewardItem[];
  banner?: EventBanner;
  invertText?: boolean;
  rules?: RuleItem[];
  availability?: AvailabilityWindow;
  duration?: DurationWindow;
}

export function resolveEventAvailability(event: GameEvent): AvailabilityWindow {
  return event.availability ?? {};
}
