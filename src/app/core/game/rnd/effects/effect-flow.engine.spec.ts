import { EffectFlowEngine } from "./effect-flow.engine";
import { AreaEffectType, EffectScope, GemEffectType, LinkDirection, LinkEffectType, ResolvedEffect } from "./effects.models";

const gem = (id: string, index: number, type: GemEffectType, strength?: number): ResolvedEffect => ({ id, config: { scope: EffectScope.GEM, type, strength } as unknown as ResolvedEffect["config"], target: { type: EffectScope.GEM, gem: { id: `target-${index}`, index } } });
const gemConfig = (id: string, index: number, config: ResolvedEffect["config"]): ResolvedEffect => ({ id, config, target: { type: EffectScope.GEM, gem: { id: `target-${index}`, index } } });
const link = (id: string, from: number, to: number, type: LinkEffectType, multiplier?: number, direction?: LinkDirection): ResolvedEffect => ({ id, config: { scope: EffectScope.LINK, type, multiplier, direction }, target: { type: EffectScope.LINK, fromGem: { id: `target-${from}`, index: from }, toGem: { id: `target-${to}`, index: to } } });
const bomb = (id: string, index: number, strength = 2, radius = 1): ResolvedEffect => ({ id, config: { scope: EffectScope.AREA, type: AreaEffectType.BOMB, strength, radius }, target: { type: EffectScope.AREA, sourceGem: { id: `target-${index}`, index } } });

