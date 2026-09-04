import { Injectable, computed, inject, signal } from "@angular/core";
import { PuzzleEngine } from "../../game/phaser/puzzle.engine";
import { activeRdnCatalogueRuntime } from "../../game/phaser/catalogues/catalogue.registry";
import { FreeEffectSelections } from "../../game/phaser/effects/effect-progression.config";
import { DEFAULT_PUZZLE_NUMBER_RANGE, ImpulseResolutionPlan, PersistentLevelDefinition, PuzzleAction, PuzzleDifficulty, PuzzleOperator, PuzzleState } from "../../game/phaser/puzzle.types";
import { RdnCatalogueService } from "./rdn-catalogue.service";
import { EFFECT_PRESETS } from "../../game/phaser/effects/effect-presets.config";
import { EffectScope, GemEffectType, LinkEffectType } from "../../game/phaser/effects/effects.models";
import { ACTIVE_RDN_CATALOGUE_VERSION } from "../../game/phaser/catalogues/active-catalogue.config";

const ADVENTURE_RUN_STORAGE_KEY = "rdnAdventureRun";
interface AdventureRunSave {
  version: 1;
  levelId: string;
  configVersion: number;
  levelVersion: string;
  seed: number;
  state: string;
}
interface SavedLevelRun { schemaVersion: 1; catalogueVersion: string; variant: "adventure" | "time-attack" | "free"; levelNumber: number; levelId: string; seed?: number; freeSlotCount?: number; freeDifficulty?: PuzzleDifficulty; state: string; savedAt: number; }

