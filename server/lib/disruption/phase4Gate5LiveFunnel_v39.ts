/**
 * Phase4 Gate5 production cohort funnel: real READ ONLY source receipts,
 * deduplicated provisional analytical identities and as-of candidate cutoffs.
 * Unlike the offline fixtures, every count here comes from the V3.9 DB.
 *
 * This never promotes missing operator/scope/T or callback joins to certified
 * positives; the printed result contains no flight identifiers or raw data.
 */
import type {P4InventoryDb} from "./phase4Gate5SourceInventory_v39";
export const P4_LIVE_FUNNEL_SCHEMA="v39.phase4.gate5-live-population-funnel.v1" as const;
export const P4_LIVE_COHORT_SQL_V39=[
 "WITH q AS (SELECT population_query_id,response_hash,available_at",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'",
 "AND available_at <= $4::timestamptz",
 "ORDER BY available_at DESC LIMIT 12),",
 "p AS (SELECT m.analytic_identity_id,m.population_query_id,",
 "m.dep_scheduled_utc,m.population_role,m.scope_classification,",
 "m.codeshare_resolution_status,",
 "GREATEST(m.available_at,q.available_at) AS effective_available,",
 "(m.response_hash=q.response_hash AND",
 "(m.available_at>=q.available_at OR",
 "q.available_at-m.available_at<interval '1 millisecond')",
 "AND m.available_at <= $4::timestamptz) AS source_consistent",
 "FROM clean.flight_population m JOIN q",
 "ON q.population_query_id=m.population_query_id",
 "WHERE m.source_type='fids' AND m.source_airport_icao=$1",
 "AND m.provider_content_expired_at_utc IS NULL),",
 "firsts AS (SELECT DISTINCT ON (analytic_identity_id)",
 "analytic_identity_id,dep_scheduled_utc AS first_schedule",
 "FROM p WHERE population_role='requested_airport_primary'",
 "AND analytic_identity_id IS NOT NULL",
 "ORDER BY analytic_identity_id,effective_available ASC,population_query_id ASC),",
 "h AS (SELECT * FROM (VALUES",
 "('T-24h'::text,interval '24 hours'),",
 "('T-6h'::text,interval '6 hours'),",
 "('T-90m'::text,interval '90 minutes')) AS v(horizon,lag)),",
 "per_horizon AS (SELECT h.horizon,f.analytic_identity_id,",
 "f.first_schedule,",
 "(SELECT count(*)::int FROM p obs",
 "WHERE obs.analytic_identity_id=f.analytic_identity_id",
 "AND obs.population_role='requested_airport_primary'",
 "AND obs.source_consistent",
 "AND f.first_schedule IS NOT NULL",
 "AND obs.effective_available <= f.first_schedule-h.lag) AS source_observations_before_cutoff,",
 "(SELECT count(*)::int FROM p obs",
 "WHERE obs.analytic_identity_id=f.analytic_identity_id",
 "AND obs.population_role='requested_airport_primary'",
 "AND obs.source_consistent",
 "AND obs.scope_classification='confirmed_core'",
 "AND obs.codeshare_resolution_status='confirmed_operating_leg'",
 "AND f.first_schedule IS NOT NULL",
 "AND obs.effective_available <= f.first_schedule-h.lag) AS certified_class_rows_before_cutoff",
 "FROM firsts f CROSS JOIN h)",
 "SELECT h.horizon,",
 "(SELECT count(*)::int FROM q) AS source_query_receipts,",
 "(SELECT count(*)::int FROM p) AS source_population_observations,",
 "(SELECT count(*)::int FROM p",
 "WHERE population_role='requested_airport_primary') AS primary_observations,",
 "(SELECT count(*)::int FROM p",
 "WHERE population_role='requested_airport_primary'",
 "AND scope_classification<>'confirmed_core') AS unverified_scope_observations,",
 "(SELECT count(*)::int FROM p",
 "WHERE population_role='requested_airport_primary'",
 "AND codeshare_resolution_status<>'confirmed_operating_leg') AS unverified_operator_observations,",
 "(SELECT count(*)::int FROM p WHERE NOT source_consistent) AS invalid_source_lineage_observations,",
 "(SELECT count(*)::int FROM p WHERE dep_scheduled_utc IS NULL) AS missing_schedule_observations,",
 "count(ph.analytic_identity_id)::int AS provisional_distinct_analytic_ids,",
 "count(ph.analytic_identity_id) FILTER",
 "(WHERE ph.first_schedule IS NULL)::int AS no_initial_schedule,",
 "count(ph.analytic_identity_id) FILTER",
 "(WHERE ph.source_observations_before_cutoff>0)::int AS provisional_asof_eligible_ids,",
 "count(ph.analytic_identity_id) FILTER",
 "(WHERE ph.certified_class_rows_before_cutoff>0)::int AS observed_core_classified_ids",
 "FROM h LEFT JOIN per_horizon ph ON ph.horizon=h.horizon",
 "GROUP BY h.horizon ORDER BY h.horizon"
].join(" ");
export const P4_LIVE_SNAPSHOTS_SQL_V39=[
 "WITH q AS (SELECT population_query_id FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND available_at <= $4::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'",
 "ORDER BY available_at DESC LIMIT 12)",
 "SELECT horizon,count(*)::int AS persisted_snapshots",
 "FROM clean.flight_snapshots",
 "WHERE prediction_state='PRE_DEPARTURE'",
 "AND population_query_id IN (SELECT population_query_id::text FROM q)",
 "AND created_at <= $4::timestamptz",
 "AND horizon IN ('T-24h','T-6h','T-90m')",
 "GROUP BY horizon"
].join(" ");
type H="T-24h"|"T-6h"|"T-90m";
const HORIZONS=["T-24h","T-6h","T-90m"] as const;
const FIELDS=["source_query_receipts","source_population_observations",
 "primary_observations","unverified_scope_observations",
 "unverified_operator_observations","invalid_source_lineage_observations",
 "missing_schedule_observations","provisional_distinct_analytic_ids",
 "no_initial_schedule","provisional_asof_eligible_ids",
 "observed_core_classified_ids"] as const;
