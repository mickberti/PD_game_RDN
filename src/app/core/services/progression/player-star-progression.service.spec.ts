import { calculatePlayerStarProgression, experienceRequiredForPlayerLevel, totalCollectedModeStars } from "./player-star-progression.service";

describe("player star progression", () => {
  it("adds only the best stars earned across every game mode", () => {
    expect(totalCollectedModeStars({ adventure: { "1": 3, "2": 2 }, "time-attack": { "1": 1 } })).toBe(6);
  });

  it("uses an increasingly expensive level curve", () => {
    expect(experienceRequiredForPlayerLevel(2)).toBeGreaterThan(experienceRequiredForPlayerLevel(1));
    expect(calculatePlayerStarProgression({}).level).toBe(1);
    expect(calculatePlayerStarProgression({ adventure: { "1": 3, "2": 3, "3": 3, "4": 1 } }).level).toBe(2);
    expect(calculatePlayerStarProgression({ adventure: Object.fromEntries(Array.from({ length: 15 }, (_, index) => [String(index + 1), 3])) }).level).toBeGreaterThan(2);
  });
});
