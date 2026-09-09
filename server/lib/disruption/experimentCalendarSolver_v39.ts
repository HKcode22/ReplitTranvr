/** V3.9-f.8 strict Phase-6 calendar solver/validator. */
import { createHash } from "crypto";
export type Shape="4h"|"2x2h"|"up-to-6h";
export const SIX_SLOTS=["00:00","04:00","08:00","12:00","16:00","20:00"] as const;
export interface FrozenCalendarDesignInput{
  startDate:string;seed:string;
  /** Exact four-airport set per run day. Pair replay days must be identical. */
  airportSetsByRunDay:Record<string,string[]>;
  evaluationPartitionByRunDay:Record<string,string>;
  projectedAlertCreditsByRunDay:Record<string,number>;
  projectedRestUnitsTotal:number;protectedRestBudget:number;
}
export interface Segment{segmentId:string;startUtc:string;endUtc:string;isGap:boolean}
export interface SolvedRunDay{
  runDayIndex:number;budgetDayId:string;experimentDayId:string;parentBatchId:string;date:string;weekdayClass:"weekday"|"weekend";
  utcSlot:string;timeClass:string;windowShape:Shape;segments:Segment[];airportSet:string[];evaluationPartition:string;
  crossoverGroupId:string|null;crossoverPeriod:1|2|null;pairRole:"control"|"alternative"|null;anchorReplay:boolean;
}
export interface CalendarSolveResult{status:"SAT"|"UNSAT";reason:string|null;days:SolvedRunDay[];calendarHash:string|null}
function hash(v:unknown){return createHash("sha256").update(JSON.stringify(v)).digest("hex");}
function parseDate(s:string){const d=new Date(`${s}T00:00:00.000Z`);return Number.isFinite(d.getTime())?d:null;}
function plusDays(d:Date,n:number){return new Date(d.getTime()+n*86_400_000);}
function dateText(d:Date){return d.toISOString().slice(0,10);}
function weekdayClass(d:Date):"weekday"|"weekend"{return d.getUTCDay()===0||d.getUTCDay()===6?"weekend":"weekday";}
function hmToMinutes(s:string){const [h,m]=s.split(":").map(Number);return h*60+m;}
function absTime(date:string,hm:string){const [h,m]=hm.split(":").map(Number);return Date.parse(`${date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00.000Z`);}
function hm(minutes:number){const x=((minutes%1440)+1440)%1440;return `${String(Math.floor(x/60)).padStart(2,"0")}:${String(x%60).padStart(2,"0")}`;}
function segments(run:number,date:string,slot:string,shape:Shape):Segment[]{const start=hmToMinutes(slot);if(shape==="4h")return[{segmentId:`D${run}-S1`,startUtc:slot,endUtc:hm(start+240),isGap:false}];if(shape==="up-to-6h")return[{segmentId:`D${run}-S1`,startUtc:slot,endUtc:hm(start+360),isGap:false}];return[{segmentId:`D${run}-S1`,startUtc:slot,endUtc:hm(start+120),isGap:false},{segmentId:`D${run}-GAP`,startUtc:hm(start+120),endUtc:hm(start+180),isGap:true},{segmentId:`D${run}-S2`,startUtc:hm(start+180),endUtc:hm(start+300),isGap:false}];}
function randomizedAlternativeFirst(seed:string,pair:number){return parseInt(hash(`${seed}|pair-${pair}`).slice(0,8),16)%2===1;}
function normalizedSet(x:string[]){return [...new Set(x.map(s=>s.toUpperCase()))].sort();}
function sameSet(a:string[],b:string[]){const x=normalizedSet(a),y=normalizedSet(b);return x.length===y.length&&x.every((v,i)=>v===y[i]);}

/**
 * Deterministic SAT construction. Six run-days are placed in each seven-day
 * week, so paired run-day i and i+6 are exactly seven days apart, share UTC
 * slot and weekday class, and satisfy >=24h washout. Five pairs are 1↔7 ...
 * 5↔11. Pair treatment order is actually randomized from the frozen seed.
 */
