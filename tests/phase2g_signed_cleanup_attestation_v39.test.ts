import { describe, expect, it } from "vitest";
import {
  parsePhase2gCleanupAttestationV39,
  signPhase2gCleanupAttestationV39,
  verifyPhase2gCleanupAttestationV39,
  type Phase2gCleanupAttestationV39,
} from "../server/lib/disruption/phase2gCleanupAttestation_v39";

const SECRET = "v39-phase2g-local-test-secret-never-use-in-production-0123456789";
const OTHER = "v39-phase2g-wrong-secret-never-use-in-production-9876543210";
const BASE = "https://replit-tranvr--hk84164.replit.app";
const NOW = new Date("2026-10-08T14:00:00.000Z");
const VALID: Phase2gCleanupAttestationV39 = {
  schema: "v39.phase2g-provider-inactive-cleanup-attestation.v1",
  callback_origin: BASE,
  session_id: "12345678-1234-4234-8234-123456789abc",
  probe_id: 24,
  probe_budget_day_id: "P2G-S1-20261009-24",
  icao: "YSSY",
  provider_subscription_id: "adb-sub-test-01",
  deletion_run_id: "phase2g-purpose-yssy-12345678",
  expected_live_blobs: 5,
  active_billable_subscriptions: 0,
  provider_inventory_checked_at_utc: "2026-10-08T13:59:45.000Z",
  expires_at_utc: "2026-10-08T14:01:30.000Z",
};

function validProof() { return signPhase2gCleanupAttestationV39(VALID, SECRET, NOW); }

describe("Phase2G GitHub-issued provider-inactive exact-session cleanup authorization", () => {
  it("accepts one fresh, exact, correctly signed cleanup for its intended receiver", () => {
    const proof = validProof();
    expect(proof).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyPhase2gCleanupAttestationV39(VALID, proof, SECRET, BASE, NOW))
      .toEqual(VALID);
  });
  it("rejects cross-session, cross-probe, cross-budget, cross-airport, and cross-subscription reuse", () => {
    const proof = validProof();
    const edits: Array<Partial<Phase2gCleanupAttestationV39>> = [
      { session_id: "12345678-1234-4234-8234-123456789abd" },
      { probe_id: 25 }, { probe_budget_day_id: "P2G-S1-20261009-25" },
      { icao: "WSSS" }, { provider_subscription_id: "adb-sub-test-02" },
      { deletion_run_id: "phase2g-purpose-yssy-87654321" },
      { expected_live_blobs: 0 },
    ];
    for (const edit of edits) {
      expect(() => verifyPhase2gCleanupAttestationV39({ ...VALID, ...edit }, proof, SECRET, BASE, NOW))
        .toThrow("CLEANUP_ATTESTATION_SIGNATURE_MISMATCH");
    }
  });
  it("rejects missing, wrong, forged or legacy bearer-secret credentials", () => {
    expect(() => verifyPhase2gCleanupAttestationV39(VALID, "", SECRET, BASE, NOW)).toThrow();
    expect(() => verifyPhase2gCleanupAttestationV39(VALID, SECRET, SECRET, BASE, NOW)).toThrow();
    expect(() => verifyPhase2gCleanupAttestationV39(VALID, validProof(), OTHER, BASE, NOW)).toThrow();
    expect(() => verifyPhase2gCleanupAttestationV39(VALID, validProof(), "", BASE, NOW)).toThrow();
  });
  it("rejects stale, future, overlong, or nonzero-active assertions", () => {
    expect(() => verifyPhase2gCleanupAttestationV39(VALID, validProof(), SECRET, BASE,
      new Date("2026-10-08T14:01:31Z"))).toThrow("CLEANUP_ATTESTATION_STALE_OR_INVALID_TIME");
    expect(() => parsePhase2gCleanupAttestationV39({ ...VALID, provider_inventory_checked_at_utc: "2026-10-08T14:02:00Z" }, NOW)).toThrow();
    expect(() => parsePhase2gCleanupAttestationV39({ ...VALID, expires_at_utc: "2026-10-08T14:20:00Z" }, NOW)).toThrow();
    expect(() => parsePhase2gCleanupAttestationV39({ ...VALID, active_billable_subscriptions: 1 }, NOW)).toThrow();
  });
  it("rejects cross-origin replay and ambiguous payload shapes", () => {
    const proof = validProof();
    expect(() => verifyPhase2gCleanupAttestationV39(VALID, proof, SECRET,
      "https://travnr.com", NOW)).toThrow("CLEANUP_ATTESTATION_WRONG_AUDIENCE");
    expect(() => verifyPhase2gCleanupAttestationV39(VALID, proof, SECRET,
      "http://replit-tranvr--hk84164.replit.app", NOW)).toThrow();
    expect(() => parsePhase2gCleanupAttestationV39({ ...VALID, unexpected_override: true }, NOW)).toThrow();
    expect(() => parsePhase2gCleanupAttestationV39({ ...VALID, callback_origin: "https://example.com/path" }, NOW)).toThrow();
    expect(() => parsePhase2gCleanupAttestationV39({ ...VALID, provider_subscription_id: "" }, NOW)).toThrow();
  });
});
