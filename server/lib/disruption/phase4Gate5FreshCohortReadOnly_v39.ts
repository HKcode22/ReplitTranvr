/**
 * Phase4 Gate5: generic, parameterized, READ ONLY cohort evidence inventory.
 * Replaces no historic Oct31 hardcoded audit, calls no provider, never writes.
 * Client must be inside ONE caller-owned REPEATABLE READ READ ONLY transaction.
 * Plan V3.9-f.8 §§5, 6, 7, 16 Gate5; no science self-PASS.
 */
export const P4_FRESH_COHORT_AUDIT_SCHEMA_V39=
  "v39.phase4.gate5-frozen-cohort-readonly-candidates.v1" as const;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SHA=/^[a-f0-9]{64}$/;
export type P4FreshHorizon="T-24h"|"T-6h"|"T-90m";
const HORIZONS=["T-24h","T-6h","T-90m"] as const;
export interface P4FreshCohortScopeV39{
 airportIcao:string;serviceWindowStartUtc:string;serviceWindowEndUtc:string;
 readAsOfUtc:string;reviewedFrozenManifestSha256:string;
}
export interface P4FreshReadOnlyDbV39{
 query(sql:string,params:unknown[]):Promise<{rows:unknown[]}>;
}
function exactUtc(x:string,why:string){
 if(typeof x!=="string"||!ISO.test(x))throw Error("P4_FRESH_INVALID_UTC:"+why);
 const t=Date.parse(x);
 if(!Number.isFinite(t)||new Date(t).toISOString()!==x)
  throw Error("P4_FRESH_INVALID_UTC:"+why);
 return t;
}
export function assertP4FreshCohortScopeV39(s:P4FreshCohortScopeV39){
 if(!s||!/^[A-Z]{4}$/.test(s.airportIcao)||
   !SHA.test(s.reviewedFrozenManifestSha256))
   throw Error("P4_FRESH_COHORT_MANIFEST_SCOPE_HOLD");
 const start=exactUtc(s.serviceWindowStartUtc,"start");
 const end=exactUtc(s.serviceWindowEndUtc,"end");
 const read=exactUtc(s.readAsOfUtc,"read");
 if(end<=start||end-start>4*3600000||end-start<10*60000||
    read<start-48*3600000||read<end-48*3600000)
  throw Error("P4_FRESH_COHORT_WINDOW_HOLD");
}
export const P4_FRESH_COHORT_SOURCE_SQL_V39=[
 "WITH q_all AS (SELECT population_query_id,response_hash,available_at,",
 "raw_payload,raw_expired_at_utc FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND available_at<=$4::timestamptz),",
 "q AS (SELECT population_query_id,response_hash,available_at",
 "FROM q_all WHERE raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL),",
 "p AS (SELECT m.analytic_identity_id,m.canonical_flight_instance_id,",
 "m.scope_classification,m.codeshare_resolution_status,m.population_role,",
 "m.available_at AS member_available,q.available_at AS source_available,",
 "m.response_hash,q.response_hash AS source_hash",
 "FROM clean.flight_population m JOIN q",
 "ON q.population_query_id=m.population_query_id",
 "WHERE m.source_type='fids' AND m.source_airport_icao=$1",
 "AND m.window_start_utc=$2::timestamptz",
 "AND m.window_end_utc=$3::timestamptz",
 "AND m.provider_content_expired_at_utc IS NULL",
 "AND m.available_at<=$4::timestamptz),",
 "eligible AS (SELECT * FROM p WHERE",
 "population_role='requested_airport_primary'",
 "AND response_hash=source_hash",
 "AND member_available>=source_available),",
 "operating AS (SELECT DISTINCT canonical_flight_instance_id FROM eligible",
 "WHERE canonical_flight_instance_id IS NOT NULL",
 "AND scope_classification='confirmed_core'",
 "AND codeshare_resolution_status='confirmed_operating_leg')",
 "SELECT",
 "(SELECT count(*)::int FROM q_all) AS ever_retained_query_receipts,",
 "(SELECT count(*)::int FROM q) AS retained_original_query_receipts,",
 "(SELECT count(*)::int FROM p) AS source_population_rows,",
 "(SELECT count(*)::int FROM p WHERE response_hash<>source_hash",
 "OR member_available<source_available) AS invalid_hash_or_clock_rows,",
 "(SELECT count(*)::int FROM eligible) AS source_consistent_primary_rows,",
 "(SELECT count(DISTINCT analytic_identity_id)::int FROM eligible)",
 "AS provisional_distinct_analytic_identities,",
 "(SELECT count(*)::int FROM operating) AS tagged_core_canonical_identities",
].join(" ");
export const P4_FRESH_COHORT_PRE_SQL_V39=[
 "WITH q AS (SELECT population_query_id FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND available_at<=$4::timestamptz)",
 "SELECT s.horizon,count(*)::int AS persisted_pre_rows",
 "FROM clean.flight_snapshots s",
 "WHERE s.prediction_state='PRE_DEPARTURE'",
 "AND s.created_at<=$4::timestamptz",
 "AND s.population_query_id IN (SELECT population_query_id::text FROM q)",
 "AND s.horizon IN ('T-24h','T-6h','T-90m')",
 "GROUP BY s.horizon"
].join(" ");
export const P4_FRESH_COHORT_OUTCOME_SQL_V39=[
 "WITH q AS (SELECT population_query_id,response_hash,available_at",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND available_at<=$4::timestamptz),",
 "ids AS (SELECT DISTINCT p.canonical_flight_instance_id AS flight_id",
 "FROM clean.flight_population p JOIN q",
 "ON q.population_query_id=p.population_query_id",
 "WHERE p.source_type='fids' AND p.source_airport_icao=$1",
 "AND p.population_role='requested_airport_primary'",
 "AND p.scope_classification='confirmed_core'",
 "AND p.codeshare_resolution_status='confirmed_operating_leg'",
 "AND p.canonical_flight_instance_id IS NOT NULL",
 "AND p.response_hash=q.response_hash",
 "AND p.available_at>=q.available_at",
 "AND p.available_at<=$4::timestamptz",
 "AND p.provider_content_expired_at_utc IS NULL),",
 "resolved AS (SELECT DISTINCT r.flight_instance_id AS flight_id",
 "FROM clean.webhook_identity_resolution r",
 "JOIN clean.webhook_flight_identity wi",
 "ON wi.flight_instance_id=r.flight_instance_id",
 "WHERE r.resolution_status='resolved'",
 "AND r.flight_instance_id IS NOT NULL",
 "AND r.provider_identity_expired_at_utc IS NULL",
 "AND wi.origin_icao=$1",
 "AND wi.initial_scheduled_gate_out_utc>=$2::timestamptz",
 "AND wi.initial_scheduled_gate_out_utc<$3::timestamptz",
 "AND EXISTS (SELECT 1 FROM clean.raw_delivery d",
 "WHERE d.delivery_id=r.delivery_id AND d.raw_expired_at_utc IS NULL",
 "AND d.provider_content_expired_at_utc IS NULL",
 "AND d.received_at_utc<=$4::timestamptz)),",
 "outcomes AS (SELECT DISTINCT ON (o.flight_instance_id)",
 "o.flight_instance_id AS flight_id,o.label_status",
 "FROM clean.flight_outcomes o JOIN ids",
 "ON ids.flight_id=o.flight_instance_id",
 "WHERE o.target='wheels_off' AND o.updated_at<=$4::timestamptz",
 "ORDER BY o.flight_instance_id,o.updated_at DESC,o.id DESC)",
 "SELECT",
 "(SELECT count(*)::int FROM resolved) AS provisional_resolved_origin_identities,",
 "(SELECT count(*)::int FROM resolved r JOIN ids i ON i.flight_id=r.flight_id)",
 "AS provisional_matched_core_callback_identities,",
 "(SELECT count(*)::int FROM resolved r LEFT JOIN ids i",
 "ON i.flight_id=r.flight_id WHERE i.flight_id IS NULL)",
 "AS provisional_outside_sampled_core_callback_identities,",
 "(SELECT count(*)::int FROM outcomes) AS outcome_rows,",
 "(SELECT count(*)::int FROM outcomes WHERE label_status='observed')",
 "AS outcome_status_observed,",
 "(SELECT count(*)::int FROM outcomes WHERE label_status='pending')",
 "AS outcome_status_pending,",
 "(SELECT count(*)::int FROM outcomes WHERE label_status='censored')",
 "AS outcome_status_censored,",
 "(SELECT count(*)::int FROM outcomes WHERE label_status='missing')",
 "AS outcome_status_missing,",
 "(SELECT count(*)::int FROM outcomes WHERE label_status='not_applicable')",
 "AS outcome_status_not_applicable"
].join(" ");
function row(v:unknown,why:string):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))
  throw Error("P4_FRESH_BAD_READONLY_ROW:"+why);
 return v as Record<string,unknown>;
}
function count(r:Record<string,unknown>,k:string):number{
 const v=r[k];
 if(!((typeof v==="number"&&Number.isSafeInteger(v))||
      (typeof v==="string"&&/^\d+$/.test(v))))
  throw Error("P4_FRESH_BAD_COUNTER:"+k);
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<0||n>100000)
  throw Error("P4_FRESH_BAD_COUNTER:"+k);
 return n;
}
export async function auditP4FreshCohortV39(
 db:P4FreshReadOnlyDbV39,scope:P4FreshCohortScopeV39
){
 assertP4FreshCohortScopeV39(scope);
 const args=[scope.airportIcao,scope.serviceWindowStartUtc,
             scope.serviceWindowEndUtc,scope.readAsOfUtc];
 const src=await db.query(P4_FRESH_COHORT_SOURCE_SQL_V39,args);
 const pre=await db.query(P4_FRESH_COHORT_PRE_SQL_V39,args);
 const out=await db.query(P4_FRESH_COHORT_OUTCOME_SQL_V39,args);
 if(src.rows.length!==1||pre.rows.length>3||out.rows.length!==1)
   throw Error("P4_FRESH_READONLY_RESULT_SHAPE_HOLD");
 const s=row(src.rows[0],"source"),o=row(out.rows[0],"outcome");
 const ever=count(s,"ever_retained_query_receipts");
 const retained=count(s,"retained_original_query_receipts");
 const invalid=count(s,"invalid_hash_or_clock_rows");
 const primary=count(s,"source_consistent_primary_rows");
 const sample=count(s,"source_population_rows");
 const provisional=count(s,"provisional_distinct_analytic_identities");
 const tagged=count(s,"tagged_core_canonical_identities");
 const resolved=count(o,"provisional_resolved_origin_identities");
 const matched=count(o,"provisional_matched_core_callback_identities");
 const outside=count(o,"provisional_outside_sampled_core_callback_identities");
 const statuses=["observed","pending","censored","missing","not_applicable"] as const;
 const outcome=Object.fromEntries(statuses.map(k=>[k,count(o,"outcome_status_"+k)])) as Record<typeof statuses[number],number>;
 const outcomeRows=count(o,"outcome_rows");
 if(retained>ever||invalid>sample||primary>sample||provisional>primary||
    tagged>provisional||matched>tagged||matched>resolved||
    matched+outside!==resolved||
    Object.values(outcome).reduce((a,b)=>a+b,0)!==outcomeRows||
    outcomeRows>tagged)
   throw Error("P4_FRESH_COUNTER_CONTRADICTION_HOLD");
 const preCounts:Record<P4FreshHorizon,number>={
   "T-24h":0,"T-6h":0,"T-90m":0
 };
 const seen=new Set<string>();
 for(const x of pre.rows){
  const r=row(x,"pre"),h=r.horizon;
  if(!HORIZONS.includes(h as P4FreshHorizon)||typeof h!=="string"||seen.has(h))
   throw Error("P4_FRESH_BAD_PRE_HORIZON");
  seen.add(h);preCounts[h as P4FreshHorizon]=count(r,"persisted_pre_rows");
 }
 const hasRetained=retained>0;
 return {
  schema:P4_FRESH_COHORT_AUDIT_SCHEMA_V39,
  status:hasRetained
   ?"RETAINED_SOURCE_COHORT_INVENTORY_ONLY_NOT_GATE5_PASS"
   :"NO_RETAINED_SOURCE_DENOMINATORS_UNKNOWN_NOT_ZERO" as const,
  airportIcao:scope.airportIcao,
  serviceWindowStartUtc:scope.serviceWindowStartUtc,
  serviceWindowEndUtc:scope.serviceWindowEndUtc,
  readAsOfUtc:scope.readAsOfUtc,
  reviewedFrozenManifestSha256:scope.reviewedFrozenManifestSha256,
  historicalQueryReceiptsMeasured:ever,
  retainedOriginalQueryReceiptsMeasured:retained,
  invalidHashOrClockRowsMeasured:hasRetained?invalid:null,
  sourcePopulationRowsMeasured:hasRetained?sample:null,
  provisionalPrimarySourceRows:hasRetained?primary:null,
  provisionalDistinctAnalyticIdentities:hasRetained?provisional:null,
  taggedCoreCanonicalIdentities:hasRetained?tagged:null,
  persistedPreRowsLinkedToRetainedSource:hasRetained?preCounts:null,
  provisionalResolvedWebhookOriginIdentities:hasRetained?resolved:null,
  provisionalMatchedCoreWebhookIdentities:hasRetained?matched:null,
  provisionalOutsideSampledCoreWebhookIdentities:hasRetained?outside:null,
  sourceScopedOutcomeRows:hasRetained?outcomeRows:null,
  sourceScopedOutcomeStatusCounts:hasRetained?outcome:null,
  // Scientific fields explicitly depend on external native T/target, source
  // availability at all flight-specific cutoffs and physical-flight lineage.
  completeOperatingLegDenominator:null,
  strictPerHorizonSnapshotExpectedCount:null,
  independentlyCertifiedPersistedPreCount:null,
  actualOnlyWheelsOffLabelsObserved:null,
  capturedOutsideFullProviderPopulation:null,
  fullWebhookCaptureRate:null,
  firstSelectedTProviderNativeVerified:false,
  originalHttpWireBytesAuthenticated:false,
  strictGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false,providerCalls:0,databaseWrites:0
 };
}
