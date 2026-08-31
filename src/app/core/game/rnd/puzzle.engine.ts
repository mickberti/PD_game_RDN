import { AlignmentPreview, DEFAULT_PUZZLE_NUMBER_RANGE, FlowState, GameplayEvent, ImpulseResolutionPlan, LevelDefinition, OperationAttemptResult, OperationRejectedReason, PuzzleAction, PuzzleOperator, PuzzleSnapshot, PuzzleState, QueueState, TargetModifierState } from "./puzzle.types";
import { EffectFlowEngine } from "./effects/effect-flow.engine";
import { LevelEffectConfigResolver } from "./effects/level-effect-config.resolver";
import { logEffectDebug } from "./effects/effect-debug";

const modulo = (value: number, length: number): number => ((value % length) + length) % length;
const cloneRuntime = (runtime: NonNullable<PuzzleState["effectRuntime"]>) => ({ wallRemainingStrength: { ...(runtime.wallRemainingStrength ?? {}) }, iceRemainingStrength: { ...(runtime.iceRemainingStrength ?? {}) }, shieldRemainingStrength: { ...(runtime.shieldRemainingStrength ?? {}) }, timerRemainingTurns: { ...(runtime.timerRemainingTurns ?? {}) }, completedTimerIds: [...(runtime.completedTimerIds ?? [])], expiredTimerIds: [...(runtime.expiredTimerIds ?? [])], turn: runtime.turn ?? 0 });
const snapshot = (state: PuzzleState): PuzzleSnapshot => ({ rotation: state.rotation, rotationTurns: state.rotationTurns, outerValues: [...state.outerValues], targetVisualStates: [...state.targetVisualStates], modifierStates: state.modifierStates.map((item) => ({ ...item })), queueCursors: [...state.queueCursors], consumedSpecialOperatorIndexes: [...state.consumedSpecialOperatorIndexes], impulses: state.impulses, phaseCursor: state.phaseCursor, rotationSteps: state.rotationSteps, lastImpulseResults: [...state.lastImpulseResults], lastOperationResults: [...state.lastOperationResults], lastGameplayEvents: [...state.lastGameplayEvents], effectRuntime: state.effectRuntime ? cloneRuntime(state.effectRuntime) : undefined, lastEffectEvents: state.lastEffectEvents ? [...state.lastEffectEvents] : undefined, won: state.won });
const restore = (level: LevelDefinition, value: PuzzleSnapshot, history: PuzzleSnapshot[]): PuzzleState => ({ levelId: level.id, ...value, phaseCursor: value.phaseCursor ?? value.impulses, outerValues: [...value.outerValues], targetVisualStates: [...(value.targetVisualStates ?? value.outerValues.map((item) => item === 0 ? "OFF" : "ACTIVE"))], modifierStates: value.modifierStates?.map((item) => ({ ...item })) ?? level.outerValues.map(() => ({ shield: 0, lives: 0 })), queueCursors: [...value.queueCursors], consumedSpecialOperatorIndexes: [...(value.consumedSpecialOperatorIndexes ?? [])], lastImpulseResults: [...(value.lastImpulseResults ?? [])], lastOperationResults: [...(value.lastOperationResults ?? [])], lastGameplayEvents: [...(value.lastGameplayEvents ?? [])], effectRuntime: value.effectRuntime ? cloneRuntime(value.effectRuntime) : undefined, lastEffectEvents: value.lastEffectEvents ? [...value.lastEffectEvents] : undefined, history });

