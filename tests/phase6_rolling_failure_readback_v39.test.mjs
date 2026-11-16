import test from "node:test";
import assert from "node:assert/strict";
import {parseP6RollingFailureCustody,reconcileP6FailureCustody} from "../server/lib/disruption/phase6RollingFailureCustodyReadback_v39.mjs";
import {runP6FailureReadback,admitP6FailureReadback} from "../scripts/v39_phase6_rolling_failure_readback_v39.mjs";
import {P6_ROLLING_ROUTES} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const main="a".repeat(40),old="b".repeat(40),epoch="2030-01-01T00:00:00.000Z",deadline="2030-01-01T02:00:00.000Z",
 t1="2030-01-01T00:01:00.000Z",t2="2030-01-01T00:01:01.000Z",t3="2030-01-01T00:02:00.000Z",now=()=>Date.parse(t3);
const scope={schema:"v39.phase6.rolling-failure-custody.v1",status:"SESSION_SCOPE_NOT_AUTHORIZATION",
 runId:123,reviewedMainSha:old,parentRunId:0,sessionHop:0,epochUtc:epoch,chainDeadlineUtc:deadline,noReplay:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
const attempt=(lane,atUtc=t1)=>({status:"DISPATCH_ATTEMPT_BEFORE_ACK",lane,atUtc}),ack=(lane,runId,atUtc=t2)=>({status:"EXACT_ACK_NOT_EXECUTION_PROOF",lane,runId,atUtc}),
 terminal=(lane,runId)=>({status:"EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF",lane,runId});
const file=(events=[],s=scope)=>Buffer.from([s,...events].map(x=>JSON.stringify(x)).join("\n")+"\n");
const parse=(events,s=scope)=>parseP6RollingFailureCustody(file(events,s),{runId:123,mainSha:old});
const worker=(lane,runId,patch={})=>({id:runId,path:".github/workflows/"+P6_ROLLING_ROUTES.find(r=>r.lane===lane).workflow,head_sha:old,head_branch:"main",event:"workflow_dispatch",run_attempt:1,created_at:t1,status:"completed",conclusion:"success",...patch});
const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"900",
 GITHUB_SHA:main,P6_ROLLING_PREVIEW_APPROVED_MAIN:main,P6_CONTROLLER_HEARTBEAT_CONFIRM:"READONLY_FAILED_ROLLING_CUSTODY_NO_REPLAY_NO_PROVIDER",
 P6_ROLLING_FAILED_RUN_ID:"123",P6_ROLLING_FAILED_MAIN_SHA:old,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",GITHUB_TOKEN:"synthetic-read-only-token"};
test("unknown attempt stays unknown; known ACK checked only by exact run ID",async()=>{
 const p=parse([attempt("T24"),ack("T24",456),terminal("T24",456),attempt("SOURCE_POST",t3)]);
 const seen=[];const out=await reconcileP6FailureCustody(p,{readRun:async id=>{seen.push(id);return worker("T24",id);}});
 assert.deepEqual(seen,[456]);assert.equal(out.workers[0].githubState,"KNOWN_GITHUB_SUCCESS_NOT_COLLECTION_PROOF");
 assert.deepEqual(out.unknownWorkerAttempts,[{lane:"SOURCE_POST",sentAtUtc:t3}]);assert.equal(out.permitReplay,false);assert.equal(out.permitNewRoot,false);
 assert.equal(out.providerSettlementVerified,false);assert.equal(out.dispatchCount,0);
});
test("known active, failed, successor unknown and inherited evidence never grant a new root",async()=>{
 const p=parse([terminal("T24",456),terminal("T24",456),attempt("SOURCE_POST"),ack("SOURCE_POST",789),
  {status:"CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK",runId:123,sentAtUtc:t3}],{...scope,sessionHop:1,parentRunId:111});
 const out=await reconcileP6FailureCustody(p,{readRun:async id=>id===456?worker("T24",id):worker("SOURCE_POST",id,{status:"in_progress",conclusion:null})});
 assert.equal(out.predecessorReceiptRequired,true);assert.equal(out.workers.length,2);assert.equal(out.workers[0].origin,"INHERITED_TERMINAL_MARKER");
 assert.equal(out.workers[1].githubState,"KNOWN_ACTIVE_NO_REPLAY");assert.equal(out.successor.githubState,"UNKNOWN_SUCCESSOR_ACK_NO_REPLAY");
 assert.equal(out.allPriorCustodyReconciled,false);
 const failed=await reconcileP6FailureCustody(parse([attempt("T24"),ack("T24",456)]),{readRun:async id=>worker("T24",id,{conclusion:"failure"})});
 assert.equal(failed.workers[0].githubState,"KNOWN_UNSUCCESSFUL_NO_REPLAY");
});
test("exact successor ACK is read back by ID and chain title; mismatch or terminal regression fails closed",async()=>{
 const p=parse([{status:"CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK",runId:123,sentAtUtc:t1},{status:"CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF",runId:123,nextRunId:789,sentAtUtc:t1}]);
 const row={id:789,path:".github/workflows/phase6-rolling-controller-bounded-session.yml",head_sha:old,head_branch:"main",event:"workflow_dispatch",run_attempt:1,created_at:t1,status:"queued",conclusion:null,display_title:"P6 ROLLING CHAIN 1 123"};
 const out=await reconcileP6FailureCustody(p,{readRun:async()=>row});assert.equal(out.successor.runId,789);assert.equal(out.permitNewRoot,false);
 await assert.rejects(reconcileP6FailureCustody(p,{readRun:async()=>({...row,display_title:"P6 ROLLING CHAIN 1 124"})}),/KNOWN_RUN_IDENTITY/);
 await assert.rejects(reconcileP6FailureCustody(parse([attempt("T24"),ack("T24",456),terminal("T24",456)]),{readRun:async()=>worker("T24",456,{status:"in_progress",conclusion:null})}),/TERMINAL_MARKER_REGRESSED/);
});
test("malformed, truncated, foreign, duplicate or out-of-order custody files reject",()=>{
 for(const events of [[ack("T24",456)],[attempt("T24"),attempt("T24")],[attempt("T24"),ack("T24",456),attempt("T24",t3)],
  [terminal("T24",456)],[attempt("T24",deadline)],[attempt("T24"),{...ack("T24",456),secret:"forbidden"}],
  [attempt("UNKNOWN")],[attempt("T24"),ack("T24",456),terminal("SOURCE_POST",456)]])
  assert.throws(()=>parse(events),/HOLD_P6_ROLLING_FAILURE_READBACK/);
 assert.throws(()=>parseP6RollingFailureCustody(file().subarray(0,-1),{runId:123,mainSha:old}),/FILE_SCOPE/);
 assert.throws(()=>parse([],{...scope,reviewedMainSha:main}),/JOURNAL_SCOPE/);
});
function fixture({runPatch={},jobPatch={},artifactPatch={},changeArtifact=false,wrongMain=false}={}){
 const calls=[];let artifactReads=0;
 const fetcher=async(url,opt)=>{
  assert.equal(opt.method,"GET");assert.equal(opt.redirect,"error");assert.equal(new URL(url).hostname,"api.github.com");calls.push(url);
  let x;
  if(url.endsWith("/git/ref/heads/main"))x={object:{sha:wrongMain?old:main}};
  else if(url.endsWith("/actions/runs/123"))x={id:123,path:".github/workflows/phase6-rolling-controller-bounded-session.yml",head_sha:old,head_branch:"main",event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"failure",created_at:epoch,...runPatch};
  else if(url.includes("/actions/runs/123/jobs?"))x={total_count:1,jobs:[{name:"one-protected-bounded-session",run_id:123,head_sha:old,run_attempt:1,status:"completed",conclusion:"failure",steps:[{name:"Preserve failure-only operational attempt custody (never replay permission)",status:"completed",conclusion:"success"}],...jobPatch}]};
  else if(url.includes("/actions/runs/123/artifacts?")){
   artifactReads++;x={total_count:1,artifacts:[{id:changeArtifact&&artifactReads===2?99:98,name:"p6-rolling-failure-custody-123",size_in_bytes:888,digest:"sha256:"+"c".repeat(64),expired:false,workflow_run:{id:123},...artifactPatch}]};
  }else if(url.endsWith("/actions/runs/456"))x=worker("T24",456);
  else assert.fail("Unexpected API URL");
  return {ok:true,json:async()=>x};
 };
 return {calls,options:{fetcher,now,readArtifact:async({runId,name})=>{assert.equal(runId,123);assert.equal(name,"p6-rolling-failure-custody-123");return file([attempt("T24"),ack("T24",456),attempt("SOURCE_POST",t3)]);}}};
}
test("existing heartbeat exact failed-session inspection reads fixed artifact and only known run IDs",async()=>{
 const f=fixture(),out=await runP6FailureReadback(env,f.options);
 assert.equal(out.githubReadRequests,7);assert.equal(f.calls.length,7);assert.equal(out.artifactId,98);assert.equal(out.artifactDownloads,1);
 assert.equal(out.unknownWorkerAttempts.length,1);assert.equal(out.workers.length,1);assert.equal(out.permitReplay,false);assert.equal(out.phase6PaidGo,false);
 assert(!JSON.stringify(out).includes(env.GITHUB_TOKEN));
});
test("no successful parent, wrong code, missing upload, changed artifact, or production credentials accepted",async()=>{
 for(const patch of [{runPatch:{conclusion:"success"}},{runPatch:{head_sha:main}},{jobPatch:{steps:[]}},{artifactPatch:{expired:true}},{changeArtifact:true},{wrongMain:true}]){
  const f=fixture(patch);await assert.rejects(runP6FailureReadback(env,f.options),/HOLD_P6_ROLLING_FAILURE_READBACK/);
 }
 for(const p of [{GITHUB_EVENT_NAME:"schedule"},{GITHUB_RUN_ATTEMPT:"2"},{P6_ROLLING_FAILED_RUN_ID:"../x"},{P6_PRIVATE_READER_DATABASE_URL:"forbidden"},{V39_PHASE6_PROCESS_ARMED:"1"},{P6_ROLLING_PREVIEW_APPROVED_MAIN:old}])
  assert.throws(()=>admitP6FailureReadback({...env,...p}),/NOT_EXACT_READONLY_SCOPE/);
});
