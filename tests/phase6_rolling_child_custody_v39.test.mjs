import test from "node:test";
import assert from "node:assert/strict";
import {verifyP6ParentChildCustody,P6_PAID_CHILD_ROUTES} from "../server/lib/disruption/phase6RollingChildCustody_v39.mjs";
const sha="a".repeat(40),start="2030-01-01T00:00:00.000Z",recorded="2030-01-01T00:01:00.000Z",end="2030-01-01T00:02:00.000Z",clock=Date.parse("2030-01-01T00:30:00.000Z");
const parent={id:10000,created_at:start},routes=Object.values(P6_PAID_CHILD_ROUTES);
const goodStep=name=>({name,status:"completed",conclusion:"success"});
const fixture=()=>{
 const jobs=routes.map((r,i)=>({id:i+10,run_id:parent.id,head_sha:sha,run_attempt:1,name:r.parentJob,status:"completed",conclusion:"success",started_at:start,completed_at:end,
 steps:[...["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"].map(x=>({...goodStep("Parent outcome "+x),conclusion:x==="ACKNOWLEDGED_NOT_PAID_RECEIPT"?"success":"skipped"})),goodStep(r.uploadStep)]}));
 const receipt=(lane,ids)=>({schema:"v39.phase6.parent-child-custody.v1",parentRunId:parent.id,reviewedMainSha:sha,lane,disposition:"ACKNOWLEDGED_NOT_PAID_RECEIPT",childRunIds:ids,recordedAtUtc:recorded,providerCallsByParent:0,paidGetsCertifiedByParent:0,permitReplay:false,phase6PaidGo:false});
 const rows={SOURCE:receipt("SOURCE",[20001]),POST:receipt("POST",[20002])},runs=new Map(routes.map((r,i)=>[20001+i,{id:20001+i,path:".github/workflows/"+r.workflow,head_sha:sha,head_branch:"main",event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"success",created_at:recorded}]));
 const childJobs=new Map(routes.map((r,i)=>[20001+i,[{id:30001+i,run_id:20001+i,head_sha:sha,name:r.job,run_attempt:1,status:"completed",conclusion:"success",steps:[goodStep(r.step)]}]]));
 const args={parent,parentJobs:jobs,sha,clock,
 readArtifact:async(id,lane)=>({runId:id,artifactId:lane==="SOURCE"?40001:40002,name:P6_PAID_CHILD_ROUTES[lane].artifactPrefix+id,bytes:Buffer.from(JSON.stringify(rows[lane]))}),
 readRun:async id=>runs.get(id),readJobs:async id=>childJobs.get(id)};
 return {args,rows,runs,childJobs,jobs};
};
test("both SOURCE and POST descendants independently tied to their own successful parent artifact and actual execution step",async()=>{
 const f=fixture(),out=await verifyP6ParentChildCustody(f.args);assert.deepEqual(out.children,[{parentRunId:10000,lane:"SOURCE",runId:20001},{parentRunId:10000,lane:"POST",runId:20002}]);assert.equal(out.receipts.length,2);
});
test("green parent cannot conceal running/failed, gated, wrong-code or detached paid child",async()=>{
 for(const patch of [{status:"in_progress",conclusion:null},{conclusion:"failure"},{head_sha:"b".repeat(40)},{created_at:"2030-01-01T00:03:00.000Z"},{path:"foreign"}]){
  const f=fixture();Object.assign(f.runs.get(20001),patch);await assert.rejects(verifyP6ParentChildCustody(f.args),/CHILD_RUN_NOT_SUCCESS_OR_SCOPE/);
 }
 const f=fixture();f.childJobs.get(20001)[0].steps[0].conclusion="skipped";await assert.rejects(verifyP6ParentChildCustody(f.args),/REQUIRED_STEP/);
});
test("false zero, extra private fields, duplicate descendant, missing upload or missing artifact are not terminal proof",async()=>{
 for(const alter of [f=>f.rows.SOURCE.childRunIds=[],f=>f.rows.POST.childRunIds=[20001],f=>f.rows.SOURCE.secret="never",f=>f.jobs[0].steps.pop(),f=>f.args.readArtifact=async()=>null]){
  const f=fixture();alter(f);await assert.rejects(verifyP6ParentChildCustody(f.args),/HOLD_P6_CHILD_CUSTODY/);
 }
});
