/**
 * Phase5 V0082: reviewed seven-REST-category INPUT freeze, inert.
 *
 * Does NOT install V0082, run paid HTTP, set authorization, create grants,
 * prepare SOURCE queries, consume REST categories, or release Phase6.
 * Requires a separately-approved 31-batch-day Stage22 coverage-derived
 * frozen packet, real B0062 calendar and existing V0079 cycle/UTC budgets.
 *
 * Exactly 3 INSERT statements inside one SERIALIZABLE transaction:
 * reviewed RELEASE identity, seven CYCLE caps, 7 x physical UTC charge days.
 * Restricted role cannot change V0079 or V0082 budgets or read provider raw.
 */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
const SHA=/^[a-f0-9]{64}$/;
const ROLE=/^phase5_fids_budget_freeze_[a-z0-9_]{6,32}$/;
const DAY=/^\d{4}-\d\d-\d\d$/;
const CATEGORIES=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
] as const;
type Category=typeof CATEGORIES[number];
type DayCategory={category:Category;plannedUnits:number;physicallyReservedUnits:0};
export interface P5V0082FreezeCategoryDay {
 chargeDayUtc:string;dailyApiCeiling:number;dailyOtherReservedUnits:number;
 fidsBaseUnits:number;fidsSplitUnits:number;
 categoryRows:DayCategory[];
}
export interface P5V0082CalendarDay {
 runDayIndex:number;startUtc:string;
 windowShape:"4h"|"2x2h"|"up-to-6h";
 activeDurationMinutes:number;utcSlot:string;airportSlots:string[];
}
export interface P5V0082FrozenSevenRestCandidate {
 schema:"v39.phase5.v0082.seven-rest-category-freeze-candidate.v1";
 manifestSha256:string;calendarSha256:string;configSha256:string;
 frameSha256:string;stage22CoverageInputSha256:string;
 reviewed31DaySourceRequestGridSha256:string;
 reviewedProviderRangeEvidenceSha256:string;
 verifiedProviderMaxRangeMinutes:number;timingContractSha256:string;
 calendarDays:P5V0082CalendarDay[];
 cycleApiCeiling:number;protectedApiFloorUnits:number;
 cycleOtherReservedUnits:number;cycleSourceReservedUnits:number;
 categoryCaps:Array<{category:Category;ceilingUnits:number}>;
 days:P5V0082FreezeCategoryDay[];
 reviewedCategoryBudgetSha256:string;
 reviewedCategoryBudgetSha256NotYetExternallySigned:true;
 mathematicalStatus:"STAGE22_EXPOSURE_COVERAGE_CANDIDATE_NOT_RELEASE";
 databaseWrites:0;providerGets:0;
 providerRightsCertified:false;providerRangeMeasuredByThisCode:false;
 real31DayEarlyAirportsBound:false;realSourceOriginals:0;
 phase5ScientificFreeze:false;phase6PaidGo:false;
}
export interface P5V0082FreezeOwnerReview {
 candidate:P5V0082FrozenSevenRestCandidate;
 expectedSignedCategoryBudgetSha256:string;
 expectedStage22CoverageInputSha256:string;
 expectedManifestSha256:string;
 expectedCalendarSha256:string;
 expectedConfigSha256:string;
 expectedFrameSha256:string;
 expectedProviderRangeEvidenceSha256:string;
 expectedRequestGridSha256:string;
 expectedWriterRole:string;
 independent31DaySourceAndSevenCategoryPlanApproved:true;
 independentCategoryBudgetReviewApproved:true;
 githubOnlyRestrictedOwnerApproved:true;
}
export interface P5V0082FrozenInputCommitted {
 schema:"v39.phase5.v0082.seven-rest-input-freeze-commit.v1";
 status:"SEVEN_CATEGORY_REST_INPUT_FROZEN_NO_GET_OR_PHASE6_RELEASE";
 manifestSha256:string;reviewedCategoryBudgetSha256:string;
 categoryCapRows:7;actualUtcChargeDays:number;
 categoryChargeDayRows:number;databaseInserts:number;
 providerCalls:0;physicalGetReservations:0;
 flightPreRowsCreated:0;realAirportsCollected:false;
 sourceRightsCertified:false;phase5ScientificFreeze:false;phase6PaidGo:false;
}
function hold(x:string):never{
 throw Error("REFUSED_P5_V0082_INPUT_FREEZE_"+x);
}
const hash=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const int=(v:unknown,from:number,to:number)=>
 typeof v==="number"&&Number.isSafeInteger(v)&&v>=from&&v<=to;
