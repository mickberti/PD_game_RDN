import { generateRdnPuzzle, getRdnLevel, getRdnSolutionTable, validateAdventureLevelBatch } from "./levels.config";
import { solvePuzzle } from "./puzzle-solver";

describe("seeded RDN generation", () => {
  it("reproduces a board and its metadata from the same seed", () => {
    const first = generateRdnPuzzle("adventure", "NORMAL", 12345);
    const second = generateRdnPuzzle("adventure", "NORMAL", 12345);
    expect(first.outerValues).toEqual(second.outerValues);
    expect(first.generation).toEqual(second.generation);
  });

  it("verifies a known puzzle inside its controlled solver budget", () => {
    const level = getRdnLevel("adventure", 1);
    const result = solvePuzzle(level, { maxDepth: 2, maxVisitedStates: 100, timeoutMs: 1000 });
    expect(result.solved).toBeTrue();
  });

  it("validates every authored Adventure level against the current engine rules", () => {
    expect(validateAdventureLevelBatch().every((result) => result.valid)).toBeTrue();
  });

  it("keeps the solution catalogue aligned with the exact playable Adventure levels", () => {
    const table = getRdnSolutionTable("adventure");
    for (const number of [1, 2, 3]) {
      const level = getRdnLevel("adventure", number);
      const row = table.find((item) => item.level === number)!;
      expect(row.slots).toEqual(level.solution ?? []);
      expect(row.moves).toEqual(level.solutionMoves ?? []);
    }
    expect(getRdnLevel("adventure", 1).outerValues).not.toEqual(getRdnLevel("adventure", 2).outerValues);
    expect(getRdnLevel("adventure", 2).outerValues).not.toEqual(getRdnLevel("adventure", 3).outerValues);
  });
});
