import { Injectable, computed, signal } from "@angular/core";
import { PuzzleEngine } from "../../game/rnd/puzzle.engine";
import { getRdnLevel } from "../../game/rnd/levels.config";
import { PuzzleAction, PuzzleState } from "../../game/rnd/puzzle.types";

@Injectable({ providedIn: "root" })
export class RdnPuzzleService {
  private readonly engine = new PuzzleEngine();
  readonly level = signal(getRdnLevel("adventure"));
  readonly state = signal<PuzzleState>(this.engine.createInitialState(this.level()));
  readonly previews = computed(() => this.engine.previews(this.level(), this.state()));
  readonly nextPreviews = computed(() => this.engine.previews(this.level(), this.state(), 1));
  load(variant: "adventure" | "time-attack", number = 1): void { const level = getRdnLevel(variant, number); this.level.set(level); this.state.set(this.engine.createInitialState(level)); }
  dispatch(action: PuzzleAction): void { this.state.update((state) => this.engine.apply(this.level(), state, action)); }
}
