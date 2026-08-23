import { Injectable, signal } from "@angular/core";
import { LevelDefinition } from "../../game/rnd/puzzle.types";
import { LevelEffectConfigResolver } from "../../game/rnd/effects/level-effect-config.resolver";
import { EffectTutorialDefinition, getEffectTutorial } from "../../game/rnd/effects/effect-tutorial.config";

const STORAGE_KEY = "rdn-effect-tutorials-v1";

/** Remembers the effect types already explained to this browser player. */
@Injectable({ providedIn: "root" })
export class EffectTutorialService {
  private readonly resolver = new LevelEffectConfigResolver();
  private readonly seenIds = signal<readonly string[]>(this.readSeenIds());

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
    const next = [...this.seenIds(), id];
    this.seenIds.set(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage can be unavailable in private web views. */ }
  }

  private readSeenIds(): readonly string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch { return []; }
  }
}
