export type PuzzleVariant = "persistent" | "loader";
export type RotationDirection = "CW" | "CCW";
export type PuzzleAction = { type: "ROTATE"; direction: RotationDirection; steps: number } | { type: "IMPULSE" } | { type: "UNDO" } | { type: "RESTART" };
export interface PuzzleCost { impulses: number; rotationSteps: number; }
export interface PuzzleSlot { outerIndex: number; phase?: number; }
/** Immutable feedback produced by the latest impulse, used by the presentation layer only. */
export interface ImpulseResult { outerIndex: number; result: number; trend: "zero" | "closer" | "same" | "farther"; }
export interface BaseLevelDefinition { id: string; number: number; title: string; schemaVersion: 1; variant: PuzzleVariant; positions: number; initialRotation: number; outerValues: number[]; /** Sequenza esplicita e interamente visibile di slot attivi a ogni impulso. */ slotPhases: PuzzleSlot[][]; optimalCost?: PuzzleCost; tutorial?: string; }
export interface PersistentLevelDefinition extends BaseLevelDefinition { variant: "persistent"; innerValues: number[]; }
export interface LoaderLevelDefinition extends BaseLevelDefinition { variant: "loader"; queues: number[][]; }
export type LevelDefinition = PersistentLevelDefinition | LoaderLevelDefinition;
export interface PuzzleState { levelId: string; rotation: number; rotationTurns: number; outerValues: number[]; queueCursors: number[]; impulses: number; rotationSteps: number; lastImpulseResults: ImpulseResult[]; history: PuzzleSnapshot[]; won: boolean; }
export interface PuzzleSnapshot { rotation: number; rotationTurns: number; outerValues: number[]; queueCursors: number[]; impulses: number; rotationSteps: number; lastImpulseResults: ImpulseResult[]; won: boolean; }
export interface AlignmentPreview { slot: PuzzleSlot; innerIndex: number; innerValue: number | null; outerValue: number; result: number; active: boolean; trend: "zero" | "closer" | "same" | "farther"; }
