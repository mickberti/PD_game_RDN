# Audio assets to add

The application is safe to run without these files: failed loads are ignored in normal builds.
`src/app/core/audio/audio.config.ts` is the canonical asset manifest: every cue includes its path,
duration range, intended character, intensity and mixing priority. The first test delivery uses
`.wav` files at the listed paths below `src/assets/audio/`. A release pass can replace the single
source mapping in the catalog with `.ogg` plus `.mp3` fallback without changing gameplay code.

Expected folders are `music/menu`, `music/gameplay`, `sfx/ui`, `sfx/gear`, `sfx/pulse`, `sfx/gem`,
`sfx/effects`, and `sfx/gameplay`.

Required variants are `sfx/gear/rotate-01..03` and `sfx/gem/change-01..03`. The runtime chooses
one alternate at random, retaining the per-cue cooldown and concurrency limits.
