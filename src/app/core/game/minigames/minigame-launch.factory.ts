import Phaser from "phaser";
import { HeroItem } from "../../models/game.models";
import { getHeroSpriteAtlasSet } from "../phaser/config/hero-atlas.config";
import { getMonsterSpriteAtlasSet } from "../phaser/config/monster-atlas.config";
import { GameEvent, GameEventType, HeroMinigameStats } from "./game-event.model";
import { MinigameOverlayPayload, MinigameType } from "./minigame.model";
import { MinigameResolverService } from "./minigame-resolver.service";

const DEFAULT_MINIGAME_DIFFICULTY: Record<GameEventType, number> = {
  monster: 4,
  trap: 5,
  treasure: 4,
  slot: 4,
};

export interface StandaloneMinigameLaunchOptions {
  type: GameEventType;
  hero: HeroItem;
  difficulty?: number;
  preferredMinigameType?: MinigameType;
  onComplete?: MinigameOverlayPayload["onComplete"];
}

export function buildStandaloneMinigamePayload(
  options: StandaloneMinigameLaunchOptions,
): MinigameOverlayPayload {
  const event = buildStandaloneMinigameEvent(options.type, options.difficulty, options.preferredMinigameType);
  const heroStats = buildHeroMinigameStatsFromHero(options.hero);
  const resolver = new MinigameResolverService();
  const config = resolver.resolve(event, heroStats);
  config.heroHud = buildMinigameHeroHud(options.hero);
  config.monsterHud = buildMinigameMonsterHud(options.hero, event.difficulty);
  config.combatVisuals = buildMinigameCombatVisuals(options.hero);
  config.combatEncounter = buildMinigameCombatEncounter(options.hero, event.difficulty);

  return {
    event,
    heroStats,
    config,
    onComplete: options.onComplete,
  };
}

export function buildStandaloneMinigameEvent(
  type: GameEventType,
  difficulty = DEFAULT_MINIGAME_DIFFICULTY[type],
  minigameType?: MinigameType,
): GameEvent {
  const resolvedDifficulty = Phaser.Math.Clamp(
    Math.round(Number(difficulty) || DEFAULT_MINIGAME_DIFFICULTY[type]),
    1,
    10,
  );

  if (type === "monster") {
    return {
      id: `standalone-monster-${resolvedDifficulty}`,
      type,
      title: "Goblin Campione",
      difficulty: resolvedDifficulty,
      minigameType,
      primarySkill: "dexterity",
      secondarySkill: "strength",
      rewardValue: 20 + resolvedDifficulty * 4,
      damageValue: 6 + resolvedDifficulty,
    };
  }

  if (type === "trap") {
    return {
      id: `standalone-trap-${resolvedDifficulty}`,
      type,
      title: "Trappola di prova",
      difficulty: resolvedDifficulty,
      minigameType,
      primarySkill: "dexterity",
      secondarySkill: "defense",
      rewardValue: 10 + resolvedDifficulty * 2,
      damageValue: 7 + resolvedDifficulty,
    };
  }

  if (type === "slot") {
    return {
      id: `standalone-slot-${resolvedDifficulty}`,
      type,
      title: "Sala delle rune",
      difficulty: resolvedDifficulty,
      minigameType,
      primarySkill: "luck",
      secondarySkill: "intelligence",
      rewardValue: 14 + resolvedDifficulty * 3,
      damageValue: 0,
    };
  }

  return {
    id: `standalone-treasure-${resolvedDifficulty}`,
    type,
    title: "Scrigno runico",
    difficulty: resolvedDifficulty,
    minigameType,
    primarySkill: "dexterity",
    secondarySkill: "luck",
    rewardValue: 14 + resolvedDifficulty * 3,
    damageValue: 0,
  };
}

export function buildHeroMinigameStatsFromHero(hero: HeroItem): HeroMinigameStats {
  return {
    strength: getHeroAttributeValue(hero, "Forza"),
    dexterity: getHeroAttributeValue(hero, "Destrezza"),
    intelligence: getHeroAttributeValue(hero, "Intelligenza"),
    defense: Math.max(1, Math.round(Number(hero.defense ?? 0))),
    luck: getHeroAttributeValue(hero, "Carisma"),
    fatigue: Math.max(0, Math.round(Number(hero.fatigue?.current ?? 0))),
  };
}

