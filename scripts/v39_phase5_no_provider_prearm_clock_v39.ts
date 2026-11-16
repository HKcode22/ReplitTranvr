/** Measure actual GitHub setup + existing V0080 DB-clock waiting. Two
 * prospective four-slot waves on disposable PG16, never a production
 * source owner or proof of provider latency, throughput, or freeze.
 */
import {writeFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {performance} from "node:perf_hooks";
import {Pool} from "pg";
import {waitForP5ScheduledPhysicalDispatch} from "../server/lib/disruption/phase5V0080GitHubPrearm_v39";
const REPO="HKcode22/ReplitTranvr",WF=".github/workflows/phase5-v0080-github-runtime-prearm-real-pg16.yml";
const DB="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const CONFIRM="MEASURE_TWO_FOUR_SLOT_PREARM_CLOCK_WAVES_NO_PROVIDER";
const SHA=/^[a-f0-9]{40}$/,ID=/^[1-9][0-9]{0,14}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const hold=(s:string):never=>{throw Error("HOLD_P5_PREARM_CLOCK_"+s);};
const iso=(n:number)=>new Date(n).toISOString();
const at=(x:string)=>ISO.test(x)&&Number.isFinite(Date.parse(x))&&iso(Date.parse(x))===x?Date.parse(x):hold("TARGET_UTC");
type Env=Record<string,string|undefined>;
export function admitPrearmClockWave(env:Env,run:{id?:number;head_sha?:string;head_branch?:string;path?:string;event?:string;run_attempt?:number;created_at?:string}){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
    !ID.test(env.GITHUB_RUN_ID??"")||!SHA.test(env.GITHUB_SHA??"")||
    env.P5_PREARM_CLOCK_APPROVED_MAIN!==env.GITHUB_SHA||env.P5_PREARM_CLOCK_CONFIRM!==CONFIRM||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||env.V39_P5_SOURCE_OWNER_APPROVED!=="0"||
    env.V39_PHASE5_FREEZE_SIGNED!=="0"||env.DATABASE_URL!==DB||env.V39_DATABASE_RUNTIME_URL!==DB||
    ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","V39_P5_SOURCE_DATABASE_URL",
     "P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL",
     "P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL"].some(k=>env[k])||
    !/^[12]$/.test(env.P5_PREARM_CLOCK_WAVE??"")||!/^[1-4]$/.test(env.P5_PREARM_CLOCK_SLOT??""))
  hold("SCOPE");
 const runId=Number(env.GITHUB_RUN_ID),wave=Number(env.P5_PREARM_CLOCK_WAVE),slot=Number(env.P5_PREARM_CLOCK_SLOT);
 if(run.id!==runId||run.head_sha!==env.GITHUB_SHA||run.head_branch!=="main"||run.path!==WF||
    run.event!=="workflow_dispatch"||run.run_attempt!==1||!run.created_at)hold("RUN_IDENTITY");
 const created=Date.parse(run.created_at!),first=at(env.P5_PREARM_CLOCK_FIRST_TARGET??"");
 // Owner chooses the first UTC instant 15 min ahead of root dispatch.
 // Allow a small bounded difference between command time and API creation;
 // never roll a late runner to a more convenient target.
 if(!Number.isFinite(created)||first-created<10*60_000||first-created>20*60_000)
  hold("TARGET_NOT_PROSPECTIVE");
 const planned=first+(wave-1)*15*60_000;
 return {runId,wave,slot,reviewedMainSha:env.GITHUB_SHA!,created,planned,cutoff:planned+900_000};
}
type Scope=ReturnType<typeof admitPrearmClockWave>;
type Clock=()=>Promise<Date>;
export async function measurePrearmClockWave(s:Scope,readClock:Clock,
 wait:typeof waitForP5ScheduledPhysicalDispatch=waitForP5ScheduledPhysicalDispatch){
 let polls=0,maxReadMs=0;
 const timedClock=async()=>{
  const before=performance.now(),value=await readClock(),elapsed=performance.now()-before;
  polls++;maxReadMs=Math.max(maxReadMs,elapsed);
  if(!(value instanceof Date)||!Number.isFinite(value.getTime()))hold("INVALID_DB_CLOCK");
  return value;
 };
 const ready=(await timedClock()).getTime();
 // Never reset the target if a queued job or dependency installation
 // arrives late. Preserve the original no-provider denominator.
 let released:number|null=null,waitRefused=false;
 if(ready<=s.planned+120_000){
  try{
   await wait(iso(s.planned),iso(s.cutoff),180,timedClock);
   released=(await timedClock()).getTime();
  }catch{waitRefused=true;}
 }
 const slip=released===null?null:released-s.planned;
 const status=waitRefused?"HOLD_EXISTING_WAIT_REFUSED":ready>s.planned?"HOLD_NOT_READY_BEFORE_TARGET":
  slip===null||slip<0||slip>120_000?"HOLD_RELEASE_OUTSIDE_PROPOSED_SLIP":"OBSERVED_READY_AND_TIMELY_NO_PROVIDER";
 return {schema:"v39.phase5.no-provider-prearm-clock.v1",status,runId:s.runId,wave:s.wave,slot:s.slot,
  reviewedMainSha:s.reviewedMainSha,githubCreatedAtUtc:iso(s.created),nominalDispatchUtc:iso(s.planned),
  simulatedCutoffUtc:iso(s.cutoff),dbReadyAtUtc:iso(ready),dbReleasedAtUtc:released===null?null:iso(released),
  readyLeadMs:s.planned-ready,rootCreationToDbReadyMs:ready-s.created,releaseSlipMs:slip,
  dbClockReads:polls,maxDbClockReadMs:Math.ceil(maxReadMs),proposedSlipLimitSeconds:120,
  actualRunnerAndDisposableDbClockMeasured:true,independentProductionDbLatencyMeasured:false,
  providerResponseAndPersistMeasured:false,actualFlightYieldMeasured:false,
  v0080ProductionPrearmPerformed:false,productionDatabaseWrites:0,providerCalls:0,phase6PaidGo:false};
}
async function main(){
 const e=process.env;
 if(typeof e.GH_TOKEN!=="string"||e.GH_TOKEN.length<16||!ID.test(e.GITHUB_RUN_ID??""))hold("GITHUB_AUTH");
 const res=await fetch("https://api.github.com/repos/"+REPO+"/actions/runs/"+e.GITHUB_RUN_ID,
  {method:"GET",headers:{accept:"application/vnd.github+json",authorization:"Bearer "+e.GH_TOKEN,
   "X-GitHub-Api-Version":"2022-11-28"},redirect:"error",signal:AbortSignal.timeout(10000)});
 if(!res.ok)hold("GITHUB_RUN_READ");
 const scope=admitPrearmClockWave(e,await res.json());
 const db=new Pool({connectionString:DB,max:1,connectionTimeoutMillis:8000,query_timeout:8000,
  options:"-c default_transaction_read_only=on",application_name:"p5_disposable_clock_rehearsal"});
 try{
  const r=(await db.query("SELECT current_database() db,current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica")).rows[0];
  if(r?.db!=="v39_ci"||r.version<160000||r.version>=170000||r.ro!=="on"||r.replica!==false)hold("NOT_DISPOSABLE_PG16_READONLY");
  const out=await measurePrearmClockWave(scope,async()=>{
   const rows=(await db.query("SELECT clock_timestamp() AS t")).rows;
   if(rows.length!==1)hold("DB_CLOCK");return new Date(rows[0].t);
  });
  if(!e.RUNNER_TEMP)hold("OUTPUT");
  writeFileSync(join(e.RUNNER_TEMP,"p5-prearm-clock-"+scope.wave+"-"+scope.slot+".json"),JSON.stringify(out),{flag:"wx",mode:0o600});
  console.log(JSON.stringify(out));
  // The failed workflow is a valid adverse measurement, not authority to
  // repeat automatically or shift the nominal prospective clock.
  if(out.status!=="OBSERVED_READY_AND_TIMELY_NO_PROVIDER")process.exitCode=2;
 }finally{await db.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_P5_PREARM_CLOCK_[A-Z0-9_]+$/.test(m)?m:"HOLD_P5_PREARM_CLOCK_REDACTED_NO_GO");process.exitCode=2;});
}
