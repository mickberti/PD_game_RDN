import { HeroItem } from '../../../models/game.models';
import { MonsterType, PhaserCombatTuningParams } from '../../../models/phaser-game-state.model';

export type HeroCombatTuning = NonNullable<NonNullable<PhaserCombatTuningParams['hero']>>;

const HERO_PROFILE_ONE_IDS = ['hero-milo-traveler', 'hero-samir-merchant'];
const HERO_PROFILE_TWO_IDS = ['hero-brokk-artisan', 'hero-marta-baker'];
const HERO_PROFILE_THREE_IDS = ['hero-nyra-mystic', 'hero-liora-herbalist'];
const HERO_PROFILE_FOUR_IDS = ['hero-pip-halfling', 'hero-elin-gatherer'];

type CombatRowKey =
  | 'attack.attacksPerHold'
  | 'attack.repeatAfterMs'
  | 'special.attacksPerHold'
  | 'special.repeatAfterMs'
  | 'attack.range'
  | 'attack.arcWidth'
  | 'special.range'
  | 'special.arcWidth'
  | 'defense.range'
  | 'defense.arcWidth';

const statValue = (hero: HeroItem, id: string): number => {
  const stat = hero.stats.find((item) => item.id === id);
  return Math.max(0, (stat?.progress.current ?? 0) + (stat?.bonus ?? 0) - (stat?.malus ?? 0));
};

const activeEquip = (hero: HeroItem) => (hero.equip ?? []).filter((item) => !item.duration || item.duration.current > 0);

const equipSum = (hero: HeroItem, field: 'attack' | 'defense' | 'velocita'): number =>
  activeEquip(hero).reduce((total, item) => total + Math.max(0, Number(item[field] ?? 0)), 0);

const multiplier = (hero: HeroItem): number =>
  Math.max(0.1, (hero.powerMultipliers ?? []).reduce((total, item) => total + Number(item.value ?? 0), 1));

const rounded = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));

/** Profilo 1 : ['hero-milo-traveler', 'hero-samir-merchant'] combattenti agili, con attacco rapido e scudo rettangolare. */
function buildHeroOneCombatTuning(hero?: HeroItem | null): HeroCombatTuning {
  const force = hero ? statValue(hero, 'Forza') : 0;
  const dexterity = hero ? statValue(hero, 'Destrezza') : 0;
  const constitution = hero ? statValue(hero, 'Costituzione') : 0;
  const intelligence = hero ? statValue(hero, 'Intelligenza') : 0;
  const wisdom = hero ? statValue(hero, 'Saggezza') : 0;
  const charisma = hero ? statValue(hero, 'Carisma') : 0;
  const attack = hero ? equipSum(hero, 'attack') : 0;
  const defense = hero ? equipSum(hero, 'defense') : 0;
  const speed = hero ? equipSum(hero, 'velocita') : 0;
  const power = hero ? multiplier(hero) : 1;

  return {
    attack: {
      shape: 'rectangle', offsetX: 0, offsetY: 0,
      effectType: 'melee-sweep',
      effectVariant: 1,
      attacksPerHold: rounded(1 + Math.floor((dexterity + speed) / 45), 1, 10),
      repeatAfterMs: rounded((700 - dexterity * 4 - speed * 3) / power, 150, 5000),
      range: rounded(60 + attack * 0.1, 16, 220),
      arcWidth: rounded(35 + dexterity * 0.1, 16, 180),
    },
    special: {
      shape: 'circle', centered: true, offsetX: 0, offsetY: 0,
      effectType: 'area-burst',
      effectVariant: 1,
      attacksPerHold: rounded(1 + Math.floor((intelligence + wisdom) / 55), 1, 10),
      repeatAfterMs: rounded((1100 - intelligence * 5 - wisdom * 2) / power, 250, 5000),
      range: 0,
      arcWidth: rounded((75 + intelligence * 0.05 + wisdom * 0.05 + attack * 0.01), 16, 260),
    },
    defense: {
      shape: 'rectangle', offsetX: 0, offsetY: 0,
      effectVariant: 1,
      range: rounded(38 + constitution * 0.05 + defense * 0.1, 8, 140),
      arcWidth: rounded(52 + constitution * 0.05 + charisma * 0.05 + defense * 0.1, 8, 180),
    },
  };
}