@Injectable({ providedIn: "root" })
export class RdnPuzzleService {
  private readonly engine = new PuzzleEngine();
  private readonly catalogue = inject(RdnCatalogueService);
  private freeMode = false;
  private freeRerollState = 1;
  private freeDifficulty: PuzzleDifficulty = "EASY";
  readonly level = signal(activeRdnCatalogueRuntime.generateRdnPuzzle("adventure", "EASY", 0));
  readonly state = signal<PuzzleState>(this.engine.createInitialState(this.level()));
  readonly previews = computed(() => this.engine.previews(this.level(), this.state()));
  readonly nextPreviews = computed(() => this.engine.previews(this.level(), this.state(), 1));
  readonly flows = computed(() => this.engine.flows(this.level(), this.state()));
  readonly effectPreviewEvents = computed(() => this.engine.effectPreviewEvents(this.level(), this.state()));
  readonly queueStates = computed(() => this.engine.queueStates(this.level(), this.state()));
  async load(variant: "adventure" | "time-attack" | "free", number = 1, difficulty: PuzzleDifficulty = "EASY", seed = 0, slotCount?: number, freeEffectsEnabled: boolean | FreeEffectSelections = false): Promise<void> {
    const level = variant === "free" ? activeRdnCatalogueRuntime.generateRdnPuzzle("adventure", difficulty, seed, slotCount, freeEffectsEnabled) : await this.catalogue.getLevel(variant, number);
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
  planImpulse(): ImpulseResolutionPlan { return this.engine.planImpulse(this.level(), this.state()); }

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
  async resumeAdventure(number: number): Promise<boolean> {
    const level = await this.catalogue.getLevel("adventure", number);
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

  saveCurrentRun(variant: "adventure" | "time-attack" | "free", seed?: number, slotCount?: number): void {
    const level = this.level();
    if (typeof localStorage === "undefined") return;
    const save: SavedLevelRun = { schemaVersion: 1, catalogueVersion: ACTIVE_RDN_CATALOGUE_VERSION, variant, levelNumber: level.number, levelId: level.id, seed, freeSlotCount: slotCount, freeDifficulty: this.freeDifficulty, state: this.engine.serialize(this.state()), savedAt: Date.now() };
    localStorage.setItem(`rdn-saved-run:${ACTIVE_RDN_CATALOGUE_VERSION}:${variant}:${level.id}`, JSON.stringify(save));
  }
  hasSavedRun(variant: "adventure" | "time-attack" | "free", levelId: string): boolean { return typeof localStorage !== "undefined" && localStorage.getItem(`rdn-saved-run:${ACTIVE_RDN_CATALOGUE_VERSION}:${variant}:${levelId}`) !== null; }
  clearSavedRun(variant: "adventure" | "time-attack" | "free", levelId = this.level().id): void { if (typeof localStorage !== "undefined") localStorage.removeItem(`rdn-saved-run:${ACTIVE_RDN_CATALOGUE_VERSION}:${variant}:${levelId}`); }
  async restoreSavedRun(variant: "adventure" | "time-attack" | "free", number: number, seed?: number, slotCount?: number): Promise<boolean> {
    const candidate = variant === "free" ? activeRdnCatalogueRuntime.generateRdnPuzzle("adventure", this.freeDifficulty, seed ?? 0, slotCount) : await this.catalogue.getLevel(variant, number);
    const key = `rdn-saved-run:${ACTIVE_RDN_CATALOGUE_VERSION}:${variant}:${candidate.id}`;
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (!raw) return false;
    try { const save = JSON.parse(raw) as SavedLevelRun; if (save.schemaVersion !== 1 || save.catalogueVersion !== ACTIVE_RDN_CATALOGUE_VERSION || save.variant !== variant || save.levelId !== candidate.id || (variant === "free" && save.seed !== seed)) return false; this.level.set(candidate); this.state.set(this.engine.deserialize(candidate, save.state)); return true; } catch { localStorage.removeItem(key); return false; }
  }

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
    const value = this.state().outerValues[target] * 2;
    return value >= DEFAULT_PUZZLE_NUMBER_RANGE.min && value <= DEFAULT_PUZZLE_NUMBER_RANGE.max;
  }
  canSkipCurrentFlow(): boolean { const level = this.level(); return level.slotPhases.length > 1 && this.engine.flows(level, this.state()).some((flow) => flow.active); }
  destroyFireWalls(): boolean { return this.removeBoardEffects(EffectScope.GEM, GemEffectType.FIRE); }
  destroyIceWalls(): boolean { return this.removeBoardEffects(EffectScope.GEM, GemEffectType.ICE); }
  destroyStoneWalls(): boolean { return this.removeBoardEffects(EffectScope.GEM, GemEffectType.WALL); }
  cleanseCorruption(): boolean { return this.removeBoardEffects(EffectScope.GEM, GemEffectType.CORRUPTION); }
  breakChains(): boolean { return this.removeBoardEffects(EffectScope.LINK, LinkEffectType.CHAIN); }
  canDestroyFireWalls(): boolean { return this.hasBoardEffect(EffectScope.GEM, GemEffectType.FIRE); }
  canDestroyIceWalls(): boolean { return this.hasBoardEffect(EffectScope.GEM, GemEffectType.ICE); }
  canDestroyStoneWalls(): boolean { return this.hasBoardEffect(EffectScope.GEM, GemEffectType.WALL); }
  canCleanseCorruption(): boolean { return this.hasBoardEffect(EffectScope.GEM, GemEffectType.CORRUPTION); }
  canBreakChains(): boolean { return this.hasBoardEffect(EffectScope.LINK, LinkEffectType.CHAIN); }
  private activeTargetIndex(): number | undefined { return this.engine.flows(this.level(), this.state()).find((flow) => flow.interactable)?.targetId; }
  /** Board actions remove declarative assignments; the active state is otherwise preserved. */
  private removeBoardEffects(scope: EffectScope, type: GemEffectType | LinkEffectType): boolean {
    const level = this.level(); const configuration = level.effectConfiguration; const effects = configuration?.effects ?? [];
    const remaining = effects.filter((assignment) => { const preset = EFFECT_PRESETS[assignment.preset]; return !preset || preset.scope !== scope || preset.type !== type; });
    if (remaining.length === effects.length) return false;
    this.level.set({ ...level, effectConfiguration: { ...configuration!, effects: remaining } });
    return true;
  }
  private hasBoardEffect(scope: EffectScope, type: GemEffectType | LinkEffectType): boolean {
    return (this.level().effectConfiguration?.effects ?? []).some((assignment) => { const preset = EFFECT_PRESETS[assignment.preset]; return !!preset && preset.scope === scope && preset.type === type; });
  }
  private transformActiveTarget(transform: (value: number) => number): boolean {
    const state = this.state(); const target = this.activeTargetIndex(); if (target === undefined) return false;
    const value = transform(state.outerValues[target]);
    if (value < DEFAULT_PUZZLE_NUMBER_RANGE.min || value > DEFAULT_PUZZLE_NUMBER_RANGE.max || value === 0) return false;
    this.state.set({ ...state, outerValues: state.outerValues.map((item, index) => index === target ? value : item) });
    return true;
  }
}
