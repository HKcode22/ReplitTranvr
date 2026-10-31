/**
 * Phase4 Gate5 production WSSS webhook capture/outcome census.
 * Read-only, bounded to the same frozen WSSS FIDS cohort and system audit UTC.
 * Only provider-derived resolved identities and airport-origin context qualify
 * for a *candidate* join; unknown identity is NOT a negative capture.
 */
import type {P4InventoryDb} from "./phase4Gate5SourceInventory_v39";
export const P4_LIVE_CAPTURE_SCHEMA_V39="v39.phase4.gate5-live-capture-outcome.v1" as const;
export const P4_LIVE_CAPTURE_SQL_V39=[
 "WITH q AS (SELECT population_query_id,response_hash,available_at",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'",
 "AND available_at<=$4::timestamptz",
 "ORDER BY available_at DESC LIMIT 12),",
 "p AS (SELECT DISTINCT m.canonical_flight_instance_id AS flight_id",
 "FROM clean.flight_population m JOIN q",
 "ON q.population_query_id=m.population_query_id",
 "WHERE m.source_type='fids' AND m.source_airport_icao=$1",
 "AND m.population_role='requested_airport_primary'",
 "AND m.scope_classification='confirmed_core'",
 "AND m.codeshare_resolution_status='confirmed_operating_leg'",
 "AND m.canonical_flight_instance_id IS NOT NULL",
 "AND m.response_hash=q.response_hash",
 "AND m.provider_content_expired_at_utc IS NULL",
 "AND GREATEST(m.available_at,q.available_at)<=$4::timestamptz),",
 "w AS (SELECT DISTINCT r.flight_instance_id AS flight_id",
 "FROM clean.webhook_identity_resolution r",
 "JOIN clean.webhook_flight_identity fi",
 "ON fi.flight_instance_id=r.flight_instance_id",
 "WHERE r.resolution_status='resolved'",
 "AND r.flight_instance_id IS NOT NULL",
 "AND r.provider_identity_expired_at_utc IS NULL",
 "AND fi.origin_icao=$1",
 "AND fi.initial_scheduled_gate_out_utc>=$2::timestamptz",
 "AND fi.initial_scheduled_gate_out_utc<$3::timestamptz",
 "AND EXISTS (SELECT 1 FROM clean.raw_delivery d",
 "WHERE d.delivery_id=r.delivery_id",
 "AND d.received_at_utc>=$2::timestamptz-interval '30 hours'",
 "AND d.received_at_utc<=$4::timestamptz",
 "AND d.raw_expired_at_utc IS NULL",
 "AND d.provider_content_expired_at_utc IS NULL)),",
 "o AS (SELECT DISTINCT ON (x.flight_instance_id)",
 "x.flight_instance_id AS flight_id,x.label_status",
 "FROM clean.flight_outcomes x JOIN p",
 "ON p.flight_id=x.flight_instance_id",
 "WHERE x.target='wheels_off' AND x.updated_at<=$4::timestamptz",
 "ORDER BY x.flight_instance_id,x.updated_at DESC,x.id DESC)",
 "SELECT",
 "(SELECT count(*)::int FROM q) AS retained_fids_receipts,",
 "(SELECT count(*)::int FROM p) AS core_canonical_identities,",
 "(SELECT count(*)::int FROM w) AS webhook_resolved_with_wsss_origin,",
 "(SELECT count(*)::int FROM w JOIN p ON p.flight_id=w.flight_id)",
 "AS webhook_resolved_matched_to_core,",
 "(SELECT count(*)::int FROM w LEFT JOIN p ON p.flight_id=w.flight_id",
 "WHERE p.flight_id IS NULL) AS webhook_resolved_outside_sampled_core,",
 "(SELECT count(*)::int FROM o) AS wheelsoff_outcome_rows,",
 "(SELECT count(*)::int FROM o WHERE label_status='observed')",
 "AS wheelsoff_status_observed,",
 "(SELECT count(*)::int FROM o WHERE label_status='pending')",
 "AS wheelsoff_status_pending,",
 "(SELECT count(*)::int FROM o WHERE label_status='censored')",
 "AS wheelsoff_status_censored,",
 "(SELECT count(*)::int FROM o WHERE label_status='missing')",
 "AS wheelsoff_status_missing,",
 "(SELECT count(*)::int FROM o WHERE label_status='not_applicable')",
 "AS wheelsoff_status_not_applicable"
].join(" ");
const COLS=["retained_fids_receipts","core_canonical_identities",
 "webhook_resolved_with_wsss_origin","webhook_resolved_matched_to_core",
 "webhook_resolved_outside_sampled_core","wheelsoff_outcome_rows",
 "wheelsoff_status_observed","wheelsoff_status_pending",
 "wheelsoff_status_censored","wheelsoff_status_missing",
 "wheelsoff_status_not_applicable"] as const;
