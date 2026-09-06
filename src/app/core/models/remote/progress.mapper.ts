import { DEFAULT_GAME_PROGRESS, DEFAULT_PLAYER_STATISTICS, GameInventory, GameProgress } from './progress.models';
import { RDN_ACTION_IDS, RdnActionId } from '../../game/phaser/config/rdn-actions.config';

export interface MockGameProgressSeed { actions?: Partial<Record<RdnActionId, number>>; }
type LegacyGameProgressDocument = Partial<GameProgress> & { inventory?: Partial<GameInventory> | null; actions?: Partial<Record<RdnActionId, number>>; };

const normalizeInventory = (progress?: LegacyGameProgressDocument | null): GameInventory => {
  const inventory = progress?.inventory;
  const raw = inventory?.actions ?? progress?.actions ?? {};
  const actions = RDN_ACTION_IDS.reduce<Partial<Record<RdnActionId, number>>>((result, id) => {
    const quantity = Number(raw[id] ?? 0);
    if (Number.isFinite(quantity) && quantity > 0) result[id] = Math.floor(quantity);
    return result;
  }, {});
  return { actions };
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

  const { actions: _legacyActions, ...progressFields } = progress ?? {};

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

export const serializeGameProgress = (progress: GameProgress): GameProgress => {
  const normalized = normalizeGameProgress(progress);
  return stripUndefined(normalized);
};

export const createMockGameProgress = (
  seed: MockGameProgressSeed = {},
  overrides: Partial<Omit<GameProgress, keyof MockGameProgressSeed>> = {}
): GameProgress => {
  const inventory: GameInventory = { actions: { ...(seed.actions ?? {}) } };

  return normalizeGameProgress({
    ...DEFAULT_GAME_PROGRESS,
    ...overrides,
    inventory,
  });
};
