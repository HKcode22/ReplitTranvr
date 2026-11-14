/**
 * Owner-only P0 provider blob expiry backlog reconciliation.
 * STOP-default; never a cron or Phase6 paid GO. The DRY_RUN path only
 * SELECTs expiry refs and calls object-storage exists (no download).
 * APPLY requires separate exact-code/expected-count owner approval and
 * reuses the original delete->absent->tombstone function, NOT SQL hacks.
 */
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {v39Pool} from "../server/lib/disruption/db_v39";
import {
 collectExpiredProviderBlobsV39,
 applyExpiredProviderBlobsV39,
 type ProviderBlobExpiryCandidateV39
} from "../server/lib/disruption/providerBlobExpiry_v39";
import {validateProviderBlobRefV39}
 from "../server/lib/disruption/providerBlobStore_v39";
import {createRequiredProviderBlobStoreV39}
 from "../server/lib/disruption/replitProviderBlobStore_v39";

const CODE=/^[0-9a-f]{40}$/;
const APPROVE="OWNER_APPLY_EXACT_EXPIRED_RAW_PROVIDER_BLOB_ONLY_DELETE_VERIFY_TOMBSTONE";
const MAX=100;
const hold=(code:string):never=>{
 throw Error("HOLD_P5_BLOB_ONLY_OWNER_"+code);
};
export function parseP5BlobOnlyArgs(args:string[]){
 if(args.length===0||(args.length===1&&args[0]==="--dry-run"))
  return {apply:false};
 if(args.length===1&&args[0]==="--apply")
  return {apply:true};
 return hold("UNKNOWN_OR_COMBINED_ARGS");
}
/** No refs or object names appear in returned summaries. */
export function reviewP5BlobOnlyCandidates(
 rows:readonly ProviderBlobExpiryCandidateV39[],
 nowMs:number,
 expectedCount?:number
){
 if(!Array.isArray(rows)||rows.length===0||rows.length>MAX||
    !Number.isFinite(nowMs)||
    (expectedCount!==undefined&&(
      !Number.isSafeInteger(expectedCount)||expectedCount<1||
      expectedCount>MAX||rows.length!==expectedCount)))
  hold("EMPTY_UNBOUNDED_OR_DRIFTED_EXPIRED_BACKLOG");
 const ids=new Set<string>(),names=new Set<string>();
 for(const r of rows){
  if(!r||r.contentClass!=="raw_provider_content"||
     r.ref?.contentClass!=="raw_provider_content"||
     r.ref?.storageKind!=="replit_app_storage"||
     r.ref?.retentionHours!==168||
     r.ref?.blobRefId!==r.blobRefId||
     r.ref?.objectName!==r.objectName||
     r.ref?.contentSha256!==r.contentSha256||
     ids.has(r.blobRefId)||names.has(r.objectName))
   hold("UNEXPECTED_CLASS_IDENTITY_OR_DUPLICATE_REF");
  validateProviderBlobRefV39(r.ref);
  const expiry=Date.parse(r.expiresAtUtc);
  if(!Number.isFinite(expiry)||
     expiry!==Date.parse(r.ref.expiresAtUtc)||
     expiry>nowMs-24*3600000)
   hold("RECENT_NOT_EXPIRED_OR_DISAGREEING_TIME");
  ids.add(r.blobRefId);names.add(r.objectName);
 }
 return Object.freeze({
  candidates:rows.length,
  exactRawClassOnly:true,
  expectedCountMatched:expectedCount===undefined?
   null:rows.length===expectedCount,
  contentsDownloaded:false,
  readyToDelete:false,
  providerCalls:0
 });
}
export function admitP5BlobOnlyApply(
 env:NodeJS.ProcessEnv, codeSha:string, actualCount:number
){
 if(env.GITHUB_ACTIONS==="true"||
    env.P5_BLOB_ONLY_CLEANUP_APPROVAL!==APPROVE||
    !CODE.test(codeSha)||
    env.P5_BLOB_ONLY_CLEANUP_APPROVED_MAIN_SHA!==codeSha||
    env.P5_BLOB_ONLY_CLEANUP_EXPECTED_COUNT!==String(actualCount)||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED==="1"||
    env.V39_PROVIDER_BLOB_MODE!=="required")
  hold("NO_EXPLICIT_PINNED_OWNER_DELETE_APPROVAL");
 return Object.freeze({approvedExpectedCount:actualCount});
}
export async function runP5BlobOnlyOwner(
 args:string[],env:NodeJS.ProcessEnv=process.env
){
 const {apply}=parseP5BlobOnlyArgs(args);
 if(!env.DATABASE_URL||env.GITHUB_ACTIONS==="true"||
    (env.V39_DATABASE_RUNTIME_URL&&
     env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL))
  hold("EXISTING_REPLIT_OWNER_DATABASE_REQUIRED");
 // Pool is lazy. Reuse the already attached database, never another Neon
 // connector, replacement database, role or new secret.
 env.V39_DATABASE_RUNTIME_URL=env.DATABASE_URL;
 const db=await v39Pool.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  " current_setting('server_version_num')::int AS version,"+
  " pg_is_in_recovery() AS replica,clock_timestamp() AS db_now");
 if(db.rowCount!==1||db.rows[0].db!=="neondb"||
    db.rows[0].actor!=="neondb_owner"||
    db.rows[0].version<160000||db.rows[0].version>=170000||
    db.rows[0].replica!==false)
  hold("WRONG_REAL_PG16_OWNER_OR_REPLICA");
 const nowMs=new Date(db.rows[0].db_now).getTime();
 if(!Number.isFinite(nowMs))hold("INVALID_REAL_DB_CLOCK");
 const candidates=await collectExpiredProviderBlobsV39(
  new Date(nowMs),MAX+1);
 const expected=apply?Number(env.P5_BLOB_ONLY_CLEANUP_EXPECTED_COUNT):undefined;
 if(apply&&(!Number.isSafeInteger(expected)||expected<1||expected>MAX))
  hold("UNPINNED_EXPECTED_CLEANUP_COUNT");
 const review=reviewP5BlobOnlyCandidates(candidates,nowMs,expected);
 const store=createRequiredProviderBlobStoreV39();
 let present=0,missing=0;
 for(const x of candidates){
  const exists=await store.exists(x.objectName);
  if(exists)present++;else missing++;
 }
 // No automatic inferences from a deletion marker or a missing object.
 if(missing>0||present!==candidates.length)
  hold("OBJECT_NOT_PRESENT_OR_UNCERTAIN_IN_DEDICATED_BUCKET");
 if(!apply){
  return {
   status:"DRY_RUN_BLOB_ONLY_OWNER_OBJECTS_PRESENT_NO_DELETIONS",
   ...review,objectsPresent:present,objectsAbsent:missing,
   databaseWrites:0,objectDeletions:0,phase6PaidGo:false
  };
 }
 let liveSha="";
 try{liveSha=execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim();}catch{hold("UNVERIFIED_OWNER_CHECKOUT_SHA");}
 admitP5BlobOnlyApply(env,liveSha,candidates.length);
 // Original existing function alone performs delete, absence verification
 // and then SQL tombstone. No identity/account/session cleanup here.
 const applied=await applyExpiredProviderBlobsV39(candidates);
 const remains=await collectExpiredProviderBlobsV39(
  new Date(nowMs),MAX+1);
 return {
  status:remains.length===0?
   "BLOB_ONLY_APPLIED_INDEPENDENT_READBACK_STILL_REQUIRED":
   "BLOB_ONLY_PARTIAL_OR_NEW_EXPIRY_HOLD_NO_RETRY",
  originalCandidates:candidates.length,
  deletedAndTombstoned:applied.expiredCount,
  remainingExpiredUnverified:remains.length,
  runId:applied.runId,providerCalls:0,
  otherRetentionSurfacesTouched:false,
  backupsOrReplicasVerified:false,phase6PaidGo:false
 };
}
async function main(){
 let apply=false;
 try{
  apply=parseP5BlobOnlyArgs(process.argv.slice(2)).apply;
  const out=await runP5BlobOnlyOwner(process.argv.slice(2));
  console.log(JSON.stringify(out));
  if(out.status==="BLOB_ONLY_PARTIAL_OR_NEW_EXPIRY_HOLD_NO_RETRY")
   process.exitCode=2;
 }catch{
  console.error(apply?
   "HOLD_P5_BLOB_ONLY_OWNER_UNKNOWN_PARTIAL_APPLY_INDEPENDENT_READBACK_NO_RETRY":
   "HOLD_P5_BLOB_ONLY_OWNER_DRY_RUN_NO_DELETIONS");
  process.exitCode=2;
 }finally{
  try{await v39Pool.end();}catch{}
 }
}
if(process.argv[1]&&resolve(process.argv[1])===
   fileURLToPath(import.meta.url))
 void main();