/** Profilo 2 : 'hero-brokk-artisan', 'hero-marta-baker' combattenti robusti, con attacco ravvicinato e scudo circolare. */
function buildHeroTwoCombatTuning(hero: HeroItem): HeroCombatTuning {
  const force = statValue(hero, 'Forza');
  const constitution = statValue(hero, 'Costituzione');
  const intelligence = statValue(hero, 'Intelligenza');
  const attack = hero ? equipSum(hero, 'attack') : 0;
  const wisdom = statValue(hero, 'Saggezza');
  const defense = equipSum(hero, 'defense');
  const power = multiplier(hero);

  return {
    attack: {
      shape: 'rectangle', centered: true, offsetX: 0, offsetY: 0,
      effectType: 'melee-sweep',
      effectVariant: 2,
      attacksPerHold: rounded(1 + Math.floor((force + constitution) / 55), 1, 10),
      repeatAfterMs: rounded((880 - constitution * 4) / power, 220, 5000),
      range: rounded(60 + attack * 0.1, 16, 220),
      arcWidth: rounded((35 + force * 0.1 + intelligence * 0.1), 16, 200),
    },
    special: {
      shape: 'rectangle', offsetX: 15, offsetY: 0,
      effectType: 'beam',
      effectVariant: 2,
      attacksPerHold: 1,
      repeatAfterMs: rounded((1350 - intelligence * 3 - wisdom * 3) / power, 300, 5000),
      range: rounded((38 + force * 0.1 + wisdom * 0.05) * power, 16, 260),
      arcWidth: rounded(25 + intelligence * 0.1 + wisdom * 0.1, 16, 220),
    },
    defense: {
      shape: 'circle', centered: true, offsetX: 0, offsetY: 0,
      effectVariant: 2,
      range: 0,
      arcWidth: rounded(60 + constitution * 0.1 + defense * 0.1, 8, 180),
    },
  };
}

/** Profilo 3 'hero-nyra-mystic', 'hero-liora-herbalist': attacchi frontali estesi, guidati da destrezza e carisma. */
function buildHeroThreeCombatTuning(hero: HeroItem): HeroCombatTuning {
  const force = statValue(hero, 'Forza');
  const dexterity = statValue(hero, 'Destrezza');
  const wisdom = statValue(hero, 'Saggezza');
  const charisma = statValue(hero, 'Carisma');
  const attack = equipSum(hero, 'attack');
  const defense = equipSum(hero, 'defense');
  const speed = equipSum(hero, 'velocita');
  const power = multiplier(hero);

  return {
    attack: {
      shape: 'rectangle', offsetX: 0, offsetY: 0,
      effectType: 'melee-sweep',
      effectVariant: 3,
      attacksPerHold: rounded(1 + Math.floor((dexterity + speed) / 35), 1, 10),
      repeatAfterMs: rounded((620 - dexterity * 5 - speed * 4) / power, 130, 5000),
      range: rounded((50 + dexterity * 0.05 + attack * 0.1), 16, 220),
      arcWidth: rounded(40 + force * 0.1 + dexterity * 0.05, 16, 180),
    },
    special: {
      shape: 'rectangle', offsetX: 0, offsetY: 0,
      effectType: 'beam',
      effectVariant: 3,
      attacksPerHold: rounded(1 + Math.floor(charisma / 70), 1, 4),
      repeatAfterMs: rounded((1150 - wisdom * 4 - charisma * 3) / power, 250, 5000),
      range: rounded((50 + dexterity * 0.1 + wisdom * 0.05), 16, 260),
      arcWidth: rounded(60 + charisma * 0.06 + attack * 0.1, 16, 220),
    },
    defense: {
      shape: 'rectangle', offsetX: 0, offsetY: 0,
      effectVariant: 1,
      range: rounded(38 + dexterity * 0.05 + charisma * 0.05 + defense * 0.1, 8, 140),
      arcWidth: rounded(44 + wisdom * 0.05 + charisma * 0.05 + defense * 0.1, 8, 180),
    },
  };
}

