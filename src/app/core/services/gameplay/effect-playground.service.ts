import { Injectable, computed, signal } from "@angular/core";
import { EFFECT_PLAYGROUND_ORDER, EFFECT_PLAYGROUND_SCENARIOS, EffectPlaygroundScenario } from "../../game/phaser/effects/effect-playground.config";

/** Scenario selector only; gameplay remains delegated to RdnPuzzleService and PuzzleEngine. */
@Injectable({ providedIn: "root" })
export class EffectPlaygroundService {
  private readonly scenarioState = signal<EffectPlaygroundScenario>(EffectPlaygroundScenario.GEM_EFFECTS);
  readonly scenario = this.scenarioState.asReadonly();
  readonly level = computed(() => EFFECT_PLAYGROUND_SCENARIOS[this.scenarioState()]);
  readonly index = computed(() => EFFECT_PLAYGROUND_ORDER.indexOf(this.scenarioState()));
  select(scenario: EffectPlaygroundScenario): void { this.scenarioState.set(scenario); }
  next(): void { this.move(1); }
  previous(): void { this.move(-1); }
  private move(delta: number): void { const next = (this.index() + delta + EFFECT_PLAYGROUND_ORDER.length) % EFFECT_PLAYGROUND_ORDER.length; this.scenarioState.set(EFFECT_PLAYGROUND_ORDER[next]); }
}
