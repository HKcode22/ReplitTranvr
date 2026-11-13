/**
 * Independent, fresh-connection, strictly READ ONLY comparison of the
 * already-staged B0062 calendar and V0093 COST_UPPER_BOUND REST budget
 * against a separately reviewed exact input packet.
 *
 * This does not commission roles, stage data, trigger FIDS, authorize Phase6,
 * inspect paid source bodies, or authenticate independent human signatures.
 * A SHA or caller assertion is not a source-use or science GO decision.
 */
import {compileP5V0093CostOnlySevenRestReview} from
 "./phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs";

const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const SEVEN=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
];
const deny=code=>{throw Error("HOLD_P5_V0093_INDEPENDENT_EXACT_RO_"+code);};
const i=(x)=>Number.isSafeInteger(Number(x))?Number(x):NaN;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const stamp=x=>{
 const date=new Date(x);
 return Number.isFinite(date.getTime())?date.toISOString():null;
};
const utcDate=x=>{
 const iso=stamp(x);
 return iso?.slice(0,10)??null;
};
function exactSlots(got,want,paired){
 if((got===null)!==(want===null))return false;
 if(got===null)return !paired;
 if(!got||typeof got!=="object"||Array.isArray(got)||
   Object.keys(got).length!==4)return false;
 return SLOTS.every(slot=>{
  const value=got[slot],expected=want[slot];
  return paired?
    value&&expected&&typeof value==="object"&&
     Object.keys(value).length===2&&
     value.icao===expected.icao&&value.region===expected.region:
    typeof value==="string"&&value===expected;
 });
}
const baseTables=[
 "clean.adb_sampling_draw",
 "clean.phase5_fids_day_budget_v39",
 "clean.phase5_fids_allowed_query_v39",
 "clean.phase5_fids_exact_query_partition_v39",
 "clean.phase5_fids_physical_attempt_v39"
];

