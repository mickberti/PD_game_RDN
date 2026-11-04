import { TestBed } from '@angular/core/testing';
import { RdnPuzzleService } from "./rnd-puzzle.service";

describe("RdnPuzzleService Adventure run", () => {
  const storageKey = "rdnAdventureRun";
  const createService = () => TestBed.runInInjectionContext(() => new RdnPuzzleService());

  afterEach(() => localStorage.removeItem(storageKey));

  it("persists an Adventure run separately and restores it atomically", async () => {
    const first = createService();
    await first.load("adventure", 1);
    first.dispatch({ type: "ROTATE", direction: "CW", steps: 1 });
    first.saveAdventureRun();

    const resumed = createService();
    expect(await resumed.resumeAdventure(1)).toBeTrue();
    expect(resumed.state().rotation).toBe(1);
    expect(resumed.state().outerValues).toEqual(first.state().outerValues);
  });

  it("drops a saved run when its Adventure configuration version no longer matches", async () => {
    const service = createService();
    await service.load("adventure", 1);
    service.saveAdventureRun();
    const raw = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as { levelVersion?: string };
    raw.levelVersion = "obsolete";
    localStorage.setItem(storageKey, JSON.stringify(raw));

    expect(await createService().resumeAdventure(1)).toBeFalse();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("replaces a successfully used Free gear operator with a different one", async () => {
    const service = createService();
    await service.load("free", 1, "NORMAL", 12345, 4);
    const move = service.level().solutionMoves?.[0];
    expect(move).toBeDefined();
    const positions = service.level().positions;
    const rotation = service.state().rotation;
    const clockwise = ((move!.rotation - rotation) % positions + positions) % positions;
    if (clockwise) service.dispatch({ type: "ROTATE", direction: clockwise <= positions / 2 ? "CW" : "CCW", steps: clockwise <= positions / 2 ? clockwise : positions - clockwise });
    const sourceIndex = ((move!.outerIndex - service.state().rotation) % positions + positions) % positions;
    const levelBefore = service.level();
    const before = levelBefore.variant === "persistent" ? levelBefore.innerValues[sourceIndex] : null;
    service.dispatch({ type: "IMPULSE" });
    expect(service.state().lastOperationResults.some((result) => result.valid)).toBeTrue();
    const levelAfter = service.level();
    expect(levelAfter.variant === "persistent" ? levelAfter.innerValues[sourceIndex] : null).not.toBe(before);
  });
});
