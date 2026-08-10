import { AttributeType, FrameItem, HeroItem } from "../../../models/game.models";
import {
  PhaserEventMinigameEncounterType,
  PhaserEventMinigameModeConfig,
  PhaserEventMinigameModeId,
  PhaserEventMinigameProbabilities,
} from "../../../models/phaser-game-state.model";

type EventMinigameModeDefinition = {
  id: PhaserEventMinigameModeId;
  label: string;
  statId?: AttributeType;
  focusEncounterType?: PhaserEventMinigameEncounterType;
  baseProbabilities: PhaserEventMinigameProbabilities;
  iconFrame: FrameItem;
  fallbackFrame: FrameItem;
  description: string;
};

export type EventMinigameModePreview = PhaserEventMinigameModeConfig & {
  description: string;
  frame: FrameItem;
  iconFrame: FrameItem;
};

export const DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT = 0.3;

const EVENT_MINIGAME_MODE_DEFINITIONS: Record<PhaserEventMinigameModeId, EventMinigameModeDefinition> = {
  strength: {
    id: "strength",
    label: "For",
    statId: "Forza",
    focusEncounterType: "combat",
    baseProbabilities: { combat: 0.3, trap: 0.6, treasure: 0.95 },
    iconFrame: { name: "skill-fist", effect: "none" },
    fallbackFrame: { name: "skill-fist", effect: "none" },
    description: "Riduce i minigiochi di combattimento e spinge di piu' trappole e tesori.",
  },
  dexterity: {
    id: "dexterity",
    label: "Des",
    statId: "Destrezza",
    focusEncounterType: "trap",
    baseProbabilities: { combat: 0.5, trap: 0.3, treasure: 0.3 },
    iconFrame: { name: "skill-feather-arrow", effect: "none" },
    fallbackFrame: { name: "skill-feather-arrow", effect: "none" },
    description: "Favorisce una run piu' agile, con meno interruzioni sulle trappole.",
  },
  intelligence: {
    id: "intelligence",
    label: "Int",
    statId: "Intelligenza",
    focusEncounterType: "treasure",
    baseProbabilities: { combat: 0.8, trap: 0.4, treasure: 0.3 },
    iconFrame: { name: "skill-magic-book", effect: "none" },
    fallbackFrame: { name: "skill-magic-book", effect: "none" },
    description: "Tiene i tesori piu' fluidi e concentra piu' eventi sul combattimento.",
  },
  luck: {
    id: "luck",
    label: "Luck",
    baseProbabilities: { combat: 0.5, trap: 0.5, treasure: 0.5 },
    iconFrame: { name: "skill-mask", effect: "none" },
    fallbackFrame: { name: "skill-mask", effect: "none" },
    description: "Bilanciato e neutro. Al momento non riceve bonus dalle statistiche.",
  },
};

export const EVENT_MINIGAME_MODE_ORDER: PhaserEventMinigameModeId[] = [
  "strength",
  "dexterity",
  "intelligence",
  "luck",
];

export function buildEventMinigameModeConfig(
  modeId: PhaserEventMinigameModeId,
  hero: HeroItem,
  maxStatInfluencePercent = DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT,
): PhaserEventMinigameModeConfig {
  const definition = EVENT_MINIGAME_MODE_DEFINITIONS[modeId];
  const statValue = definition.statId ? getHeroStatValue(hero, definition.statId) : 0;
  const statMaxValue = definition.statId ? getHeroStatMaxValue(hero, definition.statId, statValue) : 0;
  const normalizedValue = definition.statId && statMaxValue > 0
    ? clamp(statValue / statMaxValue, 0, 1)
    : 0;
  const statInfluencePercent = definition.statId
    ? clamp(normalizedValue * maxStatInfluencePercent, 0, maxStatInfluencePercent)
    : 0;
  const perChannelDelta = statInfluencePercent / 3;

  return {
    modeId: definition.id,
    label: definition.label,
    statId: definition.statId,
    focusEncounterType: definition.focusEncounterType,
    baseProbabilities: { ...definition.baseProbabilities },
    resolvedProbabilities: resolveProbabilities(definition.baseProbabilities, definition.focusEncounterType, perChannelDelta),
    statValue,
    statMaxValue,
    statInfluencePercent,
    maxStatInfluencePercent,
  };
}

export function buildEventMinigameModePreview(
  modeId: PhaserEventMinigameModeId,
  hero: HeroItem,
  maxStatInfluencePercent = DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT,
): EventMinigameModePreview {
  const definition = EVENT_MINIGAME_MODE_DEFINITIONS[modeId];
  const heroStat = definition.statId
    ? hero.stats.find((item) => item.id === definition.statId)
    : undefined;

  return {
    ...buildEventMinigameModeConfig(modeId, hero, maxStatInfluencePercent),
    description: definition.description,
    frame: heroStat?.frame ?? definition.fallbackFrame,
    iconFrame: definition.iconFrame,
  };
}

function resolveProbabilities(
  base: PhaserEventMinigameProbabilities,
  focusEncounterType: PhaserEventMinigameEncounterType | undefined,
  perChannelDelta: number,
): PhaserEventMinigameProbabilities {
  if (!focusEncounterType || perChannelDelta <= 0) {
    return { ...base };
  }

  return {
    combat: clamp(base.combat + (focusEncounterType === "combat" ? -perChannelDelta : perChannelDelta), 0, 1),
    trap: clamp(base.trap + (focusEncounterType === "trap" ? -perChannelDelta : perChannelDelta), 0, 1),
    treasure: clamp(base.treasure + (focusEncounterType === "treasure" ? -perChannelDelta : perChannelDelta), 0, 1),
  };
}

function getHeroStatValue(hero: HeroItem, statId: AttributeType): number {
  const stat = hero.stats.find((item) => item.id === statId);
  return Math.max(0, Number(stat?.progress.current ?? 0) + Number(stat?.bonus ?? 0) - Number(stat?.malus ?? 0));
}

function getHeroStatMaxValue(hero: HeroItem, statId: AttributeType, fallbackValue: number): number {
  const stat = hero.stats.find((item) => item.id === statId);
  return Math.max(1, Number(stat?.progress.total ?? 0), fallbackValue);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
