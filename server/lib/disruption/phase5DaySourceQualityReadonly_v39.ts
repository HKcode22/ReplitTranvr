/**
 * Phase5 independent read-only daily source QA. Aggregates only; no flight IDs,
 * no raw Contents, no source payload, no provider API, no POST or label claims.
 * Requires a dedicated restricted AUDITOR pool with V0079 installed.
 */
import type {Pool} from "pg";
const HASH=/^[0-9a-f]{64}$/;
function refuse(reason:string):never{throw Error("REFUSED_P5_DAILY_QA_"+reason);}
function safeInt(v:unknown):number{
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<0)refuse("UNSAFE_COUNT");
 return n;
}
function validDate(v:unknown):string{
 const d=v instanceof Date?v:new Date(String(v));
 if(!Number.isFinite(d.getTime()))refuse("DB_CLOCK_UNKNOWN");
 return d.toISOString();
}
export const P5_DAILY_SOURCE_METRICS_SQL=[
 "SELECT q.slot_id,q.horizon,",
 "COUNT(*)::integer planned_queries,",
 "COUNT(a.reservation_sha256)::integer reserved_physical_gets,",
 "COUNT(b.population_query_id)::integer bound_originals,",
 "COUNT(*) FILTER(WHERE a.reservation_sha256 IS NULL AND",
 " q.hard_latest_dispatch_utc < $3::timestamptz)::integer missed_get_window,",
 "COUNT(*) FILTER(WHERE a.reservation_sha256 IS NULL AND",
 " q.hard_latest_dispatch_utc >= $3::timestamptz)::integer not_yet_due,",
 "COUNT(*) FILTER(WHERE a.reservation_sha256 IS NOT NULL AND",
 " b.population_query_id IS NULL AND",
 " q.prediction_cutoff_utc < $3::timestamptz)::integer reserved_without_original_after_cutoff,",
 "COUNT(*) FILTER(WHERE b.population_query_id IS NOT NULL AND",
 " r.available_at<=q.prediction_cutoff_utc)::integer source_bound_before_planned_cutoff,",
 "COUNT(*) FILTER(WHERE b.population_query_id IS NOT NULL AND",
 " r.available_at>q.prediction_cutoff_utc)::integer source_bound_late_to_planned_cutoff,",
 "COUNT(*) FILTER(WHERE b.population_query_id IS NOT NULL AND",
 " b.source_expires_at_utc <= $3::timestamptz)::integer source_rights_metadata_expired,",
 "COALESCE(SUM(p.members),0)::bigint population_observation_rows,",
 "COUNT(*) FILTER(WHERE q.state='ACTIVE')::integer active_query_rows,",
 "COUNT(*) FILTER(WHERE q.state='STOPPED')::integer stopped_query_rows",
 "FROM clean.phase5_fids_allowed_query_v39 q",
 "LEFT JOIN clean.phase5_fids_physical_attempt_v39 a ON a.query_digest=q.query_digest",
 "LEFT JOIN clean.phase5_fids_original_binding_v39 b ON b.reservation_sha256=a.reservation_sha256",
 "LEFT JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id",
 "LEFT JOIN LATERAL(",
 " SELECT COUNT(*)::integer members FROM clean.flight_population fp",
 " WHERE fp.population_query_id=b.population_query_id",
 ") p ON true",
 "WHERE q.manifest_sha256=$1 AND q.run_day_index=$2",
 "GROUP BY q.slot_id,q.horizon",
 "ORDER BY q.slot_id,q.horizon",
].join(" ");
const BUDGET_SQL=[
 "SELECT c.cycle_api_ceiling,c.other_category_reserved_units,",
 "c.protected_api_floor_units,c.physically_reserved_units,",
 "d.daily_api_ceiling,d.daily_other_reserved_units,",
 "d.daily_source_reserved_units,d.budget_day_utc",
 "FROM clean.phase5_fids_cycle_budget_v39 c",
 "JOIN clean.phase5_fids_day_budget_v39 d USING(manifest_sha256)",
 "WHERE d.manifest_sha256=$1 AND d.run_day_index=$2",
].join(" ");
const DRAW_SQL=[
 "SELECT COUNT(*)::integer draw_rows,",
 "COUNT(DISTINCT slot_id)::integer distinct_slots,",
 "COUNT(DISTINCT selected_icao)::integer distinct_airports",
 "FROM clean.adb_sampling_draw WHERE run_day_index=$1",
].join(" ");
/**
 * Candidate PRE denominator from the exact bound source-original lineage.
 * persistPreSnapshot() writes population_query_id as text but does not
 * supply the optional population_member_id UUID; a B0062 BEFORE INSERT
 * trigger fills the UUID only when it can positively match a primary member.
 * An inner join through that optional ID silently excludes unmatched PRE
 * observations from the audit and cannot expose their missing lineage.
 * Join the committed V0079 original binding by explicit query UUID::text,
 * filter the canonical PRE_DEPARTURE state, and never count a clock-order
 * candidate whose source arrived after its own per-flight cutoff.
 * A clock-order candidate is NOT an independently verified physical leg/T or
 * permission to retain source Content; final scientific PRE remains HOLD.
 */
