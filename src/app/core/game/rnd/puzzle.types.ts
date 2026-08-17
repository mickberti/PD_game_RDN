export type PuzzleVariant = "persistent" | "loader";
export type RotationDirection = "CW" | "CCW";
export type PuzzleAction = { type: "ROTATE"; direction: RotationDirection; steps: number } | { type: "IMPULSE" } | { type: "UNDO" } | { type: "RESTART" };
/** A gear operator: signed additive values use magnitudes from 0 to 9. */
export type PuzzleOperator = number | "x2" | "divide2";
/** One independently solvable outer socket in the authored solution table. */
export interface PuzzleSlotSolution { startValue: number; operators: PuzzleOperator[]; }
export interface PuzzleSolutionMove { outerIndex: number; rotation: number; operator: PuzzleOperator; }
export interface PuzzleCost { impulses: number; rotationSteps: number; }
export interface PuzzleSlot { outerIndex: number; phase?: number; }
/** Immutable feedback produced by the latest impulse, used by the presentation layer only. */
export interface ImpulseResult { outerIndex: number; result: number; trend: "zero" | "closer" | "same" | "farther"; }
export interface BaseLevelDefinition { id: string; number: number; title: string; schemaVersion: 1; variant: PuzzleVariant; positions: number; initialRotation: number; outerValues: number[]; /** Sequenza esplicita e interamente visibile di slot attivi a ogni impulso. */ slotPhases: PuzzleSlot[][]; optimalCost?: PuzzleCost; tutorial?: string; /** Audit interno della soluzione generata, senza impatto sulla presentazione. */ solution?: PuzzleSlotSolution[]; solutionMoves?: PuzzleSolutionMove[]; }
export interface PersistentLevelDefinition extends BaseLevelDefinition { variant: "persistent"; innerValues: PuzzleOperator[]; }
export interface LoaderLevelDefinition extends BaseLevelDefinition { variant: "loader"; queues: PuzzleOperator[][]; }
export type LevelDefinition = PersistentLevelDefinition | LoaderLevelDefinition;
export interface PuzzleState { levelId: string; rotation: number; rotationTurns: number; outerValues: number[]; queueCursors: number[]; impulses: number; /** Cursor della sequenza, separato dagli impulsi perché alcune fasi già risolte vengono saltate. */ phaseCursor: number; rotationSteps: number; lastImpulseResults: ImpulseResult[]; history: PuzzleSnapshot[]; won: boolean; }
export interface PuzzleSnapshot { rotation: number; rotationTurns: number; outerValues: number[]; queueCursors: number[]; impulses: number; phaseCursor: number; rotationSteps: number; lastImpulseResults: ImpulseResult[]; won: boolean; }
export interface AlignmentPreview { slot: PuzzleSlot; innerIndex: number; innerValue: PuzzleOperator | null; outerValue: number; result: number; active: boolean; trend: "zero" | "closer" | "same" | "farther"; }
