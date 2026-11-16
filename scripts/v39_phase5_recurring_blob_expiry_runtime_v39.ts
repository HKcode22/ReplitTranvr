/** Fixed due-object expiry worker for the existing Replit app runtime.
 * GitHub remains the scheduling authority; this command is not a scheduler.
 * No owner URL fallback, provider request, raw object download or TTL change.
 */
import {Pool,type PoolClient} from "pg";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {createHash,randomUUID} from "node:crypto";
import {runBoundedProviderBlobExpiryBatchV39} from "../server/lib/disruption/providerBlobExpiry_v39";
import {createRequiredProviderBlobStoreV39,normalizeProviderBlobBucketIdV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {providerBlobObjectNameV39,type ProviderBlobStoreV39} from "../server/lib/disruption/providerBlobStore_v39";

function HOLD(x:string):never{throw Error("HOLD_P5_RECURRING_EXPIRY_"+x); }
const TABLE="clean.provider_content_blob_ref",TOMB="clean.retention_tombstone",INCIDENT="clean.adb_incident_stop";
const BLOB_READ=["blob_ref_id","storage_kind","contract_version","object_name","content_class","content_sha256","content_bytes",
 "persisted_at_utc","expires_at_utc","retention_hours","deleted_at_utc","deletion_verified_at_utc","deletion_run_id"];
const MARKER=["deleted_at_utc","deletion_verified_at_utc","deletion_run_id"];
const WITNESS=["surface","record_id","content_hash","expired_at","tombstoned_at_utc","plan_hash","content_class","source_table",
 "retention_rule","expiry_run_id","deletion_mode"];
const INCIDENT_INSERT=["cause","occurred_at_utc","detail","resolved"];
const INCIDENT_READ=["id","cause","resolved"];
const SEQS=["clean.retention_tombstone_id_seq","clean.adb_incident_stop_id_seq"];
const ROLE=/^[a-z][a-z0-9_]{2,62}$/;
const SHA=/^[a-f0-9]{40}$/;
type Actor="writer"|"reader";
type Permission="SELECT"|"INSERT"|"UPDATE"|"REFERENCES";
type Db=Pick<Pool,"query"|"connect">;
type Stores={writer:Pick<ProviderBlobStoreV39,"exists"|"delete">;reader:Pick<ProviderBlobStoreV39,"exists">};
const validRole=(r:unknown):r is string=>typeof r==="string"&&ROLE.test(r)&&!/(owner|admin|superuser)/i.test(r);
function parseConnection(value:string|undefined,role:string){
 try{
  const u=new URL(value??"");
  if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!==role||!u.password||
     u.pathname!=="/neondb"||!u.hostname||u.hostname.includes("-pooler")||u.hash||
     !["require","verify-ca","verify-full"].includes(u.searchParams.get("sslmode")??"")||
     [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))
   HOLD("SCOPED_CONNECTION_REQUIRED");
  return {url:value!,endpoint:u.host.toLowerCase()+u.pathname};
 }catch{HOLD("SCOPED_CONNECTION_REQUIRED");}
}
export function admitP5RecurringExpiryRuntime(env:NodeJS.ProcessEnv,sha:string){
 const mode=env.P5_RECURRING_EXPIRY_MODE??"VERIFY_ONLY";
 if(!["VERIFY_ONLY","APPLY_DUE_ONLY"].includes(mode)||!SHA.test(sha)||
    env.P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA!==sha||
    env.GITHUB_ACTIONS==="true"||env.ADB_AUTO_COLLECT!=="0"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "P5_RETENTION_READER_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL"].some(k=>env[k]))
  HOLD("EXACT_RUNTIME_SCOPE_REQUIRED");
 if(env.V39_PROVIDER_BLOB_MODE!=="required"||!env.V39_PROVIDER_BLOB_BUCKET_ID||
    normalizeProviderBlobBucketIdV39(env.V39_PROVIDER_BLOB_BUCKET_ID)!==env.P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID)
  HOLD("DEDICATED_BUCKET_REQUIRED");
 const writerRole=env.P5_RECURRING_EXPIRY_WRITER_ROLE,readerRole=env.P5_RECURRING_EXPIRY_READER_ROLE;
 if(!validRole(writerRole)||!validRole(readerRole)||writerRole===readerRole||
    writerRole==="phase5_retention_reader_prod20261114"||readerRole==="phase5_retention_reader_prod20261114")
  HOLD("DISTINCT_SCOPED_ACTORS_REQUIRED");
 const writer=parseConnection(env.P5_RECURRING_EXPIRY_WRITER_URL,writerRole);
 const reader=parseConnection(env.P5_RECURRING_EXPIRY_READER_URL,readerRole);
 if(writer.endpoint!==reader.endpoint||createHash("sha256").update(writer.endpoint).digest("hex")!==env.P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256)
  HOLD("SAME_REVIEWED_DIRECT_DATABASE_ENDPOINT_REQUIRED");
 if(mode==="APPLY_DUE_ONLY"&&env.P5_RECURRING_EXPIRY_APPROVAL!=="APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER")
  HOLD("EXPLICIT_RECURRING_EXPIRY_APPROVAL_REQUIRED");
 const limitText=env.P5_RECURRING_EXPIRY_LIMIT??"10",limit=Number(limitText);
 if(!/^[1-9][0-9]?$/.test(limitText)||!Number.isSafeInteger(limit)||limit>25)HOLD("BATCH_LIMIT");
 return {apply:mode==="APPLY_DUE_ONLY",writerRole,readerRole,writerUrl:writer.url,readerUrl:reader.url,limit};
}
function expectedColumn(actor:Actor,table:string,column:string,permission:Permission):boolean {
 if(table===TABLE)return permission==="SELECT"&&BLOB_READ.includes(column)||
   actor==="writer"&&permission==="UPDATE"&&MARKER.includes(column);
 if(table===TOMB)return permission==="SELECT"&&WITNESS.includes(column)||
   actor==="writer"&&permission==="INSERT"&&WITNESS.includes(column);
 if(table===INCIDENT)return permission==="SELECT"&&INCIDENT_READ.includes(column)||
   actor==="writer"&&permission==="INSERT"&&INCIDENT_INSERT.includes(column);
 return false;
}
/** Verify exact existing-schema privileges before any use of the object SDK.
 * TLS may be disabled only inside the separately gated disposable-PG test
 * invocation of this helper. Production CLI never disables it.
 */