function n(row:Record<string,unknown>,field:string){
 const v=row[field];
 if(!(typeof v==="number"&&Number.isInteger(v))&&
    !(typeof v==="string"&&/^\d+$/.test(v)))
   throw Error("P4_LIVE_FUNNEL_INVALID_COUNT");
 const value=Number(v);
 if(!Number.isSafeInteger(value)||value<0||value>25000)
   throw Error("P4_LIVE_FUNNEL_INVALID_COUNT");
 return value;
}
export async function auditP4LiveGate5FunnelV39(
 db:P4InventoryDb,params:{
 airport:"WSSS";windowStartUtc:string;windowEndUtc:string;auditUtc:string
 }){
 const iso=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
 if(!params||params.airport!=="WSSS"||![
 params.windowStartUtc,params.windowEndUtc,params.auditUtc].every(x=>typeof x==="string"&&iso.test(x)&&Number.isFinite(Date.parse(x)))||
 params.windowStartUtc!=="2026-10-31T17:00:00.000Z"||
 params.windowEndUtc!=="2026-10-31T18:00:00.000Z")
  throw Error("P4_LIVE_FUNNEL_SCOPE_HOLD");
 const args=[params.airport,params.windowStartUtc,params.windowEndUtc,params.auditUtc];
 const [f,s]=await Promise.all([
  db.query(P4_LIVE_COHORT_SQL_V39,args),
  db.query(P4_LIVE_SNAPSHOTS_SQL_V39,args)
 ]);
 if(!f||!Array.isArray(f.rows)||f.rows.length!==3||
    !s||!Array.isArray(s.rows)||s.rows.length>3)
   throw Error("P4_LIVE_FUNNEL_QUERY_SHAPE_HOLD");
 const snaps:Record<H,number>={"T-24h":0,"T-6h":0,"T-90m":0};
 const seen=new Set<string>();
 for(const v of s.rows){
  const row=v as Record<string,unknown>;
  const h=row.horizon;
  if(!HORIZONS.includes(h as H)||seen.has(String(h)))
    throw Error("P4_LIVE_FUNNEL_SNAPSHOT_HORIZON_HOLD");
  seen.add(String(h));snaps[h as H]=n(row,"persisted_snapshots");
 }
 const horizons=[];
 const seenH=new Set<string>();
 for(const value of f.rows){
  const row=value as Record<string,unknown>,h=row.horizon;
  if(!HORIZONS.includes(h as H)||seenH.has(String(h)))
    throw Error("P4_LIVE_FUNNEL_DUPLICATE_HORIZON");
  seenH.add(String(h));
  const v=Object.fromEntries(FIELDS.map(k=>[k,n(row,k)])) as
   Record<typeof FIELDS[number],number>;
  if(v.primary_observations>v.source_population_observations||
     v.unverified_scope_observations>v.primary_observations||
     v.unverified_operator_observations>v.primary_observations||
     v.invalid_source_lineage_observations>v.source_population_observations||
     v.missing_schedule_observations>v.source_population_observations||
     v.no_initial_schedule>v.provisional_distinct_analytic_ids||
     v.provisional_asof_eligible_ids>v.provisional_distinct_analytic_ids||
     v.observed_core_classified_ids>v.provisional_asof_eligible_ids||
     v.source_query_receipts===0&&v.source_population_observations!==0)
    throw Error("P4_LIVE_FUNNEL_IMPOSSIBLE_COUNTS");
  horizons.push({
    horizon:h as H,
    candidateDistinctAnalyticIds:v.provisional_distinct_analytic_ids,
    candidateAsOfEligibleIds:v.provisional_asof_eligible_ids,
    candidateMissingInitialScheduleIds:v.no_initial_schedule,
    coreClassifiedAsOfIds:v.observed_core_classified_ids,
    // No actual independently verified selected T or confirmed commercial
    // flight denominator. Provisional IDs are NOT distinct physical flights.
    certifiedHorizonEligible:null,
    expectedCertifiedSnapshots:null,
    persistedPreSnapshots:snaps[h as H],
    webhookCapturedWithConfirmedIdentity:null,
    capturedOutsidePopulation:null,
    targetApplicable:null,targetObserved:null,
    missingCaptureIdentity:"WEBHOOK_TO_WSSS_COHORT_JOIN_UNVERIFIED",
    missingVerifiedT:"SELECTED_PROVIDER_NATIVE_T_UNVERIFIED"
  });
 }
 const first=f.rows[0] as Record<string,unknown>;
 return {
  schema:P4_LIVE_FUNNEL_SCHEMA,
  status:"LIVE_DB_COUNTS_MEASURED_CERTIFIED_FUNNEL_PARTIAL" as const,
  airport:params.airport,
  windowStartUtc:params.windowStartUtc,windowEndUtc:params.windowEndUtc,
  auditUtc:params.auditUtc,
  sourceQueryReceipts:n(first,"source_query_receipts"),
  populationObservations:n(first,"source_population_observations"),
  primaryObservations:n(first,"primary_observations"),
  unverifiedScopeObservations:n(first,"unverified_scope_observations"),
  unverifiedOperatorObservations:n(first,"unverified_operator_observations"),
  lineageInvalidObservations:n(first,"invalid_source_lineage_observations"),
  missingCandidateScheduleObservations:n(first,"missing_schedule_observations"),
  horizons,
  physicalFlightDenominatorCertified:false,
  providerSelectedTCertified:false,
  webhookIdentityJoinCertified:false,
  actualDepartureOutcomeCertified:false,
  strictGate5Passed:false,phase6Authorized:false,
  providerCalls:0,databaseWrites:0
 };
}
