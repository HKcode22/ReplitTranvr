/**
 * No-provider GitHub cron coverage report for Phase5 clock canary.
 * Read GitHub Actions metadata only. Missing/failed/late cron slots are
 * NEVER transformed into flight data or a Phase6 authorization.
 */
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HOUR=3600000,MINUTE=60000;
const ACTIVE_SINCE='2026-11-08T11:03:58.000Z'; // reviewed PR #487 merge: no earlier slots claimed
const HOURS=[0,4,8,12,16,20];
const EXPOSE_DELAY_MINUTES=75;
function validUtc(v){
 const n=Date.parse(String(v));
 return Number.isFinite(n)?n:null;
}
function requiredSlots(nowMs,lookbackHours=24){
 const low=Math.max(nowMs-lookbackHours*HOUR,Date.parse(ACTIVE_SINCE));
 const high=nowMs-EXPOSE_DELAY_MINUTES*MINUTE;
 if(high<=low)return [];
 const begin=new Date(low);
 const midnight=Date.UTC(begin.getUTCFullYear(),begin.getUTCMonth(),begin.getUTCDate())-86400000;
 const out=[];
 for(let day=0;day<=3;day++){
  for(const hour of HOURS){
   const t=midnight+day*86400000+hour*HOUR+17*MINUTE;
   if(t>=low&&t<=high)out.push(t);
  }
 }
 return out.sort((a,b)=>a-b);
}
export function assessSixSlotCoverage({
 nowIso,api,expectedRepo='HKcode22/ReplitTranvr',expectedWorkflowId='phase5-autonomous-clock-canary-no-provider.yml'
}){
 const nowMs=validUtc(nowIso);
 if(nowMs===null)throw Error('INVALID_READBACK_CLOCK');
 if(!api||!Array.isArray(api.workflow_runs)||!Number.isSafeInteger(api.total_count)||
    api.total_count>100||api.workflow_runs.length>100||
    api.total_count!==api.workflow_runs.length)
  throw Error('GH_RUNS_TRUNCATED_OR_UNTRUSTED');
 const slots=requiredSlots(nowMs);
 const scheduleRuns=api.workflow_runs.filter(r=>
   r?.event==='schedule'&&r?.head_repository?.full_name===expectedRepo&&
   r?.path?.endsWith('/'+expectedWorkflowId)&&validUtc(r.created_at)!==null);
 const checks=slots.map(t=>{
   const candidates=scheduleRuns.filter(r=>{
    const created=validUtc(r.created_at);
    // A late creation belongs to the intended nominal 4h slot, never a future slot.
    return created>=t-3*MINUTE&&created<t+4*HOUR-3*MINUTE;
   });
   if(candidates.length===0)return {slot:new Date(t).toISOString(),state:'MISSING',delayMinutes:null,runId:null};
   if(candidates.length>1)return {slot:new Date(t).toISOString(),state:'DUPLICATE',delayMinutes:null,runId:null};
   const candidate=candidates[0];
   const started=validUtc(candidate.run_started_at);
   const delay=started===null?null:Math.round((started-t)/MINUTE*100)/100;
   const state=delay===null?'START_UNVERIFIED':
     delay>EXPOSE_DELAY_MINUTES?'LATE':
     candidate.status!=='completed'?'NOT_COMPLETED':
     candidate.conclusion==='success'?'OBSERVED_SUCCESS':'FAILED';
   return {slot:new Date(t).toISOString(),state,delayMinutes:delay,
     runId:/^[0-9]{4,24}$/.test(String(candidate.id))?String(candidate.id):null};
 });
 const bad=checks.filter(x=>x.state!=='OBSERVED_SUCCESS');
 return {
  schema:'v39.phase5.github-six-slot-coverage-readonly.v1',
  status:checks.length===0?'WARMUP_NO_ELIGIBLE_SLOTS_YET':
    bad.length===0?'OBSERVED_PAST_SLOTS_ONLY_NOT_PHASE6_GO':
    'HOLD_GITHUB_SCHEDULE_MISSING_FAILED_LATE_OR_INCOMPLETE',
  observedAtUtc:new Date(nowMs).toISOString(),
  activationUtc:ACTIVE_SINCE,
  lookbackHours:24,
  maximumAcceptableStartedDelayMinutes:EXPOSE_DELAY_MINUTES,
  eligibleSlotCount:checks.length,
  observedSuccessfulSlotCount:checks.length-bad.length,
  problemCount:bad.length,
  slots:checks,
  provesFutureJobsWillRun:false,
  provesFullPhase6Orchestration:false,
  providerCalls:0,databaseReads:0,databaseWrites:0,phase5ScientificFreezePassed:false,phase6PaidGo:false
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv[2]!=='--runs-file'||!process.argv[3]||
     process.argv[4]!=='--output'||!process.argv[5])throw Error('ARGS');
  const source=readFileSync(process.argv[3],'utf8');
  if(source.length>300000)throw Error('GH_API_TOO_LARGE');
  const result=assessSixSlotCoverage({
    nowIso:new Date().toISOString(),api:JSON.parse(source)
  });
  writeFileSync(process.argv[5],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(result));
  if(process.env.GITHUB_STEP_SUMMARY)
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### Independent six-slot GitHub cron coverage (last 24h; no provider)\n'+
    '- '+result.status+'\n- Successful '+result.observedSuccessfulSlotCount+
    ' / '+result.eligibleSlotCount+' fully elapsed expected slots; '+
    result.problemCount+' holds\n- This is NOT Phase6 scheduling authorization or future job reliability proof.\n');
 }catch{
  console.error('HOLD_GH_SIX_SLOT_COVERAGE_METADATA_UNAVAILABLE');
  process.exitCode=2;
 }
}
