/**
 * Phase5 V0093 typed COST_UPPER_BOUND seven-category FREEZE writer.
 *
 * Distinct from old V0082 exact-Stage22 writer. The 21 ordinary-day airports
 * remain UNSELECTED; the only authentic prelaunch object is a conservative
 * category cost ceiling, NOT a signed request grid or evidence of paid GO.
 *
 * This module creates no DB roles, auth, flight queries, calls, physical
 * reservation, provider requests, source contents or Phase6 activation.
 * A genuine distinct commissioned limited DB login, externally signed
 * reviewed packet and owner approval are required for LIVE use.
 */
import {createHash} from "node:crypto";
import {
 compileP5InertB0062UtcStagePacket
} from "./phase5B0062InertCalendarUtcBudgetStage_v39.mjs";
import {
 buildP5V0082UnknownAirportSevenCostOnlyDraft
} from "./phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs";

const SHA=/^[a-f0-9]{64}$/;
const ROLE=/^phase5_fids_budget_freeze_[a-z0-9_]{6,32}$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const SEVEN=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
];
const SOURCE_CAT=new Set(SEVEN.slice(0,2));
const DAY=86_400_000;
const H=3600_000;
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const hold=x=>{throw Error("REFUSED_P5_V0093_COST_ONLY_INPUT_FREEZE_"+x);};
const stamp=x=>{
 const d=x instanceof Date?x:new Date(String(x));
 if(!Number.isFinite(d.getTime()))hold("INVALID_DATE");
 return d.toISOString();
};
const utcDate=x=>{
 const s=x instanceof Date?x.toISOString().slice(0,10):String(x);
 if(!/^\d{4}-\d\d-\d\d$/.test(s)||
    new Date(s+"T00:00:00.000Z").toISOString().slice(0,10)!==s)
  hold("INVALID_UTC_CHARGE_DAY");
 return s;
};
const equalJSON=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// PostgreSQL jsonb does not preserve user-supplied key order; compare ONLY
// externally expected exact slot keys and actual scalar values.
const boundSlotObject=(db,expected,paired)=>{
 if((db===null)!==(expected===null))return false;
 if(db===null)return !paired;
 if(typeof db!=="object"||!db||Array.isArray(db)||
    Object.keys(db).length!==4)return false;
 return SLOTS.every(k=>{
  const v=db[k],x=expected[k];
  return paired?
   !!v&&!!x&&Object.keys(v).length===2&&
    v.icao===x.icao&&v.region===x.region:
   typeof v==="string"&&v===x;
 });
};
export function compileP5V0093CostOnlySevenRestReview(
 stagingInput,stagingReview,freezeReview
){
 const p=compileP5InertB0062UtcStagePacket(stagingInput,stagingReview);
 const cost=buildP5V0082UnknownAirportSevenCostOnlyDraft({
  schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",
  slotBudgetInput:stagingInput.slotBudgetInput,
  expectedReviewerSlotEnvelopeSha256:p.sourceSlotBudgetSha256
 });
 if(!freezeReview||
    freezeReview.expectedStagedB0062PacketSha256!==p.stagePacketSha256||
    freezeReview.expectedSignedSevenCategoryCostSha256!==
      cost.costOnlyCategoryDraftSha256||
    !SHA.test(freezeReview.expectedSignedSevenCategoryCostSha256??"")||
    !ROLE.test(freezeReview.expectedExactBudgetWriterRole??"")||
    freezeReview.independentProspectiveCalendarAndTreatmentApproved!==true||
    freezeReview.independentRealProviderRangeAndRestBudgetApproved!==true||
    freezeReview.independentSourceContentsRightsForIntendedUseApproved!==true||
    freezeReview.exactRestrictedNoProviderBudgetFreezeApproved!==true||
    cost.manifestSha256!==p.manifestSha256||
    cost.calendarSha256!==p.calendarSha256||
    cost.configSha256!==p.configSha256||
    cost.frameSha256!==p.frameSha256||
    cost.sourceSlotBudgetSha256!==p.sourceSlotBudgetSha256||
    cost.originalExistingV0082WriterCompatible!==false||
    cost.originalExistingV0082ExactQueryEqualityCompatible!==false||
    cost.separateCostOnlyV0082ReleaseImplementationInstalled!==false||
    cost.sourceRequestGridSha256!==null||
    cost.unsignedFutureOrdinaryAirports!==21||
    cost.phase6PaidGo!==false||
    cost.providerCalls!==0||cost.dbWrites!==0)
  hold("MISSING_DISTINCT_AUTHENTIC_COST_ONLY_REVIEW");
 if(p.calendarDays.length!==31||cost.days.length<31||
    cost.categoryCaps.length!==7||
    SEVEN.some(k=>!cost.categoryCaps.some(c=>c.category===k))||
    cost.cycleSourceReservedUnits!==p.budget.cycleSourceUnits||
    cost.cycleOtherReservedUnits!==p.budget.cycleOtherUnits||
    cost.cycleApiCeiling!==p.budget.cycleRestCeilingUnits||
    cost.protectedApiFloorUnits!==p.budget.protectedRestFloorUnits||
    cost.providerMaxRangeMinutes!==p.budget.providerMaxRangeMinutes)
  hold("SOURCE_CEILING_NOT_SAME_ATOMIC_B0062_PLAN");
 return {
  schema:"v39.phase5.v0093-cost-only-reviewed-seven-rest.v1",
  status:"REVIEWED_TYPED_UPPER_CAP_PRELAUNCH_INPUT_NOT_FLIGHT_SOURCE_GO",
  staged:p,cost,
  expectedExactBudgetWriterRole:freezeReview.expectedExactBudgetWriterRole,
  signedCostOnlySha256:freezeReview.expectedSignedSevenCategoryCostSha256,
  unknownOrdinaryDayAirportIdentities:21,
  actualSourcedFlights:0,providerCalls:0,databaseWrites:0,
  phase5ScientificFreeze:false,phase6PaidGo:false
 };
}
export async function commitP5V0093CostOnlySevenRestOnce(
 pool,stagingInput,stagingReview,freezeReview
){
 const packet=compileP5V0093CostOnlySevenRestReview(
  stagingInput,stagingReview,freezeReview);
 if(!pool||typeof pool.connect!=="function")
  hold("MISSING_SEPARATE_RESTRICTED_BUDGET_FREEZE_POOL");
 const client=await pool.connect();
 let began=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  began=true;
  await client.query("SET LOCAL statement_timeout='25000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const who=(await client.query(
   "SELECT current_database() db,current_user actor,session_user session_actor,"+
   "current_setting('transaction_read_only') ro,"+
   "current_setting('server_version_num') ver,"+
   "pg_is_in_recovery() replica,clock_timestamp() now_utc"
  )).rows[0];
  if(who?.db!=="neondb"||
     who.actor!==packet.expectedExactBudgetWriterRole||
     who.session_actor!==packet.expectedExactBudgetWriterRole||
     who.ro!=="off"||who.replica!==false||Number(who.ver)<160000)
   hold("UNCOMMISSIONED_COST_ONLY_BUDGET_WRITER_IDENTITY");
  const read=[
   "clean.adb_phase6_authorization","clean.adb_phase6_calendar_day",
   "clean.phase5_fids_cycle_budget_v39",
   "clean.phase5_fids_utc_charge_budget_v39",
   "clean.phase5_fids_allowed_query_v39",
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39"
  ];
  const write=[
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39"
  ];
  const excluded=[
   "clean.phase5_fids_day_budget_v39",
   "clean.phase5_fids_exact_query_partition_v39",
   "clean.phase5_fids_physical_attempt_v39",
   "clean.phase5_fids_original_binding_v39",
   "clean.fids_query_response","clean.flight_population",
   "clean.flight_snapshots"
  ];
  const probes=[
   ...read.map(t=>[t,"SELECT",true]),
   ...write.map(t=>[t,"INSERT",true]),
   ...[...new Set([...read,...write,...excluded])].flatMap(t=>
    ["UPDATE","DELETE","TRUNCATE"].map(perm=>[t,perm,false])),
   ...[...new Set([...read,...excluded])].filter(t=>!write.includes(t)).
     map(t=>[t,"INSERT",false]),
   ...excluded.map(t=>[t,"SELECT",false])
  ];
  const pSql="SELECT "+probes.map(([table,perm],i)=>
   "has_table_privilege(current_user,'"+table+"','"+perm+"') AS p"+i
  ).join(",");
  const perms=(await client.query(pSql)).rows[0];
  if(!perms||probes.some(([, ,expected],i)=>perms["p"+i]!==expected))
   hold("NARROW_BUDGET_WRITER_HAS_EXCESS_OR_MISSING_ACL");
  await client.query(
   "SELECT pg_advisory_xact_lock(hashtext('v39-phase5-budget-freeze'),hashtext($1))",
   [packet.cost.manifestSha256]
  );
  const c=packet.cost,p=packet.staged;
  const now=Date.parse(stamp(who.now_utc));
  if(Date.parse(p.calendarDays[0].startUtc)-now<=24*H+50*60_000)
   hold("FROZEN_FIRST_T24_SOURCE_WINDOW_ALREADY_DUE");
  const auth=(await client.query(
   "SELECT manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc "+
   "FROM clean.adb_phase6_authorization WHERE singleton_key=true"
  )).rows;
  if(auth.length!==1||auth[0].enabled!==false||
     auth[0].revoked_at_utc!==null||
     auth[0].manifest_sha256!==c.manifestSha256||
     auth[0].calendar_hash!==c.calendarSha256||
     auth[0].config_hash!==c.configSha256)
   hold("NOT_THE_SAME_DISABLED_PRELAUNCH_B0062_AUTHORIZATION");
  const calendar=(await client.query(
   "SELECT run_day_index,budget_day_id,calendar_hash,config_hash,frame_hash,"+
   "scheduled_start_utc,date_utc,utc_slot,time_class,window_shape,"+
   "evaluation_partition,crossover_group_id,crossover_period,pair_role,"+
   "draw_type,slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,"+
   "active_duration_minutes FROM clean.adb_phase6_calendar_day ORDER BY run_day_index"
  )).rows;
  if(calendar.length!==31)
   hold("POSTGRES_MISSING_EXACT_THIRTY_ONE_PARENT_DAYS");
  for(const [i,actual] of calendar.entries()){
   const d=p.calendarDays[i];
   const expectedDuration=d.windowShape==="up-to-6h"?360:240;
   if(Number(actual.run_day_index)!==d.runDayIndex||
      actual.budget_day_id!==d.budgetDayId||
      actual.calendar_hash!==c.calendarSha256||
      actual.config_hash!==c.configSha256||
      actual.frame_hash!==c.frameSha256||
      stamp(actual.scheduled_start_utc)!==d.startUtc||
      utcDate(actual.date_utc)!==d.startUtc.slice(0,10)||
      actual.utc_slot!==d.utcSlot||actual.time_class!==d.timeClass||
      actual.window_shape!==d.windowShape||
      actual.evaluation_partition!==d.partition||
      actual.crossover_group_id!==d.pairId||
      actual.crossover_period!==d.crossoverPeriod||
      actual.pair_role!==d.pairRole||
      actual.draw_type!==d.drawType||
      actual.anchor_icao!==d.anchorIcao||
      actual.frozen_draw_seed!==d.frozenDrawSeed||
      Number(actual.active_duration_minutes)!==expectedDuration||
      !boundSlotObject(actual.slot_regions,d.slotRegions,false)||
      !boundSlotObject(actual.pair_airport_set,d.pairAirportSet,
        d.pairAirportSet!==null))
    hold("FROZEN_B0062_CALENDAR_OR_FUTURE_SITES_TAMPERED");
  }
  const cycle=(await client.query(
   "SELECT cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units,physically_reserved_units "+
   "FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1",
   [c.manifestSha256]
  )).rows;
  if(cycle.length!==1||
     Number(cycle[0].cycle_api_ceiling)!==c.cycleApiCeiling||
     Number(cycle[0].other_category_reserved_units)!==
       c.cycleOtherReservedUnits||
     Number(cycle[0].protected_api_floor_units)!==
       c.protectedApiFloorUnits||
     Number(cycle[0].physically_reserved_units)!==0)
   hold("POSTGRES_CYCLE_COST_NOT_SAME_AS_REVIEWED_PRELAUNCH_BUDGET");
  const utc=(await client.query(
   "SELECT charge_day_utc,daily_api_ceiling,daily_other_reserved_units,"+
   "physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39 "+
   "WHERE manifest_sha256=$1",[c.manifestSha256]
  )).rows;
  if(utc.length!==c.days.length)
   hold("PHYSICAL_CHARGE_DATE_COST_ENVELOPES_INCOMPLETE");
  const expectedDates=new Map(c.days.map(d=>[d.chargeDayUtc,d]));
  for(const d of utc){
   const expected=expectedDates.get(utcDate(d.charge_day_utc));
   if(!expected||
      Number(d.daily_api_ceiling)!==expected.dailyApiCeiling||
      Number(d.daily_other_reserved_units)!==
       expected.dailyOtherReservedUnits||
      Number(d.physically_reserved_units)!==0)
    hold("COST_ONLY_CHARGE_DAY_OR_OTHER_CATEGORY_MISMATCH");
  }
  const counts=(await client.query(
   "SELECT "+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) source,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39) release,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_cycle_rest_category_cap_v39) caps,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_utc_rest_category_budget_v39) days"
  )).rows[0];
  if(!counts||Object.values(counts).some(n=>n!==0))
   hold("V0082_COST_FREEZE_NOT_VIRGIN_NO_REPLAY");
  // V0093 installed only AFTER independent owner SHA check; never silently
  // coerce the existing exact Stage22 V0082 full request-grid writer.
  const installed=(await client.query(
   "SELECT COUNT(*)::int n FROM information_schema.columns "+
   "WHERE table_schema='clean' AND "+
   "table_name='phase5_fids_seven_rest_release_v39' AND "+
   "column_name IN ('budget_release_mode','reviewed_cost_envelope_sha256')"
  )).rows[0]?.n;
  if(installed!==2)hold("V0093_TYPED_COST_UPPER_BOUND_NOT_YET_INSTALLED");
  await client.query(
   "INSERT INTO clean.phase5_fids_seven_rest_release_v39 "+
   "(manifest_sha256,reviewed_source_request_grid_sha256,"+
   "reviewed_provider_range_sha256,verified_provider_max_range_minutes,"+
   "reviewed_category_budget_sha256,budget_release_mode,"+
   "reviewed_cost_envelope_sha256) "+
   "VALUES ($1,NULL,$2,$3,$4,'COST_UPPER_BOUND',$4)",
   [c.manifestSha256,c.reviewedProviderRangeEvidenceSha256,
    c.providerMaxRangeMinutes,c.costOnlyCategoryDraftSha256]
  );
  const caps=c.categoryCaps;
  const flatCaps=caps.flatMap(x=>[c.manifestSha256,x.category,x.ceilingUnits]);
  const sqlCaps=caps.map((_,i)=>
   "($"+(i*3+1)+",$"+(i*3+2)+",$"+(i*3+3)+")").join(",");
  const capInserted=await client.query(
   "INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39 "+
   "(manifest_sha256,category,ceiling_units) VALUES "+sqlCaps,flatCaps);
  if(capInserted.rowCount!==7)
   hold("SEVEN_CYCLE_CAPS_NOT_ATOMICALLY_FROZEN");
  const dayRows=c.days.flatMap(d=>d.categoryRows.map(x=>
   [c.manifestSha256,d.chargeDayUtc,x.category,x.plannedUnits]
  ));
  const sqlRows=dayRows.map((_,i)=>
   "($"+(i*4+1)+",$"+(i*4+2)+"::date,$"+(i*4+3)+
    ",$"+(i*4+4)+")").join(",");
  const result=await client.query(
   "INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39 "+
   "(manifest_sha256,charge_day_utc,category,planned_units) VALUES "+
   sqlRows,dayRows.flat());
  if(result.rowCount!==7*c.days.length)
   hold("NOT_ALL_PHYSICAL_UTC_SEVEN_CATEGORY_BUDGET_ROWS_FROZEN");
  commitAttempted=true;
  await client.query("COMMIT");
  began=false;
  return {
   schema:"v39.phase5.v0093-cost-only-seven-category-input-commit.v1",
   status:"COST_UPPER_BOUND_SEVEN_REST_CEILINGS_FROZEN_NO_GET_OR_PAID_GO",
   manifestSha256:c.manifestSha256,
   reviewedCostOnlySha256:c.costOnlyCategoryDraftSha256,
   knownPairedAirportDays:10,unknownOrdinaryAirportDays:21,
   categoryCapRows:7,physicalUtcChargeDays:c.days.length,
   categoryChargeDayRows:7*c.days.length,
   actualFidsQueryRowsCreated:0,paidOriginalFlightRowsCreated:0,
   independentSourceRightsAuthenticatedByThisCode:false,
   providerCalls:0,physicalReservations:0,phase5ScientificFreeze:false,
   phase6PaidGo:false
  };
 }catch(e){
  if(began&&!commitAttempted)
   await client.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)
   hold("AMBIGUOUS_V0093_COST_CATEGORY_COMMIT_INDEPENDENT_DB_READBACK_REQUIRED");
  throw e;
 }finally{
  client.release();
 }
}
