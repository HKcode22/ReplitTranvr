import {describe,it,expect} from "vitest";
import {inspectP5MidRegionalCandidateFrame,REGIONS,TIERS} from
 "../scripts/v39_phase5_mid_regional_crossover_candidates_readonly_once.mjs";
const FRAME="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94";
const TRAFFIC="8dd10dd0b5e0e9f493ad823a37f0852b6882fef49f45ee7965af557408264424";
const REGION="4073cc05e958bf98b6501e418198305f80e7d17892318f6773d9e0aac9d3a764";
const TIER="18cd871421220e72cd96044ae790fc95bdae1d69b9f9e43ac35566fd786eb7dc";
const expected={
 MID:[53,149,15,181,19,10],
 REGIONAL:[80,167,28,251,27,34]
};
function fixture(options:any={}){
 let rollback=0,release=0;const sqls:any[]=[];
 const groups:any[]=[];
 const candidates:any[]=[];
 for(const tier of TIERS)for(let i=0;i<REGIONS.length;i++){
  groups.push({tier,region:REGIONS[i],n:expected[tier as "MID" | "REGIONAL"][i]});
  for(let n=1;n<=4;n++){
   const icao=(tier==="MID"?"M":"R")+
     String.fromCharCode(65+i)+String.fromCharCode(64+n)+"X";
   candidates.push({
    icao,tier,region:REGIONS[i],rank:n,cell_count:5,
    frame_hash:FRAME,traffic_reference_hash:TRAFFIC,
    country_iso2:"US",airport_timezone:"America/Los_Angeles",
    feed_schedule:true,feed_live:true,feed_adsb:n%2===0,
    traffic_metric_name:"observed_commercial_movements",
    traffic_metric_units:"resolved observed departures per fixed 365-day reference period",
    traffic_metric_value:100_000-i*1000-n*100,
    undirected_degree:42,effective_carriers:3.2,intl_share:0.52
   });
  }
 }
 if(options.noCell){groups.pop();candidates.splice(-4);}
 if(options.badRegionCount)groups[0].n--;
 if(options.noCandidateCell)candidates.splice(0,4);
 if(options.duplicateAirport)candidates[1].icao=candidates[0].icao;
 if(options.wrongHash)candidates[1].frame_hash="f".repeat(64);
 const client={
  async query(sql:string,params?:any[]){
   sqls.push({sql,params});
   if(sql.startsWith("BEGIN ")||sql.startsWith("SET LOCAL "))return {rows:[]};
   if(sql==="ROLLBACK"){rollback++;return {rows:[]};}
   if(sql.includes("current_database() db"))return {rows:[{
    db:"neondb",ver:160000,replica:options.replica===true,ro:"on",
    observed_at:"2026-11-08T15:17:00.000Z"
   }]};
   if(sql.includes("FROM clean.adb_sampling_frame_registry"))return {rows:[{
    active_frame_version:"frame_02ec6e78ba1fe3c2",
    frame_hash:options.changedRegistry?"b".repeat(64):FRAME,
    traffic_reference_hash:TRAFFIC,
    region_mapping_hash:REGION,tier_hash:TIER
   }]};
   if(sql.includes("COUNT(*)::int active_rows"))
    return {rows:[{active_rows:4346,hash_matched:4346,dual_eligible:1125}]};
   if(sql.includes("GROUP BY tier,region"))
    return {rows:groups};
   if(sql.includes("WITH eligible AS")) {
    expect(params).toEqual([
     "frame_02ec6e78ba1fe3c2",FRAME,TRAFFIC,TIERS,REGIONS
    ]);
    if(options.sqlFailure)throw Error("OFFLINE_MOCK_QUERY_FAILURE");
    return {rows:candidates};
   }
   throw Error("UNEXPECTED_READONLY_SQL");
  },
  release(){release++;}
 };
 return {pool:{async connect(){return client;}},sqls,
  rollbackCount:()=>rollback,releaseCount:()=>release};
}
describe("B0062 live-anchored MID/REGIONAL crossovers candidate census (no paid provider)",()=>{
 it("selects up to four reviewed metadata candidates per tier/region but never freezes paired airport IDs",async()=>{
  const f=fixture(),out=await inspectP5MidRegionalCandidateFrame(f.pool);
  expect(out.status).toBe("MID_REGIONAL_12_CELLS_CANDIDATES_ONLY_NOT_PAIR_FREEZE");
  expect(out.exactTierRegionCounts).toHaveLength(12);
  expect(out.candidates).toHaveLength(48);
  expect(out.verifiedDualEligibleRows).toBe(1125);
  expect(out.candidatesSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(out.ownerHubAnchors).toEqual(["WSSS","OMAA","SKBO","YSSY"]);
  expect(out.crossoverPairsSelected).toBe(false);
  expect(out.crossoverPairAirportsFrozen).toBe(false);
  expect(out.ordinaryRunDayAirportsPreselected).toBe(false);
  expect(out.randomizationPerformed).toBe(false);
  expect(out.historicalFiveAnchorGate2Passed).toBe(false);
  expect(out.realFidsReachabilityCertified).toBe(false);
  expect(out.phase5ScientificFreeze).toBe(false);
  expect(out.phase6PaidGo).toBe(false);
  expect(out.providerCalls).toBe(0);
  expect(out.dbWrites).toBe(0);
  expect(f.rollbackCount()).toBe(1);
  expect(f.releaseCount()).toBe(1);
  expect(f.sqls[0].sql).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(f.sqls.every(x=>!/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COMMIT)\b/i.test(x.sql))).toBe(true);
 });
 it("denies drift from owner-verified active reference SHA, missing cells and changed counts",async()=>{
  for(const options of [
   {changedRegistry:true},{noCell:true},{badRegionCount:true},{replica:true},
   {duplicateAirport:true},{wrongHash:true}
  ]){
   const f=fixture(options);
   await expect(inspectP5MidRegionalCandidateFrame(f.pool)).rejects.toThrow(
    /HOLD_P5_B0062_MID_REGIONAL_CANDIDATES_/
   );
   expect(f.rollbackCount()).toBe(1);
   expect(f.releaseCount()).toBe(1);
  }
 });
 it("reports a missing strict feed-qualified cell as HOLD without freezing a pair",async()=>{
  const f=fixture({noCandidateCell:true});
  const r=await inspectP5MidRegionalCandidateFrame(f.pool);
  expect(r.status).toBe("HOLD_INCOMPLETE_STRICT_MID_REGIONAL_CELLS");
  expect(r.missingStrictCells).toEqual(["MID|Asia-Pacific"]);
  expect(r.crossoverPairAirportsFrozen).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
  expect(f.rollbackCount()).toBe(1);
 });
 it("rolls back even when real SELECT fails, never mutating provider or DB",async()=>{
  const f=fixture({sqlFailure:true});
  await expect(inspectP5MidRegionalCandidateFrame(f.pool)).rejects.toThrow(
   "OFFLINE_MOCK_QUERY_FAILURE"
  );
  expect(f.rollbackCount()).toBe(1);
  expect(f.releaseCount()).toBe(1);
 });
});
