import {createHash,createHmac,timingSafeEqual} from "node:crypto";

/**
 * P20 HIGH-FIDELITY TRAFFIC TRACE GATE V2 — synthetic-only, NO provider,
 * no hosted soak, no Cloudflare and no scientific DB.
 *
 * V1 illustrative manifest assumed 120 webhook sends (one per minute) and
 * 15 callback deliveries every 15 minutes. That is NOT frozen F.8 §9.2
 * scientific yield and is not a realistic webhook arrival distribution.
 * V2 accepts a separately HMAC-frozen IRREGULAR sender trace, including
 * bursts and quiet bins, and independently compares the distinct confirmed
 * operating-flight first-observations. This checks DECLARED EVIDENCE ONLY:
 * real 120min uptime, actual provider authenticity and real object custody
 * need separately verified artifacts before any paid GO.
 */
export type SyntheticFrozenSendV39=Readonly<{
  attemptId:string;
  providerAttemptUtc:string;
  wireSha256:string;
  billedCredits:0|1;
}>;
export type SyntheticTracePlanV39=Readonly<{
  schema:"v39.phase2g-synthetic-irregular-trace.v2";
  mode:"synthetic-only";
  sessionId:string;
  startUtc:string;
  endUtc:string;
  senderAttempts:readonly SyntheticFrozenSendV39[];
  expectedFirstPhysicalIdsBy15m:readonly (readonly string[])[];
}>;
export type SignedSyntheticTracePlanV39=Readonly<{
  plan:SyntheticTracePlanV39;
  independentSignature:string;
}>;
export type SyntheticObservedAttemptV39=Readonly<{
  attemptId:string;
  originalEdgeReceivedUtc:string;
  originalWireSha256:string;
  storedCanonicalSha256:string;
  senderStatus:number;
  senderElapsedMs:number;
  edgeWasDurable:boolean;
  internalCommitCredits:number;
  rawRetentionHours:number;
}>;
export type SyntheticPhysicalObservationV39=Readonly<{
  attemptId:string;
  itemIndex:number;
  flightInstanceId:string|null;
  resolution:"resolved_operator"|"quarantined";
  sourceItemSha256:string;
}>;
export type SyntheticTwoHourTraceResultV39=Readonly<{
  passOnlySyntheticEvidence:boolean;
  actualPaidScientificGoAuthorized:false;
  errors:string[];
  callbackArrivalCounts15m:number[];
  distinctFirstPhysicalFlightCounts15m:number[];
  sentSyntheticCredits:number;
  internallyCommittedSyntheticCredits:number;
}>;
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_.:-]{1,160}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function time(v:unknown):number{
  if(typeof v!=="string"||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v))
    return NaN;
  const t=Date.parse(v);
  return Number.isFinite(t)?t:NaN;
}
const dig=(x:unknown):x is string=>typeof x==="string"&&SHA.test(x);
const id=(x:unknown):x is string=>typeof x==="string"&&ID.test(x);
const uint=(x:unknown):x is number=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
const hash=(v:string)=>createHash("sha256").update(v).digest("hex");
function planWire(p:SyntheticTracePlanV39):string{
  if(p?.schema!=="v39.phase2g-synthetic-irregular-trace.v2"||
     p.mode!=="synthetic-only"||
     typeof p.sessionId!=="string"||!UUID.test(p.sessionId)||
     !Number.isFinite(time(p.startUtc))||
     time(p.endUtc)-time(p.startUtc)!==7_200_000||
     !Array.isArray(p.senderAttempts)||p.senderAttempts.length===0||
     p.senderAttempts.length>10000||
     !Array.isArray(p.expectedFirstPhysicalIdsBy15m)||
     p.expectedFirstPhysicalIdsBy15m.length!==8)
    throw Error("P20_FROZEN_TRACE_SCHEMA_OR_WINDOW_INVALID");
  const seen=new Set<string>();
  for(const x of p.senderAttempts){
    if(!id(x?.attemptId)||seen.has(x.attemptId)||!dig(x.wireSha256)||
       time(x.providerAttemptUtc)<time(p.startUtc)||
       time(x.providerAttemptUtc)>=time(p.endUtc)||
       !(x.billedCredits===0||x.billedCredits===1))
      throw Error("P20_FROZEN_SEND_IDENTITY_INVALID");
    seen.add(x.attemptId);
  }
  const physical=new Set<string>();
  for(const b of p.expectedFirstPhysicalIdsBy15m){
    if(!Array.isArray(b)||b.length>5000)throw Error("P20_FROZEN_PHYSICAL_BUCKET_INVALID");
    for(const f of b){
      if(!id(f)||physical.has(f))throw Error("P20_FROZEN_PHYSICAL_DUPLICATE_OR_INVALID");
      physical.add(f);
    }
  }
  // JSON projection is a fixed ordered array; extra untrusted object keys
  // cannot alter the signed meaning of the trace.
  return JSON.stringify([
    "p2g-synthetic-traffic-trace-v2",p.schema,p.mode,p.sessionId,
    p.startUtc,p.endUtc,p.senderAttempts.map(x=>[
      x.attemptId,x.providerAttemptUtc,x.wireSha256,x.billedCredits
    ]),p.expectedFirstPhysicalIdsBy15m.map(a=>[...a].sort())
  ]);
}
export function signSyntheticIrregularTraceV39(
  plan:SyntheticTracePlanV39,independentSenderKey:string
):SignedSyntheticTracePlanV39{
  if(typeof independentSenderKey!=="string"||independentSenderKey.length<48)
    throw Error("P20_INDEPENDENT_EMULATOR_KEY_REQUIRED");
  return {
    plan,
    independentSignature:createHmac("sha256",independentSenderKey)
      .update(planWire(plan)).digest("hex")
  };
}
export function verifySyntheticIrregularTraceV39(
  signed:SignedSyntheticTracePlanV39,independentSenderKey:string
):SyntheticTracePlanV39{
  const expected=signSyntheticIrregularTraceV39(signed.plan,independentSenderKey)
    .independentSignature;
  if(!dig(signed.independentSignature)||
     !timingSafeEqual(Buffer.from(expected,"hex"),
       Buffer.from(signed.independentSignature,"hex")))
    throw Error("P20_INDEPENDENT_TRACE_SIGNATURE_INVALID");
  return signed.plan;
}
export function evaluateSyntheticIrregularTwoHourTraceV39(input:{
  signedPlan:SignedSyntheticTracePlanV39;
  independentSenderKey:string;
  actualElapsedMinutes:number;
  minuteHeartbeatIndices:readonly number[];
  providerCalls:number;
  realProviderCredits:number;
  cloudResourceMutations:number;
  scientificDatabaseWrites:number;
  ownerExitedCleanly:boolean;
  cleanupVerified:boolean;
  observedAttempts:readonly SyntheticObservedAttemptV39[];
  observedPhysicalItems:readonly SyntheticPhysicalObservationV39[];
}):SyntheticTwoHourTraceResultV39{
  const p=verifySyntheticIrregularTraceV39(
    input.signedPlan,input.independentSenderKey);
  const errors=new Set<string>();
  const check=(ok:boolean,code:string)=>{if(!ok)errors.add(code)};
  const from=time(p.startUtc),end=time(p.endUtc);
  check(input.actualElapsedMinutes>=120&&
    Number.isFinite(input.actualElapsedMinutes),
    "P20_120_REAL_MINUTES_NOT_OBSERVED");
  const heart=new Set(input.minuteHeartbeatIndices);
  check(heart.size===120&&input.minuteHeartbeatIndices.length===120&&
    [...Array(120).keys()].every(i=>heart.has(i)),
    "P20_OWNER_HEARTBEAT_GAP");
  check(input.providerCalls===0&&input.realProviderCredits===0&&
    input.cloudResourceMutations===0&&input.scientificDatabaseWrites===0,
    "P20_NONZERO_EXTERNAL_COST_OR_SCIENTIFIC_DB_MUTATION");
  check(input.ownerExitedCleanly&&input.cleanupVerified,
    "P20_OWNER_TERMINAL_CLEANUP_NOT_PROVED");
  const planned=new Map(p.senderAttempts.map(x=>[x.attemptId,x]));
  const observed=new Map<string,SyntheticObservedAttemptV39>();
  const buckets=Array<number>(8).fill(0);
  let internal=0;
  for(const a of input.observedAttempts){
    check(id(a?.attemptId)&&!observed.has(a.attemptId),
      "P20_DUPLICATE_OBSERVED_PROVIDER_ATTEMPT");
    if(!id(a?.attemptId)||observed.has(a.attemptId))continue;
    observed.set(a.attemptId,a);
    const frozen=planned.get(a.attemptId);
    check(Boolean(frozen),"P20_UNPLANNED_ATTEMPT");
    if(!frozen)continue;
    check(dig(a.originalWireSha256)&&
      a.originalWireSha256===frozen.wireSha256&&
      dig(a.storedCanonicalSha256),
      "P20_WIRE_OR_CANONICAL_SHA_MISMATCH");
    check(a.senderStatus===200&&Number.isFinite(a.senderElapsedMs)&&
      a.senderElapsedMs>=0&&a.senderElapsedMs<=10_000,
      "P20_UPSTREAM_SENDER_ACK_DEADLINE_NOT_MET");
    check(a.edgeWasDurable===true&&a.rawRetentionHours>=168,
      "P20_RAW_CUSTODY_OR_RETENTION_NOT_PROVEN");
    check(uint(a.internalCommitCredits)&&
      a.internalCommitCredits===frozen.billedCredits,
      "P20_CREDIT_PER_ATTEMPT_MISMATCH");
    if(uint(a.internalCommitCredits))internal+=a.internalCommitCredits;
    const t=time(a.originalEdgeReceivedUtc);
    check(Number.isFinite(t)&&t>=from&&t<end,
      "P20_EDGE_RECEIPT_OUTSIDE_FROZEN_WINDOW");
    if(Number.isFinite(t)&&t>=from&&t<end){
      buckets[Math.floor((t-from)/900000)]++;
    }
  }
  check(observed.size===planned.size&&[...planned.keys()].every(k=>observed.has(k)),
    "P20_SYNTHETIC_SENDER_EDGE_OR_SQL_DELIVERY_MISSING");
  const sourceItems=new Set<string>();
  const first=new Map<string,number>();
  for(const i of input.observedPhysicalItems){
    const key=i?.attemptId+":"+i?.itemIndex;
    check(id(i?.attemptId)&&uint(i?.itemIndex)&&
      !sourceItems.has(key)&&dig(i?.sourceItemSha256),
      "P20_PHYSICAL_ITEM_DUPLICATED_OR_INVALID");
    sourceItems.add(key);
    const attempt=observed.get(i.attemptId);
    check(Boolean(attempt),"P20_PHYSICAL_ITEM_WITHOUT_RECEIPT");
    if(!attempt)continue;
    if(i.resolution==="quarantined"){
      check(i.flightInstanceId===null,"P20_QUARANTINED_ITEM_COUNTED_AS_PHYSICAL");
      continue;
    }
    check(i.resolution==="resolved_operator"&&id(i.flightInstanceId),
      "P20_UNSUPPORTED_PHYSICAL_IDENTITY");
    if(!id(i.flightInstanceId))continue;
    const stamp=time(attempt.originalEdgeReceivedUtc);
    if(!Number.isFinite(stamp)||stamp<from||stamp>=end)continue;
    const bucket=Math.floor((stamp-from)/900000);
    if(!first.has(i.flightInstanceId))first.set(i.flightInstanceId,bucket);
    // Repeated retime/update for same flight stays ONE distinct first flight.
  }
  const actualPhysical=Array.from({length:8},()=>[] as string[]);
  for(const [fid,bucket] of first)actualPhysical[bucket].push(fid);
  for(let i=0;i<8;i++){
    const exp=[...p.expectedFirstPhysicalIdsBy15m[i]].sort();
    const got=actualPhysical[i].sort();
    check(JSON.stringify(exp)===JSON.stringify(got),
      "P20_PHYSICAL_FIRST_OBSERVATION_TRACE_MISMATCH");
  }
  const sent=p.senderAttempts.reduce((n,x)=>n+x.billedCredits,0);
  check(sent===internal,"P20_SENDER_INTERNAL_CREDIT_GAP");
  return {
    passOnlySyntheticEvidence:errors.size===0,
    actualPaidScientificGoAuthorized:false,
    errors:[...errors].sort(),
    callbackArrivalCounts15m:buckets,
    distinctFirstPhysicalFlightCounts15m:actualPhysical.map(x=>x.length),
    sentSyntheticCredits:sent,
    internallyCommittedSyntheticCredits:internal
  };
}