const stamp=(v:unknown)=>{
 const d=v instanceof Date?v:new Date(String(v));
 if(!Number.isFinite(d.getTime()))hold("INVALID_CALENDAR_TIMESTAMP");
 return d.toISOString();
};
const day=(v:unknown)=>{
 const s=v instanceof Date?v.toISOString().slice(0,10):String(v);
 if(!DAY.test(s)||new Date(s+"T00:00:00.000Z").toString()==="Invalid Date"||
    new Date(s+"T00:00:00.000Z").toISOString().slice(0,10)!==s)
   hold("NOT_CANONICAL_ACTUAL_UTC_DAY");
 return s;
};
const contains=(x:readonly string[],v:string)=>x.includes(v);
function checked(review:P5V0082FreezeOwnerReview){
 const c=review?.candidate;
 const hashes=[
  review.expectedSignedCategoryBudgetSha256,
  review.expectedStage22CoverageInputSha256,
  review.expectedManifestSha256,review.expectedCalendarSha256,
  review.expectedConfigSha256,review.expectedFrameSha256,
  review.expectedProviderRangeEvidenceSha256,review.expectedRequestGridSha256
 ];
 if(!c||c.schema!=="v39.phase5.v0082.seven-rest-category-freeze-candidate.v1"||
    hashes.some(x=>typeof x!=="string"||!SHA.test(x))||
    !ROLE.test(review.expectedWriterRole??"")||
    review.independent31DaySourceAndSevenCategoryPlanApproved!==true||
    review.independentCategoryBudgetReviewApproved!==true||
    review.githubOnlyRestrictedOwnerApproved!==true||
    c.mathematicalStatus!=="STAGE22_EXPOSURE_COVERAGE_CANDIDATE_NOT_RELEASE"||
    c.databaseWrites!==0||c.providerGets!==0||
    c.providerRightsCertified!==false||
    c.providerRangeMeasuredByThisCode!==false||
    c.real31DayEarlyAirportsBound!==false||c.realSourceOriginals!==0||
    c.phase5ScientificFreeze!==false||c.phase6PaidGo!==false||
    c.manifestSha256!==review.expectedManifestSha256||
    c.calendarSha256!==review.expectedCalendarSha256||
    c.configSha256!==review.expectedConfigSha256||
    c.frameSha256!==review.expectedFrameSha256||
    c.stage22CoverageInputSha256!==review.expectedStage22CoverageInputSha256||
    c.reviewed31DaySourceRequestGridSha256!==review.expectedRequestGridSha256||
    c.reviewedProviderRangeEvidenceSha256!==review.expectedProviderRangeEvidenceSha256||
    !int(c.verifiedProviderMaxRangeMinutes,1,360)||
    !int(c.cycleApiCeiling,2,50000)||
    !int(c.protectedApiFloorUnits,0,50000)||
    !int(c.cycleOtherReservedUnits,0,50000)||
    !int(c.cycleSourceReservedUnits,0,50000)||
    !Array.isArray(c.calendarDays)||c.calendarDays.length!==31||
    !Array.isArray(c.categoryCaps)||c.categoryCaps.length!==7||
    !Array.isArray(c.days)||c.days.length<1||c.days.length>100)
   hold("MISSING_INDEPENDENTLY_REVIEWED_THIRTY_ONE_DAY_PLAN");
 const {reviewedCategoryBudgetSha256,
  reviewedCategoryBudgetSha256NotYetExternallySigned,mathematicalStatus,
  databaseWrites,providerGets,phase5ScientificFreeze,phase6PaidGo,
  providerRightsCertified,providerRangeMeasuredByThisCode,
  real31DayEarlyAirportsBound,realSourceOriginals,...canonical}=c;
 if(reviewedCategoryBudgetSha256NotYetExternallySigned!==true||
    reviewedCategoryBudgetSha256!==review.expectedSignedCategoryBudgetSha256||
    hash(canonical)!==review.expectedSignedCategoryBudgetSha256)
   hold("UNSIGNED_OR_TAMPERED_CANONICAL_SEVEN_CATEGORY_PLAN");
 if(new Set(c.categoryCaps.map(a=>a.category)).size!==7||
    CATEGORIES.some(cat=>!c.categoryCaps.some(a=>a.category===cat))||
    c.categoryCaps.some(row=>!int(row.ceilingUnits,0,50000)))
   hold("MISSING_SEVEN_INDEPENDENT_CYCLE_CATEGORY_CAPS");
 const dates=new Set<string>(),sums=new Map<Category,number>(
   CATEGORIES.map(cat=>[cat,0])
 );
 for(const d of c.days){
  const date=day(d.chargeDayUtc);
  if(dates.has(date)||!int(d.dailyApiCeiling,2,1900)||
     !int(d.dailyOtherReservedUnits,0,50000)||
     !int(d.fidsBaseUnits,0,50000)||!int(d.fidsSplitUnits,0,50000)||
     !Array.isArray(d.categoryRows)||d.categoryRows.length!==7)
   hold("DUPLICATE_OR_UNFROZEN_ACTUAL_UTC_CHARGE_DAY");
  dates.add(date);
  const names=new Set(d.categoryRows.map(row=>row.category));
  if(names.size!==7||CATEGORIES.some(cat=>!names.has(cat)))
   hold("MISSING_ZERO_VALUED_CATEGORY_ON_UTC_DAY");
  let other=0,source=0;
  for(const row of d.categoryRows){
   if(!contains(CATEGORIES,row.category)||
      !int(row.plannedUnits,0,50000)||
      row.physicallyReservedUnits!==0)
    hold("CATEGORY_NOT_FROZEN_OR_ALREADY_CONSUMED");
   sums.set(row.category,(sums.get(row.category)??0)+row.plannedUnits);
   if(row.category==="FIDS_BASE_UNITS"||row.category==="FIDS_SPLIT_UNITS")
    source+=row.plannedUnits;
   else other+=row.plannedUnits;
  }
  const base=d.categoryRows.find(r=>r.category==="FIDS_BASE_UNITS")!;
  const split=d.categoryRows.find(r=>r.category==="FIDS_SPLIT_UNITS")!;
  if(other!==d.dailyOtherReservedUnits||
     base.plannedUnits!==d.fidsBaseUnits||
     split.plannedUnits!==d.fidsSplitUnits||
     base.plannedUnits%2!==0||split.plannedUnits%2!==0||
     other+source>d.dailyApiCeiling)
   hold("UNFUNDED_DAILY_REST_SOURCE_OR_OTHER_CATEGORY");
 }
 let otherTotal=0,sourceTotal=0;
 for(const cat of CATEGORIES){
  const value=sums.get(cat)!,
   cap=c.categoryCaps.find(x=>x.category===cat)!.ceilingUnits;
  if(!int(value,0,50000)||value>cap)
   hold("SEPARATE_CYCLE_CATEGORY_CAP_EXCEEDED");
  if(cat==="FIDS_BASE_UNITS"||cat==="FIDS_SPLIT_UNITS")
   sourceTotal+=value;
  else otherTotal+=value;
 }
 if(otherTotal!==c.cycleOtherReservedUnits||
    sourceTotal!==c.cycleSourceReservedUnits||
    sourceTotal+otherTotal+c.protectedApiFloorUnits>c.cycleApiCeiling)
   hold("PROJECT_REST_CYCLE_SOURCE_OTHER_FLOOR_MISMATCH");
 const calendarIndex=new Set<number>();
 for(const x of c.calendarDays){
  if(!int(x.runDayIndex,1,31)||calendarIndex.has(x.runDayIndex)||
     !["4h","2x2h","up-to-6h"].includes(x.windowShape)||
     x.activeDurationMinutes!==(x.windowShape==="up-to-6h"?360:240)||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x.startUtc)||
     stamp(x.startUtc)!==x.startUtc||
     !Array.isArray(x.airportSlots)||x.airportSlots.join(",")!==
       "HUB,MID_A,MID_B,REGIONAL"||
     !/^\d\d$/.test(x.utcSlot)||
     x.startUtc.slice(11,13)!==x.utcSlot)
   hold("UNFROZEN_31_PARENT_DAY_GEOMETRY");
  calendarIndex.add(x.runDayIndex);
 }
 if(CATEGORIES.some(cat=>!sums.has(cat)))hold("NO_CATEGORY_TOTALS");
 return {candidate:c,totalChargeDayRows:7*c.days.length};
}
export async function commitP5V0082FrozenSevenRestInput(
 pool:Pick<Pool,"connect">,review:P5V0082FreezeOwnerReview
):Promise<P5V0082FrozenInputCommitted>{
 const {candidate:c,totalChargeDayRows}=checked(review);
 if(!pool||typeof pool.connect!=="function")
  hold("NO_SEPARATE_RESTRICTED_BUDGET_FREEZE_DATABASE_POOL");
 const client:PoolClient=await pool.connect();
 let started=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");started=true;
  await client.query("SET LOCAL statement_timeout='20000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const who=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS at"
  )).rows[0];
  if(!who||who.db!=="neondb"||who.actor!==review.expectedWriterRole||
     who.ro!=="off"||who.replica!==false)
   hold("UNAUTHORIZED_PRODUCTION_BUDGET_FREEZE_OWNER_ROLE");
  // V0082 remains inert unless DDL was independently commissioned.
  const requiredReads=[
   "clean.adb_phase6_authorization","clean.adb_phase6_calendar_day",
   "clean.phase5_fids_cycle_budget_v39",
   "clean.phase5_fids_utc_charge_budget_v39",
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39",
   "clean.phase5_fids_allowed_query_v39"
  ];
  const exactInserts=[
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39"
  ];
  const unauthorized=[
   "clean.phase5_fids_allowed_query_v39",
   "clean.phase5_fids_exact_query_partition_v39",
   "clean.phase5_fids_physical_attempt_v39",
   "clean.phase5_fids_original_binding_v39",
   "clean.fids_query_response","clean.flight_population",
   "clean.flight_snapshots"
  ];
  const probes=[
   ...requiredReads.map(table=>[table,"SELECT",true] as const),
   ...exactInserts.map(table=>[table,"INSERT",true] as const),
   ...unauthorized.flatMap(table=>
     ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE"].map(priv=>
      [table,priv,false] as const).filter(([t,priv])=>
      !(t==="clean.phase5_fids_allowed_query_v39"&&priv==="SELECT"))),
   ...exactInserts.flatMap(table=>
     ["UPDATE","DELETE","TRUNCATE"].map(priv=>
      [table,priv,false] as const)),
   ...["clean.phase5_fids_cycle_budget_v39",
      "clean.phase5_fids_utc_charge_budget_v39",
      "clean.phase5_fids_day_budget_v39"].flatMap(table=>
     ["INSERT","UPDATE","DELETE","TRUNCATE"].map(priv=>
      [table,priv,false] as const))
  ];
  const q=probes.map(([table,priv],i)=>
    "has_table_privilege(current_user,'"+table+"','"+priv+"') AS p"+i);
  const a=(await client.query("SELECT "+q.join(","))).rows[0];
  if(!a||probes.some(([, ,expected],i)=>a["p"+i]!==expected))
   hold("ROLE_HAS_EXCESS_PRIVILEGES_OR_MISSING_FREEZE_INSERT_ACL");
  await client.query(
   "SELECT pg_advisory_xact_lock(hashtext('v39-phase5-budget-freeze'),"+
   "hashtext($1))",[c.manifestSha256]);
  const auth=(await client.query(
   "SELECT manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc "+
   "FROM clean.adb_phase6_authorization WHERE singleton_key=true"
  )).rows;
  if(auth.length!==1||auth[0].enabled!==true||
     auth[0].revoked_at_utc!==null||
     auth[0].manifest_sha256!==c.manifestSha256||
     auth[0].calendar_hash!==c.calendarSha256||
     auth[0].config_hash!==c.configSha256)
   hold("NO_ACTUAL_FROZEN_ACTIVE_AUTHORIZATION");
  const cal=(await client.query(
   "SELECT run_day_index,calendar_hash,config_hash,frame_hash,"+
   "scheduled_start_utc,window_shape,active_duration_minutes,date_utc,"+
   "utc_slot FROM clean.adb_phase6_calendar_day "+
   "ORDER BY run_day_index"
  )).rows;
  if(cal.length!==31)hold("POSTGRES_31_BATCH_DAYS_NOT_INSTALLED");
  const selected=new Map(c.calendarDays.map(row=>[row.runDayIndex,row]));
  for(const row of cal){
   const d=selected.get(Number(row.run_day_index));
   if(!d||row.calendar_hash!==c.calendarSha256||
      row.config_hash!==c.configSha256||
      row.frame_hash!==c.frameSha256||
      stamp(row.scheduled_start_utc)!==d.startUtc||
      row.window_shape!==d.windowShape||
      Number(row.active_duration_minutes)!==d.activeDurationMinutes||
      row.utc_slot!==d.utcSlot||
      day(row.date_utc)!==d.startUtc.slice(0,10))
    hold("POSTGRES_SAVED_TREATMENT_MISMATCH_FROZEN_31");
  }
  if(c.calendarDays.some(d=>Date.parse(d.startUtc)<=Date.parse(stamp(who.at))))
    hold("PAST_OR_STARTED_BATCH_DAY_CANNOT_FREEZE");
  const cycle=(await client.query(
   "SELECT cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units,physically_reserved_units "+
   "FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1",
   [c.manifestSha256]
  )).rows;
  if(cycle.length!==1||Number(cycle[0].cycle_api_ceiling)!==c.cycleApiCeiling||
     Number(cycle[0].other_category_reserved_units)!==c.cycleOtherReservedUnits||
     Number(cycle[0].protected_api_floor_units)!==c.protectedApiFloorUnits||
     Number(cycle[0].physically_reserved_units)!==0)
   hold("CYCLE_EXISTING_REST_BUDGET_NOT_MATCHED");
  const actualDays=(await client.query(
   "SELECT charge_day_utc,daily_api_ceiling,daily_other_reserved_units,"+
   "physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39 "+
   "WHERE manifest_sha256=$1",[c.manifestSha256]
  )).rows;
  if(actualDays.length!==c.days.length)
   hold("ACTUAL_UTC_DAY_LEDGER_COVERAGE_NOT_MATCHED");
  const expectedDays=new Map(c.days.map(x=>[x.chargeDayUtc,x]));
  for(const row of actualDays){
   const d=expectedDays.get(day(row.charge_day_utc));
   if(!d||Number(row.daily_api_ceiling)!==d.dailyApiCeiling||
      Number(row.daily_other_reserved_units)!==d.dailyOtherReservedUnits||
      Number(row.physically_reserved_units)!==0)
    hold("REAL_CHARGE_DATE_REST_DAY_FLOOR_MISMATCH");
  }
  const queryCount=(await client.query(
   "SELECT COUNT(*)::int AS n FROM clean.phase5_fids_allowed_query_v39 "+
   "WHERE manifest_sha256=$1",[c.manifestSha256]
  )).rows[0]?.n;
  if(queryCount!==0)hold("SOURCE_ALREADY_PREPARED_NO_BACKDATED_BUDGET_FREEZE");
  const objects=(await client.query(
   "SELECT "+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39 "+
   " WHERE manifest_sha256=$1) AS release,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_cycle_rest_category_cap_v39 "+
   " WHERE manifest_sha256=$1) AS caps,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_utc_rest_category_budget_v39 "+
   " WHERE manifest_sha256=$1) AS days",[c.manifestSha256]
  )).rows[0];
  if(!objects||objects.release!==0||objects.caps!==0||objects.days!==0)
   hold("FROZEN_V0082_REST_ROWS_ALREADY_EXIST_NO_REPLAY");
  await client.query(
   "INSERT INTO clean.phase5_fids_seven_rest_release_v39 "+
   "(manifest_sha256,reviewed_source_request_grid_sha256,"+
   "reviewed_provider_range_sha256,verified_provider_max_range_minutes,"+
   "reviewed_category_budget_sha256) VALUES ($1,$2,$3,$4,$5)",
   [c.manifestSha256,c.reviewed31DaySourceRequestGridSha256,
    c.reviewedProviderRangeEvidenceSha256,
    c.verifiedProviderMaxRangeMinutes,c.reviewedCategoryBudgetSha256]
  );
  const caps=c.categoryCaps;
  const capV=caps.flatMap(x=>[c.manifestSha256,x.category,x.ceilingUnits]);
  const capSql=caps.map((_,i)=>"($"+(i*3+1)+",$"+(i*3+2)+
    ",$"+(i*3+3)+")").join(",");
  const insertedCaps=await client.query(
   "INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39 "+
   "(manifest_sha256,category,ceiling_units) VALUES "+capSql,capV);
  if(insertedCaps.rowCount!==7)hold("SEVEN_CYCLE_CAPS_NOT_ATOMICALLY_INSERTED");
  const dayRows=c.days.flatMap(d=>d.categoryRows.map(row=>[
   c.manifestSha256,d.chargeDayUtc,row.category,row.plannedUnits
  ]));
  const dayValues=dayRows.flat();
  const daySql=dayRows.map((_,i)=>
   "($"+(i*4+1)+",$"+(i*4+2)+"::date,$"+(i*4+3)+
   ",$"+(i*4+4)+")").join(",");
  const insertedDays=await client.query(
   "INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39 "+
   "(manifest_sha256,charge_day_utc,category,planned_units) VALUES "+
   daySql,dayValues);
  if(insertedDays.rowCount!==totalChargeDayRows)
   hold("EVERY_SEVEN_REST_UTC_CATEGORY_ROW_NOT_FROZEN");
  commitAttempted=true;
  await client.query("COMMIT");started=false;
  return {
   schema:"v39.phase5.v0082.seven-rest-input-freeze-commit.v1",
   status:"SEVEN_CATEGORY_REST_INPUT_FROZEN_NO_GET_OR_PHASE6_RELEASE",
   manifestSha256:c.manifestSha256,
   reviewedCategoryBudgetSha256:c.reviewedCategoryBudgetSha256,
   categoryCapRows:7,actualUtcChargeDays:c.days.length,
   categoryChargeDayRows:totalChargeDayRows,
   databaseInserts:8+totalChargeDayRows,
   providerCalls:0,physicalGetReservations:0,flightPreRowsCreated:0,
   realAirportsCollected:false,sourceRightsCertified:false,
   phase5ScientificFreeze:false,phase6PaidGo:false
  };
 }catch(err){
  if(started&&!commitAttempted)await client.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)hold("AMBIGUOUS_V0082_FREEZE_COMMIT_INDEPENDENT_READBACK_REQUIRED");
  throw err;
 }finally{client.release();}
}
