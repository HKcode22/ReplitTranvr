import {describe,it,expect} from "vitest";
import {
 digestP5Stage24ReviewedReceipt,verifyP5Stage24WitnessedFrozenT,
 type P5Stage24ReviewedT24Receipt,
 type P5Stage24WitnessExpectation
} from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
const rep=(c:string)=>c.repeat(64);
function setup(horizon:"T-6h"|"T-90m"="T-6h"){
 const native="2027-01-08T12:00:00.000Z";
 const cutoff=horizon==="T-6h"?
  "2027-01-08T06:00:00.000Z":"2027-01-08T10:30:00.000Z";
 const r:Omit<P5Stage24ReviewedT24Receipt,"receiptSha256">={
  schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",
  snapshotId:"123456",flightInstanceId:"flight:operating:ci:100",
  selectedTNativeUtc:native,
  frozenT24CutoffUtc:"2027-01-07T12:00:00.000Z",
  expectedSelectedTVersion:"departure.scheduledTime.utc:v3:"+rep("a"),
  t24OriginalFidsSha256:rep("b"),t24SourceQueryDigestSha256:rep("c"),
  t24FrameSha256:rep("d"),t24ConfigSha256:rep("e"),
  witnessDbObservedAtUtc:"2027-01-07T11:58:00.000Z",
  stage17PostCommitReadbackAtUtc:"2027-01-07T11:58:03.000Z"
 };
 const receipt={...r,receiptSha256:digestP5Stage24ReviewedReceipt(r)};
 const expected:P5Stage24WitnessExpectation={
  flightInstanceId:r.flightInstanceId,selectedTNativeUtc:native,
  expectedSelectedTVersion:r.expectedSelectedTVersion,
  expectedFrameSha256:r.t24FrameSha256,
  expectedConfigSha256:r.t24ConfigSha256,
  cutoffUtc:cutoff,horizon
 };
 const row:Record<string,unknown>={
  snapshot_id:r.snapshotId,joined_snapshot_id:r.snapshotId,
  flight_instance_id:r.flightInstanceId,
  selected_t_version:r.expectedSelectedTVersion,
  fids_response_hash:r.t24OriginalFidsSha256,
  source_query_digest:r.t24SourceQueryDigestSha256,
  frame_hash:r.t24FrameSha256,config_hash:r.t24ConfigSha256,
  selected_t_native_utc:native,
  t24_cutoff_utc:r.frozenT24CutoffUtc,
  post_pre_commit_db_observed_at_utc:r.witnessDbObservedAtUtc,
  source_t24_population_query_id:
   "a23e4567-e89b-42d3-a456-426614174000",
  snapshot_prediction_state:"PRE_DEPARTURE",
  snapshot_horizon:"T-24h"
 };
 return {receipt,expected,row};
}
describe("Stage24 exact T24 original cannot be retrofitted from T6/T90",()=>{
 it.each(["T-6h","T-90m"] as const)(
  "admits %s only with matching committed witness, native T and reviewed readback",h=>{
   const p=setup(h);
   const actual=verifyP5Stage24WitnessedFrozenT(
    p.row,p.receipt,p.expected);
   expect(actual.snapshotId).toBe("123456");
   expect(actual.stage17ReadbackUtc).toBe(p.receipt.stage17PostCommitReadbackAtUtc);
 });
 it("rejects receipt hash mismatch",()=>{
  const p=setup();
  p.receipt.t24OriginalFidsSha256=rep("f");
  expect(()=>verifyP5Stage24WitnessedFrozenT(
   p.row,p.receipt,p.expected))
   .toThrow("T24_RECEIPT_HASH_DOES_NOT_BIND_EVIDENCE");
 });
 it("rejects a later source substituting a different T24 original",()=>{
  const p=setup();p.row.fids_response_hash=rep("f");
  expect(()=>verifyP5Stage24WitnessedFrozenT(
   p.row,p.receipt,p.expected))
   .toThrow("PERSISTED_T24_WITNESS_ORIGINAL_T_CHANGED");
 });
 it("rejects a first native schedule retime in later horizon",()=>{
  const p=setup();p.expected.selectedTNativeUtc=
   "2027-01-08T13:00:00.000Z";
  p.expected.cutoffUtc="2027-01-08T07:00:00.000Z";
  expect(()=>verifyP5Stage24WitnessedFrozenT(
   p.row,p.receipt,p.expected))
   .toThrow("REVIEW_T24_NATIVE_ANCHOR_OR_PARTITION_CHANGED");
 });
 it("rejects a witness readback that happened after T24 cutoff",()=>{
  const p=setup();
  p.receipt.stage17PostCommitReadbackAtUtc="2027-01-07T12:00:01.000Z";
  p.receipt.receiptSha256=digestP5Stage24ReviewedReceipt(p.receipt);
  expect(()=>verifyP5Stage24WitnessedFrozenT(
   p.row,p.receipt,p.expected))
   .toThrow("REVIEWED_WITNESS_NOT_DURABLE_BEFORE_T24_CUTOFF");
 });
 it("rejects a witness anchored after allowed DB margin",()=>{
  const p=setup();p.receipt.witnessDbObservedAtUtc=
   "2027-01-07T11:59:59.000Z";
  p.receipt.receiptSha256=digestP5Stage24ReviewedReceipt(p.receipt);
  p.row.post_pre_commit_db_observed_at_utc=
   p.receipt.witnessDbObservedAtUtc;
  expect(()=>verifyP5Stage24WitnessedFrozenT(
   p.row,p.receipt,p.expected))
   .toThrow("REVIEWED_WITNESS_NOT_DURABLE_BEFORE_T24_CUTOFF");
 });
 it("refuses unauthenticated T24 horizon substitution",()=>{
  const p=setup();p.row.snapshot_horizon="T-6h";
  expect(()=>verifyP5Stage24WitnessedFrozenT(
   p.row,p.receipt,p.expected))
   .toThrow("PERSISTED_T24_WITNESS_ORIGINAL_T_CHANGED");
 });
 it("fails on absent witness row, not a typed boolean in manifest",()=>{
  const p=setup();
  expect(()=>verifyP5Stage24WitnessedFrozenT(
   {},p.receipt,p.expected))
   .toThrow("PERSISTED_T24_WITNESS_ORIGINAL_T_CHANGED");
 });
});
