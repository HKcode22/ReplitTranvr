import { createHash, randomUUID } from "crypto";
import { HARD_RETENTION_LIMIT_HOURS, type HardRetentionClass } from "./retentionDeployment_v39";

export const PROVIDER_BLOB_STORAGE_KIND_V39 = "replit_app_storage" as const;
export const PROVIDER_BLOB_CONTRACT_VERSION_V39 = "provider-blob-contract-v39@1.0.0" as const;

export interface ProviderBlobStoreV39 {
  uploadBytes(objectName: string, bytes: Uint8Array): Promise<void>;
  downloadBytes(objectName: string): Promise<Uint8Array>;
  exists(objectName: string): Promise<boolean>;
  delete(objectName: string): Promise<void>;
}

export interface ProviderBlobRefV39 {
  blobRefId: string;
  contractVersion: typeof PROVIDER_BLOB_CONTRACT_VERSION_V39;
  storageKind: typeof PROVIDER_BLOB_STORAGE_KIND_V39;
  objectName: string;
  contentClass: HardRetentionClass;
  contentSha256: string;
  contentBytes: number;
  persistedAtUtc: string;
  expiresAtUtc: string;
  retentionHours: number;
}

export interface ProviderBlobStorageEvidenceV39 {
  schemaVersion: "v3.9-provider-blob-storage-evidence-1";
  storageKind: typeof PROVIDER_BLOB_STORAGE_KIND_V39;
  state: "DEPLOYED" | "NOT_DEPLOYED" | "UNKNOWN";
  deletionSemantics: "permanent_irreversible" | "recoverable" | "unknown";
  postgresPitrIndependent: boolean | null;
  bucketAccessScoped: boolean | null;
  liveUploadRoundTripVerified: boolean | null;
  liveDeleteThenAbsentVerified: boolean | null;
  providerPlaintextStoredInPostgres: boolean | null;
  verifiedAtUtc: string;
  source: string;
}

export interface ProviderBlobStorageEvidenceVerdictV39 {
  pass: boolean;
  failures: string[];
}

const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_NAME = /^v39\/provider\/(raw_provider_content|live_fids_cache)\/[0-9a-f]{2}\/[0-9a-f-]{36}\.blob$/;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function providerBlobObjectNameV39(contentClass: HardRetentionClass, uuid?: string): string {
  if (!(contentClass in HARD_RETENTION_LIMIT_HOURS)) throw new Error(`PROVIDER_BLOB_CLASS_INVALID:${contentClass}`);
  const resolvedUuid = uuid ?? randomUUID();
  if (!UUID.test(resolvedUuid)) throw new Error("PROVIDER_BLOB_UUID_INVALID");
  const normalized = resolvedUuid.toLowerCase();
  return `v39/provider/${contentClass}/${normalized.slice(0, 2)}/${normalized}.blob`;
}

export function validateProviderBlobRefV39(ref: ProviderBlobRefV39): void {
  if (!UUID.test(ref.blobRefId)) throw new Error("PROVIDER_BLOB_REF_ID_INVALID");
  if (ref.contractVersion !== PROVIDER_BLOB_CONTRACT_VERSION_V39) throw new Error("PROVIDER_BLOB_CONTRACT_VERSION_INVALID");
  if (ref.storageKind !== PROVIDER_BLOB_STORAGE_KIND_V39) throw new Error("PROVIDER_BLOB_STORAGE_KIND_INVALID");
  if (!OBJECT_NAME.test(ref.objectName)) throw new Error("PROVIDER_BLOB_OBJECT_NAME_NOT_OPAQUE");
  if (!ref.objectName.endsWith(`/${ref.blobRefId.toLowerCase()}.blob`)) throw new Error("PROVIDER_BLOB_REF_OBJECT_MISMATCH");
  if (!SHA.test(ref.contentSha256)) throw new Error("PROVIDER_BLOB_SHA256_INVALID");
  if (!Number.isInteger(ref.contentBytes) || ref.contentBytes < 0) throw new Error("PROVIDER_BLOB_SIZE_INVALID");
  if (!Number.isFinite(Date.parse(ref.persistedAtUtc)) || !Number.isFinite(Date.parse(ref.expiresAtUtc))) {
    throw new Error("PROVIDER_BLOB_TIME_INVALID");
  }
  if (!Number.isFinite(ref.retentionHours) || ref.retentionHours <= 0) throw new Error("PROVIDER_BLOB_RETENTION_INVALID");
  const hard = HARD_RETENTION_LIMIT_HOURS[ref.contentClass];
  if (ref.retentionHours > hard) throw new Error(`PROVIDER_BLOB_RETENTION_OVER_HARD_LIMIT:${ref.contentClass}`);
  const expectedExpiry = Date.parse(ref.persistedAtUtc) + ref.retentionHours * 3_600_000;
  if (Date.parse(ref.expiresAtUtc) !== expectedExpiry) throw new Error("PROVIDER_BLOB_EXPIRY_MISMATCH");
}

/**
 * Durable-before-2xx primitive. The caller must not acknowledge provider input
 * until this returns. It uploads under an opaque random object name, verifies
 * the object exists, downloads it back, and byte-compares the round trip. No
 * provider identity is encoded into the object path.
 */
