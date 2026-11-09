import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
  solveV39FourAnchorExploratoryDraft,validateV39Calendar,
  type FrozenCalendarDesignInput
} from "../server/lib/disruption/experimentCalendarSolver_v39";

const START="2026-11-23";
const FRAME_SHA="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94";
const EXPECTED_CORRECTED_SHA="f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
const REGIONS=["Asia-Pacific","Europe","Gulf/Africa","North America","Oceania","South America"];
const HUBS=[
 {icao:"WSSS",region:"Asia-Pacific"},
 {icao:"OMAA",region:"Gulf/Africa"},
 {icao:"SKBO",region:"South America"},
 {icao:"YSSY",region:"Oceania"}
];
const SLOT_IDS=["HUB","MID_A","MID_B","REGIONAL"] as const;

function actualOwnerPacket(){
 return JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
  import.meta.url),"utf8"));
}
function dateMap(twoDaySpacing=false):Record<string,string>{
 const start=Date.parse(START+"T00:00:00.000Z"),out:Record<string,string>={};
 for(let i=1;i<=31;i++){
  const week=Math.floor((i-1)/6),within=(i-1)%6;
  // Standard 6 days in each 7-day block is the historical draft default.
  // Two-day-spacing is an explicit, TEST-ONLY feasible counterexample,
  // NOT an actual 31-day Phase6 production calendar/date decision.
  const days=twoDaySpacing?week*14+within*2:week*7+within;
  out[String(i)]=new Date(start+days*86_400_000).toISOString().slice(0,10);
 }
 return out;
}
function input(explicit?:Record<string,string>):FrozenCalendarDesignInput{
 const real=actualOwnerPacket();
 const selected=real.candidatePairAirportSets.map((p:any)=>({
  pairId:p.pairId,icaos:SLOT_IDS.map(s=>p.airports[s].icao)
 }));
 expect(createHash("sha256").update(JSON.stringify(selected)).digest("hex"))
  .toBe(EXPECTED_CORRECTED_SHA);
 expect(real.selectedAirportIcaosSha256).toBe(EXPECTED_CORRECTED_SHA);
 expect(real.frozenFrameHash).toBe(FRAME_SHA);
 expect(real.scannedFullyQualifiedMidRegionalAirports).toBe(1013);
 expect(real.crossoverAirportSetSigned).toBe(false);
 expect(real.phase6PaidGo).toBe(false);
 const pairs:FrozenCalendarDesignInput["pairAirportSets"]={};
 for(const p of real.candidatePairAirportSets){
  pairs[p.pairId]=Object.fromEntries(SLOT_IDS.map(slot=>[
   slot,{icao:p.airports[slot].icao,region:p.airports[slot].region}
  ])) as FrozenCalendarDesignInput["pairAirportSets"][string];
 }
 const partition:Record<string,string>={},alerts:Record<string,number>={};
 for(let i=1;i<=31;i++){
  partition[String(i)]=i<=20?"TRAIN":i<=25?"VALIDATION":"TEST";
  alerts[String(i)]=1000; // SYNTHETIC ONLY, not a current provider balance.
 }
 return {
  startDate:START,seed:real.calendarRegionSeed,
  anchorSeed:real.fourHubAnchorRotationSeed,
  anchorPool:HUBS,
  eligibleRegionsBySlot:{MID_A:REGIONS,MID_B:REGIONS,REGIONAL:REGIONS},
  pairAirportSets:pairs,evaluationPartitionByRunDay:partition,
  projectedAlertCreditsByRunDay:alerts,
  projectedRestUnitsTotal:800,protectedRestBudget:1000,
  ...(explicit?{reviewedRunDatesByIndex:explicit}:{})
 };
}
describe("actual corrected five-pair airport reuse vs frozen f.8 end-to-start washout",()=>{
 it("detects real SKBO duplication across pair 4 and 5: first week has only 22h",()=>{
  const p=input();
  expect(p.pairAirportSets["pair-4"].HUB.icao).toBe("SKBO");
  expect(p.pairAirportSets["pair-5"].HUB.icao).toBe("SKBO");
  const r=solveV39FourAnchorExploratoryDraft(p);
  expect(r.status).toBe("UNSAT");
  expect(r.reason).toContain("run5:SKBO:reused-airport-END-to-START-washout<24h-after-run4");
  expect(r.days).toEqual([]);
  expect(r.calendarHash).toBeNull();
  expect(r.operationalPhase6StartAuthorized).toBe(false);
 });
 it("accepts a fully supplied and demonstrably spaced REVIEW-ONLY calendar fixture",()=>{
  const p=input(dateMap(true));
  const r=solveV39FourAnchorExploratoryDraft(p);
  expect(r.reason).toBeNull();
  expect(r.status).toBe("SAT");
  expect(r.days).toHaveLength(31);
  expect(validateV39Calendar(r.days,p)).toEqual([]);
  expect(r.days[10].date).toBe(dateMap(true)["11"]);
  expect(r.operationalPhase6StartAuthorized).toBe(false);
  expect(r.historicalOriginalFiveAnchorGate2Passed).toBe(false);
 });
 it("rejects all-or-nothing date-map omission, invalid leap dates and duplicate UTC dates",()=>{
  const missing=dateMap(true);
  delete missing["11"];
  expect(solveV39FourAnchorExploratoryDraft(input(missing)).reason)
   .toMatch(/reviewed explicit 31 run-day dates missing/);
  const bad=dateMap(true);
  bad["11"]="2027-02-30";
  expect(solveV39FourAnchorExploratoryDraft(input(bad)).status).toBe("UNSAT");
  const dupe=dateMap(true);
  dupe["11"]=dupe["10"];
  expect(solveV39FourAnchorExploratoryDraft(input(dupe)).status).toBe("UNSAT");
  const extra=dateMap(true);
  extra["32"]="2027-08-02";
  expect(solveV39FourAnchorExploratoryDraft(input(extra)).status).toBe("UNSAT");
 });
 it("full default date-map still fails 22h SKBO even when every date is explicitly listed",()=>{
  const p=input(dateMap(false)),r=solveV39FourAnchorExploratoryDraft(p);
  expect(r.status).toBe("UNSAT");
  expect(r.reason).toContain("run5:SKBO:reused-airport-END-to-START-washout<24h-after-run4");
 });
});