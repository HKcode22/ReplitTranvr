/**
 * P13/P06 bridge: read-only PREVIEW of recovering a fixture PENDING original
 * to the REAL V3.9 physical-flight input boundary.
 *
 * Important: this does NOT invoke actual resolvePrepaidFlightIdentityV39,
 * persist into UNLOGGED science tables, authorize upstream HTTP 2xx, or
 * substantiate a sender credit ledger. The real resolver needs the session
 * identity persistence (UNLOGGED), owner freeze and two-stage science replay
 * first. This is a safe, byte-bound intermediate contract for testing.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import type {ProviderBlobStoreV39} from "../../server/lib/disruption/providerBlobStore_v39";
import {assertPrepaidOriginalJsonStructureV39} from
  "../../server/lib/disruption/prepaidOriginalJsonStructure_v39";
import {preparePrepaidProbeSourceV39,prepaidIdentityObservationFromFlightV39} from
  "../../server/lib/disruption/prepaidProbeRuntime_v39";

const SHA=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE=/^v39\/provider\/raw_provider_content\/[0-9a-f]{2}\/[0-9a-f-]{36}\.blob$/;
const sha=(b:Uint8Array|string)=>createHash("sha256").update(b).digest("hex");

export type DisposablePhysicalV2ReplayPreviewV39=Readonly<{
  schema:"v39.disposable-pending-physical-v2-preview.v1";
  candidateStatus:"BYTE_VERIFIED_REPLAY_PREVIEW_ONLY";
  metricContract:"v39-physical-flight-instance-v2";
  rawOriginalSha256:string;
  canonicalReceivedSha256:string;
  itemHashListSha256:string;
  savedOriginalBytes:number;
  parsedNotificationItems:number;
  operatorCandidates:number;
  marketingCodesharesQuarantined:number;
  ambiguousCodesharesQuarantined:number;
  invalidOperatorIdentityPrerequisites:number;
  senderClaimsCostCredits:number|null;
  sourceRecoveryPreviouslyVerified:true;
  sourceVerifiedAtPreview:true;
  physicallyResolvedRows:0;
  persistedScientificRows:0;
  independentlyVerifiedProviderAttempts:false;
  independentlyVerifiedExternalItemCredits:false;
  originalProviderWireOriginAuthenticated:false;
  producerFirstHopLossIdentifiable:false;
  exactF8CompleteSource:false;
  canWriteNormalizedScience:false;
  canAdvancePendingIntent:false;
  canAutoReplay:false;
  canAcknowledgeProvider:false;
  paidLaunchAuthorized:false;
}>;

/**
 * Re-check current original bytes every call, irrespective of a LOGGED
 * "previously verified" timestamp. Read-only SELECT+download ONLY.
 * An unavailable, tampered or expired saved source is a hard error.
 */
