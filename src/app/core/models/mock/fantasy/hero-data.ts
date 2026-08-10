import { GameUtilsService } from "../../../services/ui/formatting/game-utils.service";
import { AttributeType, ComponentEffect, EquipItem, EquipType, FrameItem, HeroAttribute, HeroItem, IconItem, masteryType, variantsType } from "../../game.models";
import { defaultHeroPowerMultipliers } from "../../../services/progression/hero-power.service";
import { createEquipDurationProgress, createEquipExperienceProgress, createHeroExperienceProgress, createHeroHealProgress, createHeroManaProgress, maxHeroStatLevelForHeroLevel } from "../../../services/progression/level-progression.service";
import { PricingService } from "../../../services/economy/pricing.service";
import { equipItemsMock, equipTypesMock } from "./equip-data";

export const defaulthero: HeroItem = {
  itemType: 'hero',
  id: "h1",
  title: "Ranger",
  description: "Un abile arciere con attacchi rapidi e precisi.",
  level: 1,
  mastery: 1 as masteryType,
  variant: 1 as variantsType,
  heal: { descr: "Salute", current: 61, total: 61 },
  mana: { descr: "Mana", current: 36, total: 36 },
  fatigue: { descr: "Stanchezza", current: 0, total: 36 },
  experience: { descr: "Esperienza eroe", current: 0, total: 710 },
  attack: 5,
  defense: 4,
  velocita: 4,
  price: {
    frame: { name: "crystal_single", effect: "none" },
    type: 'gem',
    amount: 7600,
  },
  equip: [],
  powerMultipliers: defaultHeroPowerMultipliers,
  stats: [
    {
      id: "Forza",
      title: "Forza",
      description: "Potenza fisica, trasporto e danno base.",
      frame: { name: "skill-fist", effect: "none" },
      bonus: 0,
      malus: 0,
      progress: { descr: "Eccellente", current: 1, total: 1 },
    },
    {
      id: "Destrezza",
      title: "Destrezza",
      description: "Rapidità, precisione e schivata.",
      frame: { name: "skill-feather-arrow", effect: "none" },
      bonus: 0,
      malus: 0,
      progress: { descr: "Eccellente", current: 1, total: 1 },
    },
    {
      id: "Costituzione",
      title: "Costituzione",
      description: "Salute, resistenza e capacità di sopportare fatica.",
      frame: { name: "skill-heart", effect: "none" },
      bonus: 0,
      malus: 0,
      progress: { descr: "Eccellente", current: 1, total: 1 },
    },
    {
      id: "Intelligenza",
      title: "Intelligenza",
      description: "Apprendimento, magia e gestione delle risorse.",
      frame: { name: "skill-magic-book", effect: "none" },
      bonus: 0,
      malus: 0,
      progress: { descr: "Eccellente", current: 1, total: 1 },
    },
    {
      id: "Saggezza",
      title: "Saggezza",
      description: "Intuizione, raccolta, supporto e lettura del contesto.",
      frame: { name: "skill-scales", effect: "none" },
      bonus: 0,
      malus: 0,
      progress: { descr: "Eccellente", current: 1, total: 1 },
    },
    {
      id: "Carisma",
      title: "Carisma",
      description: "Relazioni, commercio e capacità di reclutamento.",
      frame: { name: "skill-mask", effect: "none" },
      bonus: 0,
      malus: 0,
      progress: { descr: "Eccellente", current: 1, total: 1 },
    },
  ],
  frame: { name: "desert-mercant", effect: "none" },
};

// -------------------------------------
// Helper interni
// -------------------------------------

interface MockStatSeed {
  id: AttributeType;
  title: string;
  description: string;
  base: number;
  total: number;
  frame: FrameItem;
}

/*
interface MockEquipSeed {
  id: string;
  name: string;
  type: EquipType;
  duration: number;
  attack: number;
  Costituzione: number;
  effect: string;
  experience: number;
  bonus: string;
  frame: FrameItem;
}*/

interface MockHeroSeed {
  id: string;
  title: string;
  description: string;
  frame: FrameItem;
  stats: MockStatSeed[];
  equip: EquipItem[];
}

interface HeroVariantConfig {
  variantOffset: variantsType;
  variantEffect: ComponentEffect;
  nameSuffix: string;
  levelOffset: number;
  masteryOffset: masteryType;
  variantMultiplier: number;
  bonusSuffix: string;
}

