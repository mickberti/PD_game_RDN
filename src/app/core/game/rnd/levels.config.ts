import { LevelDefinition } from "./puzzle.types";

/** Versioned, deterministic catalog. Values are derived only while the module loads; no runtime puzzle randomness exists. */
const persistent = (number: number): LevelDefinition => {
  const positions = number < 8 ? 4 : number < 28 ? 5 : 6;
  const offset = number % positions || 1;
  const innerValues = Array.from({ length: positions }, (_, index) => ((number + index * 3) % 7) - 3 || 1);
  const outerValues = Array.from({ length: positions }, (_, index) => -innerValues[index]);
  const slotPhases = number <= 3 ? [outerValues.map((_, outerIndex) => ({ outerIndex }))] : [outerValues.filter((_, index) => index % 2 === 0).map((_, index) => ({ outerIndex: index * 2 })), outerValues.filter((_, index) => index % 2 === 1).map((_, index) => ({ outerIndex: index * 2 + 1 }))];
  return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", positions, initialRotation: offset, outerValues, innerValues, slotPhases, optimalCost: { impulses: number <= 3 ? 1 : 2, rotationSteps: offset } };
};
const loader = (number: number): LevelDefinition => {
  const positions = number < 18 ? 4 : number < 38 ? 5 : 6;
  const offset = number % positions || 1;
  const values = Array.from({ length: positions }, (_, index) => ((number * 2 + index * 5) % 9) - 4 || 1);
  const queues = values.map((value) => [value, value]);
  const outerValues = Array.from({ length: positions }, (_, index) => -values[index] * 2);
  const slotPhases = [outerValues.filter((_, index) => index % 2 === 0).map((_, index) => ({ outerIndex: index * 2 })), outerValues.filter((_, index) => index % 2 === 1).map((_, index) => ({ outerIndex: index * 2 + 1 })), outerValues.filter((_, index) => index % 2 === 0).map((_, index) => ({ outerIndex: index * 2 })), outerValues.filter((_, index) => index % 2 === 1).map((_, index) => ({ outerIndex: index * 2 + 1 }))];
  return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", positions, initialRotation: offset, outerValues, queues, slotPhases, optimalCost: { impulses: 4, rotationSteps: offset } };
};

export const RDN_LEVELS: readonly LevelDefinition[] = [
  ...Array.from({ length: 50 }, (_, index) => persistent(index + 1)),
  ...Array.from({ length: 50 }, (_, index) => loader(index + 1)),
];
export const getRdnLevel = (variant: "adventure" | "time-attack", number = 1): LevelDefinition => RDN_LEVELS.find((level) => level.variant === (variant === "adventure" ? "persistent" : "loader") && level.number === number) ?? RDN_LEVELS[0];
