import { PuzzleEngine } from "./puzzle.engine";
import { LevelDefinition } from "./puzzle.types";

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
});
