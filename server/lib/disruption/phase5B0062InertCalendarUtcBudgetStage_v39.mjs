/**
 * Phase5 B0062/V0079 PRE-LAUNCH: one inert calendar+disabled-authority+
 * REST cycle/physical-UTC charge-day staging transaction.
 *
 * Do NOT run on Neon without independently reviewed real prospective input,
 * an explicitly commissioned narrow writer login, and a separate approval.
 * Does NOT run Phase6, install SQL, write V0079 per-draw budgets, publish
 * source queries, call providers, enable auth, or freeze V0082 categories.
 *
 * The 21 ordinary-day flight airports remain UNKNOWN, as designed.
 */
import {createHash} from "node:crypto";
import {buildP5PrelaunchSlotBudgetEnvelope} from
 "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";

const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const SHA=/^[0-9a-f]{64}$/;
const SHA40=/^[0-9a-f]{40}$/;
const ICAO=/^[A-Z]{4}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const UID=/^[A-Za-z0-9_.:-]{6,100}$/;
const ROLE=/^phase5_b0062_prelaunch_stage_[a-z0-9_]{6,32}$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const STARTS=["00","04","08","12","16","20"];
const KNOWN_HUBS=["OMAA","SKBO","WSSS","YSSY"];
const H=3600000,D=86400000;
const hold=x=>{throw Error("REFUSED_P5_INERT_B0062_UTC_STAGE_"+x);};
const num=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const at=x=>{
 if(typeof x!=="string"||!UTC.test(x)||!Number.isFinite(Date.parse(x))||
    new Date(Date.parse(x)).toISOString()!==x)
   hold("NOT_EXACT_UTC_TIME");
 return Date.parse(x);
};
const dayOf=x=>new Date(x).toISOString().slice(0,10);
const weekday=x=>[0,6].includes(new Date(x).getUTCDay())?"weekend":"weekday";
const shapeEnd=(t,s)=>t+(s==="up-to-6h"?6:s==="2x2h"?5:4)*H;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const categoryKeys=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
];
function exactSites(x,regions){
 // Preserve the existing Phase6 FrozenSlotAirport shape; a bare ICAO string
 // would break chooseAirportsForRunDay() for BOTH crossover periods.
 if(!x||typeof x!=="object"||Array.isArray(x)||
    Object.keys(x).length!==4||
    SLOTS.some(k=>!x[k]||typeof x[k]!=="object"||
      Array.isArray(x[k])||Object.keys(x[k]).length!==2||
      !ICAO.test(x[k].icao)||x[k].region!==regions[k])||
    new Set(SLOTS.map(k=>x[k].icao)).size!==4)
  hold("MISSING_FOUR_REGION_BOUND_PAIRED_AIRPORTS");
 return x;
}
function parseDayRows(p){
 const counts={"4h":0,"2x2h":0,"up-to-6h":0};
 const pairs=new Map(),lastSeenSiteEnd=new Map(),slots=[];
 let ordinary=0,prevEnd=-Infinity;
 const days=p.calendarDays;
 for(let i=0;i<31;i++){
  const d=days[i];
  const t=at(d?.startUtc);
  if(d.runDayIndex!==i+1||!STARTS.includes(d.utcSlot)||
     d.utcSlot!==d.startUtc.slice(11,13)||
     d.startUtc.slice(13)!==":00:00.000Z"||
     !Object.hasOwn(counts,d.windowShape)||
     d.partition!==(i<20?"train":i<25?"validation":"test")||
     typeof d.budgetDayId!=="string"||!UID.test(d.budgetDayId)||
     typeof d.frozenDrawSeed!=="string"||!SHA.test(d.frozenDrawSeed)||
     !KNOWN_HUBS.includes(d.anchorIcao)||
     ![d.utcSlot,d.utcSlot+":00"].includes(d.timeClass)||
     !d.slotRegions||typeof d.slotRegions!=="object"||
     Array.isArray(d.slotRegions)||
     Object.keys(d.slotRegions).length!==4||
     SLOTS.some(k=>typeof d.slotRegions[k]!=="string"||
       !/^[A-Z0-9_-]{2,40}$/.test(d.slotRegions[k]))||
     t<prevEnd)
   hold("INVALID_FUTURE_B0062_CALENDAR_DAY");
  const end=shapeEnd(t,d.windowShape);
  prevEnd=end;counts[d.windowShape]++;slots.push(d.utcSlot);
  const paired=(i<5||i>=6&&i<11);
  if(!paired){
   ordinary++;
   if(d.pairId!==null||d.crossoverPeriod!==null||
      d.pairRole!==null||d.pairAirportSet!==null||
      d.drawType!=="NEW_TEMPLATE")
    hold("ORDINARY_DAY_FUTURE_AIRPORTS_NOT_PROSPECTIVE");
  }else{
   if(!/^pair_00[1-5]$/.test(d.pairId??"")||
      d.crossoverPeriod!==(i<5?1:2)||
      d.pairId!=="pair_00"+String((i<5?i:i-6)+1)||
      !["control","alternative"].includes(d.pairRole)||
      d.drawType!==(d.crossoverPeriod===2?"PAIR_REPLAY":"NEW_TEMPLATE"))
    hold("CROSSOVER_PAIR_ROLE_OR_PERIOD_MISMATCH");
   const airports=exactSites(d.pairAirportSet,d.slotRegions);
   if(airports.HUB.icao!==d.anchorIcao)
    hold("PAIRED_HUB_NOT_ANCHOR");
   const list=pairs.get(d.pairId)??[];
   list.push({...d,end,weekday:weekday(t)});
   pairs.set(d.pairId,list);
   // Only already known paired airport identities can be checked prelaunch.
   // Ordinary-day identities MUST remain prospective; cannot claim all washouts.
   for(const site of SLOTS.map(k=>airports[k].icao)){
    if(lastSeenSiteEnd.has(site)&&t-lastSeenSiteEnd.get(site)<D)
     hold("PRESELECTED_PAIR_SITE_24H_WASHOUT");
    lastSeenSiteEnd.set(site,end);
   }
  }
 }
 for(let i=0;i<30;i+=6){
  const block=slots.slice(i,i+6);
  if(block.length!==6||new Set(block).size!==6)
   hold("SIX_UTC_SLOTS_NOT_BALANCED");
 }
 if(counts["4h"]!==26||counts["2x2h"]!==3||
    counts["up-to-6h"]!==2||ordinary!==21||pairs.size!==5)
  hold("31_DAY_F8_SHAPE_COUNTS_MISMATCH");
 let controlFirst=0,alternativeFirst=0,split=0,six=0;
 for(let i=1;i<=5;i++){
  const arr=pairs.get("pair_00"+i);
  if(!arr||arr.length!==2)hold("PAIR_NOT_PRESENT_TWICE");
  const [a,b]=arr;
  if(a.crossoverPeriod!==1||b.crossoverPeriod!==2||
     !same(a.pairAirportSet,b.pairAirportSet)||
     a.utcSlot!==b.utcSlot||a.timeClass!==b.timeClass||
     a.weekday!==b.weekday||
     a.pairRole===b.pairRole)
   hold("PAIRED_REPLAY_IDENTITY_OR_WEEKDAY_DRIFT");
  if(a.pairRole==="control")controlFirst++;else alternativeFirst++;
  for(const r of arr){
   if(r.pairRole==="control"&&r.windowShape!=="4h")
    hold("PAIR_CONTROL_NOT_4H");
   if(r.pairRole==="alternative"){
    const wanted=i<=3?"2x2h":"up-to-6h";
    if(r.windowShape!==wanted)hold("PAIR_ALTERNATIVE_WRONG_SHAPE");
    if(wanted==="2x2h")split++;else six++;
   }
  }
 }
 if(controlFirst!==3||alternativeFirst!==2||split!==3||six!==2)
  hold("TREATMENT_ORDER_OR_CROSSOVER_SHAPE_UNBALANCED");
 return {knownPairedAirportDays:10,unknownOrdinaryAirportDays:21};
}
function checkAlert(a){
 const keys=[
  ["unsettledBurstMarginCredits",0,1899],
  ["protectedAlertFloorCredits",1000,57900],
  ["alertRunSpendCeilingCredits",1,57900],
  ["dailySoftStopMarginCredits",0,1899],
  ["productionReconcileToleranceCredits",0,1900],
  ["startAdmissionToleranceSeconds",0,900],
  ["safetyWatchdogPollMs",250,60000],
  ["settlementInitialWaitSeconds",0,3600],
  ["settlementPollIntervalSeconds",1,3600],
  ["settlementStableReadCount",3,20],
  ["settlementTimeoutSeconds",1,86400]
 ];
 if(!a||keys.some(([k,min,max])=>!num(a[k],min,max))||
    a.dailySoftStopMarginCredits<a.unsettledBurstMarginCredits)
  hold("ALERT_SAFETY_POLICY_NOT_FROZEN");
}
export function compileP5InertB0062UtcStagePacket(p,review){
 if(!p||p.schema!=="v39.phase5.b0062-inert-utc-stage-input.v1"||
    !review||!SHA.test(review.expectedSignedStagePacketSha256)||
    review.independentCalendarTreatmentReviewApproved!==true||
    review.independentProviderAccountAndRestBudgetReviewApproved!==true||
    review.narrowPrelaunchOwnerApproved!==true||
    !ROLE.test(review.expectedExactWriterRole)||
    hash(p)!==review.expectedSignedStagePacketSha256||
    ![p.manifestSha256,p.calendarSha256,p.configSha256,p.frameSha256,
      p.expectedSignedCalendarRowsSha256].every(x=>SHA.test(x))||
    !SHA40.test(p.codeSha40)||
    !UID.test(p.phase6AuthorizationId??"")||
    !Array.isArray(p.calendarDays)||p.calendarDays.length!==31||
    hash(p.calendarDays)!==p.expectedSignedCalendarRowsSha256||
    !Array.isArray(p.predecessorEvidenceIds)||p.predecessorEvidenceIds.length<1||
    p.predecessorEvidenceIds.some(x=>typeof x!=="string"||!UID.test(x))||
    new Set(p.calendarDays.map(x=>x.budgetDayId)).size!==31)
   hold("MISSING_VERIFIED_INDEPENDENT_PRELAUNCH_REVIEW");
 checkAlert(p.alertSafety);
 const {knownPairedAirportDays,unknownOrdinaryAirportDays}=parseDayRows(p);
 if(!p.slotBudgetInput||p.slotBudgetInput.manifestSha256!==p.manifestSha256||
    p.slotBudgetInput.calendarSha256!==p.calendarSha256||
    p.slotBudgetInput.configSha256!==p.configSha256||
    p.slotBudgetInput.frameSha256!==p.frameSha256||
    !same(p.slotBudgetInput.calendarDays,
      p.calendarDays.map(d=>({
       runDayIndex:d.runDayIndex,startUtc:d.startUtc,utcSlot:d.utcSlot,
       windowShape:d.windowShape,partition:d.partition
      }))))
   hold("COST_ENVELOPE_NOT_BOUND_TO_THE_31_PARENT_DAYS");
 // Rebuild and verify the immutable slot budget; it is NOT an exact-ICAO
 // Stage22 source grid and cannot be treated as a V0082 release.
 const budget=buildP5PrelaunchSlotBudgetEnvelope(p.slotBudgetInput);
 if(budget.status!=="SLOT_BUDGET_ONLY_CANDIDATE_AIRPORT_IDENTITIES_NOT_FROZEN"||
    budget.ordinaryAdaptiveAirportDaysUnselected!==21||
    budget.actualFlightQueryGridCertified!==false||
    budget.phase6PaidGo!==false||
    budget.physicalGetReservations!==0)
  hold("UNSAFE_OR_ACTIVATED_PRELAUNCH_SLOT_BUDGET");
 if(!SHA.test(p.expectedSignedSlotEnvelopeSha256)||
    budget.prelaunchEnvelopeSha256!==p.expectedSignedSlotEnvelopeSha256||
    budget.utcCategoryRows.length<31||
    budget.utcCategoryRows.some(d=>categoryKeys.some(k=>!num(d.categories[k],0,50000))))
  hold("MISSING_SIGNED_FULL_SEVEN_REST_CHARGE_DAY_ENVELOPE");
 if(p.calendarDays[0].startUtc.slice(0,10)!==
    p.phase6StartDateUtc||p.phase6StartDateUtc!==p.slotBudgetInput.calendarDays[0].startUtc.slice(0,10))
  hold("PHASE6_AUTHORITY_START_DATE_WRONG");
 return {
  schema:"v39.phase5.b0062-utc-stage-reviewed-packet.v1",
  status:"REVIEWED_INERT_CALENDAR_AUTH_AND_UTC_CYCLE_CANDIDATE_NO_GO",
  stagePacketSha256:hash(p),calendarSha256:p.calendarSha256,
  sourceSlotBudgetSha256:budget.prelaunchEnvelopeSha256,
  manifestSha256:p.manifestSha256,configSha256:p.configSha256,
  frameSha256:p.frameSha256,codeSha40:p.codeSha40,
  authorizationId:p.phase6AuthorizationId,phase6StartDateUtc:p.phase6StartDateUtc,
  predecessorEvidenceIds:p.predecessorEvidenceIds,
  alertSafety:p.alertSafety,
  calendarDays:p.calendarDays,
  budget,
  expectedWriterRole:review.expectedExactWriterRole,
  knownPairedAirportDays,unknownOrdinaryAirportDays,
  exactFutureSourceQueriesPublished:0,
  v0079PerDayEarlyDrawBudgetsCreated:0,
  v0082CategoryBudgetFreezeCreated:false,
  providerRightsAuthenticatedByThisModule:false,
  independentScientificFreezeAuthenticatedByThisModule:false,
  providerCalls:0,paidAlertCreates:0,phase6PaidGo:false
 };
}
const STAGE_TABLES=[
 "clean.adb_phase6_calendar_day",
 "clean.adb_phase6_authorization",
 "clean.phase5_fids_cycle_budget_v39",
 "clean.phase5_fids_utc_charge_budget_v39"
];
const OTHER_TABLES=[
 "clean.adb_sampling_draw",
 "clean.phase5_fids_day_budget_v39",
 "clean.phase5_fids_allowed_query_v39",
 "clean.phase5_fids_seven_rest_release_v39",
 "clean.phase5_fids_cycle_rest_category_cap_v39",
 "clean.phase5_fids_utc_rest_category_budget_v39"
];
export async function commitP5InertB0062UtcStageOnce(pool,p,review){
 const packet=compileP5InertB0062UtcStagePacket(p,review);
 if(!pool||typeof pool.connect!=="function")
  hold("MISSING_DEDICATED_NARROW_DB_POOL");
 const client=await pool.connect();
 let begun=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");begun=true;
  await client.query("SET LOCAL statement_timeout='25000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const who=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "session_user AS session_actor,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now_utc"
  )).rows[0];
  if(who?.db!=="neondb"||who.actor!==packet.expectedWriterRole||
     who.session_actor!==packet.expectedWriterRole||
     who.ro!=="off"||who.replica!==false)
   hold("WRONG_DATABASE_OR_NONDEDICATED_DB_SESSION");
  const probes=[
   ...[...STAGE_TABLES,...OTHER_TABLES].map(t=>[t,"SELECT",true]),
   ...STAGE_TABLES.map(t=>[t,"INSERT",true]),
   ...[...STAGE_TABLES,...OTHER_TABLES].flatMap(t=>
    ["UPDATE","DELETE","TRUNCATE"].map(perm=>[t,perm,false])),
   ...OTHER_TABLES.map(t=>[t,"INSERT",false]),
   ...["clean.fids_query_response","clean.flight_population",
       "clean.flight_snapshots","clean.phase5_fids_original_binding_v39"].
       flatMap(t=>["SELECT","INSERT","UPDATE","DELETE"].map(
         perm=>[t,perm,false]))
  ];
  const sql="SELECT "+probes.map(([table,priv],i)=>
    "has_table_privilege(current_user,'"+table+"','"+priv+"') AS p"+i
  ).join(",");
  const rights=(await client.query(sql)).rows[0];
  if(!rights||probes.some(([, ,expect],i)=>rights["p"+i]!==expect))
   hold("NARROW_STAGER_HAS_EXCESS_PRIVILEGES_OR_MISSING_GRANT");
  await client.query(
   "SELECT pg_advisory_xact_lock(hashtext('p5-b0062-inert-utc-stage'),hashtext($1))",
   [packet.manifestSha256]);
  // Do not reinterpret historical flight tables: only the virgin Phase6
  // B0062/V0079/V0082 release surface must be empty.
  const snapshot=(await client.query("SELECT "+[...STAGE_TABLES,...OTHER_TABLES].
    map((table,i)=>"(SELECT COUNT(*)::int FROM "+table+") AS n"+i).join(","))).rows[0];
  if(!snapshot||[...STAGE_TABLES,...OTHER_TABLES].some((_,i)=>snapshot["n"+i]!==0))
   hold("NOT_AN_EMPTY_PHASE6_COLD_START_NEVER_OVERWRITE_OR_RETRY");
  const now=new Date(who.now_utc).getTime();
  // The source, early selection, and independent paid authorization must
  // still occur in the future. No backdated source or late first-day write.
  if(Date.parse(packet.calendarDays[0].startUtc)-now<=
       (24*H+45*60000+5*60000)||
     Date.parse(packet.budget.asOfUtc)>now)
   hold("FIRST_PRE_SOURCE_OR_DB_CLOCK_STAGING_UNSAFE");
  // 31 immutable B0062 rows (21 ordinary airport IDs still unknown).
  for(const d of packet.calendarDays){
   await client.query(
    "INSERT INTO clean.adb_phase6_calendar_day "+
    "(run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,"+
    "utc_slot,time_class,window_shape,evaluation_partition,"+
    "crossover_group_id,crossover_period,pair_role,draw_type,"+
    "slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,"+
    "scheduled_start_utc,active_duration_minutes,frame_hash) "+
    "VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10,$11,$12,$13,"+
    "$14::jsonb,$15,$16::jsonb,$17,$18::timestamptz,$19,$20)",
    [d.runDayIndex,d.budgetDayId,p.calendarSha256,p.configSha256,
     dayOf(Date.parse(d.startUtc)),d.utcSlot,d.timeClass,d.windowShape,
     d.partition,d.pairId,d.crossoverPeriod,d.pairRole,d.drawType,
     JSON.stringify(d.slotRegions),d.anchorIcao,
     d.pairAirportSet===null?null:JSON.stringify(d.pairAirportSet),
     d.frozenDrawSeed,d.startUtc,
     d.windowShape==="up-to-6h"?360:240,p.frameSha256]
   );
  }
  const a=packet.alertSafety;
  await client.query(
   "INSERT INTO clean.adb_phase6_authorization "+
   "(singleton_key,authorization_id,manifest_sha256,calendar_hash,config_hash,"+
   "code_sha,schema_version,phase6_start_date,alert_cap_per_parent_day,"+
   "unsettled_burst_margin_credits,protected_alert_floor,enabled,"+
   "predecessor_evidence_ids,revoked_at_utc,start_admission_tolerance_seconds,"+
   "phase6_alert_spend_ceiling,daily_soft_stop_margin_credits,"+
   "production_reconcile_tolerance_credits,safety_watchdog_poll_ms,"+
   "settlement_initial_wait_seconds,settlement_poll_interval_seconds,"+
   "settlement_stable_read_count,settlement_timeout_seconds) "+
   "VALUES (true,$1,$2,$3,$4,$5,'v39',$6::date,1900,$7,$8,false,"+
   "$9::jsonb,NULL,$10,$11,$12,$13,$14,$15,$16,$17,$18)",
   [packet.authorizationId,p.manifestSha256,p.calendarSha256,p.configSha256,
    p.codeSha40,packet.phase6StartDateUtc,
    a.unsettledBurstMarginCredits,a.protectedAlertFloorCredits,
    JSON.stringify(packet.predecessorEvidenceIds),
    a.startAdmissionToleranceSeconds,a.alertRunSpendCeilingCredits,
    a.dailySoftStopMarginCredits,a.productionReconcileToleranceCredits,
    a.safetyWatchdogPollMs,a.settlementInitialWaitSeconds,
    a.settlementPollIntervalSeconds,a.settlementStableReadCount,
    a.settlementTimeoutSeconds]
  );
  await client.query(
   "INSERT INTO clean.phase5_fids_cycle_budget_v39 "+
   "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units,physically_reserved_units) "+
   "VALUES ($1,$2,$3,$4,0)",
   [p.manifestSha256,packet.budget.cycleRestCeilingUnits,
    packet.budget.cycleOtherUnits,packet.budget.protectedRestFloorUnits]
  );
  for(const d of packet.budget.utcCategoryRows){
   await client.query(
    "INSERT INTO clean.phase5_fids_utc_charge_budget_v39 "+
    "(manifest_sha256,charge_day_utc,daily_api_ceiling,"+
    "daily_other_reserved_units,physically_reserved_units) "+
    "VALUES ($1,$2::date,$3,$4,0)",
    [p.manifestSha256,d.chargeDayUtc,d.dailyRestCeilingUnits,
     d.dailyOtherReservedUnits]
   );
  }
  commitAttempted=true;await client.query("COMMIT");begun=false;
  return {
   schema:"v39.phase5.b0062-inert-stage-commit.v1",
   status:"INERT_31_DAY_CALENDAR_DISABLED_AUTH_AND_UTC_REST_STAGED_NO_GO",
   manifestSha256:packet.manifestSha256,
   stagePacketSha256:packet.stagePacketSha256,
   calendarRows:31,disabledPhase6AuthorizationRows:1,
   v0079CycleBudgetRows:1,
   v0079PhysicalUtcChargeBudgetRows:packet.budget.utcCategoryRows.length,
   v0079PerDrawDayBudgetRows:0,v0082SevenRestFreezeRows:0,
   sourceQueries:0,physicalGetReservations:0,
   providerCalls:0,paidAlertCreates:0,phase6PaidGo:false,
   separatelyAuditedProductionState:false
  };
 }catch(e){
  if(begun)await client.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)
   hold("UNKNOWN_COMMIT_RESULT_QUARANTINE_READONLY_AUDIT_NO_RETRY");
  throw e;
 }finally{client.release();}
}
