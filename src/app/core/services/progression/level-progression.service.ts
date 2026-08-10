import { Injectable, inject } from "@angular/core";
import { AttributeType, BonusType, EquipItem, EquipType, HeroAttribute, HeroItem, Progress, ResourceItem, ResourceTypeId } from "../../models/game.models";
import { PricingService, type LevelUpgradeCost, type UpgradePricingFactors } from "../economy/pricing.service";
import { EQUIP_LEVEL_FACTORS, HERO_LEVEL_FACTORS, HERO_STAT_FACTORS, PROGRESSION_RESOURCE_CONFIG, type LevelProgressionFactors } from "../../game/phaser/config/game-variables.config";
export type { LevelUpgradeCost } from "../economy/pricing.service";
export type { LevelProgressionFactors } from "../../game/phaser/config/game-variables.config";

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const safeNumber = (value: number | undefined, fallback = 0): number => Number.isFinite(value) ? (value as number) : fallback;
const normalizeLevel = (level: number): number => Math.max(1, Math.floor(safeNumber(level, 1)));
const HERO_STAT_LEVEL_SPAN = 10;
export const maxHeroStatLevelForHeroLevel = (level: number): number => Math.ceil(normalizeLevel(level) / HERO_STAT_LEVEL_SPAN) * HERO_STAT_LEVEL_SPAN;

const VARIANT_LEVEL_SPAN = 20;
const maxLevelForVariant = (variant: number | undefined): number => {
  const normalizedVariant = Math.max(1, Math.floor(safeNumber(variant, 1)));
  return normalizedVariant * VARIANT_LEVEL_SPAN;
};

const getProgressDescr = (current: number, total: number): string => {
  const ratio = total <= 0 ? 0 : current / total;
  if (ratio < 0.35) return "In crescita";
  if (ratio < 0.65) return "Buono";
  if (ratio < 0.85) return "Solido";
  return "Eccellente";
};

const normalizeHeroStatProgress = (stat: HeroAttribute, level: number): HeroAttribute => {
  const maxStatLevel = maxHeroStatLevelForHeroLevel(level);
  const current = clamp(Math.round(safeNumber(stat.progress.current, 1)), 1, maxStatLevel);
  return {
    ...stat,
    progress: {
      ...stat.progress,
      current,
      total: maxStatLevel,
      descr: getProgressDescr(current, maxStatLevel),
    },
  };
};

/**
 * Ricalcola il valore corrente di una statistica quando cambia il livello eroe.
 * Usa lo stesso approccio dei mock: il valore viene derivato dal peso relativo
 * della statistica sul vecchio cap e poi proiettato sul nuovo cap disponibile.
 */
const recalculateHeroStatProgressForLevel = (stat: HeroAttribute, level: number): HeroAttribute => {
  const nextMaxStatLevel = maxHeroStatLevelForHeroLevel(level);
  const previousMaxStatLevel = Math.max(
    1,
    Math.round(safeNumber(stat.progress.total, maxHeroStatLevelForHeroLevel(level - 1))),
  );
  const normalizedWeight = clamp(safeNumber(stat.progress.current, 1) / previousMaxStatLevel, 0, 1);
  const current = clamp(Math.max(1, Math.round(nextMaxStatLevel * normalizedWeight)), 1, nextMaxStatLevel);

  return {
    ...stat,
    progress: {
      ...stat.progress,
      current,
      total: nextMaxStatLevel,
      descr: getProgressDescr(current, nextMaxStatLevel),
    },
  };
};

const EQUIP_TYPE_WEIGHTS: Record<EquipType["id"], { attack: number; defense: number; velocita: number }> = {
  weapon: { attack: 1, defense: 0.05, velocita: 0.15 },
  shield: { attack: 0.05, defense: 1, velocita: -0.1 },
  armor: { attack: 0, defense: 1.2, velocita: -0.2 },
  helmet: { attack: 0.05, defense: 0.55, velocita: 0 },
  ring: { attack: 0.4, defense: 0.4, velocita: 0.35 },
  artifact: { attack: 0.5, defense: 0.25, velocita: 0.25 },
};

