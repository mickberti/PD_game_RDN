import { AreaEffectConfig, AreaEffectType, DEFAULT_FLOW_RULES, EffectConfig, EffectEngineEvent, EffectRuntimeState, EffectScope, FlowEvent, FlowRules, GemEffectConfig, GemEffectType, LinkDirection, LinkEffectConfig, LinkEffectType, ResolvedEffect } from "./effects.models";

export interface EffectFlowInput {
  gemId: string;
  value: number;
}

export interface EffectFlowResult {
  values: readonly number[];
  runtime: EffectRuntimeState;
  events: readonly EffectEngineEvent[];
}

/**
 * Deterministic, Phaser-free resolver for contribution flows. Effects never mutate
 * presets: consumable data (such as walls) lives exclusively in EffectRuntimeState.
 */
export class EffectFlowEngine {
  createRuntime(effects: readonly ResolvedEffect[]): EffectRuntimeState {
    const wallRemainingStrength: Record<string, number> = {};
    for (const effect of effects) if (effect.config.scope === EffectScope.GEM && effect.config.type === GemEffectType.WALL) wallRemainingStrength[effect.id] = effect.config.strength ?? 1;
    return { wallRemainingStrength };
  }

  resolve(values: readonly number[], effects: readonly ResolvedEffect[], runtime: EffectRuntimeState, inputs: readonly EffectFlowInput[], overrides?: Partial<FlowRules>): EffectFlowResult {
    const rules: FlowRules = { ...DEFAULT_FLOW_RULES, ...overrides };
    const nextValues = [...values];
    const nextRuntime: EffectRuntimeState = { wallRemainingStrength: { ...runtime.wallRemainingStrength } };
    const events: EffectEngineEvent[] = [];
    const triggeredBombs = new Set<string>();
    const gemIndex = new Map<string, number>();
    for (let index = 0; index < values.length; index += 1) gemIndex.set(`target-${index}`, index);
    const gemEffects = new Map<string, ResolvedEffect[]>();
    const links = effects.filter((effect): effect is ResolvedEffect & { config: LinkEffectConfig } => effect.config.scope === EffectScope.LINK);
    const bombs = effects.filter((effect): effect is ResolvedEffect & { config: AreaEffectConfig } => effect.config.scope === EffectScope.AREA && effect.config.type === AreaEffectType.BOMB);
    for (const effect of effects) if (effect.config.scope === EffectScope.GEM) {
      const gemId = effect.target.type === EffectScope.GEM ? effect.target.gem.id : "";
      const list = gemEffects.get(gemId) ?? []; list.push(effect); gemEffects.set(gemId, list);
    }
    for (const list of gemEffects.values()) list.sort((left, right) => (left.config.priority ?? 0) - (right.config.priority ?? 0) || left.id.localeCompare(right.id));

    let queue: FlowEvent[] = inputs.map((input, index) => ({ id: `flow-${index}`, rootFlowId: `flow-${index}`, originGemId: input.gemId, currentGemId: input.gemId, value: input.value, generation: 0, sourceType: "DIRECT", visitedLinks: new Set<string>() }));
    for (const flow of queue) events.push({ type: "FLOW_STARTED", flowId: flow.id, gemId: flow.currentGemId, value: flow.value, generation: 0 });

    while (queue.length) {
      const generation = queue[0].generation;
      const batch = queue.filter((flow) => flow.generation === generation).sort((left, right) => left.id.localeCompare(right.id));
      queue = queue.filter((flow) => flow.generation !== generation);
      const contributions = new Map<string, number[]>();
      const arrivals: Array<{ flow: FlowEvent; value: number }> = [];
      const claimedGems = new Set<string>();
      for (const flow of batch) {
        if (!rules.allowMultipleIncomingFlows && claimedGems.has(flow.currentGemId)) continue;
        claimedGems.add(flow.currentGemId);
        let value = flow.value;
        for (const effect of gemEffects.get(flow.currentGemId) ?? []) value = this.applyGemEffect(effect, value, nextRuntime, events, flow);
        events.push({ type: "FLOW_ARRIVED", flowId: flow.id, gemId: flow.currentGemId, value, generation });
        const list = contributions.get(flow.currentGemId) ?? []; list.push(value); contributions.set(flow.currentGemId, list);
        arrivals.push({ flow, value });
      }
      for (const [gemId, deltas] of contributions) {
        const index = gemIndex.get(gemId); if (index === undefined) continue;
        const total = deltas.reduce((sum, value) => sum + value, 0);
        if (deltas.length > 1) events.push({ type: "FLOW_MERGED", gemId, value: total, generation });
        if (total !== 0) { nextValues[index] += total; events.push({ type: "GEM_VALUE_CHANGED", gemId, value: nextValues[index], generation }); }
      }
      for (const arrival of arrivals) {
        if (arrival.value === 0 || arrival.flow.generation >= rules.maxDepth) continue;
        for (const link of links) {
          const target = this.followLink(link, arrival.flow.currentGemId);
          if (!target || arrival.flow.visitedLinks.has(link.id)) continue;
          const propagated = this.transformLink(link.config, arrival.value);
          const visitedLinks = new Set(arrival.flow.visitedLinks); visitedLinks.add(link.id);
          const id = `${arrival.flow.id}>${link.id}`;
          queue.push({ id, rootFlowId: arrival.flow.rootFlowId, originGemId: arrival.flow.originGemId, currentGemId: target, value: propagated, generation: generation + 1, sourceType: "PROPAGATED", visitedLinks });
          events.push({ type: "FLOW_PROPAGATED", flowId: id, gemId: target, linkId: link.id, value: propagated, generation: generation + 1 });
        }
      }
      for (const bomb of bombs) {
        if (bomb.target.type !== EffectScope.AREA) continue;
        const sourceIndex = gemIndex.get(bomb.target.sourceGem.id); if (triggeredBombs.has(bomb.id) || sourceIndex === undefined || values[sourceIndex] === 0 || nextValues[sourceIndex] !== 0) continue;
        triggeredBombs.add(bomb.id);
        const strength = Math.abs(bomb.config.strength ?? 1); const radius = bomb.config.radius ?? 1;
        events.push({ type: "BOMB_TRIGGERED", gemId: bomb.target.sourceGem.id, generation });
        for (let distance = 1; distance <= radius; distance += 1) for (const neighbour of [((sourceIndex - distance) + values.length) % values.length, (sourceIndex + distance) % values.length]) {
          const id = `area-${bomb.id}-${generation}-${neighbour}`;
          queue.push({ id, rootFlowId: id, originGemId: bomb.target.sourceGem.id, currentGemId: `target-${neighbour}`, value: -strength, generation: generation + 1, sourceType: "AREA", visitedLinks: new Set<string>() });
          events.push({ type: "AREA_TRIGGERED", flowId: id, gemId: `target-${neighbour}`, value: -strength, generation: generation + 1 });
        }
      }
    }
    return { values: nextValues, runtime: nextRuntime, events };
  }

