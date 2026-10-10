import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import type {PoolClient} from "pg";
import {
  compareSyntheticPhysicalItemContinuityV39,
  type SyntheticPhysicalItemWitnessV39
} from "./synthetic_physical_item_continuity_v39";

/**
 * P13 ONLY, test-only LOGGED PostgreSQL science witness after UNLOGGED loss.
 *
 * Contains synthetic flight metadata; ALWAYS REJECT real provider/DB context.
 * NOT a production migration or a permission to restore/create paid samples.
 * This signed fixture proves a design possibility; the test signer and source
 * evidence are NOT an independent, deployed AeroDataBox chain of custody.
 */
export type SyntheticScienceJournalFrameV39=Readonly<{
  schema:"v39.synthetic-logged-science-recovery.v1";
  sessionId:string;
  providerSubscriptionId:string;
  ownerFrozenRunSha256:string;
  windowStartUtc:string;
  windowEndUtc:string;
  attemptKey:string;
  sourceWireSha256:string;
  firstEdgeReceivedUtc:string;
  syntheticCostCredits:0|1;
  items:readonly SyntheticPhysicalItemWitnessV39[];
}>;
export type SignedSyntheticScienceJournalV39=Readonly<{
  frame:SyntheticScienceJournalFrameV39;
  mac:string;
}>;
export type ScienceJournalReviewV39=Readonly<{
  journalCryptographicallyConsistent:boolean;
  originalWireBytesMatched:boolean;
  sourceAndItemContinuityConsistent:boolean;
  expectedItems:number;
  runtimeItems:number;
  uniquePhysicalOperatorFlights:number;
  originalEightFifteenMinuteBuckets:readonly number[];
  errors:string[];
  scientificallyCertified:false;
  paidRunAuthorized:false;
  automaticReplayAuthorized:false;
}>;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const attemptPattern=/^[a-zA-Z0-9_.:-]{1,160}$/;
const TABLE="p2g_science_recovery_fixture.signed_source_item_journal";
const sha=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const date=(v:unknown):v is string=>typeof v==="string"&&
  UTC.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
/**
 * The actual V3.9 persistPrepaidProbeWebhookV39 item hash is
 * sha256(canonical(flights[i])) with sorted JSON object keys. A merely
 * signed SQL-derived witness is not enough: bind EVERY item to the exact
 * immutable wire source before considering it a reconstruction candidate.
 * No payload is sent, persisted or exposed outside the disposable fixture.
 */
