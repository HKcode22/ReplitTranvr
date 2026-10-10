import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import type {PoolClient} from "pg";
import {
  verifySyntheticSenderFrameV39,
  type SignedSyntheticSenderFrameV39
} from "./signed_attempt_reconciliation_v39";
import {
  compareSyntheticPhysicalItemContinuityV39,
  type SyntheticPhysicalItemWitnessV39
} from "./synthetic_physical_item_continuity_v39";
import {
  verifySyntheticScienceJournalWithOriginalWireV39,
  type SignedSyntheticScienceJournalV39,
  type SyntheticScienceJournalFrameV39
} from "./disposable_logged_science_recovery_journal_v39";

/**
 * P13 offline-only exact witness-to-UNLOGGED restore. Never imported into
 * deployed code. It uses a signed POST-INGEST synthetic snapshot of full
 * original V3.9 runtime columns; that is NOT independent pre-ACK custody.
 * Explicit QUARANTINE prevents recovery from silently restarting collection.
 */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const SCHEMA="p2g_science_recovery_fixture";
const colsDelivery=[
  "session_id","delivery_id","blob_ref_id","raw_body_sha256",
  "provider_subscription_id","received_at_utc","provider_notification_generated_utc",
  "delivery_attempt_seq_no","delivery_attempt_utc","delivery_attempt_cost_credits",
  "notification_items"
] as const;
const colsItem=[
  "session_id","delivery_id","item_index","raw_item_sha256",
  "flight_number","aircraft_reg","codeshare_status","runtime_flight_key",
  "provider_flight_id","callsign","operating_carrier","operating_flight_number",
  "origin_icao","destination_icao","origin_time_zone","scheduled_gate_out_utc",
  "scheduled_gate_in_utc","flight_instance_id","initial_service_date",
  "provisional_identity_key","codeshare_resolution_status",
  "identity_resolution_status","received_at_utc"
] as const;
export type SyntheticFullSnapshotV39=Readonly<{
  schema:"v39.synthetic-exact-runtime-snapshot.v1";
  sessionId:string;
  attemptKey:string;
  ownerFrozenRunSha256:string;
  signedJournalMac:string;
  delivery:Record<string,unknown>;
  items:readonly Record<string,unknown>[];
}>;
export type SignedSyntheticFullSnapshotV39=Readonly<{
  snapshot:SyntheticFullSnapshotV39;
  signature:string;
}>;
type Frozen=Pick<SyntheticScienceJournalFrameV39,
  "sessionId"|"providerSubscriptionId"|"ownerFrozenRunSha256"|"attemptKey">;
