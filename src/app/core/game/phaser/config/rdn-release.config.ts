/** Active catalogue release facade. */
import { activeRdnCatalogueRuntime } from "../catalogues/catalogue.registry";
export type { RdnFeatureFlags, RdnBalanceSnapshot, RdnTelemetryEvent } from "../catalogues/v009/rdn-release.config";
const release = activeRdnCatalogueRuntime.release as typeof import("../catalogues/v009/rdn-release.config");
export const RDN_RELEASE = release.RDN_RELEASE;
export const RDN_FEATURE_FLAGS = release.RDN_FEATURE_FLAGS;
export const RDN_PERFORMANCE_BUDGETS = release.RDN_PERFORMANCE_BUDGETS;
export const dedupeRdnTelemetry = release.dedupeRdnTelemetry;
