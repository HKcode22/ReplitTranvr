import { describe, expect, it } from "vitest";
import {
  phase2gCleanupScopeHashV39,
  assertPhase2gCleanupJournalMatchV39,
  assertPhase2gCleanupBlobCountsV39,
} from "../server/lib/disruption/phase2gCleanupReplay_v39";
import type {
  Phase2gCleanupAttestationV39,
} from "../server/lib/disruption/phase2gCleanupAttestation_v39";

const proof: Phase2gCleanupAttestationV39 = {
  schema: "v39.phase2g-provider-inactive-cleanup-attestation.v1",
  callback_origin: "https://replit-tranvr--hk84164.replit.app",
  session_id: "12345678-1234-4234-8234-123456789abc",
  probe_id: 42,
  probe_budget_day_id: "P2G-S1-20261008-24",
  icao: "YSSY",
  provider_subscription_id: "synthetic-sub",
  deletion_run_id: "synthetic-run-001",
  expected_live_blobs: 3,
  active_billable_subscriptions: 0,
  provider_inventory_checked_at_utc: "2026-10-08T20:00:00Z",
  expires_at_utc: "2026-10-08T20:01:30Z",
};

const journal = {
  session_id: proof.session_id,
  probe_id: proof.probe_id,
  deletion_run_id: proof.deletion_run_id,
  expected_live_blobs: proof.expected_live_blobs,
  request_sha256: phase2gCleanupScopeHashV39(proof),
  state: "STARTED",
};

describe("Phase2G exact-session cleanup replay", () => {
  it("accepts the same run with refreshed inventory timestamps", () => {
    const renewed = {
      ...proof,
      provider_inventory_checked_at_utc: "2026-10-08T21:00:00Z",
      expires_at_utc: "2026-10-08T21:01:30Z",
    };
    expect(phase2gCleanupScopeHashV39(renewed))
      .toBe(phase2gCleanupScopeHashV39(proof));
    expect(assertPhase2gCleanupJournalMatchV39(renewed, journal))
      .toBe("STARTED");
  });

  it("rejects different deletion runs and scientific scope", () => {
    expect(() => assertPhase2gCleanupJournalMatchV39(
      { ...proof, deletion_run_id: "different-run-002" },
      journal,
    )).toThrow(/SCOPE_CONFLICT/);

    expect(() => assertPhase2gCleanupJournalMatchV39(
      { ...proof, provider_subscription_id: "another-sub" },
      journal,
    )).toThrow(/SCOPE_CONFLICT/);
  });

  it("accepts partially deleted blobs only for the exact run", () => {
    expect(() => assertPhase2gCleanupBlobCountsV39(
      { total: 3, live: 1, verified_for_run: 2 },
      3,
    )).not.toThrow();

    expect(() => assertPhase2gCleanupBlobCountsV39(
      { total: 3, live: 1, verified_for_run: 1 },
      3,
    )).toThrow(/BLOB_SET_MISMATCH/);
  });

  it("requires full deletion for a VERIFIED replay", () => {
    expect(() => assertPhase2gCleanupBlobCountsV39(
      { total: 3, live: 0, verified_for_run: 3 },
      3,
      true,
    )).not.toThrow();

    expect(() => assertPhase2gCleanupBlobCountsV39(
      { total: 3, live: 1, verified_for_run: 2 },
      3,
      true,
    )).toThrow(/BLOB_SET_MISMATCH/);

    expect(assertPhase2gCleanupJournalMatchV39(proof, {
      ...journal,
      state: "VERIFIED",
      deleted_blobs: 3,
      deleted_runtime_rows: 7,
      verified_at_utc: "2026-10-08T20:05:00Z",
    })).toBe("VERIFIED");
  });
});
