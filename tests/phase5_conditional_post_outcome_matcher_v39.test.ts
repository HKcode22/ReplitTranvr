import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
 matchP5PreservedPreToSeparatedPostOutcomes,
 type P5PreservedPreOutcomeAnchor,
 type P5OutcomeEvidence
} from "../server/lib/disruption/phase5ConditionalPostOutcomeMatcher_v39";

const sha=(x:string|Buffer)=>createHash("sha256").update(x).digest("hex");
const makeKey=()=>{
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 return {
  privateKey,
  pem:publicKey.export({type:"spki",format:"pem"}).toString(),
  fp:sha(publicKey.export({type:"spki",format:"der"}) as Buffer)
 };
};

describe("P0-E (F029/F042) separated native physical gate-out and conditional schedule-revision POST outcome matcher",()=>{
 const manifest=sha("manifest"),protocol=sha("protocol"),rights=sha("rights"),svcHash=sha("cond-service-1");
 const condId="leg:g5a:"+svcHash;
 const nativeId="leg:p5v1:"+sha("native-leg-1");
 const preKey=makeKey(),postKey=makeKey();
 const policyBytes=Buffer.from(JSON.stringify({
  schema:"v39.phase5.conditional-schedule-pair-policy.v1",
  manifestSha256:manifest,protocolSha256:protocol,rightsSha256:rights,
  effectiveUtc:"2026-11-29T00:00:00.000Z",expiresUtc:"2026-12-28T00:00:00.000Z",
  preSignerSpkiSha256:preKey.fp,postSignerSpkiSha256:postKey.fp,
  endpoint:"PROVIDER_SCHEDULE_REVISION_ABS_GE_15_MIN",approvedSeparateTier:true
 }));
 const trust={policyBytes,expectedPolicySha256:sha(policyBytes),preSignerPublicKeyPem:preKey.pem,postSignerPublicKeyPem:postKey.pem};
 const signWire=(obj:unknown,key:typeof preKey)=>{
  const body=Buffer.from(JSON.stringify(obj),"utf8");
  return {bodyBase64:body.toString("base64"),signatureBase64:sign(null,body,key.privateKey).toString("base64")};
 };

 it("matches native physical gate-out and conditional schedule revision in strictly separated lanes without substituting estimates",()=>{
  const anchors:P5PreservedPreOutcomeAnchor[]=[
   {flightInstanceId:nativeId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",runDayIndex:5,slot:"HUB",horizon:"T-24h",preSnapshotId:"1001",phase7FragmentRowId:"11111111-1111-4111-8111-111111111101",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:"2026-11-29T15:58:00.000Z",predictionCutoffUtc:"2026-11-29T16:00:00.000Z"},
   {flightInstanceId:nativeId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",runDayIndex:5,slot:"HUB",horizon:"T-6h",preSnapshotId:"1002",phase7FragmentRowId:"11111111-1111-4111-8111-111111111102",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",predictionCutoffUtc:"2026-11-30T10:00:00.000Z"},
   {flightInstanceId:nativeId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",runDayIndex:5,slot:"HUB",horizon:"T-90m",preSnapshotId:"1003",phase7FragmentRowId:"11111111-1111-4111-8111-111111111103",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:"2026-11-30T14:28:00.000Z",predictionCutoffUtc:"2026-11-30T14:30:00.000Z"},
   {flightInstanceId:condId,identityTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",runDayIndex:5,slot:"MID_A",horizon:"T-6h",preSnapshotId:"2001",phase7FragmentRowId:"22222222-2222-4222-8222-222222222201",phase7GroupId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",predictionCutoffUtc:"2026-11-30T10:00:00.000Z"},
   {flightInstanceId:condId,identityTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",runDayIndex:5,slot:"MID_A",horizon:"T-90m",preSnapshotId:"2002",phase7FragmentRowId:"22222222-2222-4222-8222-222222222202",phase7GroupId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",preIssuedAtUtc:"2026-11-30T14:28:00.000Z",predictionCutoffUtc:"2026-11-30T14:30:00.000Z"}
  ];
  const preIssueSha=sha("pre-issue-receipt");
  const condPre={schema:"v39.phase5.conditional-schedule-receipt.v1",lane:"PRE",manifestSha256:manifest,protocolSha256:protocol,rightsSha256:rights,runDayIndex:5,serviceKey:condId,operatorFlightNumber:"SQ101",originIcao:"WSSS",destinationIcao:"OMAA",sourceQueryId:"33333333-3333-4333-8333-333333333301",sourceResponseSha256:sha("pre-resp"),sourceBodySha256:sha("pre-body"),sourceAvailableUtc:"2026-11-30T09:55:00.000Z",sourceExpiresUtc:"2026-12-01T08:00:00.000Z",sourcePlannedUtc:"2026-11-30T09:45:00.000Z",reviewedAtUtc:"2026-11-30T09:56:00.000Z",scheduledDepartureUtc:"2026-11-30T16:00:00.000Z",firstScheduledDepartureUtc:"2026-11-30T16:00:00.000Z",horizon:"T-6h",preIssueReceiptSha256:preIssueSha,preIssuedUtc:"2026-11-30T09:58:00.000Z",postReservationSha256:null,positiveOperatorUnique:true,nativeOperatingLegCertified:false};
  const condPost={...condPre,lane:"POST",sourceQueryId:"33333333-3333-4333-8333-333333333302",sourceResponseSha256:sha("post-resp"),sourceBodySha256:sha("post-body"),sourcePlannedUtc:"2026-11-30T17:00:00.000Z",sourceAvailableUtc:"2026-11-30T17:05:00.000Z",sourceExpiresUtc:"2026-12-01T15:00:00.000Z",reviewedAtUtc:"2026-11-30T18:05:00.000Z",scheduledDepartureUtc:"2026-11-30T16:25:00.000Z",postReservationSha256:sha("post-res")};
  const outcomes:P5OutcomeEvidence[]=[
   {tier:"PROVIDER_NATIVE_OPERATING_LEG",flightInstanceId:nativeId,runDayIndex:5,gateOutInput:{
    schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1",frozenSourceOriginalSha256:sha("native-src"),flightInstanceId:nativeId,horizon:"T-6h",selectedNativeTUtc:"2026-11-30T16:00:00.000Z",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",originalSourceAvailableAtUtc:"2026-11-30T09:55:00.000Z",operatingLegIdentityExternallyVerified:true,
    scheduled:{utc:"2026-11-30T16:00:00.000Z",milestone:"SCHEDULED_GATE_OUT",externallyVerifiedGateOutMeaning:true,evidenceSha256:sha("sched-ev")},
    outcome:{operation:"OPERATED",event:"ACTUAL_GATE_OUT",actualUtc:"2026-11-30T16:22:00.000Z",firstAvailableAtUtc:"2026-11-30T16:25:00.000Z",externallyVerifiedActualOnly:true,evidenceSha256:sha("act-ev"),recoveryGraceElapsed:true}
   }},
   {tier:"CONDITIONAL_QUERY_FILTERED_SERVICE",flightInstanceId:condId,runDayIndex:5,trust,preWire:signWire(condPre,preKey),postWire:signWire(condPost,postKey),dbObservedUtc:"2026-11-30T18:10:00.000Z"}
  ];
  const res=matchP5PreservedPreToSeparatedPostOutcomes(anchors,outcomes);
  expect(res.nativeAndConditionalOutcomesStrictlySeparated).toBe(true);
  expect(res.scheduleRevisionNeverSubstitutedForPhysicalGateOut).toBe(true);
  expect(res.coverage.totalDistinctLegs).toBe(2);
  expect(res.coverage.observedNativePhysicalGateOut).toBe(1);
  expect(res.coverage.observedConditionalScheduleRevisionOnly).toBe(1);
  expect(res.coverage.pairedT6T90).toBe(2);
  expect(res.coverage.fullT24T6T90Triple).toBe(1);
  const nativeLeg=res.matchedLegs.find(x=>x.flightInstanceId===nativeId)!;
  expect(nativeLeg.physicalGateOutCertified).toBe(true);
  expect(nativeLeg.candidatePhysicalDelayMinutes).toBe(22);
  const condLeg=res.matchedLegs.find(x=>x.flightInstanceId===condId)!;
  expect(condLeg.physicalGateOutCertified).toBe(false);
  expect(condLeg.conditionalScheduleRevisionOnly).toBe(true);
  expect(condLeg.candidatePhysicalDelayMinutes).toBeNull();
 });

 it("censors estimated/revised departure instead of substituting for actual physical gate-out and refuses cross-split or cross-tier leakage",()=>{
  const nativeAnchor:P5PreservedPreOutcomeAnchor={flightInstanceId:nativeId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",runDayIndex:5,slot:"HUB",horizon:"T-6h",preSnapshotId:"1002",phase7FragmentRowId:"11111111-1111-4111-8111-111111111102",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",predictionCutoffUtc:"2026-11-30T10:00:00.000Z"};
  const estOutcome:P5OutcomeEvidence={tier:"PROVIDER_NATIVE_OPERATING_LEG",flightInstanceId:nativeId,runDayIndex:5,gateOutInput:{
   schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1",frozenSourceOriginalSha256:sha("native-src"),flightInstanceId:nativeId,horizon:"T-6h",selectedNativeTUtc:"2026-11-30T16:00:00.000Z",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",originalSourceAvailableAtUtc:"2026-11-30T09:55:00.000Z",operatingLegIdentityExternallyVerified:true,
   scheduled:{utc:"2026-11-30T16:00:00.000Z",milestone:"SCHEDULED_GATE_OUT",externallyVerifiedGateOutMeaning:true,evidenceSha256:sha("sched-ev")},
   outcome:{operation:"OPERATED",event:"ESTIMATED_RUNWAY_OR_REVISED_SCHEDULE",actualUtc:"2026-11-30T16:22:00.000Z",firstAvailableAtUtc:"2026-11-30T16:25:00.000Z",externallyVerifiedActualOnly:false,evidenceSha256:sha("est-ev"),recoveryGraceElapsed:true}
  }};
  const censored=matchP5PreservedPreToSeparatedPostOutcomes([nativeAnchor],[estOutcome]);
  expect(censored.coverage.observedNativePhysicalGateOut).toBe(0);
  expect(censored.coverage.censoredPhysicalGateOutMissing).toBe(1);
  expect(censored.matchedLegs[0].physicalGateOutCertified).toBe(false);
  expect(censored.matchedLegs[0].candidatePhysicalDelayMinutes).toBeNull();
  // Cross-split leakage refused: same leg across day 20 (train) and day 21 (validation).
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
   {...nativeAnchor,runDayIndex:20,horizon:"T-24h"},
   {...nativeAnchor,runDayIndex:21,horizon:"T-6h"}
  ],[])).toThrow(/CROSS_DAY_SPLIT_TIER_OR_GROUP_LEAKAGE/);
  // Tier namespace mismatch refused.
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
   {...nativeAnchor,flightInstanceId:condId}
  ],[])).toThrow(/IDENTITY_TIER_NAMESPACE_MISMATCH/);
 });
});
