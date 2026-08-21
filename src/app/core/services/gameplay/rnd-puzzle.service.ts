import { Injectable, computed, signal } from "@angular/core";
import { PuzzleEngine } from "../../game/rnd/puzzle.engine";
import { generateRdnPuzzle, getRdnLevel } from "../../game/rnd/levels.config";
import { PuzzleDifficulty } from "../../game/rnd/difficulty-profile.config";
import { PersistentLevelDefinition, PuzzleAction, PuzzleOperator, PuzzleState } from "../../game/rnd/puzzle.types";

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
  private freeMode = false;
  private freeRerollState = 1;
  private freeDifficulty: PuzzleDifficulty = "EASY";
  readonly level = signal(getRdnLevel("adventure"));
  readonly state = signal<PuzzleState>(this.engine.createInitialState(this.level()));
  readonly previews = computed(() => this.engine.previews(this.level(), this.state()));
  readonly nextPreviews = computed(() => this.engine.previews(this.level(), this.state(), 1));
  readonly flows = computed(() => this.engine.flows(this.level(), this.state()));
  readonly effectPreviewEvents = computed(() => this.engine.effectPreviewEvents(this.level(), this.state()));
  readonly queueStates = computed(() => this.engine.queueStates(this.level(), this.state()));
  load(variant: "adventure" | "time-attack" | "free", number = 1, difficulty: PuzzleDifficulty = "EASY", seed = 0, slotCount?: number, freeEffectsEnabled = false): void {
    const level = variant === "free" ? generateRdnPuzzle("adventure", difficulty, seed, slotCount, freeEffectsEnabled) : getRdnLevel(variant, number);
    this.freeMode = variant === "free";
    this.freeDifficulty = difficulty;
    this.freeRerollState = (Math.trunc(seed) ^ 0x6d2b79f5) >>> 0 || 1;
    this.level.set(level);
    this.state.set(this.engine.createInitialState(level));
    if (variant === "adventure") this.clearAdventureRun();
  }
  /** Development-only caller supplies an isolated declarative level; it is never persisted as Adventure progress. */
  loadDebugLevel(level: PersistentLevelDefinition): void {
    this.freeMode = false; this.level.set(level); this.state.set(this.engine.createInitialState(level));
  }
  dispatch(action: PuzzleAction): void {
    const level = this.level();
    const previous = this.state();
    const next = this.engine.apply(level, previous, action);
    if (this.freeMode && action.type === "IMPULSE" && level.variant === "persistent") {
      this.replaceUsedFreeOperators(level, previous, next);
      return;
    }
    this.state.set(next);
  }

  /** Persists only the active Adventure board; player progress remains separate. */
  saveAdventureRun(): void {
    const level = this.level();
    if (this.freeMode || level.variant !== "persistent" || !level.adventure) return;
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

  /** Free mode recycles every successfully used gear gem into a different operator. */
  private replaceUsedFreeOperators(level: PersistentLevelDefinition, previous: PuzzleState, next: PuzzleState): void {
    const usedIndexes = new Set(next.lastOperationResults.filter((result) => result.valid).map((result) => ((result.outerIndex - previous.rotation) % level.positions + level.positions) % level.positions));
    if (!usedIndexes.size) { this.state.set(next); return; }
    const innerValues = [...level.innerValues];
    for (const index of usedIndexes) innerValues[index] = this.nextFreeOperator(innerValues[index]);
    this.level.set({ ...level, innerValues });
    this.state.set({ ...next, consumedSpecialOperatorIndexes: next.consumedSpecialOperatorIndexes.filter((index) => !usedIndexes.has(index)) });
  }

  private nextFreeOperator(previous: PuzzleOperator): PuzzleOperator {
    const maxMagnitude = this.freeDifficulty === "EASY" ? 2 : this.freeDifficulty === "NORMAL" ? 3 : this.freeDifficulty === "HARD" ? 5 : 7;
    const candidates: PuzzleOperator[] = Array.from({ length: maxMagnitude }, (_, index) => index + 1).flatMap((value) => [-value, value]);
    // Division specials may reappear in Free once an operator is consumed.
    if (this.freeDifficulty !== "EASY") candidates.push("divide2");
    if (this.freeDifficulty === "HARD" || this.freeDifficulty === "EXPERT") candidates.push("divide3");
    const start = Math.floor(this.nextFreeRandom() * candidates.length);
    for (let offset = 0; offset < candidates.length; offset += 1) {
      const candidate = candidates[(start + offset) % candidates.length];
      if (candidate !== previous) return candidate;
    }
    return -1;
  }

  private nextFreeRandom(): number {
    this.freeRerollState = (this.freeRerollState * 1664525 + 1013904223) >>> 0;
    return this.freeRerollState / 0x1_0000_0000;
  }

  zeroActiveTarget(): boolean {
    const state = this.state(); const target = this.activeTargetIndex();
    if (target === undefined || state.outerValues[target] === 0) return false;
    this.state.set({ ...state, outerValues: state.outerValues.map((value, index) => index === target ? 0 : value), targetVisualStates: state.targetVisualStates.map((value, index) => index === target ? "OFF" : value), won: state.outerValues.every((value, index) => index === target || value === 0) });
    return true;
  }
  invertActiveTarget(): boolean { return this.transformActiveTarget((value) => -value); }
  doubleActiveTarget(): boolean { return this.transformActiveTarget((value) => value * 2); }
  skipCurrentFlow(): boolean {
    const state = this.state(); const level = this.level();
    if (level.slotPhases.length < 2 || !this.engine.flows(level, state).some((flow) => flow.active)) return false;
    this.state.set({ ...state, phaseCursor: state.phaseCursor + 1, lastImpulseResults: [], lastOperationResults: [], lastGameplayEvents: [] });
    return true;
  }
  canZeroActiveTarget(): boolean { return this.activeTargetIndex() !== undefined; }
  canInvertActiveTarget(): boolean { return this.activeTargetIndex() !== undefined; }
  canDoubleActiveTarget(): boolean {
    const target = this.activeTargetIndex(); if (target === undefined) return false;
    const range = this.level().numberRange; const value = this.state().outerValues[target] * 2;
    return !range || (value >= range.min && value <= range.max);
  }
  canSkipCurrentFlow(): boolean { const level = this.level(); return level.slotPhases.length > 1 && this.engine.flows(level, this.state()).some((flow) => flow.active); }
  private activeTargetIndex(): number | undefined { return this.engine.flows(this.level(), this.state()).find((flow) => flow.interactable)?.targetId; }
  private transformActiveTarget(transform: (value: number) => number): boolean {
    const state = this.state(); const target = this.activeTargetIndex(); if (target === undefined) return false;
    const value = transform(state.outerValues[target]); const range = this.level().numberRange;
    if ((range && (value < range.min || value > range.max)) || value === 0) return false;
    this.state.set({ ...state, outerValues: state.outerValues.map((item, index) => index === target ? value : item) });
    return true;
  }
}
