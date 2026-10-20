import {describe,it,expect} from "vitest";
import {assessGate05FidsFeasibilityV39} from "../server/lib/disruption/gate05FidsResponseFeasibility_v39";
const mk=(dep:string,location?:unknown)=>({
  number:"SENSITIVE-SQ123",status:6,departure:{
    airport:{icao:dep},
    scheduledTime:{utc:"2026-10-19T04:00:00Z"},
    revisedTime:{utc:"2026-10-19T04:03:00Z"},
    runwayTime:{utc:"2026-10-19T04:09:00Z"}
  },arrival:{airport:{icao:"OMAA"}},...(location?{location}:{})
});
const input=()=>({
  airportIcao:"WSSS",fromLocal:"2026-10-19T12:00",toLocal:"2026-10-19T13:00",
  noLocationRetrievedAtUtc:"2026-10-19T04:00:00Z",
  withLocationRetrievedAtUtc:"2026-10-19T04:00:02Z",
  noLocation:{departures:[mk("WSSS")],arrivals:[mk("EGLL")]},
  withLocation:{departures:[mk("WSSS",{
    lat:1.35,lon:103.98,reportedAtUtc:"2026-10-19T03:59:59Z"
  })],arrivals:[mk("EGLL",{
    lat:1.32,lon:103.9,reportedAtUtc:"2026-10-19T03:59:50Z"
  })]}
});
describe("Gate05 two-query evidence respects request-role and scientific boundaries",()=>{
  it("counts FIDS implicit origin and movement-only flight without overstating identity",()=>{
    const x=input();
    const implicit=mk("WSSS",{lat:1.35,lon:103.98,reportedAtUtc:"2026-10-19T03:59:59Z"});
    delete (implicit.departure.airport as any).icao;
    const movementOnly={
      number:"NOT-EXPORTED",status:"EnRoute",
      movement:{
        scheduledTime:{utc:"2026-10-19T04:00:00Z"},
        revisedTime:{utc:"2026-10-19T04:05:00Z"},
        runwayTime:{utc:"2026-10-19T04:09:00Z"}
      },
      location:{lat:1.35,lon:103.98,reportedAtUtc:"2026-10-19T04:00:00Z"}
    };
    x.withLocation.departures=[implicit,movementOnly] as any;
    const r=assessGate05FidsFeasibilityV39(x);
    expect(r.location.explicitlyWsssDepartures).toBe(0);
    expect(r.location.impliedWsssDeparturesFromFidsList).toBe(2);
    expect(r.location.eligibleWsssDepartures).toBe(2);
    expect(r.location.candidateScheduledRunwayPairs).toBe(2);
    expect(r.location.statusCounts.EnRoute).toBe(1);
    expect(r.location.validPositionPairsWithReportedClock).toBe(2);
    expect(r.verifiedUniquePhysicalFlights).toBeNull();
    expect(r.gate05ScientificPass).toBe(false);
    expect(JSON.stringify(r)).not.toContain("NOT-EXPORTED");
  });
  it("does not accept malformed or contradictory departure movement shapes",()=>{
    const x=input();
    x.withLocation.departures=[
      {number:"a",status:"Expected"},
      {number:"b",status:"Departed",departure:{scheduledTime:{utc:"2026-10-19T04:00:00Z"}},movement:{}}
    ] as any;
    const r=assessGate05FidsFeasibilityV39(x);
    expect(r.location.eligibleWsssDepartures).toBe(0);
    expect(r.location.unknownDepartureOrigin).toBe(2);
  });

  it("reports real requested-airport departure position without claiming trajectory",()=>{
    const r=assessGate05FidsFeasibilityV39(input());
    expect(r.base.returnedDepartures).toBe(1);
    expect(r.base.returnedArrivals).toBe(1);
    expect(r.location.validPositionPairsWithReportedClock).toBe(1);
    expect(r.locationReturnedForAtLeastOneExplicitWsssDeparture).toBe(true);
    expect(r.location.candidateScheduledRevisedPairs).toBe(1);
    expect(r.location.candidateScheduledRunwayPairs).toBe(1);
    expect(r.verifiedAirborneTrajectories).toBeNull();
    expect(r.independentlyVerifiedActualGateOut).toBeNull();
    expect(r.independentlyVerifiedActualWheelsOff).toBeNull();
    expect(r.primaryDepartureDelayTarget).toBeNull();
    expect(r.gate05ScientificPass).toBe(false);
    expect(r.providerCallsByAssessor).toBe(0);
    expect(JSON.stringify(r)).not.toContain("SENSITIVE");
  });
  it("rejects contradictory origin while distinguishing list-implied WSSS from explicit evidence",()=>{
    const x=input();
    x.withLocation.departures=[mk("EGLL",{lat:1,lon:2,reportedAtUtc:"2026-10-19T04:00:00Z"}),
      mk("",{lat:1,lon:2,reportedAtUtc:"2026-10-19T04:00:00Z"})];
    const r=assessGate05FidsFeasibilityV39(x);
    expect(r.location.explicitlyWsssDepartures).toBe(0);
    expect(r.location.otherOriginMisclassified).toBe(1);
    expect(r.location.unknownDepartureOrigin).toBe(0);
    expect(r.location.impliedWsssDeparturesFromFidsList).toBe(1);
    expect(r.location.eligibleWsssDepartures).toBe(1);
    expect(r.location.validPositionPairsWithReportedClock).toBe(1);
    expect(r.gate05ScientificPass).toBe(false);
  });
  it("distinguishes valid coordinates from observation-clock availability",()=>{
    const x=input();
    x.withLocation.departures=[
      mk("WSSS",{lat:1,lon:2}),
      mk("WSSS",{lat:95,lon:2,reportedAtUtc:"2026-10-19T04:00:00Z"})
    ];
    const r=assessGate05FidsFeasibilityV39(x);
    expect(r.location.presentLocationObjects).toBe(2);
    expect(r.location.validPositionPairs).toBe(1);
    expect(r.location.missingPositionObservationClock).toBe(1);
    expect(r.location.validPositionPairsWithReportedClock).toBe(0);
  });
  it("rejects invalid local time, response shape, retrieval and possible truncation",()=>{
    const x=input();
    expect(()=>assessGate05FidsFeasibilityV39({...x,toLocal:x.fromLocal}))
      .toThrow("GATE05_FIDS_WINDOW_OR_AIRPORT_HOLD");
    expect(()=>assessGate05FidsFeasibilityV39({...x,airportIcao:"EGLL"}))
      .toThrow("GATE05_FIDS_WINDOW_OR_AIRPORT_HOLD");
    expect(()=>assessGate05FidsFeasibilityV39({...x,
      noLocation:{departures:new Array(501).fill(mk("WSSS")),arrivals:[]}}))
      .toThrow("GATE05_FIDS_RESPONSE_SHAPE_OR_TRUNCATION_HOLD");
    expect(()=>assessGate05FidsFeasibilityV39({...x,noLocationRetrievedAtUtc:"yesterday"}))
      .toThrow("GATE05_FIDS_RETRIEVAL_CLOCK_HOLD");
    const y={...x,noLocation:{...x.noLocation,arrivals:new Array(499).fill(mk("EGLL"))}};
    expect(assessGate05FidsFeasibilityV39(y).possibleTruncation).toBe(true);
  });
  it("never infers provider request sent, distinct flights, or actual labels from status code",()=>{
    const x=input();
    x.withLocation.departures=[mk("WSSS",{lat:1.3,lon:103.7,reportedAtUtc:"2026-10-19T04:00:00Z"}),
      mk("WSSS",{lat:1.3,lon:103.7,reportedAtUtc:"2026-10-19T04:00:00Z"})];
    const r=assessGate05FidsFeasibilityV39(x);
    expect(r.location.validPositionPairsWithReportedClock).toBe(2);
    expect(r.verifiedUniquePhysicalFlights).toBeNull();
    expect(r.verifiedAirborneTrajectories).toBeNull();
    expect(r.gate05ScientificPass).toBe(false);
  });
});
