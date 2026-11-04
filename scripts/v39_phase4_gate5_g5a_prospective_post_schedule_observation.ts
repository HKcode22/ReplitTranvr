/**
 * G5A one-time, Github-only, prospective WSSS POST source observation.
 * Three immutable budget-ledger reservations (max 6 provider REST units).
 *
 * First original T is the per-flight provider-reported scheduled departure.
 * Prediction label: schedule revision vs actual as-of PRE by W=T+2h;
 * NOT actual wheels-off. No downstream models are trained here.
 *
 * 3 fixed POST GETs at 15:40, 16:10, 16:40Z 2026-11-05, within a fixed
 * WSSS 13:00-17:00Z source range (21:00-01:00 next day Singapore).
 * A missing/lost identity/schedule is UNKNOWN, not a negative/actual.
 *
 * This module never runs paid for PR, push or in Replit. Only verified GitHub
 * scheduled events or the existing reviewed manual fallback may collect.
 * It requires verified real GitHub provenance and preexisting role
 * with SELECT/INSERT on clean.adb_rest_attempt_ledger.
 */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import pg from "pg";
import {G5A_PRIOR_T24_PROVENANCE_SQL_V39,assessG5AT24PreconditionV39}
 from "../server/lib/disruption/phase4Gate5PriorSourceStop_v39";
import {isP4G5ReviewedMainWorkflowRestPathV39}
 from "../server/lib/disruption/phase4Gate5GithubRestPathGuard_v39";
import {fetchFidsPopulation,type FidsCensusParams,type FidsQueryObservation,
 type PopulationRow,persistFidsObservation}
 from "../server/lib/disruption/fidsCensus_v3";
import {fetchFidsAirport,getBalanceEvidenceStrict}
 from "../server/lib/disruption/aerodataboxLimiter_v3";
const REPO="HKcode22/ReplitTranvr";
const WF="Phase4 Gate5 G5A WSSS Real Prospective POST";
const PATH=".github/workflows/phase4-gate5-g5a-wsss-real-post.yml";
export const G5A_POST_CRONS_V39=["10 14 5 11 *","22 14 5 11 *",
 "37 14 5 11 *","52 14 5 11 *"] as const;
const PROOF_DEADLINE="2026-11-05T15:25:00.000Z";
const MANIFEST="data-collection/phase4/GATE5_G5A_WSSS_20261105_1400Z_FROZEN_SOURCE_GRID.json";
const FROM="2026-11-05T13:00:00.000Z",TO="2026-11-05T17:00:00.000Z";
const POSTS=["2026-11-05T15:40:00.000Z","2026-11-05T16:10:00.000Z",
 "2026-11-05T16:40:00.000Z"] as const;
