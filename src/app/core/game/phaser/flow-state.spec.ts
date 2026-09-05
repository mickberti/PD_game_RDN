import { PuzzleEngine } from "./puzzle.engine";
import { LevelDefinition } from "./puzzle.types";
import { EffectScope } from "./effects/effects.models";

const level: LevelDefinition = { id: "flows", number: 1, title: "Flows", schemaVersion: 1, variant: "persistent", positions: 4, initialRotation: 0, activeFlowCount: 4, outerValues: [4, 3, -4, -3], innerValues: ["divide2", "divide2", "divide2", "divide2"], slotPhases: [[{ outerIndex: 0 }, { outerIndex: 1 }, { outerIndex: 2 }, { outerIndex: 3 }]] };

describe("FlowState", () => {
  it("keeps blocked flows visible while preventing state changes", () => {
    const engine = new PuzzleEngine(); const state = engine.createInitialState(level); const flows = engine.flows(level, state);
    expect(flows).toHaveSize(4);
    expect(flows.filter((flow) => flow.interactable)).toHaveSize(2);
    expect(flows.filter((flow) => !flow.interactable).every((flow) => flow.active && flow.blockedReason === "DIVIDE_BY_TWO_REQUIRES_NON_ZERO_EVEN_INTEGER")).toBeTrue();
    const next = engine.apply(level, state, { type: "IMPULSE" });
    expect(next.outerValues).toEqual([2, 3, -2, -3]);
  });

  it("defers a chained destination and continues from its prerequisite", () => {
    const chained: LevelDefinition = {
      id: "chain-skip", number: 1, title: "Chain skip", schemaVersion: 1, variant: "persistent", positions: 4, initialRotation: 0,
      activeFlowCount: 1, outerValues: [1, -1, 2, 2], innerValues: [-1, 1, 1, 1],
      slotPhases: [[{ outerIndex: 1 }], [{ outerIndex: 0 }]],
      effectConfiguration: { enabled: true, effects: [{ preset: "CHAIN_LINK", target: { type: EffectScope.LINK, fromGemIndex: 0, toGemIndex: 1 } }] },
    };
    const engine = new PuzzleEngine();
    const initial = engine.createInitialState(chained);
    expect(engine.flows(chained, initial).map((flow) => flow.targetId)).toEqual([0]);
    const afterPrerequisite = engine.apply(chained, initial, { type: "IMPULSE" });
    expect(afterPrerequisite.outerValues.slice(0, 2)).toEqual([0, -1]);
    expect(engine.flows(chained, afterPrerequisite).map((flow) => flow.targetId)).toEqual([1]);
  });
});