const capEquipSpeed = (equip: Pick<EquipItem, "type" | "velocita">, velocita = equip.velocita): number => {
  if (equip.type.id === "armor") return Math.max(velocita, -12);
  if (equip.type.id === "shield") return Math.max(velocita, -8);
  return velocita;
};

const recalculateEquipStatsForLevel = (equip: EquipItem, level: number): Pick<EquipItem, "attack" | "defense" | "velocita"> => {
  const weights = EQUIP_TYPE_WEIGHTS[equip.type.id];
  const currentWeightedPower = Math.max(
    equip.attack / Math.max(weights.attack, 0.01),
    equip.defense / Math.max(weights.defense, 0.01),
    Math.abs(equip.velocita) / Math.max(Math.abs(weights.velocita), 0.01),
    normalizeLevel(equip.level),
  );
  const levelDelta = Math.max(0, normalizeLevel(level) - normalizeLevel(equip.level));
  const variantBonus = safeNumber(equip.variant, 1) * 0.35;
  const nextPower = currentWeightedPower + levelDelta * (1 + variantBonus);

  return {
    attack: Math.max(0, Math.round(nextPower * weights.attack)),
    defense: Math.max(0, Math.round(nextPower * weights.defense)),
    velocita: capEquipSpeed(equip, Math.round(nextPower * weights.velocita)),
  };
};
const upgradeStatIdMap: Record<string, AttributeType> = {
  speed: "Destrezza",
  damage: "Forza",
  income: "Saggezza",
  defense: "Costituzione",
  dexterity: "Intelligenza",
  charisma: "Carisma",
};

/**
 * Calcola l'esperienza richiesta per un livello usando i fattori ricevuti.
 * Normalizza il livello a un intero positivo prima di applicare la curva esponenziale.
 */
export const experienceRequiredForLevelWithFactors = (level: number, factors: LevelProgressionFactors): number => {
  const normalizedLevel = normalizeLevel(level);
  return Math.round(factors.baseExperience * Math.pow(normalizedLevel, factors.experienceExponent));
};

/**
 * Calcola l'esperienza richiesta dal livello eroe indicato al livello successivo.
 * Usa i fattori eroe condivisi dal servizio per mantenere una sola curva XP.
 */
export const experienceRequiredForLevel = (level: number): number => {
  return experienceRequiredForLevelWithFactors(level, HERO_LEVEL_FACTORS);
};

/**
 * Calcola l'esperienza richiesta dal livello equip indicato al livello successivo.
 * Usa i fattori equip condivisi dal servizio per separare il bilanciamento degli oggetti.
 */
export const equipExperienceRequiredForLevel = (level: number): number => {
  return experienceRequiredForLevelWithFactors(level, EQUIP_LEVEL_FACTORS);
};

/**
 * Calcola il totale di una risorsa progressiva, come salute o mana, in base al livello.
 * Applica una crescita lineare controllata dal valore base e protegge da livelli non validi.
 */
export const resourceTotalForLevel = (level: number, base: number): number => {
  const normalizedLevel = normalizeLevel(level);
  return Math.round(base + normalizedLevel * base * PROGRESSION_RESOURCE_CONFIG.resourceGrowthPerLevel);
};

/**
 * Crea una struttura Progress normalizzata e limitata al totale dichiarato.
 * Arrotonda i valori, assicura un totale minimo pari a uno e limita il corrente nel range valido.
 */
export const createProgress = (current: number, total: number, descr = ""): Progress => {
  const normalizedTotal = Math.max(1, Math.round(safeNumber(total, 1)));
  return {
    descr,
    current: clamp(Math.round(safeNumber(current)), 0, normalizedTotal),
    total: normalizedTotal,
  };
};

/**
 * Crea il progresso salute di un eroe per il livello indicato.
 * Se il valore corrente non è fornito, inizializza la salute al massimo calcolato.
 */