/** Profilo 4 'hero-pip-halfling', 'hero-elin-gatherer': attacchi magici a distanza, basati su intelligenza e saggezza. */
function buildHeroFourCombatTuning(hero: HeroItem): HeroCombatTuning {
  const constitution = statValue(hero, 'Costituzione');
  const intelligence = statValue(hero, 'Intelligenza');
  const wisdom = statValue(hero, 'Saggezza');
  const charisma = statValue(hero, 'Carisma');
  const defense = equipSum(hero, 'defense');
  const power = multiplier(hero);

  return {
    attack: {
      shape: 'rectangle', offsetX: 0, offsetY: 0,
      effectType: 'projectile',
      effectVariant: 4,
      attacksPerHold: rounded(1 + Math.floor((intelligence + wisdom) / 48), 1, 10),
      repeatAfterMs: rounded((780 - intelligence * 4 - wisdom * 3) / power, 180, 5000),
      range: rounded(115 + intelligence * 0.1 + wisdom * 0.1, 32, 220),
      arcWidth: rounded((38 + intelligence * 0.15 + wisdom * 0.15), 16, 200),
    },
    special: {
      shape: 'circle', centered: true, offsetX: 0, offsetY: 0,
      effectType: 'area-burst',
      effectVariant: 4,
      attacksPerHold: rounded(1 + Math.floor(wisdom / 60), 1, 5),
      repeatAfterMs: rounded((1450 - intelligence * 6 - wisdom * 5) / power, 300, 5000),
      range: 0,
      arcWidth: rounded((68 + intelligence * 0.15 + wisdom * 0.05 + charisma * 0.05), 16, 260),
    },
    defense: {
      shape: 'circle', centered: true, offsetX: 0, offsetY: 0,
      effectVariant: 2,
      range: rounded(36 + constitution * 0.05 + wisdom * 0.1, 8, 140),
      arcWidth: rounded(50 + charisma * 0.05 + defense * 0.1, 8, 180),
    },
  };
}

/** Restituisce sempre una copia modificabile del tuning dell'eroe, con fallback a h1. */
export function buildHeroCombatTuning(hero?: HeroItem | null): HeroCombatTuning {
  const heroId = hero?.id ?? '';
  const matchesProfile = (ids: string[]) => ids.some((baseId) => heroId === baseId || heroId.startsWith(`${baseId}-`));
  if (!hero || matchesProfile(HERO_PROFILE_ONE_IDS)) return buildHeroOneCombatTuning(hero);
  if (matchesProfile(HERO_PROFILE_TWO_IDS)) return buildHeroTwoCombatTuning(hero);
  if (matchesProfile(HERO_PROFILE_THREE_IDS)) return buildHeroThreeCombatTuning(hero);
  if (matchesProfile(HERO_PROFILE_FOUR_IDS)) return buildHeroFourCombatTuning(hero);
  return buildHeroOneCombatTuning(hero);
}

export function scaleHeroCombatTuning(
  tuning: HeroCombatTuning,
  multipliers: { attack?: number; defense?: number; special?: number }
): HeroCombatTuning {
  const scale = (value: number | undefined, multiplier = 1): number | undefined =>
    typeof value === 'number' ? Math.max(1, Math.round(value * Math.max(0.1, multiplier))) : value;

  return {
    attack: tuning.attack ? {
      ...tuning.attack,
      range: scale(tuning.attack.range, multipliers.attack),
      arcWidth: scale(tuning.attack.arcWidth, multipliers.attack),
      attacksPerHold: scale(tuning.attack.attacksPerHold, multipliers.attack),
    } : tuning.attack,
    special: tuning.special ? {
      ...tuning.special,
      range: scale(tuning.special.range, multipliers.special),
      arcWidth: scale(tuning.special.arcWidth, multipliers.special),
      attacksPerHold: scale(tuning.special.attacksPerHold, multipliers.special),
    } : tuning.special,
    defense: tuning.defense ? {
      ...tuning.defense,
      range: scale(tuning.defense.range, multipliers.defense),
      arcWidth: scale(tuning.defense.arcWidth, multipliers.defense),
    } : tuning.defense,
  };
}

export function buildMonsterCombatTuning(): NonNullable<
  PhaserCombatTuningParams["monsters"]
