/** Conservative scheduling hints from the EXISTING reviewed 31-day plan
 * bytes. No signer, provider, DB, dispatch or authorization. Never uses
 * these bounds as flight cutoffs: workers keep the real PostgreSQL clock.
 * Only an independently pinned policy/calendar may produce an idle hint.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_ROLLING_CALENDAR_"+s);};
const MIN=60000,HOUR=60*MIN;
const offsets={"T-24h":24*HOUR,"T-6h":6*HOUR,"T-90m":90*MIN};
const lanes=["SOURCE_POST","PRE_ENROLLMENT","T24","LATER_PRE","DAILY_PREPARE","EARLY_DRAW"];
const issued=new WeakSet();
const utc=s=>{
 if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)hold("INVALID_UTC");
 return Date.parse(s);
};
function merge(xs){
 const out=[];
 for(const [start,end] of xs.sort((a,b)=>a[0]-b[0])){
  if(!(start<end))hold("WINDOW_INVALID");
  if(out.length&&start<=out.at(-1)[1])out.at(-1)[1]=Math.max(out.at(-1)[1],end);
  else out.push([start,end]);
 }
 return Object.freeze(out.map(Object.freeze));
}
export function loadP6RollingCalendarHints({policyBytes,expectedPolicySha256,trust,read=readFileSync}){
 if(!Buffer.isBuffer(policyBytes)||policyBytes.length<100||policyBytes.length>35000||
    !SHA.test(expectedPolicySha256??"")||hash(policyBytes)!==expectedPolicySha256||
    !CODE.test(trust?.reviewedCodeSha??"")||
    !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>SHA.test(trust?.[k]??"")))
  hold("MISSING_EXACT_REVIEWED_POLICY");
 const p=JSON.parse(policyBytes.toString("utf8"));
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==trust.reviewedCodeSha||
    !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===trust[k])||
    !Array.isArray(p.dayPlanSha256s)||p.dayPlanSha256s.length!==31||
    p.dayPlanSha256s.some((x,i)=>x?.runDayIndex!==i+1||!SHA.test(x.sha256??""))||
    new Set(p.dayPlanSha256s.map(x=>x.sha256)).size!==31)
  hold("REVIEWED_POLICY_DRIFT");
 const from=utc(p.validFromUtc),until=utc(p.validUntilUtc);
 if(from>=until)hold("POLICY_CLOCK");
 const w=Object.fromEntries(lanes.map(l=>[l,[]]));
 const add=(lane,start,end)=>w[lane].push([start,end]);
 let previousStart=-Infinity;
 // 10 minutes of conservative wake-up padding; actual worker scheduling
 // and 2s/other cutoff safety margins remain entirely unchanged.
 const pad=10*MIN;
 for(const day of p.dayPlanSha256s){
  const raw=read("data-collection/phase5/planning/phase6-source-day-"+String(day.runDayIndex).padStart(2,"0")+".json");
  if(!Buffer.isBuffer(raw)||raw.length<100||raw.length>500000||hash(raw)!==day.sha256)
   hold("DAY_PLAN_HASH_DRIFT");
  const plan=JSON.parse(raw.toString("utf8"));
  if(plan?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||plan.runDayIndex!==day.runDayIndex||
    !Array.isArray(plan.templates)||plan.templates.length<12||plan.templates.length>384)
   hold("DAY_PLAN_SCOPE_DRIFT");
  const start=utc(plan.expectedServiceStartUtc);
  if(start<=previousStart)hold("UNORDERED_CALENDAR");
  previousStart=start;
  let first=Infinity,last=-Infinity,earliestService=Infinity;
  const seen=new Set(),horizons=new Set();
  for(const t of plan.templates){
   if(t?.runDayIndex!==day.runDayIndex||!Object.hasOwn(offsets,t.horizon)||typeof t.queryKey!=="string"||
      !t.queryKey||seen.has(t.queryKey))hold("BAD_TEMPLATE_OR_DUPLICATE");
   seen.add(t.queryKey);horizons.add(t.horizon);
   const a=utc(t.serviceWindowStartUtc),z=utc(t.serviceWindowEndUtc),request=utc(t.scheduledRequestUtc),
    cutoff=utc(t.earliestPlannedCutoffUtc),end=z-offsets[t.horizon];
   if(a<start||z<=a||z>start+6*HOUR||request>=cutoff||cutoff<a-offsets[t.horizon]||cutoff>=end)
    hold("TEMPLATE_CLOCK_DRIFT");
   first=Math.min(first,request);last=Math.max(last,z);earliestService=Math.min(earliestService,a);
   // Existing stored parent max lead 35m; use a wider hint, never narrow
   // original admission or infer data availability from this clock.
   add("SOURCE_POST",request-35*MIN-pad,end+pad);
   add(t.horizon==="T-24h"?"T24":"LATER_PRE",request-pad,end+pad);
   add("PRE_ENROLLMENT",request-pad,end+pad);
  }
  if(earliestService!==start||horizons.size!==3)hold("INCOMPLETE_EXPOSURE");
  // Broad maximum original preparation lookahead = 2880m; do not use
  // inferred minimum lead as an authorization. Actual DB selection remains.
  add("DAILY_PREPARE",first-48*HOUR-pad,first+pad);
  // Original prospective early-draw policy 72h and strict 24h45m min.
  add("EARLY_DRAW",start-72*HOUR-pad,start-(24*HOUR+45*MIN)+pad);
  add("SOURCE_POST",start-pad,last+48*HOUR+pad);
 }
 const result=Object.freeze({from,until,windows:Object.freeze(Object.fromEntries(lanes.map(l=>[l,merge(w[l])]))),
  policySha256:expectedPolicySha256,providerCalls:0,databaseWrites:0,phase6PaidGo:false});
 issued.add(result);return result;
}
export function assessP6RollingCalendarHints(reviewed,clock){
 if(!issued.has(reviewed)||!Number.isSafeInteger(clock))hold("UNREVIEWED_CALENDAR");
 // Outside policy validity, absence cannot be inferred. Wake all lanes
 // for explicit existing worker review, rather than silently suppressing.
 const live=clock>=reviewed.from&&clock<reviewed.until;
 const hints=lanes.map(l=>{
  const xs=reviewed.windows[l],active=!live||xs.some(([a,z])=>a<=clock&&clock<z);
  const next=live&&!active?xs.find(([a])=>a>clock)?.[0]??null:null;
  return {lane:l,mayNeedWork:active,nextPossibleWakeUtc:next===null?null:new Date(next).toISOString()};
 });
 // Never suppress reconciliation or retention just because no new
 // sampling window is open. Outstanding work can exist.
 hints.push({lane:"PRE_RECOVERY",mayNeedWork:true,nextPossibleWakeUtc:null},
  {lane:"RETENTION_MONITOR",mayNeedWork:true,nextPossibleWakeUtc:null});
 return {status:live?"REVIEWED_CALENDAR_WAKE_HINT_ONLY_NO_GO":"OUTSIDE_POLICY_NO_IDLE_INFERENCE",
  hints,actualDbClock:false,providerCalls:0,databaseWrites:0,dispatchCount:0,phase6PaidGo:false};
}
