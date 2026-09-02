import { ChestItem, EquipItem, HeroItem, ResourceItem } from '../game.models';
import { ShopItem } from '../shop.models';
import { AvailabilityWindow } from './event.model';
import { RdnActionLoadout } from '../../game/phaser/config/rdn-actions.config';

export const STATISTIC_TYPES = [
  'enemiesKilled',
  'bossKilled',
  'attacksPerformed',
  'specialsPerformed',
  'criticalHits',
  'damageDealt',
  'damageReceived',
  'blocksPerformed',

  'coinsEarned',
  'coinsSpent',
  'resourcesCollected',
  'itemsPurchased',
  'itemsSold',

  'heroLevelsGained',
  'equipmentUpgrades',
  'masteryPointsEarned',
  'heroesUnlocked',
  'equipmentUnlocked',

  'battlesWon',
  'questsCompleted',
] as const;

export type StatisticType = typeof STATISTIC_TYPES[number];

export type StatisticCategory =
  | 'combat'
  | 'economy'
  | 'progression'
  | 'activity';

export interface StatisticDefinition {
  type: StatisticType;
  category: StatisticCategory;
  title: string;
  description: string;
}

export interface GameInventory {
  resources: ResourceItem[];
  boxes: ChestItem[];
  equip: EquipItem[];
  heroes: HeroItem[];
  selectedHeroId?: string;
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
  rdnActionLoadout?: RdnActionLoadout;
  claimedStatisticAwardTiers: Partial<Record<StatisticType, number>>;
  purchasedShopItems?: Record<string, PurchasedShopItemProgress>;
  activatedEvents?: Record<string, ActivatedEventProgress>;
  welcomeBonusClaimed?: boolean;
  lastUpdatedAt: string;
}

export const DEFAULT_GAME_INVENTORY: GameInventory = {
  resources: [],
  boxes: [],
  equip: [],
  heroes: [],
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
  enemiesKilled: 0,
  bossKilled: 0,
  attacksPerformed: 0,
  specialsPerformed: 0,
  criticalHits: 0,
  damageDealt: 0,
  damageReceived: 0,
  blocksPerformed: 0,

  coinsEarned: 0,
  coinsSpent: 0,
  resourcesCollected: 0,
  itemsPurchased: 0,
  itemsSold: 0,

  heroLevelsGained: 0,
  equipmentUpgrades: 0,
  masteryPointsEarned: 0,
  heroesUnlocked: 0,
  equipmentUnlocked: 0,

  battlesWon: 0,
  questsCompleted: 0,
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
