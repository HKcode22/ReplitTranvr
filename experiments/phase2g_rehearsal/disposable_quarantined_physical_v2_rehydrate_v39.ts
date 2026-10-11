/**
 * P13 fixture-only idempotent physical-v2 rehydration from a PENDING,
 * SHA-verified ORIGINAL blob.
 *
 * This deliberately has no independent ORIGINAL edge UTC/attempt witness.
 * Caller supplies a SYNTHETIC clock, therefore rows are QUARANTINED and
 * can never authorize sender ACK, paid science, 6+6, or source completeness.
 * Fixture-only tables; absolutely never imported into deployed code.
 */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import type {ProviderBlobStoreV39} from
  "../../server/lib/disruption/providerBlobStore_v39";
import {assertPrepaidOriginalJsonStructureV39} from
  "../../server/lib/disruption/prepaidOriginalJsonStructure_v39";
import {
  preparePrepaidProbeSourceV39,resolvePrepaidFlightIdentityV39,
  prepaidRuntimeFlightKeyV39
} from "../../server/lib/disruption/prepaidProbeRuntime_v39";

const SHA=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[a-f0-9]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH=/^v39\/provider\/raw_provider_content\/[0-9a-f]{2}\/[0-9a-f-]{36}\.blob$/;
const hash=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const text=(x:any):string|null=>typeof x==="string"&&x.trim()?x.trim():null;
type ReplayInput=Readonly<{
  mode:"P2G_DISPOSABLE_ONLY";pool:Pool;store:ProviderBlobStoreV39;
  sessionId:string;syntheticAttemptHmac:string;
  expectedSyntheticSubscriptionId:string;
  /** Witness is NOT independently signed; its use forces QUARANTINE. */
  syntheticEdgeReceivedUtc:string;
  syntheticWindowStartUtc:string;syntheticWindowEndUtc:string;
}>;
export type QuarantinedPhysicalV2ReplayV39=Readonly<{
  schema:"v39.fixture-quarantined-physical-v2-rehydrate.v1";
  outcome:"SYNTHETIC_QUARANTINED_INSERTED"|"SYNTHETIC_QUARANTINED_IDEMPOTENT";
  recoveredDeliveryRows:1;
  recoveredPhysicalObservationRows:number;
  confirmedPhysicalOperatorRows:number;
  unresolvableOrMarketingQuarantinedRows:number;
  loggedOriginalObjectReused:true;
  sourceWireBytesVerified:true;
  originalSourceCustodyIndependentlyAttested:false;
  originalEdgeUtcIndependentlyAttested:false;
  providerAttemptAndCreditsIndependentlyVerified:false;
  runState:"quarantined";
  originalIntentStillPending:true;
  canAcknowledge:false;
  canResumePaidCollection:false;
  canClaimCompleteF8:false;
  paidLaunchAuthorized:false;
}>;
function guard(input:ReplayInput){
  if(input.mode!=="P2G_DISPOSABLE_ONLY"||
     process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.V39_DATABASE_RUNTIME_URL||
     process.env.DATABASE_URL||process.env.AERODATABOX_API_KEY||
     process.env.V39_PROVIDER_BLOB_BUCKET_ID||
     !UUID.test(input.sessionId)||!SHA.test(input.syntheticAttemptHmac)||
     !text(input.expectedSyntheticSubscriptionId))
    throw Error("P13_REHYDRATE_FIXTURE_ONLY");
  const start=Date.parse(input.syntheticWindowStartUtc);
  const end=Date.parse(input.syntheticWindowEndUtc);
  const at=Date.parse(input.syntheticEdgeReceivedUtc);
  if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(at)||
     end-start!==7200000||at<start||at>=end)
    throw Error("P13_REHYDRATE_SYNTHETIC_WINDOW_INVALID");
}
const itemCols=[
 "session_id","delivery_id","item_index","raw_item_sha256",
 "flight_number","aircraft_reg","codeshare_status",
 "runtime_flight_key","provider_flight_id","callsign",
 "operating_carrier","operating_flight_number","origin_icao",
 "destination_icao","origin_time_zone","scheduled_gate_out_utc",
 "scheduled_gate_in_utc","flight_instance_id","initial_service_date",
 "provisional_identity_key","codeshare_resolution_status",
 "identity_resolution_status","received_at_utc"
];
const itemSql="INSERT INTO clean.prepaid_probe_item_runtime("+itemCols.join(",")+
  ") VALUES("+itemCols.map((_,i)=>"$"+(i+1)).join(",")+")";
