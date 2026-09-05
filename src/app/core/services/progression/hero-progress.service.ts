import { Injectable, inject } from "@angular/core";

import { AttributeType, EquipItem, HeroItem, PriceItem, ResourceItem } from "../../models/game.models";
import { GameStateService } from "../state/game-state.service";
import { InventoryMutationService } from "../inventory/inventory-mutation.service";
import { LevelProgressionService } from "./level-progression.service";
import {
  CurrencyBalances,
  LevelUpgradeCost,
  PricingService,
} from "../economy/pricing.service";
import { StatisticProgressService } from "./statistic-progress.service";
import { GameResult } from "../../models/match-result.model";
import { HERO_FATIGUE_GAMEPLAY_CONFIG } from "../../config/game-progression.config";

@Injectable({ providedIn: "root" })
export class HeroProgressService {
  private readonly gameState = inject(GameStateService);
  private readonly inventoryMutations = inject(InventoryMutationService);
  private readonly levelProgression = inject(LevelProgressionService);
  private readonly pricing = inject(PricingService);
  private readonly statistics = inject(StatisticProgressService);

  private resourceCatalog(): readonly ResourceItem[] {
    const catalogResources = this.gameState.catalog().resources;
    return catalogResources.length ? catalogResources : this.gameState.inventoryResources();
  }

  setSelectedHero(hero: HeroItem): void {
    this.selectHero(hero);
  }

  selectHero(hero: HeroItem): void {
    const selectedHero = this.ensureHeroFatigueRestTimer(
      this.levelProgression.recalculateHeroProgression(hero),
    );
    if (
      this.gameState
        .inventoryHeroes()
        .some((item) => item.id === selectedHero.id)
    ) {
      this.inventoryMutations.updateInventoryHero(
        selectedHero.id,
        selectedHero,
      );
    }
    this.gameState.updateInventory({ selectedHeroId: selectedHero.id });
  }

  getSelectedHero(): HeroItem | undefined {
    return this.gameState.currentHero();
  }

  heroUpgradeCost(hero: HeroItem): LevelUpgradeCost {
    return this.levelProgression.heroUpgradeCost(hero.level, this.resourceCatalog());
  }

  equipUpgradeCost(equip: EquipItem): LevelUpgradeCost {
    return this.levelProgression.equipUpgradeCost(equip.level, this.resourceCatalog());
  }

  heroStatUpgradeCost(
    hero: HeroItem,
    upgradeId: string,
  ): LevelUpgradeCost | null {
    const statId =
      this.levelProgression.heroAttributeIdFromUpgradeId(upgradeId);
    const stat = statId
      ? hero.stats.find((item) => item.id === statId)
      : undefined;
    return stat
      ? this.levelProgression.heroStatUpgradeCost(stat.progress.current, this.resourceCatalog())
      : null;
  }

  heroHealPrice(hero: HeroItem): PriceItem {
    return this.pricing.createHeroHealPrice(hero);
  }

  heroFatigueRecoveryPrice(hero: HeroItem): PriceItem {
    return this.pricing.createHeroFatigueRecoveryPrice(hero);
  }

  heroFatigueFullRecoveryTimeMs(hero: HeroItem): number {
    const resolvedHero = this.resolveHeroFatigueRecovery(hero);
    const currentFatigue = Math.max(0, Math.ceil(resolvedHero.fatigue?.current ?? 0));
    if (currentFatigue <= 0) return 0;

    return this.getHeroFatigueRecoveryRemainingMs(resolvedHero);
  }

