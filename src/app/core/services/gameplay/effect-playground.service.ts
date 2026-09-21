import { Injectable, computed, signal } from "@angular/core";
import { EFFECT_PLAYGROUND_GROUP_LABEL, EFFECT_PLAYGROUND_GROUP_ORDER, EFFECT_PLAYGROUND_GROUP_SCENARIOS, EFFECT_PLAYGROUND_SCENARIOS, EffectPlaygroundGroup, EffectPlaygroundScenario } from "../../game/phaser/effects/effect-playground.config";

/** Scenario selector only; gameplay remains delegated to RdnPuzzleService and PuzzleEngine. */
@Injectable({ providedIn: "root" })
export class EffectPlaygroundService {
  private readonly groupState = signal<EffectPlaygroundGroup>(EffectPlaygroundGroup.GEM);
  private readonly scenarioState = signal<EffectPlaygroundScenario>(EFFECT_PLAYGROUND_GROUP_SCENARIOS[EffectPlaygroundGroup.GEM][0]);
  readonly group = this.groupState.asReadonly();
  readonly groupLabel = computed(() => EFFECT_PLAYGROUND_GROUP_LABEL[this.groupState()]);
  readonly groupIndex = computed(() => EFFECT_PLAYGROUND_GROUP_ORDER.indexOf(this.groupState()));
  readonly groupTotal = EFFECT_PLAYGROUND_GROUP_ORDER.length;
  readonly scenarios = computed(() => EFFECT_PLAYGROUND_GROUP_SCENARIOS[this.groupState()]);
  readonly scenario = this.scenarioState.asReadonly();
  readonly level = computed(() => EFFECT_PLAYGROUND_SCENARIOS[this.scenarioState()]);
  readonly index = computed(() => this.scenarios().indexOf(this.scenarioState()));
  readonly total = computed(() => this.scenarios().length);
  select(scenario: EffectPlaygroundScenario): void {
    const group = EFFECT_PLAYGROUND_GROUP_ORDER.find((candidate) => EFFECT_PLAYGROUND_GROUP_SCENARIOS[candidate].includes(scenario));
    if (group) this.groupState.set(group);
    this.scenarioState.set(scenario);
  }
  nextGroup(): void { this.moveGroup(1); }
  previousGroup(): void { this.moveGroup(-1); }
  next(): void { this.move(1); }
  previous(): void { this.move(-1); }
  private moveGroup(delta: number): void {
    const next = (this.groupIndex() + delta + EFFECT_PLAYGROUND_GROUP_ORDER.length) % EFFECT_PLAYGROUND_GROUP_ORDER.length;
    const group = EFFECT_PLAYGROUND_GROUP_ORDER[next];
    this.groupState.set(group);
    this.scenarioState.set(EFFECT_PLAYGROUND_GROUP_SCENARIOS[group][0]);
  }
  private move(delta: number): void {
    const scenarios = this.scenarios();
    const next = (this.index() + delta + scenarios.length) % scenarios.length;
    this.scenarioState.set(scenarios[next]);
  }
}
