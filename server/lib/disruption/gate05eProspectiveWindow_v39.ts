/**
 * Gate05e future FIDS baseline window: exact UTC-only, never backdated.
 * This is a prospective source capture, NOT an automatically verified T.
 * No provider I/O, database, scheduling or paid permission.
 */
export const GATE05E_PROSPECTIVE_SOURCE_SCHEMA="v39.gate05e.first-fids-rawfirst.v1" as const;
export interface Gate05eWindow {
  serviceWindowStartUtc:string;
  serviceWindowEndUtc:string;
  cutoffWindowStartUtc:string;
  cutoffWindowEndUtc:string;
  preliminaryTargetHorizon:"T-24h";
  providerScheduleSemanticsVerified:false;
  fidsWindowMinutes:10;
  firstCutoffLeadMinutes:8;
}
export function gate05eFutureWsssWindowV39(captureStartMs:number):Gate05eWindow {
  if(!Number.isSafeInteger(captureStartMs)||captureStartMs<0)
    throw Error("GATE05E_INVALID_CAPTURE_CLOCK");
  const hour=60*60_000;
  const start=captureStartMs+24*hour+8*60_000;
  const end=start+10*60_000;
  if(!Number.isFinite(end)||end>8.64e15)throw Error("GATE05E_WINDOW_OUT_OF_RANGE");
  return {
    serviceWindowStartUtc:new Date(start).toISOString(),
    serviceWindowEndUtc:new Date(end).toISOString(),
    cutoffWindowStartUtc:new Date(start-24*hour).toISOString(),
    cutoffWindowEndUtc:new Date(end-24*hour).toISOString(),
    preliminaryTargetHorizon:"T-24h",
    providerScheduleSemanticsVerified:false,
    fidsWindowMinutes:10,firstCutoffLeadMinutes:8
  };
}
