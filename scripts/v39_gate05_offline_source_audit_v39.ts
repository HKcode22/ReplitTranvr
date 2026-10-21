/**
 * Read-only Gate 0.5 source assessment from retained original callback bytes.
 * No AeroDataBox imports or provider calls. Outputs only aggregate evidence.
 * This CLI is NOT a dedicated Gate 0.5 pilot or scientific certificate.
 */
import "dotenv/config";
import pg from "pg";
import {createHash} from "node:crypto";
import {inventoryGate05OfflineItems} from "../server/lib/disruption/gate05OfflineInventory_v39";
import {createRequiredProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {assertPrepaidOriginalJsonStructureV39} from "../server/lib/disruption/prepaidOriginalJsonStructure_v39";
import {preparePrepaidProbeSourceV39} from "../server/lib/disruption/prepaidProbeRuntime_v39";

function sha(v:Buffer|string){return createHash("sha256").update(v).digest("hex");}
function parseArgs(argv:string[]){
  if(argv.length!==4)throw Error("GATE05_EXACT_TWO_READONLY_ARGUMENTS_REQUIRED");
  const read=(flag:string)=>{
    if(argv.filter(x=>x===flag).length!==1)throw Error("GATE05_REQUIRED_FLAG_HOLD");
    const idx=argv.indexOf(flag);
    if(!argv[idx+1]||argv[idx+1].startsWith("--"))throw Error("GATE05_INVALID_FLAG_VALUE");
    return argv[idx+1];
  };
  const sessionId=read("--session-id").toLowerCase();
  const icao=read("--icao").toUpperCase();
  if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(sessionId))
    throw Error("GATE05_INVALID_SESSION");
  if(!/^[A-Z0-9]{4}$/.test(icao))throw Error("GATE05_INVALID_AIRPORT");
  return {sessionId,icao};
}

export async function runGate05OfflineSourceAuditV39(argv=process.argv.slice(2)){
  const {sessionId,icao}=parseArgs(argv);
  if(process.env.V39_DATABASE_TARGET_CONFIRM!=="production"||
     !process.env.V39_DATABASE_RUNTIME_URL)
    throw Error("GATE05_READONLY_DATABASE_CONFIG_HOLD");
  const pool=new pg.Pool({
    connectionString:process.env.V39_DATABASE_RUNTIME_URL,
    max:1,connectionTimeoutMillis:5000,query_timeout:10000,
    options:"-c default_transaction_read_only=on -c statement_timeout=9000"
  });
  let rows:any[]=[];
  const db=await pool.connect();
  try{
    await db.query("BEGIN TRANSACTION READ ONLY");
    const q=await db.query(
      "SELECT source_record_id,object_name,content_sha256,content_bytes,"+
      "retention_hours,expires_at_utc,deletion_verified_at_utc,"+
      "storage_kind,contract_version,content_class "+
      "FROM clean.provider_content_blob_ref "+
      "WHERE source_kind='webhook' AND source_record_id LIKE $1 "+
      "ORDER BY source_record_id LIMIT 1001",
      ["prepaid:"+sessionId+":%"]
    );
    rows=q.rows;
    await db.query("ROLLBACK");
  }catch{
    await db.query("ROLLBACK").catch(()=>{});
    throw Error("GATE05_READONLY_SQL_HOLD");
  }finally{
    db.release();
    await pool.end();
  }
  if(!rows.length||rows.length>1000)throw Error("GATE05_ORIGINAL_REF_COUNT_HOLD");

  const store=createRequiredProviderBlobStoreV39();
  const all:unknown[]=[];
  const names=new Set<string>(),deliveries=new Set<string>();
  const evidence:string[]=[];
  let envelopeBytes=0,subscriptionId:string|null=null;
  for(const r of rows){
    if(r.deletion_verified_at_utc!==null||
       !Number.isFinite(Date.parse(r.expires_at_utc))||
       Date.parse(r.expires_at_utc)<=Date.now()||
       !Number.isSafeInteger(Number(r.retention_hours))||
       Number(r.retention_hours)<=0||
       r.storage_kind!=="replit_app_storage"||
       r.content_class!=="raw_provider_content"||
       r.contract_version!=="provider-blob-contract-v39@1.0.0"||
       !/^[a-f0-9]{64}$/.test(r.content_sha256)||
       !/^v39\/provider\/raw_provider_content\/[a-f0-9]{2}\/[a-f0-9-]{36}\.blob$/.test(r.object_name)||
       names.has(r.object_name))
      throw Error("GATE05_ORIGINAL_REF_INTEGRITY_HOLD");
    names.add(r.object_name);
    const bytes=Buffer.from(await store.downloadBytes(r.object_name));
    if(!bytes.length||bytes.length>2097152||
       bytes.length!==Number(r.content_bytes)||
       sha(bytes)!==r.content_sha256)
      throw Error("GATE05_ORIGINAL_BYTES_SHA_HOLD");
    assertPrepaidOriginalJsonStructureV39(bytes);
    const body=JSON.parse(bytes.toString("utf8"));
    const prepared=preparePrepaidProbeSourceV39(sessionId,body);
    if(!bytes.equals(prepared.rawBytes)||
       prepared.bodySha256!==r.content_sha256||
       r.source_record_id!=="prepaid:"+sessionId+":"+prepared.deliveryId||
       prepared.evidence.costCredits!==prepared.flights.length||
       deliveries.has(prepared.deliveryId))
      throw Error("GATE05_ORIGINAL_DELIVERY_HOLD");
    deliveries.add(prepared.deliveryId);
    if(String(body?.subscription?.subject?.id??"").toUpperCase()!==icao)
      throw Error("GATE05_ORIGINAL_SUBJECT_SCOPE_HOLD");
    const id=body?.subscription?.id;
    if(typeof id!=="string"||!id.length||(subscriptionId!==null&&subscriptionId!==id))
      throw Error("GATE05_ORIGINAL_SUBSCRIPTION_IDENTITY_HOLD");
    subscriptionId=id;
    envelopeBytes+=bytes.length;
    all.push(...prepared.flights);
    evidence.push(r.content_sha256+":"+bytes.length+":"+prepared.flights.length);
  }
  const summary=inventoryGate05OfflineItems({airportIcao:icao,items:all});
  const out={
    ...summary,
    schema:"v39.gate05.original-source-audit.v1",
    status:"READONLY_VERIFIED_SOURCE_FIELDS_NOT_GATE05_PASS",
    verifiedOriginalEnvelopes:rows.length,
    verifiedOriginalBytes:envelopeBytes,
    evidenceSha256:sha(evidence.join("\n")),
    providerCalls:0,databaseWrites:0,blobWrites:0,
    pilotStarted:false
  };
  console.log(JSON.stringify(out,null,2));
  return out;
}
if(import.meta.url==="file://"+process.argv[1]){
  runGate05OfflineSourceAuditV39().catch(()=>{
    console.error("GATE05_OFFLINE_SOURCE_AUDIT_HOLD (details redacted)");
    process.exitCode=1;
  });
}
