import { EquipItem, HeroAttribute, HeroItem, HeroPowerMultiplier } from "../../models/game.models";
import { HERO_POWER_CONFIG } from "../../config/game-progression.config";

const safeNumber = (value: number | undefined, fallback = 0): number => {
  return Number.isFinite(value) ? (value as number) : fallback;
};

const clampMin = (value: number, min: number): number => {
  return Math.max(min, value);
};

const calculateStatPower = (stat: HeroAttribute): number => {
  const total = clampMin(safeNumber(stat.progress.total, HERO_POWER_CONFIG.defaultStatTotal), 1);
  const current = clampMin(safeNumber(stat.progress.current) + safeNumber(stat.bonus) - safeNumber(stat.malus), 0);
  const normalizedStat = (current / total) * HERO_POWER_CONFIG.defaultStatTotal;

  return normalizedStat;
};

const calculateEquipPower = (equip: EquipItem): number => {
  const attackPower = safeNumber(equip.attack) * HERO_POWER_CONFIG.equipAttackWeight;
  const defensePower = safeNumber(equip.defense) * HERO_POWER_CONFIG.equipDefenseWeight;
  const levelPower = safeNumber(equip.level) * HERO_POWER_CONFIG.equipLevelWeight;
  const experiencePower = (safeNumber(equip.experience.current) / Math.max(1, safeNumber(equip.experience.total, 1))) * HERO_POWER_CONFIG.equipExperienceWeight;
  const durationPower = (safeNumber(equip.duration.current) / Math.max(1, safeNumber(equip.duration.total, 1))) * HERO_POWER_CONFIG.equipDurationWeight;

  return attackPower + defensePower + levelPower + experiencePower + durationPower;
};

const calculateMultipliers = (multipliers: HeroPowerMultiplier[] | undefined): number => {
  if (!multipliers?.length) {
    return 1;
  }

  return multipliers.reduce((total, multiplier) => {
    return total * clampMin(safeNumber(multiplier.value, 1), 0);
  }, 1);
};

export const defaultHeroPowerMultipliers: HeroPowerMultiplier[] = HERO_POWER_CONFIG.defaultMultipliers;

export const calculateHeroTotalPower = (hero: HeroItem): number => {
  /*
    Politiche di calcolo della potenza totale, pensate per essere simili ai Combat Power
    più usati nei videogiochi RPG, action RPG e hero collector:

    1. Il livello è una base stabile e leggibile: ogni livello vale molto perché rappresenta
       la progressione permanente dell'eroe e deve far percepire subito l'avanzamento.
    2. Tutte le stat dell'eroe entrano nel punteggio. Ogni stat viene normalizzata sul proprio
       totale, così in futuro potremo avere attributi con scale diverse senza riscrivere la formula.
    3. Gli equip indossati in quel momento sono sommati singolarmente. Attacco e difesa pesano più
       della durata perché nei giochi sono generalmente i driver principali della forza in combattimento.
       Livello ed esperienza dell'equip aggiungono valore perché misurano rarità, upgrade e qualità.
    4. I moltiplicatori sono applicati alla fine e in modo moltiplicativo. Questa è la politica più
       comune per buff, sinergie, rarità, aura, set bonus e bonus evento: non altera le fonti base,
       rimane facile da mostrare al giocatore ed è semplice da estendere con nuovi attributi.
    5. Il risultato è arrotondato a intero e non scende mai sotto zero, così la UI mostra un numero
       chiaro, confrontabile e adatto a ordinamenti, matchmaking e preview di equip futuri.
  */
  const levelPower = safeNumber(hero.level) * HERO_POWER_CONFIG.heroLevelWeight;
  const statsPower = hero.stats.reduce((total, stat) => total + calculateStatPower(stat), 0) * HERO_POWER_CONFIG.heroStatsWeight;
  const resourcePower = [hero.heal, hero.mana, hero.experience]
    .filter((progress): progress is NonNullable<typeof progress> => !!progress)
    .reduce((total, progress) => total + (safeNumber(progress.current) / Math.max(1, safeNumber(progress.total, 1))) * HERO_POWER_CONFIG.heroResourceWeight, 0);
  const equipPower = hero.equip.reduce((total, equip) => total + calculateEquipPower(equip), 0);
  const multiplier = calculateMultipliers(hero.powerMultipliers);

  return Math.max(0, Math.round((levelPower + statsPower + resourcePower + equipPower) * multiplier));
};