function count(r:Record<string,unknown>,k:string){
 const v=r[k];
 if(!((typeof v==="number"&&Number.isInteger(v))||
   (typeof v==="string"&&/^\d+$/.test(v))))
  throw Error("P4_LIVE_CAPTURE_BAD_COUNT");
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<0||n>20000)
  throw Error("P4_LIVE_CAPTURE_BAD_COUNT");
 return n;
}
export async function auditP4LiveCaptureOutcomeV39(
 db:P4InventoryDb,
 params:{airport:"WSSS";windowStartUtc:string;windowEndUtc:string;auditUtc:string}
){
 const iso=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
 if(!params||params.airport!=="WSSS"||
    params.windowStartUtc!=="2026-10-31T17:00:00.000Z"||
    params.windowEndUtc!=="2026-10-31T18:00:00.000Z"||
    !iso.test(params.auditUtc)||!Number.isFinite(Date.parse(params.auditUtc)))
   throw Error("P4_LIVE_CAPTURE_BAD_SCOPE");
 const result=await db.query(P4_LIVE_CAPTURE_SQL_V39,[
   params.airport,params.windowStartUtc,params.windowEndUtc,params.auditUtc
 ]);
 if(!result||!Array.isArray(result.rows)||result.rows.length!==1)
   throw Error("P4_LIVE_CAPTURE_BAD_RESULT");
 const row=result.rows[0] as Record<string,unknown>;
 const c=Object.fromEntries(COLS.map(k=>[k,count(row,k)])) as
   Record<typeof COLS[number],number>;
 const statuses=c.wheelsoff_status_observed+c.wheelsoff_status_pending+
   c.wheelsoff_status_censored+c.wheelsoff_status_missing+
   c.wheelsoff_status_not_applicable;
 if(c.webhook_resolved_matched_to_core>c.core_canonical_identities||
    c.webhook_resolved_matched_to_core>c.webhook_resolved_with_wsss_origin||
    c.webhook_resolved_matched_to_core+c.webhook_resolved_outside_sampled_core
      !==c.webhook_resolved_with_wsss_origin||
    c.wheelsoff_outcome_rows>c.core_canonical_identities||
    statuses!==c.wheelsoff_outcome_rows||
    (c.retained_fids_receipts===0&&c.core_canonical_identities>0))
   throw Error("P4_LIVE_CAPTURE_IMPOSSIBLE_COUNTERS");
 const complete=Date.parse(params.auditUtc)>=Date.parse(params.windowEndUtc);
 return {
   schema:P4_LIVE_CAPTURE_SCHEMA_V39,
   status:"MEASURED_DB_RESOLVED_JOIN_ONLY_NOT_COMPLETE_CAPTURE" as const,
   airport:params.airport,windowStartUtc:params.windowStartUtc,
   windowEndUtc:params.windowEndUtc,auditUtc:params.auditUtc,
   serviceWindowCompletedAtAudit:complete,
   retainedFidsReceipts:c.retained_fids_receipts,
   confirmedCoreCanonicalIdentities:c.core_canonical_identities,
   resolvedWebhookWithWsssOriginalIdentity:c.webhook_resolved_with_wsss_origin,
   resolvedWebhookMatchedToSampledCore:c.webhook_resolved_matched_to_core,
   resolvedWebhookOutsideSampledCore:c.webhook_resolved_outside_sampled_core,
   // The outside-sampled-core count is NOT a provider-universe outside count.
   certifiedCapturedOutsidePopulation:null,
   unresolvedWebhookIdentityObservations:null,
   wheelsoffOutcomeRows:c.wheelsoff_outcome_rows,
   wheelsoffStatusObserved:c.wheelsoff_status_observed,
   wheelsoffStatusPending:c.wheelsoff_status_pending,
   wheelsoffStatusCensored:c.wheelsoff_status_censored,
   wheelsoffStatusMissing:c.wheelsoff_status_missing,
   wheelsoffStatusNotApplicable:c.wheelsoff_status_not_applicable,
   verifiedActualRunwayLabels:null,
   fullWebhookCaptureRate:null,
   fullPopulationFrameCertified:false,
   strictGate5Passed:false,phase6Authorized:false,
   providerCalls:0,databaseWrites:0
 };
}