  private applyGemEffect(effect: ResolvedEffect, incoming: number, runtime: EffectRuntimeState, events: EffectEngineEvent[], flow: FlowEvent): number {
    const config = effect.config as GemEffectConfig;
    if (config.type === GemEffectType.SHIELD) { const absorbed = Math.min(Math.abs(incoming), Math.abs(config.strength ?? 1)); const value = Math.sign(incoming) * (Math.abs(incoming) - absorbed); if (absorbed) events.push({ type: "SHIELD_ABSORBED", flowId: flow.id, gemId: flow.currentGemId, value: absorbed, generation: flow.generation }); return value; }
    if (config.type === GemEffectType.WALL) { const remaining = runtime.wallRemainingStrength[effect.id] ?? 0; if (remaining <= 0) return incoming; runtime.wallRemainingStrength = { ...runtime.wallRemainingStrength, [effect.id]: remaining - 1 }; events.push({ type: "WALL_HIT", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation }); if (remaining === 1) events.push({ type: "WALL_BROKEN", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation }); return 0; }
    if (config.type === GemEffectType.MIRROR) { events.push({ type: "MIRROR_APPLIED", flowId: flow.id, gemId: flow.currentGemId, value: -incoming, generation: flow.generation }); return -incoming; }
    return incoming;
  }

  private followLink(effect: ResolvedEffect & { config: LinkEffectConfig }, fromGemId: string): string | null {
    if (effect.target.type !== EffectScope.LINK) return null;
    const { fromGem, toGem } = effect.target; const direction = effect.config.direction ?? LinkDirection.BIDIRECTIONAL;
    if (fromGemId === fromGem.id && direction !== LinkDirection.REVERSE) return toGem.id;
    if (fromGemId === toGem.id && direction !== LinkDirection.FORWARD) return fromGem.id;
    return null;
  }

  private transformLink(config: LinkEffectConfig, value: number): number {
    if (config.type === LinkEffectType.AMPLIFY) return value * (config.multiplier ?? 1);
    if (config.type === LinkEffectType.INVERT) return -value;
    return value;
  }
}
