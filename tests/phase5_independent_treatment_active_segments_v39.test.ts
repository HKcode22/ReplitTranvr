import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
 buildP5Crossover40WindowReview
} from "../server/lib/disruption/phase5Crossover40WindowEvidenceReview_v39";
import {
 previewP5IndependentTreatmentActiveSegments,
 p5TreatmentCommitmentForSeed
} from "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";
import {deriveP5F8SeededPairRoles} from
 "../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs";

const SOURCE="../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json";
const firstDate="2026-11-24";
const seed="31be6f0d392e4d84f72a0e8bc5369eb57a4c916083b962edef7e7319146a0d25";
const claim=()=>({
 treatmentSeedHex:seed,
 announcedCommitmentSha256:p5TreatmentCommitmentForSeed(seed),
 // TEST ONLY: this was not a real externally witnessed randomization!
 claimedCommitmentObservedAtUtc:"2026-11-09T00:00:00.000Z"
});
const source=()=>JSON.parse(readFileSync(new URL(SOURCE,import.meta.url),"utf8"));
const review=()=>buildP5Crossover40WindowReview({
 ownerCorrectedReadback:source(),firstRunDateUtc:firstDate
});
const result=()=>previewP5IndependentTreatmentActiveSegments(review(),claim());
const iso=(n:number)=>new Date(n).toISOString();
const H=3600_000,D=86400_000;
const hash=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
describe("real five-pair external-seed preview and true f.8 active source cutoff targets",()=>{
 it("has 10 paired parent days, 5 control, 3 split alt, 2 six-hour alt and 156 no-flight cutoff groups",()=>{
  const r=result();
  expect(r.status).toBe("PROVISIONAL_EXACT_PAIRED_SEGMENTS_NOT_RELEASE");
  expect(r.pairedRunDays).toBe(10);
  expect(r.uniqueKnownAirports).toBe(19);
  expect(r.fourHourControls).toBe(5);
  expect(r.split2x2Alternatives).toBe(3);
  expect(r.upTo6hAlternatives).toBe(2);
  expect(r.activeExposedSegments).toBe(13);
  expect(r.airportSegmentInstances).toBe(52);
  expect(r.airportSegmentHorizonCutoffGroups).toBe(156);
  expect(r.pairTreatments).toHaveLength(10);
  expect(r.horizonCutoffGroups).toHaveLength(156);
  expect(new Set(r.horizonCutoffGroups.map(x=>x.groupSha256)).size).toBe(156);
  expect(r.earliestPossibleT24CutoffUtc).toBe("2026-11-23T00:00:00.000Z");
  expect(r.assignmentSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(r.activeSegmentSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(r.assignmentSha256).toBe(result().assignmentSha256);
  expect(r.activeSegmentSha256).toBe(result().activeSegmentSha256);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.paidAlertCreates).toBe(0);
  for(const k of [
   "externallyWitnessedSeedIndependence",
   "externalCommitmentTimestampAuthenticated",
   "all31OrdinaryAirportDrawsVerified",
   "actualProviderMaxRangeAndRequestsVerified",
   "threeHorizonOriginalSourceBindingVerified",
   "current7CategoryPhysicalUtcBudgetVerified",
   "lawfulSourceContentsUseVerified",
   "sourcePREPOSTReceiverAndSTOPVerified",
   "phase5ScientificFreezePassed","phase6PaidGo"
  ] as const)expect(r[k]).toBe(false);
 });
 it("parity-checks role assignment against existing Stage21 seeded role algorithm",()=>{
  const r=result(),s=source(),slots=["HUB","MID_A","MID_B","REGIONAL"] as const;
  const templates=s.candidatePairAirportSets.map((p:any,i:number)=>{
   const id="pair_"+String(i+1).padStart(3,"0");
   const airports=Object.fromEntries(slots.map(slot=>[slot,p.airports[slot].icao]));
   return {pairId:id,frozenPairTemplateSha256:hash({pairId:id,airports})};
  });
  const reference=deriveP5F8SeededPairRoles(seed,templates);
  expect(reference).toHaveLength(5);
  expect(reference.filter((p:any)=>p.period1Role==="control")).toHaveLength(3);
  expect(reference.filter((p:any)=>p.period1Role==="alternative")).toHaveLength(2);
  for(let pair=1;pair<=5;pair++){
   const id="pair_"+String(pair).padStart(3,"0");
   const ref=reference.find((x:any)=>x.pairId===id)!;
   const a=r.pairTreatments.find(x=>x.pairId==="pair-"+pair&&x.period===1)!;
   const b=r.pairTreatments.find(x=>x.pairId==="pair-"+pair&&x.period===2)!;
   expect(a.treatment).toBe(ref.period1Role);
   expect(b.treatment).toBe(ref.period2Role);
   expect(a.airportIcaos).toEqual(b.airportIcaos);
   expect(a.windowShape==="2x2h"||b.windowShape==="2x2h").toBe(pair<=3);
   expect(a.windowShape==="up-to-6h"||b.windowShape==="up-to-6h").toBe(pair>=4);
   expect(a.windowShape==="4h"||b.windowShape==="4h").toBe(true);
  }
 });
 it("excludes split gaps from flight population and preserves exact horizon offsets",()=>{
  const r=result();
  for(const w of r.pairTreatments){
   const start=Date.parse(w.startUtc);
   if(w.windowShape==="2x2h"){
    expect(w.activeSegments).toHaveLength(2);
    expect(w.excludedSplitGap).toEqual({
     startUtc:iso(start+2*H),endUtc:iso(start+3*H)
    });
    expect(w.activeSegments[0].endUtc).toBe(iso(start+2*H));
    expect(w.activeSegments[1].startUtc).toBe(iso(start+3*H));
    expect(Date.parse(w.endUtc)-start).toBe(5*H);
   }else{
    expect(w.activeSegments).toHaveLength(1);
    expect(w.excludedSplitGap).toBeNull();
    expect(Date.parse(w.endUtc)-start).toBe(
     (w.windowShape==="4h"?4:6)*H
    );
   }
  }
  const offsets={"T-24h":24*H,"T-6h":6*H,"T-90m":90*60_000};
  for(const g of r.horizonCutoffGroups){
   const offset=offsets[g.horizon];
   expect(Date.parse(g.cutoffSpanStartUtc)).toBe(
    Date.parse(g.serviceIntervalStartUtc)-offset
   );
   expect(Date.parse(g.cutoffSpanExclusiveEndUtc)).toBe(
    Date.parse(g.serviceIntervalEndUtc)-offset
   );
   const win=r.pairTreatments.find(x=>x.pairId===g.pairId&&
    x.period===g.period)!;
   expect(win.airportIcaos[g.slot]).toBe(g.airportIcao);
   expect(win.activeSegments.find(x=>x.segmentIndex===g.segmentIndex))
    .toMatchObject({startUtc:g.serviceIntervalStartUtc,endUtc:g.serviceIntervalEndUtc});
   expect(g.flightLevelTAndNativeOriginalVerified).toBe(false);
   expect(g.providerRequestAndRangeApproved).toBe(false);
  }
 });
 it("rejects reused old study seed, wrong commitment and claimed post-T24 commitment",()=>{
  const original=review();
  for(const bad of [
   {...claim(),treatmentSeedHex:"20a8aa4420d301673e7ff2fe472387578cf943772b5ada9e5208facd8984e182"},
   {...claim(),announcedCommitmentSha256:"f".repeat(64)},
   {...claim(),claimedCommitmentObservedAtUtc:"2026-11-23T00:00:00.000Z"},
   {...claim(),claimedCommitmentObservedAtUtc:"2026-11-24T00:00:00.000Z"},
   {...claim(),claimedCommitmentObservedAtUtc:"2026-02-30T00:00:00.000Z"},
   {...claim(),treatmentSeedHex:"not-hex"}
  ]){
   expect(()=>previewP5IndependentTreatmentActiveSegments(original,bad))
    .toThrow(/REFUSED_P5_TREATMENT_SOURCE_PREVIEW/);
  }
 });
 it("refuses an edited or backfilled airport/date review key, routes or synthetic certified provider",()=>{
  const modified=[
   (r:any)=>{r.reviewRows[0].airportIcao="KTEB";},
   (r:any)=>{r.reviewRows[0].startUtc="2026-11-25T00:00:00.000Z";},
   (r:any)=>{r.reviewRows[0].uniquePhysicalOperatingLegCount=1;},
   (r:any)=>{r.reviewRows[0].providerNativeWindowSourceVerified=true;},
   (r:any)=>{r.reviewRows[0].reviewKeySha256="f".repeat(64);},
   (r:any)=>{r.nativeVerifiedWindows=1;},
   (r:any)=>{r.phase6PaidGo=true;},
   (r:any)=>{r.windowIdentitySha256="f".repeat(64);}
  ];
  for(const mutation of modified){
   const r=review();mutation(r);
   expect(()=>previewP5IndependentTreatmentActiveSegments(r,claim()))
    .toThrow(/REFUSED_P5_TREATMENT_SOURCE_PREVIEW/);
  }
 });
 it("different external preview seed changes assignment digest but never certifies RNG",()=>{
  const a=result(),extraSeed="b01cf9284a36510dfb32be7a4250f093dd61a05e2fbac87d6ceddd93e0b4ff6a";
  const b=previewP5IndependentTreatmentActiveSegments(review(),{
   treatmentSeedHex:extraSeed,
   announcedCommitmentSha256:p5TreatmentCommitmentForSeed(extraSeed),
   claimedCommitmentObservedAtUtc:"2026-11-09T00:00:00.000Z"
  });
  expect(a.announcedCommitmentSha256).not.toBe(b.announcedCommitmentSha256);
  expect(b.externallyWitnessedSeedIndependence).toBe(false);
  expect(b.phase6PaidGo).toBe(false);
  expect(b.activeExposedSegments).toBe(13);
  expect(b.horizonCutoffGroups).toHaveLength(156);
 });
});
