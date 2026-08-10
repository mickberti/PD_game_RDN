import { HeroPowerMultiplier, PriceItem, PriceType, ResourceTypeId } from "../models/game.models";

export interface CurrencyPricingConfig {
  frame: PriceItem["frame"];
  minimumAmount: number;
}

export interface CatalogPricingConfig {
  heroBaseAmount: number;
  heroLevelStep: number;
  heroMasteryStep: number;
  heroVariantStep: number;
  heroCurrency: PriceType;
  equipBaseAmount: number;
  equipIndexStep: number;
  equipVariantStep: number;
  equipCurrency: PriceType;
}

export interface PriceAttributionConfig {
  currencies: Record<PriceType, CurrencyPricingConfig>;
  deleteRefundMultiplier: number;
  shopPriceQuantityReduction: number;
  equipRepairValueMultiplier: number;
  heroHealValueMultiplier: number;
  heroFatigueRecoveryValueMultiplier: number;
  heroFatigueRecoveryCurrency: PriceType;
  catalogPricing: CatalogPricingConfig;
  defaultShop: {
    premiumCurrency: PriceType; standardCurrency: PriceType;
    heroBaseAmount: number; heroLevelStep: number; heroMasteryStep: number; heroVariantStep: number;
    equipBaseAmount: number; equipLevelStep: number; equipMasteryStep: number; equipVariantStep: number; equipExperienceStep: number;
    boxBaseAmount: number; boxLevelStep: number; boxMasteryStep: number;
    resourceBaseAmount: number; resourceLevelStep: number; resourceMasteryStep: number;
  };
}

export interface LevelProgressionFactors {
  baseExperience: number;
  experienceExponent: number;
  baseCoinCost: number;
  costGrowthFactor: number;
  baseResourceCost: number;
  resourceGrowthFactor: number;
}

export const PRICE_ATTRIBUTION_CONFIG: PriceAttributionConfig = {
  currencies: {
    coin: { frame: { name: "coin_single", effect: "none" }, minimumAmount: 1 },
    gem: { frame: { name: "crystal_single", effect: "none" }, minimumAmount: 1 },
    dust: { frame: { name: "magic_dust_single", effect: "none" }, minimumAmount: 1 },
  },
  deleteRefundMultiplier: 0.5, shopPriceQuantityReduction: 0.75,
  equipRepairValueMultiplier: 0.25, heroHealValueMultiplier: 0.05,
  heroFatigueRecoveryValueMultiplier: 0.08, heroFatigueRecoveryCurrency: "dust",
  catalogPricing: { heroBaseAmount: 800, heroLevelStep: 80, heroMasteryStep: 220, heroVariantStep: 1250, heroCurrency: "dust", equipBaseAmount: 550, equipIndexStep: 620, equipVariantStep: 1850, equipCurrency: "gem" },
  defaultShop: { premiumCurrency: "gem", standardCurrency: "coin", heroBaseAmount: 800, heroLevelStep: 80, heroMasteryStep: 220, heroVariantStep: 1250, equipBaseAmount: 550, equipLevelStep: 85, equipMasteryStep: 620, equipVariantStep: 1850, equipExperienceStep: 3, boxBaseAmount: 400, boxLevelStep: 0, boxMasteryStep: 1100, resourceBaseAmount: 150, resourceLevelStep: 350, resourceMasteryStep: 650 },
};

export const HERO_LEVEL_FACTORS: LevelProgressionFactors = { baseExperience: 100, experienceExponent: 1.42, baseCoinCost: 140, costGrowthFactor: 1.18, baseResourceCost: 8, resourceGrowthFactor: 1.22 };
export const EQUIP_LEVEL_FACTORS: LevelProgressionFactors = { baseExperience: 80, experienceExponent: 1.38, baseCoinCost: 95, costGrowthFactor: 1.16, baseResourceCost: 8, resourceGrowthFactor: 1.2 };
export const HERO_STAT_FACTORS: LevelProgressionFactors = { baseExperience: 0, experienceExponent: 1, baseCoinCost: 70, costGrowthFactor: 1.12, baseResourceCost: 4, resourceGrowthFactor: 1.16 };

export const PROGRESSION_RESOURCE_CONFIG = {
  heroHealthLevelBase: 20, heroHealthLevelInitialRatio: 1, heroHealthMasteryBase: 20, heroHealthMasteryInitialRatio: 1, heroHealthVariantBase: 20, heroHealthVariantInitialRatio: 1,
  heroManaMasteryBase: 10, heroManaMasteryInitialRatio: 1, heroManaLevelBase: 10, heroManaLevelInitialRatio: 1, heroManaVariantBase: 10, heroManaVariantInitialRatio: 1,
  heroFatigueMasteryBase: 12, heroFatigueMasteryInitialRatio: 0, heroFatigueLevelBase: 12, heroFatigueLevelInitialRatio: 0, heroFatigueVariantBase: 12, heroFatigueVariantInitialRatio: 0,
  resourceGrowthPerLevel: 0.18, heroHealthConstitutionMultiplier: 2, heroManaIntelligenceMultiplier: 1.5, heroFatigueCharismaMultiplier: 2, heroExperienceWisdomMultiplier: 10,
  heroAttackStrengthMultiplier: 1.2, heroDefenseConstitutionMultiplier: 1.1, heroSpeedDexterityMultiplier: 1, equipUpgradeStatMultiplier: 1.08, equipUpgradeFlatBonus: 1, defaultEquipDurationUseAmount: 1,
};

export const PLAYER_STATE_CONFIG = {
  initialCoins: 56090, initialGems: 4200, initialDust: 50,
  initialResources: { res1: 0, res2: 0 } as Record<ResourceTypeId, number>, initialStage: 1350, initialScore: 507,
  maxInventoryItemsPerCategory: 20, initialStackStockRange: { min: 0, max: 5 }, initialEquipCount: 8, initialHeroCount: 10,
};

export const HERO_POWER_CONFIG = {
  defaultStatTotal: 100, equipAttackWeight: 2.4, equipDefenseWeight: 2, equipLevelWeight: 3, equipExperienceWeight: 25, equipDurationWeight: 12,
  heroLevelWeight: 45, heroStatsWeight: 6, heroResourceWeight: 30,
  defaultMultipliers: [{ id: "base-combat-rating", title: "Moltiplicatore base potenza", value: 1 }] as HeroPowerMultiplier[],
};

export const HERO_FATIGUE_GAMEPLAY_CONFIG = {
  matchCompletionAmount: 6, normalAttackAmount: 1, specialAttackAmount: 3, restRecoveryAmount: 12,
  restPeriodMs: 60 * 60 * 1000, fullRestBaseMs: 2 * 60 * 60 * 1000,
  fullRestLevelPercentPerLevel: 0.01, fullRestStrengthPercentPerPoint: 0.005, fullRestMinimumBaseMultiplier: 0.35,
};