const heroVariants: HeroVariantConfig[] = [
  {
    variantOffset: 1 as variantsType,
    nameSuffix: 'Apprendista',
    levelOffset: 1,
    masteryOffset: 1 as masteryType,
    variantEffect: 'none',
    variantMultiplier: 1,
    bonusSuffix: 'Versione iniziale già disponibile al giocatore.',
  },
  {
    variantOffset: 2 as variantsType,
    nameSuffix: 'Affermato',
    levelOffset: 1,
    masteryOffset: 1 as masteryType,
    variantEffect: 'fx-uncommon',
    variantMultiplier: 1.35,
    bonusSuffix: 'Versione intermedia ottenibile tramite raccolta risorse.',
  },
  {
    variantOffset: 3 as variantsType,
    nameSuffix: 'Rinomato',
    levelOffset: 1,
    masteryOffset: 1 as masteryType,
    variantEffect: 'fx-rare',
    variantMultiplier: 1.75,
    bonusSuffix: 'Versione avanzata con progressione più alta e dotazione migliore.',
  },
  {
    variantOffset: 4 as variantsType,
    nameSuffix: 'Epico',
    levelOffset: 1,
    masteryOffset: 1 as masteryType,
    variantEffect: 'fx-mythic',
    variantMultiplier: 2.25,
    bonusSuffix: 'Versione epica pensata per mid-late game.',
  },
  {
    variantOffset: 5 as variantsType,
    nameSuffix: 'Leggendario',
    levelOffset: 1,
    masteryOffset: 1 as masteryType,
    variantEffect: 'fx-legendary',
    variantMultiplier: 3.5,
    bonusSuffix: 'Versione leggendaria pensata per contenuti end game.',
  },
];

const equipTypeById = equipTypesMock.reduce(
  (acc, type) => {
    acc[type.id] = type;
    return acc;
  },
  {} as Record<EquipType['id'], EquipType>
);

const MASTERY_MULTIPLIERS: Record<number, number> = {
  1: 0.20,
  2: 0.35,
  3: 0.50,
  4: 0.70,
  5: 0.90,
  6: 1.10,
  7: 1.35,
  8: 1.60,
  9: 1.85,
  10: 2.20,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const pricing = new PricingService();

const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const deterministicInt = (seed: string, min: number, max: number): number => {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  const range = safeMax - safeMin + 1;

  if (range <= 0) {
    return safeMin;
  }

  return safeMin + (hashString(seed) % range);
};

const getProgressDescr = (current: number, total: number): string => {
  const ratio = total <= 0 ? 0 : current / total;
  if (ratio < 0.35) return 'In crescita';
  if (ratio < 0.65) return 'Buono';
  if (ratio < 0.85) return 'Solido';
  return 'Eccellente';
};

const getMasteryBonus = (id: string, mastery: number): number => {
  const normalizedMastery = clamp(mastery, 1, 10);
  const multiplier = MASTERY_MULTIPLIERS[normalizedMastery] ?? 1;
  return Math.round(deterministicInt(`${id}:mastery`, 0, 5) * multiplier);
};

const getVariantBonus = (id: string, variant: HeroVariantConfig): number => {
  return Math.round(deterministicInt(`${id}:variant:${variant.variantOffset}`, 0, 15) * variant.variantMultiplier);
};


const HERO_PROGRESSIVE_FLOORS = [
  { attack: 8, defence: 8, velocita: 5 },
  { attack: 10, defence: 10, velocita: 6 },
  { attack: 12, defence: 12, velocita: 7 },
  { attack: 14, defence: 14, velocita: 8 },
] as const;

const applyHeroProgressionFloor = (variants: HeroItem[]): HeroItem[] => {
  return variants.reduce<HeroItem[]>((acc, hero, index) => {
    if (index === 0) {
      acc.push(hero);
      return acc;
    }

    const previous = acc[index - 1];
    const floor = HERO_PROGRESSIVE_FLOORS[index - 1];

    acc.push({
      ...hero,
      attack: Math.max(hero.attack ?? 0, (previous.attack ?? 0) + floor.attack),
      defense: Math.max(hero.defense ?? 0, (previous.defense ?? 0) + floor.defence),
      velocita: Math.max(hero.velocita ?? 0, (previous.velocita ?? 0) + floor.velocita),
    });

    return acc;
  }, []);
};

const getNormalizedStatWeight = (base: number): number => {
  const cappedBase = clamp(base, 1, 10);
  return clamp(cappedBase / 10, 0.25, 1);
};


const makeStat = (seed: MockStatSeed, level: number, mastery: number, variant: HeroVariantConfig): HeroAttribute => {
  const maxStatLevel = maxHeroStatLevelForHeroLevel(level);
  const value = clamp(Math.max(1, Math.round(maxStatLevel * getNormalizedStatWeight(seed.base))), 1, maxStatLevel);
  const bonus = Math.max(0, Math.round(value * (Number(variant.variantOffset) - 1)));

  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    frame: seed.frame,
    bonus,
    malus: 0,
    progress: {
      descr: getProgressDescr(value, maxStatLevel),
      current: value,
      total: maxStatLevel,
    },
  };
};

