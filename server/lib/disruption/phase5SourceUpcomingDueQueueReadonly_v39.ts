/**
 * Phase5 actual V0079 source queue observer. Reads already prepared SQL
 * metadata; never prepares a row, invokes provider, dispatches an Action,
 * prearms a query, calls an Alert, or assigns an adaptive airport.
 *
 * This is the safe scheduled READINESS half of an eventual unattended
 * collector. Its positive QUEUED result is NOT a permission to make a GET:
 * the separate signed paid release, V0082 7 REST categories, current
 * provider range/rights, query receipt and source role must still pass.
 *
 * Uses ONLY existing Stage26 SOURCE SELECT permissions. In particular the
 * SOURCE group has no direct SELECT grant on V0082 partition/cap ledgers
 * and no direct INSERT on physical-attempt table; never add grants here.
 */
import type {Pool} from "pg";
import {P5_STAGE28_GROUPS}
 from "./phase5Stage28DedicatedRolePool_v39";
const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MAX_ROWS=700;
const MIN_LEAD_MS=15*60_000;
const MAX_LEAD_MS=105*60_000;
function hold(why:string):never{
 throw Error("REFUSED_P5_SOURCE_DUE_QUEUE_"+why);
}
function time(raw:unknown,name:string):number{
 const d=raw instanceof Date?raw:typeof raw==="string"?new Date(raw):null;
 if(!d||!Number.isFinite(d.getTime()))hold("INVALID_"+name);
 return d.getTime();
}
function strictSha(x:unknown):x is string{
 return typeof x==="string"&&SHA.test(x);
}
export type P5SourceDueQueueStatus=
 "DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH"|
 "TOO_EARLY_FOR_REVIEWED_PREARM"|
 "TOO_LATE_FOR_SAFE_SCHEDULED_DISPATCH"|
 "MISSED_DISPATCH_CUTOFF_NO_BACKFILL"|
 "PREARMED_OR_RESERVED_REQUIRES_SEPARATE_READBACK"|
 "ALREADY_STOPPED_NO_DISPATCH";
