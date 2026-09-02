import { Injectable, computed, signal } from "@angular/core";
import { LevelDefinition } from "../../game/phaser/puzzle.types";
import { LevelEffectConfigResolver } from "../../game/phaser/effects/level-effect-config.resolver";
import { EFFECT_TUTORIALS, EffectTutorialDefinition, getEffectTutorial } from "../../game/phaser/effects/effect-tutorial.config";

const STORAGE_KEY = "rdn-effect-tutorials-v2";
const LEGACY_STORAGE_KEY = "rdn-effect-tutorials-v1";
const STORAGE_VERSION = 2;

export type TutorialMode = "adventure" | "time-attack" | "free";
export interface TutorialResetEntry extends EffectTutorialDefinition { readonly modes: readonly Exclude<TutorialMode, "free">[]; readonly levelLabel: string; readonly seen: boolean; }
interface TutorialStorage { readonly version: number; readonly seenIds: readonly string[]; }

/** Remembers the effect types already explained to this browser player. */
@Injectable({ providedIn: "root" })
export class EffectTutorialService {
  private readonly resolver = new LevelEffectConfigResolver();
  private readonly seenIds = signal<readonly string[]>(this.readSeenIds());
  /** Inventory for Settings; never load the full gameplay catalogue just to render Settings. */
  readonly tutorialEntries = computed<readonly TutorialResetEntry[]>(() => {
    const seen = this.seenIds();
    return EFFECT_TUTORIALS.map((tutorial) => ({ ...tutorial, modes: ["adventure", "time-attack"] as const, levelLabel: "Disponibile nei livelli con effetti e nelle partite Free", seen: seen.includes(tutorial.id) }));
  });

  tutorialForLevel(level: LevelDefinition): EffectTutorialDefinition | null {
    const seen = this.seenIds();
    const effects = this.resolver.resolve(level.effectConfiguration, level.positions).effects;
    for (const effect of effects) {
      const tutorial = getEffectTutorial(effect.config);
      if (tutorial && !seen.includes(tutorial.id)) return tutorial;
    }
    return null;
  }

  markSeen(id: string): void {
    if (this.seenIds().includes(id)) return;
    this.replaceSeen([...this.seenIds(), id]);
  }

  resetTutorial(id: string): void { this.replaceSeen(this.seenIds().filter((seenId) => seenId !== id)); }
  resetMode(mode: TutorialMode): void {
    const ids = mode === "free" ? new Set(EFFECT_TUTORIALS.map((tutorial) => tutorial.id)) : new Set(this.tutorialEntries().filter((tutorial) => tutorial.modes.includes(mode)).map((tutorial) => tutorial.id));
    this.replaceSeen(this.seenIds().filter((id) => !ids.has(id)));
  }
  resetAll(): void { this.replaceSeen([]); }
  private replaceSeen(ids: readonly string[]): void { this.seenIds.set(ids); try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, seenIds: ids } satisfies TutorialStorage)); } catch { /* Storage can be unavailable in private web views. */ } }

  private readSeenIds(): readonly string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? "[]");
      const ids = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed !== null && "seenIds" in parsed && Array.isArray((parsed as TutorialStorage).seenIds) ? (parsed as TutorialStorage).seenIds : [];
      const known = new Set(EFFECT_TUTORIALS.map((tutorial) => tutorial.id));
      return ids.filter((item): item is string => typeof item === "string" && known.has(item));
    } catch { return []; }
  }
  private compactLevelList(levels: readonly number[]): string { return levels.length <= 3 ? levels.join(", ") : `${levels[0]}–${levels[levels.length - 1]}`; }
}
