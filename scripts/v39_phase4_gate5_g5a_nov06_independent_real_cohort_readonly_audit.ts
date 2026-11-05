/**
 * Independent G5A Gate5 real cohort audit — READ ONLY, no provider request.
 *
 * GitHub Sat Nov6 05:12/05:18/05:24/05:30Z (Fri 21:12/21:18/21:24/21:30 PST),
 * all after frozen W=T_native+2h for Nov6 02:00–03:00Z WSSS departures.
 *
 * Factual, privacy-preserving counts only. Does not read or emit raw FIDS
 * Content, flight IDs, credentials, or user data. Does NOT declare science PASS.
 * Requires a separate independent audit reader, not the new source writer.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import pg from "pg";
import {
 G5A_POST_AGGREGATE_AUDIT_SQL_V39,
 postReservationUuidV39
} from "./v39_phase4_gate5_g5a_nov06_prospective_post_schedule_observation";

export const G5A_INDEPENDENT_AUDIT_SCHEMA_V39=
 "v39.phase4.g5a-independent-real-source-pre-post-counts.v1" as const;
const REPO="HKcode22/ReplitTranvr";
const WF="Phase4 Gate5 G5A Nov6 Independent Cohort Audit (No Provider)";
const PATH=".github/workflows/phase4-gate5-g5a-nov06-independent-final-audit.yml";
export const G5A_INDEPENDENT_AUDIT_CRONS_V39=[
 "12 12 6 11 *","18 12 6 11 *","24 12 6 11 *","30 12 6 11 *"
] as const;
const GRID="data-collection/phase4/GATE5_G5A_WSSS_20261106_0900Z_FROZEN_SOURCE_GRID.json";
const START=Date.parse("2026-11-06T12:10:00.000Z");
const END=Date.parse("2026-11-06T16:00:00.000Z");
const SHA=/^[a-f0-9]{40}$/;
function hold(code:string):never{throw Error("P4_G5_G5A_INDEPENDENT_"+code+"_HOLD")}
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
function count(v:unknown){
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<0)hold("NONFINITE_AGGREGATE_COUNT");
 return n;
}
export function requireG5AIndependentAuditContextV39(
 e:NodeJS.ProcessEnv,head:string,at:number
){
 if(!SHA.test(head)||!Number.isFinite(at)||at<START||at>=END||
  e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||
  e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_SHA!==head||
  e.GITHUB_RUN_ATTEMPT!=="1"||
  !["schedule","workflow_dispatch"].includes(e.GITHUB_EVENT_NAME??"")||
  e.GITHUB_WORKFLOW!==WF||
  e.GITHUB_WORKFLOW_REF!==REPO+"/"+PATH+"@refs/heads/main"||
  e.GITHUB_JOB!=="audit-independent"||
  (e.GITHUB_EVENT_NAME==="schedule"&&
   !G5A_INDEPENDENT_AUDIT_CRONS_V39.some(x=>x===e.GITHUB_EVENT_SCHEDULE))||
  !e.P4_G5_G5A_NOV07_AUDIT_DATABASE_URL||
  !!e.GATE05_AUTOMATION_DATABASE_URL||
  !!e.DATABASE_URL||!!e.V39_DATABASE_RUNTIME_URL||
  !!e.P4_G5_SOURCE_OWNER_DATABASE_URL||
  !!e.AERODATABOX_API_KEY||e.ADB_AUTO_COLLECT!=="0"||
  e.V39_PHASE6_PROCESS_ARMED!=="0")
  hold("GITHUB_READER_DATE_OR_ISOLATION");
}
export const G5A_SOURCE_AUDIT_SQL_V39=[
 "SELECT o.horizon,",
 "count(DISTINCT q.query_digest)::int planned_slots,",
 "count(DISTINCT a.query_digest)::int irrevocably_reserved_slots,",
 "count(DISTINCT b.population_query_id)::int exact_original_bound_slots,",
 "count(DISTINCT b.population_query_id) FILTER (WHERE",
 "s.available_at<=q.prediction_cutoff_utc",
 "AND b.original_response_sha256=s.response_hash",
 "AND s.raw_expired_at_utc IS NULL)::int bound_source_on_time_at_audit,",
 "count(DISTINCT b.population_query_id) FILTER (WHERE",
 "b.source_use_expires_at_utc<=clock_timestamp())::int",
 "original_use_lifetime_elapsed",
 "FROM clean.phase4_g5_fids_physical_owner_v39 o",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 q",
 "ON q.owner_digest=o.owner_digest",
 "LEFT JOIN clean.phase4_g5_fids_physical_attempt_v39 a",
 "ON a.query_digest=q.query_digest",
 "LEFT JOIN clean.phase4_g5_fids_original_binding_v39 b",
 "ON b.expected_reservation_sha256=a.expected_reservation_sha256",
 "AND b.manifest_sha256=o.manifest_sha256",
 "LEFT JOIN clean.fids_query_response s",
 "ON s.population_query_id=b.population_query_id",
 "WHERE o.manifest_sha256=$1",
 "GROUP BY o.horizon ORDER BY o.horizon"
].join(" ");
export const G5A_PRE_AUDIT_SQL_V39=[
 "SELECT s.horizon,count(*)::int as persisted_pre,",
 "count(DISTINCT s.flight_instance_id)::int unique_physical_pre,",
 "count(*) FILTER(WHERE s.created_at<=s.prediction_cutoff_utc)::int",
 "source_qualified_pre_written_before_cutoff,",
 "count(*) FILTER(WHERE s.created_at>s.prediction_cutoff_utc)::int",
 "late_pre_written_should_be_zero,",
 "count(*) FILTER(WHERE s.fids_response_hash IS NULL)::int",
 "missing_pre_source_hash,",
 "count(*) FILTER(WHERE s.prediction_state<>'PRE_DEPARTURE')::int",
 "not_true_pre,",
 "count(*) FILTER(WHERE s.selected_t_version IS NULL)::int",
 "native_t_version_unknown",
 "FROM clean.flight_snapshots s WHERE s.frame_hash=$1",
 "AND s.horizon IN ('T-24h','T-6h','T-90m')",
 "GROUP BY s.horizon ORDER BY s.horizon"
].join(" ");
export const G5A_POPULATION_AUDIT_SQL_V39=[
 "SELECT count(*)::int population_rows,",
 "count(DISTINCT p.analytic_identity_id) FILTER (WHERE",
 "p.codeshare_resolution_status='confirmed_operating_leg'",
 "AND p.population_role='requested_airport_primary'",
 "AND p.scope_classification='confirmed_core')::int",
 "distinct_source_confirmed_operating_leg_ids,",
 "count(DISTINCT p.analytic_identity_id) FILTER (WHERE",
 "p.codeshare_resolution_status='confirmed_operating_leg'",
 "AND p.population_role='requested_airport_primary'",
 "AND p.scope_classification='unknown')::int",
 "conditional_query_filtered_scope_unknown_ids,",
 "count(*) FILTER(WHERE p.codeshare_resolution_status<>",
 "'confirmed_operating_leg')::int ambiguous_or_codeshared_rows",
 "FROM clean.flight_population p",
 "JOIN clean.phase4_g5_fids_original_binding_v39 b",
 "ON b.population_query_id=p.population_query_id",
 "WHERE b.manifest_sha256=$1"
].join(" ");
export async function main(){
 const e=process.env;
 const head=execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",timeout:4000}).trim();
 requireG5AIndependentAuditContextV39(e,head,Date.now());
 const bytes=readFileSync(GRID,"utf8"),manifest=JSON.parse(bytes) as Record<string,unknown>;
 if(manifest.cohortId!=="WSSS_G5A_20261106_0900Z"||
    bytes!==JSON.stringify(manifest,null,2)+"\n")
  hold("MANIFEST_CHANGED_OR_UNREVIEWED");
 const hash=sha(bytes);
 const ids=[0,1,2].map(i=>postReservationUuidV39(hash,i));
 const db=new pg.Client({connectionString:e.P4_G5_G5A_NOV07_AUDIT_DATABASE_URL,
  connectionTimeoutMillis:9000,query_timeout:16000,
  application_name:"g5a_independent_readonly_counts"});
 await db.connect();
 let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await db.query("SET LOCAL statement_timeout='15000ms'");
  const independent=await db.query(
   "SELECT current_user AS role,"+
   "current_setting('transaction_read_only')='on' AS readonly,"+
   "(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls "+
   "FROM pg_roles WHERE rolname=current_user) AS elevated,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS schema_ddl,"+
   "has_database_privilege(current_user,current_database(),'CREATE') AS db_ddl");
  const r=independent.rows[0];
  if(independent.rows.length!==1||
     r.role!=="p4_g5_g5a_nov07_readonly_20261105"||
     r.readonly!==true||r.elevated!==false||
     r.schema_ddl!==false||r.db_ddl!==false)
   hold("INDEPENDENT_READER_NOT_LEAST_PRIVILEGED");
  const tables=await db.query(G5A_SOURCE_AUDIT_SQL_V39,[hash]);
  const snapshots=await db.query(G5A_PRE_AUDIT_SQL_V39,[hash]);
  const pop=await db.query(G5A_POPULATION_AUDIT_SQL_V39,[hash]);
  const post=await db.query(G5A_POST_AGGREGATE_AUDIT_SQL_V39,[hash,ids]);
  const budget=await db.query(
   "SELECT cohort_id,reserved_units,project_unit_ceiling "+
   "FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$1",[hash]);
  if(budget.rows.length>1)hold("CONFLICTING_BUDGET");
  const source=tables.rows.map(r=>({
   horizon:String(r.horizon),
   plannedSourceSlots:count(r.planned_slots),
   actualCommittedPhysicalReservations:count(r.irrevocably_reserved_slots),
   originalBoundSlots:count(r.exact_original_bound_slots),
   sourceBoundAndOnTimeNow:count(r.bound_source_on_time_at_audit),
   sourceLifetimeExpiredByAudit:count(r.original_use_lifetime_elapsed)
  }));
  const pre=snapshots.rows.map(r=>({
   horizon:String(r.horizon),persistedPRE:count(r.persisted_pre),
   distinctOperatingPRE:count(r.unique_physical_pre),
   preActuallyCommittedBeforeCutoff:count(r.source_qualified_pre_written_before_cutoff),
   latePREInvalid:count(r.late_pre_written_should_be_zero),
   missingPreSourceHash:count(r.missing_pre_source_hash),
   notTruePRE:count(r.not_true_pre),
   missingNativeTVersion:count(r.native_t_version_unknown)
  }));
  const outcome=post.rows.map(r=>({
   horizon:String(r.horizon),preDenominator:count(r.expected_pre),
   asofBaselineSource:count(r.baseline_sourced),
   postSourceObservedByW:count(r.post_observed),
   observedScheduleRevisionAtLeast15min:count(r.revision_ge15),
   observedScheduleRevisionLess15min:count(r.revision_lt15),
   missingOrCensored:count(r.expected_pre)-count(r.revision_ge15)-
    count(r.revision_lt15)
  }));
  for(const r of source){
   if(r.plannedSourceSlots!==3||
      r.actualCommittedPhysicalReservations>3||
      r.originalBoundSlots>r.actualCommittedPhysicalReservations||
      r.sourceBoundAndOnTimeNow>r.originalBoundSlots)
    hold("SOURCE_AGGREGATE_DRIFT");
  }
  for(const r of pre){
   if(r.preActuallyCommittedBeforeCutoff>r.persistedPRE||
    r.distinctOperatingPRE>r.persistedPRE)hold("PRE_AGGREGATE_DRIFT");
  }
  for(const r of outcome){
   if(r.postSourceObservedByW>r.preDenominator||
      r.observedScheduleRevisionAtLeast15min+
       r.observedScheduleRevisionLess15min>r.postSourceObservedByW||
      r.missingOrCensored<0)
    hold("POST_AGGREGATE_DRIFT");
  }
  const b=budget.rows[0];
  const used=b?count(b.reserved_units):0;
  const ceiling=b?count(b.project_unit_ceiling):0;
  if(used>ceiling||ceiling!==24&&!!b)
   hold("PROJECT_UNIT_CEILING_DRIFT");
  const payload={
   schema:G5A_INDEPENDENT_AUDIT_SCHEMA_V39,
   status:source.length===3&&budget.rows.length===1?
    "INDEPENDENT_COUNTS_COMPLETE_NOT_SCIENCE_VERDICT":
    "HOLD_NO_COMPLETE_PROSPECTIVE_THREE_HORIZON_EVIDENCE",
   sourceCohortManifestSha256:hash,
   sourceHorizonCounts:source,
   originalPopulationCounts:{
    persistedNormalizedRows:count(pop.rows[0]?.population_rows??0),
    distinctConfirmedOperatingLegIds:
      count(pop.rows[0]?.distinct_source_confirmed_operating_leg_ids??0),
    ambiguousOrMarketingRows:count(pop.rows[0]?.ambiguous_or_codeshared_rows??0),
    conditionalQueryFilteredScopeUnknownOperatingIds:
      count(pop.rows[0]?.conditional_query_filtered_scope_unknown_ids??0),
    conditionalScopeNotCertifiedCommercial:true
   },
   independentlyVerifiedPRE:pre,
   prospectiveScheduleRevisionOutcomes:outcome,
   reservedProjectRestUnits:used,projectRestUnitCeiling:ceiling,
   actualProviderBillingIndependentReconciliationRequired:true,
   webhookInOutUnresolvedIndependentReconciliationRequired:true,
   originalContentRightsIndependentlyProvenByThisAudit:false,
   actualDepartureOrRunwayTimeCertified:false,
   missingObservationNotNegative:true,
   providerCalls:0,databaseWrites:0,scientificGate5Passed:false,
   phase5FreezeAuthorized:false,phase6Authorized:false
  };
  await db.query("ROLLBACK");tx=false;
  console.log(JSON.stringify(payload));
 }finally{
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  await db.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_nov06_independent_real_cohort_readonly_audit.ts"))
 void main().catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(JSON.stringify({
   status:"G5A_INDEPENDENT_NO_PROVIDER_AUDIT_HOLD",
   reason:/^P4_G5_G5A_INDEPENDENT_[A-Z0-9_]+_HOLD$/.test(msg)?
    msg:"G5A_INDEPENDENT_UNKNOWN_REDACTED_HOLD",
   rawContentPrinted:false,providerCalls:0,databaseWrites:0,
   scientificGate5Passed:false
  }));
  process.exitCode=2;
 });
