import { AreaEffectConfig, AreaEffectRange, AreaEffectType, DEFAULT_FLOW_RULES, EffectEngineEvent, EffectRuntimeState, EffectScope, FlowEvent, FlowRules, GemEffectConfig, GemEffectType, LinkDirection, LinkEffectConfig, LinkEffectType, ResolvedEffect } from "./effects.models";

export interface EffectFlowInput { gemId: string; value: number; }
export interface EffectFlowResult { values: readonly number[]; runtime: EffectRuntimeState; events: readonly EffectEngineEvent[]; }
interface ProcessedContribution { flow: FlowEvent; value: number; blocked: boolean; }

/** Deterministic, Phaser-free resolver. GEM effects only transform their own input/value. */
export class EffectFlowEngine {
  createRuntime(effects: readonly ResolvedEffect[]): EffectRuntimeState {
    const wallRemainingStrength: Record<string, number> = {}; const iceRemainingStrength: Record<string, number> = {}; const shieldRemainingStrength: Record<string, number> = {}; const timerRemainingTurns: Record<string, number> = {};
    for (const effect of effects) if (effect.config.scope === EffectScope.GEM) {
      const config = effect.config;
      if (config.type === GemEffectType.WALL) wallRemainingStrength[effect.id] = config.strength;
      if (config.type === GemEffectType.ICE) iceRemainingStrength[effect.id] = config.strength;
      if (config.type === GemEffectType.SHIELD && config.consumable) shieldRemainingStrength[effect.id] = config.strength;
      if (config.type === GemEffectType.TIMER) timerRemainingTurns[effect.id] = config.turns;
    }
    return { wallRemainingStrength, iceRemainingStrength, areaIceRemainingStrength: {}, shieldRemainingStrength, timerRemainingTurns, completedTimerIds: [], expiredTimerIds: [], turn: 0 };
  }