export type FixtureExactRestoreResultV39=Readonly<{
  rowsRestored:number;
  existingOriginalBlobReferences:1;
  duplicateBlobReferencesCreated:0;
  restoredSessionState:"quarantined";
  idempotent:boolean;
  originalEdgeUtc:string;
  paidCollectionResumed:false;
  independentRealProviderSourceVerified:false;
  scientificPassAuthorized:false;
  automatedPaidRecoveryAuthorized:false;
}>;
const digest=(v:Uint8Array|string)=>createHash("sha256").update(v).digest("hex");
function canonical(x:unknown):string{
  if(x===null||typeof x!=="object")return JSON.stringify(x);
  if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
  const o=x as Record<string,unknown>;
  return "{"+Object.keys(o).sort().map(k=>
    JSON.stringify(k)+":"+canonical(o[k])
  ).join(",")+"}";
}
function norm(x:any):Record<string,unknown>{
  return JSON.parse(JSON.stringify(x)) as Record<string,unknown>;
}
function exactColumns(row:Record<string,unknown>,columns:readonly string[]){
  if(!row||Object.keys(row).sort().join("|")!==
     [...columns].sort().join("|"))
    throw Error("P13_SNAPSHOT_RUNTIME_COLUMN_SET_NOT_EXACT");
}
function fixtureOnly(){
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_DATABASE_RUNTIME_URL)
    throw Error("P13_EXACT_RESTORE_DISPOSABLE_ONLY");
  let u:URL;
  try{u=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"")}
  catch{throw Error("P13_EXACT_RESTORE_DISPOSABLE_URL_REQUIRED")}
  if(u.hostname!=="127.0.0.1"||u.pathname!=="/p2g_stage1_fixture")
    throw Error("P13_EXACT_RESTORE_NONDISPOSABLE_DATABASE_REFUSED");
}
function snapshotMac(s:SyntheticFullSnapshotV39,k:string){
  if(k.length<48||!s||!UUID.test(s.sessionId)||!SHA.test(s.ownerFrozenRunSha256)||
     !SHA.test(s.signedJournalMac)||!Array.isArray(s.items)||
     s.items.length>2000||s.schema!=="v39.synthetic-exact-runtime-snapshot.v1")
    throw Error("P13_EXACT_RESTORE_SNAPSHOT_INVALID");
  exactColumns(s.delivery,colsDelivery);
  for(const item of s.items)exactColumns(item,colsItem);
  return createHmac("sha256",k).update(canonical(s)).digest("hex");
}
export function signSyntheticExactRuntimeSnapshotV39(
  snapshot:SyntheticFullSnapshotV39,fixtureSnapshotKey:string
):SignedSyntheticFullSnapshotV39{
  return {snapshot,signature:snapshotMac(snapshot,fixtureSnapshotKey)};
}
function checkedSnapshot(s:SignedSyntheticFullSnapshotV39,key:string,
  frame:SyntheticScienceJournalFrameV39,journalMac:string){
  const expected=snapshotMac(s.snapshot,key);
  if(!SHA.test(s.signature)||
     !timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(s.signature,"hex")))
    throw Error("P13_EXACT_RESTORE_SNAPSHOT_TAMPERED");
  if(s.snapshot.sessionId!==frame.sessionId||
     s.snapshot.attemptKey!==frame.attemptKey||
     s.snapshot.ownerFrozenRunSha256!==frame.ownerFrozenRunSha256||
     s.snapshot.signedJournalMac!==journalMac)
    throw Error("P13_EXACT_RESTORE_SNAPSHOT_FROZEN_BINDING_CONFLICT");
  const delivery=s.snapshot.delivery;
  if(delivery.session_id!==frame.sessionId||
     delivery.provider_subscription_id!==frame.providerSubscriptionId||
     delivery.notification_items!==frame.items.length||
     Number(delivery.delivery_attempt_cost_credits)!==frame.syntheticCostCredits||
     Number(delivery.delivery_attempt_seq_no)!==0||
     delivery.received_at_utc!==frame.firstEdgeReceivedUtc||
     !UUID.test(String(delivery.blob_ref_id))||
     !SHA.test(String(delivery.raw_body_sha256)))
    throw Error("P13_EXACT_RESTORE_SNAPSHOT_DELIVERY_INVALID");
  if(s.snapshot.items.length!==frame.items.length)
    throw Error("P13_EXACT_RESTORE_SNAPSHOT_ITEM_COUNT_CONFLICT");
  const expectedItems=new Map(frame.items.map(w=>[w.itemIndex,w]));
  const seen=new Set<number>();
  for(const i of s.snapshot.items){
    const idx=Number(i.item_index),w=expectedItems.get(idx);
    if(!Number.isSafeInteger(idx)||seen.has(idx)||!w||
       i.session_id!==frame.sessionId||
       i.delivery_id!==delivery.delivery_id||
       i.raw_item_sha256!==w.rawItemSha256||
       i.received_at_utc!==frame.firstEdgeReceivedUtc||
       i.flight_instance_id!==w.flightInstanceId||
       i.operating_carrier!==w.operatingCarrier||
       i.operating_flight_number!==w.operatingFlightNumber||
       i.origin_icao!==w.originIcao||
       i.destination_icao!==w.destinationIcao||
       i.identity_resolution_status!==w.identityResolutionStatus||
       i.codeshare_resolution_status!==w.codeshareResolutionStatus)
      throw Error("P13_EXACT_RESTORE_SNAPSHOT_ITEM_CONFLICT");
    seen.add(idx);
  }
  return s.snapshot;
}
function canonicalWire(raw:Uint8Array){
  return new TextEncoder().encode(
    canonical(JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(raw)))
  );
}
async function originalBlob(client:Pick<PoolClient,"query">,
 frame:SyntheticScienceJournalFrameV39,delivery:Record<string,unknown>,
 originalRaw:Uint8Array,originalCanonicalBlob:Uint8Array){
  if(digest(canonicalWire(originalRaw))!==digest(originalCanonicalBlob))
    throw Error("P13_EXACT_RESTORE_OLD_BLOB_READBACK_NOT_ORIGINAL_CANONICAL");
  const content=digest(originalCanonicalBlob);
  if(delivery.raw_body_sha256!==content)
    throw Error("P13_EXACT_RESTORE_DELIVERY_CANONICAL_SHA_CONFLICT");
  const rows=await client.query(
    "SELECT blob_ref_id,content_sha256,content_bytes,source_record_id,"+
    "retention_hours,persisted_at_utc,expires_at_utc "+
    "FROM clean.provider_content_blob_ref "+
    "WHERE source_kind='webhook' AND source_record_id=$1 FOR SHARE",
    ["prepaid:"+frame.sessionId+":"+String(delivery.delivery_id)]
  );
  if(rows.rowCount!==1)
    throw Error("P13_EXACT_RESTORE_ORIGINAL_BLOB_NOT_UNIQUE");
  const r=rows.rows[0];
  if(r.blob_ref_id!==delivery.blob_ref_id||
     r.content_sha256!==content||
     Number(r.content_bytes)!==originalCanonicalBlob.length)
    throw Error("P13_EXACT_RESTORE_ORIGINAL_BLOB_MISMATCH");
  const persisted=new Date(r.persisted_at_utc).getTime();
  const expires=new Date(r.expires_at_utc).getTime();
  if(!Number.isFinite(persisted)||!Number.isFinite(expires)||
     Number(r.retention_hours)<168||
     expires-persisted<168*60*60*1000||
     expires<=Date.now())
    throw Error("P13_EXACT_RESTORE_ORIGINAL_BLOB_RETENTION_EXPIRED");
}
function values(row:Record<string,unknown>,cols:readonly string[]){
  return cols.map(col=>row[col]);
}
function insertSql(table:string,cols:readonly string[]){
  return "INSERT INTO clean."+table+"("+cols.join(",")+") VALUES("+
    cols.map((_,i)=>"$"+(i+1)).join(",")+")";
}
async function stateOf(client:Pick<PoolClient,"query">,id:string){
  const [session,delivery,items]=await Promise.all([
    client.query("SELECT * FROM clean.prepaid_probe_session_runtime WHERE session_id=$1",[id]),
    client.query("SELECT * FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1",[id]),
    client.query("SELECT * FROM clean.prepaid_probe_item_runtime WHERE session_id=$1 ORDER BY item_index",[id])
  ]);
  return {session,delivery,items};
}
/**
 * Fixture HMAC uses local key, no external source. Must be called before a
 * test-only crash/reset while all original full runtime columns are present.
 * Caller creates the separate LOGGED table in disposable PG fixture.
 */
