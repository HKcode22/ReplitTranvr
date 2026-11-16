/** One-use Replit owner commissioning. No retention DELETE, source call,
 * migration, scheduler activation or replacement database. Credentials stay
 * in one new private file outside the workspace; never in GitHub/logs.
 */
import {Pool,type PoolClient} from "pg";
import {randomBytes} from "node:crypto";
import {TLSSocket,checkServerIdentity} from "node:tls";
import {execFileSync} from "node:child_process";
import {homedir} from "node:os";
import {resolve,relative,isAbsolute,join} from "node:path";
import {realpathSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {admitP5ExpiryOwnerInventory,P5_EXPIRY_ACTORS} from "./v39_phase5_recurring_expiry_owner_inventory_v39";
import {p5RecurringExpiryGrants,admitP5RecurringExpiryRuntime,executeP5RecurringExpiryRuntime} from "./v39_phase5_recurring_blob_expiry_runtime_v39";
import {createRequiredProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
const HOLD=(s:string):never=>{throw Error("HOLD_P5_EXPIRY_COMMISSION_"+s);};
const REPO="HKcode22/ReplitTranvr",BUCKET="replit-objstore-5aa4d2c4-399b-4933-9acf-0292f79d6d59";
const ENDPOINT="54ed2445cebc2748a777ac9fc7be12207c3b58a1a723f80081532cec7d6b5664";
const CONFIRM="COMMISSION_EXACT_TWO_EXPIRY_LOGINS_VERIFY_ONLY_NO_DELETE_NO_GO";
type Passwords={writer:string;reader:string};
export function admitP5ExpiryCommission(env:NodeJS.ProcessEnv,sha:string,remote:string){
 const cfg=admitP5ExpiryOwnerInventory(env,sha,remote);
 if(env.P5_RECURRING_EXPIRY_OWNER_APPROVAL!==CONFIRM||!cfg.directEndpointAvailable||
    cfg.endpointSha256!==ENDPOINT||env.P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256!==ENDPOINT||
    env.V39_PROVIDER_BLOB_BUCKET_ID!==BUCKET||env.P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID!==BUCKET)
  HOLD("ACTUAL_REVIEWED_ENDPOINT_BUCKET_APPROVAL_REQUIRED");
 const url=new URL(cfg.url);url.searchParams.set("sslmode","verify-full");
 return {...cfg,url:url.toString(),hostname:url.hostname};
}
function actualOwnerTls(c:PoolClient,hostname:string){
 const s=(c as unknown as {connection?:{stream?:unknown}}).connection?.stream;
 if(!(s instanceof TLSSocket)||s.authorized!==true||s.encrypted!==true||
    !["TLSv1.2","TLSv1.3"].includes(s.getProtocol()??"")||
    checkServerIdentity(hostname,s.getPeerCertificate())!==undefined)HOLD("OWNER_CLIENT_TLS");
}
/** New roles only, in one transaction; callback persists private credentials
 * before either CREATE ROLE. No rollback/drop automation on unknown COMMIT.
 * The optional postgres identity is only for the exact disposable CI.
 */
export async function commissionP5ExpiryActorPair(c:PoolClient,passwords:Passwords,persist:()=>void,expectedOwner="neondb_owner"){
 if(expectedOwner!=="neondb_owner"&&!(expectedOwner==="postgres"&&process.env.GITHUB_ACTIONS==="true"&&
   process.env.V39_P5_DAILY_QA_REAL_PG16==="1"&&process.env.DATABASE_URL==="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable"))
  HOLD("OWNER_SCOPE");
 if(passwords.writer===passwords.reader||!Object.values(passwords).every(x=>/^[A-Za-z0-9_-]{48,100}$/.test(x)))HOLD("CREDENTIAL_SHAPE");
 let active=false,commitAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");active=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  await c.query("SELECT pg_advisory_xact_lock(390015,789)");
  const who=(await c.query(`SELECT current_database()='neondb' AND current_user=$1 AND current_user=session_user
   AND NOT pg_is_in_recovery() AND current_setting('server_version_num')::int BETWEEN 160000 AND 169999
   AND current_setting('transaction_read_only')='off' AND r.rolcreaterole
   AND ($1='postgres' OR NOT r.rolsuper) AS verified FROM pg_roles r WHERE rolname=current_user`,[expectedOwner])).rows[0];
  if(who?.verified!==true)HOLD("OWNER_IDENTITY");
  const named=(await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname=ANY($1::text[])",[Object.values(P5_EXPIRY_ACTORS)])).rows[0]?.n;
  const candidates=(await c.query(`SELECT count(*)::int n FROM pg_roles r
   WHERE r.rolcanlogin AND NOT r.rolinherit AND NOT r.rolsuper AND NOT r.rolcreatedb AND NOT r.rolcreaterole
   AND NOT r.rolreplication AND NOT r.rolbypassrls AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid)
   AND has_schema_privilege(r.rolname,'clean','USAGE')
   AND NOT has_table_privilege(r.rolname,'clean.provider_content_blob_ref','SELECT,INSERT,UPDATE,DELETE')
   AND (SELECT bool_and(has_column_privilege(r.rolname,'clean.provider_content_blob_ref',col,'SELECT'))
    FROM unnest(ARRAY['object_name','content_sha256','expires_at_utc','deletion_run_id']) col)
   AND has_column_privilege(r.rolname,'clean.retention_tombstone','expiry_run_id','SELECT')`)).rows[0]?.n;
  if(named!==0||candidates!==0)HOLD("EXISTING_ACTOR_RECONCILE_NO_CREATE");
  persist();
  for(const actor of ["writer","reader"] as const){
   const role=P5_EXPIRY_ACTORS[actor];
   const password=(await c.query("SELECT quote_literal($1) AS lit",[passwords[actor]])).rows[0]?.lit;
   if(!/^'[A-Za-z0-9_-]{48,100}'$/.test(password??""))HOLD("QUOTED_PASSWORD");
   await c.query("CREATE ROLE "+role+" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD "+password);
   for(const sql of p5RecurringExpiryGrants(role,actor))await c.query(sql);
  }
  commitAttempted=true;await c.query("COMMIT");active=false;
 }catch(e){
  if(commitAttempted)HOLD("COMMIT_OUTCOME_UNKNOWN_KEEP_PRIVATE_FILE_NO_RETRY");
  throw e;
 }finally{if(active&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});}
}
function outside(parent:string,path:string){
 const rel=relative(parent,path);
 return rel===".."||rel.startsWith(".."+"/")||isAbsolute(rel);
}
function privateFile(env:Record<string,string>,repoRoot:string,commonDir:string){
 const dir=join(realpathSync(homedir()),".travnr-phase5-expiry");
 if(!outside(realpathSync(repoRoot),dir)||!outside(realpathSync(resolve(commonDir,"..")),dir))
  HOLD("PRIVATE_FILE_OUTSIDE_WORKSPACE_REQUIRED");
 // No overwrite or symlink reuse. fsync before SQL to preserve recovery
 // even when the owner session loses its COMMIT acknowledgment.
 mkdirSync(dir,{mode:0o700});
 const fd=openSync(join(dir,"runtime-private.json"),"wx",0o600);
 try{writeFileSync(fd,JSON.stringify(env));fsyncSync(fd);}finally{closeSync(fd);}
 const d=openSync(dir,"r");try{fsyncSync(d);}finally{closeSync(d);}
 const parent=openSync(realpathSync(homedir()),"r");try{fsyncSync(parent);}finally{closeSync(parent);}
}
async function main(){
 let owner:Pool|undefined,c:PoolClient|undefined,writer:Pool|undefined,reader:Pool|undefined;
 let roleCommit=false;
 const git=(cmd:string,args:string[])=>execFileSync(cmd,args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:12000}).trim();
 try{
  if(process.argv.length!==2)HOLD("NO_ARGUMENTS");
  const sha=git("git",["rev-parse","HEAD"]),root=git("git",["rev-parse","--show-toplevel"]);
  const common=git("git",["rev-parse","--path-format=absolute","--git-common-dir"]);
  if(git("git",["status","--porcelain","--untracked-files=normal"]))HOLD("CLEAN_CHECKOUT");
  const remote=git("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
  const cfg=admitP5ExpiryCommission(process.env,sha,remote);
  // Verify-only runtime config deliberately excludes owner/provider/general DB credentials.
  const passwords={writer:randomBytes(48).toString("base64url"),reader:randomBytes(48).toString("base64url")};
  const scoped=(actor:"writer"|"reader")=>{const u=new URL(cfg.url);u.username=P5_EXPIRY_ACTORS[actor];u.password=passwords[actor];return u.toString();};
  const env={P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha,ADB_AUTO_COLLECT:"0",P5_RECURRING_EXPIRY_MODE:"VERIFY_ONLY",
   V39_PROVIDER_BLOB_MODE:"required",V39_PROVIDER_BLOB_BUCKET_ID:BUCKET,P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID:BUCKET,
   P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:ENDPOINT,P5_RECURRING_EXPIRY_WRITER_ROLE:P5_EXPIRY_ACTORS.writer,
   P5_RECURRING_EXPIRY_READER_ROLE:P5_EXPIRY_ACTORS.reader,P5_RECURRING_EXPIRY_WRITER_URL:scoped("writer"),P5_RECURRING_EXPIRY_READER_URL:scoped("reader")};
  const runtime=admitP5RecurringExpiryRuntime(env,sha);
  owner=new Pool({connectionString:cfg.url,max:1,connectionTimeoutMillis:8000,query_timeout:15000});
  c=await owner.connect();actualOwnerTls(c,cfg.hostname);
  await commissionP5ExpiryActorPair(c,passwords,()=>privateFile(env,root,common));roleCommit=true;
  c.release();c=undefined;await owner.end();owner=undefined;
  writer=new Pool({connectionString:runtime.writerUrl,max:2,connectionTimeoutMillis:8000,query_timeout:15000});
  reader=new Pool({connectionString:runtime.readerUrl,max:1,connectionTimeoutMillis:8000,query_timeout:15000,options:"-c default_transaction_read_only=on"});
  const result=await executeP5RecurringExpiryRuntime({...runtime,writer,reader,stores:{writer:createRequiredProviderBlobStoreV39(),reader:createRequiredProviderBlobStoreV39()}});
  if(result.status!=="SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES")HOLD("POSTCOMMIT_VERIFY_ONLY");
  console.log(JSON.stringify({...result,status:"TWO_SCOPED_EXPIRY_LOGINS_COMMISSIONED_VERIFY_ONLY",roleCreates:2,privateConfigSavedOutsideRepo:true,
   existingMonitorChanged:false,objectDeletions:0,providerCalls:0,schedulerEnabled:false,phase6PaidGo:false}));
 }catch(e){
  const msg=e instanceof Error?e.message:"";
  console.error(roleCommit?"HOLD_P5_EXPIRY_COMMISSION_ROLES_COMMITTED_KEEP_PRIVATE_FILE_RECONCILE_NO_RETRY":
   /^HOLD_P5_EXPIRY_COMMISSION_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P5_EXPIRY_COMMISSION_REDACTED_KEEP_PRIVATE_FILE_NO_RETRY");
  process.exitCode=2;
 }finally{c?.release();await owner?.end().catch(()=>{});await writer?.end().catch(()=>{});await reader?.end().catch(()=>{});}
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)void main();