const FINAL="2026-11-05T17:01:00.000Z";
const END="2026-11-05T18:00:00.000Z";
const SHA=/^[a-f0-9]{64}$/;
const GH=/^[a-f0-9]{40}$/;
const ms=(s:string)=>Date.parse(s);
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const sleep=(m:number)=>new Promise<void>(r=>setTimeout(r,m));
function hold(code:string):never{throw Error("P4_G5_G5A_POST_"+code+"_HOLD")}
function safe(e:unknown){
 const s=e instanceof Error?e.message:"";
 return /^P4_G5_G5A_POST_[A-Z0-9_]+_HOLD$/.test(s)?s:
  "P4_G5_G5A_POST_INTERNAL_FAILURE_NO_SOURCE_PRINTED_HOLD";
}
function object(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))hold("BAD_PROOF_JSON");
 return x as Record<string,unknown>;
}
export function postReservationUuidV39(manifestSha:string,slot:number){
 if(!SHA.test(manifestSha)||!Number.isInteger(slot)||slot<0||slot>2)
  hold("RESERVATION_DIGEST");
 const b=Buffer.from(hash("G5A-POST|"+manifestSha+"|"+slot).slice(0,32),"hex");
 b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
 const h=b.toString("hex");
 return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+
  h.slice(16,20)+"-"+h.slice(20,32);
}
function manifest(){
 const bytes=readFileSync(MANIFEST,"utf8");
 let doc:unknown;try{doc=JSON.parse(bytes)}catch{hold("FROZEN_JSON")}
 const d=object(doc),g=object(d.grid);
 if(bytes!==JSON.stringify(doc,null,2)+"\n"||
    d.cohortId!=="WSSS_G5A_20261105_1400Z"||
    g.airportIcao!=="WSSS"||
    g.serviceWindowStartUtc!=="2026-11-05T14:00:00.000Z"||
    g.serviceWindowEndUtc!=="2026-11-05T15:00:00.000Z"||
    g.projectRestApiUnitsBudget!==24||
    g.maxSourceQueries!==9||g.maxAttemptsPerQuery!==1)
  hold("FROZEN_GRID_CHANGED");
 return {sha:hash(bytes),cohortId:String(d.cohortId)};
}
export function isG5APostReviewedEventV39(e:NodeJS.ProcessEnv):boolean {
 return (e.GITHUB_EVENT_NAME==="schedule"&&
   !e.G5A_POST_MANUAL_INTENT&&
   G5A_POST_CRONS_V39.some(x=>x===e.G5A_POST_SCHEDULE))||
  (e.GITHUB_EVENT_NAME==="workflow_dispatch"&&
   e.G5A_POST_MANUAL_INTENT==="REVIEWED_NOV05_1400Z_POST_ONLY_WITHIN_PREARM"&&
   e.G5A_POST_SCHEDULE==="manual-reviewed");
}
/**
 * GH queues backup scheduled runs behind one physical owner. A duplicate
 * whose actual job does not start until after admission is forever UNKNOWN;
 * exit without DB, reservation or paid request, never infer a negative POST.
 * Manual fallback is not silently excused when late.
 */
