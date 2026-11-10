/**
 * Phase5 default-OFF multiple flight T6/T90 GH child coordinator.
 * One SOURCE-day-linked later-PRE frozen registry (1..96 packet entries).
 * Authenticates ALL packet files before any SQL, uses the existing real
 * PRE-only PG16 READ ONLY original/member/T24-witness query per due flight.
 * No SQL writes, no provider key, no REST/Alert, no release authorization.
 *
 * Never treats GitHub workflow_dispatch ACK as committed PRE. The existing
 * SERIALIZABLE Stage14 child writer is the only PRE write authority.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {verifyP5SignedLaterPreDayRegistry,
 selectP5LaterPreDueRegistryEntries,
 type P5SignedLaterPreDayRegistry,
 type P5SignedLaterPreDayRegistryPins}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import {reviewP5LaterPreActualReadback,planP5LaterPreGithubChild,
 type P5LaterPreAutoPins,type P5LaterGhHistory}
 from "../server/lib/disruption/phase5LaterPreGithubChildDecision_v39";
import {readP5LaterPreActualReadonly}
 from "./v39_phase5_later_pre_github_child_dispatcher_v39";

const REPO="HKcode22/ReplitTranvr";
const ROOT="https://api.github.com/repos/"+REPO;
const CHILD="phase5-one-signed-witnessed-later-pre-main-manual.yml";
const CONFIRM="ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER";
const CODE=/^[a-f0-9]{40}$/;
const SHA=/^[a-f0-9]{64}$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const SOURCE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const hold=(r:string):never=>{throw Error("REFUSED_P5_LATER_BATCH_"+r);};
function bytes(path:string,max:number,source=false):Buffer{
 if(!(source?SOURCE:FILE).test(path))hold("UNREVIEWED_OR_UNBOUNDED_FROZEN_FILE");
 const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||
    st.size<100||st.size>max)
  hold("SIGNED_FILE_ABSENT_CHANGED_OR_TOO_LARGE");
 return readFileSync(path);
}
export function admitP5LaterBatchEnv(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_LATER_PRE_APPROVED_CODE_SHA||
    env.P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED!=="true"||
    env.P5_LATER_PRE_AUTO_DISPATCH_ENABLED==="true"||
    env.V39_P5_LATER_PRE_BATCH_AUTO_APPROVED!=="1"||
    env.V39_P5_LATER_PRE_OWNER_APPROVED!=="1"||
    env.V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.V39_P5_SOURCE_DATABASE_URL||env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    !FILE.test(env.P5_LATER_PRE_BATCH_REGISTRY_FILE??"")||
    ![env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256,
      env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256,
      env.V39_P5_MANIFEST_SHA256,env.V39_P5_RELEASE_SHA256,
      env.V39_P5_RIGHTS_SHA256].every(x=>typeof x==="string"&&SHA.test(x))||
    !/^[1-9][0-9]*$/.test(env.P5_LATER_PRE_DAY_INDEX??"")||
    !env.GITHUB_TOKEN||env.GITHUB_TOKEN.length<20)
  hold("MAIN_SOURCE_RIGHTS_DAY_REGISTRY_OR_INDEPENDENT_PAID_GO");
 const day=Number(env.P5_LATER_PRE_DAY_INDEX);
 if(!Number.isSafeInteger(day)||day>31)
  hold("UNREVIEWED_RUN_DAY");
 let u:URL;
 try{u=new URL(env.P5_V39_PRE_DATABASE_URL??"");}
 catch{return hold("PRE_ONLY_DB_LOGIN_ABSENT");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    decodeURIComponent(u.username)!=="phase5_p30_pre_login_20261107"||
    !u.password||!u.hostname||u.pathname!=="/neondb"||u.hash)
  hold("PRE_ONLY_RESTRICTED_ROLE_NOT_AUTHENTIC");
 return{
  day,
  path:env.P5_LATER_PRE_BATCH_REGISTRY_FILE!,
  url:env.P5_V39_PRE_DATABASE_URL!,
  token:env.GITHUB_TOKEN!,
  codeSha:env.GITHUB_SHA!
 };
}
async function actualReadOnlyDbClock(connectionString:string){
 const raw=new Pool({
  connectionString,max:1,connectionTimeoutMillis:8000,
  idleTimeoutMillis:1500,application_name:"p5_later_batch_clock_readonly"
 });
 try{
  const scope=makeP5Stage28DedicatedRolePool(raw,{
   group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const c=await scope.connect();
  let begun=false;
  try{
   await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   begun=true;
   const q=await c.query("SELECT clock_timestamp() AS now,"+
    "current_user AS actor,current_database() AS db,"+
    "current_setting('transaction_read_only') AS ro");
   if(q.rowCount!==1||q.rows[0]?.actor!==P5_STAGE28_GROUPS.pre||
      q.rows[0]?.db!=="neondb"||q.rows[0]?.ro!=="on")
    hold("UNVERIFIED_RESTRICTED_DB_CLOCK");
   const t=q.rows[0].now;
   const d=t instanceof Date?t:new Date(String(t));
   if(!Number.isFinite(d.getTime()))
    hold("INVALID_REAL_DB_CLOCK");
   await c.query("ROLLBACK");begun=false;
   return d.toISOString();
  }finally{
   if(begun)await c.query("ROLLBACK").catch(()=>{});
   c.release();
  }
 }finally{await raw.end().catch(()=>{});}
}
export async function runP5LaterSignedBatchDispatcher(
 env:NodeJS.ProcessEnv,fetcher:typeof fetch=fetch
){
 const p=admitP5LaterBatchEnv(env);
 const rb=bytes(p.path,250000);
 let registry:P5SignedLaterPreDayRegistry;
 try{registry=JSON.parse(rb.toString("utf8")) as P5SignedLaterPreDayRegistry;}
 catch{return hold("NONJSON_LATER_SIGNED_DAY_REGISTRY");}
 const sb=bytes(registry?.sourceDayRegistryFilePath,100000,true);
 let source:P5SignedSourceBatchRegistry;
 try{source=JSON.parse(sb.toString("utf8")) as P5SignedSourceBatchRegistry;}
 catch{return hold("NONJSON_SOURCE_SIGNED_DAY_REGISTRY");}
 const pins:P5SignedLaterPreDayRegistryPins={
  registryFilePath:p.path,
  expectedRegistrySha256:env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256!,
  expectedSourceDayRegistrySha256:env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256!,
  expectedManifestSha256:env.V39_P5_MANIFEST_SHA256!,
  expectedApprovedMainSha:p.codeSha,
  expectedRunDayIndex:p.day,
  expectedReleaseSha256:env.V39_P5_RELEASE_SHA256!,
  expectedRightsSha256:env.V39_P5_RIGHTS_SHA256!
 };
 const verified=verifyP5SignedLaterPreDayRegistry(
  rb,registry,sb,source,pins,(path)=>bytes(path,200000));
 // NO production SQL is attempted until the full registry/source/packets
 // have been hash-reviewed. Clock is a dedicated PRE-only RO PG16 read.
 const t=await actualReadOnlyDbClock(p.url);
 const due=selectP5LaterPreDueRegistryEntries(verified,t);
 const pendingStatus:Record<string,number>={};
 const ready=[];
 for(const entry of due.selectedForActualPgReadback){
  const permitted:P5LaterPreAutoPins={
   path:entry.filePath,sha:entry.packetSha256,
   codeSha:p.codeSha,token:p.token,url:p.url
  };
  const context={
   ...env,V39_P5_QUERY_DIGEST:entry.queryDigestSha256,
   V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:entry.packetSha256,
   V39_P5_LATER_PRE_T24_RECEIPT_SHA256:entry.t24ReceiptSha256??""
  };
  const actual=await readP5LaterPreActualReadonly(
   entry.packet.prePermit,p.url);
  const result=reviewP5LaterPreActualReadback(
   entry.bytes,entry.packet,permitted,actual,context);
  if(result.status==="LATER_PRE_READY_FOR_GITHUB_HISTORY")
   ready.push(result);
  else pendingStatus[result.status]=(pendingStatus[result.status]??0)+1;
 }
 const summary={
  schema:"v39.phase5.actual-signed-later-day-batch-dispatch.v1" as const,
  runDayIndex:verified.runDayIndex,
  registrySha256:verified.registrySha256,
  observedDbClockUtc:t,
  signedEntries:verified.entries.length,
  dueForRealReadback:due.dueForActualPgReadback,
  reviewedByRealPg:due.selectedForActualPgReadback.length,
  deferredDueCount:due.deferredWithinWindowCount,
  pendingOrCensored:pendingStatus,
  providerCalls:0 as const,databaseWrites:0 as const,
  phase5ScientificFreezeGrantedHere:false as const,
  phase6PaidGoGrantedHere:false as const
 };
 if(ready.length===0)
  return{...summary,childDispatchCount:0,
   status:"NO_ACTUAL_READY_SIGNED_LATER_PRE_CHILD" as const};
 const now=Date.parse(t);
 const first=new Date(now-4*3600_000).toISOString();
 const last=new Date(now+60_000).toISOString();
 const headers={
  Accept:"application/vnd.github+json",
  Authorization:"Bearer "+p.token,
  "X-GitHub-Api-Version":"2022-11-28"
 };
 const url=ROOT+"/actions/workflows/"+CHILD+"/runs"+
  "?event=workflow_dispatch&per_page=100&created="+
  encodeURIComponent(first+".."+last);
 const response=await fetcher(url,{method:"GET",headers});
 if(!response.ok)hold("GITHUB_CHILD_HISTORY_UNAVAILABLE");
 const history=await response.json() as P5LaterGhHistory;
 // Audit ALL candidates and full bounded GH history BEFORE any child POST.
 const newChildren=ready.filter(r=>
  planP5LaterPreGithubChild(r,history).shouldDispatch);
 let acknowledged=0;
 for(const c of newChildren){
  const sent=await fetcher(ROOT+"/actions/workflows/"+CHILD+"/dispatches",{
   method:"POST",headers:{...headers,"Content-Type":"application/json"},
   body:JSON.stringify({ref:"main",inputs:{
    frozen_later_pre_packet:c.frozenPacketPath,
    frozen_later_pre_registry:p.path,
    confirm:CONFIRM
   }})
  });
  if(sent.status!==204)
   hold("AMBIGUOUS_CHILD_DISPATCH_STOP_NO_BLIND_REPLAY");
  acknowledged++;
 }
 return{...summary,childDispatchCount:acknowledged,
  status:acknowledged?"SIGNED_BATCH_GITHUB_CHILD_REQUESTS_ACCEPTED_NOT_DB_PRE" as const:
   "ALL_READY_LATER_PRE_ALREADY_REQUESTED_NO_RETRY" as const};
}
if(process.env.P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENTRYPOINT==="1")
 runP5LaterSignedBatchDispatcher(process.env)
  .then(x=>console.log(JSON.stringify(x)))
  .catch(e=>{
   const msg=e instanceof Error?e.message:"";
   console.error(/^REFUSED_P5_LATER_(?:BATCH|DAY_REGISTRY|REGISTRY_CHILD)_[A-Z0-9_]+$/.test(msg)?
     msg:"REFUSED_P5_LATER_BATCH_UNVERIFIED_OR_AMBIGUOUS_HOLD_NO_RETRY");
   process.exitCode=2;
  });
