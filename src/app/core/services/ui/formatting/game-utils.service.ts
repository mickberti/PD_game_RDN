import { Injectable } from "@angular/core";
import { rdnSphereCountForLevel } from "../../../game/rnd/levels.config";

@Injectable({ providedIn: "root" })
export class GameUtilsService {
  /**
   * Converte il valore numerico di maestria in una lista ordinata di frame stella.
   * Ogni blocco completo da cinque punti genera una stella prestigio piena, mentre
   * l'eventuale resto genera un frame parziale che rappresenta l'avanzamento residuo.
   */
  calculateMasteryStars(mastery: number): string[] {
    const result: string[] = [];
    const prestigeCount = Math.floor(mastery / 5);
    const remainingMastery = mastery % 5;

	for (let i = 0; i < prestigeCount; i++) {
	  result.push('rank-laurel-green-star');
	}

	if (remainingMastery > 0) {
	  result.push(`rank-green-${remainingMastery}-star`);
	}
	
    return result;
  }

  /**
   * Renders the game-mode difficulty stars from the current board configuration.
   * The displayed step therefore changes exactly when the level introduces a gem.
   */
  calculateModeDifficultyStars(level: number): string[] {
    return this.calculateMasteryStars(rdnSphereCountForLevel(level)-3);
  }

  /**
   * Converte il valore numerico di maestria in una lista ordinata di frame stella.
   * Ogni blocco completo da cinque punti genera una stella prestigio piena, mentre
   * l'eventuale resto genera un frame parziale che rappresenta l'avanzamento residuo.
   */
  calculateLevelStars(level: number): string[] {
    const result: string[] = [];
    const prestigeCount = Math.floor(level / 5);
    const remainingMastery = level % 5;

	for (let i = 0; i < prestigeCount; i++) {
	  result.push('rank-blue-star');
	}

	if (remainingMastery > 0) {
	  result.push(`rank-blue-${remainingMastery}-star`);
	}

    return result;
  }

  /**
   * Compatta i valori numerici per risparmiare spazio nelle UI dense.
   * Usa K per le migliaia e M per i milioni, mantenendo al massimo un decimale
   * significativo e lasciando invariati i valori sotto quota 1000.
   */
  formatCompactNumber(value: number | string | null | undefined): string {
    return GameUtilsService.formatCompactNumber(value);
  }

  /**
   * Compatta tutti i numeri presenti in una stringa, utile per label composte
   * come bottoni o descrizioni brevi.
   */
  formatCompactNumbersInText(value: string | number | null | undefined): string {
    return GameUtilsService.formatCompactNumbersInText(value);
  }

  static formatCompactNumber(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numericValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numericValue)) {
      return String(value);
    }

    const sign = numericValue < 0 ? '-' : '';
    const absoluteValue = Math.abs(numericValue);

    if (absoluteValue < 1000) {
      return Number.isInteger(numericValue) ? String(numericValue) : String(value);
    }

    const compactValue = absoluteValue >= 1_000_000
      ? GameUtilsService.formatCompactUnit(absoluteValue, 1_000_000, 'M')
      : GameUtilsService.formatCompactUnit(absoluteValue, 1_000, 'K');

    return `${sign}${compactValue}`;
  }

  static formatCompactNumbersInText(value: string | number | null | undefined): string {
    if (typeof value === 'number') {
      return GameUtilsService.formatCompactNumber(value);
    }

    if (value === null || value === undefined || value === '') {
      return '';
    }

    return String(value).replace(/-?\d+(?:[.,]\d+)?/g, (match) => {
      const normalizedMatch = match.replace(',', '.');
      const numericValue = Number(normalizedMatch);

      if (!Number.isFinite(numericValue) || Math.abs(numericValue) < 1000) {
        return match;
      }

      return GameUtilsService.formatCompactNumber(numericValue);
    });
  }

  /**
   * Estrae un numero casuale di elementi unici da una lista senza modificare l'array originale.
   * Normalizza il conteggio richiesto, mischia una copia della lista con Fisher-Yates
   * e restituisce al massimo tanti elementi quanti sono quelli disponibili.
   */
  static getRandomItemsFromList<T>(items: readonly T[], count: number): T[] {
    if (!Number.isFinite(count) || count <= 0 || items.length === 0) {
      return [];
    }

    const safeCount = Math.min(Math.floor(count), items.length);
    const shuffled = GameUtilsService.shuffle(items);

    return shuffled.slice(0, safeCount);
  }

  /**
   * Crea una copia casualmente ordinata della lista ricevuta.
   * Applica l'algoritmo Fisher-Yates su un nuovo array, quindi preserva l'immutabilità
   * dell'input e produce una distribuzione uniforme degli elementi.
   */
  static shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
    }

    return result;
  }

  private static formatCompactUnit(value: number, unit: number, suffix: 'K' | 'M'): string {
    const compactValue = Math.floor((value / unit) * 10) / 10;
    return `${GameUtilsService.trimCompactDecimal(compactValue)}${suffix}`;
  }

  private static trimCompactDecimal(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  }
}
