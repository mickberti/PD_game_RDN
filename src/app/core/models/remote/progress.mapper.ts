import { ChestItem, EquipItem, HeroItem, ResourceItem } from '../game.models';
import { DEFAULT_GAME_PROGRESS, DEFAULT_PLAYER_STATISTICS, GameInventory, GameProgress } from './progress.models';

export interface MockGameProgressSeed {
  resources?: ResourceItem[];
  boxes?: ChestItem[];
  equip?: EquipItem[];
  heroes?: HeroItem[];
  selectedHeroId?: string;
}

type LegacyGameInventoryFields = Partial<GameInventory>;

type LegacyGameProgressDocument = Partial<GameProgress> & LegacyGameInventoryFields & {
  inventory?: Partial<GameInventory> | null;
};

const cloneArray = <T>(items: T[] | undefined): T[] => items?.map((item) => ({ ...item })) ?? [];

const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);

const normalizeInventory = (progress?: LegacyGameProgressDocument | null): GameInventory => {
  const inventory = progress?.inventory;
  const heroes = isArray<HeroItem>(inventory?.heroes)
    ? cloneArray(inventory?.heroes)
    : isArray<HeroItem>(progress?.heroes)
      ? cloneArray(progress?.heroes)
      : [];

  const selectedHeroId = typeof inventory?.selectedHeroId === 'string'
    ? inventory.selectedHeroId
    : typeof progress?.selectedHeroId === 'string'
      ? progress.selectedHeroId
      : heroes[0]?.id;

  return {
    resources: isArray<ResourceItem>(inventory?.resources)
      ? cloneArray(inventory?.resources)
      : isArray<ResourceItem>(progress?.resources)
        ? cloneArray(progress?.resources)
        : [],
    boxes: isArray<ChestItem>(inventory?.boxes)
      ? cloneArray(inventory?.boxes)
      : isArray<ChestItem>(progress?.boxes)
        ? cloneArray(progress?.boxes)
        : [],
    equip: isArray<EquipItem>(inventory?.equip)
      ? cloneArray(inventory?.equip)
      : isArray<EquipItem>(progress?.equip)
        ? cloneArray(progress?.equip)
        : [],
    heroes,
    ...(selectedHeroId ? { selectedHeroId } : {}),
  };
};

const normalizeGameModeLevelStars = (value: unknown): Record<string, Record<string, number>> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, Record<string, number>>>((modes, [modeId, levels]) => {
    if (!levels || typeof levels !== 'object' || Array.isArray(levels)) return modes;
    const normalizedLevels = Object.entries(levels as Record<string, unknown>).reduce<Record<string, number>>((result, [level, stars]) => {
      const numericStars = Number(stars);
      if (Number.isFinite(numericStars) && numericStars >= 1) {
        result[level] = Math.min(3, Math.floor(numericStars));
      }
      return result;
    }, {});
    if (Object.keys(normalizedLevels).length > 0) modes[modeId] = normalizedLevels;
    return modes;
  }, {});
};

export const normalizeGameProgress = (progress?: LegacyGameProgressDocument | null): GameProgress => {
  const inventory = normalizeInventory(progress);

  const {
    resources: _legacyResources,
    boxes: _legacyChestes,
    equip: _legacyEquip,
    heroes: _legacyHeroes,
    selectedHeroId: _legacySelectedHeroId,
    ...progressFields
  } = progress ?? {};

  return {
    ...DEFAULT_GAME_PROGRESS,
    ...progressFields,
    dust: typeof progress?.dust === 'number' ? progress.dust : DEFAULT_GAME_PROGRESS.dust,
    statistics: {
      ...DEFAULT_PLAYER_STATISTICS,
      ...(progress?.statistics ?? {}),
    },
    claimedStatisticAwardTiers: {
      ...(progress?.claimedStatisticAwardTiers ?? {}),
    },
    gameModeLevels: {
      ...(progress?.gameModeLevels ?? {}),
    },
    gameModeLevelStars: normalizeGameModeLevelStars(progress?.gameModeLevelStars),
    activatedEvents: {
      ...(progress?.activatedEvents ?? {}),
    },
    inventory,
  };
};

const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, item]) => {
      if (item !== undefined) {
        return {
          ...accumulator,
          [key]: stripUndefined(item),
        };
      }

      return accumulator;
    }, {} as T);
  }

  return value;
};

export const serializeGameProgress = (progress: GameProgress): GameProgress => stripUndefined(normalizeGameProgress(progress));

export const createMockGameProgress = (
  seed: MockGameProgressSeed = {},
  overrides: Partial<Omit<GameProgress, keyof MockGameProgressSeed>> = {}
): GameProgress => {
  const resources = cloneArray(seed.resources);
  const boxes = cloneArray(seed.boxes);
  const equip = cloneArray(seed.equip);
  const heroes = cloneArray(seed.heroes);
  const selectedHeroId = seed.selectedHeroId ?? heroes[0]?.id;
  const inventory: GameInventory = {
    resources,
    boxes,
    equip,
    heroes,
    ...(selectedHeroId ? { selectedHeroId } : {}),
  };

  return normalizeGameProgress({
    ...DEFAULT_GAME_PROGRESS,
    ...overrides,
    inventory,
  });
};
