import type { LevelEffectConfiguration } from "./effects/level-effects.types";
import type { EffectEngineEvent, EffectRuntimeState } from "./effects/effects.models";

export type PuzzleVariant = "persistent" | "loader";
export type RotationDirection = "CW" | "CCW";
export type PuzzleAction = { type: "ROTATE"; direction: RotationDirection; steps: number } | { type: "IMPULSE" } | { type: "UNDO" } | { type: "RESTART" };

/** A signed additive operand or a single-use special operation. */
export type PuzzleOperator = number | "divide2" | "divide3" | "zero" | "invert" | "skip";
export type SpecialPuzzleOperator = Exclude<PuzzleOperator, number>;
export type ColorId = "green" | "red" | "yellow" | "blue" | "cyan" | "purple";
/** Legacy level data used x2; it migrates safely to DIV2 and is never executed. */
export type LegacyPuzzleOperator = PuzzleOperator | "x2";
export const migrateLegacyPuzzleOperator = (operator: LegacyPuzzleOperator): PuzzleOperator => operator === "x2" ? "divide2" : operator;

export type OperationRejectedReason = "NO_OPERATOR" | "TARGET_ALREADY_RESOLVED" | "DIVIDE_BY_TWO_CONSUMED" | "DIVIDE_BY_TWO_REQUIRES_NON_ZERO_EVEN_INTEGER" | "DIVIDE_BY_THREE_CONSUMED" | "DIVIDE_BY_THREE_REQUIRES_NON_ZERO_MULTIPLE_OF_THREE" | "SPECIAL_OPERATOR_CONSUMED" | "RESULT_OUT_OF_RANGE" | "COLOR_MISMATCH";
export interface PuzzleNumberRange { min: number; max: number; policy: "reject"; }
export const DEFAULT_PUZZLE_NUMBER_RANGE: PuzzleNumberRange = { min: -20, max: 20, policy: "reject" };
export interface OperationAttemptResult { outerIndex: number; operator: PuzzleOperator | null; valid: boolean; previousValue: number; nextValue: number; rejectedReason?: OperationRejectedReason; resourceConsumed: boolean; events: readonly ("OperationApplied" | "SpecialResourceConsumed" | "TargetReachedZero" | "OperationRejected")[]; }

export interface PuzzleSlotSolution { startValue: number; operators: PuzzleOperator[]; }
export interface PuzzleSolutionMove { outerIndex: number; rotation: number; operator: PuzzleOperator; }
export interface PuzzleCost { impulses: number; rotationSteps: number; }
export interface PuzzleSlot { outerIndex: number; phase?: number; }
export interface ImpulseResult { outerIndex: number; result: number; trend: "zero" | "closer" | "same" | "farther"; }
/** Immutable mathematical result of an impulse; Phaser only schedules its presentation. */
export interface ImpulseResolutionImpact { targetId: number; sourceId?: number; linkId?: string; previousValue: number; operation: PuzzleOperator | null; appliedValue: number; resultValue: number; generation: number; relativeImpactMs: number; }
export interface ImpulseResolutionPlan { id: string; initialValues: readonly number[]; finalValues: readonly number[]; impacts: readonly ImpulseResolutionImpact[]; effectEvents: readonly EffectEngineEvent[]; }
/** Topology is independent from mathematical validity and can therefore remain visible when blocked. */
export interface FlowState { sourceId: number; targetId: number; active: boolean; interactable: boolean; blockedReason?: OperationRejectedReason; }
/** Read-only projection of a Time Attack operator queue. */
export interface QueueState { innerIndex: number; elements: readonly PuzzleOperator[]; currentIndex: number; current: PuzzleOperator | null; preview: readonly PuzzleOperator[]; remainingCount: number; exhausted: boolean; refillRule: "none"; }
export type TargetModifier = { type: "shield"; strength: number } | { type: "poison" } | { type: "multi-life"; lives: number } | { type: "growth"; everyImpulses: number; delta: number; label?: string; };
export interface TargetModifierState { shield: number; lives: number; }
export interface PuzzleGenerationMetadata { seed: number; generatorVersion: string; balanceVersion?: string; difficulty: "EASY" | "NORMAL" | "HARD" | "EXPERT"; estimatedMinimumSolutionLength: number; branchingFactor: number; featureFlags: readonly string[]; }
/** Authored rules for an Adventure board. They are immutable and never live in global player progress. */
export interface AdventureGameConfig {
  version: 1;
  seed: number;
  levelVersion: string;
  objectives: { readonly targetValues: readonly number[]; readonly requireAllTargetsZero: true };
  limits?: { readonly maxImpulses?: number; readonly maxRotationSteps?: number };
  enabledMechanics: readonly ("fixed-operators" | "special-inventory" | "rotation" | "impulse" | "lives" | "shield")[];
  /** Counts only one-use operators; normal numeric operators are fixed and unlimited. */
  specialInventory: Readonly<Partial<Record<SpecialPuzzleOperator, number>>>;
  lives?: number;
  shields?: number;
}
export type TargetVisualState = "ACTIVE" | "OFF";
export interface GameplayEvent { type: "OperationApplied" | "TargetReachedZero" | "TargetDeactivated"; targetId: number; impulse: number; }

