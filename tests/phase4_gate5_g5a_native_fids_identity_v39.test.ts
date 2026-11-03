import {describe,it,expect} from "vitest";
import {fetchFidsPopulation,type FidsCensusParams,
 type FidsQueryObservation,type PopulationRow}
 from "../server/lib/disruption/fidsCensus_v3";

const base=():FidsCensusParams=>({
 airportIcao:"WSSS",fromLocal:"2026-11-05T10:00",
 toLocal:"2026-11-05T11:00",ianaTimezone:"Asia/Singapore",
 serviceWindowStartUtc:new Date("2026-11-05T02:00:00.000Z"),
 serviceWindowEndUtc:new Date("2026-11-05T03:00:00.000Z"),
 cutoffUtc:new Date("2026-11-04T02:30:00.000Z"),
 direction:"Departure",withCancelled:true,withCodeshared:true,
 withCargo:false,withPrivate:false,restCategory:"fids_base",
 providerApiVersion:"v1.15.4",fidsProtocolVersion:"g5a.1",
 openapiSha256:"a".repeat(64),g5aObservedScheduleProtocol:true
});
const leg=(scheduled:string,id:string|null="G5A-OPERATING-LEG-121")=>({
 ...(id?{id}:{}),number:"SQ 115",codeshareStatus:"IsOperator",
 isCargo:false,isPrivate:false,isCharter:false,
 departure:{scheduledTime:{utc:scheduled}},
 arrival:{airport:{icao:"YSSY"},scheduledTime:{utc:"2026-11-05T08:15:00.000Z"}}
});
async function one(params:FidsCensusParams,raw:unknown){
 let query:FidsQueryObservation|null=null;
 let rows:PopulationRow[]=[];
 const result=await fetchFidsPopulation(params,{
  fetchAirport:async()=>({departures:[raw],arrivals:[]}),
  persist:async(q,r)=>{query=q;rows=r;return r.length},
  now:()=>new Date("2026-11-04T01:00:00.000Z")
 });
 expect(result?.persistedPopulationRows).toBe(1);
 expect(query).not.toBeNull();
 expect(rows).toHaveLength(1);
 return {row:rows[0],query:query!,result:result!};
}
describe("G5A provider FIDS native identity, prospectively enabled only",()=>{
 it("same provider physical flight remains same ID across scheduled time retime",async()=>{
  const q=base();
  const first=await one(q,leg("2026-11-05T02:20:00.000Z"));
  const retime=await one(q,leg("2026-11-05T02:40:00.000Z"));
  expect(first.row.analyticIdentityId).toBe(retime.row.analyticIdentityId);
  expect(first.row.canonicalFlightInstanceId).toBe(retime.row.canonicalFlightInstanceId);
  expect(first.row.analyticIdentityId).toMatch(/^leg:g5a:[a-f0-9]{64}$/);
  expect(first.row.depScheduledUtc!.toISOString()).not.toBe(
   retime.row.depScheduledUtc!.toISOString());
  expect(first.row.populationRole).toBe("requested_airport_primary");
  expect(first.row.codeshareResolutionStatus).toBe("confirmed_operating_leg");
  expect(first.row.scopeClassification).toBe("confirmed_core");
  expect(first.query.rawPayload).toHaveProperty("g5aProtocol",
   "G5A_FIRST_PROVIDER_REPORTED_SCHEDULE_REVISION");
 });
 it("different provider flight ID and destination must never silently merge",async()=>{
  const a=await one(base(),leg("2026-11-05T02:20:00.000Z","P-1"));
  const b=await one(base(),leg("2026-11-05T02:20:00.000Z","P-2"));
  const c=await one(base(),{
   ...leg("2026-11-05T02:20:00.000Z","P-1"),
   arrival:{airport:{icao:"OMAA"}}
  });
  expect(a.row.analyticIdentityId).not.toBe(b.row.analyticIdentityId);
  expect(a.row.analyticIdentityId).not.toBe(c.row.analyticIdentityId);
 });
 it("missing provider ID is still observable but cannot become confirmed operating G5A identity",async()=>{
  const z=await one(base(),leg("2026-11-05T02:20:00.000Z",null));
  expect(z.row.canonicalFlightInstanceId).toBeNull();
  expect(z.row.analyticIdentityId).toMatch(/^provisional:/);
  expect(z.row.codeshareResolutionStatus).toBe("g5a_stable_provider_id_missing");
 });
 it("marketing leg and foreign origin cannot be promoted",async()=>{
  const marketing=await one(base(),{
   ...leg("2026-11-05T02:20:00.000Z"),
   codeshareStatus:"IsCodeshared"
  });
  expect(marketing.row.canonicalFlightInstanceId).toBeNull();
  const foreign=await one(base(),{
   ...leg("2026-11-05T02:20:00.000Z"),
   departure:{airport:{icao:"OMAA"},
    scheduledTime:{utc:"2026-11-05T02:20:00.000Z"}}
  });
  expect(foreign.row.canonicalFlightInstanceId).toBeNull();
 });
 it("legacy f.8 conservatism remains exact when G5A flag is absent",async()=>{
  const p=base();delete p.g5aObservedScheduleProtocol;
  const historical=await one(p,leg("2026-11-05T02:20:00.000Z"));
  expect(historical.row.canonicalFlightInstanceId).toBeNull();
  expect(historical.row.codeshareResolutionStatus)
   .toBe("context_departure_origin_unverified");
 });
});