/** Pure puzzle-domain engine. Input, animation and rendering depend on its structured results. */
export class PuzzleEngine {
  private readonly effectResolver = new LevelEffectConfigResolver();
  private readonly effectFlow = new EffectFlowEngine();
  createInitialState(level: LevelDefinition): PuzzleState { this.assertLevel(level); const outerValues = [...level.outerValues]; const modifierStates: TargetModifierState[] = outerValues.map((_, index) => { const modifiers = level.targetModifiers?.[index] ?? []; return { shield: modifiers.find((item) => item.type === "shield")?.strength ?? 0, lives: modifiers.find((item) => item.type === "multi-life")?.lives ?? 0 }; }); const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions); if (resolution.issues.length) logEffectDebug("configuration issues", { levelId: level.id, issues: resolution.issues }); const effectState = resolution.effects.length ? { effectRuntime: this.effectFlow.createRuntime(resolution.effects), lastEffectEvents: [] } : {}; return { levelId: level.id, rotation: modulo(level.initialRotation, level.positions), rotationTurns: level.initialRotation, outerValues, targetVisualStates: Array(level.positions).fill("ACTIVE"), modifierStates, queueCursors: Array(level.positions).fill(0), consumedSpecialOperatorIndexes: [], impulses: 0, phaseCursor: 0, rotationSteps: 0, lastImpulseResults: [], lastOperationResults: [], lastGameplayEvents: [], ...effectState, history: [], won: false }; }
  getInnerIndex(level: LevelDefinition, outerIndex: number, rotation: number): number { return modulo(outerIndex - rotation, level.positions); }
  isColorCompatible(level: LevelDefinition, outerIndex: number, innerIndex: number): boolean { return !level.targetColors || !level.operatorColors || level.targetColors[outerIndex] === level.operatorColors[innerIndex]; }
  getInnerValue(level: LevelDefinition, state: PuzzleState, innerIndex: number): PuzzleOperator | null { const operator = level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][state.queueCursors[innerIndex]] ?? null; return typeof operator === "string" && state.consumedSpecialOperatorIndexes.includes(innerIndex) ? null : operator; }
  queueStates(level: LevelDefinition, state: PuzzleState, previewCount = 2): readonly QueueState[] {
    if (level.variant !== "loader") return [];
    return level.queues.map((elements, innerIndex) => {
      const currentIndex = state.queueCursors[innerIndex];
      const remaining = elements.slice(currentIndex);
      return { innerIndex, elements, currentIndex, current: remaining[0] ?? null, preview: remaining.slice(1, 1 + previewCount), remainingCount: remaining.length, exhausted: remaining.length === 0, refillRule: "none" };
    });
  }
  /** The only place mathematical operations are evaluated. */
  attemptOperation(level: LevelDefinition, outerIndex: number, value: number, operator: PuzzleOperator | null, specialAlreadyConsumed = false): OperationAttemptResult {
    const reject = (reason: OperationRejectedReason): OperationAttemptResult => ({ outerIndex, operator, valid: false, previousValue: value, nextValue: value, rejectedReason: reason, resourceConsumed: false, events: ["OperationRejected"] });
    if (operator === null) return reject("NO_OPERATOR"); if (value === 0) return reject("TARGET_ALREADY_RESOLVED"); if (operator === "divide2" && specialAlreadyConsumed) return reject("DIVIDE_BY_TWO_CONSUMED"); if (operator === "divide3" && specialAlreadyConsumed) return reject("DIVIDE_BY_THREE_CONSUMED"); if ((operator === "zero" || operator === "invert" || operator === "skip") && specialAlreadyConsumed) return reject("SPECIAL_OPERATOR_CONSUMED"); if (operator === "divide2" && (!Number.isInteger(value) || value % 2 !== 0)) return reject("DIVIDE_BY_TWO_REQUIRES_NON_ZERO_EVEN_INTEGER"); if (operator === "divide3" && (!Number.isInteger(value) || value % 3 !== 0)) return reject("DIVIDE_BY_THREE_REQUIRES_NON_ZERO_MULTIPLE_OF_THREE");
    const nextValue = operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator; const range = level.numberRange ?? DEFAULT_PUZZLE_NUMBER_RANGE;
    if (nextValue < range.min || nextValue > range.max) return reject("RESULT_OUT_OF_RANGE");
    const events: Array<OperationAttemptResult["events"][number]> = ["OperationApplied"]; if (typeof operator === "string") events.push("SpecialResourceConsumed"); if (nextValue === 0) events.push("TargetReachedZero");
    return { outerIndex, operator, valid: true, previousValue: value, nextValue, resourceConsumed: typeof operator === "string", events };
  }
  phaseIndex(level: LevelDefinition, phaseCursor: number): number { return modulo(phaseCursor, level.slotPhases.length); }
  private relevantPhaseIndex(level: LevelDefinition, state: PuzzleState, phaseOffset: number): number { let index = this.phaseIndex(level, state.phaseCursor); let remaining = phaseOffset; for (let inspected = 0; inspected < level.slotPhases.length; inspected += 1) { const phase = level.slotPhases[index]; if (phase.some((slot) => state.outerValues[slot.outerIndex] !== 0)) { if (remaining === 0) return index; remaining -= 1; } index = modulo(index + 1, level.slotPhases.length); } return index; }
  flows(level: LevelDefinition, state: PuzzleState, phaseOffset = 0): FlowState[] {
    const maxFlows = Math.min(4, level.positions, Math.max(1, level.activeFlowCount ?? level.generation?.branchingFactor ?? 1));
    return level.slotPhases[this.relevantPhaseIndex(level, state, phaseOffset)].filter((slot) => state.outerValues[slot.outerIndex] !== 0).slice(0, maxFlows).map((slot) => { const sourceId = this.getInnerIndex(level, slot.outerIndex, state.rotation); const operator = this.getInnerValue(level, state, sourceId); const attempt = this.attemptOperation(level, slot.outerIndex, state.outerValues[slot.outerIndex], operator, state.consumedSpecialOperatorIndexes.includes(sourceId)); const colorOk = this.isColorCompatible(level, slot.outerIndex, sourceId); return { sourceId, targetId: slot.outerIndex, active: true, interactable: attempt.valid && colorOk, blockedReason: colorOk ? attempt.rejectedReason : "COLOR_MISMATCH" }; });
  }
  previews(level: LevelDefinition, state: PuzzleState, phaseOffset = 0): AlignmentPreview[] {
    const phase = level.slotPhases[this.relevantPhaseIndex(level, state, phaseOffset)].filter((slot) => state.outerValues[slot.outerIndex] !== 0);
    const rawPreviews = phase.map((slot) => {
      const innerIndex = this.getInnerIndex(level, slot.outerIndex, state.rotation);
      const innerValue = this.getInnerValue(level, state, innerIndex);
      const outerValue = state.outerValues[slot.outerIndex];
      const attempt = this.attemptOperation(level, slot.outerIndex, outerValue, innerValue, state.consumedSpecialOperatorIndexes.includes(innerIndex));
      const result = attempt.nextValue;
      return { slot, innerIndex, innerValue, outerValue, result, active: attempt.valid, rejectedReason: attempt.rejectedReason, trend: result === 0 ? "zero" : Math.abs(result) < Math.abs(outerValue) ? "closer" : Math.abs(result) === Math.abs(outerValue) ? "same" : "farther" } satisfies AlignmentPreview;
    });
    if (!state.effectRuntime) return rawPreviews;

    const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions);
    const inputs = rawPreviews.filter((preview) => preview.active).map((preview) => ({ gemId: `target-${preview.slot.outerIndex}`, value: preview.result - preview.outerValue }));
    if (!resolution.effects.length || !inputs.length) return rawPreviews;

    // It is the same pipeline used by the next impulse, but resolve() clones the runtime.
    const resolvedGemIds = state.targetVisualStates.flatMap((visual, index) => visual === "OFF" ? [`target-${index}`] : []);
    const flow = this.effectFlow.resolve(state.outerValues, resolution.effects, state.effectRuntime, inputs, resolution.flowRules, state.impulses + 1, resolvedGemIds);
    return rawPreviews.map((preview) => {
      if (!preview.active) return preview;
      const result = flow.values[preview.slot.outerIndex];
      return { ...preview, result, trend: result === 0 ? "zero" : Math.abs(result) < Math.abs(preview.outerValue) ? "closer" : Math.abs(result) === Math.abs(preview.outerValue) ? "same" : "farther" };
    });
  }
  /** Read-only effect traversal used by the board to preview every link the next impulse will reach. */
  effectPreviewEvents(level: LevelDefinition, state: PuzzleState): readonly import("./effects/effects.models").EffectEngineEvent[] {
    if (!state.effectRuntime) return [];
    const previews = this.previews(level, state);
    const rawResults = previews.map((preview) => this.attemptOperation(level, preview.slot.outerIndex, preview.outerValue, preview.innerValue, state.consumedSpecialOperatorIndexes.includes(preview.innerIndex)));
    const inputs = rawResults.filter((result) => result.valid).map((result) => ({ gemId: `target-${result.outerIndex}`, value: result.nextValue - result.previousValue }));
    if (!inputs.length) return [];
    const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions);
    const resolvedGemIds = state.targetVisualStates.flatMap((visual, index) => visual === "OFF" ? [`target-${index}`] : []);
    return this.effectFlow.resolve(state.outerValues, resolution.effects, state.effectRuntime, inputs, resolution.flowRules, state.impulses + 1, resolvedGemIds).events;
  }
  /** Builds the deterministic transaction before its visual timeline starts. */
  planImpulse(level: LevelDefinition, state: PuzzleState): ImpulseResolutionPlan {
    const next = this.apply(level, state, { type: "IMPULSE" });
    const directByTarget = new Map(next.lastOperationResults.filter((item) => item.valid).map((item) => [item.outerIndex, item]));
    const linkByTargetAndGeneration = new Map<string, string>();
    for (const event of next.lastEffectEvents ?? []) if (event.type === "FLOW_PROPAGATED" && event.gemId && event.linkId) linkByTargetAndGeneration.set(`${event.gemId}:${event.generation}`, event.linkId);
    const values = [...state.outerValues]; const impacts: Array<ImpulseResolutionPlan["impacts"][number]> = []; const impactByGemAndGeneration = new Map<string, ImpulseResolutionPlan["impacts"][number]>();
    for (const event of next.lastEffectEvents ?? []) {
      if (event.type === "GEM_VALUE_CHANGED" && event.gemId && event.value !== undefined) {
        const targetId = Number(event.gemId.replace("target-", "")); if (!Number.isInteger(targetId)) continue;
        const direct = directByTarget.get(targetId); const previousValue = values[targetId]; const resultValue = event.value; values[targetId] = resultValue;
        const impact = { targetId, sourceId: direct ? this.getInnerIndex(level, targetId, state.rotation) : undefined, linkId: linkByTargetAndGeneration.get(`${event.gemId}:${event.generation}`), previousValue, operation: direct?.operator ?? null, appliedValue: resultValue - previousValue, resultValue, generation: event.generation, relativeImpactMs: 0 }; impacts.push(impact); impactByGemAndGeneration.set(`${event.gemId}:${event.generation}`, impact);
      }
      if (event.type === "GEM_INVERTER_APPLIED" && event.gemId && event.valueAfterInversion !== undefined) {
        const impact = impactByGemAndGeneration.get(`${event.gemId}:${event.generation}`); if (!impact) continue;
        impact.resultValue = event.valueAfterInversion; impact.appliedValue = impact.resultValue - impact.previousValue; values[impact.targetId] = impact.resultValue;
      }
    }
    for (const result of next.lastOperationResults) if (result.valid && !impacts.some((impact) => impact.targetId === result.outerIndex && impact.generation === 0)) impacts.push({ targetId: result.outerIndex, sourceId: this.getInnerIndex(level, result.outerIndex, state.rotation), previousValue: state.outerValues[result.outerIndex], operation: result.operator, appliedValue: result.nextValue - result.previousValue, resultValue: result.nextValue, generation: 0, relativeImpactMs: 0 });
    return { id: `${level.id}:${state.impulses + 1}`, initialValues: [...state.outerValues], finalValues: [...next.outerValues], impacts, effectEvents: [...(next.lastEffectEvents ?? [])] };
  }
  apply(level: LevelDefinition, state: PuzzleState, action: PuzzleAction): PuzzleState {
    if (action.type === "UNDO") { const previous = state.history.at(-1); return previous ? restore(level, previous, state.history.slice(0, -1)) : state; } if (action.type === "RESTART") return this.createInitialState(level); if (state.won) return state;
    // An impulse resolves the whole active flow set atomically. Advancing while
    // one branch is invalid would silently skip it, which is never a legal move.
    if (action.type === "IMPULSE" && this.flows(level, state).some((flow) => !flow.interactable)) return state;
    if (state.effectRuntime && action.type === "IMPULSE") return this.applyWithEffects(level, state);
    const history = [...state.history, snapshot(state)]; if (action.type === "ROTATE") { const steps = Math.max(0, Math.floor(action.steps)); const signed = action.direction === "CW" ? steps : -steps; return { ...state, rotation: modulo(state.rotation + signed, level.positions), rotationTurns: state.rotationTurns + signed, rotationSteps: state.rotationSteps + steps, history }; }
    const phaseCursor = this.relevantPhaseIndex(level, state, 0); const previews = this.previews(level, state); const outerValues = [...state.outerValues]; const targetVisualStates = [...state.targetVisualStates]; const queueCursors = [...state.queueCursors]; const consumedSpecialOperatorIndexes = [...state.consumedSpecialOperatorIndexes]; const lastOperationResults = previews.map((preview) => this.attemptOperation(level, preview.slot.outerIndex, preview.outerValue, preview.innerValue, consumedSpecialOperatorIndexes.includes(preview.innerIndex))); const lastGameplayEvents: GameplayEvent[] = [];
    for (const result of lastOperationResults) if (result.valid) { const preview = previews.find((item) => item.slot.outerIndex === result.outerIndex)!; outerValues[result.outerIndex] = result.nextValue; lastGameplayEvents.push({ type: "OperationApplied", targetId: result.outerIndex, impulse: state.impulses + 1 }); if (result.nextValue === 0 && targetVisualStates[result.outerIndex] !== "OFF") { targetVisualStates[result.outerIndex] = "OFF"; lastGameplayEvents.push({ type: "TargetReachedZero", targetId: result.outerIndex, impulse: state.impulses + 1 }, { type: "TargetDeactivated", targetId: result.outerIndex, impulse: state.impulses + 1 }); } if (level.variant === "loader") queueCursors[preview.innerIndex] += 1; if (result.resourceConsumed) consumedSpecialOperatorIndexes.push(preview.innerIndex); }
    const lastImpulseResults: PuzzleState["lastImpulseResults"] = lastOperationResults.filter((result) => result.valid).map((result) => ({ outerIndex: result.outerIndex, result: result.nextValue, trend: (result.nextValue === 0 ? "zero" : Math.abs(result.nextValue) < Math.abs(result.previousValue) ? "closer" : Math.abs(result.nextValue) === Math.abs(result.previousValue) ? "same" : "farther") as "zero" | "closer" | "same" | "farther" }));
    return { ...state, outerValues, targetVisualStates, queueCursors, consumedSpecialOperatorIndexes, impulses: state.impulses + 1, phaseCursor: modulo(phaseCursor + 1, level.slotPhases.length), lastImpulseResults, lastOperationResults, lastGameplayEvents, history, won: outerValues.every((value) => value === 0) };
  }
  private applyWithEffects(level: LevelDefinition, state: PuzzleState): PuzzleState {
    const phaseCursor = this.relevantPhaseIndex(level, state, 0); const previews = this.previews(level, state);
    const rawResults = previews.map((preview) => this.attemptOperation(level, preview.slot.outerIndex, preview.outerValue, preview.innerValue, state.consumedSpecialOperatorIndexes.includes(preview.innerIndex)));
    const inputs = rawResults.filter((result) => result.valid).map((result) => ({ gemId: `target-${result.outerIndex}`, value: result.nextValue - result.previousValue }));
    const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions);
    const resolvedGemIds = state.targetVisualStates.flatMap((visual, index) => visual === "OFF" ? [`target-${index}`] : []);
    const flow = this.effectFlow.resolve(state.outerValues, resolution.effects, state.effectRuntime!, inputs, resolution.flowRules, state.impulses + 1, resolvedGemIds);
    logEffectDebug("resolution", { levelId: level.id, events: flow.events, wallRemainingStrength: flow.runtime.wallRemainingStrength });
    const targetVisualStates = state.targetVisualStates.map((visual, index) => flow.values[index] === 0 ? "OFF" : visual);
    const lastGameplayEvents: GameplayEvent[] = [];
    flow.values.forEach((value, index) => { if (value === 0 && state.outerValues[index] !== 0 && state.targetVisualStates[index] !== "OFF") lastGameplayEvents.push({ type: "OperationApplied", targetId: index, impulse: state.impulses + 1 }, { type: "TargetReachedZero", targetId: index, impulse: state.impulses + 1 }, { type: "TargetDeactivated", targetId: index, impulse: state.impulses + 1 }); else if (value !== state.outerValues[index]) lastGameplayEvents.push({ type: "OperationApplied", targetId: index, impulse: state.impulses + 1 }); });
    const lastOperationResults = rawResults.map((result) => result.valid ? { ...result, nextValue: flow.values[result.outerIndex] } : result);
    const lastImpulseResults: PuzzleState["lastImpulseResults"] = lastOperationResults.filter((result) => result.valid).map((result) => ({ outerIndex: result.outerIndex, result: result.nextValue, trend: (result.nextValue === 0 ? "zero" : Math.abs(result.nextValue) < Math.abs(result.previousValue) ? "closer" : Math.abs(result.nextValue) === Math.abs(result.previousValue) ? "same" : "farther") as "zero" | "closer" | "same" | "farther" }));
    const consumedSpecialOperatorIndexes = [...state.consumedSpecialOperatorIndexes];
    for (const result of rawResults) if (result.valid && result.resourceConsumed) { const preview = previews.find((item) => item.slot.outerIndex === result.outerIndex)!; consumedSpecialOperatorIndexes.push(preview.innerIndex); }
    const queueCursors = [...state.queueCursors];
    for (const result of rawResults) if (result.valid && level.variant === "loader") { const preview = previews.find((item) => item.slot.outerIndex === result.outerIndex)!; queueCursors[preview.innerIndex] += 1; }
    return { ...state, outerValues: [...flow.values], targetVisualStates, queueCursors, consumedSpecialOperatorIndexes, impulses: state.impulses + 1, phaseCursor: modulo(phaseCursor + 1, level.slotPhases.length), lastImpulseResults, lastOperationResults, lastGameplayEvents, effectRuntime: flow.runtime, lastEffectEvents: flow.events, history: [...state.history, snapshot(state)], won: flow.values.every((value) => value === 0) };
  }
  serialize(state: PuzzleState): string { return JSON.stringify({ version: 2, ...snapshot(state) }); }
  deserialize(level: LevelDefinition, raw: string): PuzzleState { const parsed = JSON.parse(raw) as { version: number } & PuzzleSnapshot; if (parsed.version !== 1 && parsed.version !== 2) throw new Error("Unsupported puzzle save version"); return restore(level, parsed, []); }
  private assertLevel(level: LevelDefinition): void { const range = level.numberRange ?? DEFAULT_PUZZLE_NUMBER_RANGE; if (!Number.isInteger(range.min) || !Number.isInteger(range.max) || range.min >= 0 || range.max <= 0 || range.min >= range.max || level.positions < 4 || level.outerValues.length !== level.positions || level.outerValues.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max) || level.slotPhases.length === 0 || level.slotPhases.some((phase) => phase.some((slot) => slot.outerIndex < 0 || slot.outerIndex >= level.positions)) || (level.variant === "persistent" ? level.innerValues.length !== level.positions : level.queues.length !== level.positions || level.queues.some((queue) => queue.some((operator) => operator === 0)))) throw new Error(`Invalid RDN level ${level.id}`); }
}
