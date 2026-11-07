/**
 * Phase5 Stage21: f.8 §8.7 calendar structural FREEZE guard.
 *
 * NOT the missing global SAT optimizer or a released 31-day manifest.
 * Rejects 31-consecutive-4h as a substitute for the binding 31 BATCH DAYS
 * with five matched crossovers, split windows and post-window washout.
 * Pure deterministic JavaScript; NO database, provider, flight, or billing IO.
 */
import {createHash} from "node:crypto";
const SHA=/^[a-f0-9]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const UTC_SLOTS=["00","04","08","12","16","20"];
const PAIRS=["pair_001","pair_002","pair_003","pair_004","pair_005"];
const D=86_400_000,H=3_600_000;
const fmt=n=>new Date(n).toISOString();
const hash=s=>createHash("sha256").update(s).digest("hex");
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const isUtc=s=>typeof s==="string"&&ISO.test(s)&&
  Number.isFinite(Date.parse(s))&&fmt(Date.parse(s))===s;
const saneInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const key=day=>day.pairId??"ordinary";
const failure=(e,why)=>{if(!e.includes(why))e.push(why);};

/** Exact reproducible balanced pair treatment order; not an observed draw. */
export function deriveP5F8SeededPairRoles(seed,pairTemplates){
 if(!SHA.test(seed)||!Array.isArray(pairTemplates)||
    pairTemplates.length!==5||
    new Set(pairTemplates.map(x=>x?.pairId)).size!==5||
    pairTemplates.some(x=>!PAIRS.includes(x?.pairId)||
      !SHA.test(x?.frozenPairTemplateSha256)))
   throw Error("REFUSED_P5_F8_INVALID_SEEDED_PAIR_TEMPLATES");
 const ordered=pairTemplates.map(p=>({
  ...p,rank:hash(seed+"|"+p.pairId+"|"+p.frozenPairTemplateSha256)
 })).sort((a,b)=>a.rank.localeCompare(b.rank)||a.pairId.localeCompare(b.pairId));
 // Three control-first, two alternative-first. Randomized before the run;
 // this is a versioned proposal, not provider science or a hidden redraw.
 return ordered.map((x,i)=>({
  pairId:x.pairId,
  frozenPairTemplateSha256:x.frozenPairTemplateSha256,
  period1Role:i<3?"control":"alternative",
  period2Role:i<3?"alternative":"control"
 })).sort((a,b)=>a.pairId.localeCompare(b.pairId));
}

/**
 * Pure "verify candidate" contract. No dates/airports/rights are manufactured.
 * 'SAT_STRUCTURAL' is only a mathematical candidate admission: it is NOT a
 * signed actual calendar and cannot authorize source/Alert flight calls.
 */
