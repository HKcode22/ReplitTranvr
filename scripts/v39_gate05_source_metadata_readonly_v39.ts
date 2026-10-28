/**
 * Protected, READ-ONLY original Gate05 source metadata audit.
 * No provider, blob download, FIDS, mutation or raw flight logs.
 * UNLOGGED loss is UNKNOWN delivery, never an observed zero.
 */
import pg from "pg";
const SCOPE="e69ffa34-d8a6-456f-a49c-9dd459e6d294";
type Reader={query:(sql:string,parameters?:any[])=>Promise<{
  rows:any[];rowCount:number|null
}>};
export async function auditGate05SourceMetadataV39(db:Reader,nowUtc:string){
  const now=Date.parse(nowUtc);
  if(!Number.isFinite(now)||!nowUtc.endsWith("Z"))
    throw Error("GATE05_SOURCE_AUDIT_INVALID_CLOCK");
  const own=await db.query(
    "SELECT session_id::text,state,provider_subscription_id,terminal_evidence_sha256"+
    " FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid",[SCOPE]);
  if(own.rowCount!==1||own.rows[0].session_id!==SCOPE||
     own.rows[0].state!=="STOPPED"||
     !own.rows[0].provider_subscription_id||
     !/^[a-f0-9]{64}$/.test(own.rows[0].terminal_evidence_sha256??""))
    throw Error("GATE05_SOURCE_AUDIT_OWNER_NOT_TERMINAL");
  const session=await db.query(
    "SELECT session_id::text,provider_subscription_id,owner_kind"+
    " FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid",[SCOPE]);
  if(session.rowCount>1||
     (session.rowCount===1&&(
       session.rows[0].session_id!==SCOPE||
       session.rows[0].owner_kind!=="phase3_gate05_science"||
       session.rows[0].provider_subscription_id!==own.rows[0].provider_subscription_id)))
    throw Error("GATE05_SOURCE_AUDIT_RUNTIME_IDENTITY_MISMATCH");
  const delivery=await db.query(
    "SELECT d.delivery_id,d.blob_ref_id::text,d.raw_body_sha256,d.notification_items,"+
    " d.received_at_utc,r.blob_ref_id::text AS logged_blob_ref_id,"+
    " r.content_sha256,r.content_bytes,r.source_kind,r.source_record_id,"+
    " r.persisted_at_utc,r.expires_at_utc,r.deleted_at_utc"+
    " FROM clean.prepaid_probe_delivery_runtime d"+
    " LEFT JOIN clean.provider_content_blob_ref r ON r.blob_ref_id=d.blob_ref_id"+
    " WHERE d.session_id=$1::uuid ORDER BY d.received_at_utc,d.delivery_id"+
    " LIMIT 5001",[SCOPE]);
  const items=await db.query(
    "SELECT delivery_id,item_index,raw_item_sha256,flight_instance_id,"+
    " identity_resolution_status,codeshare_resolution_status"+
    " FROM clean.prepaid_probe_item_runtime"+
    " WHERE session_id=$1::uuid ORDER BY delivery_id,item_index LIMIT 100001",
    [SCOPE]);
  // LOGGED original-blob refs outlive UNLOGGED delivery/item/session tables.
  // This query is INDEPENDENT of any surviving prepaid runtime row. Its
  // source_record_id is a strict historical session prefix, never foreign.
  // A ref within its TTL is NOT proof its App Storage object still exists.
  const rawRefs=await db.query(
    "SELECT blob_ref_id::text,source_record_id,content_sha256,"+
    " content_bytes,storage_kind,content_class,source_kind,"+
    " persisted_at_utc,expires_at_utc,deleted_at_utc"+
    " FROM clean.provider_content_blob_ref"+
    " WHERE source_kind='webhook' AND source_record_id LIKE $1"+
    " ORDER BY source_record_id LIMIT 5001",
    ["prepaid:"+SCOPE+":%"]);
  if(delivery.rows.length>5000||items.rows.length>100000||
     rawRefs.rows.length>5000)
    throw Error("GATE05_SOURCE_AUDIT_UNBOUNDED_ROWS");
  const deliveries=new Set(delivery.rows.map(d=>String(d.delivery_id)));
  if(items.rows.some(i=>!deliveries.has(String(i.delivery_id))))
    throw Error("GATE05_SOURCE_AUDIT_UNBOUND_ITEM");
  let logged=0,unexpired=0,missing=0,mismatch=0,sum=0;
  for(const d of delivery.rows){
    const count=Number(d.notification_items);
    if(!Number.isSafeInteger(count)||count<0)
      throw Error("GATE05_SOURCE_AUDIT_INVALID_ITEM_COUNT");
    sum+=count;
    const hasRef=d.logged_blob_ref_id===d.blob_ref_id;
    if(hasRef)logged++;
    const same=hasRef&&d.raw_body_sha256===d.content_sha256&&
      d.source_kind==="webhook"&&
      d.source_record_id==="prepaid:"+SCOPE+":"+d.delivery_id;
    if(hasRef&&!same)mismatch++;
    const expiry=Date.parse(String(d.expires_at_utc));
    const persisted=Date.parse(String(d.persisted_at_utc));
    const usable=same&&d.deleted_at_utc===null&&
      Number.isFinite(expiry)&&expiry>now&&
      Number.isFinite(persisted)&&persisted<=now;
    if(usable)unexpired++;else missing++;
  }
  if(delivery.rows.length>0&&sum!==items.rows.length)
    throw Error("GATE05_SOURCE_AUDIT_INCOMPLETE_ITEM_LEDGER");
  let independentUnexpired=0,independentExpired=0,independentMalformed=0;
  const refIds=new Set<string>();
  for(const row of rawRefs.rows){
    if(refIds.has(row.blob_ref_id))
      throw Error("GATE05_SOURCE_AUDIT_DUPLICATE_LOGGED_BLOB_REF");
    refIds.add(row.blob_ref_id);
    const shape=typeof row.blob_ref_id==="string"&&
      /^[a-f0-9-]{36}$/.test(row.blob_ref_id)&&
      row.storage_kind==="replit_app_storage"&&
      row.content_class==="raw_provider_content"&&
      row.source_kind==="webhook"&&
      typeof row.source_record_id==="string"&&
      row.source_record_id.startsWith("prepaid:"+SCOPE+":ppd_")&&
      /^[a-f0-9]{64}$/.test(row.content_sha256??"")&&
      Number.isSafeInteger(Number(row.content_bytes))&&
      Number(row.content_bytes)>0;
    const until=Date.parse(String(row.expires_at_utc));
    const since=Date.parse(String(row.persisted_at_utc));
    if(!shape||!Number.isFinite(since)||since>now||
       !Number.isFinite(until)||until<=since){independentMalformed++;continue;}
    if(row.deleted_at_utc!==null||until<=now)independentExpired++;
    else independentUnexpired++;
  }
  return {
    schema:"v39.gate05.live-readonly-source-metadata.v1",
    priorOwnerStopped:true,unloggedSessionRetained:session.rowCount===1,
    deliveryRows:delivery.rows.length,itemRows:items.rows.length,
    loggedRawRefs:logged,validUnexpiredRawRefs:unexpired,
    missingOrExpiredRawRefs:missing,sourceHashDisagreements:mismatch,
    // These counts are sourced from the independent durable LOGGED ledger.
    independentLoggedRefs:rawRefs.rows.length,
    independentUnexpiredLedgerRefs:independentUnexpired,
    independentExpiredOrDeletedLedgerRefs:independentExpired,
    independentMalformedLedgerRefs:independentMalformed,
    loggedRefCountWithNoUnloggedDelivery:rawRefs.rows.length-delivery.rows.length>0?
      rawRefs.rows.length-delivery.rows.length:0,
    objectBytesIndependentlyReadBack:false,
    providerBlobReadAttempted:false,rawFlightStatusMeasured:false,
    rawBefore2xxAckMeasured:false,actualFlightWheelsOffMeasured:false,
    gate05ScientificPass:false,noProviderCalls:true,dbWrites:0,
    status:session.rowCount===1&&delivery.rows.length>0&&unexpired>0?
      "SOURCE_METADATA_AVAILABLE_NOT_RAW_CERTIFIED":
      independentUnexpired>0?
      "LOGGED_RAW_REFERENCES_SURVIVE_RUNTIME_LOSS_BYTES_UNVERIFIED":
      rawRefs.rows.length>0?
      "LOGGED_REFERENCES_EXPIRED_OR_INVALID_RUNTIME_LOST":
      "NO_LOGGED_SOURCE_REFS_AND_UNLOGGED_RUNTIME_LOST"
  } as const;
}
async function cli(){
  const manual=process.env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
    process.env.GATE05_SOURCE_READONLY_CONFIRM===
      "AUDIT_OLD_GATE05_SOURCE_METADATA_ONLY_NO_PROVIDER";
  const postmerge=process.env.GITHUB_EVENT_NAME==="push"&&
    process.env.GATE05_SOURCE_READONLY_CONFIRM==="AUTO_POSTMERGE_READONLY";
  if((!manual&&!postmerge)||
     process.env.GITHUB_REF!=="refs/heads/main"||
     process.env.GITHUB_RUN_ATTEMPT!=="1")
    throw Error("GATE05_SOURCE_AUDIT_UNAUTHORIZED_DISPATCH");
  const url=process.env.GATE05_AUTOMATION_DATABASE_URL;
  if(!url)throw Error("GATE05_SOURCE_AUDIT_DATABASE_SECRET_MISSING");
  const client=new pg.Client({connectionString:url,
    connectionTimeoutMillis:12000,query_timeout:15000,
    application_name:"gate05_metadata_readonly_oct28"});
  await client.connect();
  try{
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const report=await auditGate05SourceMetadataV39(client,new Date().toISOString());
    await client.query("COMMIT");
    // Only aggregate metadata COUNTS; no raw/hash/flight identity/credentials.
    console.log(JSON.stringify(report));
  }catch{
    await client.query("ROLLBACK").catch(()=>undefined);
    throw Error("GATE05_SOURCE_AUDIT_READONLY_UNCONFIRMED");
  }finally{await client.end().catch(()=>undefined);}
}
if(process.argv[1]?.endsWith("v39_gate05_source_metadata_readonly_v39.ts")){
  void cli().catch(e=>{
    console.error(e instanceof Error?e.message:"GATE05_SOURCE_AUDIT_HOLD");
    process.exitCode=2;
  });
}
