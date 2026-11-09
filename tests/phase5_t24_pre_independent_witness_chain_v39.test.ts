import {describe,it,expect} from "vitest";
import {
 verifyP5T24PreWitnessCrossReview,
 persistP5ReviewedT24PreAndIndependentWitness
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
