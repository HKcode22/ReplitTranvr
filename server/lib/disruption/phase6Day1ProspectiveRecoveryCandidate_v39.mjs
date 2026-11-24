/** Day1 incident candidate: classify original planned query identities at actual
 * DB time. No authorization, no DB writes, no provider, no replacement draw.
 * Integration must independently bind the original day-plan digest, actual
 * paired draw, restricted clock, signed recovery policy and missingness ledger.
 */
import {createHash} from "node:crypto";
const slots=["HUB","MID_A","MID_B","REGIONAL"];
const horizons=["T-24h","T-6h","T-90m"];
const expected={HUB:"OMAA",MID_A:"OMSJ",MID_B:"SPJC",REGIONAL:"KDEC"};
const sha=b=>createHash("sha256").update(b).digest("hex");
const hold=x=>{throw Error("HOLD_P6_DAY1_RECOVERY_"+x)};
const clock=x=>{const n=Date.parse(x);if(typeof x!=="string"||!Number.isFinite(n)||new Date(n).toISOString()!==x)hold("CLOCK");return n};
export function classifyP6Day1Recovery({dayPlanBytes,expectedDayPlanSha256,observedDbUtc,minimumPreparationLeadMinutes}){
 if(!Buffer.isBuffer(dayPlanBytes)||!/^[a-f0-9]{64}$/.test(expectedDayPlanSha256??"")||sha(dayPlanBytes)!==expectedDayPlanSha256)hold("ORIGINAL_PLAN_DIGEST");
 if(!Number.isSafeInteger(minimumPreparationLeadMinutes)||minimumPreparationLeadMinutes<15||minimumPreparationLeadMinutes>180)hold("LEAD");
 const now=clock(observedDbUtc),p=JSON.parse(dayPlanBytes.toString("utf8"));
 if(p.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||p.runDayIndex!==1||p.expectedDrawType!=="NEW_TEMPLATE"||p.expectedServiceStartUtc!=="2026-11-25T00:00:00.000Z"||!p.pairedIcaos||Object.keys(p.pairedIcaos).length!==4||slots.some(s=>p.pairedIcaos[s]!==expected[s])||!Array.isArray(p.templates)||p.templates.length!==192)hold("ORIGINAL_DAY1_GEOMETRY");
 const start=clock(p.expectedServiceStartUtc),offset={"T-24h":1440,"T-6h":360,"T-90m":90},seen=new Set(),groups=new Map(),eligible=[],missed=[];
 for(const q of p.templates){
  if(q.runDayIndex!==1||!slots.includes(q.slot)||!horizons.includes(q.horizon)||q.providerQueryDirection!=="Departure"||q.apiUnitsPerAttempt!==2||q.maxAttempts!==1||q.maxResponseAndPersistSeconds!==180||typeof q.queryKey!=="string"||seen.has(q.queryKey))hold("TEMPLATE");
  seen.add(q.queryKey);
  const m=/^p6\.d1\.(HUB|MID_A|MID_B|REGIONAL)\.(T-24h|T-6h|T-90m)\.s1\.p1\.r([1-9]|1[0-6])$/.exec(q.queryKey);
  if(!m||m[1]!==q.slot||m[2]!==q.horizon)hold("TEMPLATE_KEY");
  const cutoff=start-offset[q.horizon]*60000+(Number(m[3])-1)*900000,request=cutoff-900000;
  if(clock(q.earliestPlannedCutoffUtc)!==cutoff||clock(q.scheduledRequestUtc)!==request||clock(q.serviceWindowStartUtc)!==start||clock(q.serviceWindowEndUtc)!==start+14400000||q.physicalChargeDayUtc!==new Date(request).toISOString().slice(0,10)||q.budgetDayUtc!=="2026-11-25")hold("ORIGINAL_CLOCK_OR_BUDGET");
  const key=q.slot+"/"+q.horizon;groups.set(key,(groups.get(key)??0)+1);
  // Strictly future after conservative preparation AND normal parent review lead.
  // Do not select a request already open/elapsed, even if cutoff is later.
  const deadline=request-Math.max(minimumPreparationLeadMinutes,15)*60000;
  const entry={queryKey:q.queryKey,slot:q.slot,horizon:q.horizon,scheduledRequestUtc:q.scheduledRequestUtc,earliestPlannedCutoffUtc:q.earliestPlannedCutoffUtc,apiUnits:2};
  if(now<deadline)eligible.push(entry);else missed.push({...entry,reason:now>=request?"REQUEST_WINDOW_ALREADY_REACHED":"INSUFFICIENT_PROSPECTIVE_PREPARATION_LEAD"});
 }
 if(groups.size!==12||[...groups.values()].some(n=>n!==16))hold("COMPLETE_DENOMINATOR");
 const byHorizon=Object.fromEntries(horizons.map(h=>[h,{planned:64,prospectiveCandidates:eligible.filter(q=>q.horizon===h).length,excluded:missed.filter(q=>q.horizon===h).length}]));
 return {schema:"v39.phase6.day1-prospective-recovery-candidate.v1",runDayIndex:1,originalDayPlanSha256:expectedDayPlanSha256,observedDbUtc,minimumPreparationLeadMinutes,planned:192,eligible,missed,byHorizon,maximumCandidateApiUnits:eligible.length*2,authorizesPaidGet:false,databaseWrites:0,providerCalls:0};
}