export async function recordSyntheticExactRuntimeSnapshotV39(input:{
  client:Pick<PoolClient,"query">;
  expected:Frozen;
  journal:SignedSyntheticScienceJournalV39;
  journalKey:string;
  snapshotKey:string;
  originalWire:Uint8Array;
  originalCanonicalBlob:Uint8Array;
}):Promise<SignedSyntheticFullSnapshotV39>{
  fixtureOnly();
  const f=verifySyntheticScienceJournalWithOriginalWireV39({
    signed:input.journal,fixtureKey:input.journalKey,
    expected:input.expected,originalRawBytes:input.originalWire
  });
  const state=await stateOf(input.client,f.sessionId);
  if(state.delivery.rowCount!==1||state.items.rowCount!==f.items.length)
    throw Error("P13_SNAPSHOT_SOURCE_RUNTIME_NOT_COMPLETE");
  const d=norm(state.delivery.rows[0]);
  const snap:SyntheticFullSnapshotV39={
    schema:"v39.synthetic-exact-runtime-snapshot.v1",
    sessionId:f.sessionId,attemptKey:f.attemptKey,
    ownerFrozenRunSha256:f.ownerFrozenRunSha256,
    signedJournalMac:input.journal.mac,
    delivery:d,items:state.items.rows.map(norm)
  };
  const signed=signSyntheticExactRuntimeSnapshotV39(snap,input.snapshotKey);
  checkedSnapshot(signed,input.snapshotKey,f,input.journal.mac);
  await originalBlob(input.client,f,d,input.originalWire,input.originalCanonicalBlob);
  await input.client.query(
    "INSERT INTO "+SCHEMA+".exact_runtime_snapshot "+
    "(session_id,attempt_key,signed_record) VALUES($1,$2,$3::jsonb) "+
    "ON CONFLICT(session_id,attempt_key) DO NOTHING",
    [f.sessionId,f.attemptKey,JSON.stringify(signed)]
  );
  const proof=await input.client.query(
    "SELECT signed_record FROM "+SCHEMA+".exact_runtime_snapshot "+
    "WHERE session_id=$1 AND attempt_key=$2",
    [f.sessionId,f.attemptKey]
  );
  if(proof.rowCount!==1||
     canonical(proof.rows[0].signed_record)!==canonical(signed))
    throw Error("P13_EXACT_RESTORE_EXISTING_SNAPSHOT_CONFLICT");
  return signed;
}
/**
 * Atomic, strictly quarantined, disposable-only restoration of original
 * UNLOGGED records. The existing LOGGED blob ref is REUSED, not inserted.
 * A signed test snapshot is not proof of a real provider sender attempt.
 */