const getStatValue = (stats: HeroAttribute[], id: AttributeType): number => {
  const stat = stats.find((item) => item.id === id);
  return Math.max(0, (stat?.progress.current ?? 1) + (stat?.bonus ?? 0) - (stat?.malus ?? 0));
};

const calculateHeroMainStats = (
  id: string,
  level: number,
  mastery: number,
  variant: HeroVariantConfig,
  stats: HeroAttribute[]
) => {
  const forza = getStatValue(stats, 'Forza');
  const destrezza = getStatValue(stats, 'Destrezza');
  const costituzione = getStatValue(stats, 'Costituzione');
  const intelligenza = getStatValue(stats, 'Intelligenza');
  const saggezza = getStatValue(stats, 'Saggezza');
  const masteryBonus = getMasteryBonus(id, mastery);
  const variantBonus = getVariantBonus(id, variant);

  return {
    attack: Math.round(
      forza * 0.45 +
      destrezza * 0.25 +
      intelligenza * 0.20 +
      level * 0.12 +
      masteryBonus +
      variantBonus
    ),
    defense: Math.round(
      costituzione * 0.45 +
      forza * 0.20 +
      saggezza * 0.20 +
      level * 0.12 +
      masteryBonus +
      variantBonus
    ),
    velocita: Math.round(
      destrezza * 0.50 +
      saggezza * 0.15 +
      intelligenza * 0.15 +
      level * 0.08 +
      masteryBonus * 0.5 +
      variantBonus * 0.35
    ),
  };
};

const createProgress = (descr: string, current: number, total: number) => ({
  descr,
  current,
  total,
});

const createHeroHeal = (level: number, mastery: number, variant: HeroVariantConfig, stats: HeroAttribute[]) => {
  const costituzione = getStatValue(stats, 'Costituzione');
  const total = Math.round(35 + level * 4.5 + costituzione * 6 + Number(variant.variantOffset) * 20);
  return createProgress('Salute', total, total);
};

const createHeroMana = (level: number, mastery: number, variant: HeroVariantConfig, stats: HeroAttribute[]) => {
  const intelligenza = getStatValue(stats, 'Intelligenza');
  const saggezza = getStatValue(stats, 'Saggezza');
  const total = Math.round(15 + level * 2.2 + intelligenza * 4 + saggezza * 2 + Number(variant.variantOffset) * 10);
  return createProgress('Mana', total, total);
};

const createHeroFatigue = (level: number, mastery: number, variant: HeroVariantConfig, stats: HeroAttribute[]) => {
  const carisma = getStatValue(stats, 'Carisma');
  const total = Math.round(25 + level * 3.5 + carisma * 5 + Number(variant.variantOffset) * 12);
  return createProgress('Stanchezza', 0, total);
};

const createHeroExperience = (level: number, mastery: number, variant: HeroVariantConfig) => {
  const total = Math.round(100 + Math.pow(level, 1.45) * 35 + Number(variant.variantOffset) * 500 + mastery * 75);
  return createProgress('Esperienza eroe', 0, total);
};

const buildHeroVariant = (
  base: MockHeroSeed,
  variantIndex: number,
  heroIndex: number
): HeroItem => {
  const variant = heroVariants[variantIndex];
  const level = variant.levelOffset;
  const mastery = variant.masteryOffset;
  const stats = base.stats.map((s) => makeStat(s, level, mastery, variant));
  const mainStats = calculateHeroMainStats(base.id, level, mastery, variant, stats);
  const statePrice = pricing.createCatalogHeroPrice(level, mastery, variant.variantOffset);

  return {
    itemType: 'hero',
    id: `${base.id}-${variant.nameSuffix}`,
    title: `${base.title} ${variant.nameSuffix}`,
    description: `${base.description} ${variant.bonusSuffix}`,
    level,
    mastery,
    variant: variant.variantOffset,
    heal: createHeroHeal(level, mastery, variant, stats),
    mana: createHeroMana(level, mastery, variant, stats),
    fatigue: createHeroFatigue(level, mastery, variant, stats),
    experience: createHeroExperience(level, mastery, variant),
    attack: mainStats.attack,
    defense: mainStats.defense,
    velocita: mainStats.velocita,
    stats,
    price: statePrice,
    powerMultipliers: defaultHeroPowerMultipliers,
    equip: [],
    frame: { name: base.frame.name, effect: variant.variantEffect },
  };
};

