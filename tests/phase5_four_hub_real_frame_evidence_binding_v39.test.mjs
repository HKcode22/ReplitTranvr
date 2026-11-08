import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  verifyFourHubB0062OwnerReadback,
  auditProspectiveFourHubCalendarInput,
  OWNER_FOUR_HUBS,SIX_REGIONS
} from "../server/lib/disruption/phase5FourHubFrameEvidenceBinding_v39.mjs";

function recorded(){
 return JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/evidence/2026-11-08_owner_four_hub_live_b0062_frame_readonly.json",
  import.meta.url),"utf8"));
}
function candidateDesign(){
 return {
  anchorPool:[
   {icao:"WSSS",region:"Asia-Pacific"},
   {icao:"OMAA",region:"Gulf/Africa"},
   {icao:"SKBO",region:"South America"},
   {icao:"YSSY",region:"Oceania"}
  ],
  eligibleRegionsBySlot:{
   MID_A:[...SIX_REGIONS],MID_B:[...SIX_REGIONS],
   REGIONAL:[...SIX_REGIONS]
  },
  pairAirportSets:Object.fromEntries(
   Array.from({length:5},(_,i)=>["pair-"+(i+1),{
    HUB:{icao:OWNER_FOUR_HUBS[i%4],
     region:candidateDesignAnchorRegion(OWNER_FOUR_HUBS[i%4])},
    MID_A:{icao:"KSEA",region:"North America"},
    MID_B:{icao:"EDDM",region:"Europe"},
    REGIONAL:{icao:"YBCG",region:"Oceania"}
   }])
  )
 };
}
function candidateDesignAnchorRegion(icao){
 return {WSSS:"Asia-Pacific",OMAA:"Gulf/Africa",SKBO:"South America",YSSY:"Oceania"}[icao];
}
const mustHold=(cb,re)=>assert.throws(cb,re);

test("exact actual 2026-11-08 14:43 UTC four-owner-HUB readback binds immutably but never authorizes scientific freeze",()=>{
 const v=verifyFourHubB0062OwnerReadback(recorded());
 assert.equal(v.status,"FOUR_HUB_ACTUAL_FRAME_SNAPSHOT_VERIFIED_FOR_METHODS_REVIEW_ONLY");
 assert.equal(v.fourStructuralHubRowsVerified,true);
 assert.deepEqual(v.anchors,candidateDesign().anchorPool);
 assert.match(v.evidenceSha256,/^[0-9a-f]{64}$/);
 assert.equal(v.originalFiveAnchorStage2Passed,false);
 assert.equal(v.pairAirportIdsCertified,false);
 assert.equal(v.sourceRightsAndRetentionCertified,false);
 assert.equal(v.future31DayCalendarSigned,false);
 assert.equal(v.phase5ScientificFreezePassed,false);
 assert.equal(v.phase6PaidGo,false);
 assert.equal(v.providerCalls,0);assert.equal(v.databaseWrites,0);
 assert.equal(verifyFourHubB0062OwnerReadback(recorded()).evidenceSha256,v.evidenceSha256);
});

test("neither changed source snapshot nor one of four removed is certified",()=>{
 for(const mutate of [
  p=>{p.frameHash="f".repeat(64);},
  p=>{p.observedUtc="2026-11-09T14:43:24.211Z";},
  p=>{p.sites.pop();p.observedRows=3;},
  p=>{p.ownerChosenProspectiveAnchorIcaos.push("KORD");},
  p=>{p.sites[0].feedSchedule=false;},
  p=>{p.sites[1].feedLive=false;},
  p=>{p.sites[1].feedAdsb=true;},
  p=>{p.sites[2].tier="MID";},
  p=>{p.sites[3].region="Europe";},
  p=>{p.sites[3].frameHubDualEligible=false;},
  p=>{p.sites[3].problems.push("POST_INELIGIBLE");},
  p=>{p.sites[0].metrics.trafficMetricValue++;},
  p=>{p.sites[0].metrics.effectiveCarriers=7;},
  p=>{p.status="PHASE5_PASS";},
  p=>{p.findings.push("HOLD");},
  p=>{p.sourceRightsCertified=true;},
  p=>{p.historicFiveAnchorGate2Pass=true;},
  p=>{p.oldYssyP25DeliveryGapClosedScientifically=true;},
  p=>{p.phase6PaidGo=true;},
  p=>{p.providerCalls=1;}
 ]){const p=recorded();mutate(p);
  mustHold(()=>verifyFourHubB0062OwnerReadback(p),
   /REFUSED_PHASE5_FOUR_HUB_FRAME_BINDING_/);
 }
});

test("binds only existing four HUB regions and all six observed MID/REGIONAL regions for a nonauthorized design",()=>{
 const result=auditProspectiveFourHubCalendarInput(recorded(),candidateDesign());
 assert.equal(result.status,"FOUR_HUB_CALENDAR_INPUT_FRAME_BOUND_REVIEW_ONLY");
 assert.equal(result.actualFourHubFrameEligible,true);
 assert.equal(result.prospectiveFivePairsProposed,true);
 assert.equal(result.exactMidRegionalAirportFrameMembershipVerified,false);
 assert.equal(result.exactFutureDatesSourceRefreshAndSevenRestBudgetsVerified,false);
 assert.equal(result.phase5ScientificFreezePassed,false);
 assert.equal(result.phase6PaidGo,false);
});

test("no silent fifth HUB, wrong region, erased six-region cell, or unsupported pair hub",()=>{
 for(const mutate of [
  d=>{d.anchorPool.push({icao:"KORD",region:"North America"});},
  d=>{d.anchorPool[3].icao="KORD";},
  d=>{d.anchorPool[0].region="North America";},
  d=>{d.eligibleRegionsBySlot.REGIONAL=["North America"];},
  d=>{d.eligibleRegionsBySlot.MID_A.push("UNMAPPED");},
  d=>{delete d.pairAirportSets["pair-5"];},
  d=>{d.pairAirportSets["pair-1"].HUB={icao:"KORD",region:"North America"};},
  d=>{d.pairAirportSets["pair-1"].MID_A.icao="WSSS";},
  d=>{d.pairAirportSets["pair-4"].REGIONAL.region="UNMAPPED";},
  d=>{d.pairAirportSets["pair-3"].MID_B.icao="M3B";}
 ]){
  const d=candidateDesign();mutate(d);
  mustHold(()=>auditProspectiveFourHubCalendarInput(recorded(),d),
   /REFUSED_PHASE5_FOUR_HUB_FRAME_BINDING_/);
 }
});
