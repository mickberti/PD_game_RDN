import { ACTIVE_RDN_CATALOGUE_VERSION } from "./active-catalogue.config";
import { RDN_CATALOGUE_CONTRACT as v004Contract } from "./v004/catalogue.contract";
import * as v004Builder from "./v004/catalog.builder";

import { RDN_CATALOGUE_CONTRACT as v005Contract } from "./v005/catalogue.contract";
import * as v005Builder from "./v005/catalog.builder";

import { RDN_CATALOGUE_CONTRACT as v006Contract } from "./v006/catalogue.contract";
import * as v006Builder from "./v006/catalog.builder";

import { RDN_CATALOGUE_CONTRACT as v007Contract } from "./v007/catalogue.contract";
import * as v007Builder from "./v007/catalog.builder";
import * as v004Levels from "./v004/levels.config";
import * as v005Levels from "./v005/levels.config";
import * as v006Levels from "./v006/levels.config";
import * as v007Levels from "./v007/levels.config";
import * as v004Progression from "./v004/progression-rules.config";
import * as v005Progression from "./v005/progression-rules.config";
import * as v006Progression from "./v006/progression-rules.config";
import * as v007Progression from "./v007/progression-rules.config";
import * as v004Effects from "./v004/effect-progression.config";
import * as v005Effects from "./v005/effect-progression.config";
import * as v006Effects from "./v006/effect-progression.config";
import * as v007Effects from "./v007/effect-progression.config";
import * as v004Release from "./v004/rdn-release.config";
import * as v005Release from "./v005/rdn-release.config";
import * as v006Release from "./v006/rdn-release.config";
import * as v007Release from "./v007/rdn-release.config";

const catalogueRuntimes = {
  v004: {
    contract: v004Contract,
    generateRdnPuzzle: v004Builder.generateRdnPuzzle,
    prepareRdnCatalogueLevel: v004Builder.prepareRdnCatalogueLevel,
    builder: v004Builder, levels: v004Levels, progression: v004Progression, effects: v004Effects, release: v004Release,
  },
  v005: {
    contract: v005Contract,
    generateRdnPuzzle: v005Builder.generateRdnPuzzle,
    prepareRdnCatalogueLevel: v005Builder.prepareRdnCatalogueLevel,
    builder: v005Builder, levels: v005Levels, progression: v005Progression, effects: v005Effects, release: v005Release,
  },
  v006: {
    contract: v006Contract,
    generateRdnPuzzle: v006Builder.generateRdnPuzzle,
    prepareRdnCatalogueLevel: v006Builder.prepareRdnCatalogueLevel,
    builder: v006Builder, levels: v006Levels, progression: v006Progression, effects: v006Effects, release: v006Release,
  },
  v007: {
    contract: v007Contract,
    generateRdnPuzzle: v007Builder.generateRdnPuzzle,
    prepareRdnCatalogueLevel: v007Builder.prepareRdnCatalogueLevel,
    builder: v007Builder, levels: v007Levels, progression: v007Progression, effects: v007Effects, release: v007Release,
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