export const createHeroHealProgress = (heroLevel: number, heroMaestry: number, heroVariant: number, current?: number): Progress => {
  const total = resourceTotalForLevel(heroLevel, PROGRESSION_RESOURCE_CONFIG.heroHealthLevelBase ) + (heroMaestry * PROGRESSION_RESOURCE_CONFIG.heroHealthMasteryBase)  + (heroVariant * PROGRESSION_RESOURCE_CONFIG.heroHealthVariantBase);
  return createProgress(current ?? Math.round(total * PROGRESSION_RESOURCE_CONFIG.heroHealthLevelInitialRatio), total, "Salute");
};

/**
 * Crea il progresso mana di un eroe per il livello indicato.
 * Se il valore corrente non è fornito, inizializza il mana al massimo calcolato.
 */
export const createHeroManaProgress = (heroLevel: number, heroMaestry: number, heroVariant: number, current?: number): Progress => {
  const total = resourceTotalForLevel(heroLevel, PROGRESSION_RESOURCE_CONFIG.heroManaLevelBase) + (heroMaestry * PROGRESSION_RESOURCE_CONFIG.heroManaMasteryBase)  + (heroVariant * PROGRESSION_RESOURCE_CONFIG.heroManaVariantBase);
  return createProgress(current ?? Math.round(total * PROGRESSION_RESOURCE_CONFIG.heroManaLevelInitialRatio), total, "Mana");
};

/**
 * Crea il progresso stanchezza di un eroe per il livello indicato.
 * Parte da 0 e cresce fino al totale: a barra piena l'eroe è esausto.
 */
export const createHeroFatigueProgress = (heroLevel: number, heroMaestry: number, heroVariant: number, current?: number): Progress => {
  const total = resourceTotalForLevel(heroLevel, PROGRESSION_RESOURCE_CONFIG.heroFatigueLevelBase) + (heroMaestry * PROGRESSION_RESOURCE_CONFIG.heroFatigueMasteryBase)  + (heroVariant * PROGRESSION_RESOURCE_CONFIG.heroFatigueVariantBase);
  return createProgress(current ?? Math.round(total * PROGRESSION_RESOURCE_CONFIG.heroFatigueLevelInitialRatio), total, "Stanchezza");
};

/**
 * Crea il progresso esperienza di un eroe per il livello indicato.
 * Usa la curva XP eroe centralizzata e preserva l'esperienza corrente ricevuta.
 */
export const createHeroExperienceProgress = (level: number, current = 0): Progress => {
  return createProgress(current, experienceRequiredForLevel(level), "Esperienza eroe");
};

/**
 * Crea il progresso esperienza di un equipaggiamento per il livello indicato.
 * Usa la curva XP equip centralizzata e preserva l'esperienza corrente ricevuta.
 */
export const createEquipExperienceProgress = (level: number, current = 0): Progress => {
  return createProgress(current, equipExperienceRequiredForLevel(level), "Esperienza equip");
};

/**
 * Crea il progresso durata di un equipaggiamento.
 * Normalizza totale e corrente, azzerando la durata corrente quando l'input non è positivo.
 */
export const createEquipDurationProgress = (duration: number, total = duration): Progress => {
  const normalizedTotal = Math.max(1, Math.round(safeNumber(total, 1)));
  const normalizedCurrent = duration <= 0 ? 0 : duration;
  return createProgress(normalizedCurrent, normalizedTotal, "Durata");
};


const heroStatValue = (hero: Pick<HeroItem, "stats">, statId: AttributeType): number => {
  const stat = hero.stats.find((item) => item.id === statId);
  return Math.max(0, safeNumber(stat?.progress?.current) + safeNumber(stat?.bonus) - safeNumber(stat?.malus));
};

const statContribution = (value: number, multiplier: number): number => {
  return Math.round(safeNumber(value) * safeNumber(multiplier));
};

