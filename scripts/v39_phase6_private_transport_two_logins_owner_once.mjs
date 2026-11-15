/** Owner-only private transport credentials. Reuse installed V0094–V0099,
 * two original groups, original PG16 SET-only pattern. No private payload,
 * provider, signing key, calendar, budget or paid release.
 * GH secrets are written before COMMIT; any unknown COMMIT quarantines.
 */
import pg from "pg";
import {randomBytes} from "node:crypto";
import {execFileSync,spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {readV0099OwnerInventory} from "./v39_phase6_v0099_owner_schema_readonly_and_once.mjs";
const REPO="HKcode22/ReplitTranvr";
export const APPROVAL="COMMISSION_ONLY_TWO_PRIVATE_TRANSPORT_LOGINS_NO_PAYLOAD_NO_PAID";
export const ENTRIES=Object.freeze([
 Object.freeze({login:"phase6_private_reader_login_prod20261115",group:"phase6_private_frozen_reader_v39",secret:"P6_PRIVATE_READER_DATABASE_URL",publish:false}),
 Object.freeze({login:"phase6_private_publisher_login_prod20261115",group:"phase6_private_frozen_publisher_v39",secret:"P6_PRIVATE_PUBLISHER_DATABASE_URL",publish:true})
]);
const TABLES=["phase6_private.frozen_native_packet_v39","phase6_private.signed_run_day_index_revision_v39","phase6_private.signed_run_day_epoch_claim_v39"];
const CI_URL="postgresql://neondb_owner:ci-only-day-real@127.0.0.1:5432/neondb?sslmode=disable";
const hold=s=>{throw Error("HOLD_P6_PRIVATE_TRANSPORT_LOGINS_"+s);};
function ownerScope(env,ci){
 if(env.P6_PRIVATE_TRANSPORT_LOGIN_APPROVAL!==APPROVAL||
    !/^[a-f0-9]{40}$/.test(env.P6_PRIVATE_TRANSPORT_REVIEWED_MAIN??"")||
    !env.DATABASE_URL||env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||env.RAPIDAPI_KEY||
    env.P6_PRIVATE_READER_DATABASE_URL||env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    (env.V39_DATABASE_RUNTIME_URL&&env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL))
  hold("EXPLICIT_EMPTY_OWNER_SCOPE_REQUIRED");
 let u;try{u=new URL(env.DATABASE_URL);}catch{hold("INVALID_OWNER_URL");}
 if(ci){
  if(env.GITHUB_ACTIONS!=="true"||env.P6_PRIVATE_TRANSPORT_DISPOSABLE_ONLY!=="1"||env.DATABASE_URL!==CI_URL)
   hold("DISPOSABLE_CI_ONLY");
 }else if(env.GITHUB_ACTIONS==="true"||
   !["postgresql:","postgres:"].includes(u.protocol)||
   decodeURIComponent(u.username)!=="neondb_owner"||u.pathname!=="/neondb"||
   !u.password||!u.hostname.endsWith(".neon.tech")||u.hash||
   (u.port!==""&&u.port!=="5432")||
   !["require","verify-full"].includes(u.searchParams.get("sslmode")??""))
  hold("REAL_EXISTING_NEON_OWNER_TLS_REQUIRED");
 return u;
}
function workerUrl(base,entry,password,ci){
 const u=new URL(base);
 u.username=entry.login;u.password=password;
 if(!ci){
  // Existing role-based workers use a direct session. Remove pooler
  // suffix for connection-local SET ROLE; retain exact Neon endpoint.
  u.hostname=u.hostname.replace(/-pooler(?=\.)/,"");
  u.search="";
  u.searchParams.set("sslmode","require");
 }
 return u.toString();
}
async function assertOwner(c){
 const q=(await c.query("SELECT current_database() AS db,current_user AS actor,session_user AS login,"+
  "current_setting('server_version_num')::int AS ver,pg_is_in_recovery() AS replica,"+
  "rolcreaterole,rolsuper FROM pg_roles WHERE rolname=current_user")).rows[0];
 if(q?.db!=="neondb"||q.actor!=="neondb_owner"||q.login!==q.actor||q.ver<160000||q.ver>=170000||
    q.replica!==false||q.rolcreaterole!==true||q.rolsuper!==false)hold("NOT_EXISTING_PG16_OWNER");
}
async function roles(c,created){
 const names=ENTRIES.map(e=>e.login),groups=ENTRIES.map(e=>e.group);
 const u=(await c.query("SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[])",[names])).rows;
 if(u.length!==(created?2:0)||u.some(x=>!x.rolcanlogin||x.rolinherit||x.rolsuper||x.rolcreaterole||x.rolcreatedb||x.rolreplication||x.rolbypassrls))
  hold("PREEXISTING_OR_DRIFTED_LOGIN_NO_REPLAY");
 const m=(await c.query("SELECT g.rolname AS target,l.rolname AS member,grantor.rolsuper AS bootstrap_super,"+
  "m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles g ON g.oid=m.roleid "+
  "JOIN pg_roles l ON l.oid=m.member JOIN pg_roles grantor ON grantor.oid=m.grantor "+
  "WHERE g.rolname=ANY($1::text[]) OR l.rolname=ANY($2::text[])",[groups,names])).rows;
 for(const e of ENTRIES){
  const all=m.filter(x=>x.target===e.group);
  const boot=all.filter(x=>x.member==="neondb_owner"&&x.bootstrap_super&&x.admin_option&&!x.inherit_option&&!x.set_option);
  if(boot.length!==1||all.length!==(created?2:1))hold("UNEXPECTED_PRIVATE_GROUP_MEMBER");
  if(created){
   const own=m.filter(x=>x.member===e.login);
   if(own.length!==1||own[0].target!==e.group||!own[0].set_option||own[0].admin_option||own[0].inherit_option)
    hold("WRONG_PRIVATE_SET_ONLY_MEMBERSHIP");
   const perms=(await c.query("SELECT t,has_table_privilege($1,t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS any_acl,"+
    "has_table_privilege($2,t,'SELECT') AS s,has_table_privilege($2,t,'INSERT') AS i,"+
    "has_table_privilege($2,t,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS w FROM unnest($3::text[]) t",[e.login,e.group,TABLES])).rows;
   if(perms.length!==3||perms.some(p=>p.any_acl!==false||p.s!==true||p.w!==false||p.i!==(e.publish&&p.t!==TABLES[2])))
    hold("DIRECT_OR_EFFECTIVE_PRIVATE_ACL_DRIFT");
  }
 }
}
export async function verifyP6PrivateTransportSession(url,entry,{ci=false}={}){
 if(!ENTRIES.includes(entry))hold("UNREVIEWED_ENTRY");
 let u;try{u=new URL(url);}catch{hold("INVALID_RESTRICTED_URL");}
 if(decodeURIComponent(u.username)!==entry.login||u.pathname!=="/neondb"||!u.password||
    (ci?u.hostname!=="127.0.0.1":(!u.hostname.endsWith(".neon.tech")||u.searchParams.get("sslmode")!=="require")))
  hold("WRONG_RESTRICTED_SESSION_URL");
 const c=new pg.Client({connectionString:url,connectionTimeoutMillis:8000,query_timeout:12000});
 await c.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='8000ms'");
  await c.query("SET LOCAL ROLE "+entry.group);
  const q=(await c.query("SELECT current_database() AS db,current_user AS actor,session_user AS login,"+
   "current_setting('server_version_num')::int AS ver,current_setting('transaction_read_only') AS ro,pg_is_in_recovery() AS replica,"+
   "l.rolcanlogin,l.rolinherit,l.rolsuper,l.rolcreaterole,l.rolcreatedb,l.rolreplication,l.rolbypassrls,g.rolcanlogin AS group_login "+
   "FROM pg_roles l,pg_roles g WHERE l.rolname=session_user AND g.rolname=current_user")).rows[0];
  if(q?.db!=="neondb"||q.actor!==entry.group||q.login!==entry.login||q.ver<160000||q.ver>=170000||q.ro!=="on"||
     q.replica!==false||q.group_login!==false||q.rolcanlogin!==true||q.rolinherit||q.rolsuper||q.rolcreaterole||q.rolcreatedb||q.rolreplication||q.rolbypassrls)
   hold("ACTUAL_RESTRICTED_SESSION_MISMATCH");
  const acl=(await c.query("SELECT t,has_table_privilege(current_user,t,'SELECT') AS s,has_table_privilege(current_user,t,'INSERT') AS i,"+
   "has_table_privilege(current_user,t,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS w FROM unnest($1::text[]) t",[TABLES])).rows;
  if(acl.length!==3||acl.some(p=>p.s!==true||p.w!==false||p.i!==(entry.publish&&p.t!==TABLES[2])))
   hold("ACTUAL_RESTRICTED_ACL_MISMATCH");
  const n=(await c.query("SELECT (SELECT count(*)::int FROM "+TABLES[0]+") AS packets,"+
   "(SELECT count(*)::int FROM "+TABLES[1]+") AS revisions,(SELECT count(*)::int FROM "+TABLES[2]+") AS claims")).rows[0];
  if(n?.packets!==0||n.revisions!==0||n.claims!==0)hold("NOT_EMPTY_COMMISSIONING_BOUNDARY");
  await c.query("ROLLBACK");
  return {login:entry.login,group:entry.group,readOnly:true,packetRowsRead:0,providerCalls:0,databaseWrites:0};
 }finally{await c.end();}
}
export async function commissionP6PrivateTransportLogins({env=process.env,gh,ci=false}){
 const base=ownerScope(env,ci),pin=env.P6_PRIVATE_TRANSPORT_REVIEWED_MAIN;
 if(!gh||!["getMainSha","listSecretNames","setSecret","deleteSecret"].every(k=>typeof gh[k]==="function"))hold("SECRET_DRIVER");
 if(await gh.getMainSha()!==pin)hold("MAIN_CHANGED");
 const secrets=await gh.listSecretNames();
 if(!Array.isArray(secrets)||ENTRIES.some(e=>secrets.includes(e.secret)))hold("SECRET_ALREADY_EXISTS_NEVER_OVERWRITE");
 const c=new pg.Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:40000});
 await c.connect();
 let tx=false,commit=false;const touched=[],creds=[];
 try{
  await assertOwner(c);
  if((await readV0099OwnerInventory(c)).state!=="V0099_INSTALLED_EMPTY_DAILY_REVIEW_INERT_NO_GO")
   hold("EXACT_EMPTY_V0099_REQUIRED");
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await c.query("SET LOCAL statement_timeout='30000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  if((await c.query("SELECT pg_try_advisory_xact_lock(hashtext('phase6-private-transport-login-v39')) AS ok")).rows[0]?.ok!==true)
   hold("ALREADY_COMMISSIONING");
  await roles(c,false);
  // Ensure no payload appears between the V0099 inventory and credentials.
  await c.query("LOCK TABLE "+TABLES.join(",")+" IN SHARE ROW EXCLUSIVE MODE");
  const counts=(await c.query("SELECT "+TABLES.map((t,i)=>"(SELECT count(*)::int FROM "+t+") AS n"+i).join(","))).rows[0];
  if(!counts||Object.values(counts).some(x=>x!==0))hold("NONEMPTY_TRANSPORT");
  for(const entry of ENTRIES){
   const password=randomBytes(48).toString("hex");
   await c.query("CREATE ROLE "+entry.login+" LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");
   await c.query("GRANT "+entry.group+" TO "+entry.login+" WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
   creds.push({entry,url:workerUrl(base,entry,password,ci)});
  }
  await roles(c,true);
  if(ENTRIES.some(e=>(secrets).includes(e.secret)))hold("PREEXISTING_SECRET");
  const current=await gh.listSecretNames();
  if(!Array.isArray(current)||ENTRIES.some(e=>current.includes(e.secret)))hold("SECRET_RACE_REFUSED");
  for(const x of creds){touched.push(x.entry.secret);await gh.setSecret(x.entry.secret,x.url);}
  const finalNames=await gh.listSecretNames();
  if(!Array.isArray(finalNames)||ENTRIES.some(e=>!finalNames.includes(e.secret)))hold("SECRET_READBACK_MISSING");
  if(await gh.getMainSha()!==pin)hold("MAIN_CHANGED_BEFORE_COMMIT");
  commit=true;await c.query("COMMIT");tx=false;
  await roles(c,true);
  const verified=[];
  for(const x of creds)verified.push(await verifyP6PrivateTransportSession(x.url,x.entry,{ci}));
  const names=await gh.listSecretNames();
  if(ENTRIES.some(e=>!names.includes(e.secret)))hold("POSTCOMMIT_SECRET_ABSENCE");
  return {status:"P6_TWO_PRIVATE_TRANSPORT_LOGINS_COMMITTED_INERT_NO_GO",rolesCreated:2,secretsCreated:2,verified,
   privatePayloadWrites:0,providerCalls:0,phase6PaidGo:false};
 }catch(e){
  if(commit)hold("COMMIT_UNKNOWN_OR_POSTCOMMIT_FAILURE_NEVER_REPLAY");
  let clean=true;
  if(tx){try{await c.query("ROLLBACK");}catch{clean=false;}}
  for(const name of touched.reverse())try{await gh.deleteSecret(name);}catch{clean=false;}
  if(!clean)hold("ROLLBACK_OR_SECRET_CLEANUP_UNKNOWN_NO_REPLAY");
  throw e;
 }finally{await c.end();}
}
function ghCmd(args,stdin){
 return new Promise((yes,no)=>{
  const p=spawn("gh",args,{stdio:["pipe","pipe","pipe"]});let out="";
  p.stdout.on("data",b=>{out+=String(b);if(out.length>100000)p.kill();});
  p.stderr.on("data",()=>{});p.on("error",()=>no(Error("GH_EXEC")));
  p.on("close",n=>n===0?yes(out):no(Error("GH_FAILED")));
  p.stdin.on("error",()=>{});p.stdin.end(stdin);
 });
}
function realDriver(){
 const exact=n=>{if(!ENTRIES.some(e=>e.secret===n))hold("UNREVIEWED_SECRET_NAME");};
 return {getMainSha:async()=>String(await ghCmd(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])).trim(),
  listSecretNames:async()=>String(await ghCmd(["api","repos/"+REPO+"/actions/secrets","--paginate","--jq",".secrets[].name"])).trim().split("\n").filter(Boolean),
  setSecret:async(n,v)=>{exact(n);await ghCmd(["secret","set",n,"--repo",REPO,"--app","actions"],v);},
  deleteSecret:async(n)=>{exact(n);await ghCmd(["secret","delete",n,"--repo",REPO,"--app","actions"]);}};
}
async function main(){
 const pin=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 if(pin!==process.env.P6_PRIVATE_TRANSPORT_REVIEWED_MAIN)hold("LOCAL_MAIN_PIN");
 console.log(JSON.stringify(await commissionP6PrivateTransportLogins({gh:realDriver()})));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(/^HOLD_P6_PRIVATE_TRANSPORT_LOGINS_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P6_PRIVATE_TRANSPORT_LOGINS_UNEXPECTED_NO_REPLAY");process.exitCode=2;});
