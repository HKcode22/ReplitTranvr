import { describe, expect, it } from "vitest";
import {
  localServiceDateOrNull,
  utcIntervalToLocal,
  fetchFidsPopulation,
  type FidsCensusParams,
  type PopulationRow,
} from "../server/lib/disruption/fidsCensus_v3";

const BASE: FidsCensusParams = {
  airportIcao: "KLAX",
  fromLocal: "2026-09-01 00:00",
  toLocal: "2026-09-01 12:00",
  ianaTimezone: "America/Los_Angeles",
  withCancelled: true,
  withCodeshared: true,
  withCargo: false,
  withPrivate: false,
  direction: "Both",
  serviceWindowStartUtc: new Date("2026-09-01T07:00:00Z"),
  serviceWindowEndUtc: new Date("2026-09-01T19:00:00Z"),
  cutoffUtc: new Date("2026-09-01T19:00:00Z"),
  providerApiVersion: "test",
  fidsProtocolVersion: "test",
  openapiSha256: "a".repeat(64),
};

describe("V3.9 FIDS service-date identity", () => {
  it("never substitutes today's date or UTC date when schedule/timezone is unavailable", () => {
    expect(localServiceDateOrNull(null, "America/Los_Angeles")).toBeNull();
    expect(localServiceDateOrNull("not-a-date", "America/Los_Angeles")).toBeNull();
    expect(localServiceDateOrNull("2026-09-01T08:00:00Z", "not-a-zone")).toBeNull();
    expect(localServiceDateOrNull("2026-09-01T08:00:00Z", "America/Los_Angeles")).toBe("2026-09-01");
  });

  it("invalid IANA timezone refuses interval conversion instead of falling back to UTC", () => {
    expect(() => utcIntervalToLocal(
      new Date("2026-09-01T07:00:00Z"),
      new Date("2026-09-01T19:00:00Z"),
      "invalid-zone",
    )).toThrow(/timezone/i);
  });

  it("retains an in-window FIDS record with unresolved departure identity as provisional, never canonical", async () => {
    const persisted: PopulationRow[] = [];
    const result = await fetchFidsPopulation(BASE, {
      fetchAirport: async () => ({
        departures: [],
        arrivals: [{
          id: null,
          number: "UA123",
          codeshareStatus: 1,
          isCargo: false,
          isPrivate: false,
          isCharter: false,
          departure: { airport: { icao: "KSFO", iata: "SFO" }, scheduledTime: { utc: null } },
          arrival: { airport: { icao: "KLAX", iata: "LAX" }, scheduledTime: { utc: "2026-09-01T18:00:00Z" } },
        }],
      }),
      now: () => new Date("2026-09-01T18:01:00Z"),
      persist: async (_q, rows) => { persisted.push(...rows); return rows.length; },
    });
    expect(result?.flightCount).toBe(1);
    expect(result?.flightInstanceIds).toEqual([]);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].canonicalFlightInstanceId).toBeNull();
    expect(persisted[0].analyticIdentityId).toMatch(/^provisional:/);
    expect(persisted[0].codeshareResolutionStatus).toBe("ambiguous_distinct_leg");
    expect(persisted[0].depScheduledUtc).toBeNull();
  });

  it("does not count a marketing codeshare as a confirmed physical operating leg",async()=>{
    const persisted:PopulationRow[]=[];
    const makeFlight=(number:string,status:"IsOperator"|"IsCodeshared")=>({
      id:null,number,codeshareStatus:status,
      isCargo:false,isPrivate:false,isCharter:false,
      departure:{airport:{icao:"KLAX",iata:"LAX"},
        scheduledTime:{utc:"2026-09-01 18:00Z"}},
      arrival:{airport:{icao:"KSFO",iata:"SFO"},
        scheduledTime:{utc:"2026-09-01 19:00Z"}}
    });
    await fetchFidsPopulation({...BASE,direction:"Departure"},{
      fetchAirport:async()=>({departures:[
        makeFlight("UA123","IsOperator"),makeFlight("AC999","IsCodeshared")
      ],arrivals:[]}),
      now:()=>new Date("2026-09-01T18:05:00Z"),
      persist:async(_q,rows)=>{persisted.push(...rows);return rows.length;}
    });
    expect(persisted).toHaveLength(2);
    const op=persisted.find(x=>x.flightNumber==="UA123");
    const marketing=persisted.find(x=>x.flightNumber==="AC999");
    expect(op?.codeshareResolutionStatus).toBe("confirmed_operating_leg");
    expect(marketing?.codeshareResolutionStatus).toBe("resolved_marketing");
    expect(marketing?.canonicalFlightInstanceId).toBeNull();
    expect(marketing?.analyticIdentityId).toMatch(/^provisional:/);
  });

  it("retains a FIDS omitted origin via declared query context without falsely confirming physical identity",async()=>{
    const received:PopulationRow[]=[];
    await fetchFidsPopulation({...BASE,direction:"Departure"},{
      fetchAirport:async()=>({
        departures:[{
          number:"UA123",id:null,codeshareStatus:"IsOperator",
          isCargo:false,isPrivate:false,isCharter:false,
          // Provider may omit the requested origin from departure.
          departure:{scheduledTime:{utc:"2026-09-01 18:00Z"}},
          arrival:{airport:{icao:"KSFO"},scheduledTime:{utc:"2026-09-01 19:00Z"}}
        }],arrivals:[]
      }),
      now:()=>new Date("2026-09-01T18:05:00Z"),
      persist:async(_q,rows)=>{received.push(...rows);return rows.length;}
    });
    expect(received).toHaveLength(1);
    expect(received[0].depAirportIcao).toBe("KLAX");
    expect(received[0].codeshareResolutionStatus).toBe("context_departure_origin_unverified");
    expect(received[0].canonicalFlightInstanceId).toBeNull();
    expect(received[0].analyticIdentityId).toMatch(/^provisional:/);
  });
  it("does not silently rewrite an explicitly foreign departure origin to the requested airport",async()=>{
    const received:PopulationRow[]=[];
    await fetchFidsPopulation({...BASE,direction:"Departure"},{
      fetchAirport:async()=>({
        departures:[{
          number:"UA123",codeshareStatus:"IsOperator",id:null,
          isCargo:false,isPrivate:false,isCharter:false,
          departure:{airport:{icao:"KJFK"},scheduledTime:{utc:"2026-09-01 18:00Z"}},
          arrival:{airport:{icao:"KSFO"},scheduledTime:{utc:"2026-09-01 19:00Z"}}
        }],arrivals:[]
      }),
      now:()=>new Date("2026-09-01T18:05:00Z"),
      persist:async(_q,rows)=>{received.push(...rows);return rows.length;}
    });
    expect(received).toHaveLength(1);
    expect(received[0].depAirportIcao).toBe("KJFK");
    expect(received[0].codeshareResolutionStatus).toBe("foreign_departure_origin_unverified");
    expect(received[0].canonicalFlightInstanceId).toBeNull();
  });

  it("accepts ADB spaced two-character flight numbers but never upgrades context-only or marketing records",async()=>{
    const observed: PopulationRow[]=[];
    const dep=(number:string,status:"IsOperator"|"IsCodeshared",origin?:string)=>({
      number,codeshareStatus:status,id:null,isCargo:false,isPrivate:false,isCharter:false,
      departure:{
        ...(origin?{airport:{icao:origin}}:{}),
        scheduledTime:{utc:"2026-09-01 18:00Z"}
      },
      arrival:{
        airport:{icao:"KSFO"},
        scheduledTime:{utc:"2026-09-01 19:00Z"}
      }
    });
    await fetchFidsPopulation({...BASE,direction:"Departure"},{
      fetchAirport:async()=>({
        departures:[
          dep("UA 0123","IsOperator"),
          dep("AC 0099","IsCodeshared"),
          dep("UA0124","IsOperator","KLAX"),
          dep("UA 12A","IsOperator"),
          dep("ABC123","IsOperator")
        ],
        arrivals:[]
      }),
      now:()=>new Date("2026-09-01T18:05:00Z"),
      persist:async(_q,rows)=>{observed.push(...rows);return rows.length;}
    });
    expect(observed).toHaveLength(5);
    const context=observed[0];
    expect(context.flightNumber).toBe("UA123");
    expect(context.carrierIata).toBe("UA");
    expect(context.codeshareResolutionStatus).toBe("context_departure_origin_unverified");
    expect(context.canonicalFlightInstanceId).toBeNull();
    expect(context.analyticIdentityId).toMatch(/^provisional:/);
    expect(observed[1].flightNumber).toBe("AC99");
    expect(observed[1].codeshareResolutionStatus).toBe("resolved_marketing");
    expect(observed[1].canonicalFlightInstanceId).toBeNull();
    expect(observed[2].flightNumber).toBe("UA124");
    expect(observed[2].codeshareResolutionStatus).toBe("confirmed_operating_leg");
    expect(observed[2].canonicalFlightInstanceId).not.toBeNull();
    for(const x of observed.slice(3)){
      expect(x.codeshareResolutionStatus).toBe("ambiguous_distinct_leg");
      expect(x.canonicalFlightInstanceId).toBeNull();
      expect(x.carrierIata).toBeNull();
    }
  });

  it("invalid airport timezone refuses the census before any provider call", async () => {
    let calls = 0;
    await expect(fetchFidsPopulation({ ...BASE, ianaTimezone: "not-a-zone" }, {
      fetchAirport: async () => { calls += 1; return { departures: [], arrivals: [] }; },
      persist: async () => 0,
    })).rejects.toThrow(/timezone/i);
    expect(calls).toBe(0);
  });
});
