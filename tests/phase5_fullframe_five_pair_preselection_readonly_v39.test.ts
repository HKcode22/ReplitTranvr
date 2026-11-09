import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 previewFirstFiveSlotRegions,selectFiveRealPairCandidateTemplates,
 inspectFiveCrossoverPairCandidatesReadOnly,
 PRECOMMITTED_AIRPORT_SELECTION_SEED,SEED_COMMITMENT_SHA256
} from "../scripts/v39_phase5_fullframe_five_pair_preselection_readonly_once.mjs";
import {solveV39FourAnchorExploratoryDraft} from
 "../server/lib/disruption/experimentCalendarSolver_v39";
import {auditProspectiveFourHubCalendarInput} from
 "../server/lib/disruption/phase5FourHubFrameEvidenceBinding_v39.mjs";
const REGIONS=["Asia-Pacific","Europe","Gulf/Africa","North America","Oceania","South America"];
const HUB=[
 {icao:"WSSS",region:"Asia-Pacific"},
 {icao:"OMAA",region:"Gulf/Africa"},
 {icao:"SKBO",region:"South America"},
 {icao:"YSSY",region:"Oceania"}
];
const SHA="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94";
const TRAFFIC="8dd10dd0b5e0e9f493ad823a37f0852b6882fef49f45ee7965af557408264424";
const REGION_SHA="4073cc05e958bf98b6501e418198305f80e7d17892318f6773d9e0aac9d3a764";
const TIER_SHA="18cd871421220e72cd96044ae790fc95bdae1d69b9f9e43ac35566fd786eb7dc";
const ROW_COUNTS={
 MID:[53,149,15,181,19,10],REGIONAL:[79,167,28,251,27,34]
};
function allFrameRows(){
 const rows:any[]=[];
 for(const tier of ["MID","REGIONAL"] as const)for(let reg=0;reg<6;reg++){
  for(let i=0;i<ROW_COUNTS[tier][reg];i++){
   const icao=(tier==="MID"?"M":"R")+String.fromCharCode(65+reg)+
     String.fromCharCode(65+Math.floor(i/26))+
     String.fromCharCode(65+(i%26));
   rows.push({
    icao,tier,region:REGIONS[reg],frame_hash:SHA,traffic_reference_hash:TRAFFIC,
    feed_schedule:true,feed_live:i%2===0,feed_adsb:i%2!==0,
    traffic_metric_name:"observed_commercial_movements",
    traffic_metric_units:"resolved observed departures per fixed 365-day reference period",
    traffic_metric_value:10000-reg*100-i,undirected_degree:10+reg,
    effective_carriers:3.25,intl_share:.25
   });
  }
 }
 return rows;
}
function packet(){
 return JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/evidence/2026-11-08_owner_four_hub_live_b0062_frame_readonly.json",
  import.meta.url),"utf8"));
}
function inputForStructuralTest(result:any){
 const parts:Record<string,string>={},alert:Record<string,number>={};
 for(let i=1;i<=31;i++){parts[String(i)]=i<=20?"TRAIN":i<=25?"VALIDATION":"TEST";alert[String(i)]=1000;}
 const pairs:Record<string,any>={};
 for(const pair of result.candidatePairAirportSets){
  const airports=pair.airports;
  pairs[pair.pairId]=Object.fromEntries(
   ["HUB","MID_A","MID_B","REGIONAL"].map(slot=>[
     slot,{icao:airports[slot].icao,region:airports[slot].region}
   ])
  );
 }
 // Spread fixture days over an intentionally nonproduction timeline so
 // same HUB SKBO in pairs 4/5 has >=24h after the longer 6h treatment.
 // DO NOT pass these fixture dates or costs to a real Phase6 writer.
 const fixtureStart=Date.parse("2026-11-23T00:00:00.000Z");
 const reviewedRunDatesByIndex:Record<string,string>={};
 for(let day=1;day<=31;day++){
  const week=Math.floor((day-1)/6),within=(day-1)%6;
  reviewedRunDatesByIndex[String(day)]=new Date(
   fixtureStart+(week*14+within*2)*86_400_000
  ).toISOString().slice(0,10);
 }
 return {
  // DATE AND BUDGET ARE SYNTHETIC TEST FIXTURES; NOT A LIVE SCIENCE CALENDAR.
  startDate:"2026-11-23",reviewedRunDatesByIndex,seed:result.calendarRegionSeed,
  anchorSeed:result.fourHubAnchorRotationSeed,
  anchorPool:HUB,eligibleRegionsBySlot:{
   MID_A:REGIONS,MID_B:REGIONS,REGIONAL:REGIONS
  },
  pairAirportSets:pairs,evaluationPartitionByRunDay:parts,
  projectedAlertCreditsByRunDay:alert,
  projectedRestUnitsTotal:800,protectedRestBudget:1000
 };
}
describe("Phase5 full B0062 selection seeded BEFORE future data, no paid calls",()=>{
 it("the exact owner 48-candidate production snapshot SHA-256 is reproducible and all twelve cells are preserved",()=>{
  const p=JSON.parse(readFileSync(new URL(
   "../data-collection/phase5/evidence/2026-11-09_mid_regional_12cell_owner_live_b0062_readonly.json",
   import.meta.url),"utf8"));
  expect(p.status).toBe("MID_REGIONAL_12_CELLS_CANDIDATES_ONLY_NOT_PAIR_FREEZE");
  expect(p.observedUtc).toBe("2026-11-09T02:54:44.082Z");
  expect(p.frameHash).toBe(SHA);
  expect(p.trafficReferenceHash).toBe(TRAFFIC);
  expect(p.regionMappingHash).toBe(REGION_SHA);
  expect(p.tierHash).toBe(TIER_SHA);
  expect(p.totalActiveFrameRows).toBe(4346);
  expect(p.verifiedDualEligibleRows).toBe(1125);
  expect(p.exactTierRegionCounts).toHaveLength(12);
  expect(p.candidates).toHaveLength(48);
  expect(p.missingStrictCells).toEqual([]);
  expect(p.candidatesSha256).toBe(
   createHash("sha256").update(JSON.stringify({
    frameHash:p.frameHash,regionHash:p.regionMappingHash,
    tierHash:p.tierHash,candidates:p.candidates
   })).digest("hex")
  );
  expect(p.candidatesSha256)
   .toBe("f960476cce18b0cb868440fc10c9815a3f95837da8b74a9a2f645ae659d22479");
  const asiaReg=p.candidates.filter((x:any)=>
   x.tier==="REGIONAL"&&x.region==="Asia-Pacific");
  expect(asiaReg).toHaveLength(4);
  expect(asiaReg.every((x:any)=>x.strictlyQualifiedInRegion===79)).toBe(true);
  expect(p.exactTierRegionCounts.find((x:any)=>
   x.tier==="REGIONAL"&&x.region==="Asia-Pacific").count).toBe(80);
  expect(p.crossoverPairAirportsFrozen).toBe(false);
  expect(p.randomizationPerformed).toBe(false);
  expect(p.phase5ScientificFreeze).toBe(false);
  expect(p.phase6PaidGo).toBe(false);
  expect(p.dbWrites).toBe(0);
  expect(p.providerCalls).toBe(0);
 });
 it("has precommitted independent airport seed SHA and stable five 4-slot templates from ALL 1013 rows",()=>{
  expect(createHash("sha256").update(Buffer.from(PRECOMMITTED_AIRPORT_SELECTION_SEED,"hex")).digest("hex"))
    .toBe(SEED_COMMITMENT_SHA256);
  const rows=allFrameRows();
  expect(rows).toHaveLength(1013);
  const a=selectFiveRealPairCandidateTemplates(rows);
  const b=selectFiveRealPairCandidateTemplates([...rows].reverse());
  expect(b.selectedAirportIcaosSha256).toBe(a.selectedAirportIcaosSha256);
  expect(a.status).toBe("FIVE_FULL_FRAME_PAIR_CANDIDATE_TEMPLATES_ONLY_NOT_FROZEN");
  expect(a.firstFiveSlotRegions).toHaveLength(5);
  expect(a.candidatePairAirportSets).toHaveLength(5);
  expect(new Set(a.candidatePairAirportSets.map((x:any)=>x.airports.HUB.icao)).size).toBe(4);
  expect(new Set(a.candidatePairAirportSets.flatMap((x:any)=>[
   x.airports.MID_A.icao,x.airports.MID_B.icao,x.airports.REGIONAL.icao
  ])).size).toBe(15);
  expect(a.scannedFullyQualifiedMidRegionalAirports).toBe(1013);
  expect(a.sampledWithoutTop48TrafficTruncation).toBe(true);
  expect(a.treatmentOrderRandomized).toBe(false);
  expect(a.independentTreatmentOrderSeedSet).toBe(false);
  expect(a.crossoverAirportSetSigned).toBe(false);
  expect(a.thirtyOneBatchDayCalendarSigned).toBe(false);
  expect(a.phase6PaidGo).toBe(false);
  expect(a.providerCalls).toBe(0);
  expect(a.databaseWrites).toBe(0);
 });
 it("five selected full-frame pair regions exactly agree with current four-HUB solver first-period templates",()=>{
  const out=selectFiveRealPairCandidateTemplates(allFrameRows());
  const plan=solveV39FourAnchorExploratoryDraft(inputForStructuralTest(out));
  expect(plan.reason).toBeNull();
  expect(plan.status).toBe("SAT");
  expect(plan.days).toHaveLength(31);
  // These six-region frame data surfaced an old collision fallback that
  // destroyed MID_B complete-cycle balance. The repaired solver uses a
  // seeded nonzero cyclic derangement, so both MID slots remain full-cycle
  // balanced and distinct on every one of the 26 fresh templates.
  const fresh=plan.days.filter(d=>d.drawType==="NEW_TEMPLATE");
  expect(fresh).toHaveLength(26);
  expect(fresh.every(d=>d.slotRegions.MID_A!==d.slotRegions.MID_B)).toBe(true);
  for(let i=0;i+6<=fresh.length;i+=6){
   for(const slot of ["MID_A","MID_B","REGIONAL"] as const){
    expect(new Set(fresh.slice(i,i+6).map(d=>d.slotRegions[slot])))
     .toEqual(new Set(REGIONS));
   }
  }
  expect(plan.operationalPhase6StartAuthorized).toBe(false);
  expect(plan.historicalOriginalFiveAnchorGate2Passed).toBe(false);
  for(let p=0;p<5;p++){
   const first=plan.days[p],second=plan.days[p+6];
   const target=out.firstFiveSlotRegions[p];
   expect(first.pairAirportSet?.HUB.icao).toBe(target.HUB.icao);
   expect(first.slotRegions).toEqual({
    HUB:target.HUB.region,MID_A:target.MID_A,
    MID_B:target.MID_B,REGIONAL:target.REGIONAL
   });
   expect(second.pairAirportSet).toEqual(first.pairAirportSet);
   expect(second.drawType).toBe("PAIR_REPLAY");
  }
  const x=inputForStructuralTest(out);
  const evidenceAudit=auditProspectiveFourHubCalendarInput(packet(),x);
  expect(evidenceAudit.status).toBe("FOUR_HUB_CALENDAR_INPUT_FRAME_BOUND_REVIEW_ONLY");
  expect(evidenceAudit.exactMidRegionalAirportFrameMembershipVerified).toBe(false);
 });
 it("always rejects missing/tampered full frame, wrong geographic cell and invalid metrics",()=>{
  const changes=[
   (a:any[])=>a.pop(),
   (a:any[])=>{a[0].icao=a[1].icao;},
   (a:any[])=>{a[0].frame_hash="f".repeat(64);},
   (a:any[])=>{a[0].traffic_reference_hash="a".repeat(64);},
   (a:any[])=>{a[0].region="UNMAPPED";},
   (a:any[])=>{a[0].tier="HUB";},
   (a:any[])=>{a[0].feed_schedule=false;},
   (a:any[])=>{a[0].traffic_metric_value=0;},
   (a:any[])=>{a[0].intl_share=1.1;}
  ];
  for(const change of changes){const rows=allFrameRows();change(rows);
   expect(()=>selectFiveRealPairCandidateTemplates(rows))
    .toThrow(/HOLD_PHASE5_FULL_FRAME_PAIR_PRESELECTION_/);
  }
 });
 function mockDb(options:any={}){
  let rollback=0,release=0;const sql:string[]=[];
  const pool={async connect(){return {
   async query(statement:string,params?:any[]){
    sql.push(statement);
    if(statement.startsWith("BEGIN ")||statement.startsWith("SET LOCAL "))return {rows:[]};
    if(statement==="ROLLBACK"){rollback++;return {rows:[]};}
    if(statement.includes("current_database() db"))return {rows:[{
     db:"neondb",ver:160000,replica:false,ro:"on",
     observed_at:"2026-11-09T03:20:00.000Z"
    }]};
    if(statement.includes("FROM clean.adb_sampling_frame_registry"))return {rows:[{
     active_frame_version:"frame_02ec6e78ba1fe3c2",
     frame_hash:options.drift?"f".repeat(64):SHA,
     traffic_reference_hash:TRAFFIC,region_mapping_hash:REGION_SHA,tier_hash:TIER_SHA
    }]};
    if(statement.includes("COUNT(*)::int n"))return {rows:[{
     n:4346,hashed:4346,dual:1125
    }]};
    if(statement.includes("SELECT icao,tier,region,frame_hash,traffic_reference_hash")){
     expect(params).toEqual([
      "frame_02ec6e78ba1fe3c2",SHA,TRAFFIC,
      ["MID","REGIONAL"],REGIONS
     ]);
     if(options.failSql)throw Error("MOCK_PG_SELECT_FAILURE");
     return {rows:allFrameRows()};
    }
    throw Error("UNEXPECTED_SQL_COMMAND");
   },release(){release++;}
  };}};
  return {pool,sql,rollback:()=>rollback,releases:()=>release};
 }
 it("owner review transaction fails closed on non-real synthetic original receipt, always ROLLBACK",async()=>{
  const d=mockDb();
  await expect(inspectFiveCrossoverPairCandidatesReadOnly(d.pool))
   .rejects.toThrow(/HISTORICAL_ORIGINAL_FIVE_PAIR_RECEIPT_NOT_REPRODUCED/);
  expect(d.rollback()).toBe(1);
  expect(d.releases()).toBe(1);
  expect(d.sql[0]).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(d.sql.every(x=>!/\b(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|COMMIT)\b/i.test(x))).toBe(true);
 });
 it("archives the real 03:29 UTC original five-pair sample and SHA without falsely freezing it",()=>{
  const original=JSON.parse(readFileSync(new URL(
   "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pair_owner_readonly_original.json",
   import.meta.url),"utf8"));
  expect(original.observedUtc).toBe("2026-11-09T03:29:33.421Z");
  expect(original.status).toBe("FIVE_FULL_FRAME_PAIR_CANDIDATE_TEMPLATES_ONLY_NOT_FROZEN");
  expect(original.scannedFullyQualifiedMidRegionalAirports).toBe(1013);
  expect(original.candidatePairAirportSets).toHaveLength(5);
  expect(original.candidatePairAirportSets[2].airports.MID_A.icao).toBe("KTEB");
  const items=original.candidatePairAirportSets.map((x:any)=>({
   pairId:x.pairId,
   icaos:["HUB","MID_A","MID_B","REGIONAL"].map(z=>x.airports[z].icao)
  }));
  expect(createHash("sha256").update(JSON.stringify(items)).digest("hex"))
   .toBe("3dbcc18dd44bdbb7e5323766a9a6bfacacc0bb2e38e3ccce9aff442611738763");
  expect(original.crossoverAirportSetSigned).toBe(false);
  expect(original.treatmentOrderRandomized).toBe(false);
  expect(original.phase6PaidGo).toBe(false);
  expect(original.providerCalls).toBe(0);
  expect(original.databaseWrites).toBe(0);
 });
 it("KTEB can be objectively excluded from a full frozen 1013-cell population without altering seed or other regions",()=>{
  const rows=allFrameRows();
  const first=rows.find((x:any)=>x.tier==="MID"&&x.region==="North America");
  expect(first).toBeTruthy();
  first.icao="KTEB";
  const original=selectFiveRealPairCandidateTemplates(rows);
  const excluded=selectFiveRealPairCandidateTemplates(rows,{
   scheduledPassengerExclusions:["KTEB"]
  });
  expect(excluded.status).toBe("FIVE_POST_SELECTION_SCOPE_ADJUDICATED_PAIR_CANDIDATES_NOT_FROZEN");
  expect(excluded.scannedFullyQualifiedMidRegionalAirports).toBe(1013);
  expect(excluded.scheduledPassengerScopeExclusions).toEqual(["KTEB"]);
  expect(excluded.exclusionAdjudicatedAfterFirstDraw).toBe(true);
  expect(excluded.candidatePairAirportSets.flatMap((p:any)=>
   ["MID_A","MID_B","REGIONAL"].map(slot=>p.airports[slot].icao))).not.toContain("KTEB");
  expect(excluded.independentAirportSelectionSeedHex).toBe(original.independentAirportSelectionSeedHex);
  expect(excluded.candidatePairAirportSets).toHaveLength(5);
  expect(excluded.phase6PaidGo).toBe(false);
  expect(excluded.crossoverAirportSetSigned).toBe(false);
  expect(excluded.treatmentOrderRandomized).toBe(false);
  expect(excluded.providerCalls).toBe(0);
  expect(excluded.databaseWrites).toBe(0);
  for(const extra of [["KORD"],["KTEB","OTHER"],["OTHER"],["KTEB","KTEB"]]){
   expect(()=>selectFiveRealPairCandidateTemplates(rows,{
    scheduledPassengerExclusions:extra
   })).toThrow(/UNREVIEWED_OR_CHANGED_OPERATIONAL_SCOPE_EXCLUSION/);
  }
  expect(()=>selectFiveRealPairCandidateTemplates(allFrameRows(),{
   scheduledPassengerExclusions:["KTEB"]
  })).toThrow(/KTEB_NOT_IN_ORIGINAL_FROZEN_CENSUS/);
 });
 it("never touches writable DB when source registry drifts or query fails",async()=>{
  for(const opts of [{drift:true},{failSql:true}]){
   const d=mockDb(opts);
   await expect(inspectFiveCrossoverPairCandidatesReadOnly(d.pool)).rejects.toThrow();
   expect(d.rollback()).toBe(1);
   expect(d.releases()).toBe(1);
  }
 });
});
