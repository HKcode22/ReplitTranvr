import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {normalizeGate05AdsbLolOfflineV39} from
 "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {assessP4Gate5DualSourceAdsbV39,type P4DualSourceAdsbInputV39}
 from "../server/lib/disruption/phase4Gate5DualSourceAdsbAdmission_v39";

const received="2026-10-29T07:00:00.000Z";
const p=normalizeGate05AdsbLolOfflineV39({
 now:Date.parse(received),
 ac:[{hex:"abc123",flight:"SIA123",lat:1.36,lon:103.99,
      seen_pos:2,type:"adsb_icao",alt_baro:12000,gs:240}]
},received).points[0];
const base:P4DualSourceAdsbInputV39={
 aeroDataBoxPhysicalOperatingLegVerified:true,
 aircraftSwapOrConflictingIdentity:false,
 linkage:"INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK",
 adsbPosition:p,predictionCutoffUtc:"2026-10-29T07:00:01.000Z",
 phase:"AIRBORNE",licenseAndRetentionReviewed:true
};

describe("Phase4 Gate5 AeroDataBox+ADSB.lol scientific boundaries",()=>{
 it("allows a verified independent aircraft match only as an AIRBORNE candidate, never exact runway ground truth",()=>{
  const x=assessP4Gate5DualSourceAdsbV39(base);
  expect(x.airborneCandidateEligible).toBe(true);
  expect(x.availableAtDecision).toBe(true);
  expect(x.positionProvenance).toBe("DIRECT_ADSB");
  expect(x.certifiedActualOnlyWheelsOff).toBe(false);
  expect(x.certifiedScheduledWheelsOff).toBe(false);
  expect(x.productionSourceActivationAuthorized).toBe(false);
  expect(x.noProviderRequests).toBe(true);
  const json=JSON.stringify(x);
  expect(json).not.toContain("abc123");
  expect(json).not.toContain("SIA123");
  expect(json).not.toContain("103.99");
 });
 it("does not retroactively use ADS-B for PRE or mistake postflight data for a preflight feature",()=>{
  expect(assessP4Gate5DualSourceAdsbV39({...base,phase:"PRE"}).rejectedReason)
   .toBe("PRE_OR_POST_NOT_AIRBORNE");
  expect(assessP4Gate5DualSourceAdsbV39({...base,phase:"POST"}).rejectedReason)
   .toBe("PRE_OR_POST_NOT_AIRBORNE");
  expect(assessP4Gate5DualSourceAdsbV39({...base,
   predictionCutoffUtc:"2026-10-29T06:59:59.000Z"}).rejectedReason)
   .toBe("POST_CUTOFF_OR_CLOCK");
 });
 it("refuses callsign-only links, conflicting aircraft swaps, and missing operating-leg proof",()=>{
  for(const variant of [
   {...base,linkage:"CALLSIGN_ONLY_CANDIDATE" as const},
   {...base,linkage:"AIRCRAFT_ONLY_CANDIDATE" as const},
   {...base,linkage:"UNMATCHED" as const},
  ])expect(assessP4Gate5DualSourceAdsbV39(variant).rejectedReason)
     .toBe("INSUFFICIENT_LINKAGE");
  expect(assessP4Gate5DualSourceAdsbV39({...base,
   aircraftSwapOrConflictingIdentity:true}).rejectedReason)
   .toBe("AIRCRAFT_IDENTITY_CONFLICT");
  expect(assessP4Gate5DualSourceAdsbV39({...base,
   aeroDataBoxPhysicalOperatingLegVerified:false}).rejectedReason)
   .toBe("UNVERIFIED_PHYSICAL_LEG");
 });
 it("retention review is necessary and never by itself starts collection",()=>{
  const x=assessP4Gate5DualSourceAdsbV39({...base,
   licenseAndRetentionReviewed:false});
  expect(x.rejectedReason).toBe("LICENSE_OR_RETENTION_NOT_REVIEWED");
  expect(x.productionSourceActivationAuthorized).toBe(false);
 });
 it("MLAT positions may support movement evidence after independent match, but never actual-only runway",()=>{
  const x=assessP4Gate5DualSourceAdsbV39({...base,
   adsbPosition:{...p,sourceType:"mlat"}});
  expect(x.positionProvenance).toBe("MLAT_OR_TISB");
  expect(x.certifiedActualOnlyWheelsOff).toBe(false);
 });
 it("rejects fabricated source-pinned actuality and invalid clocks rather than trusting the caller",()=>{
  for(const patch of [
   {originalAeroDataBoxFlightMatched:true},
   {runwayEventActualVerified:true},
   {identity:"CERTIFIED_OPERATING_FLIGHT"}
  ])expect(()=>assessP4Gate5DualSourceAdsbV39({...base,
    adsbPosition:{...p,...patch} as typeof p})).toThrow("P4_G5_DUAL_SOURCE_FAKE_PROVIDER_ACTUALITY");
  for(const cutoff of ["2026-02-30T07:00:00.000Z",
   "2026-10-29T07:00:00+08:00"])
   expect(()=>assessP4Gate5DualSourceAdsbV39({...base,
     predictionCutoffUtc:cutoff})).toThrow("P4_G5_DUAL_SOURCE_INVALID_CUTOFF_UTC");
 });
 it("preserves missingness as missing source, and never leaks or fetches aircraft identifiers",()=>{
  const x=assessP4Gate5DualSourceAdsbV39({...base,adsbPosition:null});
  expect(x.airborneCandidateEligible).toBe(false);
  expect(x.availableAtDecision).toBe(false);
  expect(x.rejectedReason).toBe("NO_POSITION");
  const source=readFileSync(
   "server/lib/disruption/phase4Gate5DualSourceAdsbAdmission_v39.ts","utf8");
  expect(source).not.toContain("fetch(");
  expect(source).not.toContain("INSERT INTO");
  expect(source).not.toContain("process.env");
  expect(source).not.toContain("AERODATABOX_API_KEY");
 });
});
