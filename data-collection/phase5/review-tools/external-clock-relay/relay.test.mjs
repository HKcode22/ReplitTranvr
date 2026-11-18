import test from "node:test";
import assert from "node:assert/strict";
import {runPulse,rootInputs,cronJobSpec,RELAY,TARGET,PILOT,PRIMARY,ROLLING} from "./relay.mjs";
const NOW=Date.parse("2026-11-18T06:00:00.000Z"),SHA="a".repeat(40),LOCAL="b".repeat(40);
const tok="github_pat_"+ "x".repeat(30),root="https://api.github.com/repos/";
const wrap=(data,status=200)=>({status,ok:status===200,json:async()=>data});
const row=(id,wf,head=SHA,status="completed")=>({id,path:".github/workflows/"+wf,head_sha:head,head_branch:"main",event:"workflow_dispatch",run_attempt:1,status,conclusion:status==="completed"?"success":null,created_at:new Date(NOW-60000).toISOString()});
function f(mode,fault=""){
 let posts=0,body;const events=[],env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:RELAY,GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"100",GITHUB_SHA:LOCAL,GITHUB_TOKEN:tok,TRAVNR_RELAY_MODE:mode,TRAVNR_TARGET_ACTIONS_TOKEN:tok,TRAVNR_APPROVED_TARGET_MAIN_SHA:SHA,TRAVNR_RELAY_MODE_SINCE_UTC:new Date(NOW-3600000).toISOString(),TRAVNR_ROLLING_POLICY_FROM_UTC:new Date(NOW-600000).toISOString(),TRAVNR_ROLLING_POLICY_UNTIL_UTC:new Date(NOW+6*3600000).toISOString(),TRAVNR_ROLLING_FOUR_APPROVED:"1"};
 const wf=mode==="PILOT"?PILOT:mode==="PRIMARY_BACKSTOP"?PRIMARY:ROLLING;
 const fetcher=async(url,init)=>{
  if(init.method==="POST"){
   posts++;body=JSON.parse(init.body);
   assert.equal(url,root+TARGET+"/actions/workflows/"+wf+"/dispatches");
   if(fault==="ack")return wrap({},503);
   return wrap({workflow_run_id:201,run_url:root+TARGET+"/actions/runs/201",html_url:"https://github.com/"+TARGET+"/actions/runs/201"});
  }
  assert.equal(init.method,"GET");
  if(url===root+RELAY+"/actions/runs/100")return wrap(row(100,"external-clock.yml",LOCAL,"in_progress"));
  if(url.includes(root+RELAY+"/actions/workflows/"))return wrap({total_count:fault==="prior"?1:0,workflow_runs:fault==="prior"?[{}]:[]});
  if(url===root+TARGET+"/git/ref/heads/main")return wrap({object:{sha:fault==="drift"?LOCAL:SHA}});
  if(url===root+TARGET+"/actions/runs/201")return wrap(fault==="targetFailed"?{...row(201,wf),conclusion:"failure"}:row(201,wf,SHA,"queued"));
  if(url.includes("/actions/runs/112/jobs"))return wrap({total_count:2,jobs:[{id:501,name:"one-protected-bounded-session",run_id:112,head_sha:SHA,run_attempt:1,status:"completed",conclusion:fault==="skip"?"skipped":"success",steps:fault==="skip"?[]:[{name:"Execute one protected rolling session"}]},{id:502,name:"offline-bounded-session-reconciliation",run_id:112,head_sha:SHA,run_attempt:1,status:"completed",conclusion:"skipped",steps:[]}]});
  if(url.includes("/actions/runs/111/jobs"))return wrap({total_count:1,jobs:[{name:"primary-fids-expiry",run_id:111,head_sha:SHA,run_attempt:1,status:"completed",conclusion:"success",completed_at:new Date(NOW-(fault==="recent"?5:40)*60000).toISOString(),steps:[{name:"Verify exact main and execute only bounded primary FIDS expiry",status:"completed",conclusion:"success"}]}]});
  if(url.includes("&status="))return wrap({total_count:fault==="active"?1:0,workflow_runs:fault==="active"?[row(301,wf,SHA,"queued")]:[]});
  if(url.includes("per_page=20"))return wrap({total_count:1,workflow_runs:[{...row(111,wf),event:fault==="verifyOnly"?"workflow_dispatch":"schedule"}]});
  if(url.includes("&created="))return wrap({total_count:["window","skip","partial","failedRoot"].includes(fault)?1:0,workflow_runs:["window","skip","partial","failedRoot"].includes(fault)?[{...row(112,wf),conclusion:fault==="failedRoot"?"failure":"success"}]:[]});
  throw Error("unexpected request");
 };
 return {env,opts:{now:()=>NOW,fetcher,emit:x=>events.push(x),sleep:async()=>{}},posts:()=>posts,body:()=>body,events};
}
test("clock only requires no target credential and dispatches nothing",async()=>{const x=f("CLOCK_ONLY");delete x.env.TRAVNR_TARGET_ACTIONS_TOKEN;assert.equal((await runPulse(x.env,x.opts)).status,"EXTERNAL_CLOCK_OBSERVED_NO_TARGET_DISPATCH");assert.equal(x.posts(),0);});
test("pilot forwards exactly one existing nonpaid OBSERVE",async()=>{const x=f("PILOT");assert.equal((await runPulse(x.env,x.opts)).targetRunId,201);assert.deepEqual(x.body().inputs,{mode:"OBSERVE"});assert.equal(x.posts(),1);});
test("stale primary selects existing primary-only backstop confirmation",async()=>{const x=f("PRIMARY_BACKSTOP");assert.equal((await runPulse(x.env,x.opts)).targetRunId,201);assert.equal(x.body().inputs.confirm,"APPLY_REVIEWED_PRIMARY_FIDS_BACKSTOP_NO_PRIVATE_MUTATION");assert.equal(x.posts(),1);});
test("recent actual primary job prevents redundant dispatch",async()=>{const x=f("PRIMARY_BACKSTOP","recent");assert.match((await runPulse(x.env,x.opts)).status,/DEFER_RECENT/);assert.equal(x.posts(),0);});
test("rolling root uses existing dynamic manual contract before cutoff",async()=>{const x=f("ROLLING_ROOT");assert.equal((await runPulse(x.env,x.opts)).targetRunId,201);assert.equal(x.body().inputs.confirm,"RUN_UP_TO_FOUR_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO");assert.equal(x.body().inputs.scheduled_root_run_id,"");assert.equal(x.posts(),1);});
for(const [mode,fault] of [["PILOT","prior"],["PILOT","active"],["PILOT","drift"],["ROLLING_ROOT","window"]])test("no POST "+fault,async()=>{const x=f(mode,fault);await runPulse(x.env,x.opts);assert.equal(x.posts(),0);});
test("unknown ACK never retries",async()=>{const x=f("PILOT","ack");await assert.rejects(runPulse(x.env,x.opts),/NO_BLIND_REPLAY/);assert.equal(x.posts(),1);});
test("scope rejects provider keys and foreign repository",async()=>{for(const a of [{AERODATABOX_API_KEY:"x"},{GITHUB_REPOSITORY:TARGET}]){const x=f("PILOT");await assert.rejects(runPulse({...x.env,...a},x.opts),/SCOPE/);assert.equal(x.posts(),0);}});
test("dynamic scope declines late window and never invents approval",()=>{const a=new Date(NOW-110*60000).toISOString(),b=new Date(NOW+10*60000).toISOString();assert.equal(rootInputs(NOW,a,b,SHA,true),null);});
test("cron job targets isolated relay only, disabled by default, expiring, no target token",()=>{const j=cronJobSpec(tok,NOW);assert.equal(j.enabled,false);assert.equal(j.requestMethod,1);assert.equal(j.schedule.expiresAt,20261118073000);assert.match(j.url,/TravnrClockRelay/);assert(!j.url.includes("ReplitTranvr"));});