// -------------------------------------
// 10 personaggi base ricavati dall'immagine
// Ordine: riga alta sx->dx, poi riga bassa sx->dx
// -------------------------------------

const heroSeeds: MockHeroSeed[] = [
  {
    id: 'hero-milo-traveler',
    title: 'Milo il Viandante',
    description:
      'Un giovane viaggiatore dal carattere aperto, sempre pronto a esplorare strade nuove e a dare una mano nel villaggio.',
    frame: {name: "human-adventurer", effect: "none" },
    stats: [
      {
        id: 'Forza',
        title: 'Forza',
        description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
        base: 4,
        total: 100,
        frame: {name: "skill-fist", effect: "none" },
      },
      {
        id: 'Destrezza',
        title: 'Destrezza',
        description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
        base: 8,
        total: 100,
        frame: {name: "skill-feather-arrow", effect: "none" },
      },
      {
        id: 'Costituzione',
        title: 'Costituzione',
        description: 'Interesse verso persone, luoghi e piccoli misteri.',
        base: 5,
        total: 100,
        frame: {name: "skill-heart", effect: "none" },
      },
      {
        id: 'Intelligenza',
        title: 'Intelligenza',
        description: 'Facilità nel creare legami e ottenere fiducia.',
        base: 5,
        total: 100,
        frame: {name: "skill-magic-book", effect: "none" },
      },
      {
        id: 'Saggezza',
        title: 'Saggezza',
        description: 'Praticità nei movimenti e nei lavori manuali.',
        base: 7,
        total: 100,
        frame: {name: "skill-scales", effect: "none" },
      },
	  {
        id: 'Carisma',
        title: 'Carisma',
        description: 'Praticità nei movimenti e nei lavori manuali.',
        base: 4,
        total: 100,
        frame: {name: "skill-mask", effect: "none" },
      }
    ],
    equip: [
      equipItemsMock[0],
	  equipItemsMock[10],
	  equipItemsMock[20],
    ]
  },

  {
    id: 'hero-liora-herbalist',
    title: 'Liora l’Erborista',
    description:
      'Un’elfa discreta e paziente, nota per la conoscenza delle piante, dei rimedi naturali e dei piccoli rituali quotidiani.',
    frame: {name: "elf-traveler", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 3,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 37,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[1],
		equipItemsMock[10],
		equipItemsMock[30],
    ]
  },

  {
    id: 'hero-brokk-artisan',
    title: 'Brokk l’Artigiano',
    description:
      'Un nano robusto e affidabile, famoso per la sua abilità pratica, la precisione del lavoro e il temperamento gioviale.',
    frame: {name: "dwarf-craftsman", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 2,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[1],
		equipItemsMock[11],
		equipItemsMock[31],
		equipItemsMock[41],
    ]
  },

  {
    id: 'hero-pip-halfling',
    title: 'Pip l’Esploratore',
    description:
      'Un piccolo halfling vivace e sorridente, rapido nei movimenti e bravissimo nel trovare passaggi, scorciatoie e curiosità.',
    frame: {name: "halfling-boy", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 6,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 3,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[4],
		equipItemsMock[12],
		equipItemsMock[32],

    ]
  },

  {
    id: 'hero-nyra-mystic',
    title: 'Nyra la Mistica',
    description:
      'Una tiefling elegante e magnetica, incline all’ascolto, alla contemplazione e alla lettura simbolica del mondo.',
    frame: {name: "tiefling-priestess", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 2,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[2],
		equipItemsMock[31],
		equipItemsMock[42],
    ]
  },

  {
    id: 'hero-marta-baker',
    title: 'Marta la Fornaia',
    description:
      'Una donna anziana, calorosa e pratica, molto amata nel borgo per il pane fragrante e i consigli sempre sinceri.',
    frame: {name: "baker-woman", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 6,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 3,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[3],
		equipItemsMock[11],
		equipItemsMock[31],
		equipItemsMock[42],
    ]
  },

  {
    id: 'hero-samir-merchant',
    title: 'Samir il Mercante',
    description:
      'Un mercante itinerante elegante e molto disinvolto, abile nelle trattative, nelle relazioni e nella gestione delle opportunità.',
    frame: {name: "desert-merchant", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[5],
		equipItemsMock[14],
		equipItemsMock[31],

    ]
  },

  {
    id: 'hero-elin-gatherer',
    title: 'Elin la Raccoglitrice',
    description:
      'Una giovane donna del villaggio, operosa e luminosa, esperta nel raccogliere, ordinare e valorizzare ciò che la campagna offre.',
    frame: {name: "village-girl", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 85,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 3,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 3,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[3],
		equipItemsMock[11],
		equipItemsMock[32],
		equipItemsMock[42],
    ]
  },

  {
    id: 'hero-grom-porter',
    title: 'Grom il Facchino',
    description:
      'Un orco dal portamento deciso ma affidabile, molto adatto a trasporti, protezione logistica e lavori di fatica.',
    frame: {name: "orc-adventurer", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 2,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 4,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 7,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[3],
		equipItemsMock[14],
		equipItemsMock[34],
		equipItemsMock[42],
    ]
  },

  {
    id: 'hero-eldrin-sage',
    title: 'Eldrin il Saggio',
    description:
      'Un anziano elfo dai modi pacati, custode di ricordi, storie e riflessioni utili per orientare la comunità.',
    frame: {name: "elder-elf-mage", effect: "none" },
    stats: [
		{
		  id: 'Forza',
		  title: 'Forza',
		  description: 'Capacità di sostenere lunghi tragitti e attività ripetitive.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-fist", effect: "none" },
		},
		{
		  id: 'Destrezza',
		  title: 'Destrezza',
		  description: 'Rapidità nel cambiare piano e affrontare imprevisti.',
		  base: 8,
		  total: 100,
		  frame: {name: "skill-feather-arrow", effect: "none" },
		},
		{
		  id: 'Costituzione',
		  title: 'Costituzione',
		  description: 'Interesse verso persone, luoghi e piccoli misteri.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-heart", effect: "none" },
		},
		{
		  id: 'Intelligenza',
		  title: 'Intelligenza',
		  description: 'Facilità nel creare legami e ottenere fiducia.',
		  base: 5,
		  total: 100,
		  frame: {name: "skill-magic-book", effect: "none" },
		},
		{
		  id: 'Saggezza',
		  title: 'Saggezza',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 2,
		  total: 100,
		  frame: {name: "skill-scales", effect: "none" },
		},
		{
		  id: 'Carisma',
		  title: 'Carisma',
		  description: 'Praticità nei movimenti e nei lavori manuali.',
		  base: 2,
		  total: 100,
		  frame: {name: "skill-mask", effect: "none" },
		}
    ],
    equip: [
		equipItemsMock[5],
		equipItemsMock[14],
		equipItemsMock[34],
		equipItemsMock[45],
		equipItemsMock[51],
    ]
  }
];

