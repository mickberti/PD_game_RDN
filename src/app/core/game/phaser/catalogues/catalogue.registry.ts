import { ACTIVE_RDN_CATALOGUE_VERSION } from "./active-catalogue.config";
import { RDN_CATALOGUE_CONTRACT as v004Contract } from "./v004/catalogue.contract";
import * as v004Builder from "./v004/catalog.builder";

import { RDN_CATALOGUE_CONTRACT as v005Contract } from "./v005/catalogue.contract";
import * as v005Builder from "./v005/catalog.builder";

import { RDN_CATALOGUE_CONTRACT as v006Contract } from "./v006/catalogue.contract";
import * as v006Builder from "./v006/catalog.builder";

const catalogueRuntimes = {
  v004: {
    contract: v004Contract,
    generateRdnPuzzle: v004Builder.generateRdnPuzzle,
    prepareRdnCatalogueLevel: v004Builder.prepareRdnCatalogueLevel,
  },
  v005: {
    contract: v005Contract,
    generateRdnPuzzle: v005Builder.generateRdnPuzzle,
    prepareRdnCatalogueLevel: v005Builder.prepareRdnCatalogueLevel,
  },
  v006: {
    contract: v006Contract,
    generateRdnPuzzle: v006Builder.generateRdnPuzzle,
    prepareRdnCatalogueLevel: v006Builder.prepareRdnCatalogueLevel,
  },
} as const;

export type RdnCatalogueVersion = keyof typeof catalogueRuntimes;
export type RdnCatalogueRuntime = typeof catalogueRuntimes[RdnCatalogueVersion];

export const getRdnCatalogueRuntime = (version: string): RdnCatalogueRuntime => {
  const runtime = catalogueRuntimes[version as RdnCatalogueVersion];
  if (!runtime) throw new Error(`Motore catalogo RDN non disponibile per la versione ${version}.`);
  return runtime;
};

export const activeRdnCatalogueRuntime = getRdnCatalogueRuntime(ACTIVE_RDN_CATALOGUE_VERSION);
