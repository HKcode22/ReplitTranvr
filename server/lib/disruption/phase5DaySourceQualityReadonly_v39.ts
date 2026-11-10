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


/**
 * Day-1/readiness interpretation of the EXISTING restricted, read-only
 * V0079 source audit. This does NOT dispatch, cancel, STOP an Alert, or
 * authorize any paid request. A safety HOLD is a recommendation to the
 * independently authorized STOP owner; never a self-granted provider action.
 *
 * Missing a paid query, a provider original, or a later optional feature
 * changes denominators/censoring. It must never be silently converted to
 * a valid negative outcome or retrospective PRE. Hard budget / inconsistent
 * source-ledger proof instead refuses further acquisition review.
 */
export type P5Day1SourceReviewDisposition=
 "HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH"|
 "FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD"|
 "SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING"|
 "SOURCE_ATTEMPTS_NOT_MATURE_NO_OUTCOME_INFERENCE"|
 "DESCRIPTIVE_SOURCE_PROGRESS_NOT_SCIENCE_PASS";

export function assessP5Day1SourceSafetyFromReadonlyAudit(
 audit:Phase5DaySourceQualityResult
){
 const strictCount=(n:unknown,label:string):number=>{
  if(typeof n!=="number"||!Number.isSafeInteger(n)||n<0)
   refuse("DAY1_INVALID_"+label);
  return n;
 };
 if(!audit||
    audit.schema!=="v39.phase5.daily-source-quality-readonly.v1"||
    audit.status!=="AUDIT_ONLY_NOT_PHASE5_FREEZE_OR_PHASE6_GO"||
    !HASH.test(audit.manifestSha256??"")||
    !Number.isInteger(audit.runDayIndex)||
    audit.runDayIndex<1||audit.runDayIndex>31||
    !Array.isArray(audit.sourceQueryGroups)||
    audit.sourceQueryGroups.length<1||
    audit.sourceQueryGroups.length>12||
    !Array.isArray(audit.preCandidateSnapshots)||
    audit.providerCalls!==0||audit.databaseWrites!==0||
    audit.actualFlightLevelPreCertified!==false||
    audit.providerRawContentsRead!==false||
    audit.storedProviderRawContentsExported!==false)
  refuse("DAY1_READONLY_AUDIT_NOT_AUTHENTICATED");
 const asOf=validDate(audit.asOfUtc);
 if(asOf!==audit.asOfUtc)
  refuse("DAY1_AUDIT_TIME_NOT_CANONICAL_UTC");
 for(const [label,value] of Object.entries(audit.budget??{}))
  strictCount(value,"BUDGET_"+label);
 for(const [label,value] of Object.entries(audit.earlySample??{}))
  strictCount(value,"DRAW_"+label);
 strictCount(audit.totalPlannedQueries,"TOTAL_PLANNED");
 strictCount(audit.totalBoundOriginals,"TOTAL_BOUND");
 const ledgerHolds:string[]=[],qualityFlags:string[]=[];
 const totals={
  plannedQueries:0,reservedPhysicalGets:0,boundOriginals:0,
  missedGetWindow:0,notYetDue:0,
  reservedWithoutOriginalAfterCutoff:0,
  boundLateToPlannedCutoff:0,
  sourceRightsMetadataExpired:0,
  preRowsSeen:0,preClockOrderCandidates:0
 };
 const seen=new Set<string>();
 for(const g of audit.sourceQueryGroups){
  if(!g||!["HUB","MID_A","MID_B","REGIONAL"].includes(g.slot)||
     !["T-24h","T-6h","T-90m"].includes(g.horizon)||
     seen.has(g.slot+"|"+g.horizon))
   refuse("DAY1_DUPLICATE_OR_CHANGED_SLOT_HORIZON");
  seen.add(g.slot+"|"+g.horizon);
  for(const [label,value] of Object.entries(g))
   if(label!=="slot"&&label!=="horizon")
    strictCount(value,"GROUP_"+label);
  totals.plannedQueries+=g.plannedQueries;
  totals.reservedPhysicalGets+=g.reservedPhysicalGets;
  totals.boundOriginals+=g.boundOriginals;
  totals.missedGetWindow+=g.missedGetWindow;
  totals.notYetDue+=g.notYetDue;
  totals.reservedWithoutOriginalAfterCutoff+=
   g.reservedWithoutOriginalAfterCutoff;
  totals.boundLateToPlannedCutoff+=g.sourceBoundLateToPlannedCutoff;
  totals.sourceRightsMetadataExpired+=g.sourceRightsMetadataExpired;
  if(g.reservedPhysicalGets>g.plannedQueries||
     g.boundOriginals>g.reservedPhysicalGets||
     g.missedGetWindow+g.notYetDue!==
       g.plannedQueries-g.reservedPhysicalGets||
     g.sourceBoundBeforePlannedCutoff+
       g.sourceBoundLateToPlannedCutoff!==g.boundOriginals||
     g.reservedWithoutOriginalAfterCutoff>
       g.reservedPhysicalGets-g.boundOriginals||
     g.sourceRightsMetadataExpired>g.boundOriginals||
     g.activeQueryRows+g.stoppedQueryRows>g.plannedQueries)
   ledgerHolds.push("SOURCE_QUERY_RESERVATION_OR_ORIGINAL_COUNTER_CONTRADICTION");
 }
 if(totals.plannedQueries!==audit.totalPlannedQueries||
    totals.boundOriginals!==audit.totalBoundOriginals)
  ledgerHolds.push("AGGREGATED_SOURCE_TOTALS_DRIFT");
 const seenH=new Set<string>();
 for(const p of audit.preCandidateSnapshots){
  if(!p||!["T-24h","T-6h","T-90m"].includes(p.horizon)||
     seenH.has(p.horizon))
   refuse("DAY1_CHANGED_OR_DUPLICATE_PRE_HORIZON");
  seenH.add(p.horizon);
  strictCount(p.rowsSeen,"PRE_SEEN");
  strictCount(p.clockOrderCandidates,"PRE_CLOCK_ORDER");
  totals.preRowsSeen+=p.rowsSeen;
  totals.preClockOrderCandidates+=p.clockOrderCandidates;
  if(p.clockOrderCandidates>p.rowsSeen)
   ledgerHolds.push("PRE_CANDIDATE_MORE_THAN_OBSERVED_SNAPSHOTS");
 }
 const b=audit.budget;
 if(!b||b.dailySourceReservedUnits+b.dailyOtherReservedUnits>
       b.dailyApiCeiling||
    b.physicallyReservedUnits+b.otherCategoryReservedUnits+
       b.protectedApiFloorUnits>b.cycleApiCeiling)
  ledgerHolds.push("PROJECT_OR_PHYSICAL_UTC_DAY_REST_BUDGET_EXCEEDED");
 const d=audit.earlySample;
 if(!d||
    d.drawRows!==4||d.distinctSlots!==4||d.distinctAirports!==4)
  ledgerHolds.push("FOUR_AIRPORT_DRAW_NOT_RECONCILED");
 if(totals.missedGetWindow>0)
  qualityFlags.push("MISSED_PAID_GET_WINDOWS_CANNOT_BACKFILL");
 if(totals.reservedWithoutOriginalAfterCutoff>0)
  qualityFlags.push("RESERVED_WITHOUT_ORIGINAL_AFTER_CUTOFF");
 if(totals.boundLateToPlannedCutoff>0)
  qualityFlags.push("LATE_BOUND_ORIGINAL_EXCLUDE_FROM_OWN_PRE");
 if(totals.sourceRightsMetadataExpired>0)
  qualityFlags.push("EXPIRED_SOURCE_NOT_AVAILABLE_FOR_FURTHER_USE");
 if(totals.preRowsSeen>totals.preClockOrderCandidates)
  qualityFlags.push("PRE_CANDIDATE_CLOCK_OR_PROVENANCE_LOSS");
 const hard=ledgerHolds.some(x=>
  x!=="FOUR_AIRPORT_DRAW_NOT_RECONCILED");
 const status:P5Day1SourceReviewDisposition=hard?
  "HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH":
  ledgerHolds.length?
  "FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD":
  qualityFlags.length?
  "SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING":
  totals.reservedPhysicalGets===0?
  "SOURCE_ATTEMPTS_NOT_MATURE_NO_OUTCOME_INFERENCE":
  "DESCRIPTIVE_SOURCE_PROGRESS_NOT_SCIENCE_PASS";
 return{
  schema:"v39.phase5.day1-source-safety-review-only.v1" as const,
  status,asOfUtc:audit.asOfUtc,
  manifestSha256:audit.manifestSha256,
  runDayIndex:audit.runDayIndex,
  hardHolds:[...new Set(ledgerHolds)],
  measuredSourceLoss:[...new Set(qualityFlags)],
  sourceTotals:totals,
  missingSourceMeansNegativeOutcome:false as const,
  lateOriginalMayBackfillPre:false as const,
  successfulPreCertifiedByCounters:false as const,
  optionalAdsbOrWeatherMissingMustBlockPre:false as const,
  independentStopOrContinueAuthorizedByThisFunction:false as const,
  scientificPhase5FreezeGranted:false as const,
  paidPhase6GoGranted:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
