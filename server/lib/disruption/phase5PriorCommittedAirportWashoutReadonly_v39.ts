/**
 * Phase 5 independent PRE-SOURCE readback: the persisted draw for an ordinary
 * run day cannot certify >=24h prior-END to current-START airport washout unless
 * all earlier committed parent days are read from the SAME READ ONLY snapshot.
 *
 * This is a PURE checker over restricted PostgreSQL SELECT results. The caller
 * owns the verified REPEATABLE READ READ ONLY transaction and the reviewed
 * 31-day shape SHA; no provider calls, side effects or Phase6 authorization.
 */
import {createHash} from "node:crypto";
import {verifyPreparedDailyDraw,type PreparedDayForReadback,
 type PreparedDrawRow} from "./phase5EarlyPreselectionReadback_v39";
import type {P5Adaptive31ShapeEnvelope} from
 "./phase5Prospective31DayShapeEnvelope_v39";

const DAY_MS=86_400_000;
const ICAO=/^[A-Z]{4}$/;
const SHA=/^[a-f0-9]{64}$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const refuse=(reason:string):never=>{
 throw Error("REFUSED_P5_PRIOR_COMMITTED_WASHOUT_"+reason);
};
const millis=(v:unknown):number=>{
 const n=v instanceof Date?v.getTime():Date.parse(String(v));
 if(!Number.isFinite(n))refuse("INVALID_PERSISTED_TIMESTAMP");
 return n;
};
const norm=(v:unknown):string=>{
 if(typeof v!=="string")refuse("INVALID_PRIOR_ICAO");
 const s=v.trim().toUpperCase();
 if(!ICAO.test(s))refuse("INVALID_PRIOR_ICAO");
 return s;
};
const obj=(v:unknown):Record<string,unknown>=>{
 if(!v||typeof v!=="object"||Array.isArray(v))
  refuse("INVALID_PRIOR_DB_ROW");
 return v as Record<string,unknown>;
};

export interface P5JoinedPriorDayRow {
 run_day_index:unknown;
 scheduled_start_utc:unknown;
 frozen_draw_seed:unknown;
 draw_type:unknown;
 anchor_icao:unknown;
 slot_regions:unknown;
 pair_airport_set:unknown;
 calendar_hash:unknown;
 config_hash:unknown;
 frame_hash:unknown;
 date_utc:unknown;
 window_shape:unknown;
 active_duration_minutes:unknown;
 slot_id:unknown;
 target_region:unknown;
 selected_draw_type:unknown;
 selected_icao:unknown;
 selected_draw_seed:unknown;
 selected_at_utc:unknown;
 adaptive_state_hash:unknown;
 probability_vector:unknown;
 airport_layer_design_probability:unknown;
}
export interface P5PriorCommittedWashoutInput {
 envelope:P5Adaptive31ShapeEnvelope;
 independentlyReviewedShapeEnvelopeSha256:string;
 expectedCalendarSha256:string;
 expectedConfigSha256:string;
 expectedFrameSha256:string;
 currentRunDayIndex:number;
 currentStartUtc:string;
 currentSelectedIcaos:Record<typeof SLOTS[number],string>;
 dbClockAtReadUtc:string;
 joinedEarlierDays:readonly P5JoinedPriorDayRow[];
}
export interface P5PriorCommittedWashoutAudit {
 status:"ALL_EARLIER_COMMITTED_SITES_WASHOUT_VERIFIED_NOT_SOURCE_GO";
 priorParentDaysVerified:number;
 priorAirportDayObservationsVerified:number;
 currentAirportCount:4;
 minimumRequiredEndToStartHours:24;
 priorWindowEndingSource:"REVIEWED_31_DAY_SHAPE_NOT_LAST_SELECTED_START";
 restrictedSnapshotCallerResponsible:true;
 sourceOriginalAndPreVerified:false;
 providerCalls:0;databaseWrites:0;
 phase5FreezePassed:false;phase6Go:false;
}

