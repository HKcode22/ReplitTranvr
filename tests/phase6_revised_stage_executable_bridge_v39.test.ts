import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {P6_NOV22_STAGE_CODE,P6_NOV22_STAGE_SHA,P6_NOV22_COST_SHA,verifyP6RevisedExecutableBridge} from "../scripts/v39_phase6_revised_stage_executable_bridge_v39";
const reviewed="b".repeat(40),head="c".repeat(40);
const plan=Array.from({length:31},(_,i)=>"data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json");
const code="scripts/v39_phase6_enable_source_owner_v39.ts",paths=[...plan,code].sort(),blobs=Object.fromEntries(paths.map((p,i)=>[p,createHash("sha1").update(p).digest("hex")]));
const evidence="data-collection/phase5/evidence/2026-11-20_scope_review.json";
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
function fixture(){
 const review={schema:"v39.phase6.revised-stage-executable-bridge-review.v1",stageCodeSha:P6_NOV22_STAGE_CODE,stagePacketSha256:P6_NOV22_STAGE_SHA,costEnvelopeSha256:P6_NOV22_COST_SHA,reviewedExecutableCommit:reviewed,changedBlobs:paths.map(path=>({path,blobSha:blobs[path]})),reviewedBy:"synthetic-reviewer",reviewedAtUtc:"2026-11-20T04:00:00.000Z",independentOperationalReleaseApproved:true,phase6PaidGo:false};
 const reviewBytes=Buffer.from(JSON.stringify(review,null,2)+"\n");
 const request={stageCode:P6_NOV22_STAGE_CODE,stageSha:P6_NOV22_STAGE_SHA,costSha:P6_NOV22_COST_SHA,currentHead:head,reviewBytes,expectedOperationalEvidenceSha256:sha(reviewBytes),now:new Date("2026-11-20T05:00:00.000Z"),stageIsAncestor:true,reviewedCommitIsAncestor:true,reviewedDiff:paths,currentDiff:[...paths,evidence],readReviewedBlob:(p:string)=>blobs[p],readCurrentBlob:(p:string)=>blobs[p]};
 return {review,request};
}
describe("exact approved executable succession, no staged-byte rewrite",()=>{
 it("admits exact 31 plans and reviewed changed code with only subsequent evidence",()=>{const {request}=fixture();expect(verifyP6RevisedExecutableBridge(request)).toMatchObject({reviewedExecutablePaths:32,phase6PaidGo:false})});
 it("rejects drift, omitted plan, unreviewed executable, predecessor changes and unrelated commits",()=>{
  const {request}=fixture();
  for(const r of [{...request,currentDiff:[...request.currentDiff,"package-lock.json"]},{...request,reviewedDiff:paths.slice(1)},{...request,stageSha:"0".repeat(64)},{...request,reviewedCommitIsAncestor:false},{...request,readCurrentBlob:(p:string)=>p===code?"f".repeat(40):blobs[p]},{...request,expectedOperationalEvidenceSha256:"a".repeat(64)}])expect(()=>verifyP6RevisedExecutableBridge(r)).toThrow(/HOLD_P6_EXACT_SOURCE_AUTH_EXECUTABLE_BRIDGE/);
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