export async function verifyP5RecurringExpiryActor(db:Db,role:string,actor:Actor,requireTls=true){
 if(!validRole(role)||!["writer","reader"].includes(actor))HOLD("INVALID_ACTOR");
 const client:PoolClient=await db.connect();
 let active=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");active=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  const identity=(await client.query(`SELECT current_database() AS db,current_user AS actor,session_user AS login_actor,
   current_setting('server_version_num')::int AS version,pg_is_in_recovery() AS replica,
   current_setting('transaction_read_only') AS tx_ro,current_setting('default_transaction_read_only') AS default_ro,
   coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) AS tls,
   r.rolcanlogin,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,r.rolinherit,
   EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS membership,
   has_schema_privilege(current_user,'clean','USAGE') AS schema_usage,
   has_schema_privilege(current_user,'clean','CREATE') AS schema_create,
   has_database_privilege(current_user,current_database(),'CREATE') AS db_create
   FROM pg_roles r WHERE r.rolname=current_user`)).rows[0];
  if(!identity||identity.db!=="neondb"||identity.actor!==role||identity.login_actor!==role||
     identity.version<160000||identity.version>=170000||identity.replica!==false||
     identity.tx_ro!=="on"||identity.default_ro!==(actor==="reader"?"on":"off")||
     requireTls&&identity.tls!==true||identity.rolcanlogin!==true||
     [identity.rolsuper,identity.rolcreatedb,identity.rolcreaterole,identity.rolreplication,identity.rolbypassrls,
      identity.rolinherit,identity.membership,identity.schema_create,identity.db_create].some(x=>x!==false)||
     identity.schema_usage!==true)HOLD("ACTOR_IDENTITY_OR_FLAGS");
  const cols=await client.query(`SELECT n.nspname||'.'||c.relname AS relation,a.attname AS col,
    has_column_privilege(current_user,c.oid,a.attnum,'SELECT') AS sel,
    has_column_privilege(current_user,c.oid,a.attnum,'INSERT') AS ins,
    has_column_privilege(current_user,c.oid,a.attnum,'UPDATE') AS upd,
    has_column_privilege(current_user,c.oid,a.attnum,'REFERENCES') AS ref
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
   WHERE c.oid=ANY($1::regclass[]) AND a.attnum>0 AND NOT a.attisdropped`,[[TABLE,TOMB,INCIDENT]]);
  const seen=new Set<string>();
  for(const row of cols.rows){
   const key=row.relation+"."+row.col;
   if(seen.has(key)||![TABLE,TOMB,INCIDENT].includes(row.relation))HOLD("COLUMN_CATALOG");
   seen.add(key);
   for(const [field,perm] of [["sel","SELECT"],["ins","INSERT"],["upd","UPDATE"],["ref","REFERENCES"]] as const)
    if(row[field]!==expectedColumn(actor,row.relation,row.col,perm))HOLD("COLUMN_ACL_DRIFT");
  }
  for(const [table,needed] of [[TABLE,BLOB_READ],[TOMB,WITNESS],[INCIDENT,[...INCIDENT_READ,...INCIDENT_INSERT]]] as const)
   for(const column of needed)if(!seen.has(table+"."+column))HOLD("COLUMN_CATALOG");
  const broad=(await client.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE c.relkind IN ('r','p','v','m','f') AND n.nspname IN ('clean','phase6_private','public')
   AND (has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR (NOT(c.oid=ANY($1::regclass[])) AND has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))`,
   [[TABLE,TOMB,INCIDENT]])).rows[0];
  if(broad?.n!==0)HOLD("BROAD_OR_UNRELATED_TABLE_ACL");
  const sequences=await client.query(`SELECT n.nspname||'.'||c.relname AS relation,
   has_sequence_privilege(current_user,c.oid,'USAGE') AS usage,
   has_sequence_privilege(current_user,c.oid,'SELECT,UPDATE') AS excess
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE c.relkind='S' AND n.nspname IN ('clean','phase6_private','public')`);
  for(const seq of sequences.rows)
   if(seq.usage!==(actor==="writer"&&SEQS.includes(seq.relation))||seq.excess!==false)HOLD("SEQUENCE_ACL_DRIFT");
  if(SEQS.some(name=>!sequences.rows.some(x=>x.relation===name)))HOLD("SEQUENCE_CATALOG");
  await client.query("ROLLBACK");active=false;
 }finally{if(active)await client.query("ROLLBACK").catch(()=>{});client.release();}
}
export async function executeP5RecurringExpiryRuntime({writer,reader,stores,apply,limit,writerRole,readerRole,verifyActor=verifyP5RecurringExpiryActor}:{
 writer:Db;reader:Db;stores:Stores;apply:boolean;limit:number;writerRole:string;readerRole:string;
 verifyActor?:typeof verifyP5RecurringExpiryActor;
}){
 if(writer===reader||writerRole===readerRole||!Number.isSafeInteger(limit)||limit<1||limit>25)HOLD("EXECUTION_SCOPE");
 await verifyActor(writer,writerRole,"writer");await verifyActor(reader,readerRole,"reader");
 // A randomly generated opaque nonexisting key is only a connectivity probe;
 // no uploaded fixture/raw bytes/listing and no deletion. Two fresh SDK
 // clients may share Replit runtime credentials: never claim distinct IAM.
 const key=providerBlobObjectNameV39("raw_provider_content",randomUUID());
 if(await stores.writer.exists(key)!==false||await stores.reader.exists(key)!==false)
  HOLD("PRIMARY_STORAGE_PROBE_UNEXPECTED");
 const base={providerCalls:0,objectDownloads:0,distinctDbActorsVerified:true,
  separateStorageReadRequests:true,independentStorageIamVerified:false,backupRetentionVerified:false,phase6PaidGo:false};
 if(!apply)return {...base,status:"SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES",databaseWrites:0,objectDeletions:0};
 // Session advisory lock across the batch prevents overlapping invocations.
 // Keep the lock connection distinct from the pool performing row-lock work.
 const lock=await writer.connect();let owned=false;
 try{
  const got=await lock.query("SELECT pg_try_advisory_lock(390015,788) AS owned");
  if(got.rows[0]?.owned!==true)HOLD("RECURRING_BATCH_ALREADY_ACTIVE");
  owned=true;
  try{
   const result=await runBoundedProviderBlobExpiryBatchV39(writer,stores.writer,reader,stores.reader,limit);
   return {...base,...result,status:result.status,declaredExpiryOnly:true,
    databaseWritesPossible:true,objectDeletionsPossible:true};
  }catch{
   // A failure can occur after physical delete or COMMIT. Preserve a
   // durable existing deletion STOP; never hide uncertainty or resolve it.
   try{
    const incident=await lock.query(`INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES('deletion',clock_timestamp(),$1::jsonb,false) RETURNING id::text AS id`,
     [JSON.stringify({kind:"recurring_provider_blob_expiry_uncertain",owner:"phase5_recurring_expiry_runtime"})]);
    const id=incident.rows[0]?.id;
    if(typeof id!=="string"||!/^[1-9][0-9]*$/.test(id))HOLD("INCIDENT_ID");
    const proof=await reader.query("SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE id=$1 AND cause='deletion' AND resolved=false",[id]);
    if(proof.rows[0]?.n!==1)HOLD("INCIDENT_READBACK");
   }catch{HOLD("BATCH_UNCERTAIN_INCIDENT_READBACK_UNAVAILABLE_NO_RETRY");}
   HOLD("BATCH_UNCERTAIN_DELETION_STOP_RECORDED_NO_RETRY");
  }
 }finally{
  // Discard the physical lock connection on every path; session close
  // releases it even if the unlock acknowledgement is uncertain.
  if(owned)await lock.query("SELECT pg_advisory_unlock(390015,788)").catch(()=>{});
  lock.release(new Error("P5_RECURRING_EXPIRY_LOCK_CONNECTION_RELEASE"));
 }
}
async function main(){
 let writer:Pool|undefined,reader:Pool|undefined;
 try{
  const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",timeout:5000,stdio:["ignore","pipe","ignore"]}).trim();
  const status=execFileSync("git",["status","--porcelain","--untracked-files=normal"],{encoding:"utf8",timeout:5000,stdio:["ignore","pipe","ignore"]}).trim();
  if(status)HOLD("REVIEWED_CHECKOUT_NOT_CLEAN");
  const remote=execFileSync("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"],{encoding:"utf8",timeout:10000,stdio:["ignore","pipe","ignore"]}).trim();
  if(sha!==remote)HOLD("MAIN_CHANGED");
  const config=admitP5RecurringExpiryRuntime(process.env,sha);
  // No broad runtime pool and no fallback to DATABASE_URL. Two scoped logins
  // with strict read-only reader, short SQL/connect budgets and bounded batch.
  writer=new Pool({connectionString:config.writerUrl,max:2,connectionTimeoutMillis:7000,query_timeout:15000,
   options:"-c statement_timeout=10000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=60000"});
  reader=new Pool({connectionString:config.readerUrl,max:1,connectionTimeoutMillis:7000,query_timeout:15000,
   options:"-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=5000"});
  const a=createRequiredProviderBlobStoreV39(),b=createRequiredProviderBlobStoreV39();
  const result=await executeP5RecurringExpiryRuntime({...config,writer,reader,stores:{writer:a,reader:b}});
  console.log(JSON.stringify(result));
  if(result.status==="BACKLOG_REMAINS_AT_CUTOFF")process.exitCode=2;
 }catch(e){
  const msg=e instanceof Error?e.message:"";
  console.error(/^HOLD_P5_RECURRING_EXPIRY_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P5_RECURRING_EXPIRY_UNKNOWN_NO_RETRY");
  process.exitCode=2;
 }finally{await writer?.end().catch(()=>{});await reader?.end().catch(()=>{});}
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)void main();
