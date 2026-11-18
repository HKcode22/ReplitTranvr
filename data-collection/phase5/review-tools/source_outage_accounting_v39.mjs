/** Review-only accounting; no provider, DB, dispatch, sampling, or label mutation.
 * Frozen query templates are request opportunities, NOT a physical-flight denominator.
 * Does not authorize recovery or determine study success automatically. */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const H=["T-24h","T-6h","T-90m"],S=["HUB","MID_A","MID_B","REGIONAL"];
const hold=s=>{throw Error("HOLD_P5_OUTAGE_REVIEW_"+s)};
const ms=s=>{const x=Date.parse(s);if(typeof s!=="string"||!Number.isFinite(x)||new Date(x).toISOString()!==s)hold("UTC");return x};
const iso=x=>new Date(x).toISOString(),hash=x=>createHash("sha256").update(x).digest("hex");
const int=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
const sha=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
export const split=d=>d<=20?"train":d<=25?"validation":"test";
export function buildPlan(days,{exactCycle=true}={}){
 if(!Array.isArray(days)||days.length<1||days.length>31||exactCycle&&days.length!==31)hold("DAY_COUNT");
 const keys=new Set(),seen=new Set(),queries=[];
 for(const day of days){
  const d=day?.runDayIndex;
  if(day?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||!int(d,1)||d>31||seen.has(d)||!Array.isArray(day.templates)||day.templates.length===0||day.templates.length>384)hold("DAY");
  seen.add(d);
  for(const t of day.templates){
   if(!t||t.runDayIndex!==d||!H.includes(t.horizon)||!S.includes(t.slot)||typeof t.queryKey!=="string"||
      !new RegExp("^p6\\.d"+d+"\\."+t.slot+"\\."+t.horizon+"\\.s[1-9]\\d*\\.p[1-9]\\d*\\.r[1-9]\\d*$").test(t.queryKey)||
      keys.has(t.queryKey)||t.providerQueryDirection!=="Departure"||t.apiUnitsPerAttempt!==2||t.maxAttempts!==1||
      !int(t.maxResponseAndPersistSeconds,1)||t.maxResponseAndPersistSeconds>600)hold("QUERY_TEMPLATE");
   const planned=ms(t.scheduledRequestUtc),cutoff=ms(t.earliestPlannedCutoffUtc),start=ms(t.serviceWindowStartUtc),end=ms(t.serviceWindowEndUtc);
   // Match the actual Stage8 exact hard-latest formula. No extension.
   const hard=Math.min(planned+60000,cutoff-t.maxResponseAndPersistSeconds*1000-120000);
   if(hard<=planned||hard>cutoff-120000||end<=start||t.physicalChargeDayUtc!==iso(planned).slice(0,10))hold("WINDOW");
   queries.push({key:t.queryKey,day:d,split:split(d),slot:t.slot,horizon:t.horizon,planned,hard,cutoff,maxResponseMs:t.maxResponseAndPersistSeconds*1000});
   keys.add(t.queryKey);
  }
 }
 queries.sort((a,b)=>a.day-b.day||a.key.localeCompare(b.key));
 if(exactCycle&&(queries.length!==6144||seen.size!==31||H.some(h=>queries.filter(q=>q.horizon===h).length!==2048)||
   S.some(s=>queries.filter(q=>q.slot===s).length!==1536)))hold("FROZEN_CYCLE_GEOMETRY");
 return {queries,planSha256:hash(JSON.stringify(queries)),exactCycle};
}
function table(queries,dispositions){
 const by={overall:{},day:{},horizon:{},slot:{},split:{}};
 for(const q of queries){
  const state=dispositions.get(q.key);
  if(!state)hold("MISSING_DISPOSITION");
  for(const [dim,k] of [["overall","ALL"],["day",String(q.day)],["horizon",q.horizon],["slot",q.slot],["split",q.split]]){
   const b=by[dim][k]??={planned:0,states:{}};
   b.planned++;b.states[state]=(b.states[state]??0)+1;
  }
 }
 return by;
}
const noAuthority={providerCalls:0,databaseWrites:0,dispatches:0,permitReplay:false,permitNewRequest:false,studyReleaseApproved:false,phase6PaidGo:false};
function windows(outages){
 if(!Array.isArray(outages)||outages.length>100)hold("OUTAGES");
 const all=outages.map(x=>({start:ms(x.startUtc),end:ms(x.endUtc)})).sort((a,b)=>a.start-b.start);
 const merged=[];
 for(const x of all){if(x.end<=x.start)hold("OUTAGE_WINDOW");const p=merged.at(-1);if(p&&x.start<=p.end+1)p.end=Math.max(p.end,x.end);else merged.push({...x});}
 return merged;
}
/** Physical execution/API outage specifically. A control-plane outage with
 * live/prearmed workers can have a different impact; do not conflate them.
 * No probability or flight-row-loss inference. Exact dispatch windows are closed
 * intervals in millisecond time; outage input is conservative inclusive. */
