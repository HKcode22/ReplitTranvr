/**
 * Phase2G P20 experimental VARIABLE-RATE two-hour no-credit rehearsal audit.
 * Offline-only. A 120-minute observation window DOES NOT mean there must
 * be one webhook per minute or fifteen webhooks per 15-minute bucket.
 *
 * All evidence here is fixture-supplied; no claimed true clock, independent
 * AeroDataBox billing, durable object storage or scientific PASS. Future
 * staging must independently attest sender, timing and downstream evidence.
 */
export type P20MinuteWitnessV39=Readonly<{
  minute:number; ownerUtc:string; receiverUtc:string; monotonicMs:number;
  receiverReady:boolean; ownerAlive:boolean;
}>;
export type P20AttemptWitnessV39=Readonly<{
  attemptId:string; sentUtc:string; sourceWireSha256:string;
  syntheticCostCredits:number; senderStatus:number; senderElapsedMs:number;
}>;
export type P20EdgeWitnessV39=Readonly<{
  attemptId:string; originalUtc:string; sourceWireSha256:string;
  completeBytesDurablyAccepted:boolean; authenticatedSyntheticReceipt:boolean;
}>;
export type P20InternalWitnessV39=Readonly<{
  attemptId:string; originalUtc:string; sourceWireSha256:string;
  rawObjectSha256ReadbackVerified:boolean; rawRetentionHours:number;
}>;
export type P20VariableRateFixtureV39=Readonly<{
  mode:"synthetic-only";
  ownerWindowStartUtc:string; ownerWindowEndUtc:string;
  monotonicStartMs:number; monotonicEndMs:number;
  realProviderCalls:number; cloudResourcesCreated:number;
  scientificDatabaseWrites:number;
  cleanupAttested:boolean; ownerExitedCleanly:boolean;
  minutes:readonly P20MinuteWitnessV39[];
  // Freeze these sender IDs BEFORE building edge/internal fixture evidence.
  preplannedSenderAttempts:readonly P20AttemptWitnessV39[];
  observedEdgeAttempts:readonly P20EdgeWitnessV39[];
  observedInternalAttempts:readonly P20InternalWitnessV39[];
}>;
export type P20VariableRateAssessmentV39=Readonly<{
  infrastructureFixtureConsistent:boolean;
  errors:readonly string[];
  elapsedMonotonicMs:number;
  senderAttemptCount:number; edgeAttemptCount:number; internalAttemptCount:number;
  senderCredits:number; edgeCredits:number; internalCredits:number;
  actualSourceBuckets:readonly number[];
  monitoringMinuteBuckets:readonly number[];
  scientificPassAuthorized:false;
  paidLaunchAuthorized:false;
  wallClockHostContinuityProven:false;
}>;
const STRICT=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const HEX=/^[a-f0-9]{64}$/;
function ts(x:unknown):number{
  if(typeof x!=="string"||!STRICT.test(x))return NaN;
  const n=Date.parse(x);
  return Number.isFinite(n)&&new Date(n).toISOString()===x?n:NaN;
}
function whole(n:unknown):n is number{
  return typeof n==="number"&&Number.isSafeInteger(n)&&n>=0;
}
export function assessP20VariableRateRehearsalV39(
  f:P20VariableRateFixtureV39
):P20VariableRateAssessmentV39{
  const faults=new Set<string>(),bad=(x:string)=>faults.add(x);
  const from=ts(f.ownerWindowStartUtc),until=ts(f.ownerWindowEndUtc);
  if(f.mode!=="synthetic-only"||f.realProviderCalls!==0||
     f.cloudResourcesCreated!==0||f.scientificDatabaseWrites!==0)
    bad("P20_NOT_STRICTLY_ZERO_PROVIDER_AND_CLOUD");
  if(!Number.isFinite(from)||!Number.isFinite(until)||
     until-from!==7_200_000)bad("P20_FROZEN_120M_WINDOW_INVALID");
  const elapsed=f.monotonicEndMs-f.monotonicStartMs;
  if(!Number.isFinite(elapsed)||elapsed<7_200_000||
     elapsed>7_230_000)bad("P20_MONOTONIC_TWO_HOUR_ELAPSED_UNPROVEN");
  if(!f.ownerExitedCleanly||!f.cleanupAttested)
    bad("P20_OWNER_SHUTDOWN_OR_CLEANUP_UNVERIFIED");
  if(!Array.isArray(f.minutes)||f.minutes.length!==120)
    bad("P20_MINUTE_WITNESSES_INCOMPLETE");
  if(!Array.isArray(f.preplannedSenderAttempts)||
     !Array.isArray(f.observedEdgeAttempts)||
     !Array.isArray(f.observedInternalAttempts))
    throw new Error("P20_REHEARSAL_ATTEMPT_ARRAYS_REQUIRED");
  const minutes=new Set<number>(),minuteBins=Array<number>(8).fill(0);
  for(const m of f.minutes??[]){
    if(!whole(m.minute)||m.minute>=120||minutes.has(m.minute)){
      bad("P20_MINUTE_DUPLICATE_OR_OUT_OF_RANGE");continue;
    }
    minutes.add(m.minute);
    minuteBins[Math.floor(m.minute/15)]++;
    const owner=ts(m.ownerUtc),receiver=ts(m.receiverUtc);
    const offset=m.minute*60_000;
    if(!Number.isFinite(owner)||!Number.isFinite(receiver)||
       !Number.isFinite(from)||
       Math.abs(owner-(from+offset))>8_000||
       Math.abs(receiver-(from+offset))>8_000||
       !Number.isFinite(m.monotonicMs)||
       Math.abs(m.monotonicMs-(f.monotonicStartMs+offset))>8_000)
      bad("P20_HEARTBEAT_CLOCK_OR_CADENCE_UNVERIFIED");
    if(!m.ownerAlive||!m.receiverReady)
      bad("P20_OWNER_OR_RECEIVER_NOT_READY_AT_MINUTE");
  }
  if(minutes.size!==120||minuteBins.some(n=>n!==15))
    bad("P20_MINUTE_COVERAGE_GAP");
  // No hard-coded webhook-count per minute. Expected notifications derive
  // from frozen independent sender plan, not health check samples.
  const planned=new Map<string,P20AttemptWitnessV39>();
  const attemptsPerBucket=Array<number>(8).fill(0);
  let senderCredits=0;
  for(const x of f.preplannedSenderAttempts){
    if(!x||typeof x.attemptId!=="string"||!x.attemptId||
       planned.has(x.attemptId)||!HEX.test(x.sourceWireSha256)){
      bad("P20_SENDER_DUPLICATE_OR_INVALID");continue;
    }
    planned.set(x.attemptId,x);
    const time=ts(x.sentUtc);
    if(!Number.isFinite(time)||time<from||time>=until)
      bad("P20_SENDER_OUTSIDE_FROZEN_WINDOW");
    if(!whole(x.syntheticCostCredits)||x.syntheticCostCredits>1)
      bad("P20_SYNTHETIC_CREDIT_INVALID");
    else senderCredits+=x.syntheticCostCredits;
    if(x.senderStatus!==200||!Number.isFinite(x.senderElapsedMs)||
       x.senderElapsedMs<0||x.senderElapsedMs>10_000)
      bad("P20_PROVIDER_EMULATOR_ACK_FAILURE");
  }
  const edges=new Map<string,P20EdgeWitnessV39>();
  let edgeCredits=0;
  for(const e of f.observedEdgeAttempts){
    if(!e||typeof e.attemptId!=="string"||edges.has(e.attemptId)){
      bad("P20_EDGE_DUPLICATE");continue;
    }
    edges.set(e.attemptId,e);
    const sent=planned.get(e.attemptId);
    if(!sent){bad("P20_UNPLANNED_EDGE_ATTEMPT");continue;}
    if(e.sourceWireSha256!==sent.sourceWireSha256||
       !e.completeBytesDurablyAccepted||!e.authenticatedSyntheticReceipt)
      bad("P20_EDGE_SOURCE_BYTES_OR_AUTH_UNVERIFIED");
    const utc=ts(e.originalUtc),attemptUtc=ts(sent.sentUtc);
    if(!Number.isFinite(utc)||utc<from||utc>=until||
       utc<attemptUtc-2_000||utc>attemptUtc+sent.senderElapsedMs+2_000)
      bad("P20_EDGE_FIRST_RECEIPT_TIME_INVALID");
    else attemptsPerBucket[Math.floor((utc-from)/900_000)]++;
    edgeCredits+=sent.syntheticCostCredits;
  }
  const internal=new Map<string,P20InternalWitnessV39>();
  let internalCredits=0;
  for(const x of f.observedInternalAttempts){
    if(!x||typeof x.attemptId!=="string"||internal.has(x.attemptId)){
      bad("P20_INTERNAL_DUPLICATE");continue;
    }
    internal.set(x.attemptId,x);
    const sender=planned.get(x.attemptId),edge=edges.get(x.attemptId);
    if(!sender||!edge){bad("P20_INTERNAL_WITHOUT_SENDER_AND_EDGE");continue;}
    if(x.sourceWireSha256!==sender.sourceWireSha256||
       x.originalUtc!==edge.originalUtc||!x.rawObjectSha256ReadbackVerified||
       x.rawRetentionHours!==168)
      bad("P20_INTERNAL_OBJECT_OR_FIRST_RECEIPT_MISMATCH");
    internalCredits+=sender.syntheticCostCredits;
  }
  for(const id of planned.keys()){
    if(!edges.has(id))bad("P20_PLANNED_SENDER_MISSING_EDGE");
    if(!internal.has(id))bad("P20_PLANNED_SENDER_MISSING_INTERNAL");
  }
  if(senderCredits!==edgeCredits||edgeCredits!==internalCredits)
    bad("P20_ATTEMPT_CREDIT_RECONCILIATION_GAP");
  if(f.preplannedSenderAttempts.length!==edges.size||
     edges.size!==internal.size||internal.size!==planned.size)
    bad("P20_ATTEMPT_CARDINALITY_MISMATCH");
  return {
    infrastructureFixtureConsistent:faults.size===0,
    errors:[...faults].sort(),
    elapsedMonotonicMs:elapsed,
    senderAttemptCount:planned.size,
    edgeAttemptCount:edges.size,
    internalAttemptCount:internal.size,
    senderCredits,edgeCredits,internalCredits,
    actualSourceBuckets:attemptsPerBucket,
    monitoringMinuteBuckets:minuteBins,
    scientificPassAuthorized:false,paidLaunchAuthorized:false,
    // Synthetic constructed clocks cannot prove real elapsed time.
    wallClockHostContinuityProven:false
  };
}
