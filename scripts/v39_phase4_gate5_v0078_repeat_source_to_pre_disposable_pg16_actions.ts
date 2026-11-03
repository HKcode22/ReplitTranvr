/**
 * Phase 4 Gate5 real disposable PostgreSQL 16 pipeline: V0076 owner +
 * 3 synthetic FIDS originals normalized and V0077 bound (one commit each) ->
 * actual single-horizon PRE insert in own before-cutoff transaction ->
 * independent read-only per-horizon PRE source readback.
 *
 * No paid provider, credentials, production roles, real native T certificate
 * or legal source-use authorization. The proof flags below remain FALSE.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {
 fetchFidsPopulation,utcIntervalToLocal
} from "../server/lib/disruption/fidsCensus_v3";
import {getV39Pool} from "../server/lib/disruption/db_v39";
import {persistP4G5BoundFidsDbOnlyV39} from
 "../server/lib/disruption/phase4Gate5AtomicBoundSourceV39";
import {persistP4G5ReviewedPreForCohortV39} from
 "../server/lib/disruption/phase4Gate5ScopedPreWriter_v39";
import {auditP4G5HorizonPreexpiryV39} from
 "../server/lib/disruption/phase4Gate5HorizonPreexpiryReadOnly_v39";

const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const hex=(x:string)=>x.repeat(64);
const iso=(ms:number)=>new Date(ms).toISOString();
function context(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
   !["pull_request","push"].includes(e.GITHUB_EVENT_NAME??"")||
   e.GITHUB_RUN_ATTEMPT!=="1"||
   e.GITHUB_WORKFLOW!=="Phase4 Gate5 V0078 Repeat FIDS Disposable PG16"||
   e.GITHUB_JOB!=="v0078-repeat-disposable-pg16"||
   e.DATABASE_URL!==URL||e.V39_DATABASE_RUNTIME_URL!==URL||
   !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
   !!e.GATE05_AUTOMATION_DATABASE_URL)
  throw Error("P4_G5_SOURCE_PRE_DISPOSABLE_CONTEXT_HOLD");
}
let lastSyntheticStage="START";
export async function main(){
 context();
 // Pick a future UTC minute boundary with enough real lead for source and
 // PRE commits. The independent audit must run AFTER cutoff, never pretending
 // a before-cutoff read has already observed a due flight.
 const base=Math.ceil(Date.now()/60000)*60000+60000;
 const serviceStart=base+24*3600000-60000;
 const serviceEnd=serviceStart+3600000;
 const firstScheduledT=serviceStart+60000;
 const cutoff=firstScheduledT-24*3600000;
 const manifest=hex("a"),owner=hex("b"),reviewed=hex("c");
 const rights=hex("d"),runId="1234567890123";
 const queryDigests=[hex("1"),hex("2"),hex("3")];
 const reservations=queryDigests.map(q=>sha([
  manifest,owner,q,"1"].join("|")));
 const local=utcIntervalToLocal(new Date(serviceStart),
  new Date(serviceEnd),"Asia/Singapore");
 const sql=new pg.Client({connectionString:URL,
  application_name:"p4_gate5_source_pre_disposable",
  connectionTimeoutMillis:8000,query_timeout:15000});
 await sql.connect();
 try{
  lastSyntheticStage="SEED_V0076_OWNER";
  await sql.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  await sql.query(
   "INSERT INTO clean.phase4_g5_fids_cohort_budget_v39("+
   "manifest_sha256,cohort_id,project_unit_ceiling,reserved_units) "+
   "VALUES($1,'WSSS_SOURCE_PRE_SYNTHETIC_ONLY',18,6)",[manifest]);
  await sql.query(
   "INSERT INTO clean.phase4_g5_fids_physical_owner_v39("+
   "owner_digest,manifest_sha256,horizon,github_run_id,"+
   "reviewed_authorization_sha256,actual_github_runner_started_at_utc,"+
   "verified_prearm_deadline_utc,first_planned_dispatch_utc,"+
   "last_planned_dispatch_utc,hard_owner_expires_at_utc,state) "+
   "VALUES($1,$2,'T-24h',$3,$4,$5,$6,$7,$8,$9,'ACTIVE')",
   [owner,manifest,runId,reviewed,iso(base-100*60000),
    iso(base-70*60000),iso(base-40*60000),
    iso(base-30*60000),iso(base+30*60000)]);
  for(let i=0;i<3;i++){
   const planned=base-(40-5*i)*60000;
   await sql.query(
    "INSERT INTO clean.phase4_g5_fids_allowed_query_v39("+
    "query_digest,owner_digest,query_index,planned_dispatch_utc,"+
    "hard_latest_dispatch_utc,prediction_cutoff_utc,"+
    "max_physical_attempts,last_reserved_attempt) "+
    "VALUES($1,$2,$3,$4,$5,$6,1,1)",
    [queryDigests[i],owner,i,iso(planned),iso(planned+2*60000),
     iso(cutoff)]);
   await sql.query(
    "INSERT INTO clean.phase4_g5_fids_physical_attempt_v39("+
    "expected_reservation_sha256,owner_digest,query_digest,github_run_id,"+
    "physical_attempt_number,charged_reserved_units,committed_at_utc) "+
    "VALUES($1,$2,$3,$4,1,2,$5)",
    [reservations[i],owner,queryDigests[i],runId,
     iso(planned+60000)]);
  }
  await sql.query("COMMIT");

  const fids={
   departures:[{
    id:"synthetic-same-physical-flight",
    number:"SQ 123",codeshareStatus:"IsOperator",
    isCargo:false,isPrivate:false,isCharter:false,
    departure:{airport:{icao:"WSSS",iata:"SIN"},
     scheduledTime:{utc:iso(firstScheduledT)}},
    arrival:{airport:{icao:"YSSY",iata:"SYD"},
     scheduledTime:{utc:iso(firstScheduledT+8*3600000)}}
   }],arrivals:[]
  };
  // Each source slot observes one DIFFERENT physical operating flight.
  // Repeated provider-id/same-cutoff observations hit a pre-existing
  // flight_population_key conflict: tracked as a separate schema blocker,
  // never represented as PASS by this distinct-leg fixture.
  const params={
   airportIcao:"WSSS",fromLocal:local.fromLocal,toLocal:local.toLocal,
   ianaTimezone:"Asia/Singapore",withCancelled:true,withCodeshared:true,
   withCargo:false,withPrivate:false,direction:"Departure" as const,
   serviceWindowStartUtc:new Date(serviceStart),
   serviceWindowEndUtc:new Date(serviceEnd),
   cutoffUtc:new Date(cutoff),providerApiVersion:"1.15.4.0",
   fidsProtocolVersion:"v3.9-f.8",openapiSha256:hex("f"),
   restCategory:"validation" as const
  };
  const sourceUseExpiresAtUtc=iso(base+20*3600000);
  for(let i=0;i<3;i++){
   lastSyntheticStage="ORIGINAL_FIDS_SLOT_"+i;
   // The SAME provider record is observed via three distinct, genuine
   // synthetic original-query IDs, without fabricating flight identities.
   const record=fids;
   const bytes=Buffer.from(JSON.stringify(record));
   const original={
    representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE" as const,
    sha256:sha(bytes.toString("utf8")),byteLength:bytes.length,
    base64:bytes.toString("base64")
   };
   const fakeFetch=async()=>({...record,originalDecodedBody:original}) as any;
   const binding={
    manifestSha256:manifest,horizon:"T-24h" as const,
    expectedOwnerGithubRunId:runId,
    reviewedRunAuthorizationSha256:reviewed,
    queryDigest:queryDigests[i],expectedReservationSha256:reservations[i],
    rightsReviewArtifactSha256:rights,sourceUseExpiresAtUtc,
    expectedAirportIcao:"WSSS",
    expectedServiceStartUtc:iso(serviceStart),
    expectedServiceEndUtc:iso(serviceEnd),
    expectedFromLocal:local.fromLocal,expectedToLocal:local.toLocal
   };
   const result=await fetchFidsPopulation(params,{
    fetchAirport:fakeFetch,
    persist:async(q,rows)=>{
     const saved=await persistP4G5BoundFidsDbOnlyV39(q,rows,binding);
     if(!saved.originalBound||saved.normalizedRowsInserted!==1)
      throw Error("P4_G5_SOURCE_PRE_DISPOSABLE_ATOMIC_SOURCE_MISSING");
     return saved.normalizedRowsInserted;
    }
   });
   if(!result||result.persistedPopulationRows!==1)
    throw Error("P4_G5_SOURCE_PRE_DISPOSABLE_NORMALIZATION_HOLD");
  }
  const scope={
   airportIcao:"WSSS",serviceStartUtc:iso(serviceStart),
   serviceEndUtc:iso(serviceEnd),observedAtUtc:new Date().toISOString(),
   reviewedFrozenManifestSha256:manifest,
   horizon:"T-24h" as const,
   expectedOwnerGithubRunId:runId
  };
  // The reviewed:true flags below are valid only as a synthetic contract
  // fixture. This rehearsal CANNOT certify real provider semantics/rights.
  const permit={
   exactCohortManifestSha256:manifest,
   independentSelectedTSourceEvidenceSha256:hex("e"),
   independentPhysicalOperatingIdentityEvidenceSha256:hex("6"),
   independentlyReviewedSourceRetentionEvidenceSha256:rights,
   reviewedRunAuthorizationSha256:reviewed,
   frozenBuilderSourceSha256:hex("7"),
   builderFrozenAtUtc:iso(base-24*3600000),
   verifiedExternalSourceAndRightsReview:true as const,
   selectedTConfig:{
    milestone:"departure.scheduledTime.utc",
    version:"SYNTHETIC_CONTRACT_ONLY_NOT_PROVIDER_CERTIFIED",
    artifactHash:hex("8"),semanticsEvidenceSha256:hex("e"),
    verifiedProviderNativeSchedule:true as const
   }
  };
  lastSyntheticStage="PRE_WRITER";
  const wrote=await persistP4G5ReviewedPreForCohortV39(sql,scope,permit);
  if(wrote.horizon!=="T-24h"||
     wrote.newlyPersistedRows!==1||wrote.expectedSourceQualifiedRows!==1||
     wrote.otherHorizonsUntouched!==true||
     wrote.strictGate5Passed!==false)
   throw Error("P4_G5_SOURCE_PRE_DISPOSABLE_WRITER_DID_NOT_INSERT_ON_TIME");
  lastSyntheticStage="ACTUAL_CUTOFF_WAIT";
  // The PRE was genuinely committed while C was still in the future.
  // Wait for wall-clock C before measuring it in the independent auditor.
  // Never submit a future claimed read timestamp or retrospectively backfill.
  const remaining=cutoff-Date.now()+1500;
  if(remaining>0)await new Promise<void>(resolve=>setTimeout(resolve,remaining));
  if(Date.now()<cutoff)throw Error("P4_G5_SOURCE_PRE_AUDIT_BEFORE_ACTUAL_CUTOFF_HOLD");
  lastSyntheticStage="READONLY_AUDIT";
  const review=new pg.Client({connectionString:URL,
   application_name:"p4_gate5_source_pre_independent_readonly",
   connectionTimeoutMillis:8000,query_timeout:15000,
   options:"-c default_transaction_read_only=on"});
  await review.connect();
  try{
   await review.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   const result=await auditP4G5HorizonPreexpiryV39(review,{
    airportIcao:"WSSS",serviceStartUtc:iso(serviceStart),
    serviceEndUtc:iso(serviceEnd),reviewedManifestSha256:manifest,
    horizon:"T-24h",expectedOwnerGithubRunId:runId,
    readAtUtc:new Date().toISOString()
   });
   if(result.status!=="V0077_BOUND_THREE_ORIGINALS_PREEXPIRY_CANDIDATE_ONLY"||
      result.observedBoundOriginals!==3||
      result.eligibleCutoffCandidates!==1||
      result.prePresent!==1||
      result.missingPreCandidateCount!==0||
      result.candidatePreCompleteness!==1||
      result.scientificGate5Passed!==false){
    console.error(JSON.stringify({
     schema:"synthetic-disposable-only-anonymous-audit-counters",
     status:result.status,
     observedBoundOriginals:result.observedBoundOriginals,
     distinctQuerySlots:result.distinctQuerySlots,
     eligibleCutoffCandidates:result.eligibleCutoffCandidates,
     prePresent:result.prePresent,
     missingPreCandidateCount:result.missingPreCandidateCount,
     candidatePreCompleteness:result.candidatePreCompleteness,
     invalidOrPosthocPRE:result.invalidOrPosthocPRE,
     extraOrWrongPre:result.extraOrWrongPre,
     notYetDue:result.notYetDue,
     lateOriginalForCutoff:result.lateOriginalForCutoff
    }));
    throw Error("P4_G5_SOURCE_PRE_DISPOSABLE_AUDIT_NOT_INDEPENDENTLY_RECONCILED");
   }
   await review.query("ROLLBACK");
  }finally{await review.end().catch(()=>undefined);}
  // Prove original non-FIDS composite uniqueness remains enforced.
  // The outer rollback leaves no fixture legacy records in the CI database.
  lastSyntheticStage="LEGACY_NONFIDS_UNIQUENESS";
  await sql.query("BEGIN");
  try{
   const values=["WSSS",new Date(serviceStart),new Date(serviceEnd),
    new Date(cutoff),"legacy_v0078_fixture","SQ999","SQ",
    "legacy-synthetic-provider-record"];
   const ins="INSERT INTO clean.flight_population "+
    "(source_airport_icao,window_start_utc,window_end_utc,cutoff_utc,"+
    "source_type,flight_number,carrier_iata,provider_record_key) "+
    "VALUES($1,$2,$3,$4,$5,$6,$7,$8)";
   await sql.query(ins,values);
   await sql.query("SAVEPOINT v0078_one_legacy_record");
   let refused=false;
   try{
    await sql.query(ins,values);
   }catch(e:any){
    if(e?.code!=="23505"||
       e?.constraint!=="flight_population_legacy_nonfids_key_v39")
     throw Error("P4_G5_V0078_WRONG_LEGACY_UNIQUENESS_REFUSAL");
    refused=true;
   }
   await sql.query("ROLLBACK TO SAVEPOINT v0078_one_legacy_record");
   if(!refused)throw Error("P4_G5_V0078_LEGACY_NONFIDS_DUPLICATE_ADMITTED_HOLD");
  }finally{
   await sql.query("ROLLBACK").catch(()=>undefined);
  }
  console.log(JSON.stringify({
   status:"P4_G5_V0078_REPEAT_FIDS_ORIGINALS_TO_REAL_PRE_PG16_PASS",
   originalReceipts:3,sourceHorizon:"T-24h",timelyPreRows:1,
   threeOriginalsSameProviderRecordAndCutoff:true,
   repeatedProviderIdAtSameCutoffSchemaSupportProven:true,
   onePhysicalOperatingLegDeduplicated:true,
   sourceAndPreDifferentCommittedTransactions:true,
   independentlyReadback:true,providerCalls:0,productionDatabaseWrites:0,
   realSourceLicenseVerified:false,realFirstNativeTVerified:false,
   realPhysicalOperatingLegVerified:false,
   realPostOrAirborneMeasured:false,strictGate5Passed:false,
   phase5FreezeAuthorized:false,phase6Authorized:false
  }));
 }finally{
  await sql.end().catch(()=>undefined);
  await getV39Pool().end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0078_repeat_source_to_pre_disposable_pg16_actions.ts"))
 void main().catch((error:unknown)=>{
  const e=error as {message?:unknown;code?:unknown;constraint?:unknown};
  const reason=typeof e?.message==="string"?e.message:"UNCLASSIFIED_ERROR";
  const safe=/^(?:P4_G5_|FIDS_|PRE_|invalid FIDS|duplicate key|Cannot |relation |column |operator )/.test(reason)?
   reason.slice(0,180):"UNCLASSIFIED_REFUSAL";
  console.error(JSON.stringify({
   status:"P4_G5_V0078_REPEAT_SOURCE_TO_PRE_DISPOSABLE_HOLD",
   stage:lastSyntheticStage,reason:safe,
   pgCode:typeof e?.code==="string"?e.code:null,
   constraint:typeof e?.constraint==="string"?e.constraint:null,
   realProviderCalls:0
  }));
  process.exitCode=2;
 });
