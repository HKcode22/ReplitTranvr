import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {admitP6WindowTerminalReadback,unpackP6WindowReceiptArchive,runP6WindowTerminalReadback} from "../scripts/v39_phase6_rolling_window_terminal_readback_v39.mjs";
import {P6_ROLLING_ROUTES} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const main="a".repeat(40),old="b".repeat(40),policy="c".repeat(64),time=Date.parse("2030-01-01T00:00:00.000Z"),MIN=60000;
const iso=x=>new Date(time+x*MIN).toISOString(),digest=b=>"sha256:"+createHash("sha256").update(b).digest("hex");
const expected={rootRunId:123,reviewedMainSha:old,policyCommitment:policy,mode:"SINGLE",windowStartUtc:iso(0),windowEndUtc:iso(120),epochUtc:iso(0),chainDeadlineUtc:iso(30)};
const e={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"999",
  GITHUB_SHA:main,P6_ROLLING_PREVIEW_APPROVED_MAIN:main,P6_CONTROLLER_HEARTBEAT_CONFIRM:"READONLY_TERMINAL_ROLLING_WINDOW_CUSTODY_NO_PROVIDER_NO_GO",
  P6_ROLLING_WINDOW_SCOPE_JSON:JSON.stringify(expected),ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",GITHUB_TOKEN:"synthetic-read-only-test-token"};
const receipt={schema:"v39.phase6.bounded-rolling-session.v1",status:"BOUNDED_SESSION_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF",
 runId:123,parentRunId:0,sessionHop:0,reviewedMainSha:old,epochUtc:iso(0),deadlineUtc:iso(30),chainDeadlineUtc:iso(30),
 policyCommitment:policy,unknownAttempts:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false,
 acknowledged:1,verifiedTerminal:1,remainingDispatchCapacity:95,ackCapacityExhausted:false,terminalAcknowledgements:[{lane:"RETENTION_MONITOR",runId:456,sentAtUtc:iso(1)}],
 pendingAcknowledgements:[],pending:[],successorDispatches:0,nextRunId:null};
const root={id:123,path:".github/workflows/phase6-rolling-controller-bounded-session.yml",head_sha:old,head_branch:"main",
 event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"success",created_at:iso(0),display_title:"Phase6 initial bounded rolling controller session (STOP default)"};
const route=P6_ROLLING_ROUTES.find(x=>x.lane==="RETENTION_MONITOR"),worker={...root,id:456,path:".github/workflows/"+route.workflow,created_at:iso(1)};
const j=(id,run_id,name,steps=[])=>({id,run_id,name,head_sha:old,run_attempt:1,status:"completed",conclusion:"success",
 steps:steps.map(name=>({name,status:"completed",conclusion:"success"}))});
const rootJobs=[j(1234,123,"one-protected-bounded-session",["Execute one protected rolling session and reconcile accepted workers before terminal","Preserve terminal operational receipt for independently reviewed continuation"])];
const workerJobs=route.jobs.map((x,i)=>j(4560+i,456,x.name,x.step?[x.step]:[]));
function pack(value=receipt,extra=false){
 const dir=mkdtempSync(join(tmpdir(),"p6-window-archive-fixture-")),out=join(dir,"artifact.zip"),file=join(dir,"p6-rolling-terminal-receipt.json");
 try{
  writeFileSync(file,JSON.stringify(value),{mode:0o600});
  let files=[file];if(extra){const x=join(dir,"extra.txt");writeFileSync(x,"unexpected");files.push(x);}
  execFileSync("zip",["-q","-j",out,...files],{timeout:10000,stdio:"ignore"});return readFileSync(out);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
function fixture({wrongDigest=false,changed=false,extra=false,wrongJobs=false,extraRoot=false,badMain=false}={}){
 const zip=pack(receipt,extra),calls=[];let reads=0,downloads=0;
 const meta={id:777,name:"p6-rolling-terminal-123",expired:false,size_in_bytes:zip.length,digest:wrongDigest?"sha256:"+"9".repeat(64):digest(zip),workflow_run:{id:123}};
 const fetcher=async(url,opt)=>{
  const u=new URL(url);assert.equal(u.origin,"https://api.github.com");assert.equal(opt.method,"GET");assert.equal(opt.redirect,"error");
  calls.push(u.href);let value;
  if(u.pathname.endsWith("/git/ref/heads/main"))value={object:{sha:badMain?old:main}};
  else if(u.pathname.endsWith("/actions/runs/123"))value=root;
  else if(u.pathname.endsWith("/actions/runs/456"))value=worker;
  else if(u.pathname.endsWith("/actions/runs/123/jobs"))value={total_count:1,jobs:wrongJobs?[{...rootJobs[0],run_id:900}]:rootJobs};
  else if(u.pathname.endsWith("/actions/runs/456/jobs"))value={total_count:workerJobs.length,jobs:workerJobs};
  else if(u.pathname.endsWith("/actions/runs/123/artifacts")){reads++;value={total_count:1,artifacts:[{...meta,id:changed&&reads>1?778:777}]};}
  else if(u.pathname.endsWith("/workflows/phase6-rolling-controller-bounded-session.yml/runs")){
   assert.equal(u.searchParams.get("created"),iso(0)+".."+iso(30));assert.equal(u.searchParams.get("event"),"workflow_dispatch");
   const rows=[root,{...root,id:888,created_at:iso(30),status:"queued",conclusion:null}];
   if(extraRoot)rows.push({...root,id:9999,created_at:iso(1)});
   value={total_count:rows.length,workflow_runs:rows};
  }else assert.fail("unexpected URL");
  return {ok:true,json:async()=>structuredClone(value),headers:{get:()=>"1000"}};
 };
 return {calls,options:{fetcher,now:()=>time+40*MIN,readArchive:async({artifactId,token})=>{
  assert.equal(artifactId,777);assert.equal(token,e.GITHUB_TOKEN);downloads++;return zip;}},
  get downloads(){return downloads;}};
}
test("exact terminal receipt ZIP SHA and one-file boundary before independent history verification",()=>{
 const zip=pack(),meta={size:zip.length,digest:digest(zip)};
 assert.deepEqual(JSON.parse(unpackP6WindowReceiptArchive(zip,meta)),receipt);
 const tampered=Buffer.from(zip);tampered[10]^=1;
 assert.throws(()=>unpackP6WindowReceiptArchive(tampered,meta),/ARCHIVE_SIZE_OR_DIGEST/);
 const extra=pack(receipt,true);
 assert.throws(()=>unpackP6WindowReceiptArchive(extra,{size:extra.length,digest:digest(extra)}),/ARCHIVE_FILE_SCOPE/);
});
test("existing heartbeat manual terminal readback validates actual-shaped exact metadata, ZIP, root and worker",async()=>{
 const f=fixture(),out=await runP6WindowTerminalReadback(e,f.options);
 assert.equal(out.githubReadRequests,9);assert.equal(f.calls.length,9);assert.equal(f.downloads,1);
 assert.equal(out.independentlyVerifiedWorkerJobs,1);assert.deepEqual(out.controllerRunIds,[123]);
 assert.equal(out.archiveDigestIndependentlyVerified,true);assert.equal(out.actualDbOwnershipVerified,false);
 assert.equal(out.providerSettlementVerified,false);assert.equal(out.permitClose,false);assert.equal(out.permitNewRoot,false);
 assert(!JSON.stringify(out).includes(e.GITHUB_TOKEN));
});
test("archive drift/malformed history/fake job or main/production credentials cannot yield terminal evidence",async()=>{
 for(const args of [{wrongDigest:true},{changed:true},{extra:true},{wrongJobs:true},{extraRoot:true},{badMain:true}]){
  await assert.rejects(runP6WindowTerminalReadback(e,fixture(args).options),/HOLD_P6_WINDOW_(READBACK|TERMINAL)/);
 }
 for(const args of [{GITHUB_EVENT_NAME:"schedule"},{GITHUB_RUN_ATTEMPT:"2"},{GITHUB_SHA:old},{P6_PRIVATE_READER_DATABASE_URL:"forbidden"},
  {V39_PHASE6_PROCESS_ARMED:"1"},{P6_ROLLING_WINDOW_SCOPE_JSON:JSON.stringify({...expected,secret:"forbidden"})}]){
  assert.throws(()=>admitP6WindowTerminalReadback({...e,...args}),/HOLD_P6_WINDOW_READBACK/);
 }
});