function v39Canonical(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))
    return "["+value.map(v39Canonical).join(",")+"]";
  const obj=value as Record<string,unknown>;
  return "{"+Object.keys(obj).sort().map(k=>
    JSON.stringify(k)+":"+v39Canonical(obj[k])
  ).join(",")+"}";
}
function completeOriginalWireItemBinding(
  bytes:Uint8Array,f:SyntheticScienceJournalFrameV39
):boolean{
  try{
    const json=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    const flights=Array.isArray(json)?json:
      Array.isArray(json?.flights)?json.flights:[];
    if(flights.length!==f.items.length)return false;
    const seen=new Set<number>();
    for(const item of f.items){
      if(!Number.isSafeInteger(item.itemIndex)||item.itemIndex<0||
         item.itemIndex>=flights.length||seen.has(item.itemIndex))
        return false;
      seen.add(item.itemIndex);
      const computed=createHash("sha256")
        .update(v39Canonical(flights[item.itemIndex])).digest("hex");
      if(item.rawItemSha256!==computed)return false;
    }
    return seen.size===flights.length;
  }catch{return false;}
}
function onlyFixture(){
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.AERODATABOX_API_KEY||process.env.V39_DATABASE_RUNTIME_URL)
    throw new Error("P13_LOGGED_SCIENCE_JOURNAL_DISPOSABLE_ONLY");
  let url:URL;
  try{url=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"")}
  catch{throw new Error("P13_DISPOSABLE_POSTGRES_URL_REQUIRED")}
  if(url.hostname!=="127.0.0.1"||
     url.pathname!=="/p2g_stage1_fixture")
    throw new Error("P13_LOGGED_SCIENCE_JOURNAL_NONDISPOSABLE_TARGET");
}
function frameProjection(f:SyntheticScienceJournalFrameV39):string{
  if(f?.schema!=="v39.synthetic-logged-science-recovery.v1"||
     !UUID.test(f.sessionId)||
     !attemptPattern.test(f.providerSubscriptionId)||
     !attemptPattern.test(f.attemptKey)||
     !SHA.test(f.ownerFrozenRunSha256)||
     !SHA.test(f.sourceWireSha256)||
     !date(f.windowStartUtc)||!date(f.windowEndUtc)||
     Date.parse(f.windowEndUtc)-Date.parse(f.windowStartUtc)!==7_200_000||
     !date(f.firstEdgeReceivedUtc)||
     Date.parse(f.firstEdgeReceivedUtc)<Date.parse(f.windowStartUtc)||
     Date.parse(f.firstEdgeReceivedUtc)>=Date.parse(f.windowEndUtc)||
     ![0,1].includes(f.syntheticCostCredits)||
     !Array.isArray(f.items)||f.items.length>2000)
    throw new Error("P13_LOGGED_SCIENCE_FRAME_INVALID");
  // Original evidence and V3.9 processing timestamps are NOT interchangeable.
  const keys=new Set<string>();
  const sorted=[...f.items].sort((a,b)=>a.itemIndex-b.itemIndex);
  const arr=sorted.map(w=>{
    if(w.sessionId!==f.sessionId||
       w.originalEdgeReceivedUtc!==f.firstEdgeReceivedUtc||
       !Number.isSafeInteger(w.itemIndex)||w.itemIndex<0||
       !SHA.test(w.rawItemSha256)||
       !["resolved","quarantined"].includes(w.identityResolutionStatus)||
       !["resolved_operator","quarantined"].includes(w.codeshareResolutionStatus)||
       !date(w.originalEdgeReceivedUtc))
      throw new Error("P13_LOGGED_SCIENCE_ITEM_WITNESS_INVALID");
    const id=JSON.stringify([w.deliveryId,w.itemIndex]);
    if(keys.has(id))throw new Error("P13_DUPLICATE_ITEM_IDENTITY");
    keys.add(id);
    return [
      w.sessionId,w.deliveryId,w.itemIndex,w.rawItemSha256,
      w.originalEdgeReceivedUtc,w.identityResolutionStatus,
      w.codeshareResolutionStatus,w.flightInstanceId,w.initialServiceDate,
      w.operatingCarrier,w.operatingFlightNumber,w.originIcao,
      w.destinationIcao,w.scheduledGateOutUtc
    ];
  });
  return JSON.stringify([
    "p13-test-only-scientific-journal-v1",f.schema,f.sessionId,
    f.providerSubscriptionId,f.ownerFrozenRunSha256,
    f.windowStartUtc,f.windowEndUtc,f.attemptKey,f.sourceWireSha256,
    f.firstEdgeReceivedUtc,f.syntheticCostCredits,arr
  ]);
}
function signedMac(f:SyntheticScienceJournalFrameV39,k:string){
  if(typeof k!=="string"||k.length<48)
    throw new Error("P13_LOGGED_SCIENCE_FIXTURE_SIGNING_KEY_REQUIRED");
  return createHmac("sha256",k).update(frameProjection(f)).digest("hex");
}
export function signSyntheticScienceRecoveryFrameV39(
  frame:SyntheticScienceJournalFrameV39,key:string
):SignedSyntheticScienceJournalV39{
  return {frame,mac:signedMac(frame,key)};
}
export function verifySignedSyntheticScienceRecoveryV39(
  signed:SignedSyntheticScienceJournalV39,key:string,
  expected:Pick<SyntheticScienceJournalFrameV39,
    "sessionId"|"providerSubscriptionId"|"ownerFrozenRunSha256"|"attemptKey">
):SyntheticScienceJournalFrameV39{
  const mac=signedMac(signed.frame,key);
  if(!SHA.test(signed.mac)||
     !timingSafeEqual(Buffer.from(mac,"hex"),Buffer.from(signed.mac,"hex")))
    throw new Error("P13_LOGGED_SCIENCE_JOURNAL_HMAC_MISMATCH");
  for(const k of ["sessionId","providerSubscriptionId",
                   "ownerFrozenRunSha256","attemptKey"] as const)
    if(signed.frame[k]!==expected[k])
      throw new Error("P13_LOGGED_SCIENCE_FROZEN_BINDING_CONFLICT");
  return signed.frame;
}

/**
 * Pure synthetic original-wire journal proof usable by a frozen 120-minute
 * test manifest without a DB connection. Signer is local fixture ONLY.
 * Does not prove there are no UNOBSERVED provider attempts.
 */
export function verifySyntheticScienceJournalWithOriginalWireV39(input:{
  signed:SignedSyntheticScienceJournalV39;
  fixtureKey:string;
  expected:Pick<SyntheticScienceJournalFrameV39,
    "sessionId"|"providerSubscriptionId"|"ownerFrozenRunSha256"|"attemptKey">;
  originalRawBytes:Uint8Array;
}):SyntheticScienceJournalFrameV39{
  const frame=verifySignedSyntheticScienceRecoveryV39(
    input.signed,input.fixtureKey,input.expected
  );
  if(sha(input.originalRawBytes)!==frame.sourceWireSha256)
    throw new Error("P13_JOURNAL_ORIGINAL_SOURCE_BYTES_MISMATCH");
  if(!completeOriginalWireItemBinding(input.originalRawBytes,frame))
    throw new Error("P13_JOURNAL_FLIGHT_ITEMS_NOT_BOUND_TO_SOURCE_WIRE");
  return frame;
}

/**
 * Journal row is append-only by logical (session,attempt), inside a disposable
 * LOGGED table intentionally created by its calling test, never by this API.
 * Verify identical write on retry and refuse a conflicting attempt.
 */