  formatHeroFatigueRecoveryTime(hero: HeroItem): string {
    const totalMinutes = Math.ceil(this.heroFatigueFullRecoveryTimeMs(hero) / 60000);
    if (totalMinutes <= 0) return "già recuperata";

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days) parts.push(`${days}g`);
    if (hours) parts.push(`${hours}h`);
    if (minutes || !parts.length) parts.push(`${minutes}m`);
    return parts.join(" ");
  }

  canHealHero(hero: HeroItem): boolean {
    return this.pricing.canAfford(
      this.heroHealPrice(hero),
      this.currencyBalances(),
    );
  }

  canRecoverHeroFatigue(hero: HeroItem): boolean {
    return (hero.fatigue?.current ?? 0) > 0
      && this.getHeroFatigueRecoveryRemainingMs(hero) > 0
      && this.pricing.canAfford(
        this.heroFatigueRecoveryPrice(hero),
        this.currencyBalances(),
      );
  }

  healHero(hero: HeroItem): boolean {
    return this.gameState.runProgressMutationBatch(() => {
      const normalizedHero =
        this.levelProgression.recalculateHeroProgression(hero);
      if (
        !this.canHealHero(normalizedHero) ||
        !this.spend(this.heroHealPrice(normalizedHero))
      )
        return false;
      const healedHero = this.levelProgression.recalculateHeroProgression({
        ...normalizedHero,
        heal: {
          ...(normalizedHero.heal ?? { descr: "Salute", current: 0, total: 1 }),
          current: normalizedHero.heal?.total ?? 1,
        },
      });
      this.inventoryMutations.updateInventoryHero(healedHero.id, healedHero);
      return true;
    });
  }


  recoverHeroFatigueWithPayment(hero: HeroItem): boolean {
    return this.gameState.runProgressMutationBatch(() => {
      const normalizedHero = this.levelProgression.recalculateHeroProgression(hero);
      if (
        !this.canRecoverHeroFatigue(normalizedHero) ||
        !this.spend(this.heroFatigueRecoveryPrice(normalizedHero))
      ) return false;
      this.setHeroFatigue(normalizedHero.id, 0, true);
      return true;
    });
  }

  canRecoverHeroFatigueForFree(hero: HeroItem, now = Date.now()): boolean {
    const normalizedHero = this.levelProgression.recalculateHeroProgression(hero);
    const restEndsAt = normalizedHero.fatigueRest?.endsAt
      ? new Date(normalizedHero.fatigueRest.endsAt).getTime()
      : NaN;

    // I profili creati prima dell'introduzione del timer possono avere fatica
    // residua senza fatigueRest. Senza una scadenza attiva il recupero Ã¨ da
    // considerare concluso, evitando di proporre un pagamento non dovuto.
    return (normalizedHero.fatigue?.current ?? 0) > 0
      && Number.isFinite(restEndsAt)
      && this.getHeroFatigueRecoveryRemainingMs(normalizedHero, now) <= 0;
  }

  ensureHeroFatigueRestTimer(hero: HeroItem, now = Date.now()): HeroItem {
    const normalizedHero = this.levelProgression.recalculateHeroProgression(hero);
    const fatigue = Math.max(0, Math.round(normalizedHero.fatigue?.current ?? 0));
    const restEndsAt = normalizedHero.fatigueRest?.endsAt
      ? new Date(normalizedHero.fatigueRest.endsAt).getTime()
      : NaN;
    if (fatigue <= 0 || Number.isFinite(restEndsAt)) {
      return normalizedHero;
    }

    const heroWithTimer = {
      ...normalizedHero,
      fatigueRest: this.createFatigueRestState(normalizedHero, now),
    };
    this.inventoryMutations.updateInventoryHero(heroWithTimer.id, heroWithTimer);
    return heroWithTimer;
  }

  recoverHeroFatigueForFreeAfterRest(hero: HeroItem, now = Date.now()): boolean {
    return this.gameState.runProgressMutationBatch(() => {
      if (!this.canRecoverHeroFatigueForFree(hero, now)) {
        return false;
      }

      this.setHeroFatigue(hero.id, 0, true);
      return true;
    });
  }

  applyMatchFatigueAndStartRest(heroId: string, currentFatigue: number): void {
    const hero = this.gameState.inventoryHeroes().find((item) => item.id === heroId);
    if (!hero) return;

    const normalizedHero = this.levelProgression.recalculateHeroProgression(hero);
    const total = Math.max(1, normalizedHero.fatigue?.total ?? 1);
    const nextFatigue = Math.max(0, Math.min(Math.round(currentFatigue), total));
    this.inventoryMutations.updateInventoryHero(heroId, {
      fatigue: {
        ...(normalizedHero.fatigue ?? {
          descr: "Stanchezza",
          current: 0,
          total,
        }),
        current: nextFatigue,
      },
      fatigueRest: nextFatigue > 0 ? this.createFatigueRestState(normalizedHero) : undefined,
    });
  }

  resolveHeroFatigueRecovery(hero: HeroItem, now = Date.now()): HeroItem {
    const normalizedHero = this.levelProgression.recalculateHeroProgression(hero);
    const remainingMs = this.getHeroFatigueRecoveryRemainingMs(normalizedHero, now);
    if (remainingMs > 0 || (normalizedHero.fatigue?.current ?? 0) <= 0 || !normalizedHero.fatigueRest) {
      return normalizedHero;
    }

    const recoveredHero = this.levelProgression.recalculateHeroProgression({
      ...normalizedHero,
      fatigue: {
        ...(normalizedHero.fatigue ?? { descr: "Stanchezza", current: 0, total: 1 }),
        current: 0,
      },
      fatigueRest: undefined,
    });

    return recoveredHero;
  }

  getHeroFatigueRecoveryRemainingMs(hero: HeroItem, now = Date.now()): number {
    const restEndsAt = hero.fatigueRest?.endsAt ? new Date(hero.fatigueRest.endsAt).getTime() : NaN;
    if (!Number.isFinite(restEndsAt) || (hero.fatigue?.current ?? 0) <= 0) {
      return 0;
    }
    return Math.max(0, restEndsAt - now);
  }

  canHeroPlay(hero: HeroItem, _now = Date.now()): boolean {
    return (hero.heal?.current ?? 0) > 0
      && (hero.fatigue?.current ?? 0) < (hero.fatigue?.total ?? 1);
  }

  recoverHeroFatigueAfterRest(heroId: string, _restStartedAt: Date | string | number, _restedUntil: Date | string | number = Date.now()): void {
    const hero = this.gameState.inventoryHeroes().find((item) => item.id === heroId);
    if (!hero) return;

    this.ensureHeroFatigueRestTimer(hero);
  }

  canUpgradeHeroLevel(hero: HeroItem): boolean {
    return (
      this.levelProgression.hasHeroExperienceForUpgrade(hero) &&
      this.canAffordLevelUpgradeCost(this.heroUpgradeCost(hero))
    );
  }

  canUpgradeEquipLevel(equip: EquipItem): boolean {
    return (
      this.levelProgression.hasEquipExperienceForUpgrade(equip) &&
      this.canAffordLevelUpgradeCost(this.equipUpgradeCost(equip))
    );
  }

  upgradeHeroLevel(hero: HeroItem): boolean {
    return this.gameState.runProgressMutationBatch(() => {
      if (
        !this.canUpgradeHeroLevel(hero) ||
        !this.spendLevelUpgradeCost(this.heroUpgradeCost(hero))
      )
        return false;
      const upgradedHero = this.levelProgression.upgradeHeroLevel(hero);
      this.inventoryMutations.updateInventoryHero(
        upgradedHero.id,
        upgradedHero,
      );
      return true;
    });
  }

  upgradeEquipLevel(equip: EquipItem): boolean {
    return this.gameState.runProgressMutationBatch(() => {
      if (
        !this.canUpgradeEquipLevel(equip) ||
        !this.spendLevelUpgradeCost(this.equipUpgradeCost(equip))
      )
        return false;

      const upgradedEquip = this.levelProgression.upgradeEquipLevel(equip);
      this.inventoryMutations.updateInventoryEquip(
        upgradedEquip.id,
        upgradedEquip,
      );

      for (const hero of this.gameState.inventoryHeroes()) {
        if (!hero.equip.some((item) => item.id === equip.id)) continue;
        this.inventoryMutations.updateInventoryHero(hero.id, {
          equip: hero.equip.map((item) =>
            item.id === equip.id ? upgradedEquip : item,
          ),
        });
      }

      return true;
    });
  }

  canUpgradeHeroStat(hero: HeroItem, upgradeId: string): boolean {
    const cost = this.heroStatUpgradeCost(hero, upgradeId);
    return (
      !!cost &&
      this.levelProgression.canUpgradeHeroStat(hero, upgradeId) &&
      this.canAffordLevelUpgradeCost(cost)
    );
  }

  upgradeHeroStat(hero: HeroItem, upgradeId: string): boolean {
    return this.gameState.runProgressMutationBatch(() => {
      const cost = this.heroStatUpgradeCost(hero, upgradeId);
      if (
        !cost ||
        !this.levelProgression.canUpgradeHeroStat(hero, upgradeId) ||
        !this.spendLevelUpgradeCost(cost)
      )
        return false;
      const upgradedHero = this.levelProgression.upgradeHeroStat(
        hero,
        upgradeId,
      );
      this.inventoryMutations.updateInventoryHero(
        upgradedHero.id,
        upgradedHero,
      );
      return true;
    });
  }

  equipHero(
    hero: HeroItem,
    equip: EquipItem,
    typeId = equip.type?.id,
  ): boolean {
    if (!typeId || !this.inventoryMutations.canEquipHero(equip)) return false;
    const updatedEquip = hero.equip.some((item) => item.type?.id === typeId)
      ? hero.equip.map((item) => (item.type?.id === typeId ? equip : item))
      : [...hero.equip, equip];
    const equipped = this.inventoryMutations.equipHero(hero, equip, typeId);
    if (equipped) this.selectHero({ ...hero, equip: updatedEquip });
    return equipped;
  }

  unequipHero(hero: HeroItem, equipOrTypeId: EquipItem | string): boolean {
    const typeId =
      typeof equipOrTypeId === "string"
        ? equipOrTypeId
        : equipOrTypeId.type?.id;
    if (!typeId) return false;
    const updatedEquip = hero.equip.filter((item) => item.type?.id !== typeId);
    const unequipped = this.inventoryMutations.unequipHero(hero, equipOrTypeId);
    if (unequipped) this.selectHero({ ...hero, equip: updatedEquip });
    return unequipped;
  }

  canUpgradeEquip(equip: EquipItem): boolean {
    return (
      equip.id !== "none" &&
      this.levelProgression.hasEquipExperienceForUpgrade(equip)
    );
  }

  upgradeEquip(hero: HeroItem, equip: EquipItem): EquipItem | null {
    if (!this.canUpgradeEquip(equip)) return null;

    const upgradedEquip = this.levelProgression.upgradeEquipLevel(equip);
    const updatedEquip = hero.equip.map((current) =>
      current.id === equip.id ? upgradedEquip : current,
    );

    this.gameState.runProgressMutationBatch(() => {
      this.inventoryMutations.updateInventoryEquip(equip.id, upgradedEquip);
      this.inventoryMutations.updateInventoryHero(hero.id, {
        equip: updatedEquip,
      });
      this.selectHero({ ...hero, equip: updatedEquip });
    });

    return upgradedEquip;
  }

  fillAllExperienceForNextLevel(): void {
    const filledEquipById = new Map<string, EquipItem>();

    this.gameState.runProgressMutationBatch(() => {
      const equip = this.gameState.inventoryEquip().map((item) => {
        const filledEquip = this.fillEquipExperienceForNextLevel(item);
        filledEquipById.set(filledEquip.id, filledEquip);
        return filledEquip;
      });

      const heroes = this.gameState.inventoryHeroes().map((hero) =>
        this.fillHeroExperienceForNextLevel({
          ...hero,
          equip: hero.equip.map(
            (equipItem) =>
              filledEquipById.get(equipItem.id) ??
              this.fillEquipExperienceForNextLevel(equipItem),
          ),
        }),
      );

      this.gameState.updateInventory({ equip, heroes });
    });
  }

  breakAllEquipDuration(): void {
    const brokenEquipById = new Map<string, EquipItem>();

    this.gameState.runProgressMutationBatch(() => {
      const equip = this.gameState.inventoryEquip().map((item) => {
        const brokenEquip = this.breakEquipDuration(item);
        brokenEquipById.set(brokenEquip.id, brokenEquip);
        return brokenEquip;
      });

      const heroes = this.gameState.inventoryHeroes().map((hero) =>
        this.levelProgression.recalculateHeroProgression({
          ...hero,
          equip: hero.equip
            .map(
            (equipItem) =>
              brokenEquipById.get(equipItem.id) ??
              this.breakEquipDuration(equipItem),
          )
            .filter((equipItem) => !equipItem.duration || equipItem.duration.current > 0),
        }),
      );

      this.gameState.updateInventory({ equip, heroes });
    });
  }


  applyMatchProgressGains(heroId: string, result: GameResult): void {
    const hero = this.gameState
      .inventoryHeroes()
      .find((item) => item.id === heroId);
    if (!hero) return;

    const heroExperienceGain = this.matchHeroExperienceGain(result);
    const equipExperienceGain = this.matchEquipExperienceGain(result);
    const equipDurationUse = this.matchEquipDurationUse(result);
    if (heroExperienceGain <= 0 && equipExperienceGain <= 0 && equipDurationUse <= 0) return;

    this.gameState.runProgressMutationBatch(() => {
      const equippedIds = new Set(hero.equip.map((heroEquip) => heroEquip.id));
      const equipById = new Map<string, EquipItem>();
      const equip = this.gameState.inventoryEquip().map((item) => {
        const updated = equippedIds.has(item.id)
          ? this.useEquipForMatch(this.addEquipExperience(item, equipExperienceGain), equipDurationUse)
          : item;
        equipById.set(updated.id, updated);
        return updated;
      });

      const heroes = this.gameState.inventoryHeroes().map((item) => {
        const updatedHeroEquip = item.equip
          .map((heroEquip) => equipById.get(heroEquip.id) ?? heroEquip)
          .filter((heroEquip) => !heroEquip.duration || heroEquip.duration.current > 0);
        const withEquip = { ...item, equip: updatedHeroEquip };
        return item.id === heroId
          ? this.addHeroExperience(withEquip, heroExperienceGain)
          : this.levelProgression.recalculateHeroProgression(withEquip);
      });

      this.gameState.updateInventory({ equip, heroes });
    });
  }

  setHeroHealth(heroId: string, currentHealth: number): void {
    const hero = this.gameState
      .inventoryHeroes()
      .find((item) => item.id === heroId);
    if (!hero) return;

    const normalizedHero =
      this.levelProgression.recalculateHeroProgression(hero);
    this.inventoryMutations.updateInventoryHero(heroId, {
      heal: {
        ...(normalizedHero.heal ?? {
          descr: "Salute",
          current: 0,
          total: 1,
        }),
        current: Math.max(
          0,
          Math.min(
            Math.round(currentHealth),
            normalizedHero.heal?.total ?? 1,
          ),
        ),
      },
    });
  }

  setHeroFatigue(heroId: string, currentFatigue: number, clearRestState = false, restartRestTimer = false): void {
    const hero = this.gameState
      .inventoryHeroes()
      .find((item) => item.id === heroId);
    if (!hero) return;

    const normalizedHero =
      this.levelProgression.recalculateHeroProgression(hero);
    const nextFatigue = Math.max(
      0,
      Math.min(
        Math.round(currentFatigue),
        normalizedHero.fatigue?.total ?? 1,
      ),
    );
    const restEndsAt = normalizedHero.fatigueRest?.endsAt
      ? new Date(normalizedHero.fatigueRest.endsAt).getTime()
      : NaN;
    const shouldStartRest = nextFatigue > 0
      && (
        restartRestTimer
        || nextFatigue > (normalizedHero.fatigue?.current ?? 0)
        || !Number.isFinite(restEndsAt)
      );

    this.inventoryMutations.updateInventoryHero(heroId, {
      fatigue: {
        ...(normalizedHero.fatigue ?? {
          descr: "Stanchezza",
          current: 0,
          total: 1,
        }),
        current: nextFatigue,
      },
      fatigueRest: clearRestState || nextFatigue <= 0
        ? undefined
        : shouldStartRest
          ? this.createFatigueRestState(normalizedHero)
          : normalizedHero.fatigueRest,
    });
  }


  private matchHeroExperienceGain(result: GameResult): number {
    const score = Math.max(0, result.score ?? 0);
    const enemies = Math.max(0, result.enemiesKilled ?? 0);
    const treasures = Math.max(0, result.treasuresCollected ?? 0);
    const winBonus = result.status === "win" ? 50 : 0;
    return Math.max(0, Math.round(score / 12 + enemies * 8 + treasures * 5 + winBonus));
  }

  private matchEquipExperienceGain(result: GameResult): number {
    const actions = Math.max(0, result.attacksPerformed ?? 0) + Math.max(0, result.specialsPerformed ?? 0) + Math.max(0, result.blocksPerformed ?? 0);
    const damage = Math.max(0, result.damageDealt ?? 0);
    const winBonus = result.status === "win" ? 20 : 0;
    return Math.max(0, Math.round(actions * 0.5 + damage / 25 + winBonus));
  }

  private matchEquipDurationUse(result: GameResult): number {
    const normalAttacks = Math.max(0, result.attacksPerformed ?? 0);
    const specialAttacks = Math.max(0, result.specialsPerformed ?? 0);
    const damageEvents = Math.max(0, result.damageReceivedEvents ?? (result.damageReceived ? 1 : 0));
    return normalAttacks + specialAttacks + damageEvents;
  }

  private addHeroExperience(hero: HeroItem, amount: number): HeroItem {
    const normalizedHero = this.levelProgression.recalculateHeroProgression(hero);
    const experience = normalizedHero.experience ?? this.levelProgression.createHeroExperienceProgress(normalizedHero.level);
    return this.levelProgression.recalculateHeroProgression({
      ...normalizedHero,
      experience: {
        ...experience,
        current: Math.max(0, experience.current + amount),
      },
    });
  }

  private addEquipExperience(equip: EquipItem, amount: number): EquipItem {
    if (amount <= 0) return equip;
    const experience = equip.experience ?? this.levelProgression.createEquipExperienceProgress(equip.level);
    return {
      ...equip,
      experience: {
        ...experience,
        current: Math.max(0, experience.current + amount),
      },
    };
  }

  private useEquipForMatch(equip: EquipItem, amount: number): EquipItem {
    return amount > 0 ? this.levelProgression.useEquipDuration(equip, amount) : equip;
  }

  private createFatigueRestState(hero: HeroItem, startedAt = Date.now()) {
    const durationMs = this.heroFatigueRestDurationMs(hero);
    return {
      startedAt: new Date(startedAt).toISOString(),
      endsAt: new Date(startedAt + durationMs).toISOString(),
      durationMs,
    };
  }

  private heroFatigueRestDurationMs(hero: HeroItem): number {
    const strength = this.heroStatValue(hero, "Forza");
    const levelPercent = hero.level * HERO_FATIGUE_GAMEPLAY_CONFIG.fullRestLevelPercentPerLevel;
    const strengthPercent = strength * HERO_FATIGUE_GAMEPLAY_CONFIG.fullRestStrengthPercentPerPoint;
    const multiplier = Math.max(
      HERO_FATIGUE_GAMEPLAY_CONFIG.fullRestMinimumBaseMultiplier,
      1 + levelPercent - strengthPercent,
    );
    return Math.round(HERO_FATIGUE_GAMEPLAY_CONFIG.fullRestBaseMs * multiplier);
  }

  private heroStatValue(hero: HeroItem, statId: AttributeType): number {
    const stat = hero.stats.find((item) => item.id === statId);
    return Math.max(0, (stat?.progress.current ?? 0) + (stat?.bonus ?? 0) - (stat?.malus ?? 0));
  }

  private currencyBalances(): CurrencyBalances {
    return {
      coin: this.gameState.coins(),
      gem: this.gameState.gems(),
      dust: this.gameState.dusts(),
    };
  }

  private spend(price?: PriceItem): boolean {
    if (!price) return false;
    const balances = this.pricing.debit(price, this.currencyBalances());
    if (!balances) return false;
    const currentProgress = this.gameState.progress();
    this.gameState.updateProgress({
      ...currentProgress,
      coins: balances.coin,
      gems: balances.gem,
      dust: balances.dust,
      lastUpdatedAt: new Date().toISOString(),
    });
    return true;
  }

  private canAffordLevelUpgradeCost(cost: LevelUpgradeCost): boolean {
    return this.pricing.canAffordLevelUpgradeCost(
      cost,
      this.currencyBalances(),
      (resourceId) => this.resourceStock(resourceId),
    );
  }

  private spendLevelUpgradeCost(cost: LevelUpgradeCost): boolean {
    if (cost.coin) return this.spend(cost.coin);
    if (cost.resource)
      return this.inventoryMutations.spendInventoryResource(cost.resource);
    return true;
  }

  private resourceStock(resourceId: string): number {
    return (
      this.gameState.inventoryResources().find((item) => item.id === resourceId)
        ?.stock ?? 0
    );
  }

  private fillHeroExperienceForNextLevel(hero: HeroItem): HeroItem {
    const experience =
      hero.experience ??
      this.levelProgression.createHeroExperienceProgress(hero.level);
    return this.levelProgression.recalculateHeroProgression({
      ...hero,
      experience: {
        ...experience,
        current: experience.total,
      },
    });
  }

  private fillEquipExperienceForNextLevel(equip: EquipItem): EquipItem {
    return {
      ...equip,
      experience: {
        ...equip.experience,
        current: equip.experience.total,
      },
    };
  }

  private breakEquipDuration(equip: EquipItem): EquipItem {
    return {
      ...equip,
      duration: {
        ...equip.duration,
        current: 0,
      },
    };
  }
}