export interface BaseLevelDefinition { id: string; number: number; title: string; schemaVersion: 1; variant: PuzzleVariant; positions: number; initialRotation: number; outerValues: number[]; targetColors?: readonly ColorId[]; operatorColors?: readonly ColorId[]; targetModifiers?: Readonly<Record<number, readonly TargetModifier[]>>; numberRange?: PuzzleNumberRange; activeFlowCount?: number; generation?: PuzzleGenerationMetadata; slotPhases: PuzzleSlot[][]; optimalCost?: PuzzleCost; /** Score threshold calculated after effects are applied; leaves timing/solver cost unchanged. */ starCost?: PuzzleCost; tutorial?: string; solution?: PuzzleSlotSolution[]; solutionMoves?: PuzzleSolutionMove[]; /** Optional future effects; absent or disabled means unchanged gameplay. */ effectConfiguration?: LevelEffectConfiguration; }
export interface PersistentLevelDefinition extends BaseLevelDefinition { variant: "persistent"; innerValues: PuzzleOperator[]; /** Present on authored Adventure levels; optional for isolated legacy fixtures. */ adventure?: AdventureGameConfig; }
export interface LoaderLevelDefinition extends BaseLevelDefinition { variant: "loader"; queues: PuzzleOperator[][]; }
export type LevelDefinition = PersistentLevelDefinition | LoaderLevelDefinition;

export interface PuzzleState { levelId: string; rotation: number; rotationTurns: number; outerValues: number[]; targetVisualStates: TargetVisualState[]; modifierStates: TargetModifierState[]; queueCursors: number[]; consumedSpecialOperatorIndexes: number[]; impulses: number; phaseCursor: number; rotationSteps: number; lastImpulseResults: ImpulseResult[]; lastOperationResults: OperationAttemptResult[]; lastGameplayEvents: GameplayEvent[]; effectRuntime?: EffectRuntimeState; lastEffectEvents?: readonly EffectEngineEvent[]; history: PuzzleSnapshot[]; won: boolean; }
export interface PuzzleSnapshot { rotation: number; rotationTurns: number; outerValues: number[]; targetVisualStates?: TargetVisualState[]; modifierStates?: TargetModifierState[]; queueCursors: number[]; consumedSpecialOperatorIndexes?: number[]; impulses: number; phaseCursor: number; rotationSteps: number; lastImpulseResults: ImpulseResult[]; lastOperationResults?: OperationAttemptResult[]; lastGameplayEvents?: GameplayEvent[]; effectRuntime?: EffectRuntimeState; lastEffectEvents?: readonly EffectEngineEvent[]; won: boolean; }
export interface AlignmentPreview { slot: PuzzleSlot; innerIndex: number; innerValue: PuzzleOperator | null; outerValue: number; result: number; active: boolean; rejectedReason?: OperationRejectedReason; trend: "zero" | "closer" | "same" | "farther"; }