const getHeroAverageStats = (hero: HeroItem): number => {
  if (!hero.stats.length) {
    return 0;
  }

  const total = hero.stats.reduce((sum, stat) => {
    return sum + stat.progress.current;
  }, 0);

  return Math.round(total / hero.stats.length);
};

export const getHeroItemsByLevelAndMasteryAndVariantAndStats = (
  level: number,
  mastery: masteryType,
  variant: variantsType,
  stats: number,
  heroes: HeroItem[] = mockHeroItems
): HeroItem[] => {
  return heroes
    .filter((hero) => {
	  //console.log('getHeroItemsByLevelAndMasteryAndVariantAndStats', hero);
      const matchLevel = hero.level <= level;
	  const matchVariant = hero.variant <= variant;
	  const matchMastery = hero.mastery <= mastery;
      const matchStats = getHeroAverageStats(hero) <= stats;

      return matchLevel && matchStats && matchVariant && matchMastery;
    })
    .sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }

	  if (a.variant !== b.variant) {
	    return a.variant - b.variant;
	  }
	  
	  if (a.mastery !== b.mastery) {
	    return a.mastery - b.mastery;
	  }
	  
      const statsA = getHeroAverageStats(a);
      const statsB = getHeroAverageStats(b);

      if (statsA !== statsB) {
        return statsA - statsB;
      }

      return a.title.localeCompare(b.title);
    });
};

export const getRandomHeroItems = (
  count: number,
  heroes: HeroItem[] = mockHeroItems
): HeroItem[] => {
  return GameUtilsService.getRandomItemsFromList<HeroItem>(heroes, count);
};

// -------------------------------------
// Export finale: 5 varianti per ciascuno dei 10 personaggi
// Totale = 50 HeroItem
// -------------------------------------

export const mockHeroItems: HeroItem[] = heroSeeds.reduce<HeroItem[]>(
  (items, hero, heroIndex) => {
    const variants = applyHeroProgressionFloor(
      heroVariants.map((_, variantIndex) =>
        buildHeroVariant(hero, variantIndex, heroIndex)
      )
    );

    return items.concat(variants);
  },
  []
);
