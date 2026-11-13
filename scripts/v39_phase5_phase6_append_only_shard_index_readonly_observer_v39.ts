/**
 * Phase5 -> Phase6: default-OFF real PostgreSQL-clock SOURCE-role observer
 * for the already-merged append-only frozen SOURCE/LATER_PRE/POST shard index.
 *
 * This NEVER signs a flight, publishes a registry, dispatches GitHub Actions,
 * executes Stage14, reserves paid REST/Alert, or writes a database row.
 * Nonpaid read-only diagnostics can be run before scientific FREEZE/paid GO.
 */
import {lstatSync,readFileSync} from "node:fs";
import {Pool} from "pg";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {
 auditP5Phase6AppendOnlyDayShardIndex,
 type P5Phase6DayShardIndex,type P5Phase6DayShardPins
} from "../server/lib/disruption/phase5Phase6AppendOnlyDayShardIndex_v39";

const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const APPROVE="READ_ONLY_PINNED_SHARDS_NO_PROVIDER_NO_DISPATCH";
const HOLD=(reason:string):never=>{
 throw Error("REFUSED_P5_PHASE6_DB_CLOCK_SHARD_OBSERVER_"+reason);
};
const parse=(data:Buffer,label:string):P5Phase6DayShardIndex=>{
 try{
  const value=JSON.parse(data.toString("utf8"));
  if(!value||typeof value!=="object"||Array.isArray(value))
   HOLD("INVALID_"+label+"_JSON_OBJECT");
  return value as P5Phase6DayShardIndex;
 }catch{return HOLD("INVALID_"+label+"_JSON_OBJECT");}
};
export function admitP5Phase6ShardReadOnlyObserver(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME??"")||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.P5_SHARD_INDEX_RO_CODE_SHA||
    env.P5_SHARD_INDEX_RO_EXECUTE!=="1"||
    (env.GITHUB_EVENT_NAME==="schedule"&&
     env.P5_SHARD_INDEX_RO_ENABLED!=="true")||
    (env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
     (env.P5_SHARD_INDEX_RO_CONFIRM!==APPROVE||
      env.P5_SHARD_INDEX_RO_MANUAL_MAIN_SHA!==env.GITHUB_SHA))||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.RAPIDAPI_KEY||env.GITHUB_TOKEN||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.P5_V39_PRE_DATABASE_URL||
    env.P5_V39_PREPARE_DATABASE_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
  HOLD("NOT_EXACT_MAIN_STOP_DEFAULT_NO_PAID_READONLY");
 const path=env.P5_SHARD_INDEX_RO_INDEX_FILE??"";
 const priorPath=env.P5_SHARD_INDEX_RO_PRIOR_INDEX_FILE??"";
 const priorSha=env.P5_SHARD_INDEX_RO_PRIOR_INDEX_SHA256??"";
 if(!PATH.test(path)||
    (priorPath!==""&&(!PATH.test(priorPath)||priorPath===path))||
    (priorPath==="")!==(priorSha==="")||
    (priorSha!==""&&!SHA.test(priorSha)))
  HOLD("UNREVIEWED_INDEX_OR_PREVIOUS_FILE_PATH");
 const digestKeys=[
  env.P5_SHARD_INDEX_RO_CURRENT_SHA256,
  env.P5_SHARD_INDEX_RO_EXTERNAL_REVIEW_SHA256,
  env.P5_SHARD_INDEX_RO_MANIFEST_SHA256,
  env.P5_SHARD_INDEX_RO_CALENDAR_SHA256,
  env.P5_SHARD_INDEX_RO_RELEASE_SHA256,
  env.P5_SHARD_INDEX_RO_RIGHTS_SHA256
 ];
 if(!digestKeys.every(v=>typeof v==="string"&&SHA.test(v))||
    digestKeys[0]!==digestKeys[1])
  HOLD("MISSING_DISTINCT_EXTERNAL_INDEX_PIN_OR_RELEASE_DIGEST");
 let u:URL;
 try{u=new URL(env.V39_P5_SOURCE_DATABASE_URL??"");}
 catch{return HOLD("MISSING_EXISTING_SOURCE_READONLY_DB_CREDENTIAL");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    decodeURIComponent(u.username)!=="phase5_p5_source_login_20261108"||
    !u.password||!u.hostname||u.pathname!=="/neondb"||u.hash)
  HOLD("WRONG_EXISTING_RESTRICTED_SOURCE_LOGIN");
 return{
  filePath:path,priorPath,priorSha,
  conn:env.V39_P5_SOURCE_DATABASE_URL!,
  pins:{
   expectedIndexSha256:digestKeys[0]!,
   exactExternallyReviewedIndexSha256:digestKeys[1]!,
   expectedManifestSha256:digestKeys[2]!,
   expectedCalendarSha256:digestKeys[3]!,
   expectedCodeSha:env.GITHUB_SHA!,
   expectedReleaseSha256:digestKeys[4]!,
   expectedRightsSha256:digestKeys[5]!
  }
 };
}
export function readP5Phase6FrozenFileOnly(path:string,limit=1024*1024){
 if(!PATH.test(path))HOLD("UNREVIEWED_FROZEN_PATH");
 const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.size<80||st.size>limit)
  HOLD("UNREVIEWED_FROZEN_FILE_SYMLINK_OR_SIZE");
 return readFileSync(path);
}
export async function readP5Phase6ShardSourceDbClock(conn:string){
 const raw=new Pool({
  connectionString:conn,max:1,connectionTimeoutMillis:8000,
  idleTimeoutMillis:1500,application_name:"p5_phase6_shard_index_ro_clock"
 });
 try{
  const restricted=makeP5Stage28DedicatedRolePool(raw,{
   group:"source",
   reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
   forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"
  });
  const c=await restricted.connect();
  let begun=false;
  try{
   await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   begun=true;
   await c.query("SET LOCAL statement_timeout='8000ms'");
   const out=await c.query(
    "SELECT clock_timestamp() AS clock_utc,current_user AS actor,"+
    "session_user AS session_login,current_database() AS db,"+
    "current_setting('transaction_read_only') AS ro,"+
    "current_setting('server_version_num')::int AS version"
   );
   if(out.rowCount!==1||
      out.rows[0]?.actor!==P5_STAGE28_GROUPS.source||
      out.rows[0]?.session_login!=="phase5_p5_source_login_20261108"||
      out.rows[0]?.db!=="neondb"||out.rows[0]?.ro!=="on"||
      Number(out.rows[0]?.version)<160000)
    HOLD("UNVERIFIED_ACTUAL_SOURCE_ROLE_OR_PG16_READONLY_CLOCK");
   const t=out.rows[0].clock_utc;
   const d=t instanceof Date?t:new Date(String(t));
   if(!Number.isFinite(d.getTime()))
    HOLD("INVALID_REAL_DB_CLOCK");
   await c.query("ROLLBACK");begun=false;
   return d.toISOString();
  }finally{
   if(begun)await c.query("ROLLBACK").catch(()=>{});
   c.release();
  }
 }finally{await raw.end().catch(()=>{});}
}
export async function runP5Phase6ShardIndexReadOnlyObserver(
 env:NodeJS.ProcessEnv,
 readFile:(path:string,limit?:number)=>Buffer=readP5Phase6FrozenFileOnly,
 clock:(conn:string)=>Promise<string>=readP5Phase6ShardSourceDbClock
){
 const admitted=admitP5Phase6ShardReadOnlyObserver(env);
 const raw=readFile(admitted.filePath,1024*1024);
 const index=parse(raw,"CURRENT_INDEX");
 let prevRaw:Buffer|null=null,prior:P5Phase6DayShardIndex|null=null;
 if(index?.revision>1){
  if(!admitted.priorPath||admitted.priorSha!==
      index.previousIndexSha256)
   HOLD("MISSING_EXACT_PREVIOUS_APPEND_ONLY_INDEX");
  prevRaw=readFile(admitted.priorPath,1024*1024);
  prior=parse(prevRaw,"PREVIOUS_INDEX");
 }else if(admitted.priorPath||admitted.priorSha)
  HOLD("UNEXPECTED_PREVIOUS_INDEX_FOR_GENESIS");
 // Inspect all file bytes with the same restricted local file reader.
 // The pure index validator rechecks SHA and source/flight day bindings.
 const t=await clock(admitted.conn);
 const pins:P5Phase6DayShardPins={
  ...admitted.pins,observedDbClockUtc:t
 };
 const result=auditP5Phase6AppendOnlyDayShardIndex(
  raw,index,pins,(path)=>readFile(path,250000),prevRaw,prior);
 return{
  status:"P5_PHASE6_ACTUAL_CLOCK_PINNED_SHARDS_READONLY_NO_DISPATCH" as const,
  approvedCodeSha:admitted.pins.expectedCodeSha,
  ...result,
  actualSourceRoleClockRequired:true as const,
  independentSignedPacketPublisherStillMissing:true as const,
  ownerAuthorizationOrPaidGoGranted:false as const
 };
}
if(process.env.P5_SHARD_INDEX_RO_EXECUTE==="1")
 runP5Phase6ShardIndexReadOnlyObserver(process.env).then(x=>{
  console.log(JSON.stringify(x));
 }).catch(e=>{
  const code=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_PHASE6_[A-Z0-9_]+$/.test(code)?
   code:"REFUSED_P5_PHASE6_DB_CLOCK_SHARD_OBSERVER_UNVERIFIED_HOLD");
  process.exitCode=2;
 });
