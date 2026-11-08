/**
 * Phase5 no-provider GitHub schedule canary. Proof of each observed cron
 * invocation ONLY, not permission to collect or proof all slots fired.
 * Six expected UTC checkpoints: 00:17/04:17/08:17/12:17/16:17/20:17.
 */
import {writeFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const SLOTS=[0,4,8,12,16,20];
const HOUR_MS=3600000;
export const CRON='17 0,4,8,12,16,20 * * *';
export function closestPastSlotUtc(nowMs){
 if(!Number.isFinite(nowMs)||nowMs<0)throw Error('INVALID_OBSERVED_UTC');
 const d=new Date(nowMs);
 const midnight=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
 const candidates=[...SLOTS.map(h=>midnight+h*HOUR_MS+17*60000),
  midnight-4*HOUR_MS+17*60000];
 const nominal=Math.max(...candidates.filter(t=>t<=nowMs));
 if(!Number.isFinite(nominal))throw Error('NO_SCHEDULE_SLOT');
 return new Date(nominal).toISOString();
}
export function assessScheduleEvidence({event,nowIso,repo,ref,runId}){
 const ms=Date.parse(nowIso);
 if(!Number.isFinite(ms))throw Error('INVALID_NOW');
 const nominal=closestPastSlotUtc(ms);
 const ageMs=ms-Date.parse(nominal);
 const scheduled=event==='schedule';
 const validMain=repo==='HKcode22/ReplitTranvr'&&ref==='refs/heads/main';
 const status=!scheduled?'NON_SCHEDULE_EVENT_NO_CRON_PROOF':
  !validMain?'HOLD_CRON_NOT_GITHUB_DEFAULT_MAIN':
  ageMs>75*60000?'HOLD_OBSERVED_SCHEDULED_JOB_TOO_LATE':
  'OBSERVED_THIS_SINGLE_SCHEDULED_SLOT_ONLY';
 return {
  schema:'v39.phase5.github-autonomous-clock-canary.v1',
  status,
  event,
  observedAtUtc:new Date(ms).toISOString(),
  nominalUtc:nominal,
  delayMinutes:Math.round(ageMs/60000*100)/100,
  maxDelayMinutes:75,
  expectedCronUtc:CRON,
  githubRunId:/^[0-9]{1,24}$/.test(String(runId))?String(runId):null,
  provesOtherSlotsFired:false,
  provesAnyFlightCollected:false,
  sourceQueried:false,
  providerHttpRequests:0,
  databaseReads:0,databaseWrites:0,
  subscriptionsCreated:0,
  phase5ScientificFreezePassed:false,phase6PaidGo:false
 };
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [flag,path]=process.argv.slice(2);
  if(flag!=='--out'||!path)throw Error('EXPECTED_OUTPUT_PATH');
  const x=assessScheduleEvidence({
   event:process.env.GITHUB_EVENT_NAME??'unknown',
   nowIso:new Date().toISOString(),
   repo:process.env.GITHUB_REPOSITORY??'',
   ref:process.env.GITHUB_REF??'',
   runId:process.env.GITHUB_RUN_ID??''
  });
  writeFileSync(path,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(x));
  if(process.env.GITHUB_STEP_SUMMARY)
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### Phase5 unattended GitHub UTC-clock canary (NO PROVIDER)\n'+
    '- '+x.status+'\n- Nominal: '+x.nominalUtc+
    '\n- Observed: '+x.observedAtUtc+
    '\n- Lag: '+x.delayMinutes+' min (guard '+x.maxDelayMinutes+
    ' min)\n- A single heartbeat does NOT prove other slots, source, PRE or STOP.\n');
 }catch{
  console.error('HOLD_PHASE5_GITHUB_SCHEDULE_CANARY_PREP_FAILED');
  process.exitCode=2;
 }
}
