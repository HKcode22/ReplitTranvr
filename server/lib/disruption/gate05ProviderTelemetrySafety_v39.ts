/**
 * Gate 0.5 provider telemetry is an independently sampled CONTROL measurement,
 * not a scientific flight observation. Missing balance evidence is UNKNOWN,
 * never zero charges, and never a synthetic callback.
 *
 * A bounded, wall-clock fault interval protects the finite 150-credit reserve.
 * There is NO provider-enforced hard 500-credit cap; a burst could overspend.
 * Once the exact subscription ID is authenticated, an extended outage must
 * stop ONLY that owned ID and classify the study as right-censored/partial.
 */
export const GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS = 120_000;
export const GATE05_PROVIDER_POLL_INTERVAL_MS = 25_000;

export type Gate05TelemetryDecisionV39 =
  | "RETRY_READ_ONLY_WITH_CENSORED_CONTROL_OBSERVATION"
  | "EXACT_OWNED_DELETE_REQUIRED_ACCOUNTING_UNKNOWN"
  | "UNCERTAIN_CREATE_OR_OWNER_HOLD_NO_GUESS";

export function gate05TelemetryDecisionV39(arg:{
  nowMs:number;
  firstFaultAtMs:number;
  knownExactOwnedProviderId:boolean;
  ownerMayBeCreating:boolean;
  graceMs?:number;
}):Gate05TelemetryDecisionV39{
  const {nowMs,firstFaultAtMs,knownExactOwnedProviderId,ownerMayBeCreating}=arg;
  const graceMs=arg.graceMs??GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS;
  if(!Number.isFinite(nowMs)||!Number.isFinite(firstFaultAtMs)||
     !Number.isSafeInteger(graceMs)||graceMs<=0||
     nowMs<firstFaultAtMs)throw Error("GATE05_TELEMETRY_CLOCK_INVALID");
  if(ownerMayBeCreating&&!knownExactOwnedProviderId)
    return "UNCERTAIN_CREATE_OR_OWNER_HOLD_NO_GUESS";
  if(nowMs-firstFaultAtMs<=graceMs)
    return "RETRY_READ_ONLY_WITH_CENSORED_CONTROL_OBSERVATION";
  return knownExactOwnedProviderId?
    "EXACT_OWNED_DELETE_REQUIRED_ACCOUNTING_UNKNOWN":
    "UNCERTAIN_CREATE_OR_OWNER_HOLD_NO_GUESS";
}

export function gate05ProviderReadFailureTransientV39(msg:string):boolean{
  // Do not hide 401/403, malformed account headers, changed billing counter,
  // wrong account or an invalid subscription ID as an ordinary network gap.
  return /^(?:BALANCE_UNAVAILABLE|R1_LIST_UNAVAILABLE): (?:transport failure.*|HTTP (?:5[0-9][0-9]|429|408).*)$/.test(msg) ||
    msg==="R1_LIST_UNAVAILABLE_AFTER_RETRIES";
}
