import { PuzzleEngine } from "../puzzle.engine";
import { LevelDefinition, PersistentLevelDefinition } from "../puzzle.types";
import { EffectScope } from "./effects.models";

const baseLevel = (): PersistentLevelDefinition => ({ id: "effects-integration", number: 1, title: "Effects integration", schemaVersion: 1, variant: "persistent", positions: 4, initialRotation: 0, outerValues: [6, 1, 1, 1], innerValues: [-2, 1, 1, 1], slotPhases: [[{ outerIndex: 0 }]] });

describe("PuzzleEngine effect integration", () => {
  const engine = new PuzzleEngine();

  it("keeps repeated legacy operations, target completion and level completion unchanged", () => {
    const legacy: LevelDefinition = { ...baseLevel(), outerValues: [2, 1, 1, 1], innerValues: [-2, -1, -1, -1], slotPhases: [[{ outerIndex: 0 }], [{ outerIndex: 1 }], [{ outerIndex: 2 }], [{ outerIndex: 3 }]] };
    let state = engine.createInitialState(legacy);
    for (let index = 0; index < 4; index += 1) state = engine.apply(legacy, state, { type: "IMPULSE" });
    expect(state.outerValues).toEqual([0, 0, 0, 0]);
    expect(state.won).toBeTrue();
  });

  it("recreates wall runtime state on restart", () => {
    const level: LevelDefinition = { ...baseLevel(), effectConfiguration: { enabled: true, effects: [{ preset: "WALL_3", target: { type: EffectScope.GEM, gemIndex: 0 } }] } };
    let state = engine.createInitialState(level);
    state = engine.apply(level, state, { type: "IMPULSE" });
    state = engine.apply(level, state, { type: "IMPULSE" });
    expect(state.effectRuntime?.wallRemainingStrength).toEqual(jasmine.objectContaining({ "WALL_3-0": 1 }));
    const restarted = engine.apply(level, state, { type: "RESTART" });
    expect(restarted.effectRuntime?.wallRemainingStrength).toEqual(jasmine.objectContaining({ "WALL_3-0": 3 }));
  });
});
