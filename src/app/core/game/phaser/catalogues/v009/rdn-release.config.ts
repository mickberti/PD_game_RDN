import { PuzzleDifficulty, PuzzleVariant } from "../../puzzle.types";

/** Versions stamped into generated boards and aggregate events, never player data. */
export const RDN_RELEASE = {
  telemetrySchemaVersion: 1,
  generatorVersion: "rdn-generator-v2",
  balanceVersion: "rdn-balance-v1",
  saveSchemaVersion: 2,
} as const;

/** Gates allow a staged rollout without changing the deterministic core rules. */
export interface RdnFeatureFlags {
  colors: boolean;
  afflictions: boolean;
  ranked: boolean;
}

export const RDN_FEATURE_FLAGS: Readonly<RdnFeatureFlags> = {
  colors: false,
  afflictions: false,
  ranked: false,
};

/** Explicit release budgets. Browser profiling remains the source of measured values. */
export const RDN_PERFORMANCE_BUDGETS = {
  startupMs: 3000,
  boardGenerationMs: 50,
  frameMs: 16.7,
  initialBundleBytes: 2_000_000,
  assetMemoryBytes: 48_000_000,
} as const;

export interface RdnBalanceSnapshot {
  version: string;
  difficulty: PuzzleDifficulty;
  moveBudget: number;
  activeFlowCount: number;
}

/** Deliberately aggregate-only event schema: no account, device identifier or board values. */
export interface RdnTelemetryEvent {
  schemaVersion: typeof RDN_RELEASE.telemetrySchemaVersion;
  eventId: string;
  mode: PuzzleVariant | "free" | "ranked";
  difficulty: PuzzleDifficulty;
  generatorVersion: string;
  balanceVersion: string;
  seed: number;
  durationMs: number;
  impulses: number;
  rotationSteps: number;
  bonusUses: number;
  outcome: "won" | "lost" | "abandoned" | "recovered";
  abandonReason?: "backgrounded" | "incompatible-save" | "context-lost" | "network-unavailable" | "user-exit";
}

/** Protects the client queue from duplicate sends when a lifecycle callback fires twice. */
export const dedupeRdnTelemetry = (events: readonly RdnTelemetryEvent[]): readonly RdnTelemetryEvent[] => {
  const seen = new Set<string>();
  return events.filter((event) => !seen.has(event.eventId) && (seen.add(event.eventId), true));
};
