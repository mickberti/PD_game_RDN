import { generateRdnPuzzle } from "./catalog.builder";
import { RDN_LEVELS_PER_SPHERE_INCREMENT, RDN_MAX_LEVEL, RDN_MAX_GEAR_OPERATOR_MAGNITUDE, rdnSphereCountForLevel } from "./config/levels.config";
import { solvePuzzle } from "./puzzle-solver";
import { PuzzleEngine } from './puzzle.engine';
import { RdnCatalogueService } from '../../services/gameplay/rdn-catalogue.service';

describe("seeded RDN generation", () => {
  it("reproduces a board and its metadata from the same seed", () => {
    const first = generateRdnPuzzle("adventure", "NORMAL", 12345);
    const second = generateRdnPuzzle("adventure", "NORMAL", 12345);
    expect(first.outerValues).toEqual(second.outerValues);
    expect(first.generation).toEqual(second.generation);
  });

  it("keeps generated Free queues deterministic and numeric operators bounded", () => {
    for (const difficulty of ["EASY", "NORMAL", "HARD", "EXPERT"] as const) {
      const level = generateRdnPuzzle("time-attack", difficulty, 12345, 8);
      if (level.variant !== "loader") { expect(level.variant).toBe("loader"); continue; }
      const numeric = level.queues.flat().filter((operator): operator is number => typeof operator === "number");
      expect(numeric.every((operator) => Math.abs(operator) <= RDN_MAX_GEAR_OPERATOR_MAGNITUDE)).toBeTrue();
      const again = generateRdnPuzzle("time-attack", difficulty, 12345, 8);
      expect(again.variant).toBe('loader');
      if (again.variant === 'loader') expect(again.queues).toEqual(level.queues);
    }
  });

  it("balances positive and negative numeric operations in generated Free queues", () => {
    for (const difficulty of ["EASY", "NORMAL", "HARD", "EXPERT"] as const) {
      const level = generateRdnPuzzle("time-attack", difficulty, 12345, 8);
      if (level.variant !== "loader") { fail('Expected a Free loader board'); continue; }
      const numeric = level.queues.flat().filter((operator): operator is number => typeof operator === "number");
      const positive = numeric.filter((operator) => operator > 0).length;
      const negative = numeric.filter((operator) => operator < 0).length;
      expect(Math.abs(positive - negative)).withContext(difficulty).toBeLessThanOrEqual(1);
    }
  });

  it("verifies a published puzzle inside its controlled solver budget", async () => {
    const level = await new RdnCatalogueService().getLevel("adventure", 1);
    const result = solvePuzzle(level, { maxDepth: 6, maxVisitedStates: 500, timeoutMs: 1000 });
    expect(result.solved).toBeTrue();
  });

  it("validates every published Adventure solution against the current engine rules", async () => {
    const levels = (await new RdnCatalogueService().levels()).filter((level) => level.variant === 'persistent');
    expect(levels).toHaveSize(RDN_MAX_LEVEL);
    const engine = new PuzzleEngine();
    for (const level of levels) {
      let state = engine.createInitialState(level);
      for (const move of level.solutionMoves ?? []) {
        const clockwise = ((move.rotation - state.rotation) % level.positions + level.positions) % level.positions;
        if (clockwise) state = engine.apply(level, state, { type: 'ROTATE', direction: clockwise <= level.positions / 2 ? 'CW' : 'CCW', steps: clockwise <= level.positions / 2 ? clockwise : level.positions - clockwise });
        state = engine.apply(level, state, { type: 'IMPULSE' });
      }
      expect(state.won).withContext(`Adventure ${level.number}`).toBeTrue();
    }
  });

  it("keeps the solution catalogue aligned with the published Adventure levels", async () => {
    const catalogue = new RdnCatalogueService();
    const table = await catalogue.audit('adventure');
    for (const number of [1, 2, 3]) {
      const level = await catalogue.getLevel("adventure", number);
      const row = table.find((item) => item.level === number)!;
      expect(row.slots).toEqual(level.solution ?? []);
      expect(row.moves).toEqual(level.solutionMoves ?? []);
    }
    expect((await catalogue.getLevel("adventure", 1)).outerValues).not.toEqual((await catalogue.getLevel("adventure", 2)).outerValues);
    expect((await catalogue.getLevel("adventure", 2)).outerValues).not.toEqual((await catalogue.getLevel("adventure", 3)).outerValues);
  });

  it("scales the 4-to-9 sphere progression from the configured catalogue size", () => {
    expect(RDN_LEVELS_PER_SPHERE_INCREMENT).toBe(Math.ceil(RDN_MAX_LEVEL / 6));
    expect(rdnSphereCountForLevel(1)).toBe(4);
    expect(rdnSphereCountForLevel(RDN_LEVELS_PER_SPHERE_INCREMENT + 1)).toBe(5);
    expect(rdnSphereCountForLevel(RDN_LEVELS_PER_SPHERE_INCREMENT * 2 + 1)).toBe(6);
    expect(rdnSphereCountForLevel(RDN_LEVELS_PER_SPHERE_INCREMENT * 3 + 1)).toBe(7);
    expect(rdnSphereCountForLevel(RDN_MAX_LEVEL)).toBe(9);
  });
});
