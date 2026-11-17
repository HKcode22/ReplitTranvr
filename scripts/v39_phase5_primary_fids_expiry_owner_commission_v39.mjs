/** Exact owner-local commission of the already-tested inert V0103.
 * Default review only. Separate approval creates ONE function-only login,
 * reuses the existing five-column reader, and installs no scheduler enable
 * or paid permissions. No original/provider values are read or deleted.
 */
import pg from "pg";
import {createHash,randomBytes} from "node:crypto";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {execFileSync,spawnSync} from "node:child_process";
import {homedir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {P5_PRIMARY_WRITER as W,P5_PRIMARY_READER as R,P5_PRIMARY_SQL,
 verifyP5PrimaryExpiryActor} from "./v39_phase5_primary_fids_expiry_github_v39.mjs";
import {RETENTION_READER_REQUIRED_COLUMNS as COLS} from "./v39_phase5_retention_metadata_private_readonly_sentinel_v39.mjs";
const REPO="HKcode22/ReplitTranvr";
const F="clean.phase5_primary_fids_expiry_";
const FN=[F+"status_v39()",F+"receipt_v39(text)",F+"sweep_v39(integer)",F+"stop_v39(text)"];
const NAMES=FN.map(f=>f.slice(6).split("(")[0]);
const APPROVAL="COMMISSION_V0103_FUNCTION_ONLY_WRITER_VERIFY_ONLY_NO_DELETE_NO_GO";
const SECRET="P5_PRIMARY_FIDS_SWEEP_DATABASE_URL";
const VARS=["P5_PRIMARY_FIDS_EXPIRY_ENABLED","P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA","P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256","P5_PRIMARY_FIDS_EXPIRY_APPROVAL"];
const hold=x=>{throw Error("HOLD_P5_PRIMARY_EXPIRY_OWNER_"+x);};
const sha=x=>createHash("sha256").update(x).digest("hex");
const fixture=()=>process.env.GITHUB_ACTIONS==="true"&&process.env.V39_P5_PRIMARY_FIDS_DISPOSABLE_PG16==="1"&&process.env.DATABASE_URL==="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
function ownerName(test){if(test&&!fixture())hold("DISPOSABLE_ONLY");return test?"postgres":"neondb_owner";}
function dbUrl(raw){
 try{
  const u=new URL(raw);
  if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||
    !u.password||u.pathname!=="/neondb"||!u.hostname.endsWith(".neon.tech")||
    !["require","verify-full"].includes(u.searchParams.get("sslmode"))||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))
   hold("EXISTING_OWNER_TLS_URL_REQUIRED");
  u.searchParams.set("sslmode","verify-full");
  return u;
 }catch{hold("EXISTING_OWNER_TLS_URL_REQUIRED");}
}
async function catalog(c,{test=false,readonly=true}={}){
 const expect=ownerName(test);
 const who=(await c.query(`SELECT current_database() db,current_user actor,session_user login,
   current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,
   pg_is_in_recovery() replica,r.rolcreaterole
   FROM pg_roles r WHERE r.rolname=current_user`)).rows[0];
 if(!who||who.db!=="neondb"||who.actor!==expect||who.login!==expect||who.version<160000||who.version>=170000||
    who.ro!==(readonly?"on":"off")||who.replica!==false||who.rolcreaterole!==true)
  hold("NOT_EXISTING_PG16_OWNER");
 const roles=(await c.query(`SELECT r.rolname,r.rolcanlogin,r.rolsuper,r.rolcreatedb,r.rolcreaterole,
   r.rolreplication,r.rolbypassrls,r.rolinherit,
   EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) member,
   has_schema_privilege(r.rolname,'clean','USAGE') usage,
   has_schema_privilege(r.rolname,'clean','CREATE') cancreate,
   has_database_privilege(r.rolname,'neondb','CREATE') dbcreate
   FROM pg_roles r WHERE r.rolname=ANY($1::text[])`,[[W,R]])).rows;
 const reader=roles.find(x=>x.rolname===R),writer=roles.find(x=>x.rolname===W);
 function check(a){return a&&a.rolcanlogin===true&&a.usage===true&&
   [a.rolsuper,a.rolcreatedb,a.rolcreaterole,a.rolreplication,a.rolbypassrls,a.rolinherit,a.member,a.cancreate,a.dbcreate].every(v=>v===false);}
 if(!check(reader)||writer&&!check(writer))hold("EXISTING_READER_OR_WRITER_ROLE_DRIFT");
 const existing=(await c.query(`SELECT p.proname name,pg_get_userbyid(p.proowner) owner
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='clean' AND p.proname=ANY($1::text[])`,[NAMES])).rows;
 if(existing.some(x=>x.owner!==expect)||![0,4].includes(existing.length)||!!writer!==(existing.length===4))
   hold("PARTIAL_FUNCTION_OR_ROLE_STATE_DO_NOT_REPLAY");
 const cols=(await c.query(`SELECT a.attname name,
  has_column_privilege($1,a.attrelid,a.attnum,'SELECT') sel,
  has_column_privilege($1,a.attrelid,a.attnum,'INSERT,UPDATE,REFERENCES') other
  FROM pg_attribute a WHERE a.attrelid='clean.provider_content_blob_ref'::regclass AND a.attnum>0 AND NOT a.attisdropped`,[R])).rows;
 if(cols.filter(x=>x.sel).length!==5||cols.some(x=>x.sel!==COLS.includes(x.name)||x.other!==false))
  hold("EXISTING_FIVE_COLUMN_READER_DRIFT");
 const broad=(await c.query(`SELECT count(*)::int n
   FROM pg_class t JOIN pg_namespace s ON s.oid=t.relnamespace
   WHERE s.nspname IN ('clean','phase6_private','public') AND t.relkind IN ('r','p','v','m','f')
    AND (has_table_privilege($1,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR (t.oid<>'clean.provider_content_blob_ref'::regclass AND has_any_column_privilege($1,t.oid,'SELECT,INSERT,UPDATE,REFERENCES')))`,[R])).rows[0];
 if(broad?.n!==0)hold("EXISTING_READER_EXCESS_TABLE_GRANT");
 const stopped=(await c.query(`SELECT
   (SELECT count(*) FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL)::int enabled,
   (SELECT count(*) FROM clean.adb_collection_batches WHERE status='ACTIVE')::int batches,
   (SELECT count(*) FROM clean.adb_collection_segments WHERE status='ACTIVE')::int segments,
   (SELECT count(*) FROM clean.adb_collection_subs WHERE ended_at IS NULL)::int subscriptions,
   (SELECT count(*) FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved)::int deletion_stops`)).rows[0];
 if(Object.values(stopped??{}).length!==5||Object.values(stopped).some(x=>x!==0))
   hold("PRODUCTION_STOP_OR_DELETION_INCIDENT_REVIEW_REQUIRED");
 if(existing.length===4){
  for(let i=0;i<FN.length;i++){
   const a=(await c.query("SELECT has_function_privilege($1,$3,'EXECUTE') w,has_function_privilege($2,$3,'EXECUTE') r",[W,R,FN[i]])).rows[0];
   if(a?.w!==(i>=2)||a.r!==(i<2))hold("PARTIAL_FUNCTION_GRANTS_DO_NOT_REPLAY");
  }
 }
 return {existingFunctions:existing.length,writerExists:!!writer,existingReaderVerified:true,stopped:true};
}
export async function inspectP5PrimaryExpiryOwner(c,options={}){
 await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{await c.query("SET LOCAL statement_timeout='12000ms'");return await catalog(c,{...options,readonly:true});}
 finally{await c.query("ROLLBACK");}
}
function migrationBody(sql){
 if(typeof sql!=="string"||!sql.includes("CREATE FUNCTION "+F+"status_v39()")||
    !sql.trimEnd().endsWith("COMMIT;")||sql.split("\nBEGIN;\n").length!==2||
    (sql.match(/\nCOMMIT;\s*$/g)||[]).length!==1)
  hold("EXACT_STAGED_SQL_WRAPPER");
 return sql.replace("\nBEGIN;\n","\n").replace(/\nCOMMIT;\s*$/,"\n");
}
/** The real function DDL and all grants commit together. Test uses the
 * same transaction on an isolated PG16 DB; no alternate production scope. */
