import {describe,it,expect} from "vitest";
import {
 auditP5FuturePostSourceEligibility,
 P5_FUTURE_POST_PARTIAL_PRE_SCHEMA
} from "../server/lib/disruption/phase5FuturePostSourceEligibility_v39.mjs";
const sh=(c:string)=>c.repeat(64);
const T="2027-02-02T10:00:00.000Z";
const OFFSET={
 "T-24h":24*3600000,"T-6h":6*3600000,"T-90m":90*60000
} as const;
const t=(ms:number)=>new Date(Date.parse(T)+ms).toISOString();
type Hor=keyof typeof OFFSET;
function pre(horizon:Hor){
 const cutoff=t(-OFFSET[horizon]);
 return{
  horizon,
  sourceResponseSha256:sh("c"),
  committedPreSnapshotSha256:sh("d"),
  sourceQueryDigestSha256:sh("e"),
  identityTier:"PROVIDER_NATIVE_OPERATING_LEG",
  flightStableIdentitySha256:sh("f"),
  predictionCutoffUtc:cutoff,
  sourceAvailableAtUtc:new Date(Date.parse(cutoff)-60_000).toISOString(),
  preCommittedAtUtc:new Date(Date.parse(cutoff)-30_000).toISOString(),
  selectedNativeMilestoneUtc:T,
  sourceContentsExpiresAtUtc:t(3600000),
  sourceCommitAfterOriginalPersisted:true,
  savedToDatabaseBeforeCutoff:true
 };
}
function packet(rows:any[]=[pre("T-6h")]){
 return{
  schema:P5_FUTURE_POST_PARTIAL_PRE_SCHEMA,
  manifestSha256:sh("a"),calendarSha256:sh("b"),
  savedEarlyDrawSha256:sh("3"),sourceScopeSha256:sh("4"),
  flightStableIdentitySha256:sh("f"),
  runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
  identityTier:"PROVIDER_NATIVE_OPERATING_LEG",
  reviewedNativeMilestoneUtc:T,
  postObservationPlannedUtc:t(2*3600000),
  reviewedFollowupStartUtc:t(3600000),
  reviewedFollowupEndUtc:t(3*3600000),
  hardLatestPostSourceDispatchUtc:t(2*3600000+20*60000),
  readonlyReviewClockUtc:t(-30*60000),
  sourceProviderRangeFromUtc:t(-2*3600000),
  sourceProviderRangeToUtc:t(2*3600000),
  protectedTestOutcomeValuesRead:false,
  postPaidGetAlreadyReserved:false,
  preObservedHorizonRecords:rows
 };
}
describe("Future-date Phase5 POST: preserve valid partial PRE, no physical label invention",()=>{
 it("admits one actual source-backed T6 PRE without requiring T24 and T90",()=>{
  const out=auditP5FuturePostSourceEligibility(packet());
  expect(out.status).toBe(
   "PARTIAL_VALID_PRE_REVIEWABLE_FOR_FUTURE_POST_NO_DISPATCH");
  expect(out.validPreHorizons).toEqual(["T-6h"]);
  expect(out.expectedPreHorizonCount).toBe(3);
  expect(out.missingOrInvalidPreHorizons).toEqual([
   {horizon:"T-24h",reason:"HORIZON_NOT_OBSERVED"},
   {horizon:"T-90m",reason:"HORIZON_NOT_OBSERVED"}
  ]);
  expect(out.providerContentsSourceRightsAndTTLApproved).toBe(false);
  expect(out.providerPhysicalActualTakeoffCertified).toBe(false);
  expect(out.missingPreOrPostMeansFlightOnTime).toBe(false);
  expect(out.missingPreOrPostMeansNoCancellation).toBe(false);
  expect(out.sourceOriginalOrPOSTOutcomeObservedByThisFunction).toBe(false);
  expect(out.futureGithubDispatchAllowed).toBe(false);
  expect(out.phase6PaidGoGranted).toBe(false);
  expect(out.providerCalls).toBe(0);
  expect(out.databaseWrites).toBe(0);
 });
 it("keeps true three horizons when independently source-backed and clock-safe",()=>{
  const out=auditP5FuturePostSourceEligibility(
   packet([pre("T-90m"),pre("T-24h"),pre("T-6h")]));
  expect(out.status).toBe("ALL_THREE_PRE_REVIEWABLE_FOR_FUTURE_POST_NO_DISPATCH");
  expect(out.validPreHorizons).toEqual(["T-24h","T-6h","T-90m"]);
  expect(out.missingOrInvalidPreHorizons).toHaveLength(0);
 });
 it("refuses paid POST when no valid PRE, rather than buying unlinked labels",()=>{
  const out=auditP5FuturePostSourceEligibility(packet([]));
  expect(out.status).toBe("SKIP_POST_NO_VALID_SOURCE_BOUND_PRE_COUNT_MISSINGNESS");
  expect(out.eligiblePreHorizonCount).toBe(0);
  expect(out.missingOrInvalidPreHorizons).toHaveLength(3);
 });
 it("tolerates one invalid/late PRE only as explicit missingness; other real PRE survives",()=>{
  const invalid={...pre("T-24h"),
   sourceAvailableAtUtc:t(-23*3600000)};
  const out=auditP5FuturePostSourceEligibility(
   packet([invalid,pre("T-90m")]));
  expect(out.status).toBe(
   "PARTIAL_VALID_PRE_REVIEWABLE_FOR_FUTURE_POST_NO_DISPATCH");
  expect(out.validPreHorizons).toEqual(["T-90m"]);
  expect(out.missingOrInvalidPreHorizons[0].reason)
   .toBe("PRE_PROVENANCE_OR_CLOCK_NOT_VALID_FOR_THIS_HORIZON");
  expect(out.originalPreAndPostDataMustRemainInSamePartition).toBe(true);
 });
 it("does not treat conditional scheduled-service POST as a physical operating leg",()=>{
  const x=packet();
  x.identityTier="CONDITIONAL_QUERY_FILTERED_SERVICE";
  x.preObservedHorizonRecords[0].identityTier=x.identityTier;
  const out=auditP5FuturePostSourceEligibility(x);
  expect(out.status).toBe(
   "PARTIAL_VALID_PRE_REVIEWABLE_FOR_FUTURE_POST_NO_DISPATCH");
  expect(out.observedSourceDoesNotProvePhysicalOperatingLeg).toBe(true);
  expect(out.providerPhysicalActualTakeoffCertified).toBe(false);
 });
 it("refuses duplicate horizon and cross-service identity from a copied flight",()=>{
  const x=packet([pre("T-6h"),pre("T-6h")]);
  expect(()=>auditP5FuturePostSourceEligibility(x))
   .toThrow("UNTRUSTED_DUPLICATED_OR_CROSS_FLIGHT_PRE_METADATA");
  const y=packet([{...pre("T-6h"),flightStableIdentitySha256:sh("9")}]);
  expect(()=>auditP5FuturePostSourceEligibility(y))
   .toThrow("UNTRUSTED_DUPLICATED_OR_CROSS_FLIGHT_PRE_METADATA");
 });
 it("never reserves a second POST or backfills a missed future POST GET",()=>{
  const already=packet();already.postPaidGetAlreadyReserved=true;
  expect(auditP5FuturePostSourceEligibility(already).status)
   .toBe("ALREADY_RESERVED_POST_NO_SECOND_PAID_GET");
  const late=packet();
  late.readonlyReviewClockUtc=t(2*3600000+10*60000);
  expect(auditP5FuturePostSourceEligibility(late).status)
   .toBe("MISSED_POST_OBSERVATION_WINDOW_NO_RETROACTIVE_GET");
 });
 it("rejects changed original source range, unreviewed followup and leak of TEST outcome",()=>{
  const a=packet();a.sourceProviderRangeToUtc=t(-1000);
  expect(()=>auditP5FuturePostSourceEligibility(a))
   .toThrow("POST_SCOPE_NOT_MATCHED_TO_ORIGINAL_SERVICE_WINDOW");
  const b=packet();b.reviewedFollowupEndUtc=t(30*60000);
  expect(()=>auditP5FuturePostSourceEligibility(b))
   .toThrow("POST_TIME_NOT_IN_REVIEWED_FUTURE_SOURCE_SCOPE");
  const c=packet();c.protectedTestOutcomeValuesRead=true;
  expect(()=>auditP5FuturePostSourceEligibility(c))
   .toThrow("INVALID_SCOPE_OR_TEST_PEEK_OR_BUDGET_STATE");
 });
 it("uses actual UTC physical charge day, not the 31-day sample index",()=>{
  const x=packet();
  x.postObservationPlannedUtc="2027-02-03T00:00:00.000Z";
  x.hardLatestPostSourceDispatchUtc="2027-02-03T00:10:00.000Z";
  x.reviewedFollowupEndUtc="2027-02-03T00:20:00.000Z";
  const out=auditP5FuturePostSourceEligibility(x);
  expect(out.physicalRestChargeDayUtc).toBe("2027-02-03");
  expect(out.runDayIndex).toBe(1);
  expect(out.reviewedBudgetAndSevenRESTCategoriesCertified).toBe(false);
 });
 it("rejects source observed after cutoff even if PRE was committed on time",()=>{
  const x=packet([{...pre("T-6h"),
   sourceAvailableAtUtc:t(-5*3600000)}]);
  const out=auditP5FuturePostSourceEligibility(x);
  expect(out.validPreHorizons).toEqual([]);
  expect(out.missingOrInvalidPreHorizons[1].reason)
   .toBe("PRE_PROVENANCE_OR_CLOCK_NOT_VALID_FOR_THIS_HORIZON");
 });
});