export function stressPhysicalOutage(plan,outages){
 const w=windows(outages),states=new Map();
 for(const q of plan.queries){
  const hit=w.some(x=>x.start<=q.hard&&x.end>=q.planned);
  const fully=w.some(x=>x.start<=q.planned&&x.end>=q.hard);
  states.set(q.key,fully?"FULL_DISPATCH_WINDOW_BLOCKED":hit?"PARTIAL_WINDOW_AT_RISK":"NO_DIRECT_WINDOW_OVERLAP");
 }
 const by=table(plan.queries,states),main=by.overall.ALL;
 const blocked=main.states.FULL_DISPATCH_WINDOW_BLOCKED??0,partial=main.states.PARTIAL_WINDOW_AT_RISK??0;
 const fullDays=Object.entries(by.day).filter(([,x])=>(x.states.FULL_DISPATCH_WINDOW_BLOCKED??0)===x.planned).map(([d])=>Number(d));
 return {status:"DETERMINISTIC_PHYSICAL_REQUEST_OPPORTUNITY_STRESS_NOT_ACTUAL_LOSS",planSha256:plan.planSha256,
  plannedRequests:main.planned,blocked,partiallyAtRisk:partial,unaffected:main.planned-blocked-partial,
  potentialCoverageLower:(main.planned-blocked-partial)/main.planned,potentialCoverageUpper:(main.planned-blocked)/main.planned,
  completelyBlockedParentDays:fullDays,by,...noAuthority};
}
/** Accepts an explicitly separately reviewed content-free metadata export.
 * It does NOT query production or verify the export's external authenticity.
 * Complete day coverage is an input attestation, not inferred from absent rows.
 * Never include flight identifiers, raw content, tokens or provider payloads. */
export function assessSourceLedger(plan,input){
 if(input?.schema!=="v39.review.source-operational-metadata.v1"||input.planSha256!==plan.planSha256||
    !Array.isArray(input.completeDays)||!Array.isArray(input.receipts)||input.receipts.length>plan.queries.length*2)hold("LEDGER_INPUT");
 const now=ms(input.observedAtUtc),complete=new Map(),rows=new Map(),expected=new Map(plan.queries.map(q=>[q.key,q]));
 for(const d of input.completeDays){
  if(!int(d?.day,1)||d.day>31||!plan.queries.some(q=>q.day===d.day)||complete.has(d.day)||!sha(d.evidenceSha256)||
     ms(d.observedAtUtc)!==now)hold("DAY_EVIDENCE");
  complete.set(d.day,d.evidenceSha256);
 }
 for(const r of input.receipts){
  if(!expected.has(r?.key)||!sha(r.evidenceSha256)||!["RESERVED","UNKNOWN","FAILED","COMMITTED"].includes(r.state)||r.attempt!==1)hold("RECEIPT_SCOPE");
  const arr=rows.get(r.key)??[];arr.push(r);rows.set(r.key,arr);
 }
 const states=new Map(),holds=[];
 for(const q of plan.queries){
  const list=rows.get(q.key)??[];let status;
  if(list.length>1){status="DUPLICATE_OR_CONFLICTING_RECEIPTS";holds.push(q.day);}
  else if(list.length===1){
   const r=list[0];
   if(r.state==="RESERVED"||r.state==="UNKNOWN"){
    status=now>q.hard?"CLOSED_UNKNOWN_RESERVATION_NO_REPLAY":"OPEN_UNKNOWN_RESERVATION_NO_REPLAY";holds.push(q.day);
   }else{
    const start=ms(r.requestStartedUtc);
    if(start>now||start<q.planned||start>q.hard){status="OUTSIDE_FROZEN_DISPATCH_INTEGRITY_HOLD";holds.push(q.day);}
    else if(r.state==="FAILED"){status="ATTEMPTED_FAILED_NO_REPLAY";}
    else{
     const available=ms(r.originalAvailableUtc);
     if(available<start||available>now||available>q.cutoff||available-start>q.maxResponseMs||!sha(r.committedOriginalReceiptSha256)){
      status="COMMIT_OR_CUTOFF_INTEGRITY_HOLD";holds.push(q.day);
     }else status="TIMELY_ORIGINAL_COMMIT_REPORTED";
    }
   }
  }else if(now<q.planned)status="NOT_DUE";
  else if(!complete.has(q.day)){status=now<=q.hard?"OPEN_LEDGER_UNPROVEN_NO_DISPATCH":"CLOSED_LEDGER_UNPROVEN_NO_REPLAY";holds.push(q.day);}
  else status=now<=q.hard?"OPEN_UNATTEMPTED_REVIEW_ONLY":"CLOSED_MISSED_NO_ATTEMPT";
  states.set(q.key,status);
 }
 const by=table(plan.queries,states),all=by.overall.ALL;
 const due=all.planned-(all.states.NOT_DUE??0);
 const timely=all.states.TIMELY_ORIGINAL_COMMIT_REPORTED??0;
 return {status:"SOURCE_LEDGER_ACCOUNTING_FROM_SUPPLIED_METADATA_NOT_AUTHENTICATION_OR_GO",planSha256:plan.planSha256,observedAtUtc:input.observedAtUtc,
  planned:all.planned,due,timelyOriginalCommitsReported:timely,reportedDueOriginalCoverage:due?timely/due:null,
  daysRequiringIntegrityOrUnknownReview:[...new Set(holds)].sort((a,b)=>a-b),by,...noAuthority};
}
/** Independently supplied aggregate physical-label/prediction counts only.
 * Same physical original T and same independently certified actual label must
 * already be enforced by the private upstream join, not inferred here. */
