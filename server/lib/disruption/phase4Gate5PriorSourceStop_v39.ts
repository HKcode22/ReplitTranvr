/**
 * G5A November 4 emergency no-provider protection.
 * When the frozen T-24h horizon has ZERO original-bound observations or
 * ZERO prospective PRE, subsequent paid horizons/POST cannot establish
 * a complete three-horizon cohort. Stop BEFORE staging/reserving a new
 * physical attempt; never replay, reset, backfill, or delete prior ledgers.
 * A SQL error is a refusal, not permission to proceed.
 */
export const G5A_PRIOR_T24_PROVENANCE_SQL_V39=[
 "SELECT",
 "(SELECT count(DISTINCT b.population_query_id)::int",
 " FROM clean.phase4_g5_fids_physical_owner_v39 o",
 " JOIN clean.phase4_g5_fids_allowed_query_v39 q ON q.owner_digest=o.owner_digest",
 " JOIN clean.phase4_g5_fids_physical_attempt_v39 a ON a.query_digest=q.query_digest",
 " JOIN clean.phase4_g5_fids_original_binding_v39 b ON b.expected_reservation_sha256=a.expected_reservation_sha256",
 " WHERE o.manifest_sha256=$1 AND o.horizon='T-24h') AS bound_originals,",
 "(SELECT count(*)::int",
 " FROM clean.flight_snapshots s",
 " WHERE s.frame_hash=$1 AND s.horizon='T-24h'",
 " AND s.prediction_state='PRE_DEPARTURE'",
 " AND s.created_at<=s.prediction_cutoff_utc",
 " AND s.fids_response_hash IS NOT NULL) AS ontime_pre"
].join(" ");

export function assessG5AT24PreconditionV39(rows:readonly Record<string,unknown>[]){
 if(!Array.isArray(rows)||rows.length!==1)
  throw Error("P4_G5_G5A_T24_SOURCE_PRE_CATALOG_INVALID_HOLD");
 const r=rows[0];
 const valid=(x:unknown)=>{
  const n=typeof x==="number"?x:
   typeof x==="string"&&/^\d+$/.test(x)?Number(x):NaN;
  if(!Number.isSafeInteger(n)||n<0||n>100000)
   throw Error("P4_G5_G5A_T24_SOURCE_PRE_COUNTS_INVALID_HOLD");
  return n;
 };
 const originals=valid(r.bound_originals),pre=valid(r.ontime_pre);
 return {originals,pre,allowPaidContinuation:originals>0&&pre>0};
}
