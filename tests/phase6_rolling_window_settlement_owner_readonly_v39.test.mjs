import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectP6OwnerSettlement,readP6IndependentOwnerHandoff,ownerSettlementConnection} from "../scripts/v39_phase6_rolling_window_settlement_owner_readonly_v39.mjs";
const sha="a".repeat(40),hash="b".repeat(64),input={runId:12345,readerMainSha:sha,manifestSha256:hash};
const root=23456,child=34567,epoch="2030-01-01T00:00:00.000Z",deadline="2030-01-01T00:30:00.000Z";
const evidence={status:"INDEPENDENT_WINDOW_OPERATIONAL_CHAIN_VERIFIED_NOT_SETTLEMENT_NOT_GO",reviewedReaderMainSha:sha,reviewedMainSha:sha,
 rootRunId:root,terminalRunId:root,terminalReceiptSha256:hash,policyCommitment:hash,epochUtc:epoch,chainDeadlineUtc:deadline,
 completeOperationalChainVerified:true,controllerOwnedChildJobsVerified:true,archiveDigestIndependentlyVerified:true,artifactMetadataBeforeAfterBound:true,
 independentScheduledOrManualChildrenCovered:false,providerSettlementVerified:false,permitClose:false,permitNewRoot:false,permitReplay:false,
 providerCalls:0,databaseWrites:0,dispatchCount:0,phase6PaidGo:false,controllerRunIds:[root],paidCapableChildRuns:[{parentRunId:45678,lane:"SOURCE",runId:child}],
 independentlyVerifiedPaidCapableChildJobs:1,recordedWindowCustody:{rootRunId:root}};
function fixture({patch={},wrongDigest=false,drift=false,wrongJob=false,oldStepName=false}={}){
 const dir=mkdtempSync(join(tmpdir(),"p6-owner-ledger-artifact-"));let bytes;
 try{
  const file="p6-independent-window-readback.json";writeFileSync(join(dir,file),JSON.stringify({...evidence,...patch}));
  execFileSync("zip",["-q","archive.zip",file],{cwd:dir});bytes=readFileSync(join(dir,"archive.zip"));
 }finally{rmSync(dir,{recursive:true,force:true});}
 const meta={id:99999,name:"p6-independent-window-readback-12345",size_in_bytes:bytes.length,digest:"sha256:"+(wrongDigest?"0".repeat(64):createHash("sha256").update(bytes).digest("hex")),workflow_run:{id:12345},expired:false};
 let reads=0;const calls=[];
 return {calls,get:async p=>{
  calls.push(p);
  if(p==="/git/ref/heads/main")return {object:{sha}};
  if(p==="/actions/runs/12345")return {id:12345,path:".github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml",head_branch:"main",head_sha:sha,event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"success"};
  if(p.includes("/jobs?"))return {total_count:1,jobs:[{id:11111,name:"actual-main-nonpaid-controller-heartbeat",run_id:12345,head_sha:sha,run_attempt:1,status:"completed",conclusion:"success",
   steps:[oldStepName?"Read only GH workflow-run history for nine existing controllers":"Read only GH workflow history and primary expiry execution metadata","Preserve independent exact window readback (operational metadata only)"].map((name,i)=>({name,status:"completed",conclusion:wrongJob&&i===1?"skipped":"success"}))}]};
  if(p.includes("/artifacts?"))return {total_count:1,artifacts:[{...meta,id:drift&&++reads>1?99998:99999}]};
  assert.fail("unexpected GET");
 },readArchive:async id=>{assert.equal(id,99999);return bytes;}};
}
test("owner handoff authenticates actual-shaped independent run/job/artifact then selects exact child IDs and root for read-only DB audit",async()=>{
 const f=fixture(),client={},out=await inspectP6OwnerSettlement(input,{...f,client,readLedger:async(s,c,opt)=>{
  assert.equal(c,client);assert.deepEqual(s.paidCapableChildRuns,evidence.paidCapableChildRuns);assert.equal(s.manifestSha256,hash);
  assert.equal(opt.rootEvidence.rootRunId,root);
  return {status:"READONLY_RESERVATION_AND_ORIGINAL_METADATA_NOT_PROVIDER_SETTLEMENT",actualDbClock:true,readOnlyRepeatableRead:true,
   rootCustody:{rootRunId:root,actualDbOwnershipMetadataMatched:true},providerSettlementVerified:false,permitClose:false,permitNewRoot:false,permitReplay:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }});
 assert.equal(out.independentGithubReadbackArtifactVerified,true);assert.equal(out.providerSettlementVerified,false);assert.equal(out.permitClose,false);
 assert.equal(f.calls.at(-1),"/git/ref/heads/main");
});
test("changed digest, forbidden grants, missing exact upload or altered metadata cannot reach DB",async()=>{
 for(const opts of [{wrongDigest:true},{drift:true},{patch:{permitClose:true}},{wrongJob:true},{oldStepName:true},{patch:{recordedWindowCustody:null}}]){
  await assert.rejects(inspectP6OwnerSettlement(input,{...fixture(opts),client:{},readLedger:async()=>assert.fail("DB should not be queried")}),/HOLD_P6_(OWNER_SETTLEMENT|WINDOW_READBACK)/);
 }
});
test("owner URL cannot relax TLS or select other DB/login",()=>{
 const base="postgresql://neondb_owner:fixture@ci-only.neon.tech/neondb?sslmode=require";
 assert.equal(ownerSettlementConnection(base,{}).ssl.rejectUnauthorized,true);
 for(const x of [base.replace("sslmode=require","sslmode=disable"),base.replace("neondb_owner","wrong_role"),base.replace("neondb?","replacement?")])assert.throws(()=>ownerSettlementConnection(x,{}),/OWNER_TLS_URL/);
});

test("owner settlement reader and exact actual heartbeat workflow do not drift",()=>{
 const w=readFileSync(new URL("../.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml",import.meta.url),"utf8");
 const src=readFileSync(new URL("../scripts/v39_phase6_rolling_window_settlement_owner_readonly_v39.mjs",import.meta.url),"utf8");
 const names=[...src.matchAll(/STEPS=\["([^"]+)","([^"]+)"\]/g)];
 assert.equal(names.length,1);
 for(const name of names[0].slice(1))assert.equal(w.split("- name: "+name+"\n").length-1,1);
});
