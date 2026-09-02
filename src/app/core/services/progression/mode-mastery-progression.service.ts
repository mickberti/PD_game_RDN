import { Injectable } from '@angular/core';
import { Progress, masteryType } from '../../models/game.models';
import { RDN_MAX_LEVEL, rdnSphereCountForLevel } from '../../game/phaser/config/levels.config';

export interface ModeMasteryProgression {
  mastery: masteryType;
  levelsPlayed: number;
  levelsPlayedInMastery: number;
  levelsRequiredForCurrentMastery: number;
  levelsRequiredForNextMastery: number;
  progress: Progress;
}

const MIN_MASTERY = 1;
const MAX_MASTERY = 10;
interface GemDifficultyBand {
  gems: masteryType;
  startLevel: number;
  endLevel: number;
}

/** Derives each difficulty step from the generated board's gem count. */
function gemDifficultyBandForLevel(level: number): GemDifficultyBand {
  const currentLevel = Math.max(1, Math.min(RDN_MAX_LEVEL, Math.floor(level || 1)));
  const gems = rdnSphereCountForLevel(currentLevel) as masteryType;
  let startLevel = currentLevel;
  let endLevel = currentLevel;

  while (startLevel > 1 && rdnSphereCountForLevel(startLevel - 1) === gems) startLevel -= 1;
  while (endLevel < RDN_MAX_LEVEL && rdnSphereCountForLevel(endLevel + 1) === gems) endLevel += 1;

  return { gems, startLevel, endLevel };
}

/** Kept for callers that need the current band size; it is no longer exponential. */
export function levelsRequiredForModeMastery(mastery: number): number {
  const gems = Math.max(MIN_MASTERY, Math.min(MAX_MASTERY, Math.floor(mastery || MIN_MASTERY))) as masteryType;
  for (let level = 1; level <= RDN_MAX_LEVEL; level += 1) {
    const band = gemDifficultyBandForLevel(level);
    if (band.gems === gems) return band.endLevel - band.startLevel + 1;
  }
  return 0;
}

export function calculateModeMasteryProgression(levelsPlayed: number): ModeMasteryProgression {
  const normalizedLevelsPlayed = Math.max(0, Math.floor(levelsPlayed || 0));
  const nextPlayableLevel = Math.min(RDN_MAX_LEVEL, normalizedLevelsPlayed + 1);
  const band = gemDifficultyBandForLevel(nextPlayableLevel);
  const levelsRequiredForCurrentMastery = band.endLevel - band.startLevel + 1;
  const levelsPlayedInMastery = nextPlayableLevel - band.startLevel;
  const mastery = band.gems;

  return {
    mastery: mastery as masteryType,
    levelsPlayed: normalizedLevelsPlayed,
    levelsPlayedInMastery,
    levelsRequiredForCurrentMastery,
    levelsRequiredForNextMastery: Math.max(0, levelsRequiredForCurrentMastery - levelsPlayedInMastery),
    progress: {
      descr: `Difficoltà: ${mastery} gemme`,
      current: levelsPlayedInMastery,
      total: levelsRequiredForCurrentMastery,
    },
  };
}

export function modeLevelsToLevelsPlayed(nextMatchLevel: number): number {
  return Math.max(0, Math.floor(nextMatchLevel || 1) - 1);
}

@Injectable({ providedIn: 'root' })
export class ModeMasteryProgressionService {
  calculate(levelsPlayed: number): ModeMasteryProgression {
    return calculateModeMasteryProgression(levelsPlayed);
  }

  calculateFromNextMatchLevel(nextMatchLevel: number): ModeMasteryProgression {
    return this.calculate(modeLevelsToLevelsPlayed(nextMatchLevel));
  }
}
