/**
 * P25 YSSY probe 19: exact 58 expired object contract, pure evaluation.
 * The scoped execution action may only delete these 58 validated refs.
 * No provider billing, DB or object-storage dependencies in this module.
 */
import {createHash} from "node:crypto";
import {
  validateProviderBlobRefV39,
  type ProviderBlobRefV39
} from "./providerBlobStore_v39";

export const P25_EXPIRY_SESSION_V39="b0077437-edc1-459a-9d63-8c6e6e50c4f2";
export const P25_EXPIRY_BUDGET_V39="P2G-S1-20261013-03";
export const P25_EXPIRY_SOURCE_PATTERN_V39=
  "prepaid:"+P25_EXPIRY_SESSION_V39+":%";
export const P25_EXPIRY_EXPECTED_COUNT_V39=58;
export const P25_EXPIRY_EXPECTED_BYTES_V39=308832;
export const P25_EXPIRY_LATEST_MS_V39=Date.parse("2026-10-20T05:02:12.501Z");

export interface P25ExpiredBlobRowV39 {
  blob_ref_id:string;
  object_name:string;
  contract_version:string;
  storage_kind:string;
  content_class:string;
  content_sha256:string;
  content_bytes:number|string;
  persisted_at_utc:Date|string;
  expires_at_utc:Date|string;
  retention_hours:number|string;
  deletion_verified_at_utc:Date|string|null;
}
export interface P25ExactExpiredPlanV39 {
  refs:readonly ProviderBlobRefV39[];
  manifestSha256:string;
  bucketFingerprintSha256:string;
  totalBytes:number;
  count:58;
}
const sha=(data:string)=>createHash("sha256").update(data).digest("hex");
export function planExactP25Expired58V39(
  rows:readonly P25ExpiredBlobRowV39[],
  now:Date,
  normalizedBucketId:string
):P25ExactExpiredPlanV39 {
  if(!Number.isFinite(now.getTime()) ||
     now.getTime()<P25_EXPIRY_LATEST_MS_V39)
    throw Error("P25_EXACT_RETENTION_NOT_EXPIRED");
  if(!Array.isArray(rows)||rows.length!==P25_EXPIRY_EXPECTED_COUNT_V39)
    throw Error("P25_EXACT_COUNT_NOT_58");
  if(!/^replit-objstore-[a-zA-Z0-9-]{12,}$/.test(normalizedBucketId))
    throw Error("P25_REQUIRED_BUCKET_INVALID");
  const ids=new Set<string>(),names=new Set<string>();
  let bytes=0,latest=0;
  const refs=rows.map((row,index)=>{
    if(!row||row.deletion_verified_at_utc!==null)
      throw Error("P25_EXACT_DELETION_MARKER_UNEXPECTED");
    const ref:ProviderBlobRefV39={
      blobRefId:String(row.blob_ref_id),
      objectName:String(row.object_name),
      contractVersion:String(row.contract_version) as ProviderBlobRefV39["contractVersion"],
      storageKind:String(row.storage_kind) as ProviderBlobRefV39["storageKind"],
      contentClass:String(row.content_class) as ProviderBlobRefV39["contentClass"],
      contentSha256:String(row.content_sha256),
      contentBytes:Number(row.content_bytes),
      persistedAtUtc:new Date(row.persisted_at_utc).toISOString(),
      expiresAtUtc:new Date(row.expires_at_utc).toISOString(),
      retentionHours:Number(row.retention_hours)
    };
    validateProviderBlobRefV39(ref);
    if(ref.contentClass!=="raw_provider_content" ||
       ref.retentionHours!==168 ||
       Date.parse(ref.expiresAtUtc)>now.getTime() ||
       ids.has(ref.blobRefId)||names.has(ref.objectName))
      throw Error("P25_EXACT_INVALID_OR_DUPLICATE_OBJECT");
    ids.add(ref.blobRefId);names.add(ref.objectName);
    bytes+=ref.contentBytes;
    latest=Math.max(latest,Date.parse(ref.expiresAtUtc));
    return ref;
  });
  if(bytes!==P25_EXPIRY_EXPECTED_BYTES_V39 ||
     latest!==P25_EXPIRY_LATEST_MS_V39)
    throw Error("P25_EXACT_BYTES_OR_LATEST_EXPIRY_CHANGED");
  refs.sort((a,b)=>a.blobRefId.localeCompare(b.blobRefId));
  // Manifest binds every exact provider object, hash, bytes, expiry and bucket
  // without disclosing those identifiers in the command output.
  const bucketFingerprintSha256=sha(normalizedBucketId);
  const manifestSha256=sha(JSON.stringify({
    schema:"v39.p25.exact-58-expiry-plan.v1",
    probe:19,budget:P25_EXPIRY_BUDGET_V39,
    bucketFingerprintSha256,
    refs:refs.map(r=>[
      r.blobRefId,r.objectName,r.contentSha256,r.contentBytes,
      r.persistedAtUtc,r.expiresAtUtc,r.retentionHours
    ])
  }));
  return {refs,manifestSha256,bucketFingerprintSha256,
    totalBytes:bytes,count:58};
}

export interface P25ExactDeletionDepsV39 {
  deleteAndVerifyPhysical(ref:ProviderBlobRefV39):Promise<void>;
  tombstoneExact(ref:ProviderBlobRefV39):Promise<void>;
}
export class P25ExactDeletionHOLDV39 extends Error {
  constructor(public readonly index:number,
    public readonly physicalConfirmed:number,
    public readonly tombstonesConfirmed:number) {
    super("P25_EXACT_58_PARTIAL_HOLD");
  }
}
/**
 * Never automatically retry after ambiguous DELETE or SQL commit.
 * A failed SQL tombstone may follow irreversible physical deletion.
 * No other objects are attempted after first uncertain operation.
 */
export async function executeExactP25DeletionV39(
  plan:P25ExactExpiredPlanV39,
  deps:P25ExactDeletionDepsV39
):Promise<{physicalConfirmed:58;tombstonesConfirmed:58}> {
  if(plan.count!==58||plan.refs.length!==58||
     !/^[a-f0-9]{64}$/.test(plan.manifestSha256))
    throw Error("P25_EXACT_DELETE_PLAN_UNSAFE");
  let physicalConfirmed=0,tombstonesConfirmed=0;
  for(let i=0;i<plan.refs.length;i++){
    try {
      await deps.deleteAndVerifyPhysical(plan.refs[i]);
      physicalConfirmed++;
      await deps.tombstoneExact(plan.refs[i]);
      tombstonesConfirmed++;
    } catch {
      throw new P25ExactDeletionHOLDV39(
        i+1,physicalConfirmed,tombstonesConfirmed);
    }
  }
  return {physicalConfirmed:58,tombstonesConfirmed:58};
}
