import test from "node:test";
import assert from "node:assert/strict";
import {prepareP5V4ApplyHandoff,checkP5V4HistoricalRelease} from "../scripts/v39_phase5_expiry_v4_apply_handoff_owner_v39.mjs";
const main="a".repeat(40),verified="b".repeat(40),source="bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac",apply="c".repeat(64),verify="d".repeat(64);
const e={P5_V4_APPLY_HANDOFF_CONFIRM:"PREPARE_ONE_WAITING_V4_DECLARED_EXPIRY_BATCH_NO_AUTO_APPROVAL_NO_GO",
 P5_V4_APPLY_HANDOFF_MAIN_SHA:main,P5_V4_APPLY_HANDOFF_VERIFIED_MAIN_SHA:verified,P5_V4_APPLY_HANDOFF_VERIFIED_RUN_ID:"123",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
const reviewers=[{type:"User",reviewer:{id:789}}],gate={name:"phase5-expiry-one-batch",id:456,
 protection_rules:[{type:"required_reviewers",reviewers,prevent_self_review:false}]};
function fixture({history=[],previousNames=[],badGate=false,unknownDispatch=false,wrongAck=false,neverWaiting=false,failSecret=false,drift=false}={}){
 const events=[],secrets=new Map(),keys=[...previousNames];let pendingCalls=0;
 const io={localReview:async()=>({applyToken:apply,verifyToken:verify}),remoteMain:async()=>main,sourceVariable:async()=>source,
  verifyPrior:async a=>{assert.equal(a.verifiedRunId,123);assert.equal(a.verifiedMain,verified);events.push("VERIFY");},
  verifyLiveSource:async()=>events.push("HEALTH"),environment:async()=>badGate?{...gate,protection_rules:[]}:gate,
  secretNames:async()=>[...keys],previousRuns:async()=>history,
  writeIntent:async v=>{assert.equal(v.neverReplay,true);assert(!JSON.stringify(v).includes(apply));events.push("INTENT");},
  dispatch:async body=>{
   events.push("DISPATCH");assert.equal(body.inputs.verified_run_id,"123");assert.equal(body.inputs.approved_deployed_sha,source);
   if(unknownDispatch)throw Error("unknown");
   return {workflow_run_id:999,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/"+(wrongAck?998:999),
    html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/999"};
  },
  writeAck:async v=>{assert.equal(v.runId,999);events.push("ACK");},
  run:async id=>({id,head_sha:main,head_branch:"main",event:"workflow_dispatch",run_attempt:1,
   path:".github/workflows/phase5-published-expiry-protected-one-batch.yml",status:"waiting",conclusion:null}),
  pending:async()=>{pendingCalls++;return neverWaiting?[]:[{environment:{name:gate.name,id:drift&&pendingCalls>2?987:gate.id},reviewers}];},
  setEnvironmentSecret:async(k,v)=>{events.push("SECRET:"+k);if(failSecret)throw Error("unknown secret result");keys.push(k);secrets.set(k,v);},
  sleep:async()=>{}};
 return {io,events,secrets};
}
test("stage exact protected waiting run with distinct apply token and run ID last; no approval action",async()=>{
 const f=fixture(),out=await prepareP5V4ApplyHandoff(e,f.io);
 assert.deepEqual(f.events,["VERIFY","HEALTH","INTENT","DISPATCH","ACK","SECRET:P5_EXPIRY_APPLY_AUTH_TOKEN",
  "SECRET:P5_EXPIRY_APPLY_APPROVAL","SECRET:P5_EXPIRY_APPLY_ENABLED","SECRET:P5_EXPIRY_APPLY_APPROVED_RUN_ID"]);
 assert.equal(f.secrets.get("P5_EXPIRY_APPLY_AUTH_TOKEN"),apply);
 assert.equal(f.secrets.get("P5_EXPIRY_APPLY_APPROVED_RUN_ID"),"999");
 assert.equal(out.environmentApprovalPerformed,false);assert.equal(out.objectDeletions,0);
 assert(!JSON.stringify(out).includes(apply));assert(!JSON.stringify(out).includes(verify));
});
test("no existing prior run, environment secret, missing review gate or forbidden local credential may be bypassed",async()=>{
 for(const setup of [{history:[{id:123}]},{previousNames:["P5_EXPIRY_APPLY_AUTH_TOKEN"]},{badGate:true}]){
  const f=fixture(setup);await assert.rejects(prepareP5V4ApplyHandoff(e,f.io),/HOLD_P5_V4_APPLY_HANDOFF/);
  assert(!f.events.includes("DISPATCH"));
 }
 const f=fixture();await assert.rejects(prepareP5V4ApplyHandoff({...e,DATABASE_URL:"forbidden"},f.io),/EXACT_OWNER_STOP_CONFIRM/);
 assert.equal(f.events.length,0);
});
test("unknown dispatch and wrong ACK retain intent, never stage credentials or repeat POST",async()=>{
 for(const setup of [{unknownDispatch:true},{wrongAck:true}]){
  const f=fixture(setup);await assert.rejects(prepareP5V4ApplyHandoff(e,f.io),/DISPATCH_.*UNKNOWN_NO_RETRY/);
  assert.equal(f.events.filter(x=>x==="DISPATCH").length,1);assert(f.events.includes("INTENT"));assert.equal(f.secrets.size,0);
 }
});
test("missing or drifted waiting deployment and partial secret write keep run-ID approval absent",async()=>{
 for(const setup of [{neverWaiting:true},{drift:true},{failSecret:true}]){
  const f=fixture(setup);await assert.rejects(prepareP5V4ApplyHandoff(e,f.io),/HOLD_P5_V4_APPLY_HANDOFF/);
  assert.equal(f.events.filter(x=>x==="DISPATCH").length,1);assert(f.events.includes("ACK"));
  assert(!f.secrets.has("P5_EXPIRY_APPLY_APPROVED_RUN_ID"));
 }
});

test("historical V4 equivalence is verified on the actual original main, not the later integrated caller checkout",()=>{
 const old="20dc5a31a58ebc85aacf22a7e6164510dedc3b6a",calls=[];
 const gitRead=args=>{
  calls.push(args);
  if(args[0]==="status")return "";
  if(args[0]==="merge-base")return "";
  if(args[1]==="HEAD")return main;
  if(args[1]===old+":scripts/v39_phase5_callback_release_v4_reviewed_build_v39.sh")return "2a46b012b7e217fe933acd26abe7106cc47dd1dd";
  assert.fail("unexpected local read");
 };
 const check=x=>{assert.equal(x,old);return "PHASE5_V4_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED";};
 checkP5V4HistoricalRelease({main,verifiedMain:old},{gitRead,verifyHistoricalBuild:check});
 assert(calls.some(x=>x.join(" ")==="merge-base --is-ancestor "+old+" "+main));
 assert.throws(()=>checkP5V4HistoricalRelease({main,verifiedMain:verified},{gitRead,verifyHistoricalBuild:check}),/UNEXPECTED_FIRST_V4_VERIFY_MAIN/);
 assert.throws(()=>checkP5V4HistoricalRelease({main,verifiedMain:old},{gitRead,verifyHistoricalBuild:()=>""}),/HISTORICAL_SOURCE_EQUIVALENCE/);
});
