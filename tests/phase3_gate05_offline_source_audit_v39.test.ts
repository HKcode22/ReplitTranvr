import {describe,it,expect} from "vitest";
import {inventoryGate05OfflineItems} from "../server/lib/disruption/gate05OfflineInventory_v39";

function flight(dep:string,arr:string,number:string,more:Record<string,unknown>={}) {
  return {
    number,airline:{iata:"SQ"},status:2,codeshareStatus:1,
    departure:{airport:{icao:dep},scheduledTime:{utc:"2026-10-19T04:00:00Z"},
      runwayTime:{utc:"2026-10-19T04:05:00Z"}},
    arrival:{airport:{icao:arr},scheduledTime:{utc:"2026-10-19T06:00:00Z"}},
    ...more
  };
}
describe("Gate0.5 offline immutable-source item inventory (no provider)",()=>{
  it("separates WSSS outbound and inbound runway candidate counts",()=>{
    const r=inventoryGate05OfflineItems({airportIcao:"WSSS",items:[
      flight("WSSS","OMAA","1"),flight("EGLL","WSSS","2"),
      flight("WSSS","WSSS","3"),flight("KLAX","KSFO","4")
    ]});
    expect([r.roles.departure.items,r.roles.arrival.items,r.roles.both.items,r.roles.neither.items]).toEqual([1,1,1,1]);
    expect(r.roles.departure.departureRunwayCandidates).toBe(1);
    expect(r.roles.arrival.departureRunwayCandidates).toBe(1);
    expect(r.independentlyVerifiedActualTargets).toBeNull();
    expect(r.gate05PilotCertified).toBe(false);
  });
  it("duplicates composite keys but never calls them physical flight identities",()=>{
    const f=flight("WSSS","OMAA","123");
    const r=inventoryGate05OfflineItems({airportIcao:"wsss",items:[f,f]});
    expect(r.provisionalCompositeKeys).toBe(1);
    expect(r.repeatedCompositeKeys).toBe(1);
    expect(r.independentlyVerifiedUniqueFlights).toBeNull();
  });
  it("refuses malformed ICAO/items rather than filling invented measurements",()=>{
    expect(()=>inventoryGate05OfflineItems({airportIcao:"WSS!",items:[]})).toThrow("GATE05_ICAO_INVALID");
    expect(()=>inventoryGate05OfflineItems({airportIcao:"WSSS",items:[null]})).toThrow("GATE05_ITEM_MALFORMED");
    expect(()=>inventoryGate05OfflineItems({airportIcao:"WSSS",items:{} as any})).toThrow("GATE05_ITEMS_NOT_ARRAY");
  });
  it("keeps flight without schedule/number unkeyed and malformed times absent",()=>{
    const f=flight("WSSS","OMAA","",{
      departure:{airport:{icao:"WSSS"},scheduledTime:{utc:"not-a-time"},runwayTime:{utc:"last-week"}}
    });
    const r=inventoryGate05OfflineItems({airportIcao:"WSSS",items:[f]});
    expect(r.unkeyedItems).toBe(1);
    expect(r.fieldsPresent["departure.scheduledTime.utc"]).toBe(0);
    expect(r.fieldsPresent["departure.runwayTime.utc"]).toBe(0);
  });
  it("does not infer airborne eligibility from status or Mode-S alone",()=>{
    const a=flight("WSSS","OMAA","1",{aircraft:{modeS:"778899"}});
    const b=flight("WSSS","OMAA","2",{location:{
      lat:1.35,lon:103.98,reportedAtUtc:"2026-10-19T04:02:00Z"
    }});
    const r=inventoryGate05OfflineItems({airportIcao:"WSSS",items:[a,b]});
    expect(r.fieldsPresent["location.lat"]).toBe(1);
    expect(r.fieldsPresent["location.lon"]).toBe(1);
    expect(r.fieldsPresent["location.reportedAtUtc"]).toBe(1);
    expect(r.independentlyVerifiedAirborneFlights).toBeNull();
  });
  it("does not echo arbitrary untrusted status strings or flight identifiers",()=>{
    const r=inventoryGate05OfflineItems({airportIcao:"WSSS",items:[
      flight("WSSS","OMAA","SECRET123",{status:"not-a-status-personal-data"})
    ]});
    expect(r.roles.departure.statuses).toEqual({unknown_or_unrecognized:1});
    expect(JSON.stringify(r)).not.toContain("SECRET123");
    expect(JSON.stringify(r)).not.toContain("not-a-status-personal-data");
    expect(r.independentlyVerifiedFidsDenominator).toBeNull();
  });
});