export function solveV39Calendar(input:FrozenCalendarDesignInput):CalendarSolveResult{
  const start=parseDate(input.startDate);if(!start)return{status:"UNSAT",reason:"invalid startDate",days:[],calendarHash:null};
  if(!input.seed)return{status:"UNSAT",reason:"missing frozen seed",days:[],calendarHash:null};
  for(let i=1;i<=31;i++){
    const set=input.airportSetsByRunDay[String(i)],part=input.evaluationPartitionByRunDay[String(i)],alert=input.projectedAlertCreditsByRunDay[String(i)];
    if(!Array.isArray(set)||set.length!==4||new Set(set.map(x=>x.toUpperCase())).size!==4)return{status:"UNSAT",reason:`run day ${i} requires exact four-airport frozen set`,days:[],calendarHash:null};
    if(!part)return{status:"UNSAT",reason:`run day ${i} missing evaluation partition`,days:[],calendarHash:null};
    if(!Number.isFinite(alert)||alert<0||alert>1900)return{status:"UNSAT",reason:`run day ${i} Alert feasibility exceeds 1900 or is unknown`,days:[],calendarHash:null};
  }
  if(!Number.isFinite(input.projectedRestUnitsTotal)||!Number.isFinite(input.protectedRestBudget)||input.projectedRestUnitsTotal>input.protectedRestBudget)return{status:"UNSAT",reason:"REST budget infeasible/unknown",days:[],calendarHash:null};
  for(let p=1;p<=5;p++){
    const a=p,b=p+6;if(!sameSet(input.airportSetsByRunDay[String(a)],input.airportSetsByRunDay[String(b)]))return{status:"UNSAT",reason:`pair ${p} airport set is not exact replay`,days:[],calendarHash:null};
    if(input.evaluationPartitionByRunDay[String(a)]!==input.evaluationPartitionByRunDay[String(b)])return{status:"UNSAT",reason:`pair ${p} evaluation partition mismatch`,days:[],calendarHash:null};
  }
  const alternativeShape:Record<number,Shape>={1:"2x2h",2:"2x2h",3:"2x2h",4:"up-to-6h",5:"up-to-6h"};
  const shapeByRun:Record<number,Shape>={};
  for(let i=1;i<=31;i++)shapeByRun[i]="4h";
  for(let p=1;p<=5;p++){const first=p,second=p+6,altFirst=randomizedAlternativeFirst(input.seed,p);shapeByRun[first]=altFirst?alternativeShape[p]:"4h";shapeByRun[second]=altFirst?"4h":alternativeShape[p];}
  const days:SolvedRunDay[]=[];
  for(let i=1;i<=31;i++){
    const week=Math.floor((i-1)/6),within=(i-1)%6,date=dateText(plusDays(start,week*7+within)),slot=SIX_SLOTS[within];
    let pair:number|null=null,period:1|2|null=null;if(i<=5){pair=i;period=1}else if(i>=7&&i<=11){pair=i-6;period=2}
    const alt=pair?alternativeShape[pair]:null,shape=shapeByRun[i];
    days.push({runDayIndex:i,budgetDayId:`run_day_${i}`,experimentDayId:`exp_day_${i}`,parentBatchId:`batch_day_${i}`,date,weekdayClass:weekdayClass(new Date(`${date}T00:00:00Z`)),utcSlot:slot,timeClass:slot,windowShape:shape,segments:segments(i,date,slot,shape),airportSet:normalizedSet(input.airportSetsByRunDay[String(i)]),evaluationPartition:input.evaluationPartitionByRunDay[String(i)],crossoverGroupId:pair?`pair-${pair}`:null,crossoverPeriod:period,pairRole:pair?(shape==="4h"?"control":"alternative"):null,anchorReplay:period===2});
    void alt;
  }
  const validation=validateV39Calendar(days,input);if(validation.length)return{status:"UNSAT",reason:validation.join("; "),days:[],calendarHash:null};
  return{status:"SAT",reason:null,days,calendarHash:hash(days)};
}

export function validateV39Calendar(days:SolvedRunDay[],input:FrozenCalendarDesignInput):string[]{
  const v:string[]=[];if(days.length!==31)v.push(`expected31:${days.length}`);
  const ids=new Set(days.map(d=>d.parentBatchId));if(ids.size!==days.length)v.push("parent batch IDs not unique");
  const counts={"4h":0,"2x2h":0,"up-to-6h":0};for(const d of days)counts[d.windowShape]++;
  if(counts["4h"]!==26||counts["2x2h"]!==3||counts["up-to-6h"]!==2)v.push(`shape composition ${JSON.stringify(counts)}`);
  for(let base=0;base+6<=days.length;base+=6){const slots=days.slice(base,base+6).map(d=>d.utcSlot);if(new Set(slots).size!==6||SIX_SLOTS.some(s=>!slots.includes(s)))v.push(`six-slot balance block ${base/6+1}`);}
  for(let p=1;p<=5;p++){
    const a=days[p-1],b=days[p+5];if(!a||!b)continue;
    if(a.crossoverGroupId!==`pair-${p}`||b.crossoverGroupId!==`pair-${p}`)v.push(`pair${p}:missing group`);
    if(a.timeClass!==b.timeClass)v.push(`pair${p}:time class mismatch`);if(a.weekdayClass!==b.weekdayClass)v.push(`pair${p}:weekday mismatch`);if(a.evaluationPartition!==b.evaluationPartition)v.push(`pair${p}:partition mismatch`);if(!sameSet(a.airportSet,b.airportSet))v.push(`pair${p}:airport replay mismatch`);
    const shapes=[a.windowShape,b.windowShape],alt=p<=3?"2x2h":"up-to-6h";if(!(shapes.includes("4h")&&shapes.includes(alt)))v.push(`pair${p}:wrong contrast`);
    if(a.pairRole===b.pairRole)v.push(`pair${p}:treatment order invalid`);
    const endSeg=a.segments.filter(s=>!s.isGap).at(-1)!;let prevEnd=absTime(a.date,endSeg.endUtc);if(hmToMinutes(endSeg.endUtc)<=hmToMinutes(a.segments[0].startUtc))prevEnd+=86_400_000;
    let nextStart=absTime(b.date,b.segments.find(s=>!s.isGap)!.startUtc);if(nextStart-prevEnd<24*3_600_000)v.push(`pair${p}:washout<24h`);
  }
  // 2x2 structure: exactly two active 2h segments + explicit 1h gap.
  for(const d of days.filter(d=>d.windowShape==="2x2h")){const active=d.segments.filter(s=>!s.isGap),gap=d.segments.filter(s=>s.isGap);if(active.length!==2||gap.length!==1||active.some(s=>hmToMinutes(s.endUtc)-hmToMinutes(s.startUtc)!==120)||hmToMinutes(gap[0].endUtc)-hmToMinutes(gap[0].startUtc)!==60)v.push(`run${d.runDayIndex}:bad2x2`);}
  // Hard feasibility stays independently checked even when input is tampered after solve.
  for(const d of days){const a=input.projectedAlertCreditsByRunDay[String(d.runDayIndex)];if(!Number.isFinite(a)||a>1900)v.push(`run${d.runDayIndex}:alert infeasible`);}if(input.projectedRestUnitsTotal>input.protectedRestBudget)v.push("REST infeasible");
  return v;
}
