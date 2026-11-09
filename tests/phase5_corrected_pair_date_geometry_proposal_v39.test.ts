import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
 proposeP5RealCorrectedPairDateGeometry
} from "../server/lib/disruption/phase5CorrectedPairDateGeometryProposal_v39";
import {
 solveV39FourAnchorExploratoryDraft,validateV39Calendar,
 type FrozenCalendarDesignInput
} from "../server/lib/disruption/experimentCalendarSolver_v39";

const START="2026-11-24";
const HUBS=[
 {icao:"WSSS",region:"Asia-Pacific"},
 {icao:"OMAA",region:"Gulf/Africa"},
 {icao:"SKBO",region:"South America"},
 {icao:"YSSY",region:"Oceania"}
];
const REGIONS=["Asia-Pacific","Europe","Gulf/Africa","North America","Oceania","South America"];
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const DAY=86_400_000;
function original(){
 return JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
  import.meta.url),"utf8"));
}
function candidate(startDate=START){
 return proposeP5RealCorrectedPairDateGeometry({
  ownerCorrectedReadback:original(),firstRunDateUtc:startDate
 });
}
describe("bounded date-only generator, using immutable REAL corrected owner five-pair receipt",()=>{
 it("constructs a compact but explicitly PROVISIONAL 31-run date map in 43 calendar days",()=>{
  const p=candidate();
  expect(p.status).toBe("DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE");
  expect(p.days).toHaveLength(31);
  expect(Object.keys(p.candidateRunDatesByIndex)).toHaveLength(31);
  expect(p.lastRunDateUtc).toBe("2027-01-05");
  expect(p.elapsedCalendarDays).toBe(43);
  expect(p.candidateRunDatesByIndex["1"]).toBe("2026-11-24");
  expect(p.candidateRunDatesByIndex["2"]).toBe("2026-11-25");
  expect(p.candidateRunDatesByIndex["4"]).toBe("2026-11-27");
  expect(p.candidateRunDatesByIndex["5"]).toBe("2026-11-29");
  expect(p.candidateRunDatesByIndex["7"]).toBe("2026-12-02");
  expect(p.candidateRunDatesByIndex["11"]).toBe("2026-12-12");
  expect(p.days.slice(0,11).filter(x=>x.pairId)).toHaveLength(10);
  expect(new Set(p.days.map(x=>x.dateUtc)).size).toBe(31);
  expect(p.days.filter(x=>x.pairId===null)).toHaveLength(21);
  expect(p.days[0].airportsIfKnown).toEqual({
   HUB:"OMAA",MID_A:"OMSJ",MID_B:"SPJC",REGIONAL:"KDEC"
  });
  expect(p.days[4].airportsIfKnown?.HUB).toBe("SKBO");
  expect(p.days[10].airportsIfKnown?.HUB).toBe("SKBO");
  expect(p.dateMapSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(candidate().dateMapSha256).toBe(p.dateMapSha256);
  expect(p.providerCalls).toBe(0);
  expect(p.databaseWrites).toBe(0);
  expect(p.paidAlertCreates).toBe(0);
  for(const key of [
   "ordinaryAdaptiveAirportIdentityVerified","serviceWindowPassengerFlightsVerified",
   "providerRangeAndSourceGetCoverageVerified","physicalUtcChargeDayBudgetVerified",
   "sourceContentsRightsAndExpiryVerified",
   "separateTreatmentOrderRandomizationCertified",
   "genuinePrePostAndReceiverVerified","phase5ScientificFreezePassed","phase6PaidGo"
  ] as const)expect(p[key]).toBe(false);
 });
 it("passes EXISTING four-HUB draft mathematical calendar solver, NOT science FREEZE or release",()=>{
  const owner=original(),pre=candidate();
  const pairs:FrozenCalendarDesignInput["pairAirportSets"]={};
  for(const x of owner.candidatePairAirportSets){
   pairs[x.pairId]=Object.fromEntries(SLOTS.map(slot=>[
    slot,{icao:x.airports[slot].icao,region:x.airports[slot].region}
   ])) as FrozenCalendarDesignInput["pairAirportSets"][string];
  }
  const parts:Record<string,string>={},credits:Record<string,number>={};
  for(let i=1;i<=31;i++){
   parts[String(i)]=i<=20?"TRAIN":i<=25?"VALIDATION":"TEST";
   credits[String(i)]=1000; // ONLY THE TEST FIXTURE, NOT PROVIDER CREDITS.
  }
  // TEST-ONLY adapter: production requires separate independent review before
  // candidate dates may be called the solver's 'reviewedRunDatesByIndex'.
  const input:FrozenCalendarDesignInput={
   startDate:START,
   reviewedRunDatesByIndex:pre.candidateRunDatesByIndex,
   seed:owner.calendarRegionSeed,
   anchorSeed:owner.fourHubAnchorRotationSeed,
   anchorPool:HUBS,
   eligibleRegionsBySlot:{MID_A:REGIONS,MID_B:REGIONS,REGIONAL:REGIONS},
   pairAirportSets:pairs,evaluationPartitionByRunDay:parts,
   projectedAlertCreditsByRunDay:credits,
   projectedRestUnitsTotal:800,protectedRestBudget:1000
  };
  const r=solveV39FourAnchorExploratoryDraft(input);
  expect(r.reason,"dates and frozen real airport pairs must be structurally compatible").toBeNull();
  expect(r.status).toBe("SAT");
  expect(r.days).toHaveLength(31);
  expect(validateV39Calendar(r.days,input)).toEqual([]);
  expect(r.days.filter(x=>x.windowShape==="4h")).toHaveLength(26);
  expect(r.days.filter(x=>x.windowShape==="2x2h")).toHaveLength(3);
  expect(r.days.filter(x=>x.windowShape==="up-to-6h")).toHaveLength(2);
  expect(r.operationalPhase6StartAuthorized).toBe(false);
  expect(r.historicalOriginalFiveAnchorGate2Passed).toBe(false);
  for(let p=1;p<=5;p++){
   const a=r.days[p-1],b=r.days[p+5];
   expect(a.utcSlot).toBe(b.utcSlot);
   expect(a.weekdayClass).toBe(b.weekdayClass);
   expect(a.pairAirportSet).toEqual(b.pairAirportSet);
   expect(a.drawType).toBe("NEW_TEMPLATE");
   expect(b.drawType).toBe("PAIR_REPLAY");
  }
 });
 it("enforces planned max six-hour END→START washout across ALL known pair airports",()=>{
  const p=candidate();
  const lastEnd=new Map<string,number>();
  let lastParentEnd=-Infinity;
  for(const d of p.days){
   const begin=Date.parse(d.conservativeStartUtc);
   const end=Date.parse(d.conservativeEndUtc);
   expect(end-begin).toBe(6*3600_000);
   expect(begin).toBeGreaterThanOrEqual(lastParentEnd);
   lastParentEnd=end;
   if(d.airportsIfKnown)for(const icao of Object.values(d.airportsIfKnown)){
    const prev=lastEnd.get(icao);
    if(prev!==undefined)expect(begin-prev).toBeGreaterThanOrEqual(DAY);
    lastEnd.set(icao,end);
   }
  }
  expect(p.days[3].airportsIfKnown?.HUB).toBe("SKBO");
  expect(p.days[4].airportsIfKnown?.HUB).toBe("SKBO");
  expect(p.days[4].dateUtc).not.toBe("2026-11-28");
 });
 it("rejects missing, altered, unverified or inflated owner packet instead of generating arbitrary dates",()=>{
  const changes=[
   (p:any)=>{p.selectedAirportIcaosSha256="f".repeat(64);},
   (p:any)=>{p.candidatePairAirportSets[2].airports.MID_A.icao="KTEB";},
   (p:any)=>{p.crossoverAirportSetSigned=true;},
   (p:any)=>{p.providerCalls=1;},
   (p:any)=>{p.originalOwnerPairProposalSha256="c".repeat(64);},
   (p:any)=>{p.scannedFullyQualifiedMidRegionalAirports=48;},
   (p:any)=>{p.scheduledPassengerScopeExclusions=[];},
   (p:any)=>{p.candidatePairAirportSets[4].airports.HUB.icao="MMUN";}
  ];
  for(const mutate of changes){
   const p=original();mutate(p);
   expect(()=>proposeP5RealCorrectedPairDateGeometry({
    ownerCorrectedReadback:p,firstRunDateUtc:START
   })).toThrow(/REFUSED_P5_REAL_PAIR_DATE_PROPOSAL_/);
  }
 });
 it("refuses invalid UTC dates/spans and a horizon unable to fit the full 31 dates",()=>{
  for(const s of ["2026-02-30","2026-13-01","2026-11-24T00:00Z","banana"]){
   expect(()=>candidate(s)).toThrow(/INVALID_START_DATE/);
  }
  for(const max of [0,30,367,1.5,NaN]){
   expect(()=>proposeP5RealCorrectedPairDateGeometry({
    ownerCorrectedReadback:original(),firstRunDateUtc:START,
    maxCalendarSpanDays:max
   })).toThrow(/INVALID_BOUNDED_SEARCH_SPAN/);
  }
  const short=proposeP5RealCorrectedPairDateGeometry({
    ownerCorrectedReadback:original(),firstRunDateUtc:START,
    maxCalendarSpanDays:31
  });
  expect(short.status).toBe("HOLD_NO_DATE_GEOMETRY_WITHIN_BOUNDED_HORIZON");
  expect(short.days.length).toBeLessThan(31);
  expect(short.dateMapSha256).toBeNull();
  expect(short.phase6PaidGo).toBe(false);
 });
});