export function pairCoverage(x){
 const keys=["eligibleFrame","certifiedActualLabel","t6ValidPrediction","t90ValidPrediction","t24ValidPrediction","t6LabelPairs","t6t90CommonLabelPairs","t6t24CommonLabelPairs"];
 if(x?.schema!=="v39.review.private-aggregate-pair-coverage.v1"||keys.some(k=>!int(x[k]))||
    !sha(x.independentJoinEvidenceSha256)||!["train","validation","test"].includes(x.partition)||
    keys.slice(1).some(k=>x[k]>x.eligibleFrame)||
    x.t6LabelPairs>Math.min(x.certifiedActualLabel,x.t6ValidPrediction)||
    x.t6t90CommonLabelPairs>Math.min(x.t6LabelPairs,x.t90ValidPrediction)||
    x.t6t24CommonLabelPairs>Math.min(x.t6LabelPairs,x.t24ValidPrediction))hold("PAIR_DENOMINATOR");
 return {status:"CONDITIONAL_PAIR_COVERAGE_NOT_MODEL_PERFORMANCE",partition:x.partition,
  eligibleFrame:x.eligibleFrame,certifiedActualLabel:x.certifiedActualLabel,
  t6:{pairs:x.t6LabelPairs,coverage:x.eligibleFrame?x.t6LabelPairs/x.eligibleFrame:null,status:x.t6LabelPairs?"POTENTIALLY_ESTIMABLE_REQUIRES_REVIEW":"NOT_ESTIMABLE"},
  t6t90:{pairs:x.t6t90CommonLabelPairs,status:x.t6t90CommonLabelPairs?"POTENTIALLY_ESTIMABLE_REQUIRES_REVIEW":"NOT_ESTIMABLE"},
  t6t24:{pairs:x.t6t24CommonLabelPairs,status:x.t6t24CommonLabelPairs?"POTENTIALLY_ESTIMABLE_REQUIRES_REVIEW":"NOT_ESTIMABLE"},
  noMissingOutcomeImputation:true,noPosthocReassignment:true,...noAuthority};
}
export function loadFrozenCycle(root){
 return buildPlan(Array.from({length:31},(_,i)=>JSON.parse(readFileSync(join(root,"data-collection/phase5/planning", "phase6-source-day-"+String(i+1).padStart(2,"0")+".json"),"utf8"))));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv[2]!=="--stress-frozen-cycle")hold("CLI_MODE");
  const p=loadFrozenCycle(process.cwd()),first=Math.min(...p.queries.map(q=>q.planned));
  const spans=[60,120,360].map(minutes=>({name:"first-physical-"+minutes+"m",start:first,end:first+minutes*60000}));
  const t=p.queries.filter(q=>q.day===26);spans.push({name:"all-physical-requests-of-first-test-day",start:Math.min(...t.map(q=>q.planned)),end:Math.max(...t.map(q=>q.hard))});
  for(const x of spans){
   const a=stressPhysicalOutage(p,[{startUtc:iso(x.start),endUtc:iso(x.end)}]);
   console.log(JSON.stringify({scenario:x.name,startUtc:iso(x.start),endUtc:iso(x.end),...a,by:{horizon:a.by.horizon,split:a.by.split}}));
  }
 }catch(e){console.error(/^HOLD_P5_OUTAGE_REVIEW_[A-Z_]+$/.test(e?.message||"")?e.message:"HOLD_P5_OUTAGE_REVIEW_UNKNOWN");process.exitCode=2;}
}