export async function previewDisposablePendingPhysicalV2ReplayV39(input:{
  mode:"P2G_DISPOSABLE_ONLY";
  pool:Pool;
  store:ProviderBlobStoreV39;
  sessionId:string;
  syntheticAttemptHmac:string;
}):Promise<DisposablePhysicalV2ReplayPreviewV39>{
  if(input.mode!=="P2G_DISPOSABLE_ONLY"||
    process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
    process.env.V39_DATABASE_RUNTIME_URL||
    process.env.AERODATABOX_API_KEY||
    process.env.DATABASE_URL||
    process.env.V39_PROVIDER_BLOB_BUCKET_ID||
    !UUID.test(input.sessionId)||
    !SHA.test(input.syntheticAttemptHmac))
    throw Error("P13_PHYSICAL_PREVIEW_DISPOSABLE_ONLY");
  const db=await input.pool.query("SELECT current_database() AS db");
  if(db.rows?.[0]?.db!=="p2g_stage1_fixture")
    throw Error("P13_PHYSICAL_PREVIEW_FIXTURE_DB_REQUIRED");
  const q=await input.pool.query(`
    SELECT state,source_sha256,original_opaque_blob_path,
           source_retention_until,recovery_original_verified_utc
      FROM clean.p2g_synthetic_raw_admission_intent
     WHERE session_id=$1 AND synthetic_attempt_hmac=$2
  `,[input.sessionId,input.syntheticAttemptHmac]);
  if(q.rowCount!==1)
    throw Error("P13_PHYSICAL_PREVIEW_SOURCE_INTENT_MISSING");
  const row=q.rows[0];
  if(row.state!=="PENDING"||
     row.recovery_original_verified_utc===null||
     !Number.isFinite(Date.parse(row.recovery_original_verified_utc))||
     !SHA.test(String(row.source_sha256))||
     typeof row.original_opaque_blob_path!=="string"||
     !OPAQUE.test(row.original_opaque_blob_path))
    throw Error("P13_PHYSICAL_PREVIEW_SOURCE_NOT_RECOVERED_PENDING");
  const expiry=new Date(row.source_retention_until).getTime();
  if(!Number.isFinite(expiry)||expiry<=Date.now())
    throw Error("P13_PHYSICAL_PREVIEW_SOURCE_EXPIRED");
  let raw:Uint8Array;
  try{raw=await input.store.downloadBytes(row.original_opaque_blob_path);}
  catch{throw Error("P13_PHYSICAL_PREVIEW_SOURCE_MISSING");}
  if(!(raw instanceof Uint8Array)||raw.byteLength===0||
     raw.byteLength>65_536||sha(raw)!==row.source_sha256)
    throw Error("P13_PHYSICAL_PREVIEW_ORIGINAL_BYTE_SHA_INVALID");
  // Enforce the same duplicate-JSON-field invariant as the ACTUAL paid parser.
  // Raw bytes are never returned or logged, even to caller.
  assertPrepaidOriginalJsonStructureV39(raw);
  let body:unknown;
  try{body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));}
  catch{throw Error("P13_PHYSICAL_PREVIEW_ORIGINAL_JSON_INVALID");}
  if(body===null||typeof body!=="object"||
     (!Array.isArray(body)&&Array.isArray((body as any).flights)===false))
    throw Error("P13_PHYSICAL_PREVIEW_FLIGHT_ENVELOPE_INVALID");
  const prepared=preparePrepaidProbeSourceV39(input.sessionId,body);
  if(prepared.flights.length>1000||
     prepared.flights.some(f=>f===null||typeof f!=="object"||Array.isArray(f)))
    throw Error("P13_PHYSICAL_PREVIEW_FLIGHT_LIST_INVALID");
  let operatorCandidates=0,marketing=0,ambiguous=0,invalidOperator=0;
  for(const f of prepared.flights){
    const mapped=prepaidIdentityObservationFromFlightV39(f);
    if(mapped.codeshareStatus==="IsOperator"){
      operatorCandidates++;
      const o=mapped.observation;
      const scheduled=o.scheduledGateOutUtc;
      const scheduledValid=typeof scheduled==="string"&&
        Number.isFinite(new Date(scheduled).getTime());
      if(!o.operatingCarrier||!o.operatingFlightNumber||!o.originIcao||
        !o.originalDestinationIcao||!scheduledValid||
        !o.originTimeZone?.includes("/"))
        invalidOperator++;
    }else if(mapped.codeshareStatus==="IsCodeshared"){
      marketing++;
    }else{
      ambiguous++;
    }
  }
  const credits=prepared.evidence.costCredits;
  if(credits!==null&&(!Number.isSafeInteger(credits)||credits<0))
    throw Error("P13_PHYSICAL_PREVIEW_COST_CLAIM_NOT_INTEGER");
  return {
    schema:"v39.disposable-pending-physical-v2-preview.v1",
    candidateStatus:"BYTE_VERIFIED_REPLAY_PREVIEW_ONLY",
    metricContract:"v39-physical-flight-instance-v2",
    rawOriginalSha256:row.source_sha256,
    canonicalReceivedSha256:prepared.bodySha256,
    itemHashListSha256:sha(JSON.stringify(prepared.itemRawSha256s)),
    savedOriginalBytes:raw.byteLength,
    parsedNotificationItems:prepared.flights.length,
    operatorCandidates,marketingCodesharesQuarantined:marketing,
    ambiguousCodesharesQuarantined:ambiguous,
    invalidOperatorIdentityPrerequisites:invalidOperator,
    senderClaimsCostCredits:credits,
    sourceRecoveryPreviouslyVerified:true,
    sourceVerifiedAtPreview:true,
    physicallyResolvedRows:0,persistedScientificRows:0,
    independentlyVerifiedProviderAttempts:false,
    independentlyVerifiedExternalItemCredits:false,
    originalProviderWireOriginAuthenticated:false,
    producerFirstHopLossIdentifiable:false,
    exactF8CompleteSource:false,
    canWriteNormalizedScience:false,
    canAdvancePendingIntent:false,
    canAutoReplay:false,
    canAcknowledgeProvider:false,
    paidLaunchAuthorized:false
  };
}
