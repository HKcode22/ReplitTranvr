/**
 * ONE prospective, frozen G5A WSSS horizon owner, GitHub Actions ONLY.
 * Not an airport/global forecast or actual wheels-off experiment.
 *
 * Source: V0076 committed physical reservation BEFORE every physical GET;
 * one paid GET max per slot; original provider body + normalized members +
 * exact V0077 binding are committed atomically; source prefix can yield
 * genuine clock-safe PRE before later planned observations (PR #370).
 *
 * Live CLI only under an exact real GitHub scheduled runner + reviewed
 * main SHA + protected dedicated DB writer and provider secret.
 *
 * NO retrospective source backfill, no Replit timers, no Cloudflare,
 * no implicit runner activation on PR/push, no provider retries.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import pg from "pg";
import {isP4G5ReviewedMainWorkflowRestPathV39}
 from "../server/lib/disruption/phase4Gate5GithubRestPathGuard_v39";
import {fetchFidsPopulation,type FidsCensusParams}
 from "../server/lib/disruption/fidsCensus_v3";
import {fetchFidsAirport,getBalanceEvidenceStrict}
 from "../server/lib/disruption/aerodataboxLimiter_v3";
import {draftP4Gate5ThreeHorizonGridV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {stageP4G5PreparedOwnerDbOnlyV39}
 from "../server/lib/disruption/phase4Gate5DurablePreparedOwner_v39";
import {activateP4G5PreparedOwnerDbOnlyV39}
 from "../server/lib/disruption/phase4Gate5OwnerActiveTransition_v39";
import {persistP4G5BoundFidsDbOnlyV39}
 from "../server/lib/disruption/phase4Gate5AtomicBoundSourceV39";
import {persistP4G5ReviewedPreForCohortV39}
 from "../server/lib/disruption/phase4Gate5ScopedPreWriter_v39";
import {G5A_PRIOR_T24_PROVENANCE_SQL_V39,assessG5AT24PreconditionV39}
 from "../server/lib/disruption/phase4Gate5PriorSourceStop_v39";
const REPO="HKcode22/ReplitTranvr";
const NAME="Phase4 Gate5 G5A Nov7 WSSS Real Prospective GitHub Owner";
const WORKFLOW_PATH=".github/workflows/phase4-gate5-g5a-nov07-real-wsss-prospective-owner.yml";
const MANIFEST_PATH="data-collection/phase4/GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json";
const PROTOCOL_PATH="data-collection/phase4/2026-11-03_G5A_PROSPECTIVE_PROVIDER_OBSERVABLE_PROTOCOL_AMENDMENT.md";
const AUTH_INTENT="WSSS_NOV07_0200Z_G5A_ONE_PROSPECTIVE_THREE_HORIZON_18_UNIT_MAX";
/** Actual Plan f.8 §5.1 OpenAPI v1.15.3.0 documentary bytes pin (Sep1).
 * G5A protocol.md SHA is a different artifact; do not misname it OpenAPI.
 * This pin is historical document provenance, not live response version. */
export const P4_G5_G5A_PUBLIC_OPENAPI_DOCUMENT_SHA_V39=
 "735620f2d2132c5bf51768f50caa767b7f0b25be8b128679641402666696890a" as const;
