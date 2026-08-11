import { LevelDefinition } from "./puzzle.types";

/** Versioned, deterministic catalog. Values are derived only while the module loads; no runtime puzzle randomness exists. */
const persistent = (number: number): LevelDefinition => {
  const positions = number <= 3 ? 4 : 5;
  const offset = number % positions || 1;
  const values = Array.from({ length: positions }, (_, index) => ((number + index * 3) % 7) - 3 || 1);
  if (number <= 3) return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", positions, initialRotation: offset, outerValues: values.map((value) => -value), innerValues: values, slotPhases: [values.map((_, outerIndex) => ({ outerIndex }))], optimalCost: { impulses: 1, rotationSteps: offset } };
  const rotations = values.map((_, index) => (index * 2) % positions);
  const innerValues = Array<number>(positions).fill(0);
  for (let outerIndex = 0; outerIndex < positions; outerIndex += 1) innerValues[(outerIndex - rotations[outerIndex] + positions) % positions] = values[outerIndex];
  return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", positions, initialRotation: offset, outerValues: values.map((value) => -value), innerValues, slotPhases: values.map((_, outerIndex) => [{ outerIndex }]), optimalCost: { impulses: positions, rotationSteps: positions + offset } };
};
const loader = (number: number): LevelDefinition => {
  const positions = 5;
  const offset = number % positions || 1;
  const values = Array.from({ length: positions }, (_, index) => ((number * 2 + index * 5) % 9) - 4 || 1);
  const rotations = values.map((_, index) => (index * 2) % positions);
  const queues = Array.from({ length: positions }, () => [] as number[]);
  for (let outerIndex = 0; outerIndex < positions; outerIndex += 1) queues[(outerIndex - rotations[outerIndex] + positions) % positions] = [values[outerIndex], values[outerIndex]];
  return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", positions, initialRotation: offset, outerValues: values.map((value) => -value * 2), queues, slotPhases: [...values.map((_, outerIndex) => [{ outerIndex }]), ...values.map((_, outerIndex) => [{ outerIndex }])], optimalCost: { impulses: positions * 2, rotationSteps: positions * 2 + offset } };
};

export const RDN_LEVELS: readonly LevelDefinition[] = [
  ...Array.from({ length: 50 }, (_, index) => persistent(index + 1)),
  ...Array.from({ length: 50 }, (_, index) => loader(index + 1)),
];
export const getRdnLevel = (variant: "adventure" | "time-attack", number = 1): LevelDefinition => RDN_LEVELS.find((level) => level.variant === (variant === "adventure" ? "persistent" : "loader") && level.number === number) ?? RDN_LEVELS[0];