export const P5_DAILY_PRE_SNAPSHOT_CANDIDATE_SQL=[
 "SELECT s.horizon,COUNT(DISTINCT s.id)::integer snapshots_seen,",
 "COUNT(DISTINCT s.id) FILTER (WHERE",
 " s.created_at<=s.prediction_cutoff_utc",
 " AND s.selected_t_milestone_utc IS NOT NULL",
 " AND s.selected_t_version IS NOT NULL",
 " AND s.fids_response_hash=r.response_hash",
 " AND s.fids_response_hash=b.response_hash",
 " AND r.available_at<=s.prediction_cutoff_utc",
 " AND s.created_at<b.source_expires_at_utc",
 " AND EXISTS (SELECT 1 FROM clean.flight_population fp",
 " WHERE fp.population_query_id=b.population_query_id",
 " AND fp.canonical_flight_instance_id=s.flight_instance_id",
 " AND fp.source_type='fids'",
 " AND fp.population_role='requested_airport_primary'",
 " AND fp.source_airport_icao=q.airport_icao",
 " AND fp.response_hash=r.response_hash",
 " AND fp.available_at<=s.prediction_cutoff_utc)",
 ")::integer clock_order_candidate_pre",
 "FROM clean.flight_snapshots s",
 "JOIN clean.phase5_fids_original_binding_v39 b",
 " ON b.population_query_id::text=s.population_query_id",
 "JOIN clean.phase5_fids_allowed_query_v39 q",
 " ON q.query_digest=b.query_digest",
 " AND q.manifest_sha256=b.manifest_sha256",
 " AND q.horizon=s.horizon",
 "JOIN clean.fids_query_response r",
 " ON r.population_query_id=b.population_query_id",
 " AND r.source_airport_icao=q.airport_icao",
 "WHERE s.prediction_state='PRE_DEPARTURE'",
 " AND q.manifest_sha256=$1 AND q.run_day_index=$2",
 "GROUP BY s.horizon",
].join(" ");

export interface Phase5DayQualityRow {
 slot:string;horizon:string;plannedQueries:number;
 reservedPhysicalGets:number;boundOriginals:number;
 missedGetWindow:number;notYetDue:number;
 reservedWithoutOriginalAfterCutoff:number;
 sourceBoundBeforePlannedCutoff:number;sourceBoundLateToPlannedCutoff:number;
 sourceRightsMetadataExpired:number;populationObservationRows:number;
 activeQueryRows:number;stoppedQueryRows:number;
}
export interface Phase5DaySourceQualityResult {
 schema:"v39.phase5.daily-source-quality-readonly.v1";
 status:"AUDIT_ONLY_NOT_PHASE5_FREEZE_OR_PHASE6_GO";
 asOfUtc:string;
 runDayIndex:number;manifestSha256:string;
 sourceQueryGroups:Phase5DayQualityRow[];
 budget:{
  cycleApiCeiling:number;otherCategoryReservedUnits:number;
  protectedApiFloorUnits:number;physicallyReservedUnits:number;
  dailyApiCeiling:number;dailyOtherReservedUnits:number;
  dailySourceReservedUnits:number;
 };
 earlySample:{drawRows:number;distinctSlots:number;distinctAirports:number};
 preCandidateSnapshots:{horizon:string;rowsSeen:number;clockOrderCandidates:number}[];
 totalPlannedQueries:number;
 totalBoundOriginals:number;
 actualFlightLevelPreCertified:false;
 providerRawContentsRead:false;
 storedProviderRawContentsExported:false;
 providerCalls:0;databaseWrites:0;
}