export function isG5APostExpiredScheduledBackupV39(
 e:NodeJS.ProcessEnv,commit:string,at:number
):boolean {
 return Number.isFinite(at)&&at>=ms(PROOF_DEADLINE)&&at<ms(END)&&
  GH.test(commit)&&e.GITHUB_EVENT_NAME==="schedule"&&
  !e.G5A_POST_MANUAL_INTENT&&
  G5A_POST_CRONS_V39.some(x=>x===e.G5A_POST_SCHEDULE)&&
  e.GITHUB_ACTIONS==="true"&&e.GITHUB_REPOSITORY===REPO&&
  e.GITHUB_REF==="refs/heads/main"&&e.GITHUB_SHA===commit&&
  e.GITHUB_RUN_ATTEMPT==="1"&&
  e.GITHUB_JOB==="post-source"&&e.GITHUB_WORKFLOW===WF&&
  e.GITHUB_WORKFLOW_REF===REPO+"/"+PATH+"@refs/heads/main"&&
  e.G5A_POST_PAID_INTENT==="G5A_NOV05_1400Z_POST_THREE_2_UNIT_REQUESTS_MAX"&&
  e.ADB_AUTO_COLLECT==="0"&&e.V39_PHASE6_PROCESS_ARMED==="0";
}
export function assertG5APostRunnerContextV39(e:NodeJS.ProcessEnv,commit:string,at:number){
 if(!GH.test(commit)||!Number.isFinite(at)||
    e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||
    e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_SHA!==commit||
    !isG5APostReviewedEventV39(e)||e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_JOB!=="post-source"||e.GITHUB_WORKFLOW!==WF||
    e.GITHUB_WORKFLOW_REF!==REPO+"/"+PATH+"@refs/heads/main"||
     e.G5A_POST_PAID_INTENT!=="G5A_NOV05_1400Z_POST_THREE_2_UNIT_REQUESTS_MAX"||
    !/^\d{5,25}$/.test(e.GITHUB_RUN_ID??"")||
    !e.GITHUB_TOKEN||e.GITHUB_TOKEN.length<10||
    !e.AERODATABOX_API_KEY||e.AERODATABOX_API_KEY.length<10||
    !e.P4_G5_SOURCE_OWNER_DATABASE_URL||
    e.V39_DATABASE_RUNTIME_URL!==e.P4_G5_SOURCE_OWNER_DATABASE_URL||
    !!e.DATABASE_URL||!!e.GATE05_AUTOMATION_DATABASE_URL||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||
    at<ms("2026-11-05T13:30:00.000Z")||at>=ms(END))
  hold("GITHUB_CONTEXT_OR_SECRETS");
}
async function independentlyVerifyGithubRun(e:NodeJS.ProcessEnv,commit:string){
 const get=async(tail:string)=>{
  const res=await fetch("https://api.github.com/repos/"+REPO+tail,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(8500),
   headers:{Authorization:"Bearer "+e.GITHUB_TOKEN,
    "X-GitHub-Api-Version":"2022-11-28",
    Accept:"application/vnd.github+json",
    "User-Agent":"gate5-g5a-post-source"}
  });
  if(!res.ok)hold("LIVE_GITHUB_RUN_NOT_VERIFIED");
  return object(await res.json());
 };
 const id=e.GITHUB_RUN_ID!;
 const [run,jobs]=await Promise.all([
  get("/actions/runs/"+id),get("/actions/runs/"+id+"/jobs?per_page=100")
 ]);
 if(!Array.isArray(jobs.jobs))hold("GH_JOB_COUNT");
 const found=jobs.jobs.map(object).filter(x=>x.name==="post-source");
 if(found.length!==1)hold("GH_POST_JOB_MISSING");
 const job=found[0],start=ms(String(job.started_at)),current=Date.now();
 if(run.id!==Number(id)||run.head_sha!==commit||
    run.event!==e.GITHUB_EVENT_NAME||run.name!==WF||!isP4G5ReviewedMainWorkflowRestPathV39(run.path,PATH)||
    run.head_branch!=="main"||run.run_attempt!==1||
    run.status!=="in_progress"||run.conclusion!==null||
    object(run.repository).full_name!==REPO||
    job.run_id!==Number(id)||job.status!=="in_progress"||
    job.conclusion!==null||
    !Number.isFinite(start)||start>current||
    start>ms(PROOF_DEADLINE)||
    current>ms(PROOF_DEADLINE)||
    current-start>90*60000)
  hold("GH_POST_NOT_ACTUALLY_PREARMED");
 return {githubRunId:id,realStartedAt: new Date(start).toISOString()};
}
async function waitUntil(at:number){
 while(Date.now()<at)await sleep(Math.min(15000,Math.max(1,at-Date.now())));
}
export async function reserveG5APostSlotDbV39(db:pg.Client,manifestSha:string,cohortId:string,slot:number){
 const id=postReservationUuidV39(manifestSha,slot);
 const cycle="G5A_NOV05_1400Z_"+manifestSha.slice(0,32);
 const category="g5a_post_schedule_fids";
 let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  await db.query("SET LOCAL lock_timeout='2000ms'");
  const lock=await db.query("SELECT pg_try_advisory_xact_lock(76,98) AS ok");
  if(lock.rows[0]?.ok!==true)hold("CONCURRENT_POST_OWNER");
  const budget=await db.query(
   "SELECT reserved_units,project_unit_ceiling FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$1 AND cohort_id=$2 FOR UPDATE",
   [manifestSha,cohortId]);
  const b=budget.rows[0];
  if(budget.rows.length!==1||
     !Number.isSafeInteger(Number(b?.reserved_units))||
     Number(b?.project_unit_ceiling)!==24||
     Number(b.reserved_units)+2>24)
   hold("PROJECT_24_UNIT_BUDGET");
  const prior=await db.query(
   "SELECT reservation_id FROM clean.adb_rest_attempt_ledger "+
   "WHERE cycle_id=$1 AND category=$2",[cycle,category]);
  // Earlier POST slots may be genuinely UNOBSERVED (missed physical
  // deadline or missing balance). Accept only previously reserved *earlier*
  // fixed slots, never a duplicate, future or foreign reservation.
  const validPrior=POSTS.slice(0,slot).map((_,n)=>
   postReservationUuidV39(manifestSha,n));
  if(prior.rows.length>slot||prior.rows.some(x=>
     !validPrior.includes(String(x.reservation_id)))||
     new Set(prior.rows.map(x=>String(x.reservation_id))).size!==prior.rows.length)
   hold("POST_RESERVATION_REPLAY_OR_FOREIGN_SLOT");
  const changed=await db.query(
   "UPDATE clean.phase4_g5_fids_cohort_budget_v39 "+
   "SET reserved_units=reserved_units+2 "+
   "WHERE manifest_sha256=$1 AND reserved_units+2<=project_unit_ceiling "+
   "RETURNING reserved_units",
   [manifestSha]);
  if(changed.rows.length!==1||
     !Number.isSafeInteger(Number(changed.rows[0].reserved_units)))
   hold("POST_BUDGET_RACE_OR_UPDATE_DRIFT");
  const result=await db.query(
   "INSERT INTO clean.adb_rest_attempt_ledger "+
   "(reservation_id,cycle_id,category,units,attempt_number,reserved_at) "+
   "VALUES ($1,$2,$3,2,1,clock_timestamp()) RETURNING reservation_id",
   [id,cycle,category]);
  if(result.rows.length!==1||result.rows[0].reservation_id!==id)
   hold("POST_LEDGER_NOT_DURABLE");
  await db.query("COMMIT");tx=false;
  return id;
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }
}
/**
 * Verify the physical POST reservation inside the SAME transaction that
 * commits its original FIDS decoded body and normalized members.
 * Reserving before HTTP is necessary, but not sufficient: a standalone
 * source writer must not be able to attach an unledgered/foreign POST ID.
 * This code never issues a second provider request or reserves more units.
 */
