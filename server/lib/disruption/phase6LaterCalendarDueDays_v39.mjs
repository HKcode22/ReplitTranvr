/** Reviewed prospective calendar metadata -> bounded current-day candidates.
 * Only a scheduling hint. The caller still retrieves actual current signed
 * day indexes and native packet bytes and invokes original V0091/V0100.
 * No provider data, key, query, write or independent GO.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
const SHA=/^[a-f0-9]{64}$/;
const h=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_LATER_CALENDAR_"+s);};
const offsets={"T-6h":21600000,"T-90m":5400000};
const utc=x=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("BAD_UTC");return Date.parse(x);};
export function loadP6LaterCalendarWindows(env,trust,read=readFileSync){
 if(env.P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED!=="1"||env.GITHUB_EVENT_NAME!=="schedule"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.P6_PRIVATE_LATER_RUN_DAYS||env.P6_NONPAID_DAILY_POLICY_BASE64?.length>50000)
  hold("EXPLICIT_SCHEDULE_SCOPE_REQUIRED");
 const wire=env.P6_NONPAID_DAILY_POLICY_BASE64??"";
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(wire))hold("MISSING_REVIEWED_POLICY");
 const b=Buffer.from(wire,"base64");
 if(b.length<100||b.length>35000||b.toString("base64")!==wire||!SHA.test(env.P6_NONPAID_DAILY_POLICY_SHA256??"")||h(b)!==env.P6_NONPAID_DAILY_POLICY_SHA256)
  hold("POLICY_HASH_DRIFT");
 const p=JSON.parse(b.toString("utf8"));
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==trust.reviewedCodeSha||
    !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===trust[k])||
    !Array.isArray(p.dayPlanSha256s)||p.dayPlanSha256s.length!==31||
    p.dayPlanSha256s.some((d,i)=>d.runDayIndex!==i+1||!SHA.test(d.sha256??""))||
    new Set(p.dayPlanSha256s.map(d=>d.sha256)).size!==31||utc(p.validFromUtc)>=utc(p.validUntilUtc))
  hold("STUDY_POLICY_SCOPE_DRIFT");
 const windows=p.dayPlanSha256s.map(d=>{
  const raw=read("data-collection/phase5/planning/phase6-source-day-"+String(d.runDayIndex).padStart(2,"0")+".json");
  if(!Buffer.isBuffer(raw)||raw.length<100||raw.length>500000||h(raw)!==d.sha256)
   hold("DAY_PLAN_HASH_DRIFT");
  const plan=JSON.parse(raw.toString("utf8"));
  if(plan?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||plan.runDayIndex!==d.runDayIndex||
     !Array.isArray(plan.templates)||plan.templates.length<12||plan.templates.length>384||
     plan.templates.some(t=>t.runDayIndex!==d.runDayIndex||!["T-24h","T-6h","T-90m"].includes(t.horizon)))
   hold("DAY_PLAN_SCOPE_DRIFT");
  const children=plan.templates.filter(t=>Object.hasOwn(offsets,t.horizon)).map(t=>{
   const start=utc(t.scheduledRequestUtc),cutoff=utc(t.earliestPlannedCutoffUtc),
     end=utc(t.serviceWindowEndUtc)-offsets[t.horizon];
   if(!(start<cutoff&&cutoff<end))hold("INVALID_SIGNED_LATER_GEOMETRY");
   return {start,end};
  });
  if(!children.length)hold("NO_LATER_WINDOWS");
  return {day:d.runDayIndex,children};
 });
 return {windows,validFrom:utc(p.validFromUtc),validUntil:utc(p.validUntilUtc)};
}
export function selectP6LaterCalendarDueDays(reviewed,observedUtc){
 const now=utc(observedUtc);
 if(now<reviewed.validFrom||now>=reviewed.validUntil)hold("CALENDAR_POLICY_NOT_LIVE_AT_DB_CLOCK");
 const active=[];
 for(const d of reviewed.windows){
  const ends=d.children.filter(x=>x.start<=now&&now<x.end).map(x=>x.end);
  if(ends.length)active.push({day:d.day,deadline:Math.min(...ends)});
 }
 active.sort((a,b)=>a.deadline-b.deadline||a.day-b.day);
 return {dayIndices:active.slice(0,2).map(x=>x.day),deferredDays:Math.max(0,active.length-2)};
}
