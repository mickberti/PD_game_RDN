import { Injectable } from "@angular/core";
import { ModeItem } from "../../models/game.models";
import {
  GameplayDebugMinigameType,
  GameplaySession,
  GameplaySessionLaunchOptions,
  GameplaySessionLaunchOverrides,
  GameplaySessionVariant,
} from "../../models/gameplay-session.model";

const GAMEPLAY_MODE_ID_STORAGE_KEY = "activeMatchModeId";
const GAMEPLAY_MODE_TITLE_STORAGE_KEY = "activeMatchModeTitle";
const GAMEPLAY_LEVEL_STORAGE_KEY = "activeMatchLevel";
const GAMEPLAY_MASTERY_STORAGE_KEY = "activeMatchMastery";
const GAMEPLAY_VARIANT_STORAGE_KEY = "activeMatchVariant";
const GAMEPLAY_LAUNCH_OVERRIDES_STORAGE_KEY = "activeMatchLaunchOverrides";
const GAMEPLAY_DEBUG_MINIGAME_STORAGE_KEY = "activeMatchDebugMinigame";

@Injectable({ providedIn: "root" })
export class GameplaySessionService {
  startSession(
    mode: ModeItem | null | undefined,
    matchLevel: number,
    mastery: number,
    options?: GameplaySessionLaunchOptions,
  ): GameplaySession {
    const session = this.createSession(
      mode,
      matchLevel,
      mastery,
      options?.variant,
    );
    this.persistSession(session);
    this.persistLaunchOverrides(options?.overrides ?? null);
    this.persistDebugMinigame(options?.debugMinigame ?? null);
    return session;
  }

  getActiveSession(defaultVariant: GameplaySessionVariant = "time-attack"): GameplaySession {
    return {
      modeId: this.readString(GAMEPLAY_MODE_ID_STORAGE_KEY, "default"),
      modeTitle: this.readString(GAMEPLAY_MODE_TITLE_STORAGE_KEY, "Game Mode"),
      matchLevel: this.readNumber(GAMEPLAY_LEVEL_STORAGE_KEY, 1),
      mastery: this.readNumber(GAMEPLAY_MASTERY_STORAGE_KEY, 1),
      variant: this.readVariant(defaultVariant),
    };
  }

  getRouteForVariant(variant: GameplaySessionVariant): string {
    return `/gameplay/${variant}`;
  }

  getLaunchOverrides(): GameplaySessionLaunchOverrides | undefined {
    const value = localStorage.getItem(GAMEPLAY_LAUNCH_OVERRIDES_STORAGE_KEY);
    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value) as GameplaySessionLaunchOverrides;
    } catch {
      return undefined;
    }
  }

  updateLaunchOverrides(overrides: GameplaySessionLaunchOverrides | null): void {
    this.persistLaunchOverrides(overrides);
  }

  consumeDebugMinigame(): GameplayDebugMinigameType | null {
    const value = localStorage.getItem(GAMEPLAY_DEBUG_MINIGAME_STORAGE_KEY);
    localStorage.removeItem(GAMEPLAY_DEBUG_MINIGAME_STORAGE_KEY);
    return value === "monster" || value === "trap" || value === "treasure"
      ? value
      : null;
  }

  resolveVariant(modeId: string | null | undefined): GameplaySessionVariant {
    return modeId === "time-attack" ? "time-attack" : "adventure";
  }

  private createSession(
    mode: ModeItem | null | undefined,
    matchLevel: number,
    mastery: number,
    variant?: GameplaySessionVariant,
  ): GameplaySession {
    return {
      modeId: mode?.id ?? "default",
      modeTitle: mode?.title ?? "Game Mode",
      matchLevel: this.normalizeNumber(matchLevel, 1),
      mastery: this.normalizeNumber(mastery, 1),
      variant: variant ?? this.resolveVariant(mode?.id),
    };
  }

  private persistSession(session: GameplaySession): void {
    localStorage.setItem(GAMEPLAY_MODE_ID_STORAGE_KEY, session.modeId);
    localStorage.setItem(GAMEPLAY_MODE_TITLE_STORAGE_KEY, session.modeTitle);
    localStorage.setItem(GAMEPLAY_LEVEL_STORAGE_KEY, String(session.matchLevel));
    localStorage.setItem(GAMEPLAY_MASTERY_STORAGE_KEY, String(session.mastery));
    localStorage.setItem(GAMEPLAY_VARIANT_STORAGE_KEY, session.variant);
  }

  private readVariant(fallback: GameplaySessionVariant): GameplaySessionVariant {
    const value = localStorage.getItem(GAMEPLAY_VARIANT_STORAGE_KEY);
    return value === "time-attack" || value === "adventure" ? value : fallback;
  }

  private persistLaunchOverrides(
    overrides: GameplaySessionLaunchOverrides | null,
  ): void {
    if (!overrides) {
      localStorage.removeItem(GAMEPLAY_LAUNCH_OVERRIDES_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      GAMEPLAY_LAUNCH_OVERRIDES_STORAGE_KEY,
      JSON.stringify(overrides),
    );
  }

  private persistDebugMinigame(
    debugMinigame: GameplayDebugMinigameType | null,
  ): void {
    if (!debugMinigame) {
      localStorage.removeItem(GAMEPLAY_DEBUG_MINIGAME_STORAGE_KEY);
      return;
    }

    localStorage.setItem(GAMEPLAY_DEBUG_MINIGAME_STORAGE_KEY, debugMinigame);
  }

  private readString(key: string, fallback: string): string {
    const value = localStorage.getItem(key);
    return value && value.trim().length > 0 ? value : fallback;
  }

  private readNumber(key: string, fallback: number): number {
    const value = Number(localStorage.getItem(key));
    return this.normalizeNumber(value, fallback);
  }

  private normalizeNumber(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  }
}