> {
  return {
    goblin: {
      attack: {
        shape: "rectangle",
        effectType: 'melee-sweep',
        effectVariant: 1,
        offsetX: 0,
        offsetY: 0,
        range: 46,
        arcWidth: 28,
        attacksPerHold: 1,
        repeatAfterMs: 900,
      },
      special: {
        shape: "rectangle",
        effectType: 'beam',
        effectVariant: 1,
        offsetX: 0,
        offsetY: 0,
        range: 62,
        arcWidth: 42,
        attacksPerHold: 1,
        repeatAfterMs: 1400,
      },
      defense: {
        shape: "rectangle",
        effectVariant: 1,
        offsetX: 0,
        offsetY: 0,
        range: 66,
        arcWidth: 56,
      },
    },
    slime: {
      attack: {
        shape: "circle",
        effectType: 'area-burst',
        effectVariant: 2,
        offsetX: 0,
        offsetY: 0,
        range: 40,
        arcWidth: 28,
        attacksPerHold: 1,
        repeatAfterMs: 1050,
      },
      special: {
        shape: "circle",
        effectType: 'area-burst',
        effectVariant: 2,
        offsetX: 0,
        offsetY: 0,
        range: 76,
        arcWidth: 42,
        attacksPerHold: 1,
        repeatAfterMs: 1550,
      },
      defense: {
        shape: "rectangle",
        effectVariant: 2,
        offsetX: 0,
        offsetY: 0,
        range: 54,
        arcWidth: 48,
      },
    },
    bat: {
      attack: {
        shape: "rectangle",
        effectType: 'melee-sweep',
        effectVariant: 3,
        offsetX: 0,
        offsetY: 0,
        range: 42,
        arcWidth: 28,
        attacksPerHold: 1,
        repeatAfterMs: 760,
      },
      special: {
        shape: "rectangle",
        effectType: 'beam',
        effectVariant: 3,
        offsetX: 0,
        offsetY: 0,
        range: 70,
        arcWidth: 42,
        attacksPerHold: 1,
        repeatAfterMs: 1200,
      },
      defense: {
        shape: "rectangle",
        effectVariant: 1,
        offsetX: 0,
        offsetY: 0,
        range: 58,
        arcWidth: 50,
      },
    },
    skeletor: {
      attack: {
        shape: "rectangle",
        effectType: 'melee-sweep',
        effectVariant: 4,
        offsetX: 0,
        offsetY: 0,
        range: 54,
        arcWidth: 28,
        attacksPerHold: 1,
        repeatAfterMs: 1200,
      },
      special: {
        shape: "rectangle",
        effectType: 'beam',
        effectVariant: 4,
        offsetX: 0,
        offsetY: 0,
        range: 76,
        arcWidth: 32,
        attacksPerHold: 1,
        repeatAfterMs: 1800,
      },
      defense: {
        shape: "rectangle",
        effectVariant: 2,
        offsetX: 0,
        offsetY: 0,
        range: 64,
        arcWidth: 66,
      },
    },
  } satisfies Record<
    MonsterType,
    NonNullable<NonNullable<PhaserCombatTuningParams["monsters"]>[MonsterType]>
  >;
}

export function heroCombatTuningRows(tuning: HeroCombatTuning): Array<{ key: CombatRowKey; label: string; value: number }> {
  return [
    { key: 'attack.attacksPerHold', label: 'Colpi hold attacco eroe', value: tuning.attack?.attacksPerHold ?? 0 },
    { key: 'attack.repeatAfterMs', label: 'Ripeti hold attacco (ms)', value: tuning.attack?.repeatAfterMs ?? 0 },
    { key: 'special.attacksPerHold', label: 'Colpi hold speciale eroe', value: tuning.special?.attacksPerHold ?? 0 },
    { key: 'special.repeatAfterMs', label: 'Ripeti hold speciale (ms)', value: tuning.special?.repeatAfterMs ?? 0 },
    { key: 'attack.range', label: 'Range attacco eroe', value: tuning.attack?.range ?? 0 },
    { key: 'attack.arcWidth', label: 'Ampiezza attacco eroe', value: tuning.attack?.arcWidth ?? 0 },
    { key: 'special.range', label: 'Range speciale eroe', value: tuning.special?.range ?? 0 },
    { key: 'special.arcWidth', label: 'Ampiezza speciale eroe', value: tuning.special?.arcWidth ?? 0 },
    { key: 'defense.range', label: 'Range difesa eroe', value: tuning.defense?.range ?? 0 },
    { key: 'defense.arcWidth', label: 'Ampiezza difesa eroe', value: tuning.defense?.arcWidth ?? 0 },
  ];
}