const canonicalResult=(rows:any[])=>rows.map(row=>({
  index:Number(row.item_index),
  rawItemSha256:row.raw_item_sha256,
  flightInstanceId:row.flight_instance_id,
  identityStatus:row.identity_resolution_status,
  codeshareStatus:row.codeshare_resolution_status,
  firstServiceDate:row.initial_service_date===null?null:
    new Date(row.initial_service_date).toISOString().slice(0,10),
  originalSourceTime:new Date(row.received_at_utc).toISOString(),
  operatingCarrier:row.operating_carrier,
  operatingNumber:row.operating_flight_number,
  providerFlightId:row.provider_flight_id,
  originIcao:row.origin_icao,
  destinationIcao:row.destination_icao,
  scheduledGateOut:row.scheduled_gate_out_utc===null?null:
    new Date(row.scheduled_gate_out_utc).toISOString()
}));
const itemRead=async(c:PoolClient,id:string,delivery:string)=>
  (await c.query("SELECT * FROM clean.prepaid_probe_item_runtime "+
    "WHERE session_id=$1 AND delivery_id=$2 ORDER BY item_index",
    [id,delivery])).rows;
export async function rehydrateSyntheticQuarantinedPhysicalV2V39(
 input:ReplayInput
):Promise<QuarantinedPhysicalV2ReplayV39>{
  guard(input);
  const db=await input.pool.query("SELECT current_database() AS db");
  if(db.rows?.[0]?.db!=="p2g_stage1_fixture")
    throw Error("P13_REHYDRATE_NONFIXTURE_DATABASE_REFUSED");
  // Source object download happens before holding a PG pooled connection.
  // A later missing/expired/deleted original MUST fail on every replay.
  const q=await input.pool.query(`
    SELECT state,source_sha256,original_opaque_blob_uuid,
      original_opaque_blob_path,recovery_original_verified_utc,
      source_retention_until,created_utc
    FROM clean.p2g_synthetic_raw_admission_intent
    WHERE session_id=$1 AND synthetic_attempt_hmac=$2
  `,[input.sessionId,input.syntheticAttemptHmac]);
  if(q.rowCount!==1||q.rows[0].state!=="PENDING"||
    q.rows[0].recovery_original_verified_utc===null)
    throw Error("P13_REHYDRATE_ORIGINAL_NOT_RECOVERED_PENDING");
  const before=q.rows[0];
  if(!SHA.test(String(before.source_sha256))||
     !PATH.test(String(before.original_opaque_blob_path))||
     !UUID.test(String(before.original_opaque_blob_uuid)))
    throw Error("P13_REHYDRATE_ORIGINAL_REF_INVALID");
  if(new Date(before.source_retention_until).getTime()<=Date.now())
    throw Error("P13_REHYDRATE_ORIGINAL_EXPIRED");
  let raw:Uint8Array;
  try{raw=await input.store.downloadBytes(before.original_opaque_blob_path);}
  catch{throw Error("P13_REHYDRATE_ORIGINAL_UNREADABLE");}
  if(!(raw instanceof Uint8Array)||raw.length===0||raw.length>65536||
     hash(raw)!==before.source_sha256)
    throw Error("P13_REHYDRATE_ORIGINAL_SHA_MISMATCH");
  assertPrepaidOriginalJsonStructureV39(raw);
  let body:any;
  try{body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));}
  catch{throw Error("P13_REHYDRATE_ORIGINAL_JSON_INVALID");}
  if(!body||typeof body!=="object"||
    (!Array.isArray(body)&&!Array.isArray(body.flights)))
    throw Error("P13_REHYDRATE_FLIGHT_ENVELOPE_INVALID");
  const prepared=preparePrepaidProbeSourceV39(input.sessionId,body);
  if(prepared.flights.length>1000||
     prepared.flights.some((f:any)=>!f||typeof f!=="object"||Array.isArray(f)))
    throw Error("P13_REHYDRATE_INVALID_FLIGHT_LIST");
  const sub=text(body?.subscription?.id);
  if(sub!==input.expectedSyntheticSubscriptionId)
    throw Error("P13_REHYDRATE_SUBSCRIPTION_MISMATCH");
  if(prepared.evidence.costCredits!==null&&
     (!Number.isSafeInteger(prepared.evidence.costCredits)||
      prepared.evidence.costCredits<0))
    throw Error("P13_REHYDRATE_COST_CLAIM_INVALID");
  const c=await input.pool.connect();
  try{
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
      ["p13:fixture:"+input.sessionId]);
    const locked=await c.query(`
      SELECT state,source_sha256,original_opaque_blob_uuid,
        original_opaque_blob_path,recovery_original_verified_utc,
        source_retention_until,created_utc
      FROM clean.p2g_synthetic_raw_admission_intent
      WHERE session_id=$1 AND synthetic_attempt_hmac=$2 FOR SHARE
    `,[input.sessionId,input.syntheticAttemptHmac]);
    if(locked.rowCount!==1)throw Error("P13_REHYDRATE_INTENT_DISAPPEARED");
    const row=locked.rows[0];
    if(row.state!=="PENDING"||row.recovery_original_verified_utc===null||
       row.source_sha256!==before.source_sha256||
       row.original_opaque_blob_path!==before.original_opaque_blob_path||
       row.original_opaque_blob_uuid!==before.original_opaque_blob_uuid||
       new Date(row.source_retention_until).getTime()<=Date.now())
      throw Error("P13_REHYDRATE_SOURCE_CHANGED_AFTER_READBACK");
    const owner=await c.query(
      "SELECT state,provider_subscription_id FROM clean.prepaid_probe_session_runtime "+
      "WHERE session_id=$1 FOR UPDATE",[input.sessionId]);
    if(owner.rowCount!==1||owner.rows[0].state!=="quarantined"||
       owner.rows[0].provider_subscription_id!==input.expectedSyntheticSubscriptionId)
      throw Error("P13_REHYDRATE_OWNER_NOT_QUARANTINED");
    const all=await c.query(
      "SELECT delivery_id FROM clean.prepaid_probe_delivery_runtime "+
      "WHERE session_id=$1 FOR UPDATE",[input.sessionId]);
    if(all.rows.some((r:any)=>r.delivery_id!==prepared.deliveryId)||
       all.rowCount>1)
      throw Error("P13_REHYDRATE_UNRELATED_RUNTIME_PRESENT");
    const logged=await c.query(
      "SELECT blob_ref_id,content_sha256,content_bytes,object_name,"+
      "source_record_id,source_kind,storage_kind,contract_version,"+
      "retention_hours,persisted_at_utc,expires_at_utc "+
      "FROM clean.provider_content_blob_ref WHERE blob_ref_id=$1 FOR SHARE",
      [row.original_opaque_blob_uuid]);
    const expectedSourceRecord="synthetic-quarantined:"+
      input.sessionId+":"+prepared.deliveryId;
    if(logged.rowCount===0){
      if(all.rowCount!==0)throw Error("P13_REHYDRATE_DELIVERY_WITHOUT_ORIGINAL_REF");
      await c.query(`
        INSERT INTO clean.provider_content_blob_ref
          (blob_ref_id,storage_kind,contract_version,object_name,content_class,
           content_sha256,content_bytes,source_kind,source_record_id,
           persisted_at_utc,retention_hours,expires_at_utc)
        VALUES($1,'replit_app_storage','provider-blob-contract-v39@1.0.0',
         $2,'raw_provider_content',$3,$4,'synthetic-quarantined',$5,$6,168,$7)
      `,[row.original_opaque_blob_uuid,row.original_opaque_blob_path,
          row.source_sha256,raw.length,expectedSourceRecord,
          row.created_utc,row.source_retention_until]);
    }else{
      const prior=logged.rows[0];
      if(prior.blob_ref_id!==row.original_opaque_blob_uuid||
         prior.content_sha256!==row.source_sha256||
         Number(prior.content_bytes)!==raw.length||
         prior.object_name!==row.original_opaque_blob_path||
         prior.source_record_id!==expectedSourceRecord||
         prior.source_kind!=="synthetic-quarantined"||
         prior.storage_kind!=="replit_app_storage"||
         prior.contract_version!=="provider-blob-contract-v39@1.0.0"||
         Number(prior.retention_hours)!==168||
         new Date(prior.persisted_at_utc).getTime()!==
           new Date(row.created_utc).getTime()||
         new Date(prior.expires_at_utc).getTime()!==
           new Date(row.source_retention_until).getTime())
        throw Error("P13_REHYDRATE_LOGGED_ORIGINAL_REF_CONFLICT");
    }
    const existing=all.rowCount===1;
    if(existing){
      const d=await c.query(
        "SELECT raw_body_sha256,provider_subscription_id,received_at_utc,"+
        "delivery_attempt_cost_credits,notification_items,blob_ref_id "+
        "FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1 AND delivery_id=$2",
        [input.sessionId,prepared.deliveryId]);
      const v=d.rows[0];
      if(d.rowCount!==1||v.raw_body_sha256!==prepared.bodySha256||
         v.provider_subscription_id!==sub||
         new Date(v.received_at_utc).toISOString()!==input.syntheticEdgeReceivedUtc||
         Number(v.notification_items)!==prepared.flights.length||
         v.blob_ref_id!==row.original_opaque_blob_uuid||
         (v.delivery_attempt_cost_credits===null?null:Number(v.delivery_attempt_cost_credits))!==
           prepared.evidence.costCredits)
        throw Error("P13_REHYDRATE_DUPLICATE_DELIVERY_CONFLICT");
    }else{
      await c.query(`
        INSERT INTO clean.prepaid_probe_delivery_runtime(
          session_id,delivery_id,blob_ref_id,raw_body_sha256,
          provider_subscription_id,received_at_utc,
          provider_notification_generated_utc,delivery_attempt_seq_no,
          delivery_attempt_utc,delivery_attempt_cost_credits,notification_items)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,[input.sessionId,prepared.deliveryId,row.original_opaque_blob_uuid,
         prepared.bodySha256,sub,input.syntheticEdgeReceivedUtc,
         prepared.evidence.notificationGeneratedUtc,
         prepared.evidence.attemptSeqNo,prepared.evidence.attemptUtc,
         prepared.evidence.costCredits,prepared.flights.length]);
    }
    const expectedItemRows:any[]=[];
    for(let i=0;i<prepared.flights.length;i++){
      const flight=prepared.flights[i];
      const identity=await resolvePrepaidFlightIdentityV39(c,input.sessionId,flight);
      const obs=identity.observation;
      const carrier=obs.operatingCarrier?.trim().toUpperCase()||null;
      const number=obs.operatingFlightNumber?.trim().replace(/^0+/,"")||null;
      const origin=obs.originIcao?.trim().toUpperCase()||null;
      const dest=obs.originalDestinationIcao?.trim().toUpperCase()||null;
      const values:any[]=[
        input.sessionId,prepared.deliveryId,i,prepared.itemRawSha256s[i],
        text(flight.number),identity.aircraftReg,identity.codeshareStatus,
        prepaidRuntimeFlightKeyV39(flight),obs.providerFlightId??null,
        obs.callsign??null,carrier,number,origin,dest,
        obs.originTimeZone??null,obs.scheduledGateOutUtc??null,
        identity.scheduledGateInUtc,identity.flightInstanceId,
        identity.initialServiceDate,identity.provisionalIdentityKey,
        identity.codeshareResolutionStatus,identity.identityResolutionStatus,
        input.syntheticEdgeReceivedUtc
      ];
      if(!existing)await c.query(itemSql,values);
      expectedItemRows.push({
        item_index:i,raw_item_sha256:values[3],
        flight_instance_id:values[17],identity_resolution_status:values[21],
        codeshare_resolution_status:values[20],
        initial_service_date:values[18],
        received_at_utc:input.syntheticEdgeReceivedUtc,
        operating_carrier:values[10],operating_flight_number:values[11],
        provider_flight_id:values[8],origin_icao:values[12],
        destination_icao:values[13],scheduled_gate_out_utc:values[15]
      });
    }
    const observed=await itemRead(c,input.sessionId,prepared.deliveryId);
    if(observed.length!==expectedItemRows.length)
      throw Error("P13_REHYDRATE_ITEM_COUNT_CONFLICT");
    const normalized=canonicalResult(observed);
    const expected=canonicalResult(expectedItemRows);
    if(JSON.stringify(normalized)!==JSON.stringify(expected))
      throw Error("P13_REHYDRATE_ITEM_IDENTITY_CONFLICT");
    await c.query("COMMIT");
    const resolved=observed.filter((x:any)=>
      x.identity_resolution_status==="resolved"&&
      x.codeshare_resolution_status==="resolved_operator");
    return {
      schema:"v39.fixture-quarantined-physical-v2-rehydrate.v1",
      outcome:existing?"SYNTHETIC_QUARANTINED_IDEMPOTENT":"SYNTHETIC_QUARANTINED_INSERTED",
      recoveredDeliveryRows:1,
      recoveredPhysicalObservationRows:observed.length,
      confirmedPhysicalOperatorRows:resolved.length,
      unresolvableOrMarketingQuarantinedRows:observed.length-resolved.length,
      loggedOriginalObjectReused:true,sourceWireBytesVerified:true,
      originalSourceCustodyIndependentlyAttested:false,
      originalEdgeUtcIndependentlyAttested:false,
      providerAttemptAndCreditsIndependentlyVerified:false,
      runState:"quarantined",originalIntentStillPending:true,
      canAcknowledge:false,canResumePaidCollection:false,
      canClaimCompleteF8:false,paidLaunchAuthorized:false
    };
  }catch(e){
    await c.query("ROLLBACK").catch(()=>undefined);
    throw e;
  }finally{c.release();}
}
