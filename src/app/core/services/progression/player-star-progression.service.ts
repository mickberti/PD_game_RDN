import { HERO_LEVEL_FACTORS } from "../../config/game-progression.config";
import { GameProgress } from "../../models/remote/progress.models";

export interface PlayerStarProgression {
  totalStars: number;
  experience: number;
  level: number;
  experienceIntoLevel: number;
  experienceForNextLevel: number;
}

/** Stars use a deliberately slower rate than hero experience. */
const EXPERIENCE_PER_STAR = 25;

/** Cost to advance from the supplied level to the next one. */
export const experienceRequiredForPlayerLevel = (level: number): number =>
  Math.max(1, Math.round(HERO_LEVEL_FACTORS.baseExperience * Math.pow(Math.max(1, Math.floor(level)), HERO_LEVEL_FACTORS.experienceExponent)));

/** Best-star records are monotonic per mode and level, so replaying cannot inflate the player level. */
export const totalCollectedModeStars = (gameModeLevelStars: GameProgress["gameModeLevelStars"] | undefined): number =>
  Object.values(gameModeLevelStars ?? {}).reduce((modeTotal, levels) =>
    modeTotal + Object.values(levels).reduce((levelTotal, stars) => levelTotal + Math.max(0, Math.min(3, Math.floor(Number(stars) || 0))), 0), 0);

export const calculatePlayerStarProgression = (gameModeLevelStars: GameProgress["gameModeLevelStars"] | undefined): PlayerStarProgression => {
  const totalStars = totalCollectedModeStars(gameModeLevelStars);
  const experience = totalStars * EXPERIENCE_PER_STAR;
  let level = 1;
  let experienceIntoLevel = experience;

  while (experienceIntoLevel >= experienceRequiredForPlayerLevel(level)) {
    experienceIntoLevel -= experienceRequiredForPlayerLevel(level);
    level += 1;
  }

  return {
    totalStars,
    experience,
    level,
    experienceIntoLevel,
    experienceForNextLevel: experienceRequiredForPlayerLevel(level),
  };
};
