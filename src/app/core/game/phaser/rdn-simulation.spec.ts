import { dedupeRdnTelemetry, RDN_RELEASE, RdnTelemetryEvent } from "./config/rdn-release.config";
import { simulateRdnGeneration } from "./rdn-simulation";

describe("RDN release gates", () => {
  it("replays a representative seed matrix without insoluble boards", () => {
    const report = simulateRdnGeneration(100);
    expect(report.failures).toEqual([]);
    expect(report.solved).toBe(report.samples);
  });

  it("deduplicates lifecycle telemetry by opaque event id", () => {
    const event: RdnTelemetryEvent = { schemaVersion: RDN_RELEASE.telemetrySchemaVersion, eventId: "run-1", mode: "persistent", difficulty: "EASY", generatorVersion: "v", balanceVersion: "b", seed: 1, durationMs: 100, impulses: 1, rotationSteps: 0, bonusUses: 0, outcome: "won" };
    expect(dedupeRdnTelemetry([event, event])).toEqual([event]);
  });
});
