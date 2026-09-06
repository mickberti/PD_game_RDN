import { RdnActionId } from '../../game/phaser/config/rdn-actions.config';
import { ShopItem } from '../shop.models';
import { AvailabilityWindow } from './event.model';

export const STATISTIC_TYPES = [
  'gamesPlayed', 'impulsesPlayed', 'rotationsPerformed', 'effectsResolved', 'wallsDestroyed',
  'shieldsResolved', 'linksActivated', 'areasTriggered', 'specialOperatorsUsed', 'highestLevelReached',
  'levelsCompleted', 'actionsUsed', 'gemsReset', 'signsInverted', 'impulsesSkipped',
  'corruptionsCleansed', 'chainsBroken', 'timersCompleted', 'mirrorsApplied',
  'amplifiersApplied', 'invertersApplied', 'elementalBypasses',
] as const;

export type StatisticType = typeof STATISTIC_TYPES[number];

export type StatisticCategory = 'gameplay' | 'effects' | 'progression';

export interface StatisticDefinition {
  type: StatisticType;
  category: StatisticCategory;
  title: string;
  description: string;
}

export interface GameInventory {
  /** Consumable player actions. The local action catalogue defines their presentation. */
  actions: Partial<Record<RdnActionId, number>>;
}

export interface PurchasedShopItemProgress {
  purchaseCount: number;
  lastPurchasedAt?: string;
}

export interface ActivatedEventProgress {
  activatedAt: string;
  endsAt?: string;
}

export interface TimeShop {
  availability: AvailabilityWindow;
  item: ShopItem[];
}

export interface PlayerShop {
  daily: TimeShop;
  weekly: TimeShop;
  season: TimeShop;
}

export interface GameProgress {
  level: number;
  xp: number;
  coins: number;
  gems: number;
  dust: number;
  inventory: GameInventory;
  shop: PlayerShop;
  statistics: Record<StatisticType, number>;
  gameModeLevels: Record<string, number>;
  /** Best star result for each completed RDN level, grouped by game mode. */
  gameModeLevelStars: Record<string, Record<string, number>>;
  claimedStatisticAwardTiers: Partial<Record<StatisticType, number>>;
  purchasedShopItems?: Record<string, PurchasedShopItemProgress>;
  activatedEvents?: Record<string, ActivatedEventProgress>;
  welcomeBonusClaimed?: boolean;
  lastUpdatedAt: string;
}

export const DEFAULT_GAME_INVENTORY: GameInventory = {
  actions: {},
};

export const DEFAULT_TIME_SHOP: TimeShop = {
	availability: {},
	item: []
}

export const DEFAULT_SHOP: PlayerShop = {
  daily: DEFAULT_TIME_SHOP,
  weekly: DEFAULT_TIME_SHOP,
  season: DEFAULT_TIME_SHOP,
};

export const DEFAULT_PLAYER_STATISTICS: Record<StatisticType, number> = {
  gamesPlayed: 0, impulsesPlayed: 0, rotationsPerformed: 0, effectsResolved: 0, wallsDestroyed: 0,
  shieldsResolved: 0, linksActivated: 0, areasTriggered: 0, specialOperatorsUsed: 0, highestLevelReached: 0,
  levelsCompleted: 0, actionsUsed: 0, gemsReset: 0, signsInverted: 0, impulsesSkipped: 0,
  corruptionsCleansed: 0, chainsBroken: 0, timersCompleted: 0, mirrorsApplied: 0,
  amplifiersApplied: 0, invertersApplied: 0, elementalBypasses: 0,
};

export const DEFAULT_GAME_PROGRESS: GameProgress = {
  level: 1,
  xp: 0,
  coins: 0,
  gems: 0,
  dust: 0,
  statistics: DEFAULT_PLAYER_STATISTICS,
  gameModeLevels: {},
  gameModeLevelStars: {},
  claimedStatisticAwardTiers: {},
  inventory: DEFAULT_GAME_INVENTORY,
  shop: DEFAULT_SHOP,
  activatedEvents: {},
  welcomeBonusClaimed: false,
  lastUpdatedAt: new Date(0).toISOString()
};
