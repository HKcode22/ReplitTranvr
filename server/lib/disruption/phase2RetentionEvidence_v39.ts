export interface Phase2RetentionScopeEvidenceV39 {
  schemaVersion: "v3.9-phase2-retention-scope-evidence-1";
  evidenceId: string;
  verifiedAtUtc: string;
  providerTermsSource: string;
  rawProviderMaxHours: number;
  liveFidsMaxHours: number;
  gate1SourceListsTransient: true;
  prepaidRawStorage: "replit_app_storage";
  prepaidRuntimeStorage: "postgres_unlogged";
  postgresPitrContainsPrepaidProviderPlaintext: false;
  dedicatedProviderBucketRequired: true;
  providerBlobDeletionOwner: "providerBlobExpiry_v39";
  prepaidSessionDeletionOwner: "prepaidProbeExpiry_v39";
  ownerApproved: true;
  note?: string;
}

export interface Phase2RetentionScopeVerdictV39 {
  pass: boolean;
  failures: string[];
}

export function parsePhase2RetentionScopeEvidenceV39(raw: string): Phase2RetentionScopeEvidenceV39 {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("PHASE2_RETENTION_EVIDENCE_NOT_JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("PHASE2_RETENTION_EVIDENCE_NOT_OBJECT");
  }
  return value as Phase2RetentionScopeEvidenceV39;
}

export function verifyPhase2RetentionScopeEvidenceV39(
  e: Phase2RetentionScopeEvidenceV39,
): Phase2RetentionScopeVerdictV39 {
  const failures: string[] = [];
  if (e.schemaVersion !== "v3.9-phase2-retention-scope-evidence-1") failures.push("schema-version-invalid");
  if (!/^RETENTION-PHASE2-\d{8}-[A-Z0-9]+$/.test(String(e.evidenceId ?? ""))) failures.push("evidence-id-invalid");
  if (!Number.isFinite(Date.parse(String(e.verifiedAtUtc ?? "")))) failures.push("verified-at-invalid");
  if (!String(e.providerTermsSource ?? "").trim()) failures.push("provider-terms-source-missing");
  if (!Number.isInteger(e.rawProviderMaxHours) || e.rawProviderMaxHours < 1 || e.rawProviderMaxHours > 168) {
    failures.push("raw-provider-max-hours-invalid");
  }
  if (!Number.isInteger(e.liveFidsMaxHours) || e.liveFidsMaxHours < 1 || e.liveFidsMaxHours > 24) {
    failures.push("live-fids-max-hours-invalid");
  }
  if (e.gate1SourceListsTransient !== true) failures.push("gate1-source-lists-not-transient");
  if (e.prepaidRawStorage !== "replit_app_storage") failures.push("prepaid-raw-storage-invalid");
  if (e.prepaidRuntimeStorage !== "postgres_unlogged") failures.push("prepaid-runtime-storage-invalid");
  if (e.postgresPitrContainsPrepaidProviderPlaintext !== false) failures.push("postgres-pitr-prepaid-plaintext-not-proven-absent");
  if (e.dedicatedProviderBucketRequired !== true) failures.push("dedicated-provider-bucket-not-required");
  if (e.providerBlobDeletionOwner !== "providerBlobExpiry_v39") failures.push("provider-blob-deletion-owner-invalid");
  if (e.prepaidSessionDeletionOwner !== "prepaidProbeExpiry_v39") failures.push("prepaid-session-deletion-owner-invalid");
  if (e.ownerApproved !== true) failures.push("owner-approval-missing");
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}
