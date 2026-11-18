import test from "node:test";
import assert from "node:assert/strict";
import {runP5RollingRehearsal,admitP5RollingRehearsal,observeP5SustainedClock,validateP5SustainedClockReceipt,SUSTAINED_CONFIRM,p5RehearsalSafeError} from "../scripts/v39_phase5_rolling_continuation_rehearsal.mjs";
const SHA="a".repeat(40),CHAIN="b".repeat(32),REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const WF="phase5-autonomous-clock-canary-no-provider.yml",START=Date.parse("2030-01-01T00:00:00.000Z");
const iso=x=>new Date(x).toISOString(),reply=(data,status=200)=>({ok:status===200,status,json:async()=>data});
function fixture(hop=0,fault=""){
 let t=START+120000,posts=0,gets=0;const events=[];
 const rows=Array.from({length:hop+1},(_,i)=>({id:100+i,head_sha:SHA,head_branch:"main",event:"workflow_dispatch",run_attempt:1,
  path:".github/workflows/"+WF,display_title:"P5 ROLLING "+CHAIN+" "+i+" "+(i?99+i:0),
  created_at:iso(START+(i+1)*10000),status:i===hop?"in_progress":"completed",conclusion:i===hop?null:"success"}));
 if(fault==="parent")rows[hop-1].conclusion="failure";
 if(fault==="duplicate")rows.push({...rows[0],id:999});
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:REPO,GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",
  GITHUB_RUN_ID:String(100+hop),GITHUB_SHA:SHA,GITHUB_TOKEN:"synthetic-token-no-access",ADB_AUTO_COLLECT:"0",
  V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",P6_ROLLING_CONTROLLER_ENABLED:"0",
  P5_ROLLING_REHEARSAL_CONFIRM:"REHEARSE_THREE_ROLLING_SESSIONS_NO_PROVIDER_NO_DB",P5_ROLLING_REHEARSAL_SHA:SHA,
  P5_ROLLING_REHEARSAL_CHAIN:CHAIN,P5_ROLLING_REHEARSAL_HOP:String(hop),P5_ROLLING_REHEARSAL_PARENT:hop?String(99+hop):"0",
  P5_ROLLING_REHEARSAL_DEADLINE:iso(START+30*60000),P5_ROLLING_REHEARSAL_SENT:hop?iso(START+(hop+1)*10000-5000):""};
 const options={now:()=>t,sleep:async ms=>{t+=ms;},emit:e=>events.push(e),
 readReceipt:async()=>({schema:"v39.phase5.rolling-continuation-rehearsal.v1",status:"ONE_REHEARSAL_SUCCESSOR_ACKNOWLEDGED",
  chainId:CHAIN,hop:hop-1,runId:String(99+hop),parentRunId:hop===1?"0":String(98+hop),reviewedMainSha:SHA,
  deadlineUtc:env.P5_ROLLING_REHEARSAL_DEADLINE,nextDispatchAtUtc:env.P5_ROLLING_REHEARSAL_SENT,
  nextRunId:fault==="receipt"?"999":env.GITHUB_RUN_ID,rehearsalDispatches:1,collectionDispatches:0,providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false,
  waves:[{wave:1,lanes:8},{wave:2,lanes:8}]}),fetcher:async(url,init)=>{
  const u=new URL(url);
  assert.equal(u.origin,"https://api.github.com");
  if(init.method==="POST"){
   posts++;assert.equal(u.href,ROOT+"/actions/workflows/"+WF+"/dispatches");
   const input=JSON.parse(init.body).inputs;assert.equal(input.mode,"ROLLING_REHEARSAL");
   assert.equal(input.parent_run_id,env.GITHUB_RUN_ID);assert.equal(input.deadline_utc,env.P5_ROLLING_REHEARSAL_DEADLINE);
   assert.equal(input.hop,String(hop+1));
   const id=101+hop;
   return reply({workflow_run_id:id,run_url:ROOT+"/actions/runs/"+id,html_url:"https://github.com/"+REPO+"/actions/runs/"+id},fault==="ack"?204:200);
  }
  gets++;assert.equal(init.method,"GET");
  if(u.pathname.endsWith("/git/ref/heads/main"))return reply({object:{sha:fault==="main"?"c".repeat(40):SHA}});
  if(u.pathname.endsWith("/workflows/"+WF+"/runs"))return reply({total_count:rows.length,workflow_runs:rows});
  if(u.pathname.endsWith("/artifacts"))return reply({total_count:1,artifacts:[{id:555,name:"phase5-rolling-rehearsal-"+env.P5_ROLLING_REHEARSAL_PARENT,expired:false,size_in_bytes:512}]});
  const match=/\/actions\/runs\/(\d+)(\/jobs)?$/.exec(u.pathname);
  if(match){
   if(match[2])return reply({total_count:1,jobs:[{name:"rolling-no-provider-rehearsal",status:"completed",conclusion:"success",
    steps:[{name:"Observe two real read-only rolling waves and admit at most one rehearsal successor",status:"completed",conclusion:fault==="step"?"skipped":"success"},{name:"Publish exact non-sensitive rehearsal successor receipt",status:"completed",conclusion:"success"}]}]});
   return reply(rows.find(x=>x.id===Number(match[1])));
  }
  return reply({total_count:0,workflow_runs:[]});
 }};
 return {env,options,events,posts:()=>posts,gets:()=>gets};
}
test("each session uses two existing real-shaped read-only previews, fixed deadline, strict three-run cap",async()=>{
 for(let i=0;i<3;i++){
  const f=fixture(i),out=await runP5RollingRehearsal(f.env,f.options);
  assert.equal(out.waves.length,2);assert.equal(out.waves[0].lanes,8);
  assert.equal(out.collectionDispatches+out.providerCalls+out.databaseReads+out.databaseWrites,0);
  assert.equal(f.posts(),i===2?0:1);assert.equal(out.phase6PaidGo,false);assert(f.gets()<=110);
 }
});
test("failed predecessor, missing parent step, duplicate chain and moved main prevent dispatch",async()=>{
 for(const [hop,fault] of [[1,"parent"],[1,"step"],[1,"receipt"],[0,"duplicate"],[0,"main"]]){
  const f=fixture(hop,fault);await assert.rejects(runP5RollingRehearsal(f.env,f.options),/HOLD_P5_ROLLING_REHEARSAL_/);assert.equal(f.posts(),0);
 }
});
test("unknown acceptance is attempted only once",async()=>{
 const f=fixture(0,"ack");
 await assert.rejects(runP5RollingRehearsal(f.env,f.options),/UNKNOWN_ACK_NO_RETRY/);assert.equal(f.posts(),1);
});
test("no production or alternate provider scope",()=>{
 const f=fixture();
 for(const patch of [{P6_ROLLING_CONTROLLER_ENABLED:"1"},{V39_PHASE6_PROCESS_ARMED:"1"},{DATABASE_URL:"forbidden"},{P5_ROLLING_REHEARSAL_HOP:"3"},{GITHUB_RUN_ATTEMPT:"2"}])
  assert.throws(()=>admitP5RollingRehearsal({...f.env,...patch},f.options.now()),/SCOPE/);
});

