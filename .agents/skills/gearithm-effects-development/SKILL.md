---
name: gearithm-effects-development
description: Add, change or debug GEARITHM GEM, LINK or AREA effects across configuration, deterministic engine, semantic events and Phaser presentation.
---

# Effect development

Input: effect scope, behavior, target, affected mode/version and visual cue. Output: coherent engine/config/rendering change with focused evidence.

1. Read `src/app/core/game/phaser/AGENTS.md` and the current `effects.models.ts`, `effect-presets.config.ts`, `level-effect-config.resolver.ts`, `effect-flow.engine.ts`, `effect-phaser.renderer.ts`. Use `docs/effect-system.md` as historical context; verify current versioned progression before applying its numeric limits.
2. Trace the effect through target validation, preset/override, runtime state, resolution order, emitted `EffectEngineEvent`, presentation and audio. Existing scopes are GEM, LINK and AREA; the current preset list includes FIRE, CHAIN_LINK, AREA_ICE and AREA_INVERTER in addition to older effects.
3. Keep calculation in the engine, visual timing in Phaser. Preserve a level without `effectConfiguration`, deterministic replay and restart restoring runtime state. Use `effect-playground.config.ts` for isolated scenarios and avoid persisting playground rewards.
4. Run relevant `effect-flow.engine.spec.ts`, `level-effect-config.resolver.spec.ts`, `effect-puzzle-integration.spec.ts`, versioned progression specs and `npm run typecheck`. Check affected atlas/audio cues using the asset Skill when visual resources change.

Success: same seed/actions produce the same values/events, invalid targets fail safely, restart restores the effect and mobile rendering matches engine events.
