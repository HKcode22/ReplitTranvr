/** OFFLINE REVIEW ONLY; not a production calendar or authorization. */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
export function compactReview(date,source,hubs,first){
 const D=86400000,H=3600000,M=60000,iso=t=>new Date(t).toISOString(),day=t=>iso(t).slice(0,10),cls=t=>[0,6].includes(new Date(t).getUTCDay())?"weekend":"weekday";
 const hold=x=>{throw Error("HOLD_P5_COMPACT_"+x)};
 if(!["2026-11-21","2026-11-22"].includes(first)||date.firstRunDateUtc!=="2026-11-22"||date.days.length!==31||source.days.length!==31||hubs.length!==31||source.totalNominalTemplates!==6144)hold("EXACT_REVIEW_INPUT");
 const old=date.days.map((d,i)=>({n:d.runDayIndex,originalStart:d.conservativeStartUtc,slot:Number(d.utcSlot.slice(0,2)),shape:source.days[i].shape,hub:hubs[i],pair:d.pairId,period:d.crossoverPeriod,known:d.airportsIfKnown,cls:d.weekdayClass}));
 let previousDate=Date.parse(first+"T00:00:00Z")-D,previousEnd=-Infinity,last=new Map(),rows=[],skips=[],minimumKnownWashout=Infinity;
 for(const d of old){
  if(d.n!==rows.length+1||d.slot!==((d.n-1)%6)*4||!["N","S","E"].includes(d.shape)||!["WSSS","OMAA","SKBO","YSSY"].includes(d.hub)||d.known&&d.known.HUB!==d.hub||!d.pair&&d.shape!=="N")hold("ORIGINAL_ASSIGNMENT_DRIFT");
  let found=false;
  for(let midnight=previousDate+D;midnight<Date.parse(first+"T00:00:00Z")+70*D;midnight+=D){
   let start=midnight+d.slot*H,end=start+(d.shape==="N"?4:d.shape==="S"?5:6)*H,known=d.known?Object.values(d.known):[d.hub];
   let reasons=[];if(d.pair&&cls(midnight)!==d.cls)reasons.push("ORIGINAL_PAIR_WEEKDAY_CLASS");
   if(start<previousEnd)reasons.push("PARENT_OVERLAP");
   if(known.some(a=>start-(last.get(a)??-Infinity)<D))reasons.push("KNOWN_AIRPORT_WASHOUT");
   if(reasons.length){skips.push({n:d.n,date:day(midnight),reasons});continue;}
   for(const a of known){if(last.has(a))minimumKnownWashout=Math.min(minimumKnownWashout,(start-last.get(a))/H);last.set(a,end)}
   let segments=(d.shape==="S"?[[0,2],[3,5]]:[[0,d.shape==="E"?6:4]]).map(([a,b])=>({startUtc:iso(start+a*H),endUtc:iso(start+b*H)}));
   rows.push({runDayIndex:d.n,originalStartUtc:d.originalStart,startUtc:iso(start),endUtc:iso(end),utcSlot:d.slot,windowShape:d.shape==="N"?"4h":d.shape==="S"?"2x2h":"up-to-6h",anchorIcao:d.hub,pairId:d.pair,crossoverPeriod:d.period,weekdayClass:cls(midnight),fixedKnownAirportSet:d.known,partition:d.n<=20?"train":d.n<=25?"validation":"test",segments});
   previousDate=midnight;previousEnd=end;found=true;break;
  }
  if(!found)hold("NO_FEASIBLE_DATE");
 }
 // Independently verify every fixed-airport pair, each repeated HUB, and every consecutive parent.
 for(let i=0;i<rows.length;i++)for(let j=0;j<i;j++){
  let a=rows[j],b=rows[i];
  if(Date.parse(b.startUtc)<Date.parse(a.endUtc))hold("PARENT_OVERLAP_READBACK");
  let aa=a.fixedKnownAirportSet?Object.values(a.fixedKnownAirportSet):[a.anchorIcao],bb=b.fixedKnownAirportSet?Object.values(b.fixedKnownAirportSet):[b.anchorIcao];
  if(aa.some(k=>bb.includes(k))&&Date.parse(b.startUtc)-Date.parse(a.endUtc)<D)hold("WASHOUT_READBACK");
 }
 for(let i=0;i<5;i++){let a=rows[i],b=rows[i+6];if(a.pairId!==b.pairId||a.utcSlot!==b.utcSlot||a.weekdayClass!==b.weekdayClass||a.partition!==b.partition||JSON.stringify(a.fixedKnownAirportSet)!==JSON.stringify(b.fixedKnownAirportSet))hold("PAIR_READBACK");}
 const sourceByDate=new Map(),activeDates=new Set(),outcomeDates=new Set(),events=[];
 function dateRange(a,b,set){for(let t=Date.parse(day(a)+"T00:00:00Z");t<=b;t+=D)set.add(day(t))}
 let hours=0,segCount=0,groups=0;
 for(const r of rows)for(const seg of r.segments){let a=Date.parse(seg.startUtc),b=Date.parse(seg.endUtc);hours+=(b-a)/H;segCount++;dateRange(a,b-1,activeDates);dateRange(a,b+48*H,outcomeDates);
  for(let p=a;p<b;p+=4*H){let e=Math.min(p+4*H,b);groups+=4;
   for(let h of [24,6,1.5])for(let t=p-h*H-15*M;t<e-h*H-15*M;t+=15*M){let k=day(t),o=sourceByDate.get(k)??{base:0,split:0};o[p===a?"base":"split"]+=8;sourceByDate.set(k,o);events.push({at:t,units:8});}
  }
 }
 let dates=[...new Set([...sourceByDate.keys(),...outcomeDates])].sort();
 let chargeRows=dates.map(dateUtc=>{let {base,split}=sourceByDate.get(dateUtc)??{base:0,split:0};let categories={BASE_FIDS:base,SPLIT_FIDS:split,RETRY:2*Math.ceil((base+split)/20),VALIDATION:activeDates.has(dateUtc)?16:0,OUTCOME:outcomeDates.has(dateUtc)?640:0,HISTORY:0,DIAGNOSTIC:8};return{dateUtc,categories,total:Object.values(categories).reduce((s,v)=>s+v,0)}});
 const totals={};for(let r of chargeRows)for(const [k,v] of Object.entries(r.categories))totals[k]=(totals[k]??0)+v;
 if(hours!==128||segCount!==34||groups!==144||events.length*4!==6144||totals.BASE_FIDS+totals.SPLIT_FIDS!==12288||chargeRows.some(r=>r.total>1900))hold("GEOMETRY_OR_DAILY_CAP");
 const firstSource=Math.min(...events.map(e=>e.at)),lastSource=Math.max(...events.map(e=>e.at)),lastService=Date.parse(rows.at(-1).endUtc),tail=lastService+48*H,firstService=Date.parse(rows[0].startUtc);
 const reserve=chargeRows.reduce((s,r)=>s+r.total,0);
 const reset="2026-12-04";const before=chargeRows.filter(r=>r.dateUtc<=reset).reduce((s,r)=>s+r.total,0),after=chargeRows.filter(r=>r.dateUtc>=reset).reduce((s,r)=>s+r.total,0);
 return {firstServiceUtc:iso(firstService),firstSourceUtc:iso(firstSource),strictAuthBeforeUtc:iso(firstService-24*H-50*M),earlyDrawOpensUtc:iso(firstService-72*H),earlyDrawClosesExclusiveUtc:iso(firstService-24*H-45*M),lastSourceUtc:iso(lastSource),lastServiceEndUtc:iso(lastService),allocatedOutcomeTailUtc:iso(tail),elapsedServiceDates:(Date.parse(day(lastService-1)+"T00:00:00Z")-Date.parse(day(firstService)+"T00:00:00Z"))/D+1,firstSourceToTailHours:(tail-firstSource)/H,minimumKnownWashoutHours:minimumKnownWashout,skips,rows,sourceTemplates:events.length*4,exposureHours:hours,segments:segCount,postPartitionSlotGroups:groups,chargeDates:dates.length,categoryRows:7*dates.length,categoryTotals:totals,totalReserve:reserve,peakDailyReserve:Math.max(...chargeRows.map(r=>r.total)),projectHeadroomUsingPriorNoRefillReview:49468-1000-reserve,conservativePriorDec4ResetDateReserve:before,conservativeAfterDec4ResetDateReserve:after,chargeRows};
}
const paths=[["data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json","54544099c96875d69da63c88392d0a3febf681d3"],["data-collection/phase5/evidence/2026-11-17_primary_expiry_nominal_source_backlog_REVIEW_ONLY.json","613dd8827cfb4ec06102bcc07e2c51916a9c6613"]];
export function readInputs(){const [date,source]=paths.map(([p,sha])=>{const b=readFileSync(p);if(createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex")!==sha)throw Error("HOLD_EXACT_ORIGINAL_BLOB");return JSON.parse(b.toString("utf8"))});return {date,source,hubs:["OMAA","WSSS","YSSY","SKBO","SKBO","WSSS","OMAA","WSSS","YSSY","SKBO","SKBO","YSSY","OMAA","WSSS","YSSY","OMAA","SKBO","OMAA","YSSY","WSSS","SKBO","WSSS","SKBO","OMAA","YSSY","OMAA","WSSS","YSSY","SKBO","OMAA","WSSS"]}}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.length!==2)throw Error("HOLD_FIXED_REVIEW_ONLY");const {date,source,hubs}=readInputs();console.log(JSON.stringify(["2026-11-21","2026-11-22"].map(f=>compactReview(date,source,hubs,f)),null,2))}
