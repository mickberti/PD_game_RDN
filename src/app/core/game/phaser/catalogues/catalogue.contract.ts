/** Stable contract between a versioned catalogue engine and the shared game runtime. */
export interface RdnCatalogueContract {
  readonly version: string;
  readonly levelSchemaVersion: 1;
  readonly generatorVersion: string;
}
