import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {p5TreatmentCommitmentForSeed}
 from "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";
import {proposeP5Adaptive31ShapeEnvelope}
 from "../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39";
import {calculateP5ShapeOnlyFidsRangePartitionFloor}
 from "../server/lib/disruption/phase5ShapeOnlyFidsRangePartitionFloor_v39";

const seed="31be6f0d392e4d84f72a0e8bc5369eb57a4c916083b962edef7e7319146a0d25";
const corrected=()=>JSON.parse(readFileSync(new URL(
 "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
 import.meta.url),"utf8"));
const fixture=(range=240,price=2)=>{
 const envelope=proposeP5Adaptive31ShapeEnvelope({
  ownerCorrectedReadback:corrected(),
  firstRunDateUtc:"2026-11-24", // TEST geometry, NOT an approved start
  claimedTreatment:{
   treatmentSeedHex:seed,
   announcedCommitmentSha256:p5TreatmentCommitmentForSeed(seed),
   claimedCommitmentObservedAtUtc:"2026-11-09T00:00:00.000Z"
  }
 });
 return {
  envelope,
  separatelyReviewedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256,
  assumedProviderMaxFidsRangeMinutes:range,
  providerRangeEvidenceSha256:"a".repeat(64),
  assumedApiUnitsPerPhysicalGet:price,
  projectCycleApiUnitCeiling:50000 as const
 };
};
describe("Phase5 real B0062 31-shape FIDS geometric floor; never provider charge proof",()=>{
 it.each([
  [360,408],[240,432],[120,768],[60,1536],[30,3072]
 ])("computes minimum %i-minute range geometric 4-site×3-horizon GET count = %i",(
  range,expected
 )=>{
  const r=calculateP5ShapeOnlyFidsRangePartitionFloor(fixture(range));
  expect(r.totalMinimumPhysicalFidsGets).toBe(expected);
  expect(r.totalMinimumFidsApiUnits).toBe(expected*2);
  expect(r.studiedParentDays).toBe(31);
  expect(r.knownPairedParentDays).toBe(10);
  expect(r.ordinaryParentDaysPendingProspectiveDraw).toBe(21);
  expect(r.activeChildSegments).toBe(34);
  expect(r.perRunDay).toHaveLength(31);
  expect(r.perRunDay.reduce((n,d)=>n+d.minPhysicalGetsFourSlotsThreeHorizons,0))
   .toBe(expected);
  expect(r.perRunDay.filter(d=>d.selectedAirportIdentitiesState===
   "ORDINARY_AIRPORT_IDENTITIES_PENDING_PROSPECTIVE_DB_DRAW")).toHaveLength(21);
  expect(r.perRunDay.filter(d=>d.selectedAirportIdentitiesState===
   "PAIRED_CANDIDATE_NOT_SIGNED")).toHaveLength(10);
  expect(r.totalMinimumPhysicalFidsGets).toBeGreaterThanOrEqual(408);
  expect(r.sourceRefreshesCosted).toBe(false);
  expect(r.physicalRetriesCosted).toBe(false);
  expect(r.actualUtcChargeDaysAssigned).toBe(false);
  expect(r.sevenRestCategoriesAndAlertsReserved).toBe(false);
  expect(r.actualLiveProviderRangeVerifiedByThisFunction).toBe(false);
  expect(r.actualPriceOrBalanceVerifiedByThisFunction).toBe(false);
  expect(r.all21ProspectiveDrawsCommitted).toBe(false);
  expect(r.legalContentsUseVerified).toBe(false);
  expect(r.realFlightPopulationOrPreCertified).toBe(false);
  expect(r.phase5ScientificFreezePassed).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("never charges a 1h split inactive gap, nor forgets six-hour range partitioning",()=>{
  const r=calculateP5ShapeOnlyFidsRangePartitionFloor(fixture(240));
  const split=r.perRunDay.filter(d=>d.windowShape==="2x2h");
  const six=r.perRunDay.filter(d=>d.windowShape==="up-to-6h");
  const four=r.perRunDay.filter(d=>d.windowShape==="4h");
  expect(split).toHaveLength(3);
  expect(six).toHaveLength(2);
  expect(four).toHaveLength(26);
  expect(split.map(d=>d.rangePartitionsPerOneAirportAndHorizon))
   .toEqual([2,2,2]);
  expect(six.map(d=>d.rangePartitionsPerOneAirportAndHorizon)).toEqual([2,2]);
  expect(four.every(d=>d.rangePartitionsPerOneAirportAndHorizon===1)).toBe(true);
  expect(r.totalMinimumPhysicalFidsGets).toBe(432);
 });
 it("flags an impossible assumed structural minimum without declaring full budget feasible",()=>{
  const r=calculateP5ShapeOnlyFidsRangePartitionFloor(fixture(1,1));
  expect(r.totalMinimumPhysicalFidsGets).toBe(92160);
  expect(r.minimumUnitsExceedCycleCap).toBe(true);
  expect(r.phase6PaidGo).toBe(false);
  const plausible=calculateP5ShapeOnlyFidsRangePartitionFloor(fixture(240,2));
  expect(plausible.minimumUnitsExceedCycleCap).toBe(false);
  expect(plausible.sevenRestCategoriesAndAlertsReserved).toBe(false);
  expect(plausible.actualPriceOrBalanceVerifiedByThisFunction).toBe(false);
 });
 it("refuses altered shape receipt or externally pinned SHA mismatch",()=>{
  const r=fixture();
  r.envelope.days[5].dateUtc="2026-01-01";
  expect(()=>calculateP5ShapeOnlyFidsRangePartitionFloor(r))
   .toThrow(/UNREVIEWED_OR_MUTATED_REAL_31_DAY_SHAPE/);
  const b=fixture();
  b.separatelyReviewedShapeEnvelopeSha256="b".repeat(64);
  expect(()=>calculateP5ShapeOnlyFidsRangePartitionFloor(b))
   .toThrow(/UNREVIEWED_OR_MUTATED_REAL_31_DAY_SHAPE/);
  const c=fixture();
  c.envelope.days[5].pairedAirportCandidates={
   HUB:"WSSS",MID_A:"OMAA",MID_B:"SKBO",REGIONAL:"KGPT"
  };
  expect(()=>calculateP5ShapeOnlyFidsRangePartitionFloor(c))
   .toThrow(/UNREVIEWED_OR_MUTATED_REAL_31_DAY_SHAPE/);
 });
 it("requires proper provider evidence SHA, integer range and canonical unit price",()=>{
  const cases=[
   {assumedProviderMaxFidsRangeMinutes:0},
   {assumedProviderMaxFidsRangeMinutes:361},
   {assumedProviderMaxFidsRangeMinutes:120.5},
   {assumedProviderMaxFidsRangeMinutes:null},
   {assumedApiUnitsPerPhysicalGet:0},
   {assumedApiUnitsPerPhysicalGet:2.5},
   {assumedApiUnitsPerPhysicalGet:null},
   {providerRangeEvidenceSha256:"not-reviewed"},
   {projectCycleApiUnitCeiling:50001}
  ];
  for(const x of cases){
   const f=fixture();
   expect(()=>calculateP5ShapeOnlyFidsRangePartitionFloor({
    ...f,...x
   } as any)).toThrow(/REFUSED_P5_SHAPE_ONLY_RANGE_FLOOR_/);
  }
 });
});