export async function restoreSyntheticExactRuntimeFromJournalV39(input:{
  client:PoolClient;
  expected:Frozen;
  journalKey:string;
  snapshotKey:string;
  originalWire:Uint8Array;
  originalCanonicalBlob:Uint8Array;
}):Promise<FixtureExactRestoreResultV39>{
  fixtureOnly();
  const client=input.client;
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try{
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",[
      input.expected.sessionId
    ]);
    const jr=await client.query(
      "SELECT signed_record FROM "+SCHEMA+".signed_source_item_journal "+
      "WHERE session_id=$1 AND attempt_key=$2 FOR SHARE",
      [input.expected.sessionId,input.expected.attemptKey]
    );
    const snap=await client.query(
      "SELECT signed_record FROM "+SCHEMA+".exact_runtime_snapshot "+
      "WHERE session_id=$1 AND attempt_key=$2 FOR SHARE",
      [input.expected.sessionId,input.expected.attemptKey]
    );
    if(jr.rowCount!==1||snap.rowCount!==1)
      throw Error("P13_EXACT_RESTORE_DURABLE_JOURNALS_MISSING");
    const signed=jr.rows[0].signed_record as SignedSyntheticScienceJournalV39;
    const frame=verifySyntheticScienceJournalWithOriginalWireV39({
      signed,fixtureKey:input.journalKey,expected:input.expected,
      originalRawBytes:input.originalWire
    });
    const full=checkedSnapshot(
      snap.rows[0].signed_record as SignedSyntheticFullSnapshotV39,
      input.snapshotKey,frame,signed.mac
    );
    await originalBlob(client,frame,full.delivery,
      input.originalWire,input.originalCanonicalBlob);
    const existing=await stateOf(client,frame.sessionId);
    let already=false;
    if(existing.session.rowCount||existing.delivery.rowCount||existing.items.rowCount){
      if(existing.session.rowCount!==1||
         existing.session.rows[0].state!=="quarantined"||
         existing.delivery.rowCount!==1||
         existing.items.rowCount!==full.items.length||
         canonical(norm(existing.delivery.rows[0]))!==canonical(full.delivery)||
         canonical(existing.items.rows.map(norm).sort(
           (a,b)=>Number(a.item_index)-Number(b.item_index)
         ))!==canonical([...full.items].sort(
           (a,b)=>Number(a.item_index)-Number(b.item_index)
         )))
        throw Error("P13_EXACT_RESTORE_PARTIAL_OR_CONFLICTING_RUNTIME");
      already=true;
    }else{
      await client.query(
        "INSERT INTO clean.prepaid_probe_session_runtime("+
        "session_id,provider_subscription_id,state,expires_at_utc,"+
        "callback_requests_seen,callback_success_2xx,callback_failures) "+
        "VALUES($1,$2,'quarantined',$3,0,0,0)",
        [frame.sessionId,frame.providerSubscriptionId,frame.windowEndUtc]
      );
      await client.query(insertSql("prepaid_probe_delivery_runtime",colsDelivery),
        values(full.delivery,colsDelivery));
      for(const item of full.items)
        await client.query(insertSql("prepaid_probe_item_runtime",colsItem),
          values(item,colsItem));
    }
    const result=await stateOf(client,frame.sessionId);
    if(result.delivery.rowCount!==1||
       result.items.rowCount!==full.items.length||
       result.session.rows[0]?.state!=="quarantined"||
       canonical(norm(result.delivery.rows[0]))!==canonical(full.delivery)||
       canonical(result.items.rows.map(norm).sort(
         (a,b)=>Number(a.item_index)-Number(b.item_index)
       ))!==canonical([...full.items].sort(
         (a,b)=>Number(a.item_index)-Number(b.item_index)
       )))
      throw Error("P13_EXACT_RESTORE_POST_COMMIT_WITNESS_MISMATCH");
    // No provider/blob writes; read-only verify exactly one original.
    await originalBlob(client,frame,full.delivery,
      input.originalWire,input.originalCanonicalBlob);
    await client.query("COMMIT");
    return {
      rowsRestored:full.items.length,existingOriginalBlobReferences:1,
      duplicateBlobReferencesCreated:0,
      restoredSessionState:"quarantined",
      idempotent:already,originalEdgeUtc:frame.firstEdgeReceivedUtc,
      paidCollectionResumed:false,
      independentRealProviderSourceVerified:false,
      scientificPassAuthorized:false,
      automatedPaidRecoveryAuthorized:false
    };
  }catch(error){
    await client.query("ROLLBACK").catch(()=>undefined);
    throw error;
  }
}


