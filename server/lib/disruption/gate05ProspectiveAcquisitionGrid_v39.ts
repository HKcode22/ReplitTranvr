/**
 * Gate0.5 prospective FIDS acquisition planning, f.8 §5.2.
 * Pure function: NO provider requests, no timers, no database writes, and
 * no claim that planned requests were actually received before any cutoff.
 * Acquisition guard, cadence and max staleness require pre-outcome review.
 */
export const GATE05_GRID_VERSION="v39.gate05.prospective-grid.v1" as const;
export type Gate05Horizon = "T-24h"|"T-6h"|"T-90m";
const OFFSET_MS:Readonly<Record<Gate05Horizon,number>>={
  "T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000
};
export interface Gate05GridInput {
  serviceWindowStartUtc:string;
  serviceWindowEndUtc:string;
  planningClockUtc:string;
  airportIcao:string;
  selectedNativeTMilestoneSourceVerified:boolean;
  horizonSet:readonly Gate05Horizon[];
  populationAcquisitionGuardMinutes:number;
  populationRefreshCadenceMinutes:number;
  populationMaxStalenessMinutes:number;
  proposedMaximumFidsGets:number;
  assumedApiUnitsPerGet:number;
  proposedMaximumApiUnits:number;
}
export interface Gate05GridPoint {
  horizon:Gate05Horizon;
  targetCutoffGridUtc:string;
  requestNotBeforeUtc:string;
  requestMustStartByUtc:string;
  /** It is NEVER proof that a completed response met any cutoff. */
  sourceAvailabilityMustBeCheckedAfterRequest:true;
}
export interface Gate05GridResult {
  schema:typeof GATE05_GRID_VERSION;
  status:"ELIGIBLE_FOR_OWNER_REVIEW"|"BLOCKED_UNVERIFIED_NATIVE_T"|
    "BLOCKED_GRID_HAS_ALREADY_STARTED"|"BLOCKED_BUDGET";
  expectedFidsGets:number;
  expectedApiUnits:number;
  earliestRequestNotBeforeUtc:string|null;
  latestRequestStartUtc:string|null;
  requiredMeasurementOutputs:readonly string[];
  grid:Gate05GridPoint[];
  providerCalls:0;
  writes:0;
  ownerPaidAuthorizationGranted:false;
}
function millis(s:string):number{
  if(typeof s!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?Z$/.test(s))
    throw Error("GATE05_GRID_REQUIRES_EXPLICIT_UTC");
  const d=new Date(s),t=d.getTime();
  if(!Number.isFinite(t)||d.toISOString().slice(0,19)!==s.slice(0,19))
    throw Error("GATE05_GRID_INVALID_UTC");
  return t;
}
const finitePosInt=(n:number)=>Number.isSafeInteger(n)&&n>0;
export function planGate05ProspectiveGridV39(input:Gate05GridInput):Gate05GridResult {
  const start=millis(input.serviceWindowStartUtc);
  const end=millis(input.serviceWindowEndUtc);
  const now=millis(input.planningClockUtc);
  if(!/^[A-Z]{4}$/.test(input.airportIcao) ||
     !Array.isArray(input.horizonSet)||input.horizonSet.length<1||
     input.horizonSet.some(h=>!(h in OFFSET_MS)) ||
     new Set(input.horizonSet).size!==input.horizonSet.length ||
     !finitePosInt(input.populationAcquisitionGuardMinutes)||
     !finitePosInt(input.populationRefreshCadenceMinutes)||
     !finitePosInt(input.populationMaxStalenessMinutes)||
     !finitePosInt(input.proposedMaximumFidsGets)||
     !finitePosInt(input.assumedApiUnitsPerGet)||
     !finitePosInt(input.proposedMaximumApiUnits)||
     !Number.isFinite(start)||!Number.isFinite(end)||
     end<=start||end-start>12*3_600_000||
     input.populationRefreshCadenceMinutes>input.populationMaxStalenessMinutes)
    throw Error("GATE05_GRID_INVALID_FROZEN_INPUT");
  const guardMs=input.populationAcquisitionGuardMinutes*60_000;
  const cadenceMs=input.populationRefreshCadenceMinutes*60_000;
  const grid:Gate05GridPoint[]=[];
  for(const entry of input.horizonSet){
    const horizon=entry as Gate05Horizon; // validated against OFFSET_MS above
    for(let cutoff=start-OFFSET_MS[horizon];cutoff<end-OFFSET_MS[horizon];cutoff+=cadenceMs){
      grid.push({
        horizon,
        targetCutoffGridUtc:new Date(cutoff).toISOString(),
        requestNotBeforeUtc:new Date(cutoff-guardMs-cadenceMs).toISOString(),
        requestMustStartByUtc:new Date(cutoff-guardMs).toISOString(),
        sourceAvailabilityMustBeCheckedAfterRequest:true
      });
      if(grid.length>5000)throw Error("GATE05_GRID_EXCESSIVE_ENTRIES");
    }
  }
  grid.sort((a,b)=>a.requestMustStartByUtc.localeCompare(b.requestMustStartByUtc));
  const used=grid.length,units=used*input.assumedApiUnitsPerGet;
  const missed=grid.some(x=>millis(x.requestMustStartByUtc)<now);
  const budget=used<=input.proposedMaximumFidsGets &&
               units<=input.proposedMaximumApiUnits;
  return {
    schema:GATE05_GRID_VERSION,
    status:!input.selectedNativeTMilestoneSourceVerified
      ?"BLOCKED_UNVERIFIED_NATIVE_T":
      missed?"BLOCKED_GRID_HAS_ALREADY_STARTED":
      !budget?"BLOCKED_BUDGET":"ELIGIBLE_FOR_OWNER_REVIEW",
    expectedFidsGets:used,expectedApiUnits:units,
    earliestRequestNotBeforeUtc:grid[0]?.requestNotBeforeUtc??null,
    latestRequestStartUtc:grid.at(-1)?.requestMustStartByUtc??null,
    requiredMeasurementOutputs:[
      "source-reviewed first provider-native scheduled T per flight",
      "durable response available_at <= individual flight cutoff",
      "provider query ID/response hash/source scope/UTC clock retained lawfully",
      "operating-leg/codeshare identity confidence and revision linkage",
      "observed runway actuality separate from independently scheduled wheels-off",
      "latency, query outcomes and provider-cost reconciliation",
      "population absence and optional-feature missingness preserved explicitly"
    ],
    grid,providerCalls:0,writes:0,ownerPaidAuthorizationGranted:false
  };
}
