import { describe, expect, it, vi } from "vitest";
import {
  RETENTION_SURFACES,
  PHASE0_RETENTION_PLAN,
  PHASE0_RETENTION_PLAN_HASH,
  assertSubscriptionStartAllowed,
  checkLeastPrivilege,
  checkWebhookSecurity,
  executeRetentionDryRun,
  triggerIncidentStop,
  type RetentionAdapters,
} from "../server/lib/disruption/retentionSecurity_v39";

function adapters(deleteSpy = vi.fn()): RetentionAdapters {
  return Object.fromEntries(RETENTION_SURFACES.map((surface) => [surface, {
    listExpired: async () => [{ id: `${surface}-1`, contentHash: "b".repeat(64), expiresAt: "2026-01-01T00:00:00Z", containsRawContent: true }],
    delete: deleteSpy,
  }])) as RetentionAdapters;
}

describe("Phase-0 retention/security machinery", () => {
  it("dry-runs every declared surface without deleting", async () => {
    const deletion = vi.fn();
    const result = await executeRetentionDryRun(adapters(deletion), "2026-01-02T00:00:00Z", true);
    expect(result.actions.map((x) => x.surface).sort()).toEqual([...RETENTION_SURFACES].sort());
    expect(result.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.planHash).toBe(PHASE0_RETENTION_PLAN_HASH);
    expect(PHASE0_RETENTION_PLAN.legalPeriods).toBe("BLOCKED_PENDING_PREREQUISITE_P");
    expect(deletion).not.toHaveBeenCalled();
  });

  it("refuses destructive execution and malformed candidates", async () => {
    await expect(executeRetentionDryRun(adapters(), "2026-01-02T00:00:00Z", false)).rejects.toThrow("REFUSE_LIVE_DELETION_PHASE0");
    const bad = adapters();
    bad.primary.listExpired = async () => [{ id: "future", contentHash: "x", expiresAt: "2030-01-01T00:00:00Z", containsRawContent: true }];
    await expect(executeRetentionDryRun(bad, "2026-01-02T00:00:00Z", true)).rejects.toThrow("REFUSE_INVALID_RETENTION_CANDIDATE");
  });

  it("proves least privilege, TLS/auth and compensating control checks", () => {
    expect(checkLeastPrivilege({ tls: true, role: "travnr_runtime", grants: ["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"], auditLogging: true }).pass).toBe(true);
    expect(checkLeastPrivilege({ tls: false, role: "admin", grants: ["DROP_DATABASE"], auditLogging: false }).pass).toBe(false);
    expect(checkLeastPrivilege({ tls: true, role: "travnr_runtime", grants: ["CLEAN_SCHEMA_DML"], auditLogging: true }).pass).toBe(false);
    expect(checkWebhookSecurity({ url: "https://hooks.example.test", providerAuth: "signature", compensatingControlApproved: false, replaySafeIdentity: true }).pass).toBe(true);
    expect(checkWebhookSecurity({ url: "http://localhost", providerAuth: "none", compensatingControlApproved: false, replaySafeIdentity: false }).pass).toBe(false);
  });

  it("incident failures stop subscription admission pending human review", () => {
    for (const cause of ["authentication", "raw-persistence", "reconciliation", "deletion"] as const) {
      const state = triggerIncidentStop(cause, "2026-01-01T00:00:00Z");
      expect(state.humanReviewRequired).toBe(true);
      expect(() => assertSubscriptionStartAllowed(state)).toThrow("REFUSE_INCIDENT_STOP");
    }
  });
});
