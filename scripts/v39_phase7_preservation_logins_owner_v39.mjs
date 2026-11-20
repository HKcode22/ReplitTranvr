/** Owner-local commission of the FOUR existing Phase7 preservation actors.
 * No new tables, no new grants beyond CONNECT, no PRE policy, no data read,
 * no provider call, no expiry credential rotation or collection enablement.
 * Unknown commit => keep exact local recovery file; never rotate on replay. */
import pg from "pg";
import {randomBytes,createHash} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";
import {mkdtempSync,writeFileSync,readFileSync,lstatSync,rmSync,realpathSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
export const P7_PRESERVATION_ACTORS=Object.freeze([
 {role:"phase7_pre_reader_prod20261120",secret:"P6_PHASE7_PRE_READBACK_DATABASE_URL",table:"pre_fragment_v39",privilege:"SELECT"},
 {role:"phase7_post_scoped_prod20261120",secret:"P6_PHASE7_POST_SCOPED_DATABASE_URL",fn:"read_bound_pre_group_v39(text,bigint,text,text,integer,text,text)"},
 {role:"phase7_bundle_writer_prod20261120",secret:"P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL",table:"derived_release_bundle_v39",privilege:"INSERT"},
 {role:"phase7_bundle_reader_prod20261120",secret:"P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL",table:"derived_release_bundle_v39",privilege:"SELECT"}
]);
const E=[{role:"phase7_expiry_reader_prod20261120",functions:["pre_link_expiry_status_v39()","research_expiry_status_v39()"]},{role:"phase7_expiry_writer_prod20261120",functions:["sweep_due_pre_links_v39(integer)","sweep_due_research_outputs_v39(integer)"]}];
const TABLES=["derived_release_bundle_v39","pre_fragment_v39","pre_source_link_v39","pre_preservation_policy_v39"];
const FNS=["canonical_pre_jsonb_v39(jsonb)","persist_bound_pre_fragment_v39(text,text,bigint,uuid,uuid,text,text,text,text,bytea,text,timestamptz,timestamptz,integer,timestamptz)","read_bound_pre_group_v39(text,bigint,text,text,integer,text,text)",...E.flatMap(x=>x.functions)];
const REPO="HKcode22/ReplitTranvr",OWNER_STAGE="0a7b1a28f243de76d4c83026d15f585265ef6f7b",MANIFEST="3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7";
const hold=s=>{throw Error("HOLD_P7_PRESERVATION_LOGINS_"+s)};
const sha=s=>createHash("sha256").update(s).digest("hex");
const validPassword=s=>typeof s==="string"&&/^[A-Za-z0-9_-]{48}$/.test(s);
async function privileges(c,a,login){
 const q=(await c.query(`SELECT r.rolcanlogin login,r.rolsuper,r.rolcreaterole,r.rolcreatedb,r.rolreplication,r.rolbypassrls,r.rolinherit,
 EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) member,
 has_schema_privilege(r.oid,'phase7_private','USAGE') usage,has_schema_privilege(r.oid,'phase7_private','CREATE') can_create,
 has_database_privilege(r.oid,current_database(),'CREATE') db_create,
 has_database_privilege(r.oid,current_database(),'CONNECT') can_connect
 FROM pg_roles r WHERE r.rolname=$1`,[a.role])).rows;
 if(q.length!==1||q[0].login!==login||q[0].usage!==true||(login&&q[0].can_connect!==true)||["rolsuper","rolcreaterole","rolcreatedb","rolreplication","rolbypassrls","rolinherit","member","can_create","db_create"].some(k=>q[0][k]!==false))hold("ROLE_BOUNDARY");
 const table=(await c.query(`SELECT t.relname,has_any_column_privilege($1,t.oid,'SELECT') r,
 has_any_column_privilege($1,t.oid,'INSERT') i,has_any_column_privilege($1,t.oid,'UPDATE,REFERENCES') u,
 has_table_privilege($1,t.oid,'DELETE,TRUNCATE,TRIGGER') d FROM pg_class t JOIN pg_namespace s ON s.oid=t.relnamespace
 WHERE s.nspname='phase7_private' AND t.relkind IN ('r','p','v','m','f')`,[a.role])).rows;
 if(table.length!==4||table.some(t=>!TABLES.includes(t.relname)||t.r!==(a.table===t.relname&&a.privilege==="SELECT")||t.i!==(a.table===t.relname&&a.privilege==="INSERT")||t.u!==false||t.d!==false))hold("TABLE_BOUNDARY");
 for(const f of FNS){
  const x=(await c.query("SELECT has_function_privilege($1,$2,'EXECUTE') ok",[a.role,"phase7_private."+f])).rows[0];
  if(x?.ok!==((a.functions??(a.fn?[a.fn]:[])).includes(f)))hold("FUNCTION_BOUNDARY");
 }
 const broad=(await c.query(`SELECT count(*)::int n FROM pg_class t JOIN pg_namespace s ON s.oid=t.relnamespace
 WHERE s.nspname IN ('clean','phase6_private','public') AND t.relkind IN ('r','p','v','m','f')
 AND (has_any_column_privilege($1,t.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege($1,t.oid,'DELETE,TRUNCATE,TRIGGER'))`,[a.role])).rows[0];
 if(broad?.n!==0)hold("EXCESS_APPLICATION_ACCESS");
}
export async function inspectP7PreservationActors(c,{newLogins,expiryLogins=true}){
 const q=(await c.query(`SELECT (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='phase7_private') AS f,
 (SELECT count(*)::int FROM phase7_private.derived_release_bundle_v39) AS b,
 (SELECT count(*)::int FROM phase7_private.pre_fragment_v39) AS p,
 (SELECT count(*)::int FROM phase7_private.pre_source_link_v39) AS l,
 (SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) AS r`)).rows[0];
 if(q?.f!==7||[q.b,q.p,q.l,q.r].some(v=>v!==0))hold("EXACT_EMPTY_INSTALLED_SCHEMA");
 for(const a of P7_PRESERVATION_ACTORS)await privileges(c,a,newLogins);
 for(const a of E)await privileges(c,a,expiryLogins);
 return {existingRoles:6,preservationLogins:newLogins?4:0,expiryLogins:expiryLogins?2:0,empty:true};
}
export async function commissionP7PreservationActors(c,passwords,assertDisabled){
 if(Object.keys(passwords??{}).length!==4||P7_PRESERVATION_ACTORS.some(a=>!validPassword(passwords[a.role]))||new Set(Object.values(passwords)).size!==4)hold("EXACT_DISTINCT_PASSWORDS");
 let commit=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await c.query("SET LOCAL statement_timeout='30000ms'; SET LOCAL lock_timeout='3000ms'");
  await assertDisabled(c);
  await inspectP7PreservationActors(c,{newLogins:false});
  for(const a of P7_PRESERVATION_ACTORS){
   const quoted=(await c.query("SELECT quote_literal($1) literal",[passwords[a.role]])).rows[0]?.literal;
   if(quoted!=="'"+passwords[a.role]+"'")hold("PASSWORD_QUOTE");
   await c.query("ALTER ROLE "+a.role+" LOGIN PASSWORD "+quoted);
   await c.query("GRANT CONNECT ON DATABASE neondb TO "+a.role);
  }
  await inspectP7PreservationActors(c,{newLogins:true});
  await assertDisabled(c);
  commit=true;await c.query("COMMIT");
  return {status:"FOUR_EXISTING_PRESERVATION_LOGINS_COMMITTED_NO_GO",newLogins:4,providerCalls:0,phase6PaidGo:false};
 }catch(e){if(!commit)await c.query("ROLLBACK").catch(()=>{});if(commit)hold("COMMIT_UNKNOWN_RECONCILE_NEVER_ROTATE");throw e;}
}
export async function verifyP7PreservationLogin(c,a){
 await c.query(a.privilege==="INSERT"?"BEGIN":"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{
  const q=(await c.query("SELECT current_user actor,session_user login,current_database() db,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica")).rows;
  if(q.length!==1||q[0].actor!==a.role||q[0].login!==a.role||q[0].db!=="neondb"||q[0].ver<160000||q[0].ver>=170000||q[0].replica!==false||q[0].ro!==(a.privilege==="INSERT"?"off":"on"))hold("INDEPENDENT_LOGIN_READBACK");
  await privileges(c,a,true);
 }finally{await c.query("ROLLBACK");}
}
const gh=(args,input)=>{const r=spawnSync("gh",args,{encoding:"utf8",input,stdio:["pipe","pipe","pipe"],timeout:30000,maxBuffer:2*1024*1024});if(r.error||r.status!==0)hold("GH_METADATA_OR_SECRET_WRITE_RECONCILE");return r.stdout.trim();};
const main=()=>gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
const secrets=()=>new Set(JSON.parse(gh(["secret","list","-R",REPO,"--json","name"])).map(x=>x.name));
function ownerUrl(raw){
 let u;try{u=new URL(raw)}catch{hold("OWNER_URL");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||!u.password||
  !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(u.hostname)||u.pathname!=="/neondb"||u.hash||(u.port!==""&&u.port!=="5432")||
  u.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(u.searchParams.get("sslmode"))||
  [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
  (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))hold("EXISTING_NEON_OWNER_TLS");
 u.searchParams.set("sslmode","verify-full");
 return u;
}
async function disabled(c,lock){
 if(lock)await c.query("LOCK TABLE clean.adb_phase6_authorization,clean.adb_collection_batches,clean.adb_collection_segments,clean.adb_collection_subs IN SHARE ROW EXCLUSIVE MODE");
 const q=(await c.query("SELECT current_user actor,session_user login,current_database() db,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica")).rows[0];
 if(q?.actor!=="neondb_owner"||q.actor!==q.login||q.db!=="neondb"||q.ver<160000||q.ver>=170000||q.replica!==false)hold("EXACT_OWNER");
 const a=(await c.query("SELECT enabled,revoked_at_utc,code_sha,manifest_sha256 FROM clean.adb_phase6_authorization WHERE singleton_key=true")).rows;
 const b=(await c.query("SELECT (SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') b,(SELECT count(*)::int FROM clean.adb_collection_segments WHERE status='ACTIVE') g,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) s")).rows[0];
 if(a.length!==1||a[0].enabled!==false||a[0].revoked_at_utc!==null||a[0].code_sha!==OWNER_STAGE||a[0].manifest_sha256!==MANIFEST||Object.values(b).some(x=>x!==0))hold("EXACT_DISABLED_STAGE");
}
function safeMetadata(){
 if(main()!==OWNER_STAGE)hold("MAIN_CHANGED");
 const n=secrets();
 if(!n.has("P7_EXPIRY_READER_DATABASE_URL")||!n.has("P7_EXPIRY_WRITER_DATABASE_URL"))hold("EXPIRY_CREDENTIALS_MISSING");
 return n;
}
async function cli(){
 const env=process.env,[mode,arg]=process.argv.slice(2);
 if(!["commission","recover"].includes(mode)||process.argv.length!==(mode==="commission"?3:4)||env.GITHUB_ACTIONS==="true"||env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
  env.P7_PRESERVATION_LOGIN_APPROVAL!=="COMMISSION_FOUR_EXISTING_RESTRICTED_LOGINS_ONLY_NO_GO"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
  [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.V39_DATABASE_RUNTIME_URL].some(Boolean))hold("EXPLICIT_OWNER_NONPAID_SCOPE");
 const original=ownerUrl(env.DATABASE_URL),endpoint=sha(original.host+original.pathname);
 const n=safeMetadata();let recovery="",committed=false,passwords;
 const c=new pg.Client({connectionString:original.toString(),connectionTimeoutMillis:8000,query_timeout:30000});
 try{
  await c.connect();
  if(mode==="commission"){
   if(P7_PRESERVATION_ACTORS.some(a=>n.has(a.secret)))hold("EXISTING_SECRET_DO_NOT_ROTATE");
   await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
   try{await disabled(c,false);await inspectP7PreservationActors(c,{newLogins:false});}finally{await c.query("ROLLBACK");}
   passwords=Object.fromEntries(P7_PRESERVATION_ACTORS.map(a=>[a.role,randomBytes(36).toString("base64url")]));
   const dir=mkdtempSync(join(homedir(),".travnr-p7-preservation-logins-"));
   recovery=join(dir,"recovery.json");
   writeFileSync(recovery,JSON.stringify({stage:OWNER_STAGE,endpoint,passwords}),{mode:0o600,flag:"wx"});
   if(main()!==OWNER_STAGE)hold("MAIN_CHANGED");
   await commissionP7PreservationActors(c,passwords,async client=>{await client.query("SELECT pg_advisory_xact_lock(390020,706)");await disabled(client,true);});
   committed=true;
  }else{
   const p=resolve(arg),st=lstatSync(p),dir=lstatSync(dirname(p));
   if(!p.startsWith(homedir()+"/.travnr-p7-preservation-logins-")||!p.endsWith("/recovery.json")||realpathSync(p)!==p||!st.isFile()||st.nlink!==1||(st.mode&0o077)||st.uid!==process.getuid()||!dir.isDirectory()||(dir.mode&0o077)||dir.uid!==process.getuid()||st.size>4096)hold("PRIVATE_RECOVERY_FILE");
   recovery=p;const x=JSON.parse(readFileSync(p,"utf8"));
   if(x.stage!==OWNER_STAGE||x.endpoint!==endpoint||Object.keys(x.passwords??{}).length!==4||P7_PRESERVATION_ACTORS.some(a=>!validPassword(x.passwords[a.role])))hold("RECOVERY_SCOPE");
   passwords=x.passwords;
  }
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try{await disabled(c,false);await inspectP7PreservationActors(c,{newLogins:true});}finally{await c.query("ROLLBACK");}
  const urls=[];
  for(const a of P7_PRESERVATION_ACTORS){
   const u=new URL(original.toString());u.username=a.role;u.password=passwords[a.role];
   const actor=new pg.Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:20000});
   try{await actor.connect();await verifyP7PreservationLogin(actor,a);}finally{await actor.end().catch(()=>{});}
   urls.push([a.secret,u.toString()]);
  }
  const before=safeMetadata();
  for(const [name,url] of urls)if(!before.has(name))gh(["secret","set",name,"-R",REPO],url);
  const after=safeMetadata();if(urls.some(([name])=>!after.has(name)))hold("SECRET_NAME_READBACK");
  rmSync(dirname(recovery),{recursive:true,force:true});recovery="";
  console.log(JSON.stringify({status:"P7_FOUR_PRESERVATION_LOGINS_AUTHENTICATED_AND_SECRET_NAMES_PRESENT_NO_GO",authenticated:4,secretNames:urls.map(x=>x[0]),expiryCredentialsUntouched:true,policyRows:0,providerCalls:0,phase6PaidGo:false}));
 }catch(e){if(recovery)console.error(JSON.stringify({status:"P7_RECONCILE_NO_REPLAY",databaseCommitAcknowledged:committed,recoveryFile:recovery,providerCalls:0,phase6PaidGo:false}));throw e;}
 finally{await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await cli().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_P7_PRESERVATION_LOGINS_[A-Z0-9_]+$/.test(m)?m:"HOLD_P7_PRESERVATION_LOGINS_REDACTED_RECONCILE");process.exitCode=2;});
