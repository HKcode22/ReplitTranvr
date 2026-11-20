export type HardRetentionClass = "raw_provider_content" | "live_fids_cache";
export type RetentionSurfaceState = "DEPLOYED" | "NOT_DEPLOYED" | "UNKNOWN";

export const HARD_RETENTION_LIMIT_HOURS: Readonly<Record<HardRetentionClass, number>> = Object.freeze({
  raw_provider_content: 7 * 24,
  live_fids_cache: 24,
});

export interface RetentionSurfaceEvidence {
  state: RetentionSurfaceState;
  plaintextProviderContentRecoverable: boolean | null;
  recoveryWindowHours: number | null;
  source: string;
  note?: string;
}

/** Reviewed account-specific application of Article 5.8 incidental backup
 * category. Evidence is supplied by the independent reviewer; this verifier
 * does not fetch, authenticate or interpret the underlying agreement.
 * Not an extension of live Contents, a data-source license, or a GO. */
export interface RoutineBackupExceptionReviewV39 {
  schema: "v39.retention.routine-backup-review.v1";
  reviewedAtUtc: string;
  accountTermsReviewSha256: string;
  rotationAndAccessReviewSha256: string;
  /** Either a real recovery drill review or a non-destructive recovery-control
   * review may be supplied. A production restore is not required merely to
   * demonstrate Article 5.8 recovery-only handling. */
  restoreDrillReviewSha256?: string;
  restoreControlReviewSha256?: string;
  productionRestoreReplacesLiveDataVerified?: true;
  recoveryOnlyRestorePurposeVerified?: true;
  reviewedRotationHours: number;
  applicableAccountTermsAllowIncidentalBackup: true;
  routineMinimumNecessaryScopeVerified: true;
  restrictedOperationalPurposeOnlyVerified: true;
  noResearchOrTrainingReadVerified: true;
  restoreQuarantineAndOriginalExpiryVerified: true;
}

export interface RetentionDeploymentEvidenceV39 {
  routineBackupExceptionReview?: RoutineBackupExceptionReviewV39;
  schemaVersion: "v3.9-retention-deployment-evidence-1";
  evidenceId: string;
  verifiedAtUtc: string;
  primaryExpiryHours: Readonly<Record<HardRetentionClass, number>>;
  surfaces: {
    primary: RetentionSurfaceEvidence;
    replica: RetentionSurfaceEvidence;
    backup: RetentionSurfaceEvidence;
    object: RetentionSurfaceEvidence;
    log: RetentionSurfaceEvidence;
  };
}

export interface RetentionDeploymentVerdict {
  pass: boolean;
  failures: string[];
  /** Physical recoverability includes even qualifying incidental backup copies. */
  effectiveRecoverableHours: Readonly<Record<HardRetentionClass, number | null>>;
  nonIncidentalRecoverableHours: Readonly<Record<HardRetentionClass, number | null>>;
  routineBackupExceptionDisposition: "NOT_REVIEWED" | "REVIEW_EVIDENCE_INVALID" | "REVIEW_EVIDENCE_ACCEPTED";
}

function isNonNegativeFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}
const SHA = /^[a-f0-9]{64}$/;
function reviewedRoutineBackup(e: RetentionDeploymentEvidenceV39): boolean {
  const r=e.routineBackupExceptionReview, b=e.surfaces?.backup;
  if(!r || !b || b.state!=="DEPLOYED" || b.plaintextProviderContentRecoverable!==true ||
     !isNonNegativeFinite(b.recoveryWindowHours) || b.recoveryWindowHours<=0) return false;
  const reviewed=Date.parse(r.reviewedAtUtc), verified=Date.parse(e.verifiedAtUtc);
  const validHash=(x:unknown):x is string=>typeof x==="string"&&SHA.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
  const drill=validHash(r.restoreDrillReviewSha256);
  const control=validHash(r.restoreControlReviewSha256);
  // Exactly one recovery proof path. A non-destructive control review is
  // accepted only when the reviewer has verified that production restore
  // replaces live data and that any restore remains recovery-only.
  if(drill===control) return false;
  const recoveryEvidenceSha256=drill?r.restoreDrillReviewSha256!:r.restoreControlReviewSha256!;
  return r.schema==="v39.retention.routine-backup-review.v1" &&
    Number.isFinite(reviewed) && Number.isFinite(verified) &&
    reviewed>=Date.parse("2026-10-11T00:00:00Z") && reviewed<=verified &&
    [r.accountTermsReviewSha256,r.rotationAndAccessReviewSha256,recoveryEvidenceSha256]
      .every(validHash) &&
    new Set([r.accountTermsReviewSha256,r.rotationAndAccessReviewSha256,recoveryEvidenceSha256]).size===3 &&
    (drill || (r.productionRestoreReplacesLiveDataVerified===true &&
               r.recoveryOnlyRestorePurposeVerified===true)) &&
    r.reviewedRotationHours===b.recoveryWindowHours &&
    r.applicableAccountTermsAllowIncidentalBackup===true &&
    r.routineMinimumNecessaryScopeVerified===true &&
    r.restrictedOperationalPurposeOnlyVerified===true &&
    r.noResearchOrTrainingReadVerified===true &&
    r.restoreQuarantineAndOriginalExpiryVerified===true;
}

