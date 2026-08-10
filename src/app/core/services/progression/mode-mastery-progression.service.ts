import { Injectable } from '@angular/core';
import { Progress, masteryType } from '../../models/game.models';

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
const BASE_LEVELS_PER_MASTERY = 3;
const MASTERY_GROWTH_EXPONENT = 1.45;

export function levelsRequiredForModeMastery(mastery: number): number {
  const normalizedMastery = Math.max(MIN_MASTERY, Math.min(MAX_MASTERY, Math.floor(mastery || MIN_MASTERY)));
  return Math.max(1, Math.round(BASE_LEVELS_PER_MASTERY * Math.pow(normalizedMastery, MASTERY_GROWTH_EXPONENT)));
}

export function calculateModeMasteryProgression(levelsPlayed: number): ModeMasteryProgression {
  const normalizedLevelsPlayed = Math.max(0, Math.floor(levelsPlayed || 0));
  let remainingLevels = normalizedLevelsPlayed;
  let mastery = MIN_MASTERY;
  let levelsRequiredForCurrentMastery = levelsRequiredForModeMastery(mastery);

  while (mastery < MAX_MASTERY && remainingLevels >= levelsRequiredForCurrentMastery) {
    remainingLevels -= levelsRequiredForCurrentMastery;
    mastery += 1;
    levelsRequiredForCurrentMastery = levelsRequiredForModeMastery(mastery);
  }

  const levelsPlayedInMastery = mastery >= MAX_MASTERY
    ? Math.min(remainingLevels, levelsRequiredForCurrentMastery)
    : remainingLevels;

  return {
    mastery: mastery as masteryType,
    levelsPlayed: normalizedLevelsPlayed,
    levelsPlayedInMastery,
    levelsRequiredForCurrentMastery,
    levelsRequiredForNextMastery: mastery >= MAX_MASTERY ? 0 : levelsRequiredForCurrentMastery - levelsPlayedInMastery,
    progress: {
      descr: `Mastery ${mastery}`,
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