test("sustained clock observes nine aligned ticks and refuses invented catch-up",async()=>{
 const start=START+120000;let t=start,calls=0;
 const x=await observeP5SustainedClock({now:()=>t,sleep:async ms=>{t+=ms;if(++calls===2)t+=610000;},deadline:START+180*60000});
 assert.equal(x.expectedSlots,9);assert.equal(x.missed,2);assert.equal(x.ticks.length,7);
 assert.equal(validateP5SustainedClockReceipt(x),true);
 const bad=structuredClone(x);bad.ticks[0].missedBefore++;
 assert.equal(validateP5SustainedClockReceipt(bad),false);
});
test("sustained clock refuses regression and too-short deadline",async()=>{
 let t=START;await assert.rejects(observeP5SustainedClock({now:()=>t,sleep:async()=>{t-=1000;},deadline:START+180*60000}),/SUSTAINED_CLOCK_WAKE/);
 await assert.rejects(observeP5SustainedClock({now:()=>START,deadline:START+45*60000}),/SUSTAINED_CLOCK_SCOPE/);
});
test("sustained root keeps original bounded chain identity and forwards exact confirmation",async()=>{
 const f=fixture(0);f.env.P5_ROLLING_REHEARSAL_CONFIRM=SUSTAINED_CONFIRM;f.env.P5_ROLLING_REHEARSAL_DEADLINE=iso(START+180*60000);
 const old=f.options.fetcher;f.options.fetcher=async(url,init)=>{
  if(init.method==="POST")assert.equal(JSON.parse(init.body).inputs.handoff_confirm,SUSTAINED_CONFIRM);
  return old(url,init);
 };
 const result=await runP5RollingRehearsal(f.env,f.options);
 assert.equal(result.profile,"SUSTAINED_45M");assert.equal(result.clock.ticks.length,9);
 assert.equal(result.clock.missed,0);assert.equal(result.rehearsalDispatches,1);
 assert.equal(result.collectionDispatches,0);assert.equal(result.providerCalls,0);
 assert.equal(validateP5SustainedClockReceipt(result.clock),true);
});
test("sustained successor cannot accept short-profile predecessor receipt",async()=>{
 const f=fixture(1);f.env.P5_ROLLING_REHEARSAL_CONFIRM=SUSTAINED_CONFIRM;f.env.P5_ROLLING_REHEARSAL_DEADLINE=iso(START+180*60000);
 await assert.rejects(runP5RollingRehearsal(f.env,f.options),/PARENT_RECEIPT_ACK_MISMATCH/);
 assert.equal(f.posts(),0);
});

