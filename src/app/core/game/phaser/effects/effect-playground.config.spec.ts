import { EffectPlaygroundService } from "../../../services/gameplay/effect-playground.service";
import { LevelEffectConfigResolver } from "./level-effect-config.resolver";
import { EFFECT_PLAYGROUND_SCENARIOS } from "./effect-playground.config";

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
});
