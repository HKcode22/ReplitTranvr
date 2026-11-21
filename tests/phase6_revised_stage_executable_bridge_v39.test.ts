import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {P6_NOV22_STAGE_CODE,P6_NOV22_STAGE_SHA,P6_NOV22_COST_SHA,verifyP6RevisedExecutableBridge,P6_COMMISSIONED_MONDAY_STAGE_CODE,P6_COMMISSIONED_MONDAY_STAGE_SHA,P6_COMMISSIONED_MONDAY_COST_SHA,verifyP6CommissionedMondayExecutableBridge} from "../scripts/v39_phase6_revised_stage_executable_bridge_v39";
const reviewed="b".repeat(40),head="c".repeat(40);
const plan=Array.from({length:31},(_,i)=>"data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json");
const code="scripts/v39_phase6_enable_source_owner_v39.ts",paths=[...plan,code].sort(),blobs=Object.fromEntries(paths.map((p,i)=>[p,createHash("sha1").update(p).digest("hex")]));
const evidence="data-collection/phase5/evidence/2026-11-20_scope_review.json";
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
function fixture(){
 const review={schema:"v39.phase6.revised-stage-executable-bridge-review.v1",stageCodeSha:P6_NOV22_STAGE_CODE,stagePacketSha256:P6_NOV22_STAGE_SHA,costEnvelopeSha256:P6_NOV22_COST_SHA,reviewedExecutableCommit:reviewed,changedBlobs:paths.map(path=>({path,blobSha:blobs[path],mode:"100644"})),reviewedBy:"synthetic-reviewer",reviewedAtUtc:"2026-11-20T04:00:00.000Z",independentOperationalReleaseApproved:true,phase6PaidGo:false};
 const reviewBytes=Buffer.from(JSON.stringify(review,null,2)+"\n");
 const request={stageCode:P6_NOV22_STAGE_CODE,stageSha:P6_NOV22_STAGE_SHA,costSha:P6_NOV22_COST_SHA,currentHead:head,reviewBytes,expectedOperationalEvidenceSha256:sha(reviewBytes),now:new Date("2026-11-20T05:00:00.000Z"),stageIsAncestor:true,reviewedCommitIsAncestor:true,reviewedDiff:paths,currentDiff:[...paths,evidence],readReviewedBlob:(p:string)=>"100644 blob "+blobs[p],readCurrentBlob:(p:string)=>"100644 blob "+blobs[p]};
 return {review,request};
}
describe("exact approved executable succession, no staged-byte rewrite",()=>{
 it("admits exact 31 plans and reviewed changed code with only subsequent evidence",()=>{const {request}=fixture();expect(verifyP6RevisedExecutableBridge(request)).toMatchObject({reviewedExecutablePaths:32,phase6PaidGo:false})});
 it("rejects drift, omitted plan, unreviewed executable, predecessor changes and unrelated commits",()=>{
  const {request}=fixture();
  for(const r of [{...request,currentDiff:[...request.currentDiff,"package-lock.json"]},{...request,reviewedDiff:paths.slice(1)},{...request,stageSha:"0".repeat(64)},{...request,reviewedCommitIsAncestor:false},{...request,readCurrentBlob:(p:string)=>p===code?"100644 blob "+"f".repeat(40):"100644 blob "+blobs[p]},{...request,expectedOperationalEvidenceSha256:"a".repeat(64)},{...request,readCurrentBlob:(p:string)=>"120000 blob "+blobs[p]}])expect(()=>verifyP6RevisedExecutableBridge(r)).toThrow(/HOLD_P6_EXACT_SOURCE_AUTH_EXECUTABLE_BRIDGE/);
 });
 it("rejects unapproved review and a review that omits a day even with matching hash/diff",()=>{
  const {request,review}=fixture();
  const bytes=(v:unknown)=>Buffer.from(JSON.stringify(v,null,2)+"\n");
  let raw=bytes({...review,independentOperationalReleaseApproved:false});
  expect(()=>verifyP6RevisedExecutableBridge({...request,reviewBytes:raw,expectedOperationalEvidenceSha256:sha(raw)})).toThrow(/REVIEW_SCOPE/);
  const omit=paths[0],changedBlobs=review.changedBlobs.filter(x=>x.path!==omit),rest=paths.filter(x=>x!==omit);
  raw=bytes({...review,changedBlobs});
  expect(()=>verifyP6RevisedExecutableBridge({...request,reviewBytes:raw,expectedOperationalEvidenceSha256:sha(raw),reviewedDiff:rest,currentDiff:rest})).toThrow(/MISSING_DAY_PLAN/);
 });
});

// Synthetic review bytes only; exact actual stage identities, no production DB.
it("admits only exact commissioned Monday succession with all 31 plans unchanged",()=>{
 const {review,request}=fixture();
 const changedBlobs=review.changedBlobs.filter(v=>v.path===code);
 const scope={stageCode:P6_COMMISSIONED_MONDAY_STAGE_CODE,stageSha:P6_COMMISSIONED_MONDAY_STAGE_SHA,costSha:P6_COMMISSIONED_MONDAY_COST_SHA};
 const x={...review,stageCodeSha:scope.stageCode,stagePacketSha256:scope.stageSha,costEnvelopeSha256:scope.costSha,changedBlobs};
 const raw=Buffer.from(JSON.stringify(x,null,2)+"\n");
 const input={...request,...scope,reviewBytes:raw,expectedOperationalEvidenceSha256:sha(raw),reviewedDiff:[code],currentDiff:[code,evidence]};
 expect(verifyP6CommissionedMondayExecutableBridge(input)).toMatchObject({reviewedExecutablePaths:1,stageCode:scope.stageCode,phase6PaidGo:false});
 for(const bad of [{...input,stageSha:sha(Buffer.from("different stage"))},{...input,costSha:sha(Buffer.from("different cost"))},{...input,currentDiff:[code,evidence,plan[0]]},{...input,reviewedCommitIsAncestor:false},{...input,readCurrentBlob:()=>"100644 blob "+"e".repeat(40)},{...input,expectedOperationalEvidenceSha256:sha(Buffer.from("wrong review"))}])expect(()=>verifyP6CommissionedMondayExecutableBridge(bad)).toThrow(/HOLD_P6_EXACT_SOURCE_AUTH_EXECUTABLE_BRIDGE/);
 const changedPlan={...x,changedBlobs:[...changedBlobs,{path:plan[0],blobSha:blobs[plan[0]],mode:"100644"}].sort((a,b)=>a.path.localeCompare(b.path))};
 const b=Buffer.from(JSON.stringify(changedPlan,null,2)+"\n");
 expect(()=>verifyP6CommissionedMondayExecutableBridge({...input,reviewBytes:b,expectedOperationalEvidenceSha256:sha(b),reviewedDiff:[code,plan[0]],currentDiff:[code,plan[0],evidence]})).toThrow("COMMISSIONED_MONDAY_DAY_PLAN_DRIFT");
});
