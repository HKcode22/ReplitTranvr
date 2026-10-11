/**
 * P2G24 session-only durable webhook object integrity audit.
 *
 * Explicit --verify-objects required to read 30 raw provider blobs.
 * NOT part of the published server; do not run during paid ownership.
 *
 * DATABASE: BEGIN TRANSACTION READ ONLY; SELECT; ROLLBACK.
 * REPLIT OBJECT STORAGE: downloadAsBytes only.
 * AERODATABOX: no imports, keys, subscriptions, calls or refills.
 * OUTPUT: aggregate counts and per-entry index only, never raw body,
 * object names, source record ids, secrets or payload bytes.
 */
import { createHash } from "node:crypto";
import { v39Pool } from "../server/lib/disruption/db_v39.ts";
import { createRequiredProviderBlobStoreV39 } from "../server/lib/disruption/replitProviderBlobStore_v39.ts";

const SESSION="6267293e-75a0-42a7-b977-89543f200ebc";
const BUDGET="P2G-S1-20261009-23";
const PROBE=18;
const EXPECTED_REFS=30;
const verifyObjects=process.argv.includes("--verify-objects");
const unexpectedArgs=process.argv.slice(2).filter(x=>x!=="--verify-objects");
if(unexpectedArgs.length)throw new Error("READ_ONLY_AUDIT_REFUSED_UNSUPPORTED_ARGUMENT");

type BlobRef = {
  object_name:string;content_sha256:string;content_bytes:string;
  expires_at_utc:Date|string;deletion_verified_at_utc:Date|string|null;
  storage_kind:string;content_class:string;contract_version:string;
  blob_ref_id:string;
};

const errors:{index:number,reason:string}[]=[];
let verified=0,mismatched=0,downloadFailed=0;
let checkpoint="PRECHECK",refused=false;
if (!process.env.V39_DATABASE_RUNTIME_URL) {
  throw new Error("READ_ONLY_AUDIT_REFUSED_DATABASE_RUNTIME_URL_MISSING");
}
if (verifyObjects &&
    (process.env.V39_PROVIDER_BLOB_MODE!=="required" ||
     !process.env.V39_PROVIDER_BLOB_BUCKET_ID)) {
  throw new Error("READ_ONLY_AUDIT_REFUSED_DEDICATED_OBJECT_STORAGE_NOT_CONFIGURED");
}

