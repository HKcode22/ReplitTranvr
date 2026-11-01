/**
 * Phase 4 / Gate 5 ONLY: a pure non-adaptive three-horizon candidate FIDS
 * acquisition-grid calculator. NEVER a source/time/identity certificate,
 * runnable Actions scheduler, provider invocation, or budget reservation.
 * Binding V3.9-f.8 §§5.1-5.4 / 6.0 / 16-17.
 */
export type P4Gate5GridHorizonV39 = "T-24h"|"T-6h"|"T-90m";
export const P4_GATE5_GRID_HORIZONS_V39=[
  ["T-24h",1440],["T-6h",360],["T-90m",90]
] as const;

export interface P4Gate5GridDraftInputV39 {
  airportIcao:string;
  airportIanaTimezone:string;
  serviceWindowStartUtc:string;
  serviceWindowEndUtc:string;
  assignmentFrozenAtUtc:string;
  acquisitionGuardMinutes:number;
  refreshCadenceMinutes:number;
  maxStalenessMinutes:number;
  githubPrearmLeadMinutes:number;
  apiUnitsPerPhysicalAttempt:number;
  maxAttemptsPerQuery:number;
  projectRestApiUnitsBudget:number;
  maxSourceQueries:number;
}

export interface P4Gate5GridDraftQueryV39 {
  horizon:P4Gate5GridHorizonV39;
  candidateGridCutoffUtc:string;
  plannedPhysicalStartUtc:string;
  providerQueryFromLocal:string;
  providerQueryToLocal:string;
  sourceAirportIcao:string;
  requestDirection:"Departure";
  withLeg:true;
  withCancelled:true;
  withCodeshared:true;
  withCargo:false;
  withPrivate:false;
}

