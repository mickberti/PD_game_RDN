import { generateRdnPuzzle, getRdnLevel, getRdnSolutionTable, RDN_LEVELS_PER_SPHERE_INCREMENT, RDN_MAX_LEVEL, rdnSphereCountForLevel, validateAdventureLevelBatch } from "./levels.config";
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
    const result = solvePuzzle(level, { maxDepth: 6, maxVisitedStates: 500, timeoutMs: 1000 });
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

  it("scales the 4-to-8 sphere progression from the configured catalogue size", () => {
    expect(RDN_LEVELS_PER_SPHERE_INCREMENT).toBe(Math.ceil(RDN_MAX_LEVEL / 5));
    expect(rdnSphereCountForLevel(1)).toBe(4);
    expect(rdnSphereCountForLevel(RDN_LEVELS_PER_SPHERE_INCREMENT + 1)).toBe(5);
    expect(rdnSphereCountForLevel(RDN_LEVELS_PER_SPHERE_INCREMENT * 2 + 1)).toBe(6);
    expect(rdnSphereCountForLevel(RDN_LEVELS_PER_SPHERE_INCREMENT * 3 + 1)).toBe(7);
    expect(rdnSphereCountForLevel(RDN_MAX_LEVEL)).toBe(8);
  });
});
