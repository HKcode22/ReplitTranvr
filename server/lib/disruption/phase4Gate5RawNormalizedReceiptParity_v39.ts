/**
 * Phase4 Gate5: bounded per-retained-FIDS-receipt reconciliation.
 * Counts source raw departures vs normalized population observations in the
 * same original receipt. Differences are NOT proof that specific flight(s)
 * were dropped: deduplication, exclusions, or source role may differ.
 * One caller-owned PG REPEATABLE READ READ ONLY transaction; no provider.
 */
import {
 assertP4FreshCohortScopeV39,
 type P4FreshCohortScopeV39,
 type P4FreshReadOnlyDbV39
} from "./phase4Gate5FreshCohortReadOnly_v39";

export const P4_RECEIPT_PARITY_SCHEMA_V39=
 "v39.phase4.gate5-raw-normalized-receipt-parity.v1" as const;
export const P4_RECEIPT_PARITY_SQL_V39=[
 "WITH allq AS (SELECT population_query_id,response_hash,available_at,raw_payload",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND available_at<=$4::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL),",
 "q AS (SELECT row_number() OVER (ORDER BY available_at,population_query_id)::int",
 "AS receipt_rank,population_query_id,response_hash,available_at,raw_payload",
 "FROM (SELECT * FROM allq ORDER BY available_at,population_query_id LIMIT 12) z),",
 "c AS (SELECT q.receipt_rank,",
 "CASE WHEN jsonb_typeof(q.raw_payload->'departures')='array'",
 "THEN jsonb_array_length(q.raw_payload->'departures') ELSE NULL END AS raw_departure_rows,",
 "count(m.population_query_id)::int AS normalized_rows,",
 "count(m.population_query_id) FILTER",
 "(WHERE m.population_role='requested_airport_primary')::int AS primary_rows,",
 "count(m.population_query_id) FILTER",
 "(WHERE m.population_role<>'requested_airport_primary'",
 "OR m.population_role IS NULL)::int AS context_or_unknown_rows,",
 "count(m.population_query_id) FILTER",
 "(WHERE m.analytic_identity_id IS NULL)::int AS missing_analytic_identity_rows,",
 "count(m.population_query_id) FILTER",
 "(WHERE m.response_hash IS DISTINCT FROM q.response_hash)::int AS hash_mismatch_rows,",
 "count(m.population_query_id) FILTER",
 "(WHERE m.available_at<q.available_at)::int AS earlier_than_parent_receipt_rows,",
 "count(DISTINCT m.analytic_identity_id)::int AS distinct_provisional_analytic_ids",
 "FROM q LEFT JOIN clean.flight_population m",
 "ON m.population_query_id=q.population_query_id",
 "AND m.source_type='fids' AND m.source_airport_icao=$1",
 "AND m.window_start_utc=$2::timestamptz",
 "AND m.window_end_utc=$3::timestamptz",
 "AND m.provider_content_expired_at_utc IS NULL",
 "AND m.available_at<=$4::timestamptz",
 "GROUP BY q.receipt_rank,q.raw_payload)",
 "SELECT receipt_rank,raw_departure_rows,normalized_rows,primary_rows,",
 "context_or_unknown_rows,missing_analytic_identity_rows,hash_mismatch_rows,",
 "earlier_than_parent_receipt_rows,distinct_provisional_analytic_ids,",
 "(SELECT count(*)::int FROM allq) AS total_retained_original_receipts",
 "FROM c ORDER BY receipt_rank"
].join(" ");