export function auditP5F8CrossoverCandidate(p){
 const errors=[];
 if(!p||p.schema!=="v39.phase5.f8.crossover-calendar-candidate.v1"||
  !SHA.test(p.calendarSha256)||!SHA.test(p.crossoverSeedSha256)||
  !SHA.test(p.frozenRegionScheduleSha256)||
  !SHA.test(p.frozenFrameSha256)||
  !Array.isArray(p.days)||p.days.length!==31||
  !saneInt(p.projectRestCeilingUnits,1,50000)||
  !saneInt(p.otherRestCycleReservedUnits,0,50000)||
  !saneInt(p.protectedRestFloorUnits,0,50000))
  return {
   schema:"v39.phase5.f8.calendar-structural-audit.v1",
   status:"UNSAT_MISSING_OR_UNFROZEN_CALENDAR_INPUT",
   errors:["INVALID_OR_INCOMPLETE_FROZEN_CALENDAR_PACKET"],
   phase5FreezePassed:false,phase6Go:false
  };
 const byPair=new Map();
 const seenAirports=new Map();
 const shapeCount={"4h":0,"2x2h":0,"up-to-6h":0};
 const slots=[];
 const starts=new Set(),alertIds=new Set();
 let prevStart=-Infinity,prevEnd=-Infinity,restFids=0;
 let restOther=0,alertPlanned=0,ordinary=0;
 for(let index=0;index<p.days.length;index++){
  const row=p.days[index],n=index+1;
  if(!row||row.runDayIndex!==n){
   failure(errors,"UNORDERED_OR_DUPLICATE_RUN_DAY_INDEX");continue;
  }
  if(!isUtc(row.startUtc)||!isUtc(row.endUtc)){
   failure(errors,"INVALID_SERVICE_WINDOW_UTC");continue;
  }
  const start=Date.parse(row.startUtc),end=Date.parse(row.endUtc);
  if(start<=prevStart||start<prevEnd||end<=start)
   failure(errors,"CHRONOLOGY_OVERLAP_OR_NONINCREASING_WINDOW");
  prevStart=start;prevEnd=end;
  if(starts.has(row.startUtc))failure(errors,"DUPLICATE_START");
  starts.add(row.startUtc);
  const slot=row.startUtc.slice(11,13);
  slots.push(slot);
  if(!UTC_SLOTS.includes(slot)||row.startUtc.slice(13,23)!==":00:00.000")
   failure(errors,"NOT_ONE_OF_SIX_FROZEN_UTC_SLOTS");
  if(row.utcSlot!==slot)failure(errors,"UTC_SLOT_NOT_BOUND_TO_WINDOW");
  if(!own(shapeCount,row.windowShape))
   failure(errors,"UNRECOGNIZED_WINDOW_SHAPE");
  else shapeCount[row.windowShape]++;
  const seg=row.segments;
  if(!Array.isArray(seg)||seg.length!==(row.windowShape==="2x2h"?2:1)||
     seg.some(s=>!isUtc(s?.startUtc)||!isUtc(s?.endUtc))){
   failure(errors,"INVALID_EXACT_SEGMENT_FRAME");
  }else{
   const startsMs=seg.map(s=>Date.parse(s.startUtc));
   const endsMs=seg.map(s=>Date.parse(s.endUtc));
   if(startsMs[0]!==start||endsMs.at(-1)!==end)
    failure(errors,"SEGMENT_PARENT_FRAME_NOT_MATCHED");
   if(row.windowShape==="2x2h"){
    if(endsMs[0]-startsMs[0]!==2*H||
       endsMs[1]-startsMs[1]!==2*H||
       startsMs[1]<=endsMs[0])
     failure(errors,"SPLIT_2X2_EXPOSURE_OR_GAP_INVALID");
   }else if(end-start!==(row.windowShape==="4h"?4:6)*H)
    failure(errors,"STANDARD_OR_UPTO6H_PLANNED_DURATION");
  }
  if(!row.airports||SLOTS.some(s=>!ICAO.test(row.airports[s]??""))||
     Object.keys(row.airports).length!==4||
     new Set(Object.values(row.airports)).size!==4)
   failure(errors,"FOUR_DISTINCT_FROZEN_AIRPORT_IDENTITIES_REQUIRED");
  else{
   for(const slotId of SLOTS){
    const airport=row.airports[slotId];
    const last=seenAirports.get(airport);
    if(last!==undefined&&start-last<24*H)
     failure(errors,"REPEATED_AIRPORT_24H_END_TO_START_WASHOUT");
    seenAirports.set(airport,end);
   }
  }
  if(!row.targetRegions||Object.keys(row.targetRegions).length!==4||
     SLOTS.some(s=>typeof row.targetRegions[s]!=="string"||
       !/^[A-Z0-9_-]{2,40}$/.test(row.targetRegions[s])))
   failure(errors,"FOUR_TARGET_REGIONS_NOT_FROZEN");
  if(!["train","validation","test"].includes(row.partition))
   failure(errors,"MISSING_DISJOINT_EVALUATION_PARTITION");
  if(!["NEW_TEMPLATE","PAIR_REPLAY"].includes(row.drawType))
   failure(errors,"UNKNOWN_NEW_VS_REPLAY_DRAW");
  if(!saneInt(row.plannedAlertCredits,0,1900)||
     !saneInt(row.unsettledAlertMarginCredits,0,1900)||
     !saneInt(row.alertDayCeilingCredits,1,1900)||
     row.plannedAlertCredits+row.unsettledAlertMarginCredits>
       row.alertDayCeilingCredits)
   failure(errors,"ALERT_PARENT_DAY_CAP_OR_UNSETTLED_MARGIN");
  if(typeof row.alertBudgetDayId!=="string"||
     !/^[A-Za-z0-9_.:-]{6,100}$/.test(row.alertBudgetDayId)||
     alertIds.has(row.alertBudgetDayId))
   failure(errors,"DUPLICATE_OR_MISSING_ALERT_PARENT_BUDGET_DAY");
  alertIds.add(row.alertBudgetDayId);
  if(!saneInt(row.fidsRestUnitsReserved,0,50000)||
     !saneInt(row.otherRestUnitsReserved,0,50000))
   failure(errors,"UNPRICED_SOURCE_OR_OTHER_REST_UNIT_RESERVATION");
  else{
   restFids+=row.fidsRestUnitsReserved;
   restOther+=row.otherRestUnitsReserved;
  }
  if(Number.isSafeInteger(row.plannedAlertCredits))
   alertPlanned+=row.plannedAlertCredits;
  const hasPair=typeof row.pairId==="string";
  if(hasPair){
   if(!PAIRS.includes(row.pairId)||!SHA.test(row.frozenPairTemplateSha256)||
      ![1,2].includes(row.crossoverPeriod)||
      !["control","alternative"].includes(row.pairRole))
    failure(errors,"INVALID_FROZEN_MATCHED_PAIR_IDENTITY");
   const entries=byPair.get(row.pairId)??[];
   entries.push(row);byPair.set(row.pairId,entries);
   if(row.pairRole==="control"&&row.windowShape!=="4h")
    failure(errors,"CROSSOVER_CONTROL_NOT_4H");
   if(row.pairRole==="alternative"&&row.windowShape==="4h")
    failure(errors,"CROSSOVER_ALTERNATIVE_NOT_DIFFERENT_SHAPE");
  }else{
   ordinary++;
   if(row.pairId!==null||row.crossoverPeriod!==null||
      row.pairRole!=="ordinary"||
      row.frozenPairTemplateSha256!==null||
      row.windowShape!=="4h"||row.drawType!=="NEW_TEMPLATE")
    failure(errors,"ORDINARY_DAY_TREATED_AS_CROSSOVER");
  }
 }
 for(let i=0;i<30;i+=6){
  const block=slots.slice(i,i+6);
  if(block.length!==6||new Set(block).size!==6||
    UTC_SLOTS.some(s=>!block.includes(s)))
   failure(errors,"INCOMPLETE_SIX_DAY_UTC_SLOT_PERMUTATION");
 }
 if(shapeCount["4h"]!==26||shapeCount["2x2h"]!==3||
    shapeCount["up-to-6h"]!==2||ordinary!==21)
   failure(errors,"F8_26_3_2_SHAPE_OR_21_ORDINARY_TOTALS");
 if(byPair.size!==5||PAIRS.some(k=>!byPair.has(k)))
   failure(errors,"F8_EXACT_FIVE_CROSSOVER_PAIRS");
 const templates=[];
 let splitPairs=0,sixPairs=0;
 for(const id of PAIRS){
  const arr=byPair.get(id);
  if(!arr||arr.length!==2){
   failure(errors,"PAIR_WITHOUT_EXACT_TWO_PARENT_BATCH_DAYS");continue;
  }
  const one=arr.find(x=>x.crossoverPeriod===1);
  const two=arr.find(x=>x.crossoverPeriod===2);
  if(!one||!two||Date.parse(one.startUtc)>=Date.parse(two.startUtc)){
   failure(errors,"PAIR_PERIOD_ORDER_OR_DUPLICATE_PERIOD");continue;
  }
  if(one.frozenPairTemplateSha256!==two.frozenPairTemplateSha256)
   failure(errors,"PAIR_TEMPLATE_CHANGED_BETWEEN_PERIODS");
  else templates.push({pairId:id,
    frozenPairTemplateSha256:one.frozenPairTemplateSha256});
  if(one.utcSlot!==two.utcSlot||one.partition!==two.partition||
     new Date(one.startUtc).getUTCDay()%6===0!==
      (new Date(two.startUtc).getUTCDay()%6===0))
   failure(errors,"PAIR_TIME_WEEKDAY_OR_PARTITION_MISMATCH");
  if(SLOTS.some(s=>one.airports?.[s]!==two.airports?.[s]||
      one.targetRegions?.[s]!==two.targetRegions?.[s]))
   failure(errors,"PAIR_AIRPORT_OR_TARGET_REGION_REDRAW");
  if(one.drawType!=="NEW_TEMPLATE"||two.drawType!=="PAIR_REPLAY")
   failure(errors,"PAIR_PERIOD2_MUST_REPLAY_FROZEN_PERIOD1");
  if(one.pairRole===two.pairRole||
    !["control","alternative"].includes(one.pairRole)||
    !["control","alternative"].includes(two.pairRole))
   failure(errors,"PAIR_REQUIRES_ONE_CONTROL_ONE_ALTERNATIVE");
  const alt=one.pairRole==="alternative"?one:two;
  if(alt.windowShape==="2x2h")splitPairs++;
  else if(alt.windowShape==="up-to-6h")sixPairs++;
  else failure(errors,"PAIR_HAS_NO_SUPPORTED_ALTERNATIVE");
 }
 if(splitPairs!==3||sixPairs!==2)
  failure(errors,"F8_EXACT_3_SPLIT_PAIRS_2_SIX_HOUR_PAIRS");
 if(templates.length===5&&errors.length===0){
  const expected=deriveP5F8SeededPairRoles(p.crossoverSeedSha256,templates);
  for(const item of expected){
   const r=byPair.get(item.pairId);
   if(r.find(x=>x.crossoverPeriod===1)?.pairRole!==item.period1Role||
      r.find(x=>x.crossoverPeriod===2)?.pairRole!==item.period2Role)
    failure(errors,"TREATMENT_ORDER_NOT_FROM_FROZEN_SEEDED_DRAW");
  }
 }
 if(restFids+restOther+p.otherRestCycleReservedUnits+
   p.protectedRestFloorUnits>p.projectRestCeilingUnits)
  failure(errors,"PROJECT_CYCLE_REST_RESERVATIONS_OVER_CEILING");
 if(restFids===0)failure(errors,"NO_EXPLICIT_FIDS_REST_RESERVATIONS");
 const valid=errors.length===0;
 return {
  schema:"v39.phase5.f8.calendar-structural-audit.v1",
  status:valid?"SAT_STRUCTURAL_CANDIDATE_NOT_FINAL_FREEZE":
    "UNSAT_HARD_F8_CALENDAR_CONSTRAINTS",
  errors,proposedCalendarSha256:hash(JSON.stringify(p)),
  requestedBatchDays:31,
  plannedShapes:shapeCount,
  matchedPairs:byPair.size,
  completedUTCSlotSixDayBlocks:5,
  ordinaryFourHourDays:ordinary,
  crossover2x2Pairs:splitPairs,crossoverUpTo6hPairs:sixPairs,
  plannedAlertCredits:alertPlanned,
  plannedFidsRestUnits:restFids,
  plannedOtherRestUnits:restOther,
  planningInputsIndependentlyCertified:false,
  requiredRegionPermutationAndAnchorFrameVerified:false,
  adaptiveAirportDrawsCommittedBeforeT24:false,
  providerMeasuredRangeAndActualChargeDaysVerified:false,
  crossoversScientificallyExecuted:false,
  sourceRightsAndRealOperatingLegVerified:false,
  providerCalls:0,databaseWrites:0,phase5FreezePassed:false,
  phase6Go:false
 };
}
