# RDN catalogue tools

These scripts are developer-only. They are not imported by the Angular application.

- `npm run rdn:catalogue` generates and publishes the active JSON catalogue.
- `npm run rdn:catalogue:check` verifies that a generated catalogue is current.
- `npm run rdn:catalogue:activate -- --version v004` activates an existing JSON version.
- `npm run rdn:catalogue:migrate -- --version v004` imports a legacy TypeScript catalogue once.
- `npm run rdn:catalogue:fork -- --from v004 --to v005` copies and registers a new versioned engine without activating it.

Each engine lives in `src/app/core/game/phaser/catalogues/<version>/`. After editing a fork, publish it with `npm run rdn:catalogue -- --version v005`, then activate JSON, runtime and configuration facades together with `npm run rdn:catalogue:activate -- --version v005`.

Published runtime data lives in `src/assets/rnd/catalogues`. Historical TypeScript catalogues are archived in `legacy/` only for migration.
