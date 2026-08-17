import { PuzzleEngine } from "./puzzle.engine";
import { LevelDefinition, PuzzleAction, PuzzleState } from "./puzzle.types";

export interface PuzzleSolveOptions { maxDepth: number; maxVisitedStates: number; timeoutMs: number; }
export interface PuzzleSolveResult { solved: boolean; actions: readonly PuzzleAction[]; visitedStates: number; timedOut: boolean; }

const keyOf = (state: PuzzleState): string => JSON.stringify([state.rotation, state.outerValues, state.queueCursors, state.consumedSpecialOperatorIndexes, state.phaseCursor]);
/** Bounded breadth-first verifier; it is deterministic and intentionally independent from rendering. */
export const solvePuzzle = (level: LevelDefinition, options: PuzzleSolveOptions): PuzzleSolveResult => {
  const engine = new PuzzleEngine(); const initial = engine.createInitialState(level); const startedAt = Date.now();
  const queue: Array<{ state: PuzzleState; actions: PuzzleAction[] }> = [{ state: initial, actions: [] }]; const seen = new Set([keyOf(initial)]);
  while (queue.length) {
    if (Date.now() - startedAt > options.timeoutMs) return { solved: false, actions: [], visitedStates: seen.size, timedOut: true };
    const current = queue.shift()!;
    if (current.state.won) return { solved: true, actions: current.actions, visitedStates: seen.size, timedOut: false };
    if (current.actions.length >= options.maxDepth) continue;
    const actions: PuzzleAction[] = [{ type: "IMPULSE" }, { type: "ROTATE", direction: "CW", steps: 1 }, { type: "ROTATE", direction: "CCW", steps: 1 }];
    for (const action of actions) { const next = engine.apply(level, current.state, action); const key = keyOf(next); if (!seen.has(key)) { seen.add(key); if (seen.size > options.maxVisitedStates) return { solved: false, actions: [], visitedStates: seen.size, timedOut: true }; queue.push({ state: next, actions: [...current.actions, action] }); } }
  }
  return { solved: false, actions: [], visitedStates: seen.size, timedOut: false };
};
