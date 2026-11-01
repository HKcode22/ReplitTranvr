/**
 * Phase4 Gate5 metadata-only original/normalized source retention inventory.
 * Existing cohort only; caller must own a READ ONLY repeatable-read tx.
 * No original raw JSON bytes, IDs, provider calls, writes or expiry mutation.
 * Technical presence/expiry-marker data NEVER proves contractual permission,
 * backup/PITR deletion or currently verified actual-only flight labels.
 */
import {
 assertP4FreshCohortScopeV39,
 type P4FreshCohortScopeV39,type P4FreshReadOnlyDbV39
} from "./phase4Gate5FreshCohortReadOnly_v39";

export const P4_RETENTION_META_SCHEMA_V39 =
 "v39.phase4.gate5-original-retention-metadata-readonly.v1" as const;

export const P4_RETENTION_ORIGINAL_META_SQL_V39=[
 "SELECT count(*)::int AS receipts_seen,",
 "count(*) FILTER (WHERE raw_payload IS NOT NULL)::int AS raw_present,",
 "count(*) FILTER (WHERE raw_payload IS NULL)::int AS raw_absent,",
 "count(*) FILTER (WHERE raw_expired_at_utc IS NOT NULL)::int AS expiry_marked,",
 "count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_expired_at_utc IS NOT NULL)::int AS raw_with_expiry_marker,",
 "count(*) FILTER (WHERE raw_payload IS NULL AND raw_expired_at_utc IS NULL)::int AS no_raw_no_expiry_marker,",
 "count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_persisted_at_utc IS NULL)::int AS raw_without_persist_clock,",
 "count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_persisted_at_utc>available_at)::int AS persist_clock_after_available,",
 "count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_persisted_at_utc<=$4::timestamptz-interval '24 hours')::int AS raw_older_24h,",
 "count(*) FILTER (WHERE raw_payload IS NOT NULL AND raw_persisted_at_utc<=$4::timestamptz-interval '168 hours')::int AS raw_older_168h",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND available_at<=$4::timestamptz"
].join(" ");

export const P4_RETENTION_POPULATION_META_SQL_V39=[
 "SELECT count(*)::int AS population_rows_seen,",
 "count(*) FILTER (WHERE provider_content_expired_at_utc IS NOT NULL)::int AS population_marked_expired,",
 "count(*) FILTER (WHERE provider_content_expired_at_utc IS NULL",
 "AND available_at<=$4::timestamptz-interval '168 hours')::int AS population_unmarked_older_168h",
 "FROM clean.flight_population",
 "WHERE source_type='fids'",
 "AND source_airport_icao=$1",
 "AND window_start_utc=$2::timestamptz",
 "AND window_end_utc=$3::timestamptz",
 "AND available_at<=$4::timestamptz"
].join(" ");

const O=["receipts_seen","raw_present","raw_absent","expiry_marked",
 "raw_with_expiry_marker","no_raw_no_expiry_marker",
 "raw_without_persist_clock","persist_clock_after_available",
 "raw_older_24h","raw_older_168h"] as const;
const P=["population_rows_seen","population_marked_expired",
 "population_unmarked_older_168h"] as const;
