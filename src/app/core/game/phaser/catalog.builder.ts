/** Active catalogue facade. The selected version is controlled exclusively by ACTIVE_RDN_CATALOGUE_VERSION. */
import { activeRdnCatalogueRuntime } from "./catalogues/catalogue.registry";
import type { PuzzleSolutionAudit, PuzzleSolutionExecutionStep } from "./catalogues/v008/catalog.builder";

export type { PuzzleSolutionAudit, PuzzleSolutionExecutionStep };
export const RDN_LEVELS = activeRdnCatalogueRuntime.builder.RDN_LEVELS;
export const RDN_SOLUTION_TABLE = activeRdnCatalogueRuntime.builder.RDN_SOLUTION_TABLE;
export const prepareRdnCatalogueLevel = activeRdnCatalogueRuntime.prepareRdnCatalogueLevel;
export const generateRdnPuzzle = activeRdnCatalogueRuntime.generateRdnPuzzle;
export const getRdnLevel = activeRdnCatalogueRuntime.builder.getRdnLevel;
export const getRdnSolutionTable = activeRdnCatalogueRuntime.builder.getRdnSolutionTable;
export const validateAdventureLevelBatch = activeRdnCatalogueRuntime.builder.validateAdventureLevelBatch;
