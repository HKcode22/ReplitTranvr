import { describe, expect, it } from "vitest";
import {
  HARD_RETENTION_LIMIT_HOURS,
  assertPaidProviderPersistenceAllowed,
  verifyRetentionDeploymentEvidence,
  type RetentionDeploymentEvidenceV39,
  type RoutineBackupExceptionReviewV39,
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
  function withReviewedBackup(): RetentionDeploymentEvidenceV39 {
    const e=evidence({verifiedAtUtc:"2026-11-15T20:00:00.000Z"});
    e.surfaces.backup={state:"DEPLOYED",plaintextProviderContentRecoverable:true,
      recoveryWindowHours:168,source:"CI routine backup fixture only"};
    const r:RoutineBackupExceptionReviewV39={
      schema:"v39.retention.routine-backup-review.v1",reviewedAtUtc:"2026-11-15T19:00:00.000Z",
      accountTermsReviewSha256:"0123456789abcdef".repeat(4),
      rotationAndAccessReviewSha256:"123456789abcdef0".repeat(4),
      restoreDrillReviewSha256:"23456789abcdef01".repeat(4),
      reviewedRotationHours:168,applicableAccountTermsAllowIncidentalBackup:true,
      routineMinimumNecessaryScopeVerified:true,restrictedOperationalPurposeOnlyVerified:true,
      noResearchOrTrainingReadVerified:true,restoreQuarantineAndOriginalExpiryVerified:true
    };
    e.routineBackupExceptionReview=r;
    return e;
  }
  it("accounts for an explicitly reviewed routine backup without changing actual recoverable age or active TTL",()=>{
    const e=withReviewedBackup(),v=verifyRetentionDeploymentEvidence(e);
    expect(v.pass).toBe(true);
    expect(v.routineBackupExceptionDisposition).toBe("REVIEW_EVIDENCE_ACCEPTED");
    expect(v.effectiveRecoverableHours).toEqual({raw_provider_content:336,live_fids_cache:192});
    expect(v.nonIncidentalRecoverableHours).toEqual({raw_provider_content:168,live_fids_cache:24});
    e.primaryExpiryHours={raw_provider_content:168,live_fids_cache:25};
    expect(verifyRetentionDeploymentEvidence(e).pass).toBe(false);
  });
  it("does not use public terms alone, a policy-only claim, stale rotation or unverified restore to approve backup",()=>{
    const e=withReviewedBackup(),r=e.routineBackupExceptionReview!;
    for(const bad of [
      {applicableAccountTermsAllowIncidentalBackup:false},
      {restrictedOperationalPurposeOnlyVerified:false},
      {routineMinimumNecessaryScopeVerified:false},
      {noResearchOrTrainingReadVerified:false},
      {restoreQuarantineAndOriginalExpiryVerified:false},
      {reviewedRotationHours:24},
      {reviewedAtUtc:"2026-09-12T05:59:00Z"},
      {reviewedAtUtc:"2026-11-16T00:00:00Z"},
      {restoreDrillReviewSha256:"a".repeat(64)},
      {accountTermsReviewSha256:r.restoreDrillReviewSha256}
    ]) {
      const v=verifyRetentionDeploymentEvidence({...e,routineBackupExceptionReview:{...r,...bad} as RoutineBackupExceptionReviewV39});
      expect(v.pass).toBe(false);
      expect(v.routineBackupExceptionDisposition).toBe("REVIEW_EVIDENCE_INVALID");
      expect(v.failures).toContain("routine-backup-exception-review-invalid");
    }
  });
  it("never exempts separately queryable replicas, objects or logs, and still rejects unknown surfaces",()=>{
    for(const name of ["replica","object","log"] as const){
      const e=withReviewedBackup();
      e.surfaces[name]={state:"DEPLOYED",plaintextProviderContentRecoverable:true,recoveryWindowHours:1,source:"CI"};
      const v=verifyRetentionDeploymentEvidence(e);
      expect(v.pass).toBe(false);
      expect(v.effectiveRecoverableHours.live_fids_cache).toBe(192);
      expect(v.nonIncidentalRecoverableHours.live_fids_cache).toBe(25);
    }
    const e=withReviewedBackup();
    e.surfaces.object={state:"UNKNOWN",plaintextProviderContentRecoverable:null,recoveryWindowHours:null,source:"unknown"};
    expect(verifyRetentionDeploymentEvidence(e).pass).toBe(false);
  });

});