export function inspectP5PriorCommittedAirportWashoutReadonly(
 input:P5PriorCommittedWashoutInput
):P5PriorCommittedWashoutAudit {
 const e=input?.envelope;
 if(!e||e.schema!=="v39.phase5.31day-shape-with-prospective-adaptive-draws.v1"||
    e.status!=="PROVISIONAL_SHAPE_ENVELOPE_ONLY_21_ADAPTIVE_DRAWS_PENDING"||
    !SHA.test(input.independentlyReviewedShapeEnvelopeSha256)||
    e.shapeEnvelopeSha256!==input.independentlyReviewedShapeEnvelopeSha256||
    createHash("sha256").update(JSON.stringify(e.days)).digest("hex")!==
     e.shapeEnvelopeSha256||e.days.length!==31||
    !SHA.test(input.expectedCalendarSha256)||
    !SHA.test(input.expectedConfigSha256)||
    !SHA.test(input.expectedFrameSha256)||
    !Number.isInteger(input.currentRunDayIndex)||
    input.currentRunDayIndex<1||input.currentRunDayIndex>31)
  refuse("UNPINNED_REVIEWED_SHAPE_OR_DAY");
 const today=e.days[input.currentRunDayIndex-1];
 const currentStart=millis(input.currentStartUtc);
 const clock=millis(input.dbClockAtReadUtc);
 if(today.runDayIndex!==input.currentRunDayIndex||
    today.startUtc!==new Date(currentStart).toISOString())
  refuse("CURRENT_DAY_NOT_REVIEWED");
 const currentSites=SLOTS.map(slot=>norm(input.currentSelectedIcaos?.[slot]));
 if(new Set(currentSites).size!==4)refuse("CURRENT_DRAW_NOT_UNIQUE");
 if(!Array.isArray(input.joinedEarlierDays)||
    input.joinedEarlierDays.length!==(input.currentRunDayIndex-1)*4)
  refuse("INCOMPLETE_EARLIER_FOUR_ROW_HISTORY");
 const rowsByDay=new Map<number,P5JoinedPriorDayRow[]>();
 for(const r of input.joinedEarlierDays){
  const q=obj(r) as unknown as P5JoinedPriorDayRow;
  const index=Number(q.run_day_index);
  if(!Number.isInteger(index)||index<1||index>=input.currentRunDayIndex)
   refuse("OUT_OF_RANGE_PRIOR_DAY");
  const rows=rowsByDay.get(index)??[];
  rows.push(q);rowsByDay.set(index,rows);
 }
 if(rowsByDay.size!==input.currentRunDayIndex-1)
  refuse("MISSING_PRIOR_PARENT_DAY");

 // Rebuild the entire committed historical prefix, not merely the most
 // recent airport state record: this detects cross-pair and adaptive reuses.
 const lastEndByAirport=new Map<string,number>();
 for(let dayIndex=1;dayIndex<input.currentRunDayIndex;dayIndex++){
  const prior=e.days[dayIndex-1];
  const joined=rowsByDay.get(dayIndex);
  if(!prior||prior.runDayIndex!==dayIndex||!joined||joined.length!==4)
   refuse("MISSING_PRIOR_FOUR_AIRPORT_DRAW");
  const first=joined[0];
  const start=millis(first.scheduled_start_utc);
  const end=millis(prior.endUtc);
  // The existing production draw owner accepts an actual early STOP at
  // 1..360 minutes for up-to-6h. The approved shape END still stays at +6h
  // for this *conservative* washout proof, regardless of an early STOP.
  const actualMinutes=Number(first.active_duration_minutes);
  const validDuration=prior.windowShape==="up-to-6h"?
   Number.isInteger(actualMinutes)&&actualMinutes>=1&&actualMinutes<=360:
   actualMinutes===240;
  if(prior.startUtc!==new Date(start).toISOString()||
     start>=currentStart||end<=start||
     first.calendar_hash!==input.expectedCalendarSha256||
     first.config_hash!==input.expectedConfigSha256||
     first.frame_hash!==input.expectedFrameSha256||
     first.window_shape!==prior.windowShape||
     !validDuration||
     new Date(millis(first.date_utc)).toISOString().slice(0,10)!==prior.dateUtc)
    refuse("PRIOR_CALENDAR_SHAPE_OR_SIGNATURE_DRIFT");
  const expectedEnd=start+
    (prior.windowShape==="4h"?4:
     prior.windowShape==="2x2h"?5:6)*3_600_000;
  if(end!==expectedEnd||end>currentStart)
   refuse("PRIOR_TREATMENT_END_UNKNOWN_OR_OVERLAPPED");
  const drawType=prior.pairId!==null&&prior.crossoverPeriod===2?
   "PAIR_REPLAY":"NEW_TEMPLATE";
  if(first.draw_type!==drawType)
   refuse("PRIOR_CROSSOVER_ROLE_DRIFT");
  for(const r of joined){
   if(r.run_day_index!==first.run_day_index||
      millis(r.scheduled_start_utc)!==start||
      r.frozen_draw_seed!==first.frozen_draw_seed||
      r.draw_type!==first.draw_type||
      r.anchor_icao!==first.anchor_icao||
      JSON.stringify(r.slot_regions)!==JSON.stringify(first.slot_regions)||
      JSON.stringify(r.pair_airport_set)!==
       JSON.stringify(first.pair_airport_set)||
      r.calendar_hash!==first.calendar_hash||
      r.config_hash!==first.config_hash||
      r.frame_hash!==first.frame_hash||
      r.window_shape!==first.window_shape||
      r.active_duration_minutes!==first.active_duration_minutes)
    refuse("INCONSISTENT_PRIOR_CALENDAR_JOIN");
  }
  const prep:PreparedDayForReadback={
   runDayIndex:dayIndex,scheduledStartUtc:new Date(start),
   frozenDrawSeed:String(first.frozen_draw_seed),
   drawType,anchorIcao:String(first.anchor_icao),
   slotRegions:obj(first.slot_regions) as unknown as PreparedDayForReadback["slotRegions"],
   pairAirportSet:first.pair_airport_set as PreparedDayForReadback["pairAirportSet"],
   calendarHash:String(first.calendar_hash),
   configHash:String(first.config_hash),
   frameHash:String(first.frame_hash)
  };
  const draws:PreparedDrawRow[]=joined.map(r=>({
   slot_id:String(r.slot_id),
   target_region:String(r.target_region),
   draw_type:String(r.selected_draw_type),
   selected_icao:String(r.selected_icao),
   frozen_draw_seed:String(r.selected_draw_seed),
   selected_at_utc:r.selected_at_utc as Date|string,
   adaptive_state_hash:r.adaptive_state_hash as string|null,
   probability_vector:r.probability_vector,
   airport_layer_design_probability:
    r.airport_layer_design_probability as number|string|null
  }));
  const checked=verifyPreparedDailyDraw(prep,draws);
  if(millis(checked.selectedAtUtc)>clock)
   refuse("PRIOR_DRAW_FUTURE_DATED_AT_DB_CLOCK");
  if(prior.pairId!==null){
   if(!prior.pairedAirportCandidates||!prep.pairAirportSet)
    refuse("PAIRED_AIRPORT_TEMPLATE_UNVERIFIED");
   for(const slot of SLOTS){
    const saved=checked.selections.find(x=>x.slotId===slot);
    if(!saved||saved.icao!==prior.pairedAirportCandidates[slot])
     refuse("PRIOR_PAIRED_CANDIDATE_NOT_MATCHED");
   }
  }else if(prior.pairedAirportCandidates!==null||prep.pairAirportSet!==null)
   refuse("ORDINARY_PRIOR_DAY_NOT_ADAPTIVE");

  for(const selected of checked.selections){
   const priorEnd=lastEndByAirport.get(selected.icao);
   if(priorEnd!==undefined&&start-priorEnd<DAY_MS)
    refuse("EARLIER_DAYS_GLOBAL_AIRPORT_WASHOUT_VIOLATED");
   lastEndByAirport.set(selected.icao,end);
  }
 }
 for(const icao of currentSites){
  const previousEnd=lastEndByAirport.get(icao);
  if(previousEnd!==undefined&&currentStart-previousEnd<DAY_MS)
   refuse("CURRENT_DAY_GLOBAL_AIRPORT_WASHOUT_VIOLATED");
 }
 return {
  status:"ALL_EARLIER_COMMITTED_SITES_WASHOUT_VERIFIED_NOT_SOURCE_GO",
  priorParentDaysVerified:input.currentRunDayIndex-1,
  priorAirportDayObservationsVerified:(input.currentRunDayIndex-1)*4,
  currentAirportCount:4,minimumRequiredEndToStartHours:24,
  priorWindowEndingSource:"REVIEWED_31_DAY_SHAPE_NOT_LAST_SELECTED_START",
  restrictedSnapshotCallerResponsible:true,
  sourceOriginalAndPreVerified:false,
  providerCalls:0,databaseWrites:0,
  phase5FreezePassed:false,phase6Go:false
 };
}
