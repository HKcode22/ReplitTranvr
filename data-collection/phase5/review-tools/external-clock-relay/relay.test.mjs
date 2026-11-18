import test from "node:test";
import assert from "node:assert/strict";
import {runPulse,rootInputs,cronJobSpec,readPrimaryVerifyLog,verifyPrimaryBootstrapReceipt,RELAY,TARGET,PILOT,PRIMARY,ROLLING} from "./relay.mjs";
const NOW=Date.parse("2026-11-18T06:00:00.000Z"),SHA="a".repeat(40),LOCAL="b".repeat(40);
const tok="github_pat_"+ "x".repeat(30),root="https://api.github.com/repos/";
const wrap=(data,status=200)=>({status,ok:status===200,json:async()=>data});
const row=(id,wf,head=SHA,status="completed")=>({id,path:".github/workflows/"+wf,head_sha:head,head_branch:"main",event:"workflow_dispatch",run_attempt:1,status,conclusion:status==="completed"?"success":null,created_at:new Date(NOW-60000).toISOString()});
const bootRow={...row(202,PRIMARY),created_at:new Date(NOW-20*60000).toISOString()};
const bootJob={id:1202,name:"primary-fids-expiry",run_id:202,head_sha:SHA,run_attempt:1,status:"completed",conclusion:"success",completed_at:new Date(NOW-18*60000).toISOString(),steps:[{name:"Verify exact main and execute only bounded primary FIDS expiry",status:"completed",conclusion:"success"}]};
const bootStatus={status:"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES",reviewedMainSha:SHA,distinctDbActorsVerified:true,privateCommissionState:"GRANTED",providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false,backupOrPitrVerified:false,completeRetentionDeploymentVerified:false,before:{schema:"v39.phase5.primary-fids-expiry-status.v1",observedAtUtc:new Date(NOW-19*60000).toISOString(),liveOriginals:0,eligibleOriginals:0,hardDueOriginals:0,eligibleNextHour:0,hardDueNextHour:0,unboundLiveOriginals:0,markedExpiredPayloadPresent:0,unlinkedUnexpiredPopulation:0,unexpiredPopulationWithoutLiveOriginal:0,deletionStopUnresolved:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false,backupOrPitrVerified:false,completeRetentionDeploymentVerified:false}};
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
  if(url===root+RELAY+"/actions/runs/100")return wrap({...row(100,"external-clock.yml",LOCAL,"in_progress"),display_title:"TRAVNR EXTERNAL CLOCK "+(env.TRAVNR_RELAY_LANE||"CLOCK_ONLY")});
  if(url.includes(root+RELAY+"/actions/workflows/")){
   if(env.TRAVNR_RELAY_MODE==="MULTI_LANE"&&["otherLane","sameLane","unknownLane"].includes(fault)&&url.includes("status=failure")){
    const title=fault==="unknownLane"?"unknown":fault==="sameLane"?"TRAVNR EXTERNAL CLOCK "+env.TRAVNR_RELAY_LANE:"TRAVNR EXTERNAL CLOCK "+(env.TRAVNR_RELAY_LANE==="PRIMARY_BACKSTOP"?"ROLLING_ROOT":"PRIMARY_BACKSTOP");
    return wrap({total_count:1,workflow_runs:[{...row(712,"external-clock.yml",LOCAL),display_title:title,conclusion:"failure"}]});
   }
   return wrap({total_count:fault==="prior"?1:0,workflow_runs:fault==="prior"?[{}]:[]});
  }
  if(url===root+TARGET+"/git/ref/heads/main")return wrap({object:{sha:fault==="drift"?LOCAL:SHA}});
  if(url===root+TARGET+"/actions/runs/202")return wrap(bootRow);
  if(url===root+TARGET+"/actions/runs/202/jobs?filter=latest&per_page=100")return wrap({total_count:1,jobs:[bootJob]});
  if(url===root+TARGET+"/actions/jobs/1202/logs"){
   assert.equal(init.redirect,"manual");assert(init.headers.Authorization.startsWith("Bearer "));
   return new Response("",{status:302,headers:{Location:fault==="evilHost"?"https://untrusted.example/log":"https://logs.blob.core.windows.net/log?sig=fixture"}});
  }
  if(url.startsWith("https://logs.blob.core.windows.net/")){
   assert.equal(init.redirect,"error");assert.equal(init.headers,undefined);
   return new Response("timestamp "+JSON.stringify(fault==="notZero"?{...bootStatus,before:{...bootStatus.before,hardDueOriginals:1}}:bootStatus),{status:200});
  }
  if(url===root+TARGET+"/actions/runs/201")return wrap(fault==="targetFailed"?{...row(201,wf),conclusion:"failure"}:row(201,wf,SHA,"queued"));
  if(url.includes("/actions/runs/112/jobs"))return wrap({total_count:2,jobs:[{id:501,name:"one-protected-bounded-session",run_id:112,head_sha:SHA,run_attempt:1,status:"completed",conclusion:fault==="skip"?"skipped":"success",steps:fault==="skip"?[]:[{name:"Execute one protected rolling session"}]},{id:502,name:"offline-bounded-session-reconciliation",run_id:112,head_sha:SHA,run_attempt:1,status:"completed",conclusion:"skipped",steps:[]}]});
  if(url.includes("/actions/runs/111/jobs"))return wrap({total_count:1,jobs:[{name:"primary-fids-expiry",run_id:111,head_sha:SHA,run_attempt:1,status:"completed",conclusion:"success",completed_at:new Date(NOW-(fault==="recent"?5:40)*60000).toISOString(),steps:[{name:"Verify exact main and execute only bounded primary FIDS expiry",status:"completed",conclusion:"success"}]}]});
  if(url.includes("&status="))return wrap({total_count:fault==="active"?1:0,workflow_runs:fault==="active"?[row(301,wf,SHA,"queued")]:[]});
  if(url.includes("per_page=20"))return wrap({total_count:1,workflow_runs:[{...row(111,wf),event:["verifyOnly","coldStart","evilHost","notZero"].includes(fault)?"workflow_dispatch":"schedule"}]});
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

