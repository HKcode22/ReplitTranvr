import test from "node:test";
import assert from "node:assert/strict";
import {runV4VerifyHandoff} from "../scripts/v39_phase5_expiry_v4_verify_handoff_owner_v39.mjs";
const old="4436773f2c7e684d05c55878c6eb13b46f16ac06",source="bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac",main="a".repeat(40);
const env={P5_EXPIRY_V4_VERIFY_MAIN_SHA:main,P5_EXPIRY_V4_VERIFY_CONFIRM:"PROMOTE_LIVE_V4_SOURCE_AND_VERIFY_ONLY_ONCE",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
function setup({wrongHealth=false,unknown=false,existing=false,drift=false,previous=false}={}){
 let v=old,intent=false;const events=[];
 const ops={localReview:async()=>events.push("local"),remoteMain:async()=>main,
  sourceVariable:async()=>v,secretNames:async()=>["P5_EXPIRY_RECEIVER_AUTH_TOKEN"],
  previousRuns:async()=>previous?[{databaseId:1}]:[],
  writeIntent:async()=>{if(intent||existing)throw Error("PRIVATE_INTENT_EXISTS");intent=true;events.push("intent");},
  setSource:async x=>{events.push("metadata");if(!drift)v=x;},
  dispatch:async b=>{events.push("dispatch");assert.equal(b.inputs.approved_main_sha,main);assert.equal(b.inputs.approved_deployed_sha,source);
   if(unknown)throw Error("secret mock failure");
   return {workflow_run_id:123,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/123",html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/123"};},
  fetcher:async(url,opt)=>{assert.equal(opt.method,"GET");assert.equal(opt.headers.authorization,undefined);events.push("health");
   return new Response(JSON.stringify({schema:"v39.phase2f-workspace-runtime.v1",status:"PASS",git_head:wrongHealth?old:source,
    prepaid_route_registered:true,provider_mutation:false,runtime_owner_mode:"replit-published-deployment",
    managed_replit_workflow:false,published_deployment:true,runtime_durability_class:"autoscale"}),{headers:{"content-type":"application/json"}});}
 };return {ops,events};
}
test("live V4 first then private intent then nonsecret source promotion then one exact VERIFY_ONLY dispatch",async()=>{
 const {ops,events}=setup(),r=await runV4VerifyHandoff(env,ops);
 assert.equal(r.runId,123);assert.equal(r.secretWrites,0);assert.equal(r.objectDeletions,0);
 assert.deepEqual(events,["local","health","intent","metadata","health","dispatch"]);
 await assert.rejects(runV4VerifyHandoff(env,ops),/EXISTING_SOURCE_RECONCILE/);
 assert.equal(events.filter(x=>x==="dispatch").length,1);
});
test("wrong release, existing prior run or intent cannot change metadata or dispatch",async()=>{
 for(const options of [{wrongHealth:true},{previous:true},{existing:true}]){
  const {ops,events}=setup(options);await assert.rejects(runV4VerifyHandoff(env,ops));
  assert(!events.includes("metadata")&&!events.includes("dispatch"));
 }
});
test("metadata readback or unknown dispatch holds without replay",async()=>{
 const a=setup({drift:true});await assert.rejects(runV4VerifyHandoff(env,a.ops),/SOURCE_READBACK_NO_RETRY/);
 assert(!a.events.includes("dispatch"));
 const b=setup({unknown:true});await assert.rejects(runV4VerifyHandoff(env,b.ops),/DISPATCH_UNKNOWN_NO_RETRY/);
 await assert.rejects(runV4VerifyHandoff(env,b.ops),/EXISTING_SOURCE_RECONCILE/);assert.equal(b.events.filter(x=>x==="dispatch").length,1);
});
test("owner operation refuses any provider key or paid owner flag",async()=>{
 for(const patch of [{AERODATABOX_API_KEY:"synthetic"},{V39_PHASE6_OWNER_APPROVED:"1"},{GITHUB_ACTIONS:"true"}]){
  const {ops,events}=setup();await assert.rejects(runV4VerifyHandoff({...env,...patch},ops),/SCOPE/);assert.equal(events.length,0);
 }
});
