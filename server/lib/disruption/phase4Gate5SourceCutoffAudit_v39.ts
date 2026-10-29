/**
 * Phase4 Gate5 read-only candidate cutoff & PRE snapshot lineage census.
 * Uses same bounded latest retained FIDS receipts as original source inventory.
 * Every metric is a source-observation count, NOT an operated-flight denominator.
 * Do not treat candidate scheduled UTC as independently frozen first T.
 */
import {P4_INV_FIDS_SQL,type P4InventoryDb} from "./phase4Gate5SourceInventory_v39";
export const P4_G5_COHORT_SCHEMA_V39="v39.phase4.gate5-source-cutoff-census.v1" as const;
export const P4_G5_SOURCE_TIMING_SQL_V39=[
 "WITH q AS (SELECT population_query_id,available_at,response_hash",
 "FROM clean.fids_query_response",
 "WHERE population_query_id=ANY($1::uuid[]) AND source_airport_icao=$2",
 "AND available_at<=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL),",
 "p AS (SELECT p.*,q.available_at AS receipt_available,q.response_hash AS receipt_hash,",
 "GREATEST(p.available_at,q.available_at) AS effective_source_available,",
 "(p.response_hash=q.response_hash AND",
 "p.available_at<=$3::timestamptz AND q.available_at<=$3::timestamptz",
 "AND (p.available_at>=q.available_at OR",
 "(p.available_at<q.available_at AND",
 "q.available_at-p.available_at<interval '1 millisecond'))) AS precision_compatible",
 "FROM clean.flight_population p JOIN q ON q.population_query_id=p.population_query_id",
 "WHERE p.source_type='fids' AND p.source_airport_icao=$2",
 "AND p.provider_content_expired_at_utc IS NULL)",
 "SELECT count(*)::int AS observations,",
 "count(*) FILTER (WHERE p.population_role='requested_airport_primary')::int AS primary_rows,",
 "count(*) FILTER (WHERE p.population_role='opposite_movement_context')::int AS context_rows,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NULL)::int AS no_schedule,",
 "count(*) FILTER (WHERE p.response_hash<>p.receipt_hash)::int AS hash_mismatch,",
 "count(*) FILTER (WHERE p.available_at<p.receipt_available)::int AS available_before_receipt,",
 "count(*) FILTER (WHERE p.available_at>$3::timestamptz)::int AS available_after_audit,",
 "count(*) FILTER (WHERE p.available_at<p.receipt_available",
 "AND p.receipt_available-p.available_at<=interval '1 second')::int AS before_receipt_under_1s,",
 "count(*) FILTER (WHERE p.available_at<p.receipt_available",
 "AND p.receipt_available-p.available_at<=interval '1 millisecond')::int AS before_receipt_under_1ms,",
 "count(*) FILTER (WHERE p.available_at<p.receipt_available",
 "AND p.receipt_available-p.available_at>interval '1 millisecond'",
 "AND p.receipt_available-p.available_at<=interval '1 second')::int AS before_receipt_1ms_to_1s,",
 "count(*) FILTER (WHERE p.available_at<p.receipt_available",
 "AND p.receipt_available-p.available_at>interval '1 second'",
 "AND p.receipt_available-p.available_at<=interval '1 minute')::int AS before_receipt_1s_to_1m,",
 "count(*) FILTER (WHERE p.available_at<p.receipt_available",
 "AND p.receipt_available-p.available_at>interval '1 minute')::int AS before_receipt_over_1m,",
 "count(*) FILTER (WHERE p.response_hash=p.receipt_hash AND",
 "p.available_at>=p.receipt_available AND p.available_at<=$3::timestamptz)::int AS consistent_source_rows,",
 "count(*) FILTER (WHERE p.precision_compatible)::int AS precision_reconciled_rows,",
 "count(*) FILTER (WHERE p.precision_compatible",
 "AND p.available_at<p.receipt_available)::int AS precision_adjusted_rows,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL",
 "AND p.available_at<=p.dep_scheduled_utc - interval '24 hours'",
 "AND p.receipt_available<=p.dep_scheduled_utc - interval '24 hours')::int AS before_24h,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL",
 "AND p.available_at<=p.dep_scheduled_utc - interval '6 hours'",
 "AND p.receipt_available<=p.dep_scheduled_utc - interval '6 hours')::int AS before_6h,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL",
 "AND p.available_at<=p.dep_scheduled_utc - interval '90 minutes'",
 "AND p.receipt_available<=p.dep_scheduled_utc - interval '90 minutes')::int AS before_90m,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL",
 "AND p.response_hash=p.receipt_hash AND p.available_at>=p.receipt_available",
 "AND p.available_at<=$3::timestamptz",
 "AND p.receipt_available<=p.dep_scheduled_utc - interval '24 hours'",
 "AND p.available_at<=p.dep_scheduled_utc - interval '24 hours')::int AS safe_before_24h,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL",
 "AND p.response_hash=p.receipt_hash AND p.available_at>=p.receipt_available",
 "AND p.available_at<=$3::timestamptz",
 "AND p.receipt_available<=p.dep_scheduled_utc - interval '6 hours'",
 "AND p.available_at<=p.dep_scheduled_utc - interval '6 hours')::int AS safe_before_6h,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL",
 "AND p.response_hash=p.receipt_hash AND p.available_at>=p.receipt_available",
 "AND p.available_at<=$3::timestamptz",
 "AND p.receipt_available<=p.dep_scheduled_utc - interval '90 minutes'",
 "AND p.available_at<=p.dep_scheduled_utc - interval '90 minutes')::int AS safe_before_90m,",
 "count(*) FILTER (WHERE p.precision_compatible",
 "AND p.dep_scheduled_utc IS NOT NULL",
 "AND p.effective_source_available<=p.dep_scheduled_utc - interval '24 hours')::int AS precision_before_24h,",
 "count(*) FILTER (WHERE p.precision_compatible",
 "AND p.dep_scheduled_utc IS NOT NULL",
 "AND p.effective_source_available<=p.dep_scheduled_utc - interval '6 hours')::int AS precision_before_6h,",
 "count(*) FILTER (WHERE p.precision_compatible",
 "AND p.dep_scheduled_utc IS NOT NULL",
 "AND p.effective_source_available<=p.dep_scheduled_utc - interval '90 minutes')::int AS precision_before_90m,",
 "count(*) FILTER (WHERE p.dep_scheduled_utc IS NOT NULL",
 "AND p.available_at>p.dep_scheduled_utc)::int AS after_candidate_schedule,",
 "count(*) FILTER (WHERE p.population_role='requested_airport_primary'",
 "AND p.scope_classification='confirmed_core'",
 "AND p.codeshare_resolution_status='confirmed_operating_leg'",
 "AND p.canonical_flight_instance_id IS NOT NULL)::int AS confirmed_core_operating_records",
 "FROM p"
].join(" ");
export const P4_G5_SNAPSHOT_SQL_V39=[
 "WITH q AS (SELECT population_query_id,response_hash,available_at",
 "FROM clean.fids_query_response",
 "WHERE population_query_id=ANY($1::uuid[]) AND source_airport_icao=$2",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND available_at<=$3::timestamptz),",
 "s AS (SELECT ss.*,q.response_hash AS source_response_hash,",
 "q.available_at AS source_available",
 "FROM clean.flight_snapshots ss JOIN q",
 "ON ss.population_query_id=q.population_query_id::text",
 "WHERE ss.prediction_state='PRE_DEPARTURE'",
 "AND ss.created_at<=$3::timestamptz)",
 "SELECT s.horizon, count(*)::int AS snapshot_rows,",
 "count(*) FILTER (WHERE s.selected_t_milestone_utc IS NOT NULL)::int AS t_field_present,",
 "count(*) FILTER (WHERE s.fids_response_hash=s.source_response_hash)::int AS hash_matches,",
 "count(*) FILTER (WHERE s.selected_t_milestone_utc IS NOT NULL",
 "AND s.prediction_cutoff_utc = s.selected_t_milestone_utc -",
 "CASE s.horizon WHEN 'T-24h' THEN interval '24 hours'",
 "WHEN 'T-6h' THEN interval '6 hours'",
 "WHEN 'T-90m' THEN interval '90 minutes' END)::int AS internal_t_arithmetic_consistent,",
 "count(*) FILTER (WHERE EXISTS(",
 "SELECT 1 FROM clean.flight_population p",
 "WHERE p.population_query_id=s.population_query_id::uuid",
 "AND p.canonical_flight_instance_id=s.flight_instance_id",
 "AND p.population_role='requested_airport_primary'",
 "AND p.scope_classification='confirmed_core'",
 "AND p.codeshare_resolution_status='confirmed_operating_leg'",
 "AND p.response_hash=s.fids_response_hash",
 "AND p.available_at<=s.prediction_cutoff_utc",
 "AND s.source_available<=s.prediction_cutoff_utc",
 "AND p.provider_content_expired_at_utc IS NULL))::int AS strict_lineage_candidates",
 "FROM s GROUP BY s.horizon ORDER BY s.horizon"
].join(" ");
const H=["T-24h","T-6h","T-90m"] as const;
type Horizon=typeof H[number];
const FIDS_MAX=12;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function count(r:Record<string,unknown>,name:string):number{
 const v=r[name];
 if(!(typeof v==="string"&&/^[0-9]+$/.test(v))&&
    !(typeof v==="number"&&Number.isInteger(v)))throw Error("P4_G5_INVALID_COUNT");
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<0||n>20000)throw Error("P4_G5_INVALID_COUNT");
 return n;
}
function record(v:unknown):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))throw Error("P4_G5_BAD_ROW");
 return v as Record<string,unknown>;
}
const noT={certified:false,reason:"FIRST_SELECTED_T_AND_PROVIDER_SCHEDULE_SEMANTICS_UNVERIFIED"} as const;
export async function auditP4Gate5SourceCutoffsV39(
 db:P4InventoryDb,scope:{airport:string;auditUtc:string}
){
 if(!scope||!/^[A-Z]{4}$/.test(scope.airport)||typeof scope.auditUtc!=="string"||
  !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(scope.auditUtc)||
  !Number.isFinite(Date.parse(scope.auditUtc)))throw Error("P4_G5_BAD_SCOPE");
 const selected=await db.query(P4_INV_FIDS_SQL,[scope.airport,scope.auditUtc]);
 if(!selected||!Array.isArray(selected.rows)||selected.rows.length>FIDS_MAX)
  throw Error("P4_G5_SOURCE_SAMPLE_TOO_LARGE");
 const ids:string[]=[];
 for(const value of selected.rows){
  const row=record(value);
  if(typeof row.query_id!=="string"||!UUID.test(row.query_id)||
   row.airport!==scope.airport||typeof row.raw_present!=="boolean")
   throw Error("P4_G5_BAD_RECEIPT");
  if(row.raw_present===true&&row.raw_expired_at_utc===null)ids.push(row.query_id);
 }
 if(new Set(ids).size!==ids.length)throw Error("P4_G5_DUPLICATE_RECEIPT");
 const base={
  schema:P4_G5_COHORT_SCHEMA_V39,
  airport:scope.airport,
  status:"SOURCE_OBSERVATION_DIAGNOSTIC_NOT_SCIENCE_PASS" as const,
  latestSourceReceiptSample:selected.rows.length,
  retainedQueryReceipts:ids.length,
  noVerifiedFirstT:noT,
  independentFlightPopulationCertified:false as const,
  receiptOriginalHashReadbackCertified:false as const,
  webhookCaptureOutsidePopulationMeasured:false as const,
  actualRunwayTargetsCertified:false as const,
  strictGate5Passed:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
 if(ids.length===0)return {...base,
  noRetainedSource:true as const,
  observedRows:null,primaryRows:null,contextRows:null,
  missingCandidateScheduleRows:null,
  sourceHashOrAvailabilityViolations:null,
  sourceIntegrityBreakdown:null,
  precisionReconciledSourceRows:null,
  precisionAdjustedTimestampRows:null,
  precisionReconciledCandidateTiming:{"T-24h":null,"T-6h":null,"T-90m":null},
  beforeCandidateScheduleWithSourceIntegrity:{"T-24h":null,"T-6h":null,"T-90m":null},
  beforeCandidateSchedule:{"T-24h":null,"T-6h":null,"T-90m":null},
  sourceRowsAfterCandidateSchedule:null,
  confirmedCoreOperatingRows:null,
  observedSnapshots:null,
  sourceCutoffDenominatorsCertified:false as const};
 const timing=await db.query(P4_G5_SOURCE_TIMING_SQL_V39,[ids,scope.airport,scope.auditUtc]);
 if(!timing||!Array.isArray(timing.rows)||timing.rows.length!==1)
  throw Error("P4_G5_MISSING_SOURCE_AGGREGATE");
 const t=record(timing.rows[0]);
 const fields=["observations","primary_rows","context_rows","no_schedule","hash_mismatch",
  "available_before_receipt","available_after_audit",
  "before_receipt_under_1s","before_receipt_under_1ms",
  "before_receipt_1ms_to_1s","before_receipt_1s_to_1m",
  "before_receipt_over_1m","consistent_source_rows",
  "precision_reconciled_rows","precision_adjusted_rows",
  "precision_before_24h","precision_before_6h","precision_before_90m",
  "safe_before_24h","safe_before_6h","safe_before_90m",
  "before_24h","before_6h",
  "before_90m","after_candidate_schedule","confirmed_core_operating_records"];
 const vals=Object.fromEntries(fields.map(k=>[k,count(t,k)])) as Record<string,number>;
 if(vals.primary_rows+vals.context_rows>vals.observations||
  vals.no_schedule>vals.observations||
  vals.before_24h>vals.before_6h||vals.before_6h>vals.before_90m||
  vals.before_90m>vals.observations||
  vals.before_receipt_under_1ms+vals.before_receipt_1ms_to_1s!==vals.before_receipt_under_1s||
  vals.before_receipt_under_1s+vals.before_receipt_1s_to_1m+
   vals.before_receipt_over_1m!==vals.available_before_receipt||
  vals.consistent_source_rows>vals.observations||
  vals.safe_before_24h>vals.safe_before_6h||
  vals.safe_before_6h>vals.safe_before_90m||
  vals.safe_before_90m>vals.consistent_source_rows||
  vals.precision_adjusted_rows>vals.before_receipt_under_1ms||
  vals.precision_adjusted_rows>vals.precision_reconciled_rows||
  vals.precision_reconciled_rows>vals.observations||
  vals.precision_before_24h>vals.precision_before_6h||
  vals.precision_before_6h>vals.precision_before_90m||
  vals.precision_before_90m>vals.precision_reconciled_rows||
  vals.precision_before_24h>vals.before_24h||
  vals.precision_before_6h>vals.before_6h||
  vals.precision_before_90m>vals.before_90m||
  vals.safe_before_24h>vals.before_24h||
  vals.safe_before_6h>vals.before_6h||
  vals.safe_before_90m>vals.before_90m||
  vals.confirmed_core_operating_records>vals.primary_rows)
  throw Error("P4_G5_IMPOSSIBLE_SOURCE_COUNTERS");
 const snaps=await db.query(P4_G5_SNAPSHOT_SQL_V39,[ids,scope.airport,scope.auditUtc]);
 if(!snaps||!Array.isArray(snaps.rows)||snaps.rows.length>3)
  throw Error("P4_G5_SNAPSHOT_AGGREGATE_BOUNDS");
 const snap:Record<Horizon,{
  persistedRows:number;selectedTFieldPresent:number;sourceHashMatched:number;
  internalClockArithmeticMatched:number;strictSourceLineageCandidates:number
 }>={"T-24h":{persistedRows:0,selectedTFieldPresent:0,sourceHashMatched:0,
  internalClockArithmeticMatched:0,strictSourceLineageCandidates:0},
  "T-6h":{persistedRows:0,selectedTFieldPresent:0,sourceHashMatched:0,
  internalClockArithmeticMatched:0,strictSourceLineageCandidates:0},
  "T-90m":{persistedRows:0,selectedTFieldPresent:0,sourceHashMatched:0,
  internalClockArithmeticMatched:0,strictSourceLineageCandidates:0}};
 const seen=new Set<string>();
 for(const row of snaps.rows){
  const r=record(row),h=r.horizon as Horizon;
  if(!H.includes(h)||seen.has(h))throw Error("P4_G5_BAD_SNAPSHOT_HORIZON");
  seen.add(h);
  const v={
   persistedRows:count(r,"snapshot_rows"),
   selectedTFieldPresent:count(r,"t_field_present"),
   sourceHashMatched:count(r,"hash_matches"),
   internalClockArithmeticMatched:count(r,"internal_t_arithmetic_consistent"),
   strictSourceLineageCandidates:count(r,"strict_lineage_candidates")
  };
  if([v.selectedTFieldPresent,v.sourceHashMatched,v.internalClockArithmeticMatched,
    v.strictSourceLineageCandidates].some(n=>n>v.persistedRows))
    throw Error("P4_G5_IMPOSSIBLE_SNAPSHOT_COUNTERS");
  snap[h]=v;
 }
 return {...base,noRetainedSource:false as const,
  observedRows:vals.observations,primaryRows:vals.primary_rows,
  contextRows:vals.context_rows,missingCandidateScheduleRows:vals.no_schedule,
  sourceHashOrAvailabilityViolations:vals.hash_mismatch+
   vals.available_before_receipt+vals.available_after_audit,
  precisionReconciledSourceRows:vals.precision_reconciled_rows,
  precisionAdjustedTimestampRows:vals.precision_adjusted_rows,
  precisionReconciledCandidateTiming:{
   "T-24h":vals.precision_before_24h,
   "T-6h":vals.precision_before_6h,
   "T-90m":vals.precision_before_90m
  },
  sourceIntegrityBreakdown:{
   responseHashMismatchRows:vals.hash_mismatch,
   memberAvailableBeforeReceiptRows:vals.available_before_receipt,
   memberAvailableAfterAuditRows:vals.available_after_audit,
   sourceConsistentRows:vals.consistent_source_rows,
   receiptAheadByAtMostOneSecond:vals.before_receipt_under_1s,
   receiptAheadByAtMostOneMillisecond:vals.before_receipt_under_1ms,
   receiptAheadByOneMillisecondToOneSecond:vals.before_receipt_1ms_to_1s,
   receiptAheadByOneSecondToOneMinute:vals.before_receipt_1s_to_1m,
   receiptAheadByMoreThanOneMinute:vals.before_receipt_over_1m
  },
  beforeCandidateScheduleWithSourceIntegrity:{
   "T-24h":vals.safe_before_24h,"T-6h":vals.safe_before_6h,
   "T-90m":vals.safe_before_90m
  },
  beforeCandidateSchedule:{"T-24h":vals.before_24h,"T-6h":vals.before_6h,
   "T-90m":vals.before_90m},
  sourceRowsAfterCandidateSchedule:vals.after_candidate_schedule,
  confirmedCoreOperatingRows:vals.confirmed_core_operating_records,
  observedSnapshots:snap,
  sourceCutoffDenominatorsCertified:false as const};
}