export async function writeSyntheticLoggedScienceJournalV39(input:{
  client:Pick<PoolClient,"query">;
  signed:SignedSyntheticScienceJournalV39;
  fixtureKey:string;
  originalRawBytes:Uint8Array;
  expected:Pick<SyntheticScienceJournalFrameV39,
    "sessionId"|"providerSubscriptionId"|"ownerFrozenRunSha256"|"attemptKey">;
}):Promise<{inserted:boolean;sourceWireSha256:string;originalEdgeUtc:string}>{
  onlyFixture();
  const f=verifySyntheticScienceJournalWithOriginalWireV39(input);
  const encoded=JSON.stringify(input.signed);
  const insert=await input.client.query(
    "INSERT INTO "+TABLE+"(session_id,attempt_key,signed_record)"+
    " VALUES($1,$2,$3::jsonb)"+
    " ON CONFLICT(session_id,attempt_key) DO NOTHING RETURNING attempt_key",
    [f.sessionId,f.attemptKey,encoded]
  );
  const rows=await input.client.query(
    "SELECT signed_record FROM "+TABLE+
    " WHERE session_id=$1 AND attempt_key=$2",
    [f.sessionId,f.attemptKey]
  );
  if(rows.rowCount!==1)
    throw new Error("P13_LOGGED_SCIENCE_JOURNAL_READBACK_MISSING");
  const saved=rows.rows[0].signed_record as SignedSyntheticScienceJournalV39;
  verifySignedSyntheticScienceRecoveryV39(saved,input.fixtureKey,input.expected);
  if(saved.mac!==input.signed.mac||
     frameProjection(saved.frame)!==frameProjection(f))
    throw new Error("P13_LOGGED_SCIENCE_ATTEMPT_IDENTITY_CONFLICT");
  return {
    inserted:insert.rowCount===1,sourceWireSha256:f.sourceWireSha256,
    originalEdgeUtc:saved.frame.firstEdgeReceivedUtc
  };
}
/** No SQL mutation. It inspects an independently preserved fixture journal. */
export async function reviewSyntheticLoggedScienceJournalV39(input:{
  client:Pick<PoolClient,"query">;
  fixtureKey:string;
  expected:Pick<SyntheticScienceJournalFrameV39,
    "sessionId"|"providerSubscriptionId"|"ownerFrozenRunSha256"|"attemptKey">;
  originalRawBytes:Uint8Array;
  observedRuntimeRows:readonly SyntheticPhysicalItemWitnessV39[];
}):Promise<ScienceJournalReviewV39>{
  onlyFixture();
  const errors=new Set<string>();
  const rows=await input.client.query(
    "SELECT signed_record FROM "+TABLE+
    " WHERE session_id=$1 AND attempt_key=$2",
    [input.expected.sessionId,input.expected.attemptKey]
  );
  if(rows.rowCount!==1)throw new Error("P13_LOGGED_SCIENCE_JOURNAL_MISSING");
  const signed=rows.rows[0].signed_record as SignedSyntheticScienceJournalV39;
  let f:SyntheticScienceJournalFrameV39;
  try{
    f=verifySignedSyntheticScienceRecoveryV39(
      signed,input.fixtureKey,input.expected
    );
  }catch{throw new Error("P13_LOGGED_SCIENCE_JOURNAL_TAMPERED_OR_WRONG_OWNER")}
  const wireOk=sha(input.originalRawBytes)===f.sourceWireSha256;
  if(!wireOk)errors.add("P13_RECOVERY_WIRE_SOURCE_UNAVAILABLE_OR_CHANGED");
  if(!completeOriginalWireItemBinding(input.originalRawBytes,f))
    errors.add("P13_RECOVERY_FLIGHT_ITEMS_NOT_IN_ORIGINAL_WIRE");
  const comparison=compareSyntheticPhysicalItemContinuityV39({
    frozenSessionId:f.sessionId,
    windowStartUtc:f.windowStartUtc,windowEndUtc:f.windowEndUtc,
    independentSourceEvidenceAuthenticated:false,
    independentOwnerFreezeAuthenticated:false,
    expectedWitnesses:f.items,
    observedRuntimeRows:input.observedRuntimeRows
  });
  for(const err of comparison.errors)errors.add(err);
  // External actual sender ledger and real owner authority CANNOT be inferred
  // from a test HMAC or a LOGGED row signed by this same local test process.
  errors.add("P13_REAL_PROVIDER_ATTEMPT_ACCOUNTING_NOT_ATTESTED");
  return {
    journalCryptographicallyConsistent:true,
    originalWireBytesMatched:wireOk,
    sourceAndItemContinuityConsistent:comparison.itemEvidenceConsistent,
    expectedItems:comparison.expectedItemCount,
    runtimeItems:comparison.observedItemCount,
    uniquePhysicalOperatorFlights:comparison.confirmedUniqueOperatorFlightCount,
    originalEightFifteenMinuteBuckets:comparison.sourceBuckets,
    errors:[...errors].sort(),
    scientificallyCertified:false,paidRunAuthorized:false,
    automaticReplayAuthorized:false
  };
}
