/**
 * Scientific incident diagnostic: classify existing paid ORIGINAL availability
 * using persisted UTC TIMESTAMPTZ columns, NEVER a raw timestamp string regex.
 * Exact retired Nov6 WSSS T24 cohort only. No provider call, mutations or IDs.
 */
import pg from "pg";
const SHA="7fe022a475447a082e1ccddd3805a5ad554f03885401afb22ee283a2a1b90aed";
export const G5A_RETIRED_T24_ELIGIBILITY_SQL_V39=[
 "WITH originals AS (SELECT f.population_query_id,f.available_at",
 "AS original_at,f.raw_payload",
 "FROM clean.phase4_g5_fids_original_binding_v39 b",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 aq",
 " ON aq.query_digest=b.query_digest",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 ow",
 " ON ow.owner_digest=aq.owner_digest",
 " AND ow.manifest_sha256=b.manifest_sha256",
 "JOIN clean.fids_query_response f",
 " ON f.population_query_id=b.population_query_id",
 " AND f.response_hash=b.original_response_sha256",
 "WHERE b.manifest_sha256=$1 AND ow.horizon='T-24h'",
 " AND b.source_use_expires_at_utc>clock_timestamp()",
 " AND f.raw_expired_at_utc IS NULL),",
 "rows AS (SELECT p.codeshare_resolution_status,p.scope_classification,",
 "p.population_role,p.dep_scheduled_utc,p.available_at AS member_at,",
 "o.original_at,",
 "p.dep_scheduled_utc-interval '24 hours' AS pre_cutoff",
 "FROM originals o JOIN clean.flight_population p",
 " ON p.population_query_id=o.population_query_id",
 " WHERE p.response_hash IS NOT NULL",
 " AND p.population_role='requested_airport_primary'),",
 "native AS (SELECT x.item->'departure'->'scheduledTime'->>'utc' AS stamp",
 "FROM originals o CROSS JOIN LATERAL",
 "jsonb_array_elements(COALESCE(o.raw_payload->'departures',",
 "'[]'::jsonb)) x(item))",
 "SELECT (SELECT count(*)::int FROM originals) AS original_receipts,",
 "(SELECT count(*)::int FROM rows) AS normalized_primary_rows,",
 "(SELECT count(*)::int FROM rows",
 " WHERE codeshare_resolution_status='g5a_stable_provider_id_missing')",
 " AS idless_operator_provisional_rows,",
 "(SELECT count(*)::int FROM rows",
 " WHERE codeshare_resolution_status='g5a_stable_provider_id_missing'",
 " AND scope_classification IN ('confirmed_core','unknown')",
 " AND dep_scheduled_utc IS NOT NULL",
 " AND dep_scheduled_utc>=TIMESTAMPTZ '2026-11-06T09:00:00Z'",
 " AND dep_scheduled_utc<TIMESTAMPTZ '2026-11-06T10:00:00Z')",
 " AS idless_operating_in_window,",
 "(SELECT count(*)::int FROM rows",
 " WHERE codeshare_resolution_status='g5a_stable_provider_id_missing'",
 " AND scope_classification IN ('confirmed_core','unknown')",
 " AND dep_scheduled_utc IS NOT NULL",
 " AND dep_scheduled_utc>=TIMESTAMPTZ '2026-11-06T09:00:00Z'",
 " AND dep_scheduled_utc<TIMESTAMPTZ '2026-11-06T10:00:00Z'",
 " AND member_at<=pre_cutoff AND original_at<=pre_cutoff)",
 " AS source_asof_cutoff_qualified_idless_operators,",
 "(SELECT count(*)::int FROM rows",
 " WHERE codeshare_resolution_status='g5a_stable_provider_id_missing'",
 " AND (member_at>pre_cutoff OR original_at>pre_cutoff))",
 " AS original_or_member_after_cutoff,",
 "(SELECT min(pre_cutoff) FROM rows WHERE",
 " codeshare_resolution_status='g5a_stable_provider_id_missing')",
 " AS earliest_candidate_cutoff,",
 "(SELECT max(pre_cutoff) FROM rows WHERE",
 " codeshare_resolution_status='g5a_stable_provider_id_missing')",
 " AS latest_candidate_cutoff,",
 "(SELECT count(*)::int FROM native WHERE stamp LIKE '2026-11-06T%')",
 " AS native_timestamp_T_prefix,",
 "(SELECT count(*)::int FROM native WHERE stamp LIKE '2026-11-06 %')",
 " AS native_timestamp_space_prefix,",
 "(SELECT count(*)::int FROM native WHERE stamp IS NULL)",
 " AS native_timestamp_missing"
].join(" ");
export async function main(){
 const url=process.env.DATABASE_URL;
 if(!url)throw Error("G5A_READONLY_DATABASE_URL_REQUIRED");
 const db=new pg.Client({connectionString:url,
  connectionTimeoutMillis:10000,query_timeout:16000,
  options:"-c default_transaction_read_only=on",
  application_name:"g5a_asof_source_native_timestamp_readonly"});
 let tx=false;
 await db.connect();
 try {
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  const r=await db.query(G5A_RETIRED_T24_ELIGIBILITY_SQL_V39,[SHA]);
  await db.query("ROLLBACK");tx=false;
  if(r.rows.length!==1||Number(r.rows[0]?.original_receipts)!==1)
   throw Error("G5A_ORIGINAL_MISSING_OR_EXPIRED_HOLD");
  console.log(JSON.stringify({
   status:"G5A_RETIRED_T24_PERSISTED_UTC_CUTOFF_SOURCE_PROOF_ONLY",
   ...r.rows[0],providerCalls:0,databaseWrites:0,
   providerContentPrinted:false,
   historicalDataMutated:false,scientificGate5Passed:false
  }));
 }finally{
  if(tx)await db.query("ROLLBACK").catch(()=>{});
  await db.end().catch(()=>{});
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_cancelled_t24_cutoff_eligibility_readonly.ts"))
 void main().catch(()=>{
  console.error(JSON.stringify({
   status:"G5A_RETIRED_T24_ASOF_READONLY_HOLD",
   providerCalls:0,databaseWrites:0,providerContentPrinted:false
  }));
  process.exitCode=2;
 });
