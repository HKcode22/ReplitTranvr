import test from "node:test";
import assert from "node:assert/strict";
import {admitP5PublishedExpiryApply,applyP5PublishedExpiryOnce,checkP5ApplyReceipt} from "../scripts/v39_phase5_expiry_receiver_apply_once_v39.mjs";
import {buildP5ExpiryVerificationArtifact} from "../scripts/v39_phase5_expiry_receiver_verify_once_v39.mjs";
const sha="a".repeat(40),source="b".repeat(40),prior="d".repeat(40),token="c".repeat(64),ghToken="synthetic-github-token-123";
const timestamp="2030-01-01T00:00:10.000Z",now=()=>Date.parse("2030-01-01T00:01:00Z");
const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"222",GITHUB_SHA:sha,P5_EXPIRY_APPLY_APPROVED_RUN_ID:"222",
 P5_EXPIRY_APPLY_APPROVED_MAIN_SHA:sha,P5_EXPIRY_APPLY_DEPLOYED_SOURCE_SHA:source,P5_EXPIRY_APPLY_APPROVED_DEPLOYED_SHA:source,
 P5_EXPIRY_APPLY_VERIFIED_MAIN_SHA:prior,P5_EXPIRY_APPLY_VERIFIED_RUN_ID:"111",P5_EXPIRY_APPLY_AUTH_TOKEN:token,GITHUB_TOKEN:ghToken,
 P5_EXPIRY_APPLY_ENABLED:"1",P5_EXPIRY_APPLY_CONFIRM:"APPLY_ONE_REVIEWED_DECLARED_EXPIRY_ONLY_BATCH_NO_PROVIDER_NO_GO",
 P5_EXPIRY_APPLY_APPROVAL:"APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
const verify={status:"SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES",mode:"VERIFY_ONLY",reviewedSourceSha:source,
 providerCalls:0,objectDownloads:0,distinctDbActorsVerified:true,separateStorageReadRequests:true,
 independentStorageIamVerified:false,backupRetentionVerified:false,phase6PaidGo:false,databaseWrites:0,objectDeletions:0};
const artifact=buildP5ExpiryVerificationArtifact({status:"P5_PUBLISHED_EXPIRY_VERIFY_ONLY_PASS",reviewedSourceSha:source,
 verification:verify,actualHttpsRequests:2,providerCalls:0,objectDeletions:0,databaseWrites:0,phase6PaidGo:false},
 {source,mainSha:prior,runId:111,verifiedAtUtc:timestamp});
const health={schema:"v39.phase2f-workspace-runtime.v1",status:"PASS",git_head:source,prepaid_route_registered:true,
 provider_mutation:false,runtime_owner_mode:"replit-published-deployment",managed_replit_workflow:false,
 published_deployment:true,runtime_durability_class:"autoscale"};
const result={status:"BACKLOG_REMAINS_AT_CUTOFF",reviewedSourceSha:source,mode:"APPLY_DUE_ONLY",
 providerCalls:0,objectDownloads:0,distinctDbActorsVerified:true,separateStorageReadRequests:true,
 independentStorageIamVerified:false,backupRetentionVerified:false,phase6PaidGo:false,declaredExpiryOnly:true,
 selectedCount:2,verifiedNowCount:1,alreadyVerifiedCount:1,independentlyReadBackCount:2,recoveredReadbackCount:1,
 remainingAtCutoff:1,remainingUnwitnessedMarkersAtCutoff:0};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json"}});
