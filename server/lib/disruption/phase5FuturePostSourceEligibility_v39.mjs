/**
 * Phase5: reusable future-date target-NEUTRAL POST source eligibility audit.
 *
 * Unlike the historical Nov5 WSSS-only POST owner, this reviewer never
 * requires exactly all three PREs. One genuinely observed, source-backed,
 * on-time flight PRE can justify independent consideration of a later source
 * observation, while missing/invalid horizons stay explicitly missing.
 *
 * Pure nonpaid evidence check; the caller's original/identity/PRE assertions
 * must be independently authenticated against restricted PostgreSQL. It does
 * not issue an API request, reserve REST units, perform a POST, accept
 * provider Contents rights, infer physical actual labels, or grant Phase6 GO.
 */
export const P5_FUTURE_POST_PARTIAL_PRE_SCHEMA=
 "v39.phase5.future-post-source-partial-pre-eligibility.v1";
const SHA=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const ICAO=/^[A-Z]{4}$/;
const HORIZONS=["T-24h","T-6h","T-90m"];
const OFFSET={"T-24h":24*3600000,"T-6h":6*3600000,
 "T-90m":90*60000};
const TIERS=["PROVIDER_NATIVE_OPERATING_LEG",
 "CONDITIONAL_QUERY_FILTERED_SERVICE"];
const refuse=code=>{throw Error("REFUSED_P5_FUTURE_POST_"+code);};
const time=s=>{
 if(typeof s!=="string"||!UTC.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)
  refuse("INVALID_CANONICAL_UTC");
 return Date.parse(s);
};
function base(status,x,extra={}){
 return{
  schema:"v39.phase5.future-post-source-partial-pre-audit-only.v1",
  status,manifestSha256:x.manifestSha256,
  runDayIndex:x.runDayIndex,slot:x.slot,airportIcao:x.airportIcao,
  identityTier:x.identityTier,
  postObservationPlannedUtc:x.postObservationPlannedUtc,
  physicalRestChargeDayUtc:x.postObservationPlannedUtc.slice(0,10),
  ...extra,
  originalAndPREIndependentlyAuthenticatedByThisFunction:false,
  reviewedBudgetAndSevenRESTCategoriesCertified:false,
  providerContentsSourceRightsAndTTLApproved:false,
  providerPhysicalActualTakeoffCertified:false,
  missingPreOrPostMeansFlightOnTime:false,
  missingPreOrPostMeansNoCancellation:false,
  eligibleForFutureScienceWithoutRewritingOriginals:true,
  noNewSourceOrPOSTPaidRequestWithoutSeparateRelease:true,
  sourceOriginalOrPOSTOutcomeObservedByThisFunction:false,
  futureGithubDispatchAllowed:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
 };
}
/**
 * x.preObservedHorizonRecords contains only POSITIVELY preserved metadata
 * references, one row per attempted PRE horizon (no raw flight responses).
 * Missing horizons need not have records. Invalid PREs contribute to quality
 * denominators but are NOT silently promoted to valid as-of features.
 */
