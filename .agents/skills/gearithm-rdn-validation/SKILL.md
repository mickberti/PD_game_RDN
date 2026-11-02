---
name: gearithm-rdn-validation
description: Validate or investigate GEARITHM RDN gameplay, generated levels, catalogue versions and solution replay when puzzle rules or level generation change.
---

# RDN validation

Input: changed rules/catalogue version, mode and reproducible seed or level. Output: failing case, affected versions/modes, commands and result.

1. Read `src/app/core/game/phaser/AGENTS.md`, `puzzle.engine.ts`, the active `catalogues/<version>/catalog.builder.ts`, and `tools/rnd-catalogue/README.md`. Distinguish UI modes (`adventure`, `time-attack`, `free`) from published JSON variants (`persistent`, `loader`).
2. Run `node .agents/skills/gearithm-rdn-validation/scripts/audit-catalogue.mjs` for structural checks of the active published catalogue. This does **not** replay solutions.
3. For gameplay or generation changes, use existing `puzzle.engine.spec.ts`, `puzzle-generation.spec.ts`, `rdn-simulation.spec.ts` and `npm run rdn:catalogue:check`. The catalogue command may create and remove a temporary bundle under `scripts`; inspect Git status before/after. If Karma cannot run, report it and use an isolated headless runner only if available.
4. Reproduce with version, mode, difficulty, seed, sphere count and action sequence. Check rotation, impulse, win, restart/undo and save recovery according to the changed path. For new levels, use the existing builder and `--no-save` workflow; do not invent or hand-edit generated JSON.
5. Preserve historical catalogue contracts. A changed published version needs explicit migration/release intent; new rules normally go into a fork.

Success: no structural errors, relevant replay/spec checks pass or their blocker is documented, and identical inputs reproduce the same outcome. Read `docs/rnd-release.md` for full release gates only when preparing a release.
