import {describe,it,expect} from "vitest";
import type {
 P5Stage14SingleFlightPrePermit,P5Stage14SingleFlightPreResult
} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {
 runP5CPlusDReadyBatchOffline,type P5PreQueueCandidate
} from "../server/lib/disruption/phase5CPlusDParallelPreProofOfConcept_v39";
import {reviewP5CPlusDExistingStage14ProofOffline} from
 "../server/lib/disruption/phase5CPlusDStage14ResultBridgeOffline_v39";

const candidate:P5PreQueueCandidate={
 flightInstanceId:"synthetic-flight-a",
 horizon:"T-6h",
 selectedNativeTUtc:"2026-11-12T18:00:00.000Z",
 ownCutoffUtc:"2026-11-12T12:00:00.000Z",
 packetSha256:"a".repeat(64),
 handoffState:"EXTERNALLY_REVIEWED_PENDING"
};
const permit={
 flightInstanceId:candidate.flightInstanceId,
 horizon:candidate.horizon,
 selectedTNativeUtc:candidate.selectedNativeTUtc,
 runDayIndex:1,
 slot:"HUB",
 expectedSourcePopulationQueryId:"00000000-0000-4000-8000-000000000001"
} as unknown as P5Stage14SingleFlightPrePermit;
const success={
 schema:"v39.phase5.stage14.single-bound-flight-pre-writer.v1",
 status:"ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE",
 horizon:"T-6h",runDayIndex:1,slot:"HUB",
 cutoffUtc:candidate.ownCutoffUtc,
 boundPopulationQueryId:permit.expectedSourcePopulationQueryId,
 committedSnapshotId:"123",
 postCommitDbClockAtUtc:"2026-11-12T11:59:59.000Z",
 postCommitDatabaseReadbackVerified:true,
 flightPreCommittedBeforeOwnCutoff:true,
 sourceOriginalCommittedBeforeFlightCutoff:true,
 preSnapshotsInserted:1,
 providerCalls:0,alertCreates:0,
 phase5FreezePassed:false,phase6PaidGo:false
} as P5Stage14SingleFlightPreResult;
describe("Phase 5 C+D Stage14 proof bridge — OFFLINE ONLY",()=>{
 it("accepts an explicitly matched acknowledged Stage14 result",()=>{
  expect(reviewP5CPlusDExistingStage14ProofOffline(candidate,permit,success))
   .toEqual({
    flightInstanceId:candidate.flightInstanceId,horizon:"T-6h",
    packetSha256:candidate.packetSha256,
    preSnapshotsInserted:1,postCommitDatabaseReadbackVerified:true
   });
 });
 it("feeds the original C parallel runner without introducing another writer",async()=>{
  const r=await runP5CPlusDReadyBatchOffline([candidate],1,async(q)=>
   reviewP5CPlusDExistingStage14ProofOffline(q,permit,success));
  expect(r.results.map(x=>x.status))
   .toEqual(["EXISTING_STAGE14_RETURNED_VERIFIED_PROOF"]);
  expect(r.productionQueueInstalled).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("rejects schedule revisions reused as a second cutoff",()=>{
  expect(()=>reviewP5CPlusDExistingStage14ProofOffline(
   {...candidate,selectedNativeTUtc:"2026-11-12T18:15:00.000Z"},permit,success
  )).toThrow("FLIGHT_HORIZON_T_OR_SOURCE_MISMATCH");
 });
 it("rejects wrong flight, horizon or bound SOURCE identity",()=>{
  for(const changed of [
   {flightInstanceId:"synthetic-flight-b"},
   {horizon:"T-90m" as const},
   {ownCutoffUtc:"2026-11-12T11:59:59.000Z"}
  ]){
   expect(()=>reviewP5CPlusDExistingStage14ProofOffline(
    {...candidate,...changed},permit,success
   )).toThrow();
  }
  expect(()=>reviewP5CPlusDExistingStage14ProofOffline(candidate,permit,
   {...success,boundPopulationQueryId:"different"})).toThrow("SOURCE_MISMATCH");
 });
 it("rejects unacknowledged, false, or late post-commit proofs",()=>{
  for(const changed of [
   {preSnapshotsInserted:0 as 1},
   {postCommitDatabaseReadbackVerified:false as true},
   {phase6PaidGo:true as false},
   {committedSnapshotId:""},
   {postCommitDbClockAtUtc:"2026-11-12T12:00:00.000Z"}
  ]){
   expect(()=>reviewP5CPlusDExistingStage14ProofOffline(
    candidate,permit,{...success,...changed}
   )).toThrow();
  }
 });
 it("rejects nonpending and malformed packets",()=>{
  expect(()=>reviewP5CPlusDExistingStage14ProofOffline(
   {...candidate,handoffState:"WRITE_STARTED_UNKNOWN"},permit,success
  )).toThrow("QUEUE_OR_PACKET_NOT_REVIEWED");
  expect(()=>reviewP5CPlusDExistingStage14ProofOffline(
   {...candidate,packetSha256:"bad"},permit,success
  )).toThrow("QUEUE_OR_PACKET_NOT_REVIEWED");
 });
});
