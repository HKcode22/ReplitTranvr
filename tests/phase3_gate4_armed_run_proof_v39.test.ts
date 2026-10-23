import {describe,it,expect} from "vitest";
import {
 gate4ArmedCommentBodyV39,gate4ReviewIndependentArmedProofV39,
 GATE4_ARMED_COMMENT_MARKER_V39
} from "../server/lib/disruption/gate4ArmedRunProof_v39";

const scope={
 sourceCommit:"a".repeat(40),scopeId:"11111111-2222-3333-4444-555555555555",
 authorizationSha256:"b".repeat(64),airportIcao:"WSSS",
 startUtc:"2026-10-23T22:00:00.000Z",
 stopUtc:"2026-10-23T22:05:00.000Z",
 observedStartingCredits:2037,softCreditTarget:5,protectedCreditFloor:2000
};
const runner="c".repeat(40),id=123456789,workflowId=9876;
const at="2026-10-23T22:00:15.000Z";
const created="2026-10-23T22:00:15Z";
const receiptBody=gate4ArmedCommentBodyV39(scope,id,runner,at);
function fixture(){
 return {
  scope,runnerSha:runner,runId:id,workflowId,
  nowUtc:"2026-10-23T22:00:30.000Z",
  run:{id,workflow_id:workflowId,head_sha:runner,run_attempt:1,
   head_branch:"main",event:"workflow_dispatch",status:"in_progress"},
  jobs:[{run_id:id,name:"gate4-live-stop",status:"in_progress",
   steps:[{name:"Run protected STOP-only implementation (no CREATE)",
    status:"in_progress"}]}],
  comments:[{created_at:created,user:{
   login:"github-actions[bot]",id:41898282,type:"Bot"
  },body:receiptBody}]
 };
}
describe("Phase3 independent STOP armed receipt (pure no-provider)",()=>{
 it("accepts matching protected run, active STOP job and bot-issued fresh post",()=>{
  expect(gate4ReviewIndependentArmedProofV39(fixture())).toBe(true);
  expect(receiptBody.startsWith(GATE4_ARMED_COMMENT_MARKER_V39)).toBe(true);
  expect(receiptBody).not.toContain(scope.authorizationSha256);
 });
 it("rejects not actually running, stale, foreign branch or wrong source",()=>{
  for(const patch of [
    {status:"completed"}, {status:"queued"}, {event:"push"},
    {head_branch:"feature"}, {head_sha:"d".repeat(40)},
    {workflow_id:workflowId+1},{run_attempt:2},
    {id:id+1}
  ]){
   const f=fixture();
   expect(gate4ReviewIndependentArmedProofV39({
     ...f,run:{...f.run,...patch}
   })).toBe(false);
  }
 });
 it("rejects job merely queued or install running before STOP",()=>{
  const f=fixture();
  expect(gate4ReviewIndependentArmedProofV39({
   ...f,jobs:[{...f.jobs[0],steps:[
    {name:"Run protected STOP-only implementation (no CREATE)",
     status:"queued"}]}]
  })).toBe(false);
  expect(gate4ReviewIndependentArmedProofV39({
   ...f,jobs:[{...f.jobs[0],status:"completed"}]
  })).toBe(false);
 });
 it("rejects bot impersonation, wrong run, forged body or stale comment",()=>{
  const f=fixture(), c=f.comments[0];
  for(const patch of [
   {user:{login:"attacker",id:1,type:"User"}},
   {user:{login:"github-actions[bot]",id:1,type:"Bot"}},
   {created_at:"2026-10-23T21:59:10Z"},
   {body:receiptBody.replace(runner,"d".repeat(40))},
   {body:receiptBody.replace('"providerCreates":0','"providerCreates":1')},
   {body:receiptBody.replace('"runId":123456789','"runId":123456790')},
   {body:receiptBody+" "},
  ]){
   expect(gate4ReviewIndependentArmedProofV39({
    ...f,comments:[{...c,...patch}]
   })).toBe(false);
  }
 });
 it("stops trusting after receipt freshness and before stop deadline",()=>{
  const f=fixture();
  expect(gate4ReviewIndependentArmedProofV39({
   ...f,nowUtc:"2026-10-23T22:01:15.000Z"
  })).toBe(false);
  expect(gate4ReviewIndependentArmedProofV39({
   ...f,nowUtc:"2026-10-23T22:04:30.000Z"
  })).toBe(false);
 });
});
