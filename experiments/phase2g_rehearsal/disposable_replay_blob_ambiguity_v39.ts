import type {PoolClient} from "pg";

/**
 * P13 synthetic-only READ-ONLY auditor for two hard crash-replay problems:
 *
 * (1) A LOGGED provider_content_blob_ref survives UNLOGGED session loss.
 * (2) Re-ingestion may insert a second LOGGED blob ref for the *same*
 *     logical notification/source_record_id, even when item hashes match.
 *
 * This audit CANNOT repair, delete, dedupe or certify a production source.
 */
export type SyntheticReplayBlobAmbiguityV39=Readonly<{
  distinctDeliveryIds:number;
  loggedBlobReferenceRows:number;
  recoveredUnloggedDeliveryRows:number;
  duplicateLogicalSourceIds:number;
  conflictingBlobShaIds:number;
  orphanedSourceIds:number;
  missingSourceIds:number;
  errors:readonly string[];
  replayCanBeTrusted:false;
  scientificPassAuthorized:false;
  paidRunAuthorized:false;
}>;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function onlyDisposable(){
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_DATABASE_RUNTIME_URL)
    throw new Error("P13_REPLAY_BLOB_DISPOSABLE_ONLY");
  let db:URL;
  try{db=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"")}
  catch{throw new Error("P13_REPLAY_BLOB_DISPOSABLE_URL_REQUIRED")}
  if(db.hostname!=="127.0.0.1"||
     db.pathname!=="/p2g_stage1_fixture")
    throw new Error("P13_REPLAY_BLOB_NONDISPOSABLE_DB_REJECTED");
}
export async function auditDisposableCrashReplayBlobRefsV39(input:{
  client:Pick<PoolClient,"query">;
  frozenSessionId:string;
  expectedLogicalDeliveryIds:readonly string[];
}):Promise<SyntheticReplayBlobAmbiguityV39>{
  onlyDisposable();
  if(!UUID.test(input.frozenSessionId)||
     !Array.isArray(input.expectedLogicalDeliveryIds)||
     input.expectedLogicalDeliveryIds.length===0||
     input.expectedLogicalDeliveryIds.length>10000||
     input.expectedLogicalDeliveryIds.some(x=>
       typeof x!=="string"||x.length===0||x.length>256
     )||new Set(input.expectedLogicalDeliveryIds).size!==
          input.expectedLogicalDeliveryIds.length)
    throw new Error("P13_REPLAY_BLOB_FROZEN_SESSION_OR_DELIVERIES_INVALID");
  const errors=new Set<string>();
  const expected=new Set(input.expectedLogicalDeliveryIds);
  const prefix="prepaid:"+input.frozenSessionId+":";
  const rows=await input.client.query(
    "SELECT source_record_id,content_sha256 FROM "+
    "clean.provider_content_blob_ref "+
    "WHERE source_kind='webhook' AND "+
    "left(source_record_id,length($1::text))=$1::text",
    [prefix]
  );
  const runtime=await input.client.query(
    "SELECT delivery_id,raw_body_sha256 FROM "+
    "clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid",
    [input.frozenSessionId]
  );
  const blobs=new Map<string,string[]>();
  for(const row of rows.rows){
    const sourceId=String(row.source_record_id);
    if(!sourceId.startsWith(prefix)){
      errors.add("P13_LOGGED_SOURCE_UNEXPECTED_PREFIX");continue;
    }
    const id=sourceId.slice(prefix.length);
    if(!expected.has(id))
      errors.add("P13_LOGGED_SOURCE_NOT_IN_FROZEN_DELIVERY_INVENTORY");
    const old=blobs.get(id)??[];
    old.push(String(row.content_sha256));blobs.set(id,old);
  }
  const active=new Map<string,string>();
  for(const row of runtime.rows){
    const id=String(row.delivery_id);
    if(active.has(id))errors.add("P13_RECOVERED_UNLOGGED_DUPLICATE_DELIVERY_ID");
    active.set(id,String(row.raw_body_sha256));
    if(!expected.has(id))errors.add("P13_RUNTIME_DELIVERY_UNEXPECTED");
  }
  let duplicates=0,conflicts=0,orphans=0,missing=0;
  for(const id of expected){
    const references=blobs.get(id)??[];
    if(references.length===0){
      missing++;errors.add("P13_ORIGINAL_DURABLE_BLOB_REF_MISSING");
    }
    if(references.length>1){
      duplicates++;errors.add("P13_REPLAY_DUPLICATED_LOGGED_SOURCE_REF");
    }
    if(new Set(references).size>1){
      conflicts++;errors.add("P13_DUPLICATE_LOGGED_SOURCE_SHA_CONFLICT");
    }
    if(references.length>0&&!active.has(id)){
      orphans++;errors.add("P13_LOGGED_SOURCE_REF_ORPHANED_AFTER_CRASH");
    }
    if(active.has(id)&&references.length>0&&
       !references.includes(active.get(id)!))
      errors.add("P13_LOGGED_VS_RECOVERED_DELIVERY_BODY_SHA_MISMATCH");
  }
  for(const id of active.keys())
    if(!blobs.has(id))
      errors.add("P13_UNLOGGED_DELIVERY_WITHOUT_DURABLE_REF");
  return {
    distinctDeliveryIds:blobs.size,
    loggedBlobReferenceRows:rows.rowCount??rows.rows.length,
    recoveredUnloggedDeliveryRows:runtime.rowCount??runtime.rows.length,
    duplicateLogicalSourceIds:duplicates,
    conflictingBlobShaIds:conflicts,
    orphanedSourceIds:orphans,
    missingSourceIds:missing,
    errors:[...errors].sort(),
    replayCanBeTrusted:false,
    scientificPassAuthorized:false,
    paidRunAuthorized:false
  };
}
