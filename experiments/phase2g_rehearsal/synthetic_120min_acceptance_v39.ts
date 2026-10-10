/**
 * Phase2G synthetic 120-minute rehearsal acceptance contract.
 *
 * Pure offline validator; does NOT drive provider calls, publish to Replit,
 * create Cloudflare resources, inspect customer data, or authorize a paid run.
 * This validates a *declared test evidence manifest*, NOT its truthfulness.
 * Actual artifacts must be independently verified against real run logs and
 * signed raw object manifests in a later approved no-credit hosted rehearsal.
 */
export type RehearsalSourceV39={
  attemptId:string;
  edgeReceivedUtc:string;
  senderResponseStatus:number;
  senderResponseElapsedMs:number;
  sourceSha256:string;
  billedSyntheticCredits:number;
  edgeDurable:boolean;
};
export type RehearsalCommittedV39={
  attemptId:string;
  originalEdgeReceivedUtc:string;
  sourceSha256:string;
  retentionHours:number;
  confirmedOperatorPhysicalId:string|null;
  itemDisposition:"resolved_operator"|"quarantined";
};
export type RehearsalEvidenceV39={
  mode:"synthetic_only";
  activeWindowStartUtc:string;
  activeWindowEndUtc:string;
  elapsedActiveMinutes:number;
  providerCalls:number;
  realProviderCredits:number;
  cloudResourceMutations:number;
  scientificDbWrites:number;
  ownerExitedCleanly:boolean;
  cleanupVerified:boolean;
  timelineMinutesObserved:number[];
  expectedSyntheticAttempts:number;
  sources:RehearsalSourceV39[];
  committed:RehearsalCommittedV39[];
};
export type RehearsalGateV39={
  safeSyntheticPass:boolean;
  errorCodes:string[];
  senderAttempts:number;
  committedAttempts:number;
  senderSyntheticCredits:number;
  internalSyntheticCredits:number;
  sourceBuckets:number[];
};

function timestamp(s:string):number {
  if(typeof s!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s))
    return NaN;
  const t=Date.parse(s);
  return Number.isFinite(t)?t:NaN;
}
const h64=(s:string)=>/^[a-f0-9]{64}$/.test(s);
const positiveInt=(n:number)=>Number.isSafeInteger(n)&&n>=0;
export function evaluateStage1SyntheticRehearsalV39(v:RehearsalEvidenceV39):RehearsalGateV39 {
  const errors=new Set<string>();
  const check=(ok:boolean,code:string)=>{if(!ok)errors.add(code)};
  check(v.mode==="synthetic_only","NOT_SYNTHETIC");
  check(v.providerCalls===0&&v.realProviderCredits===0,"REAL_PROVIDER_ACTIVITY");
  check(v.cloudResourceMutations===0&&v.scientificDbWrites===0,"EXTERNAL_MUTATION");
  const from=timestamp(v.activeWindowStartUtc),end=timestamp(v.activeWindowEndUtc);
  check(Number.isFinite(from)&&end-from===7_200_000,"INCORRECT_120MIN_WINDOW");
  check(Number.isFinite(v.elapsedActiveMinutes)&&v.elapsedActiveMinutes>=120,"INSUFFICIENT_WALLCLOCK_DURATION");
  check(v.ownerExitedCleanly&&v.cleanupVerified,"OWNER_OR_CLEANUP_INCOMPLETE");
  check(v.expectedSyntheticAttempts===120,"REHEARSAL_SEND_PLAN_NOT_120");
  const observed=new Set(v.timelineMinutesObserved);
  check(observed.size===120&&[...Array(120).keys()].every(i=>observed.has(i)),
    "MINUTE_HEARTBEAT_GAP");
  const emitted=new Map<string,RehearsalSourceV39>();
  const buckets=new Array<number>(8).fill(0);
  let sentCredits=0;
  for(const src of v.sources){
    check(Boolean(src.attemptId)&&!emitted.has(src.attemptId),"DUPLICATE_SENDER_ATTEMPT");
    if(src.attemptId)emitted.set(src.attemptId,src);
    check(h64(src.sourceSha256),"INVALID_RAW_HASH");
    check(src.senderResponseStatus===200&&Number.isFinite(src.senderResponseElapsedMs)&&
      src.senderResponseElapsedMs>=0&&src.senderResponseElapsedMs<=10_000,
      "SENDER_ACK_NOT_WITHIN_DEADLINE");
    check(src.edgeDurable===true,"UNPROVEN_EDGE_DURABILITY");
    check(positiveInt(src.billedSyntheticCredits),"INVALID_SYNTHETIC_CREDIT");
    if(positiveInt(src.billedSyntheticCredits))sentCredits+=src.billedSyntheticCredits;
    const time=timestamp(src.edgeReceivedUtc);
    if(Number.isFinite(from)&&time>=from&&time<end){
      buckets[Math.floor((time-from)/900_000)]++;
    }else errors.add("SOURCE_OUTSIDE_FROZEN_WINDOW");
  }
  check(v.sources.length===v.expectedSyntheticAttempts&&emitted.size===v.expectedSyntheticAttempts,
    "MISSING_OR_EXTRA_SOURCE_ATTEMPT");
  const observedCommitted=new Set<string>();
  let internalCredits=0;
  for(const processed of v.committed){
    check(Boolean(processed.attemptId)&&!observedCommitted.has(processed.attemptId),
      "DUPLICATE_INTERNAL_ATTEMPT");
    observedCommitted.add(processed.attemptId);
    const src=emitted.get(processed.attemptId);
    check(Boolean(src),"UNMATCHED_INTERNAL_ATTEMPT");
    if(!src)continue;
    check(src.sourceSha256===processed.sourceSha256&&h64(processed.sourceSha256),
      "RAW_SHA_MISMATCH");
    check(processed.originalEdgeReceivedUtc===src.edgeReceivedUtc,
      "ORIGINAL_SOURCE_TIME_SHIFTED");
    check(processed.retentionHours===168,"RAW_RETENTION_CONTRACT_INVALID");
    check(processed.itemDisposition==="resolved_operator"&&
      typeof processed.confirmedOperatorPhysicalId==="string"&&
      processed.confirmedOperatorPhysicalId.length>0,
      "PHYSICAL_V2_OPERATOR_NOT_CONFIRMED");
    if(positiveInt(src.billedSyntheticCredits))internalCredits+=src.billedSyntheticCredits;
  }
  check(v.committed.length===v.expectedSyntheticAttempts&&
    observedCommitted.size===v.expectedSyntheticAttempts&&
    [...emitted.keys()].every(id=>observedCommitted.has(id)),
    "MISSING_OR_EXTRA_INTERNAL_ATTEMPT");
  check(sentCredits===internalCredits,"SENDER_INTERNAL_CREDIT_GAP");
  check(buckets.length===8&&buckets.every(x=>x===15),
    "REHEARSAL_SAMPLE_BUCKET_INCOMPLETE");
  return {
    safeSyntheticPass:errors.size===0,
    errorCodes:[...errors].sort(),
    senderAttempts:v.sources.length,
    committedAttempts:v.committed.length,
    senderSyntheticCredits:sentCredits,
    internalSyntheticCredits:internalCredits,
    sourceBuckets:buckets
  };
}