const usableEquip = (hero: Pick<HeroItem, "equip">): EquipItem[] => {
  return (hero.equip ?? []).filter((item) => !item.duration || item.duration.current > 0);
};

const activeBonuses = (equip: EquipItem) => equip.bonuses?.length ? equip.bonuses : (equip.bonus ? [equip.bonus] : []);

const bonusValueForType = (equip: EquipItem, type: Exclude<BonusType, "none">): number => {
  return activeBonuses(equip).reduce((total, bonus) => {
    if (bonus.type !== type) return total;
    const value = safeNumber(bonus.value);
    return total + (bonus.malus ? -value : value);
  }, 0);
};

const progressWithDynamicTotal = (base: Progress, current: number | undefined, bonusTotal: number): Progress => {
  const total = base.total + statContribution(bonusTotal, 1);
  return createProgress(current ?? base.current, total, base.descr);
};

export const calculateHeroAttack = (hero: HeroItem): number => {
  const equipTotal = usableEquip(hero).reduce((total, item) => total + safeNumber(item.attack) + bonusValueForType(item, "Attak"), 0);
  const statTotal = statContribution(heroStatValue(hero, "Forza"), PROGRESSION_RESOURCE_CONFIG.heroAttackStrengthMultiplier);
  return Math.max(0, Math.round(equipTotal + statTotal));
};

export const calculateHeroDefense = (hero: HeroItem): number => {
  const equipTotal = usableEquip(hero).reduce((total, item) => total + safeNumber(item.defense) + bonusValueForType(item, "Defence"), 0);
  const statTotal = statContribution(heroStatValue(hero, "Costituzione"), PROGRESSION_RESOURCE_CONFIG.heroDefenseConstitutionMultiplier);
  return Math.max(0, Math.round(equipTotal + statTotal));
};

export const calculateHeroSpeed = (hero: HeroItem): number => {
  const equipTotal = usableEquip(hero).reduce((total, item) => total + safeNumber(item.velocita) + bonusValueForType(item, "velocita"), 0);
  const statTotal = statContribution(heroStatValue(hero, "Destrezza"), PROGRESSION_RESOURCE_CONFIG.heroSpeedDexterityMultiplier);
  return Math.max(0, Math.round(equipTotal + statTotal));
};

export const recalculateHeroProgression = (hero: HeroItem): HeroItem => {
  const normalizedStats = hero.stats.map((stat) => normalizeHeroStatProgress(stat, hero.level));
  const normalizedHero = { ...hero, stats: normalizedStats };
  const constitution = heroStatValue(normalizedHero, "Costituzione");
  const intelligence = heroStatValue(normalizedHero, "Intelligenza");
  const wisdom = heroStatValue(normalizedHero, "Saggezza");
  const charisma = heroStatValue(normalizedHero, "Carisma");
  const baseHeal = createHeroHealProgress(hero.level, hero.mastery, hero.variant, hero.heal?.current);
  const baseMana = createHeroManaProgress(hero.level, hero.mastery, hero.variant, hero.mana?.current);
  const baseFatigue = createHeroFatigueProgress(hero.level, hero.mastery, hero.variant, hero.fatigue?.current);
  const baseExperience = createHeroExperienceProgress(hero.level, hero.experience?.current ?? 0);

  const recalculatedHero: HeroItem = {
    ...normalizedHero,
    heal: progressWithDynamicTotal(
      baseHeal,
      hero.heal?.current,
      statContribution(constitution, PROGRESSION_RESOURCE_CONFIG.heroHealthConstitutionMultiplier),
    ),
    mana: progressWithDynamicTotal(
      baseMana,
      hero.mana?.current,
      statContribution(intelligence, PROGRESSION_RESOURCE_CONFIG.heroManaIntelligenceMultiplier),
    ),
    fatigue: progressWithDynamicTotal(
      baseFatigue,
      hero.fatigue?.current,
      statContribution(charisma, PROGRESSION_RESOURCE_CONFIG.heroFatigueCharismaMultiplier),
    ),
    experience: progressWithDynamicTotal(
      baseExperience,
      hero.experience?.current,
      statContribution(wisdom, PROGRESSION_RESOURCE_CONFIG.heroExperienceWisdomMultiplier),
    ),
  };

  return {
    ...recalculatedHero,
    attack: calculateHeroAttack(recalculatedHero),
    defense: calculateHeroDefense(recalculatedHero),
    velocita: calculateHeroSpeed(recalculatedHero),
  };
};

