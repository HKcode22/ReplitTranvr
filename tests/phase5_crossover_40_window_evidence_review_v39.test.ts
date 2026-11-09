import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
 buildP5Crossover40WindowReview,type P5PublicContextClaim
} from "../server/lib/disruption/phase5Crossover40WindowEvidenceReview_v39";
const FIRST="2026-11-24";
const receipt=()=>JSON.parse(readFileSync(new URL(
 "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
 import.meta.url),"utf8"));
const input=()=>({ownerCorrectedReadback:receipt(),firstRunDateUtc:FIRST});
const audit=()=>buildP5Crossover40WindowReview(input());
describe("actual B0062 corrected crossover 40-window population review, NO native source",()=>{
 it("derives exactly 40 immutable review identities, 10 paired days and 19 unique airports",()=>{
  const r=audit();
  expect(r.status).toBe("HOLD_ALL_40_PROVIDER_NATIVE_WINDOWS_UNVERIFIED");
  expect(r.pairedRunDays).toBe(10);
  expect(r.pairedAirportWindowRows).toBe(40);
  expect(r.uniquePhysicalAirports).toBe(19);
  expect(r.reviewRows).toHaveLength(40);
  expect(r.candidateDateMapSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(r.windowIdentitySha256).toMatch(/^[0-9a-f]{64}$/);
  expect(audit().windowIdentitySha256).toBe(r.windowIdentitySha256);
  expect(new Set(r.reviewRows.map(x=>x.reviewKeySha256)).size).toBe(40);
  expect(new Set(r.reviewRows.map(x=>x.airportIcao)).size).toBe(19);
  expect([...new Set(r.reviewRows.map(x=>x.runDayIndex))].sort((a,b)=>a-b))
   .toEqual([1,2,3,4,5,7,8,9,10,11]);
  expect(r.reviewRows[0]).toMatchObject({
   pairId:"pair-1",crossoverPeriod:1,runDayIndex:1,slot:"HUB",
   airportIcao:"OMAA",dateUtc:"2026-11-24",startUtc:"2026-11-24T00:00:00.000Z",
   conservativeEndUtc:"2026-11-24T06:00:00.000Z",
   scheduledPassengerPopulation:"UNKNOWN",providerNativeWindowSourceVerified:false
  });
  expect(r.reviewRows.find(x=>x.airportIcao==="KBUF")?.pairId).toBe("pair-3");
  expect(r.reviewRows.some(x=>x.airportIcao==="KTEB")).toBe(false);
  const bern=r.reviewRows.filter(x=>x.airportIcao==="LSZB");
  expect(bern.map(x=>x.startUtc)).toEqual([
   "2026-11-25T04:00:00.000Z","2026-12-03T04:00:00.000Z"
  ]);
  expect(r.reviewRows.filter(x=>x.airportIcao==="SKBO")).toHaveLength(4);
  expect(r.reviewRows.every(x=>x.publicContext===null)).toBe(true);
  expect(r.windowsWithOnlyPublicContext).toBe(0);
  expect(r.windowsWithoutPublicContext).toBe(40);
 });
 it("links all five exact four-airport sets to both periods and conservative 6h only",()=>{
  const r=audit();
  const pairs=[
   ["OMAA","OMSJ","SPJC","KDEC"],
   ["WSSS","SBFL","TJSJ","LSZB"],
   ["YSSY","KBUF","LFQQ","NZNP"],
   ["SKBO","EBAW","NZNS","RJNK"],
   ["SKBO","YBUD","RKTU","FAKM"]
  ];
  for(let n=1;n<=5;n++){
   for(const period of [1,2]){
    const rows=r.reviewRows.filter(x=>x.pairId===`pair-${n}`&&
     x.crossoverPeriod===period);
    expect(rows.map(x=>x.airportIcao)).toEqual(pairs[n-1]);
    expect(rows.map(x=>x.slot)).toEqual(["HUB","MID_A","MID_B","REGIONAL"]);
    for(const row of rows){
     expect(Date.parse(row.conservativeEndUtc)-Date.parse(row.startUtc))
      .toBe(6*3600_000);
     expect(row.intervalKind).toBe("MAX_SIX_HOUR_REVIEW_ENVELOPE_NOT_ACTIVE_EXPOSURE");
    }
   }
  }
 });
 it("protects against invented successful flights, provider rights, training routes or paid launch",()=>{
  const r=audit();
  expect(r.nativeVerifiedWindows).toBe(0);
  expect(r.unknownPopulationWindows).toBe(40);
  expect(r.distinctDirectedRoutesVerified).toBe(0);
  expect(r.reviewRows.every(x=>
    x.uniquePhysicalOperatingLegCount===null&&
    x.directedRouteSupportCount===null&&
    x.cutoffSafeSourceAvailableAtUtc===null&&
    x.providerNativeWindowSourceVerified===false
  )).toBe(true);
  for(const flag of [
   "segmentAndHorizonSourceCoverageVerified","operatingLegDeduplicationVerified",
   "ordinaryAdaptiveDaysVerified","sevenCategoryPhysicalRestBudgetVerified",
   "lawfulSourceRetentionVerified","independentPhase5FreezePassed","phase6PaidGo"
  ] as const)expect(r[flag]).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.paidAlertCreates).toBe(0);
 });
 it("accepts a pre-window PUBLIC review annotation but still never certifies a native source",()=>{
  const base=audit(),key=base.reviewRows.find(x=>x.airportIcao==="LSZB")!.reviewKeySha256;
  const claim:P5PublicContextClaim={
   reviewKeySha256:key,observedAtUtc:"2026-11-09T06:00:00.000Z",
   sourceUrl:"https://example.org/synthetic-timetable",
   publicContextClass:"PUBLIC_CONTEXT_INCONCLUSIVE",
   reviewerNotes:"Synthetic test fixture, NOT real service evidence or ADB provider proof"
  };
  const r=buildP5Crossover40WindowReview(input(),[claim]);
  expect(r.windowsWithOnlyPublicContext).toBe(1);
  expect(r.windowsWithoutPublicContext).toBe(39);
  expect(r.reviewRows.find(x=>x.reviewKeySha256===key)?.publicContext).toEqual(claim);
  expect(r.windowIdentitySha256).toBe(base.windowIdentitySha256);
  expect(r.unknownPopulationWindows).toBe(40);
  expect(r.nativeVerifiedWindows).toBe(0);
  expect(r.independentPhase5FreezePassed).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("rejects unknown key, duplicates, post-window source, unsafe URL and missing provenance",()=>{
  const k=audit().reviewRows[0].reviewKeySha256;
  const valid:P5PublicContextClaim={
   reviewKeySha256:k,observedAtUtc:"2026-11-09T01:00:00.000Z",
   sourceUrl:"https://example.org/synthetic",
   publicContextClass:"PUBLIC_SCHEDULE_INDICATES_SERVICE",
   reviewerNotes:"Synthetic only; does not establish provider flights"
  };
  const mutations:P5PublicContextClaim[]=[
   {...valid,reviewKeySha256:"a".repeat(64)},
   {...valid,observedAtUtc:"2027-01-01T00:00:00.000Z"},
   {...valid,observedAtUtc:"banana"},
   {...valid,sourceUrl:"http://example.org/synthetic"},
   {...valid,sourceUrl:"https://user:secret@example.org"},
   {...valid,sourceUrl:"https://example.org?q=key"},
   {...valid,reviewerNotes:""},
   {...valid,publicContextClass:"NATIVE_CONFIRMED" as any}
  ];
  for(const mutation of mutations){
   expect(()=>buildP5Crossover40WindowReview(input(),[mutation]))
    .toThrow(/REFUSED_P5_40_WINDOW_REVIEW/);
  }
  expect(()=>buildP5Crossover40WindowReview(input(),[valid,valid]))
   .toThrow(/DUPLICATE_REVIEW_KEY/);
 });
 it("refuses edited original corrected airport evidence or impossible short calendar",()=>{
  const x=input(),j=x.ownerCorrectedReadback;
  j.candidatePairAirportSets[1].airports.REGIONAL.icao="KTEB";
  expect(()=>buildP5Crossover40WindowReview(x))
   .toThrow(/REFUSED_P5_REAL_PAIR_DATE_PROPOSAL_/);
  expect(()=>buildP5Crossover40WindowReview({
   ownerCorrectedReadback:receipt(),firstRunDateUtc:FIRST,maxCalendarSpanDays:31
  })).toThrow(/DATE_CANDIDATE_UNSAT_OR_INCOMPLETE/);
 });
});