/**
 * Verify the complete storage/recovery surface, not only the primary row TTL.
 *
 * For a surface from which plaintext provider Contents can be reconstructed,
 * the recovery window extends the age at which the content remains recoverable.
 * Example: primary deletion at 24h plus 168h PITR means the original FIDS
 * plaintext can remain recoverable at an age of roughly 192h, so a 24h hard
 * maximum is not satisfied under the original ordinary-cache policy.
 * The later Article 5.8 incidental-backup path is conditional on actual
 * account applicability, verified ordinary rotation, restricted use and
 * either a reviewed recovery drill or a non-destructive recovery-control
 * review that quarantines restored data and re-enforces original expiry
 * before any non-recovery access.
 * No backup-only exception enlarges primary/replica/object/log retention.
 */
export function verifyRetentionDeploymentEvidence(
  evidence: RetentionDeploymentEvidenceV39,
): RetentionDeploymentVerdict {
  const failures: string[] = [];
  if (evidence.schemaVersion !== "v3.9-retention-deployment-evidence-1") failures.push("deployment-schema-version-invalid");
  if (!/^RETENTION-DEPLOYMENT-\d{8}-[A-Z0-9]+$/.test(evidence.evidenceId)) failures.push("deployment-evidence-id-invalid");
  if (!Number.isFinite(Date.parse(evidence.verifiedAtUtc))) failures.push("deployment-verified-at-invalid");

  const surfaceNames = ["primary", "replica", "backup", "object", "log"] as const;
  for (const name of surfaceNames) {
    const surface = evidence.surfaces?.[name];
    if (!surface) {
      failures.push(`retention-surface-missing:${name}`);
      continue;
    }
    if (surface.state === "UNKNOWN") failures.push(`retention-surface-unknown:${name}`);
    if (!["DEPLOYED","NOT_DEPLOYED","UNKNOWN"].includes(surface.state)) failures.push(`retention-surface-state-invalid:${name}`);
    if (!surface.source?.trim()) failures.push(`retention-surface-source-missing:${name}`);
    if (surface.state === "DEPLOYED") {
      if (typeof surface.plaintextProviderContentRecoverable !== "boolean") failures.push(`retention-surface-recoverability-unknown:${name}`);
      if (surface.plaintextProviderContentRecoverable === true && !isNonNegativeFinite(surface.recoveryWindowHours)) {
        failures.push(`retention-surface-window-unknown:${name}`);
      }
    }
  }

  if (evidence.surfaces?.primary?.state !== "DEPLOYED") failures.push("primary-retention-surface-must-be-deployed");

  const effective: Record<HardRetentionClass, number | null> = {
    raw_provider_content: null,
    live_fids_cache: null,
  };

  const operational: Record<HardRetentionClass, number | null> = {
    raw_provider_content: null,
    live_fids_cache: null,
  };
  const exceptionProvided=evidence.routineBackupExceptionReview!==undefined;
  const reviewedBackup=reviewedRoutineBackup(evidence);
  const routineBackupExceptionDisposition = reviewedBackup ? "REVIEW_EVIDENCE_ACCEPTED" as const :
    exceptionProvided ? "REVIEW_EVIDENCE_INVALID" as const : "NOT_REVIEWED" as const;
  if(exceptionProvided&&!reviewedBackup) failures.push("routine-backup-exception-review-invalid");

  for (const contentClass of Object.keys(HARD_RETENTION_LIMIT_HOURS) as HardRetentionClass[]) {
    const primaryExpiry = evidence.primaryExpiryHours?.[contentClass];
    if (!isNonNegativeFinite(primaryExpiry)) {
      failures.push(`primary-expiry-invalid:${contentClass}`);
      continue;
    }
    const hardLimit = HARD_RETENTION_LIMIT_HOURS[contentClass];
    if (primaryExpiry > hardLimit) failures.push(`primary-expiry-over-hard-limit:${contentClass}`);

    let longestRecovery = 0;
    let longestOperationalRecovery = 0;
    let recoveryKnown = true;
    for (const name of surfaceNames) {
      if (name === "primary") continue;
      const surface = evidence.surfaces?.[name];
      if (!surface || surface.state !== "DEPLOYED" || surface.plaintextProviderContentRecoverable !== true) continue;
      if (!isNonNegativeFinite(surface.recoveryWindowHours)) {
        recoveryKnown = false;
        continue;
      }
      longestRecovery = Math.max(longestRecovery, surface.recoveryWindowHours);
      // Only the independently reviewed routine backup may be excluded
      // from the ordinary active-data ceiling; replicas, objects and logs
      // remain on the original conservative clock.
      if(name!=="backup"||!reviewedBackup)
        longestOperationalRecovery=Math.max(longestOperationalRecovery,surface.recoveryWindowHours);
    }
    if (!recoveryKnown) continue;
    const recoverableAge = primaryExpiry + longestRecovery;
    effective[contentClass] = recoverableAge;
    const activeAge=primaryExpiry+longestOperationalRecovery;
    operational[contentClass]=activeAge;
    if (activeAge > hardLimit) {
      failures.push(`recoverable-age-over-hard-limit:${contentClass}:${activeAge}h>${hardLimit}h`);
    }
  }

  return {
    pass: failures.length === 0,
    failures: [...new Set(failures)].sort(),
    effectiveRecoverableHours: effective,
    nonIncidentalRecoverableHours: operational,
    routineBackupExceptionDisposition,
  };
}

export function assertPaidProviderPersistenceAllowed(evidence: RetentionDeploymentEvidenceV39): void {
  const verdict = verifyRetentionDeploymentEvidence(evidence);
  if (!verdict.pass) {
    throw new Error(`PREPAID_RETENTION_DEPLOYMENT_BLOCKED:${verdict.failures.slice(0, 5).join(",")}`);
  }
}
