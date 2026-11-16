/** Actual Replit owner-local READ-ONLY inventory before expiry deployment.
 * No role creation, secret change, provider call, data export, deletion,
 * migration or scheduler activation. Only sanitized metadata.
 */
import {Pool,type PoolClient} from "pg";
import {createHash,randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {p5RecurringExpiryGrants,boundP5RecurringExpiryStorage} from "./v39_phase5_recurring_blob_expiry_runtime_v39";
import {createRequiredProviderBlobStoreV39,normalizeProviderBlobBucketIdV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {providerBlobObjectNameV39} from "../server/lib/disruption/providerBlobStore_v39";
function hold(s:string):never{throw Error("HOLD_P5_EXPIRY_OWNER_INVENTORY_"+s);}
export const P5_EXPIRY_ACTORS={writer:"phase5_recurring_expiry_writer_prod",reader:"phase5_recurring_expiry_reader_prod"} as const;
const table="clean.provider_content_blob_ref";
function ownerUrl(raw:string|undefined){
 try{
  const u=new URL(raw??"");
  if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||
     u.pathname!=="/neondb"||!u.hostname.endsWith(".neon.tech")||!u.password||u.hash||
     !["require","verify-ca","verify-full"].includes(u.searchParams.get("sslmode")??"")||
     [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))hold("EXISTING_OWNER_URL");
  return u;
 }catch{hold("EXISTING_OWNER_URL");}
}
export function admitP5ExpiryOwnerInventory(env:NodeJS.ProcessEnv,sha:string,remote:string){
 if(!/^[a-f0-9]{40}$/.test(sha)||sha!==remote||env.P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA!==sha||
    env.GITHUB_ACTIONS==="true"||env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.RAPIDAPI_KEY||env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("EXACT_STOP_OWNER_SCOPE");
 const owner=ownerUrl(env.DATABASE_URL);
 const direct=env.P5_RECURRING_EXPIRY_DIRECT_OWNER_URL?ownerUrl(env.P5_RECURRING_EXPIRY_DIRECT_OWNER_URL):owner;
 // An explicitly supplied direct URL must be the existing endpoint, not
 // a guessed host or a second Neon account/project. Never derive a credential.
 if(env.P5_RECURRING_EXPIRY_DIRECT_OWNER_URL&&
    (direct.hostname.includes("-pooler")||owner.hostname.replace(/-pooler(?=\.)/,"")!==direct.hostname||direct.port!==owner.port))
  hold("DIRECT_ENDPOINT_DRIFT");
 if(env.V39_PROVIDER_BLOB_MODE!=="required"||!env.V39_PROVIDER_BLOB_BUCKET_ID)hold("EXISTING_DEDICATED_BUCKET");
 const bucket=normalizeProviderBlobBucketIdV39(env.V39_PROVIDER_BLOB_BUCKET_ID);
 return {url:direct.toString(),directEndpointAvailable:!direct.hostname.includes("-pooler"),
  endpointSha256:createHash("sha256").update(direct.host.toLowerCase()+direct.pathname).digest("hex"),
  bucketSha256:createHash("sha256").update(bucket).digest("hex")};
}
export async function inventoryP5ExpiryActors(c:PoolClient,requireProductionOwner=true){
 let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const who=(await c.query("SELECT current_database() db,current_user actor,session_user login,"+
   "current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,"+
   "r.rolcreaterole,r.rolsuper,coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) tls "+
   "FROM pg_roles r WHERE rolname=current_user")).rows[0];
  if(!who||who.db!=="neondb"||who.actor!==who.login||who.ver<160000||who.ver>=170000||who.replica!==false||
    who.ro!=="on"||who.rolcreaterole!==true||
    requireProductionOwner&&(who.actor!=="neondb_owner"||who.rolsuper!==false||who.tls!==true))hold("OWNER_IDENTITY");
  const named=(await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname=ANY($1::text[])",[Object.values(P5_EXPIRY_ACTORS)])).rows[0]?.n;
  // Potential replacement actors, not proof of exact permissions. Names
  // and account details stay in PostgreSQL; only a count is emitted.
  const candidates=(await c.query("SELECT count(*)::int n FROM pg_roles r "+
   "WHERE r.rolcanlogin AND NOT r.rolinherit AND NOT r.rolsuper AND NOT r.rolcreaterole AND NOT r.rolcreatedb "+
   "AND NOT r.rolreplication AND NOT r.rolbypassrls "+
   "AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) "+
   "AND has_schema_privilege(r.rolname,'clean','USAGE') "+
   "AND NOT has_table_privilege(r.rolname,$1,'SELECT,INSERT,UPDATE,DELETE') "+
   "AND has_column_privilege(r.rolname,$1,'object_name','SELECT') "+
   "AND has_column_privilege(r.rolname,$1,'content_sha256','SELECT') "+
   "AND has_column_privilege(r.rolname,$1,'deletion_run_id','SELECT') "+
   "AND has_column_privilege(r.rolname,$1,'expires_at_utc','SELECT') "+
   "AND has_column_privilege(r.rolname,'clean.retention_tombstone','expiry_run_id','SELECT')",[table])).rows[0]?.n;
  const stats=(await c.query("SELECT count(*) FILTER(WHERE deletion_verified_at_utc IS NULL "+
   "AND expires_at_utc<=transaction_timestamp())::int due, "+
   "count(*) FILTER(WHERE deletion_verified_at_utc IS NULL AND expires_at_utc>transaction_timestamp() "+
   "AND expires_at_utc<=transaction_timestamp()+interval '1 hour')::int due_next_hour FROM "+table)).rows[0];
  if(![named,candidates,stats?.due,stats?.due_next_hour].every(x=>Number.isSafeInteger(x)&&x>=0))hold("SCHEMA_METADATA_SHAPE");
  await c.query("ROLLBACK");tx=false;
  return {namedActorsPresent:named,potentialReusableNarrowActors:candidates,due:stats.due,dueNextHour:stats.due_next_hour,
   ownerVerified:true,expectedGrantStatements:p5RecurringExpiryGrants(P5_EXPIRY_ACTORS.writer,"writer").length+
   p5RecurringExpiryGrants(P5_EXPIRY_ACTORS.reader,"reader").length};
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});}
}
async function main(){
 let pool:Pool|undefined,client:PoolClient|undefined;
 const run=(cmd:string,args:string[])=>execFileSync(cmd,args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:12000}).trim();
 try{
  if(process.argv.length!==2)hold("NO_ARGUMENTS");
  const sha=run("git",["rev-parse","HEAD"]);
  if(run("git",["status","--porcelain","--untracked-files=normal"]))hold("CLEAN_CHECKOUT");
  const remote=run("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]);
  const cfg=admitP5ExpiryOwnerInventory(process.env,sha,remote);
  pool=new Pool({connectionString:cfg.url,max:1,connectionTimeoutMillis:8000,query_timeout:15000});
  client=await pool.connect();
  const inventory=await inventoryP5ExpiryActors(client);
  client.release();client=undefined;await pool.end();pool=undefined;
  const stores=boundP5RecurringExpiryStorage({writer:createRequiredProviderBlobStoreV39(),reader:createRequiredProviderBlobStoreV39()});
  const object=providerBlobObjectNameV39("raw_provider_content",randomUUID());
  if(await stores.writer.exists(object)!==false||await stores.reader.exists(object)!==false)hold("STORAGE_PROBE_UNKNOWN");
  console.log(JSON.stringify({...inventory,status:"OWNER_METADATA_STORAGE_INVENTORY_NO_WRITES",
   directEndpointAvailable:cfg.directEndpointAvailable,endpointSha256:cfg.endpointSha256,bucketSha256:cfg.bucketSha256,
   replitStorageExistsProbePassed:true,independentStorageIamVerified:false,backupRetentionVerified:false,
   providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false,schedulerEnabled:false}));
 }catch(e){
  const msg=e instanceof Error?e.message:"";
  console.error(/^HOLD_P5_(EXPIRY_OWNER_INVENTORY|RECURRING_EXPIRY)_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P5_EXPIRY_OWNER_INVENTORY_REDACTED");
  process.exitCode=2;
 }finally{client?.release();await pool?.end().catch(()=>{});}
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)void main();
