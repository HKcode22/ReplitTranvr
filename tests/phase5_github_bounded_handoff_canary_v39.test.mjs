import test from "node:test";
import assert from "node:assert/strict";
import {admitP5GithubHandoffCanary,runP5GithubHandoffCanary}
 from "../scripts/v39_phase5_github_bounded_handoff_canary.mjs";
const SHA="a".repeat(40),CHAIN="b".repeat(32);
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const WF="phase5-autonomous-clock-canary-no-provider.yml";
const now=Date.parse("2026-11-15T23:40:00Z");
const tick=()=>now;
const iso=ms=>new Date(ms).toISOString();
function env(hop=0){
 return {GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:REPO,GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:SHA,
  GITHUB_RUN_ID:String(100+hop),GITHUB_TOKEN:"synthetic_non_secret_canary_token",
  P5_GH_HANDOFF_CONFIRM:"MEASURE_THREE_GITHUB_HANDOFFS_NO_PROVIDER_NO_DB",
  P5_GH_HANDOFF_APPROVED_MAIN_SHA:SHA,P5_GH_HANDOFF_CHAIN_ID:CHAIN,
  P5_GH_HANDOFF_HOP:String(hop),P5_GH_HANDOFF_PARENT_RUN_ID:hop?String(99+hop):"0",
  P5_GH_HANDOFF_SENT_AT_UTC:hop?iso(now-45000):"",
  P5_GH_HANDOFF_DEADLINE_UTC:iso(now+120000),ADB_AUTO_COLLECT:"0",
  V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
}
function row(hop){
 return {id:100+hop,path:".github/workflows/"+WF,head_branch:"main",head_sha:SHA,
  event:"workflow_dispatch",run_attempt:1,display_title:"P5 HANDOFF "+CHAIN+" "+hop+" "+(hop?99+hop:0),
  created_at:iso(now-(hop===0?90000:20000)),status:"completed",conclusion:"success"};
}
const reply=(json,status=200)=>({ok:status>=200&&status<300,status,json:async()=>json});
function normal(hop,{fault=null}={}){
 const calls=[];
 const fetcher=async(url,opts)=>{
  assert.equal(opts.redirect,"error");
  assert.equal(opts.headers.Authorization,"Bearer synthetic_non_secret_canary_token");
  calls.push({url,method:opts.method,body:opts.body?JSON.parse(opts.body):undefined});
  if(url===ROOT+"/git/ref/heads/main")return reply({object:{sha:fault==="main"?"c".repeat(40):SHA}});
  if(url===ROOT+"/actions/runs/"+(100+hop))return reply({...row(hop),
   ...(fault==="title"?{display_title:"NOT THE CHAIN"}:{})});
  if(hop&&url===ROOT+"/actions/runs/"+(99+hop))return reply({...row(hop-1),
   created_at:iso(now-80000),...(fault==="parent"?{conclusion:"failure"}:{})});
  if(url===ROOT+"/actions/workflows/"+WF+"/dispatches"){
   if(fault==="network")throw Error("socket disconnected");
   const next=101+hop;
   return reply({workflow_run_id:next,run_url:ROOT+"/actions/runs/"+next,
    html_url:"https://github.com/"+REPO+"/actions/runs/"+next},
    fault==="ack"?204:200);
  }
  throw Error("unexpected endpoint");
 };
 return {calls,fetcher};
}
test("root and middle dispatch one successor; exact finite end, no flight worker",async()=>{
 for(let hop=0;hop<3;hop++){
  const {calls,fetcher}=normal(hop);
  const result=await runP5GithubHandoffCanary(env(hop),{fetcher,now:tick});
  assert.equal(result.hop,hop);assert.equal(result.providerCalls,0);
  assert.equal(result.databaseReads+result.databaseWrites,0);assert.equal(result.phase6PaidGo,false);
  assert.equal(result.dispatchToObservedRunnerMs,hop?45000:null);
  assert.equal(result.dispatchCount,hop===2?0:1);
  const posts=calls.filter(x=>x.method==="POST");
  assert.equal(posts.length,hop===2?0:1);
  if(hop===2){assert.equal(result.nextRunId,null);continue;}
  assert.equal(result.nextRunId,String(101+hop));
  assert.equal(posts[0].url,ROOT+"/actions/workflows/"+WF+"/dispatches");
  assert.equal(posts[0].body.return_run_details,true);
  assert.deepEqual(posts[0].body.inputs,{mode:"BOUNDED_HANDOFF",
   handoff_confirm:env().P5_GH_HANDOFF_CONFIRM,approved_main_sha:SHA,chain_id:CHAIN,
   hop:String(hop+1),parent_run_id:String(100+hop),
   deadline_utc:iso(now+120000),sent_at_utc:iso(now)});
 }
});
test("wrong branch or mode, credentials, expired window, reruns and unbounded hop rejected",()=>{
 for(const change of [
  {GITHUB_REF:"refs/heads/test"},{GITHUB_EVENT_NAME:"schedule"},
  {P5_GH_HANDOFF_CONFIRM:"wrong"},{P5_GH_HANDOFF_HOP:"3"},
  {GITHUB_RUN_ATTEMPT:"2"},{AERODATABOX_API_KEY:"not-used"},
  {DATABASE_URL:"not-used"},{V39_PHASE6_PROCESS_ARMED:"1"},
  {P5_GH_HANDOFF_APPROVED_MAIN_SHA:"c".repeat(40)},
  {P5_GH_HANDOFF_DEADLINE_UTC:iso(now-1)},
  {P5_GH_HANDOFF_DEADLINE_UTC:iso(now+31*60000)},
  {P5_GH_HANDOFF_PARENT_RUN_ID:"99"},
  {P5_GH_HANDOFF_CHAIN_ID:"malformed"}
 ])assert.throws(()=>admitP5GithubHandoffCanary({...env(),...change},now),/HOLD_P5_GH_HANDOFF_/);
 assert.throws(()=>admitP5GithubHandoffCanary({...env(1),P5_GH_HANDOFF_SENT_AT_UTC:iso(now+1)},now),/INVALID_PARENT_SEND_CLOCK/);
});
test("failed parent, identity drift or moved main never sends dispatch",async()=>{
 for(const [fault,hop] of [["parent",1],["title",0],["main",0]]){
  const {calls,fetcher}=normal(hop,{fault});
  await assert.rejects(runP5GithubHandoffCanary(env(hop),{fetcher,now:tick}),/HOLD_P5_GH_HANDOFF_/);
  assert.equal(calls.filter(x=>x.method==="POST").length,0);
 }
});
test("unknown POST acknowledgement never repeated",async()=>{
 for(const fault of ["network","ack"]){
  const {calls,fetcher}=normal(0,{fault});
  await assert.rejects(runP5GithubHandoffCanary(env(),{fetcher,now:tick}),/UNKNOWN_DISPATCH_NO_RETRY/);
  assert.equal(calls.filter(x=>x.method==="POST").length,1);
 }
});
