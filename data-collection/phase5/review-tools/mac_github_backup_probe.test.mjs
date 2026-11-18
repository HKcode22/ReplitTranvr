import test from "node:test";
import assert from "node:assert/strict";
import {observe,canary,LANES,launchAgentXml,localGap,localHealthFingerprint} from "./mac_github_backup_probe.mjs";
const P="a".repeat(40),NOW=Date.parse("2030-01-01T12:00Z"),T=m=>new Date(NOW-m*60000).toISOString();
function fixture(mode="fresh"){
 const calls=[];
 const get=async path=>{
  calls.push(path);
  if(path==="/git/ref/heads/main")return {object:{sha:mode==="moved"?"b".repeat(40):P}};
  const lane=LANES.find(x=>path.includes(x.file));
  if(lane){
   const row={id:lane.key==="primary"?111:222,path:".github/workflows/"+lane.file,head_branch:"main",head_sha:P,event:"schedule",run_attempt:1,status:"completed",conclusion:mode==="failed"?"failure":"success",created_at:T(mode==="stale"?121:3)};
   return {total_count:1,workflow_runs:[row]};
  }
  const l=path.includes("/111/")?LANES[0]:LANES[1],id=l.key==="primary"?111:222;
  return {total_count:1,jobs:[{id:id+1000,run_id:id,head_sha:P,run_attempt:1,name:l.job,status:"completed",conclusion:"success",completed_at:T(mode==="stale"?120:2),steps:[{name:l.step,status:"completed",conclusion:mode==="skippedStep"?"skipped":"success"}]}]};
 };
 return {get,now:()=>NOW,calls};
}
test("actual-shaped recent metadata is not collection or deletion proof",async()=>{
 const f=fixture(),r=await observe(P,f);assert.equal(r.permitDispatch,false);assert.equal(f.calls.length,5);assert(r.lanes.every(x=>x.level==="RECENT_STEP_ONLY"));
});
test("two-hour stale, failed, skipped step and changed main are distinguished",async()=>{
 for(const [m,s] of [["stale","CRITICAL_STALE_STEP"],["failed","CRITICAL_FAILED_RUN"],["skippedStep","UNKNOWN_NO_VERIFIED_STEP"]])assert((await observe(P,fixture(m))).lanes.every(x=>x.level===s));
 const f=fixture("moved");assert.equal((await observe(P,f)).status,"MAIN_MOVED_REVIEW_REQUIRED");assert.equal(f.calls.length,1);
});
test("clock skew and incomplete history refuse",async()=>{
 const f=fixture();await assert.rejects(observe(P,{...f,now:()=>NOW-3600000}),/CLOCK_SKEW/);
 await assert.rejects(observe(P,{...f,get:async p=>p.includes("/git/")?{object:{sha:P}}:{total_count:2,workflow_runs:[]}}),/HISTORY/);
});
test("external one-shot canary reserves before post and binds exact reviewed main",async()=>{
 let latched=false,posts=0,saved;
 const f=fixture(),r=await canary(P,{...f,randomChain:()=>"c".repeat(32),reserve:()=>latched=true,save:x=>saved=x,
 post:async(path,b)=>{assert(latched);posts++;assert.equal(b.inputs.mode,"BOUNDED_HANDOFF");assert.equal(b.inputs.approved_main_sha,P);assert.equal(b.inputs.handoff_confirm,"MEASURE_THREE_GITHUB_HANDOFFS_NO_PROVIDER_NO_DB");return {workflow_run_id:99,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/99",html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/99"};}});
 assert.equal(posts,1);assert.equal(saved.runId,99);assert.equal(r.permitPaid,false);
});
test("unknown acknowledgement and occupied latch cannot cause replay",async()=>{
 let posts=0;const f=fixture(),shared={...f,randomChain:()=>"c".repeat(32),save:()=>assert.fail("no save")};
 await assert.rejects(canary(P,{...shared,reserve:()=>{},post:async()=>{posts++;throw Error("unknown");}}),/UNKNOWN_ACK_NO_RETRY/);
 await assert.rejects(canary(P,{...shared,reserve:()=>{throw Error("already latched");},post:async()=>{posts++;}}),/already latched/);
 assert.equal(posts,1);
});

test("Mac launch agent is read-only/10-minute, escapes literal paths and refuses relative paths",()=>{
 const x=launchAgentXml({node:"/opt/homebrew/bin/node",script:"/Users/fixture/A&B/probe.mjs",dir:"/Users/fixture/.travnr",pin:P});
 assert(x.includes("A&amp;B"));assert(x.includes("<string>observe-notify</string>"));
 assert(x.includes("<key>StartInterval</key><integer>600</integer>"));
 assert(!x.includes("<string>canary</string>"));assert(!x.includes("KeepAlive"));
 assert.throws(()=>launchAgentXml({node:"node",script:"/tmp/s",dir:"/tmp/d",pin:P}),/LAUNCH_AGENT_PATHS/);
});
test("local monitor separates absence or a wake gap from GitHub health",()=>{
 assert.equal(localGap(null,T(0)),null);assert.equal(localGap({observedUtc:T(10)},T(0)),null);
 assert.deepEqual(localGap({observedUtc:T(62)},T(0)),{status:"LOCAL_MONITOR_GAP_OBSERVED",minutes:62});
 assert.equal(localGap({observedUtc:T(-1)},T(0)).status,"LOCAL_CLOCK_OR_RECEIPT_UNKNOWN");
 assert.equal(localHealthFingerprint({status:"x",lanes:[{lane:"a",level:"b"}]}),"x|a:b");
});