/** Independent metadata-only repeatable-read transaction. */
export async function auditPhase5SourceDay(
 pool:Pick<Pool,"connect">,manifestSha256:string,day:number,
):Promise<Phase5DaySourceQualityResult>{
 if(!HASH.test(manifestSha256)||!Number.isInteger(day)||day<1||day>31)
  refuse("UNSIGNED_MANIFEST_OR_DAY");
 const client=await pool.connect();
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  const clock=await client.query("SELECT clock_timestamp() AS at");
  if(clock.rowCount!==1)refuse("DB_CLOCK_MISSING");
  const asOfUtc=validDate(clock.rows[0].at);
  const [budget,rows,draw,pre]=await Promise.all([
   // A single PG client serializes queries, and the repeatable-read snapshot
   // prevents intermediate source/attempt rows from changing between reads.
   client.query(BUDGET_SQL,[manifestSha256,day]),
   client.query(P5_DAILY_SOURCE_METRICS_SQL,[manifestSha256,day,asOfUtc]),
   client.query(DRAW_SQL,[day]),
   client.query(P5_DAILY_PRE_SNAPSHOT_CANDIDATE_SQL,[manifestSha256,day]),
  ]);
  if(budget.rowCount!==1)refuse("DAY_BUDGET_NOT_INSTALLED_OR_FROZEN");
  if(rows.rows.length===0)refuse("NO_SIGNED_SOURCE_QUERY_DENOMINATOR");
  if(rows.rows.length>12)refuse("UNEXPECTED_DAY_SLOT_HORIZON_GROUPS");
  if(draw.rowCount!==1)refuse("EARLY_SELECTION_NOT_READABLE");
  const groups:Phase5DayQualityRow[]=rows.rows.map((r:any)=>({
   slot:String(r.slot_id),horizon:String(r.horizon),
   plannedQueries:safeInt(r.planned_queries),
   reservedPhysicalGets:safeInt(r.reserved_physical_gets),
   boundOriginals:safeInt(r.bound_originals),
   missedGetWindow:safeInt(r.missed_get_window),
   notYetDue:safeInt(r.not_yet_due),
   reservedWithoutOriginalAfterCutoff:safeInt(r.reserved_without_original_after_cutoff),
   sourceBoundBeforePlannedCutoff:safeInt(r.source_bound_before_planned_cutoff),
   sourceBoundLateToPlannedCutoff:safeInt(r.source_bound_late_to_planned_cutoff),
   sourceRightsMetadataExpired:safeInt(r.source_rights_metadata_expired),
   populationObservationRows:safeInt(r.population_observation_rows),
   activeQueryRows:safeInt(r.active_query_rows),
   stoppedQueryRows:safeInt(r.stopped_query_rows),
  }));
  const b=budget.rows[0],d=draw.rows[0];
  const result:Phase5DaySourceQualityResult={
   schema:"v39.phase5.daily-source-quality-readonly.v1",
   status:"AUDIT_ONLY_NOT_PHASE5_FREEZE_OR_PHASE6_GO",
   asOfUtc,runDayIndex:day,manifestSha256,sourceQueryGroups:groups,
   budget:{
    cycleApiCeiling:safeInt(b.cycle_api_ceiling),
    otherCategoryReservedUnits:safeInt(b.other_category_reserved_units),
    protectedApiFloorUnits:safeInt(b.protected_api_floor_units),
    physicallyReservedUnits:safeInt(b.physically_reserved_units),
    dailyApiCeiling:safeInt(b.daily_api_ceiling),
    dailyOtherReservedUnits:safeInt(b.daily_other_reserved_units),
    dailySourceReservedUnits:safeInt(b.daily_source_reserved_units),
   },
   earlySample:{
    drawRows:safeInt(d.draw_rows),
    distinctSlots:safeInt(d.distinct_slots),
    distinctAirports:safeInt(d.distinct_airports),
   },
   preCandidateSnapshots:pre.rows.map((r:any)=>({
    horizon:String(r.horizon),
    rowsSeen:safeInt(r.snapshots_seen),
    clockOrderCandidates:safeInt(r.clock_order_candidate_pre),
   })),
   totalPlannedQueries:groups.reduce((n,r)=>n+r.plannedQueries,0),
   totalBoundOriginals:groups.reduce((n,r)=>n+r.boundOriginals,0),
   actualFlightLevelPreCertified:false,
   providerRawContentsRead:false,
   storedProviderRawContentsExported:false,
   providerCalls:0,databaseWrites:0,
  };
  await client.query("COMMIT");tx=false;
  return result;
 }catch(error){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  throw error;
 }finally{client.release();}
}