/**
 * P13 full-window fixture ONLY: 120 signed synthetic source attempts in eight
 * 15-minute buckets, restored in ONE transaction after ALL receipts and the
 * complete LOGGED source inventory have been independently cross-checked.
 *
 * The 120 attempts/15-per-bin fixture is NOT an F.8 provider flight-count
 * acceptance threshold. A real experiment may have sparse/uneven arrivals.
 * This is an intentionally high-coverage deterministic crash-replay stress
 * design, not an authorization to fabricate data for empty intervals.
 *
 * Full-row LOGGED fixtures are PROHIBITED in production V3.9 PITR. No branch
 * of this function calls AeroDataBox or enters a billable active state.
 */
export type SyntheticCompleteWindowInputV39=Readonly<{
  client:PoolClient;
  signedSender:SignedSyntheticSenderFrameV39;
  senderKey:string;
  journalKey:string;
  snapshotKey:string;
  expectedSessionId:string;
  expectedSubscriptionId:string;
  expectedOwnerFrozenRunSha256:string;
  entries:readonly Readonly<{
    attemptKey:string;
    originalWire:Uint8Array;
    originalCanonicalBlob:Uint8Array;
  }>[];
}>;
export type SyntheticCompleteWindowResultV39=Readonly<{
  attemptsRecovered:120;
  originalEightFifteenMinuteBuckets:readonly number[];
  originalCreditsReconciled:120;
  physicalObservationRowsRestored:number;
  existingLoggedSourceRefs:120;
  newLoggedSourceRefs:0;
  retainedOriginalTimestamps:true;
  quarantined:true;
  idempotent:boolean;
  independentRealSenderProvenanceVerified:false;
  scientificallyCertified:false;
  paidRunAuthorized:false;
  automaticPaidReplayAuthorized:false;
}>;
const retainedWitness=(frame:SyntheticScienceJournalFrameV39):
  SyntheticPhysicalItemWitnessV39[]=>[...frame.items];