export interface P5SourceQueueMetadataRow{
 query_digest:string;
 manifest_sha256:string;
 run_day_index:number|string;
 query_key:string;slot_id:string;horizon:string;airport_icao:string;
 state:string;github_run_id:string;
 early_draw_sha256:string;rights_review_sha256:string;
 reviewed_release_sha256:string;provider_contract_sha256:string;
 planned_dispatch_utc:Date|string;hard_latest_dispatch_utc:Date|string;
 prediction_cutoff_utc:Date|string;
 api_units_per_attempt:number|string;max_physical_attempts:number|string;
 existing_attempt_sha256:string|null;
 existing_prearm_sha256:string|null;
 existing_original_population_query_id:string|null;
}
export interface P5SourceUpcomingQueueScope{
 expectedManifestSha256:string;
 expectedReleaseSha256:string;
 expectedRightsSha256:string;
 expectedProviderContractSha256:string;
 expectedSourceRole:typeof P5_STAGE28_GROUPS.source;
}
export interface P5SourceUpcomingCandidate{
 queryDigestSha256:string;runDayIndex:number;
 slot:string;horizon:string;selectedAirportIcao:string;
 plannedDispatchUtc:string;latestDispatchUtc:string;
 status:P5SourceDueQueueStatus;
}
export const P5_SOURCE_UPCOMING_METADATA_SQL=[
 "SELECT q.query_digest,q.manifest_sha256,q.run_day_index,",
 "q.query_key,q.slot_id,q.horizon,q.airport_icao,",
 "q.state,q.github_run_id,q.early_draw_sha256,",
 "q.rights_review_sha256,q.reviewed_release_sha256,",
 "q.provider_contract_sha256,q.planned_dispatch_utc,",
 "q.hard_latest_dispatch_utc,q.prediction_cutoff_utc,",
 "q.api_units_per_attempt,q.max_physical_attempts,",
 "a.reservation_sha256 AS existing_attempt_sha256,",
 "g.prearm_sha256 AS existing_prearm_sha256,",
 "b.population_query_id::text AS existing_original_population_query_id",
 "FROM clean.phase5_fids_allowed_query_v39 q",
 "LEFT JOIN clean.phase5_fids_physical_attempt_v39 a",
 " ON a.query_digest=q.query_digest AND a.manifest_sha256=q.manifest_sha256",
 "LEFT JOIN clean.phase5_fids_github_prearm_v39 g",
 " ON g.query_digest=q.query_digest AND g.manifest_sha256=q.manifest_sha256",
 "LEFT JOIN clean.phase5_fids_original_binding_v39 b",
 " ON b.query_digest=q.query_digest AND b.manifest_sha256=q.manifest_sha256",
 "WHERE q.manifest_sha256=$1",
 "AND q.planned_dispatch_utc>=($2::timestamptz - interval '3 hours')",
 "AND q.planned_dispatch_utc<($2::timestamptz + interval '2 hours')",
 "ORDER BY q.planned_dispatch_utc,q.run_day_index,q.slot_id,q.horizon,q.query_digest",
 "LIMIT 701"
].join(" ");
export function classifyP5SignedUpcomingSourceQueue(
 rows:readonly P5SourceQueueMetadataRow[],
 scope:P5SourceUpcomingQueueScope,
 dbClockUtc:Date|string
){
 if(!scope||![scope.expectedManifestSha256,
    scope.expectedReleaseSha256,scope.expectedRightsSha256,
    scope.expectedProviderContractSha256].every(strictSha)||
    scope.expectedSourceRole!==P5_STAGE28_GROUPS.source||
    !Array.isArray(rows)||rows.length>MAX_ROWS)
  hold("UNREVIEWED_MANIFEST_OR_UNBOUNDED_QUERY_COUNT");
 const now=time(dbClockUtc,"DATABASE_CLOCK");
 const seen=new Set<string>();
 const candidates:P5SourceUpcomingCandidate[]=[];
 for(const r of rows){
  if(!r||!strictSha(r.query_digest)||
     !strictSha(r.manifest_sha256)||
     r.manifest_sha256!==scope.expectedManifestSha256||
     r.reviewed_release_sha256!==scope.expectedReleaseSha256||
     r.rights_review_sha256!==scope.expectedRightsSha256||
     r.provider_contract_sha256!==scope.expectedProviderContractSha256||
     !strictSha(r.early_draw_sha256)||
     !Number.isSafeInteger(Number(r.run_day_index))||
     Number(r.run_day_index)<1||Number(r.run_day_index)>31||
     !/^[-A-Za-z0-9_:]{8,200}$/.test(r.query_key??"")||
     !["HUB","MID_A","MID_B","REGIONAL"].includes(r.slot_id)||
     !["T-24h","T-6h","T-90m"].includes(r.horizon)||
     !/^[A-Z]{4}$/.test(r.airport_icao??"")||
     Number(r.api_units_per_attempt)!==2||
     Number(r.max_physical_attempts)!==1||
     !["PREPARED","ACTIVE","STOPPED"].includes(r.state)||
     !/^(?:00000|[0-9]{5,25})$/.test(r.github_run_id??"")||
     seen.has(r.query_digest))
    hold("ALTERED_QUERY_SCOPE_OR_DUPLICATE_SOURCE_DIGEST");
  seen.add(r.query_digest);
  const planned=time(r.planned_dispatch_utc,"PLANNED_DISPATCH"),
    hard=time(r.hard_latest_dispatch_utc,"HARD_LATEST_DISPATCH"),
    cutoff=time(r.prediction_cutoff_utc,"SOURCE_PRE_CUTOFF");
  if(!(planned<hard&&hard<cutoff)||
     planned+120000>=cutoff)
    hold("INVALID_OR_LATE_PRE_CUTOFF_GEOMETRY");
  const hadAttempt=r.existing_attempt_sha256!==null,
    hadPrearm=r.existing_prearm_sha256!==null,
    hadOriginal=r.existing_original_population_query_id!==null;
  if((hadAttempt&&(!strictSha(r.existing_attempt_sha256)))||
     (hadPrearm&&!strictSha(r.existing_prearm_sha256))||
     (hadOriginal&&!/^[0-9a-f-]{36}$/i.test(
       r.existing_original_population_query_id??"")))
    hold("INVALID_PERSISTED_ATTEMPT_OR_ORIGINAL_METADATA");
  let status:P5SourceDueQueueStatus;
  if(r.state==="STOPPED")status="ALREADY_STOPPED_NO_DISPATCH";
  else if(r.state!=="PREPARED"||
     r.github_run_id!=="00000"||hadAttempt||hadPrearm||hadOriginal)
    status="PREARMED_OR_RESERVED_REQUIRES_SEPARATE_READBACK";
  else if(now>=hard)
    status="MISSED_DISPATCH_CUTOFF_NO_BACKFILL";
  else if(planned-now<MIN_LEAD_MS)
    status="TOO_LATE_FOR_SAFE_SCHEDULED_DISPATCH";
  else if(planned-now>MAX_LEAD_MS)
    status="TOO_EARLY_FOR_REVIEWED_PREARM";
  else status="DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH";
  candidates.push({
   queryDigestSha256:r.query_digest,
   runDayIndex:Number(r.run_day_index),
   slot:r.slot_id,horizon:r.horizon,
   selectedAirportIcao:r.airport_icao,
   plannedDispatchUtc:new Date(planned).toISOString(),
   latestDispatchUtc:new Date(hard).toISOString(),status
  });
 }
 return {
  schema:"v39.phase5.source-upcoming-queue-readonly.v1" as const,
  status:"METADATA_ONLY_NOT_AN_AUTOMATIC_PAID_DISPATCH" as const,
  dbClockUtc:new Date(now).toISOString(),
  manifestSha256:scope.expectedManifestSha256,
  observedQueries:candidates.length,
  requiresIndependentDynamicQueryByteSignature:true as const,
  sourceRangeAndSevenRestCategoriesNotCertifiedHere:true as const,
  sourceUseAndRetentionNotCertifiedHere:true as const,
  providerCalls:0 as const,dbWrites:0 as const,
  paidGetDispatched:false as const,phase5FreezeCertified:false as const,
  phase6GoGrantedHere:false as const,
  candidates
 };
}
export async function auditP5UpcomingSourceQueue(
 pool:Pick<Pool,"connect">,scope:P5SourceUpcomingQueueScope
){
 if(!pool||typeof pool.connect!=="function")
  hold("NO_EXISTING_SOURCE_ROLE_POOL");
 const client=await pool.connect();
 let tx=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const z=await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now"
  );
  const who=z.rows[0];
  if(z.rowCount!==1||who?.db!=="neondb"||
     who.actor!==P5_STAGE28_GROUPS.source||
     who.actor!==scope?.expectedSourceRole||
     who.ro!=="on"||who.replica!==false)
    hold("UNREVIEWED_SOURCE_ROLE_OR_WRITABLE_DATABASE");
  const list=await client.query(
   P5_SOURCE_UPCOMING_METADATA_SQL,[scope.expectedManifestSha256,who.now]
  );
  const result=classifyP5SignedUpcomingSourceQueue(
   list.rows as P5SourceQueueMetadataRow[],scope,who.now);
  await client.query("COMMIT");tx=false;
  return result;
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{client.release();}
}
