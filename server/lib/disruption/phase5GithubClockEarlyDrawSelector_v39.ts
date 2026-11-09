/**
 * The one genuinely missing Phase5→Phase6 piece: choose the next approved
 * early-draw day at the REAL PostgreSQL clock, using the already installed
 * calendar+sampling tables. Never choose future airport identities here.
 *
 * The final paid GO and Phase5 scientific freeze are SEPARATE authorities.
 * This pure selector performs ZERO writes, has no provider credentials and
 * does not accept caller-supplied future sampled airports.
 */
import {
 p5EarlyDrawLeadTimeEligible,
 P5_EARLY_DRAW_MIN_STRICT_LEAD_MS,
 P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS
} from "./phase5ProspectiveEarlyDrawClockContract_v39";

const SHA=/^[a-f0-9]{64}$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const REFUSE=(why:string):never=>{throw Error("REFUSED_P5_GITHUB_EARLY_DRAW_SELECT_"+why);};
const utcMs=(v:unknown):number=>{
 const d=v instanceof Date?v:typeof v==="string"?new Date(v):null;
 if(!d||!Number.isFinite(d.getTime()))REFUSE("INVALID_CALENDAR_OR_DATABASE_UTC");
 return d.getTime();
};
const readInt=(v:unknown):number=>{
 if(typeof v==="number"&&Number.isSafeInteger(v))return v;
 if(typeof v==="string"&&/^(0|[1-9][0-9]*)$/.test(v)){
  const n=Number(v);if(Number.isSafeInteger(n))return n;
 }
 return REFUSE("MALFORMED_DB_COUNT_OR_DAY");
};
export interface P5SchedulerDayRow {
 run_day_index:unknown;
 scheduled_start_utc:unknown;
 calendar_hash:unknown;
 config_hash:unknown;
 frame_hash:unknown;
 date_utc:unknown;
 draw_count:unknown;
}
export interface P5EarlyDrawScheduledSelectInput{
 dbClockUtc:string|Date;
 expectedCalendarSha256:string;
 expectedConfigSha256:string;
 expectedFrameSha256:string;
 rows:readonly P5SchedulerDayRow[];
}
export type P5EarlyDrawScheduledSelection=
 | {status:"ONE_DUE_REVIEWED_DAY";runDayIndex:number;scheduledStartUtc:string;
    priorCommittedDays:number;providerCalls:0;databaseWrites:0}
 | {status:"NOT_DUE_OR_ALREADY_SELECTED";nextDueRunDayIndex:number|null;
    selectedDays:number;providerCalls:0;databaseWrites:0};

/** Fail-closed: 31 signed parents, no partial/duplicate selected-day rows,
 * and NEVER bypass a missed earlier parent day by sampling a later day. */
export function selectP5GitHubNextEarlyDraw(
 input:P5EarlyDrawScheduledSelectInput
):P5EarlyDrawScheduledSelection{
 if(!input||![input.expectedCalendarSha256,input.expectedConfigSha256,
   input.expectedFrameSha256].every(x=>typeof x==="string"&&SHA.test(x))||
   !Array.isArray(input.rows)||input.rows.length!==31)
  REFUSE("MISSING_FROZEN_31_PARENT_DAY_CALENDAR");
 const now=utcMs(input.dbClockUtc);
 const seen=new Set<number>();
 const checked:{day:number,start:number,count:number}[]=[];
 for(const row of input.rows){
  const day=readInt(row.run_day_index),count=readInt(row.draw_count);
  const start=utcMs(row.scheduled_start_utc);
  const date=row.date_utc instanceof Date?
   row.date_utc.toISOString().slice(0,10):String(row.date_utc);
  if(day<1||day>31||seen.has(day)||count!==0&&count!==4||
     row.calendar_hash!==input.expectedCalendarSha256||
     row.config_hash!==input.expectedConfigSha256||
     row.frame_hash!==input.expectedFrameSha256||
     !DAY.test(date)||date!==new Date(start).toISOString().slice(0,10))
   REFUSE("CALENDAR_OR_FOUR_SLOT_DRAW_DRIFT");
  seen.add(day);
  checked.push({day,start,count});
 }
 checked.sort((a,b)=>a.day-b.day);
 for(let i=0;i<31;i++){
  if(checked[i].day!==i+1||
     (i>0&&checked[i].start<=checked[i-1].start))
   REFUSE("UNORDERED_OR_DUPLICATED_31_DAY_SCHEDULE");
 }
 let selected=0;
 for(const row of checked){
  if(row.count===4){selected++;continue;}
  const lead=row.start-now;
  if(lead<=P5_EARLY_DRAW_MIN_STRICT_LEAD_MS)
   REFUSE("EARLIER_UNSELECTED_DAY_MISSED_NON_BACKFILLABLE_CUTOFF");
  if(lead>P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS)
   return {
    status:"NOT_DUE_OR_ALREADY_SELECTED",nextDueRunDayIndex:row.day,
    selectedDays:selected,providerCalls:0,databaseWrites:0
   };
  if(!p5EarlyDrawLeadTimeEligible(now,row.start))
   REFUSE("EARLY_DRAW_CLOCK_CONTRACT_MISMATCH");
  return {
   status:"ONE_DUE_REVIEWED_DAY",runDayIndex:row.day,
   scheduledStartUtc:new Date(row.start).toISOString(),
   priorCommittedDays:selected,providerCalls:0,databaseWrites:0
  };
 }
 return {
  status:"NOT_DUE_OR_ALREADY_SELECTED",nextDueRunDayIndex:null,
  selectedDays:31,providerCalls:0,databaseWrites:0
 };
}