/**
 * Verifica se l'eroe ha raggiunto il totale esperienza salvato sul Progress.
 * Gestisce in modo sicuro eroi senza progressione esperienza valorizzata.
 */
const canUpgradeHeroLevel = (hero: Pick<HeroItem, "level" | "variant" | "experience">): boolean => {
  return hero.level < maxLevelForVariant(hero.variant) && !!hero.experience && hero.experience.current >= hero.experience.total;
};

/**
 * Restituisce una copia dell'eroe al livello successivo quando l'esperienza è sufficiente.
 * Rigenera salute, mana ed esperienza, riportando l'eventuale XP in eccesso sul nuovo livello.
 */
const upgradeHeroLevel = (hero: HeroItem): HeroItem => {
  if (!canUpgradeHeroLevel(hero)) return hero;

  const nextLevel = Math.min(hero.level + 1, maxLevelForVariant(hero.variant));
  const upgradedHero = recalculateHeroProgression({
    ...hero,
    level: nextLevel,
    stats: hero.stats.map((stat) => recalculateHeroStatProgressForLevel(stat, nextLevel)),
    heal: createHeroHealProgress(nextLevel, hero.mastery, hero.variant),
    mana: createHeroManaProgress(nextLevel, hero.mastery, hero.variant),
    fatigue: createHeroFatigueProgress(nextLevel, hero.mastery, hero.variant, 0),
    experience: createHeroExperienceProgress(nextLevel, Math.max(0, (hero.experience?.current ?? 0) - (hero.experience?.total ?? 0))),
  });

  return {
    ...upgradedHero,
    heal: upgradedHero.heal ? { ...upgradedHero.heal, current: upgradedHero.heal.total } : upgradedHero.heal,
    mana: upgradedHero.mana ? { ...upgradedHero.mana, current: upgradedHero.mana.total } : upgradedHero.mana,
    fatigue: upgradedHero.fatigue ? { ...upgradedHero.fatigue, current: 0 } : upgradedHero.fatigue,
  };
};

/**
 * Verifica se l'equipaggiamento ha raggiunto il totale esperienza salvato sul Progress.
 * Usa direttamente il Progress equip, che è obbligatorio per EquipItem.
 */
const canUpgradeEquipLevel = (equip: Pick<EquipItem, "level" | "variant" | "experience">): boolean => {
  return equip.level < maxLevelForVariant(equip.variant) && equip.experience.current >= equip.experience.total;
};

/**
 * Restituisce una copia dell'equipaggiamento al livello successivo quando l'esperienza è sufficiente.
 * Scala attacco, difesa, durata ed esperienza mantenendo l'eventuale XP eccedente.
 */
const upgradeEquipLevel = (equip: EquipItem): EquipItem => {
  if (!canUpgradeEquipLevel(equip)) return equip;

  const nextLevel = Math.min(equip.level + 1, maxLevelForVariant(equip.variant));
  const nextStats = recalculateEquipStatsForLevel(equip, nextLevel);
  return {
    ...equip,
    level: nextLevel,
    ...nextStats,
    duration: createEquipDurationProgress(equip.duration.total, Math.round(equip.duration.total * PROGRESSION_RESOURCE_CONFIG.equipUpgradeStatMultiplier)),
    experience: createEquipExperienceProgress(nextLevel, Math.max(0, equip.experience.current - equip.experience.total)),
  };
};


/**
 * Normalizza l'id proveniente dalle card upgrade nel tipo statistica usato dagli eroi.
 * Mantiene compatibili gli id legacy inglesi del mock e gli id attributo reali in italiano.
 */