  resolve(values: readonly number[], effects: readonly ResolvedEffect[], runtime: EffectRuntimeState, inputs: readonly EffectFlowInput[], overrides?: Partial<FlowRules>, turn?: number, resolvedGemIds: readonly string[] = []): EffectFlowResult {
    const rules: FlowRules = { ...DEFAULT_FLOW_RULES, ...overrides }; const nextValues = [...values];
    const nextRuntime: EffectRuntimeState = { wallRemainingStrength: { ...(runtime.wallRemainingStrength ?? {}) }, iceRemainingStrength: { ...(runtime.iceRemainingStrength ?? {}) }, areaIceRemainingStrength: { ...(runtime.areaIceRemainingStrength ?? {}) }, shieldRemainingStrength: { ...(runtime.shieldRemainingStrength ?? {}) }, timerRemainingTurns: { ...(runtime.timerRemainingTurns ?? {}) }, completedTimerIds: [...(runtime.completedTimerIds ?? [])], expiredTimerIds: [...(runtime.expiredTimerIds ?? [])], turn: turn ?? (runtime.turn ?? 0) + 1 };
    const events: EffectEngineEvent[] = []; const triggeredAreaEffects = new Set<string>(); const terminalGems = new Set(resolvedGemIds); const gemIndex = new Map<string, number>(); values.forEach((_, index) => gemIndex.set(`target-${index}`, index));
    const gemEffects = new Map<string, ResolvedEffect[]>(); const links = effects.filter((effect): effect is ResolvedEffect & { config: LinkEffectConfig } => effect.config.scope === EffectScope.LINK); const areaEffects = effects.filter((effect): effect is ResolvedEffect & { config: AreaEffectConfig } => effect.config.scope === EffectScope.AREA);
    for (const effect of effects) if (effect.config.scope === EffectScope.GEM && effect.target.type === EffectScope.GEM) { const list = gemEffects.get(effect.target.gem.id) ?? []; list.push(effect); gemEffects.set(effect.target.gem.id, list); }
    for (const list of gemEffects.values()) list.sort((a, b) => this.priority(a.config.type as GemEffectType) - this.priority(b.config.type as GemEffectType) || (a.config.priority ?? 0) - (b.config.priority ?? 0) || a.id.localeCompare(b.id));
    let queue: FlowEvent[] = inputs.map((input, index) => ({ id: `flow-${index}`, rootFlowId: `flow-${index}`, originGemId: input.gemId, currentGemId: input.gemId, value: input.value, generation: 0, sourceType: "DIRECT", visitedLinks: new Set<string>() }));
    for (const flow of queue) events.push({ type: "FLOW_STARTED", flowId: flow.id, gemId: flow.currentGemId, value: flow.value, generation: 0 });
    while (queue.length) {
      const generation = queue[0].generation; const batch = queue.filter((flow) => flow.generation === generation).sort((a, b) => a.id.localeCompare(b.id)); queue = queue.filter((flow) => flow.generation !== generation);
      const contributions = new Map<string, ProcessedContribution[]>(); const arrivals: ProcessedContribution[] = []; const claimedGems = new Set<string>();
      for (const flow of batch) {
        const currentIndex = gemIndex.get(flow.currentGemId);
        // A game-declared resolved gem cannot be revived by a later Link or Area flow.
        if (currentIndex === undefined || terminalGems.has(flow.currentGemId)) continue;
        if (!rules.allowMultipleIncomingFlows && claimedGems.has(flow.currentGemId)) continue; claimedGems.add(flow.currentGemId);
        const processed = this.applyBeforeEffects(gemEffects.get(flow.currentGemId) ?? [], flow.value, nextRuntime, events, flow); events.push({ type: "FLOW_ARRIVED", flowId: flow.id, gemId: flow.currentGemId, value: processed.value, generation });
        const list = contributions.get(flow.currentGemId) ?? []; list.push(processed); contributions.set(flow.currentGemId, list); arrivals.push(processed);
      }
      for (const [gemId, incoming] of contributions) {
        const index = gemIndex.get(gemId); if (index === undefined) continue; const total = incoming.reduce((sum, item) => sum + item.value, 0); if (incoming.length > 1) events.push({ type: "FLOW_MERGED", gemId, value: total, generation });
        const before = nextValues[index]; let after = this.normalizeZero(before + total); if (total !== 0) events.push({ type: "GEM_VALUE_CHANGED", gemId, value: after, generation });
        for (const effect of gemEffects.get(gemId) ?? []) if (effect.config.type === GemEffectType.INVERTER && total !== 0) { const inverted = this.normalizeZero(-after); events.push({ type: "GEM_INVERTER_APPLIED", gemId, generation, valueBeforeOperation: before, valueAfterOperation: after, valueAfterInversion: inverted }); after = inverted; }
        nextValues[index] = after; if (after === 0) terminalGems.add(gemId);
      }
      for (const arrival of arrivals) {
        if (arrival.value === 0 || arrival.blocked || arrival.flow.generation >= rules.maxDepth) continue;
        for (const link of links) { const target = this.followLink(link, arrival.flow.currentGemId); if (!target || !gemIndex.has(target) || terminalGems.has(target) || arrival.flow.visitedLinks.has(link.id)) continue; const propagated = this.transformLink(link.config, arrival.value); const visitedLinks = new Set(arrival.flow.visitedLinks); visitedLinks.add(link.id); const id = `${arrival.flow.id}>${link.id}`; queue.push({ id, rootFlowId: arrival.flow.rootFlowId, originGemId: arrival.flow.originGemId, currentGemId: target, value: propagated, generation: generation + 1, sourceType: "PROPAGATED", visitedLinks }); events.push({ type: "FLOW_PROPAGATED", flowId: id, gemId: target, linkId: link.id, value: propagated, generation: generation + 1 }); }
      }
      for (const areaEffect of areaEffects) {
        if (areaEffect.target.type !== EffectScope.AREA) continue; const sourceIndex = gemIndex.get(areaEffect.target.sourceGem.id); if (triggeredAreaEffects.has(areaEffect.id) || sourceIndex === undefined || values[sourceIndex] === 0 || nextValues[sourceIndex] !== 0) continue;
        triggeredAreaEffects.add(areaEffect.id); const targets = this.areaTargets(sourceIndex, values.length, areaEffect.config); const triggerType = areaEffect.config.type === AreaEffectType.BOMB ? "BOMB_TRIGGERED" : areaEffect.config.type === AreaEffectType.ICE ? "AREA_ICE_TRIGGERED" : "AREA_INVERTER_TRIGGERED"; events.push({ type: triggerType, gemId: areaEffect.target.sourceGem.id, generation });
        if (areaEffect.config.type === AreaEffectType.BOMB) {
          const areaValue = areaEffect.config.value ?? -Math.abs(areaEffect.config.strength ?? 1);
          for (const target of targets) { const id = `area-${areaEffect.id}-${generation}-${target}`; queue.push({ id, rootFlowId: id, originGemId: areaEffect.target.sourceGem.id, currentGemId: `target-${target}`, value: areaValue, generation: generation + 1, sourceType: "AREA", visitedLinks: new Set<string>() }); events.push({ type: "AREA_TRIGGERED", flowId: id, gemId: `target-${target}`, value: areaValue, generation: generation + 1 }); }
        } else if (areaEffect.config.type === AreaEffectType.ICE) {
          const strength = Math.max(1, Math.abs(areaEffect.config.strength ?? 1));
          for (const target of targets) { const gemId = `target-${target}`; const remaining = Math.max(nextRuntime.areaIceRemainingStrength[gemId] ?? 0, strength); nextRuntime.areaIceRemainingStrength = { ...nextRuntime.areaIceRemainingStrength, [gemId]: remaining }; events.push({ type: "AREA_ICE_APPLIED", gemId, generation, remainingStrength: remaining, initialStrength: strength }); }
        } else {
          for (const target of targets) { const gemId = `target-${target}`; const previousValue = nextValues[target]; const newValue = this.normalizeZero(-previousValue); nextValues[target] = newValue; events.push({ type: "AREA_INVERTER_APPLIED", gemId, generation, previousValue, newValue }); }
        }
      }
    }
    this.applyTurnEnd(nextValues, effects, nextRuntime, events, new Set(inputs.map((input) => input.gemId))); return { values: nextValues, runtime: nextRuntime, events };
  }