const srcOriginal=(body:Uint8Array)=>{
  try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(body))}
  catch{throw Error("P13_WINDOW_ORIGINAL_WIRE_JSON_INVALID")}
};
function rejectUnexpected(when:boolean,code:string){
  if(when)throw Error(code);
}
export async function restoreSyntheticCompleteWindowV39(
  input:SyntheticCompleteWindowInputV39
):Promise<SyntheticCompleteWindowResultV39>{
  fixtureOnly();
  if(!Array.isArray(input.entries)||input.entries.length!==120)
    throw Error("P13_WINDOW_NOT_EXACT_120_SYNTHETIC_ATTEMPTS");
  const sender=verifySyntheticSenderFrameV39({
    signed:input.signedSender,
    independentSenderKey:input.senderKey,
    expectedSessionId:input.expectedSessionId,
    expectedProviderSubscriptionId:input.expectedSubscriptionId,
    expectedOwnerFrozenRunSha256:input.expectedOwnerFrozenRunSha256
  });
  if(sender.attempts.length!==120)
    throw Error("P13_WINDOW_INCOMPLETE_INDEPENDENT_SYNTHETIC_SENDER");
  const senderByKey=new Map(sender.attempts.map(a=>[a.attemptKey,a]));
  const keys=new Set<string>();
  for(const entry of input.entries){
    rejectUnexpected(keys.has(entry.attemptKey)||!senderByKey.has(entry.attemptKey),
      "P13_WINDOW_ATTEMPT_UNKNOWN_OR_DUPLICATED");
    keys.add(entry.attemptKey);
  }
  const c=input.client;
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try{
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",[
      sender.sessionId
    ]);
    const jr=await c.query(
      "SELECT attempt_key,signed_record FROM "+SCHEMA+
      ".signed_source_item_journal WHERE session_id=$1 FOR SHARE",
      [sender.sessionId]
    );
    const snap=await c.query(
      "SELECT attempt_key,signed_record FROM "+SCHEMA+
      ".exact_runtime_snapshot WHERE session_id=$1 FOR SHARE",
      [sender.sessionId]
    );
    if(jr.rowCount!==120||snap.rowCount!==120)
      throw Error("P13_WINDOW_DURABLE_INVENTORY_INCOMPLETE_OR_EXTRA");
    const jm=new Map<string,SignedSyntheticScienceJournalV39>(
      jr.rows.map(r=>[String(r.attempt_key),r.signed_record])
    );
    const sm=new Map<string,SignedSyntheticFullSnapshotV39>(
      snap.rows.map(r=>[String(r.attempt_key),r.signed_record])
    );
    if(jm.size!==120||sm.size!==120)
      throw Error("P13_WINDOW_DURABLE_INVENTORY_DUPLICATED");
    const bounds=[Date.parse(sender.windowStartUtc),
      Date.parse(sender.windowEndUtc)];
    const bins=Array<number>(8).fill(0);
    let totalCredits=0;
    const originals:Readonly<{
      full:SyntheticFullSnapshotV39;
      frame:SyntheticScienceJournalFrameV39;
    }>[]=[];
    const allWitnesses:SyntheticPhysicalItemWitnessV39[]=[];
    const frozenDeliveries=new Set<string>();
    // All independent evidence and all surviving blob refs are checked
    // BEFORE the very first potentially reconstructive write.
    for(const e of input.entries){
      const a=senderByKey.get(e.attemptKey)!;
      const signed=jm.get(e.attemptKey);
      const snapshot=sm.get(e.attemptKey);
      if(!signed||!snapshot)
        throw Error("P13_WINDOW_SOURCE_OR_SNAPSHOT_MISSING");
      const expected={
        sessionId:sender.sessionId,
        providerSubscriptionId:sender.providerSubscriptionId,
        ownerFrozenRunSha256:sender.ownerFrozenRunSha256,
        attemptKey:e.attemptKey
      };
      const frame=verifySyntheticScienceJournalWithOriginalWireV39({
        signed,fixtureKey:input.journalKey,expected,
        originalRawBytes:e.originalWire
      });
      const full=checkedSnapshot(snapshot,input.snapshotKey,frame,signed.mac);
      if(frame.windowStartUtc!==sender.windowStartUtc||
         frame.windowEndUtc!==sender.windowEndUtc)
        throw Error("P13_WINDOW_BOUNDS_CHANGED");
      if(frame.sourceWireSha256!==a.wireSha256||
         frame.syntheticCostCredits!==a.syntheticCostCredits||
         a.syntheticCostCredits!==1||a.attemptSeqNo!==0)
        throw Error("P13_WINDOW_SOURCE_IDENTITY_OR_CREDITS_MISMATCH");
      const body=srcOriginal(e.originalWire);
      if(body?.id!==a.notificationId||
         body?.subscription?.id!==sender.providerSubscriptionId||
         body?.timestampUtc!==a.providerGeneratedUtc||
         body?.deliveryAttempt?.seqNo!==a.attemptSeqNo||
         body?.deliveryAttempt?.costCredits!==a.syntheticCostCredits||
         digest(canonical(body))!==a.canonicalSha256)
        throw Error("P13_WINDOW_ORIGINAL_WIRE_SENDER_CONFLICT");
      const eventUtc=Date.parse(frame.firstEdgeReceivedUtc);
      const attemptUtc=Date.parse(a.providerAttemptUtc);
      if(!Number.isFinite(eventUtc)||eventUtc<bounds[0]||
         eventUtc>=bounds[1]||
         eventUtc<attemptUtc-2000||
         eventUtc>attemptUtc+a.senderResponseElapsedMs+2000||
         a.senderResponseStatus!==200||
         a.senderResponseElapsedMs>10000)
        throw Error("P13_WINDOW_ORIGINAL_EDGE_OR_SENDER_ACK_INVALID");
      bins[Math.floor((eventUtc-bounds[0])/900000)]++;
      totalCredits+=frame.syntheticCostCredits;
      const deliveryId=String(full.delivery.delivery_id);
      if(frame.items.some(w=>w.deliveryId!==deliveryId)||
         frozenDeliveries.has(deliveryId))
        throw Error("P13_WINDOW_DUPLICATE_OR_WRONG_SOURCE_DELIVERY");
      frozenDeliveries.add(deliveryId);
      await originalBlob(c,frame,full.delivery,
        e.originalWire,e.originalCanonicalBlob);
      originals.push({full,frame});
      allWitnesses.push(...retainedWitness(frame));
    }
    if(totalCredits!==120||!bins.every(x=>x===15))
      throw Error("P13_WINDOW_EIGHT_BUCKET_OR_CREDIT_TOTAL_INVALID");
    const blobInventory=await c.query(
      "SELECT source_record_id FROM clean.provider_content_blob_ref "+
      "WHERE source_kind='webhook' AND "+
      "left(source_record_id,length($1::text))=$1::text FOR SHARE",
      ["prepaid:"+sender.sessionId+":"]
    );
    if(blobInventory.rowCount!==120)
      throw Error("P13_WINDOW_EXTRA_OR_MISSING_LOGGED_ORIGINAL");
    for(const r of blobInventory.rows){
      const key=String(r.source_record_id)
        .slice(("prepaid:"+sender.sessionId+":").length);
      if(!frozenDeliveries.has(key))
        throw Error("P13_WINDOW_UNREGISTERED_LOGGED_DELIVERY");
    }
    const current=await stateOf(c,sender.sessionId);
    const expectedDeliveryRows=originals.map(o=>o.full.delivery)
      .sort((a,b)=>String(a.delivery_id).localeCompare(String(b.delivery_id)));
    const expectedItemRows=originals.flatMap(o=>o.full.items)
      .sort((a,b)=>String(a.delivery_id).localeCompare(String(b.delivery_id))||
                   Number(a.item_index)-Number(b.item_index));
    const deliverySql="SELECT * FROM clean.prepaid_probe_delivery_runtime "+
      "WHERE session_id=$1 ORDER BY delivery_id";
    const itemSql="SELECT * FROM clean.prepaid_probe_item_runtime "+
      "WHERE session_id=$1 ORDER BY delivery_id,item_index";
    const canonicalRows=(rows:readonly Record<string,unknown>[])=>canonical(
      rows.map(norm));
    const exact=(deliveries:readonly Record<string,unknown>[],
      items:readonly Record<string,unknown>[])=>{
      return canonicalRows(deliveries)===canonicalRows(expectedDeliveryRows)&&
        canonicalRows(items)===canonicalRows(expectedItemRows);
    };
    let idempotent=false;
    if(current.session.rowCount||current.delivery.rowCount||current.items.rowCount){
      if(current.session.rowCount!==1||
         current.session.rows[0].state!=="quarantined"||
         current.delivery.rowCount!==120||
         current.items.rowCount!==expectedItemRows.length)
        throw Error("P13_WINDOW_PARTIAL_OR_ACTIVE_RUNTIME_FORBIDDEN");
      const existingDelivery=(await c.query(deliverySql,[sender.sessionId])).rows;
      const existingItems=(await c.query(itemSql,[sender.sessionId])).rows;
      if(!exact(existingDelivery,existingItems))
        throw Error("P13_WINDOW_RESTORED_ROWS_CHANGED");
      idempotent=true;
    }else{
      await c.query(
        "INSERT INTO clean.prepaid_probe_session_runtime("+
        "session_id,provider_subscription_id,state,expires_at_utc,"+
        "callback_requests_seen,callback_success_2xx,callback_failures) "+
        "VALUES($1,$2,'quarantined',$3,0,0,0)",
        [sender.sessionId,sender.providerSubscriptionId,sender.windowEndUtc]
      );
      for(const o of originals){
        await c.query(insertSql("prepaid_probe_delivery_runtime",colsDelivery),
          values(o.full.delivery,colsDelivery));
        for(const item of o.full.items)
          await c.query(insertSql("prepaid_probe_item_runtime",colsItem),
            values(item,colsItem));
      }
    }
    const after=await stateOf(c,sender.sessionId);
    if(after.session.rowCount!==1||
       after.session.rows[0].state!=="quarantined"||
       after.delivery.rowCount!==120||
       after.items.rowCount!==expectedItemRows.length)
      throw Error("P13_WINDOW_POST_RESTORE_ROWS_MISSING");
    const restoredDelivery=(await c.query(deliverySql,[sender.sessionId])).rows;
    const restoredItems=(await c.query(itemSql,[sender.sessionId])).rows;
    if(!exact(restoredDelivery,restoredItems))
      throw Error("P13_WINDOW_POST_RESTORE_EXACT_ROWS_CHANGED");
    const observedWitnesses:SyntheticPhysicalItemWitnessV39[]=
      restoredItems.map(r=>({
        sessionId:String(r.session_id),deliveryId:String(r.delivery_id),
        itemIndex:Number(r.item_index),
        rawItemSha256:String(r.raw_item_sha256),
        originalEdgeReceivedUtc:new Date(r.received_at_utc).toISOString(),
        identityResolutionStatus:r.identity_resolution_status,
        codeshareResolutionStatus:r.codeshare_resolution_status,
        flightInstanceId:r.flight_instance_id,
        initialServiceDate:r.initial_service_date,
        operatingCarrier:r.operating_carrier,
        operatingFlightNumber:r.operating_flight_number,
        originIcao:r.origin_icao,destinationIcao:r.destination_icao,
        scheduledGateOutUtc:r.scheduled_gate_out_utc?
          new Date(r.scheduled_gate_out_utc).toISOString():null
      }));
    const itemsAudit=compareSyntheticPhysicalItemContinuityV39({
      frozenSessionId:sender.sessionId,
      windowStartUtc:sender.windowStartUtc,
      windowEndUtc:sender.windowEndUtc,
      independentSourceEvidenceAuthenticated:true,
      independentOwnerFreezeAuthenticated:true,
      expectedWitnesses:allWitnesses,
      observedRuntimeRows:observedWitnesses
    });
    if(!itemsAudit.itemEvidenceConsistent||
       itemsAudit.errors.length!==0||
       itemsAudit.observedItemCount!==expectedItemRows.length)
      throw Error("P13_WINDOW_POST_RESTORE_PHYSICAL_V2_INCONSISTENT");
    await c.query("COMMIT");
    return {
      attemptsRecovered:120,
      originalEightFifteenMinuteBuckets:bins,
      originalCreditsReconciled:120,
      physicalObservationRowsRestored:expectedItemRows.length,
      existingLoggedSourceRefs:120,newLoggedSourceRefs:0,
      retainedOriginalTimestamps:true,quarantined:true,
      idempotent,
      independentRealSenderProvenanceVerified:false,
      scientificallyCertified:false,
      paidRunAuthorized:false,
      automaticPaidReplayAuthorized:false
    };
  }catch(error){
    await c.query("ROLLBACK").catch(()=>undefined);
    throw error;
  }
}