const H={
 // Future Nov7 02:00Z replacement, distinct from failed original Nov5 T24.
 "T-24h":{job:"owner-t24",crons:[
  "47 21 5 11 *","17 22 5 11 *","47 22 5 11 *","17 23 5 11 *"
 ]},
 "T-6h":{job:"owner-t6",crons:[
  "47 15 6 11 *","17 16 6 11 *","47 16 6 11 *","17 17 6 11 *"
 ]},
 "T-90m":{job:"owner-t90",crons:[
  "17 20 6 11 *","47 20 6 11 *","17 21 6 11 *","47 21 6 11 *"
 ]}
} as const;
type Horizon=keyof typeof H;
const HEAD=/^[a-f0-9]{40}$/;
const SHA=/^[a-f0-9]{64}$/;
const ms=(x:string)=>new Date(x).getTime();
const iso=(t:number)=>new Date(t).toISOString();
const sha=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex");
const sleep=(t:number)=>new Promise<void>(r=>setTimeout(r,t));
const rec=(x:unknown):Record<string,unknown>=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("G5A_BAD_GITHUB_RESPONSE_HOLD");
 return x as Record<string,unknown>;
};
function hold(name:string):never{throw Error("P4_G5_G5A_"+name+"_HOLD");}
export function assertG5AOwnerRunContextV39(e:NodeJS.ProcessEnv,checkout:string,h:Horizon,now:number){
 const j=H[h];
 const genuineSchedule=e.GITHUB_EVENT_NAME==="schedule"&&
   !!j?.crons.includes(e.P4_G5_G5A_CRON as never)&&
   !e.P4_G5_G5A_MANUAL_HORIZON;
 const genuineManual=e.GITHUB_EVENT_NAME==="workflow_dispatch"&&
   e.P4_G5_G5A_MANUAL_HORIZON===h&&
   e.P4_G5_G5A_CRON==="manual-reviewed";
 if(!j||!(genuineSchedule||genuineManual)||
    !Number.isFinite(now)||!HEAD.test(checkout)||
   e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||
   e.GITHUB_REF!=="refs/heads/main"||
   e.GITHUB_SHA!==checkout||
   e.GITHUB_RUN_ATTEMPT!=="1"||
   !/^\d{5,25}$/.test(e.GITHUB_RUN_ID??"")||
   e.GITHUB_JOB!==j.job||
   e.GITHUB_WORKFLOW!==NAME||
   e.GITHUB_WORKFLOW_REF!==REPO+"/"+WORKFLOW_PATH+"@refs/heads/main"||
   
   e.P4_G5_G5A_HORIZON!==h||
   e.P4_G5_G5A_PAID_INTENT!==AUTH_INTENT||
   !e.GITHUB_TOKEN||e.GITHUB_TOKEN.length<10||
   !e.AERODATABOX_API_KEY||e.AERODATABOX_API_KEY.length<10||
   !e.V39_DATABASE_RUNTIME_URL||e.V39_DATABASE_RUNTIME_URL.length<10||
   !e.P4_G5_SOURCE_OWNER_DATABASE_URL||
   e.V39_DATABASE_RUNTIME_URL!==e.P4_G5_SOURCE_OWNER_DATABASE_URL||
   !!e.DATABASE_URL||!!e.GATE05_AUTOMATION_DATABASE_URL||
   e.ADB_AUTO_COLLECT!=="0"||
   e.V39_PHASE6_PROCESS_ARMED!=="0"||
   now>=Date.parse("2026-11-07T05:30:00.000Z"))
  hold("GITHUB_CONTEXT_OR_SECRET");
}
async function proveRealGithubOwnerJob(e:NodeJS.ProcessEnv,sha40:string,
 h:Horizon,prearmDeadline:number){
 const get=async(path:string)=>{
  const res=await fetch("https://api.github.com/repos/"+REPO+path,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(9000),
   headers:{Accept:"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"gate5-g5a-frozen-prospective-source-owner",
    Authorization:"Bearer "+e.GITHUB_TOKEN}
  });
  if(!res.ok)hold("GITHUB_API_OWNER_PROOF");
  return rec(await res.json());
 };
 const id=e.GITHUB_RUN_ID!;
 const run=await get("/actions/runs/"+id);
 const listing=await get("/actions/runs/"+id+"/jobs?per_page=100");
 if(!Array.isArray(listing.jobs))hold("GITHUB_JOBS_LIST");
 const matches=listing.jobs.map(rec).filter(x=>x.name===H[h].job);
 if(matches.length!==1)hold("GITHUB_OWNER_JOB_IDENTITY");
 const job=matches[0],runTime=Date.now();
 const runStarted=Date.parse(String(run.run_started_at));
 const jobStarted=Date.parse(String(job.started_at));
 if(run.id!==Number(id)||run.head_sha!==sha40||
  run.head_branch!=="main"||run.name!==NAME||
  !isP4G5ReviewedMainWorkflowRestPathV39(run.path,WORKFLOW_PATH)||run.run_attempt!==1||
  run.event!==e.GITHUB_EVENT_NAME||run.status!=="in_progress"||
  run.conclusion!==null||rec(run.repository).full_name!==REPO||
  job.run_id!==Number(id)||job.status!=="in_progress"||
  job.conclusion!==null||job.name!==e.GITHUB_JOB||
  !Number.isFinite(runStarted)||!Number.isFinite(jobStarted)||
  runStarted>jobStarted||jobStarted>runTime||
  jobStarted>prearmDeadline||runTime>prearmDeadline||
  runTime-jobStarted>12*60000)
  hold("GITHUB_NOT_PROSPECTIVELY_PREARMED");
 return {
  githubRunId:id,
  actualJobStartedAtUtc:iso(jobStarted),
  independentlyVerifiedAtUtc:iso(runTime),
  gitSha:sha40,
  githubRunProofSha256:sha(JSON.stringify({
   githubRunId:id,gitSha:sha40,runStartedAtUtc:iso(runStarted),
   jobStartedAtUtc:iso(jobStarted),jobName:job.name,workflowPath:run.path
  }))
 };
}
function parseFrozenManifest(bytes:string){
 let m:unknown;try{m=JSON.parse(bytes)}catch{hold("MANIFEST_JSON")}
 const v=rec(m),g=rec(v.grid);
 if(bytes!==JSON.stringify(m,null,2)+"\n"||
  v.cohortId!=="WSSS_G5A_20261107_0200Z"||
  g.airportIcao!=="WSSS"||
  g.airportIanaTimezone!=="Asia/Singapore"||
  g.serviceWindowStartUtc!=="2026-11-07T02:00:00.000Z"||
  g.serviceWindowEndUtc!=="2026-11-07T03:00:00.000Z"||
  g.apiUnitsPerPhysicalAttempt!==2||
  g.maxAttemptsPerQuery!==1||
  g.maxSourceQueries!==9||
  g.projectRestApiUnitsBudget!==24)
  hold("FROZEN_SOURCE_GRID_CHANGED");
 const grid=draftP4Gate5ThreeHorizonGridV39(g as unknown as
  Parameters<typeof draftP4Gate5ThreeHorizonGridV39>[0]);
 if(grid.queries.length!==9||grid.expectedMaxApiUnits!==18||
    grid.horizonOwners.some(x=>x.queryCount!==3))
  hold("GRID_COUNT_OR_ACCOUNT_CAP");
 return {manifest:v,grid,manifestSha:sha(bytes)};
}
/**
 * V0076 SECURITY DEFINER signature, exactly:
 * (manifest, ownerDigest, githubRunId, queryDigest, attemptNumber, SHA).
 * Previously a transposition of GitHub run/query digest would have made
 * every real physical reservation fail before making a paid request.
 */
