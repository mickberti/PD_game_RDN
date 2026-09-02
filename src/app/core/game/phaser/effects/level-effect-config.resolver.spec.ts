import { AreaEffectType, EffectScope, GemEffectType, LinkEffectType } from "./effects.models";
import { LevelEffectConfigResolver } from "./level-effect-config.resolver";
import { LevelEffectConfiguration } from "./level-effects.types";
import { PuzzleEngine } from "../puzzle.engine";
import { LevelDefinition } from "../puzzle.types";
import { EFFECT_PRESETS } from "./effect-presets.config";
import { RDN_EFFECT_DEMO_LEVELS } from "./effect-demo-levels.config";

describe("LevelEffectConfigResolver", () => {
  const resolver = new LevelEffectConfigResolver();

  it("returns no effects for absent or disabled configurations", () => {
    expect(resolver.resolve(undefined, 4)).toEqual({ effects: [], issues: [] });
    expect(resolver.resolve({ enabled: false, effects: [{ preset: "SHIELD_1", target: { type: EffectScope.GEM, gemIndex: 0 } }] }, 4)).toEqual({ effects: [], issues: [] });
  });

  it("leaves the existing puzzle flow identical when effects are absent or disabled", () => {
    const base: LevelDefinition = { id: "no-effects", number: 1, title: "No effects", schemaVersion: 1, variant: "persistent", positions: 4, initialRotation: 0, outerValues: [3, 1, 1, 1], innerValues: [-3, 1, 1, 1], slotPhases: [[{ outerIndex: 0 }]] };
    const disabled: LevelDefinition = { ...base, effectConfiguration: { enabled: false } };
    const engine = new PuzzleEngine();
    const action = { type: "IMPULSE" } as const;
    expect(engine.apply(base, engine.createInitialState(base), action)).toEqual(engine.apply(disabled, engine.createInitialState(disabled), action));
  });

  it("resolves GEM, LINK and AREA presets with stable runtime gem references", () => {
    const configuration: LevelEffectConfiguration = {
      enabled: true,
      effects: [
        { preset: "SHIELD_1", target: { type: EffectScope.GEM, gemIndex: 0 } },
        { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 2 } },
        { preset: "BOMB_2", target: { type: EffectScope.AREA, sourceGemIndex: 3 } },
      ],
    };
    const resolution = resolver.resolve(configuration, 4);
    expect(resolution.issues).toEqual([]);
    expect(resolution.effects.map((effect) => effect.config.type)).toEqual([GemEffectType.SHIELD, LinkEffectType.ECHO, AreaEffectType.BOMB]);
    expect(resolution.effects[0].target).toEqual({ type: EffectScope.GEM, gem: { id: "target-0", index: 0 } });
  });

  it("applies legal scalar overrides and combines sets with level effects", () => {
    const resolution = resolver.resolve({
      enabled: true,
      sets: ["BEGINNER_PROTECTION"],
      effects: [{ preset: "DOUBLE_LINK", target: { type: EffectScope.LINK, fromGemIndex: 2, toGemIndex: 3 }, overrides: { multiplier: 3, priority: 4 } }],
    }, 4);
    expect(resolution.issues).toEqual([]);
    expect(resolution.effects.length).toBe(2);
    expect(resolution.effects[1].config).toEqual(jasmine.objectContaining({ multiplier: 3, priority: 4 }));
  });

  it("rejects invalid targets, presets, sets and illegal overrides without throwing", () => {
    const resolution = resolver.resolve({
      enabled: true,
      sets: ["MISSING_SET" as never],
      effects: [
        { preset: "MISSING_PRESET" as never, target: { type: EffectScope.GEM, gemIndex: 0 } },
        { preset: "SHIELD_1", target: { type: EffectScope.GEM, gemIndex: 4 } },
        { preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 1, toGemIndex: 1 } },
        { preset: "SHIELD_1", target: { type: EffectScope.GEM, gemIndex: 0 }, overrides: { scope: EffectScope.LINK } },
      ],
    }, 4);
    expect(resolution.effects).toEqual([]);
    expect(resolution.issues.length).toBe(5);
  });

  it("validates flow rules and keeps the global preset immutable when overriding a demo level", () => {
    const override = resolver.resolve(RDN_EFFECT_DEMO_LEVELS.SHIELD_OVERRIDE.effectConfiguration, 4);
    expect(override.effects[0].config).toEqual(jasmine.objectContaining({ strength: 4 }));
    expect(EFFECT_PRESETS.SHIELD_2.strength).toBe(2);
    const invalid = resolver.resolve({ enabled: true, flowRules: { maxDepth: -1 } }, 4);
    expect(invalid.issues).toContain("Flow rule maxDepth must be a non-negative integer");
  });

  it("accepts the new GEM presets and rejects WALL plus ICE on one gem", () => {
    const valid = resolver.resolve({ enabled: true, effects: [{ preset: "AMPLIFIER_X2", target: { type: EffectScope.GEM, gemIndex: 0 } }, { preset: "TIMER_3", target: { type: EffectScope.GEM, gemIndex: 1 } }, { preset: "CORRUPTION_1", target: { type: EffectScope.GEM, gemIndex: 2 } }] }, 4);
    expect(valid.issues).toEqual([]);
    const invalid = resolver.resolve({ enabled: true, effects: [{ preset: "WALL_2", target: { type: EffectScope.GEM, gemIndex: 0 } }, { preset: "ICE_1", target: { type: EffectScope.GEM, gemIndex: 0 } }] }, 4);
    expect(invalid.issues).toContain("Gem 0 cannot contain both WALL and ICE.");
  });

  it("resolves every isolated demo fixture without modifying the production level catalogue", () => {
    for (const level of Object.values(RDN_EFFECT_DEMO_LEVELS)) expect(resolver.resolve(level.effectConfiguration, level.positions).issues).toEqual([]);
  });
});
