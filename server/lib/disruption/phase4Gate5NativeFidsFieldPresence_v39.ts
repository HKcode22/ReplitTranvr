/**
 * Phase4 Gate5: original AeroDataBox FIDS field presence ONLY, aggregate
 * metadata from already-retained source. Never certifies actual wheels-off:
 * runwayTime/revisedTime may be actual OR estimated.
 * No provider, outbound network, DB writes, flight IDs or timestamps output.
 */
import {assertP4FreshCohortScopeV39,
 type P4FreshCohortScopeV39,type P4FreshReadOnlyDbV39}
 from "./phase4Gate5FreshCohortReadOnly_v39";
export const P4_NATIVE_FIELD_SCHEMA_V39="v39.phase4.original-fids-native-fields.v1";
export const P4_NATIVE_FIELD_SQL_V39=[
 "WITH allq AS (SELECT raw_payload,available_at",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND available_at<=$4::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL),",
 "q AS (SELECT raw_payload FROM allq ORDER BY available_at DESC LIMIT 12),",
 "d AS (SELECT a.value AS flight FROM q CROSS JOIN LATERAL",
 "jsonb_array_elements(CASE WHEN jsonb_typeof(q.raw_payload->'departures')='array'",
 "THEN q.raw_payload->'departures' ELSE '[]'::jsonb END) a)",
 "SELECT",
 "(SELECT count(*)::int FROM allq) AS all_receipts,",
 "(SELECT count(*)::int FROM q) AS sampled_receipts,",
 "count(*)::int AS departure_rows,",
 "count(*) FILTER (WHERE flight->>'codeshareStatus' IN ('IsOperator','1'))::int AS operator_rows,",
 "count(*) FILTER (WHERE flight->>'codeshareStatus' IN ('IsCodeshared','2'))::int AS marketing_rows,",
 "count(*) FILTER (WHERE NULLIF(flight#>>'{departure,airport,icao}','') IS NOT NULL)::int AS origin_present,",
 "count(*) FILTER (WHERE flight#>>'{departure,airport,icao}'=$1)::int AS origin_matches,",
 "count(*) FILTER (WHERE NULLIF(flight#>>'{departure,scheduledTime,utc}','') IS NOT NULL)::int AS scheduled_present,",
 "count(*) FILTER (WHERE NULLIF(flight#>>'{departure,revisedTime,utc}','') IS NOT NULL)::int AS revised_present,",
 "count(*) FILTER (WHERE NULLIF(flight#>>'{departure,runwayTime,utc}','') IS NOT NULL)::int AS runway_present,",
 "count(*) FILTER (WHERE flight#>'{departure,quality}' IS NOT NULL)::int AS quality_present,",
 "count(*) FILTER (WHERE flight#>>'{departure,quality}'='Live'",
 "OR flight#>'{departure,quality}' @> '[\"Live\"]'::jsonb)::int AS quality_live_tagged",
 "FROM d"
].join(" ");
const FIELDS=["all_receipts","sampled_receipts","departure_rows","operator_rows",
 "marketing_rows","origin_present","origin_matches","scheduled_present",
 "revised_present","runway_present","quality_present","quality_live_tagged"] as const;
function n(row:Record<string,unknown>,key:string):number{
 const v=row[key];const num=typeof v==="number"?v:
  typeof v==="string"&&/^\d+$/.test(v)?Number(v):NaN;
 if(!Number.isSafeInteger(num)||num<0||num>20000)
  throw Error("P4_NATIVE_FIELD_INVALID_COUNTER:"+key);
 return num;
}
export async function auditP4OriginalNativeFieldPresenceV39(
 db:P4FreshReadOnlyDbV39,scope:P4FreshCohortScopeV39
){
 assertP4FreshCohortScopeV39(scope);
 const result=await db.query(P4_NATIVE_FIELD_SQL_V39,[
  scope.airportIcao,scope.serviceWindowStartUtc,
  scope.serviceWindowEndUtc,scope.readAsOfUtc
 ]);
 if(result.rows.length!==1||!result.rows[0]||
    typeof result.rows[0]!=="object"||Array.isArray(result.rows[0]))
  throw Error("P4_NATIVE_FIELD_SHAPE_HOLD");
 const row=result.rows[0] as Record<string,unknown>;
 const x=Object.fromEntries(FIELDS.map(k=>[k,n(row,k)])) as
  Record<typeof FIELDS[number],number>;
 const max=x.departure_rows;
 if(x.sampled_receipts>x.all_receipts||x.sampled_receipts>12||
  (x.sampled_receipts===0&&max>0)||
  [x.operator_rows,x.marketing_rows,x.origin_present,x.origin_matches,
   x.scheduled_present,x.revised_present,x.runway_present,x.quality_present,
   x.quality_live_tagged].some(z=>z>max)||
  x.operator_rows+x.marketing_rows>max||
  x.origin_matches>x.origin_present||
  x.quality_live_tagged>x.quality_present)
  throw Error("P4_NATIVE_FIELD_COUNTER_CONTRADICTION_HOLD");
 const original=x.sampled_receipts>0;
 const opt=(z:number)=>original?z:null;
 return {
  schema:P4_NATIVE_FIELD_SCHEMA_V39,
  status:original?"NATIVE_FIELDS_PRESENT_NOT_ACTUAL_ONLY_PROOF":
   "NO_RETAINED_ORIGINAL_FIELDS_UNKNOWN",
  airportIcao:scope.airportIcao,
  manifestSha256:scope.reviewedFrozenManifestSha256,
  eligibleOriginalReceipts:x.all_receipts,
  sampledOriginalReceipts:x.sampled_receipts,
  sampleTruncated:x.all_receipts>x.sampled_receipts,
  departureSourceObservations:opt(max),
  operatorTaggedObservations:opt(x.operator_rows),
  marketingTaggedObservations:opt(x.marketing_rows),
  codeshareUnknownObservations:opt(max-x.operator_rows-x.marketing_rows),
  explicitOriginPresent:opt(x.origin_present),
  explicitOriginMatches:opt(x.origin_matches),
  genericScheduledTimePresent:opt(x.scheduled_present),
  revisedTimePresent:opt(x.revised_present),
  runwayTimePresent:opt(x.runway_present),
  departureQualityPresent:opt(x.quality_present),
  liveQualityTagged:opt(x.quality_live_tagged),
  confirmedPhysicalOperatingFlights:null,
  verifiedScheduledRunwayT:null,
  verifiedActualWheelsOff:null,
  actualOutcomeRate:null,
  strictGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false,providerCalls:0,databaseWrites:0
 };
}