function multi(mode,fault=""){
 const x=f(mode,fault);
 Object.assign(x.env,{TRAVNR_RELAY_MODE:"MULTI_LANE",TRAVNR_RELAY_LANE:mode,TRAVNR_RELAY_PRIMARY_ENABLED:"1",TRAVNR_RELAY_ROLLING_ENABLED:"1",TRAVNR_RELAY_PRIMARY_SINCE_UTC:new Date(NOW-3600000).toISOString(),TRAVNR_RELAY_ROLLING_SINCE_UTC:new Date(NOW-3600000).toISOString()});
 return x;
}
test("multi-lane rolling independent of known terminal primary failure",async()=>{const x=multi("ROLLING_ROOT","otherLane");assert.equal((await runPulse(x.env,x.opts)).targetRunId,201);assert.equal(x.posts(),1);});
test("multi-lane primary independent of known terminal rolling failure",async()=>{const x=multi("PRIMARY_BACKSTOP","otherLane");assert.equal((await runPulse(x.env,x.opts)).targetRunId,201);assert.equal(x.posts(),1);});
test("same lane and unidentified prior failures quarantine",async()=>{for(const fault of ["sameLane","unknownLane"]){const x=multi("ROLLING_ROOT",fault);assert.match((await runPulse(x.env,x.opts)).status,/QUARANTINED/);assert.equal(x.posts(),0);}});
test("disabled lane is independent and never requires target credentials",async()=>{const x=multi("PRIMARY_BACKSTOP");delete x.env.TRAVNR_TARGET_ACTIONS_TOKEN;x.env.TRAVNR_RELAY_PRIMARY_ENABLED="0";assert.match((await runPulse(x.env,x.opts)).status,/LANE_OFF/);assert.equal(x.posts(),0);});
test("multi-lane clock-only never receives target authority",async()=>{const x=multi("CLOCK_ONLY");delete x.env.TRAVNR_TARGET_ACTIONS_TOKEN;assert.equal((await runPulse(x.env,x.opts)).status,"EXTERNAL_CLOCK_OBSERVED_NO_TARGET_DISPATCH");assert.equal(x.posts(),0);});
test("single-lane mode rejects spoofed workflow input",async()=>{const x=f("CLOCK_ONLY");x.env.TRAVNR_RELAY_LANE="ROLLING_ROOT";await assert.rejects(runPulse(x.env,x.opts),/SCOPE/);assert.equal(x.posts(),0);});

test("first primary wake from exact selected VERIFY receipt is guarded and never counts as APPLY freshness",async()=>{
 const x=f("PRIMARY_BACKSTOP","coldStart");x.env.TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID="202";
 assert.equal((await runPulse(x.env,x.opts)).targetRunId,201);assert.equal(x.posts(),1);
 assert(x.events.some(e=>e.status==="EXTERNAL_FIRST_PRIMARY_WAKE_FROM_EXACT_VERIFY_NOT_APPLY_FRESHNESS"));
});
test("initial wake refuses nonzero due counter or untrusted signed log host",async()=>{
 for(const fault of ["notZero","evilHost"]){const x=f("PRIMARY_BACKSTOP",fault);x.env.TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID="202";assert.match((await runPulse(x.env,x.opts)).status,/PREFLIGHT_DEFERRED/);assert.equal(x.posts(),0);}
});
test("VERIFY receipt must be exact, zero, unique and fresh",()=>{
 const log=JSON.stringify(bootStatus),jobs={total_count:1,jobs:[bootJob]};
 assert.equal(verifyPrimaryBootstrapReceipt(bootRow,jobs,log,SHA,202,NOW).verifiedJobId,1202);
 for(const x of [()=>verifyPrimaryBootstrapReceipt(bootRow,jobs,log,SHA,202,NOW+7*3600000),()=>verifyPrimaryBootstrapReceipt(bootRow,jobs,log+"\n"+log,SHA,202,NOW),()=>verifyPrimaryBootstrapReceipt(bootRow,jobs,log,"b".repeat(40),202,NOW)])assert.throws(x,/PRIMARY_BOOTSTRAP_VERIFY/);
});
test("signed job-log retrieval never forwards target bearer or accepts arbitrary host",async()=>{
 let seen=0;const log=await readPrimaryVerifyLog(async(url,init)=>{seen++;if(seen===1){assert.equal(init.redirect,"manual");return new Response("",{status:302,headers:{Location:"https://logs.blob.core.windows.net/path?sig=fixture"}});}assert.equal(init.headers,undefined);assert.equal(init.redirect,"error");return new Response("sanitized fixture");},tok,1202);
 assert.equal(log,"sanitized fixture");assert.equal(seen,2);
});
