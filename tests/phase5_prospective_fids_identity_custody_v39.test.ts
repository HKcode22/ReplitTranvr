import {describe,it,expect} from "vitest";
import {
  canonicalFlightInstanceId,phase5ProspectiveCanonicalFlightIdV39,P5_CANONICAL_IDENTITY_VERSION,
  type CanonicalFlightInstanceInput
} from "../server/lib/disruption/flightInstanceCanonical_v3";
import {fetchFidsPopulation,type FidsCensusParams,type PopulationRow}
 from "../server/lib/disruption/fidsCensus_v3";
import {verifyCanonicalFidsEnvelopeV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";

const shared={operatingCarrier:"ZX",origin:"ZZAA",destinationOriginal:"ZZBB",serviceDate:"2026-12-01"};
const first:CanonicalFlightInstanceInput={...shared,operatingFlightNumber:"5293",
 scheduledGateOutUtc:"2026-12-01T00:05:00.000Z",providerFlightId:"synthetic-a"};
const distinct:CanonicalFlightInstanceInput={...shared,operatingFlightNumber:"4955",
 scheduledGateOutUtc:"2026-12-01T00:10:00.000Z",providerFlightId:"synthetic-b"};
const BASE:FidsCensusParams={
 airportIcao:"ZZAA",fromLocal:"2026-12-01T00:00",toLocal:"2026-12-01T04:00",
 ianaTimezone:"Etc/UTC",withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,
 direction:"Departure",serviceWindowStartUtc:new Date("2026-12-01T00:00:00.000Z"),
 serviceWindowEndUtc:new Date("2026-12-01T04:00:00.000Z"),
 cutoffUtc:new Date("2026-11-30T18:00:00.000Z"),restCategory:"fids_base",
 providerApiVersion:"synthetic",fidsProtocolVersion:"synthetic",openapiSha256:"a".repeat(64),
 phase5ProspectiveIdentityV39:P5_CANONICAL_IDENTITY_VERSION
};
const movement=(x:CanonicalFlightInstanceInput,status:"IsOperator"|"IsCodeshared"="IsOperator")=>({
 id:x.providerFlightId??null,number:x.operatingCarrier+x.operatingFlightNumber,
 codeshareStatus:status,isCargo:false,isPrivate:false,isCharter:false,
 departure:{airport:{icao:x.origin},scheduledTime:{utc:x.scheduledGateOutUtc}},
 arrival:{airport:{icao:x.destinationOriginal},scheduledTime:{utc:"2026-12-01T06:00:00.000Z"}}
});
async function observe(departures:ReturnType<typeof movement>[],params:FidsCensusParams=BASE){
 let rows:PopulationRow[]=[];let fetches=0;let persists=0;
 const result=await fetchFidsPopulation(params,{
  fetchAirport:async()=>{fetches++;return {departures,arrivals:[]};},
  now:()=>new Date("2026-11-30T17:45:00.000Z"),
  persist:async(_q,rs)=>{
   persists++;rows=rs;
   // Existing DB unique observation key. Here we prove no row would be
   // silently discarded on the normalized key; not a real PG transaction.
   expect(new Set(rs.map(r=>JSON.stringify([r.populationQueryId,r.analyticIdentityId,r.populationRole]))).size)
    .toBe(rs.length);
   expect(new Set(rs.map(r=>JSON.stringify([r.sourceAirportIcao,r.cutoffUtc,r.flightNumber,r.carrierIata,r.providerRecordKey]))).size).toBe(rs.length);
   return rs.length;
  }
 });
 expect(fetches).toBe(1);expect(persists).toBe(1);
 expect(result?.persistedPopulationRows).toBe(rows.length);
 return {rows,result};
}
describe("future scoped Phase5 FIDS identity representation and custody",()=>{
 it("separates the reproduced 32-bit collision while keeping legacy keys and the same stable base",()=>{
  expect(canonicalFlightInstanceId(first).flight_instance_id).toBe("leg:248b5aa6");
  expect(canonicalFlightInstanceId(distinct).flight_instance_id).toBe("leg:248b5aa6");
  expect(phase5ProspectiveCanonicalFlightIdV39(first)).toMatch(/^leg:p5v1:[0-9a-f]{64}$/);
  expect(phase5ProspectiveCanonicalFlightIdV39(first)).not.toBe(phase5ProspectiveCanonicalFlightIdV39(distinct));
  expect(phase5ProspectiveCanonicalFlightIdV39({...first,providerFlightId:"not-key-material"}))
    .toBe(phase5ProspectiveCanonicalFlightIdV39(first));
 });
 it("preserves the initial anchor if actually supplied, but never pretends a fresh retime is resolved",()=>{
  const changed={...first,scheduledGateOutUtc:"2026-12-01T00:35:00.000Z"};
  expect(phase5ProspectiveCanonicalFlightIdV39(changed)).not.toBe(phase5ProspectiveCanonicalFlightIdV39(first));
  expect(phase5ProspectiveCanonicalFlightIdV39({...changed,initialServiceDate:first.serviceDate,
   firstScheduledGateOutUtc:first.scheduledGateOutUtc})).toBe(phase5ProspectiveCanonicalFlightIdV39(first));
 });
 it("persists two distinct formerly colliding identities and a verifiable version marker",async()=>{
  const {rows,result}=await observe([movement(first),movement(distinct)]);
  expect(rows.map(x=>x.canonicalFlightInstanceId)).toEqual([
   phase5ProspectiveCanonicalFlightIdV39(first),phase5ProspectiveCanonicalFlightIdV39(distinct)]);
  expect(result?.flightInstanceIds).toHaveLength(2);
  expect(result?.rawJson).toMatchObject({phase5PopulationIdentityVersion:P5_CANONICAL_IDENTITY_VERSION});
  expect(verifyCanonicalFidsEnvelopeV39(result?.rawJson)).toBe("verified");
 });
 it("never selects either of two duplicate same-base rows, preserves both and an unrelated positive leg",async()=>{
  const {rows,result}=await observe([movement(first),movement({...first,providerFlightId:"different-reported-id"}),movement(distinct)]);
  expect(rows).toHaveLength(3);
  for(const row of rows.slice(0,2)){
   expect(row.canonicalFlightInstanceId).toBeNull();
   expect(row.analyticIdentityId).toMatch(/^provisional:[0-9a-f]{64}$/);
   expect(row.codeshareResolutionStatus).toBe("phase5_duplicate_identity_ambiguous");
   expect(JSON.parse(row.provenanceJson)).toMatchObject({canonicalFlightInstanceId:null,
    codeshareResolutionStatus:"phase5_duplicate_identity_ambiguous"});
  }
  expect(result?.flightInstanceIds).toEqual([phase5ProspectiveCanonicalFlightIdV39(distinct)]);
 });
 it("censors a repeated provider record key even if two fresh schedules hash differently",async()=>{
  const retimed={...first,scheduledGateOutUtc:"2026-12-01T00:35:00.000Z"};
  const {rows,result}=await observe([movement(first),movement(retimed),movement(distinct)]);
  expect(rows).toHaveLength(3);
  expect(rows.slice(0,2).map(x=>x.codeshareResolutionStatus)).toEqual([
   "phase5_duplicate_provider_record_ambiguous","phase5_duplicate_provider_record_ambiguous"]);
  expect(rows.slice(0,2).every(x=>x.canonicalFlightInstanceId===null&&/^fidsrec:p5amb:[0-9a-f]{64}$/.test(x.providerRecordKey))).toBe(true);
  expect(result?.flightInstanceIds).toEqual([phase5ProspectiveCanonicalFlightIdV39(distinct)]);
 });
 it("preserves exact duplicate reported IDs using separate observation keys and the unchanged original",async()=>{
  const {rows,result}=await observe([movement(first),movement(first),movement(distinct)]);
  expect(rows).toHaveLength(3);
  expect(rows.slice(0,2).every(x=>x.canonicalFlightInstanceId===null&&/^fidsrec:p5amb:[0-9a-f]{64}$/.test(x.providerRecordKey))).toBe(true);
  expect(new Set(rows.slice(0,2).map(x=>x.providerRecordKey)).size).toBe(2);
  expect((result?.rawJson as {departures:ReturnType<typeof movement>[]}).departures.slice(0,2).map(x=>x.id)).toEqual(["synthetic-a","synthetic-a"]);
  expect(result?.flightInstanceIds).toEqual([phase5ProspectiveCanonicalFlightIdV39(distinct)]);
 });
 it("retains every duplicate provisional marketing observation without promoting it",async()=>{
  const {rows,result}=await observe([movement(first,"IsCodeshared"),movement(first,"IsCodeshared")]);
  expect(rows).toHaveLength(2);
  expect(rows.every(x=>x.canonicalFlightInstanceId===null)).toBe(true);
  expect(result?.flightInstanceIds).toEqual([]);
 });
 it("keeps legacy census and G5A representation unchanged when new scoped mode is absent",async()=>{
  const {phase5ProspectiveIdentityV39:_,...legacy}=BASE;
  const normal=await observe([movement(first)],legacy);
  expect(normal.rows[0].canonicalFlightInstanceId).toBe("leg:248b5aa6");
  expect(normal.result?.rawJson).not.toHaveProperty("phase5PopulationIdentityVersion");
  const historical=await observe([movement(first)],{...legacy,g5aObservedScheduleProtocol:true});
  expect(historical.rows[0].canonicalFlightInstanceId).toMatch(/^leg:g5a:[0-9a-f]{64}$/);
  expect(historical.result?.rawJson).not.toHaveProperty("phase5PopulationIdentityVersion");
 });
 it("uses the same representation in the existing V0083 future POST reservation scope",async()=>{
  const {phase5ProspectiveIdentityV39:_,...legacy}=BASE;
  const {rows,result}=await observe([movement(first)],{...legacy,restCategory:"outcome",
   phase5PostReservationSha256:"b".repeat(64)});
  expect(rows[0].canonicalFlightInstanceId).toBe(phase5ProspectiveCanonicalFlightIdV39(first));
  expect(result?.rawJson).toMatchObject({phase5PopulationIdentityVersion:P5_CANONICAL_IDENTITY_VERSION,
   phase5PostReservationSha256:"b".repeat(64)});
 });
 it("refuses the new SOURCE mode outside its declared scope before a provider call",async()=>{
  for(const changed of [{direction:"Arrival" as const},{restCategory:"outcome" as const},
   {g5aObservedScheduleProtocol:true},{g5aPostReservationId:"old"}]){
   let calls=0;
   await expect(fetchFidsPopulation({...BASE,...changed},{
    fetchAirport:async()=>{calls++;return {departures:[],arrivals:[]};}
   })).rejects.toThrow("P5_PROSPECTIVE_IDENTITY_SCOPE_INVALID_HOLD");
   expect(calls).toBe(0);
  }
 });
});
