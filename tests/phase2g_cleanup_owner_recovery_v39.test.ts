import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  phase2gCleanupScopeHashV39,
  assertPhase2gCleanupJournalMatchV39,
  assertPhase2gCleanupBlobCountsV39,
} from "../server/lib/disruption/phase2gCleanupReplay_v39";
import type {
  Phase2gCleanupAttestationV39,
} from "../server/lib/disruption/phase2gCleanupAttestation_v39";

const owner = readFileSync(
  "scripts/v39_phase2g_github_signed_cleanup_v39.ts",
  "utf8",
);

const runtime = readFileSync(
  "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  "utf8",
);

const proof: Phase2gCleanupAttestationV39 = {
  schema: "v39.phase2g-provider-inactive-cleanup-attestation.v1",
  callback_origin: "https://replit-tranvr--hk84164.replit.app",
  session_id: "12345678-1234-4234-8234-123456789abc",
  probe_id: 42,
  probe_budget_day_id: "P2G-S1-20261008-24",
  icao: "YSSY",
  provider_subscription_id: "synthetic-sub",
  deletion_run_id: "original-run-001",
  expected_live_blobs: 3,
  active_billable_subscriptions: 0,
  provider_inventory_checked_at_utc: "2026-10-08T20:00:00Z",
  expires_at_utc: "2026-10-08T20:01:30Z",
};

describe("Phase2G GitHub exact-run recovery", () => {
  it("reuses the journal run and still requires provider inventories", () => {
    expect(owner).toContain(
      "LEFT JOIN clean.prepaid_probe_session_runtime s",
    );
    expect(owner).toContain(
      "assertPhase2gCleanupJournalMatchV39(claim, priorJournal)",
    );
    expect(owner).toContain(
      'priorJournal?.state === "VERIFIED"',
    );
    expect(owner).toContain(
      "assertPhase2gCleanupBlobCountsV39(",
    );
    expect(owner).toContain("listSubscriptionsStrict()");
    expect(owner).toContain("if (check === 0) await sleep(3000)");
    expect(owner).toContain(
      "REFUSED:PREEXISTING_DELETION_WITHOUT_JOURNAL",
    );
  });

  it("requires source-selected tombstone run identity", () => {
    const fn = runtime.slice(
      runtime.indexOf(
        "export async function cleanupPrepaidProbeSessionLocalV39(",
      ),
      runtime.indexOf(
        "export async function cleanupPrepaidProbeSessionV39(",
      ),
    );
    expect(fn).toContain(
      "deletion_verified_at_utc,deletion_run_id",
    );
    expect(fn).toContain(
      "PHASE2G_CLEANUP_RESUME_TOMBSTONE_INVALID",
    );
  });

  it("accepts renewed inventory time but not a new deletion run", () => {
    const j = {
      session_id: proof.session_id,
      probe_id: proof.probe_id,
      deletion_run_id: proof.deletion_run_id,
      request_sha256: phase2gCleanupScopeHashV39(proof),
      expected_live_blobs: 3,
      state: "STARTED",
    };

    expect(assertPhase2gCleanupJournalMatchV39(
      { ...proof, expires_at_utc: "2026-10-08T21:01:30Z" },
      j,
    )).toBe("STARTED");

    expect(() => assertPhase2gCleanupJournalMatchV39(
      { ...proof, deletion_run_id: "new-run-002" },
      j,
    )).toThrow(/SCOPE_CONFLICT/);

    expect(() => assertPhase2gCleanupBlobCountsV39(
      { total: 3, live: 1, verified_for_run: 2 },
      3,
    )).not.toThrow();

    expect(() => assertPhase2gCleanupBlobCountsV39(
      { total: 3, live: 1, verified_for_run: 1 },
      3,
    )).toThrow(/BLOB_SET_MISMATCH/);
  });
});
