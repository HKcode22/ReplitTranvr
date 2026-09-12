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

export interface RetentionDeploymentEvidenceV39 {
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
  effectiveRecoverableHours: Readonly<Record<HardRetentionClass, number | null>>;
}

function isNonNegativeFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/**
 * Verify the complete storage/recovery surface, not only the primary row TTL.
 *
 * For a surface from which plaintext provider Contents can be reconstructed,
 * the recovery window extends the age at which the content remains recoverable.
 * Example: primary deletion at 24h plus 168h PITR means the original FIDS
 * plaintext can remain recoverable at an age of roughly 192h, so a 24h hard
 * maximum is not satisfied.
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
    if (!surface.source?.trim()) failures.push(`retention-surface-source-missing:${name}`);
    if (surface.state === "DEPLOYED") {
      if (surface.plaintextProviderContentRecoverable === null) failures.push(`retention-surface-recoverability-unknown:${name}`);
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

  for (const contentClass of Object.keys(HARD_RETENTION_LIMIT_HOURS) as HardRetentionClass[]) {
    const primaryExpiry = evidence.primaryExpiryHours?.[contentClass];
    if (!isNonNegativeFinite(primaryExpiry)) {
      failures.push(`primary-expiry-invalid:${contentClass}`);
      continue;
    }
    const hardLimit = HARD_RETENTION_LIMIT_HOURS[contentClass];
    if (primaryExpiry > hardLimit) failures.push(`primary-expiry-over-hard-limit:${contentClass}`);

    let longestRecovery = 0;
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
    }
    if (!recoveryKnown) continue;
    const recoverableAge = primaryExpiry + longestRecovery;
    effective[contentClass] = recoverableAge;
    if (recoverableAge > hardLimit) {
      failures.push(`recoverable-age-over-hard-limit:${contentClass}:${recoverableAge}h>${hardLimit}h`);
    }
  }

  return {
    pass: failures.length === 0,
    failures: [...new Set(failures)].sort(),
    effectiveRecoverableHours: effective,
  };
}

export function assertPaidProviderPersistenceAllowed(evidence: RetentionDeploymentEvidenceV39): void {
  const verdict = verifyRetentionDeploymentEvidence(evidence);
  if (!verdict.pass) {
    throw new Error(`PREPAID_RETENTION_DEPLOYMENT_BLOCKED:${verdict.failures.slice(0, 5).join(",")}`);
  }
}
