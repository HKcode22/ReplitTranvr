import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {readP5ProtectedApplyReceipt} from "../scripts/v39_phase5_expiry_apply_receipt_readonly_v39.mjs";
const input={runId:12345,verifiedRunId:23456,mainSha:"a".repeat(40),verifiedMainSha:"b".repeat(40),source:"c".repeat(40)};
const start="2026-11-16T08:00:00.000Z",end="2026-11-16T08:03:00.000Z",at="2026-11-16T08:02:00.000Z";
const verification={reviewedSourceSha:input.source,mode:"APPLY_DUE_ONLY",providerCalls:0,objectDownloads:0,
 distinctDbActorsVerified:true,separateStorageReadRequests:true,independentStorageIamVerified:false,backupRetentionVerified:false,
 phase6PaidGo:false,declaredExpiryOnly:true,status:"DUE_AT_CUTOFF_CLEARED",selectedCount:2,verifiedNowCount:1,
 alreadyVerifiedCount:1,independentlyReadBackCount:2,recoveredReadbackCount:0,remainingAtCutoff:0,remainingUnwitnessedMarkersAtCutoff:0};
function fixture({runPatch={},receiptPatch={},verificationPatch={},wrongDigest=false,drift=false,extraFile=false,skipStep=false,priorPatch={}}={}){
 const receipt={schema:"v39.phase5.published-expiry-apply-receipt.v1",runId:input.runId,reviewedMainSha:input.mainSha,
  verifiedMainSha:input.verifiedMainSha,completedAtUtc:at,status:"P5_PUBLISHED_ONE_DECLARED_EXPIRY_BATCH_RECEIPT",
  verifiedRunId:input.verifiedRunId,reviewedSourceSha:input.source,verification:{...verification,...verificationPatch},
  providerCalls:0,objectDownloads:0,phase6PaidGo:false,...receiptPatch};
 const dir=mkdtempSync(join(tmpdir(),"p5-apply-receipt-test-"));let bytes;
 try{
  const f="p5-published-expiry-apply-receipt.json";writeFileSync(join(dir,f),JSON.stringify(receipt));
  if(extraFile)writeFileSync(join(dir,"extra.json"),"{}");
  execFileSync("zip",["-q","archive.zip",f,...(extraFile?["extra.json"]:[])],{cwd:dir});
  bytes=readFileSync(join(dir,"archive.zip"));
 }finally{rmSync(dir,{recursive:true,force:true});}
 const meta={id:99999,name:"p5-expiry-apply-12345",expired:false,size_in_bytes:bytes.length,
  digest:"sha256:"+(wrongDigest?"0".repeat(64):createHash("sha256").update(bytes).digest("hex")),workflow_run:{id:input.runId}};
 let reads=0,downloads=0;const calls=[];
 const get=async p=>{
  calls.push(p);
  const common={head_branch:"main",event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"success",created_at:start,updated_at:end};
  if(p==="/actions/runs/12345")return {...common,id:input.runId,path:".github/workflows/phase5-published-expiry-protected-one-batch.yml",head_sha:input.mainSha,...runPatch};
  if(p==="/actions/runs/23456")return {...common,id:input.verifiedRunId,path:".github/workflows/phase5-published-expiry-transport-verify-only.yml",
   head_sha:input.verifiedMainSha,created_at:"2026-11-16T07:00:00Z",updated_at:"2026-11-16T07:02:00Z",...priorPatch};
  if(p.includes("/jobs?"))return {total_count:1,jobs:[{id:11111,name:"protected-one-batch",run_id:input.runId,
   head_sha:input.mainSha,run_attempt:1,status:"completed",conclusion:"success",started_at:start,completed_at:end,
   steps:["One protected due-only batch, never replay uncertain POST","Preserve exact aggregate one-batch receipt"].map((name,i)=>({name,status:"completed",conclusion:skipStep&&i===1?"skipped":"success"}))}]};
  if(p.includes("/artifacts?"))return {total_count:1,artifacts:[{...meta,id:drift&&++reads>1?99998:meta.id}]};
  assert.fail("Unexpected GET "+p);
 };
 return {get,now:()=>Date.parse(end)+1000,calls,downloads:()=>downloads,readArchive:async id=>{assert.equal(id,meta.id);downloads++;return bytes;}};
}
test("digest-bound actual-shaped receipt verifies bounded due-only result without claiming backup or replay",async()=>{
 const f=fixture(),out=await readP5ProtectedApplyReceipt(input,f);
 assert.equal(out.status,"VERIFIED_DUE_CUTOFF_CLEARED_NO_REPLAY");
 assert.equal(out.independentReceiptVerified,true);assert.equal(out.applyReported.selectedCount,2);
 assert.equal(out.fullRetentionCertified,false);assert.equal(out.permitReplay,false);assert.equal(out.phase6PaidGo,false);
 assert.equal(f.downloads(),1);
});
test("remaining backlog is different from cleared, but neither admits another batch",async()=>{
 const out=await readP5ProtectedApplyReceipt(input,fixture({verificationPatch:{status:"BACKLOG_REMAINS_AT_CUTOFF",remainingAtCutoff:3}}));
 assert.equal(out.status,"VERIFIED_BACKLOG_REMAINS_NO_REPLAY");assert.equal(out.permitRecurringApply,false);
});
test("pending and failed runs do not get replayed or download an artifact",async()=>{
 for(const [runPatch,status] of [[{status:"waiting",conclusion:null},"PENDING_NO_REPLAY"],[{conclusion:"failure"},"TERMINAL_UNCERTAIN_NO_REPLAY"]]){
  const f=fixture({runPatch}),out=await readP5ProtectedApplyReceipt(input,f);assert.equal(out.status,status);
  assert.equal(out.permitReplay,false);assert.equal(f.downloads(),0);assert.equal(f.calls.length,1);
 }
});
test("reject altered source, mismatched receipt, digest, ZIP extras, artifact drift, skipped upload, prior verification, clocks and attempt",async()=>{
 for(const opts of [{receiptPatch:{reviewedSourceSha:"f".repeat(40)}},{verificationPatch:{selectedCount:11}},{wrongDigest:true},
  {extraFile:true},{drift:true},{skipStep:true},{priorPatch:{conclusion:"failure"}},{receiptPatch:{completedAtUtc:"2026-11-16T07:00:00.000Z"}},{runPatch:{run_attempt:2}}]){
  await assert.rejects(readP5ProtectedApplyReceipt(input,fixture(opts)),/HOLD_P5_(APPLY_READBACK|PUBLISHED_EXPIRY_APPLY)_/);
 }
});
