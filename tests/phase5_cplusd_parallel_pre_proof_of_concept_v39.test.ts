import {describe,it,expect} from "vitest";
import {
 selectP5CPlusDDueTasks,runP5CPlusDReadyBatchOffline,
 inspectP5CPlusDWatchdogOffline,idealizedP5ParallelWorkSeconds,
 P5SystemicStop,type P5PreQueueCandidate
} from "../server/lib/disruption/phase5CPlusDParallelPreProofOfConcept_v39";
const T="2027-02-10T18:00:00.000Z";
const C="2027-02-10T12:00:00.000Z";
const H="a".repeat(64);
const task=(i:number,overrides:Partial<P5PreQueueCandidate>={}):
 P5PreQueueCandidate=>({
 flightInstanceId:"physical-operated-flight-"+String(i).padStart(4,"0"),
 horizon:"T-6h",selectedNativeTUtc:T,ownCutoffUtc:C,
 packetSha256:i.toString(16).padStart(64,"0"),
 handoffState:"EXTERNALLY_REVIEWED_PENDING",...overrides
});
const proof=(r:P5PreQueueCandidate)=>({
 flightInstanceId:r.flightInstanceId,horizon:r.horizon,
 packetSha256:r.packetSha256,
 postCommitDatabaseReadbackVerified:true as const,
 preSnapshotsInserted:1 as const
});
describe("Phase5 C+D NO-PROVIDER parallel PRE worker proof of concept",()=>{
 it("explains 100 illustrative tasks and 1/2/4/8/16 ideal lanes but never claims real benchmark",()=>{
  expect([1,2,4,8,16].map(n=>
   idealizedP5ParallelWorkSeconds(100,n,5)))
   .toEqual([500,250,125,65,35]);
 });
 it("does not occupy a lane while cutoff is far away; never PRE after cutoff",()=>{
  const before=selectP5CPlusDDueTasks([task(1)],"2027-02-10T11:00:00.000Z");
  expect(before.waiting).toHaveLength(1);
  expect(before.due).toHaveLength(0);
  const inside=selectP5CPlusDDueTasks([task(1)],"2027-02-10T11:58:00.000Z");
  expect(inside.due).toHaveLength(1);
  const missed=selectP5CPlusDDueTasks([task(1)],"2027-02-10T12:00:01.000Z");
  expect(missed.missed).toHaveLength(1);
  expect(missed.due).toHaveLength(0);
  expect(missed.productionPreWrites).toBe(0);
 });
 it("rejects changed first native T for same flight and horizon even with new cutoff",()=>{
  expect(()=>selectP5CPlusDDueTasks([
   task(1),
   task(1,{selectedNativeTUtc:"2027-02-10T18:15:00.000Z",
    ownCutoffUtc:"2027-02-10T12:15:00.000Z",
    packetSha256:"b".repeat(64)})
  ],"2027-02-10T11:58:00.000Z"))
   .toThrow("SAME_FLIGHT_HORIZON_TWO_NATIVE_CUTOFFS");
  expect(()=>selectP5CPlusDDueTasks([task(1,{
   ownCutoffUtc:"2027-02-10T12:15:00.000Z"
  })],"2027-02-10T11:58:00.000Z"))
   .toThrow("ALTERED_NATIVE_T_OR_OWN_CUTOFF");
 });
 it("handles 100 eligible tasks using no more than 4 lanes, without a second writer",async()=>{
  let current=0,max=0,attempted=0;
  const rows=Array.from({length:100},(_,i)=>task(i));
  const due=selectP5CPlusDDueTasks(rows,"2027-02-10T11:59:00.000Z").due;
  const out=await runP5CPlusDReadyBatchOffline(due,4,async t=>{
   current++;attempted++;max=Math.max(max,current);
   await Promise.resolve();
   current--;return proof(t);
  });
  expect(attempted).toBe(100);
  expect(max).toBe(4);
  expect(out.results).toHaveLength(100);
  expect(out.results.every(r=>r.status===
   "EXISTING_STAGE14_RETURNED_VERIFIED_PROOF")).toBe(true);
  expect(out.liveDatabaseBenchmark).toBe(false);
  expect(out.productionQueueInstalled).toBe(false);
  expect(out.phase6PaidGo).toBe(false);
 });
 it("one failed flight is quarantined; unrelated healthy flights continue",async()=>{
  const due=selectP5CPlusDDueTasks(
   [task(1),task(2),task(3)],"2027-02-10T11:59:00.000Z").due;
  const out=await runP5CPlusDReadyBatchOffline(due,2,async t=>{
   if(t.flightInstanceId===task(2).flightInstanceId)
    throw Error("socket dropped after possible COMMIT");
   return proof(t);
  });
  expect(out.results.map(x=>x.status)).toEqual([
   "EXISTING_STAGE14_RETURNED_VERIFIED_PROOF",
   "UNKNOWN_COMMIT_QUARANTINE",
   "EXISTING_STAGE14_RETURNED_VERIFIED_PROOF"
  ]);
 });
 it("a systemic stop prevents unstarted work; never silently retries uncertain commit",async()=>{
  const rows=Array.from({length:6},(_,i)=>task(i));
  const due=selectP5CPlusDDueTasks(rows,"2027-02-10T11:59:00.000Z").due;
  let called=0;
  const out=await runP5CPlusDReadyBatchOffline(due,1,async()=>{
   called++;throw new P5SystemicStop();
  });
  expect(called).toBe(1);
  expect(out.results[0].status).toBe("UNKNOWN_COMMIT_QUARANTINE");
  expect(out.results.slice(1).every(x=>x.status===
    "NOT_STARTED_SYSTEMIC_STOP")).toBe(true);
 });
 it("unknown and completed statuses never get scheduled again by this adapter",()=>{
  const r=selectP5CPlusDDueTasks([
   task(1,{handoffState:"WRITE_STARTED_UNKNOWN"}),
   task(2,{handoffState:"COMPLETED"})
  ],"2027-02-10T11:58:00.000Z");
  expect(r.due).toHaveLength(0);
  expect(r.heldUnknownOrComplete).toHaveLength(2);
 });
 it("watchdog reports controller stale, task not claimed, uncertain commit and spend STOP",()=>{
  const now="2027-02-10T12:00:00.000Z";
  const healthy=inspectP5CPlusDWatchdogOffline(now,{
   lastSuccessfulControllerTickUtc:"2027-02-10T11:55:00.000Z",
   oldestUnclaimedDueUtc:null,unverifiedUnknownCommitCount:0,
   sourceRightsHold:false,budgetHold:false,alertStopHold:false
  });
  expect(healthy.status).toBe("HEALTHY");
  const broken=inspectP5CPlusDWatchdogOffline(now,{
   lastSuccessfulControllerTickUtc:"2027-02-10T11:35:00.000Z",
   oldestUnclaimedDueUtc:"2027-02-10T11:55:00.000Z",
   unverifiedUnknownCommitCount:1,
   sourceRightsHold:true,budgetHold:true,alertStopHold:true
  });
  expect(broken.status).toBe("REQUIRES_OPERATOR_REVIEW");
  expect(broken.issues).toHaveLength(6);
  expect(broken.automaticReruns).toBe(0);
  expect(broken.paidActionsInitiated).toBe(0);
 });
 it("invalid lane settings never become an unbounded Promise.all",async()=>{
  await expect(runP5CPlusDReadyBatchOffline([task(1)],17,async t=>
   proof(t))).rejects.toThrow("UNBOUNDED_LANES_OR_TASKS");
 });
});
