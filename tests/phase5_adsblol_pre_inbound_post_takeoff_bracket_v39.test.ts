import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {
 normalizeGate05AdsbLolOfflineV39
} from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {
 assessP5AdsbInboundAsOfPreV39,
 assessP5AdsbPostTakeoffBracketV39,
 type P5AdsbPreInboundContextInputV39,
 type P5AdsbPostBracketInputV39
} from "../server/lib/disruption/phase5AdsbLolCrossPhaseRotationEvidence_v39";
import {
 assessP4Gate5DualSourceAdsbV39
} from "../server/lib/disruption/phase4Gate5DualSourceAdsbAdmission_v39";
import {
 assessP5ETailAsOfTurnCandidate
} from "../server/lib/disruption/phase5AmendmentETailChainAsOfCandidate_v39";

const H=n=>n.repeat(64);
const sha=H("a");
function point(receivedAtUtc:string,ground:boolean,hex="abc123"){
 return normalizeGate05AdsbLolOfflineV39({
  now:Date.parse(receivedAtUtc),
  ac:[{hex,flight:"SIA123",lat:1.36,lon:103.99,
   seen_pos:2,type:"adsb_icao",
   alt_baro:ground?"ground":3000,gs:ground?5:180}]
 },receivedAtUtc).points[0];
}
const source={
 adsbSourceAndODbLReviewed:true,
 reviewedODbLAttributionAndDerivedDataPolicySha256:H("3"),
 liveAPIProductionAccessApproved:false,
 originalAeroDataBoxUseRightsReviewed:true
};
const outbound={
 operatingLegId:"ADB-PHYSICAL-OUTBOUND-2027-0001",
 originIcao:"WSSS",destinationIcao:"YSSY",
 exactAeroDataBoxOperatingLegReviewed:true,
 originalAeroDataBoxResponseSha256:sha,
 tailRegistration:"9VABC",
 tailAssignmentAsOfUtc:"2027-01-02T06:00:00.000Z",
 aircraftIcao24Hex:"abc123",
 aircraftLinkIndependentlyReviewed:true,
 aircraftSwapOrConflict:false
};
const inbound={
 ...outbound,operatingLegId:"ADB-PHYSICAL-INBOUND-2027-0000",
 originIcao:"OMAA",destinationIcao:"WSSS",
 originalAeroDataBoxResponseSha256:H("b")
};
const pre:P5AdsbPreInboundContextInputV39={
 flightInstanceId:"v39-ADB-ORIGINAL-000001",
 horizon:"T-6h",
 selectedNativeTUtc:"2027-01-02T14:00:00.000Z",
 cutoffUtc:"2027-01-02T08:00:00.000Z",
 issuedAtUtc:"2027-01-02T07:59:00.000Z",
 current:outbound,inbound,
 inboundPosition:point("2027-01-02T07:58:10.000Z",false),
 source,
 offlineResearchSourceProvenanceIndependentlyReviewed:true
};
const post:P5AdsbPostBracketInputV39={
 departing:outbound,
 lastGround:point("2027-01-02T14:10:02.000Z",true),
 firstAirborne:point("2027-01-02T14:15:02.000Z",false),
 reviewedAtUtc:"2027-01-02T14:20:00.000Z",
 source,
 departureAirportTrackGeometryIndependentlyReviewed:true
};
describe("ADSB.lol three-source Phase5 Amendment E PRE / AIRBORNE / POST without source substitution",()=>{
 it("PRE: independently linked incoming same aircraft can supply as-of position context, not gate-in or turnaround",()=>{
  const r=assessP5AdsbInboundAsOfPreV39(pre);
  expect(r.eligible).toBe(true);
  expect(r.reason).toBeNull();
  expect(r.incomingGroundState).toBe("NOT_GROUND_REPORTED");
  expect(r.availablePositionAgeAtIssueSeconds).toBe(52);
  expect(r.eligibleForAutomaticExistingTurnaroundMinutesFeature).toBe(false);
  expect(r.priorActualGateInUtc).toBeNull();
  expect(r.priorAirborneEtaUtc).toBeNull();
  expect(r.originalAeroDataBoxPreReplaced).toBe(false);
  expect(r.actualStage14PreFeatureWritten).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
  expect(r.providerHttpRequests).toBe(0);
  expect(r.databaseWrites).toBe(0);
  const summary=JSON.stringify(r);
  for(const secret of ["abc123","SIA123","9VABC","103.99"])
   expect(summary).not.toContain(secret);
 });
 it("PRE: requires same independently reviewed tail, ICAO24, airport and unique operating legs",()=>{
  for(const p of [
   {...pre,inbound:{...inbound,tailRegistration:"9VDIFF"}},
   {...pre,inbound:{...inbound,aircraftIcao24Hex:"f0f0f0"}},
   {...pre,inbound:{...inbound,destinationIcao:"OMAA"}},
   {...pre,inbound:{...inbound,aircraftSwapOrConflict:true}},
   {...pre,inbound:{...inbound,exactAeroDataBoxOperatingLegReviewed:false}},
   {...pre,inbound:{...inbound,operatingLegId:outbound.operatingLegId}},
   {...pre,inboundPosition:{...pre.inboundPosition!,icao24Hex:"111111"}},
  ])expect(assessP5AdsbInboundAsOfPreV39(p).eligible).toBe(false);
 });
 it("PRE: late receipt, stale position, late tail assignment and unverified ODbL all remain missing",()=>{
  const late=point("2027-01-02T08:00:10.000Z",false);
  expect(assessP5AdsbInboundAsOfPreV39({
   ...pre,inboundPosition:late
  }).reason).toBe("POSITION_RECEIVED_AFTER_PRE_ISSUE");
  expect(assessP5AdsbInboundAsOfPreV39({
   ...pre,inboundPosition:point("2027-01-02T07:20:00.000Z",false)
  }).reason).toBe("POSITION_STALE_FOR_PRE");
  expect(assessP5AdsbInboundAsOfPreV39({
   ...pre,inbound:{...inbound,tailAssignmentAsOfUtc:"2027-01-02T08:05:00.000Z"}
  }).reason).toBe("UNREVIEWED_OR_AMBIGUOUS_PHYSICAL_LEG");
  expect(assessP5AdsbInboundAsOfPreV39({
   ...pre,source:{...source,adsbSourceAndODbLReviewed:false}
  }).reason).toBe("UNREVIEWED_SOURCE_RIGHTS_OR_PRODUCTION_API");
  expect(assessP5AdsbInboundAsOfPreV39({...pre,inboundPosition:null})
   .reason).toBe("NO_POSITION");
 });
 it("PRE: protects exact 24h/6h/90m clock and source image cannot fabricate actual gate event",()=>{
  const t24=(x:P5AdsbPreInboundContextInputV39)=>
   assessP5AdsbInboundAsOfPreV39(x);
  expect(t24({...pre,horizon:"T-24h",cutoffUtc:"2027-01-01T14:00:00.000Z",
   issuedAtUtc:"2027-01-01T13:59:00.000Z",
   inboundPosition:point("2027-01-01T13:58:50.000Z",false)}).reason)
    .toBe("UNREVIEWED_OR_AMBIGUOUS_PHYSICAL_LEG");
  expect(t24({...pre,horizon:"T-24h",
   cutoffUtc:"2027-01-01T14:00:00.000Z",
   issuedAtUtc:"2027-01-01T13:59:00.000Z",
   current:{...outbound,tailAssignmentAsOfUtc:"2027-01-01T09:00:00.000Z"},
   inbound:{...inbound,tailAssignmentAsOfUtc:"2027-01-01T09:00:00.000Z"},
   inboundPosition:point("2027-01-01T13:58:50.000Z",false)
  }).eligible).toBe(true);
  expect(t24({...pre,horizon:"T-90m",cutoffUtc:"2027-01-02T12:30:00.000Z",
   issuedAtUtc:"2027-01-02T12:29:00.000Z",
   inboundPosition:point("2027-01-02T12:28:55.000Z",false)}).eligible).toBe(true);
  expect(()=>t24({...pre,issuedAtUtc:"2027-01-02T08:00:01.000Z"}))
   .toThrow("PRE_NOT_ISSUED_WITHIN_ORIGINAL_FROZEN_HORIZON");
  expect(()=>t24({...pre,inboundPosition:{
   ...pre.inboundPosition!,runwayEventActualVerified:true
  }})).toThrow("MALFORMED_OR_FABRICATED_ADSB_ACTUALITY");
  const gate=assessP5ETailAsOfTurnCandidate({
   flightInstanceId:pre.flightInstanceId,horizon:"T-6h",
   selectedNativeTUtc:pre.selectedNativeTUtc,cutoffUtc:pre.cutoffUtc,
   issuedAtUtc:pre.issuedAtUtc,
   current:{
    legId:outbound.operatingLegId,
    physicallyOperatingLegIndependentlyReviewed:true,
    tailRegistration:outbound.tailRegistration,
    tailAssignmentAvailableAtUtc:outbound.tailAssignmentAsOfUtc,
    tailIdentityIndependentlyVerified:true,
    originIcao:outbound.originIcao,destinationIcao:outbound.destinationIcao,
    scheduledGateOutUtc:pre.selectedNativeTUtc,
    scheduledGateOutAvailableAtUtc:"2027-01-01T08:00:00.000Z",
    sourceRecordSha256:sha,sourceUseRightsIndependentlyReviewed:true
   },
   preceding:{
    legId:inbound.operatingLegId,
    physicallyOperatingLegIndependentlyReviewed:true,
    tailRegistration:inbound.tailRegistration,
    tailAssignmentAvailableAtUtc:inbound.tailAssignmentAsOfUtc,
    tailIdentityIndependentlyVerified:true,
    originIcao:inbound.originIcao,destinationIcao:inbound.destinationIcao,
    actualGateInUtc:null,actualGateInAvailableAtUtc:null,
    sourceRecordSha256:H("b"),sourceUseRightsIndependentlyReviewed:true
   }
  });
  expect(gate.observation).toBeNull();
  expect(gate.state).toBe("PRIOR_GATE_IN_NOT_KNOWN_AT_ISSUE");
 });
 it("POST: real same matched aircraft ground-to-air bracket is not a certified physical departure",()=>{
  const r=assessP5AdsbPostTakeoffBracketV39(post);
  expect(r.eligible).toBe(true);
  expect(r.takeoffProxyIntervalUtc).toEqual({
   lastObservedGroundUtc:"2027-01-02T14:10:00.000Z",
   firstObservedAirborneUtc:"2027-01-02T14:15:00.000Z",
   observedGapSeconds:300
  });
  expect(r.trueGateArrivalCertified).toBe(false);
  expect(r.actualGateOutCertified).toBe(false);
  expect(r.certifiedActualWheelsOff).toBe(false);
  expect(r.eligibleForHeadlineActualGateOutLabel).toBe(false);
  expect(r.actualPostSourceRowWritten).toBe(false);
 });
 it("POST: no ground/air transition, missing reviewed geometry, wrong aircraft, or future receipt -> no bracket",()=>{
  for(const p of [
   {...post,lastGround:null},
   {...post,firstAirborne:point("2027-01-02T14:15:02.000Z",true)},
   {...post,lastGround:point("2027-01-02T14:10:02.000Z",false)},
   {...post,departureAirportTrackGeometryIndependentlyReviewed:false},
   {...post,firstAirborne:point("2027-01-02T14:15:02.000Z",false,"f0f0f0")},
   {...post,reviewedAtUtc:"2027-01-02T14:10:00.000Z"},
   {...post,source:{...source,originalAeroDataBoxUseRightsReviewed:false}}
  ])expect(assessP5AdsbPostTakeoffBracketV39(p).eligible).toBe(false);
 });
 it("POST: rejects an excessively wide bracket, negative clocks, spoofed exact truth",()=>{
  expect(assessP5AdsbPostTakeoffBracketV39({
   ...post,firstAirborne:point("2027-01-02T15:10:02.000Z",false),
   reviewedAtUtc:"2027-01-02T16:00:00.000Z"
  }).reason).toBe("POST_POSITION_TIMESTAMP_ORDER_OR_GAP");
  expect(assessP5AdsbPostTakeoffBracketV39({
   ...post,firstAirborne:point("2027-01-02T14:08:02.000Z",false)
  }).reason).toBe("POST_POSITION_TIMESTAMP_ORDER_OR_GAP");
  expect(()=>assessP5AdsbPostTakeoffBracketV39({
   ...post,lastGround:{...post.lastGround!,identity:"MATCHED_ACTUAL"} as typeof post.lastGround
  })).toThrow("MALFORMED_OR_FABRICATED_ADSB_ACTUALITY");
 });
 it("AIRBORNE continues using the original Phase4 precise as-of guard, not a second collector",()=>{
  const r=assessP4Gate5DualSourceAdsbV39({
   aeroDataBoxPhysicalOperatingLegVerified:true,
   aircraftSwapOrConflictingIdentity:false,
   linkage:"INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK",
   adsbPosition:point("2027-01-02T14:15:02.000Z",false),
   predictionCutoffUtc:"2027-01-02T14:15:10.000Z",
   phase:"AIRBORNE",licenseAndRetentionReviewed:true
  });
  expect(r.airborneCandidateEligible).toBe(true);
  expect(r.certifiedActualOnlyWheelsOff).toBe(false);
  expect(r.productionSourceActivationAuthorized).toBe(false);
 });
 it("module never issues HTTP, stores a source response, changes immutable PRE, or charges paid credits",()=>{
  const src=readFileSync(
   "server/lib/disruption/phase5AdsbLolCrossPhaseRotationEvidence_v39.ts",
   "utf8");
  for(const term of ["fetch(","INSERT INTO","UPDATE clean.","process.env","AERODATABOX_API_KEY"])
   expect(src).not.toContain(term);
 });
});