test("already-terminal target failure quarantines the attempted wake",async()=>{const x=f("PILOT","targetFailed");await assert.rejects(runPulse(x.env,x.opts),/ACK_TARGET_TERMINAL_FAILURE_REVIEW_NO_BLIND_REPLAY/);assert.equal(x.posts(),1);});

test("VERIFY-only success is not expiry APPLY freshness or initial baseline",async()=>{const x=f("PRIMARY_BACKSTOP","verifyOnly");assert.match((await runPulse(x.env,x.opts)).status,/NO_CURRENT_MAIN_APPLY_BASELINE/);assert.equal(x.posts(),0);});
test("all exact skipped jobs permit only guarded target root wake",async()=>{const x=f("ROLLING_ROOT","skip");assert.equal((await runPulse(x.env,x.opts)).targetRunId,201);assert.equal(x.posts(),1);assert(x.events.some(e=>e.status==="EXTERNAL_WAKE_ONLY_SKIPPED_CONTROLLER_HISTORY_NO_DB_AUTHORITY"));});
test("actual or partially executed protected root never replays",async()=>{const x=f("ROLLING_ROOT","partial");assert.match((await runPulse(x.env,x.opts)).status,/CUSTODY_REVIEW/);assert.equal(x.posts(),0);});
test("failed protected root requires custody reconciliation, never replays",async()=>{const x=f("ROLLING_ROOT","failedRoot");assert.match((await runPulse(x.env,x.opts)).status,/CUSTODY_REVIEW/);assert.equal(x.posts(),0);});