describe("EffectFlowEngine", () => {
  const engine = new EffectFlowEngine();
  const resolve = (values: number[], effects: ResolvedEffect[], inputs: Array<{ gemId: string; value: number }>, runtime = engine.createRuntime(effects), rules?: { maxDepth?: number }) => engine.resolve(values, effects, runtime, inputs, rules);

  it("keeps the direct contribution behaviour when no effects exist", () => expect(resolve([5, 2, 1, 1], [], [{ gemId: "target-0", value: -3 }]).values).toEqual([2, 2, 1, 1]));

  it("applies shield by absolute magnitude for positive, negative, equal and smaller impacts", () => {
    const effect = gem("shield", 0, GemEffectType.SHIELD, 2);
    expect(resolve([0, 0, 0, 0], [effect], [{ gemId: "target-0", value: -5 }]).values[0]).toBe(-3);
    expect(resolve([0, 0, 0, 0], [effect], [{ gemId: "target-0", value: 5 }]).values[0]).toBe(3);
    expect(resolve([0, 0, 0, 0], [effect], [{ gemId: "target-0", value: -2 }]).values[0]).toBe(0);
    expect(resolve([0, 0, 0, 0], [effect], [{ gemId: "target-0", value: 1 }]).values[0]).toBe(0);
  });

  it("keeps consumable shield strength in runtime and depletes it", () => {
    const shield = gemConfig("consumable-shield", 0, { scope: EffectScope.GEM, type: GemEffectType.SHIELD, strength: 2, consumable: true }); const runtime = engine.createRuntime([shield]);
    const first = resolve([0, 0, 0, 0], [shield], [{ gemId: "target-0", value: 3 }], runtime);
    const second = resolve(first.values as number[], [shield], [{ gemId: "target-0", value: 3 }], first.runtime);
    expect(first.runtime.shieldRemainingStrength["consumable-shield"]).toBe(1);
    expect(second.runtime.shieldRemainingStrength["consumable-shield"]).toBe(0);
    expect(second.events.some((event) => event.type === "SHIELD_DEPLETED")).toBeTrue();
  });

  it("keeps wall runtime state separate from presets", () => {
    const effect = gem("wall", 0, GemEffectType.WALL, 2); const runtime = engine.createRuntime([effect]);
    const first = resolve([7, 1, 1, 1], [effect], [{ gemId: "target-0", value: -4 }], runtime);
    const second = resolve(first.values as number[], [effect], [{ gemId: "target-0", value: -4 }], first.runtime);
    const third = resolve(second.values as number[], [effect], [{ gemId: "target-0", value: -4 }], second.runtime);
    expect([first.values[0], second.values[0], third.values[0]]).toEqual([7, 7, 3]);
    expect((effect.config as { strength?: number }).strength).toBe(2);
    expect(second.events.some((event) => event.type === "WALL_BROKEN")).toBeTrue();
  });

  it("mirrors contributions and supports echo, amplify and invert links", () => {
    expect(resolve([0, 0, 0, 0], [gem("mirror", 0, GemEffectType.MIRROR)], [{ gemId: "target-0", value: -4 }]).values[0]).toBe(4);
    expect(resolve([0, 0, 0, 0], [link("echo", 0, 1, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD)], [{ gemId: "target-0", value: -3 }]).values.slice(0, 2)).toEqual([-3, -3]);
    expect(resolve([0, 0, 0, 0], [link("amp", 0, 1, LinkEffectType.AMPLIFY, 2, LinkDirection.FORWARD)], [{ gemId: "target-0", value: -3 }]).values.slice(0, 2)).toEqual([-3, -6]);
    expect(resolve([0, 0, 0, 0], [link("invert", 0, 1, LinkEffectType.INVERT, undefined, LinkDirection.FORWARD)], [{ gemId: "target-0", value: -3 }]).values.slice(0, 2)).toEqual([-3, 3]);
  });

  it("honours forward and bidirectional link direction", () => {
    const forward = link("forward", 0, 1, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD);
    expect(resolve([0, 0, 0, 0], [forward], [{ gemId: "target-1", value: 2 }]).values.slice(0, 2)).toEqual([0, 2]);
    const bidirectional = link("both", 0, 1, LinkEffectType.ECHO);
    expect(resolve([0, 0, 0, 0], [bidirectional], [{ gemId: "target-1", value: 2 }]).values.slice(0, 2)).toEqual([2, 2]);
  });

  it("continues through a link when its source gem reaches zero in the current impulse", () => {
    const echo = link("echo", 0, 1, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD);
    const result = resolve([2, 5, 0, 0], [echo], [{ gemId: "target-0", value: -2 }]);
    expect(result.values.slice(0, 2)).toEqual([0, 3]);
    expect(result.events.some((event) => event.type === "FLOW_PROPAGATED" && event.linkId === "echo")).toBeTrue();
  });

  it("supports a chain, a branch and converging paths without discarding the second arrival", () => {
    const chain = [link("ab", 0, 1, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD), link("bd", 1, 3, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD)];
    expect(resolve([0, 0, 0, 0], chain, [{ gemId: "target-0", value: -2 }]).values).toEqual([-2, -2, 0, -2]);
    const diamond = [link("ab", 0, 1, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD), link("ac", 0, 2, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD), link("bd", 1, 3, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD), link("cd", 2, 3, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD)];
    const result = resolve([0, 0, 0, 0], diamond, [{ gemId: "target-0", value: -2 }]);
    expect(result.values).toEqual([-2, -2, -2, -4]);
    expect(result.events.some((event) => event.type === "FLOW_MERGED" && event.gemId === "target-3")).toBeTrue();
  });

  it("terminates cycles through visited links and maxDepth", () => {
    const cycle = [link("ab", 0, 1, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD), link("bc", 1, 2, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD), link("ca", 2, 0, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD)];
    expect(resolve([0, 0, 0, 0], cycle, [{ gemId: "target-0", value: 1 }]).values).toEqual([2, 1, 1, 0]);
    expect(resolve([0, 0, 0, 0], cycle, [{ gemId: "target-0", value: 1 }], undefined, { maxDepth: 1 }).values).toEqual([1, 1, 0, 0]);
  });

  it("aggregates simultaneous flows deterministically", () => {
    const effects = [link("ab", 0, 2, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD), link("bc", 1, 2, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD)];
    const inputs = [{ gemId: "target-0", value: -2 }, { gemId: "target-1", value: -4 }, { gemId: "target-1", value: 3 }];
    const first = resolve([0, 0, 0, 0], effects, inputs); const second = resolve([0, 0, 0, 0], effects, [...inputs].reverse());
    expect(first.values).toEqual([second.values[0], second.values[1], second.values[2], second.values[3]]);
    expect(first.values[2]).toBe(-3);
  });

  it("triggers bombs on zero and lets their AREA flows continue through links", () => {
    const effects = [bomb("bomb", 0), link("link", 1, 2, LinkEffectType.ECHO, undefined, LinkDirection.FORWARD)];
    const result = resolve([2, 5, 5, 5], effects, [{ gemId: "target-0", value: -2 }]);
    expect(result.values).toEqual([0, 3, 3, 3]);
    expect(result.events.some((event) => event.type === "BOMB_TRIGGERED")).toBeTrue();
    expect(result.events.some((event) => event.type === "AREA_TRIGGERED")).toBeTrue();
  });

  it("combines gem and link effects", () => {
    const effects = [link("amp", 0, 1, LinkEffectType.AMPLIFY, 2, LinkDirection.FORWARD), gem("shield", 1, GemEffectType.SHIELD, 1)];
    expect(resolve([0, 0, 0, 0], effects, [{ gemId: "target-0", value: -3 }]).values.slice(0, 2)).toEqual([-3, -5]);
  });

  it("applies GEM amplifier before mutation and inverter after mutation", () => {
    const amplifier = gemConfig("amplifier", 0, { scope: EffectScope.GEM, type: GemEffectType.AMPLIFIER, multiplier: 2 });
    const inverter = gemConfig("inverter", 1, { scope: EffectScope.GEM, type: GemEffectType.INVERTER });
    expect(resolve([4, 8, 0, 0], [amplifier, inverter], [{ gemId: "target-0", value: -3 }, { gemId: "target-1", value: -3 }]).values).toEqual([-2, -5, 0, 0]);
  });

  it("uses the deterministic SHIELD, MIRROR, AMPLIFIER priority", () => {
    const effects = [gem("shield", 0, GemEffectType.SHIELD, 2), gemConfig("mirror", 0, { scope: EffectScope.GEM, type: GemEffectType.MIRROR }), gemConfig("amplifier", 0, { scope: EffectScope.GEM, type: GemEffectType.AMPLIFIER, multiplier: 2 })];
    expect(resolve([0, 0, 0, 0], effects, [{ gemId: "target-0", value: -5 }]).values[0]).toBe(6);
  });

  it("keeps the operation that breaks WALL or ICE from changing the gem", () => {
    const wall = gem("wall", 0, GemEffectType.WALL, 1);
    const ice = gemConfig("ice", 1, { scope: EffectScope.GEM, type: GemEffectType.ICE, strength: 1 });
    const result = resolve([7, 6, 0, 0], [wall, ice], [{ gemId: "target-0", value: -8 }, { gemId: "target-1", value: -8 }]);
    expect(result.values.slice(0, 2)).toEqual([7, 6]);
    expect(result.events.some((event) => event.type === "WALL_BROKEN")).toBeTrue();
    expect(result.events.some((event) => event.type === "ICE_BROKEN")).toBeTrue();
  });

  it("ticks TIMER only when its own gem receives a direct impulse and completes on the final allowed impulse", () => {
    const timer = gemConfig("timer", 0, { scope: EffectScope.GEM, type: GemEffectType.TIMER, turns: 3 }); const runtime = engine.createRuntime([timer]);
    const untouched = resolve([3, 1, 0, 0], [timer], [{ gemId: "target-1", value: -1 }], runtime);
    expect(untouched.runtime.timerRemainingTurns["timer"]).toBe(3);
    const first = resolve(untouched.values as number[], [timer], [{ gemId: "target-0", value: -1 }], untouched.runtime);
    expect(first.runtime.timerRemainingTurns["timer"]).toBe(2);
    const second = resolve(first.values as number[], [timer], [{ gemId: "target-0", value: -1 }], first.runtime);
    const third = resolve(second.values as number[], [timer], [{ gemId: "target-0", value: -1 }], second.runtime);
    expect(third.events.some((event) => event.type === "TIMER_COMPLETED")).toBeTrue();
    expect(third.events.some((event) => event.type === "TIMER_EXPIRED")).toBeFalse();
  });

  it("expires TIMER when its final allowed direct impulse does not resolve the gem", () => {
    const timer = gemConfig("timer", 0, { scope: EffectScope.GEM, type: GemEffectType.TIMER, turns: 2 }); const runtime = engine.createRuntime([timer]);
    const first = resolve([5, 0, 0, 0], [timer], [{ gemId: "target-0", value: -1 }], runtime);
    const second = resolve(first.values as number[], [timer], [{ gemId: "target-0", value: -1 }], first.runtime);
    expect(second.runtime.expiredTimerIds).toContain("timer");
    expect(second.events.some((event) => event.type === "TIMER_EXPIRED")).toBeTrue();
  });

  it("applies corruption by global turn interval without reactivating a zero gem", () => {
    const corruption = gemConfig("corruption", 0, { scope: EffectScope.GEM, type: GemEffectType.CORRUPTION, amount: 2, intervalTurns: 2 }); const runtime = engine.createRuntime([corruption]);
    const first = resolve([4, 0, 0, 0], [corruption], [], runtime);
    const second = resolve(first.values as number[], [corruption], [], first.runtime);
    expect(second.values[0]).toBe(6);
    const zero = resolve([0, 0, 0, 0], [corruption], [], second.runtime);
    expect(zero.values[0]).toBe(0);
  });
});