export const heroAttributeIdFromUpgradeId = (upgradeId: string): AttributeType | null => {
  const mappedId = upgradeStatIdMap[upgradeId];
  if (mappedId) return mappedId;

  return (Object.values(upgradeStatIdMap) as string[]).includes(upgradeId) ? upgradeId as AttributeType : null;
};

/**
 * Verifica se una statistica eroe può essere incrementata senza superare il totale.
 */
const canUpgradeHeroStat = (stat: Pick<HeroAttribute, "progress">, heroLevel: number): boolean => {
  const maxStatValue = maxHeroStatLevelForHeroLevel(heroLevel);
  return stat.progress.current < maxStatValue;
};

/**
 * Restituisce una copia dell'eroe con la statistica indicata incrementata di un punto.
 */
const upgradeHeroStat = (hero: HeroItem, statId: AttributeType): HeroItem => {
  return recalculateHeroProgression({
    ...hero,
    stats: hero.stats.map((stat) => {
      const normalizedStat = normalizeHeroStatProgress(stat, hero.level);
      if (stat.id !== statId || !canUpgradeHeroStat(normalizedStat, hero.level)) return normalizedStat;

      return normalizeHeroStatProgress({
        ...normalizedStat,
        progress: {
          ...normalizedStat.progress,
          current: normalizedStat.progress.current + 1,
        },
      }, hero.level);
    }),
  });
};

/**
 * Consuma durata da un equipaggiamento e restituisce la copia aggiornata.
 * Quando la durata arriva a zero, l'equip si rompe ma mantiene le sue statistiche:
 * resta solo non utilizzabile finché non viene riparato.
 */
const useEquipDuration = (equip: EquipItem, amount = PROGRESSION_RESOURCE_CONFIG.defaultEquipDurationUseAmount): EquipItem => {
    const nextDuration = createProgress(equip.duration.current - amount, equip.duration.total, equip.duration.descr);

    if (nextDuration.current > 0) {
      return { ...equip, duration: nextDuration };
    }

    return {
      ...equip,
      duration: createEquipDurationProgress(0, equip.duration.total),
      effect: "Equip rotto: riparalo per riutilizzarlo",
    };
  };

@Injectable({ providedIn: "root" })
export class LevelProgressionService {
  private readonly pricing = inject(PricingService);
  readonly heroFactors = HERO_LEVEL_FACTORS;
  readonly equipFactors = EQUIP_LEVEL_FACTORS;
  readonly heroStatFactors = HERO_STAT_FACTORS;

  /**
   * Calcola l'esperienza richiesta per portare un eroe dal livello corrente al successivo.
   * Normalizza il livello e applica i fattori di progressione eroe, così la curva XP
   * resta centralizzata e bilanciabile da HERO_LEVEL_FACTORS.
   */
  experienceRequiredForNextHeroLevel(currentLevel: number): number {
    return experienceRequiredForLevelWithFactors(currentLevel, this.heroFactors);
  }

  /**
   * Calcola l'esperienza richiesta per portare un equipaggiamento al livello successivo.
   * Usa gli stessi algoritmi della progressione eroe ma con i fattori dedicati agli equip,
   * permettendo una curva XP separata per gli oggetti.
   */
  experienceRequiredForNextEquipLevel(currentLevel: number): number {
    return experienceRequiredForLevelWithFactors(currentLevel, this.equipFactors);
  }

  /**
   * Crea il progresso salute per un eroe al livello indicato.
   * Espone nel servizio la factory condivisa così componenti e stato non dipendono più dal vecchio model helper.
   */
  createHeroHealProgress(level: number, mastery: number, variant: number, current?: number): Progress {
    return createHeroHealProgress(level, mastery, variant, current);
  }

  /**
   * Crea il progresso mana per un eroe al livello indicato.
   * Centralizza anche i fallback di UI nella stessa API usata dagli upgrade di livello.
   */
  createHeroManaProgress(level: number, mastery: number, variant: number, current?: number): Progress {
    return createHeroManaProgress(level, mastery, variant, current);
  }