export const G5A_POST_DB_CUSTODY_SQL_V39=
 "SELECT reservation_id::text AS reservation_id,cycle_id,category,"+
 "units,attempt_number,reserved_at FROM clean.adb_rest_attempt_ledger "+
 "WHERE reservation_id=$1::uuid";
export async function verifyG5APostSourceLedgerAtCommitV39(
 client:pg.PoolClient,manifestSha:string,slot:number,
 query:FidsQueryObservation,rows:PopulationRow[],
 facts:{durableAvailableAt:Date;normalizedInsertedRows:number}
):Promise<void>{
 const expected=postReservationUuidV39(manifestSha,slot);
 const cycle="G5A_NOV05_1400Z_"+manifestSha.slice(0,32);
 const raw=query.rawPayload as Record<string,unknown>|null;
 const stored=facts.durableAvailableAt instanceof Date?
  facts.durableAvailableAt.getTime():NaN;
 const retrieved=query.fidsRetrievalUtc?.getTime();
 if(!query||!raw||Array.isArray(raw)||
    raw.g5aPostReservationId!==expected||
    raw.originalDecodedEntityBodyPreserved!==true||
    query.queryDirection!=="Departure"||
    query.sourceAirportIcao!=="WSSS"||
    query.serviceWindowStartUtc?.toISOString()!==FROM||
    query.serviceWindowEndUtc?.toISOString()!==TO||
    query.fromLocal!=="2026-11-05T21:00"||
    query.toLocal!=="2026-11-06T01:00"||
    query.fidsProtocolVersion!=="G5A-POST-20261103-v1"||
    !Array.isArray(rows)||!Number.isSafeInteger(facts.normalizedInsertedRows)||
    facts.normalizedInsertedRows!==rows.length||
    rows.some(x=>x.batchId!==expected||
      x.populationQueryId!==query.populationQueryId||
      x.responseHash!==query.responseHash)||
    !Number.isFinite(retrieved)||!Number.isFinite(stored)||
    stored<retrieved)
  hold("POST_BOUND_SOURCE_FRAME_OR_ORIGINAL");
 const prior=await client.query(G5A_POST_DB_CUSTODY_SQL_V39,[expected]);
 const r=prior.rows[0];
 const reserved=r?.reserved_at instanceof Date?r.reserved_at.getTime():
  typeof r?.reserved_at==="string"?Date.parse(r.reserved_at):NaN;
 if(prior.rows.length!==1||String(r.reservation_id)!==expected||
    r.cycle_id!==cycle||r.category!=="g5a_post_schedule_fids"||
    Number(r.units)!==2||Number(r.attempt_number)!==1||
    !Number.isFinite(reserved)||reserved>retrieved||reserved>stored)
   hold("POST_LEDGER_NOT_COMMITTED_BEFORE_SOURCE");
}
export const G5A_POST_AGGREGATE_AUDIT_SQL_V39=`
SELECT pre.horizon,
 count(*)::int AS expected_pre,
 count(baseline.dep_scheduled_utc)::int AS baseline_sourced,
 count(post.dep_scheduled_utc)::int AS post_observed,
 count(*) FILTER(WHERE baseline.dep_scheduled_utc IS NOT NULL
    AND post.dep_scheduled_utc IS NOT NULL
    AND abs(extract(epoch from
      (post.dep_scheduled_utc-baseline.dep_scheduled_utc))/60)>=15)::int AS revision_ge15,
 count(*) FILTER(WHERE baseline.dep_scheduled_utc IS NOT NULL
    AND post.dep_scheduled_utc IS NOT NULL
    AND abs(extract(epoch from
      (post.dep_scheduled_utc-baseline.dep_scheduled_utc))/60)<15)::int AS revision_lt15
FROM (
 SELECT flight_instance_id,horizon,prediction_cutoff_utc,
  selected_t_milestone_utc,population_query_id
 FROM clean.flight_snapshots
 WHERE frame_hash=$1 AND prediction_state='PRE_DEPARTURE'
  AND selected_t_milestone_utc IS NOT NULL
  AND flight_instance_id LIKE 'leg:g5a:%'
) pre
LEFT JOIN LATERAL(
 SELECT p.dep_scheduled_utc
 FROM clean.flight_population p
 WHERE p.analytic_identity_id=pre.flight_instance_id
  AND p.population_query_id::text=pre.population_query_id
  AND p.fids_protocol_version='G5A-20261103-v1'
  AND p.available_at<=pre.prediction_cutoff_utc
  AND p.dep_scheduled_utc IS NOT NULL
 ORDER BY p.available_at DESC,p.id DESC LIMIT 1
) baseline ON TRUE
LEFT JOIN LATERAL(
 SELECT p.dep_scheduled_utc
 FROM clean.flight_population p
 JOIN clean.fids_query_response q
  ON q.population_query_id=p.population_query_id
 WHERE p.analytic_identity_id=pre.flight_instance_id
  AND p.fids_protocol_version='G5A-POST-20261103-v1'
  AND p.batch_id=ANY($2::text[])
  AND q.raw_payload->>'g5aPostReservationId'=p.batch_id
  AND p.available_at>pre.prediction_cutoff_utc
  AND p.available_at<=pre.selected_t_milestone_utc+INTERVAL '2 hours'
  AND p.dep_scheduled_utc IS NOT NULL
  AND p.population_role='requested_airport_primary'
  AND p.scope_classification IN ('confirmed_core','unknown')
  AND p.codeshare_resolution_status='confirmed_operating_leg'
 ORDER BY p.available_at DESC,p.id DESC LIMIT 1
) post ON TRUE
GROUP BY pre.horizon ORDER BY pre.horizon`;
async function readAgg(db:pg.Client,manifestSha:string,ids:string[]){
 let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  const r=await db.query(G5A_POST_AGGREGATE_AUDIT_SQL_V39,[manifestSha,ids]);
  await db.query("ROLLBACK");tx=false;
  return r.rows.map(x=>{
   const expected=Number(x.expected_pre),base=Number(x.baseline_sourced);
   const observed=Number(x.post_observed);
   const positive=Number(x.revision_ge15),negative=Number(x.revision_lt15);
   if(![expected,base,observed,positive,negative].every(n=>
      Number.isSafeInteger(n)&&n>=0)||positive+negative>observed||
      observed>expected||base>expected)
    hold("AGGREGATE_NUMERATOR_DENOMINATOR_INVALID");
   return {
    horizon:String(x.horizon),persistedPRE:expected,asofBaseline:base,
    observedPOST:observed,
    observedRevisionGE15Minutes:positive,
    observedRevisionLT15Minutes:negative,
    unknownNoQualifiedPOSTOrPREBaseline:expected-positive-negative,
    actualWheelsOffClaim:false
   };
  });
 }finally{if(tx)await db.query("ROLLBACK").catch(()=>undefined)}
}
export async function main(){
 const e=process.env,head=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8",timeout:4000}).trim();
 const started=Date.now();
 if(isG5APostExpiredScheduledBackupV39(e,head,started)){
  console.log(JSON.stringify({
   status:"G5A_POST_GITHUB_SCHEDULE_BACKUP_TOO_LATE_UNOBSERVED",
   githubRunId:e.GITHUB_RUN_ID,sourceContentRead:false,
   providerCalls:0,databaseWrites:0,
   missingPostNotClassifiedNegative:true,
   scientificGate5Passed:false,phase5FreezeAuthorized:false
  }));
  return;
 }
 assertG5APostRunnerContextV39(e,head,started);
 const {sha:manifestSha,cohortId}=manifest();
 const proof=await independentlyVerifyGithubRun(e,head);
 const db=new pg.Client({connectionString:e.P4_G5_SOURCE_OWNER_DATABASE_URL,
  connectionTimeoutMillis:9000,query_timeout:15000,
  application_name:"g5a_real_post_source_reservation"});
 await db.connect();
 const ids=POSTS.map((_,i)=>postReservationUuidV39(manifestSha,i));
 let charged=0,originals=0,unknown=0,normalized=0;
 try{
  // No new paid POST on an entire missing T24 original+PRE precursor.
  const prior=await db.query(G5A_PRIOR_T24_PROVENANCE_SQL_V39,[manifestSha]);
  const priorEvidence=assessG5AT24PreconditionV39(prior.rows);
  if(!priorEvidence.allowPaidContinuation){
   console.log(JSON.stringify({
    status:"G5A_POST_SKIPPED_MISSING_T24_SOURCE_OR_PRE_NO_PROVIDER",
    verifiedT24OriginalBindings:priorEvidence.originals,
    verifiedT24OnTimePRE:priorEvidence.pre,
    postPaidReservationsCreated:0,providerCalls:0,
    completeThreeHorizonScience:false,scientificGate5Passed:false
   }));
   return;
  }
  for(const [i,planned] of POSTS.entries()){
   await waitUntil(ms(planned));
   if(Date.now()>ms(planned)+10*60000){unknown++;continue}
   let quota:{apiUnitsRemaining:number;requestsRemaining:number;
     observedAtUtc:string};
   try{quota=(await getBalanceEvidenceStrict()).quota}
   catch{unknown++;continue}
   if(Date.now()-ms(quota.observedAtUtc)>30000||
      quota.apiUnitsRemaining<2||quota.requestsRemaining<1){
    unknown++;continue;
   }
   const id=await reserveG5APostSlotDbV39(db,manifestSha,cohortId,i);
   charged++;
   let callback=0;
   const q:FidsCensusParams={
    airportIcao:"WSSS",fromLocal:"2026-11-05T21:00",
    toLocal:"2026-11-06T01:00",ianaTimezone:"Asia/Singapore",
    serviceWindowStartUtc:new Date(FROM),
    serviceWindowEndUtc:new Date(TO),cutoffUtc:new Date(planned),
    withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,
    direction:"Departure",restCategory:"outcome",
    // The Plan f.8 §5.1 verified OpenAPI DOC BYTES pin is v1.15.3.0.
    // A G5A protocol text SHA is NOT an AeroDataBox OpenAPI document SHA.
    // Do not conflate frozen docs or live server schema version.
    providerApiVersion:"RapidAPI-doc-pin-1.15.3.0-not-live-schema-certified",
    fidsProtocolVersion:"G5A-POST-20261103-v1",
    openapiSha256:"735620f2d2132c5bf51768f50caa767b7f0b25be8b128679641402666696890a",
    g5aObservedScheduleProtocol:true,g5aPostReservationId:id,batchId:id
   };
   try{
    const res=await fetchFidsPopulation(q,{
     fetchAirport:async(icao,from,to,opts)=>fetchFidsAirport(icao,from,to,{
      ...opts,budgetOwner:{async reserve(_category,units,attempt){
       if(callback!==0||units!==2||attempt!==1)
        throw Error("G5A_POST_REPEAT_PAID_GET_FORBIDDEN");
       callback++;return id;
      }}
     }),
     persist:async(query:FidsQueryObservation,rows:PopulationRow[])=>{
      const raw=query.rawPayload as Record<string,unknown>;
      if(raw?.g5aPostReservationId!==id||
         raw?.originalDecodedEntityBodyPreserved!==true)
       hold("POST_SOURCE_ORIGINAL_NOT_AUTHENTICATED");
      return persistFidsObservation(query,rows,async(client,facts)=>{
       await verifyG5APostSourceLedgerAtCommitV39(
        client,manifestSha,i,query,rows,facts);
      });
     }
    });
    if(!res||callback!==1){unknown++;continue}
    originals++;normalized+=res.persistedPopulationRows;
    console.log(JSON.stringify({
     status:"G5A_POST_ORIGINAL_SOURCE_PERSISTED",
     slot:i,reservationCommittedBeforeGET:true,
     populationRows:res.persistedPopulationRows,
     sourceQueryIdPrinted:false,sourceContentPrinted:false,
     providerUnitsReservedCumulative:charged*2,
     actualDepartureDelayClaimed:false
    }));
   }catch(ex){
    unknown++;
    console.error(JSON.stringify({
     status:"G5A_POST_RESERVED_SLOT_OUTCOME_UNKNOWN",
     slot:i,error:safe(ex),noRepeatedPaidGET:true
    }));
   }
  }
  await waitUntil(ms(FINAL));
  const agg=await readAgg(db,manifestSha,ids);
  console.log(JSON.stringify({
   status:"G5A_POST_FROZEN_WATERMARK_AGGREGATE_OBSERVED_NOT_GATE5_VERDICT",
   mainSha:head,githubRunId:proof.githubRunId,
   verifiedJobStartedAtUtc:proof.realStartedAt,
   frozenManifestSha256:manifestSha,
   postSlotsPlanned:3,paidReservations:charged,
   providerRestUnitsReserved:charged*2,
   originalPostReceipts:originals,normalizedPostRows:normalized,
   unknownSourceSlots:unknown,watermarkRule:"T_NATIVE_SCHEDULE_PLUS_2H",
   outcomeKind:"PROVIDER_REPORTED_SCHEDULE_REVISION_NOT_ACTUAL_DEPARTURE",
   labelCountsByHorizon:agg,
   missingPostObservationsAreNotNegative:true,
   independentReadOnlyAuditStillRequired:true,
   strictGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
 }finally{await db.end().catch(()=>undefined)}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_prospective_post_schedule_observation.ts"))
 void main().catch(e=>{
  console.error(JSON.stringify({status:"G5A_GITHUB_POST_OWNER_HOLD",
   reason:safe(e),providerContentPrinted:false,
   strictGate5Passed:false,phase6Authorized:false}));
  process.exitCode=2;
 });