  private applyBeforeEffects(effects: readonly ResolvedEffect[], incoming: number, runtime: EffectRuntimeState, events: EffectEngineEvent[], flow: FlowEvent): ProcessedContribution {
    let value = incoming;
    const areaIceRemaining = runtime.areaIceRemainingStrength[flow.currentGemId] ?? 0;
    if (areaIceRemaining > 0) { const remaining = areaIceRemaining - 1; runtime.areaIceRemainingStrength = { ...runtime.areaIceRemainingStrength, [flow.currentGemId]: remaining }; events.push({ type: "ICE_HIT", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: remaining, initialStrength: areaIceRemaining }); if (remaining === 0) events.push({ type: "ICE_BROKEN", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: 0, initialStrength: areaIceRemaining }); return { flow, value: 0, blocked: true }; }
    for (const effect of effects) {
      const config = effect.config as GemEffectConfig;
      if (config.type === GemEffectType.WALL || config.type === GemEffectType.ICE) { const state = config.type === GemEffectType.WALL ? runtime.wallRemainingStrength : runtime.iceRemainingStrength; const remaining = state[effect.id] ?? 0; if (remaining > 0) { const next = remaining - 1; if (config.type === GemEffectType.WALL) runtime.wallRemainingStrength = { ...runtime.wallRemainingStrength, [effect.id]: next }; else runtime.iceRemainingStrength = { ...runtime.iceRemainingStrength, [effect.id]: next }; const hit = config.type === GemEffectType.WALL ? "WALL_HIT" : "ICE_HIT"; const broken = config.type === GemEffectType.WALL ? "WALL_BROKEN" : "ICE_BROKEN"; events.push({ type: hit, flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: next, initialStrength: config.strength }); if (next === 0) events.push({ type: broken, flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: 0, initialStrength: config.strength }); return { flow, value: 0, blocked: true }; } }
      if (config.type === GemEffectType.SHIELD) { const strength = config.consumable ? (runtime.shieldRemainingStrength[effect.id] ?? 0) : config.strength; const absorbed = Math.min(Math.abs(value), Math.max(0, strength)); const effective = this.withSign(value, Math.max(0, Math.abs(value) - absorbed)); if (absorbed > 0) { if (config.consumable) { const remaining = Math.max(0, strength - 1); runtime.shieldRemainingStrength = { ...runtime.shieldRemainingStrength, [effect.id]: remaining }; events.push({ type: "SHIELD_ABSORBED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, incomingValue: value, absorbedValue: absorbed, effectiveValue: effective, remainingStrength: remaining, initialStrength: config.strength }); if (remaining === 0) events.push({ type: "SHIELD_DEPLETED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: 0, initialStrength: config.strength }); } else events.push({ type: "SHIELD_ABSORBED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, incomingValue: value, absorbedValue: absorbed, effectiveValue: effective, remainingStrength: config.strength, initialStrength: config.strength }); } value = effective; }
      if (config.type === GemEffectType.MIRROR) { const effective = this.normalizeZero(-value); events.push({ type: "MIRROR_APPLIED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, incomingValue: value, effectiveValue: effective }); value = effective; }
      if (config.type === GemEffectType.AMPLIFIER) { const effective = this.normalizeZero(value * config.multiplier); events.push({ type: "GEM_AMPLIFIER_APPLIED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, multiplier: config.multiplier, incomingValue: value, effectiveValue: effective }); value = effective; }
    }
    return { flow, value, blocked: false };
  }

  private applyTurnEnd(values: number[], effects: readonly ResolvedEffect[], runtime: EffectRuntimeState, events: EffectEngineEvent[], directlyImpulsedGemIds: ReadonlySet<string>): void {
    for (const effect of effects) if (effect.config.scope === EffectScope.GEM && effect.target.type === EffectScope.GEM && effect.config.type === GemEffectType.CORRUPTION) { const index = effect.target.gem.index; const config = effect.config; const interval = config.intervalTurns ?? 1; const previous = values[index]; if (previous !== 0 && runtime.turn % interval === 0) { const next = this.normalizeZero(previous + Math.sign(previous) * config.amount); values[index] = next; events.push({ type: "CORRUPTION_APPLIED", gemId: effect.target.gem.id, generation: 0, previousValue: previous, newValue: next, amount: config.amount, turn: runtime.turn }); } }
    for (const effect of effects) if (effect.config.scope === EffectScope.GEM && effect.target.type === EffectScope.GEM && effect.config.type === GemEffectType.TIMER) { const index = effect.target.gem.index; if (runtime.completedTimerIds.includes(effect.id) || runtime.expiredTimerIds.includes(effect.id)) continue; if (values[index] === 0) { runtime.completedTimerIds = [...runtime.completedTimerIds, effect.id]; events.push({ type: "TIMER_COMPLETED", gemId: effect.target.gem.id, generation: 0, remainingTurns: runtime.timerRemainingTurns[effect.id] ?? effect.config.turns, initialTurns: effect.config.turns, turn: runtime.turn }); continue; } if (!directlyImpulsedGemIds.has(effect.target.gem.id)) continue; const remaining = Math.max(0, (runtime.timerRemainingTurns[effect.id] ?? effect.config.turns) - 1); runtime.timerRemainingTurns = { ...runtime.timerRemainingTurns, [effect.id]: remaining }; events.push({ type: "TIMER_TICK", gemId: effect.target.gem.id, generation: 0, remainingTurns: remaining, initialTurns: effect.config.turns, turn: runtime.turn }); if (remaining === 0) { runtime.expiredTimerIds = [...runtime.expiredTimerIds, effect.id]; events.push({ type: "TIMER_EXPIRED", gemId: effect.target.gem.id, generation: 0, remainingTurns: 0, initialTurns: effect.config.turns, turn: runtime.turn }); } }
  }
  private priority(type: GemEffectType): number { return type === GemEffectType.WALL || type === GemEffectType.ICE ? 10 : type === GemEffectType.SHIELD ? 20 : type === GemEffectType.MIRROR ? 30 : type === GemEffectType.AMPLIFIER ? 40 : type === GemEffectType.INVERTER ? 90 : 100; }
  private areaTargets(sourceIndex: number, count: number, config: AreaEffectConfig): number[] { const range = config.range ?? (config.radius === 2 ? AreaEffectRange.TWO_ADJACENT : AreaEffectRange.ADJACENT); if (range === AreaEffectRange.ALL) return Array.from({ length: count }, (_, index) => index).filter((index) => index !== sourceIndex); const radius = range === AreaEffectRange.TWO_ADJACENT ? 2 : 1; const targets = new Set<number>(); for (let distance = 1; distance <= radius; distance += 1) { targets.add((sourceIndex - distance + count) % count); targets.add((sourceIndex + distance) % count); } targets.delete(sourceIndex); return [...targets]; }
  private followLink(effect: ResolvedEffect & { config: LinkEffectConfig }, fromGemId: string): string | null { if (effect.target.type !== EffectScope.LINK) return null; const { fromGem, toGem } = effect.target; const direction = effect.config.direction ?? LinkDirection.BIDIRECTIONAL; if (fromGemId === fromGem.id && direction !== LinkDirection.REVERSE) return toGem.id; if (fromGemId === toGem.id && direction !== LinkDirection.FORWARD) return fromGem.id; return null; }
  private transformLink(config: LinkEffectConfig, value: number): number { return config.type === LinkEffectType.AMPLIFY ? value * (config.multiplier ?? 1) : config.type === LinkEffectType.INVERT ? -value : value; }
  private withSign(value: number, magnitude: number): number { return this.normalizeZero(Math.sign(value) * magnitude); }
  private normalizeZero(value: number): number { return value === 0 ? 0 : value; }
}
