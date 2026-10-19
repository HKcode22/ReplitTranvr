/**
 * Gate0.5 FIDS two-query FEASIBILITY evidence, not a scientific gate PASS.
 * Pure and side-effect-free. Only aggregates, never exports flight numbers,
 * locations, raw provider records or provider IDs. This does not make calls,
 * certify physical-flight identity, actual labels, trajectories or licensing.
 */
type UnknownRecord=Record<string,unknown>;
export type Gate05FidsQueryResultsV39={
  airportIcao:string;
  fromLocal:string;
  toLocal:string;
  noLocation:{departures:unknown[];arrivals:unknown[]};
  withLocation:{departures:unknown[];arrivals:unknown[]};
  /** Measured independently at each request receipt; never fabricate it. */
  noLocationRetrievedAtUtc:string;
  withLocationRetrievedAtUtc:string;
};
export type Gate05AggregateV39={
  returnedDepartures:number;
  returnedArrivals:number;
  explicitlyWsssDepartures:number;
  unknownDepartureOrigin:number;
  otherOriginMisclassified:number;
  candidateScheduled:number;
  candidateRevised:number;
  candidateRunway:number;
  candidateScheduledRevisedPairs:number;
  candidateScheduledRunwayPairs:number;
  presentLocationObjects:number;
  validPositionPairs:number;
  validPositionPairsWithReportedClock:number;
  missingPositionObservationClock:number;
  statusCounts:Record<string,number>;
};
function obj(x:unknown):UnknownRecord {
  return x!==null && typeof x==="object" && !Array.isArray(x)
    ? x as UnknownRecord : {};
}
function at(x:unknown,path:string):unknown{
  return path.split(".").reduce<unknown>((v,key)=>obj(v)[key],x);
}
function validUtc(x:unknown):boolean{
  return typeof x==="string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x) &&
    Number.isFinite(Date.parse(x));
}
function localMinute(x:string):boolean{
  if(typeof x!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(x))return false;
  const d=new Date(x+":00Z");
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,16)===x;
}
function acceptableStatus(x:unknown):string {
  // Group unknowns instead of echoing untrusted free-form provider content.
  return typeof x==="number"&&Number.isInteger(x)&&x>=0&&x<=12
    ? String(x) : "other_or_unknown";
}
function stats(fids:{departures:unknown[];arrivals:unknown[]},airport:string):Gate05AggregateV39{
  const r:Gate05AggregateV39={
    returnedDepartures:fids.departures.length,returnedArrivals:fids.arrivals.length,
    explicitlyWsssDepartures:0,unknownDepartureOrigin:0,otherOriginMisclassified:0,
    candidateScheduled:0,candidateRevised:0,candidateRunway:0,
    candidateScheduledRevisedPairs:0,candidateScheduledRunwayPairs:0,
    presentLocationObjects:0,validPositionPairs:0,
    validPositionPairsWithReportedClock:0,missingPositionObservationClock:0,
    statusCounts:{}
  };
  // Count only items in departures, never the arrivals list or the opposite leg.
  for(const flight of fids.departures){
    if(!flight||typeof flight!=="object"||Array.isArray(flight))
      throw Error("GATE05_FIDS_ITEM_SHAPE_HOLD");
    const origin=at(flight,"departure.airport.icao");
    if(typeof origin!=="string" || !origin.trim()){
      r.unknownDepartureOrigin++;continue;
    }
    if(origin.trim().toUpperCase()!==airport){
      r.otherOriginMisclassified++;continue;
    }
    r.explicitlyWsssDepartures++;
    const code=acceptableStatus(at(flight,"status"));
    r.statusCounts[code]=(r.statusCounts[code]??0)+1;
    const scheduled=validUtc(at(flight,"departure.scheduledTime.utc"));
    const revised=validUtc(at(flight,"departure.revisedTime.utc"));
    const runway=validUtc(at(flight,"departure.runwayTime.utc"));
    if(scheduled)r.candidateScheduled++;
    if(revised)r.candidateRevised++;
    if(runway)r.candidateRunway++;
    if(scheduled&&revised)r.candidateScheduledRevisedPairs++;
    if(scheduled&&runway)r.candidateScheduledRunwayPairs++;
    const location=at(flight,"location");
    if(!location||typeof location!=="object"||Array.isArray(location))continue;
    r.presentLocationObjects++;
    const lat=at(location,"lat"),lon=at(location,"lon");
    const validCoords=typeof lat==="number"&&Number.isFinite(lat)&&Math.abs(lat)<=90 &&
      typeof lon==="number"&&Number.isFinite(lon)&&Math.abs(lon)<=180;
    if(validCoords){
      r.validPositionPairs++;
      if(validUtc(at(location,"reportedAtUtc")))
        r.validPositionPairsWithReportedClock++;
      else r.missingPositionObservationClock++;
    }
  }
  return r;
}
export function assessGate05FidsFeasibilityV39(v:Gate05FidsQueryResultsV39){
  if(!v||v.airportIcao!=="WSSS"||!localMinute(v.fromLocal)||
     !localMinute(v.toLocal)||v.fromLocal>=v.toLocal)
    throw Error("GATE05_FIDS_WINDOW_OR_AIRPORT_HOLD");
  for(const o of [v.noLocation,v.withLocation]){
    if(!o||!Array.isArray(o.departures)||!Array.isArray(o.arrivals)||
       o.departures.length>500||o.arrivals.length>500)
      throw Error("GATE05_FIDS_RESPONSE_SHAPE_OR_TRUNCATION_HOLD");
  }
  if(!validUtc(v.noLocationRetrievedAtUtc)||
     !validUtc(v.withLocationRetrievedAtUtc))
    throw Error("GATE05_FIDS_RETRIEVAL_CLOCK_HOLD");
  const base=stats(v.noLocation,"WSSS");
  const location=stats(v.withLocation,"WSSS");
  const possibleTruncation=[
    v.noLocation.departures.length+v.noLocation.arrivals.length>=500,
    v.withLocation.departures.length+v.withLocation.arrivals.length>=500
  ].some(Boolean);
  return {
    schema:"v39.gate05.two-query-feasibility-evidence.v1" as const,
    status:"SOURCE_FIELD_COVERAGE_ONLY_NOT_GATE05_PASS" as const,
    airportIcao:"WSSS" as const,
    // An explicit opt-in is NOT proof the provider actually returned location.
    locationOptionRequestedInSecondQuery:true as const,
    noLocationRetrievedAtUtc:v.noLocationRetrievedAtUtc,
    withLocationRetrievedAtUtc:v.withLocationRetrievedAtUtc,
    base,
    location,
    possibleTruncation,
    locationReturnedForAtLeastOneExplicitWsssDeparture:
      location.validPositionPairsWithReportedClock>0,
    verifiedUniquePhysicalFlights:null,
    verifiedAirborneTrajectories:null,
    independentlyVerifiedActualGateOut:null,
    independentlyVerifiedActualWheelsOff:null,
    selectedPredictionT:null,
    primaryDepartureDelayTarget:null,
    gate05ScientificPass:false as const,
    providerCallsByAssessor:0 as const,
    databaseWritesByAssessor:0 as const,
    // FIDS only measures availability at two retrievals, not legal retention.
    dataRetentionRightAttested:false as const
  };
}
