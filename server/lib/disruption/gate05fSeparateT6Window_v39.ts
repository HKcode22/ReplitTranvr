/**
 * A SEPARATE prospective WSSS cohort to demonstrate T−6h capture now.
 * Never combine these rows with the original Gate05e T−24h cohort.
 * Native scheduled departure is provisional selected T, NOT certified
 * scheduled wheels-off. No provider calls, paid token or database writes.
 */
export interface Gate05fSeparateT6Window {
  serviceWindowStartUtc:string;
  serviceWindowEndUtc:string;
  cutoffWindowStartUtc:string;
  cutoffWindowEndUtc:string;
  preliminaryHorizon:"T-6h";
  separateCohortFromGate05e:true;
  providerScheduleSemanticsVerified:false;
  firstCutoffLeadMinutes:8;
  fidsWindowMinutes:10;
}
export function gate05fSeparateT6WindowV39(startedMs:number):Gate05fSeparateT6Window {
  if(!Number.isSafeInteger(startedMs)||startedMs<0)throw Error("G05F_INVALID_CLOCK");
  const H=3_600_000;
  const serviceStart=startedMs+6*H+8*60_000;
  const serviceEnd=serviceStart+10*60_000;
  if(serviceEnd>8.64e15)throw Error("G05F_FUTURE_WINDOW_OUT_OF_RANGE");
  return {
    serviceWindowStartUtc:new Date(serviceStart).toISOString(),
    serviceWindowEndUtc:new Date(serviceEnd).toISOString(),
    cutoffWindowStartUtc:new Date(serviceStart-6*H).toISOString(),
    cutoffWindowEndUtc:new Date(serviceEnd-6*H).toISOString(),
    preliminaryHorizon:"T-6h",
    separateCohortFromGate05e:true,
    providerScheduleSemanticsVerified:false,
    firstCutoffLeadMinutes:8,
    fidsWindowMinutes:10
  };
}
