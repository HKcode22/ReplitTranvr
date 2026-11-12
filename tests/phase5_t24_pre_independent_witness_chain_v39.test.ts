import {describe,it,expect} from "vitest";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {
 verifyP5T24PreWitnessCrossReview,
 persistP5ReviewedT24PreAndIndependentWitness,
 draftP5UnsignedStage24ReceiptFromCommittedChain
} from "../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39";
import type {P5Stage14SingleFlightPrePermit}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import type {P5IndependentT24WitnessReview}
 from "../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39";
const h=(c:string)=>c.repeat(64);
function fixture(){
 const pre={
  manifestSha256:h("a"),queryDigestSha256:h("b"),
  expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
  expectedSourceResponseSha256:h("e"),
  runDayIndex:1,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
  flightInstanceId:"leg:ci:100",expectedGithubSourceRunId:"42363348762",
  expectedReviewedReleaseSha256:h("5"),
  expectedReviewedSourceRightsSha256:h("d"),
  expectedProviderContractSha256:h("f"),
  expectedEarlyDrawSha256:h("4"),
  reviewedFrameSha256:h("3"),reviewedConfigSha256:h("2"),
  independentlyReviewedOperatingLegEvidenceSha256:h("8"),
  independentlyReviewedNativeTEvidenceSha256:h("7"),
  independentlyReviewedRunAndRetentionEvidenceSha256:h("9"),
  frozenBuilderSha256:h("c"),
  builderFrozenAtUtc:"2026-11-07T00:00:00.000Z",
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc",version:"ci-only-native-T",
   artifactHash:h("6"),verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:h("7")
  },
  selectedTNativeUtc:"2026-11-10T10:00:00.000Z",
  maxPopulationStalenessSeconds:3600,
  expectedRestrictedPreWriterRole:"phase5_fids_pre_writer_prod_20261107",
  externalNativeTPhysicalLegAndSourceUseReviewed:true
 } satisfies P5Stage14SingleFlightPrePermit;
 const review:P5IndependentT24WitnessReview={
  flightInstanceId:pre.flightInstanceId,
  sourcePopulationQueryId:pre.expectedSourcePopulationQueryId,
  expectedSourceResponseSha256:pre.expectedSourceResponseSha256,
  expectedSourceQueryDigestSha256:pre.queryDigestSha256,
  expectedFrameSha256:pre.reviewedFrameSha256,
  expectedConfigSha256:pre.reviewedConfigSha256,
  selectedTNativeUtc:pre.selectedTNativeUtc,
  expectedT24CutoffUtc:"2026-11-09T10:00:00.000Z",
  expectedSelectedTVersion:"departure.scheduledTime.utc:ci-only-native-T:"+h("6"),
  expectedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107"
 };
 return {pre,review};
}
describe("Phase5 reused PRE postcommit snapshot ID -> independent T24 witness",()=>{
 it("requires precisely the same native-T flight, source and frozen T24 cutoff",()=>{
  const f=fixture();
  expect(()=>verifyP5T24PreWitnessCrossReview(f.pre,f.review)).not.toThrow();
 });
 it("refuses conditional/scheduled-service tier, even though Phase4 PRE may separately allow it",()=>{
  const f=fixture();
  expect(()=>verifyP5T24PreWitnessCrossReview({
   ...f.pre,identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE"
  },f.review)).toThrow("ONLY_REVIEWED_NATIVE_T24_PERMITTED");
  expect(()=>verifyP5T24PreWitnessCrossReview({
   ...f.pre,externalNativeTPhysicalLegAndSourceUseReviewed:undefined
  },f.review)).toThrow("ONLY_REVIEWED_NATIVE_T24_PERMITTED");
 });
 it("rejects wrong T24 anchor, selected version, response, source digest or role",()=>{
  const f=fixture();
  for(const change of [
   {expectedT24CutoffUtc:"2026-11-09T10:01:00.000Z"},
   {expectedSelectedTVersion:"other-version"},
   {expectedSourceResponseSha256:h("0")},
   {expectedSourceQueryDigestSha256:h("0")},
   {expectedFrameSha256:h("0")},
   {sourcePopulationQueryId:"12345678-e89b-42d3-a456-426614174000"},
   {expectedWitnessOnlyRole:f.pre.expectedRestrictedPreWriterRole}
  ])expect(()=>verifyP5T24PreWitnessCrossReview(
   f.pre,{...f.review,...change}
  )).toThrow("INDEPENDENT_T24_PRE_AND_WITNESS_SCOPE_DRIFT");
 });
 it("queued T24 requires exactly ONE real V0087 lease fence BEFORE database access",async()=>{
  const f=fixture();
  let connected=0;
  const pre={connect:async()=>{connected++;throw Error("PRE_MUST_NOT_CONNECT");}};
  const witness={connect:async()=>{connected++;throw Error("WITNESS_MUST_NOT_CONNECT");}};
  const lease={taskId:"12",owner:"ci-t24-worker",
   generation:"3",packetSha256:h("1")};
  await expect(persistP5ReviewedT24PreAndIndependentWitness(
   pre as any,witness as any,f.pre,f.review,{
    realV0088QueueFenceCi:lease,realV0088QueueFenceGh:lease
   }
  )).rejects.toThrow("QUEUED_T24_MUST_USE_EXACTLY_ONE_REAL_V0087_CLAIM_FENCE");
  await expect(persistP5ReviewedT24PreAndIndependentWitness(
   pre as any,witness as any,f.pre,f.review,{}
  )).rejects.toThrow("QUEUED_T24_MUST_USE_EXACTLY_ONE_REAL_V0087_CLAIM_FENCE");
  await expect(persistP5ReviewedT24PreAndIndependentWitness(
   pre as any,witness as any,f.pre,f.review,{
    disposableCdQueueFence:{} as any,realV0088QueueFenceGh:lease
   }
  )).rejects.toThrow("QUEUED_T24_MUST_USE_EXACTLY_ONE_REAL_V0087_CLAIM_FENCE");
  expect(connected).toBe(0);
 });
 it("a queued T24 GH fence cannot bypass the main-only source release",async()=>{
  const f=fixture();
  let connected=0;
  const pre={connect:async()=>{connected++;throw Error("PRE_MUST_NOT_CONNECT");}};
  const witness={connect:async()=>{connected++;throw Error("WITNESS_MUST_NOT_CONNECT");}};
  await expect(persistP5ReviewedT24PreAndIndependentWitness(
   pre as any,witness as any,f.pre,f.review,{
    realV0088QueueFenceGh:{
     taskId:"12",owner:"ci-t24-worker",generation:"3",packetSha256:h("1")
    }
   }
  )).rejects.toThrow("REFUSED_P5_CD_GITHUB_PRE_");
  expect(connected).toBe(0);
 });
 it("never connects or writes when restricted PRE and independent witness pools are the same",async()=>{
  const f=fixture(),touched:string[]=[];
  const one={
   connect:async()=>{
    touched.push("CONNECTED");
    throw Error("SHOULD_NOT_CONNECT");
   }
  };
  await expect(persistP5ReviewedT24PreAndIndependentWitness(
   one as any,one as any,f.pre,f.review
  )).rejects.toThrow("MUST_USE_DISTINCT_RESTRICTED_PRE_AND_WITNESS_POOLS");
  expect(touched).toHaveLength(0);
 });
 it("refuses a non-T24 request before any database connection",async()=>{
  const f=fixture(),touched:string[]=[];
  const first={connect:async()=>{touched.push("PRE");throw Error("unexpected");}};
  const second={connect:async()=>{touched.push("WITNESS");throw Error("unexpected");}};
  await expect(persistP5ReviewedT24PreAndIndependentWitness(
   first as any,second as any,{...f.pre,horizon:"T-6h"},f.review
  )).rejects.toThrow("ONLY_REVIEWED_NATIVE_T24_PERMITTED");
  expect(touched).toHaveLength(0);
 });
});