  /**
   * Crea il progresso stanchezza per un eroe al livello indicato.
   */
  createHeroFatigueProgress(level: number, mastery: number, variant: number, current?: number): Progress {
    return createHeroFatigueProgress(level, mastery, variant, current);
  }

  /**
   * Crea il progresso esperienza per un eroe al livello indicato.
   * Usa la curva eroe attuale e permette di passare l'XP già accumulata o eccedente.
   */
  createHeroExperienceProgress(level: number, current = 0): Progress {
    return createHeroExperienceProgress(level, current);
  }

  /**
   * Ricalcola in tempo reale progressi e statistiche derivate dell'eroe.
   */
  recalculateHeroProgression(hero: HeroItem): HeroItem {
    return recalculateHeroProgression(hero);
  }

  /**
   * Crea il progresso esperienza per un equipaggiamento al livello indicato.
   * Usa la curva equip attuale e permette di passare l'XP già accumulata o eccedente.
   */
  createEquipExperienceProgress(level: number, current = 0): Progress {
    return createEquipExperienceProgress(level, current);
  }

  /**
   * Crea il progresso durata per un equipaggiamento.
   * Riusa la normalizzazione comune per mantenere consistenti totale e corrente.
   */
  createEquipDurationProgress(duration: number, total = duration): Progress {
    return createEquipDurationProgress(duration, total);
  }

  /**
   * Verifica se un eroe possiede abbastanza esperienza per essere potenziato.
   * Confronta l'esperienza corrente con il totale salvato sull'eroe oppure, se assente,
   * con il requisito calcolato per il suo livello attuale.
   */
  hasHeroExperienceForUpgrade(hero: Pick<HeroItem, "level" | "variant" | "experience">): boolean {
    const total = hero.experience?.total ?? this.experienceRequiredForNextHeroLevel(hero.level);
    return hero.level < this.maxLevelForVariant(hero.variant) && (hero.experience?.current ?? 0) >= total;
  }

  /**
   * Verifica se un equipaggiamento possiede abbastanza esperienza per salire di livello.
   * Usa il totale presente sull'oggetto quando disponibile e ricade sul calcolo della
   * progressione equip per mantenere coerenti gli item incompleti.
   */
  hasEquipExperienceForUpgrade(equip: Pick<EquipItem, "level" | "variant" | "experience">): boolean {
    const total = equip.experience?.total ?? this.experienceRequiredForNextEquipLevel(equip.level);
    return equip.level < this.maxLevelForVariant(equip.variant) && (equip.experience?.current ?? 0) >= total;
  }

  /**
   * Normalizza l'id di una card upgrade nell'id statistica effettivo dell'eroe.
   */
  heroAttributeIdFromUpgradeId(upgradeId: string): AttributeType | null {
    return heroAttributeIdFromUpgradeId(upgradeId);
  }

  /**
   * Verifica se la statistica indicata può essere incrementata sull'eroe corrente.
   */
  canUpgradeHeroStat(hero: HeroItem, upgradeId: string): boolean {
    const statId = this.heroAttributeIdFromUpgradeId(upgradeId);
    const stat = statId ? hero.stats.find((item) => item.id === statId) : undefined;
    return !!stat && canUpgradeHeroStat(stat, hero.level);
  }

  /**
   * Restituisce una copia dell'eroe con la statistica indicata incrementata di un punto.
   */
  upgradeHeroStat(hero: HeroItem, upgradeId: string): HeroItem {
    const statId = this.heroAttributeIdFromUpgradeId(upgradeId);
    if (!statId || !this.canUpgradeHeroStat(hero, upgradeId)) return hero;
    return upgradeHeroStat(hero, statId);
  }

  /**
   * Restituisce una copia dell'eroe aggiornata al prossimo livello, se l'esperienza è sufficiente.
   * Riusa la factory pura centralizzata e mantiene invariato l'oggetto quando l'upgrade non è valido.
   */
  upgradeHeroLevel(hero: HeroItem): HeroItem {
    return upgradeHeroLevel(hero);
  }