test("read-only preview error survives rehearsal redaction, raw response and arbitrary errors remain redacted",()=>{
 assert.equal(p5RehearsalSafeError(Error("HOLD_P6_ROLLING_CONTROLLER_GITHUB_HISTORY_UNAVAILABLE_OR_INCOMPLETE")),"HOLD_P6_ROLLING_CONTROLLER_GITHUB_HISTORY_UNAVAILABLE_OR_INCOMPLETE");
 assert.equal(p5RehearsalSafeError(Error("HOLD_P6_ROLLING_PREVIEW_UNREVIEWED_GET_OR_REQUEST_BOUND")),"HOLD_P6_ROLLING_PREVIEW_UNREVIEWED_GET_OR_REQUEST_BOUND");
 assert.equal(p5RehearsalSafeError(Error("token-like arbitrary payload")),"HOLD_P5_ROLLING_REHEARSAL_REDACTED_NO_RETRY");
});
test("root lineage reads enclosing whole second to avoid omitting an acknowledged same-second creation",async()=>{
 const f=fixture(0);f.env.P5_ROLLING_REHEARSAL_DEADLINE=iso(START+30*60000+877);
 const prev=f.options.fetcher;f.options.fetcher=async(url,init)=>{
  const u=new URL(url);if(u.pathname.endsWith("/workflows/"+WF+"/runs"))assert.equal(u.searchParams.get("created"),">="+iso(START));
  return prev(url,init);
 };
 await runP5RollingRehearsal(f.env,f.options);assert.equal(f.posts(),1);
});
test("read-only preview upstream 503 does not emit a successor and identifies failure class",async()=>{
 const f=fixture(0);const prev=f.options.fetcher;f.options.fetcher=async(url,init)=>{
  if(url.includes("/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml/runs"))return reply({},503);
  return prev(url,init);
 };
 await assert.rejects(runP5RollingRehearsal(f.env,f.options),/HOLD_P6_ROLLING_CONTROLLER_GITHUB_HISTORY_HTTP_503/);
 assert.equal(f.posts(),0);
 assert(f.events.some(x=>x.status==="P6_READONLY_PREVIEW_HTTP_FAILURE"&&x.httpStatus===503));
});