describe("genuine Stage17 T24 witness → later horizon unsigned review receipt",()=>{
 function committed(){
  const f=fixture();
  const saved={
   schema:"v39.phase5.stage14.single-bound-flight-pre-writer.v1",
   status:"ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE",
   horizon:"T-24h",preSnapshotsInserted:1,
   postCommitDatabaseReadbackVerified:true,
   flightPreCommittedBeforeOwnCutoff:true,
   committedSnapshotId:"123456",
   boundPopulationQueryId:f.pre.expectedSourcePopulationQueryId,
   postCommitDbClockAtUtc:"2026-11-09T09:57:59.000Z"
  };
  const witness={
   schema:"v39.phase5.stage17.separate-transaction-t24-pre-commit-witness.v1",
   status:"T24_PRE_SEPARATE_TRANSACTION_DB_WITNESS_DURABLE_BEFORE_CUTOFF",
   flightInstanceId:f.pre.flightInstanceId,snapshotId:"123456",
   frozenT24CutoffUtc:"2026-11-09T10:00:00.000Z",
   originalT24SnapshotVisibleInSeparateTransaction:true,
   witnessCommittedAndReadBackBeforeOwnCutoff:true,
   postPreCommitDbObservedAtUtc:"2026-11-09T09:58:00.000Z",
   postWitnessCommitReadbackAtUtc:"2026-11-09T09:58:03.000Z"
  };
  return {...f,saved,witness};
 }
 const build=(f:ReturnType<typeof committed>)=>
  draftP5UnsignedStage24ReceiptFromCommittedChain(
   f.pre,f.review,f.saved as any,f.witness as any);
 it("derives the exact immutable Stage24 receipt from TWO genuine postcommit readbacks",()=>{
  const f=committed(),got=build(f);
  expect(got.status).toBe(
   "DURABLE_T24_RECEIPT_CANDIDATE_AWAITING_INDEPENDENT_REVIEW");
  expect(got.receipt.snapshotId).toBe(f.saved.committedSnapshotId);
  expect(got.receipt.flightInstanceId).toBe(f.pre.flightInstanceId);
  expect(got.receipt.t24OriginalFidsSha256).toBe(f.pre.expectedSourceResponseSha256);
  expect(got.receipt.t24SourceQueryDigestSha256).toBe(f.pre.queryDigestSha256);
  expect(got.receipt.frozenT24CutoffUtc).toBe(
   "2026-11-09T10:00:00.000Z");
  expect(got.receipt.stage17PostCommitReadbackAtUtc).toBe(
   f.witness.postWitnessCommitReadbackAtUtc);
  expect(digestP5Stage24ReviewedReceipt(got.receipt)).toBe(
   got.receipt.receiptSha256);
  expect(got.reviewedByIndependentAuthority).toBe(false);
  expect(got.mayLaunchLaterPreAutomatically).toBe(false);
  expect(got.providerCalls).toBe(0);
 });
 it("refuses forged snapshot or switched native T with a committed-looking result",()=>{
  for(const patch of [
   {snapshotId:"999999"},
   {flightInstanceId:"leg:other"},
   {frozenT24CutoffUtc:"2026-11-09T10:00:01.000Z"},
   {originalT24SnapshotVisibleInSeparateTransaction:false}
  ]){
   const f=committed();f.witness={...f.witness,...patch};
   expect(()=>build(f)).toThrow("CHAIN_DOES_NOT_PROVE_DURABLE_T24_RECEIPT");
  }
 });
 it("refuses missing postcommit, reversed witness clock or any postcutoff receipt",()=>{
  for(const patch of [
   {postPreCommitDbObservedAtUtc:"2026-11-09T09:57:58.000Z"},
   {postPreCommitDbObservedAtUtc:"2026-11-09T10:00:00.000Z"},
   {postWitnessCommitReadbackAtUtc:"2026-11-09T10:00:01.000Z"}
  ]){
   const f=committed();f.witness={...f.witness,...patch};
   expect(()=>build(f)).toThrow("CHAIN_DOES_NOT_PROVE_DURABLE_T24_RECEIPT");
  }
  const f=committed();
  f.saved.postCommitDatabaseReadbackVerified=false;
  expect(()=>build(f)).toThrow("CHAIN_DOES_NOT_PROVE_DURABLE_T24_RECEIPT");
 });
});