  /**
   * Restituisce una copia dell'equipaggiamento aggiornata al prossimo livello, se l'esperienza è sufficiente.
   * Riusa la factory pura centralizzata e mantiene invariato l'oggetto quando l'upgrade non è valido.
   */
  upgradeEquipLevel(equip: EquipItem): EquipItem {
    return upgradeEquipLevel(equip);
  }

  /**
   * Consuma la durata dell'equipaggiamento e restituisce la copia aggiornata.
   * Offre un punto di ingresso service-oriented per la stessa logica pura usata dai model mock.
   */
  maxLevelForVariant(variant: number | undefined): number {
    return maxLevelForVariant(variant);
  }

  useEquipDuration(equip: EquipItem, amount = 1): EquipItem {
    return useEquipDuration(equip, amount);
  }

  /**
   * Restituisce il costo necessario per incrementare una statistica dell'eroe.
   * Usa il valore corrente della statistica come livello di partenza, così ogni punto
   * successivo diventa progressivamente più costoso con la stessa logica dei livelli.
   */
  heroStatUpgradeCost(currentStatLevel: number, resources: readonly ResourceItem[]): LevelUpgradeCost {
    return this.createUpgradeCost(currentStatLevel, this.heroStatFactors, "res1", resources);
  }

  /**
   * Restituisce il costo necessario per il prossimo livello di un eroe.
   * Delega alla factory comune indicando la risorsa milestone degli eroi, in modo da
   * alternare automaticamente costi in monete e costi risorsa ogni cinque livelli.
   */
  heroUpgradeCost(currentLevel: number, resources: readonly ResourceItem[]): LevelUpgradeCost {
    return this.createUpgradeCost(currentLevel, this.heroFactors, "res1", resources);
  }

  /**
   * Restituisce il costo necessario per il prossimo livello di un equipaggiamento.
   * Usa la factory comune con la risorsa milestone degli equip, mantenendo la stessa
   * logica di crescita ma con fattori e valuta dedicati agli oggetti.
   */
  equipUpgradeCost(currentLevel: number, resources: readonly ResourceItem[]): LevelUpgradeCost {
    return this.createUpgradeCost(currentLevel, this.equipFactors, "res2", resources);
  }

  /**
   * Crea il costo completo per un upgrade di livello.
   * Calcola il livello di destinazione, decide se è un milestone multiplo di cinque e
   * restituisce un costo in risorsa milestone oppure un costo in monete scalato esponenzialmente.
   */
  private createUpgradeCost(
    currentLevel: number,
    factors: UpgradePricingFactors,
    milestoneResourceType: ResourceTypeId,
    resources: readonly ResourceItem[],
  ): LevelUpgradeCost {
    return this.pricing.createLevelUpgradeCost(
      currentLevel,
      factors,
      milestoneResourceType,
      (typeId, targetLevel) => this.resourceForMilestoneLevel(typeId, targetLevel, resources),
    );
  }

  /**
   * Seleziona la risorsa da richiedere per un livello milestone.
   * Filtra le risorse del tipo richiesto, le ordina per livello e sceglie una rarità
   * crescente ogni venti livelli target, usando solo il catalogo ricevuto dal chiamante.
   */
  private resourceForMilestoneLevel(typeId: ResourceTypeId, targetLevel: number, resources: readonly ResourceItem[]): ResourceItem {
    const orderedResources = resources
      .filter((item) => item.type.id === typeId)
      .sort((a, b) => a.level - b.level);

    const rarityIndex = Math.min(orderedResources.length - 1, Math.max(0, Math.ceil(targetLevel / 20) - 1));
    const resource = orderedResources[rarityIndex] ?? orderedResources[0];

    if (!resource) {
      throw new Error(`Missing resource catalog item for milestone type ${typeId}`);
    }

    return resource;
  }
}