function exactUtc(s:string,label:string):number {
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s))
    throw Error("P4_GRID_INVALID_UTC:"+label);
  const t=Date.parse(s);
  if(!Number.isFinite(t)||new Date(t).toISOString()!==s)
    throw Error("P4_GRID_INVALID_UTC:"+label);
  return t;
}
function integer(n:number,min:number,max:number,label:string):number {
  if(!Number.isSafeInteger(n)||n<min||n>max)
    throw Error("P4_GRID_INVALID_NUMBER:"+label);
  return n;
}
function localStamp(time:number,zone:string){
  const minuteTime=Math.floor(time/60000)*60000;
  const dtf=new Intl.DateTimeFormat("en-GB",{
    timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  });
  const p=Object.fromEntries(dtf.formatToParts(new Date(minuteTime))
    .filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  const stamp=`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  // Local-zone offset cannot be inferred from a formatted clock alone.
  // Use ONLY to identify changing offsets and conservatively HOLD the
  // interval; never resolve DST overlap by a guessed UTC conversion.
  const offset=(Date.parse(stamp+":00.000Z")-minuteTime)/60000;
  if(!Number.isFinite(offset))throw Error("P4_GRID_LOCAL_STAMP_INVALID");
  return {stamp,offset};
}

export function draftP4Gate5ThreeHorizonGridV39(i:P4Gate5GridDraftInputV39){
  if(!i||! /^[A-Z]{4}$/.test(i.airportIcao))
    throw Error("P4_GRID_AIRPORT_IDENTITY_HOLD");
  const start=exactUtc(i.serviceWindowStartUtc,"start");
  const end=exactUtc(i.serviceWindowEndUtc,"end");
  const frozen=exactUtc(i.assignmentFrozenAtUtc,"frozen");
  if(end<=start||end-start<10*60000||end-start>4*3600000||
     start%60000!==0||end%60000!==0)
    throw Error("P4_GRID_WINDOW_HOLD");
  const guard=integer(i.acquisitionGuardMinutes,1,120,"guard");
  const cadence=integer(i.refreshCadenceMinutes,1,120,"cadence");
  const stale=integer(i.maxStalenessMinutes,1,360,"staleness");
  const lead=integer(i.githubPrearmLeadMinutes,15,240,"prearm");
  const units=integer(i.apiUnitsPerPhysicalAttempt,1,100,"units");
  const attempts=integer(i.maxAttemptsPerQuery,1,3,"attempts");
  const budget=integer(i.projectRestApiUnitsBudget,1,100000,"budget");
  const maxQueries=integer(i.maxSourceQueries,1,100,"maxQueries");
  if(cadence>stale)throw Error("P4_GRID_CADENCE_EXCEEDS_STALENESS");
  let from:{stamp:string;offset:number},to:{stamp:string;offset:number};
  try {
    from=localStamp(start,i.airportIanaTimezone);
    to=localStamp(end,i.airportIanaTimezone);
    // Also test midpoint for a transition contained inside the window.
    const middle=localStamp(Math.floor((start+end)/2),i.airportIanaTimezone);
    if(from.offset!==to.offset||from.offset!==middle.offset||
       from.stamp>=to.stamp)
      throw Error("P4_GRID_DST_EDGE_REQUIRES_SPLIT");
  }catch(e){
    if(e instanceof Error&&e.message==="P4_GRID_DST_EDGE_REQUIRES_SPLIT")throw e;
    throw Error("P4_GRID_INVALID_AIRPORT_TIMEZONE");
  }
  const queries:P4Gate5GridDraftQueryV39[]=[];
  const horizonOwners:Array<{horizon:P4Gate5GridHorizonV39;
    earliestPhysicalStartUtc:string;latestPhysicalStartUtc:string;
    verifiedPrearmDeadlineUtc:string;queryCount:number}>=[];
  for(const [horizon,lag] of P4_GATE5_GRID_HORIZONS_V39){
    const earliestTarget=start-lag*60000,latestTarget=end-lag*60000;
    const targets:number[]=[];
    for(let t=earliestTarget;t<=latestTarget;t+=cadence*60000){
      targets.push(t);
      if(targets.length>maxQueries)throw Error("P4_GRID_TOO_MANY_QUERIES");
    }
    if(targets[targets.length-1]!==latestTarget)targets.push(latestTarget);
    const firstDispatch=targets[0]-guard*60000;
    const lastDispatch=targets[targets.length-1]-guard*60000;
    const prearmDeadline=firstDispatch-lead*60000;
    if(frozen>prearmDeadline)
      throw Error("P4_GRID_FREEZE_TOO_LATE_FOR_EARLIEST_PREARM:"+horizon);
    horizonOwners.push({
      horizon,earliestPhysicalStartUtc:new Date(firstDispatch).toISOString(),
      latestPhysicalStartUtc:new Date(lastDispatch).toISOString(),
      verifiedPrearmDeadlineUtc:new Date(prearmDeadline).toISOString(),
      queryCount:targets.length
    });
    for(const t of targets)queries.push({
      horizon,candidateGridCutoffUtc:new Date(t).toISOString(),
      plannedPhysicalStartUtc:new Date(t-guard*60000).toISOString(),
      providerQueryFromLocal:from.stamp,providerQueryToLocal:to.stamp,
      sourceAirportIcao:i.airportIcao,
      requestDirection:"Departure",withLeg:true,withCancelled:true,
      withCodeshared:true,withCargo:false,withPrivate:false
    });
  }
  if(queries.length>maxQueries)throw Error("P4_GRID_TOO_MANY_QUERIES");
  const worst=queries.length*attempts*units;
  if(!Number.isSafeInteger(worst)||worst>budget)
    throw Error("P4_GRID_WORST_CASE_API_UNITS_OVER_BUDGET");
  return {
    schema:"v39.phase4.gate5-nonadaptive-grid-draft.v1" as const,
    status:"DRAFT_ONLY_PROVIDER_SOURCE_AND_SELECTED_T_UNVERIFIED" as const,
    bindingPlan:"V3.9-f.8 §§5.1-5.4,6.0,16-17" as const,
    airportIcao:i.airportIcao,airportIanaTimezone:i.airportIanaTimezone,
    serviceWindowStartUtc:i.serviceWindowStartUtc,
    serviceWindowEndUtc:i.serviceWindowEndUtc,
    assignmentFrozenAtUtc:i.assignmentFrozenAtUtc,
    sourceRangeLocal:{from:from.stamp,to:to.stamp},
    horizonOwners,queries,
    worstCasePhysicalAttempts:queries.length*attempts,
    expectedMaxApiUnits:worst,
    projectRestApiUnitsBudget:budget,
    selectedProviderNativeTCertified:false as const,
    providerFidsRangeEdgeVerified:false as const,
    operationalAcquisitionGuardMeasured:false as const,
    githubPrearmedRunnerObserved:false as const,
    anyPaidRequestAuthorized:false as const,
    anyProviderCallMade:false as const,
    certifiedSnapshotsWritten:false as const,
    phase5FreezeAuthorized:false as const,
    phase6Authorized:false as const
  };
}
