process.env.RDN_GENERATE_CATALOGUE = "1";

const version = process.env.RDN_CATALOGUE_VERSION ?? "v004";
const implementations = {
  v004: () => Promise.all([
    import("../../src/app/core/game/phaser/catalogues/v004/catalog.builder.ts"),
    import("../../src/app/core/game/phaser/catalogues/v004/catalogue.contract.ts"),
  ]),
  v005: () => Promise.all([
    import("../../src/app/core/game/phaser/catalogues/v005/catalog.builder.ts"),
    import("../../src/app/core/game/phaser/catalogues/v005/catalogue.contract.ts"),
  ]),
  v006: () => Promise.all([
    import("../../src/app/core/game/phaser/catalogues/v006/catalog.builder.ts"),
    import("../../src/app/core/game/phaser/catalogues/v006/catalogue.contract.ts"),
  ]),
  v007: () => Promise.all([
    import("../../src/app/core/game/phaser/catalogues/v007/catalog.builder.ts"),
    import("../../src/app/core/game/phaser/catalogues/v007/catalogue.contract.ts"),
  ]),
  v008: () => Promise.all([
    import("../../src/app/core/game/phaser/catalogues/v008/catalog.builder.ts"),
    import("../../src/app/core/game/phaser/catalogues/v008/catalogue.contract.ts"),
  ]),
  v009: () => Promise.all([
    import("../../src/app/core/game/phaser/catalogues/v009/catalog.builder.ts"),
    import("../../src/app/core/game/phaser/catalogues/v009/catalogue.contract.ts"),
  ]),
};
const loadImplementation = implementations[version];
if (!loadImplementation) throw new Error(`Motore catalogo RDN non disponibile per la versione ${version}.`);
const [levels, contract] = await loadImplementation();
const implementation = { levels, contract };

export const catalogue = {
  contract: implementation.contract.RDN_CATALOGUE_CONTRACT,
  levels: implementation.levels.RDN_LEVELS,
  audit: implementation.levels.RDN_SOLUTION_TABLE,
};