export async function inspectP5V0093IndependentExactPostStage(
 pool,stagingInput,stagingReview,freezeReview
){
 // Recompile the expected geometry/cost from the original independently
 // reviewed manifest; never take expected values from the live DB itself.
 const expected=compileP5V0093CostOnlySevenRestReview(
  stagingInput,stagingReview,freezeReview);
 if(expected.phase6PaidGo!==false||
    expected.unknownOrdinaryDayAirportIdentities!==21||
    expected.cost.sourceRequestGridSha256!==null||
    !pool||typeof pool.connect!=="function")
  deny("NOT_A_REVIEWED_INERT_COST_ONLY_PACKET");
 const p=expected.staged,c=expected.cost;
 const client=await pool.connect();
 let begun=false;
 const fetch=async(sql,args=[])=> (await client.query(sql,args)).rows;
 const one=async(sql,args=[])=>{
  const rows=await fetch(sql,args);
  if(rows.length!==1)deny("ROW_CARDINALITY_NOT_EXACT_ONE");
  return rows[0];
 };
 const equalNum=(a,b)=>i(a)===b;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  begun=true;
  await client.query("SET LOCAL statement_timeout='15000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const sys=await one(
   "SELECT current_database() db,current_user actor,session_user session_actor,"+
   "current_setting('transaction_read_only') ro,"+
   "current_setting('server_version_num') ver,"+
   "pg_is_in_recovery() replica,clock_timestamp() snapshot_utc"
  );
  if(sys.db!=="neondb"||sys.actor!==sys.session_actor||
     sys.ro!=="on"||i(sys.ver)<160000||sys.replica!==false)
   deny("WRONG_DB_OR_NOT_READONLY_PRIMARY_PG16");
  const auth=await one(
   "SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,"+
   "code_sha,phase6_start_date,predecessor_evidence_ids,enabled,"+
   "revoked_at_utc FROM clean.adb_phase6_authorization"
  );
  if(auth.authorization_id!==p.authorizationId||
     auth.manifest_sha256!==c.manifestSha256||
     auth.calendar_hash!==c.calendarSha256||
     auth.config_hash!==c.configSha256||
     auth.code_sha!==p.codeSha40||
     utcDate(auth.phase6_start_date)!==p.phase6StartDateUtc||
     !same(auth.predecessor_evidence_ids,p.predecessorEvidenceIds)||
     auth.enabled!==false||auth.revoked_at_utc!==null)
   deny("DISABLED_B0062_AUTH_OR_MANIFEST_NOT_IDENTICAL");
  const days=await fetch(
   "SELECT run_day_index,budget_day_id,calendar_hash,config_hash,frame_hash,"+
   "scheduled_start_utc,date_utc,utc_slot,time_class,window_shape,"+
   "evaluation_partition,crossover_group_id,crossover_period,pair_role,"+
   "draw_type,slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,"+
   "active_duration_minutes FROM clean.adb_phase6_calendar_day ORDER BY run_day_index"
  );
  if(days.length!==31)deny("CALENDAR_NOT_EXACT_THIRTY_ONE");
  let ordinaryUnknown=0,pairedDays=0;
  for(let x=0;x<days.length;x++){
   const a=days[x],d=p.calendarDays[x];
   if(!equalNum(a.run_day_index,d.runDayIndex)||
      a.budget_day_id!==d.budgetDayId||
      a.calendar_hash!==p.calendarSha256||
      a.config_hash!==p.configSha256||
      a.frame_hash!==p.frameSha256||
      stamp(a.scheduled_start_utc)!==d.startUtc||
      utcDate(a.date_utc)!==d.startUtc.slice(0,10)||
      a.utc_slot!==d.utcSlot||a.time_class!==d.timeClass||
      a.window_shape!==d.windowShape||
      a.evaluation_partition!==d.partition||
      a.crossover_group_id!==d.pairId||
      a.crossover_period!==d.crossoverPeriod||
      a.pair_role!==d.pairRole||a.draw_type!==d.drawType||
      a.anchor_icao!==d.anchorIcao||
      a.frozen_draw_seed!==d.frozenDrawSeed||
      !equalNum(a.active_duration_minutes,d.windowShape==="up-to-6h"?360:240)||
      !exactSlots(a.slot_regions,d.slotRegions,false)||
      !exactSlots(a.pair_airport_set,d.pairAirportSet,d.pairAirportSet!==null))
    deny("CALENDAR_DAY_"+d.runDayIndex+"_DIFFERS_FROM_REVIEW");
   if(d.pairAirportSet===null)ordinaryUnknown++;else pairedDays++;
  }
  if(ordinaryUnknown!==21||pairedDays!==10)
   deny("KNOWN_PAIR_VS_UNKNOWN_ORDINARY_SITES_CHANGED");
  const cycle=await one(
   "SELECT manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units,physically_reserved_units "+
   "FROM clean.phase5_fids_cycle_budget_v39"
  );
  if(cycle.manifest_sha256!==c.manifestSha256||
     !equalNum(cycle.cycle_api_ceiling,c.cycleApiCeiling)||
     !equalNum(cycle.other_category_reserved_units,c.cycleOtherReservedUnits)||
     !equalNum(cycle.protected_api_floor_units,c.protectedApiFloorUnits)||
     !equalNum(cycle.physically_reserved_units,0))
   deny("CYCLE_REST_LIMITS_NOT_IDENTICAL");
  const utc=await fetch(
   "SELECT manifest_sha256,charge_day_utc,daily_api_ceiling,"+
   "daily_other_reserved_units,physically_reserved_units "+
   "FROM clean.phase5_fids_utc_charge_budget_v39 ORDER BY charge_day_utc"
  );
  const reviewDates=new Map(c.days.map(d=>[d.chargeDayUtc,d]));
  if(utc.length!==c.days.length)deny("PHYSICAL_UTC_DAY_COUNT_MISMATCH");
  for(const d of utc){
   const ref=reviewDates.get(utcDate(d.charge_day_utc));
   if(!ref||d.manifest_sha256!==c.manifestSha256||
      !equalNum(d.daily_api_ceiling,ref.dailyApiCeiling)||
      !equalNum(d.daily_other_reserved_units,ref.dailyOtherReservedUnits)||
      !equalNum(d.physically_reserved_units,0))
    deny("UTC_CYCLE_DAY_DIFFERS_FROM_REVIEW");
  }
  const rel=await one(
   "SELECT manifest_sha256,budget_release_mode,"+
   "reviewed_source_request_grid_sha256,reviewed_cost_envelope_sha256,"+
   "reviewed_provider_range_sha256,verified_provider_max_range_minutes,"+
   "reviewed_category_budget_sha256 "+
   "FROM clean.phase5_fids_seven_rest_release_v39"
  );
  if(rel.manifest_sha256!==c.manifestSha256||
     rel.budget_release_mode!=="COST_UPPER_BOUND"||
     rel.reviewed_source_request_grid_sha256!==null||
     rel.reviewed_cost_envelope_sha256!==c.costOnlyCategoryDraftSha256||
     rel.reviewed_category_budget_sha256!==c.costOnlyCategoryDraftSha256||
     rel.reviewed_provider_range_sha256!==c.reviewedProviderRangeEvidenceSha256||
     !equalNum(rel.verified_provider_max_range_minutes,c.providerMaxRangeMinutes))
   deny("TYPED_COST_ONLY_RELEASE_NOT_IDENTICAL");
  const caps=await fetch(
   "SELECT manifest_sha256,category,ceiling_units "+
   "FROM clean.phase5_fids_cycle_rest_category_cap_v39 ORDER BY category"
  );
  const capMap=new Map(c.categoryCaps.map(r=>[r.category,r.ceilingUnits]));
  if(caps.length!==7||new Set(caps.map(r=>r.category)).size!==7||
     caps.some(r=>r.manifest_sha256!==c.manifestSha256||
       !capMap.has(r.category)||!equalNum(r.ceiling_units,capMap.get(r.category))))
   deny("SEVEN_CYCLE_CAPS_NOT_IDENTICAL");
  const categories=await fetch(
   "SELECT manifest_sha256,charge_day_utc,category,planned_units,"+
   "physically_reserved_units FROM clean.phase5_fids_utc_rest_category_budget_v39 "+
   "ORDER BY charge_day_utc,category"
  );
  const expectedCategory=new Map(c.days.flatMap(d=>d.categoryRows.map(r=>
    [d.chargeDayUtc+":"+r.category,r.plannedUnits])));
  if(categories.length!==c.days.length*7||
     new Set(categories.map(r=>utcDate(r.charge_day_utc)+":"+r.category)).size!==
      categories.length)
   deny("SEVEN_PER_UTC_CATEGORY_CARDINALITY");
  for(const r of categories){
   const key=utcDate(r.charge_day_utc)+":"+r.category;
   if(r.manifest_sha256!==c.manifestSha256||
      !SEVEN.includes(r.category)||!expectedCategory.has(key)||
      !equalNum(r.planned_units,expectedCategory.get(key))||
      !equalNum(r.physically_reserved_units,0))
    deny("UTC_CATEGORY_BUDGET_NOT_IDENTICAL");
  }
  const counts=await one(
    "SELECT "+baseTables.map((name,n)=>
      "(SELECT COUNT(*)::int FROM "+name+") n"+n).join(",")
  );
  if(baseTables.some((_,n)=>counts["n"+n]!==0))
   deny("FLIGHT_QUERY_OR_PHYSICAL_ATTEMPT_EVIDENCE_ALREADY_EXISTS");
  await client.query("ROLLBACK");begun=false;
  return {
   status:"INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO",
   snapshotAtUtc:stamp(sys.snapshot_utc),
   database:"neondb",verifiedReadOnly:true,
   manifestSha256:c.manifestSha256,
   calendarSha256:c.calendarSha256,
   exactReviewedStagePacketSha256:p.stagePacketSha256,
   exactReviewedCostEnvelopeSha256:c.costOnlyCategoryDraftSha256,
   calendarRows:31,pairedAirportDays:10,ordinaryAirportDaysUnselected:21,
   restPhysicalChargeDates:c.days.length,
   categoryCycleCaps:7,categoryUtcBudgetRows:categories.length,
   sourceQueriesAndPhysicalAttemptsZero:true,
   independentHumanSignatureOrRightsAuthenticatedByThisCode:false,
   originalFlightPreOrPostProven:false,
   authorizationEnabled:false,
   providerCalls:0,databaseWrites:0,
   phase5ScientificFreeze:false,phase6PaidGo:false
  };
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{client.release();}
}
