import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
 proposeP5Adaptive31ShapeEnvelope
} from "../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39";
import {p5TreatmentCommitmentForSeed}
 from "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";
import {P5_EARLY_DRAW_MIN_STRICT_LEAD_MS,
 P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS}
 from "../server/lib/disruption/phase5ProspectiveEarlyDrawClockContract_v39";

const seed="31be6f0d392e4d84f72a0e8bc5369eb57a4c916083b962edef7e7319146a0d25";
function corrected(){
 return JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
  import.meta.url),"utf8"));
}
const input=()=>({
 ownerCorrectedReadback:corrected(),
 firstRunDateUtc:"2026-11-24",
 claimedTreatment:{
  treatmentSeedHex:seed,
  announcedCommitmentSha256:p5TreatmentCommitmentForSeed(seed),
  claimedCommitmentObservedAtUtc:"2026-11-09T00:00:00.000Z"
 }
});
const env=()=>proposeP5Adaptive31ShapeEnvelope(input());
describe("31-day real sampled pair shapes + 21 NULL prospective adaptive airport sets",()=>{
 it("proves correct 31 parent dates and f8 exact shapes without inventing ordinary airport rows",()=>{
  const e=env();
  expect(e.status).toBe("PROVISIONAL_SHAPE_ENVELOPE_ONLY_21_ADAPTIVE_DRAWS_PENDING");
  expect(e.days).toHaveLength(31);
  expect(e.plannedBatchDays).toBe(31);
  expect(e.knownPairParentDays).toBe(10);
  expect(e.ordinaryAdaptiveParentDays).toBe(21);
  expect(e.knownUniquePairedAirports).toBe(19);
  expect(e.pairedAirportReviewWindows).toBe(40);
  expect(e.shapeEnvelopeSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(e.shapeEnvelopeSha256).toBe(env().shapeEnvelopeSha256);
  expect(e.days.map(x=>x.runDayIndex)).toEqual(
   Array.from({length:31},(_,i)=>i+1)
  );
  expect(e.days.filter(x=>x.pairedAirportCandidates!==null)).toHaveLength(10);
  const ordinary=e.days.filter(x=>x.pairId===null);
  expect(ordinary).toHaveLength(21);
  for(const d of ordinary){
   expect(d.pairedAirportCandidates).toBeNull();
   expect(d.crossoverPeriod).toBeNull();
   expect(d.pairRole).toBeNull();
   expect(d.windowShape).toBe("4h");
   expect(d.activeSegments).toHaveLength(1);
   expect(d.selectionState).toBe(
    "ORDINARY_AIRPORT_IDENTITIES_PENDING_PROSPECTIVE_DB_DRAW"
   );
   expect(d.fourSelectedAirportsDurablyBound).toBe(false);
   expect(d.actualSourceOriginalAtT24Verified).toBe(false);
  }
  expect(e.frozenAirportsForFutureOrdinaryDays).toBe(0);
  expect(e.futureOrdinaryDaysStillRequireRealSelection).toBe(21);
  expect(e.days.filter(x=>x.partition==="train")).toHaveLength(20);
  expect(e.days.filter(x=>x.partition==="validation")).toHaveLength(5);
  expect(e.days.filter(x=>x.partition==="test")).toHaveLength(6);
 });
 it("replays actual corrected five pairs and keeps SKBO twice, KBUF in P3, no KTEB",()=>{
  const e=env();
  const sets=[
   ["OMAA","OMSJ","SPJC","KDEC"],
   ["WSSS","SBFL","TJSJ","LSZB"],
   ["YSSY","KBUF","LFQQ","NZNP"],
   ["SKBO","EBAW","NZNS","RJNK"],
   ["SKBO","YBUD","RKTU","FAKM"]
  ];
  for(let pair=1;pair<=5;pair++){
   const a=e.days.find(x=>x.pairId==="pair-"+pair&&x.crossoverPeriod===1)!;
   const b=e.days.find(x=>x.pairId==="pair-"+pair&&x.crossoverPeriod===2)!;
   expect(a.runDayIndex).toBe(pair);
   expect(b.runDayIndex).toBe(pair+6);
   expect(Object.values(a.pairedAirportCandidates!)).toEqual(sets[pair-1]);
   expect(a.pairedAirportCandidates).toEqual(b.pairedAirportCandidates);
   expect(a.utcSlot).toBe(b.utcSlot);
   expect(a.pairRole).not.toBe(b.pairRole);
   expect(a.selectionState).toBe("PAIRED_CANDIDATE_NOT_SIGNED");
  }
  expect(e.days.some(x=>Object.values(x.pairedAirportCandidates??{}).includes("KTEB")))
   .toBe(false);
 });
 it("conserves 26 4h + 3 split + 2 up-to-six treatments and precise 408 logical cutoff groups",()=>{
  const e=env();
  expect(e.days.filter(d=>d.windowShape==="4h")).toHaveLength(26);
  expect(e.days.filter(d=>d.windowShape==="2x2h")).toHaveLength(3);
  expect(e.days.filter(d=>d.windowShape==="up-to-6h")).toHaveLength(2);
  expect(e.allExperimentExposureHoursAtMaximum).toBe(128);
  expect(e.activeChildExposureSegments).toBe(34);
  expect(e.unpartitionedAirportSegmentTargets).toBe(136);
  expect(e.unpartitionedThreeHorizonCutoffGroups).toBe(408);
  const active=e.days.reduce((t,d)=>t+d.activeSegments.length,0);
  expect(active).toBe(34);
  const minutes=e.days.flatMap(d=>d.activeSegments).reduce((n,s)=>
   n+(Date.parse(s.endUtc)-Date.parse(s.startUtc))/60_000,0);
  expect(minutes).toBe(128*60);
  for(const d of e.days.filter(x=>x.windowShape==="2x2h")){
   expect(d.activeSegments).toHaveLength(2);
   expect(d.excludedSplitGap).toEqual({
    startUtc:d.activeSegments[0].endUtc,
    endUtc:d.activeSegments[1].startUtc
   });
   expect(Date.parse(d.excludedSplitGap!.endUtc)-
    Date.parse(d.excludedSplitGap!.startUtc)).toBe(3600_000);
  }
 });
 it("exposes each prospective early-draw window consistently with shared actual owner lead",()=>{
  const e=env();
  for(const d of e.days){
   const start=Date.parse(d.startUtc);
   expect(Date.parse(d.earliestPermittedEarlyDrawUtc)).toBe(
    start-P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS
   );
   expect(Date.parse(d.latestPermittedEarlyDrawUtcInclusive)).toBe(
    start-P5_EARLY_DRAW_MIN_STRICT_LEAD_MS-1
   );
   expect(Date.parse(d.earliestPossibleSourceT24SpanUtc)).toBe(
    start-24*3600_000
   );
   expect(Date.parse(d.endUtc)).toBeLessThanOrEqual(start+6*3600_000);
  }
 });
 it("never certifies a fully selected, costed, sourced or lawful Phase6 launch",()=>{
  const e=env();
  for(const k of [
   "all21AdaptiveDrawsAuthentic","allKnownPairCandidatesIndependentlySigned",
   "seedIndependentlyWitnessed","actualFrameRegionAnchorPlanVerified",
   "sourceProviderRangeAndQueryGridVerified",
   "sevenCategoryPhysicalUtcChargeBudgetsVerified",
   "currentProviderCreditsAndRightsVerified",
   "phase5ScientificFreezePassed","phase6PaidGo"
  ] as const)expect(e[k]).toBe(false);
  expect(e.providerCalls).toBe(0);
  expect(e.databaseWrites).toBe(0);
  expect(e.paidAlertCreates).toBe(0);
 });
 it("refuses altered immutable real B0062 owner packet or bad external treatment commitment",()=>{
  const altered=input();
  altered.ownerCorrectedReadback.candidatePairAirportSets[2].airports.MID_A.icao="KTEB";
  expect(()=>proposeP5Adaptive31ShapeEnvelope(altered))
   .toThrow(/REFUSED_P5_REAL_PAIR_DATE_PROPOSAL/);
  const bad=input();
  bad.claimedTreatment.announcedCommitmentSha256="e".repeat(64);
  expect(()=>proposeP5Adaptive31ShapeEnvelope(bad))
   .toThrow(/REFUSED_P5_TREATMENT_SOURCE_PREVIEW/);
 });
});
