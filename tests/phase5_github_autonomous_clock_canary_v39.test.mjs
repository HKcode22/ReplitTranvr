import test from 'node:test';
import assert from 'node:assert/strict';
import {closestPastSlotUtc,assessScheduleEvidence,CRON} from '../scripts/v39_phase5_github_autonomous_clock_canary.mjs';
const base={event:'schedule',repo:'HKcode22/ReplitTranvr',ref:'refs/heads/main',runId:'42472900000'};
test('exact six UTC slots; midnight and next-day handling, no local timezone',()=>{
 assert.equal(CRON,'17 0,4,8,12,16,20 * * *');
 const cases=[
 ['2026-11-08T00:16:59.000Z','2026-11-07T20:17:00.000Z'],
 ['2026-11-08T00:17:00.000Z','2026-11-08T00:17:00.000Z'],
 ['2026-11-08T03:59:00.000Z','2026-11-08T00:17:00.000Z'],
 ['2026-11-08T04:18:00.000Z','2026-11-08T04:17:00.000Z'],
 ['2026-11-08T20:17:00.000Z','2026-11-08T20:17:00.000Z'],
 ['2026-11-09T00:17:00.000Z','2026-11-09T00:17:00.000Z']
 ];
 for(const [now,want] of cases)assert.equal(closestPastSlotUtc(Date.parse(now)),want);
});
test('real schedule record means one observed slot, NOT full system GO',()=>{
 const x=assessScheduleEvidence({...base,nowIso:'2026-11-08T08:25:00.000Z'});
 assert.equal(x.status,'OBSERVED_THIS_SINGLE_SCHEDULED_SLOT_ONLY');
 assert.equal(x.nominalUtc,'2026-11-08T08:17:00.000Z');
 assert.equal(x.delayMinutes,8);
 assert.equal(x.phase6PaidGo,false);
 assert.equal(x.phase5ScientificFreezePassed,false);
 assert.equal(x.sourceQueried,false);
 assert.equal(x.provesOtherSlotsFired,false);
 assert.equal(x.providerHttpRequests,0);
 assert.equal(x.databaseWrites,0);
});
test('late schedule never passes even if the job itself executes',()=>{
 const x=assessScheduleEvidence({...base,nowIso:'2026-11-08T09:33:00.000Z'});
 assert.equal(x.status,'HOLD_OBSERVED_SCHEDULED_JOB_TOO_LATE');
 assert.equal(x.delayMinutes,76);
});
test('manual dispatch and PR tests cannot be misrepresented as a scheduled clock',()=>{
 for(const event of ['workflow_dispatch','push','pull_request','unknown']){
  const x=assessScheduleEvidence({...base,event,nowIso:'2026-11-08T08:25:00.000Z'});
  assert.equal(x.status,'NON_SCHEDULE_EVENT_NO_CRON_PROOF');
 }
});
test('scheduled events must be on actual default main repository',()=>{
 for(const [repo,ref] of [
 ['someone/example','refs/heads/main'],
 ['HKcode22/ReplitTranvr','refs/heads/feature']
 ]){
  const x=assessScheduleEvidence({...base,repo,ref,nowIso:'2026-11-08T12:20:00.000Z'});
  assert.equal(x.status,'HOLD_CRON_NOT_GITHUB_DEFAULT_MAIN');
 }
});
test('invalid source clock fails instead of interpreting future or local time',()=>{
 assert.throws(()=>closestPastSlotUtc(NaN),/INVALID_OBSERVED_UTC/);
 assert.throws(()=>assessScheduleEvidence({...base,nowIso:'not-a-date'}),/INVALID_NOW/);
});