export function auditP5FuturePostSourceEligibility(x){
 if(!x||x.schema!==P5_FUTURE_POST_PARTIAL_PRE_SCHEMA||
    !SHA.test(x.manifestSha256??"")||
    !SHA.test(x.calendarSha256??"")||
    !SHA.test(x.savedEarlyDrawSha256??"")||
    !SHA.test(x.sourceScopeSha256??"")||
    !SHA.test(x.flightStableIdentitySha256??"")||
    !TIERS.includes(x.identityTier)||
    !["HUB","MID_A","MID_B","REGIONAL"].includes(x.slot)||
    !ICAO.test(x.airportIcao??"")||
    !Number.isSafeInteger(x.runDayIndex)||
    x.runDayIndex<1||x.runDayIndex>31||
    !Array.isArray(x.preObservedHorizonRecords)||
    x.preObservedHorizonRecords.length>3||
    x.protectedTestOutcomeValuesRead!==false||
    x.postPaidGetAlreadyReserved!==false&&
    x.postPaidGetAlreadyReserved!==true)
  refuse("INVALID_SCOPE_OR_TEST_PEEK_OR_BUDGET_STATE");
 const t=time(x.reviewedNativeMilestoneUtc),
  post=time(x.postObservationPlannedUtc),
  due=time(x.hardLatestPostSourceDispatchUtc),
  observed=time(x.readonlyReviewClockUtc),
  followupStart=time(x.reviewedFollowupStartUtc),
  followupEnd=time(x.reviewedFollowupEndUtc);
 if(followupStart>followupEnd||post<followupStart||
    post>followupEnd||post<t||due<post||
    observed>due||x.sourceProviderRangeFromUtc===undefined||
    x.sourceProviderRangeToUtc===undefined)
  refuse("POST_TIME_NOT_IN_REVIEWED_FUTURE_SOURCE_SCOPE");
 const from=time(x.sourceProviderRangeFromUtc),
  to=time(x.sourceProviderRangeToUtc);
 if(from>=to||to-from>86400000||t<from||t>=to)
  refuse("POST_SCOPE_NOT_MATCHED_TO_ORIGINAL_SERVICE_WINDOW");
 const preByHorizon=new Map();
 for(const p of x.preObservedHorizonRecords){
  if(!p||!HORIZONS.includes(p.horizon)||
     preByHorizon.has(p.horizon)||
     !SHA.test(p.sourceResponseSha256??"")||
     !SHA.test(p.committedPreSnapshotSha256??"")||
     !SHA.test(p.sourceQueryDigestSha256??"")||
     p.identityTier!==x.identityTier||
     p.flightStableIdentitySha256!==x.flightStableIdentitySha256)
   refuse("UNTRUSTED_DUPLICATED_OR_CROSS_FLIGHT_PRE_METADATA");
  const cutoff=time(p.predictionCutoffUtc),
   available=time(p.sourceAvailableAtUtc),
   committed=time(p.preCommittedAtUtc),
   pT=time(p.selectedNativeMilestoneUtc),
   sourceExpired=time(p.sourceContentsExpiresAtUtc);
  const expected=t-OFFSET[p.horizon];
  // A source record might have been collected at a different pre-horizon
  // and be late for this horizon: account for it, do not fake a PRE.
  const valid=pT===t&&cutoff===expected&&
   available<=cutoff&&committed<=cutoff&&
   committed>=available&&committed<sourceExpired&&
   p.sourceCommitAfterOriginalPersisted===true&&
   p.savedToDatabaseBeforeCutoff===true;
  preByHorizon.set(p.horizon,{horizon:p.horizon,valid,
   reason:valid?"SOURCE_BACKED_PROSPECTIVE_PRE":
    "PRE_PROVENANCE_OR_CLOCK_NOT_VALID_FOR_THIS_HORIZON"});
 }
 const horizons=HORIZONS.map(h=>preByHorizon.get(h)??{
  horizon:h,valid:false,reason:"HORIZON_NOT_OBSERVED"
 });
 const valid=horizons.filter(z=>z.valid).map(z=>z.horizon);
 const missed=horizons.filter(z=>!z.valid)
   .map(z=>({horizon:z.horizon,reason:z.reason}));
 const common={
  validPreHorizons:valid,missingOrInvalidPreHorizons:missed,
  eligiblePreHorizonCount:valid.length,
  expectedPreHorizonCount:3,
  observedSourceDoesNotProvePhysicalOperatingLeg:
   x.identityTier==="CONDITIONAL_QUERY_FILTERED_SERVICE",
  originalPreAndPostDataMustRemainInSamePartition:true,
  sourceScopeMustBeExternallyVerified:true,
  originalPREChecksMustBeReplayedOnActualDatabaseClock:true,
  postOriginalWriteAndReservationMustBeAtomicAndIndependentlyVerified:true
 };
 if(x.postPaidGetAlreadyReserved===true)
  return base("ALREADY_RESERVED_POST_NO_SECOND_PAID_GET",x,common);
 if(valid.length===0)
  return base("SKIP_POST_NO_VALID_SOURCE_BOUND_PRE_COUNT_MISSINGNESS",x,common);
 if(observed>post)
  return base("MISSED_POST_OBSERVATION_WINDOW_NO_RETROACTIVE_GET",x,common);
 return base(valid.length===3?
  "ALL_THREE_PRE_REVIEWABLE_FOR_FUTURE_POST_NO_DISPATCH":
  "PARTIAL_VALID_PRE_REVIEWABLE_FOR_FUTURE_POST_NO_DISPATCH",
  x,{...common,onePostSourceObservationMayCoverMultipleFlightServices:true});
}