const KEYS=[
 "receipt_rank","raw_departure_rows","normalized_rows","primary_rows",
 "context_or_unknown_rows","missing_analytic_identity_rows",
 "hash_mismatch_rows","earlier_than_parent_receipt_rows",
 "distinct_provisional_analytic_ids","total_retained_original_receipts"
] as const;
function count(r:Record<string,unknown>,key:string):number{
 const x=r[key];
 const v=typeof x==="number"?x:
  typeof x==="string"&&/^\d+$/.test(x)?Number(x):NaN;
 if(!Number.isSafeInteger(v)||v<0||v>30000)
  throw Error("P4_RECEIPT_PARITY_BAD_COUNT:"+key);
 return v;
}
export async function auditP4RawNormalizedReceiptParityV39(
 db:P4FreshReadOnlyDbV39,scope:P4FreshCohortScopeV39
){
 assertP4FreshCohortScopeV39(scope);
 const {rows}=await db.query(P4_RECEIPT_PARITY_SQL_V39,[
  scope.airportIcao,scope.serviceWindowStartUtc,
  scope.serviceWindowEndUtc,scope.readAsOfUtc
 ]);
 if(!Array.isArray(rows)||rows.length>12)
  throw Error("P4_RECEIPT_PARITY_QUERY_SHAPE_HOLD");
 const perReceipt=[] as Array<{
  receiptRank:number;rawDepartureObservations:number;
  normalizedObservations:number;netRawMinusNormalized:number;
  primaryNormalizedObservations:number;contextOrUnknownNormalizedObservations:number;
  missingAnalyticIdentityRows:number;hashMismatchRows:number;
  earlierThanSourceReceiptRows:number;distinctProvisionalAnalyticIds:number;
 }>;
 let totalOriginals:number|null=null;
 let index=0;
 for(const v of rows){
  if(!v||typeof v!=="object"||Array.isArray(v))
   throw Error("P4_RECEIPT_PARITY_BAD_ROW");
  const r=v as Record<string,unknown>;
  // Raw departures missing or non-array = UNKNOWN, never a measured zero.
  for(const k of KEYS) if(r[k]===null||r[k]===undefined)
   throw Error("P4_RECEIPT_PARITY_MISSING_RAW_OR_COUNT:"+k);
  const m=Object.fromEntries(KEYS.map(k=>[k,count(r,k)]))
   as Record<typeof KEYS[number],number>;
  index++;
  if(m.receipt_rank!==index||
     (totalOriginals!==null&&totalOriginals!==m.total_retained_original_receipts)||
     m.primary_rows+m.context_or_unknown_rows!==m.normalized_rows||
     m.missing_analytic_identity_rows>m.normalized_rows||
     m.hash_mismatch_rows>m.normalized_rows||
     m.earlier_than_parent_receipt_rows>m.normalized_rows||
     m.distinct_provisional_analytic_ids>m.normalized_rows)
   throw Error("P4_RECEIPT_PARITY_COUNTER_CONTRADICTION_HOLD");
  totalOriginals=m.total_retained_original_receipts;
  perReceipt.push({
   receiptRank:m.receipt_rank,rawDepartureObservations:m.raw_departure_rows,
   normalizedObservations:m.normalized_rows,
   netRawMinusNormalized:m.raw_departure_rows-m.normalized_rows,
   primaryNormalizedObservations:m.primary_rows,
   contextOrUnknownNormalizedObservations:m.context_or_unknown_rows,
   missingAnalyticIdentityRows:m.missing_analytic_identity_rows,
   hashMismatchRows:m.hash_mismatch_rows,
   earlierThanSourceReceiptRows:m.earlier_than_parent_receipt_rows,
   distinctProvisionalAnalyticIds:m.distinct_provisional_analytic_ids
  });
 }
 if(perReceipt.length===0){
  return {
   schema:P4_RECEIPT_PARITY_SCHEMA_V39,
   status:"NO_RETAINED_SOURCE_RECONCILIATION_UNKNOWN" as const,
   manifestSha256:scope.reviewedFrozenManifestSha256,
   totalRetainedOriginalReceipts:null,inspectedOriginalReceipts:0,
   sampleTruncated:null,perReceipt:[],
   rawDepartures:null,normalizedPopulationRows:null,netDifference:null,
   causesOfDifferenceVerified:false as const,
   physicalOperatingFlightsCertified:false as const,
   strictGate5Passed:false as const,phase5FreezeAuthorized:false as const,
   phase6Authorized:false as const,providerCalls:0 as const,databaseWrites:0 as const
  };
 }
 if(totalOriginals===null||totalOriginals<perReceipt.length)
  throw Error("P4_RECEIPT_PARITY_COUNTER_CONTRADICTION_HOLD");
 const sum=(field:"rawDepartureObservations"|"normalizedObservations")=>
  perReceipt.reduce((v,r)=>v+r[field],0);
 const raw=sum("rawDepartureObservations");
 const normalized=sum("normalizedObservations");
 return {
  schema:P4_RECEIPT_PARITY_SCHEMA_V39,
  status:"RECEIPT_LEVEL_NET_COUNT_PARITY_NOT_ROW_IDENTITY_PROOF" as const,
  manifestSha256:scope.reviewedFrozenManifestSha256,
  totalRetainedOriginalReceipts:totalOriginals,
  inspectedOriginalReceipts:perReceipt.length,
  sampleTruncated:totalOriginals>perReceipt.length,
  perReceipt,
  rawDepartures:raw,normalizedPopulationRows:normalized,
  netDifference:raw-normalized,
  causesOfDifferenceVerified:false as const,
  physicalOperatingFlightsCertified:false as const,
  strictGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,providerCalls:0 as const,databaseWrites:0 as const
 };
}