export function p4G5G5AReservationSqlArgsV39(
 manifestSha256:string,ownerDigest:string,githubRunId:string,
 queryDigest:string,attemptNumber:number,reservationSha256:string
):[string,string,string,string,number,string]{
 if(!SHA.test(manifestSha256)||!SHA.test(ownerDigest)||
    !/^\d{5,25}$/.test(githubRunId)||!SHA.test(queryDigest)||
    !Number.isInteger(attemptNumber)||attemptNumber!==1||
    !SHA.test(reservationSha256))
  hold("RESERVATION_SQL_ARGUMENTS");
 return [manifestSha256,ownerDigest,githubRunId,
         queryDigest,attemptNumber,reservationSha256];
}
const errorSafe=(e:unknown)=>{
 const message=e instanceof Error?e.message:"";
 return /^P4_G5_[A-Z0-9_]+(?:_HOLD)?$/.test(message)?
  message:"P4_G5_G5A_UNKNOWN_NO_CONTENT_LOGGED_HOLD";
};
/** Safe attribution only: never print SQL text, exception messages,
 * provider payload, flight identity, tokens, passwords or connection data. */
export function sourceErrorSafeG5AV39(err:unknown){
 const message=err instanceof Error?err.message:"";
 if(/^P4_G5_[A-Z0-9_]+(?:_HOLD)?$/.test(message)||
    /^FIDS_[A-Z0-9_]{3,120}$/.test(message))
  return message;
 const code=err!==null&&typeof err==="object"&&"code" in err?
  (err as {code?:unknown}).code:null;
 if(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code))
  return "P4_G5_G5A_SOURCE_SQLSTATE_"+code+"_HOLD";
 return "P4_G5_G5A_UNKNOWN_NO_CONTENT_LOGGED_HOLD";
}
export async function main(){
 const e=process.env,checkout=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8",timeout:4000}).trim();
 const h=e.P4_G5_G5A_HORIZON as Horizon;
 assertG5AOwnerRunContextV39(e,checkout,h,Date.now());
 const bytes=readFileSync(MANIFEST_PATH,"utf8"),{manifest,grid,manifestSha}=
  parseFrozenManifest(bytes);
 const protocol=readFileSync(PROTOCOL_PATH,"utf8");
 if(!protocol.includes("G5A primary target")||
    !protocol.includes("provider-reported schedule instability")||
    !protocol.includes("15 minutes")||
    !protocol.includes("PROPOSED FOR PRE-COLLECTION REVIEW"))
  hold("PROTOCOL_BYTES_CHANGED_OR_UNREVIEWED");
 const ownerGrid=grid.horizonOwners.find(x=>x.horizon===h);
 if(!ownerGrid)hold("OWNER_GRID_MISSING");
 const first=ms(ownerGrid.earliestPhysicalStartUtc);
 const deadline=ms(ownerGrid.verifiedPrearmDeadlineUtc);
 if(Date.now()<first-240*60000||Date.now()>deadline)
  hold("GITHUB_RUN_NOT_EARLY_ENOUGH");
 const proof=await proveRealGithubOwnerJob(e,checkout,h,deadline);
 const owner=prepareP4G5PhysicalOwnerV39({
  cohortId:String(manifest.cohortId),frozenManifestBytes:bytes,
  reviewedManifestSha256:manifestSha,
  grid:manifest.grid as Parameters<typeof prepareP4G5PhysicalOwnerV39>[0]["grid"],
  horizon:h,actualOwnerProcessStartedAtUtc:proof.actualJobStartedAtUtc
 });
 const rightsPath="data-collection/phase4/2026-11-03_OWNER_DIRECTIVE_NO_PERFECTION_LOOP_FAST_SCIENTIFIC_GATE5_CLOSURE.md";
 const rightsDoc=readFileSync(rightsPath,"utf8");
 if(!rightsDoc.includes("24h")||
    !rightsDoc.includes("Content")||
    !rightsDoc.includes("No perfection"))
  hold("SOURCE_TEMPORARY_SCOPE_NOT_REVIEWED");
 const rightsSha=sha(rightsDoc),protocolSha=sha(protocol);
 const authSha=sha(JSON.stringify({
  mode:"G5A_REPORTED_SCHEDULE_REVISION",manifestSha,
  gitSha:checkout,githubRunId:proof.githubRunId,
  verifiedGitHubRunSha256:proof.githubRunProofSha256,
  rightsScopeSha256:rightsSha,g5aProtocolSha256:protocolSha
 }));
 // Neon scale-to-zero closes the idle PostgreSQL backend; keep this
 // exact owner session healthy with bounded READ-ONLY heartbeat queries.
 // 57P01 may also reflect compute administration: verify health again at
 // source boundary. Never retry an uncertain paid GET, SQL transaction,
 // original persistence or POST outcome.
 let dbBroken=false,lastIdleProbeAt=0,asynchronousPgLosses=0;
 const makeClient=()=>{
  const client=new pg.Client({
   connectionString:e.P4_G5_SOURCE_OWNER_DATABASE_URL,
   connectionTimeoutMillis:9500,query_timeout:14000,
   application_name:"g5a_real_github_prospective_pre_source"
  });
  client.on("error",(err:Error&{code?:string})=>{
   if(client===db&&!dbBroken){
    dbBroken=true;asynchronousPgLosses++;
    console.error(JSON.stringify({
     status:"G5A_PG_ASYNC_DISCONNECT_RECONNECT_WHEN_IDLE",
     code:/^[A-Z0-9]{5}$/.test(err.code??"")?err.code:"UNKNOWN",
     providerCallsFromDisconnect:0
    }));
   }
  });
  client.on("end",()=>{if(client===db)dbBroken=true;});
  return client;
 };
 let db=makeClient();
 const repairIdle=async()=>{
  if(!dbBroken)return;
  const old=db;
  // Reconnect under original scoped credentials only, NEVER on behalf of
  // an ambiguous database write or a physical provider request.
  for(let attempt=1;attempt<=3;attempt++){
   const next=makeClient();
   try{
    await next.connect();db=next;dbBroken=false;lastIdleProbeAt=0;
    await old.end().catch(()=>undefined);
    console.log(JSON.stringify({
     status:"G5A_PG_IDLE_RECONNECTED_WITHOUT_PAID_OR_SQL_REPLAY",
     observedDisconnects:asynchronousPgLosses,reconnectAttempt:attempt,
     providerCallsFromReconnect:0
    }));
    return;
   }catch{
    await next.end().catch(()=>undefined);
    if(attempt<3)await sleep(attempt*900);
   }
  }
  hold("PG_IDLE_RECONNECT_UNAVAILABLE");
 };
 const readOnlyHealthProbe=async()=>{
  await repairIdle();
  if(Date.now()-lastIdleProbeAt<25000)return;
  const ping=async()=>{
   const res=await db.query("SELECT clock_timestamp() AS db_now_utc");
   if(res.rows.length!==1||!(res.rows[0]?.db_now_utc instanceof Date)||
      !Number.isFinite(res.rows[0].db_now_utc.getTime()))
    hold("PG_READ_ONLY_HEARTBEAT_INVALID");
  };
  try{await ping();}
  catch{
   // The ONLY query repeated here is a read-only clock/health SELECT.
   // Never use this path to retry an uncertain reservation/paid GET.
   dbBroken=true;await repairIdle();await ping();
  }
  lastIdleProbeAt=Date.now();
 };
 let successful=0,attempted=0,unknown=0,preCreated=0,preExisting=0;
 await db.connect();
 const dbw={query:(sql:string,args?:readonly unknown[])=>
  db.query(sql,args as unknown[]|undefined)};
 try{
  // Full three-horizon science cannot be repaired by later source requests
  // when T24 has NO original-bound responses or on-time PRE. Check before
  // staging a successor owner, quota query or irreversible paid reservation.
  if(h!=="T-24h"){
   const early=await db.query(G5A_PRIOR_T24_PROVENANCE_SQL_V39,[manifestSha]);
   const evidence=assessG5AT24PreconditionV39(early.rows);
   if(!evidence.allowPaidContinuation){
    console.log(JSON.stringify({
     status:"G5A_T24_SOURCE_OR_PRE_MISSING_NO_SUCCESSOR_PAID",
     horizon:h,verifiedT24OriginalBindings:evidence.originals,
     verifiedT24OnTimePRE:evidence.pre,
     futurePaidReservationsCreated:0,providerCalls:0,
     completeThreeHorizonScience:false,scientificGate5Passed:false
    }));
    return;
   }
  }
  // GitHub schedule redundancy and a reviewed manual workflow_dispatch may
  // overlap. One actual physical horizon owner is immutable, not replayable.
  // Every later runner must exit before V0076 staging or provider GET. The
  // old owner may have zero receipts; that is UNOBSERVED, not permission to
  // create a second owner that could duplicate source charges.
  let boundRunId=proof.githubRunId,boundAuthSha=authSha;
  const incumbent=await db.query(
   "SELECT state,github_run_id FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE owner_digest=$1 AND manifest_sha256=$2",
   [owner.ownerDigest,manifestSha]);
  if(incumbent.rows.length>1)hold("DUPLICATE_OWNER_CATALOG_DRIFT");
  if(incumbent.rows.length===1){
   console.log(JSON.stringify({
    status:"G5A_NOV07_BACKUP_OWNER_DUPLICATE_SUPPRESSED_NO_PROVIDER",
    horizon:h,originalOwnerState:String(incumbent.rows[0].state),
    originalRunId:String(incumbent.rows[0].github_run_id),
    thisRunId:proof.githubRunId,
    providerCalls:0,databaseWrites:0,scientificGate5Passed:false
   }));
   return;
  }else{
  const prepared=await stageP4G5PreparedOwnerDbOnlyV39(dbw,{
   owner,githubRunId:proof.githubRunId,
   reviewedRunAuthorizationSha256:authSha
  });
  const activated=await activateP4G5PreparedOwnerDbOnlyV39(dbw,{
   owner,githubRunId:proof.githubRunId,
   reviewedRunAuthorizationSha256:authSha,
   scientificMode:"G5A_REPORTED_SCHEDULE_REVISION",
   providerNativeSelectedTEvidenceSha256:protocolSha,
   perRecordActualOnlyRunwayEvidenceSha256:null,
   g5aProtocolEvidenceSha256:protocolSha,
   operatingPhysicalLegEvidenceSha256:sha(readFileSync(
    "server/lib/disruption/fidsCensus_v3.ts","utf8")),
   lawfulContentRetentionEvidenceSha256:rightsSha,
   independentlyAuthenticatedGitHubRunnerEvidenceSha256:
    proof.githubRunProofSha256
  });
  console.log(JSON.stringify({
   status:"G5A_GITHUB_OWNER_PREARMED_V0076_ACTIVE",
   horizon:h,gitSha:checkout,githubRunId:proof.githubRunId,
   jobStartedAtUtc:proof.actualJobStartedAtUtc,
   frozenManifestSha256:manifestSha,ownerStatus:activated.status,
   preparedOwnerRows:prepared.ownerRowsNewlyInserted,
   sourceSlots:3,attemptedPaidSourceGets:0,phase5FreezeAuthorized:false,
   actualWheelsOffClaim:false
  }));
  }
  const stamp=grid.serviceWindowStartUtc,stop=grid.serviceWindowEndUtc;
  const start=ms(stamp),end=ms(stop);
  let lastPre=0;
  const permit={
   exactCohortManifestSha256:manifestSha,
   independentSelectedTSourceEvidenceSha256:protocolSha,
   independentPhysicalOperatingIdentityEvidenceSha256:sha(readFileSync(
    "server/lib/disruption/fidsCensus_v3.ts","utf8")),
   independentlyReviewedSourceRetentionEvidenceSha256:rightsSha,
   reviewedRunAuthorizationSha256:boundAuthSha,
   frozenBuilderSourceSha256:sha(readFileSync(
    "server/lib/disruption/preSnapshotBuilder_v3.ts","utf8")),
   builderFrozenAtUtc:String((manifest.grid as Record<string,unknown>)
    .assignmentFrozenAtUtc),
   verifiedExternalSourceAndRightsReview:true as const,
   selectedTConfig:{
    milestone:"departure.scheduledTime.utc",version:"G5A-20261103-v1",
    artifactHash:protocolSha,semanticsEvidenceSha256:protocolSha,
    verifiedProviderNativeSchedule:true as const
   }
  };
  const tryPre=async()=>{
   if(successful===0||Date.now()-lastPre<16000)return;
   lastPre=Date.now();
   try{
    // PRE's trusted read watermark is the live PostgreSQL clock, not a
    // potentially skewed GitHub runner wall clock. The downstream writer
    // independently checks this same DB-clock against every real cutoff.
    const preClock=await db.query("SELECT clock_timestamp() AS db_now_utc");
    const dbNow=preClock.rows[0]?.db_now_utc;
    if(preClock.rows.length!==1||!(dbNow instanceof Date)||
       !Number.isFinite(dbNow.getTime()))
     hold("PRE_DB_CLOCK_UNAVAILABLE");
    const out=await persistP4G5ReviewedPreForCohortV39(dbw,{
     airportIcao:"WSSS",
     serviceStartUtc:stamp,serviceEndUtc:stop,
     observedAtUtc:dbNow.toISOString(),horizon:h,
     reviewedFrozenManifestSha256:manifestSha,
     expectedOwnerGithubRunId:boundRunId
    },permit);
    preCreated+=out.newlyPersistedRows;
    preExisting+=out.previousVerifiedIdempotentRows;
    console.log(JSON.stringify({
     status:"G5A_SOURCE_BOUND_CLOCK_SAFE_PRE_ATTEMPT",
     horizon:h,actualBoundPrefix:out.originalReceiptsBoundAtPreWrite,
     newPRE:out.newlyPersistedRows,
     priorSameEvidencePRE:out.previousVerifiedIdempotentRows,
     missingLaterSlots:out.originalSlotsPlanned-
      out.originalReceiptsBoundAtPreWrite,
     lateNoBackfill:out.lateCutoffCandidatesNotBackfilled,
     notYetDue:out.notYetDueCandidates,
     scientificGate5Passed:false
    }));
   }catch(err){
    // A genuine conflict/rights/source mismatch is HOLD; stop rather than
    // declaring success based on empty or incomplete source.
    console.error(JSON.stringify({
     status:"G5A_PRE_CUTOFF_ATTEMPT_UNVERIFIED",
     horizon:h,error:errorSafe(err),sourceCount:successful,
     noRetrospectiveWrite:true
    }));
    throw err;
   }
  };
  const wait=async(until:number)=>{
   while(Date.now()<until){
    await readOnlyHealthProbe();
    await tryPre();
    await sleep(Math.min(16000,Math.max(1,until-Date.now())));
   }
  };
  for(const entry of owner.entries){
   const planned=ms(entry.plannedPhysicalStartUtc);
   const latest=ms(entry.hardLatestPhysicalStartUtc);
   await wait(planned);
   await readOnlyHealthProbe();
   const now=Date.now();
   if(now>latest||now<planned){unknown++;continue;}
   // Live account quota is mandatory; if missing, mark UNOBSERVED and
   // do not consume a physical reservation or make a blind paid GET.
   let apiRemaining:number;
   try{
    const quota=(await getBalanceEvidenceStrict()).quota;
    if(Date.now()-ms(quota.observedAtUtc)>30000||
      quota.apiUnitsRemaining<2||quota.requestsRemaining<1)
     hold("LIVE_PROVIDER_QUOTA_INSUFFICIENT_OR_STALE");
    apiRemaining=quota.apiUnitsRemaining;
   }catch{unknown++;continue}
   if(apiRemaining<owner.perAttemptApiUnits||Date.now()>latest){
    unknown++;continue;
   }
   // Real database health immediately before irreversible V0076 reservation.
   await readOnlyHealthProbe();
   if(Date.now()>latest){unknown++;continue;}
   const expectedReservationSha256=sha([
    manifestSha,owner.ownerDigest,entry.queryDigest,"1"
   ].join("|"));
   let reserved=false;
   try{
    await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
    const res=await db.query(
     "SELECT clean.reserve_phase4_g5_fids_physical_attempt_v39"+
     "($1,$2,$3,$4,$5,$6) AS committed_at_utc",
     p4G5G5AReservationSqlArgsV39(
      manifestSha,owner.ownerDigest,boundRunId,
      entry.queryDigest,1,expectedReservationSha256));
    if(res.rows.length!==1||!res.rows[0]?.committed_at_utc)
     hold("DURABLE_PAID_RESERVATION");
    await db.query("COMMIT");reserved=true;
   }catch{
    await db.query("ROLLBACK").catch(()=>undefined);
    unknown++;continue;
   }
   if(!reserved||Date.now()>latest){unknown++;continue;}
   attempted++;
   let reserveCalls=0;
   const q: FidsCensusParams={
    airportIcao:entry.sourceAirportIcao,
    fromLocal:entry.sourceFromLocal,toLocal:entry.sourceToLocal,
    ianaTimezone:grid.airportIanaTimezone,
    withCancelled:true,withCodeshared:true,
    withCargo:false,withPrivate:false,direction:"Departure",
    serviceWindowStartUtc:new Date(start),
    serviceWindowEndUtc:new Date(end),
    cutoffUtc:new Date(entry.cutoffUtc),
    restCategory:"fids_base",
    providerApiVersion:"RapidAPI-doc-pin-1.15.3.0-not-live-schema-certified",
    fidsProtocolVersion:"G5A-20261103-v1",
    openapiSha256:P4_G5_G5A_PUBLIC_OPENAPI_DOCUMENT_SHA_V39,
    g5aObservedScheduleProtocol:true
   };
   const fetchOne:NonNullable<Parameters<typeof fetchFidsPopulation>[1]>["fetchAirport"]=
    async(icao,from,to,opts)=>{
      return fetchFidsAirport(icao,from,to,{
       ...opts,
       budgetOwner:{
        async reserve(_category,units,number){
         // First and ONLY provider attempt was already committed in V0076;
         // rejected retries cannot generate a second paid request.
         if(number!==1||units!==2||reserveCalls!==0)
          throw Error("G5A_SECOND_PHYSICAL_PAID_GET_FORBIDDEN");
         reserveCalls++;return expectedReservationSha256;
        }
       }
      });
    };
   try{
    const one=await fetchFidsPopulation(q,{
     fetchAirport:fetchOne,
     persist:async(query,rows)=>{
      const expires=iso(query.availableAtUtc.getTime()+23*3600000);
      const r=await persistP4G5BoundFidsDbOnlyV39(query,rows,{
       manifestSha256:manifestSha,horizon:h,
       expectedOwnerGithubRunId:boundRunId,
       reviewedRunAuthorizationSha256:boundAuthSha,
       queryDigest:entry.queryDigest,
       expectedReservationSha256,rightsReviewArtifactSha256:rightsSha,
       sourceUseExpiresAtUtc:expires,
       expectedAirportIcao:"WSSS",
       expectedServiceStartUtc:stamp,expectedServiceEndUtc:stop,
       expectedFromLocal:entry.sourceFromLocal,
       expectedToLocal:entry.sourceToLocal
      });
      return r.normalizedRowsInserted;
     }
    });
    if(!one||reserveCalls!==1){
     unknown++;console.log(JSON.stringify({
      status:"G5A_SOURCE_OR_ORIGINAL_UNOBSERVED",
      horizon:h,queryIndex:entry.queryIndex,paidAttemptReserved:true,
      noSecondRequest:true
     }));
    }else{
     successful++;
     console.log(JSON.stringify({
      status:"G5A_ORIGINAL_AND_OPERATING_POPULATION_V0077_COMMITTED",
      horizon:h,queryIndex:entry.queryIndex,
      normalizedRows:one.persistedPopulationRows,
      originalBound:true,providerPaidAttempts:1,
      rawOriginalContentPrinted:false,scientificGate5Passed:false
     }));
    }
   }catch(err){
    unknown++;
    console.error(JSON.stringify({
     status:"G5A_SOURCE_NOT_PERSISTED_AFTER_RESERVED_PAID_ATTEMPT",
     horizon:h,queryIndex:entry.queryIndex,
     error:sourceErrorSafeG5AV39(err),noRetry:true
    }));
   }
   await readOnlyHealthProbe();
   await tryPre();
  }
  await wait(ms(owner.entries[owner.entries.length-1].cutoffUtc)+1500);
  await readOnlyHealthProbe();
  await tryPre();
  console.log(JSON.stringify({
   status:"G5A_PROSPECTIVE_HORIZON_SOURCE_PRE_OBSERVATION_CLOSED",
   horizon:h,sourceSlotsPlanned:3,paidAttemptsReserved:attempted,
   exactOriginalBoundResponses:successful,
   sourceUnknownSlots:unknown,
   newCutoffSafePRE:preCreated,verifiedExistingPRE:preExisting,
   sourceTotalMaxUnitsPerHorizon:6,
   sourceRightsOnlyConservativeScopeNotProviderSpecific:true,
   postflightScheduleRevisionNotYetObserved:true,
   noWheelsOffActualClaim:true,
   scientificGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
  // An all-zero source/PRE horizon is an operational HOLD, never a green
  // science collection result. Keep reservations immutable; no retries.
  if(successful===0||preCreated+preExisting===0)
   hold("PROSPECTIVE_HORIZON_ZERO_DURABLE_SOURCE_OR_PRE");
 }finally{await db.end().catch(()=>undefined)}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_real_wsss_horizon_owner.ts"))
 void main().catch(err=>{
  console.error(JSON.stringify({status:"G5A_REAL_GITHUB_HORIZON_HOLD",
   reason:errorSafe(err),noProviderContentPrinted:true,
   scientificGate5Passed:false}));
  process.exitCode=2;
 });
