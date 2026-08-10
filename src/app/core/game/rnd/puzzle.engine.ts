import { AlignmentPreview, LevelDefinition, PuzzleAction, PuzzleSnapshot, PuzzleState } from "./puzzle.types";

const modulo = (value: number, length: number): number => ((value % length) + length) % length;
const snapshot = (state: PuzzleState): PuzzleSnapshot => ({ rotation: state.rotation, rotationTurns: state.rotationTurns, outerValues: [...state.outerValues], queueCursors: [...state.queueCursors], impulses: state.impulses, rotationSteps: state.rotationSteps, won: state.won });
const restore = (level: LevelDefinition, value: PuzzleSnapshot, history: PuzzleSnapshot[]): PuzzleState => ({ levelId: level.id, ...value, outerValues: [...value.outerValues], queueCursors: [...value.queueCursors], history });

export class PuzzleEngine {
  createInitialState(level: LevelDefinition): PuzzleState {
    this.assertLevel(level);
    const outerValues = [...level.outerValues];
    return { levelId: level.id, rotation: modulo(level.initialRotation, level.positions), rotationTurns: level.initialRotation, outerValues, queueCursors: Array(level.positions).fill(0), impulses: 0, rotationSteps: 0, history: [], won: outerValues.every((value) => value === 0) };
  }
  getInnerIndex(level: LevelDefinition, outerIndex: number, rotation: number): number { return modulo(outerIndex - rotation, level.positions); }
  getInnerValue(level: LevelDefinition, state: PuzzleState, innerIndex: number): number | null {
    return level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][state.queueCursors[innerIndex]] ?? null;
  }
  previews(level: LevelDefinition, state: PuzzleState): AlignmentPreview[] {
    return level.activeSlots.map((slot) => {
      const innerIndex = this.getInnerIndex(level, slot.outerIndex, state.rotation); const innerValue = this.getInnerValue(level, state, innerIndex); const outerValue = state.outerValues[slot.outerIndex]; const result = innerValue === null || outerValue === 0 ? outerValue : outerValue + innerValue;
      return { slot, innerIndex, innerValue, outerValue, result, active: innerValue !== null && outerValue !== 0, trend: result === 0 ? "zero" : Math.abs(result) < Math.abs(outerValue) ? "closer" : Math.abs(result) === Math.abs(outerValue) ? "same" : "farther" };
    });
  }
  apply(level: LevelDefinition, state: PuzzleState, action: PuzzleAction): PuzzleState {
    if (action.type === "UNDO") { const previous = state.history.at(-1); return previous ? restore(level, previous, state.history.slice(0, -1)) : state; }
    if (action.type === "RESTART") return this.createInitialState(level);
    if (state.won) return state;
    const history = [...state.history, snapshot(state)];
    if (action.type === "ROTATE") { const steps = Math.max(0, Math.floor(action.steps)); const signed = action.direction === "CW" ? steps : -steps; return { ...state, rotation: modulo(state.rotation + signed, level.positions), rotationTurns: state.rotationTurns + signed, rotationSteps: state.rotationSteps + steps, history }; }
    const previews = this.previews(level, state); const outerValues = [...state.outerValues]; const queueCursors = [...state.queueCursors];
    for (const preview of previews) if (preview.active && preview.innerValue !== null) { outerValues[preview.slot.outerIndex] = preview.result; if (level.variant === "loader") queueCursors[preview.innerIndex] += 1; }
    return { ...state, outerValues, queueCursors, impulses: state.impulses + 1, history, won: outerValues.every((value) => value === 0) };
  }
  serialize(state: PuzzleState): string { return JSON.stringify({ version: 1, ...snapshot(state) }); }
  deserialize(level: LevelDefinition, raw: string): PuzzleState { const parsed = JSON.parse(raw) as { version: number } & PuzzleSnapshot; if (parsed.version !== 1) throw new Error("Unsupported puzzle save version"); return restore(level, parsed, []); }
  private assertLevel(level: LevelDefinition): void { if (level.positions < 4 || level.outerValues.length !== level.positions || level.activeSlots.some((slot) => slot.outerIndex < 0 || slot.outerIndex >= level.positions) || (level.variant === "persistent" ? level.innerValues.length !== level.positions : level.queues.length !== level.positions)) throw new Error(`Invalid RDN level ${level.id}`); }
}
