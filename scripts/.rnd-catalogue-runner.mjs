var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/app/core/game/phaser/puzzle.types.ts
var DEFAULT_PUZZLE_NUMBER_RANGE;
var init_puzzle_types = __esm({
  "src/app/core/game/phaser/puzzle.types.ts"() {
    "use strict";
    DEFAULT_PUZZLE_NUMBER_RANGE = { min: -256, max: 256, policy: "reject" };
  }
});

// src/app/core/game/phaser/effects/effects.models.ts
var DEFAULT_FLOW_RULES;
var init_effects_models = __esm({
  "src/app/core/game/phaser/effects/effects.models.ts"() {
    "use strict";
    DEFAULT_FLOW_RULES = {
      maxDepth: 6,
      allowMultipleIncomingFlows: true,
      combineStrategy: "SUM" /* SUM */
    };
  }
});

// src/app/core/game/phaser/effects/effect-flow.engine.ts
var EffectFlowEngine;
var init_effect_flow_engine = __esm({
  "src/app/core/game/phaser/effects/effect-flow.engine.ts"() {
    "use strict";
    init_effects_models();
    EffectFlowEngine = class {
      createRuntime(effects) {
        const wallRemainingStrength = {};
        const iceRemainingStrength = {};
        const fireRemainingStrength = {};
        const shieldRemainingStrength = {};
        const timerRemainingTurns = {};
        for (const effect of effects) if (effect.config.scope === "GEM" /* GEM */) {
          const config = effect.config;
          if (config.type === "WALL" /* WALL */) wallRemainingStrength[effect.id] = config.strength;
          if (config.type === "ICE" /* ICE */) iceRemainingStrength[effect.id] = config.strength;
          if (config.type === "FIRE" /* FIRE */) fireRemainingStrength[effect.id] = config.strength;
          if (config.type === "SHIELD" /* SHIELD */ && config.consumable) shieldRemainingStrength[effect.id] = config.strength;
          if (config.type === "TIMER" /* TIMER */) timerRemainingTurns[effect.id] = config.turns;
        }
        return { wallRemainingStrength, iceRemainingStrength, fireRemainingStrength, areaIceRemainingStrength: {}, shieldRemainingStrength, timerRemainingTurns, completedTimerIds: [], expiredTimerIds: [], turn: 0 };
      }
      resolve(values, effects, runtime, inputs, overrides, turn, resolvedGemIds = []) {
        const rules = { ...DEFAULT_FLOW_RULES, ...overrides };
        const nextValues = [...values];
        const nextRuntime = { wallRemainingStrength: { ...runtime.wallRemainingStrength ?? {} }, iceRemainingStrength: { ...runtime.iceRemainingStrength ?? {} }, fireRemainingStrength: { ...runtime.fireRemainingStrength ?? {} }, areaIceRemainingStrength: { ...runtime.areaIceRemainingStrength ?? {} }, shieldRemainingStrength: { ...runtime.shieldRemainingStrength ?? {} }, timerRemainingTurns: { ...runtime.timerRemainingTurns ?? {} }, completedTimerIds: [...runtime.completedTimerIds ?? []], expiredTimerIds: [...runtime.expiredTimerIds ?? []], turn: turn ?? (runtime.turn ?? 0) + 1 };
        const events = [];
        const triggeredAreaEffects = /* @__PURE__ */ new Set();
        const terminalGems = new Set(resolvedGemIds);
        const gemIndex = /* @__PURE__ */ new Map();
        values.forEach((_, index) => gemIndex.set(`target-${index}`, index));
        const gemEffects = /* @__PURE__ */ new Map();
        const links = effects.filter((effect) => effect.config.scope === "LINK" /* LINK */);
        const chainLinks = links.filter((effect) => effect.config.type === "CHAIN" /* CHAIN */);
        const areaEffects = effects.filter((effect) => effect.config.scope === "AREA" /* AREA */);
        for (const effect of effects) if (effect.config.scope === "GEM" /* GEM */ && effect.target.type === "GEM" /* GEM */) {
          const list = gemEffects.get(effect.target.gem.id) ?? [];
          list.push(effect);
          gemEffects.set(effect.target.gem.id, list);
        }
        for (const list of gemEffects.values()) list.sort((a, b) => this.priority(a.config.type) - this.priority(b.config.type) || (a.config.priority ?? 0) - (b.config.priority ?? 0) || a.id.localeCompare(b.id));
        let queue = inputs.map((input, index) => ({ id: `flow-${index}`, rootFlowId: `flow-${index}`, originGemId: input.gemId, currentGemId: input.gemId, value: input.value, elementalAffinity: input.elementalAffinity, generation: 0, sourceType: "DIRECT", visitedLinks: /* @__PURE__ */ new Set() }));
        for (const flow of queue) events.push({ type: "FLOW_STARTED", flowId: flow.id, gemId: flow.currentGemId, value: flow.value, generation: 0 });
        while (queue.length) {
          const generation = queue[0].generation;
          const batch = queue.filter((flow) => flow.generation === generation).sort((a, b) => a.id.localeCompare(b.id));
          queue = queue.filter((flow) => flow.generation !== generation);
          const contributions = /* @__PURE__ */ new Map();
          const arrivals = [];
          const claimedGems = /* @__PURE__ */ new Set();
          for (const flow of batch) {
            const currentIndex = gemIndex.get(flow.currentGemId);
            if (currentIndex === void 0 || terminalGems.has(flow.currentGemId)) continue;
            if (!rules.allowMultipleIncomingFlows && claimedGems.has(flow.currentGemId)) continue;
            claimedGems.add(flow.currentGemId);
            const chainedBy = this.chainPrerequisite(chainLinks, flow.currentGemId, nextValues);
            const processed = chainedBy ? (events.push({ type: "CHAIN_BLOCKED", flowId: flow.id, gemId: flow.currentGemId, linkId: chainedBy.id, generation }), { flow, value: 0, blocked: true }) : this.applyBeforeEffects(gemEffects.get(flow.currentGemId) ?? [], flow.value, nextRuntime, events, flow);
            events.push({ type: "FLOW_ARRIVED", flowId: flow.id, gemId: flow.currentGemId, value: processed.value, generation });
            const list = contributions.get(flow.currentGemId) ?? [];
            list.push(processed);
            contributions.set(flow.currentGemId, list);
            arrivals.push(processed);
          }
          for (const [gemId, incoming] of contributions) {
            const index = gemIndex.get(gemId);
            if (index === void 0) continue;
            const total = incoming.reduce((sum, item) => sum + item.value, 0);
            if (incoming.length > 1) events.push({ type: "FLOW_MERGED", gemId, value: total, generation });
            const before = nextValues[index];
            let after = this.normalizeZero(before + total);
            if (total !== 0) events.push({ type: "GEM_VALUE_CHANGED", gemId, value: after, generation });
            for (const effect of gemEffects.get(gemId) ?? []) if (effect.config.type === "INVERTER" /* INVERTER */ && total !== 0) {
              const inverted = this.normalizeZero(-after);
              events.push({ type: "GEM_INVERTER_APPLIED", gemId, generation, valueBeforeOperation: before, valueAfterOperation: after, valueAfterInversion: inverted });
              after = inverted;
            }
            nextValues[index] = after;
            if (after === 0) terminalGems.add(gemId);
          }
          for (const arrival of arrivals) {
            if (arrival.value === 0 || arrival.blocked || arrival.flow.generation >= rules.maxDepth) continue;
            for (const link of links) {
              if (link.config.type === "CHAIN" /* CHAIN */) continue;
              const target = this.followLink(link, arrival.flow.currentGemId);
              if (!target || !gemIndex.has(target) || terminalGems.has(target) || arrival.flow.visitedLinks.has(link.id)) continue;
              const propagated = this.transformLink(link.config, arrival.value);
              const visitedLinks = new Set(arrival.flow.visitedLinks);
              visitedLinks.add(link.id);
              const id = `${arrival.flow.id}>${link.id}`;
              queue.push({ id, rootFlowId: arrival.flow.rootFlowId, originGemId: arrival.flow.originGemId, currentGemId: target, value: propagated, elementalAffinity: arrival.flow.elementalAffinity, generation: generation + 1, sourceType: "PROPAGATED", visitedLinks });
              events.push({ type: "FLOW_PROPAGATED", flowId: id, gemId: target, linkId: link.id, value: propagated, elementalAffinity: arrival.flow.elementalAffinity, generation: generation + 1 });
            }
          }
          for (const areaEffect of areaEffects) {
            if (areaEffect.target.type !== "AREA" /* AREA */) continue;
            const sourceIndex = gemIndex.get(areaEffect.target.sourceGem.id);
            if (triggeredAreaEffects.has(areaEffect.id) || sourceIndex === void 0 || values[sourceIndex] === 0 || nextValues[sourceIndex] !== 0) continue;
            triggeredAreaEffects.add(areaEffect.id);
            const targets = this.areaTargets(sourceIndex, values.length, areaEffect.config);
            const triggerType = areaEffect.config.type === "BOMB" /* BOMB */ ? "BOMB_TRIGGERED" : areaEffect.config.type === "ICE" /* ICE */ ? "AREA_ICE_TRIGGERED" : "AREA_INVERTER_TRIGGERED";
            events.push({ type: triggerType, gemId: areaEffect.target.sourceGem.id, generation });
            if (areaEffect.config.type === "BOMB" /* BOMB */) {
              const areaValue = areaEffect.config.value ?? -Math.abs(areaEffect.config.strength ?? 1);
              for (const target of targets) {
                const id = `area-${areaEffect.id}-${generation}-${target}`;
                queue.push({ id, rootFlowId: id, originGemId: areaEffect.target.sourceGem.id, currentGemId: `target-${target}`, value: areaValue, generation: generation + 1, sourceType: "AREA", visitedLinks: /* @__PURE__ */ new Set() });
                events.push({ type: "AREA_TRIGGERED", flowId: id, gemId: `target-${target}`, value: areaValue, generation: generation + 1 });
              }
            } else if (areaEffect.config.type === "ICE" /* ICE */) {
              const strength = Math.max(1, Math.abs(areaEffect.config.strength ?? 1));
              for (const target of targets) {
                const gemId = `target-${target}`;
                const remaining = Math.max(nextRuntime.areaIceRemainingStrength[gemId] ?? 0, strength);
                nextRuntime.areaIceRemainingStrength = { ...nextRuntime.areaIceRemainingStrength, [gemId]: remaining };
                events.push({ type: "AREA_ICE_APPLIED", gemId, generation, remainingStrength: remaining, initialStrength: strength });
              }
            } else {
              for (const target of targets) {
                const gemId = `target-${target}`;
                const previousValue = nextValues[target];
                const newValue = this.normalizeZero(-previousValue);
                nextValues[target] = newValue;
                events.push({ type: "AREA_INVERTER_APPLIED", gemId, generation, previousValue, newValue });
              }
            }
          }
        }
        this.applyTurnEnd(nextValues, effects, nextRuntime, events, new Set(inputs.map((input) => input.gemId)));
        return { values: nextValues, runtime: nextRuntime, events };
      }
      applyBeforeEffects(effects, incoming, runtime, events, flow) {
        let value = incoming;
        const areaIceRemaining = runtime.areaIceRemainingStrength[flow.currentGemId] ?? 0;
        if (areaIceRemaining > 0) {
          const remaining = areaIceRemaining - 1;
          runtime.areaIceRemainingStrength = { ...runtime.areaIceRemainingStrength, [flow.currentGemId]: remaining };
          events.push({ type: "ICE_HIT", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: remaining, initialStrength: areaIceRemaining });
          if (remaining === 0) events.push({ type: "ICE_BROKEN", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: 0, initialStrength: areaIceRemaining });
          return { flow, value: 0, blocked: true };
        }
        for (const effect of effects) {
          const config = effect.config;
          if (config.type === "WALL" /* WALL */ || config.type === "ICE" /* ICE */ || config.type === "FIRE" /* FIRE */) {
            const barrierAffinity = config.type === "ICE" /* ICE */ ? "ice" : config.type === "FIRE" /* FIRE */ ? "fire" : null;
            const state = config.type === "WALL" /* WALL */ ? runtime.wallRemainingStrength : config.type === "ICE" /* ICE */ ? runtime.iceRemainingStrength : runtime.fireRemainingStrength;
            const remaining = state[effect.id] ?? 0;
            if (remaining > 0) {
              const opposite = barrierAffinity === "ice" ? "fire" : barrierAffinity === "fire" ? "ice" : null;
              if (opposite && flow.elementalAffinity === opposite) {
                events.push({ type: "ELEMENTAL_BYPASSED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, elementalAffinity: barrierAffinity ?? void 0 });
                continue;
              }
              if (barrierAffinity && flow.elementalAffinity === barrierAffinity) {
                events.push({ type: "ELEMENTAL_BLOCKED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, elementalAffinity: barrierAffinity, remainingStrength: remaining, initialStrength: config.strength });
                return { flow, value: 0, blocked: true };
              }
              const next = remaining - 1;
              if (config.type === "WALL" /* WALL */) runtime.wallRemainingStrength = { ...runtime.wallRemainingStrength, [effect.id]: next };
              else if (config.type === "ICE" /* ICE */) runtime.iceRemainingStrength = { ...runtime.iceRemainingStrength, [effect.id]: next };
              else runtime.fireRemainingStrength = { ...runtime.fireRemainingStrength, [effect.id]: next };
              const hit = config.type === "WALL" /* WALL */ ? "WALL_HIT" : config.type === "ICE" /* ICE */ ? "ICE_HIT" : "FIRE_HIT";
              const broken = config.type === "WALL" /* WALL */ ? "WALL_BROKEN" : config.type === "ICE" /* ICE */ ? "ICE_BROKEN" : "FIRE_BROKEN";
              events.push({ type: hit, flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: next, initialStrength: config.strength });
              if (next === 0) events.push({ type: broken, flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: 0, initialStrength: config.strength });
              return { flow, value: 0, blocked: true };
            }
          }
          if (config.type === "SHIELD" /* SHIELD */) {
            const strength = config.consumable ? runtime.shieldRemainingStrength[effect.id] ?? 0 : config.strength;
            const absorbed = Math.min(Math.abs(value), Math.max(0, strength));
            const effective = this.withSign(value, Math.max(0, Math.abs(value) - absorbed));
            if (absorbed > 0) {
              if (config.consumable) {
                const remaining = Math.max(0, strength - 1);
                runtime.shieldRemainingStrength = { ...runtime.shieldRemainingStrength, [effect.id]: remaining };
                events.push({ type: "SHIELD_ABSORBED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, incomingValue: value, absorbedValue: absorbed, effectiveValue: effective, remainingStrength: remaining, initialStrength: config.strength });
                if (remaining === 0) events.push({ type: "SHIELD_DEPLETED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, remainingStrength: 0, initialStrength: config.strength });
              } else events.push({ type: "SHIELD_ABSORBED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, incomingValue: value, absorbedValue: absorbed, effectiveValue: effective, remainingStrength: config.strength, initialStrength: config.strength });
            }
            value = effective;
          }
          if (config.type === "MIRROR" /* MIRROR */) {
            const effective = this.normalizeZero(-value);
            events.push({ type: "MIRROR_APPLIED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, incomingValue: value, effectiveValue: effective });
            value = effective;
          }
          if (config.type === "AMPLIFIER" /* AMPLIFIER */) {
            const effective = this.normalizeZero(value * config.multiplier);
            events.push({ type: "GEM_AMPLIFIER_APPLIED", flowId: flow.id, gemId: flow.currentGemId, generation: flow.generation, multiplier: config.multiplier, incomingValue: value, effectiveValue: effective });
            value = effective;
          }
        }
        return { flow, value, blocked: false };
      }
      applyTurnEnd(values, effects, runtime, events, directlyImpulsedGemIds) {
        for (const effect of effects) if (effect.config.scope === "GEM" /* GEM */ && effect.target.type === "GEM" /* GEM */ && effect.config.type === "CORRUPTION" /* CORRUPTION */) {
          const index = effect.target.gem.index;
          const config = effect.config;
          const interval = config.intervalTurns ?? 1;
          const previous = values[index];
          if (previous !== 0 && runtime.turn % interval === 0) {
            const next = this.normalizeZero(previous + Math.sign(previous) * config.amount);
            values[index] = next;
            events.push({ type: "CORRUPTION_APPLIED", gemId: effect.target.gem.id, generation: 0, previousValue: previous, newValue: next, amount: config.amount, turn: runtime.turn });
          }
        }
        for (const effect of effects) if (effect.config.scope === "GEM" /* GEM */ && effect.target.type === "GEM" /* GEM */ && effect.config.type === "TIMER" /* TIMER */) {
          const index = effect.target.gem.index;
          if (runtime.completedTimerIds.includes(effect.id) || runtime.expiredTimerIds.includes(effect.id)) continue;
          if (values[index] === 0) {
            runtime.completedTimerIds = [...runtime.completedTimerIds, effect.id];
            events.push({ type: "TIMER_COMPLETED", gemId: effect.target.gem.id, generation: 0, remainingTurns: runtime.timerRemainingTurns[effect.id] ?? effect.config.turns, initialTurns: effect.config.turns, turn: runtime.turn });
            continue;
          }
          if (!directlyImpulsedGemIds.has(effect.target.gem.id)) continue;
          const remaining = Math.max(0, (runtime.timerRemainingTurns[effect.id] ?? effect.config.turns) - 1);
          runtime.timerRemainingTurns = { ...runtime.timerRemainingTurns, [effect.id]: remaining };
          events.push({ type: "TIMER_TICK", gemId: effect.target.gem.id, generation: 0, remainingTurns: remaining, initialTurns: effect.config.turns, turn: runtime.turn });
          if (remaining === 0) {
            runtime.expiredTimerIds = [...runtime.expiredTimerIds, effect.id];
            events.push({ type: "TIMER_EXPIRED", gemId: effect.target.gem.id, generation: 0, remainingTurns: 0, initialTurns: effect.config.turns, turn: runtime.turn });
          }
        }
      }
      priority(type) {
        return type === "WALL" /* WALL */ || type === "ICE" /* ICE */ || type === "FIRE" /* FIRE */ ? 10 : type === "SHIELD" /* SHIELD */ ? 20 : type === "MIRROR" /* MIRROR */ ? 30 : type === "AMPLIFIER" /* AMPLIFIER */ ? 40 : type === "INVERTER" /* INVERTER */ ? 90 : 100;
      }
      areaTargets(sourceIndex, count, config) {
        const range = config.range ?? (config.radius === 2 ? "TWO_ADJACENT" /* TWO_ADJACENT */ : "ADJACENT" /* ADJACENT */);
        if (range === "ALL" /* ALL */) return Array.from({ length: count }, (_, index) => index).filter((index) => index !== sourceIndex);
        const radius = range === "TWO_ADJACENT" /* TWO_ADJACENT */ ? 2 : 1;
        const targets = /* @__PURE__ */ new Set();
        for (let distance = 1; distance <= radius; distance += 1) {
          targets.add((sourceIndex - distance + count) % count);
          targets.add((sourceIndex + distance) % count);
        }
        targets.delete(sourceIndex);
        return [...targets];
      }
      followLink(effect, fromGemId) {
        if (effect.target.type !== "LINK" /* LINK */) return null;
        const { fromGem, toGem } = effect.target;
        const direction = effect.config.direction ?? "BIDIRECTIONAL" /* BIDIRECTIONAL */;
        if (fromGemId === fromGem.id && direction !== "REVERSE" /* REVERSE */) return toGem.id;
        if (fromGemId === toGem.id && direction !== "FORWARD" /* FORWARD */) return fromGem.id;
        return null;
      }
      /** A chain is directional: its `fromGem` must already be resolved to unlock `toGem`. */
      chainPrerequisite(chains, gemId, values) {
        return chains.find((chain) => chain.target.type === "LINK" /* LINK */ && chain.target.toGem.id === gemId && values[chain.target.fromGem.index] !== 0);
      }
      transformLink(config, value) {
        return config.type === "AMPLIFY" /* AMPLIFY */ ? value * (config.multiplier ?? 1) : config.type === "INVERT" /* INVERT */ ? -value : value;
      }
      withSign(value, magnitude) {
        return this.normalizeZero(Math.sign(value) * magnitude);
      }
      normalizeZero(value) {
        return value === 0 ? 0 : value;
      }
    };
  }
});

// src/app/core/game/phaser/effects/effect-presets.config.ts
var EFFECT_PRESETS;
var init_effect_presets_config = __esm({
  "src/app/core/game/phaser/effects/effect-presets.config.ts"() {
    "use strict";
    init_effects_models();
    EFFECT_PRESETS = {
      SHIELD_1: { scope: "GEM" /* GEM */, type: "SHIELD" /* SHIELD */, strength: 1 },
      SHIELD_2: { scope: "GEM" /* GEM */, type: "SHIELD" /* SHIELD */, strength: 2 },
      SHIELD_3: { scope: "GEM" /* GEM */, type: "SHIELD" /* SHIELD */, strength: 3 },
      WALL_1: { scope: "GEM" /* GEM */, type: "WALL" /* WALL */, strength: 1 },
      WALL_2: { scope: "GEM" /* GEM */, type: "WALL" /* WALL */, strength: 2 },
      WALL_3: { scope: "GEM" /* GEM */, type: "WALL" /* WALL */, strength: 3 },
      WALL_4: { scope: "GEM" /* GEM */, type: "WALL" /* WALL */, strength: 4 },
      MIRROR_1: { scope: "GEM" /* GEM */, type: "MIRROR" /* MIRROR */ },
      AMPLIFIER_X2: { scope: "GEM" /* GEM */, type: "AMPLIFIER" /* AMPLIFIER */, multiplier: 2 },
      AMPLIFIER_X3: { scope: "GEM" /* GEM */, type: "AMPLIFIER" /* AMPLIFIER */, multiplier: 3 },
      INVERTER_1: { scope: "GEM" /* GEM */, type: "INVERTER" /* INVERTER */ },
      ICE_1: { scope: "GEM" /* GEM */, type: "ICE" /* ICE */, strength: 1 },
      ICE_2: { scope: "GEM" /* GEM */, type: "ICE" /* ICE */, strength: 2 },
      ICE_3: { scope: "GEM" /* GEM */, type: "ICE" /* ICE */, strength: 3 },
      FIRE_1: { scope: "GEM" /* GEM */, type: "FIRE" /* FIRE */, strength: 1 },
      FIRE_2: { scope: "GEM" /* GEM */, type: "FIRE" /* FIRE */, strength: 2 },
      FIRE_3: { scope: "GEM" /* GEM */, type: "FIRE" /* FIRE */, strength: 3 },
      TIMER_3: { scope: "GEM" /* GEM */, type: "TIMER" /* TIMER */, turns: 3, unit: "IMPULSES" /* IMPULSES */ },
      TIMER_5: { scope: "GEM" /* GEM */, type: "TIMER" /* TIMER */, turns: 5, unit: "IMPULSES" /* IMPULSES */ },
      TIMER_7: { scope: "GEM" /* GEM */, type: "TIMER" /* TIMER */, turns: 7, unit: "IMPULSES" /* IMPULSES */ },
      TIMER_10: { scope: "GEM" /* GEM */, type: "TIMER" /* TIMER */, turns: 10, unit: "IMPULSES" /* IMPULSES */ },
      CORRUPTION_1: { scope: "GEM" /* GEM */, type: "CORRUPTION" /* CORRUPTION */, amount: 1 },
      CORRUPTION_2: { scope: "GEM" /* GEM */, type: "CORRUPTION" /* CORRUPTION */, amount: 2 },
      ECHO_LINK: { scope: "LINK" /* LINK */, type: "ECHO" /* ECHO */ },
      DOUBLE_LINK: { scope: "LINK" /* LINK */, type: "AMPLIFY" /* AMPLIFY */, multiplier: 2 },
      INVERT_LINK: { scope: "LINK" /* LINK */, type: "INVERT" /* INVERT */ },
      CHAIN_LINK: { scope: "LINK" /* LINK */, type: "CHAIN" /* CHAIN */, direction: "FORWARD" /* FORWARD */ },
      BOMB_1: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, strength: 1, radius: 1 },
      BOMB_2: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, strength: 2, radius: 1 },
      AREA_BOMB_MINUS_2: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, value: -2, range: "ADJACENT" /* ADJACENT */ },
      AREA_BOMB_PLUS_2: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, value: 2, range: "ADJACENT" /* ADJACENT */ },
      AREA_BOMB_MINUS_4: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, value: -4, range: "TWO_ADJACENT" /* TWO_ADJACENT */ },
      AREA_BOMB_PLUS_4: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, value: 4, range: "TWO_ADJACENT" /* TWO_ADJACENT */ },
      AREA_BOMB_MINUS_7: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, value: -7, range: "ALL" /* ALL */ },
      AREA_BOMB_PLUS_7: { scope: "AREA" /* AREA */, type: "BOMB" /* BOMB */, value: 7, range: "ALL" /* ALL */ },
      AREA_ICE_ADJACENT: { scope: "AREA" /* AREA */, type: "ICE" /* ICE */, strength: 1, range: "ADJACENT" /* ADJACENT */ },
      AREA_ICE_TWO_ADJACENT: { scope: "AREA" /* AREA */, type: "ICE" /* ICE */, strength: 1, range: "TWO_ADJACENT" /* TWO_ADJACENT */ },
      AREA_ICE_ALL: { scope: "AREA" /* AREA */, type: "ICE" /* ICE */, strength: 1, range: "ALL" /* ALL */ },
      AREA_INVERTER_ADJACENT: { scope: "AREA" /* AREA */, type: "INVERTER" /* INVERTER */, range: "ADJACENT" /* ADJACENT */ },
      AREA_INVERTER_TWO_ADJACENT: { scope: "AREA" /* AREA */, type: "INVERTER" /* INVERTER */, range: "TWO_ADJACENT" /* TWO_ADJACENT */ },
      AREA_INVERTER_ALL: { scope: "AREA" /* AREA */, type: "INVERTER" /* INVERTER */, range: "ALL" /* ALL */ }
    };
  }
});

// src/app/core/game/phaser/effects/effect-sets.config.ts
var EFFECT_SETS;
var init_effect_sets_config = __esm({
  "src/app/core/game/phaser/effects/effect-sets.config.ts"() {
    "use strict";
    init_effects_models();
    EFFECT_SETS = {
      /** One shield on the first ring gem; suitable for a first protected-target lesson. */
      BEGINNER_PROTECTION: {
        effects: [{ preset: "SHIELD_1", target: { type: "GEM" /* GEM */, gemIndex: 0 } }]
      },
      BASIC_LINKS: {
        effects: [{ preset: "ECHO_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 0, toGemIndex: 1 } }]
      },
      ADVANCED_FLOW: {
        effects: [
          { preset: "DOUBLE_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 0, toGemIndex: 1 } },
          { preset: "BOMB_2", target: { type: "AREA" /* AREA */, sourceGemIndex: 2 } }
        ]
      }
    };
  }
});

// src/app/core/game/phaser/effects/level-effect-config.resolver.ts
var LevelEffectConfigResolver;
var init_level_effect_config_resolver = __esm({
  "src/app/core/game/phaser/effects/level-effect-config.resolver.ts"() {
    "use strict";
    init_effect_presets_config();
    init_effect_sets_config();
    init_effects_models();
    LevelEffectConfigResolver = class {
      resolve(configuration, gemCount) {
        if (!configuration || !configuration.enabled) return { effects: [], issues: [] };
        const issues = [];
        const assignments = [];
        for (const setKey of configuration.sets ?? []) {
          const set = EFFECT_SETS[setKey];
          if (!set) {
            issues.push(`Unknown effect set: ${setKey}`);
            continue;
          }
          assignments.push(...set.effects);
        }
        assignments.push(...configuration.effects ?? []);
        const effects = [];
        assignments.forEach((assignment, index) => {
          const effect = this.resolveAssignment(assignment, gemCount, issues, index);
          if (effect) effects.push(effect);
        });
        const gemTypesByIndex = /* @__PURE__ */ new Map();
        for (const effect of effects) if (effect.target.type === "GEM" /* GEM */ && effect.config.scope === "GEM" /* GEM */) {
          const types = gemTypesByIndex.get(effect.target.gem.index) ?? /* @__PURE__ */ new Set();
          types.add(effect.config.type);
          gemTypesByIndex.set(effect.target.gem.index, types);
        }
        for (const [index, types] of gemTypesByIndex) if (["WALL", "ICE", "FIRE"].filter((type) => types.has(type)).length > 1) issues.push(`Gem ${index} cannot contain more than one barrier.`);
        return { effects, issues, flowRules: this.resolveFlowRules(configuration.flowRules, issues) };
      }
      resolveAssignment(assignment, gemCount, issues, index) {
        const preset = EFFECT_PRESETS[assignment.preset];
        if (!preset) {
          issues.push(`Unknown effect preset: ${assignment.preset}`);
          return null;
        }
        if (assignment.target.type !== preset.scope) {
          issues.push(`Effect target scope does not match preset: ${assignment.preset}`);
          return null;
        }
        const config = this.mergePreset(preset, assignment.overrides, issues, assignment.preset);
        if (!config) return null;
        const target = this.resolveTarget(assignment.target, gemCount, issues);
        if (!target) return null;
        return { id: config.id ?? `${assignment.preset}-${index}`, config, target };
      }
      mergePreset(preset, overrides, issues, presetKey) {
        if (overrides?.scope !== void 0 && overrides.scope !== preset.scope) {
          issues.push(`Effect override cannot change scope: ${presetKey}`);
          return null;
        }
        if (overrides?.type !== void 0 && overrides.type !== preset.type) {
          issues.push(`Effect override cannot change type: ${presetKey}`);
          return null;
        }
        const merged = { ...preset, ...overrides };
        const strength = "strength" in merged ? merged.strength : void 0;
        const radius = "radius" in merged ? merged.radius : void 0;
        const multiplier = "multiplier" in merged ? merged.multiplier : void 0;
        const turns = "turns" in merged ? merged.turns : void 0;
        const amount = "amount" in merged ? merged.amount : void 0;
        const intervalTurns = "intervalTurns" in merged ? merged.intervalTurns : void 0;
        if (strength !== void 0 && (!Number.isFinite(strength) || strength <= 0) || radius !== void 0 && (!Number.isInteger(radius) || radius <= 0) || multiplier !== void 0 && (!Number.isFinite(multiplier) || multiplier <= 0) || turns !== void 0 && (!Number.isInteger(turns) || turns <= 0) || amount !== void 0 && (!Number.isFinite(amount) || amount <= 0) || intervalTurns !== void 0 && (!Number.isInteger(intervalTurns) || intervalTurns <= 0)) {
          issues.push(`Invalid effect override values: ${presetKey}`);
          return null;
        }
        return merged;
      }
      resolveTarget(target, gemCount, issues) {
        const gem = (index) => {
          if (!Number.isInteger(index) || index < 0 || index >= gemCount) {
            issues.push(`Invalid gem index: ${index}`);
            return null;
          }
          return { id: `target-${index}`, index };
        };
        if (target.type === "GEM" /* GEM */) {
          const resolved = gem(target.gemIndex);
          return resolved ? { type: "GEM" /* GEM */, gem: resolved } : null;
        }
        if (target.type === "AREA" /* AREA */) {
          const resolved = gem(target.sourceGemIndex);
          return resolved ? { type: "AREA" /* AREA */, sourceGem: resolved } : null;
        }
        if (target.fromGemIndex === target.toGemIndex) {
          issues.push("Link effect requires two distinct gems");
          return null;
        }
        const fromGem = gem(target.fromGemIndex);
        const toGem = gem(target.toGemIndex);
        return fromGem && toGem ? { type: "LINK" /* LINK */, fromGem, toGem } : null;
      }
      resolveFlowRules(rules, issues) {
        if (!rules) return void 0;
        const resolved = {};
        if (rules.maxDepth !== void 0) {
          if (!Number.isInteger(rules.maxDepth) || rules.maxDepth < 0) issues.push("Flow rule maxDepth must be a non-negative integer");
          else resolved.maxDepth = rules.maxDepth;
        }
        if (rules.allowMultipleIncomingFlows !== void 0) {
          if (typeof rules.allowMultipleIncomingFlows !== "boolean") issues.push("Flow rule allowMultipleIncomingFlows must be boolean");
          else resolved.allowMultipleIncomingFlows = rules.allowMultipleIncomingFlows;
        }
        if (rules.combineStrategy !== void 0) {
          if (rules.combineStrategy !== "SUM" /* SUM */) issues.push(`Unsupported flow combine strategy: ${String(rules.combineStrategy)}`);
          else resolved.combineStrategy = rules.combineStrategy;
        }
        return resolved;
      }
    };
  }
});

// src/app/core/game/phaser/effects/effect-debug.ts
var isEffectDebugEnabled, logEffectDebug;
var init_effect_debug = __esm({
  "src/app/core/game/phaser/effects/effect-debug.ts"() {
    "use strict";
    isEffectDebugEnabled = () => globalThis.__RDN_EFFECT_DEBUG__ === true;
    logEffectDebug = (message, details) => {
      if (isEffectDebugEnabled()) console.info(`[RDN Effect Debug] ${message}`, details);
    };
  }
});

// src/app/core/game/phaser/puzzle.engine.ts
var modulo, cloneRuntime, snapshot, restore, PuzzleEngine;
var init_puzzle_engine = __esm({
  "src/app/core/game/phaser/puzzle.engine.ts"() {
    "use strict";
    init_puzzle_types();
    init_effect_flow_engine();
    init_level_effect_config_resolver();
    init_effect_debug();
    init_effects_models();
    modulo = (value, length) => (value % length + length) % length;
    cloneRuntime = (runtime) => ({ wallRemainingStrength: { ...runtime.wallRemainingStrength ?? {} }, iceRemainingStrength: { ...runtime.iceRemainingStrength ?? {} }, fireRemainingStrength: { ...runtime.fireRemainingStrength ?? {} }, areaIceRemainingStrength: { ...runtime.areaIceRemainingStrength ?? {} }, shieldRemainingStrength: { ...runtime.shieldRemainingStrength ?? {} }, timerRemainingTurns: { ...runtime.timerRemainingTurns ?? {} }, completedTimerIds: [...runtime.completedTimerIds ?? []], expiredTimerIds: [...runtime.expiredTimerIds ?? []], turn: runtime.turn ?? 0 });
    snapshot = (state) => ({ rotation: state.rotation, rotationTurns: state.rotationTurns, outerValues: [...state.outerValues], targetVisualStates: [...state.targetVisualStates], modifierStates: state.modifierStates.map((item) => ({ ...item })), queueCursors: [...state.queueCursors], consumedSpecialOperatorIndexes: [...state.consumedSpecialOperatorIndexes], impulses: state.impulses, phaseCursor: state.phaseCursor, rotationSteps: state.rotationSteps, lastImpulseResults: [...state.lastImpulseResults], lastOperationResults: [...state.lastOperationResults], lastGameplayEvents: [...state.lastGameplayEvents], effectRuntime: state.effectRuntime ? cloneRuntime(state.effectRuntime) : void 0, lastEffectEvents: state.lastEffectEvents ? [...state.lastEffectEvents] : void 0, won: state.won });
    restore = (level, value, history) => ({ levelId: level.id, ...value, phaseCursor: value.phaseCursor ?? value.impulses, outerValues: [...value.outerValues], targetVisualStates: [...value.targetVisualStates ?? value.outerValues.map((item) => item === 0 ? "OFF" : "ACTIVE")], modifierStates: value.modifierStates?.map((item) => ({ ...item })) ?? level.outerValues.map(() => ({ shield: 0, lives: 0 })), queueCursors: [...value.queueCursors], consumedSpecialOperatorIndexes: [...value.consumedSpecialOperatorIndexes ?? []], lastImpulseResults: [...value.lastImpulseResults ?? []], lastOperationResults: [...value.lastOperationResults ?? []], lastGameplayEvents: [...value.lastGameplayEvents ?? []], effectRuntime: value.effectRuntime ? cloneRuntime(value.effectRuntime) : void 0, lastEffectEvents: value.lastEffectEvents ? [...value.lastEffectEvents] : void 0, history });
    PuzzleEngine = class {
      constructor() {
        this.effectResolver = new LevelEffectConfigResolver();
        this.effectFlow = new EffectFlowEngine();
      }
      createInitialState(level) {
        this.assertLevel(level);
        const outerValues = [...level.outerValues];
        const modifierStates = outerValues.map((_, index) => {
          const modifiers = level.targetModifiers?.[index] ?? [];
          return { shield: modifiers.find((item) => item.type === "shield")?.strength ?? 0, lives: modifiers.find((item) => item.type === "multi-life")?.lives ?? 0 };
        });
        const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions);
        if (resolution.issues.length) logEffectDebug("configuration issues", { levelId: level.id, issues: resolution.issues });
        const effectState = resolution.effects.length ? { effectRuntime: this.effectFlow.createRuntime(resolution.effects), lastEffectEvents: [] } : {};
        return { levelId: level.id, rotation: modulo(level.initialRotation, level.positions), rotationTurns: level.initialRotation, outerValues, targetVisualStates: Array(level.positions).fill("ACTIVE"), modifierStates, queueCursors: Array(level.positions).fill(0), consumedSpecialOperatorIndexes: [], impulses: 0, phaseCursor: 0, rotationSteps: 0, lastImpulseResults: [], lastOperationResults: [], lastGameplayEvents: [], ...effectState, history: [], won: false };
      }
      getInnerIndex(level, outerIndex, rotation) {
        return modulo(outerIndex - rotation, level.positions);
      }
      isColorCompatible(level, outerIndex, innerIndex) {
        return !level.targetColors || !level.operatorColors || level.targetColors[outerIndex] === level.operatorColors[innerIndex];
      }
      getInnerValue(level, state, innerIndex) {
        const operator = level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][state.queueCursors[innerIndex]] ?? null;
        return typeof operator === "string" && state.consumedSpecialOperatorIndexes.includes(innerIndex) ? null : operator;
      }
      getInnerElement(level, state, innerIndex) {
        return level.variant === "persistent" ? level.innerElements?.[innerIndex] ?? null : level.queueElements?.[innerIndex]?.[state.queueCursors[innerIndex]] ?? null;
      }
      queueStates(level, state, previewCount = 2) {
        if (level.variant !== "loader") return [];
        return level.queues.map((elements, innerIndex) => {
          const currentIndex = state.queueCursors[innerIndex];
          const remaining = elements.slice(currentIndex);
          return { innerIndex, elements, currentIndex, current: remaining[0] ?? null, preview: remaining.slice(1, 1 + previewCount), remainingCount: remaining.length, exhausted: remaining.length === 0, refillRule: "none" };
        });
      }
      /** The only place mathematical operations are evaluated. */
      attemptOperation(level, outerIndex, value, operator, specialAlreadyConsumed = false) {
        const reject = (reason) => ({ outerIndex, operator, valid: false, previousValue: value, nextValue: value, rejectedReason: reason, resourceConsumed: false, events: ["OperationRejected"] });
        if (operator === null) return reject("NO_OPERATOR");
        if (value === 0) return reject("TARGET_ALREADY_RESOLVED");
        if (operator === "divide2" && specialAlreadyConsumed) return reject("DIVIDE_BY_TWO_CONSUMED");
        if (operator === "divide3" && specialAlreadyConsumed) return reject("DIVIDE_BY_THREE_CONSUMED");
        if ((operator === "zero" || operator === "invert" || operator === "skip") && specialAlreadyConsumed) return reject("SPECIAL_OPERATOR_CONSUMED");
        if (operator === "divide2" && (!Number.isInteger(value) || value % 2 !== 0)) return reject("DIVIDE_BY_TWO_REQUIRES_NON_ZERO_EVEN_INTEGER");
        if (operator === "divide3" && (!Number.isInteger(value) || value % 3 !== 0)) return reject("DIVIDE_BY_THREE_REQUIRES_NON_ZERO_MULTIPLE_OF_THREE");
        const nextValue = operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator;
        const range = DEFAULT_PUZZLE_NUMBER_RANGE;
        if (nextValue < range.min || nextValue > range.max) return reject("RESULT_OUT_OF_RANGE");
        const events = ["OperationApplied"];
        if (typeof operator === "string") events.push("SpecialResourceConsumed");
        if (nextValue === 0) events.push("TargetReachedZero");
        return { outerIndex, operator, valid: true, previousValue: value, nextValue, resourceConsumed: typeof operator === "string", events };
      }
      phaseIndex(level, phaseCursor) {
        return modulo(phaseCursor, level.slotPhases.length);
      }
      relevantPhaseIndex(level, state, phaseOffset) {
        let index = this.phaseIndex(level, state.phaseCursor);
        let remaining = phaseOffset;
        for (let inspected = 0; inspected < level.slotPhases.length; inspected += 1) {
          const phase = level.slotPhases[index];
          if (phase.some((slot) => state.outerValues[slot.outerIndex] !== 0)) {
            if (remaining === 0) return index;
            remaining -= 1;
          }
          index = modulo(index + 1, level.slotPhases.length);
        }
        return index;
      }
      flows(level, state, phaseOffset = 0) {
        const maxFlows = Math.min(4, level.positions, Math.max(1, level.activeFlowCount ?? level.generation?.branchingFactor ?? 1));
        return level.slotPhases[this.relevantPhaseIndex(level, state, phaseOffset)].filter((slot) => state.outerValues[slot.outerIndex] !== 0).slice(0, maxFlows).map((slot) => {
          const sourceId = this.getInnerIndex(level, slot.outerIndex, state.rotation);
          const operator = this.getInnerValue(level, state, sourceId);
          const attempt = this.attemptOperation(level, slot.outerIndex, state.outerValues[slot.outerIndex], operator, state.consumedSpecialOperatorIndexes.includes(sourceId));
          const colorOk = this.isColorCompatible(level, slot.outerIndex, sourceId);
          const chainLocked = this.isChainLocked(level, state, slot.outerIndex);
          return { sourceId, targetId: slot.outerIndex, active: true, interactable: attempt.valid && colorOk && !chainLocked, blockedReason: !colorOk ? "COLOR_MISMATCH" : chainLocked ? "CHAIN_LOCKED" : attempt.rejectedReason };
        });
      }
      previews(level, state, phaseOffset = 0) {
        const phase = level.slotPhases[this.relevantPhaseIndex(level, state, phaseOffset)].filter((slot) => state.outerValues[slot.outerIndex] !== 0);
        const rawPreviews = phase.map((slot) => {
          const innerIndex = this.getInnerIndex(level, slot.outerIndex, state.rotation);
          const innerValue = this.getInnerValue(level, state, innerIndex);
          const outerValue = state.outerValues[slot.outerIndex];
          const attempt = this.attemptOperation(level, slot.outerIndex, outerValue, innerValue, state.consumedSpecialOperatorIndexes.includes(innerIndex));
          const chainLocked = this.isChainLocked(level, state, slot.outerIndex);
          const result = attempt.nextValue;
          return { slot, innerIndex, innerValue, innerElement: typeof innerValue === "number" ? this.getInnerElement(level, state, innerIndex) : null, outerValue, result, active: attempt.valid && !chainLocked, rejectedReason: chainLocked ? "CHAIN_LOCKED" : attempt.rejectedReason, trend: result === 0 ? "zero" : Math.abs(result) < Math.abs(outerValue) ? "closer" : Math.abs(result) === Math.abs(outerValue) ? "same" : "farther" };
        });
        if (!state.effectRuntime) return rawPreviews;
        const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions);
        const inputs = rawPreviews.filter((preview) => preview.active).map((preview) => ({ gemId: `target-${preview.slot.outerIndex}`, value: preview.result - preview.outerValue, elementalAffinity: preview.innerElement ?? void 0 }));
        if (!resolution.effects.length || !inputs.length) return rawPreviews;
        const resolvedGemIds = state.targetVisualStates.flatMap((visual, index) => visual === "OFF" ? [`target-${index}`] : []);
        const flow = this.effectFlow.resolve(state.outerValues, resolution.effects, state.effectRuntime, inputs, resolution.flowRules, state.impulses + 1, resolvedGemIds);
        return rawPreviews.map((preview) => {
          if (!preview.active) return preview;
          const result = flow.values[preview.slot.outerIndex];
          return { ...preview, result, trend: result === 0 ? "zero" : Math.abs(result) < Math.abs(preview.outerValue) ? "closer" : Math.abs(result) === Math.abs(preview.outerValue) ? "same" : "farther" };
        });
      }
      /** Read-only effect traversal used by the board to preview every link the next impulse will reach. */
      effectPreviewEvents(level, state) {
        if (!state.effectRuntime) return [];
        const previews = this.previews(level, state);
        const rawResults = previews.map((preview) => this.attemptOperation(level, preview.slot.outerIndex, preview.outerValue, preview.innerValue, state.consumedSpecialOperatorIndexes.includes(preview.innerIndex)));
        const inputs = rawResults.flatMap((result, index) => result.valid ? [{ gemId: `target-${result.outerIndex}`, value: result.nextValue - result.previousValue, elementalAffinity: previews[index].innerElement ?? void 0 }] : []);
        if (!inputs.length) return [];
        const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions);
        const resolvedGemIds = state.targetVisualStates.flatMap((visual, index) => visual === "OFF" ? [`target-${index}`] : []);
        return this.effectFlow.resolve(state.outerValues, resolution.effects, state.effectRuntime, inputs, resolution.flowRules, state.impulses + 1, resolvedGemIds).events;
      }
      /** Builds the deterministic transaction before its visual timeline starts. */
      planImpulse(level, state) {
        const next = this.apply(level, state, { type: "IMPULSE" });
        const directByTarget = new Map(next.lastOperationResults.filter((item) => item.valid).map((item) => [item.outerIndex, item]));
        const linkByTargetAndGeneration = /* @__PURE__ */ new Map();
        for (const event of next.lastEffectEvents ?? []) if (event.type === "FLOW_PROPAGATED" && event.gemId && event.linkId) linkByTargetAndGeneration.set(`${event.gemId}:${event.generation}`, event.linkId);
        const values = [...state.outerValues];
        const impacts = [];
        const impactByGemAndGeneration = /* @__PURE__ */ new Map();
        for (const event of next.lastEffectEvents ?? []) {
          if (event.type === "GEM_VALUE_CHANGED" && event.gemId && event.value !== void 0) {
            const targetId = Number(event.gemId.replace("target-", ""));
            if (!Number.isInteger(targetId)) continue;
            const direct = directByTarget.get(targetId);
            const previousValue = values[targetId];
            const resultValue = event.value;
            values[targetId] = resultValue;
            const impact = { targetId, sourceId: direct ? this.getInnerIndex(level, targetId, state.rotation) : void 0, linkId: linkByTargetAndGeneration.get(`${event.gemId}:${event.generation}`), previousValue, operation: direct?.operator ?? null, appliedValue: resultValue - previousValue, resultValue, generation: event.generation, relativeImpactMs: 0 };
            impacts.push(impact);
            impactByGemAndGeneration.set(`${event.gemId}:${event.generation}`, impact);
          }
          if (event.type === "GEM_INVERTER_APPLIED" && event.gemId && event.valueAfterInversion !== void 0) {
            const impact = impactByGemAndGeneration.get(`${event.gemId}:${event.generation}`);
            if (!impact) continue;
            impact.resultValue = event.valueAfterInversion;
            impact.appliedValue = impact.resultValue - impact.previousValue;
            values[impact.targetId] = impact.resultValue;
          }
        }
        for (const result of next.lastOperationResults) if (result.valid && !impacts.some((impact) => impact.targetId === result.outerIndex && impact.generation === 0)) impacts.push({ targetId: result.outerIndex, sourceId: this.getInnerIndex(level, result.outerIndex, state.rotation), previousValue: state.outerValues[result.outerIndex], operation: result.operator, appliedValue: result.nextValue - result.previousValue, resultValue: result.nextValue, generation: 0, relativeImpactMs: 0 });
        return { id: `${level.id}:${state.impulses + 1}`, initialValues: [...state.outerValues], finalValues: [...next.outerValues], impacts, effectEvents: [...next.lastEffectEvents ?? []] };
      }
      apply(level, state, action) {
        if (action.type === "UNDO") {
          const previous = state.history.at(-1);
          return previous ? restore(level, previous, state.history.slice(0, -1)) : state;
        }
        if (action.type === "RESTART") return this.createInitialState(level);
        if (state.won) return state;
        if (action.type === "IMPULSE" && this.flows(level, state).some((flow) => !flow.interactable)) return state;
        if (state.effectRuntime && action.type === "IMPULSE") return this.applyWithEffects(level, state);
        const history = [...state.history, snapshot(state)];
        if (action.type === "ROTATE") {
          const steps = Math.max(0, Math.floor(action.steps));
          const signed = action.direction === "CW" ? steps : -steps;
          return { ...state, rotation: modulo(state.rotation + signed, level.positions), rotationTurns: state.rotationTurns + signed, rotationSteps: state.rotationSteps + steps, history };
        }
        const phaseCursor = this.relevantPhaseIndex(level, state, 0);
        const previews = this.previews(level, state);
        const outerValues = [...state.outerValues];
        const targetVisualStates = [...state.targetVisualStates];
        const queueCursors = [...state.queueCursors];
        const consumedSpecialOperatorIndexes = [...state.consumedSpecialOperatorIndexes];
        const lastOperationResults = previews.map((preview) => this.attemptOperation(level, preview.slot.outerIndex, preview.outerValue, preview.innerValue, consumedSpecialOperatorIndexes.includes(preview.innerIndex)));
        const lastGameplayEvents = [];
        for (const result of lastOperationResults) if (result.valid) {
          const preview = previews.find((item) => item.slot.outerIndex === result.outerIndex);
          outerValues[result.outerIndex] = result.nextValue;
          lastGameplayEvents.push({ type: "OperationApplied", targetId: result.outerIndex, impulse: state.impulses + 1 });
          if (result.nextValue === 0 && targetVisualStates[result.outerIndex] !== "OFF") {
            targetVisualStates[result.outerIndex] = "OFF";
            lastGameplayEvents.push({ type: "TargetReachedZero", targetId: result.outerIndex, impulse: state.impulses + 1 }, { type: "TargetDeactivated", targetId: result.outerIndex, impulse: state.impulses + 1 });
          }
          if (level.variant === "loader") queueCursors[preview.innerIndex] += 1;
          if (result.resourceConsumed) consumedSpecialOperatorIndexes.push(preview.innerIndex);
        }
        const lastImpulseResults = lastOperationResults.filter((result) => result.valid).map((result) => ({ outerIndex: result.outerIndex, result: result.nextValue, trend: result.nextValue === 0 ? "zero" : Math.abs(result.nextValue) < Math.abs(result.previousValue) ? "closer" : Math.abs(result.nextValue) === Math.abs(result.previousValue) ? "same" : "farther" }));
        return { ...state, outerValues, targetVisualStates, queueCursors, consumedSpecialOperatorIndexes, impulses: state.impulses + 1, phaseCursor: modulo(phaseCursor + 1, level.slotPhases.length), lastImpulseResults, lastOperationResults, lastGameplayEvents, history, won: outerValues.every((value) => value === 0) };
      }
      applyWithEffects(level, state) {
        const phaseCursor = this.relevantPhaseIndex(level, state, 0);
        const previews = this.previews(level, state);
        const rawResults = previews.map((preview) => this.attemptOperation(level, preview.slot.outerIndex, preview.outerValue, preview.innerValue, state.consumedSpecialOperatorIndexes.includes(preview.innerIndex)));
        const inputs = rawResults.flatMap((result, index) => result.valid ? [{ gemId: `target-${result.outerIndex}`, value: result.nextValue - result.previousValue, elementalAffinity: previews[index].innerElement ?? void 0 }] : []);
        const resolution = this.effectResolver.resolve(level.effectConfiguration, level.positions);
        const resolvedGemIds = state.targetVisualStates.flatMap((visual, index) => visual === "OFF" ? [`target-${index}`] : []);
        const flow = this.effectFlow.resolve(state.outerValues, resolution.effects, state.effectRuntime, inputs, resolution.flowRules, state.impulses + 1, resolvedGemIds);
        logEffectDebug("resolution", { levelId: level.id, events: flow.events, wallRemainingStrength: flow.runtime.wallRemainingStrength });
        const targetVisualStates = state.targetVisualStates.map((visual, index) => flow.values[index] === 0 ? "OFF" : visual);
        const lastGameplayEvents = [];
        flow.values.forEach((value, index) => {
          if (value === 0 && state.outerValues[index] !== 0 && state.targetVisualStates[index] !== "OFF") lastGameplayEvents.push({ type: "OperationApplied", targetId: index, impulse: state.impulses + 1 }, { type: "TargetReachedZero", targetId: index, impulse: state.impulses + 1 }, { type: "TargetDeactivated", targetId: index, impulse: state.impulses + 1 });
          else if (value !== state.outerValues[index]) lastGameplayEvents.push({ type: "OperationApplied", targetId: index, impulse: state.impulses + 1 });
        });
        const lastOperationResults = rawResults.map((result) => result.valid ? { ...result, nextValue: flow.values[result.outerIndex] } : result);
        const lastImpulseResults = lastOperationResults.filter((result) => result.valid).map((result) => ({ outerIndex: result.outerIndex, result: result.nextValue, trend: result.nextValue === 0 ? "zero" : Math.abs(result.nextValue) < Math.abs(result.previousValue) ? "closer" : Math.abs(result.nextValue) === Math.abs(result.previousValue) ? "same" : "farther" }));
        const consumedSpecialOperatorIndexes = [...state.consumedSpecialOperatorIndexes];
        for (const result of rawResults) if (result.valid && result.resourceConsumed) {
          const preview = previews.find((item) => item.slot.outerIndex === result.outerIndex);
          consumedSpecialOperatorIndexes.push(preview.innerIndex);
        }
        const queueCursors = [...state.queueCursors];
        for (const result of rawResults) if (result.valid && level.variant === "loader") {
          const preview = previews.find((item) => item.slot.outerIndex === result.outerIndex);
          queueCursors[preview.innerIndex] += 1;
        }
        return { ...state, outerValues: [...flow.values], targetVisualStates, queueCursors, consumedSpecialOperatorIndexes, impulses: state.impulses + 1, phaseCursor: modulo(phaseCursor + 1, level.slotPhases.length), lastImpulseResults, lastOperationResults, lastGameplayEvents, effectRuntime: flow.runtime, lastEffectEvents: flow.events, history: [...state.history, snapshot(state)], won: flow.values.every((value) => value === 0) };
      }
      serialize(state) {
        return JSON.stringify({ version: 2, ...snapshot(state) });
      }
      deserialize(level, raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1 && parsed.version !== 2) throw new Error("Unsupported puzzle save version");
        return restore(level, parsed, []);
      }
      isChainLocked(level, state, targetIndex) {
        return this.effectResolver.resolve(level.effectConfiguration, level.positions).effects.some((effect) => effect.config.scope === "LINK" /* LINK */ && effect.config.type === "CHAIN" /* CHAIN */ && effect.target.type === "LINK" /* LINK */ && effect.target.toGem.index === targetIndex && state.outerValues[effect.target.fromGem.index] !== 0);
      }
      assertLevel(level) {
        const range = DEFAULT_PUZZLE_NUMBER_RANGE;
        if (level.positions < 4 || level.outerValues.length !== level.positions || level.outerValues.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max) || level.slotPhases.length === 0 || level.slotPhases.some((phase) => phase.some((slot) => slot.outerIndex < 0 || slot.outerIndex >= level.positions)) || (level.variant === "persistent" ? level.innerValues.length !== level.positions : level.queues.length !== level.positions || level.queues.some((queue) => queue.some((operator) => operator === 0)))) throw new Error(`Invalid RDN level ${level.id}`);
      }
    };
  }
});

// src/app/core/game/phaser/catalogues/v004/rdn-release.config.ts
var RDN_RELEASE;
var init_rdn_release_config = __esm({
  "src/app/core/game/phaser/catalogues/v004/rdn-release.config.ts"() {
    "use strict";
    RDN_RELEASE = {
      telemetrySchemaVersion: 1,
      generatorVersion: "rdn-generator-v2",
      balanceVersion: "rdn-balance-v1",
      saveSchemaVersion: 2
    };
  }
});

// src/app/core/game/phaser/catalogues/v004/progression-rules.config.ts
var RDN_PROGRESSION_RULES, RDN_EFFECT_PROGRESSION_RULES, RDN_EFFECT_CHECKPOINTS, RDN_GEM_EFFECT_PRESETS, RDN_LINK_EFFECT_PRESETS, RDN_AREA_EFFECT_PRESETS, RDN_EFFECT_FLOW_RULES, RDN_SPECIAL_OPERATOR_CANDIDATES, RDN_EFFECT_SIMPLIFICATIONS, rdnEffectRuleForLevel, rdnProgressionRuleForSpheres, rdnSpecialOperatorsForBoard, rdnLinkCountForBoard, rdnMaximumLinksForSpheres, rdnMaximumGemEffectsForSpheres, rdnGemEffectCountForBoard;
var init_progression_rules_config = __esm({
  "src/app/core/game/phaser/catalogues/v004/progression-rules.config.ts"() {
    "use strict";
    init_effects_models();
    RDN_PROGRESSION_RULES = [
      {
        minSpheres: 4,
        minGemEffects: 1,
        // I checkpoint didattici possono mostrare due effetti, ma le fasce base
        // restano limitate a uno tramite il loro `maxGemEffects`.
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        fixedLinks: 0,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        // Nessun link generato a quattro sfere; uno resta disponibile per una lezione manuale.
        maxLinks: 1
      },
      {
        minSpheres: 5,
        minGemEffects: 2,
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        fixedLinks: 0,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 1
      },
      {
        minSpheres: 6,
        minGemEffects: 2,
        maxGemEffects: 3,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        fixedLinks: 1,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 2
      },
      {
        minSpheres: 7,
        minGemEffects: 3,
        maxGemEffects: 4,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        fixedLinks: 2,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 3
      },
      {
        minSpheres: 8,
        minGemEffects: 4,
        maxGemEffects: 5,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        fixedLinks: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        maxLinks: 4
      }
    ];
    RDN_EFFECT_PROGRESSION_RULES = [
      { id: "LEGACY", minLevel: 1, maxLevel: 9, maxGemEffects: 0, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 0, structureAttemptsBeforeScaling: 0 },
      { id: "SHIELD", minLevel: 10, maxLevel: 19, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "WALL", minLevel: 20, maxLevel: 29, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "MIRROR", minLevel: 30, maxLevel: 34, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "AMPLIFY", minLevel: 35, maxLevel: 39, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "INVERTER", minLevel: 40, maxLevel: 44, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "ICE", minLevel: 45, maxLevel: 49, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "TIMER", minLevel: 50, maxLevel: 59, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "CORRUPTION", minLevel: 60, maxLevel: 69, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "LINKS", minLevel: 70, maxLevel: 79, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "AREA", minLevel: 80, maxLevel: 100, maxGemEffects: 2, maxAreaEffects: 1, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 },
      { id: "STABLE", minLevel: 101, maxGemEffects: 5, maxAreaEffects: 1, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 12 }
    ];
    RDN_EFFECT_CHECKPOINTS = {
      15: { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      25: { enabled: true, effects: [{ preset: "WALL_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }] },
      35: { enabled: true, effects: [{ preset: "MIRROR_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }, { preset: "AMPLIFIER_X2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      45: { enabled: true, effects: [{ preset: "INVERTER_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "ICE_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }] },
      55: { enabled: true, effects: [{ preset: "TIMER_5", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "CORRUPTION_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }] },
      65: { enabled: true, effects: [{ preset: "TIMER_7", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "CORRUPTION_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }, { preset: "ECHO_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 0, toGemIndex: 2 }, overrides: { direction: "FORWARD" /* FORWARD */ } }] },
      75: { enabled: true, effects: [{ preset: "AMPLIFIER_X3", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "ICE_3", target: { type: "GEM" /* GEM */, gemIndex: 4 } }, { preset: "INVERT_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 1, toGemIndex: 3 }, overrides: { direction: "FORWARD" /* FORWARD */ } }, { preset: "BOMB_2", target: { type: "AREA" /* AREA */, sourceGemIndex: 2 } }] }
    };
    RDN_GEM_EFFECT_PRESETS = {
      LEGACY: [],
      SHIELD: ["SHIELD_1", "SHIELD_2", "SHIELD_3"],
      WALL: ["WALL_1"],
      MIRROR: ["MIRROR_1"],
      AMPLIFY: ["AMPLIFIER_X2", "AMPLIFIER_X3"],
      INVERTER: ["INVERTER_1"],
      ICE: ["ICE_1", "ICE_2", "ICE_3"],
      TIMER: ["TIMER_3", "TIMER_5", "TIMER_7", "TIMER_10"],
      CORRUPTION: ["CORRUPTION_1", "CORRUPTION_2"],
      LINKS: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "CORRUPTION_1"],
      AREA: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "CORRUPTION_1"],
      STABLE: [
        "SHIELD_1",
        "SHIELD_2",
        "SHIELD_3",
        "WALL_1",
        "WALL_2",
        "WALL_3",
        "WALL_4",
        "MIRROR_1",
        "AMPLIFIER_X2",
        "AMPLIFIER_X3",
        "INVERTER_1",
        "ICE_1",
        "ICE_2",
        "ICE_3",
        "TIMER_3",
        "TIMER_5",
        "TIMER_7",
        "TIMER_10",
        "CORRUPTION_1",
        "CORRUPTION_2"
      ]
    };
    RDN_LINK_EFFECT_PRESETS = ["ECHO_LINK", "DOUBLE_LINK", "INVERT_LINK"];
    RDN_AREA_EFFECT_PRESETS = ["AREA_BOMB_MINUS_2", "AREA_BOMB_PLUS_2", "AREA_BOMB_MINUS_4", "AREA_BOMB_PLUS_4", "AREA_BOMB_MINUS_7", "AREA_BOMB_PLUS_7", "AREA_ICE_ADJACENT", "AREA_ICE_TWO_ADJACENT", "AREA_ICE_ALL", "AREA_INVERTER_ADJACENT", "AREA_INVERTER_TWO_ADJACENT", "AREA_INVERTER_ALL"];
    RDN_EFFECT_FLOW_RULES = { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: "SUM" /* SUM */ };
    RDN_SPECIAL_OPERATOR_CANDIDATES = ["zero", "invert", "divide2", "skip", "divide3"];
    RDN_EFFECT_SIMPLIFICATIONS = {
      SHIELD_3: "SHIELD_2",
      SHIELD_2: "SHIELD_1",
      WALL_4: "WALL_3",
      WALL_3: "WALL_2",
      WALL_2: "WALL_1",
      AMPLIFIER_X3: "AMPLIFIER_X2",
      ICE_3: "ICE_2",
      ICE_2: "ICE_1",
      TIMER_3: "TIMER_5",
      TIMER_5: "TIMER_7",
      TIMER_7: "TIMER_10",
      CORRUPTION_2: "CORRUPTION_1",
      DOUBLE_LINK: "ECHO_LINK",
      INVERT_LINK: "ECHO_LINK",
      BOMB_2: "BOMB_1"
    };
    rdnEffectRuleForLevel = (level) => RDN_EFFECT_PROGRESSION_RULES.find((rule) => level >= rule.minLevel && (rule.maxLevel === void 0 || level <= rule.maxLevel)) ?? RDN_EFFECT_PROGRESSION_RULES[0];
    rdnProgressionRuleForSpheres = (spheres) => RDN_PROGRESSION_RULES.reduce((active, rule) => spheres >= rule.minSpheres ? rule : active, RDN_PROGRESSION_RULES[0]);
    rdnSpecialOperatorsForBoard = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres(spheres);
      const key = Math.floor(level + variation);
      const optional = rule.optionalSpecialEvery > 0 && key % rule.optionalSpecialEvery === 0 ? rule.optionalSpecials : 0;
      const count = Math.min(2, rule.guaranteedSpecials + optional);
      const start = (key % RDN_SPECIAL_OPERATOR_CANDIDATES.length + RDN_SPECIAL_OPERATOR_CANDIDATES.length) % RDN_SPECIAL_OPERATOR_CANDIDATES.length;
      return Array.from({ length: count }, (_, index) => RDN_SPECIAL_OPERATOR_CANDIDATES[(start + index) % RDN_SPECIAL_OPERATOR_CANDIDATES.length]);
    };
    rdnLinkCountForBoard = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres(spheres);
      const optional = rule.optionalLinkEvery > 0 && Math.floor(level + variation) % rule.optionalLinkEvery === 0 ? rule.optionalLinks : 0;
      return Math.min(rule.maxLinks, rule.fixedLinks + optional);
    };
    rdnMaximumLinksForSpheres = (spheres) => rdnProgressionRuleForSpheres(spheres).maxLinks;
    rdnMaximumGemEffectsForSpheres = (spheres) => rdnProgressionRuleForSpheres(spheres).maxGemEffects;
    rdnGemEffectCountForBoard = (key, spheres) => {
      const rule = rdnProgressionRuleForSpheres(spheres);
      const range = rule.maxGemEffects - rule.minGemEffects + 1;
      return rule.minGemEffects + (range > 0 ? Math.abs(Math.floor(key)) % range : 0);
    };
  }
});

// src/app/core/game/phaser/catalogues/v004/effect-progression.config.ts
var positiveModulo, pick, resolveEffectProgressionTier, shouldUseProgressionEffects, explicitEffectConfigurationForLevel, createProgressionEffectConfiguration, createFreeModeEffectConfiguration, validateEffectComplexity;
var init_effect_progression_config = __esm({
  "src/app/core/game/phaser/catalogues/v004/effect-progression.config.ts"() {
    "use strict";
    init_effects_models();
    init_progression_rules_config();
    positiveModulo = (value, length) => (value % length + length) % length;
    pick = (items, seed) => items[positiveModulo(seed, items.length)];
    resolveEffectProgressionTier = rdnEffectRuleForLevel;
    shouldUseProgressionEffects = (level) => level >= 10;
    explicitEffectConfigurationForLevel = (level) => RDN_EFFECT_CHECKPOINTS[level];
    createProgressionEffectConfiguration = (mode, level, gemCount, seed = 0) => {
      if (gemCount < 4 || !shouldUseProgressionEffects(level)) return void 0;
      const tier = resolveEffectProgressionTier(level);
      const key = level * 37 + gemCount * 11 + seed + (mode === "time-attack" ? 7 : mode === "free" ? 13 : 0);
      const first = positiveModulo(key, gemCount);
      const second = positiveModulo(first + 2, gemCount);
      const source = positiveModulo(first + 1, gemCount);
      const destination = positiveModulo(source + 1, gemCount);
      const effects = [];
      const gemPresets = RDN_GEM_EFFECT_PRESETS[tier.id];
      const gemEffectCount = tier.id === "LEGACY" ? 0 : Math.min(tier.maxGemEffects, rdnGemEffectCountForBoard(key, gemCount));
      for (let index = 0; index < gemEffectCount; index += 1) {
        effects.push({ preset: pick(gemPresets, key + index), target: { type: "GEM" /* GEM */, gemIndex: positiveModulo(first + index, gemCount) } });
      }
      const linkCount = rdnLinkCountForBoard(level, gemCount, mode === "free" ? seed : 0);
      for (let index = 0; index < linkCount; index += 1) {
        const fromGemIndex = positiveModulo(source + index, gemCount);
        const toGemIndex = positiveModulo(destination + index * 2, gemCount);
        effects.push({ preset: pick(RDN_LINK_EFFECT_PRESETS, key + 2 + index), target: { type: "LINK" /* LINK */, fromGemIndex, toGemIndex: toGemIndex === fromGemIndex ? positiveModulo(toGemIndex + 1, gemCount) : toGemIndex }, overrides: { direction: level >= 100 && (key + index) % 2 === 0 ? "BIDIRECTIONAL" /* BIDIRECTIONAL */ : "FORWARD" /* FORWARD */ } });
      }
      if (tier.maxAreaEffects > 0) effects.push({ preset: pick(RDN_AREA_EFFECT_PRESETS, key + 5), target: { type: "AREA" /* AREA */, sourceGemIndex: second } });
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES } : void 0;
    };
    createFreeModeEffectConfiguration = (difficulty, gemCount, seed = 0, selections = false) => {
      const enabled = typeof selections === "boolean" ? { gem: selections, link: selections, area: selections } : selections;
      if (!enabled.gem && !enabled.link && !enabled.area) return void 0;
      const progressionLevel = difficulty === "EASY" ? 20 : difficulty === "NORMAL" ? 40 : difficulty === "HARD" ? 60 : 81;
      const effects = [
        ...enabled.gem ? createProgressionEffectConfiguration("free", progressionLevel, gemCount, seed)?.effects?.filter((effect) => effect.target.type === "GEM" /* GEM */) ?? [] : [],
        ...enabled.link ? createProgressionEffectConfiguration("free", Math.max(progressionLevel, 72), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "LINK" /* LINK */) ?? [] : [],
        ...enabled.area ? createProgressionEffectConfiguration("free", Math.max(progressionLevel, 80), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "AREA" /* AREA */) ?? [] : []
      ];
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES } : void 0;
    };
    validateEffectComplexity = (configuration, label, spheres = 8) => {
      if (!configuration?.enabled) return [];
      const effects = configuration.effects ?? [];
      const gem = effects.filter((effect) => effect.target.type === "GEM" /* GEM */).length;
      const link = effects.filter((effect) => effect.target.type === "LINK" /* LINK */).length;
      const area = effects.filter((effect) => effect.target.type === "AREA" /* AREA */).length;
      const issues = [];
      const maximumGemEffects = rdnMaximumGemEffectsForSpheres(spheres);
      if (gem > maximumGemEffects) issues.push(`${label}: GEM effect count = ${gem}, maximum allowed = ${maximumGemEffects}.`);
      const maximumLinks = rdnMaximumLinksForSpheres(spheres);
      if (link > maximumLinks) issues.push(`${label}: LINK effect count = ${link}, maximum allowed = ${maximumLinks}.`);
      if (area > 1) issues.push(`${label}: AREA effect count = ${area}, maximum allowed = 1.`);
      return issues;
    };
  }
});

// src/app/core/game/phaser/catalogues/v004/levels.config.ts
var RDN_MAX_LEVEL, RDN_MIN_SPHERES, RDN_MAX_SPHERES, RDN_MAX_TIMER_DIRECT_IMPULSES, RDN_LEVELS_PER_SPHERE_INCREMENT, rdnSphereCountForLevel;
var init_levels_config = __esm({
  "src/app/core/game/phaser/catalogues/v004/levels.config.ts"() {
    "use strict";
    RDN_MAX_LEVEL = 350;
    RDN_MIN_SPHERES = 4;
    RDN_MAX_SPHERES = 8;
    RDN_MAX_TIMER_DIRECT_IMPULSES = 10;
    RDN_LEVELS_PER_SPHERE_INCREMENT = Math.ceil(RDN_MAX_LEVEL / (RDN_MAX_SPHERES - RDN_MIN_SPHERES + 1));
    rdnSphereCountForLevel = (number) => {
      const band = Math.min(RDN_MAX_SPHERES - RDN_MIN_SPHERES, Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT));
      return RDN_MIN_SPHERES + band;
    };
  }
});

// src/app/core/game/phaser/catalogues/v004/catalog.builder.ts
var catalog_builder_exports = {};
__export(catalog_builder_exports, {
  RDN_LEVELS: () => RDN_LEVELS,
  RDN_SOLUTION_TABLE: () => RDN_SOLUTION_TABLE,
  generateRdnPuzzle: () => generateRdnPuzzle,
  getRdnLevel: () => getRdnLevel,
  getRdnSolutionTable: () => getRdnSolutionTable,
  prepareRdnCatalogueLevel: () => prepareRdnCatalogueLevel,
  validateAdventureLevelBatch: () => validateAdventureLevelBatch
});
var DEFAULT_ACTIVE_FLOW_COUNT, freeActiveFlowCount, modulo2, random, impulsesPerValue, rotationDistance, specialOperatorsForLevel, gearOperators, additiveOperators, balancedPlanSigns, subtractivePlan, planForValue, generateBoard, tutorialBoard, generatedMetadata, adventureConfig, replaySolutionWithTrace, replaySolution, effectStarAllowance, withCalibratedTimerDeadlines, timerDeadlineFailed, lastIndexFor, effectConfigurationStages, timerPlacementIsCompatible, buildEffectCandidate, needsSignedValueCalibration, recalculatedOuterValues, regenerateEffectAwareLevel, applyProgressionEffects, effectAwareVariant, persistent, loader, generateRdnLevelCatalogue, catalogueGenerationRequested, useGeneratedCatalogue, removeDuplicateSignedGearValues, upgradeLegacyTutorial, prepareRdnCatalogueLevel, RDN_LEVELS, getRdnLevel, generateRdnPuzzle, applySolutionOperator, verifiesSolution, RDN_SOLUTION_TABLE, getRdnSolutionTable, validateAdventureLevelBatch;
var init_catalog_builder = __esm({
  "src/app/core/game/phaser/catalogues/v004/catalog.builder.ts"() {
    "use strict";
    init_puzzle_types();
    init_puzzle_engine();
    init_level_effect_config_resolver();
    init_effects_models();
    init_rdn_release_config();
    init_effect_progression_config();
    init_progression_rules_config();
    init_levels_config();
    DEFAULT_ACTIVE_FLOW_COUNT = 1;
    freeActiveFlowCount = (difficulty) => difficulty === "EASY" ? 1 : difficulty === "NORMAL" ? 2 : difficulty === "HARD" ? 3 : 4;
    modulo2 = (value, length) => (value % length + length) % length;
    random = (seed) => {
      let state = seed >>> 0;
      return () => {
        state = state * 1664525 + 1013904223 >>> 0;
        return state / 4294967296;
      };
    };
    impulsesPerValue = (number) => number <= 3 ? 1 : Math.min(11, 2 + Math.floor((number - 4) / 20));
    rotationDistance = (from, to, positions) => Math.min(modulo2(to - from, positions), modulo2(from - to, positions));
    specialOperatorsForLevel = (level, positions, variation = 0) => {
      return [...rdnSpecialOperatorsForBoard(level, positions, variation)];
    };
    gearOperators = (positions, specialOperators, next, allowDuplicateSignedValues = false) => {
      const subtractorCount = positions - specialOperators.length;
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const magnitudes = Array.from({ length: subtractorCount }, (_, index) => {
        const used = index % 2 === 0 ? usedNegative : usedPositive;
        let value = 1 + Math.floor(next() * 9);
        if (!allowDuplicateSignedValues) while (used.has(value)) value = value % 9 + 1;
        used.add(value);
        return value;
      });
      return [...magnitudes.map((value, index) => index % 2 === 0 ? -value : value), ...specialOperators];
    };
    additiveOperators = (operators) => operators.filter((operator) => typeof operator === "number" && operator !== 0);
    balancedPlanSigns = (plans) => {
      const counts = plans.map((plan) => plan.operators.filter((operator) => typeof operator === "number").length);
      const total = counts.reduce((sum, count) => sum + count, 0);
      const reachable = Array(total + 1).fill(void 0);
      reachable[0] = [];
      counts.forEach((count, index) => {
        for (let sum = total - count; sum >= 0; sum -= 1) if (reachable[sum] && !reachable[sum + count]) reachable[sum + count] = [...reachable[sum], index];
      });
      let selectedSum = 0;
      for (let sum = 0; sum <= total; sum += 1) if (reachable[sum] && Math.abs(total - sum * 2) < Math.abs(total - selectedSum * 2)) selectedSum = sum;
      const positivePlans = new Set(reachable[selectedSum]);
      return plans.map((_, index) => positivePlans.has(index));
    };
    subtractivePlan = (count, available, next, maximumStart = 20) => {
      if (!available.length) throw new Error("RDN generator requires at least one compatible numeric operator");
      const minimumMagnitude = Math.min(...available.map((value) => Math.abs(value)));
      const safeCount = Math.max(1, Math.min(count, Math.floor(maximumStart / minimumMagnitude)));
      const values = [];
      let total = 0;
      for (let index = 0; index < safeCount; index += 1) {
        const remaining = safeCount - index - 1;
        const candidates = available.filter((value) => total + Math.abs(value) + remaining * minimumMagnitude <= maximumStart);
        const selected = candidates[Math.floor(next() * candidates.length)] ?? available[0];
        values.push(selected);
        total += Math.abs(selected);
      }
      return { start: total * (values[0] < 0 ? 1 : -1), operators: values };
    };
    planForValue = (impulses, available, next, maximumStart, forcedOperator) => {
      if (forcedOperator === "divide2" || forcedOperator === "divide3") {
        const divisor = forcedOperator === "divide2" ? 2 : 3;
        const tail = subtractivePlan(impulses - 1, available, next, Math.floor(maximumStart / divisor));
        return { start: tail.start * divisor, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "zero") {
        const magnitude = 1 + Math.floor(next() * Math.max(1, maximumStart));
        return { start: next() < 0.5 ? -magnitude : magnitude, operators: [forcedOperator] };
      }
      if (forcedOperator === "invert") {
        const tail = subtractivePlan(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: -tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "skip") {
        const tail = subtractivePlan(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      return subtractivePlan(impulses, available, next, maximumStart);
    };
    generateBoard = (number, seedOffset, slotCount, balanceQueueSigns = false, allowDuplicateSignedGearValues = false) => {
      const positions = slotCount && slotCount >= RDN_MIN_SPHERES && slotCount <= RDN_MAX_SPHERES ? slotCount : rdnSphereCountForLevel(number);
      const impulses = impulsesPerValue(number);
      const seed = number * 977 + seedOffset;
      const next = random(seed);
      const specialOperators = specialOperatorsForLevel(number, positions, seedOffset);
      const innerValues = gearOperators(positions, specialOperators, next, allowDuplicateSignedGearValues);
      const allAdditives = additiveOperators(innerValues);
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const maximumStart = Math.min(Math.abs(range.min), Math.abs(range.max));
      const planForIndex = (index, positive) => planForValue(impulses, allAdditives.filter((operator) => positive ? operator > 0 : operator < 0), next, maximumStart, specialOperators[index]);
      const provisionalPlans = Array.from({ length: positions }, (_, index) => planForIndex(index, index % 2 !== 0));
      const planSigns = balanceQueueSigns ? balancedPlanSigns(provisionalPlans) : provisionalPlans.map((_, index) => index % 2 !== 0);
      const plans = balanceQueueSigns ? Array.from({ length: positions }, (_, index) => planForIndex(index, planSigns[index])) : provisionalPlans;
      const loaderQueues = Array.from({ length: positions }, () => []);
      const cursors = Array(positions).fill(0);
      const rotations = [];
      const slotPhases = [];
      const solutionMoves = [];
      while (cursors.some((cursor, outerIndex) => cursor < plans[outerIndex].operators.length)) {
        const candidates = plans.map((plan, outerIndex2) => cursors[outerIndex2] < plan.operators.length ? outerIndex2 : -1).filter((outerIndex2) => outerIndex2 >= 0);
        const outerIndex = candidates[Math.floor(next() * candidates.length)];
        const operator = plans[outerIndex].operators[cursors[outerIndex]];
        const innerIndex = innerValues.findIndex((value) => value === operator);
        loaderQueues[innerIndex].push(operator);
        const rotation = modulo2(outerIndex - innerIndex, positions);
        rotations.push(rotation);
        slotPhases.push([{ outerIndex }]);
        solutionMoves.push({ outerIndex, rotation, operator });
        cursors[outerIndex] += 1;
      }
      const initialRotation = modulo2(rotations[0] + 1 + Math.floor(next() * Math.max(1, positions - 1)), positions);
      let previousRotation = initialRotation;
      let rotationSteps = 0;
      for (const rotation of rotations) {
        rotationSteps += rotationDistance(previousRotation, rotation, positions);
        previousRotation = rotation;
      }
      return { positions, initialRotation, innerValues, loaderQueues, outerValues: plans.map((plan) => plan.start), slotPhases, optimalCost: { impulses: slotPhases.length, rotationSteps }, solution: plans.map((plan) => ({ startValue: plan.start, operators: [...plan.operators] })), solutionMoves, seed };
    };
    tutorialBoard = () => {
      const operators = [-1, -2, -3, -4];
      const values = operators.map((operator) => -operator);
      return { positions: 4, initialRotation: 0, innerValues: [...operators], loaderQueues: operators.map((operator) => [operator]), outerValues: values, slotPhases: [[{ outerIndex: 0 }], [{ outerIndex: 1 }], [{ outerIndex: 2 }], [{ outerIndex: 3 }]], optimalCost: { impulses: 4, rotationSteps: 0 }, solution: operators.map((operator, index) => ({ startValue: values[index], operators: [operator] })), solutionMoves: operators.map((operator, outerIndex) => ({ outerIndex, rotation: 0, operator })), seed: 0 };
    };
    generatedMetadata = (number, board, difficulty = "EASY", activeFlowCount = DEFAULT_ACTIVE_FLOW_COUNT) => ({ seed: board.seed, generatorVersion: RDN_RELEASE.generatorVersion, balanceVersion: RDN_RELEASE.balanceVersion, difficulty, estimatedMinimumSolutionLength: board.optimalCost.impulses, branchingFactor: activeFlowCount, featureFlags: [] });
    adventureConfig = (number, board) => ({
      version: 1,
      seed: board.seed,
      levelVersion: "rdn-adventure-v1",
      objectives: { targetValues: [...board.outerValues], requireAllTargetsZero: true },
      enabledMechanics: ["fixed-operators", "special-inventory", "rotation", "impulse"],
      specialInventory: {
        divide2: board.innerValues.filter((operator) => operator === "divide2").length,
        divide3: board.innerValues.filter((operator) => operator === "divide3").length,
        zero: board.innerValues.filter((operator) => operator === "zero").length,
        invert: board.innerValues.filter((operator) => operator === "invert").length,
        skip: board.innerValues.filter((operator) => operator === "skip").length
      }
    });
    replaySolutionWithTrace = (level) => {
      const engine = new PuzzleEngine();
      let state = engine.createInitialState(level);
      const execution = [];
      for (const move of level.solutionMoves ?? []) {
        const delta = modulo2(move.rotation - state.rotation, level.positions);
        if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
        const plan = engine.planImpulse(level, state);
        const linkedTargets = new Set(plan.impacts.filter((impact) => impact.linkId).map((impact) => impact.targetId));
        const changedTargets = new Set(plan.impacts.map((impact) => impact.targetId));
        execution.push({
          move,
          updates: [...changedTargets].map((outerIndex) => ({ outerIndex, value: plan.finalValues[outerIndex], viaLink: linkedTargets.has(outerIndex) }))
        });
        state = engine.apply(level, state, { type: "IMPULSE" });
      }
      return { state, execution };
    };
    replaySolution = (level) => replaySolutionWithTrace(level).state;
    effectStarAllowance = (configuration, positions) => {
      const effects = new LevelEffectConfigResolver().resolve(configuration, positions).effects;
      return effects.reduce((total, effect) => {
        if (effect.config.scope === "GEM" /* GEM */) {
          const config = effect.config;
          const weight = config.type === "SHIELD" /* SHIELD */ || config.type === "WALL" /* WALL */ || config.type === "ICE" /* ICE */ ? config.strength : config.type === "AMPLIFIER" /* AMPLIFIER */ ? Math.max(1, config.multiplier - 1) : config.type === "TIMER" /* TIMER */ || config.type === "CORRUPTION" /* CORRUPTION */ ? 2 : 1;
          return total + weight;
        }
        if (effect.config.scope === "LINK" /* LINK */) return total + (effect.config.type === "AMPLIFY" /* AMPLIFY */ ? 2 : 1);
        return total + Math.max(2, Math.abs(effect.config.strength ?? 1) * (effect.config.radius ?? 1));
      }, 0);
    };
    withCalibratedTimerDeadlines = (level, configuration) => {
      if (!configuration.effects?.length || configuration.sets?.length) return configuration;
      const effects = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects;
      const deadlines = /* @__PURE__ */ new Map();
      effects.forEach((effect, index) => {
        if (effect.config.type !== "TIMER" /* TIMER */) return;
        const target = effect.target;
        if (target.type !== "GEM" /* GEM */) return;
        const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === target.gem.index).length;
        if (directImpulses > RDN_MAX_TIMER_DIRECT_IMPULSES) return;
        deadlines.set(index, Math.max(effect.config.turns, directImpulses));
      });
      return {
        ...configuration,
        effects: configuration.effects.map((assignment, index) => {
          const deadline = deadlines.get(index);
          return deadline === void 0 ? assignment : { ...assignment, overrides: { ...assignment.overrides, turns: deadline } };
        })
      };
    };
    timerDeadlineFailed = (state) => (state.effectRuntime?.expiredTimerIds.length ?? 0) > 0;
    lastIndexFor = (effects, scope) => {
      for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index].target.type === scope) return index;
      return -1;
    };
    effectConfigurationStages = (configuration, spheres) => {
      const effects = [...configuration.effects ?? []];
      const optional = [];
      let reduced = effects.filter((effect) => effect.target.type !== "AREA" /* AREA */);
      optional.push({ ...configuration, effects: reduced });
      const fixedLinks = rdnProgressionRuleForSpheres(spheres).fixedLinks;
      while (reduced.filter((effect) => effect.target.type === "LINK" /* LINK */).length > fixedLinks) {
        reduced = reduced.filter((_, index) => index !== lastIndexFor(reduced, "LINK" /* LINK */));
        optional.push({ ...configuration, effects: reduced });
      }
      const scaled = [];
      let scaledEffects = [...reduced];
      while (true) {
        const index = scaledEffects.findIndex((effect) => RDN_EFFECT_SIMPLIFICATIONS[effect.preset] !== void 0);
        if (index < 0) break;
        const preset = RDN_EFFECT_SIMPLIFICATIONS[scaledEffects[index].preset];
        if (!preset) break;
        scaledEffects = scaledEffects.map((effect, effectIndex) => effectIndex === index ? { ...effect, preset, overrides: void 0 } : effect);
        scaled.push({ ...configuration, effects: scaledEffects });
      }
      const minimumGems = rdnProgressionRuleForSpheres(spheres).minGemEffects;
      let minimum = scaledEffects.filter((effect) => effect.target.type !== "AREA" /* AREA */ && effect.target.type !== "LINK" /* LINK */);
      while (minimum.filter((effect) => effect.target.type === "GEM" /* GEM */).length > minimumGems) minimum = minimum.filter((_, index) => index !== lastIndexFor(minimum, "GEM" /* GEM */));
      const finalPresets = RDN_GEM_EFFECT_PRESETS.STABLE;
      const final = finalPresets.map((preset) => ({ ...configuration, effects: minimum.map((effect) => effect.target.type === "GEM" /* GEM */ ? { ...effect, preset, overrides: void 0 } : effect) }));
      return [[configuration], optional, scaled, final];
    };
    timerPlacementIsCompatible = (level, configuration) => (configuration.effects ?? []).every((effect) => {
      if (!effect.preset.startsWith("TIMER_") || effect.target.type !== "GEM" /* GEM */) return true;
      const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === effect.target.gemIndex).length;
      return directImpulses <= RDN_MAX_TIMER_DIRECT_IMPULSES;
    });
    buildEffectCandidate = (level, outerValues, effectConfiguration) => ({ ...level, outerValues: [...outerValues], solution: level.solution?.map((slot, index) => ({ ...slot, startValue: outerValues[index] })), effectConfiguration });
    needsSignedValueCalibration = (configuration) => (configuration.effects ?? []).some((effect) => effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1" || effect.preset === "CORRUPTION_1" || effect.preset === "CORRUPTION_2");
    recalculatedOuterValues = (candidate, result, range, useSignedCalibration) => {
      const recalculated = candidate.outerValues.map((value, index) => {
        if (!useSignedCalibration) return value - result.outerValues[index];
        const probeStep = value < range.max && value !== -1 ? 1 : value > range.min && value !== 1 ? -1 : 0;
        if (probeStep === 0) return value - result.outerValues[index];
        const probeValues = [...candidate.outerValues];
        probeValues[index] += probeStep;
        const probeResult = replaySolution(buildEffectCandidate(candidate, probeValues, candidate.effectConfiguration));
        const slope = (probeResult.outerValues[index] - result.outerValues[index]) / probeStep;
        const correction = slope === 0 ? -result.outerValues[index] : -result.outerValues[index] / slope;
        return value + correction;
      });
      return recalculated.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max) ? void 0 : recalculated;
    };
    regenerateEffectAwareLevel = (level, configuration) => {
      if (!configuration) return level;
      const startedAt = performance.now();
      let calibrationAttempts = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const withStats = (candidate, solved) => ({ ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: 1, calibrationAttempts, totalComplexity: (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0) + (candidate.effectConfiguration?.effects?.length ?? 0) * 10, failureReasons: solved ? [...failureReasons] : [...failureReasons, "NO_VALID_EFFECT_CONFIGURATION"] } } : candidate.generation });
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const attemptsBeforeScaling = Math.max(1, rdnEffectRuleForLevel(level.number).solutionAttemptsBeforeScaling);
      if (!timerPlacementIsCompatible(level, configuration)) {
        failureReasons.add("TIMER_TARGET_TOO_MANY_DIRECT_IMPULSES");
        return withStats(level, false);
      }
      {
        const candidateConfiguration = withCalibratedTimerDeadlines(level, configuration);
        if (!candidateConfiguration) {
          failureReasons.add("TIMER_DEADLINE_CALIBRATION_FAILED");
          return withStats(level, false);
        }
        const issues = validateEffectComplexity(candidateConfiguration, `${level.variant} level ${level.number}`, level.positions);
        if (issues.length) {
          failureReasons.add("COMPLEXITY_INVALID");
          throw new Error(issues.join(" "));
        }
        let outerValues = [...level.outerValues];
        const useSignedCalibration = needsSignedValueCalibration(candidateConfiguration);
        for (let attempt = 0; attempt < attemptsBeforeScaling; attempt += 1) {
          calibrationAttempts += 1;
          const candidate = buildEffectCandidate(level, outerValues, candidateConfiguration);
          const result = replaySolution(candidate);
          if (result.won && !timerDeadlineFailed(result)) {
            const allowance = effectStarAllowance(candidateConfiguration, candidate.positions);
            const canonicalImpulses = result.impulses;
            const canonicalRotations = result.rotationSteps;
            return withStats({ ...candidate, starCost: { impulses: canonicalImpulses + allowance, rotationSteps: canonicalRotations + Math.ceil(allowance / 2) } }, true);
          }
          failureReasons.add(timerDeadlineFailed(result) ? "TIMER_EXPIRED" : "REPLAY_NOT_WON");
          const recalculated = recalculatedOuterValues(candidate, result, range, useSignedCalibration);
          if (!recalculated) {
            failureReasons.add("VALUES_OUT_OF_RANGE_OR_NON_INTEGER");
            break;
          }
          if (recalculated.every((value, index) => value === outerValues[index])) {
            failureReasons.add("VALUES_NO_LONGER_CHANGE");
            break;
          }
          outerValues = recalculated;
        }
      }
      return withStats(level, false);
    };
    applyProgressionEffects = (mode, level, configuration) => regenerateEffectAwareLevel(level, configuration ?? explicitEffectConfigurationForLevel(level.number) ?? createProgressionEffectConfiguration(mode, level.number, level.positions, level.generation?.seed ?? level.number));
    effectAwareVariant = (number, mode, build) => {
      const startedAt = performance.now();
      const attempts = Math.max(1, rdnEffectRuleForLevel(number).structureAttemptsBeforeScaling);
      const first = build(0);
      const requestedConfiguration = explicitEffectConfigurationForLevel(number) ?? createProgressionEffectConfiguration(mode, number, first.positions, number);
      let last = first;
      let totalCalibrations = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const stages = requestedConfiguration?.enabled ? effectConfigurationStages(requestedConfiguration, first.positions) : [[]];
      for (const stage of stages) {
        for (const configuration of stage) {
          for (let variation = 0; variation < attempts; variation += 1) {
            const candidate = applyProgressionEffects(mode, variation === 0 ? first : build(variation), configuration);
            last = candidate;
            const stats2 = candidate.generation?.generationStats;
            totalCalibrations += stats2?.calibrationAttempts ?? 0;
            (stats2?.failureReasons ?? []).forEach((reason) => failureReasons.add(reason));
            if (number < 10 || candidate.effectConfiguration?.enabled) {
              return { ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: variation + 1, calibrationAttempts: totalCalibrations, totalComplexity: stats2?.totalComplexity ?? (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons] } } : candidate.generation };
            }
          }
        }
      }
      if (number >= 10 && requestedConfiguration?.enabled) throw new Error(`RDN ${mode} level ${number}: no valid effect-aware structure after ${attempts} seeds.`);
      const stats = last.generation?.generationStats;
      return { ...last, generation: last.generation ? { ...last.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: attempts, calibrationAttempts: totalCalibrations || stats?.calibrationAttempts || 0, totalComplexity: stats?.totalComplexity ?? (last.optimalCost?.impulses ?? 0) + (last.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons, "ALTERNATE_STRUCTURE_ATTEMPTS_EXHAUSTED"] } } : last.generation };
    };
    persistent = (number) => {
      return effectAwareVariant(number, "adventure", (variation) => {
        const board = number === 1 ? tutorialBoard() : generateBoard(number, 17 + variation * 101);
        return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT, generation: generatedMetadata(number, board), adventure: adventureConfig(number, board), ...board };
      });
    };
    loader = (number) => {
      return effectAwareVariant(number, "time-attack", (variation) => {
        const board = number === 1 ? tutorialBoard() : generateBoard(number, 71 + variation * 101);
        return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT, generation: generatedMetadata(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      });
    };
    generateRdnLevelCatalogue = () => {
      const startedAt = performance.now();
      const total = RDN_MAX_LEVEL * 2;
      const levels2 = [];
      let completed = 0;
      let nextProgressLog = 5;
      const reportProgress = () => {
        const percentage = Math.floor(completed / total * 100);
        while (percentage >= nextProgressLog) {
          console.info(`[RDN] Generazione livelli: ${nextProgressLog}% (${completed}/${total})`);
          nextProgressLog += 5;
        }
      };
      console.info(`[RDN] Generazione livelli: 0% (0/${total})`);
      for (let number = 1; number <= RDN_MAX_LEVEL; number += 1) {
        levels2.push(persistent(number));
        completed += 1;
        reportProgress();
      }
      for (let number = 1; number <= RDN_MAX_LEVEL; number += 1) {
        levels2.push(loader(number));
        completed += 1;
        reportProgress();
      }
      console.info(`[RDN] Generazione completata: ${levels2.length} livelli in ${(performance.now() - startedAt).toFixed(1)} ms.`);
      return levels2;
    };
    catalogueGenerationRequested = globalThis.process?.env?.["RDN_GENERATE_CATALOGUE"] === "1";
    useGeneratedCatalogue = catalogueGenerationRequested;
    removeDuplicateSignedGearValues = (level) => {
      if (level.variant !== "persistent") return level;
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const innerValues = level.innerValues.map((operator) => {
        if (typeof operator !== "number") return operator;
        const used = operator < 0 ? usedNegative : usedPositive;
        const sign = operator < 0 ? -1 : 1;
        let magnitude = Math.abs(operator);
        while (used.has(magnitude)) magnitude = magnitude % 9 + 1;
        used.add(magnitude);
        return sign * magnitude;
      });
      return innerValues.every((value, index) => value === level.innerValues[index]) ? level : { ...level, innerValues };
    };
    upgradeLegacyTutorial = (level) => {
      if (level.number !== 1) return level;
      const board = tutorialBoard();
      return level.variant === "persistent" ? { ...level, ...board, innerValues: board.innerValues } : { ...level, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
    };
    prepareRdnCatalogueLevel = (level) => removeDuplicateSignedGearValues(upgradeLegacyTutorial(level));
    RDN_LEVELS = useGeneratedCatalogue ? generateRdnLevelCatalogue().map(prepareRdnCatalogueLevel) : [];
    getRdnLevel = (variant, number = 1) => {
      const level = RDN_LEVELS.find((item) => item.variant === (variant === "adventure" ? "persistent" : "loader") && item.number === number);
      if (!level) throw new Error("Il catalogo RDN non \xC3\xA8 caricato. Usa RdnCatalogueService.");
      return level;
    };
    generateRdnPuzzle = (variant, difficulty, seed, slotCount, freeEffectsEnabled = false) => {
      const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
      const board = generateBoard(number, Math.trunc(seed), slotCount, true, true);
      const activeFlowCount = freeActiveFlowCount(difficulty);
      const generation = { ...generatedMetadata(number, board, difficulty, activeFlowCount), seed: board.seed, difficulty };
      const level = variant === "adventure" ? { id: `seeded-persistent-${generation.seed}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount, generation, adventure: adventureConfig(number, board), ...board } : { id: `seeded-loader-${generation.seed}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount, generation, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      return regenerateEffectAwareLevel(level, createFreeModeEffectConfiguration(difficulty, level.positions, generation.seed, freeEffectsEnabled));
    };
    applySolutionOperator = (value, operator) => operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator;
    verifiesSolution = (level) => {
      if (level.effectConfiguration?.enabled) {
        const state = replaySolution(level);
        return state.won && !timerDeadlineFailed(state);
      }
      const solution = level.solution ?? [];
      const moves = level.solutionMoves ?? [];
      const requiredMoves = level.slotPhases.reduce((total, phase) => total + phase.length, 0);
      if (solution.length !== level.positions || moves.length !== requiredMoves) return false;
      const values = solution.map((slot) => slot.startValue);
      const cursors = Array(level.positions).fill(0);
      const queueCursors = Array(level.positions).fill(0);
      for (const move of moves) {
        const innerIndex = modulo2(move.outerIndex - move.rotation, level.positions);
        const operator = level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][queueCursors[innerIndex]++];
        if (operator !== move.operator || solution[move.outerIndex].operators[cursors[move.outerIndex]] !== move.operator) return false;
        values[move.outerIndex] = applySolutionOperator(values[move.outerIndex], move.operator);
        cursors[move.outerIndex] += 1;
      }
      return values.every((value) => value === 0) && cursors.every((cursor, index) => cursor === solution[index].operators.length);
    };
    RDN_SOLUTION_TABLE = RDN_LEVELS.map((level) => {
      const effectResolution = new LevelEffectConfigResolver().resolve(level.effectConfiguration, level.positions);
      const simulation = replaySolutionWithTrace(level);
      return { level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], execution: simulation.execution, effects: effectResolution.effects, finalValues: simulation.state.outerValues, verified: effectResolution.issues.length === 0 && simulation.state.won && !timerDeadlineFailed(simulation.state) && verifiesSolution(level) };
    });
    getRdnSolutionTable = (variant) => RDN_SOLUTION_TABLE.filter((row) => row.variant === variant);
    validateAdventureLevelBatch = () => {
      const engine = new PuzzleEngine();
      return RDN_LEVELS.filter((level) => level.variant === "persistent").map((level) => {
        let state = engine.createInitialState(level);
        for (const move of level.solutionMoves ?? []) {
          const delta = modulo2(move.rotation - state.rotation, level.positions);
          if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
          state = engine.apply(level, state, { type: "IMPULSE" });
        }
        return { level: level.number, valid: state.won && !timerDeadlineFailed(state) };
      });
    };
    if (!useGeneratedCatalogue) {
      if (RDN_SOLUTION_TABLE.some((row) => !row.verified)) throw new Error("Invalid RDN solution table");
      if (validateAdventureLevelBatch().some((row) => !row.valid)) throw new Error("Invalid Adventure level batch");
    }
  }
});

// src/app/core/game/phaser/catalogues/v004/catalogue.contract.ts
var catalogue_contract_exports = {};
__export(catalogue_contract_exports, {
  RDN_CATALOGUE_CONTRACT: () => RDN_CATALOGUE_CONTRACT
});
var RDN_CATALOGUE_CONTRACT;
var init_catalogue_contract = __esm({
  "src/app/core/game/phaser/catalogues/v004/catalogue.contract.ts"() {
    "use strict";
    init_rdn_release_config();
    RDN_CATALOGUE_CONTRACT = {
      version: "v004",
      levelSchemaVersion: 1,
      generatorVersion: RDN_RELEASE.generatorVersion
    };
  }
});

// src/app/core/game/phaser/catalogues/v005/rdn-release.config.ts
var RDN_RELEASE2;
var init_rdn_release_config2 = __esm({
  "src/app/core/game/phaser/catalogues/v005/rdn-release.config.ts"() {
    "use strict";
    RDN_RELEASE2 = {
      telemetrySchemaVersion: 1,
      generatorVersion: "rdn-generator-v2",
      balanceVersion: "rdn-balance-v1",
      saveSchemaVersion: 2
    };
  }
});

// src/app/core/game/phaser/catalogues/v005/levels.config.ts
var RDN_MAX_LEVEL2, RDN_MIN_SPHERES2, RDN_MAX_SPHERES2, RDN_MAX_TIMER_DIRECT_IMPULSES2, RDN_MAX_OPERATIONS_PER_SPHERE, RDN_MAX_GEAR_OPERATOR_MAGNITUDE, RDN_MAX_SPECIAL_OPERATORS, RDN_MAX_AREA_EFFECTS_PER_BOARD, RDN_LEVELS_PER_SPHERE_INCREMENT2, rdnSphereCountForLevel2;
var init_levels_config2 = __esm({
  "src/app/core/game/phaser/catalogues/v005/levels.config.ts"() {
    "use strict";
    RDN_MAX_LEVEL2 = 350;
    RDN_MIN_SPHERES2 = 4;
    RDN_MAX_SPHERES2 = 8;
    RDN_MAX_TIMER_DIRECT_IMPULSES2 = 15;
    RDN_MAX_OPERATIONS_PER_SPHERE = 15;
    RDN_MAX_GEAR_OPERATOR_MAGNITUDE = 15;
    RDN_MAX_SPECIAL_OPERATORS = 2;
    RDN_MAX_AREA_EFFECTS_PER_BOARD = 1;
    RDN_LEVELS_PER_SPHERE_INCREMENT2 = Math.ceil(RDN_MAX_LEVEL2 / (RDN_MAX_SPHERES2 - RDN_MIN_SPHERES2 + 1));
    rdnSphereCountForLevel2 = (number) => {
      const band = Math.min(RDN_MAX_SPHERES2 - RDN_MIN_SPHERES2, Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT2));
      return RDN_MIN_SPHERES2 + band;
    };
  }
});

// src/app/core/game/phaser/catalogues/v005/progression-rules.config.ts
var RDN_PROGRESSION_RULES2, RDN_EFFECT_PROGRESSION_RULES2, RDN_EFFECT_CHECKPOINTS2, RDN_GEM_EFFECT_PRESETS2, RDN_LINK_EFFECT_PRESETS2, RDN_AREA_EFFECT_PRESETS2, RDN_EFFECT_FLOW_RULES2, RDN_SPECIAL_OPERATOR_CANDIDATES2, RDN_EFFECT_SIMPLIFICATIONS2, RDN_GEM_EFFECT_FALLBACK_PRESETS, rdnEffectRuleForLevel2, rdnProgressionRuleForSpheres2, rdnSpecialOperatorsForBoard2, rdnLinkCountForBoard2, rdnMaximumLinksForSpheres2, rdnMaximumGemEffectsForSpheres2, rdnGemEffectCountForBoard2;
var init_progression_rules_config2 = __esm({
  "src/app/core/game/phaser/catalogues/v005/progression-rules.config.ts"() {
    "use strict";
    init_effects_models();
    init_levels_config2();
    RDN_PROGRESSION_RULES2 = [
      {
        minSpheres: 4,
        minGemEffects: 1,
        // I checkpoint didattici possono mostrare due effetti, ma le fasce base
        // restano limitate a uno tramite il loro `maxGemEffects`.
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        fixedLinks: 0,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        // Nessun link generato a quattro sfere; uno resta disponibile per una lezione manuale.
        maxLinks: 1
      },
      {
        minSpheres: 5,
        minGemEffects: 2,
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        fixedLinks: 0,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 1
      },
      {
        minSpheres: 6,
        minGemEffects: 2,
        maxGemEffects: 3,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        fixedLinks: 1,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 2
      },
      {
        minSpheres: 7,
        minGemEffects: 3,
        maxGemEffects: 4,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        fixedLinks: 2,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 3
      },
      {
        minSpheres: 8,
        minGemEffects: 4,
        maxGemEffects: 5,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        fixedLinks: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        maxLinks: 4
      }
    ];
    RDN_EFFECT_PROGRESSION_RULES2 = [
      { id: "LEGACY", minLevel: 1, maxLevel: 9, maxGemEffects: 0, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 0, structureAttemptsBeforeScaling: 0 },
      { id: "SHIELD", minLevel: 10, maxLevel: 19, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "WALL", minLevel: 20, maxLevel: 29, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "MIRROR", minLevel: 30, maxLevel: 34, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "AMPLIFY", minLevel: 35, maxLevel: 39, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "INVERTER", minLevel: 40, maxLevel: 44, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "ICE", minLevel: 45, maxLevel: 49, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "TIMER", minLevel: 50, maxLevel: 59, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "CORRUPTION", minLevel: 60, maxLevel: 69, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "LINKS", minLevel: 70, maxLevel: 79, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "AREA", minLevel: 80, maxLevel: 100, maxGemEffects: 2, maxAreaEffects: 1, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "STABLE", minLevel: 101, maxGemEffects: 5, maxAreaEffects: 1, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 }
    ];
    RDN_EFFECT_CHECKPOINTS2 = {
      15: { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      25: { enabled: true, effects: [{ preset: "WALL_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }] },
      35: { enabled: true, effects: [{ preset: "MIRROR_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }, { preset: "AMPLIFIER_X2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      45: { enabled: true, effects: [{ preset: "INVERTER_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "ICE_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }] },
      55: { enabled: true, effects: [{ preset: "TIMER_5", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "CORRUPTION_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }] },
      65: { enabled: true, effects: [{ preset: "TIMER_7", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "CORRUPTION_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }, { preset: "ECHO_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 0, toGemIndex: 2 }, overrides: { direction: "FORWARD" /* FORWARD */ } }] },
      75: { enabled: true, effects: [{ preset: "AMPLIFIER_X3", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "ICE_3", target: { type: "GEM" /* GEM */, gemIndex: 4 } }, { preset: "INVERT_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 1, toGemIndex: 3 }, overrides: { direction: "FORWARD" /* FORWARD */ } }, { preset: "BOMB_2", target: { type: "AREA" /* AREA */, sourceGemIndex: 2 } }] }
    };
    RDN_GEM_EFFECT_PRESETS2 = {
      LEGACY: [],
      SHIELD: ["SHIELD_1", "SHIELD_2", "SHIELD_3"],
      WALL: ["WALL_1"],
      MIRROR: ["MIRROR_1"],
      AMPLIFY: ["AMPLIFIER_X2", "AMPLIFIER_X3"],
      INVERTER: ["INVERTER_1"],
      ICE: ["ICE_1", "ICE_2", "ICE_3"],
      TIMER: ["TIMER_3", "TIMER_5", "TIMER_7", "TIMER_10"],
      CORRUPTION: ["CORRUPTION_1", "CORRUPTION_2"],
      LINKS: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "CORRUPTION_1"],
      AREA: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "CORRUPTION_1"],
      STABLE: [
        "SHIELD_1",
        "SHIELD_2",
        "SHIELD_3",
        "WALL_1",
        "WALL_2",
        "WALL_3",
        "WALL_4",
        "MIRROR_1",
        "AMPLIFIER_X2",
        "AMPLIFIER_X3",
        "INVERTER_1",
        "ICE_1",
        "ICE_2",
        "ICE_3",
        "TIMER_3",
        "TIMER_5",
        "TIMER_7",
        "TIMER_10",
        "CORRUPTION_1",
        "CORRUPTION_2"
      ]
    };
    RDN_LINK_EFFECT_PRESETS2 = ["ECHO_LINK", "DOUBLE_LINK", "INVERT_LINK"];
    RDN_AREA_EFFECT_PRESETS2 = ["AREA_BOMB_MINUS_2", "AREA_BOMB_PLUS_2", "AREA_BOMB_MINUS_4", "AREA_BOMB_PLUS_4", "AREA_BOMB_MINUS_7", "AREA_BOMB_PLUS_7", "AREA_ICE_ADJACENT", "AREA_ICE_TWO_ADJACENT", "AREA_ICE_ALL", "AREA_INVERTER_ADJACENT", "AREA_INVERTER_TWO_ADJACENT", "AREA_INVERTER_ALL"];
    RDN_EFFECT_FLOW_RULES2 = { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: "SUM" /* SUM */ };
    RDN_SPECIAL_OPERATOR_CANDIDATES2 = ["zero", "invert", "divide2", "skip", "divide3"];
    RDN_EFFECT_SIMPLIFICATIONS2 = {
      SHIELD_3: "SHIELD_2",
      SHIELD_2: "SHIELD_1",
      WALL_4: "WALL_3",
      WALL_3: "WALL_2",
      WALL_2: "WALL_1",
      AMPLIFIER_X3: "AMPLIFIER_X2",
      ICE_3: "ICE_2",
      ICE_2: "ICE_1",
      TIMER_3: "TIMER_5",
      TIMER_5: "TIMER_7",
      TIMER_7: "TIMER_10",
      CORRUPTION_2: "CORRUPTION_1",
      DOUBLE_LINK: "ECHO_LINK",
      INVERT_LINK: "ECHO_LINK",
      BOMB_2: "BOMB_1"
    };
    RDN_GEM_EFFECT_FALLBACK_PRESETS = ["SHIELD_1", "WALL_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1"];
    rdnEffectRuleForLevel2 = (level) => RDN_EFFECT_PROGRESSION_RULES2.find((rule) => level >= rule.minLevel && (rule.maxLevel === void 0 || level <= rule.maxLevel)) ?? RDN_EFFECT_PROGRESSION_RULES2[0];
    rdnProgressionRuleForSpheres2 = (spheres) => RDN_PROGRESSION_RULES2.reduce((active, rule) => spheres >= rule.minSpheres ? rule : active, RDN_PROGRESSION_RULES2[0]);
    rdnSpecialOperatorsForBoard2 = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres2(spheres);
      const key = Math.floor(level + variation);
      const optional = rule.optionalSpecialEvery > 0 && key % rule.optionalSpecialEvery === 0 ? rule.optionalSpecials : 0;
      const count = Math.min(spheres, RDN_MAX_SPECIAL_OPERATORS, rule.guaranteedSpecials + optional);
      const start = (key % RDN_SPECIAL_OPERATOR_CANDIDATES2.length + RDN_SPECIAL_OPERATOR_CANDIDATES2.length) % RDN_SPECIAL_OPERATOR_CANDIDATES2.length;
      return Array.from({ length: count }, (_, index) => RDN_SPECIAL_OPERATOR_CANDIDATES2[(start + index) % RDN_SPECIAL_OPERATOR_CANDIDATES2.length]);
    };
    rdnLinkCountForBoard2 = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres2(spheres);
      const optional = rule.optionalLinkEvery > 0 && Math.floor(level + variation) % rule.optionalLinkEvery === 0 ? rule.optionalLinks : 0;
      return Math.min(rule.maxLinks, rule.fixedLinks + optional);
    };
    rdnMaximumLinksForSpheres2 = (spheres) => rdnProgressionRuleForSpheres2(spheres).maxLinks;
    rdnMaximumGemEffectsForSpheres2 = (spheres) => rdnProgressionRuleForSpheres2(spheres).maxGemEffects;
    rdnGemEffectCountForBoard2 = (key, spheres) => {
      const rule = rdnProgressionRuleForSpheres2(spheres);
      const range = rule.maxGemEffects - rule.minGemEffects + 1;
      return rule.minGemEffects + (range > 0 ? Math.abs(Math.floor(key)) % range : 0);
    };
  }
});

// src/app/core/game/phaser/catalogues/v005/effect-progression.config.ts
var positiveModulo2, pick2, resolveEffectProgressionTier2, shouldUseProgressionEffects2, explicitEffectConfigurationForLevel2, createProgressionEffectConfiguration2, createFreeModeEffectConfiguration2, validateEffectComplexity2;
var init_effect_progression_config2 = __esm({
  "src/app/core/game/phaser/catalogues/v005/effect-progression.config.ts"() {
    "use strict";
    init_effects_models();
    init_levels_config2();
    init_progression_rules_config2();
    positiveModulo2 = (value, length) => (value % length + length) % length;
    pick2 = (items, seed) => items[positiveModulo2(seed, items.length)];
    resolveEffectProgressionTier2 = rdnEffectRuleForLevel2;
    shouldUseProgressionEffects2 = (level) => level >= 10;
    explicitEffectConfigurationForLevel2 = (level) => RDN_EFFECT_CHECKPOINTS2[level];
    createProgressionEffectConfiguration2 = (mode, level, gemCount, seed = 0) => {
      if (gemCount < 4 || !shouldUseProgressionEffects2(level)) return void 0;
      const tier = resolveEffectProgressionTier2(level);
      const key = level * 37 + gemCount * 11 + seed + (mode === "time-attack" ? 7 : mode === "free" ? 13 : 0);
      const first = positiveModulo2(key, gemCount);
      const second = positiveModulo2(first + 2, gemCount);
      const source = positiveModulo2(first + 1, gemCount);
      const destination = positiveModulo2(source + 1, gemCount);
      const effects = [];
      const gemPresets = RDN_GEM_EFFECT_PRESETS2[tier.id];
      const gemEffectCount = tier.id === "LEGACY" ? 0 : Math.min(tier.maxGemEffects, rdnGemEffectCountForBoard2(key, gemCount));
      for (let index = 0; index < gemEffectCount; index += 1) {
        effects.push({ preset: pick2(gemPresets, key + index), target: { type: "GEM" /* GEM */, gemIndex: positiveModulo2(first + index, gemCount) } });
      }
      const linkCount = rdnLinkCountForBoard2(level, gemCount, mode === "free" ? seed : 0);
      for (let index = 0; index < linkCount; index += 1) {
        const fromGemIndex = positiveModulo2(source + index, gemCount);
        const toGemIndex = positiveModulo2(destination + index * 2, gemCount);
        effects.push({ preset: pick2(RDN_LINK_EFFECT_PRESETS2, key + 2 + index), target: { type: "LINK" /* LINK */, fromGemIndex, toGemIndex: toGemIndex === fromGemIndex ? positiveModulo2(toGemIndex + 1, gemCount) : toGemIndex }, overrides: { direction: level >= 100 && (key + index) % 2 === 0 ? "BIDIRECTIONAL" /* BIDIRECTIONAL */ : "FORWARD" /* FORWARD */ } });
      }
      const areaEffectCount = Math.min(tier.maxAreaEffects, RDN_MAX_AREA_EFFECTS_PER_BOARD);
      for (let index = 0; index < areaEffectCount; index += 1) effects.push({ preset: pick2(RDN_AREA_EFFECT_PRESETS2, key + 5 + index), target: { type: "AREA" /* AREA */, sourceGemIndex: positiveModulo2(second + index, gemCount) } });
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES2 } : void 0;
    };
    createFreeModeEffectConfiguration2 = (difficulty, gemCount, seed = 0, selections = false) => {
      const enabled = typeof selections === "boolean" ? { gem: selections, link: selections, area: selections } : selections;
      if (!enabled.gem && !enabled.link && !enabled.area) return void 0;
      const progressionLevel = difficulty === "EASY" ? 20 : difficulty === "NORMAL" ? 40 : difficulty === "HARD" ? 60 : 81;
      const effects = [
        ...enabled.gem ? createProgressionEffectConfiguration2("free", progressionLevel, gemCount, seed)?.effects?.filter((effect) => effect.target.type === "GEM" /* GEM */) ?? [] : [],
        ...enabled.link ? createProgressionEffectConfiguration2("free", Math.max(progressionLevel, 72), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "LINK" /* LINK */) ?? [] : [],
        ...enabled.area ? createProgressionEffectConfiguration2("free", Math.max(progressionLevel, 80), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "AREA" /* AREA */) ?? [] : []
      ];
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES2 } : void 0;
    };
    validateEffectComplexity2 = (configuration, label, spheres = 8) => {
      if (!configuration?.enabled) return [];
      const effects = configuration.effects ?? [];
      const gem = effects.filter((effect) => effect.target.type === "GEM" /* GEM */).length;
      const link = effects.filter((effect) => effect.target.type === "LINK" /* LINK */).length;
      const area = effects.filter((effect) => effect.target.type === "AREA" /* AREA */).length;
      const issues = [];
      const maximumGemEffects = rdnMaximumGemEffectsForSpheres2(spheres);
      if (gem > maximumGemEffects) issues.push(`${label}: GEM effect count = ${gem}, maximum allowed = ${maximumGemEffects}.`);
      const maximumLinks = rdnMaximumLinksForSpheres2(spheres);
      if (link > maximumLinks) issues.push(`${label}: LINK effect count = ${link}, maximum allowed = ${maximumLinks}.`);
      if (area > RDN_MAX_AREA_EFFECTS_PER_BOARD) issues.push(`${label}: AREA effect count = ${area}, maximum allowed = ${RDN_MAX_AREA_EFFECTS_PER_BOARD}.`);
      return issues;
    };
  }
});

// src/app/core/game/phaser/catalogues/v005/catalog.builder.ts
var catalog_builder_exports2 = {};
__export(catalog_builder_exports2, {
  RDN_LEVELS: () => RDN_LEVELS2,
  RDN_SOLUTION_TABLE: () => RDN_SOLUTION_TABLE2,
  generateRdnPuzzle: () => generateRdnPuzzle2,
  getRdnLevel: () => getRdnLevel2,
  getRdnSolutionTable: () => getRdnSolutionTable2,
  prepareRdnCatalogueLevel: () => prepareRdnCatalogueLevel2,
  validateAdventureLevelBatch: () => validateAdventureLevelBatch2
});
var DEFAULT_ACTIVE_FLOW_COUNT2, freeActiveFlowCount2, modulo3, random2, impulsesPerValue2, rotationDistance2, specialOperatorsForLevel2, gearOperators2, additiveOperators2, balancedPlanSigns2, subtractivePlan2, planForValue2, generateBoard2, tutorialBoard2, generatedMetadata2, adventureConfig2, replaySolutionWithTrace2, replaySolution2, withCalibratedTimerDeadlines2, timerDeadlineFailed2, lastIndexFor2, withRotatedEffectTargets, effectPlacementVariants, effectConfigurationStages2, timerPlacementIsCompatible2, buildEffectCandidate2, needsSignedValueCalibration2, recalculatedOuterValues2, regenerateEffectAwareLevel2, applyProgressionEffects2, effectAwareVariant2, persistent2, loader2, generateRdnLevelCatalogue2, catalogueGenerationRequested2, useGeneratedCatalogue2, removeDuplicateSignedGearValues2, upgradeLegacyTutorial2, prepareRdnCatalogueLevel2, RDN_LEVELS2, getRdnLevel2, generateRdnPuzzle2, applySolutionOperator2, verifiesSolution2, RDN_SOLUTION_TABLE2, getRdnSolutionTable2, validateAdventureLevelBatch2;
var init_catalog_builder2 = __esm({
  "src/app/core/game/phaser/catalogues/v005/catalog.builder.ts"() {
    "use strict";
    init_puzzle_types();
    init_puzzle_engine();
    init_level_effect_config_resolver();
    init_effects_models();
    init_rdn_release_config2();
    init_effect_progression_config2();
    init_progression_rules_config2();
    init_levels_config2();
    DEFAULT_ACTIVE_FLOW_COUNT2 = 1;
    freeActiveFlowCount2 = (difficulty) => difficulty === "EASY" ? 1 : difficulty === "NORMAL" ? 2 : difficulty === "HARD" ? 3 : 4;
    modulo3 = (value, length) => (value % length + length) % length;
    random2 = (seed) => {
      let state = seed >>> 0;
      return () => {
        state = state * 1664525 + 1013904223 >>> 0;
        return state / 4294967296;
      };
    };
    impulsesPerValue2 = (number) => number <= 3 ? 1 : Math.min(RDN_MAX_OPERATIONS_PER_SPHERE, 2 + Math.floor((number - 4) / 20));
    rotationDistance2 = (from, to, positions) => Math.min(modulo3(to - from, positions), modulo3(from - to, positions));
    specialOperatorsForLevel2 = (level, positions, variation = 0) => {
      return [...rdnSpecialOperatorsForBoard2(level, positions, variation)];
    };
    gearOperators2 = (positions, specialOperators, next, allowDuplicateSignedValues = false) => {
      const subtractorCount = positions - specialOperators.length;
      if (!allowDuplicateSignedValues && RDN_MAX_GEAR_OPERATOR_MAGNITUDE < Math.ceil(subtractorCount / 2)) {
        throw new Error(`RDN_MAX_GEAR_OPERATOR_MAGNITUDE=${RDN_MAX_GEAR_OPERATOR_MAGNITUDE} non consente ${subtractorCount} operatori numerici univoci per segno.`);
      }
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const magnitudes = Array.from({ length: subtractorCount }, (_, index) => {
        const used = index % 2 === 0 ? usedNegative : usedPositive;
        let value = 1 + Math.floor(next() * RDN_MAX_GEAR_OPERATOR_MAGNITUDE);
        if (!allowDuplicateSignedValues) while (used.has(value)) value = value % RDN_MAX_GEAR_OPERATOR_MAGNITUDE + 1;
        used.add(value);
        return value;
      });
      return [...magnitudes.map((value, index) => index % 2 === 0 ? -value : value), ...specialOperators];
    };
    additiveOperators2 = (operators) => operators.filter((operator) => typeof operator === "number" && operator !== 0);
    balancedPlanSigns2 = (plans) => {
      const counts = plans.map((plan) => plan.operators.filter((operator) => typeof operator === "number").length);
      const total = counts.reduce((sum, count) => sum + count, 0);
      const reachable = Array(total + 1).fill(void 0);
      reachable[0] = [];
      counts.forEach((count, index) => {
        for (let sum = total - count; sum >= 0; sum -= 1) if (reachable[sum] && !reachable[sum + count]) reachable[sum + count] = [...reachable[sum], index];
      });
      let selectedSum = 0;
      for (let sum = 0; sum <= total; sum += 1) if (reachable[sum] && Math.abs(total - sum * 2) < Math.abs(total - selectedSum * 2)) selectedSum = sum;
      const positivePlans = new Set(reachable[selectedSum]);
      return plans.map((_, index) => positivePlans.has(index));
    };
    subtractivePlan2 = (count, available, next, maximumStart = 20) => {
      if (!available.length) throw new Error("RDN generator requires at least one compatible numeric operator");
      const minimumMagnitude = Math.min(...available.map((value) => Math.abs(value)));
      const safeCount = Math.max(1, Math.min(count, Math.floor(maximumStart / minimumMagnitude)));
      const values = [];
      let total = 0;
      for (let index = 0; index < safeCount; index += 1) {
        const remaining = safeCount - index - 1;
        const candidates = available.filter((value) => total + Math.abs(value) + remaining * minimumMagnitude <= maximumStart);
        const selected = candidates[Math.floor(next() * candidates.length)] ?? available[0];
        values.push(selected);
        total += Math.abs(selected);
      }
      return { start: total * (values[0] < 0 ? 1 : -1), operators: values };
    };
    planForValue2 = (impulses, available, next, maximumStart, forcedOperator) => {
      if (forcedOperator === "divide2" || forcedOperator === "divide3") {
        const divisor = forcedOperator === "divide2" ? 2 : 3;
        const tail = subtractivePlan2(impulses - 1, available, next, Math.floor(maximumStart / divisor));
        return { start: tail.start * divisor, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "zero") {
        const magnitude = 1 + Math.floor(next() * Math.max(1, maximumStart));
        return { start: next() < 0.5 ? -magnitude : magnitude, operators: [forcedOperator] };
      }
      if (forcedOperator === "invert") {
        const tail = subtractivePlan2(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: -tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "skip") {
        const tail = subtractivePlan2(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      return subtractivePlan2(impulses, available, next, maximumStart);
    };
    generateBoard2 = (number, seedOffset, slotCount, balanceQueueSigns = false, allowDuplicateSignedGearValues = false) => {
      const positions = slotCount && slotCount >= RDN_MIN_SPHERES2 && slotCount <= RDN_MAX_SPHERES2 ? slotCount : rdnSphereCountForLevel2(number);
      const impulses = impulsesPerValue2(number);
      const seed = number * 977 + seedOffset;
      const next = random2(seed);
      const specialOperators = specialOperatorsForLevel2(number, positions, seedOffset);
      const innerValues = gearOperators2(positions, specialOperators, next, allowDuplicateSignedGearValues);
      const allAdditives = additiveOperators2(innerValues);
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const maximumStart = Math.min(Math.abs(range.min), Math.abs(range.max));
      const planForIndex = (index, positive) => planForValue2(impulses, allAdditives.filter((operator) => positive ? operator > 0 : operator < 0), next, maximumStart, specialOperators[index]);
      const provisionalPlans = Array.from({ length: positions }, (_, index) => planForIndex(index, index % 2 !== 0));
      const planSigns = balanceQueueSigns ? balancedPlanSigns2(provisionalPlans) : provisionalPlans.map((_, index) => index % 2 !== 0);
      const plans = balanceQueueSigns ? Array.from({ length: positions }, (_, index) => planForIndex(index, planSigns[index])) : provisionalPlans;
      const loaderQueues = Array.from({ length: positions }, () => []);
      const cursors = Array(positions).fill(0);
      const rotations = [];
      const slotPhases = [];
      const solutionMoves = [];
      while (cursors.some((cursor, outerIndex) => cursor < plans[outerIndex].operators.length)) {
        const candidates = plans.map((plan, outerIndex2) => cursors[outerIndex2] < plan.operators.length ? outerIndex2 : -1).filter((outerIndex2) => outerIndex2 >= 0);
        const outerIndex = candidates[Math.floor(next() * candidates.length)];
        const operator = plans[outerIndex].operators[cursors[outerIndex]];
        const innerIndex = innerValues.findIndex((value) => value === operator);
        loaderQueues[innerIndex].push(operator);
        const rotation = modulo3(outerIndex - innerIndex, positions);
        rotations.push(rotation);
        slotPhases.push([{ outerIndex }]);
        solutionMoves.push({ outerIndex, rotation, operator });
        cursors[outerIndex] += 1;
      }
      const initialRotation = modulo3(rotations[0] + 1 + Math.floor(next() * Math.max(1, positions - 1)), positions);
      let previousRotation = initialRotation;
      let rotationSteps = 0;
      for (const rotation of rotations) {
        rotationSteps += rotationDistance2(previousRotation, rotation, positions);
        previousRotation = rotation;
      }
      return { positions, initialRotation, innerValues, loaderQueues, outerValues: plans.map((plan) => plan.start), slotPhases, optimalCost: { impulses: slotPhases.length, rotationSteps }, solution: plans.map((plan) => ({ startValue: plan.start, operators: [...plan.operators] })), solutionMoves, seed };
    };
    tutorialBoard2 = () => {
      const operators = [-1, -2, -3, -4];
      const values = operators.map((operator) => -operator);
      return { positions: 4, initialRotation: 0, innerValues: [...operators], loaderQueues: operators.map((operator) => [operator]), outerValues: values, slotPhases: [[{ outerIndex: 0 }], [{ outerIndex: 1 }], [{ outerIndex: 2 }], [{ outerIndex: 3 }]], optimalCost: { impulses: 4, rotationSteps: 0 }, solution: operators.map((operator, index) => ({ startValue: values[index], operators: [operator] })), solutionMoves: operators.map((operator, outerIndex) => ({ outerIndex, rotation: 0, operator })), seed: 0 };
    };
    generatedMetadata2 = (number, board, difficulty = "EASY", activeFlowCount = DEFAULT_ACTIVE_FLOW_COUNT2) => ({ seed: board.seed, generatorVersion: RDN_RELEASE2.generatorVersion, balanceVersion: RDN_RELEASE2.balanceVersion, difficulty, estimatedMinimumSolutionLength: board.optimalCost.impulses, officialSolutionImpulses: board.optimalCost.impulses, officialSolutionRotationSteps: board.optimalCost.rotationSteps, branchingFactor: activeFlowCount, featureFlags: [] });
    adventureConfig2 = (number, board) => ({
      version: 1,
      seed: board.seed,
      levelVersion: "rdn-adventure-v1",
      objectives: { targetValues: [...board.outerValues], requireAllTargetsZero: true },
      enabledMechanics: ["fixed-operators", "special-inventory", "rotation", "impulse"],
      specialInventory: {
        divide2: board.innerValues.filter((operator) => operator === "divide2").length,
        divide3: board.innerValues.filter((operator) => operator === "divide3").length,
        zero: board.innerValues.filter((operator) => operator === "zero").length,
        invert: board.innerValues.filter((operator) => operator === "invert").length,
        skip: board.innerValues.filter((operator) => operator === "skip").length
      }
    });
    replaySolutionWithTrace2 = (level) => {
      const engine = new PuzzleEngine();
      let state = engine.createInitialState(level);
      const execution = [];
      for (const move of level.solutionMoves ?? []) {
        const delta = modulo3(move.rotation - state.rotation, level.positions);
        if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
        const plan = engine.planImpulse(level, state);
        const linkedTargets = new Set(plan.impacts.filter((impact) => impact.linkId).map((impact) => impact.targetId));
        const changedTargets = new Set(plan.impacts.map((impact) => impact.targetId));
        execution.push({
          move,
          updates: [...changedTargets].map((outerIndex) => ({ outerIndex, value: plan.finalValues[outerIndex], viaLink: linkedTargets.has(outerIndex) }))
        });
        state = engine.apply(level, state, { type: "IMPULSE" });
      }
      return { state, execution };
    };
    replaySolution2 = (level) => replaySolutionWithTrace2(level).state;
    withCalibratedTimerDeadlines2 = (level, configuration) => {
      if (!configuration.effects?.length || configuration.sets?.length) return configuration;
      const effects = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects;
      const deadlines = /* @__PURE__ */ new Map();
      effects.forEach((effect, index) => {
        if (effect.config.type !== "TIMER" /* TIMER */) return;
        const target = effect.target;
        if (target.type !== "GEM" /* GEM */) return;
        const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === target.gem.index).length;
        if (directImpulses > RDN_MAX_TIMER_DIRECT_IMPULSES2) return;
        deadlines.set(index, Math.max(effect.config.turns, directImpulses));
      });
      return {
        ...configuration,
        effects: configuration.effects.map((assignment, index) => {
          const deadline = deadlines.get(index);
          return deadline === void 0 ? assignment : { ...assignment, overrides: { ...assignment.overrides, turns: deadline } };
        })
      };
    };
    timerDeadlineFailed2 = (state) => (state.effectRuntime?.expiredTimerIds.length ?? 0) > 0;
    lastIndexFor2 = (effects, scope) => {
      for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index].target.type === scope) return index;
      return -1;
    };
    withRotatedEffectTargets = (configuration, positions, offset) => {
      const rotate = (index) => modulo3(index + offset, positions);
      return {
        ...configuration,
        effects: configuration.effects?.map((effect) => {
          if (effect.target.type === "GEM" /* GEM */) return { ...effect, target: { ...effect.target, gemIndex: rotate(effect.target.gemIndex) } };
          if (effect.target.type === "LINK" /* LINK */) return { ...effect, target: { ...effect.target, fromGemIndex: rotate(effect.target.fromGemIndex), toGemIndex: rotate(effect.target.toGemIndex) } };
          return { ...effect, target: { ...effect.target, sourceGemIndex: rotate(effect.target.sourceGemIndex) } };
        })
      };
    };
    effectPlacementVariants = (configuration, positions, preserveTargets) => {
      if (preserveTargets || positions < 2) return [configuration];
      return Array.from({ length: positions }, (_, offset) => withRotatedEffectTargets(configuration, positions, offset));
    };
    effectConfigurationStages2 = (configuration, spheres) => {
      const effects = [...configuration.effects ?? []];
      const optional = [];
      let reduced = effects.filter((effect) => effect.target.type !== "AREA" /* AREA */);
      optional.push({ ...configuration, effects: reduced });
      const fixedLinks = rdnProgressionRuleForSpheres2(spheres).fixedLinks;
      while (reduced.filter((effect) => effect.target.type === "LINK" /* LINK */).length > fixedLinks) {
        reduced = reduced.filter((_, index) => index !== lastIndexFor2(reduced, "LINK" /* LINK */));
        optional.push({ ...configuration, effects: reduced });
      }
      const scaled = [];
      let scaledEffects = [...reduced];
      while (true) {
        const index = scaledEffects.findIndex((effect) => RDN_EFFECT_SIMPLIFICATIONS2[effect.preset] !== void 0);
        if (index < 0) break;
        const preset = RDN_EFFECT_SIMPLIFICATIONS2[scaledEffects[index].preset];
        if (!preset) break;
        scaledEffects = scaledEffects.map((effect, effectIndex) => effectIndex === index ? { ...effect, preset, overrides: void 0 } : effect);
        scaled.push({ ...configuration, effects: scaledEffects });
      }
      const minimumGems = rdnProgressionRuleForSpheres2(spheres).minGemEffects;
      let minimum = scaledEffects.filter((effect) => effect.target.type !== "AREA" /* AREA */ && effect.target.type !== "LINK" /* LINK */);
      while (minimum.filter((effect) => effect.target.type === "GEM" /* GEM */).length > minimumGems) minimum = minimum.filter((_, index) => index !== lastIndexFor2(minimum, "GEM" /* GEM */));
      const finalPresets = RDN_GEM_EFFECT_FALLBACK_PRESETS;
      const final = finalPresets.map((preset) => ({ ...configuration, effects: minimum.map((effect) => effect.target.type === "GEM" /* GEM */ ? { ...effect, preset, overrides: void 0 } : effect) }));
      return [[configuration], optional, scaled, final];
    };
    timerPlacementIsCompatible2 = (level, configuration) => (configuration.effects ?? []).every((effect) => {
      if (!effect.preset.startsWith("TIMER_") || effect.target.type !== "GEM" /* GEM */) return true;
      const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === effect.target.gemIndex).length;
      return directImpulses <= RDN_MAX_TIMER_DIRECT_IMPULSES2;
    });
    buildEffectCandidate2 = (level, outerValues, effectConfiguration) => ({ ...level, outerValues: [...outerValues], solution: level.solution?.map((slot, index) => ({ ...slot, startValue: outerValues[index] })), effectConfiguration });
    needsSignedValueCalibration2 = (configuration) => (configuration.effects ?? []).some((effect) => effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1" || effect.preset === "CORRUPTION_1" || effect.preset === "CORRUPTION_2");
    recalculatedOuterValues2 = (candidate, result, range, useSignedCalibration) => {
      const recalculated = candidate.outerValues.map((value, index) => {
        if (!useSignedCalibration) return value - result.outerValues[index];
        const probeStep = value < range.max && value !== -1 ? 1 : value > range.min && value !== 1 ? -1 : 0;
        if (probeStep === 0) return value - result.outerValues[index];
        const probeValues = [...candidate.outerValues];
        probeValues[index] += probeStep;
        const probeResult = replaySolution2(buildEffectCandidate2(candidate, probeValues, candidate.effectConfiguration));
        const slope = (probeResult.outerValues[index] - result.outerValues[index]) / probeStep;
        const correction = slope === 0 ? -result.outerValues[index] : -result.outerValues[index] / slope;
        return value + correction;
      });
      return recalculated.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max) ? void 0 : recalculated;
    };
    regenerateEffectAwareLevel2 = (level, configuration) => {
      if (!configuration) return level;
      const startedAt = performance.now();
      let calibrationAttempts = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const solutionAttemptsBeforeScaling = rdnEffectRuleForLevel2(level.number).solutionAttemptsBeforeScaling;
      const structureAttemptsBeforeScaling = rdnEffectRuleForLevel2(level.number).structureAttemptsBeforeScaling;
      const withStats = (candidate, solved, officialSolution) => ({ ...candidate, generation: candidate.generation ? { ...candidate.generation, ...officialSolution ? { officialSolutionImpulses: officialSolution.impulses, officialSolutionRotationSteps: officialSolution.rotationSteps } : {}, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: 1, solutionAttempts: calibrationAttempts, calibrationAttempts, structureAttemptsBeforeScaling, solutionAttemptsBeforeScaling, totalComplexity: (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0) + (candidate.effectConfiguration?.effects?.length ?? 0) * 10, failureReasons: solved ? [...failureReasons] : [...failureReasons, "NO_VALID_EFFECT_CONFIGURATION"] } } : candidate.generation });
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const attemptsBeforeScaling = solutionAttemptsBeforeScaling;
      if (!timerPlacementIsCompatible2(level, configuration)) {
        failureReasons.add("TIMER_TARGET_TOO_MANY_DIRECT_IMPULSES");
        return withStats(level, false);
      }
      {
        const candidateConfiguration = withCalibratedTimerDeadlines2(level, configuration);
        if (!candidateConfiguration) {
          failureReasons.add("TIMER_DEADLINE_CALIBRATION_FAILED");
          return withStats(level, false);
        }
        const issues = validateEffectComplexity2(candidateConfiguration, `${level.variant} level ${level.number}`, level.positions);
        if (issues.length) {
          failureReasons.add("COMPLEXITY_INVALID");
          throw new Error(issues.join(" "));
        }
        let outerValues = [...level.outerValues];
        const useSignedCalibration = needsSignedValueCalibration2(candidateConfiguration);
        const seenValueVectors = /* @__PURE__ */ new Set();
        for (let attempt = 0; attempt < attemptsBeforeScaling; attempt += 1) {
          const valueVector = outerValues.join(",");
          if (seenValueVectors.has(valueVector)) {
            failureReasons.add("CALIBRATION_VALUE_CYCLE");
            break;
          }
          seenValueVectors.add(valueVector);
          calibrationAttempts += 1;
          const candidate = buildEffectCandidate2(level, outerValues, candidateConfiguration);
          const result = replaySolution2(candidate);
          if (result.won && !timerDeadlineFailed2(result)) {
            const canonicalImpulses = result.impulses;
            const canonicalRotations = result.rotationSteps;
            return withStats({ ...candidate, starCost: { impulses: canonicalImpulses, rotationSteps: canonicalRotations } }, true, { impulses: canonicalImpulses, rotationSteps: canonicalRotations });
          }
          failureReasons.add(timerDeadlineFailed2(result) ? "TIMER_EXPIRED" : "REPLAY_NOT_WON");
          const recalculated = recalculatedOuterValues2(candidate, result, range, useSignedCalibration);
          if (!recalculated) {
            failureReasons.add("VALUES_OUT_OF_RANGE_OR_NON_INTEGER");
            break;
          }
          if (recalculated.every((value, index) => value === outerValues[index])) {
            failureReasons.add("VALUES_NO_LONGER_CHANGE");
            break;
          }
          outerValues = recalculated;
        }
      }
      return withStats(level, false);
    };
    applyProgressionEffects2 = (mode, level, configuration) => regenerateEffectAwareLevel2(level, configuration ?? explicitEffectConfigurationForLevel2(level.number) ?? createProgressionEffectConfiguration2(mode, level.number, level.positions, level.generation?.seed ?? level.number));
    effectAwareVariant2 = (number, mode, build) => {
      const startedAt = performance.now();
      const attempts = rdnEffectRuleForLevel2(number).structureAttemptsBeforeScaling;
      const solutionAttemptsBeforeScaling = rdnEffectRuleForLevel2(number).solutionAttemptsBeforeScaling;
      const first = build(0);
      const explicitConfiguration = explicitEffectConfigurationForLevel2(number);
      const requestedConfiguration = explicitConfiguration ?? createProgressionEffectConfiguration2(mode, number, first.positions, number);
      if (!requestedConfiguration?.enabled) return first;
      let last = first;
      let totalSolutionAttempts = 0;
      let totalStructureAttempts = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const stages = effectConfigurationStages2(requestedConfiguration, first.positions);
      for (const stage of stages) {
        for (const configuration of stage) {
          for (const positionedConfiguration of effectPlacementVariants(configuration, first.positions, explicitConfiguration !== void 0)) {
            for (let variation = 0; variation < attempts; variation += 1) {
              totalStructureAttempts += 1;
              const candidate = applyProgressionEffects2(mode, variation === 0 ? first : build(variation), positionedConfiguration);
              last = candidate;
              const stats2 = candidate.generation?.generationStats;
              totalSolutionAttempts += stats2?.solutionAttempts ?? stats2?.calibrationAttempts ?? 0;
              (stats2?.failureReasons ?? []).forEach((reason) => failureReasons.add(reason));
              if ((stats2?.failureReasons ?? []).includes("NO_VALID_EFFECT_CONFIGURATION")) continue;
              const replay = replaySolution2(candidate);
              if (replay.won && !timerDeadlineFailed2(replay)) {
                return { ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts, calibrationAttempts: totalSolutionAttempts, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats2?.totalComplexity ?? (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons] } } : candidate.generation };
              }
            }
          }
        }
      }
      if (number >= 10) throw new Error(`RDN ${mode} level ${number}: no valid effect-aware structure after ${totalStructureAttempts} attempts.`);
      const stats = last.generation?.generationStats;
      return { ...last, generation: last.generation ? { ...last.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, calibrationAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats?.totalComplexity ?? (last.optimalCost?.impulses ?? 0) + (last.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons, "ALTERNATE_STRUCTURE_ATTEMPTS_EXHAUSTED"] } } : last.generation };
    };
    persistent2 = (number) => {
      return effectAwareVariant2(number, "adventure", (variation) => {
        const board = number === 1 ? tutorialBoard2() : generateBoard2(number, 17 + variation * 101);
        return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT2, generation: generatedMetadata2(number, board), adventure: adventureConfig2(number, board), ...board };
      });
    };
    loader2 = (number) => {
      return effectAwareVariant2(number, "time-attack", (variation) => {
        const board = number === 1 ? tutorialBoard2() : generateBoard2(number, 71 + variation * 101);
        return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT2, generation: generatedMetadata2(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      });
    };
    generateRdnLevelCatalogue2 = () => {
      const startedAt = performance.now();
      const total = RDN_MAX_LEVEL2 * 2;
      const levels2 = [];
      let completed = 0;
      let nextProgressLog = 5;
      const reportProgress = () => {
        const percentage = Math.floor(completed / total * 100);
        while (percentage >= nextProgressLog) {
          console.info(`[RDN] Generazione livelli: ${nextProgressLog}% (${completed}/${total})`);
          nextProgressLog += 5;
        }
      };
      console.info(`[RDN] Generazione livelli: 0% (0/${total})`);
      for (let number = 1; number <= RDN_MAX_LEVEL2; number += 1) {
        levels2.push(persistent2(number));
        completed += 1;
        reportProgress();
      }
      for (let number = 1; number <= RDN_MAX_LEVEL2; number += 1) {
        levels2.push(loader2(number));
        completed += 1;
        reportProgress();
      }
      console.info(`[RDN] Generazione completata: ${levels2.length} livelli in ${(performance.now() - startedAt).toFixed(1)} ms.`);
      return levels2;
    };
    catalogueGenerationRequested2 = globalThis.process?.env?.["RDN_GENERATE_CATALOGUE"] === "1";
    useGeneratedCatalogue2 = catalogueGenerationRequested2;
    removeDuplicateSignedGearValues2 = (level) => {
      if (level.variant !== "persistent") return level;
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const innerValues = level.innerValues.map((operator) => {
        if (typeof operator !== "number") return operator;
        const used = operator < 0 ? usedNegative : usedPositive;
        const sign = operator < 0 ? -1 : 1;
        let magnitude = Math.abs(operator);
        while (used.has(magnitude)) magnitude = magnitude % RDN_MAX_GEAR_OPERATOR_MAGNITUDE + 1;
        used.add(magnitude);
        return sign * magnitude;
      });
      return innerValues.every((value, index) => value === level.innerValues[index]) ? level : { ...level, innerValues };
    };
    upgradeLegacyTutorial2 = (level) => {
      if (level.number !== 1) return level;
      const board = tutorialBoard2();
      return level.variant === "persistent" ? { ...level, ...board, innerValues: board.innerValues } : { ...level, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
    };
    prepareRdnCatalogueLevel2 = (level) => removeDuplicateSignedGearValues2(upgradeLegacyTutorial2(level));
    RDN_LEVELS2 = useGeneratedCatalogue2 ? generateRdnLevelCatalogue2().map(prepareRdnCatalogueLevel2) : [];
    getRdnLevel2 = (variant, number = 1) => {
      const level = RDN_LEVELS2.find((item) => item.variant === (variant === "adventure" ? "persistent" : "loader") && item.number === number);
      if (!level) throw new Error("Il catalogo RDN non \xC3\xA8 caricato. Usa RdnCatalogueService.");
      return level;
    };
    generateRdnPuzzle2 = (variant, difficulty, seed, slotCount, freeEffectsEnabled = false) => {
      const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
      const board = generateBoard2(number, Math.trunc(seed), slotCount, true, true);
      const activeFlowCount = freeActiveFlowCount2(difficulty);
      const generation = { ...generatedMetadata2(number, board, difficulty, activeFlowCount), seed: board.seed, difficulty };
      const level = variant === "adventure" ? { id: `seeded-persistent-${generation.seed}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount, generation, adventure: adventureConfig2(number, board), ...board } : { id: `seeded-loader-${generation.seed}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount, generation, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      return regenerateEffectAwareLevel2(level, createFreeModeEffectConfiguration2(difficulty, level.positions, generation.seed, freeEffectsEnabled));
    };
    applySolutionOperator2 = (value, operator) => operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator;
    verifiesSolution2 = (level) => {
      if (level.effectConfiguration?.enabled) {
        const state = replaySolution2(level);
        return state.won && !timerDeadlineFailed2(state);
      }
      const solution = level.solution ?? [];
      const moves = level.solutionMoves ?? [];
      const requiredMoves = level.slotPhases.reduce((total, phase) => total + phase.length, 0);
      if (solution.length !== level.positions || moves.length !== requiredMoves) return false;
      const values = solution.map((slot) => slot.startValue);
      const cursors = Array(level.positions).fill(0);
      const queueCursors = Array(level.positions).fill(0);
      for (const move of moves) {
        const innerIndex = modulo3(move.outerIndex - move.rotation, level.positions);
        const operator = level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][queueCursors[innerIndex]++];
        if (operator !== move.operator || solution[move.outerIndex].operators[cursors[move.outerIndex]] !== move.operator) return false;
        values[move.outerIndex] = applySolutionOperator2(values[move.outerIndex], move.operator);
        cursors[move.outerIndex] += 1;
      }
      return values.every((value) => value === 0) && cursors.every((cursor, index) => cursor === solution[index].operators.length);
    };
    RDN_SOLUTION_TABLE2 = RDN_LEVELS2.map((level) => {
      const effectResolution = new LevelEffectConfigResolver().resolve(level.effectConfiguration, level.positions);
      const simulation = replaySolutionWithTrace2(level);
      return { level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], execution: simulation.execution, effects: effectResolution.effects, finalValues: simulation.state.outerValues, verified: effectResolution.issues.length === 0 && simulation.state.won && !timerDeadlineFailed2(simulation.state) && verifiesSolution2(level) };
    });
    getRdnSolutionTable2 = (variant) => RDN_SOLUTION_TABLE2.filter((row) => row.variant === variant);
    validateAdventureLevelBatch2 = () => {
      const engine = new PuzzleEngine();
      return RDN_LEVELS2.filter((level) => level.variant === "persistent").map((level) => {
        let state = engine.createInitialState(level);
        for (const move of level.solutionMoves ?? []) {
          const delta = modulo3(move.rotation - state.rotation, level.positions);
          if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
          state = engine.apply(level, state, { type: "IMPULSE" });
        }
        return { level: level.number, valid: state.won && !timerDeadlineFailed2(state) };
      });
    };
    if (!useGeneratedCatalogue2) {
      if (RDN_SOLUTION_TABLE2.some((row) => !row.verified)) throw new Error("Invalid RDN solution table");
      if (validateAdventureLevelBatch2().some((row) => !row.valid)) throw new Error("Invalid Adventure level batch");
    }
  }
});

// src/app/core/game/phaser/catalogues/v005/catalogue.contract.ts
var catalogue_contract_exports2 = {};
__export(catalogue_contract_exports2, {
  RDN_CATALOGUE_CONTRACT: () => RDN_CATALOGUE_CONTRACT2
});
var RDN_CATALOGUE_CONTRACT2;
var init_catalogue_contract2 = __esm({
  "src/app/core/game/phaser/catalogues/v005/catalogue.contract.ts"() {
    "use strict";
    init_rdn_release_config2();
    RDN_CATALOGUE_CONTRACT2 = {
      version: "v005",
      levelSchemaVersion: 1,
      generatorVersion: RDN_RELEASE2.generatorVersion
    };
  }
});

// src/app/core/game/phaser/catalogues/v006/rdn-release.config.ts
var RDN_RELEASE3;
var init_rdn_release_config3 = __esm({
  "src/app/core/game/phaser/catalogues/v006/rdn-release.config.ts"() {
    "use strict";
    RDN_RELEASE3 = {
      telemetrySchemaVersion: 1,
      generatorVersion: "rdn-generator-v2",
      balanceVersion: "rdn-balance-v1",
      saveSchemaVersion: 2
    };
  }
});

// src/app/core/game/phaser/catalogues/v006/levels.config.ts
var RDN_MAX_LEVEL3, RDN_MIN_SPHERES3, RDN_MAX_SPHERES3, RDN_MAX_TIMER_DIRECT_IMPULSES3, RDN_MAX_OPERATIONS_PER_SPHERE2, RDN_MAX_GEAR_OPERATOR_MAGNITUDE2, RDN_MAX_SPECIAL_OPERATORS2, RDN_MAX_AREA_EFFECTS_PER_BOARD2, RDN_LEVELS_PER_SPHERE_INCREMENT3, rdnSphereCountForLevel3;
var init_levels_config3 = __esm({
  "src/app/core/game/phaser/catalogues/v006/levels.config.ts"() {
    "use strict";
    RDN_MAX_LEVEL3 = 350;
    RDN_MIN_SPHERES3 = 4;
    RDN_MAX_SPHERES3 = 8;
    RDN_MAX_TIMER_DIRECT_IMPULSES3 = 15;
    RDN_MAX_OPERATIONS_PER_SPHERE2 = 15;
    RDN_MAX_GEAR_OPERATOR_MAGNITUDE2 = 15;
    RDN_MAX_SPECIAL_OPERATORS2 = 2;
    RDN_MAX_AREA_EFFECTS_PER_BOARD2 = 2;
    RDN_LEVELS_PER_SPHERE_INCREMENT3 = Math.ceil(RDN_MAX_LEVEL3 / (RDN_MAX_SPHERES3 - RDN_MIN_SPHERES3 + 1));
    rdnSphereCountForLevel3 = (number) => {
      const band = Math.min(RDN_MAX_SPHERES3 - RDN_MIN_SPHERES3, Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT3));
      return RDN_MIN_SPHERES3 + band;
    };
  }
});

// src/app/core/game/phaser/catalogues/v006/progression-rules.config.ts
var RDN_PROGRESSION_RULES3, RDN_EFFECT_PROGRESSION_RULES3, RDN_EFFECT_CHECKPOINTS3, RDN_GEM_EFFECT_PRESETS3, RDN_LINK_EFFECT_PRESETS3, RDN_AREA_EFFECT_PRESETS3, RDN_EFFECT_FLOW_RULES3, RDN_SPECIAL_OPERATOR_CANDIDATES3, RDN_EFFECT_SIMPLIFICATIONS3, RDN_RISKY_GEM_EFFECT_REPLACEMENTS, RDN_GEM_EFFECT_FALLBACK_PRESETS2, rdnEffectRuleForLevel3, rdnProgressionRuleForSpheres3, rdnSpecialOperatorsForBoard3, rdnElementalAffinitiesForBoard, rdnLinkCountForBoard3, rdnMaximumLinksForSpheres3, rdnMaximumGemEffectsForSpheres3, rdnGemEffectCountForBoard3;
var init_progression_rules_config3 = __esm({
  "src/app/core/game/phaser/catalogues/v006/progression-rules.config.ts"() {
    "use strict";
    init_effects_models();
    init_levels_config3();
    RDN_PROGRESSION_RULES3 = [
      {
        minSpheres: 4,
        minGemEffects: 1,
        // I checkpoint didattici possono mostrare due effetti, ma le fasce base
        // restano limitate a uno tramite il loro `maxGemEffects`.
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        guaranteedElementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        fixedLinks: 0,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        // Nessun link generato a quattro sfere; uno resta disponibile per una lezione manuale.
        maxLinks: 1
      },
      {
        minSpheres: 5,
        minGemEffects: 2,
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        guaranteedElementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        fixedLinks: 0,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 1
      },
      {
        minSpheres: 6,
        minGemEffects: 2,
        maxGemEffects: 3,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        guaranteedElementals: 1,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        fixedLinks: 1,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 2
      },
      {
        minSpheres: 7,
        minGemEffects: 3,
        maxGemEffects: 4,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        guaranteedElementals: 1,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        fixedLinks: 2,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 3
      },
      {
        minSpheres: 8,
        minGemEffects: 4,
        maxGemEffects: 5,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        guaranteedElementals: 2,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        fixedLinks: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        maxLinks: 4
      }
    ];
    RDN_EFFECT_PROGRESSION_RULES3 = [
      { id: "LEGACY", minLevel: 1, maxLevel: 9, maxGemEffects: 0, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 0, structureAttemptsBeforeScaling: 0 },
      { id: "SHIELD", minLevel: 10, maxLevel: 19, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "WALL", minLevel: 20, maxLevel: 29, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "MIRROR", minLevel: 30, maxLevel: 34, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "AMPLIFY", minLevel: 35, maxLevel: 39, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "INVERTER", minLevel: 40, maxLevel: 44, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "ICE", minLevel: 45, maxLevel: 49, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "TIMER", minLevel: 50, maxLevel: 59, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "CORRUPTION", minLevel: 60, maxLevel: 69, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "LINKS", minLevel: 70, maxLevel: 79, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "AREA", minLevel: 80, maxLevel: 100, maxGemEffects: 2, maxAreaEffects: 1, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "STABLE", minLevel: 101, maxGemEffects: 5, maxAreaEffects: 2, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 }
    ];
    RDN_EFFECT_CHECKPOINTS3 = {
      15: { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      25: { enabled: true, effects: [{ preset: "WALL_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }] },
      35: { enabled: true, effects: [{ preset: "MIRROR_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }, { preset: "AMPLIFIER_X2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      45: { enabled: true, effects: [{ preset: "INVERTER_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "ICE_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }] },
      55: { enabled: true, effects: [{ preset: "TIMER_5", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "CORRUPTION_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }] },
      65: { enabled: true, effects: [{ preset: "TIMER_7", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "CORRUPTION_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }, { preset: "ECHO_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 0, toGemIndex: 2 }, overrides: { direction: "FORWARD" /* FORWARD */ } }] },
      75: { enabled: true, effects: [{ preset: "AMPLIFIER_X3", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "ICE_3", target: { type: "GEM" /* GEM */, gemIndex: 4 } }, { preset: "INVERT_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 1, toGemIndex: 3 }, overrides: { direction: "FORWARD" /* FORWARD */ } }, { preset: "BOMB_2", target: { type: "AREA" /* AREA */, sourceGemIndex: 2 } }] }
    };
    RDN_GEM_EFFECT_PRESETS3 = {
      LEGACY: [],
      SHIELD: ["SHIELD_1", "SHIELD_2", "SHIELD_3"],
      WALL: ["WALL_1"],
      MIRROR: ["MIRROR_1"],
      AMPLIFY: ["AMPLIFIER_X2", "AMPLIFIER_X3"],
      INVERTER: ["INVERTER_1"],
      ICE: ["ICE_1", "ICE_2", "ICE_3", "FIRE_1", "FIRE_2", "FIRE_3"],
      TIMER: ["TIMER_3", "TIMER_5", "TIMER_7", "TIMER_10"],
      CORRUPTION: ["CORRUPTION_1", "CORRUPTION_2"],
      LINKS: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "FIRE_1", "CORRUPTION_1"],
      AREA: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "FIRE_1", "CORRUPTION_1"],
      STABLE: [
        "SHIELD_1",
        "SHIELD_2",
        "SHIELD_3",
        "WALL_1",
        "WALL_2",
        "WALL_3",
        "WALL_4",
        "MIRROR_1",
        "AMPLIFIER_X2",
        "AMPLIFIER_X3",
        "INVERTER_1",
        "ICE_1",
        "ICE_2",
        "ICE_3",
        "FIRE_1",
        "FIRE_2",
        "FIRE_3",
        "TIMER_3",
        "TIMER_5",
        "TIMER_7",
        "TIMER_10",
        "CORRUPTION_1",
        "CORRUPTION_2"
      ]
    };
    RDN_LINK_EFFECT_PRESETS3 = ["ECHO_LINK", "DOUBLE_LINK", "INVERT_LINK", "CHAIN_LINK"];
    RDN_AREA_EFFECT_PRESETS3 = ["AREA_BOMB_MINUS_2", "AREA_BOMB_PLUS_2", "AREA_BOMB_MINUS_4", "AREA_BOMB_PLUS_4", "AREA_BOMB_MINUS_7", "AREA_BOMB_PLUS_7", "AREA_ICE_ADJACENT", "AREA_ICE_TWO_ADJACENT", "AREA_ICE_ALL", "AREA_INVERTER_ADJACENT", "AREA_INVERTER_TWO_ADJACENT", "AREA_INVERTER_ALL"];
    RDN_EFFECT_FLOW_RULES3 = { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: "SUM" /* SUM */ };
    RDN_SPECIAL_OPERATOR_CANDIDATES3 = ["zero", "invert", "divide2", "skip", "divide3"];
    RDN_EFFECT_SIMPLIFICATIONS3 = {
      SHIELD_3: "SHIELD_2",
      SHIELD_2: "SHIELD_1",
      WALL_4: "WALL_3",
      WALL_3: "WALL_2",
      WALL_2: "WALL_1",
      AMPLIFIER_X3: "AMPLIFIER_X2",
      ICE_3: "ICE_2",
      ICE_2: "ICE_1",
      FIRE_3: "FIRE_2",
      FIRE_2: "FIRE_1",
      TIMER_3: "TIMER_5",
      TIMER_5: "TIMER_7",
      TIMER_7: "TIMER_10",
      CORRUPTION_2: "CORRUPTION_1",
      DOUBLE_LINK: "ECHO_LINK",
      INVERT_LINK: "ECHO_LINK",
      BOMB_2: "BOMB_1",
      AREA_BOMB_MINUS_7: "AREA_BOMB_MINUS_4",
      AREA_BOMB_MINUS_4: "AREA_BOMB_MINUS_2",
      AREA_BOMB_PLUS_7: "AREA_BOMB_PLUS_4",
      AREA_BOMB_PLUS_4: "AREA_BOMB_PLUS_2",
      AREA_ICE_ALL: "AREA_ICE_TWO_ADJACENT",
      AREA_ICE_TWO_ADJACENT: "AREA_ICE_ADJACENT",
      AREA_INVERTER_ALL: "AREA_INVERTER_TWO_ADJACENT",
      AREA_INVERTER_TWO_ADJACENT: "AREA_INVERTER_ADJACENT"
    };
    RDN_RISKY_GEM_EFFECT_REPLACEMENTS = {
      TIMER_3: "WALL_1",
      TIMER_5: "WALL_1",
      TIMER_7: "WALL_1",
      TIMER_10: "WALL_1",
      CORRUPTION_1: "ICE_1",
      CORRUPTION_2: "ICE_1"
    };
    RDN_GEM_EFFECT_FALLBACK_PRESETS2 = ["SHIELD_1", "WALL_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "FIRE_1"];
    rdnEffectRuleForLevel3 = (level) => RDN_EFFECT_PROGRESSION_RULES3.find((rule) => level >= rule.minLevel && (rule.maxLevel === void 0 || level <= rule.maxLevel)) ?? RDN_EFFECT_PROGRESSION_RULES3[0];
    rdnProgressionRuleForSpheres3 = (spheres) => RDN_PROGRESSION_RULES3.reduce((active, rule) => spheres >= rule.minSpheres ? rule : active, RDN_PROGRESSION_RULES3[0]);
    rdnSpecialOperatorsForBoard3 = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres3(spheres);
      const key = Math.floor(level + variation);
      const optional = rule.optionalSpecialEvery > 0 && key % rule.optionalSpecialEvery === 0 ? rule.optionalSpecials : 0;
      const count = Math.min(spheres, RDN_MAX_SPECIAL_OPERATORS2, rule.guaranteedSpecials + optional);
      const start = (key % RDN_SPECIAL_OPERATOR_CANDIDATES3.length + RDN_SPECIAL_OPERATOR_CANDIDATES3.length) % RDN_SPECIAL_OPERATOR_CANDIDATES3.length;
      return Array.from({ length: count }, (_, index) => RDN_SPECIAL_OPERATOR_CANDIDATES3[(start + index) % RDN_SPECIAL_OPERATOR_CANDIDATES3.length]);
    };
    rdnElementalAffinitiesForBoard = (level, spheres, numericSlots, barrierTypes, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres3(spheres);
      const key = Math.floor(level + variation);
      const optional = rule.optionalElementalEvery > 0 && key % rule.optionalElementalEvery === 0 ? rule.optionalElementals : 0;
      const opposite = rule.ensureOppositeElementForWall ? [...new Set(barrierTypes.flatMap((type) => type === "FIRE" /* FIRE */ ? ["ice"] : type === "ICE" /* ICE */ ? ["fire"] : []))] : [];
      const count = Math.min(numericSlots, Math.max(rule.guaranteedElementals + optional, opposite.length));
      return Array.from({ length: count }, (_, index) => opposite[index] ?? ((key + index) % 2 === 0 ? "fire" : "ice"));
    };
    rdnLinkCountForBoard3 = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres3(spheres);
      const optional = rule.optionalLinkEvery > 0 && Math.floor(level + variation) % rule.optionalLinkEvery === 0 ? rule.optionalLinks : 0;
      return Math.min(rule.maxLinks, rule.fixedLinks + optional);
    };
    rdnMaximumLinksForSpheres3 = (spheres) => rdnProgressionRuleForSpheres3(spheres).maxLinks;
    rdnMaximumGemEffectsForSpheres3 = (spheres) => rdnProgressionRuleForSpheres3(spheres).maxGemEffects;
    rdnGemEffectCountForBoard3 = (key, spheres) => {
      const rule = rdnProgressionRuleForSpheres3(spheres);
      const range = rule.maxGemEffects - rule.minGemEffects + 1;
      return rule.minGemEffects + (range > 0 ? Math.abs(Math.floor(key)) % range : 0);
    };
  }
});

// src/app/core/game/phaser/catalogues/v006/effect-progression.config.ts
var positiveModulo3, pick3, resolveEffectProgressionTier3, shouldUseProgressionEffects3, explicitEffectConfigurationForLevel3, createProgressionEffectConfiguration3, createFreeModeEffectConfiguration3, validateEffectComplexity3;
var init_effect_progression_config3 = __esm({
  "src/app/core/game/phaser/catalogues/v006/effect-progression.config.ts"() {
    "use strict";
    init_effects_models();
    init_levels_config3();
    init_progression_rules_config3();
    positiveModulo3 = (value, length) => (value % length + length) % length;
    pick3 = (items, seed) => items[positiveModulo3(seed, items.length)];
    resolveEffectProgressionTier3 = rdnEffectRuleForLevel3;
    shouldUseProgressionEffects3 = (level) => level >= 10;
    explicitEffectConfigurationForLevel3 = (level) => RDN_EFFECT_CHECKPOINTS3[level];
    createProgressionEffectConfiguration3 = (mode, level, gemCount, seed = 0) => {
      if (gemCount < 4 || !shouldUseProgressionEffects3(level)) return void 0;
      const tier = resolveEffectProgressionTier3(level);
      const key = level * 37 + gemCount * 11 + seed + (mode === "time-attack" ? 7 : mode === "free" ? 13 : 0);
      const first = positiveModulo3(key, gemCount);
      const second = positiveModulo3(first + 2, gemCount);
      const source = positiveModulo3(first + 1, gemCount);
      const destination = positiveModulo3(source + 1, gemCount);
      const effects = [];
      const gemPresets = RDN_GEM_EFFECT_PRESETS3[tier.id];
      const gemEffectCount = tier.id === "LEGACY" ? 0 : Math.min(tier.maxGemEffects, rdnGemEffectCountForBoard3(key, gemCount));
      for (let index = 0; index < gemEffectCount; index += 1) {
        effects.push({ preset: pick3(gemPresets, key + index), target: { type: "GEM" /* GEM */, gemIndex: positiveModulo3(first + index, gemCount) } });
      }
      const linkCount = rdnLinkCountForBoard3(level, gemCount, mode === "free" ? seed : 0);
      const linkPresets = level >= 100 ? RDN_LINK_EFFECT_PRESETS3 : RDN_LINK_EFFECT_PRESETS3.filter((preset) => preset !== "CHAIN_LINK");
      for (let index = 0; index < linkCount; index += 1) {
        const fromGemIndex = positiveModulo3(source + index, gemCount);
        const toGemIndex = positiveModulo3(destination + index * 2, gemCount);
        effects.push({ preset: pick3(linkPresets, key + 2 + index), target: { type: "LINK" /* LINK */, fromGemIndex, toGemIndex: toGemIndex === fromGemIndex ? positiveModulo3(toGemIndex + 1, gemCount) : toGemIndex }, overrides: { direction: level >= 100 && (key + index) % 2 === 0 ? "BIDIRECTIONAL" /* BIDIRECTIONAL */ : "FORWARD" /* FORWARD */ } });
      }
      const areaEffectCount = Math.min(tier.maxAreaEffects, RDN_MAX_AREA_EFFECTS_PER_BOARD2);
      for (let index = 0; index < areaEffectCount; index += 1) effects.push({ preset: pick3(RDN_AREA_EFFECT_PRESETS3, key + 5 + index), target: { type: "AREA" /* AREA */, sourceGemIndex: positiveModulo3(second + index, gemCount) } });
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES3 } : void 0;
    };
    createFreeModeEffectConfiguration3 = (difficulty, gemCount, seed = 0, selections = false) => {
      const enabled = typeof selections === "boolean" ? { gem: selections, link: selections, area: selections } : selections;
      if (!enabled.gem && !enabled.link && !enabled.area) return void 0;
      const progressionLevel = difficulty === "EASY" ? 20 : difficulty === "NORMAL" ? 40 : difficulty === "HARD" ? 60 : 81;
      const effects = [
        ...enabled.gem ? createProgressionEffectConfiguration3("free", progressionLevel, gemCount, seed)?.effects?.filter((effect) => effect.target.type === "GEM" /* GEM */) ?? [] : [],
        ...enabled.link ? createProgressionEffectConfiguration3("free", Math.max(progressionLevel, 72), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "LINK" /* LINK */) ?? [] : [],
        ...enabled.area ? createProgressionEffectConfiguration3("free", Math.max(progressionLevel, 80), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "AREA" /* AREA */) ?? [] : []
      ];
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES3 } : void 0;
    };
    validateEffectComplexity3 = (configuration, label, spheres = 8) => {
      if (!configuration?.enabled) return [];
      const effects = configuration.effects ?? [];
      const gem = effects.filter((effect) => effect.target.type === "GEM" /* GEM */).length;
      const link = effects.filter((effect) => effect.target.type === "LINK" /* LINK */).length;
      const area = effects.filter((effect) => effect.target.type === "AREA" /* AREA */).length;
      const issues = [];
      const maximumGemEffects = rdnMaximumGemEffectsForSpheres3(spheres);
      if (gem > maximumGemEffects) issues.push(`${label}: GEM effect count = ${gem}, maximum allowed = ${maximumGemEffects}.`);
      const maximumLinks = rdnMaximumLinksForSpheres3(spheres);
      if (link > maximumLinks) issues.push(`${label}: LINK effect count = ${link}, maximum allowed = ${maximumLinks}.`);
      if (area > RDN_MAX_AREA_EFFECTS_PER_BOARD2) issues.push(`${label}: AREA effect count = ${area}, maximum allowed = ${RDN_MAX_AREA_EFFECTS_PER_BOARD2}.`);
      return issues;
    };
  }
});

// src/app/core/game/phaser/catalogues/v006/catalog.builder.ts
var catalog_builder_exports3 = {};
__export(catalog_builder_exports3, {
  RDN_LEVELS: () => RDN_LEVELS3,
  RDN_SOLUTION_TABLE: () => RDN_SOLUTION_TABLE3,
  generateRdnPuzzle: () => generateRdnPuzzle3,
  getRdnLevel: () => getRdnLevel3,
  getRdnSolutionTable: () => getRdnSolutionTable3,
  prepareRdnCatalogueLevel: () => prepareRdnCatalogueLevel3,
  validateAdventureLevelBatch: () => validateAdventureLevelBatch3
});
var DEFAULT_ACTIVE_FLOW_COUNT3, freeActiveFlowCount3, modulo4, random3, impulsesPerValue3, rotationDistance3, specialOperatorsForLevel3, gearOperators3, additiveOperators3, balancedPlanSigns3, subtractivePlan3, planForValue3, generateBoard3, tutorialBoard3, generatedMetadata3, adventureConfig3, replaySolutionWithTrace3, replaySolution3, withCalibratedTimerDeadlines3, timerDeadlineFailed3, lastIndexFor3, withRotatedEffectTargets2, effectPlacementVariants2, effectConfigurationStages3, timerPlacementIsCompatible3, buildEffectCandidate3, withElementalOperators, needsSignedValueCalibration3, recalculatedOuterValues3, regenerateEffectAwareLevel3, applyProgressionEffects3, effectAwareVariant3, persistent3, loader3, generateRdnLevelCatalogue3, catalogueGenerationRequested3, useGeneratedCatalogue3, removeDuplicateSignedGearValues3, upgradeLegacyTutorial3, prepareRdnCatalogueLevel3, RDN_LEVELS3, getRdnLevel3, generateRdnPuzzle3, applySolutionOperator3, verifiesSolution3, RDN_SOLUTION_TABLE3, getRdnSolutionTable3, validateAdventureLevelBatch3;
var init_catalog_builder3 = __esm({
  "src/app/core/game/phaser/catalogues/v006/catalog.builder.ts"() {
    "use strict";
    init_puzzle_types();
    init_puzzle_engine();
    init_level_effect_config_resolver();
    init_effects_models();
    init_rdn_release_config3();
    init_effect_progression_config3();
    init_progression_rules_config3();
    init_levels_config3();
    DEFAULT_ACTIVE_FLOW_COUNT3 = 1;
    freeActiveFlowCount3 = (difficulty) => difficulty === "EASY" ? 1 : difficulty === "NORMAL" ? 2 : difficulty === "HARD" ? 3 : 4;
    modulo4 = (value, length) => (value % length + length) % length;
    random3 = (seed) => {
      let state = seed >>> 0;
      return () => {
        state = state * 1664525 + 1013904223 >>> 0;
        return state / 4294967296;
      };
    };
    impulsesPerValue3 = (number) => number <= 3 ? 1 : Math.min(RDN_MAX_OPERATIONS_PER_SPHERE2, 2 + Math.floor((number - 4) / 20));
    rotationDistance3 = (from, to, positions) => Math.min(modulo4(to - from, positions), modulo4(from - to, positions));
    specialOperatorsForLevel3 = (level, positions, variation = 0) => {
      return [...rdnSpecialOperatorsForBoard3(level, positions, variation)];
    };
    gearOperators3 = (positions, specialOperators, next, allowDuplicateSignedValues = false) => {
      const subtractorCount = positions - specialOperators.length;
      if (!allowDuplicateSignedValues && RDN_MAX_GEAR_OPERATOR_MAGNITUDE2 < Math.ceil(subtractorCount / 2)) {
        throw new Error(`RDN_MAX_GEAR_OPERATOR_MAGNITUDE=${RDN_MAX_GEAR_OPERATOR_MAGNITUDE2} non consente ${subtractorCount} operatori numerici univoci per segno.`);
      }
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const magnitudes = Array.from({ length: subtractorCount }, (_, index) => {
        const used = index % 2 === 0 ? usedNegative : usedPositive;
        let value = 1 + Math.floor(next() * RDN_MAX_GEAR_OPERATOR_MAGNITUDE2);
        if (!allowDuplicateSignedValues) while (used.has(value)) value = value % RDN_MAX_GEAR_OPERATOR_MAGNITUDE2 + 1;
        used.add(value);
        return value;
      });
      return [...magnitudes.map((value, index) => index % 2 === 0 ? -value : value), ...specialOperators];
    };
    additiveOperators3 = (operators) => operators.filter((operator) => typeof operator === "number" && operator !== 0);
    balancedPlanSigns3 = (plans) => {
      const counts = plans.map((plan) => plan.operators.filter((operator) => typeof operator === "number").length);
      const total = counts.reduce((sum, count) => sum + count, 0);
      const reachable = Array(total + 1).fill(void 0);
      reachable[0] = [];
      counts.forEach((count, index) => {
        for (let sum = total - count; sum >= 0; sum -= 1) if (reachable[sum] && !reachable[sum + count]) reachable[sum + count] = [...reachable[sum], index];
      });
      let selectedSum = 0;
      for (let sum = 0; sum <= total; sum += 1) if (reachable[sum] && Math.abs(total - sum * 2) < Math.abs(total - selectedSum * 2)) selectedSum = sum;
      const positivePlans = new Set(reachable[selectedSum]);
      return plans.map((_, index) => positivePlans.has(index));
    };
    subtractivePlan3 = (count, available, next, maximumStart = 20) => {
      if (!available.length) throw new Error("RDN generator requires at least one compatible numeric operator");
      const minimumMagnitude = Math.min(...available.map((value) => Math.abs(value)));
      const safeCount = Math.max(1, Math.min(count, Math.floor(maximumStart / minimumMagnitude)));
      const values = [];
      let total = 0;
      for (let index = 0; index < safeCount; index += 1) {
        const remaining = safeCount - index - 1;
        const candidates = available.filter((value) => total + Math.abs(value) + remaining * minimumMagnitude <= maximumStart);
        const selected = candidates[Math.floor(next() * candidates.length)] ?? available[0];
        values.push(selected);
        total += Math.abs(selected);
      }
      return { start: total * (values[0] < 0 ? 1 : -1), operators: values };
    };
    planForValue3 = (impulses, available, next, maximumStart, forcedOperator) => {
      if (forcedOperator === "divide2" || forcedOperator === "divide3") {
        const divisor = forcedOperator === "divide2" ? 2 : 3;
        const tail = subtractivePlan3(impulses - 1, available, next, Math.floor(maximumStart / divisor));
        return { start: tail.start * divisor, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "zero") {
        const magnitude = 1 + Math.floor(next() * Math.max(1, maximumStart));
        return { start: next() < 0.5 ? -magnitude : magnitude, operators: [forcedOperator] };
      }
      if (forcedOperator === "invert") {
        const tail = subtractivePlan3(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: -tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "skip") {
        const tail = subtractivePlan3(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      return subtractivePlan3(impulses, available, next, maximumStart);
    };
    generateBoard3 = (number, seedOffset, slotCount, balanceQueueSigns = false, allowDuplicateSignedGearValues = false) => {
      const positions = slotCount && slotCount >= RDN_MIN_SPHERES3 && slotCount <= RDN_MAX_SPHERES3 ? slotCount : rdnSphereCountForLevel3(number);
      const impulses = impulsesPerValue3(number);
      const seed = number * 977 + seedOffset;
      const next = random3(seed);
      const specialOperators = specialOperatorsForLevel3(number, positions, seedOffset);
      const innerValues = gearOperators3(positions, specialOperators, next, allowDuplicateSignedGearValues);
      const allAdditives = additiveOperators3(innerValues);
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const maximumStart = Math.min(Math.abs(range.min), Math.abs(range.max));
      const planForIndex = (index, positive) => planForValue3(impulses, allAdditives.filter((operator) => positive ? operator > 0 : operator < 0), next, maximumStart, specialOperators[index]);
      const provisionalPlans = Array.from({ length: positions }, (_, index) => planForIndex(index, index % 2 !== 0));
      const planSigns = balanceQueueSigns ? balancedPlanSigns3(provisionalPlans) : provisionalPlans.map((_, index) => index % 2 !== 0);
      const plans = balanceQueueSigns ? Array.from({ length: positions }, (_, index) => planForIndex(index, planSigns[index])) : provisionalPlans;
      const loaderQueues = Array.from({ length: positions }, () => []);
      const cursors = Array(positions).fill(0);
      const rotations = [];
      const slotPhases = [];
      const solutionMoves = [];
      while (cursors.some((cursor, outerIndex) => cursor < plans[outerIndex].operators.length)) {
        const candidates = plans.map((plan, outerIndex2) => cursors[outerIndex2] < plan.operators.length ? outerIndex2 : -1).filter((outerIndex2) => outerIndex2 >= 0);
        const outerIndex = candidates[Math.floor(next() * candidates.length)];
        const operator = plans[outerIndex].operators[cursors[outerIndex]];
        const innerIndex = innerValues.findIndex((value) => value === operator);
        loaderQueues[innerIndex].push(operator);
        const rotation = modulo4(outerIndex - innerIndex, positions);
        rotations.push(rotation);
        slotPhases.push([{ outerIndex }]);
        solutionMoves.push({ outerIndex, rotation, operator });
        cursors[outerIndex] += 1;
      }
      const initialRotation = modulo4(rotations[0] + 1 + Math.floor(next() * Math.max(1, positions - 1)), positions);
      let previousRotation = initialRotation;
      let rotationSteps = 0;
      for (const rotation of rotations) {
        rotationSteps += rotationDistance3(previousRotation, rotation, positions);
        previousRotation = rotation;
      }
      return { positions, initialRotation, innerValues, loaderQueues, outerValues: plans.map((plan) => plan.start), slotPhases, optimalCost: { impulses: slotPhases.length, rotationSteps }, solution: plans.map((plan) => ({ startValue: plan.start, operators: [...plan.operators] })), solutionMoves, seed };
    };
    tutorialBoard3 = () => {
      const operators = [-1, -2, -3, -4];
      const values = operators.map((operator) => -operator);
      return { positions: 4, initialRotation: 0, innerValues: [...operators], loaderQueues: operators.map((operator) => [operator]), outerValues: values, slotPhases: [[{ outerIndex: 0 }], [{ outerIndex: 1 }], [{ outerIndex: 2 }], [{ outerIndex: 3 }]], optimalCost: { impulses: 4, rotationSteps: 0 }, solution: operators.map((operator, index) => ({ startValue: values[index], operators: [operator] })), solutionMoves: operators.map((operator, outerIndex) => ({ outerIndex, rotation: 0, operator })), seed: 0 };
    };
    generatedMetadata3 = (number, board, difficulty = "EASY", activeFlowCount = DEFAULT_ACTIVE_FLOW_COUNT3) => ({ seed: board.seed, generatorVersion: RDN_RELEASE3.generatorVersion, balanceVersion: RDN_RELEASE3.balanceVersion, difficulty, estimatedMinimumSolutionLength: board.optimalCost.impulses, specialOperators: board.innerValues.filter((operator) => typeof operator !== "number"), officialSolutionImpulses: board.optimalCost.impulses, officialSolutionRotationSteps: board.optimalCost.rotationSteps, branchingFactor: activeFlowCount, featureFlags: [] });
    adventureConfig3 = (number, board) => ({
      version: 1,
      seed: board.seed,
      levelVersion: "rdn-adventure-v1",
      objectives: { targetValues: [...board.outerValues], requireAllTargetsZero: true },
      enabledMechanics: ["fixed-operators", "special-inventory", "rotation", "impulse"],
      specialInventory: {
        divide2: board.innerValues.filter((operator) => operator === "divide2").length,
        divide3: board.innerValues.filter((operator) => operator === "divide3").length,
        zero: board.innerValues.filter((operator) => operator === "zero").length,
        invert: board.innerValues.filter((operator) => operator === "invert").length,
        skip: board.innerValues.filter((operator) => operator === "skip").length
      }
    });
    replaySolutionWithTrace3 = (level) => {
      const engine = new PuzzleEngine();
      let state = engine.createInitialState(level);
      const execution = [];
      for (const move of level.solutionMoves ?? []) {
        const delta = modulo4(move.rotation - state.rotation, level.positions);
        if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
        const plan = engine.planImpulse(level, state);
        const linkedTargets = new Set(plan.impacts.filter((impact) => impact.linkId).map((impact) => impact.targetId));
        const changedTargets = new Set(plan.impacts.map((impact) => impact.targetId));
        execution.push({
          move,
          updates: [...changedTargets].map((outerIndex) => ({ outerIndex, value: plan.finalValues[outerIndex], viaLink: linkedTargets.has(outerIndex) }))
        });
        state = engine.apply(level, state, { type: "IMPULSE" });
      }
      return { state, execution };
    };
    replaySolution3 = (level) => replaySolutionWithTrace3(level).state;
    withCalibratedTimerDeadlines3 = (level, configuration) => {
      if (!configuration.effects?.length || configuration.sets?.length) return configuration;
      const effects = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects;
      const deadlines = /* @__PURE__ */ new Map();
      effects.forEach((effect, index) => {
        if (effect.config.type !== "TIMER" /* TIMER */) return;
        const target = effect.target;
        if (target.type !== "GEM" /* GEM */) return;
        const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === target.gem.index).length;
        if (directImpulses > RDN_MAX_TIMER_DIRECT_IMPULSES3) return;
        deadlines.set(index, Math.max(effect.config.turns, directImpulses));
      });
      return {
        ...configuration,
        effects: configuration.effects.map((assignment, index) => {
          const deadline = deadlines.get(index);
          return deadline === void 0 ? assignment : { ...assignment, overrides: { ...assignment.overrides, turns: deadline } };
        })
      };
    };
    timerDeadlineFailed3 = (state) => (state.effectRuntime?.expiredTimerIds.length ?? 0) > 0;
    lastIndexFor3 = (effects, scope) => {
      for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index].target.type === scope) return index;
      return -1;
    };
    withRotatedEffectTargets2 = (configuration, positions, offset) => {
      const rotate = (index) => modulo4(index + offset, positions);
      return {
        ...configuration,
        effects: configuration.effects?.map((effect) => {
          if (effect.target.type === "GEM" /* GEM */) return { ...effect, target: { ...effect.target, gemIndex: rotate(effect.target.gemIndex) } };
          if (effect.target.type === "LINK" /* LINK */) return { ...effect, target: { ...effect.target, fromGemIndex: rotate(effect.target.fromGemIndex), toGemIndex: rotate(effect.target.toGemIndex) } };
          return { ...effect, target: { ...effect.target, sourceGemIndex: rotate(effect.target.sourceGemIndex) } };
        })
      };
    };
    effectPlacementVariants2 = (configuration, positions, preserveTargets) => {
      if (preserveTargets || positions < 2) return [configuration];
      return Array.from({ length: positions }, (_, offset) => withRotatedEffectTargets2(configuration, positions, offset));
    };
    effectConfigurationStages3 = (configuration, spheres) => {
      const effects = [...configuration.effects ?? []];
      const risk = (effect) => {
        if (effect.preset.startsWith("TIMER_")) return 0;
        if (effect.preset.startsWith("CORRUPTION_")) return 1;
        if (effect.target.type === "AREA" /* AREA */ && (effect.preset.includes("_7") || effect.preset.endsWith("_ALL"))) return 2;
        if (effect.target.type === "LINK" /* LINK */ && effect.preset !== "ECHO_LINK") return 3;
        if (effect.target.type === "AREA" /* AREA */) return 4;
        if (effect.preset === "AMPLIFIER_X3" || effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1") return 5;
        return 6;
      };
      const soften = (items) => {
        const candidate = items.map((effect, index) => ({ effect, index })).filter(({ effect }) => RDN_EFFECT_SIMPLIFICATIONS3[effect.preset] !== void 0).sort((left, right) => risk(left.effect) - risk(right.effect) || left.index - right.index)[0];
        if (!candidate) return [...items];
        const preset = RDN_EFFECT_SIMPLIFICATIONS3[candidate.effect.preset];
        if (!preset) return [...items];
        return items.map((effect, index) => index !== candidate.index ? effect : { ...effect, preset, overrides: effect.target.type === "LINK" /* LINK */ ? { ...effect.overrides, direction: "FORWARD" /* FORWARD */ } : void 0 });
      };
      const scaled = [];
      let scaledEffects = [...effects];
      while (true) {
        const next = soften(scaledEffects);
        if (next.every((effect, index) => effect.preset === scaledEffects[index].preset && effect.overrides === scaledEffects[index].overrides)) break;
        scaledEffects = next;
        scaled.push({ ...configuration, effects: scaledEffects });
      }
      const stabilizedEffects = scaledEffects.map((effect) => {
        const preset = RDN_RISKY_GEM_EFFECT_REPLACEMENTS[effect.preset];
        return preset ? { ...effect, preset, overrides: void 0 } : effect;
      });
      const stabilized = stabilizedEffects.some((effect, index) => effect.preset !== scaledEffects[index].preset) ? [{ ...configuration, effects: stabilizedEffects }] : [];
      const optional = [];
      let reduced = [...stabilizedEffects];
      const fixedLinks = rdnProgressionRuleForSpheres3(spheres).fixedLinks;
      while (reduced.filter((effect) => effect.target.type === "LINK" /* LINK */).length > fixedLinks) {
        reduced = reduced.filter((_, index) => index !== lastIndexFor3(reduced, "LINK" /* LINK */));
        optional.push({ ...configuration, effects: reduced });
      }
      const emergency = [];
      const withoutArea = reduced.filter((effect) => effect.target.type !== "AREA" /* AREA */);
      if (withoutArea.length !== reduced.length) emergency.push({ ...configuration, effects: withoutArea });
      const gemOnly = withoutArea.filter((effect) => effect.target.type !== "LINK" /* LINK */);
      if (gemOnly.length !== withoutArea.length) emergency.push({ ...configuration, effects: gemOnly });
      const minimumGems = rdnProgressionRuleForSpheres3(spheres).minGemEffects;
      let minimum = gemOnly;
      while (minimum.filter((effect) => effect.target.type === "GEM" /* GEM */).length > minimumGems) minimum = minimum.filter((_, index) => index !== lastIndexFor3(minimum, "GEM" /* GEM */));
      const final = RDN_GEM_EFFECT_FALLBACK_PRESETS2.map((preset) => ({ ...configuration, effects: minimum.map((effect) => effect.target.type === "GEM" /* GEM */ ? { ...effect, preset, overrides: void 0 } : effect) }));
      return [[configuration], scaled, stabilized, optional, emergency, final];
    };
    timerPlacementIsCompatible3 = (level, configuration) => (configuration.effects ?? []).every((effect) => {
      if (!effect.preset.startsWith("TIMER_") || effect.target.type !== "GEM" /* GEM */) return true;
      const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === effect.target.gemIndex).length;
      return directImpulses <= RDN_MAX_TIMER_DIRECT_IMPULSES3;
    });
    buildEffectCandidate3 = (level, outerValues, effectConfiguration) => ({ ...level, outerValues: [...outerValues], solution: level.solution?.map((slot, index) => ({ ...slot, startValue: outerValues[index] })), effectConfiguration });
    withElementalOperators = (level, configuration, variation = 0) => {
      const barriers = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects.flatMap((effect) => effect.config.scope === "GEM" /* GEM */ && (effect.config.type === "FIRE" /* FIRE */ || effect.config.type === "ICE" /* ICE */) ? [effect.config.type] : []);
      const numericSlots = level.variant === "persistent" ? level.innerValues.map((operator, index) => typeof operator === "number" ? index : -1).filter((index) => index >= 0) : level.queues.map((queue, index) => queue.some((operator) => typeof operator === "number") ? index : -1).filter((index) => index >= 0);
      const affinities = rdnElementalAffinitiesForBoard(level.number, level.positions, numericSlots.length, barriers, variation);
      const bySlot = /* @__PURE__ */ new Map();
      numericSlots.forEach((slot, index) => {
        const affinity = affinities[index];
        if (affinity) bySlot.set(slot, affinity);
      });
      if (level.variant === "persistent") return { ...level, innerElements: level.innerValues.map((operator, index) => typeof operator === "number" ? bySlot.get(index) ?? null : null) };
      return { ...level, queueElements: level.queues.map((queue, index) => queue.map((operator) => typeof operator === "number" ? bySlot.get(index) ?? null : null)) };
    };
    needsSignedValueCalibration3 = (configuration) => (configuration.effects ?? []).some((effect) => effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1" || effect.preset === "CORRUPTION_1" || effect.preset === "CORRUPTION_2");
    recalculatedOuterValues3 = (candidate, result, range, useSignedCalibration) => {
      const recalculated = candidate.outerValues.map((value, index) => {
        if (!useSignedCalibration) return value - result.outerValues[index];
        const probeStep = value < range.max && value !== -1 ? 1 : value > range.min && value !== 1 ? -1 : 0;
        if (probeStep === 0) return value - result.outerValues[index];
        const probeValues = [...candidate.outerValues];
        probeValues[index] += probeStep;
        const probeResult = replaySolution3(buildEffectCandidate3(candidate, probeValues, candidate.effectConfiguration));
        const slope = (probeResult.outerValues[index] - result.outerValues[index]) / probeStep;
        const correction = slope === 0 ? -result.outerValues[index] : -result.outerValues[index] / slope;
        return value + correction;
      });
      return recalculated.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max) ? void 0 : recalculated;
    };
    regenerateEffectAwareLevel3 = (level, configuration) => {
      if (!configuration) return level;
      const startedAt = performance.now();
      let calibrationAttempts = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const solutionAttemptsBeforeScaling = rdnEffectRuleForLevel3(level.number).solutionAttemptsBeforeScaling;
      const structureAttemptsBeforeScaling = rdnEffectRuleForLevel3(level.number).structureAttemptsBeforeScaling;
      const withStats = (candidate, solved, officialSolution) => ({ ...candidate, generation: candidate.generation ? { ...candidate.generation, ...officialSolution ? { officialSolutionImpulses: officialSolution.impulses, officialSolutionRotationSteps: officialSolution.rotationSteps } : {}, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: 1, solutionAttempts: calibrationAttempts, calibrationAttempts, structureAttemptsBeforeScaling, solutionAttemptsBeforeScaling, totalComplexity: (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0) + (candidate.effectConfiguration?.effects?.length ?? 0) * 10, failureReasons: solved ? [...failureReasons] : [...failureReasons, "NO_VALID_EFFECT_CONFIGURATION"] } } : candidate.generation });
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const attemptsBeforeScaling = solutionAttemptsBeforeScaling;
      if (!timerPlacementIsCompatible3(level, configuration)) {
        failureReasons.add("TIMER_TARGET_TOO_MANY_DIRECT_IMPULSES");
        return withStats(level, false);
      }
      {
        const candidateConfiguration = withCalibratedTimerDeadlines3(level, configuration);
        if (!candidateConfiguration) {
          failureReasons.add("TIMER_DEADLINE_CALIBRATION_FAILED");
          return withStats(level, false);
        }
        const issues = validateEffectComplexity3(candidateConfiguration, `${level.variant} level ${level.number}`, level.positions);
        if (issues.length) {
          failureReasons.add("COMPLEXITY_INVALID");
          throw new Error(issues.join(" "));
        }
        let outerValues = [...level.outerValues];
        const useSignedCalibration = needsSignedValueCalibration3(candidateConfiguration);
        const seenValueVectors = /* @__PURE__ */ new Set();
        for (let attempt = 0; attempt < attemptsBeforeScaling; attempt += 1) {
          const valueVector = outerValues.join(",");
          if (seenValueVectors.has(valueVector)) {
            failureReasons.add("CALIBRATION_VALUE_CYCLE");
            break;
          }
          seenValueVectors.add(valueVector);
          calibrationAttempts += 1;
          const candidate = withElementalOperators(buildEffectCandidate3(level, outerValues, candidateConfiguration), candidateConfiguration);
          const result = replaySolution3(candidate);
          if (result.won && !timerDeadlineFailed3(result)) {
            const canonicalImpulses = result.impulses;
            const canonicalRotations = result.rotationSteps;
            return withStats({ ...candidate, starCost: { impulses: canonicalImpulses, rotationSteps: canonicalRotations } }, true, { impulses: canonicalImpulses, rotationSteps: canonicalRotations });
          }
          failureReasons.add(timerDeadlineFailed3(result) ? "TIMER_EXPIRED" : "REPLAY_NOT_WON");
          const recalculated = recalculatedOuterValues3(candidate, result, range, useSignedCalibration);
          if (!recalculated) {
            failureReasons.add("VALUES_OUT_OF_RANGE_OR_NON_INTEGER");
            break;
          }
          if (recalculated.every((value, index) => value === outerValues[index])) {
            failureReasons.add("VALUES_NO_LONGER_CHANGE");
            break;
          }
          outerValues = recalculated;
        }
      }
      return withStats(level, false);
    };
    applyProgressionEffects3 = (mode, level, configuration) => regenerateEffectAwareLevel3(level, configuration ?? explicitEffectConfigurationForLevel3(level.number) ?? createProgressionEffectConfiguration3(mode, level.number, level.positions, level.generation?.seed ?? level.number));
    effectAwareVariant3 = (number, mode, build) => {
      const startedAt = performance.now();
      const attempts = rdnEffectRuleForLevel3(number).structureAttemptsBeforeScaling;
      const solutionAttemptsBeforeScaling = rdnEffectRuleForLevel3(number).solutionAttemptsBeforeScaling;
      const first = build(0);
      const explicitConfiguration = explicitEffectConfigurationForLevel3(number);
      const requestedConfiguration = explicitConfiguration ?? createProgressionEffectConfiguration3(mode, number, first.positions, number);
      if (!requestedConfiguration?.enabled) return first;
      let last = first;
      let totalSolutionAttempts = 0;
      let totalStructureAttempts = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const stages = effectConfigurationStages3(requestedConfiguration, first.positions);
      for (const stage of stages) {
        for (const configuration of stage) {
          for (const positionedConfiguration of effectPlacementVariants2(configuration, first.positions, explicitConfiguration !== void 0)) {
            for (let variation = 0; variation < attempts; variation += 1) {
              totalStructureAttempts += 1;
              const candidate = applyProgressionEffects3(mode, variation === 0 ? first : build(variation), positionedConfiguration);
              last = candidate;
              const stats2 = candidate.generation?.generationStats;
              totalSolutionAttempts += stats2?.solutionAttempts ?? stats2?.calibrationAttempts ?? 0;
              (stats2?.failureReasons ?? []).forEach((reason) => failureReasons.add(reason));
              if ((stats2?.failureReasons ?? []).includes("NO_VALID_EFFECT_CONFIGURATION")) continue;
              const replay = replaySolution3(candidate);
              if (replay.won && !timerDeadlineFailed3(replay)) {
                return { ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts, calibrationAttempts: totalSolutionAttempts, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats2?.totalComplexity ?? (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons] } } : candidate.generation };
              }
            }
          }
        }
      }
      if (number >= 10) throw new Error(`RDN ${mode} level ${number}: no valid effect-aware structure after ${totalStructureAttempts} attempts.`);
      const stats = last.generation?.generationStats;
      return { ...last, generation: last.generation ? { ...last.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, calibrationAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats?.totalComplexity ?? (last.optimalCost?.impulses ?? 0) + (last.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons, "ALTERNATE_STRUCTURE_ATTEMPTS_EXHAUSTED"] } } : last.generation };
    };
    persistent3 = (number) => {
      return effectAwareVariant3(number, "adventure", (variation) => {
        const board = number === 1 ? tutorialBoard3() : generateBoard3(number, 17 + variation * 101);
        return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT3, generation: generatedMetadata3(number, board), adventure: adventureConfig3(number, board), ...board };
      });
    };
    loader3 = (number) => {
      return effectAwareVariant3(number, "time-attack", (variation) => {
        const board = number === 1 ? tutorialBoard3() : generateBoard3(number, 71 + variation * 101);
        return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT3, generation: generatedMetadata3(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      });
    };
    generateRdnLevelCatalogue3 = () => {
      const startedAt = performance.now();
      const total = RDN_MAX_LEVEL3 * 2;
      const levels2 = [];
      let completed = 0;
      let nextProgressLog = 5;
      const reportProgress = () => {
        const percentage = Math.floor(completed / total * 100);
        while (percentage >= nextProgressLog) {
          console.info(`[RDN] Generazione livelli: ${nextProgressLog}% (${completed}/${total})`);
          nextProgressLog += 5;
        }
      };
      console.info(`[RDN] Generazione livelli: 0% (0/${total})`);
      for (let number = 1; number <= RDN_MAX_LEVEL3; number += 1) {
        levels2.push(persistent3(number));
        completed += 1;
        reportProgress();
      }
      for (let number = 1; number <= RDN_MAX_LEVEL3; number += 1) {
        levels2.push(loader3(number));
        completed += 1;
        reportProgress();
      }
      console.info(`[RDN] Generazione completata: ${levels2.length} livelli in ${(performance.now() - startedAt).toFixed(1)} ms.`);
      return levels2;
    };
    catalogueGenerationRequested3 = globalThis.process?.env?.["RDN_GENERATE_CATALOGUE"] === "1";
    useGeneratedCatalogue3 = catalogueGenerationRequested3;
    removeDuplicateSignedGearValues3 = (level) => {
      if (level.variant !== "persistent") return level;
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const innerValues = level.innerValues.map((operator) => {
        if (typeof operator !== "number") return operator;
        const used = operator < 0 ? usedNegative : usedPositive;
        const sign = operator < 0 ? -1 : 1;
        let magnitude = Math.abs(operator);
        while (used.has(magnitude)) magnitude = magnitude % RDN_MAX_GEAR_OPERATOR_MAGNITUDE2 + 1;
        used.add(magnitude);
        return sign * magnitude;
      });
      return innerValues.every((value, index) => value === level.innerValues[index]) ? level : { ...level, innerValues };
    };
    upgradeLegacyTutorial3 = (level) => {
      if (level.number !== 1) return level;
      const board = tutorialBoard3();
      return level.variant === "persistent" ? { ...level, ...board, innerValues: board.innerValues } : { ...level, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
    };
    prepareRdnCatalogueLevel3 = (level) => removeDuplicateSignedGearValues3(upgradeLegacyTutorial3(level));
    RDN_LEVELS3 = useGeneratedCatalogue3 ? generateRdnLevelCatalogue3().map(prepareRdnCatalogueLevel3) : [];
    getRdnLevel3 = (variant, number = 1) => {
      const level = RDN_LEVELS3.find((item) => item.variant === (variant === "adventure" ? "persistent" : "loader") && item.number === number);
      if (!level) throw new Error("Il catalogo RDN non \xC3\xA8 caricato. Usa RdnCatalogueService.");
      return level;
    };
    generateRdnPuzzle3 = (variant, difficulty, seed, slotCount, freeEffectsEnabled = false) => {
      const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
      const board = generateBoard3(number, Math.trunc(seed), slotCount, true, true);
      const activeFlowCount = freeActiveFlowCount3(difficulty);
      const generation = { ...generatedMetadata3(number, board, difficulty, activeFlowCount), seed: board.seed, difficulty };
      const level = variant === "adventure" ? { id: `seeded-persistent-${generation.seed}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount, generation, adventure: adventureConfig3(number, board), ...board } : { id: `seeded-loader-${generation.seed}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount, generation, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      return regenerateEffectAwareLevel3(level, createFreeModeEffectConfiguration3(difficulty, level.positions, generation.seed, freeEffectsEnabled));
    };
    applySolutionOperator3 = (value, operator) => operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator;
    verifiesSolution3 = (level) => {
      if (level.effectConfiguration?.enabled) {
        const state = replaySolution3(level);
        return state.won && !timerDeadlineFailed3(state);
      }
      const solution = level.solution ?? [];
      const moves = level.solutionMoves ?? [];
      const requiredMoves = level.slotPhases.reduce((total, phase) => total + phase.length, 0);
      if (solution.length !== level.positions || moves.length !== requiredMoves) return false;
      const values = solution.map((slot) => slot.startValue);
      const cursors = Array(level.positions).fill(0);
      const queueCursors = Array(level.positions).fill(0);
      for (const move of moves) {
        const innerIndex = modulo4(move.outerIndex - move.rotation, level.positions);
        const operator = level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][queueCursors[innerIndex]++];
        if (operator !== move.operator || solution[move.outerIndex].operators[cursors[move.outerIndex]] !== move.operator) return false;
        values[move.outerIndex] = applySolutionOperator3(values[move.outerIndex], move.operator);
        cursors[move.outerIndex] += 1;
      }
      return values.every((value) => value === 0) && cursors.every((cursor, index) => cursor === solution[index].operators.length);
    };
    RDN_SOLUTION_TABLE3 = RDN_LEVELS3.map((level) => {
      const effectResolution = new LevelEffectConfigResolver().resolve(level.effectConfiguration, level.positions);
      const simulation = replaySolutionWithTrace3(level);
      return { level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], execution: simulation.execution, effects: effectResolution.effects, finalValues: simulation.state.outerValues, verified: effectResolution.issues.length === 0 && simulation.state.won && !timerDeadlineFailed3(simulation.state) && verifiesSolution3(level) };
    });
    getRdnSolutionTable3 = (variant) => RDN_SOLUTION_TABLE3.filter((row) => row.variant === variant);
    validateAdventureLevelBatch3 = () => {
      const engine = new PuzzleEngine();
      return RDN_LEVELS3.filter((level) => level.variant === "persistent").map((level) => {
        let state = engine.createInitialState(level);
        for (const move of level.solutionMoves ?? []) {
          const delta = modulo4(move.rotation - state.rotation, level.positions);
          if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
          state = engine.apply(level, state, { type: "IMPULSE" });
        }
        return { level: level.number, valid: state.won && !timerDeadlineFailed3(state) };
      });
    };
    if (!useGeneratedCatalogue3) {
      if (RDN_SOLUTION_TABLE3.some((row) => !row.verified)) throw new Error("Invalid RDN solution table");
      if (validateAdventureLevelBatch3().some((row) => !row.valid)) throw new Error("Invalid Adventure level batch");
    }
  }
});

// src/app/core/game/phaser/catalogues/v006/catalogue.contract.ts
var catalogue_contract_exports3 = {};
__export(catalogue_contract_exports3, {
  RDN_CATALOGUE_CONTRACT: () => RDN_CATALOGUE_CONTRACT3
});
var RDN_CATALOGUE_CONTRACT3;
var init_catalogue_contract3 = __esm({
  "src/app/core/game/phaser/catalogues/v006/catalogue.contract.ts"() {
    "use strict";
    init_rdn_release_config3();
    RDN_CATALOGUE_CONTRACT3 = {
      version: "v006",
      levelSchemaVersion: 1,
      generatorVersion: RDN_RELEASE3.generatorVersion
    };
  }
});

// src/app/core/game/phaser/catalogues/v007/rdn-release.config.ts
var RDN_RELEASE4;
var init_rdn_release_config4 = __esm({
  "src/app/core/game/phaser/catalogues/v007/rdn-release.config.ts"() {
    "use strict";
    RDN_RELEASE4 = {
      telemetrySchemaVersion: 1,
      generatorVersion: "rdn-generator-v2",
      balanceVersion: "rdn-balance-v1",
      saveSchemaVersion: 2
    };
  }
});

// src/app/core/game/phaser/catalogues/v007/levels.config.ts
var RDN_MAX_LEVEL4, RDN_MIN_SPHERES4, RDN_MAX_SPHERES4, RDN_MAX_TIMER_DIRECT_IMPULSES4, RDN_MAX_OPERATIONS_PER_SPHERE3, RDN_MAX_GEAR_OPERATOR_MAGNITUDE3, RDN_MAX_SPECIAL_OPERATORS3, RDN_MAX_AREA_EFFECTS_PER_BOARD3, RDN_LEVELS_PER_SPHERE_INCREMENT4, rdnSphereCountForLevel4;
var init_levels_config4 = __esm({
  "src/app/core/game/phaser/catalogues/v007/levels.config.ts"() {
    "use strict";
    RDN_MAX_LEVEL4 = 450;
    RDN_MIN_SPHERES4 = 4;
    RDN_MAX_SPHERES4 = 9;
    RDN_MAX_TIMER_DIRECT_IMPULSES4 = 15;
    RDN_MAX_OPERATIONS_PER_SPHERE3 = 15;
    RDN_MAX_GEAR_OPERATOR_MAGNITUDE3 = 15;
    RDN_MAX_SPECIAL_OPERATORS3 = 2;
    RDN_MAX_AREA_EFFECTS_PER_BOARD3 = 2;
    RDN_LEVELS_PER_SPHERE_INCREMENT4 = Math.ceil(RDN_MAX_LEVEL4 / (RDN_MAX_SPHERES4 - RDN_MIN_SPHERES4 + 1));
    rdnSphereCountForLevel4 = (number) => {
      const band = Math.min(RDN_MAX_SPHERES4 - RDN_MIN_SPHERES4, Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT4));
      return RDN_MIN_SPHERES4 + band;
    };
  }
});

// src/app/core/game/phaser/catalogues/v007/progression-rules.config.ts
var RDN_PROGRESSION_RULES4, RDN_EFFECT_PROGRESSION_RULES4, RDN_EFFECT_CHECKPOINTS4, RDN_GEM_EFFECT_PRESETS4, RDN_LINK_EFFECT_PRESETS4, RDN_AREA_EFFECT_PRESETS4, RDN_EFFECT_FLOW_RULES4, RDN_SPECIAL_OPERATOR_CANDIDATES4, RDN_EFFECT_SIMPLIFICATIONS4, RDN_GEM_EFFECT_FALLBACK_PRESETS3, rdnEffectRuleForLevel4, rdnProgressionRuleForSpheres4, rdnGenerationAttemptsForSpheres, rdnSpecialOperatorsForBoard4, rdnElementalAffinitiesForBoard2, rdnLinkCountForBoard4, rdnMaximumLinksForSpheres4, rdnMaximumGemEffectsForSpheres4, rdnGemEffectCountForBoard4;
var init_progression_rules_config4 = __esm({
  "src/app/core/game/phaser/catalogues/v007/progression-rules.config.ts"() {
    "use strict";
    init_effects_models();
    init_levels_config4();
    RDN_PROGRESSION_RULES4 = [
      {
        minSpheres: 4,
        minGemEffects: 1,
        // I checkpoint didattici possono mostrare due effetti, ma le fasce base
        // restano limitate a uno tramite il loro `maxGemEffects`.
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        guaranteedElementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        fixedLinks: 0,
        optionalLinks: 0,
        optionalLinkEvery: 0,
        // Nessun link generato a quattro sfere; uno resta disponibile per una lezione manuale.
        maxLinks: 1,
        solutionAttemptsBeforeScaling: 500,
        structureAttemptsBeforeScaling: 30
      },
      {
        minSpheres: 5,
        minGemEffects: 2,
        maxGemEffects: 2,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        guaranteedElementals: 0,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        fixedLinks: 0,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 1,
        solutionAttemptsBeforeScaling: 500,
        structureAttemptsBeforeScaling: 30
      },
      {
        minSpheres: 6,
        minGemEffects: 2,
        maxGemEffects: 3,
        guaranteedSpecials: 0,
        optionalSpecials: 0,
        optionalSpecialEvery: 0,
        guaranteedElementals: 1,
        optionalElementals: 0,
        optionalElementalEvery: 0,
        ensureOppositeElementForWall: true,
        fixedLinks: 1,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 2,
        solutionAttemptsBeforeScaling: 750,
        structureAttemptsBeforeScaling: 60
      },
      {
        minSpheres: 7,
        minGemEffects: 3,
        maxGemEffects: 4,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        guaranteedElementals: 1,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        fixedLinks: 2,
        optionalLinks: 1,
        optionalLinkEvery: 3,
        maxLinks: 3,
        solutionAttemptsBeforeScaling: 1e3,
        structureAttemptsBeforeScaling: 100
      },
      {
        minSpheres: 8,
        minGemEffects: 4,
        maxGemEffects: 5,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        guaranteedElementals: 2,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        fixedLinks: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        maxLinks: 4,
        solutionAttemptsBeforeScaling: 1500,
        structureAttemptsBeforeScaling: 150
      },
      {
        minSpheres: 9,
        minGemEffects: 5,
        maxGemEffects: 5,
        guaranteedSpecials: 1,
        optionalSpecials: 1,
        optionalSpecialEvery: 3,
        guaranteedElementals: 3,
        optionalElementals: 1,
        optionalElementalEvery: 3,
        ensureOppositeElementForWall: true,
        fixedLinks: 3,
        optionalLinks: 1,
        optionalLinkEvery: 5,
        maxLinks: 4,
        solutionAttemptsBeforeScaling: 2e3,
        structureAttemptsBeforeScaling: 200
      }
    ];
    RDN_EFFECT_PROGRESSION_RULES4 = [
      { id: "LEGACY", minLevel: 1, maxLevel: 9, maxGemEffects: 0, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 0, structureAttemptsBeforeScaling: 0 },
      { id: "SHIELD", minLevel: 10, maxLevel: 19, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "WALL", minLevel: 20, maxLevel: 29, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "MIRROR", minLevel: 30, maxLevel: 34, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "AMPLIFY", minLevel: 35, maxLevel: 39, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "INVERTER", minLevel: 40, maxLevel: 44, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "ICE", minLevel: 45, maxLevel: 49, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "TIMER", minLevel: 50, maxLevel: 59, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "CORRUPTION", minLevel: 60, maxLevel: 69, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "LINKS", minLevel: 70, maxLevel: 79, maxGemEffects: 1, maxAreaEffects: 0, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "AREA", minLevel: 80, maxLevel: 100, maxGemEffects: 2, maxAreaEffects: 1, solutionAttemptsBeforeScaling: 500, structureAttemptsBeforeScaling: 30 },
      { id: "STABLE", minLevel: 101, maxGemEffects: 5, maxAreaEffects: 2, solutionAttemptsBeforeScaling: 1e3, structureAttemptsBeforeScaling: 150 }
    ];
    RDN_EFFECT_CHECKPOINTS4 = {
      15: { enabled: true, effects: [{ preset: "SHIELD_2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      25: { enabled: true, effects: [{ preset: "WALL_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }] },
      35: { enabled: true, effects: [{ preset: "MIRROR_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }, { preset: "AMPLIFIER_X2", target: { type: "GEM" /* GEM */, gemIndex: 0 } }] },
      45: { enabled: true, effects: [{ preset: "INVERTER_1", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "ICE_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }] },
      55: { enabled: true, effects: [{ preset: "TIMER_5", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "CORRUPTION_1", target: { type: "GEM" /* GEM */, gemIndex: 2 } }] },
      65: { enabled: true, effects: [{ preset: "TIMER_7", target: { type: "GEM" /* GEM */, gemIndex: 1 } }, { preset: "CORRUPTION_2", target: { type: "GEM" /* GEM */, gemIndex: 3 } }, { preset: "ECHO_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 0, toGemIndex: 2 }, overrides: { direction: "FORWARD" /* FORWARD */ } }] },
      75: { enabled: true, effects: [{ preset: "AMPLIFIER_X3", target: { type: "GEM" /* GEM */, gemIndex: 0 } }, { preset: "ICE_3", target: { type: "GEM" /* GEM */, gemIndex: 4 } }, { preset: "INVERT_LINK", target: { type: "LINK" /* LINK */, fromGemIndex: 1, toGemIndex: 3 }, overrides: { direction: "FORWARD" /* FORWARD */ } }, { preset: "BOMB_2", target: { type: "AREA" /* AREA */, sourceGemIndex: 2 } }] }
    };
    RDN_GEM_EFFECT_PRESETS4 = {
      LEGACY: [],
      SHIELD: ["SHIELD_1", "SHIELD_2", "SHIELD_3"],
      WALL: ["WALL_1"],
      MIRROR: ["MIRROR_1"],
      AMPLIFY: ["AMPLIFIER_X2", "AMPLIFIER_X3"],
      INVERTER: ["INVERTER_1"],
      ICE: ["ICE_1", "ICE_2", "ICE_3", "FIRE_1", "FIRE_2", "FIRE_3"],
      TIMER: ["TIMER_3", "TIMER_5", "TIMER_7", "TIMER_10"],
      CORRUPTION: ["CORRUPTION_1", "CORRUPTION_2"],
      LINKS: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "FIRE_1", "CORRUPTION_1"],
      AREA: ["SHIELD_1", "WALL_1", "MIRROR_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "FIRE_1", "CORRUPTION_1"],
      STABLE: [
        "SHIELD_1",
        "SHIELD_2",
        "SHIELD_3",
        "WALL_1",
        "WALL_2",
        "WALL_3",
        "WALL_4",
        "MIRROR_1",
        "AMPLIFIER_X2",
        "AMPLIFIER_X3",
        "INVERTER_1",
        "ICE_1",
        "ICE_2",
        "ICE_3",
        "FIRE_1",
        "FIRE_2",
        "FIRE_3",
        "TIMER_3",
        "TIMER_5",
        "TIMER_7",
        "TIMER_10",
        "CORRUPTION_1",
        "CORRUPTION_2"
      ]
    };
    RDN_LINK_EFFECT_PRESETS4 = ["ECHO_LINK", "DOUBLE_LINK", "INVERT_LINK", "CHAIN_LINK"];
    RDN_AREA_EFFECT_PRESETS4 = ["AREA_BOMB_MINUS_2", "AREA_BOMB_PLUS_2", "AREA_BOMB_MINUS_4", "AREA_BOMB_PLUS_4", "AREA_BOMB_MINUS_7", "AREA_BOMB_PLUS_7", "AREA_ICE_ADJACENT", "AREA_ICE_TWO_ADJACENT", "AREA_ICE_ALL", "AREA_INVERTER_ADJACENT", "AREA_INVERTER_TWO_ADJACENT", "AREA_INVERTER_ALL"];
    RDN_EFFECT_FLOW_RULES4 = { maxDepth: 6, allowMultipleIncomingFlows: true, combineStrategy: "SUM" /* SUM */ };
    RDN_SPECIAL_OPERATOR_CANDIDATES4 = ["zero", "invert", "divide2", "skip", "divide3"];
    RDN_EFFECT_SIMPLIFICATIONS4 = {
      SHIELD_3: "SHIELD_2",
      SHIELD_2: "SHIELD_1",
      WALL_1: "SHIELD_3",
      WALL_2: "WALL_1",
      WALL_3: "WALL_2",
      WALL_4: "WALL_3",
      MIRROR_1: "WALL_4",
      AMPLIFIER_X2: "MIRROR_1",
      AMPLIFIER_X3: "AMPLIFIER_X2",
      INVERTER_1: "AMPLIFIER_X3",
      ICE_1: "INVERTER_1",
      ICE_2: "ICE_1",
      ICE_3: "ICE_2",
      FIRE_1: "ICE_3",
      FIRE_2: "FIRE_1",
      FIRE_3: "FIRE_2",
      TIMER_3: "FIRE_3",
      TIMER_5: "TIMER_3",
      TIMER_7: "TIMER_5",
      TIMER_10: "TIMER_7",
      CORRUPTION_1: "TIMER_10",
      CORRUPTION_2: "CORRUPTION_1",
      DOUBLE_LINK: "ECHO_LINK",
      INVERT_LINK: "ECHO_LINK",
      BOMB_2: "BOMB_1",
      AREA_BOMB_MINUS_7: "AREA_BOMB_MINUS_4",
      AREA_BOMB_MINUS_4: "AREA_BOMB_MINUS_2",
      AREA_BOMB_PLUS_7: "AREA_BOMB_PLUS_4",
      AREA_BOMB_PLUS_4: "AREA_BOMB_PLUS_2",
      AREA_ICE_ALL: "AREA_ICE_TWO_ADJACENT",
      AREA_ICE_TWO_ADJACENT: "AREA_ICE_ADJACENT",
      AREA_INVERTER_ALL: "AREA_INVERTER_TWO_ADJACENT",
      AREA_INVERTER_TWO_ADJACENT: "AREA_INVERTER_ADJACENT"
    };
    RDN_GEM_EFFECT_FALLBACK_PRESETS3 = ["SHIELD_1", "WALL_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1", "FIRE_1"];
    rdnEffectRuleForLevel4 = (level) => RDN_EFFECT_PROGRESSION_RULES4.find((rule) => level >= rule.minLevel && (rule.maxLevel === void 0 || level <= rule.maxLevel)) ?? RDN_EFFECT_PROGRESSION_RULES4[0];
    rdnProgressionRuleForSpheres4 = (spheres) => RDN_PROGRESSION_RULES4.reduce((active, rule) => spheres >= rule.minSpheres ? rule : active, RDN_PROGRESSION_RULES4[0]);
    rdnGenerationAttemptsForSpheres = (spheres) => {
      const rule = rdnProgressionRuleForSpheres4(spheres);
      return { solutionAttemptsBeforeScaling: rule.solutionAttemptsBeforeScaling, structureAttemptsBeforeScaling: rule.structureAttemptsBeforeScaling };
    };
    rdnSpecialOperatorsForBoard4 = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres4(spheres);
      const key = Math.floor(level + variation);
      const optional = rule.optionalSpecialEvery > 0 && key % rule.optionalSpecialEvery === 0 ? rule.optionalSpecials : 0;
      const count = Math.min(spheres, RDN_MAX_SPECIAL_OPERATORS3, rule.guaranteedSpecials + optional);
      const start = (key % RDN_SPECIAL_OPERATOR_CANDIDATES4.length + RDN_SPECIAL_OPERATOR_CANDIDATES4.length) % RDN_SPECIAL_OPERATOR_CANDIDATES4.length;
      return Array.from({ length: count }, (_, index) => RDN_SPECIAL_OPERATOR_CANDIDATES4[(start + index) % RDN_SPECIAL_OPERATOR_CANDIDATES4.length]);
    };
    rdnElementalAffinitiesForBoard2 = (level, spheres, numericSlots, barrierTypes, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres4(spheres);
      const key = Math.floor(level + variation);
      const optional = rule.optionalElementalEvery > 0 && key % rule.optionalElementalEvery === 0 ? rule.optionalElementals : 0;
      const opposite = rule.ensureOppositeElementForWall ? [...new Set(barrierTypes.flatMap((type) => type === "FIRE" /* FIRE */ ? ["ice"] : type === "ICE" /* ICE */ ? ["fire"] : []))] : [];
      const count = Math.min(numericSlots, Math.max(rule.guaranteedElementals + optional, opposite.length));
      return Array.from({ length: count }, (_, index) => opposite[index] ?? ((key + index) % 2 === 0 ? "fire" : "ice"));
    };
    rdnLinkCountForBoard4 = (level, spheres, variation = 0) => {
      const rule = rdnProgressionRuleForSpheres4(spheres);
      const optional = rule.optionalLinkEvery > 0 && Math.floor(level + variation) % rule.optionalLinkEvery === 0 ? rule.optionalLinks : 0;
      return Math.min(rule.maxLinks, rule.fixedLinks + optional);
    };
    rdnMaximumLinksForSpheres4 = (spheres) => rdnProgressionRuleForSpheres4(spheres).maxLinks;
    rdnMaximumGemEffectsForSpheres4 = (spheres) => rdnProgressionRuleForSpheres4(spheres).maxGemEffects;
    rdnGemEffectCountForBoard4 = (key, spheres) => {
      const rule = rdnProgressionRuleForSpheres4(spheres);
      const range = rule.maxGemEffects - rule.minGemEffects + 1;
      return rule.minGemEffects + (range > 0 ? Math.abs(Math.floor(key)) % range : 0);
    };
  }
});

// src/app/core/game/phaser/catalogues/v007/effect-progression.config.ts
var positiveModulo4, pick4, resolveEffectProgressionTier4, shouldUseProgressionEffects4, explicitEffectConfigurationForLevel4, createProgressionEffectConfiguration4, createFreeModeEffectConfiguration4, validateEffectComplexity4;
var init_effect_progression_config4 = __esm({
  "src/app/core/game/phaser/catalogues/v007/effect-progression.config.ts"() {
    "use strict";
    init_effects_models();
    init_levels_config4();
    init_progression_rules_config4();
    positiveModulo4 = (value, length) => (value % length + length) % length;
    pick4 = (items, seed) => items[positiveModulo4(seed, items.length)];
    resolveEffectProgressionTier4 = rdnEffectRuleForLevel4;
    shouldUseProgressionEffects4 = (level) => level >= 10;
    explicitEffectConfigurationForLevel4 = (level) => RDN_EFFECT_CHECKPOINTS4[level];
    createProgressionEffectConfiguration4 = (mode, level, gemCount, seed = 0) => {
      if (gemCount < 4 || !shouldUseProgressionEffects4(level)) return void 0;
      const tier = resolveEffectProgressionTier4(level);
      const key = level * 37 + gemCount * 11 + seed + (mode === "time-attack" ? 7 : mode === "free" ? 13 : 0);
      const first = positiveModulo4(key, gemCount);
      const second = positiveModulo4(first + 2, gemCount);
      const source = positiveModulo4(first + 1, gemCount);
      const destination = positiveModulo4(source + 1, gemCount);
      const effects = [];
      const gemPresets = RDN_GEM_EFFECT_PRESETS4[tier.id];
      const gemEffectCount = tier.id === "LEGACY" ? 0 : Math.min(tier.maxGemEffects, rdnGemEffectCountForBoard4(key, gemCount));
      for (let index = 0; index < gemEffectCount; index += 1) {
        effects.push({ preset: pick4(gemPresets, key + index), target: { type: "GEM" /* GEM */, gemIndex: positiveModulo4(first + index, gemCount) } });
      }
      const linkCount = rdnLinkCountForBoard4(level, gemCount, mode === "free" ? seed : 0);
      const linkPresets = level >= 100 ? RDN_LINK_EFFECT_PRESETS4 : RDN_LINK_EFFECT_PRESETS4.filter((preset) => preset !== "CHAIN_LINK");
      for (let index = 0; index < linkCount; index += 1) {
        const fromGemIndex = positiveModulo4(source + index, gemCount);
        const toGemIndex = positiveModulo4(destination + index * 2, gemCount);
        effects.push({ preset: pick4(linkPresets, key + 2 + index), target: { type: "LINK" /* LINK */, fromGemIndex, toGemIndex: toGemIndex === fromGemIndex ? positiveModulo4(toGemIndex + 1, gemCount) : toGemIndex }, overrides: { direction: level >= 100 && (key + index) % 2 === 0 ? "BIDIRECTIONAL" /* BIDIRECTIONAL */ : "FORWARD" /* FORWARD */ } });
      }
      const areaEffectCount = Math.min(tier.maxAreaEffects, RDN_MAX_AREA_EFFECTS_PER_BOARD3);
      for (let index = 0; index < areaEffectCount; index += 1) effects.push({ preset: pick4(RDN_AREA_EFFECT_PRESETS4, key + 5 + index), target: { type: "AREA" /* AREA */, sourceGemIndex: positiveModulo4(second + index, gemCount) } });
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES4 } : void 0;
    };
    createFreeModeEffectConfiguration4 = (difficulty, gemCount, seed = 0, selections = false) => {
      const enabled = typeof selections === "boolean" ? { gem: selections, link: selections, area: selections } : selections;
      if (!enabled.gem && !enabled.link && !enabled.area) return void 0;
      const progressionLevel = difficulty === "EASY" ? 20 : difficulty === "NORMAL" ? 40 : difficulty === "HARD" ? 60 : 81;
      const effects = [
        ...enabled.gem ? createProgressionEffectConfiguration4("free", progressionLevel, gemCount, seed)?.effects?.filter((effect) => effect.target.type === "GEM" /* GEM */) ?? [] : [],
        ...enabled.link ? createProgressionEffectConfiguration4("free", Math.max(progressionLevel, 72), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "LINK" /* LINK */) ?? [] : [],
        ...enabled.area ? createProgressionEffectConfiguration4("free", Math.max(progressionLevel, 80), gemCount, seed)?.effects?.filter((effect) => effect.target.type === "AREA" /* AREA */) ?? [] : []
      ];
      return effects.length ? { enabled: true, effects, flowRules: RDN_EFFECT_FLOW_RULES4 } : void 0;
    };
    validateEffectComplexity4 = (configuration, label, spheres = 8) => {
      if (!configuration?.enabled) return [];
      const effects = configuration.effects ?? [];
      const gem = effects.filter((effect) => effect.target.type === "GEM" /* GEM */).length;
      const link = effects.filter((effect) => effect.target.type === "LINK" /* LINK */).length;
      const area = effects.filter((effect) => effect.target.type === "AREA" /* AREA */).length;
      const issues = [];
      const maximumGemEffects = rdnMaximumGemEffectsForSpheres4(spheres);
      if (gem > maximumGemEffects) issues.push(`${label}: GEM effect count = ${gem}, maximum allowed = ${maximumGemEffects}.`);
      const maximumLinks = rdnMaximumLinksForSpheres4(spheres);
      if (link > maximumLinks) issues.push(`${label}: LINK effect count = ${link}, maximum allowed = ${maximumLinks}.`);
      if (area > RDN_MAX_AREA_EFFECTS_PER_BOARD3) issues.push(`${label}: AREA effect count = ${area}, maximum allowed = ${RDN_MAX_AREA_EFFECTS_PER_BOARD3}.`);
      return issues;
    };
  }
});

// src/app/core/game/phaser/catalogues/v007/catalog.builder.ts
var catalog_builder_exports4 = {};
__export(catalog_builder_exports4, {
  RDN_LEVELS: () => RDN_LEVELS4,
  RDN_SOLUTION_TABLE: () => RDN_SOLUTION_TABLE4,
  generateRdnPuzzle: () => generateRdnPuzzle4,
  getRdnLevel: () => getRdnLevel4,
  getRdnSolutionTable: () => getRdnSolutionTable4,
  prepareRdnCatalogueLevel: () => prepareRdnCatalogueLevel4,
  validateAdventureLevelBatch: () => validateAdventureLevelBatch4
});
var DEFAULT_ACTIVE_FLOW_COUNT4, freeActiveFlowCount4, modulo5, random4, impulsesPerValue4, rotationDistance4, specialOperatorsForLevel4, gearOperators4, additiveOperators4, balancedPlanSigns4, subtractivePlan4, planForValue4, generateBoard4, tutorialBoard4, generatedMetadata4, adventureConfig4, replaySolutionWithTrace4, replaySolution4, withCalibratedTimerDeadlines4, timerDeadlineFailed4, lastIndexFor4, withRotatedEffectTargets3, effectPlacementVariants3, effectConfigurationStages4, timerPlacementIsCompatible4, buildEffectCandidate4, withElementalOperators2, needsSignedValueCalibration4, generationAttemptsForLevel, recalculatedOuterValues4, regenerateEffectAwareLevel4, applyProgressionEffects4, effectAwareVariant4, persistent4, loader4, generateRdnLevelCatalogue4, catalogueGenerationRequested4, useGeneratedCatalogue4, removeDuplicateSignedGearValues4, upgradeLegacyTutorial4, prepareRdnCatalogueLevel4, RDN_LEVELS4, getRdnLevel4, generateRdnPuzzle4, applySolutionOperator4, verifiesSolution4, RDN_SOLUTION_TABLE4, getRdnSolutionTable4, validateAdventureLevelBatch4;
var init_catalog_builder4 = __esm({
  "src/app/core/game/phaser/catalogues/v007/catalog.builder.ts"() {
    "use strict";
    init_puzzle_types();
    init_puzzle_engine();
    init_level_effect_config_resolver();
    init_effects_models();
    init_rdn_release_config4();
    init_effect_progression_config4();
    init_progression_rules_config4();
    init_levels_config4();
    DEFAULT_ACTIVE_FLOW_COUNT4 = 1;
    freeActiveFlowCount4 = (difficulty) => difficulty === "EASY" ? 1 : difficulty === "NORMAL" ? 2 : difficulty === "HARD" ? 3 : 4;
    modulo5 = (value, length) => (value % length + length) % length;
    random4 = (seed) => {
      let state = seed >>> 0;
      return () => {
        state = state * 1664525 + 1013904223 >>> 0;
        return state / 4294967296;
      };
    };
    impulsesPerValue4 = (number) => number <= 3 ? 1 : Math.min(RDN_MAX_OPERATIONS_PER_SPHERE3, 2 + Math.floor((number - 4) / 20));
    rotationDistance4 = (from, to, positions) => Math.min(modulo5(to - from, positions), modulo5(from - to, positions));
    specialOperatorsForLevel4 = (level, positions, variation = 0) => {
      return [...rdnSpecialOperatorsForBoard4(level, positions, variation)];
    };
    gearOperators4 = (positions, specialOperators, next, allowDuplicateSignedValues = false) => {
      const subtractorCount = positions - specialOperators.length;
      if (!allowDuplicateSignedValues && RDN_MAX_GEAR_OPERATOR_MAGNITUDE3 < Math.ceil(subtractorCount / 2)) {
        throw new Error(`RDN_MAX_GEAR_OPERATOR_MAGNITUDE=${RDN_MAX_GEAR_OPERATOR_MAGNITUDE3} non consente ${subtractorCount} operatori numerici univoci per segno.`);
      }
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const magnitudes = Array.from({ length: subtractorCount }, (_, index) => {
        const used = index % 2 === 0 ? usedNegative : usedPositive;
        let value = 1 + Math.floor(next() * RDN_MAX_GEAR_OPERATOR_MAGNITUDE3);
        if (!allowDuplicateSignedValues) while (used.has(value)) value = value % RDN_MAX_GEAR_OPERATOR_MAGNITUDE3 + 1;
        used.add(value);
        return value;
      });
      return [...magnitudes.map((value, index) => index % 2 === 0 ? -value : value), ...specialOperators];
    };
    additiveOperators4 = (operators) => operators.filter((operator) => typeof operator === "number" && operator !== 0);
    balancedPlanSigns4 = (plans) => {
      const counts = plans.map((plan) => plan.operators.filter((operator) => typeof operator === "number").length);
      const total = counts.reduce((sum, count) => sum + count, 0);
      const reachable = Array(total + 1).fill(void 0);
      reachable[0] = [];
      counts.forEach((count, index) => {
        for (let sum = total - count; sum >= 0; sum -= 1) if (reachable[sum] && !reachable[sum + count]) reachable[sum + count] = [...reachable[sum], index];
      });
      let selectedSum = 0;
      for (let sum = 0; sum <= total; sum += 1) if (reachable[sum] && Math.abs(total - sum * 2) < Math.abs(total - selectedSum * 2)) selectedSum = sum;
      const positivePlans = new Set(reachable[selectedSum]);
      return plans.map((_, index) => positivePlans.has(index));
    };
    subtractivePlan4 = (count, available, next, maximumStart = 20) => {
      if (!available.length) throw new Error("RDN generator requires at least one compatible numeric operator");
      const minimumMagnitude = Math.min(...available.map((value) => Math.abs(value)));
      const safeCount = Math.max(1, Math.min(count, Math.floor(maximumStart / minimumMagnitude)));
      const values = [];
      let total = 0;
      for (let index = 0; index < safeCount; index += 1) {
        const remaining = safeCount - index - 1;
        const candidates = available.filter((value) => total + Math.abs(value) + remaining * minimumMagnitude <= maximumStart);
        const selected = candidates[Math.floor(next() * candidates.length)] ?? available[0];
        values.push(selected);
        total += Math.abs(selected);
      }
      return { start: total * (values[0] < 0 ? 1 : -1), operators: values };
    };
    planForValue4 = (impulses, available, next, maximumStart, forcedOperator) => {
      if (forcedOperator === "divide2" || forcedOperator === "divide3") {
        const divisor = forcedOperator === "divide2" ? 2 : 3;
        const tail = subtractivePlan4(impulses - 1, available, next, Math.floor(maximumStart / divisor));
        return { start: tail.start * divisor, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "zero") {
        const magnitude = 1 + Math.floor(next() * Math.max(1, maximumStart));
        return { start: next() < 0.5 ? -magnitude : magnitude, operators: [forcedOperator] };
      }
      if (forcedOperator === "invert") {
        const tail = subtractivePlan4(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: -tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      if (forcedOperator === "skip") {
        const tail = subtractivePlan4(Math.max(1, impulses - 1), available, next, maximumStart);
        return { start: tail.start, operators: [forcedOperator, ...tail.operators] };
      }
      return subtractivePlan4(impulses, available, next, maximumStart);
    };
    generateBoard4 = (number, seedOffset, slotCount, balanceQueueSigns = false, allowDuplicateSignedGearValues = false) => {
      const positions = slotCount && slotCount >= RDN_MIN_SPHERES4 && slotCount <= RDN_MAX_SPHERES4 ? slotCount : rdnSphereCountForLevel4(number);
      const impulses = impulsesPerValue4(number);
      const seed = number * 977 + seedOffset;
      const next = random4(seed);
      const specialOperators = specialOperatorsForLevel4(number, positions, seedOffset);
      const innerValues = gearOperators4(positions, specialOperators, next, allowDuplicateSignedGearValues);
      const allAdditives = additiveOperators4(innerValues);
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const maximumStart = Math.min(Math.abs(range.min), Math.abs(range.max));
      const planForIndex = (index, positive) => planForValue4(impulses, allAdditives.filter((operator) => positive ? operator > 0 : operator < 0), next, maximumStart, specialOperators[index]);
      const provisionalPlans = Array.from({ length: positions }, (_, index) => planForIndex(index, index % 2 !== 0));
      const planSigns = balanceQueueSigns ? balancedPlanSigns4(provisionalPlans) : provisionalPlans.map((_, index) => index % 2 !== 0);
      const plans = balanceQueueSigns ? Array.from({ length: positions }, (_, index) => planForIndex(index, planSigns[index])) : provisionalPlans;
      const loaderQueues = Array.from({ length: positions }, () => []);
      const cursors = Array(positions).fill(0);
      const rotations = [];
      const slotPhases = [];
      const solutionMoves = [];
      while (cursors.some((cursor, outerIndex) => cursor < plans[outerIndex].operators.length)) {
        const candidates = plans.map((plan, outerIndex2) => cursors[outerIndex2] < plan.operators.length ? outerIndex2 : -1).filter((outerIndex2) => outerIndex2 >= 0);
        const outerIndex = candidates[Math.floor(next() * candidates.length)];
        const operator = plans[outerIndex].operators[cursors[outerIndex]];
        const innerIndex = innerValues.findIndex((value) => value === operator);
        loaderQueues[innerIndex].push(operator);
        const rotation = modulo5(outerIndex - innerIndex, positions);
        rotations.push(rotation);
        slotPhases.push([{ outerIndex }]);
        solutionMoves.push({ outerIndex, rotation, operator });
        cursors[outerIndex] += 1;
      }
      const initialRotation = modulo5(rotations[0] + 1 + Math.floor(next() * Math.max(1, positions - 1)), positions);
      let previousRotation = initialRotation;
      let rotationSteps = 0;
      for (const rotation of rotations) {
        rotationSteps += rotationDistance4(previousRotation, rotation, positions);
        previousRotation = rotation;
      }
      return { positions, initialRotation, innerValues, loaderQueues, outerValues: plans.map((plan) => plan.start), slotPhases, optimalCost: { impulses: slotPhases.length, rotationSteps }, solution: plans.map((plan) => ({ startValue: plan.start, operators: [...plan.operators] })), solutionMoves, seed };
    };
    tutorialBoard4 = () => {
      const operators = [-1, -2, -3, -4];
      const values = operators.map((operator) => -operator);
      return { positions: 4, initialRotation: 0, innerValues: [...operators], loaderQueues: operators.map((operator) => [operator]), outerValues: values, slotPhases: [[{ outerIndex: 0 }], [{ outerIndex: 1 }], [{ outerIndex: 2 }], [{ outerIndex: 3 }]], optimalCost: { impulses: 4, rotationSteps: 0 }, solution: operators.map((operator, index) => ({ startValue: values[index], operators: [operator] })), solutionMoves: operators.map((operator, outerIndex) => ({ outerIndex, rotation: 0, operator })), seed: 0 };
    };
    generatedMetadata4 = (number, board, difficulty = "EASY", activeFlowCount = DEFAULT_ACTIVE_FLOW_COUNT4) => ({ seed: board.seed, generatorVersion: RDN_RELEASE4.generatorVersion, balanceVersion: RDN_RELEASE4.balanceVersion, difficulty, estimatedMinimumSolutionLength: board.optimalCost.impulses, specialOperators: board.innerValues.filter((operator) => typeof operator !== "number"), officialSolutionImpulses: board.optimalCost.impulses, officialSolutionRotationSteps: board.optimalCost.rotationSteps, branchingFactor: activeFlowCount, featureFlags: [] });
    adventureConfig4 = (number, board) => ({
      version: 1,
      seed: board.seed,
      levelVersion: "rdn-adventure-v1",
      objectives: { targetValues: [...board.outerValues], requireAllTargetsZero: true },
      enabledMechanics: ["fixed-operators", "special-inventory", "rotation", "impulse"],
      specialInventory: {
        divide2: board.innerValues.filter((operator) => operator === "divide2").length,
        divide3: board.innerValues.filter((operator) => operator === "divide3").length,
        zero: board.innerValues.filter((operator) => operator === "zero").length,
        invert: board.innerValues.filter((operator) => operator === "invert").length,
        skip: board.innerValues.filter((operator) => operator === "skip").length
      }
    });
    replaySolutionWithTrace4 = (level) => {
      const engine = new PuzzleEngine();
      let state = engine.createInitialState(level);
      const execution = [];
      for (const move of level.solutionMoves ?? []) {
        const delta = modulo5(move.rotation - state.rotation, level.positions);
        if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
        const plan = engine.planImpulse(level, state);
        const linkedTargets = new Set(plan.impacts.filter((impact) => impact.linkId).map((impact) => impact.targetId));
        const changedTargets = new Set(plan.impacts.map((impact) => impact.targetId));
        execution.push({
          move,
          updates: [...changedTargets].map((outerIndex) => ({ outerIndex, value: plan.finalValues[outerIndex], viaLink: linkedTargets.has(outerIndex) }))
        });
        state = engine.apply(level, state, { type: "IMPULSE" });
      }
      return { state, execution };
    };
    replaySolution4 = (level) => replaySolutionWithTrace4(level).state;
    withCalibratedTimerDeadlines4 = (level, configuration) => {
      if (!configuration.effects?.length || configuration.sets?.length) return configuration;
      const effects = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects;
      const deadlines = /* @__PURE__ */ new Map();
      effects.forEach((effect, index) => {
        if (effect.config.type !== "TIMER" /* TIMER */) return;
        const target = effect.target;
        if (target.type !== "GEM" /* GEM */) return;
        const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === target.gem.index).length;
        if (directImpulses > RDN_MAX_TIMER_DIRECT_IMPULSES4) return;
        deadlines.set(index, Math.max(effect.config.turns, directImpulses));
      });
      return {
        ...configuration,
        effects: configuration.effects.map((assignment, index) => {
          const deadline = deadlines.get(index);
          return deadline === void 0 ? assignment : { ...assignment, overrides: { ...assignment.overrides, turns: deadline } };
        })
      };
    };
    timerDeadlineFailed4 = (state) => (state.effectRuntime?.expiredTimerIds.length ?? 0) > 0;
    lastIndexFor4 = (effects, scope) => {
      for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index].target.type === scope) return index;
      return -1;
    };
    withRotatedEffectTargets3 = (configuration, positions, offset) => {
      const rotate = (index) => modulo5(index + offset, positions);
      return {
        ...configuration,
        effects: configuration.effects?.map((effect) => {
          if (effect.target.type === "GEM" /* GEM */) return { ...effect, target: { ...effect.target, gemIndex: rotate(effect.target.gemIndex) } };
          if (effect.target.type === "LINK" /* LINK */) return { ...effect, target: { ...effect.target, fromGemIndex: rotate(effect.target.fromGemIndex), toGemIndex: rotate(effect.target.toGemIndex) } };
          return { ...effect, target: { ...effect.target, sourceGemIndex: rotate(effect.target.sourceGemIndex) } };
        })
      };
    };
    effectPlacementVariants3 = (configuration, positions, preserveTargets) => {
      if (preserveTargets || positions < 2) return [configuration];
      return Array.from({ length: positions }, (_, offset) => withRotatedEffectTargets3(configuration, positions, offset));
    };
    effectConfigurationStages4 = (configuration, spheres) => {
      const effects = [...configuration.effects ?? []];
      const risk = (effect) => {
        if (effect.preset.startsWith("TIMER_")) return 0;
        if (effect.preset.startsWith("CORRUPTION_")) return 1;
        if (effect.target.type === "AREA" /* AREA */ && (effect.preset.includes("_7") || effect.preset.endsWith("_ALL"))) return 2;
        if (effect.target.type === "LINK" /* LINK */ && effect.preset !== "ECHO_LINK") return 3;
        if (effect.target.type === "AREA" /* AREA */) return 4;
        if (effect.preset === "AMPLIFIER_X3" || effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1") return 5;
        return 6;
      };
      const soften = (items) => {
        const candidate = items.map((effect, index) => ({ effect, index })).filter(({ effect }) => RDN_EFFECT_SIMPLIFICATIONS4[effect.preset] !== void 0).sort((left, right) => risk(left.effect) - risk(right.effect) || left.index - right.index)[0];
        if (!candidate) return [...items];
        const preset = RDN_EFFECT_SIMPLIFICATIONS4[candidate.effect.preset];
        if (!preset) return [...items];
        return items.map((effect, index) => index !== candidate.index ? effect : { ...effect, preset, overrides: effect.target.type === "LINK" /* LINK */ ? { ...effect.overrides, direction: "FORWARD" /* FORWARD */ } : void 0 });
      };
      const scaled = [];
      let scaledEffects = [...effects];
      while (true) {
        const next = soften(scaledEffects);
        if (next.every((effect, index) => effect.preset === scaledEffects[index].preset && effect.overrides === scaledEffects[index].overrides)) break;
        scaledEffects = next;
        scaled.push({ ...configuration, effects: scaledEffects });
      }
      const stabilizedEffects = scaledEffects;
      const stabilized = [];
      const optional = [];
      let reduced = [...stabilizedEffects];
      const fixedLinks = rdnProgressionRuleForSpheres4(spheres).fixedLinks;
      while (reduced.filter((effect) => effect.target.type === "LINK" /* LINK */).length > fixedLinks) {
        reduced = reduced.filter((_, index) => index !== lastIndexFor4(reduced, "LINK" /* LINK */));
        optional.push({ ...configuration, effects: reduced });
      }
      const emergency = [];
      const withoutArea = reduced.filter((effect) => effect.target.type !== "AREA" /* AREA */);
      if (withoutArea.length !== reduced.length) emergency.push({ ...configuration, effects: withoutArea });
      const gemOnly = withoutArea.filter((effect) => effect.target.type !== "LINK" /* LINK */);
      if (gemOnly.length !== withoutArea.length) emergency.push({ ...configuration, effects: gemOnly });
      const minimumGems = rdnProgressionRuleForSpheres4(spheres).minGemEffects;
      let minimum = gemOnly;
      while (minimum.filter((effect) => effect.target.type === "GEM" /* GEM */).length > minimumGems) minimum = minimum.filter((_, index) => index !== lastIndexFor4(minimum, "GEM" /* GEM */));
      const final = RDN_GEM_EFFECT_FALLBACK_PRESETS3.map((preset) => ({ ...configuration, effects: minimum.map((effect) => effect.target.type === "GEM" /* GEM */ ? { ...effect, preset, overrides: void 0 } : effect) }));
      return [[configuration], scaled, stabilized, optional, emergency, final];
    };
    timerPlacementIsCompatible4 = (level, configuration) => (configuration.effects ?? []).every((effect) => {
      if (!effect.preset.startsWith("TIMER_") || effect.target.type !== "GEM" /* GEM */) return true;
      const directImpulses = (level.solutionMoves ?? []).filter((move) => move.outerIndex === effect.target.gemIndex).length;
      return directImpulses <= RDN_MAX_TIMER_DIRECT_IMPULSES4;
    });
    buildEffectCandidate4 = (level, outerValues, effectConfiguration) => ({ ...level, outerValues: [...outerValues], solution: level.solution?.map((slot, index) => ({ ...slot, startValue: outerValues[index] })), effectConfiguration });
    withElementalOperators2 = (level, configuration, variation = 0) => {
      const barriers = new LevelEffectConfigResolver().resolve(configuration, level.positions).effects.flatMap((effect) => effect.config.scope === "GEM" /* GEM */ && (effect.config.type === "FIRE" /* FIRE */ || effect.config.type === "ICE" /* ICE */) ? [effect.config.type] : []);
      const numericSlots = level.variant === "persistent" ? level.innerValues.map((operator, index) => typeof operator === "number" ? index : -1).filter((index) => index >= 0) : level.queues.map((queue, index) => queue.some((operator) => typeof operator === "number") ? index : -1).filter((index) => index >= 0);
      const affinities = rdnElementalAffinitiesForBoard2(level.number, level.positions, numericSlots.length, barriers, variation);
      const bySlot = /* @__PURE__ */ new Map();
      numericSlots.forEach((slot, index) => {
        const affinity = affinities[index];
        if (affinity) bySlot.set(slot, affinity);
      });
      if (level.variant === "persistent") return { ...level, innerElements: level.innerValues.map((operator, index) => typeof operator === "number" ? bySlot.get(index) ?? null : null) };
      return { ...level, queueElements: level.queues.map((queue, index) => queue.map((operator) => typeof operator === "number" ? bySlot.get(index) ?? null : null)) };
    };
    needsSignedValueCalibration4 = (configuration) => (configuration.effects ?? []).some((effect) => effect.preset === "INVERTER_1" || effect.preset === "MIRROR_1" || effect.preset === "CORRUPTION_1" || effect.preset === "CORRUPTION_2");
    generationAttemptsForLevel = (level) => level.number > 100 ? rdnGenerationAttemptsForSpheres(level.positions) : rdnEffectRuleForLevel4(level.number);
    recalculatedOuterValues4 = (candidate, result, range, useSignedCalibration) => {
      const recalculated = candidate.outerValues.map((value, index) => {
        if (!useSignedCalibration) return value - result.outerValues[index];
        const probeStep = value < range.max && value !== -1 ? 1 : value > range.min && value !== 1 ? -1 : 0;
        if (probeStep === 0) return value - result.outerValues[index];
        const probeValues = [...candidate.outerValues];
        probeValues[index] += probeStep;
        const probeResult = replaySolution4(buildEffectCandidate4(candidate, probeValues, candidate.effectConfiguration));
        const slope = (probeResult.outerValues[index] - result.outerValues[index]) / probeStep;
        const correction = slope === 0 ? -result.outerValues[index] : -result.outerValues[index] / slope;
        return value + correction;
      });
      return recalculated.some((value) => !Number.isInteger(value) || value === 0 || value < range.min || value > range.max) ? void 0 : recalculated;
    };
    regenerateEffectAwareLevel4 = (level, configuration) => {
      if (!configuration) return level;
      const startedAt = performance.now();
      let calibrationAttempts = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const generationAttempts = generationAttemptsForLevel(level);
      const solutionAttemptsBeforeScaling = generationAttempts.solutionAttemptsBeforeScaling;
      const structureAttemptsBeforeScaling = generationAttempts.structureAttemptsBeforeScaling;
      const withStats = (candidate, solved, officialSolution) => ({ ...candidate, generation: candidate.generation ? { ...candidate.generation, ...officialSolution ? { officialSolutionImpulses: officialSolution.impulses, officialSolutionRotationSteps: officialSolution.rotationSteps } : {}, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: 1, solutionAttempts: calibrationAttempts, calibrationAttempts, structureAttemptsBeforeScaling, solutionAttemptsBeforeScaling, totalComplexity: (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0) + (candidate.effectConfiguration?.effects?.length ?? 0) * 10, failureReasons: solved ? [...failureReasons] : [...failureReasons, "NO_VALID_EFFECT_CONFIGURATION"] } } : candidate.generation });
      const range = DEFAULT_PUZZLE_NUMBER_RANGE;
      const attemptsBeforeScaling = solutionAttemptsBeforeScaling;
      if (!timerPlacementIsCompatible4(level, configuration)) {
        failureReasons.add("TIMER_TARGET_TOO_MANY_DIRECT_IMPULSES");
        return withStats(level, false);
      }
      {
        const candidateConfiguration = withCalibratedTimerDeadlines4(level, configuration);
        if (!candidateConfiguration) {
          failureReasons.add("TIMER_DEADLINE_CALIBRATION_FAILED");
          return withStats(level, false);
        }
        const issues = validateEffectComplexity4(candidateConfiguration, `${level.variant} level ${level.number}`, level.positions);
        if (issues.length) {
          failureReasons.add("COMPLEXITY_INVALID");
          throw new Error(issues.join(" "));
        }
        let outerValues = [...level.outerValues];
        const useSignedCalibration = needsSignedValueCalibration4(candidateConfiguration);
        const seenValueVectors = /* @__PURE__ */ new Set();
        for (let attempt = 0; attempt < attemptsBeforeScaling; attempt += 1) {
          const valueVector = outerValues.join(",");
          if (seenValueVectors.has(valueVector)) {
            failureReasons.add("CALIBRATION_VALUE_CYCLE");
            break;
          }
          seenValueVectors.add(valueVector);
          calibrationAttempts += 1;
          const candidate = withElementalOperators2(buildEffectCandidate4(level, outerValues, candidateConfiguration), candidateConfiguration);
          const result = replaySolution4(candidate);
          if (result.won && !timerDeadlineFailed4(result)) {
            const canonicalImpulses = result.impulses;
            const canonicalRotations = result.rotationSteps;
            return withStats({ ...candidate, starCost: { impulses: canonicalImpulses, rotationSteps: canonicalRotations } }, true, { impulses: canonicalImpulses, rotationSteps: canonicalRotations });
          }
          failureReasons.add(timerDeadlineFailed4(result) ? "TIMER_EXPIRED" : "REPLAY_NOT_WON");
          const recalculated = recalculatedOuterValues4(candidate, result, range, useSignedCalibration);
          if (!recalculated) {
            failureReasons.add("VALUES_OUT_OF_RANGE_OR_NON_INTEGER");
            break;
          }
          if (recalculated.every((value, index) => value === outerValues[index])) {
            failureReasons.add("VALUES_NO_LONGER_CHANGE");
            break;
          }
          outerValues = recalculated;
        }
      }
      return withStats(level, false);
    };
    applyProgressionEffects4 = (mode, level, configuration) => regenerateEffectAwareLevel4(level, configuration ?? explicitEffectConfigurationForLevel4(level.number) ?? createProgressionEffectConfiguration4(mode, level.number, level.positions, level.generation?.seed ?? level.number));
    effectAwareVariant4 = (number, mode, build) => {
      const startedAt = performance.now();
      const first = build(0);
      const generationAttempts = generationAttemptsForLevel({ number, positions: first.positions });
      const attempts = generationAttempts.structureAttemptsBeforeScaling;
      const solutionAttemptsBeforeScaling = generationAttempts.solutionAttemptsBeforeScaling;
      const explicitConfiguration = explicitEffectConfigurationForLevel4(number);
      const requestedConfiguration = explicitConfiguration ?? createProgressionEffectConfiguration4(mode, number, first.positions, number);
      if (!requestedConfiguration?.enabled) return first;
      let last = first;
      let totalSolutionAttempts = 0;
      let totalStructureAttempts = 0;
      const failureReasons = /* @__PURE__ */ new Set();
      const stages = effectConfigurationStages4(requestedConfiguration, first.positions);
      for (const stage of stages) {
        for (const configuration of stage) {
          for (const positionedConfiguration of effectPlacementVariants3(configuration, first.positions, explicitConfiguration !== void 0)) {
            for (let variation = 0; variation < attempts; variation += 1) {
              totalStructureAttempts += 1;
              const candidate = applyProgressionEffects4(mode, variation === 0 ? first : build(variation), positionedConfiguration);
              last = candidate;
              const stats2 = candidate.generation?.generationStats;
              totalSolutionAttempts += stats2?.solutionAttempts ?? stats2?.calibrationAttempts ?? 0;
              (stats2?.failureReasons ?? []).forEach((reason) => failureReasons.add(reason));
              if ((stats2?.failureReasons ?? []).includes("NO_VALID_EFFECT_CONFIGURATION")) continue;
              const replay = replaySolution4(candidate);
              if (replay.won && !timerDeadlineFailed4(replay)) {
                return { ...candidate, generation: candidate.generation ? { ...candidate.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts, calibrationAttempts: totalSolutionAttempts, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats2?.totalComplexity ?? (candidate.optimalCost?.impulses ?? 0) + (candidate.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons] } } : candidate.generation };
              }
            }
          }
        }
      }
      if (number >= 10) throw new Error(`RDN ${mode} level ${number}: no valid effect-aware structure after ${totalStructureAttempts} attempts.`);
      const stats = last.generation?.generationStats;
      return { ...last, generation: last.generation ? { ...last.generation, generationStats: { elapsedMs: performance.now() - startedAt, structureAttempts: totalStructureAttempts, solutionAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, calibrationAttempts: totalSolutionAttempts || stats?.solutionAttempts || stats?.calibrationAttempts || 0, structureAttemptsBeforeScaling: attempts, solutionAttemptsBeforeScaling, totalComplexity: stats?.totalComplexity ?? (last.optimalCost?.impulses ?? 0) + (last.optimalCost?.rotationSteps ?? 0), failureReasons: [...failureReasons, "ALTERNATE_STRUCTURE_ATTEMPTS_EXHAUSTED"] } } : last.generation };
    };
    persistent4 = (number) => {
      return effectAwareVariant4(number, "adventure", (variation) => {
        const board = number === 1 ? tutorialBoard4() : generateBoard4(number, 17 + variation * 101);
        return { id: `persistent-${number}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT4, generation: generatedMetadata4(number, board), adventure: adventureConfig4(number, board), ...board };
      });
    };
    loader4 = (number) => {
      return effectAwareVariant4(number, "time-attack", (variation) => {
        const board = number === 1 ? tutorialBoard4() : generateBoard4(number, 71 + variation * 101);
        return { id: `loader-${number}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount: DEFAULT_ACTIVE_FLOW_COUNT4, generation: generatedMetadata4(number, board), positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      });
    };
    generateRdnLevelCatalogue4 = () => {
      const startedAt = performance.now();
      const total = RDN_MAX_LEVEL4 * 2;
      const levels2 = [];
      let completed = 0;
      let nextProgressLog = 5;
      const reportProgress = () => {
        const percentage = Math.floor(completed / total * 100);
        while (percentage >= nextProgressLog) {
          console.info(`[RDN] Generazione livelli: ${nextProgressLog}% (${completed}/${total})`);
          nextProgressLog += 5;
        }
      };
      console.info(`[RDN] Generazione livelli: 0% (0/${total})`);
      for (let number = 1; number <= RDN_MAX_LEVEL4; number += 1) {
        levels2.push(persistent4(number));
        completed += 1;
        reportProgress();
      }
      for (let number = 1; number <= RDN_MAX_LEVEL4; number += 1) {
        levels2.push(loader4(number));
        completed += 1;
        reportProgress();
      }
      console.info(`[RDN] Generazione completata: ${levels2.length} livelli in ${(performance.now() - startedAt).toFixed(1)} ms.`);
      return levels2;
    };
    catalogueGenerationRequested4 = globalThis.process?.env?.["RDN_GENERATE_CATALOGUE"] === "1";
    useGeneratedCatalogue4 = catalogueGenerationRequested4;
    removeDuplicateSignedGearValues4 = (level) => {
      if (level.variant !== "persistent") return level;
      const usedNegative = /* @__PURE__ */ new Set();
      const usedPositive = /* @__PURE__ */ new Set();
      const innerValues = level.innerValues.map((operator) => {
        if (typeof operator !== "number") return operator;
        const used = operator < 0 ? usedNegative : usedPositive;
        const sign = operator < 0 ? -1 : 1;
        let magnitude = Math.abs(operator);
        while (used.has(magnitude)) magnitude = magnitude % RDN_MAX_GEAR_OPERATOR_MAGNITUDE3 + 1;
        used.add(magnitude);
        return sign * magnitude;
      });
      return innerValues.every((value, index) => value === level.innerValues[index]) ? level : { ...level, innerValues };
    };
    upgradeLegacyTutorial4 = (level) => {
      if (level.number !== 1) return level;
      const board = tutorialBoard4();
      return level.variant === "persistent" ? { ...level, ...board, innerValues: board.innerValues } : { ...level, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
    };
    prepareRdnCatalogueLevel4 = (level) => removeDuplicateSignedGearValues4(upgradeLegacyTutorial4(level));
    RDN_LEVELS4 = useGeneratedCatalogue4 ? generateRdnLevelCatalogue4().map(prepareRdnCatalogueLevel4) : [];
    getRdnLevel4 = (variant, number = 1) => {
      const level = RDN_LEVELS4.find((item) => item.variant === (variant === "adventure" ? "persistent" : "loader") && item.number === number);
      if (!level) throw new Error("Il catalogo RDN non \xC3\xA8 caricato. Usa RdnCatalogueService.");
      return level;
    };
    generateRdnPuzzle4 = (variant, difficulty, seed, slotCount, freeEffectsEnabled = false) => {
      const number = difficulty === "EASY" ? 10 : difficulty === "NORMAL" ? 30 : difficulty === "HARD" ? 55 : 80;
      const board = generateBoard4(number, Math.trunc(seed), slotCount, true, true);
      const activeFlowCount = freeActiveFlowCount4(difficulty);
      const generation = { ...generatedMetadata4(number, board, difficulty, activeFlowCount), seed: board.seed, difficulty };
      const level = variant === "adventure" ? { id: `seeded-persistent-${generation.seed}`, number, title: `Meccanismo ${number}`, schemaVersion: 1, variant: "persistent", activeFlowCount, generation, adventure: adventureConfig4(number, board), ...board } : { id: `seeded-loader-${generation.seed}`, number, title: `Caricatore ${number}`, schemaVersion: 1, variant: "loader", activeFlowCount, generation, positions: board.positions, initialRotation: board.initialRotation, outerValues: board.outerValues, queues: board.loaderQueues, slotPhases: board.slotPhases, optimalCost: board.optimalCost, solution: board.solution, solutionMoves: board.solutionMoves };
      return regenerateEffectAwareLevel4(level, createFreeModeEffectConfiguration4(difficulty, level.positions, generation.seed, freeEffectsEnabled));
    };
    applySolutionOperator4 = (value, operator) => operator === "divide2" ? value / 2 : operator === "divide3" ? value / 3 : operator === "zero" ? 0 : operator === "invert" ? -value : operator === "skip" ? value : value + operator;
    verifiesSolution4 = (level) => {
      if (level.effectConfiguration?.enabled) {
        const state = replaySolution4(level);
        return state.won && !timerDeadlineFailed4(state);
      }
      const solution = level.solution ?? [];
      const moves = level.solutionMoves ?? [];
      const requiredMoves = level.slotPhases.reduce((total, phase) => total + phase.length, 0);
      if (solution.length !== level.positions || moves.length !== requiredMoves) return false;
      const values = solution.map((slot) => slot.startValue);
      const cursors = Array(level.positions).fill(0);
      const queueCursors = Array(level.positions).fill(0);
      for (const move of moves) {
        const innerIndex = modulo5(move.outerIndex - move.rotation, level.positions);
        const operator = level.variant === "persistent" ? level.innerValues[innerIndex] : level.queues[innerIndex][queueCursors[innerIndex]++];
        if (operator !== move.operator || solution[move.outerIndex].operators[cursors[move.outerIndex]] !== move.operator) return false;
        values[move.outerIndex] = applySolutionOperator4(values[move.outerIndex], move.operator);
        cursors[move.outerIndex] += 1;
      }
      return values.every((value) => value === 0) && cursors.every((cursor, index) => cursor === solution[index].operators.length);
    };
    RDN_SOLUTION_TABLE4 = RDN_LEVELS4.map((level) => {
      const effectResolution = new LevelEffectConfigResolver().resolve(level.effectConfiguration, level.positions);
      const simulation = replaySolutionWithTrace4(level);
      return { level: level.number, variant: level.variant === "persistent" ? "adventure" : "time-attack", providedOperators: level.variant === "persistent" ? level.innerValues : level.queues.map((queue) => queue[0] ?? 0), slots: level.solution ?? [], moves: level.solutionMoves ?? [], execution: simulation.execution, effects: effectResolution.effects, finalValues: simulation.state.outerValues, verified: effectResolution.issues.length === 0 && simulation.state.won && !timerDeadlineFailed4(simulation.state) && verifiesSolution4(level) };
    });
    getRdnSolutionTable4 = (variant) => RDN_SOLUTION_TABLE4.filter((row) => row.variant === variant);
    validateAdventureLevelBatch4 = () => {
      const engine = new PuzzleEngine();
      return RDN_LEVELS4.filter((level) => level.variant === "persistent").map((level) => {
        let state = engine.createInitialState(level);
        for (const move of level.solutionMoves ?? []) {
          const delta = modulo5(move.rotation - state.rotation, level.positions);
          if (delta) state = engine.apply(level, state, { type: "ROTATE", direction: delta <= level.positions / 2 ? "CW" : "CCW", steps: delta <= level.positions / 2 ? delta : level.positions - delta });
          state = engine.apply(level, state, { type: "IMPULSE" });
        }
        return { level: level.number, valid: state.won && !timerDeadlineFailed4(state) };
      });
    };
    if (!useGeneratedCatalogue4) {
      if (RDN_SOLUTION_TABLE4.some((row) => !row.verified)) throw new Error("Invalid RDN solution table");
      if (validateAdventureLevelBatch4().some((row) => !row.valid)) throw new Error("Invalid Adventure level batch");
    }
  }
});

// src/app/core/game/phaser/catalogues/v007/catalogue.contract.ts
var catalogue_contract_exports4 = {};
__export(catalogue_contract_exports4, {
  RDN_CATALOGUE_CONTRACT: () => RDN_CATALOGUE_CONTRACT4
});
var RDN_CATALOGUE_CONTRACT4;
var init_catalogue_contract4 = __esm({
  "src/app/core/game/phaser/catalogues/v007/catalogue.contract.ts"() {
    "use strict";
    init_rdn_release_config4();
    RDN_CATALOGUE_CONTRACT4 = {
      version: "v007",
      levelSchemaVersion: 1,
      generatorVersion: RDN_RELEASE4.generatorVersion
    };
  }
});

// tools/rnd-catalogue/rnd-catalogue-runner.mjs
process.env.RDN_GENERATE_CATALOGUE = "1";
var version = process.env.RDN_CATALOGUE_VERSION ?? "v004";
var implementations = {
  v004: () => Promise.all([
    Promise.resolve().then(() => (init_catalog_builder(), catalog_builder_exports)),
    Promise.resolve().then(() => (init_catalogue_contract(), catalogue_contract_exports))
  ]),
  v005: () => Promise.all([
    Promise.resolve().then(() => (init_catalog_builder2(), catalog_builder_exports2)),
    Promise.resolve().then(() => (init_catalogue_contract2(), catalogue_contract_exports2))
  ]),
  v006: () => Promise.all([
    Promise.resolve().then(() => (init_catalog_builder3(), catalog_builder_exports3)),
    Promise.resolve().then(() => (init_catalogue_contract3(), catalogue_contract_exports3))
  ]),
  v007: () => Promise.all([
    Promise.resolve().then(() => (init_catalog_builder4(), catalog_builder_exports4)),
    Promise.resolve().then(() => (init_catalogue_contract4(), catalogue_contract_exports4))
  ])
};
var loadImplementation = implementations[version];
if (!loadImplementation) throw new Error(`Motore catalogo RDN non disponibile per la versione ${version}.`);
var [levels, contract] = await loadImplementation();
var implementation = { levels, contract };
var catalogue = {
  contract: implementation.contract.RDN_CATALOGUE_CONTRACT,
  levels: implementation.levels.RDN_LEVELS,
  audit: implementation.levels.RDN_SOLUTION_TABLE
};
export {
  catalogue
};
