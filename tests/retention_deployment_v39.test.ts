import { describe, expect, it } from "vitest";
import {
  HARD_RETENTION_LIMIT_HOURS,
  assertPaidProviderPersistenceAllowed,
  verifyRetentionDeploymentEvidence,
  type RetentionDeploymentEvidenceV39,
} from "../server/lib/disruption/retentionDeployment_v39";

function evidence(overrides: Partial<RetentionDeploymentEvidenceV39> = {}): RetentionDeploymentEvidenceV39 {
  const base: RetentionDeploymentEvidenceV39 = {
    schemaVersion: "v3.9-retention-deployment-evidence-1",
    evidenceId: "RETENTION-DEPLOYMENT-20260911-001",
    verifiedAtUtc: "2026-09-12T05:59:00Z",
    primaryExpiryHours: {
      raw_provider_content: HARD_RETENTION_LIMIT_HOURS.raw_provider_content,
      live_fids_cache: HARD_RETENTION_LIMIT_HOURS.live_fids_cache,
    },
    surfaces: {
      primary: { state: "DEPLOYED", plaintextProviderContentRecoverable: true, recoveryWindowHours: 0, source: "test-primary" },
      replica: { state: "NOT_DEPLOYED", plaintextProviderContentRecoverable: false, recoveryWindowHours: 0, source: "test" },
      backup: { state: "NOT_DEPLOYED", plaintextProviderContentRecoverable: false, recoveryWindowHours: 0, source: "test" },
      object: { state: "NOT_DEPLOYED", plaintextProviderContentRecoverable: false, recoveryWindowHours: 0, source: "test" },
      log: { state: "DEPLOYED", plaintextProviderContentRecoverable: false, recoveryWindowHours: 0, source: "test-redacted-logs" },
    },
  };
  return { ...base, ...overrides };
}

describe("V3.9 retention deployment / recovery-window safety", () => {
  it("passes only when every deployed recovery surface keeps plaintext within the hard limits", () => {
    const verdict = verifyRetentionDeploymentEvidence(evidence());
    expect(verdict.pass).toBe(true);
    expect(verdict.effectiveRecoverableHours.raw_provider_content).toBe(168);
    expect(verdict.effectiveRecoverableHours.live_fids_cache).toBe(24);
    expect(() => assertPaidProviderPersistenceAllowed(evidence())).not.toThrow();
  });

  it("blocks the observed Replit 7-day PITR when primary rows also live to their contractual maxima", () => {
    const e = evidence();
    e.surfaces.backup = {
      state: "DEPLOYED",
      plaintextProviderContentRecoverable: true,
      recoveryWindowHours: 168,
      source: "Replit Database Settings: PITR On / last 7 days / Recovery window 7 Days",
    };
    const verdict = verifyRetentionDeploymentEvidence(e);
    expect(verdict.pass).toBe(false);
    expect(verdict.effectiveRecoverableHours.raw_provider_content).toBe(336);
    expect(verdict.effectiveRecoverableHours.live_fids_cache).toBe(192);
    expect(verdict.failures).toContain("recoverable-age-over-hard-limit:raw_provider_content:336h>168h");
    expect(verdict.failures).toContain("recoverable-age-over-hard-limit:live_fids_cache:192h>24h");
    expect(() => assertPaidProviderPersistenceAllowed(e)).toThrow("PREPAID_RETENTION_DEPLOYMENT_BLOCKED");
  });

  it("supports a shorter recovery window only when primary TTLs are shortened by the same safety margin", () => {
    const e = evidence({
      primaryExpiryHours: { raw_provider_content: 166, live_fids_cache: 22 },
    });
    e.surfaces.backup = {
      state: "DEPLOYED",
      plaintextProviderContentRecoverable: true,
      recoveryWindowHours: 2,
      source: "verified-configured-PITR-window",
    };
    const verdict = verifyRetentionDeploymentEvidence(e);
    expect(verdict.pass).toBe(true);
    expect(verdict.effectiveRecoverableHours.raw_provider_content).toBe(168);
    expect(verdict.effectiveRecoverableHours.live_fids_cache).toBe(24);
  });

  it("fails closed on UNKNOWN surfaces or unknown plaintext recoverability", () => {
    const e = evidence();
    e.surfaces.replica = { state: "UNKNOWN", plaintextProviderContentRecoverable: null, recoveryWindowHours: null, source: "not yet verified" };
    const verdict = verifyRetentionDeploymentEvidence(e);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("retention-surface-unknown:replica");
  });
});
