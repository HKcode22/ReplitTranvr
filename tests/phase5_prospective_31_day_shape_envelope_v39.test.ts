import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
 proposeP5Adaptive31ShapeEnvelope,
 inspectP5OrdinaryDayCandidateBinding
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


const signedCal="a".repeat(64);
function ordinaryReadbackFixture(){
 const envelope=env();
 const row=envelope.days[5]; // run 6: ordinary and deliberately unselected
 if(row.pairId!==null)throw Error("TEST_EXPECTED_ORDINARY_DAY_SIX");
 const selectedAt=new Date(Date.parse(row.startUtc)-25*3600_000).toISOString();
 const regions={
  HUB:"NORTH_AMERICA",MID_A:"EUROPE",
  MID_B:"EUROPE",REGIONAL:"NORTH_AMERICA"
 };
 const airports={
  HUB:"KJFK",MID_A:"EGLL",MID_B:"EDDF",REGIONAL:"KGPT"
 };
 const day={
  runDayIndex:6,scheduledStartUtc:new Date(row.startUtc),
  frozenDrawSeed:"ci-synthetic-do-not-freeze",drawType:"NEW_TEMPLATE" as const,
  anchorIcao:airports.HUB,slotRegions:regions,pairAirportSet:null,
  calendarHash:signedCal,configHash:"b".repeat(64),frameHash:"c".repeat(64)
 };
 const rows=(["HUB","MID_A","MID_B","REGIONAL"] as const).map(slot=>({
  slot_id:slot,target_region:regions[slot],
  draw_type:day.drawType,selected_icao:airports[slot],
  frozen_draw_seed:day.frozenDrawSeed,
  selected_at_utc:selectedAt,
  adaptive_state_hash:slot==="REGIONAL"?"d".repeat(64):null,
  probability_vector:slot==="REGIONAL"?[
   {icao:"KGPT",probability:1,drawScore:1}
  ]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null
 }));
 return {
  envelope,preparedDay:day,submittedDrawRows:rows,
  independentlyReviewedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256,
  independentlyReviewedSignedCalendarSha256:signedCal
 };
}
describe("shape-envelope ordinary-day binding is non-authorizing, never a future-draw oracle",()=>{
 it("binds only four proposed saved rows, known day 6 date/clock and immutable envelope",()=>{
  const x=ordinaryReadbackFixture();
  const r=inspectP5OrdinaryDayCandidateBinding(x);
  expect(r.status).toBe("FOUR_SUBMITTED_EARLY_DRAW_ROWS_MATCH_SHAPE_NOT_DB_CUSTODY");
  expect(r.runDayIndex).toBe(6);
  expect(r.selectedIcaos).toEqual({
   HUB:"KJFK",MID_A:"EGLL",MID_B:"EDDF",REGIONAL:"KGPT"
  });
  expect(r.candidateBindingSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(r.sourceShapeEnvelopeSha256).toBe(x.envelope.shapeEnvelopeSha256);
  expect(r.submittedDrawStateSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(r.realRestrictedPostgresReadbackAuthenticated).toBe(false);
  expect(r.fullPriorDaySiteWashoutVerified).toBe(false);
  expect(r.actualSourceAndPerFlightTVerified).toBe(false);
  expect(r.sevenCategoryChargeDayBudgetVerified).toBe(false);
  expect(r.phase5ScientificFreezePassed).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("refuses a modified day slot/date, forged envelope digest or unreviewed calendar SHA",()=>{
  const x=ordinaryReadbackFixture();
  x.preparedDay.scheduledStartUtc=new Date(
   x.preparedDay.scheduledStartUtc.getTime()+3600000);
  expect(()=>inspectP5OrdinaryDayCandidateBinding(x))
   .toThrow(/ADAPTIVE_DAY_OR_EXPOSURE_REDRAW/);
  const y=ordinaryReadbackFixture();
  y.envelope.days[5].endUtc="2027-01-01T00:00:00.000Z";
  expect(()=>inspectP5OrdinaryDayCandidateBinding(y))
   .toThrow(/UNREVIEWED_OR_TAMPERED_31_SHAPE/);
  const z=ordinaryReadbackFixture();
  z.preparedDay.calendarHash="f".repeat(64);
  expect(()=>inspectP5OrdinaryDayCandidateBinding(z))
   .toThrow(/SIGNED_DAY_OR_CALENDAR_NOT_MATCHED/);
 });
 it("refuses pretending known pair day 1 is an ordinary adaptive draw",()=>{
  const x=ordinaryReadbackFixture();
  x.preparedDay.runDayIndex=1;
  x.preparedDay.scheduledStartUtc=new Date(x.envelope.days[0].startUtc);
  expect(()=>inspectP5OrdinaryDayCandidateBinding(x))
   .toThrow(/ADAPTIVE_DAY_OR_EXPOSURE_REDRAW/);
 });
 it("refuses missing four rows, missing regional probability or late/out-of-range DB times",()=>{
  const a=ordinaryReadbackFixture();
  a.submittedDrawRows.pop();
  expect(()=>inspectP5OrdinaryDayCandidateBinding(a))
   .toThrow(/MISSING_OR_DUPLICATED_SLOTS/);
  const b=ordinaryReadbackFixture();
  b.submittedDrawRows[3].airport_layer_design_probability=null;
  expect(()=>inspectP5OrdinaryDayCandidateBinding(b))
   .toThrow(/REGIONAL_PROBABILITY_MISSING/);
  const c=ordinaryReadbackFixture();
  const close=Date.parse(c.envelope.days[5].startUtc)-
   P5_EARLY_DRAW_MIN_STRICT_LEAD_MS;
  for(const row of c.submittedDrawRows)
   row.selected_at_utc=new Date(close).toISOString();
  expect(()=>inspectP5OrdinaryDayCandidateBinding(c))
   .toThrow(/DRAW_NOT_WITHIN_REAL_PROSPECTIVE_EARLY_WINDOW|DRAW_TOO_LATE/);
  const d=ordinaryReadbackFixture();
  const early=Date.parse(d.envelope.days[5].startUtc)-
   P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS-1;
  for(const row of d.submittedDrawRows)
   row.selected_at_utc=new Date(early).toISOString();
  expect(()=>inspectP5OrdinaryDayCandidateBinding(d))
   .toThrow(/DRAW_NOT_WITHIN_REAL_PROSPECTIVE_EARLY_WINDOW|DRAW_TOO_EARLY/);
 });
});
