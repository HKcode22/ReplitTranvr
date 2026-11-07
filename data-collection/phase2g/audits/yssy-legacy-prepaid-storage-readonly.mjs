/**
 * Phase2G: YSSY legacy prepaid receiver vs generic collector, metadata-only.
 * Does not fetch provider, read payloads or blob objects, print flight IDs,
 * or perform SQL writes. UNLOGGED rows may disappear after crash recovery.
 */
import pg from "pg";
const TABLES=[
 ["PREPAID_SESSIONS","prepaid_probe_session_runtime"],
 ["PREPAID_DELIVERIES","prepaid_probe_delivery_runtime"],
 ["PREPAID_ITEMS","prepaid_probe_item_runtime"],
 ["PROVIDER_BLOB_REFS","provider_content_blob_ref"],
 ["GENERIC_WEBHOOK_ENVELOPES","raw_delivery"],
 ["GENERIC_WEBHOOK_ITEMS","raw_delivery_item"],
 ["GENERIC_WEBHOOK_INGEST","adb_ingest_events"],
 ["GENERIC_SUBSCRIPTIONS","adb_collection_subs"],
 ["GENERIC_PROCESSING","processing_attempt"],
 ["FIDS_POPULATION","flight_population"]
];
const out=(type,value)=>console.log(type+" "+JSON.stringify(value));
const code=e=>typeof e?.code==="string"&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:"UNKNOWN";
if(!process.env.DATABASE_URL){out("HOLD",{reason:"NO_DATABASE_URL"});process.exit(2)}
const db=new pg.Client({connectionString:process.env.DATABASE_URL,
 options:"-c default_transaction_read_only=on",
 application_name:"phase2g_yssy_prepaid_metadata_only",
 connectionTimeoutMillis:10000,query_timeout:10000});
db.on("error",()=>{});
let tx=false;
try{
 await db.connect();
 await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
 await db.query("SET LOCAL statement_timeout='8000ms'");
 const meta=(await db.query("SELECT current_setting('transaction_read_only') ro,clock_timestamp() at")).rows[0];
 if(meta.ro!=="on")throw Error("READONLY_NOT_ENFORCED");
 out("YSSY_LEGACY_STORAGE_AUDIT_V1",{asOfUtc:meta.at.toISOString(),
   readOnly:true,cappedCount:5001,providerCalls:0,databaseWrites:0,
   rawProviderContentRead:false,blobObjectsRead:false});
 for(const [kind,table] of TABLES){
   if(!/^[a-z_]+$/.test(table))throw Error("NOT_ALLOWLISTED");
   await db.query("SAVEPOINT metric");
   try{
    const fq="clean."+table;
    const p=(await db.query(
      "SELECT to_regclass($1) IS NOT NULL AS exists,"+
      " CASE WHEN to_regclass($1) IS NOT NULL THEN has_table_privilege(current_user,$1,'SELECT') ELSE false END canread,"+
      " (SELECT CASE relpersistence WHEN 'u' THEN 'UNLOGGED' WHEN 'p' THEN 'LOGGED' ELSE 'OTHER' END"+
      " FROM pg_class WHERE oid=to_regclass($1)) persistence",[fq])).rows[0];
    if(!p.exists||!p.canread){
      out("TABLE",{kind,status:"UNKNOWN_NO_TABLE_OR_GRANT",persistence:p.persistence??"UNKNOWN"});
    }else{
      const n=Number((await db.query(
       "SELECT count(*)::int n FROM (SELECT 1 FROM clean."+table+" LIMIT 5001) capped"
      )).rows[0]?.n);
      if(!Number.isSafeInteger(n)||n<0||n>5001)throw Error("INVALID_COUNT");
      out("TABLE",{kind,status:"MEASURED",
       rowCountOrLowerBound:n,countInterpretation:n===5001?"AT_LEAST_5001":"EXACT",
       persistence:p.persistence});
    }
    await db.query("RELEASE SAVEPOINT metric");
   }catch(e){
    await db.query("ROLLBACK TO SAVEPOINT metric").catch(()=>{});
    await db.query("RELEASE SAVEPOINT metric").catch(()=>{});
    out("TABLE",{kind,status:"UNKNOWN_QUERY_ERROR_NOT_ZERO",sqlstate:code(e)});
   }
 }
 await db.query("SAVEPOINT refs");
 try{
   const p=(await db.query(
    "SELECT CASE WHEN to_regclass('clean.provider_content_blob_ref') IS NOT NULL"+
    " THEN has_table_privilege(current_user,'clean.provider_content_blob_ref','SELECT') ELSE false END canread"
   )).rows[0];
   if(!p.canread)out("BLOB_METADATA",{status:"UNKNOWN_NO_PERMISSION"});
   else{
    const rows=(await db.query(
     "SELECT source_kind, count(*)::int n,"+
     " count(*) FILTER(WHERE expires_at_utc<=clock_timestamp())::int expired,"+
     " count(*) FILTER(WHERE deletion_verified_at_utc IS NOT NULL)::int verified_deleted"+
     " FROM (SELECT source_kind,expires_at_utc,deletion_verified_at_utc"+
     " FROM clean.provider_content_blob_ref LIMIT 5001) capped GROUP BY source_kind"
    )).rows;
    out("BLOB_METADATA",{status:"MEASURED_CAP_5001",
     byKind:rows.map(r=>({source:r.source_kind,references:r.n,
        expiredReferenceRows:r.expired,verifiedDeletedRows:r.verified_deleted})),
     referenceNotProofOfObjectStillExisting:true,expiredContentsNotAccessed:true});
   }
   await db.query("RELEASE SAVEPOINT refs");
 }catch(e){
   await db.query("ROLLBACK TO SAVEPOINT refs").catch(()=>{});
   await db.query("RELEASE SAVEPOINT refs").catch(()=>{});
   out("BLOB_METADATA",{status:"UNKNOWN_QUERY_ERROR_NOT_ZERO",sqlstate:code(e)});
 }
 await db.query("ROLLBACK");tx=false;
 out("INTERPRETATION",{unloggedMayResetOnCrash:true,
  differentPipelines:true,noCurrentRowsCannotDisprovePastReceipts:true,
  currentBlobRefNotProofOfRetentionLicense:true,
  noRawBodiesRead:true,providerCalls:0,databaseWrites:0,gate5SciencePassed:false});
}catch(e){out("HOLD",{reason:"READONLY_TRANSACTION_OR_DB_ERROR",sqlstate:code(e)});process.exitCode=2;}
finally{if(tx)await db.query("ROLLBACK").catch(()=>{});await db.end().catch(()=>{});}
