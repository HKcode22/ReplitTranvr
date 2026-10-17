/**
 * Gate3 two-stage paid-owner admission: no provider/SQL/GitHub access here.
 *
 * The source-prepared owner remains the ONLY candidate. The independently
 * running GH sidecar must provide a fresh authenticated ARM/ACTIVE heartbeat
 * before and immediately prior to the ONE allowed paid CREATE.
 *
 * Caller must separately authenticate the checked-in AUTH, published receiver,
 * source tree, prepared LOGGED+UNLOGGED identity and strict provider inventory.
 * A soft 50-credit stop is NOT a provider-enforced credit ceiling.
 */
import type {Gate3WatchdogLeaseScopeV39,Gate3WatchdogLeaseV39}
  from "./gate3WatchdogLiveLease_v39";

const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const MAX_PREP_LEAD_MS=480_000;
const MIN_PREP_LEAD_MS=180_000;
const MAX_CREATE_LATENESS_MS=30_000;

function validDate(d:Date):boolean {
  return d instanceof Date&&Number.isFinite(d.getTime());
}

export function assertGate3TwoStagePreparationTimingV39(
  startUtc:string,expiresAtUtc:string,now:Date
):void{
  const start=Date.parse(startUtc);
  const expires=Date.parse(expiresAtUtc);
  if(!UTC.test(startUtc)||!validDate(now)||!Number.isFinite(start)||
     !Number.isFinite(expires))
    throw Error("GATE3_TWO_STAGE_INVALID_CLOCK_OR_EXPIRY");
  const lead=start-now.getTime();
  if(lead<MIN_PREP_LEAD_MS||lead>MAX_PREP_LEAD_MS)
    throw Error("GATE3_TWO_STAGE_PREPARE_REQUIRES_THREE_TO_EIGHT_MINUTES");
  // Independent sidecar watches through start+900s (600s + 300s rescue).
  // A source that expires before this cannot claim complete callback custody.
  if(expires<start+900_000)
    throw Error("GATE3_TWO_STAGE_SESSION_EXPIRES_BEFORE_RESCUE_END");
}

/** Operator-supplied IDs are untrusted selectors, never an approval. */
export function parseGate3WatchdogRunAndCommentV39(
  raw:string
):Readonly<{githubRunId:number;commentId:number}>{
  if(typeof raw!=="string"||!/^([1-9]\d*) ([1-9]\d*)$/.test(raw.trim()))
    throw Error("GATE3_TWO_STAGE_WATCHDOG_RUN_AND_COMMENT_IDS_REQUIRED");
  const [r,c]=raw.trim().split(" ").map(Number);
  if(!Number.isSafeInteger(r)||!Number.isSafeInteger(c))
    throw Error("GATE3_TWO_STAGE_WATCHDOG_IDS_NOT_SAFE");
  return {githubRunId:r,commentId:c};
}

export type Gate3TwoStageWatchDepsV39=Readonly<{
  now:()=>Date;
  sleep:(ms:number)=>Promise<void>;
  verifyLease:(scope:Gate3WatchdogLeaseScopeV39,now:Date)=>
    Promise<Gate3WatchdogLeaseV39>;
  /** STRICT provider account GET/LIST read; return balance ONLY if no active
   * CreditBased subscription and valid credit/quota floor. */
  readCleanProviderBalance:()=>Promise<number>;
  shouldStop:()=>boolean;
}>;

/**
 * Called only AFTER source+AUTH/DB preparation and receipt of the Actions job
 * ID plus authenticated issue comment ID. Fail closed on stale lease, queued
 * or finished Action, wrong session, missing heartbeat, changed account, late
 * start or operator abort; NEVER retries CREATE or creates sessions.
 *
 * Awaiting here makes the actual owner TWO STAGE:
 *  A: durable exact PREPARED UUID, then manual independent watchdog dispatch
 *  B: fresh bot lease, running GH job, UTC boundary + provider GET before CREATE
 */
export async function awaitGate3LiveWatchdogAndStartV39(
  scope:Gate3WatchdogLeaseScopeV39,
  expectedBalance:number,
  deps:Gate3TwoStageWatchDepsV39
):Promise<void>{
  const start=Date.parse(scope?.startUtc??"");
  const t=deps?.now?.();
  if(!UTC.test(scope?.startUtc??"")||!Number.isFinite(start)||
     !validDate(t)||!Number.isSafeInteger(expectedBalance)||
     expectedBalance<1500||
     !deps||typeof deps.sleep!=="function"||
     typeof deps.verifyLease!=="function"||
     typeof deps.readCleanProviderBalance!=="function"||
     typeof deps.shouldStop!=="function")
    throw Error("GATE3_TWO_STAGE_ARM_SCOPE_INVALID");
  if(t.getTime()>start+MAX_CREATE_LATENESS_MS)
    throw Error("GATE3_TWO_STAGE_WATCHDOG_ARMED_TOO_LATE");
  if(t.getTime()<start-MAX_PREP_LEAD_MS)
    throw Error("GATE3_TWO_STAGE_WATCHDOG_ARMED_TOO_EARLY");

  // First proof must precede the sleep/UTC waiting period.
  await deps.verifyLease(scope,t);
  for(;;){
    if(deps.shouldStop())
      throw Error("GATE3_TWO_STAGE_OWNER_REQUESTED_STOP");
    const now=deps.now();
    if(!validDate(now))throw Error("GATE3_TWO_STAGE_CLOCK_INVALID");
    if(now.getTime()>=start)break;
    await deps.sleep(Math.min(5_000,start-now.getTime()));
    await deps.verifyLease(scope,deps.now());
  }
  if(deps.shouldStop())
    throw Error("GATE3_TWO_STAGE_OWNER_REQUESTED_STOP");

  // Strict provider balance plus inventory isolation must be re-read near
  // CREATE, NOT inherited from the potentially minutes-old source reservation.
  const current=await deps.readCleanProviderBalance();
  if(current!==expectedBalance)
    throw Error("GATE3_TWO_STAGE_PROVIDER_BALANCE_CHANGED_AFTER_PREPARE");
  await deps.verifyLease(scope,deps.now());
  const beforeCreate=deps.now();
  if(!validDate(beforeCreate)||beforeCreate.getTime()<start||
     beforeCreate.getTime()>start+MAX_CREATE_LATENESS_MS)
    throw Error("GATE3_TWO_STAGE_CREATE_OUTSIDE_EXACT_UTC_BOUNDARY");
  if(deps.shouldStop())
    throw Error("GATE3_TWO_STAGE_OWNER_REQUESTED_STOP");
}
