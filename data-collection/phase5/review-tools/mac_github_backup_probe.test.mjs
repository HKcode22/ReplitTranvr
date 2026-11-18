import test from "node:test";
import assert from "node:assert/strict";
import {observe,observeFollow,canary,LANES,launchAgentXml,localGap,localHealthFingerprint,authenticatedReadArgs} from "./mac_github_backup_probe.mjs";
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

test("authenticated watcher uses only exact GET endpoints and stores no auth token in plist",()=>{
 const args=authenticatedReadArgs("/git/ref/heads/main");assert.equal(args[args.indexOf("--method")+1],"GET");
 for(const l of LANES)assert.equal(authenticatedReadArgs("/actions/workflows/"+l.file+"/runs?branch=main&per_page=10")[4],"GET");
 assert.equal(authenticatedReadArgs("/actions/runs/123/jobs?filter=latest&per_page=100")[4],"GET");
 for(const p of ["/actions/workflows/p.yml/dispatches","/actions/secrets","/git/ref/heads/evil","https://example.org"])assert.throws(()=>authenticatedReadArgs(p),/READ_ENDPOINT_SCOPE/);
 const x=launchAgentXml({node:"/opt/homebrew/bin/node",script:"/tmp/probe.mjs",dir:"/tmp/d",pin:P,authenticated:true,ghExecutable:"/opt/homebrew/bin/gh"});
 assert(x.includes("<string>observe-auth-notify</string>"));assert(x.includes("TRAVNR_WATCH_GH_BINARY"));assert(!x.includes("GH_TOKEN"));
 assert.throws(()=>launchAgentXml({node:"/n",script:"/s",dir:"/d",pin:P,authenticated:true,ghExecutable:"gh"}),/LAUNCH_AGENT_GH_PATH/);
});

test("follow main observes exact live head, preserves reviewed pin and never grants dispatch",async()=>{
 const f=fixture(),different="b".repeat(40),result=await observeFollow(different,f);
 assert.equal(result.reviewedMain,different);assert.equal(result.observedMain,P);
 assert.equal(result.observedMainMatchesReviewedPin,false);assert.equal(result.permitDispatch,false);
 assert.equal(result.metadataForObservedMain,true);assert(result.lanes.every(l=>l.level==="RECENT_STEP_ONLY"));
 assert.equal(f.calls.length,7);
});
test("follow main refuses a mixed snapshot when head changes mid-observation",async()=>{
 const f=fixture();let reads=0;
 const result=await observeFollow(P,{...f,get:async path=>path==="/git/ref/heads/main"&&++reads===3?{object:{sha:"b".repeat(40)}}:f.get(path)});
 assert.equal(result.status,"MAIN_MOVED_DURING_READ_NOT_HEALTHY");assert.equal(result.permitDispatch,false);
});
test("follow mode does not miscount manual VERIFY or a skipped APPLY as fresh",async()=>{
 const f=fixture();const get=async path=>{
  if(path.includes(LANES[0].file)){
   const a=(await f.get(path)).workflow_runs[0];
   return {total_count:3,workflow_runs:[{...a,id:113,event:"workflow_dispatch",created_at:T(2)},{...a,id:112,created_at:T(3)},{...a,id:111,created_at:T(35)}]};
  }
  if(path.includes("/112/"))return {total_count:1,jobs:[{id:1112,run_id:112,head_sha:P,run_attempt:1,name:LANES[0].job,status:"completed",conclusion:"skipped",completed_at:T(2),steps:[]}]};
  if(path.includes("/111/")){const a=await f.get(path);a.jobs[0].completed_at=T(34);return a;}
  if(path.includes("/113/"))assert.fail("manual verify must not count as APPLY");
  return f.get(path);
 };
 const result=await observeFollow(P,{...f,get});
 assert.equal(result.lanes[0].lastObservedSuccessfulStep.runId,111);assert.equal(result.lanes[0].level,"WARN_STALE_STEP");
});
test("follow launchd mode requires authentication, has no dispatch or token",()=>{
 const opts={node:"/n",script:"/s",dir:"/d",pin:P,followMain:true};
 assert.throws(()=>launchAgentXml(opts),/LAUNCH_AGENT_GH_PATH/);
 const x=launchAgentXml({...opts,authenticated:true,ghExecutable:"/gh"});
 assert(x.includes("<string>observe-follow-auth-notify</string>"));assert(!x.includes("GH_TOKEN"));assert(!x.includes("<string>canary</string>"));
});
