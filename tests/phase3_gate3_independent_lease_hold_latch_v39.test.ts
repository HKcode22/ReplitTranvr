import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {decideGate3IndependentLeaseAfterTickV39} from
  "../server/lib/disruption/gate3IndependentLeaseFailClosed_v39";
import {assertGate3WatchdogLiveLeaseV39}
  from "../server/lib/disruption/gate3WatchdogLiveLease_v39";

const act=(previous:boolean,
  status:"HOLD"|"MONITOR"|"ZERO_EXACT_SUBSCRIPTIONS"|"STOP_VERIFIED")=>
  decideGate3IndependentLeaseAfterTickV39(previous,status);
describe("Independent GitHub bot lease fail-closed on watchdog blind spot",()=>{
 it("normal exact-owned provider monitor stays ACTIVE",()=>{
   expect(act(false,"MONITOR")).toMatchObject({
     status:"ACTIVE",revoked:false
   });
   expect(act(false,"ZERO_EXACT_SUBSCRIPTIONS")).toMatchObject({
     status:"ACTIVE",revoked:false
   });
 });
 it("HOLD must become STOPPED immediately (no 15s publish grace)",()=>{
   expect(act(false,"HOLD")).toMatchObject({
     status:"STOPPED",revoked:true
   });
 });
 it("once revoked, later MONITOR/ZERO cannot re-arm paid owner",()=>{
   let state=act(false,"MONITOR");
   state=act(state.revoked,"HOLD");
   for(const tick of ["MONITOR","ZERO_EXACT_SUBSCRIPTIONS","HOLD"] as const){
     state=act(state.revoked,tick);
     expect(state.status).toBe("STOPPED");
     expect(state.revoked).toBe(true);
   }
 });
 it("verified owned STOP also revokes lease",()=>{
   expect(act(false,"STOP_VERIFIED")).toMatchObject({
     status:"STOPPED",revoked:true
   });
 });
 it("rejects malformed tick rather than granting ACTIVE",()=>{
   expect(()=>decideGate3IndependentLeaseAfterTickV39(
     false,"unknown" as "HOLD")).toThrow("TICK_INVALID");
 });
 it("sidecar itself publishes STOPPED on HOLD and NEVER unconditionally ACTIVE",()=>{
   const src=readFileSync("scripts/v39_gate3_independent_watchdog_v39.ts","utf8");
   expect(src).toContain("decideGate3IndependentLeaseAfterTickV39(");
   expect(src).toContain("const justRevoked=!leaseRevoked&&leaseDecision.revoked");
   expect(src).toContain('await heartbeat("STOPPED")');
   expect(src).toContain('await heartbeat(leaseDecision.status)');
   expect(src).not.toContain('await heartbeat("ACTIVE")');
 });
 it("the paid owner rejects STOPPED even with fresh bot lease and exact run",()=>{
   const scope={
     githubRunId:39112345,commentId:625501,
     expectedGitHead:"b".repeat(40),authSha256:"a".repeat(64),
     sessionId:"64315edd-6036-40dc-b73b-adee3144c11f",
     startUtc:"2026-10-20T06:20:00Z",
   };
   const now=new Date("2026-10-20T06:20:03Z");
   const comment={
     id:scope.commentId,
     user:{login:"github-actions[bot]",type:"Bot"},
     updated_at:"2026-10-20T06:20:02Z",
     body:JSON.stringify({
       schema:"v39.gate3.wsss-watchdog-lease.v1",
       status:"STOPPED",githubRunId:scope.githubRunId,
       expectedGitHead:scope.expectedGitHead,authSha256:scope.authSha256,
       sessionId:scope.sessionId,startUtc:scope.startUtc,
       heartbeatUtc:"2026-10-20T06:20:02Z",
       providerCreatesByWatchdog:0,hardCreditLimitGuaranteed:false
     })
   };
   const run={
     id:scope.githubRunId,status:"in_progress",conclusion:null,
     head_sha:scope.expectedGitHead,event:"workflow_dispatch",
     path:".github/workflows/phase3-gate3-independent-safety.yml",
     repository:{full_name:"HKcode22/ReplitTranvr"}
   };
   expect(()=>assertGate3WatchdogLiveLeaseV39(scope,comment,run,now))
     .toThrow("GATE3_WATCHDOG_LEASE_CONTENT_SCOPE_OR_STATE_MISMATCH");
 });
});
