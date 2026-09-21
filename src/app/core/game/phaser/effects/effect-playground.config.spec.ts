import { EffectPlaygroundService } from "../../../services/gameplay/effect-playground.service";
import { PuzzleEngine } from "../puzzle.engine";
import { LevelEffectConfigResolver } from "./level-effect-config.resolver";
import { EFFECT_PLAYGROUND_SCENARIOS, EffectPlaygroundScenario } from "./effect-playground.config";
import { gemEffectExecutionPriority, shouldPresentEffectEvent, willGemEffectApplyOnNextImpulse } from "./effect-presentation.config";
import { EffectScope, GemEffectType } from "./effects.models";

describe("Effect Playground", () => {
  it("loads declarative scenarios, changes scenario and never shares their level instance", () => {
    const service = new EffectPlaygroundService(); const resolver = new LevelEffectConfigResolver();
    const first = service.level();
    expect(resolver.resolve(first.effectConfiguration, first.positions).issues).toEqual([]);
    service.next(); const second = service.level();
    expect(second.id).not.toBe(first.id);
    service.previous(); expect(service.level().id).toBe(first.id);
  });

  it("keeps every scenario declarative and valid, including elemental and chain combinations", () => {
    const resolver = new LevelEffectConfigResolver();
    for (const level of Object.values(EFFECT_PLAYGROUND_SCENARIOS)) expect(resolver.resolve(level.effectConfiguration, level.positions).issues).toEqual([]);
  });

  it("shows the shield and then applies the inverter in the third GEM example", () => {
    const engine = new PuzzleEngine();
    const level = EFFECT_PLAYGROUND_SCENARIOS[EffectPlaygroundScenario.GEM_EFFECT_COMBINATIONS];
    const result = engine.apply(level, engine.createInitialState(level), { type: "IMPULSE" });

    expect(result.lastEffectEvents?.some((event) => event.type === "SHIELD_ABSORBED" && event.gemId === "target-4")).toBeTrue();
    expect(result.lastEffectEvents?.some((event) => event.type === "GEM_INVERTER_APPLIED" && event.gemId === "target-4")).toBeTrue();
    expect(result.outerValues[4]).toBe(-6);
  });

  it("orders GEM markers by execution and can attenuate an effect absent from the preview", () => {
    const level = EFFECT_PLAYGROUND_SCENARIOS[EffectPlaygroundScenario.GEM_EFFECT_COMBINATIONS];
    const effects = new LevelEffectConfigResolver().resolve(level.effectConfiguration, level.positions).effects
      .filter((effect) => effect.target.type === EffectScope.GEM && effect.target.gem.index === 4);
    const shield = effects.find((effect) => effect.config.type === GemEffectType.SHIELD)!;
    const inverter = effects.find((effect) => effect.config.type === GemEffectType.INVERTER)!;

    expect([...effects].sort((left, right) => gemEffectExecutionPriority(right.config.type as GemEffectType) - gemEffectExecutionPriority(left.config.type as GemEffectType)).map((effect) => effect.config.type)).toEqual([GemEffectType.INVERTER, GemEffectType.SHIELD]);
    const shieldOnlyPreview = [{ type: "FLOW_ARRIVED" as const, gemId: "target-4", generation: 0 }, { type: "SHIELD_ABSORBED" as const, gemId: "target-4", generation: 0 }];
    expect(willGemEffectApplyOnNextImpulse(shield, shieldOnlyPreview)).toBeTrue();
    expect(willGemEffectApplyOnNextImpulse(inverter, shieldOnlyPreview)).toBeFalse();
    expect(willGemEffectApplyOnNextImpulse(shield, [{ type: "FLOW_ARRIVED", gemId: "target-4", generation: 1 }, { type: "SHIELD_ABSORBED", gemId: "target-4", generation: 1 }])).toBeTrue();
    expect(willGemEffectApplyOnNextImpulse(inverter, [])).toBeTrue();
  });

  it("keeps effects behind a wall disabled until the wall has been broken", () => {
    const engine = new PuzzleEngine();
    const level = EFFECT_PLAYGROUND_SCENARIOS[EffectPlaygroundScenario.WALL_WITH_FOLLOW_UP_EFFECTS];
    const afterWall = engine.apply(level, engine.createInitialState(level), { type: "IMPULSE" });
    const afterEffects = engine.apply(level, afterWall, { type: "IMPULSE" });

    expect(afterWall.lastEffectEvents?.some((event) => event.type === "WALL_HIT" && event.gemId === "target-0")).toBeTrue();
    expect(afterWall.lastEffectEvents?.some((event) => event.type === "MIRROR_APPLIED" || event.type === "GEM_AMPLIFIER_APPLIED" || event.type === "GEM_INVERTER_APPLIED")).toBeFalse();
    expect(afterEffects.lastEffectEvents?.some((event) => event.type === "MIRROR_APPLIED" && event.gemId === "target-0")).toBeTrue();
    expect(afterEffects.lastEffectEvents?.some((event) => event.type === "GEM_AMPLIFIER_APPLIED" && event.gemId === "target-0")).toBeTrue();
    expect(afterEffects.lastEffectEvents?.some((event) => event.type === "GEM_INVERTER_APPLIED" && event.gemId === "target-0")).toBeTrue();
  });

  it("attenuates MIRROR and AMPLIFIER when a shield leaves them a zero input", () => {
    const engine = new PuzzleEngine();
    const level = EFFECT_PLAYGROUND_SCENARIOS[EffectPlaygroundScenario.GEM_EFFECT_COMBINATIONS];
    const state = engine.createInitialState(level);
    const effects = new LevelEffectConfigResolver().resolve(level.effectConfiguration, level.positions).effects;
    const mirror = effects.find((effect) => effect.config.type === GemEffectType.MIRROR && effect.target.type === EffectScope.GEM && effect.target.gem.index === 0)!;
    const amplifier = effects.find((effect) => effect.config.type === GemEffectType.AMPLIFIER && effect.target.type === EffectScope.GEM && effect.target.gem.index === 1)!;
    const preview = engine.effectPreviewEvents(level, state);

    expect(willGemEffectApplyOnNextImpulse(mirror, preview)).toBeFalse();
    expect(willGemEffectApplyOnNextImpulse(amplifier, preview)).toBeFalse();
    expect(preview.filter((event) => event.type === "MIRROR_APPLIED" || event.type === "GEM_AMPLIFIER_APPLIED").every((event) => !shouldPresentEffectEvent(event))).toBeTrue();
  });
});
