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
   {flightInstanceId:nativeId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",runDayIndex:5,slot:"HUB",horizon:"T-6h",preSnapshotId:"1002",phase7FragmentRowId:"11111111-1111-4111-8111-111111111102",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",predictionCutoffUtc:"2026-11-30T10:00:00.000Z",originalSourceResponseSha256:sha("native-src"),originalSourceAvailableAtUtc:"2026-11-30T09:55:00.000Z",selectedScheduledDepartureUtc:"2026-11-30T16:00:00.000Z"},
   {flightInstanceId:nativeId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",runDayIndex:5,slot:"HUB",horizon:"T-90m",preSnapshotId:"1003",phase7FragmentRowId:"11111111-1111-4111-8111-111111111103",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:"2026-11-30T14:28:00.000Z",predictionCutoffUtc:"2026-11-30T14:30:00.000Z"},
   {flightInstanceId:condId,identityTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",runDayIndex:5,slot:"MID_A",horizon:"T-6h",preSnapshotId:"2001",phase7FragmentRowId:"22222222-2222-4222-8222-222222222201",phase7GroupId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",predictionCutoffUtc:"2026-11-30T10:00:00.000Z",manifestSha256:manifest,preIssueReceiptSha256:sha("pre-issue-receipt"),originalSourceQueryId:"33333333-3333-4333-8333-333333333301",originalSourceResponseSha256:sha("pre-resp"),selectedScheduledDepartureUtc:"2026-11-30T16:00:00.000Z"},
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
  expect(res.coverage.observedNativePhysicalGateOut).toBe(0);
  expect(res.coverage.nativePhysicalCandidatesUncertified).toBe(1);
  expect(res.coverage.signedConditionalRevisionCandidatesUnverifiedAnchor).toBe(1);
  expect(res.productionAnchorReadbackVerified).toBe(false);
  expect(res.coverage.pairedT6T90).toBe(2);
  expect(res.coverage.fullT24T6T90Triple).toBe(1);
  const nativeLeg=res.matchedLegs.find(x=>x.flightInstanceId===nativeId)!;
  expect(nativeLeg.physicalGateOutCertified).toBe(false);
  expect(nativeLeg.classification).toBe("NATIVE_PHYSICAL_GATE_OUT_CANDIDATE_UNCERTIFIED");
  expect(nativeLeg.candidatePhysicalDelayMinutes).toBe(22);
  const condLeg=res.matchedLegs.find(x=>x.flightInstanceId===condId)!;
  expect(condLeg.physicalGateOutCertified).toBe(false);
  expect(condLeg.conditionalScheduleRevisionOnly).toBe(true);
  expect(condLeg.candidatePhysicalDelayMinutes).toBeNull();
  for(const change of [
   {flightInstanceId:"leg:g5a:"+sha("another-service")},
   {runDayIndex:6}, {preIssueReceiptSha256:sha("wrong-receipt")},
   {originalSourceResponseSha256:sha("wrong-source")},
   {selectedScheduledDepartureUtc:"2026-11-30T16:05:00.000Z"},
   {predictionCutoffUtc:"2026-11-30T10:01:00.000Z"},
   {phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"}
  ]){
   const changed=anchors.map(a=>a.preSnapshotId==="2001"?{...a,...change}:a);
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(changed,outcomes)).toThrow();
  }
 });

 it("censors estimated/revised departure instead of substituting for actual physical gate-out and refuses cross-split or cross-tier leakage",()=>{
  const nativeAnchor:P5PreservedPreOutcomeAnchor={flightInstanceId:nativeId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",runDayIndex:5,slot:"HUB",horizon:"T-6h",preSnapshotId:"1002",phase7FragmentRowId:"11111111-1111-4111-8111-111111111102",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:"2026-11-30T09:58:00.000Z",predictionCutoffUtc:"2026-11-30T10:00:00.000Z",originalSourceResponseSha256:sha("native-src"),originalSourceAvailableAtUtc:"2026-11-30T09:55:00.000Z"};
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
   {...nativeAnchor,runDayIndex:21,horizon:"T-6h",preSnapshotId:"1005",phase7FragmentRowId:"11111111-1111-4111-8111-111111111105"}
  ],[])).toThrow(/CROSS_DAY_SPLIT_TIER_OR_GROUP_LEAKAGE/);
  // Tier namespace mismatch refused.
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
   {...nativeAnchor,flightInstanceId:condId}
  ],[])).toThrow(/IDENTITY_TIER_NAMESPACE_MISMATCH/);
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
   nativeAnchor,{...nativeAnchor,flightInstanceId:"leg:p5v1:"+sha("another-leg"),horizon:"T-90m",preSnapshotId:"1004",phase7FragmentRowId:"11111111-1111-4111-8111-111111111104"}
  ],[])).toThrow(/GROUP_REUSED_ACROSS_FLIGHTS/);
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
   nativeAnchor,{...nativeAnchor,horizon:"T-90m"}
  ],[])).toThrow(/REUSED_PRE_OR_FRAGMENT_IDENTIFIER/);
 });
});