export async function commissionP5PrimaryExpiryDb(c,sql,password,options={}){
 if(typeof password!=="string"||!/^[A-Za-z0-9_-]{32,100}$/.test(password))hold("INVALID_RANDOM_CREDENTIAL");
 const body=migrationBody(sql);let active=false,commitAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");active=true;
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  await c.query("SELECT pg_advisory_xact_lock(390015,105)");
  const before=await catalog(c,{...options,readonly:false});
  if(before.existingFunctions||before.writerExists)hold("ALREADY_COMMISSIONED_DO_NOT_REPLAY");
  await c.query(body);
  const literal=(await c.query("SELECT quote_literal($1) s",[password])).rows[0]?.s;
  if(typeof literal!=="string"||!/^'[A-Za-z0-9_-]{32,100}'$/.test(literal))hold("PASSWORD_QUOTE_INVALID");
  await c.query("CREATE ROLE "+W+" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD "+literal);
  await c.query("GRANT CONNECT ON DATABASE neondb TO "+W);
  await c.query("GRANT USAGE ON SCHEMA clean TO "+W);
  await c.query("GRANT EXECUTE ON FUNCTION "+FN.slice(2).join(",")+" TO "+W);
  await c.query("GRANT EXECUTE ON FUNCTION "+FN.slice(0,2).join(",")+" TO "+R);
  const after=await catalog(c,{...options,readonly:false});
  if(after.existingFunctions!==4||!after.writerExists)hold("IN_TX_FUNCTION_GRANT_READBACK");
  commitAttempted=true;await c.query("COMMIT");active=false;
  return {functionsInstalled:4,newWriterLogin:1,existingReaderReused:true,newTables:0,primaryContentWrites:0,providerCalls:0};
 }catch(e){
  if(active&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)hold("COMMIT_UNKNOWN_DO_NOT_REPLAY_KEEP_RECOVERY_FILE");
  throw e;
 }
}
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:"utf8",timeout:15000,stdio:["ignore","pipe","ignore"],maxBuffer:2*1024*1024}).trim();
function gh(args,input){
 const p=spawnSync("gh",args,{encoding:"utf8",input,stdio:["pipe","pipe","pipe"],timeout:30000,maxBuffer:2*1024*1024});
 if(p.error||p.status!==0)hold("GH_CONFIG_FAILED_RECONCILE_NO_REPLAY");
 return p.stdout.trim();
}
function repoState(){
 const pin=process.env.P5_PRIMARY_FIDS_OWNER_APPROVED_MAIN_SHA??"";
 if(!/^[a-f0-9]{40}$/.test(pin)||run("git",["rev-parse","HEAD"])!==pin||
    run("git",["status","--porcelain","--untracked-files=no"])||
    gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])!==pin||
    run("git",["hash-object",P5_PRIMARY_SQL])!==run("git",["rev-parse",pin+":"+P5_PRIMARY_SQL]))
  hold("EXACT_CLEAN_MAIN_REQUIRED");
 return pin;
}
function configBefore(){
 const secrets=JSON.parse(gh(["secret","list","-R",REPO,"--json","name"]));
 const vars=JSON.parse(gh(["variable","list","-R",REPO,"--json","name,value"]));
 const by=new Map(vars.map(x=>[x.name,x.value]));
 if(!secrets.some(x=>x.name==="P5_RETENTION_READER_DATABASE_URL")||secrets.some(x=>x.name===SECRET)||
    by.get("P5_RETENTION_EXPECTED_READER_ROLE")!==R||
    (by.has(VARS[0])&&by.get(VARS[0])!=="false")||VARS.slice(1).some(k=>by.has(k)))
  hold("EXISTING_READER_OR_PRIMARY_CONFIGURATION_DRIFT");
}
async function main(){
 const mode=process.argv[2]??"review",env=process.env;
 if(process.argv.length>3||!["review","commission"].includes(mode)||env.GITHUB_ACTIONS==="true"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||env.RAPIDAPI_KEY||
    !env.DATABASE_URL)hold("OWNER_LOCAL_NONPAID_ONLY");
 const pin=repoState(),u=dbUrl(env.DATABASE_URL),sql=readFileSync(P5_PRIMARY_SQL,"utf8");
 configBefore();
 const c=new pg.Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:30000});
 let recoveryDir="",committed=false;
 try{
  await c.connect();
  const before=await inspectP5PrimaryExpiryOwner(c);
  if(before.existingFunctions||before.writerExists)hold("ALREADY_COMMISSIONED_DO_NOT_REPLAY");
  const endpointSha256=sha(u.host.toLowerCase()+u.pathname);
  const reviewed={reviewedMainSha:pin,sqlSha256:sha(sql),endpointSha256,...before};
  const reviewSha256=sha(JSON.stringify(reviewed));
  if(mode==="review"){
   console.log(JSON.stringify({status:"PRIMARY_FIDS_OWNER_COMMISSION_REVIEW_ONLY_NO_GO",...reviewed,reviewSha256,
    newWriterLoginsPlanned:1,existingReaderReused:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
   return;
  }
  if(env.P5_PRIMARY_FIDS_OWNER_APPROVAL!==APPROVAL||env.P5_PRIMARY_FIDS_OWNER_REVIEW_SHA256!==reviewSha256)
   hold("EXPLICIT_EXACT_REVIEW_APPROVAL_REQUIRED");
  if(repoState()!==pin)hold("MAIN_DRIFT");
  configBefore();
  const password=randomBytes(36).toString("base64url"),w=new URL(u.toString());
  w.username=W;w.password=password;
  recoveryDir=mkdtempSync(join(homedir(),".travnr-primary-fids-expiry-"));
  writeFileSync(join(recoveryDir,"writer-recovery.json"),JSON.stringify({writerUrl:w.toString(),reviewedMainSha:pin,endpointSha256}),{mode:0o600,flag:"wx"});
  const installed=await commissionP5PrimaryExpiryDb(c,sql,password);
  committed=true;
  const fresh=await inspectP5PrimaryExpiryOwner(c);
  if(fresh.existingFunctions!==4||!fresh.writerExists)hold("COMMITTED_OWNER_READBACK_MISMATCH");
  const wc=new pg.Client({connectionString:w.toString(),connectionTimeoutMillis:8000,query_timeout:30000});
  try{await wc.connect();await verifyP5PrimaryExpiryActor(wc,"writer");}finally{await wc.end().catch(()=>{});}
  if(repoState()!==pin)hold("MAIN_CHANGED_AFTER_COMMIT_NO_REPLAY");
  configBefore();
  gh(["secret","set",SECRET,"-R",REPO],w.toString());
  for(const [k,v] of [[VARS[0],"false"],[VARS[1],pin],[VARS[2],endpointSha256]])
   gh(["variable","set",k,"-R",REPO,"--body",v]);
  const secrets=JSON.parse(gh(["secret","list","-R",REPO,"--json","name"]));
  const vars=new Map(JSON.parse(gh(["variable","list","-R",REPO,"--json","name,value"])).map(x=>[x.name,x.value]));
  if(!secrets.some(x=>x.name===SECRET)||vars.get(VARS[0])!=="false"||vars.get(VARS[1])!==pin||
     vars.get(VARS[2])!==endpointSha256||vars.has(VARS[3]))hold("GH_CONFIG_READBACK_MISMATCH");
  if(repoState()!==pin)hold("MAIN_CHANGED_AFTER_COMMISSION_NO_REPLAY");
  gh(["workflow","run","phase5-primary-fids-expiry-no-provider.yml","-R",REPO,"--ref","main",
   "-f","confirm=VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES","-f","approved_main_sha="+pin]);
  rmSync(recoveryDir,{recursive:true,force:true});recoveryDir="";
  console.log(JSON.stringify({status:"PRIMARY_FIDS_FUNCTIONS_AND_WRITER_COMMISSIONED_VERIFY_DISPATCHED_NO_GO",
   ...installed,reviewedMainSha:pin,reviewSha256,writerAuthenticated:true,readerSecretReused:true,
   githubSecretCreated:SECRET,scheduledApplyEnabled:false,verifyOnlyDispatched:true,phase6PaidGo:false}));
 }catch(e){
  if(recoveryDir)console.error(JSON.stringify({status:"PRIMARY_FIDS_OWNER_PARTIAL_RECONCILE_DO_NOT_REPLAY",databaseCommitAcknowledged:committed,recoveryFile:join(recoveryDir,"writer-recovery.json"),providerCalls:0,phase6PaidGo:false}));
  throw e;
 }finally{await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main().catch(e=>{
  const m=String(e?.message??"");
  console.error(/^HOLD_P5_PRIMARY_EXPIRY_OWNER_[A-Z0-9_]+$/.test(m)?m:"HOLD_P5_PRIMARY_EXPIRY_OWNER_REDACTED_RECONCILE_NO_REPLAY");
  process.exitCode=2;
 });
