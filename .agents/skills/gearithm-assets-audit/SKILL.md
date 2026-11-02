---
name: gearithm-assets-audit
description: Validate GEARITHM atlas metadata, image bounds and audio paths when sprites, UI assets, effects visuals or sound packs change.
---

# Asset audit

Input: changed asset paths and their consumers. Output: missing paths, invalid frames, observed warnings and visual/audio checks.

1. Read `src/assets/AGENTS.md`, `src/app/core/services/ui/assets/atlas.service.ts`, `src/app/core/audio/audio.config.ts` and `src/assets/audio/README.md` as relevant.
2. Run `node .agents/skills/gearithm-assets-audit/scripts/audit-assets.mjs`. It reads atlas metadata and audio references without changing files. Missing audio is reported as a warning because the runtime permits fallback; decide whether each changed cue is release-critical.
3. Verify changed frame names in consumers and preview them in the existing atlas/sprite utility pages. Listen to changed cues and check volume, cooldown and concurrency on a device when possible.
4. Run `npm run build` only when asset imports or packaging changed. Catalogue JSON validation belongs to `gearithm-rdn-validation`.

Success: changed frames are within image bounds, referenced files resolve, and changed visuals/audio work on a mobile target.