describe("T136 native POST binds the frozen PRE reference and original without certifying physical truth",()=>{
 function fixture(delayMinutes=22){
  const flightInstanceId="leg:p5v1:"+sha("T136 native operating leg");
  const selected="2026-11-30T16:00:00.000Z",available="2026-11-30T09:55:00.000Z";
  const anchor:P5PreservedPreOutcomeAnchor={flightInstanceId,identityTier:"PROVIDER_NATIVE_OPERATING_LEG",
   runDayIndex:5,slot:"HUB",horizon:"T-6h",preSnapshotId:"3102",
   phase7FragmentRowId:"33333333-3333-4333-8333-333333333302",phase7GroupId:"cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
   preIssuedAtUtc:"2026-11-30T09:58:00.000Z",predictionCutoffUtc:"2026-11-30T10:00:00.000Z",
   selectedScheduledDepartureUtc:selected,originalSourceResponseSha256:sha("T136 PRE original"),originalSourceAvailableAtUtc:available};
  const actual=Date.parse(selected)+delayMinutes*60000;
  const outcome:Extract<P5OutcomeEvidence,{tier:"PROVIDER_NATIVE_OPERATING_LEG"}>={tier:"PROVIDER_NATIVE_OPERATING_LEG",
   flightInstanceId,runDayIndex:5,gateOutInput:{schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1",
    frozenSourceOriginalSha256:anchor.originalSourceResponseSha256!,flightInstanceId,horizon:"T-6h",
    selectedNativeTUtc:selected,preIssuedAtUtc:anchor.preIssuedAtUtc,originalSourceAvailableAtUtc:available,
    operatingLegIdentityExternallyVerified:true,
    scheduled:{utc:selected,milestone:"SCHEDULED_GATE_OUT",externallyVerifiedGateOutMeaning:true,evidenceSha256:sha("T136 schedule observation")},
    outcome:{operation:"OPERATED",event:"ACTUAL_GATE_OUT",actualUtc:new Date(actual).toISOString(),
     firstAvailableAtUtc:new Date(actual+180000).toISOString(),externallyVerifiedActualOnly:true,
     evidenceSha256:sha("T136 distinct actual observation"),recoveryGraceElapsed:true}}};
  return {anchor,outcome};
 }

 function structuralPair(identityTier:P5PreservedPreOutcomeAnchor["identityTier"]){
  const {anchor}=fixture();
  const flightInstanceId=identityTier==="PROVIDER_NATIVE_OPERATING_LEG"?anchor.flightInstanceId:
   "leg:g5a:"+sha("T136 identity boundary conditional service");
  const first:P5PreservedPreOutcomeAnchor={...anchor,identityTier,flightInstanceId};
  const second:P5PreservedPreOutcomeAnchor={...first,horizon:"T-90m",preSnapshotId:"3103",
   phase7FragmentRowId:"33333333-3333-4333-8333-333333333303",
   preIssuedAtUtc:"2026-11-30T14:28:00.000Z",predictionCutoffUtc:"2026-11-30T14:30:00.000Z"};
  return [first,second] as const;
 }

 it("rejects nonprimitive PRE and Phase7 identities before cohort comparisons",()=>{
  for(const tier of ["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"] as const){
   const [first,second]=structuralPair(tier);
   for(const field of ["preSnapshotId","phase7FragmentRowId","phase7GroupId"] as const){
    const changed={...first,[field]:[first[field]] as unknown as string};
    for(const ordered of [[changed,second],[second,changed]])
     expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("INVALID_PRE_ANCHOR_SCOPE");
   }
   // Before I140's identity extension, separately allocated JSON arrays
   // bypassed Set membership and counted one reused PRE/fragment as a pair.
   const reused=[first,second].map(a=>({...a,preSnapshotId:[first.preSnapshotId] as unknown as string,
    phase7FragmentRowId:[first.phase7FragmentRowId] as unknown as string}));
   for(const ordered of [reused,[...reused].reverse()])
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("INVALID_PRE_ANCHOR_SCOPE");
   // JSON numbers and strings also name the same PRE but are distinct Set keys.
   const numeric={...second,preSnapshotId:Number(first.preSnapshotId) as unknown as string};
   for(const ordered of [[first,numeric],[numeric,first]])
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("INVALID_PRE_ANCHOR_SCOPE");
  }
 });

 it("still refuses primitive duplicate PRE or fragment identifiers in either input order",()=>{
  for(const tier of ["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"] as const){
   const [first,second]=structuralPair(tier);
   for(const field of ["preSnapshotId","phase7FragmentRowId"] as const){
    const reused={...second,[field]:first[field]};
    for(const ordered of [[first,reused],[reused,first]])
     expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("REUSED_PRE_OR_FRAGMENT_IDENTIFIER");
   }
  }
 });

 it("preserves one group per flight and rejects separately allocated shared-group aliases",()=>{
  for(const tier of ["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"] as const){
   const [first,second]=structuralPair(tier);
   const otherFlight={...second,flightInstanceId:(tier==="PROVIDER_NATIVE_OPERATING_LEG"?"leg:p5v1:":"leg:g5a:")+
    sha("T136 another flight in the same tier")};
   for(const ordered of [[first,otherFlight],[otherFlight,first]])
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("GROUP_REUSED_ACROSS_FLIGHTS");
   const arrays=[first,otherFlight].map(a=>({...a,phase7GroupId:[first.phase7GroupId] as unknown as string}));
   for(const ordered of [arrays,[...arrays].reverse()])
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("INVALID_PRE_ANCHOR_SCOPE");
   const otherGroup={...second,phase7GroupId:"dddddddd-dddd-4ddd-8ddd-ddddddddddd1"};
   for(const ordered of [[first,otherGroup],[otherGroup,first]])
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("CROSS_DAY_SPLIT_TIER_OR_GROUP_LEAKAGE");
  }
 });

 it("rejects alternate UUID hyphen positions that would evade fragment or group identity checks",()=>{
  const alias=(uuid:string)=>{
   const hex=uuid.replace(/-/g,"");
   return hex.slice(0,4)+"-"+hex.slice(4,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
  };
  for(const tier of ["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"] as const){
   const [first,second]=structuralPair(tier);
   const reusedFragment={...second,phase7FragmentRowId:alias(first.phase7FragmentRowId)};
   const reusedGroup={...second,flightInstanceId:(tier==="PROVIDER_NATIVE_OPERATING_LEG"?"leg:p5v1:":"leg:g5a:")+
    sha("T136 UUID group alias flight"),phase7GroupId:alias(first.phase7GroupId)};
   expect(reusedFragment.phase7FragmentRowId.replace(/-/g,"")).toBe(first.phase7FragmentRowId.replace(/-/g,""));
   expect(reusedGroup.phase7GroupId.replace(/-/g,"")).toBe(first.phase7GroupId.replace(/-/g,""));
   for(const reused of [reusedFragment,reusedGroup])
    for(const ordered of [[first,reused],[reused,first]])
     expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("INVALID_PRE_ANCHOR_SCOPE");
  }
 });

 it("retains valid distinct native and conditional pairs without restricting UUID versions or certifying readback",()=>{
  const native=structuralPair("PROVIDER_NATIVE_OPERATING_LEG").map((a,i)=>({...a,
   phase7FragmentRowId:"33333333-3333-0333-0333-33333333330"+(i+2),phase7GroupId:"cccccccc-cccc-0ccc-0ccc-ccccccccccc1"}));
  const conditional=structuralPair("CONDITIONAL_QUERY_FILTERED_SERVICE").map((a,i)=>({...a,
   preSnapshotId:String(4102+i),phase7FragmentRowId:"44444444-4444-f444-f444-44444444440"+(i+2),
   phase7GroupId:"dddddddd-dddd-fddd-fddd-ddddddddddd1"}));
  for(const ordered of [[...native,...conditional],[...conditional,...native].reverse()]){
   const r=matchP5PreservedPreToSeparatedPostOutcomes(ordered,[]);
   expect(r.coverage.totalDistinctLegs).toBe(2);expect(r.coverage.nativeLegs).toBe(1);
   expect(r.coverage.conditionalLegs).toBe(1);expect(r.coverage.pairedT6T90).toBe(2);
   expect(r.productionAnchorReadbackVerified).toBe(false);expect(r.coverage.observedNativePhysicalGateOut).toBe(0);
   for(const leg of r.matchedLegs)expect(leg.physicalGateOutCertified).toBe(false);
  }
 });

 it("rejects nonprimitive mandatory clocks without narrowing valid string serialization",()=>{
  for(const tier of ["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"] as const){
   const [anchor]=structuralPair(tier);
   // Absent optional metadata must not hide the mandatory clock boundary.
   const bare={...anchor,selectedScheduledDepartureUtc:undefined,
    originalSourceResponseSha256:undefined,originalSourceAvailableAtUtc:undefined};
   for(const field of ["preIssuedAtUtc","predictionCutoffUtc"] as const){
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
     {...bare,[field]:[bare[field]] as unknown as string}
    ],[])).toThrow("PRE_CUTOFF_INVARIANT_VIOLATED");
   }
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
    {...bare,preIssuedAtUtc:0 as unknown as string}
   ],[])).toThrow("PRE_CUTOFF_INVARIANT_VIOLATED");
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
    {...bare,preIssuedAtUtc:0 as unknown as string,predictionCutoffUtc:0 as unknown as string}
   ],[])).toThrow("PRE_CUTOFF_INVARIANT_VIOLATED");
   const alternate={...bare,preIssuedAtUtc:"2026-11-30T09:58:00+00:00",predictionCutoffUtc:"2026-11-30T10:00:00+00:00"};
   const valid=matchP5PreservedPreToSeparatedPostOutcomes([alternate],[]);
   expect(valid.coverage.withT6Primary).toBe(1);expect(valid.productionAnchorReadbackVerified).toBe(false);
  }
 });

 it.each([-12,0,22])("preserves a correctly bound signed %s-minute candidate with no label or readback promotion",delay=>{
  const {anchor,outcome}=fixture(delay),r=matchP5PreservedPreToSeparatedPostOutcomes([anchor],[outcome]);
  expect(r.matchedLegs[0].candidatePhysicalDelayMinutes).toBe(delay);
  expect(r.matchedLegs[0].classification).toBe("NATIVE_PHYSICAL_GATE_OUT_CANDIDATE_UNCERTIFIED");
  expect(r.matchedLegs[0].physicalGateOutCertified).toBe(false);
  expect(r.productionAnchorReadbackVerified).toBe(false);
  expect(r.coverage.observedNativePhysicalGateOut).toBe(0);
  expect(r.providerCalls).toBe(0);expect(r.databaseWrites).toBe(0);expect(r.phase6PaidGo).toBe(false);
 });

 it("rejects a later reference substituted into an internally consistent native outcome",()=>{
  const {anchor,outcome}=fixture();
  // This previously produced 22 minutes despite the committed cutoff implying
  // 16:00Z. Both the revised reference and outcome are plausible in isolation.
  outcome.gateOutInput.selectedNativeTUtc="2026-11-30T17:00:00.000Z";
  outcome.gateOutInput.scheduled.utc="2026-11-30T17:00:00.000Z";
  outcome.gateOutInput.outcome.actualUtc="2026-11-30T17:22:00.000Z";
  outcome.gateOutInput.outcome.firstAvailableAtUtc="2026-11-30T17:25:00.000Z";
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([anchor],[outcome])).toThrow("NATIVE_OUTCOME_FROZEN_T_CUTOFF_DRIFT");
 });

 it("rejects cutoff drift even without an optional selected-time field, and rejects contradictory anchor metadata",()=>{
  const {anchor,outcome}=fixture();
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([
   {...anchor,selectedScheduledDepartureUtc:undefined,predictionCutoffUtc:"2026-11-30T10:01:00.000Z"}
  ],[outcome])).toThrow("NATIVE_OUTCOME_FROZEN_T_CUTOFF_DRIFT");
  for(const selectedScheduledDepartureUtc of ["2026-11-30T17:00:00.000Z","",[anchor.selectedScheduledDepartureUtc] as unknown as string])
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([{...anchor,selectedScheduledDepartureUtc}],[]))
    .toThrow("PRE_ANCHOR_FROZEN_T_CUTOFF_DRIFT");
 });

 it("rejects absent, substituted or nonprimitive source identity and a different source-availability clock",()=>{
  const {anchor,outcome}=fixture();
  for(const originalSourceResponseSha256 of [undefined,sha("another original")])
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([{...anchor,originalSourceResponseSha256}],[outcome]))
    .toThrow("NATIVE_OUTCOME_PRE_SOURCE_DRIFT");
  for(const originalSourceResponseSha256 of ["",[anchor.originalSourceResponseSha256] as unknown as string])
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([{...anchor,originalSourceResponseSha256}],[outcome]))
    .toThrow("PRE_ANCHOR_SOURCE_DIGEST_INVALID");
  const changed=fixture();changed.outcome.gateOutInput.frozenSourceOriginalSha256=sha("unrelated frozen source");
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([changed.anchor],[changed.outcome])).toThrow("NATIVE_OUTCOME_PRE_SOURCE_DRIFT");
  for(const originalSourceAvailableAtUtc of [undefined,"2026-11-30T09:56:00.000Z"])
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([{...anchor,originalSourceAvailableAtUtc}],[outcome]))
    .toThrow("NATIVE_OUTCOME_PRE_SOURCE_AVAILABLE_CLOCK_DRIFT");
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([{...anchor,originalSourceAvailableAtUtc:"invalid"}],[outcome]))
   .toThrow("PRE_ANCHOR_SOURCE_AVAILABLE_CLOCK_INVALID");
  const clock=fixture();clock.outcome.gateOutInput.originalSourceAvailableAtUtc="2026-11-30T09:56:00.000Z";
  expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([clock.anchor],[clock.outcome]))
   .toThrow("NATIVE_OUTCOME_PRE_SOURCE_AVAILABLE_CLOCK_DRIFT");
 });

 it("counts a consistent three-horizon group but rejects a different frozen time in either identity tier",()=>{
  const {anchor,outcome}=fixture();
  const t24:P5PreservedPreOutcomeAnchor={...anchor,horizon:"T-24h",preSnapshotId:"3101",
   phase7FragmentRowId:"33333333-3333-4333-8333-333333333301",preIssuedAtUtc:"2026-11-29T15:58:00.000Z",
   predictionCutoffUtc:"2026-11-29T16:00:00.000Z",originalSourceResponseSha256:sha("T136 distinct T24 original"),
   originalSourceAvailableAtUtc:"2026-11-29T15:55:00.000Z"};
  const t90:P5PreservedPreOutcomeAnchor={...anchor,horizon:"T-90m",preSnapshotId:"3103",
   phase7FragmentRowId:"33333333-3333-4333-8333-333333333303",preIssuedAtUtc:"2026-11-30T14:28:00.000Z",
   predictionCutoffUtc:"2026-11-30T14:30:00.000Z",originalSourceResponseSha256:sha("T136 distinct T90 original"),
   originalSourceAvailableAtUtc:"2026-11-30T14:25:00.000Z"};
  const valid=matchP5PreservedPreToSeparatedPostOutcomes([t24,anchor,t90],[outcome]);
  expect(valid.coverage.pairedT6T90).toBe(1);expect(valid.coverage.fullT24T6T90Triple).toBe(1);
  for(const identityTier of ["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"] as const){
   const flightInstanceId=identityTier==="PROVIDER_NATIVE_OPERATING_LEG"?anchor.flightInstanceId:"leg:g5a:"+sha("T136 separate conditional service");
   const first={...anchor,identityTier,flightInstanceId};
   for(const sibling of [{...t90,predictionCutoffUtc:"2026-11-30T15:30:00.000Z"},
    {...t24,predictionCutoffUtc:"2026-11-29T17:00:00.000Z"}]){
    const drifted={...sibling,identityTier,flightInstanceId,selectedScheduledDepartureUtc:undefined};
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([first,drifted],[])).toThrow("CROSS_HORIZON_FROZEN_T_DRIFT");
    expect(()=>matchP5PreservedPreToSeparatedPostOutcomes([drifted,first],[])).toThrow("CROSS_HORIZON_FROZEN_T_DRIFT");
   }
  }
 });

 it("rejects contradictory present source evidence at every horizon in either tier and input order",()=>{
  const {anchor}=fixture();
  const anchors:P5PreservedPreOutcomeAnchor[]=[
   {...anchor,horizon:"T-24h",preSnapshotId:"3101",phase7FragmentRowId:"33333333-3333-4333-8333-333333333301",
    preIssuedAtUtc:"2026-11-29T15:58:00.000Z",predictionCutoffUtc:"2026-11-29T16:00:00.000Z",
    originalSourceResponseSha256:sha("T136 chronological T24 original")},
   anchor,
   {...anchor,horizon:"T-90m",preSnapshotId:"3103",phase7FragmentRowId:"33333333-3333-4333-8333-333333333303",
    preIssuedAtUtc:"2026-11-30T14:28:00.000Z",predictionCutoffUtc:"2026-11-30T14:30:00.000Z",
    originalSourceResponseSha256:sha("T136 chronological T90 original")}
  ];
  for(const identityTier of ["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"] as const){
   const flightInstanceId=identityTier==="PROVIDER_NATIVE_OPERATING_LEG"?anchor.flightInstanceId:"leg:g5a:"+sha("T136 chronological conditional service");
   const scoped=anchors.map(a=>({...a,identityTier,flightInstanceId,originalSourceAvailableAtUtc:a.preIssuedAtUtc}));
   for(const ordered of [scoped,[...scoped].reverse()]){
    // Availability exactly at PRE is admissible supplied metadata; it does
    // not authenticate the original or promote structural coverage to truth.
    const valid=matchP5PreservedPreToSeparatedPostOutcomes(ordered,[]);
    expect(valid.coverage.fullT24T6T90Triple).toBe(1);
    expect(valid.productionAnchorReadbackVerified).toBe(false);
    const absent=ordered.map(a=>({...a,originalSourceResponseSha256:undefined,originalSourceAvailableAtUtc:undefined}));
    expect(matchP5PreservedPreToSeparatedPostOutcomes(absent,[]).coverage.fullT24T6T90Triple).toBe(1);
   }
   for(let i=0;i<scoped.length;i++){
    const a=scoped[i];
    const badClocks=[new Date(Date.parse(a.preIssuedAtUtc)+1).toISOString(),
     new Date(Date.parse(a.predictionCutoffUtc)+1).toISOString(),"invalid","",null,[a.preIssuedAtUtc]];
    for(const originalSourceAvailableAtUtc of badClocks){
     const changed=scoped.map((x,j)=>j===i?{...x,originalSourceAvailableAtUtc:originalSourceAvailableAtUtc as unknown as string}:x);
     for(const ordered of [changed,[...changed].reverse()])
      expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("PRE_ANCHOR_SOURCE_AVAILABLE_CLOCK_INVALID");
    }
    for(const originalSourceResponseSha256 of ["","malformed",null,[a.originalSourceResponseSha256]]){
     const changed=scoped.map((x,j)=>j===i?{...x,originalSourceResponseSha256:originalSourceResponseSha256 as unknown as string}:x);
     for(const ordered of [changed,[...changed].reverse()])
      expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(ordered,[])).toThrow("PRE_ANCHOR_SOURCE_DIGEST_INVALID");
    }
   }
  }
 });
});

