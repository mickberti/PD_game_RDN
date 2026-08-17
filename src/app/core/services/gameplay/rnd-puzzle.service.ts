import { Injectable, computed, signal } from "@angular/core";
import { PuzzleEngine } from "../../game/rnd/puzzle.engine";
import { generateRdnPuzzle, getRdnLevel } from "../../game/rnd/levels.config";
import { PuzzleDifficulty } from "../../game/rnd/difficulty-profile.config";
import { PuzzleAction, PuzzleState } from "../../game/rnd/puzzle.types";

const ADVENTURE_RUN_STORAGE_KEY = "rdnAdventureRun";
interface AdventureRunSave {
  version: 1;
  levelId: string;
  configVersion: number;
  levelVersion: string;
  seed: number;
  state: string;
}

@Injectable({ providedIn: "root" })
export class RdnPuzzleService {
  private readonly engine = new PuzzleEngine();
  readonly level = signal(getRdnLevel("adventure"));
  readonly state = signal<PuzzleState>(this.engine.createInitialState(this.level()));
  readonly previews = computed(() => this.engine.previews(this.level(), this.state()));
  readonly nextPreviews = computed(() => this.engine.previews(this.level(), this.state(), 1));
  readonly flows = computed(() => this.engine.flows(this.level(), this.state()));
  readonly queueStates = computed(() => this.engine.queueStates(this.level(), this.state()));
  load(variant: "adventure" | "time-attack" | "free", number = 1, difficulty: PuzzleDifficulty = "EASY", seed = 0, slotCount?: number): void {
    const level = variant === "free" ? generateRdnPuzzle("adventure", difficulty, seed, slotCount) : getRdnLevel(variant, number);
    this.level.set(level);
    this.state.set(this.engine.createInitialState(level));
    if (variant === "adventure") this.clearAdventureRun();
  }
  dispatch(action: PuzzleAction): void { this.state.update((state) => this.engine.apply(this.level(), state, action)); }

  /** Persists only the active Adventure board; player progress remains separate. */
  saveAdventureRun(): void {
    const level = this.level();
    if (level.variant !== "persistent" || !level.adventure) return;
    const save: AdventureRunSave = {
      version: 1,
      levelId: level.id,
      configVersion: level.adventure.version,
      levelVersion: level.adventure.levelVersion,
      seed: level.adventure.seed,
      state: this.engine.serialize(this.state()),
    };
    localStorage.setItem(ADVENTURE_RUN_STORAGE_KEY, JSON.stringify(save));
  }

  /** Restores a compatible run atomically. Changed level/configuration data is discarded safely. */
  resumeAdventure(number: number): boolean {
    const level = getRdnLevel("adventure", number);
    if (level.variant !== "persistent" || !level.adventure) return false;
    const raw = localStorage.getItem(ADVENTURE_RUN_STORAGE_KEY);
    if (!raw) return false;
    try {
      const save = JSON.parse(raw) as AdventureRunSave;
      if (save.version !== 1 || save.levelId !== level.id || save.configVersion !== level.adventure.version || save.levelVersion !== level.adventure.levelVersion || save.seed !== level.adventure.seed) {
        this.clearAdventureRun();
        return false;
      }
      const state = this.engine.deserialize(level, save.state);
      this.level.set(level);
      this.state.set(state);
      return true;
    } catch {
      this.clearAdventureRun();
      return false;
    }
  }

  clearAdventureRun(): void { localStorage.removeItem(ADVENTURE_RUN_STORAGE_KEY); }
  zeroActiveTarget(): boolean {
    const state = this.state(); const target = this.engine.flows(this.level(), state).find((flow) => flow.interactable)?.targetId;
    if (target === undefined || state.outerValues[target] === 0) return false;
    this.state.set({ ...state, outerValues: state.outerValues.map((value, index) => index === target ? 0 : value), targetVisualStates: state.targetVisualStates.map((value, index) => index === target ? "OFF" : value), won: state.outerValues.every((value, index) => index === target || value === 0) });
    return true;
  }
}
