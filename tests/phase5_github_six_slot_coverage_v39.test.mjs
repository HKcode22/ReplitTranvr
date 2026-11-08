import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSixSlotCoverage} from '../scripts/v39_phase5_github_six_slot_coverage_report.mjs';
const name='.github/workflows/phase5-autonomous-clock-canary-no-provider.yml@refs/heads/main';
function run(slot,{delay=3,status='completed',conclusion='success',path=name,id=42479900111}={}){
 const nominal=Date.parse(slot);
 return {id,event:'schedule',path,head_repository:{full_name:'HKcode22/ReplitTranvr'},
  created_at:new Date(nominal+60000).toISOString(),
  run_started_at:new Date(nominal+delay*60000).toISOString(),status,conclusion};
}
function audit(nowIso,rs=[]){
 return assessSixSlotCoverage({nowIso,api:{total_count:rs.length,workflow_runs:rs}});
}
test('a first-day observer never invents missing slots before activation+75 minutes',()=>{
 const x=audit('2026-11-08T12:00:00.000Z');
 assert.equal(x.status,'WARMUP_NO_ELIGIBLE_SLOTS_YET');
 assert.equal(x.eligibleSlotCount,0);
 assert.equal(x.phase6PaidGo,false);
});
test('two fully elapsed real GitHub runs mean only those past slots observed, never 31-day GO',()=>{
 const a=run('2026-11-08T12:17:00.000Z',{delay:4});
 const b=run('2026-11-08T16:17:00.000Z',{delay:8,id:42479900112});
 const x=audit('2026-11-08T17:45:00.000Z',[a,b]);
 assert.equal(x.eligibleSlotCount,2);
 assert.equal(x.observedSuccessfulSlotCount,2);
 assert.equal(x.problemCount,0);
 assert.equal(x.status,'OBSERVED_PAST_SLOTS_ONLY_NOT_PHASE6_GO');
 assert.equal(x.provesFutureJobsWillRun,false);
 assert.equal(x.providerCalls,0);
 assert.equal(x.databaseWrites,0);
});
test('missing slot is a HOLD, not inferred from last available success',()=>{
 const x=audit('2026-11-08T17:45:00.000Z',[run('2026-11-08T12:17:00.000Z')]);
 assert.equal(x.eligibleSlotCount,2);
 assert.equal(x.problemCount,1);
 assert.equal(x.slots[1].state,'MISSING');
 assert.equal(x.status,'HOLD_GITHUB_SCHEDULE_MISSING_FAILED_LATE_OR_INCOMPLETE');
});
test('scheduled job that started 76min late is not cron reliability PASS',()=>{
 const x=audit('2026-11-08T14:00:00.000Z',[run('2026-11-08T12:17:00.000Z',{delay:76})]);
 assert.equal(x.slots.length,1);
 assert.equal(x.slots[0].state,'LATE');
 assert.equal(x.slots[0].delayMinutes,76);
});
test('failed or in-progress schedule event is not PASS',()=>{
 for(const options of [
  {status:'completed',conclusion:'failure'},
  {status:'in_progress',conclusion:null}
 ]){
  const x=audit('2026-11-08T14:00:00.000Z',[run('2026-11-08T12:17:00.000Z',options)]);
  assert.notEqual(x.slots[0].state,'OBSERVED_SUCCESS');
 }
});
test('manual and other workflow runs cannot satisfy one scheduled slot',()=>{
 const m=run('2026-11-08T12:17:00.000Z');m.event='workflow_dispatch';
 const other=run('2026-11-08T12:17:00.000Z',{path:'.github/workflows/other.yml'});
 assert.equal(audit('2026-11-08T14:00:00.000Z',[m,other]).slots[0].state,'MISSING');
});
test('duplicate scheduled jobs, unknown start and malformed/truncated GH inventory HOLD',()=>{
 const a=run('2026-11-08T12:17:00.000Z');
 const b=run('2026-11-08T12:17:00.000Z',{id:42479900112});
 assert.equal(audit('2026-11-08T14:00:00.000Z',[a,b]).slots[0].state,'DUPLICATE');
 const c=run('2026-11-08T12:17:00.000Z');c.run_started_at=null;
 assert.equal(audit('2026-11-08T14:00:00.000Z',[c]).slots[0].state,'START_UNVERIFIED');
 assert.throws(()=>assessSixSlotCoverage({nowIso:'2026-11-08T14:00:00Z',api:{total_count:200,workflow_runs:[a]}}),/TRUNCATED_OR_UNTRUSTED/);
 assert.throws(()=>audit('not-a-date'),/INVALID_READBACK_CLOCK/);
});