const client=await v39Pool.connect();
try {
  await client.query("BEGIN TRANSACTION READ ONLY");
  await client.query("SET LOCAL statement_timeout='10000ms'");

  const p=await client.query(
    "SELECT probe_id,icao,status,duration_censored,reconciliation_status,"+
    "stop_reason,runtime_session_id,runtime_cleanup_verified_at_utc "+
    "FROM clean.adb_anchor_probe "+
    "WHERE probe_id=$1 AND icao='YSSY' "+
    "AND probe_budget_day_id=$2 AND runtime_session_id=$3::uuid",
    [PROBE,BUDGET,SESSION]
  );
  const row=p.rows[0];
  if(p.rowCount!==1 || row.status!=="failed" ||
     row.duration_censored!==true ||
     row.reconciliation_status!=="UNRESOLVED" ||
     row.runtime_cleanup_verified_at_utc!==null) {
    throw new Error("READ_ONLY_AUDIT_REFUSED_PROBE_RECORD_CHANGED");
  }
  checkpoint="DURABLE_PROBE_MATCH";

  const q=await client.query(
    "SELECT blob_ref_id,object_name,content_sha256,content_bytes,"+
    "expires_at_utc,deletion_verified_at_utc,storage_kind,content_class,contract_version "+
    "FROM clean.provider_content_blob_ref "+
    "WHERE source_kind='webhook' AND source_record_id LIKE $1 "+
    "ORDER BY persisted_at_utc,blob_ref_id",
    ["prepaid:"+SESSION+":%"]
  );
  const blobs=q.rows as BlobRef[];
  const references=blobs.length;
  if(references!==EXPECTED_REFS) {
    throw new Error("READ_ONLY_AUDIT_REFUSED_REFERENCE_COUNT_MISMATCH:"+references);
  }
  if(blobs.some(r=>
    r.deletion_verified_at_utc!==null ||
    r.storage_kind!=="replit_app_storage" ||
    r.content_class!=="raw_provider_content" ||
    r.contract_version!=="provider-blob-contract-v39@1.0.0" ||
    !/^[a-f0-9]{64}$/.test(r.content_sha256) ||
    !Number.isSafeInteger(Number(r.content_bytes)) ||
    Number(r.content_bytes)<0
  )){
    throw new Error("READ_ONLY_AUDIT_REFUSED_REFERENCE_CONTRACT_INVALID");
  }
  const toIso=(v:Date|string)=>new Date(v).toISOString();
  const expiries=blobs.map(b=>toIso(b.expires_at_utc)).sort();
  const firstExpiry=expiries[0],lastExpiry=expiries[expiries.length-1];
  checkpoint="BLOB_REFERENCES_MATCH";

  if(!verifyObjects) {
    console.log(JSON.stringify({
      schema:"v39.phase2g-p2g24-blob-integrity-audit.v1",
      mode:"PREFLIGHT_ONLY",session_id:SESSION,probe_id:PROBE,
      status:"REFERENCES_PRESENT_NOT_BYTES_VERIFIED",
      references,
      earliest_expiry_utc:firstExpiry,
      latest_expiry_utc:lastExpiry,
      provider_calls:0,database_mutations:0,object_storage_mutations:0,
      next:"Use --verify-objects to read and verify the real stored bytes."
    },null,2));
  }else{
    const store=createRequiredProviderBlobStoreV39();
    for(let i=0;i<blobs.length;i++){
      const b=blobs[i];
      try{
        const buf=Buffer.from(await store.downloadBytes(b.object_name));
        const computed=createHash("sha256").update(buf).digest("hex");
        if(computed!==b.content_sha256 || buf.length!==Number(b.content_bytes)){
          mismatched++;
          errors.push({index:i+1,reason:"SHA256_OR_BYTE_LENGTH_MISMATCH"});
        }else{
          verified++;
        }
      }catch{
        downloadFailed++;
        errors.push({index:i+1,reason:"STORAGE_DOWNLOAD_FAILED_OR_INACCESSIBLE"});
      }
    }
    checkpoint="OBJECT_CONTENTS_INSPECTED";
    console.log(JSON.stringify({
      schema:"v39.phase2g-p2g24-blob-integrity-audit.v1",
      mode:"VERIFY_OBJECTS_READ_ONLY",
      session_id:SESSION,probe_id:PROBE,
      status:verified===EXPECTED_REFS && !mismatched && !downloadFailed
        ? "PASS_ALL_30_OBJECTS_SHA256_AND_BYTES"
        : "FAIL_OBJECTS_MISSING_OR_HASH_MISMATCH",
      references,verified,downloadFailed,mismatched,
      earliest_expiry_utc:firstExpiry,
      latest_expiry_utc:lastExpiry,
      failures:errors,
      provider_calls:0,database_mutations:0,object_storage_mutations:0
    },null,2));
    if(verified!==EXPECTED_REFS)process.exitCode=2;
  }
}catch(e){
  refused=true;
  console.error(JSON.stringify({
    schema:"v39.phase2g-p2g24-blob-integrity-audit.v1",
    status:"REFUSED_OR_ERROR",checkpoint,
    reason:e instanceof Error && e.message.startsWith("READ_ONLY_AUDIT_")
      ?e.message:"DATABASE_OR_OBJECT_STORAGE_READ_ERROR",
    provider_calls:0,database_mutations:0,object_storage_mutations:0
  }));
  process.exitCode=2;
}finally{
  await client.query("ROLLBACK").catch(()=>{});
  client.release();
  await v39Pool.end();
}
if(refused)process.exitCode=2;