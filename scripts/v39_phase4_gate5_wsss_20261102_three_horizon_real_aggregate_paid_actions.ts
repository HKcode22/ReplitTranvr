/**
 * REAL GitHub-only Nov2 WSSS: 3 timed FIDS GET opportunities per horizon.
 * Source body/identities NEVER persist. This tests actual provider/GitHub
 * source availability; it is NOT scientific Gate5, a PRE source or actual label.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
import {getBalanceEvidenceStrict}
 from "../server/lib/disruption/aerodataboxLimiter_v3";
import {inspectP4OnePaidNonretainedFidsV39}
 from "../server/lib/disruption/phase4Gate5OnePaidNonretainedSourceInspection_v39";

const P="data-collection/phase4/GATE5_WSSS_20261102_FROZEN_NONRETAINED_REAL_HORIZONS.json";
const REPO="HKcode22/ReplitTranvr";
const WORKFLOW="Phase4 Gate5 WSSS Nov2 Three Horizon Real Paid Aggregate";
const REF=REPO+
 "/.github/workflows/phase4-gate5-wsss-20261102-real-paid-aggregate-three-horizons.yml@refs/heads/main";
const H=["T-24h","T-6h","T-90m"] as const;
const INTENT="WSSS_NOV2_THREE_HORIZON_REAL_9_GET_18_UNIT_MAX_NO_PROVIDER_CONTENT";
const MAX_BODY=4*1024*1024;
const JOBS={"T-24h":"owner-t24","T-6h":"owner-t6","T-90m":"owner-t90"} as const;
const CRON={"T-6h":"37 6 2 11 *","T-90m":"17 11 2 11 *"} as const;
function iso(ms:number){return new Date(ms).toISOString();}
function rec(x:unknown):Record<string,unknown>{
 if(x===null||typeof x!=="object"||Array.isArray(x))
  throw Error("P4_G5_REAL_NOV2_GITHUB_EVIDENCE_INVALID");
 return x as Record<string,unknown>;
}
function ms(x:unknown):number{
 if(typeof x!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)||
    !Number.isFinite(Date.parse(x)))throw Error("P4_G5_REAL_NOV2_TIME_INVALID");
 return Date.parse(x);
}
export function validatedContext(env:NodeJS.ProcessEnv,sha:string,now:number){
 const horizon=env.P4_G5_NOV2_HORIZON as typeof H[number];
 const job=JOBS[horizon];
 if(!H.includes(horizon)||!job||
    env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_SHA!==sha||
    !/^[0-9a-f]{40}$/.test(sha)||env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[1-9][0-9]{4,24}$/.test(env.GITHUB_RUN_ID??"")||
    env.GITHUB_WORKFLOW!==WORKFLOW||env.GITHUB_WORKFLOW_REF!==REF||
    env.GITHUB_JOB!==job||env.P4_G5_NOV2_INTENT!==INTENT||
    (horizon==="T-24h" ? env.GITHUB_EVENT_NAME!=="push" :
     horizon==="T-6h" ?
      !((env.GITHUB_EVENT_NAME==="schedule" &&
          env.P4_G5_CRON===CRON["T-6h"]) ||
        (env.GITHUB_EVENT_NAME==="push" &&
          env.P4_G5_T6_PUSH_RESCUE==="NOV2_T6_GH_PUSH_ONCE" &&
          (env.P4_G5_CRON??"")==="")) :
      !((env.GITHUB_EVENT_NAME==="schedule" &&
          env.P4_G5_CRON===CRON["T-90m"]) ||
        (env.GITHUB_EVENT_NAME==="push" &&
          env.P4_G5_T90_PUSH_RESCUE==="NOV2_T90_GH_PUSH_ONCE" &&
          (env.P4_G5_CRON??"")==="")))||
    !Number.isFinite(now)||now>=Date.parse("2026-11-02T18:00:00.000Z")||
    !!env.DATABASE_URL||!!env.V39_DATABASE_RUNTIME_URL||
    !!env.GATE05_AUTOMATION_DATABASE_URL||!!env.RAPIDAPI_KEY||
    !env.AERODATABOX_API_KEY||env.AERODATABOX_API_KEY.length<10||
    !env.P4_G5_GH_READ_ONLY_TOKEN||env.P4_G5_GH_READ_ONLY_TOKEN.length<10)
  throw Error("P4_G5_REAL_NOV2_PAID_IDENTITY_OR_SECRET_HOLD");
 return horizon;
}
async function verifyRealRunningGitHubJob(env:NodeJS.ProcessEnv,sha:string,
 first:number,last:number,deadline:number){
 const token=env.P4_G5_GH_READ_ONLY_TOKEN!;
 const id=env.GITHUB_RUN_ID!;
 const base="https://api.github.com/repos/"+REPO;
 const get=async(suffix:string)=>{
  const r=await fetch(base+suffix,{
   redirect:"error",signal:AbortSignal.timeout(8000),
   headers:{"Accept":"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"phase4-gate5-nov2-real-aggregate-physical-job",
    "Authorization":"Bearer "+token}
  });
  if(!r.ok)throw Error("P4_G5_REAL_NOV2_GITHUB_API_HOLD");
  return rec(await r.json());
 };
 const wait=Math.min(240,330-(last-first)/60000);
 const open=first-wait*60000;
 if(wait<60||Date.now()<open||Date.now()>deadline)
  throw Error("P4_G5_REAL_NOV2_NOT_PREARMED_BEFORE_DEADLINE");
 for(let i=0;i<4;i++){
  try{
   const run=await get("/actions/runs/"+id);
   const collection=await get("/actions/runs/"+id+"/jobs?per_page=100");
   const jobs=collection.jobs;
   if(!Array.isArray(jobs))throw Error("P4_G5_REAL_NOV2_GITHUB_JOB_LIST_HOLD");
   const matches=jobs.filter(x=>rec(x).name===env.GITHUB_JOB);
   if(matches.length!==1)throw Error("P4_G5_REAL_NOV2_JOB_NOT_RUNNING_HOLD");
   const job=rec(matches[0]);
   const created=ms(run.created_at),runStart=ms(run.run_started_at);
   const jobStart=ms(job.started_at),verified=Date.now();
   // One-time T-6h push recovery must be the exact reviewed GitHub merge,
   // not a generic push, a replay, or a run of a different workflow path.
   if(env.P4_G5_NOV2_HORIZON==="T-6h" && env.GITHUB_EVENT_NAME==="push"){
     const commit=rec(run.head_commit);
     if(run.path!==".github/workflows/phase4-gate5-wsss-20261102-real-paid-aggregate-three-horizons.yml"||
        commit.id!==sha||
        typeof commit.message!=="string"||
        !commit.message.startsWith("P4_G5_NOV2_T6_ONE_SHOT_PUSH_RECOVERY"))
       throw Error("P4_G5_NOV2_T6_PUSH_RESCUE_MERGE_PROOF_HOLD");
   }
   // Standby T-90m recovery, only when separately approved and merged
   // AFTER a missing scheduled event is independently verified. A generic
   // future push is never an authorized paid owner.
   if(env.P4_G5_NOV2_HORIZON==="T-90m" && env.GITHUB_EVENT_NAME==="push"){
     const commit=rec(run.head_commit);
     if(run.path!==".github/workflows/phase4-gate5-wsss-20261102-real-paid-aggregate-three-horizons.yml"||
        commit.id!==sha||
        typeof commit.message!=="string"||
        !commit.message.startsWith("P4_G5_NOV2_T90_ONE_SHOT_PUSH_RECOVERY"))
       throw Error("P4_G5_NOV2_T90_PUSH_RESCUE_MERGE_PROOF_HOLD");
   }
   if(run.id!==Number(id)||run.run_attempt!==1||run.head_sha!==sha||
      run.head_branch!=="main"||run.name!==WORKFLOW||
      rec(run.repository).full_name!==REPO||
      run.event!==env.GITHUB_EVENT_NAME||run.status!=="in_progress"||
      run.conclusion!==null||job.run_id!==Number(id)||
      job.status!=="in_progress"||job.conclusion!==null||
      created>runStart||runStart>jobStart||
      jobStart>verified||jobStart<open||jobStart>deadline||
      verified>deadline||verified-jobStart>15*60000)
    throw Error("P4_G5_REAL_NOV2_PHYSICAL_GITHUB_OWNER_HOLD");
   return {githubRunId:id,verifiedStartedAtUtc:iso(jobStart),
    verifiedAtUtc:iso(verified)};
  }catch(e){
   if(i===3||Date.now()+1800>deadline)throw e;
   await new Promise(resolve=>setTimeout(resolve,1200));
  }
 }
 throw Error("P4_G5_REAL_NOV2_GITHUB_VERIFICATION_HOLD");
}
async function bodyBytes(r:Response):Promise<Uint8Array>{
 const len=r.headers.get("content-length");
 if(len!==null&&(!/^\d+$/.test(len)||Number(len)>MAX_BODY))
  throw Error("P4_G5_REAL_NOV2_BODY_LIMIT_HOLD");
 const reader=r.body?.getReader();
 if(!reader)throw Error("P4_G5_REAL_NOV2_BODY_MISSING_HOLD");
 let size=0;const chunks:Uint8Array[]=[];
 try{
  while(true){
   const x=await reader.read();if(x.done)break;
   size+=x.value.byteLength;
   if(size>MAX_BODY)throw Error("P4_G5_REAL_NOV2_BODY_LIMIT_HOLD");
   chunks.push(x.value);
  }
 }finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
 const out=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}
 return out;
}
export async function main(){
 let started=0,successful=0,unknown=0,headerUnitsMeasured=0;
 try{
  const env=process.env;
  const checkout=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const horizon=validatedContext(env,checkout,Date.now());
  const bytes=readFileSync(P,"utf8"),manifest=rec(JSON.parse(bytes));
  if(bytes!==JSON.stringify(manifest,null,2)+"\n"||
     manifest.mode!=="PAID_EPHEMERAL_SOURCE_FIELDS_ONLY_NOT_SCIENTIFIC_GATE5"||
     manifest.cohortId!=="WSSS_20261102_1700Z_REAL_NONRETAINED_AGGREGATE"||
     manifest.physicalAttemptsMax!==9||manifest.expectedRestUnitsMax!==18||
     manifest.rawOriginalRetentionAuthorized!==false||
     manifest.persistPerFlightProviderRecords!==false||
     manifest.scientificGate5PassAuthorized!==false)
   throw Error("P4_G5_REAL_NOV2_FROZEN_MANIFEST_HOLD");
  const grid=draftP4Gate5ThreeHorizonGridV39(
   manifest.grid as Parameters<typeof draftP4Gate5ThreeHorizonGridV39>[0]);
  if(grid.queries.length!==9||grid.expectedMaxApiUnits!==18||
     grid.airportIcao!=="WSSS"||
     grid.serviceWindowStartUtc!=="2026-11-02T17:00:00.000Z"||
     grid.serviceWindowEndUtc!=="2026-11-02T18:00:00.000Z")
   throw Error("P4_G5_REAL_NOV2_GRID_DRIFT");
  const owner=grid.horizonOwners.find(o=>o.horizon===horizon);
  const queries=grid.queries.filter(q=>q.horizon===horizon);
  if(!owner||queries.length!==3||
     queries.some(q=>q.providerQueryFromLocal!=="2026-11-03T01:00"||
        q.providerQueryToLocal!=="2026-11-03T02:00"))
   throw Error("P4_G5_REAL_NOV2_FROZEN_SOURCE_FRAME_HOLD");
  const first=ms(owner.earliestPhysicalStartUtc);
  const last=ms(owner.latestPhysicalStartUtc);
  const deadline=ms(owner.verifiedPrearmDeadlineUtc);
  const proof=await verifyRealRunningGitHubJob(env,checkout,first,last,deadline);
  const digest=createHash("sha256").update(bytes).digest("hex");
  console.log(JSON.stringify({status:"P4_G5_REAL_NOV2_HORIZON_GITHUB_PREARM_VERIFIED",
   horizon,githubRunId:proof.githubRunId,jobStartedAtUtc:proof.verifiedStartedAtUtc,
   githubVerifiedAtUtc:proof.verifiedAtUtc,
   frozenManifestSha256:digest,plannedQueries:3,
   maxProviderAttempts:3,maxExpectedUnits:6,dbWrites:0,
   retainedSourceBytes:0,strictGate5Passed:false}));
  for(const [index,q] of queries.entries()){
   const planned=ms(q.plannedPhysicalStartUtc);
   const latest=ms(q.candidateGridCutoffUtc)-15*60000;
   // Only a real running GitHub job is allowed to wait for a future slot.
   // If a job or dispatch is late, do not backfill or retry an old window.
   const delay=planned-Date.now();
   if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
   const actual=Date.now();
   if(actual<planned||actual>latest){
    unknown++;
    console.log(JSON.stringify({status:"P4_G5_REAL_NOV2_QUERY_UNOBSERVED_TIMING",
     horizon,queryIndex:index,providerAttempted:0,
     candidateCutoffUtc:q.candidateGridCutoffUtc}));
    continue;
   }
   let oneAttemptStarted=false;
   try{
    validatedContext(env,checkout,actual);
    const bal=await getBalanceEvidenceStrict();
    const before=bal.quota.apiUnitsRemaining;
    if(Date.now()-ms(bal.quota.observedAtUtc)>30000||
       before<100||bal.quota.requestsRemaining<10||
       Date.now()>latest)throw Error("P4_G5_REAL_NOV2_FREE_QUOTA_OR_CUTOFF_HOLD");
    // GitHub Actions is the ONLY clock; quota can change but no second request
    // may be sent for the same slot after an ambiguous transport result.
    const qs=new URLSearchParams({direction:"Departure",withLeg:"true",
     withCancelled:"true",withCodeshared:"true",withCargo:"false",
     withPrivate:"false",withLocation:"false"});
    const url="https://aerodatabox.p.rapidapi.com/flights/airports/icao/WSSS/"+
     encodeURIComponent(q.providerQueryFromLocal)+"/"+
     encodeURIComponent(q.providerQueryToLocal)+"?"+qs;
    if(Date.now()>latest||started>=3||Date.now()<planned)
     throw Error("P4_G5_REAL_NOV2_PHYSICAL_CUTOFF_OR_CAP_HOLD");
    oneAttemptStarted=true;started++;
    console.log(JSON.stringify({status:"P4_G5_REAL_NOV2_ONE_ACTUAL_PAID_GET_STARTED",
     horizon,queryIndex:index,plannedUtc:q.plannedPhysicalStartUtc,
     actualDispatchUtc:iso(Date.now()),maxAttemptsForThisSlot:1}));
    const response=await fetch(url,{method:"GET",redirect:"error",
     signal:AbortSignal.timeout(15000),
     headers:{"X-RapidAPI-Host":"aerodatabox.p.rapidapi.com",
      "X-RapidAPI-Key":env.AERODATABOX_API_KEY!,Accept:"application/json"}});
    if(response.status!==200)throw Error("P4_G5_REAL_NOV2_NON200_NO_RETRY");
    const after=response.headers.get("x-ratelimit-api-units-remaining");
    let headerDelta:number|null=null;
    if(after&&/^\d+$/.test(after)&&Number(after)<=before)
     headerDelta=before-Number(after);
    const body=await bodyBytes(response);
    let json:unknown;
    try{json=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(body));}
    catch{throw Error("P4_G5_REAL_NOV2_INVALID_JSON_NO_RETRY");}
    const report=inspectP4OnePaidNonretainedFidsV39(json);
    successful++;
    if(headerDelta===2)headerUnitsMeasured+=2;
    console.log(JSON.stringify({
     status:"P4_G5_REAL_NOV2_PROVIDER_SOURCE_FIELD_COUNT_OBSERVED",
     horizon,queryIndex:index,cutoffUtc:q.candidateGridCutoffUtc,
     receivedAtUtc:iso(Date.now()),...report,
     expectedTier2Units:2,headerDeltaMeasured:headerDelta,
     providerRequestAttempts:1,rawBodyPersisted:false,
     flightIdsPersisted:false,dbWrites:0,retries:0,
     strictGate5Passed:false}));
   }catch{
    unknown++;
    console.log(JSON.stringify({
     status:oneAttemptStarted?
      "P4_G5_REAL_NOV2_SOURCE_UNOBSERVED_AFTER_ONE_POSSIBLY_PAID_GET":
      "P4_G5_REAL_NOV2_SOURCE_UNOBSERVED_BEFORE_GET",
     horizon,queryIndex:index,providerAttempted:oneAttemptStarted?1:0,
     noRetry:true,sourceMissingNotZeroPopulation:true,
     errorDetailsRedacted:true,strictGate5Passed:false
    }));
   }
  }
  console.log(JSON.stringify({
   status:"P4_G5_REAL_NOV2_AGGREGATE_HORIZON_CLOSED_SOURCE_ONLY",
   horizon,planned:3,providerRequestsAttempted:started,
   successfulSourceResponses:successful,
   unknownOrUnobservedSlots:unknown,
   headerBasedUnitsMeasuredForMatching2UnitResponses:headerUnitsMeasured,
   totalWorstCaseUnitsForThisHorizon:6,
   originalProviderContentPersisted:false,
   physicalUniqueFlightPopulationCertifiable:false,
   certifiedPrePersisted:false,selectedTVerified:false,
   actualOnlyRunwayLabelsVerified:false,
   strictGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
  if(unknown>0)process.exitCode=2;
 }catch{
  console.error(JSON.stringify({
   status:"P4_G5_REAL_NOV2_HORIZON_HOLD_NO_UNBUDGETED_GET",
   startedProviderRequests:started,
   successfulSourceResponses:successful,
   unknownSourceSlots:unknown,
   noProviderRetries:true,sourceBodyPersisted:false,
   errorDetailsRedacted:true,strictGate5Passed:false
  }));
  process.exitCode=2;
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_wsss_20261102_three_horizon_real_aggregate_paid_actions.ts"))
 void main();
