/**
 * Phase 3 / Gate 3 — independent LIVE ORIGINAL custody verification.
 *
 * No provider calls, subscription mutations, SQL writes, payload logging,
 * credential handling, or paid authorization. Checks only the exactly
 * prearmed Gate3 session, its attached subscription, immutable LOGGED original
 * references and actual downloaded Object Storage bytes.
 *
 * This proves live original-byte/SQL integrity and subscription-ID binding;
 * it DOES NOT cryptographically authenticate AeroDataBox as the sender:
 * the current receiver uses a shared secret in the callback path, not HMAC.
 * The real owner must also independently verify provider LIST/balances,
 * exact human AUTH and successful provider DELETE/settlement.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import type {ProviderBlobStoreV39} from "./providerBlobStore_v39";
import {assertPrepaidOriginalJsonStructureV39} from "./prepaidOriginalJsonStructure_v39";
import {preparePrepaidProbeSourceV39} from "./prepaidProbeRuntime_v39";

export type Gate3CustodyReadbackScopeV39=Readonly<{
  sessionId:string;
  icao:string;
  authorizationEvidenceSha256:string;
  providerSubscriptionId:string;
  creditCeiling:number;
}>;

export type Gate3CustodyReadbackReceiptV39=Readonly<{
  schema:"v39.phase3.gate3.live-original-custody.v1";
  status:"PASS_ORIGINAL_BYTES_BOUND_NOT_PROVIDER_AUTHENTICITY";
  sessionId:string;
  deliveries:number;
  notificationItems:number;
  internalCredits:number;
  verifiedOriginalBytes:number;
  referenceCount:number;
  evidenceSha256:string;
  historicalPhase2RowsModified:false;
  providerCalls:0;
  databaseWrites:0;
  blobWrites:0;
  isPaidCanaryCertification:false;
  independentProviderOriginSignatureVerified:false;
}>;

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const OBJECT=/^v39\/provider\/raw_provider_content\/[a-f0-9]{2}\/[a-f0-9-]{36}\.blob$/;
const sha=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
function int(value:unknown):number {
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<0)throw Error("GATE3_READBACK_COUNT_INVALID");
  return n;
}
function utc(value:unknown):number {
  const n=Date.parse(String(value??""));
  if(!Number.isFinite(n))throw Error("GATE3_READBACK_TIMESTAMP_INVALID");
  return n;
}

/** Call only after a provider window is STOPPED and callback settlement quiet. */
export async function verifyGate3OriginalCustodyV39(
  pool:Pick<Pool,"connect">,
  store:Pick<ProviderBlobStoreV39,"downloadBytes">,
  scope:Gate3CustodyReadbackScopeV39,
):Promise<Gate3CustodyReadbackReceiptV39>{
  if(!scope||!UUID.test(scope.sessionId)||!SHA.test(scope.authorizationEvidenceSha256)||
     !/^[A-Z]{4}$/.test(scope.icao)||
     typeof scope.providerSubscriptionId!=="string"||
     scope.providerSubscriptionId.length<1||scope.providerSubscriptionId.length>256||
     !Number.isSafeInteger(scope.creditCeiling)||
     scope.creditCeiling<1||scope.creditCeiling>100)
    throw Error("GATE3_READBACK_SCOPE_INVALID");
  if(!pool||typeof pool.connect!=="function"||
     !store||typeof store.downloadBytes!=="function")
    throw Error("GATE3_READBACK_DEPENDENCIES_REQUIRED");

  const client=await pool.connect();
  let begun=false,discard=false;
  let sourceRows:any[]=[],itemRows:any[]=[];
  try{
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    begun=true;
    await client.query("SET LOCAL statement_timeout = '10000ms'");
    const mode=await client.query("SELECT current_setting('transaction_read_only') AS mode");
    if(mode.rows[0]?.mode!=="on")throw Error("GATE3_READBACK_NOT_READ_ONLY");

    const owner=await client.query(`
      SELECT o.state AS owner_state,o.icao AS owner_icao,
             o.authorization_evidence_sha256,
             s.owner_kind,s.icao,s.state,s.provider_subscription_id,
             s.callback_requests_seen,s.callback_success_2xx,s.callback_failures
        FROM clean.phase3_gate3_canary_owner_v39 o
        JOIN clean.prepaid_probe_session_runtime s ON s.session_id=o.session_id
       WHERE o.session_id=$1::uuid
    `,[scope.sessionId]);
    if(owner.rowCount!==1)throw Error("GATE3_READBACK_OWNER_NOT_FOUND");
    const o=owner.rows[0];
    if(o.owner_state!=="PREPARED"||o.owner_kind!=="phase3_credit_canary"||
       o.state!=="settling"||o.icao!==scope.icao||o.owner_icao!==scope.icao||
       o.authorization_evidence_sha256!==scope.authorizationEvidenceSha256||
       o.provider_subscription_id!==scope.providerSubscriptionId||
       int(o.callback_failures)!==0||
       int(o.callback_success_2xx)<1||
       int(o.callback_success_2xx)>int(o.callback_requests_seen))
      throw Error("GATE3_READBACK_OWNER_OR_CALLBACK_BINDING_INVALID");

    const deliveries=await client.query(`
      SELECT d.delivery_id,d.raw_body_sha256,d.blob_ref_id,
             d.provider_subscription_id,d.notification_items,
             d.delivery_attempt_cost_credits,
             r.storage_kind,r.contract_version,r.content_class,
             r.source_kind,r.source_record_id,r.object_name,
             r.content_sha256,r.content_bytes,r.persisted_at_utc,
             r.expires_at_utc,r.retention_hours,r.deletion_verified_at_utc
        FROM clean.prepaid_probe_delivery_runtime d
        JOIN clean.provider_content_blob_ref r ON r.blob_ref_id=d.blob_ref_id
       WHERE d.session_id=$1::uuid
       ORDER BY d.delivery_id
       LIMIT 257
    `,[scope.sessionId]);
    if(deliveries.rowCount<1||deliveries.rowCount>256)
      throw Error("GATE3_READBACK_DELIVERY_COUNT_INVALID");
    sourceRows=deliveries.rows;

    const orphan=await client.query(`
      SELECT count(*)::int AS n FROM clean.provider_content_blob_ref
       WHERE source_kind='webhook' AND source_record_id LIKE $1
    `,[`prepaid:${scope.sessionId}:%`]);
    if(int(orphan.rows[0]?.n)!==sourceRows.length)
      throw Error("GATE3_READBACK_LOGGED_SOURCE_REF_COUNT_MISMATCH");

    const items=await client.query(`
      SELECT delivery_id,item_index,raw_item_sha256
        FROM clean.prepaid_probe_item_runtime
       WHERE session_id=$1::uuid
       ORDER BY delivery_id,item_index
       LIMIT 1001
    `,[scope.sessionId]);
    if(items.rowCount>1000)
      throw Error("GATE3_READBACK_ITEM_COUNT_LIMIT");
    itemRows=items.rows;
    await client.query("ROLLBACK");
    begun=false;
  }catch(error){
    if(begun){try{await client.query("ROLLBACK")}catch{discard=true}}
    throw error;
  }finally{
    client.release(discard);
  }

  const byDelivery=new Map<string,any[]>();
  for(const item of itemRows){
    const id=String(item.delivery_id);
    if(!byDelivery.has(id))byDelivery.set(id,[]);
    byDelivery.get(id)!.push(item);
  }
  let bytesTotal=0,creditsTotal=0,itemsTotal=0;
  const digests:string[]=[];
  const seen=new Set<string>();
  for(const row of sourceRows){
    const deliveryId=String(row.delivery_id);
    if(!/^ppd_[a-f0-9]{64}$/.test(deliveryId)||seen.has(deliveryId))
      throw Error("GATE3_READBACK_DELIVERY_ID_INVALID_OR_DUPLICATE");
    seen.add(deliveryId);
    const n=int(row.notification_items),cost=int(row.delivery_attempt_cost_credits);
    if(n<1||n!==cost||row.provider_subscription_id!==scope.providerSubscriptionId||
       row.storage_kind!=="replit_app_storage"||
       row.contract_version!=="provider-blob-contract-v39@1.0.0"||
       row.content_class!=="raw_provider_content"||row.source_kind!=="webhook"||
       row.source_record_id!==`prepaid:${scope.sessionId}:${deliveryId}`||
       !OBJECT.test(String(row.object_name))||
       !SHA.test(String(row.raw_body_sha256))||
       row.content_sha256!==row.raw_body_sha256||
       int(row.retention_hours)!==168||
       row.deletion_verified_at_utc!==null||
       utc(row.expires_at_utc)!==utc(row.persisted_at_utc)+168*3600*1000||
       utc(row.expires_at_utc)<=Date.now())
      throw Error("GATE3_READBACK_DELIVERY_REFERENCE_INVALID");

    const stored=Buffer.from(await store.downloadBytes(String(row.object_name)));
    if(stored.length!==int(row.content_bytes)||stored.length>2_097_152||
       sha(stored)!==row.content_sha256)
      throw Error("GATE3_READBACK_ORIGINAL_BYTES_SHA_MISMATCH");
    assertPrepaidOriginalJsonStructureV39(stored);
    let body:any;
    try{body=JSON.parse(stored.toString("utf8"))}
    catch{throw Error("GATE3_READBACK_ORIGINAL_JSON_INVALID")}
    if(body?.subscription?.id!==scope.providerSubscriptionId)
      throw Error("GATE3_READBACK_ORIGINAL_SUBSCRIPTION_ID_MISMATCH");
    const prepared=preparePrepaidProbeSourceV39(scope.sessionId,body);
    if(prepared.deliveryId!==deliveryId||
       prepared.bodySha256!==row.content_sha256||
       !stored.equals(prepared.rawBytes)||
       prepared.evidence.costCredits!==cost||
       prepared.flights.length!==n)
      throw Error("GATE3_READBACK_CANONICAL_OR_DELIVERY_PROOF_MISMATCH");
    const actualItems=byDelivery.get(deliveryId)??[];
    if(actualItems.length!==n||
       actualItems.some((it,i)=>
         int(it.item_index)!==i||it.raw_item_sha256!==prepared.itemRawSha256s[i]))
      throw Error("GATE3_READBACK_NORMALIZED_ITEM_SHA_MISMATCH");
    byDelivery.delete(deliveryId);
    bytesTotal+=stored.length;creditsTotal+=cost;itemsTotal+=n;
    digests.push(`${deliveryId}:${row.content_sha256}:${n}:${cost}`);
  }
  if(byDelivery.size!==0||itemsTotal<1||itemsTotal>scope.creditCeiling||
     creditsTotal!==itemsTotal)
    throw Error("GATE3_READBACK_ORPHAN_OR_CREDIT_LIMIT_MISMATCH");
  return {
    schema:"v39.phase3.gate3.live-original-custody.v1",
    status:"PASS_ORIGINAL_BYTES_BOUND_NOT_PROVIDER_AUTHENTICITY",
    sessionId:scope.sessionId,deliveries:sourceRows.length,
    notificationItems:itemsTotal,internalCredits:creditsTotal,
    verifiedOriginalBytes:bytesTotal,referenceCount:sourceRows.length,
    evidenceSha256:sha(digests.join("\n")),
    historicalPhase2RowsModified:false,providerCalls:0,
    databaseWrites:0,blobWrites:0,isPaidCanaryCertification:false,
    independentProviderOriginSignatureVerified:false,
  };
}