export async function persistProviderBlobBeforeAckV39(input: {
  store: ProviderBlobStoreV39;
  bytes: Uint8Array;
  contentClass: HardRetentionClass;
  retentionHours: number;
  now: Date;
  uuid?: string;
}): Promise<ProviderBlobRefV39> {
  if (!Number.isFinite(input.now.getTime())) throw new Error("PROVIDER_BLOB_NOW_INVALID");
  if (!(input.bytes instanceof Uint8Array)) throw new Error("PROVIDER_BLOB_BYTES_INVALID");
  const hard = HARD_RETENTION_LIMIT_HOURS[input.contentClass];
  if (!Number.isFinite(input.retentionHours) || input.retentionHours <= 0 || input.retentionHours > hard) {
    throw new Error(`PROVIDER_BLOB_RETENTION_OVER_HARD_LIMIT:${input.contentClass}`);
  }
  const blobRefId = (input.uuid ?? randomUUID()).toLowerCase();
  if (!UUID.test(blobRefId)) throw new Error("PROVIDER_BLOB_UUID_INVALID");
  const objectName = providerBlobObjectNameV39(input.contentClass, blobRefId);
  const contentSha256 = sha256(input.bytes);
  try {
    await input.store.uploadBytes(objectName, input.bytes);
    if (!(await input.store.exists(objectName))) throw new Error("PROVIDER_BLOB_UPLOAD_NOT_VISIBLE");
    const roundTrip = await input.store.downloadBytes(objectName);
    if (sha256(roundTrip) !== contentSha256 || !sameBytes(roundTrip, input.bytes)) {
      throw new Error("PROVIDER_BLOB_ROUNDTRIP_MISMATCH");
    }
  } catch (error) {
    try { await input.store.delete(objectName); } catch { /* best-effort cleanup; caller still fails closed */ }
    throw error;
  }
  const persistedAtUtc = input.now.toISOString();
  const expiresAtUtc = new Date(input.now.getTime() + input.retentionHours * 3_600_000).toISOString();
  const ref: ProviderBlobRefV39 = {
    blobRefId,
    contractVersion: PROVIDER_BLOB_CONTRACT_VERSION_V39,
    storageKind: PROVIDER_BLOB_STORAGE_KIND_V39,
    objectName,
    contentClass: input.contentClass,
    contentSha256,
    contentBytes: input.bytes.byteLength,
    persistedAtUtc,
    expiresAtUtc,
    retentionHours: input.retentionHours,
  };
  validateProviderBlobRefV39(ref);
  return ref;
}

/**
 * Auditable hard-delete primitive. Successful return means the storage adapter
 * reports the object absent after deletion. The DB may then keep only ref/hash
 * tombstone metadata; never the deleted provider bytes.
 */
export async function deleteProviderBlobAtExpiryV39(input: {
  store: ProviderBlobStoreV39;
  ref: ProviderBlobRefV39;
  now: Date;
  allowEarlyDelete?: boolean;
}): Promise<{ blobRefId: string; objectName: string; contentSha256: string; deletedAtUtc: string }> {
  validateProviderBlobRefV39(input.ref);
  if (!Number.isFinite(input.now.getTime())) throw new Error("PROVIDER_BLOB_DELETE_TIME_INVALID");
  if (!input.allowEarlyDelete && input.now.getTime() < Date.parse(input.ref.expiresAtUtc)) {
    throw new Error("PROVIDER_BLOB_DELETE_BEFORE_EXPIRY_REFUSED");
  }
  await input.store.delete(input.ref.objectName);
  if (await input.store.exists(input.ref.objectName)) throw new Error("PROVIDER_BLOB_DELETE_VERIFICATION_FAILED");
  return {
    blobRefId: input.ref.blobRefId,
    objectName: input.ref.objectName,
    contentSha256: input.ref.contentSha256,
    deletedAtUtc: input.now.toISOString(),
  };
}

export function verifyProviderBlobStorageEvidenceV39(
  evidence: ProviderBlobStorageEvidenceV39,
): ProviderBlobStorageEvidenceVerdictV39 {
  const failures: string[] = [];
  if (evidence.schemaVersion !== "v3.9-provider-blob-storage-evidence-1") failures.push("blob-storage-schema-invalid");
  if (evidence.storageKind !== PROVIDER_BLOB_STORAGE_KIND_V39) failures.push("blob-storage-kind-invalid");
  if (!Number.isFinite(Date.parse(evidence.verifiedAtUtc))) failures.push("blob-storage-verified-at-invalid");
  if (!evidence.source?.trim()) failures.push("blob-storage-source-missing");
  if (evidence.state !== "DEPLOYED") failures.push(`blob-storage-not-deployed:${evidence.state}`);
  if (evidence.deletionSemantics !== "permanent_irreversible") failures.push("blob-storage-delete-not-permanent");
  if (evidence.postgresPitrIndependent !== true) failures.push("blob-storage-not-pitr-independent");
  if (evidence.bucketAccessScoped !== true) failures.push("blob-storage-access-not-scoped");
  if (evidence.liveUploadRoundTripVerified !== true) failures.push("blob-storage-live-roundtrip-unverified");
  if (evidence.liveDeleteThenAbsentVerified !== true) failures.push("blob-storage-live-delete-unverified");
  if (evidence.providerPlaintextStoredInPostgres !== false) failures.push("provider-plaintext-still-in-postgres");
  return { pass: failures.length === 0, failures: [...new Set(failures)].sort() };
}
