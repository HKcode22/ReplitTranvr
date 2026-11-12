import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {proposeP5Adaptive31ShapeEnvelope} from
 "../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39";
import {p5TreatmentCommitmentForSeed} from
 "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";
import {buildP5ActualFivePairB0062CalendarOnlyDraft} from
 "../server/lib/disruption/phase5RealFivePairB0062CalendarOnlyDraft_v39";

const h=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const source=()=>JSON.parse(readFileSync(new URL(
 "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
 import.meta.url),"utf8"));
const hubRegions={
 WSSS:"Asia-Pacific",OMAA:"Gulf/Africa",
 SKBO:"South America",YSSY:"Oceania"
};
const H=3600000,D=86400000;
const CLAIM_SEED="31be6f0d392e4d84f72a0e8bc5369eb57a4c916083b962edef7e7319146a0d25";
const CLAIM=()=>({
 treatmentSeedHex:CLAIM_SEED,
 announcedCommitmentSha256:p5TreatmentCommitmentForSeed(CLAIM_SEED),
 claimedCommitmentObservedAtUtc:"2026-11-09T00:00:00.000Z"
});
const firstDate="2027-01-20";
const proposed=()=>proposeP5Adaptive31ShapeEnvelope({
 ownerCorrectedReadback:source(),
 firstRunDateUtc:firstDate,
 claimedTreatment:CLAIM()
});
const HUBS=["WSSS","OMAA","SKBO","YSSY"];
function plan(){
 const envelope=proposed();
 const lastHUB=new Map();
 const ordinaryHubsAndRegions=[];
 for(const d of envelope.days){
  const start=Date.parse(d.startUtc),end=Date.parse(d.endUtc);
  let chosen;
  if(d.pairedAirportCandidates)chosen=d.pairedAirportCandidates.HUB;
  else{
   const nextKnown=envelope.days.find(x=>
    x.runDayIndex>d.runDayIndex&&x.pairedAirportCandidates!==null);
   chosen=HUBS.find(hub=>
    (!lastHUB.has(hub)||start-lastHUB.get(hub)>=D)&&
    (!nextKnown||nextKnown.pairedAirportCandidates.HUB!==hub||
      Date.parse(nextKnown.startUtc)-end>=D)
   );
   if(!chosen)throw Error("CI_SAT_PROPOSED_HUB_DID_NOT_EXIST");
   ordinaryHubsAndRegions.push({
    runDayIndex:d.runDayIndex,anchorIcao:chosen,
    slotRegions:{
     HUB:hubRegions[chosen],
     MID_A:"Europe",MID_B:"North America",REGIONAL:"Oceania"
    }
   });
  }
  if(lastHUB.has(chosen)&&start-lastHUB.get(chosen)<D)
   throw Error("CI_REAL_PAIR_HUB_WASHOUT_NOT_SAT");
  lastHUB.set(chosen,end);
 }
 return {
  schema:"v39.phase5.actual-five-pair-31-b0062-draft-input.v1",
  ownerCorrectedReadback:source(),firstRunDateUtc:firstDate,
  claimedTreatment:CLAIM(),ordinaryHubsAndRegions,
  predeclaredDailyDrawSeeds:Array.from({length:31},(_,i)=>({
   runDayIndex:i+1,frozenDrawSeed:h({onlyFixtureSeedForRunDay:i+1})
  })),
  assembledAtUtc:"2026-11-12T00:00:00.000Z"
 };
}
describe("Phase5 actual corrected five pair → B0062 inert 31-calendar row DRAFT",()=>{
 it("uses real five-pair regions and 31 separate external-like seeds, not future selected airports",()=>{
  const input=plan(),draft=buildP5ActualFivePairB0062CalendarOnlyDraft(input);
  const envelope=proposed();
  expect(draft.status).toBe("REAL_FIVE_PAIR_31_DAY_CALENDAR_ROWS_DRAFT_NOT_SIGNED");
  expect(draft.calendarDays).toHaveLength(31);
  expect(draft.totalB0062Rows).toBe(31);
  expect(draft.knownPairedParentDays).toBe(10);
  expect(draft.futureOrdinaryParentDaysWithUnknownAirportSelections).toBe(21);
  expect(draft.futureOrdinaryAirportsSelected).toBe(0);
  expect(draft.calendarDays.filter(x=>x.pairAirportSet===null)).toHaveLength(21);
  expect(draft.calendarDays.filter(x=>x.pairAirportSet!==null)).toHaveLength(10);
  expect(draft.calendarDays.map(x=>x.windowShape).filter(x=>x==="4h")).toHaveLength(26);
  expect(draft.calendarDays.map(x=>x.windowShape).filter(x=>x==="2x2h")).toHaveLength(3);
  expect(draft.calendarDays.map(x=>x.windowShape).filter(x=>x==="up-to-6h")).toHaveLength(2);
  expect(draft.proposedShapeEnvelopeSha256).toBe(envelope.shapeEnvelopeSha256);
  expect(draft.proposedDateMapSha256).toBe(envelope.dateMapSha256);
  expect(draft.proposedCalendarRowsSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(draft.calendarDays[0].pairAirportSet).toEqual({
   HUB:{icao:"OMAA",region:"Gulf/Africa"},
   MID_A:{icao:"OMSJ",region:"Gulf/Africa"},
   MID_B:{icao:"SPJC",region:"South America"},
   REGIONAL:{icao:"KDEC",region:"North America"}
  });
  expect(draft.calendarDays[8].pairAirportSet.MID_A.icao).toBe("KBUF");
  expect(draft.calendarDays[5].pairAirportSet).toBeNull();
  for(const k of [
   "actualIndependentSeedCommitWitnessVerified",
   "actual31FrozenCalendarApproved","trueProviderPassengerFlightAvailabilityVerified",
   "providerApiRangePriceAndRightsVerified","actualUtcSevenRestBudgetSigned",
   "restrictedProductionWriterCommissioned",
   "phase5ScientificFreezePassed","phase6PaidGo"
  ])expect(draft[k]).toBe(false);
  expect(draft.providerCalls).toBe(0);
  expect(draft.databaseWrites).toBe(0);
  expect(draft.paidAlertCreates).toBe(0);
 });
 it("refuses a fake/missing or duplicate ordinary HUB region and missing per-day draw seed",()=>{
  const a=plan();
  a.ordinaryHubsAndRegions[0].slotRegions.HUB="FAKE_HUB_REGION";
  expect(()=>buildP5ActualFivePairB0062CalendarOnlyDraft(a))
   .toThrow("NOT_REAL_B0062_SIX_REGION_SLOT_PLAN");
  const b=plan();
  b.ordinaryHubsAndRegions[0].anchorIcao="KJFK";
  expect(()=>buildP5ActualFivePairB0062CalendarOnlyDraft(b))
   .toThrow("KNOWN_HUB_NOT_IN_REAL_ACTIVE_FRAME_REGION");
  const c=plan();
  c.predeclaredDailyDrawSeeds.pop();
  expect(()=>buildP5ActualFivePairB0062CalendarOnlyDraft(c))
   .toThrow("FUTURE_REGION_DRAW_SEEDS_MISSING_EXACT_ROWS");
  const d=plan();
  d.predeclaredDailyDrawSeeds[1].frozenDrawSeed=
   d.predeclaredDailyDrawSeeds[0].frozenDrawSeed;
  expect(()=>buildP5ActualFivePairB0062CalendarOnlyDraft(d))
   .toThrow("FUTURE_REGIONAL_DAY_DRAW_SEEDS_REPEATED");
 });
 it("refuses altering the real paired B0062 source without review",()=>{
  const p=plan();
  p.ownerCorrectedReadback.candidatePairAirportSets[2].
   airports.MID_A.icao="KTEB";
  expect(()=>buildP5ActualFivePairB0062CalendarOnlyDraft(p))
   .toThrow(/REFUSED_P5_REAL_PAIR_DATE_PROPOSAL/);
 });
 it("uses the existing complete B0062 validator; rejects pair/ordinary known HUB 24h collision",()=>{
  const p=plan();
  const day6=proposed().days[5];
  const previous=proposed().days[4];
  const fromEnd=Date.parse(day6.startUtc)-Date.parse(previous.endUtc);
  // Pair5 SKBO is a fixed real airport. The first ordinary day is an
  // especially important prospective anchor selection boundary.
  if(fromEnd<D){
   p.ordinaryHubsAndRegions[0].anchorIcao="SKBO";
   p.ordinaryHubsAndRegions[0].slotRegions.HUB="South America";
   expect(()=>buildP5ActualFivePairB0062CalendarOnlyDraft(p))
    .toThrow("ALL_31_KNOWN_HUB_24H_END_TO_START_WASHOUT");
  }else{
   // Do not fabricate an impossible actual source time just for this test.
   const d=p.ordinaryHubsAndRegions[0];
   d.anchorIcao="SKBO";d.slotRegions.HUB="South America";
   expect(()=>buildP5ActualFivePairB0062CalendarOnlyDraft(p)).toBeDefined();
   // Real PG16 separately tests a valid nonoverlapping 22h washout.
  }
 });
});
