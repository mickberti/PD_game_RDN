import { RdnPuzzleService } from "./rnd-puzzle.service";

describe("RdnPuzzleService Adventure run", () => {
  const storageKey = "rdnAdventureRun";

  afterEach(() => localStorage.removeItem(storageKey));

  it("persists an Adventure run separately and restores it atomically", () => {
    const first = new RdnPuzzleService();
    first.load("adventure", 1);
    first.dispatch({ type: "ROTATE", direction: "CW", steps: 1 });
    first.saveAdventureRun();

    const resumed = new RdnPuzzleService();
    expect(resumed.resumeAdventure(1)).toBeTrue();
    expect(resumed.state().rotation).toBe(1);
    expect(resumed.state().outerValues).toEqual([1, 1, 1, 1]);
  });

  it("drops a saved run when its Adventure configuration version no longer matches", () => {
    const service = new RdnPuzzleService();
    service.load("adventure", 1);
    service.saveAdventureRun();
    const raw = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as { levelVersion?: string };
    raw.levelVersion = "obsolete";
    localStorage.setItem(storageKey, JSON.stringify(raw));

    expect(new RdnPuzzleService().resumeAdventure(1)).toBeFalse();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("replaces a successfully used Free gear operator with a different one", () => {
    const service = new RdnPuzzleService();
    service.load("free", 1, "NORMAL", 12345, 4);
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
