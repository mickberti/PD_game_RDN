import { PuzzleEngine } from "./puzzle.engine";
import { LevelDefinition } from "./puzzle.types";
import { EffectScope } from "./effects/effects.models";

const level = (outerValues: number[], innerValues: Array<number | "divide2" | "divide3">): LevelDefinition => ({ id: "spec", number: 1, title: "Spec", schemaVersion: 1, variant: "persistent", positions: 4, initialRotation: 0, outerValues, innerValues, slotPhases: [[{ outerIndex: 0 }]] });

describe("PuzzleEngine", () => {
  const engine = new PuzzleEngine();

  it("applies signed additive operands in both directions", () => {
    expect(engine.attemptOperation(level([5, 1, 1, 1], [-3, 1, 1, 1]), 0, 5, -3).nextValue).toBe(2);
    expect(engine.attemptOperation(level([-5, 1, 1, 1], [3, 1, 1, 1]), 0, -5, 3).nextValue).toBe(-2);
  });

  it("accepts even negative DIV2 values and rejects odd values without consuming it", () => {
    expect(engine.attemptOperation(level([-8, 1, 1, 1], ["divide2", 1, 1, 1]), 0, -8, "divide2")).toEqual(jasmine.objectContaining({ valid: true, nextValue: -4, resourceConsumed: true }));
    expect(engine.attemptOperation(level([-7, 1, 1, 1], ["divide2", 1, 1, 1]), 0, -7, "divide2")).toEqual(jasmine.objectContaining({ valid: false, nextValue: -7, resourceConsumed: false, rejectedReason: "DIVIDE_BY_TWO_REQUIRES_NON_ZERO_EVEN_INTEGER" }));
  });

  it("accepts DIV3 only for non-zero multiples of three and consumes it after use", () => {
    expect(engine.attemptOperation(level([-9, 1, 1, 1], ["divide3", 1, 1, 1]), 0, -9, "divide3")).toEqual(jasmine.objectContaining({ valid: true, nextValue: -3, resourceConsumed: true }));
    expect(engine.attemptOperation(level([-8, 1, 1, 1], ["divide3", 1, 1, 1]), 0, -8, "divide3")).toEqual(jasmine.objectContaining({ valid: false, nextValue: -8, resourceConsumed: false, rejectedReason: "DIVIDE_BY_THREE_REQUIRES_NON_ZERO_MULTIPLE_OF_THREE" }));
  });

  it("consumes DIV2 only after a valid impulse", () => {
    const odd = level([3, 1, 1, 1], ["divide2", 1, 1, 1]);
    const rejected = engine.apply(odd, engine.createInitialState(odd), { type: "IMPULSE" });
    expect(rejected.consumedSpecialOperatorIndexes).toEqual([]);
    const even = level([4, 1, 1, 1], ["divide2", 1, 1, 1]);
    const applied = engine.apply(even, engine.createInitialState(even), { type: "IMPULSE" });
    expect(applied.consumedSpecialOperatorIndexes).toEqual([0]);
    expect(engine.getInnerValue(even, applied, 0)).toBeNull();
  });

  it("reads version 1 saves and migrates their missing special-resource state", () => {
    const definition = level([4, 1, 1, 1], ["divide2", 1, 1, 1]);
    const restored = engine.deserialize(definition, JSON.stringify({ version: 1, rotation: 0, rotationTurns: 0, outerValues: [4, 1, 1, 1], queueCursors: [0, 0, 0, 0], impulses: 0, phaseCursor: 0, rotationSteps: 0, lastImpulseResults: [], won: false }));
    expect(restored.consumedSpecialOperatorIndexes).toEqual([]);
  });

  it("deactivates a target and emits its resolution events exactly once", () => {
    const definition = level([1, 1, 1, 1], [-1, 1, 1, 1]);
    const resolved = engine.apply(definition, engine.createInitialState(definition), { type: "IMPULSE" });
    expect(resolved.targetVisualStates[0]).toBe("OFF");
    expect(resolved.lastGameplayEvents.map((event) => event.type)).toEqual(["OperationApplied", "TargetReachedZero", "TargetDeactivated"]);
  });

  it("advances a Time Attack queue only after a valid operation and exposes its preview", () => {
    const definition: LevelDefinition = { id: "queue", number: 1, title: "Queue", schemaVersion: 1, variant: "loader", positions: 4, initialRotation: 0, outerValues: [3, 1, 1, 1], queues: [[-1, -2], [], [], []], slotPhases: [[{ outerIndex: 0 }]] };
    const initial = engine.createInitialState(definition);
    expect(engine.queueStates(definition, initial)[0]).toEqual(jasmine.objectContaining({ current: -1, preview: [-2], remainingCount: 2, refillRule: "none" }));
    const applied = engine.apply(definition, initial, { type: "IMPULSE" });
    expect(engine.queueStates(definition, applied)[0]).toEqual(jasmine.objectContaining({ current: -2, remainingCount: 1 }));
    const invalidDefinition: LevelDefinition = { ...definition, queues: [["divide2"], [], [], []] };
    const invalid = engine.apply(invalidDefinition, engine.createInitialState(invalidDefinition), { type: "IMPULSE" });
    expect(invalid.queueCursors[0]).toBe(0);
  });

  it("precomputes a direct impulse without mutating the source state", () => {
    const definition = level([5, 1, 1, 1], [-2, 1, 1, 1]);
    const initial = engine.createInitialState(definition);
    const plan = engine.planImpulse(definition, initial);
    expect(initial.outerValues).toEqual([5, 1, 1, 1]);
    expect(plan.finalValues).toEqual(engine.apply(definition, initial, { type: "IMPULSE" }).outerValues);
    expect(plan.impacts).toEqual(jasmine.arrayContaining([jasmine.objectContaining({ targetId: 0, previousValue: 5, operation: -2, resultValue: 3, generation: 0 })]));
  });

  it("precomputes linked impacts from the same initial state in deterministic order", () => {
    const definition: LevelDefinition = { ...level([3, 5, 1, 1], [-1, 1, 1, 1]), effectConfiguration: { enabled: true, effects: [{ preset: "ECHO_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 1 } }] } };
    const initial = engine.createInitialState(definition);
    const first = engine.planImpulse(definition, initial);
    const second = engine.planImpulse(definition, initial);
    expect(first).toEqual(second);
    expect(first.finalValues).toEqual([2, 4, 1, 1]);
    expect(first.impacts).toEqual(jasmine.arrayContaining([jasmine.objectContaining({ targetId: 0, resultValue: 2, generation: 0 }), jasmine.objectContaining({ targetId: 1, resultValue: 4, generation: 1, linkId: "ECHO_LINK-0" })]));
  });
});
