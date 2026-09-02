process.env.RDN_GENERATE_CATALOGUE = "1";

const version = process.env.RDN_CATALOGUE_VERSION ?? "v004";
const implementations = {
  v004: {
    levels: await import("../../src/app/core/game/phaser/catalogues/v004/catalog.builder.ts"),
    contract: await import("../../src/app/core/game/phaser/catalogues/v004/catalogue.contract.ts"),
  },
  v005: {
    levels: await import("../../src/app/core/game/phaser/catalogues/v005/catalog.builder.ts"),
    contract: await import("../../src/app/core/game/phaser/catalogues/v005/catalogue.contract.ts"),
  },
};
const implementation = implementations[version];
if (!implementation) throw new Error(`Motore catalogo RDN non disponibile per la versione ${version}.`);

export const catalogue = {
  contract: implementation.contract.RDN_CATALOGUE_CONTRACT,
  levels: implementation.levels.RDN_LEVELS,
  audit: implementation.levels.RDN_SOLUTION_TABLE,
};