function fixture({badRun=false,badStep=false,badSource=false,badArtifact=false,badPost=false,driftAfterHealth=false}={}){
 const calls=[];let healthRead=false;
 const fetcher=async(url,o)=>{
  calls.push({url,o});const u=new URL(url);
  if(u.hostname==="api.github.com"){
   assert.equal(o.method,"GET");assert.equal(o.headers.authorization,"Bearer "+ghToken);
   if(u.pathname.endsWith("/git/ref/heads/main"))return json({object:{sha:driftAfterHealth&&healthRead?prior:sha}});
   if(u.pathname.endsWith("/runs/111"))return json({id:111,path:".github/workflows/phase5-published-expiry-transport-verify-only.yml",
    head_sha:prior,head_branch:"main",event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:badRun?"failure":"success",
    created_at:"2030-01-01T00:00:00Z",updated_at:"2030-01-01T00:00:30Z"});
   if(u.pathname.endsWith("/runs/111/jobs"))return json({total_count:1,jobs:[{name:"actual-verify-only",run_id:111,run_attempt:1,
    head_sha:prior,status:"completed",conclusion:"success",steps:["One exact published receiver verification; never retry unknown POST",
    "Preserve exact aggregate VERIFY ONLY acceptance evidence"].map(name=>({name,status:"completed",conclusion:badStep?"skipped":"success"}))}]});
   if(u.pathname.endsWith("/runs/111/artifacts"))return json({total_count:1,artifacts:[{id:55,name:"p5-expiry-verify-111",expired:false,size_in_bytes:1000}]});
  }
  if(u.pathname==="/__v39/workspace-runtime"){healthRead=true;assert.equal(o.headers.authorization,undefined);return json({...health,git_head:badSource?sha:source});}
  assert.equal(o.method,"POST");assert.equal(o.headers.authorization,"Bearer "+token);assert.equal(o.headers["x-p5-expiry-mode"],"APPLY_DUE_ONLY");
  if(badPost)throw Error("unknown remote outcome");
  return json(result);
 };
 return {calls,options:{fetcher,now,readProof:async()=>badArtifact?{...artifact,runId:999}:artifact}};
}
test("apply acceptance only with exact one-time GitHub run ID and separate protected permission",()=>{
 assert.equal(admitP5PublishedExpiryApply(env).runId,222);
 for(const p of [{GITHUB_RUN_ATTEMPT:"2"},{P5_EXPIRY_APPLY_APPROVED_RUN_ID:"223"},{P5_EXPIRY_APPLY_ENABLED:"0"},
  {P5_EXPIRY_APPLY_APPROVAL:""},{P5_EXPIRY_RECEIVER_AUTH_TOKEN:"forbidden"},{DATABASE_URL:"forbidden"},{V39_PHASE6_OWNER_APPROVED:"1"}])
  assert.throws(()=>admitP5PublishedExpiryApply({...env,...p}),/ADMISSION/);
});
test("authenticate real-shaped prior verify run/step/artifact then one exact fixed APPLY POST, preserve backlog",async()=>{
 const f=fixture(),out=await applyP5PublishedExpiryOnce(env,f.options);
 assert.equal(out.verification.status,"BACKLOG_REMAINS_AT_CUTOFF");
 assert.equal(out.verification.remainingAtCutoff,1);
 assert.equal(f.calls.filter(x=>x.o.method==="POST").length,1);
 assert(!JSON.stringify(out).includes(token));assert(!JSON.stringify(out).includes(ghToken));
});
test("wrong verify identity, step, receipt or live source prevents APPLY POST; unknown POST never retried",async()=>{
 for(const patch of [{badRun:true},{badStep:true},{badArtifact:true},{badSource:true},{driftAfterHealth:true},{badPost:true}]){
  const f=fixture(patch);
  await assert.rejects(applyP5PublishedExpiryOnce(env,f.options),/HOLD_P5_/);
  assert.equal(f.calls.filter(x=>x.o.method==="POST").length,patch.badPost?1:0);
 }
});
test("exact aggregate apply receipt rejects false cleared, wrong counts, storage/IAM claims and arbitrary fields",()=>{
 assert.equal(checkP5ApplyReceipt(result,source).remainingAtCutoff,1);
 for(const patch of [{status:"DUE_AT_CUTOFF_CLEARED"},{selectedCount:26},{independentlyReadBackCount:0},
  {backupRetentionVerified:true},{extra:"raw"},{providerCalls:1},{mode:"VERIFY_ONLY"}])
  assert.throws(()=>checkP5ApplyReceipt({...result,...patch},source),/RECEIPT/);
});