function getHeroAttributeValue(hero: HeroItem, title: string): number {
  const normalized = normalizeText(title);
  const stat = hero.stats?.find((item) =>
    normalizeText(item.title) === normalized || normalizeText(item.id) === normalized,
  );

  return Math.max(
    0,
    Number(stat?.progress?.current ?? 0) + Number(stat?.bonus ?? 0) - Number(stat?.malus ?? 0),
  );
}

function normalizeText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildMinigameHeroHud(hero: HeroItem) {
  const atlas = getHeroSpriteAtlasSet(hero).directions.down;

  return {
    portraitAtlasKey: atlas.key,
    portraitImageUrl: atlas.imageUrl,
    portraitAtlasData: atlas.atlasData,
    portraitFrameName: "standing0001",
    health: {
      current: Math.max(0, Math.round(Number(hero.heal?.current ?? hero.heal?.total ?? 1))),
      total: Math.max(1, Math.round(Number(hero.heal?.total ?? 1))),
    },
    mana: {
      current: Math.max(0, Math.round(Number(hero.mana?.current ?? hero.mana?.total ?? 0))),
      total: Math.max(1, Math.round(Number(hero.mana?.total ?? 1))),
    },
    fatigue: {
      current: Math.max(0, Math.round(Number(hero.fatigue?.current ?? 0))),
      total: Math.max(1, Math.round(Number(hero.fatigue?.total ?? 1))),
    },
  };
}

function buildMinigameMonsterHud(hero: HeroItem, difficulty: number) {
  const maxHealth = Math.max(18, Math.round((hero.heal?.total ?? 24) * (0.55 + difficulty * 0.09)));
  const maxMana = Math.max(8, Math.round((hero.mana?.total ?? 12) * (0.45 + difficulty * 0.06)));

  return {
    name: "Mostro",
    health: {
      current: maxHealth,
      total: maxHealth,
    },
    mana: {
      current: maxMana,
      total: maxMana,
    },
  };
}

function buildMinigameCombatEncounter(hero: HeroItem, difficulty: number) {
  const monsterHud = buildMinigameMonsterHud(hero, difficulty);

  return {
    hero: {
      hp: Math.max(0, Math.round(Number(hero.heal?.current ?? hero.heal?.total ?? 1))),
      maxHp: Math.max(1, Math.round(Number(hero.heal?.total ?? 1))),
      mp: Math.max(0, Math.round(Number(hero.mana?.current ?? hero.mana?.total ?? 0))),
      maxMp: Math.max(1, Math.round(Number(hero.mana?.total ?? 1))),
    },
    monster: {
      name: monsterHud.name,
      hp: monsterHud.health.current,
      maxHp: monsterHud.health.total,
      mp: monsterHud.mana.current,
      maxMp: monsterHud.mana.total,
    },
  };
}

function buildMinigameCombatVisuals(hero: HeroItem) {
  const heroAtlasSet = getHeroSpriteAtlasSet(hero);
  const monsterAtlasSet = getMonsterSpriteAtlasSet();

  return {
    monsterScale: monsterAtlasSet.directions.down.scale,
    heroDownAtlas: {
      atlasKey: heroAtlasSet.directions.down.key,
      imageUrl: heroAtlasSet.directions.down.imageUrl,
      atlasData: heroAtlasSet.directions.down.atlasData,
      idleFrameName: "standing0001",
    },
    heroUpAtlas: {
      atlasKey: heroAtlasSet.directions.up.key,
      imageUrl: heroAtlasSet.directions.up.imageUrl,
      atlasData: heroAtlasSet.directions.up.atlasData,
      idleFrameName: "standing0001",
    },
    heroHorizAtlas: {
      atlasKey: heroAtlasSet.directions.horiz.key,
      imageUrl: heroAtlasSet.directions.horiz.imageUrl,
      atlasData: heroAtlasSet.directions.horiz.atlasData,
      idleFrameName: "standing0001",
    },
    monsterDownAtlas: {
      atlasKey: monsterAtlasSet.directions.down.key,
      imageUrl: monsterAtlasSet.directions.down.imageUrl,
      atlasData: monsterAtlasSet.directions.down.atlasData,
      idleFrameName: "standing0001",
    },
    monsterHorizAtlas: {
      atlasKey: monsterAtlasSet.directions.horiz.key,
      imageUrl: monsterAtlasSet.directions.horiz.imageUrl,
      atlasData: monsterAtlasSet.directions.horiz.atlasData,
      idleFrameName: "standing0001",
    },
  };
}
