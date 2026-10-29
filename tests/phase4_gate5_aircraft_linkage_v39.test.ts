import {describe,it,expect,vi} from "vitest";
import {normalizeGate05AdsbLolOfflineV39} from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {assessP4AircraftLinkCandidates,assessP4DurabilityCatalog,P4_DURABLE_TABLES,
 P4_DURABILITY_SELECT,type P4Anchor} from "../server/lib/disruption/phase4Gate5AircraftLinkage_v39";
const now=Date.parse("2026-10-29T12:00:00Z"),iso=(n:number)=>new Date(n).toISOString();
const scope={airportIcao:"WSSS",startUtc:iso(now-3600000),endUtc:iso(now+3600000),
 cutoffUtc:iso(now+600000),auditUtc:iso(now+600000)};
const anchor=(extra:Partial<P4Anchor>={}):P4Anchor=>({
 flightInstanceId:"f1",originIcao:"WSSS",
 operatingLegStatus:"VERIFIED_OPERATING_LEG",codeshareRole:"OPERATOR",
 firstScheduledDepartureUtc:iso(now),flightIdentityAvailableAtUtc:iso(now-86400000),
 originalAircraftHex:"a12345",aircraftAssociationSource:"INDEPENDENT_PROVIDER_ORIGINAL_HEX",
 originalSourceSha256:"a".repeat(64),associationAvailableAtUtc:iso(now-60000),
 originalExpiresAtUtc:iso(now+3600000),sourceCallsign:"SIA123",...extra
});
const point=(t:number,hex="a12345",flight="SIA123",lat=1.37,lon=103.99)=>
 normalizeGate05AdsbLolOfflineV39({now:t,ac:[{
  hex,flight,lat,lon,seen_pos:0,alt_baro:3000,gs:180
 }]},iso(t));
const two=[point(now+100000),point(now+200000,"a12345","SIA123",1.41,104.01)];
const run=(a:P4Anchor[]=[anchor()],s=two)=>assessP4AircraftLinkCandidates(scope,a,s);
describe("P4-E candidate-only ADS-B operated-leg matching",()=>{
 it("2 plausible points plus retained provider-original hex => candidate, never certified",()=>{
  const r=run();expect(r.candidatePairs).toBe(1);expect(r.candidatePoints).toBe(2);
  expect(r.matchedPhysicalFlightsCertified).toBe(0);
  expect(r.airborneEligibleCertified).toBe(0);expect(r.verifiedRunwayLabels).toBe(0);
  expect(r.persistedRaw).toBe(false);
 });
 it("callsign alone cannot establish identity",()=>{
  expect(run([anchor({aircraftAssociationSource:"CALLSIGN_ONLY",
   originalAircraftHex:null})]).candidatePairs).toBe(0);
 });
 it("future association, expired original, marketing and unverified leg quarantine",()=>{
  for(const change of [
   {associationAvailableAtUtc:iso(now+700000)},
   {originalExpiresAtUtc:iso(now+200000)},
   {codeshareRole:"MARKETING" as const},
   {operatingLegStatus:"PROVISIONAL" as const}
  ])expect(run([anchor(change)]).candidatePairs).toBe(0);
 });
 it("same airframe used for two flights quarantines both, same flight two hexes too",()=>{
  expect(run([anchor(),anchor({flightInstanceId:"f2"})]).candidatePairs).toBe(0);
  expect(run([anchor(),anchor({originalAircraftHex:"b12345"})]).candidatePairs).toBe(0);
 });
 it("timestamp duplicate, one point and competing callsign are not pairs",()=>{
  expect(run([anchor()],[two[0]]).candidatePairs).toBe(0);
  expect(run([anchor()],[two[0],two[0]]).candidatePairs).toBe(0);
  expect(run([anchor()],[two[0],point(now+200000,"a12345","OTHER")]).candidatePairs).toBe(0);
 });
 it("implausible jump and post-cutoff observations never become trajectory",()=>{
  const jumped=run([anchor()],[two[0],point(now+110000,"a12345","SIA123",2,104.3)]);
  expect(jumped.candidatePairs).toBe(0);
  expect(jumped.invalidSegments).toBe(1);
  const early=assessP4AircraftLinkCandidates({...scope,cutoffUtc:iso(now+150000)},
   [anchor()],two);
  expect(early.candidatePairs).toBe(0);
 });
 it("no data or forged production approval cannot be reported as certified",()=>{
  expect(run([anchor()],[]).matchedPhysicalFlightsCertified).toBe(0);
  const x={...two[0],productionAccessApproved:true} as any;
  expect(()=>run([anchor()],[x])).toThrow("P4_LINK_SOURCE_PROVENANCE_HOLD");
 });
});
describe("P4-E LOGGED database catalog is only a schema guard",()=>{
 const logged=()=>P4_DURABLE_TABLES.map(name=>({name,persistence:"p"}));
 const conn=(rows:unknown[])=>({query:vi.fn(async()=>({rows}))});
 it("seven logged tables do NOT prove a real restart",async()=>{
  const r=await assessP4DurabilityCatalog(conn(logged()));
  expect(r.status).toBe("SCHEMA_LOGGED_ONLY_NOT_RESTART_PROOF");
  expect(r.realRestartExecuted).toBe(false);
  expect(r.databaseWrites).toBe(0);
 });
 it("missing, unlogged or duplicate catalog rows fail",async()=>{
  expect((await assessP4DurabilityCatalog(conn(logged().slice(1)))).status)
   .toBe("HOLD_UNLOGGED_OR_MISSING_TABLES");
  const rows=logged();rows[0].persistence="u";
  expect((await assessP4DurabilityCatalog(conn(rows))).status)
   .toBe("HOLD_UNLOGGED_OR_MISSING_TABLES");
  await expect(assessP4DurabilityCatalog(conn([rows[0],rows[0]])))
   .rejects.toThrow("P4_DURABILITY_UNEXPECTED_RELATION");
 });
 it("only pg_catalog SELECT, no live provider/DB writes",()=>{
  expect(P4_DURABILITY_SELECT.startsWith("SELECT")).toBe(true);
  expect(P4_DURABILITY_SELECT).toContain("pg_catalog.pg_class");
  expect(P4_DURABILITY_SELECT).not.toMatch(/\b(?:UPDATE|INSERT|DELETE)\b/i);
 });
});
