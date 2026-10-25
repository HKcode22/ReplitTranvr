/**
 * Gate4 NEXT3: separate no-provider, no-refill, one-time scope commissioner.
 *
 * --prepare: local private one-shot manifest only (no DB/provider).
 * --plan: private manifest + BEGIN READ ONLY production catalog verification.
 * --apply: ADD two restricted expiring roles + exactly four scope-specific
 *          RLS policies, after explicit second approval. Never auto-retry
 *          --apply after uncertainty. NEXT1/NEXT2 rows/roles untouched.
 *
 * All outputs categorical/count-only. NO secrets, original bytes, provider
 * subscription IDs, webhook URLs, credentials, policy SQL or AUTH hashes.
 * This source being merged does NOT authorize --apply or paid provider calls.
 */
import "dotenv/config";
import pg from "pg";
import {createHash,randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {join} from "node:path";
import {homedir} from "node:os";
import {pathToFileURL} from "node:url";
import {
 existsSync,mkdirSync,lstatSync,openSync,writeSync,fsyncSync,
 closeSync,readFileSync
} from "node:fs";
import {
 NEXT3_ID,NEXT3_RECEIVER_ROLE,gate4Next3ValidateValuesV39
} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";

export const NEXT3_WRITER_ROLE="gate4_owner_writer_2026_next3";
const ROLES=[NEXT3_RECEIVER_ROLE,NEXT3_WRITER_ROLE] as const;
const RAW="gate4_alert_prebind_original_v39";
const OWNER="gate4_alert_owned_binding_v39";
const POLICY_NAMES=[
 "gate4_next3_receiver_select_v39",
 "gate4_next3_receiver_insert_v39",
 "gate4_next3_writer_select_v39",
 "gate4_next3_writer_insert_v39"
] as const;
const LOCAL=join(homedir(),".config","replittranvr");
const DIR=join(LOCAL,"gate4-next3");
const MANIFEST=join(DIR,"private-commission-manifest.json");
const INTENT=join(DIR,"commission-once-intent.json");
const RECEIVER=join(DIR,"receiver-credential.json");
const WRITER=join(DIR,"writer-credential.json");
const DEPLOY=join(DIR,"published-receiver-private-values.json");
const sha40=/^[a-f0-9]{40}$/;
const sha64=/^[a-f0-9]{64}$/;
const stop=():never=>{throw Error("GATE4_NEXT3_NO_PROVIDER_COMMISSION_HOLD");};
const sha=(x:unknown)=>createHash("sha256")
 .update(JSON.stringify(x)).digest("hex");

type Manifest={
 schema:"v39.gate4.next3.no-provider-manifest.v1";
 source:string;scope:string;receiverRole:string;writerRole:string;
 nonce:string;authorizationSha256:string;createdAtUtc:string;
 providerCreateAuthorized:false;providerRefillAuthorized:false;
};
function inputForHash(m:Manifest):unknown{
 return {source:m.source,scope:m.scope,
  receiverRole:m.receiverRole,writerRole:m.writerRole,nonce:m.nonce};
}
function privateDir():void{
 if(!existsSync(LOCAL))mkdirSync(LOCAL,{mode:0o700});
 const root=lstatSync(LOCAL);
 if(!root.isDirectory()||(root.mode&0o077)!==0)stop();
 if(!existsSync(DIR))mkdirSync(DIR,{mode:0o700});
 const leaf=lstatSync(DIR);
 if(!leaf.isDirectory()||(leaf.mode&0o077)!==0)stop();
}
function privateRead(path:string):unknown{
 const st=lstatSync(path);
 if(!st.isFile()||(st.mode&0o077)!==0||st.size>8192)stop();
 return JSON.parse(readFileSync(path,"utf8"));
}
function writeOnce(path:string,value:unknown):void{
 const fd=openSync(path,"wx",0o600);
 try{writeSync(fd,JSON.stringify(value)+"\n");fsyncSync(fd);}
 finally{closeSync(fd);}
}
function readManifest(source:string):Manifest{
 const m=privateRead(MANIFEST) as Manifest;
 if(m.schema!=="v39.gate4.next3.no-provider-manifest.v1"||
   m.source!==source||m.scope!==NEXT3_ID||
   m.receiverRole!==NEXT3_RECEIVER_ROLE||
   m.writerRole!==NEXT3_WRITER_ROLE||
   !sha64.test(m.nonce)||!sha64.test(m.authorizationSha256)||
   sha(inputForHash(m))!==m.authorizationSha256||
   m.providerCreateAuthorized!==false||
   m.providerRefillAuthorized!==false||
   !Number.isFinite(Date.parse(m.createdAtUtc))||
   Date.parse(m.createdAtUtc)>Date.now()+30000||
   Date.now()-Date.parse(m.createdAtUtc)>48*3600_000)stop();
 return m;
}
export function gate4Next3RoleSQLV39(
 role:string,password:string,expiresUtc:string,limit:1|4
):string{
 if(!ROLES.includes(role as (typeof ROLES)[number])||
    !/^[a-f0-9]{80}$/.test(password)||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(expiresUtc)||
    (role===NEXT3_RECEIVER_ROLE&&limit!==4)||
    (role===NEXT3_WRITER_ROLE&&limit!==1))stop();
 return "CREATE ROLE "+role+
  " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
  "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT "+limit+
  " PASSWORD '"+password+"' VALID UNTIL '"+expiresUtc+"'";
}
/** Only the newly scoped role can read/insert its exact authenticated rows.
 * Never grant cross-table reads or UPDATE/DELETE. */
export function gate4Next3PolicySQLV39(
 source:string,authorizationSha256:string
):string[]{
 if(!sha40.test(source)||!sha64.test(authorizationSha256))stop();
 const pred="scope_id='"+NEXT3_ID+"'::uuid AND "+
  "authorization_sha256='"+authorizationSha256+"' AND "+
  "source_commit='"+source+"' AND airport_icao='WSSS'";
 const r="clean."+RAW,o="clean."+OWNER;
 return [
  "GRANT CONNECT ON DATABASE neondb TO "+NEXT3_RECEIVER_ROLE,
  "GRANT USAGE ON SCHEMA clean TO "+NEXT3_RECEIVER_ROLE,
  "GRANT SELECT,INSERT ON TABLE "+r+" TO "+NEXT3_RECEIVER_ROLE,
  "CREATE POLICY "+POLICY_NAMES[0]+" ON "+r+
   " FOR SELECT TO "+NEXT3_RECEIVER_ROLE+" USING ("+pred+")",
  "CREATE POLICY "+POLICY_NAMES[1]+" ON "+r+
   " FOR INSERT TO "+NEXT3_RECEIVER_ROLE+" WITH CHECK ("+pred+")",
  "GRANT CONNECT ON DATABASE neondb TO "+NEXT3_WRITER_ROLE,
  "GRANT USAGE ON SCHEMA clean TO "+NEXT3_WRITER_ROLE,
  "GRANT SELECT,INSERT ON TABLE "+o+" TO "+NEXT3_WRITER_ROLE,
  "CREATE POLICY "+POLICY_NAMES[2]+" ON "+o+
   " FOR SELECT TO "+NEXT3_WRITER_ROLE+" USING ("+pred+")",
  "CREATE POLICY "+POLICY_NAMES[3]+" ON "+o+
   " FOR INSERT TO "+NEXT3_WRITER_ROLE+" WITH CHECK ("+pred+")"
 ];
}
type Audit={
 signature:string; originalCount:number;ownedCount:number;policyCount:number;
 policyRows:Record<string,unknown>[];
};
const policyName=(x:Record<string,unknown>):string=>String(x.policyname);
const policyLegacy=(x:Record<string,unknown>):boolean=>
 !POLICY_NAMES.includes(policyName(x) as (typeof POLICY_NAMES)[number]);

function ownerConnection():{ownerUrl:string;actor:string}{
 const ownerUrl=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const runtimeUrl=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 let a:URL,b:URL;
 try{a=new URL(ownerUrl);b=new URL(runtimeUrl);}
 catch{return stop();}
 const host=(u:URL)=>u.hostname.replace("-pooler.",".")+":"+
  (u.port||"5432")+u.pathname;
 if(!["postgres:","postgresql:"].includes(a.protocol)||
    !["postgres:","postgresql:"].includes(b.protocol)||
    !a.password||!b.password||a.pathname!=="/neondb"||
    host(a)!==host(b)||a.username===b.username)stop();
 return {ownerUrl,actor:decodeURIComponent(a.username)};
}
async function inspect(
 db:pg.Client,actor:string,readonly:boolean,phase:"before"|"after",
 baseline?:Audit
):Promise<Audit>{
 const m=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('transaction_read_only') AS ro,"+
  "(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,"+
  "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS role_admin,"+
  "has_schema_privilege(current_user,'clean','CREATE') AS may_ddl"
 )).rows[0];
 if(m?.db!=="neondb"||m.actor!==actor||
    m.ro!==(readonly?"on":"off")||
    m.superuser!==false||m.role_admin!==true||m.may_ddl!==true)stop();
 const rls=(await db.query(
  "SELECT relname,relrowsecurity FROM pg_class c "+
  "JOIN pg_namespace n ON n.oid=c.relnamespace "+
  "WHERE n.nspname='clean' AND relname=ANY($1::text[])",
  [[RAW,OWNER]]
 )).rows;
 if(rls.length!==2||rls.some(x=>x.relrowsecurity!==true))stop();
 const originals=(await db.query(
  "SELECT scope_id::text AS scope,original_wire AS wire,"+
  "original_sha256 AS digest FROM clean."+RAW
 )).rows;
 if(!originals.every(x=>
  Buffer.isBuffer(x.wire)&&
  createHash("sha256").update(x.wire).digest("hex")===x.digest))stop();
 // Count and compare ALL earlier evidence, regardless of how many valid
 // synthetic or paid receipts prior experiments legitimately retained.
 if(originals.some(x=>x.scope===NEXT3_ID))stop();
 const owned=(await db.query(
  "SELECT * FROM clean."+OWNER
 )).rows;
 if(owned.some(x=>String(x.scope_id)===NEXT3_ID))stop();
 const policyRows=(await db.query(
  "SELECT tablename,policyname,cmd,permissive,roles,qual,with_check "+
  "FROM pg_policies WHERE schemaname='clean' AND "+
  "tablename=ANY($1::text[]) ORDER BY tablename,policyname",
  [[RAW,OWNER]]
 )).rows as Record<string,unknown>[];
 if(phase==="before"&&policyRows.some(x=>!policyLegacy(x)))stop();
 const roles=(await db.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,"+
  "rolinherit,rolcreaterole,rolcreatedb,rolreplication "+
  "FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname",
  [[...ROLES]]
 )).rows;
 if(phase==="before"){
  if(roles.length!==0||policyRows.length<7)stop();
 }else{
  if(roles.length!==2||!roles.every(x=>
   x.rolcanlogin===true&&x.rolsuper===false&&
   x.rolbypassrls===false&&x.rolinherit===false&&
   x.rolcreaterole===false&&x.rolcreatedb===false&&
   x.rolreplication===false))stop();
  const newPolicies=policyRows.filter(x=>!policyLegacy(x));
  const allowed=[
   [RAW,POLICY_NAMES[0],"SELECT",NEXT3_RECEIVER_ROLE],
   [RAW,POLICY_NAMES[1],"INSERT",NEXT3_RECEIVER_ROLE],
   [OWNER,POLICY_NAMES[2],"SELECT",NEXT3_WRITER_ROLE],
   [OWNER,POLICY_NAMES[3],"INSERT",NEXT3_WRITER_ROLE]
  ];
  if(newPolicies.length!==4||!allowed.every(([table,name,cmd,role])=>
    newPolicies.some(p=>p.tablename===table&&p.policyname===name&&
     p.cmd===cmd&&Array.isArray(p.roles)&&p.roles.length===1&&
     p.roles[0]===role&&
     (cmd==="SELECT"?!!p.qual&&!p.with_check:
      !p.qual&&!!p.with_check))))stop();
  for(const [role,table,other] of [
   [NEXT3_RECEIVER_ROLE,RAW,OWNER],
   [NEXT3_WRITER_ROLE,OWNER,RAW]
  ]){
   const p=(await db.query(
    "SELECT has_schema_privilege($1,'clean','USAGE') AS usage,"+
    "has_schema_privilege($1,'clean','CREATE') AS ddl,"+
    "has_table_privilege($1,'clean.'||$2,'SELECT') AS read,"+
    "has_table_privilege($1,'clean.'||$2,'INSERT') AS insert,"+
    "has_table_privilege($1,'clean.'||$2,'UPDATE') AS update,"+
    "has_table_privilege($1,'clean.'||$2,'DELETE') AS delete,"+
    "has_table_privilege($1,'clean.'||$3,'SELECT') AS cross_read",
    [role,table,other]
   )).rows[0];
   if(!p||p.usage!==true||p.ddl!==false||p.read!==true||
      p.insert!==true||p.update!==false||p.delete!==false||
      p.cross_read!==false)stop();
  }
 }
 const legacy=policyRows.filter(policyLegacy);
 // Snapshot hashes remain private; do not log historical IDs/SQL or bytes.
 const sig=sha({
  originals:originals.map(x=>[x.scope,x.digest]).sort(),
  owners:owned.map(x=>sha(x)).sort(),
  legacy
 });
 if(phase==="after"&&
    (!baseline||sig!==baseline.signature||
     policyRows.length!==baseline.policyCount+4))stop();
 return {signature:sig,originalCount:originals.length,
  ownedCount:owned.length,policyCount:policyRows.length,policyRows};
}
function scopedUrl(ownerUrl:string,role:string,pwd:string):string{
 const u=new URL(ownerUrl);
 u.username=role;u.password=pwd;
 u.searchParams.set("sslmode","verify-full");
 return u.toString();
}
export async function gate4Next3CommissionV39(
 mode:"--prepare"|"--plan"|"--apply"
):Promise<void>{
 let db:pg.Client|undefined,tx=false,intent=false,stage="ENTRY";
 try{
  const reviewed=process.env.GATE4_NEXT3_REVIEWED_MAIN_SHA??"";
  const source=process.env.GATE4_NEXT3_RECEIVER_SOURCE_SHA??"";
  const local=execFileSync("git",["rev-parse","HEAD"],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  if(!sha40.test(reviewed)||!sha40.test(source)||
     local!==reviewed||source!==reviewed)stop();
  privateDir();
  if(mode==="--prepare"){
   stage="LOCAL_PRIVATE_PREPARE";
   if([MANIFEST,INTENT,RECEIVER,WRITER,DEPLOY].some(existsSync))stop();
   const m:Manifest={
    schema:"v39.gate4.next3.no-provider-manifest.v1",
    scope:NEXT3_ID,source,receiverRole:NEXT3_RECEIVER_ROLE,
    writerRole:NEXT3_WRITER_ROLE,
    nonce:randomBytes(32).toString("hex"),
    authorizationSha256:"",createdAtUtc:new Date().toISOString(),
    providerCreateAuthorized:false,providerRefillAuthorized:false
   };
   m.authorizationSha256=sha(inputForHash(m));
   writeOnce(MANIFEST,m);
   console.log(JSON.stringify({status:"GATE4_NEXT3_PREPARED_NO_PROVIDER",
    providerCalls:0,databaseWrites:0,paidAuthorized:false}));
   return;
  }
  const m=readManifest(source);
  if(mode==="--apply"&&process.env.GATE4_NEXT3_APPLY_CONFIRM!==
   "AUTHORIZE_EXACT_NEXT3_DB_ROLES_NO_PROVIDER")stop();
  stage="READONLY_DATABASE_ADMISSION";
  const {ownerUrl,actor}=ownerConnection();
  db=new pg.Client({connectionString:ownerUrl,
   connectionTimeoutMillis:6000,query_timeout:10000,
   application_name:"gate4_next3_one_time_no_provider"});
  await db.connect();
  await db.query("BEGIN READ ONLY");tx=true;
  const before=await inspect(db,actor,true,"before");
  await db.query("ROLLBACK");tx=false;
  if(mode==="--plan"){
   console.log(JSON.stringify({status:"GATE4_NEXT3_READONLY_PLAN_READY",
    existingOriginalsPreserved:before.originalCount,
    existingOwnedPreserved:before.ownedCount,
    oldPolicyCount:before.policyCount,newRolesProposed:2,
    newPoliciesProposed:4,providerCalls:0,databaseWrites:0,
    paidAuthorized:false}));
   return;
  }
  stage="DURABLE_ONE_SHOT_INTENT";
  if([INTENT,RECEIVER,WRITER,DEPLOY].some(existsSync))stop();
  const passwordR=randomBytes(40).toString("hex");
  const passwordW=randomBytes(40).toString("hex");
  const expiresUtc=new Date(Date.now()+6*3600_000).toISOString();
  writeOnce(INTENT,{schema:"v39.gate4.next3.commission-intent.v1",
   source,scope:NEXT3_ID,createdAtUtc:new Date().toISOString(),
   noSecondApply:true,providerAuthorized:false});
  intent=true;
  writeOnce(RECEIVER,{schema:"v39.gate4.next3.receiver.v1",
   role:NEXT3_RECEIVER_ROLE,source,scope:NEXT3_ID,
   expiresUtc,receiverUrl:scopedUrl(ownerUrl,NEXT3_RECEIVER_ROLE,passwordR)});
  writeOnce(WRITER,{schema:"v39.gate4.next3.writer.v1",
   role:NEXT3_WRITER_ROLE,source,scope:NEXT3_ID,
   expiresUtc,writerUrl:scopedUrl(ownerUrl,NEXT3_WRITER_ROLE,passwordW)});
  const settings={
   V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",ADB_AUTO_COLLECT:"false",
   GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
   GATE4_PREBIND_APPROVED_SOURCE_COMMIT:source,
   GATE4_PREBIND_SCOPE_ID:NEXT3_ID,
   GATE4_PREBIND_AUTH_SHA256:m.authorizationSha256,
   GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
   GATE4_PREBIND_DATABASE_URL:scopedUrl(
    ownerUrl,NEXT3_RECEIVER_ROLE,passwordR),
   GATE4_PREBIND_APPROVED_DB_HOST:new URL(ownerUrl).hostname,
   GATE4_PREBIND_WEBHOOK_SECRET:randomBytes(40).toString("hex")
  };
  gate4Next3ValidateValuesV39(settings,source);
  writeOnce(DEPLOY,{schema:"v39.gate4.next3.private-settings.v1",
   source,scope:NEXT3_ID,values:settings,
   published:false,providerPaid:false});
  stage="ONE_ADDITIVE_SQL_TRANSACTION";
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");tx=true;
  await db.query("SET LOCAL lock_timeout='2500ms'");
  await db.query("SET LOCAL statement_timeout='7000ms'");
  await db.query("SELECT pg_advisory_xact_lock(3904,20261025)");
  const current=await inspect(db,actor,false,"before");
  if(current.signature!==before.signature)stop();
  await db.query(gate4Next3RoleSQLV39(
   NEXT3_RECEIVER_ROLE,passwordR,expiresUtc,4));
  await db.query(gate4Next3RoleSQLV39(
   NEXT3_WRITER_ROLE,passwordW,expiresUtc,1));
  for(const sql of gate4Next3PolicySQLV39(source,m.authorizationSha256))
   await db.query(sql);
  await inspect(db,actor,false,"after",current);
  await db.query("COMMIT");tx=false;
  stage="POST_COMMIT_READONLY_VERIFICATION";
  await db.query("BEGIN READ ONLY");tx=true;
  await inspect(db,actor,true,"after",current);
  await db.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_SCOPED_ROLES_COMMISSIONED_NO_PROVIDER",
   rolesAdded:2,policiesAdded:4,
   priorRowsUntouched:true,expiresUtc,
   privateSettingsPrepared:true,published:false,paidAuthorized:false,
   providerCalls:0
  }));
 }catch{
  if(tx)await db?.query("ROLLBACK").catch(()=>undefined);
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_COMMISSION_HOLD",stage,
   privateIntentMayExist:intent,noAutomaticRetry:true,
   providerCalls:0
  }));
  process.exitCode=2;
 }finally{await db?.end().catch(()=>undefined);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const mode=process.argv[2];
 if(process.argv.length!==3||
    !["--prepare","--plan","--apply"].includes(mode)){
  console.log("GATE4_NEXT3_COMMISSION_HOLD");process.exitCode=2;
 }else void gate4Next3CommissionV39(mode as "--prepare"|"--plan"|"--apply");
}