function n(row:Record<string,unknown>,key:string):number{
 const v=row[key];
 const number=typeof v==="number"?v:
   typeof v==="string"&&/^\d+$/.test(v)?Number(v):NaN;
 if(!Number.isSafeInteger(number)||number<0||number>100000)
  throw Error("P4_RETENTION_META_INVALID_COUNTER:"+key);
 return number;
}
function single(result:{rows:unknown[]},why:string):Record<string,unknown>{
 if(result.rows.length!==1||!result.rows[0]||
    typeof result.rows[0]!=="object"||Array.isArray(result.rows[0]))
  throw Error("P4_RETENTION_META_BAD_RESULT:"+why);
 return result.rows[0] as Record<string,unknown>;
}
export async function auditP4OriginalRetentionMetadataV39(
 db:P4FreshReadOnlyDbV39,scope:P4FreshCohortScopeV39
){
 assertP4FreshCohortScopeV39(scope);
 const args=[scope.airportIcao,scope.serviceWindowStartUtc,
  scope.serviceWindowEndUtc,scope.readAsOfUtc];
 const a=single(await db.query(P4_RETENTION_ORIGINAL_META_SQL_V39,args),"original");
 const b=single(await db.query(P4_RETENTION_POPULATION_META_SQL_V39,args),"population");
 const o=Object.fromEntries(O.map(k=>[k,n(a,k)])) as Record<typeof O[number],number>;
 const p=Object.fromEntries(P.map(k=>[k,n(b,k)])) as Record<typeof P[number],number>;
 if(o.raw_present+o.raw_absent!==o.receipts_seen||
   o.expiry_marked>o.receipts_seen||
   o.raw_with_expiry_marker>o.expiry_marked||
   o.raw_with_expiry_marker>o.raw_present||
   o.no_raw_no_expiry_marker>o.raw_absent||
   o.no_raw_no_expiry_marker>o.receipts_seen-o.expiry_marked||
   [o.raw_without_persist_clock,o.persist_clock_after_available,
    o.raw_older_24h,o.raw_older_168h].some(v=>v>o.raw_present)||
   o.raw_older_168h>o.raw_older_24h||
   p.population_marked_expired>p.population_rows_seen||
   p.population_unmarked_older_168h>
    p.population_rows_seen-p.population_marked_expired)
  throw Error("P4_RETENTION_META_COUNTER_CONTRADICTION_HOLD");
 const hasReceipts=o.receipts_seen>0;
 return {
  schema:P4_RETENTION_META_SCHEMA_V39,
  status:hasReceipts?"TECHNICAL_RETENTION_METADATA_REVIEW_ONLY":
   "NO_SOURCE_RECEIPTS_RETAINED_OR_EVER_RECORDED_UNKNOWN",
  airportIcao:scope.airportIcao,
  reviewedFrozenManifestSha256:scope.reviewedFrozenManifestSha256,
  readAsOfUtc:scope.readAsOfUtc,
  originalReceiptMetadataRows:o.receipts_seen,
  originalPayloadPresent:hasReceipts?o.raw_present:null,
  originalPayloadAbsent:hasReceipts?o.raw_absent:null,
  originalExpiryMarkerRows:hasReceipts?o.expiry_marked:null,
  originalPayloadStillPresentWithExpiryMarker:hasReceipts?o.raw_with_expiry_marker:null,
  originalAbsentWithoutExpiryMarker:hasReceipts?o.no_raw_no_expiry_marker:null,
  originalPayloadWithoutPersistClock:hasReceipts?o.raw_without_persist_clock:null,
  originalPersistClockLaterThanAvailability:hasReceipts?o.persist_clock_after_available:null,
  originalPayloadOlderThan24hReviewCandidates:hasReceipts?o.raw_older_24h:null,
  originalPayloadOlderThan168hReviewCandidates:hasReceipts?o.raw_older_168h:null,
  normalizedPopulationMetadataRows:p.population_rows_seen,
  normalizedProviderContentExpiryMarkedRows:p.population_marked_expired,
  normalizedProviderContentUnmarkedOlderThan168hReviewCandidates:
   p.population_unmarked_older_168h,
  // Age is an inspection signal, NOT a license determination, legal
  // violation finding or proof that a specific payload is a "live cache".
  accountSpecificDataRightsVerified:false,
  legalClassificationByContentClassVerified:false,
  originalHttpCacheControlAuthenticated:false,
  databaseBackupPitrExpiryVerified:false,
  replicaAndLogExpiryVerified:false,
  providerNativeSelectedTVerified:false,
  verifiedActualOnlyWheelsOff:false,
  strictGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false,providerCalls:0,databaseWrites:0
 };
}
