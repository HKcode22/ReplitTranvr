/**
 * Phase5 main-only MANUAL bounded future T6/T90 batch writer.
 *
 * At most 8 independently signed and reviewed flight/horizon packets with
 * cutoffs within 2 minutes. Reuses the SAME original Stage14 serializable
 * writer, Stage24 T24 witness/optional separately signed missing T24, and
 * restricted PRE-only PostgreSQL login. No AeroDataBox/Alert/REST permission.
 *
 * An uncertain error or ambiguous post-COMMIT state stops the ENTIRE
 * remaining batch, records the attempted packet SHA for read-only
 * reconciliation, and NEVER retries. Successful prior individual rows are
 * not rolled back or counted as missing.
 *
 * NO cron/queue activation; this is distinct from the existing per-flight
 * scheduled Github child and is default OFF until signed Phase5 FREEZE,
 * real source rights, external release, Phase6 paid GO and batch approval.
 */
import {readFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {Pool} from "pg";
const SHA=/^[a-f0-9]{64}$/;
const RUN=/^[0-9]{5,25}$/;
const GH_BATCH_NAME="P5 LATER SIGNED BATCH ";
const GH_BATCH_WORKFLOW="phase5-bounded-signed-later-pre-batch-manual.yml";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {approveP5SignedLaterPreChild,admitP5LaterRegistryChildEnv}
 from "./v39_phase5_later_pre_registry_child_v39";
import {verifyP5SignedLaterPreDayRegistry,
 type P5SignedLaterPreDayRegistry,type P5SignedLaterPreDayRegistryPins,
 type P5VerifiedLaterPreRegistryEntry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import {planP5BoundedSignedLaterPreBatch,
 type P5BoundedSignedLaterPrePlan}
 from "../server/lib/disruption/phase5BoundedSignedLaterPreBatchPlan_v39";
import {runP5SignedWitnessedLaterPre}
 from "./v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "./v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";

const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const SOURCE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const hold=(s:string):never=>{
 throw Error("REFUSED_P5_BOUND_LATER_BATCH_"+s);
};
function readCheckedFile(path:string,max:number,source=false):Buffer{
 if(typeof path!=="string"||!(source?SOURCE:FILE).test(path))
  hold("UNREVIEWED_FROZEN_SOURCE_OR_PRE_PATH");
 const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.size<100||st.size>max)
  hold("MISSING_OR_UNBOUNDED_FROZEN_PACKET_BYTES");
 return readFileSync(path);
}
function json<T>(buffer:Buffer):T{
 try{return JSON.parse(buffer.toString("utf8")) as T;}
 catch{return hold("NONJSON_SIGNED_REGISTRY_OR_PACKET");}
}
export interface P5BatchAdmission{
 approvedOneTimeNonceSha256:string;
 githubRunId:string;githubToken:string;
 registryPath:string;
 selectedPaths:string[];
 connectionString:string;
 runDayIndex:number;
}
export function admitP5BoundLaterBatchOwnerEnv(
 env:NodeJS.ProcessEnv
):P5BatchAdmission{
 const day=admitP5LaterRegistryChildEnv(env);
 if(env.V39_P5_BOUND_LATER_PRE_BATCH_OWNER_APPROVED!=="1"||
    env.P5_BOUND_LATER_PRE_BATCH_CONFIRM!==
     "ONE_SIGNED_BOUND_EIGHT_FLIGHT_PRE_BATCH_NO_PROVIDER"||
    env.P5_LATER_PRE_AUTO_DISPATCH_ENABLED==="true"||
    env.P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED==="true"||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
  hold("BATCH_OWNER_NOT_INDEPENDENTLY_APPROVED_OR_UNSAFE_ROLE");
 const nonce=env.P5_BOUND_LATER_PRE_BATCH_NONCE_SHA256??"";
 if(!SHA.test(nonce)||
    nonce!==env.V39_P5_BOUND_LATER_PRE_BATCH_APPROVED_NONCE_SHA256||
    !RUN.test(env.GITHUB_RUN_ID??"")||
    typeof env.GITHUB_TOKEN!=="string"||
    env.GITHUB_TOKEN.length<20)
  hold("UNSIGNED_ONE_TIME_GITHUB_BATCH_NONCE_OR_RUN");
 const registryPath=env.P5_BOUND_LATER_PRE_BATCH_REGISTRY_FILE??"";
 if(!FILE.test(registryPath))
  hold("NO_FROZEN_INDEPENDENTLY_SIGNED_DAY_REGISTRY_PATH");
 let paths:unknown;
 try{paths=JSON.parse(env.P5_BOUND_LATER_PRE_BATCH_PACKET_PATHS_JSON??"");}
 catch{return hold("MISSING_FROZEN_PACKET_SELECTION_JSON");}
 if(!Array.isArray(paths)||paths.length<1||paths.length>8||
    paths.some(p=>typeof p!=="string"||!FILE.test(p))||
    new Set(paths).size!==paths.length||
    paths.includes(registryPath))
  hold("BATCH_SELECTION_DUPLICATE_UNBOUNDED_OR_UNREVIEWED");
 let u:URL;
 try{u=new URL(env.P5_V39_PRE_DATABASE_URL??"");}
 catch{return hold("RESTRICTED_PRE_LOGIN_MISSING");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    decodeURIComponent(u.username)!=="phase5_p30_pre_login_20261107"||
    !u.password||!u.hostname||u.pathname!=="/neondb"||u.hash)
  hold("CROSS_ROLE_OR_APPLICATION_DATABASE_LOGIN");
 return{
  approvedOneTimeNonceSha256:nonce,
  githubRunId:env.GITHUB_RUN_ID!,githubToken:env.GITHUB_TOKEN!,
  registryPath,selectedPaths:paths as string[],
  connectionString:env.P5_V39_PRE_DATABASE_URL!,runDayIndex:day
 };
}
export interface P5SignedBatchHistoryRun{
 id:number;
 display_title:string;
}
export interface P5SignedBatchHistoryPage{
 total_count:number;
 workflow_runs:P5SignedBatchHistoryRun[];
}
export function verifyP5BatchNoPriorGithubAttempt(
 history:readonly P5SignedBatchHistoryRun[],
 currentRunId:string,nonce:string
){
 if(!RUN.test(currentRunId)||!SHA.test(nonce)||
    !Array.isArray(history)||history.length<1||history.length>1000)
  hold("UNTRUSTED_GITHUB_HISTORY_OR_OLD_NONCE");
 const title=GH_BATCH_NAME+nonce;
 const seen=new Set<number>();
 let own=0;
 for(const r of history){
  if(!r||!Number.isSafeInteger(r.id)||r.id<1||
     typeof r.display_title!=="string"||
     seen.has(r.id))
   hold("MALFORMED_OR_REPEATED_GITHUB_BATCH_RUN");
  seen.add(r.id);
  if(String(r.id)===currentRunId){
   if(r.display_title!==title)
    hold("CURRENT_BATCH_RUN_NAME_NOT_INDEPENDENTLY_PINNED");
   own++;
  }else if(r.display_title===title)
   hold("PREVIOUS_ATTEMPT_OF_BATCH_NONCE_NO_RETRY");
 }
 if(own!==1)hold("CURRENT_GITHUB_BATCH_RUN_NOT_OBSERVED_NO_WRITE");
 return{
  currentRunId,
  batchNonceSha256:nonce,
  independentlyScopedOneAttempt:true as const,
  githubBatchHistoryChecked:true as const,
  sourceRightsOrPaidGoCertifiedHere:false as const
 };
}
export async function requireP5BatchGithubOneTimeHistory(
 admission:P5BatchAdmission,fetcher:typeof fetch=fetch
){
 // This is GitHub scheduling/replay metadata, NOT a substitute for
 // PostgreSQL's actual prediction cutoff clock. 72h is longer than the
 // signed raw original max lifetime (<23h) and the 75m batch pre-window.
 const start=new Date(Date.now()-72*3600_000).toISOString();
 const end=new Date(Date.now()+5*60000).toISOString();
 const created=encodeURIComponent(start+".."+end);
 const headers={
  Accept:"application/vnd.github+json",
  Authorization:"Bearer "+admission.githubToken,
  "X-GitHub-Api-Version":"2022-11-28"
 };
 const all:P5SignedBatchHistoryRun[]=[];
 let total:number|null=null;
 for(let page=1;page<=10;page++){
  const endpoint=
    "https://api.github.com/repos/HKcode22/ReplitTranvr/actions/workflows/"+
    GH_BATCH_WORKFLOW+"/runs?event=workflow_dispatch&created="+
    created+"&per_page=100&page="+page;
  const response=await fetcher(endpoint,{method:"GET",headers});
  if(!response.ok)hold("GITHUB_HISTORY_UNAVAILABLE_NO_BATCH_WRITE");
  const data=await response.json() as P5SignedBatchHistoryPage;
  if(!data||!Number.isSafeInteger(data.total_count)||
     data.total_count<1||data.total_count>1000||
     !Array.isArray(data.workflow_runs)||
     data.workflow_runs.length>100||
     (total!==null&&total!==data.total_count))
   hold("UNBOUNDED_OR_AMBIGUOUS_GITHUB_BATCH_RUN_HISTORY");
  total=data.total_count;
  all.push(...data.workflow_runs);
  if(all.length>=total)break;
  if(data.workflow_runs.length<100)
   hold("PARTIAL_GITHUB_BATCH_RUN_HISTORY_HOLD");
 }
 if(total===null||all.length!==total)
  hold("GITHUB_BATCH_HISTORY_INCOMPLETE_NO_WRITE");
 return verifyP5BatchNoPriorGithubAttempt(
  all,admission.githubRunId,admission.approvedOneTimeNonceSha256);
}
export interface P5BoundedBatchReadyEntry{
 filePath:string;packetSha256:string;
 packetBytes:Buffer;packet:P5SignedWitnessedLaterPrePacket;
 delegatedEnv:NodeJS.ProcessEnv;
}
export function checkP5BoundLaterBatchFrozenRegistry(
 env:NodeJS.ProcessEnv,
 admission:P5BatchAdmission,
 registryBytes:Buffer,registry:P5SignedLaterPreDayRegistry,
 sourceBytes:Buffer,source:P5SignedSourceBatchRegistry,
 readFrozen:(path:string)=>Buffer
):P5BoundedBatchReadyEntry[]{
 const pins:P5SignedLaterPreDayRegistryPins={
  registryFilePath:admission.registryPath,
  expectedRegistrySha256:env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256!,
  expectedSourceDayRegistrySha256:
   env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256!,
  expectedManifestSha256:env.V39_P5_MANIFEST_SHA256!,
  expectedApprovedMainSha:env.GITHUB_SHA!,
  expectedRunDayIndex:admission.runDayIndex,
  expectedReleaseSha256:env.V39_P5_RELEASE_SHA256!,
  expectedRightsSha256:env.V39_P5_RIGHTS_SHA256!
 };
 const verified=verifyP5SignedLaterPreDayRegistry(
  registryBytes,registry,sourceBytes,source,pins,readFrozen);
 const byPath=new Map(verified.entries.map(e=>[e.filePath,e]));
 const output:P5BoundedBatchReadyEntry[]=[];
 for(const p of admission.selectedPaths){
  const entry=byPath.get(p);
  if(!entry)hold("PACKET_NOT_IN_SIGNED_SOURCE_DAY_REGISTRY");
  // Reuse unchanged independently signed exact packet SHA/receipt review.
  // The original runP5SignedWitnessedLaterPre admission will check again
  // before any DB write, including exact native time, independent v2 etc.
  const reviewed=approveP5SignedLaterPreChild(
   env,p,admission.registryPath,registryBytes,registry,
   sourceBytes,source,readFrozen);
  if(reviewed.packetSha256!==entry.packetSha256||
     reviewed.packetBytes!==entry.bytes&&
     !reviewed.packetBytes.equals(entry.bytes))
   hold("SIGNED_PACKET_CHANGED_BETWEEN_REGISTRY_REVIEWS");
  output.push({
   filePath:p,packetSha256:entry.packetSha256,
   packetBytes:entry.bytes,packet:entry.packet,
   delegatedEnv:reviewed.delegatedEnv
  });
 }
 return output;
}
export async function readP5BatchActualPreDbClock(
 connectionString:string
):Promise<string>{
 const pool=new Pool({
  connectionString,max:1,connectionTimeoutMillis:8000,
  idleTimeoutMillis:1500,
  application_name:"p5_sign_bounded_pre_batch_clock_readonly"
 });
 try{
  const s=makeP5Stage28DedicatedRolePool(pool,{
   group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const c=await s.connect();
  let tx=false;
  try{
   await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   tx=true;
   const r=await c.query(
    "SELECT clock_timestamp() AS now,current_user AS actor,"+
    "current_database() AS db,"+
    "current_setting('transaction_read_only') AS ro");
   if(r.rowCount!==1||r.rows[0]?.actor!==P5_STAGE28_GROUPS.pre||
      r.rows[0]?.db!=="neondb"||r.rows[0]?.ro!=="on")
    hold("UNVERIFIED_REAL_PRE_ROLE_DATABASE_CLOCK");
   const v=r.rows[0].now;
   const n=v instanceof Date?v:new Date(String(v));
   if(!Number.isFinite(n.getTime()))
    hold("MALFORMED_REAL_POSTGRES_CLOCK");
   await c.query("ROLLBACK");tx=false;
   return n.toISOString();
  }finally{
   if(tx)await c.query("ROLLBACK").catch(()=>{});
   c.release();
  }
 }finally{await pool.end().catch(()=>{});}
}
export interface P5BoundLaterBatchReceipt{
 packetSha256:string;
 committedSnapshotId:string;
 postCommitDbClockAtUtc:string;
 horizon:"T-6h"|"T-90m";
 committedBeforeOwnCutoffVerified:true;
}
export interface P5BoundLaterBatchEvent{
 kind:"ATTEMPT_STARTED"|"POSTCOMMIT_PRE_VERIFIED"|
      "UNKNOWN_COMMIT_OR_WRITE_FAILURE_QUARANTINE";
 packetSha256:string;
 committedSnapshotId?:string;
 postCommitDbClockAtUtc?:string;
}
type RunOne=typeof runP5SignedWitnessedLaterPre;
export async function executeP5BoundedLaterBatchNoRetry(
 plan:P5BoundedSignedLaterPrePlan,
 entries:readonly P5BoundedBatchReadyEntry[],
 runner:RunOne,
 emit:(event:P5BoundLaterBatchEvent)=>void
){
 if(plan?.schema!=="v39.phase5.bounded-signed-later-pre-batch-plan.v1"||
    plan.count!==entries.length||
    plan.count<1||plan.count>8||
    typeof runner!=="function"||typeof emit!=="function")
  hold("NO_REVIEWED_BATCH_PLAN_OR_RUNNER");
 const byPath=new Map(entries.map(e=>[e.filePath,e]));
 if(byPath.size!==plan.count)
  hold("DUPLICATE_OR_PARTIAL_BATCH_ENTRY_SET");
 const completed:P5BoundLaterBatchReceipt[]=[];
 for(const candidate of plan.ordered){
  const e=byPath.get(candidate.entry.filePath);
  if(!e||e.packetSha256!==candidate.entry.packetSha256)
   hold("SIGNED_BATCH_PACKET_CHANGED_AFTER_PLANNING");
  emit({kind:"ATTEMPT_STARTED",packetSha256:e.packetSha256});
  try{
   const r=await runner(
    e.delegatedEnv,e.packetBytes,e.packet,e.filePath);
   if(!r?.committedSnapshotId||
      r.packetSha256!==e.packetSha256||
      r.postCommitDbClockAtUtc===undefined||
      r.horizon!==candidate.entry.horizon||
      r.noBackfill!==true||
      r.phase6PaidGoGrantedHere!==false)
    hold("UNVERIFIED_POSTCOMMIT_STAGE14_RESULT");
   const receipt:P5BoundLaterBatchReceipt={
    packetSha256:e.packetSha256,
    committedSnapshotId:r.committedSnapshotId,
    postCommitDbClockAtUtc:r.postCommitDbClockAtUtc,
    horizon:candidate.entry.horizon,
    committedBeforeOwnCutoffVerified:true
   };
   completed.push(receipt);
   emit({kind:"POSTCOMMIT_PRE_VERIFIED",
    packetSha256:e.packetSha256,
    committedSnapshotId:r.committedSnapshotId,
    postCommitDbClockAtUtc:r.postCommitDbClockAtUtc});
  }catch{
   // Might be a rejection before write or an ACK lost AFTER COMMIT.
   // We deliberately cannot distinguish safely here. STOP the rest;
   // never retry the attempted or already committed packets.
   emit({kind:"UNKNOWN_COMMIT_OR_WRITE_FAILURE_QUARANTINE",
     packetSha256:e.packetSha256});
   hold("UNKNOWN_COMMIT_QUARANTINE_READONLY_RECONCILE_NO_RETRY");
  }
 }
 return{
  schema:"v39.phase5.bounded-signed-later-pre-multi-commit.v1" as const,
  status:"EACH_POSTCOMMIT_PRE_VERIFIED_NO_PROVIDER_NO_FREEZE_GO" as const,
  approvedBatchCount:plan.count,committedSnapshotCount:completed.length,
  commits:completed,providerCalls:0 as const,alertsCreated:0 as const,
  phase5ScientificFreezeGrantedHere:false as const,
  phase6PaidGoGrantedHere:false as const
 };
}
export async function runP5BoundedSignedLaterBatchOwner(
 env:NodeJS.ProcessEnv
){
 const a=admitP5BoundLaterBatchOwnerEnv(env);
 const registryBytes=readCheckedFile(a.registryPath,250000);
 const registry=json<P5SignedLaterPreDayRegistry>(registryBytes);
 const sourcePath=registry?.sourceDayRegistryFilePath;
 if(typeof sourcePath!=="string"||!SOURCE.test(sourcePath))
  hold("MISSING_SIGNED_SOURCE_REGISTRY_FILE_PATH");
 const sourceBytes=readCheckedFile(sourcePath,100000,true);
 const source=json<P5SignedSourceBatchRegistry>(sourceBytes);
 const ready=checkP5BoundLaterBatchFrozenRegistry(
  env,a,registryBytes,registry,sourceBytes,source,
  p=>readCheckedFile(p,200000));
 // The GH batch nonce is a separately approved one-time attempt, NOT an
 // authorization to write or use source Contents. Unknown history HOLD.
 await requireP5BatchGithubOneTimeHistory(a);
 // No PRE database traffic until source+day registry and every exact flight
 // SHA are independently verified. Observe true DB time using pre-role RO.
 const dbNow=await readP5BatchActualPreDbClock(a.connectionString);
 const verified:P5VerifiedLaterPreRegistryEntry[]=ready.map(e=>({
  filePath:e.filePath,packetSha256:e.packetSha256,
  queryDigestSha256:e.packet.prePermit.queryDigestSha256,
  flightInstanceId:e.packet.prePermit.flightInstanceId,
  selectedTNativeUtc:e.packet.prePermit.selectedTNativeUtc,
  horizon:e.packet.prePermit.horizon as "T-6h"|"T-90m",
  t24ReceiptSha256:e.packet.prePermit.reviewedT24WitnessReceipt?.
    receiptSha256,
  bytes:e.packetBytes,packet:e.packet
 }));
 const plan=planP5BoundedSignedLaterPreBatch(verified,dbNow);
 const receipts=await executeP5BoundedLaterBatchNoRetry(
  plan,ready,runP5SignedWitnessedLaterPre,
  event=>console.log(JSON.stringify(event)));
 return{
  ...receipts,sourceDayRegistrySha256:registry.sourceDayRegistrySha256,
  signedLaterDayRegistrySha256:
   env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256,
  actualBatchPreflightDbClockUtc:dbNow,
  noProviderRequest:true as const
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runP5BoundedSignedLaterBatchOwner(process.env)
  .then(result=>console.log(JSON.stringify(result)))
  .catch(e=>{
   const msg=e instanceof Error?e.message:"";
   console.error(/^REFUSED_P5_BOUND_LATER_BATCH_[A-Z0-9_]+$/.test(msg)?
     msg:"REFUSED_P5_BOUND_LATER_BATCH_UNVERIFIED_HOLD_NO_RETRY");
   process.exitCode=2;
  });
}
