/**
 * NEXT2 exact-scoped, additive-only V0071/V0072 role commissioning.
 * --prepare: local-only random private AUTH manifest, NO database/provider.
 * --plan: BEGIN READ ONLY exact existing state check, NO writes.
 * --apply: owner-approved single local write-once intent, private credentials,
 *          ONE PostgreSQL transaction adding two expiring least-privilege roles
 *          and 4 policies; NO existing roles, policies, rows or tables altered.
 * Never calls AeroDataBox, Replit publish, GitHub STOP or provider DELETE.
 * Never retry --apply after uncertainty. No secret values printed or committed.
 */
import "dotenv/config";
import pg from "pg";
import {createHash,randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,mkdirSync,readFileSync,lstatSync,openSync,writeSync,fsyncSync,closeSync} from "node:fs";
import {join,resolve} from "node:path";
import {homedir} from "node:os";
import {pathToFileURL} from "node:url";
import {
 NEXT2_SCOPE,NEXT2_RECEIVER,NEXT2_WRITER,FROZEN_RECEIVER_SOURCE,
 HISTORICAL_SCOPE,SPENT_NEXT1_SCOPE,
 gate4Next2PoliciesMatchV39,type Gate4PolicyMetadataV39
} from "./v39_gate4_next2_production_readonly_inventory_v39";

const PRIVATE=join(homedir(),".config","replittranvr","gate4-next2-20261024");
const MANIFEST=join(PRIVATE,"setup-manifest.json");
const INTENT=join(PRIVATE,"commission-once-intent.json");
const RECEIVER_CREDENTIAL=join(PRIVATE,"receiver-credential.json");
const WRITER_CREDENTIAL=join(PRIVATE,"writer-credential.json");
const DEPLOYMENT=join(PRIVATE,"published-receiver-settings.json");
const NEW_POLICIES=[
 "gate4_next2_receiver_select_v39",
 "gate4_next2_receiver_insert_v39",
 "gate4_next2_writer_select_v39",
 "gate4_next2_writer_insert_v39"
] as const;
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const hold=():never=>{throw Error("GATE4_NEXT2_NO_PROVIDER_COMMISSION_HOLD");};
type Manifest={
 schema:"v39.gate4.next2.private-no-provider.v1";
 scopeId:string;sourceSha:string;receiverRole:string;writerRole:string;
 nonce:string;createdAtUtc:string;authorizationSha256:string;
 providerCreateAuthorized:false;providerRefillAuthorized:false;
};
function manifestInputs(m:Pick<Manifest,
 "scopeId"|"sourceSha"|"receiverRole"|"writerRole"|"nonce">):string{
 return JSON.stringify({scopeId:m.scopeId,sourceSha:m.sourceSha,
  receiverRole:m.receiverRole,writerRole:m.writerRole,nonce:m.nonce});
}
function writeOnce(path:string,value:unknown):void{
 const fd=openSync(path,"wx",0o600);
 try{writeSync(fd,JSON.stringify(value,null,2)+"\n");fsyncSync(fd);}
 finally{closeSync(fd);}
}
function privateDir():void{
 const root=join(homedir(),".config","replittranvr");
 const x=lstatSync(root);
 if(!x.isDirectory()||(x.mode&0o077)!==0)hold();
 if(!existsSync(PRIVATE))mkdirSync(PRIVATE,{recursive:false,mode:0o700});
 const d=lstatSync(PRIVATE);
 if(!d.isDirectory()||(d.mode&0o077)!==0)hold();
}
function safeFile(path:string):boolean{
 try{const s=lstatSync(path);return s.isFile()&&(s.mode&0o077)===0;}
 catch{return false;}
}
function readManifest():Manifest{
 privateDir();
 if(!safeFile(MANIFEST))hold();
 let m:Manifest;
 try{m=JSON.parse(readFileSync(MANIFEST,"utf8"));}
 catch{return hold();}
 if(m.schema!=="v39.gate4.next2.private-no-provider.v1"||
    m.scopeId!==NEXT2_SCOPE||m.sourceSha!==FROZEN_RECEIVER_SOURCE||
    m.receiverRole!==NEXT2_RECEIVER||m.writerRole!==NEXT2_WRITER||
    !/^[a-f0-9]{64}$/.test(m.nonce)||
    !/^[a-f0-9]{64}$/.test(m.authorizationSha256)||
    m.providerCreateAuthorized!==false||m.providerRefillAuthorized!==false||
    hash(manifestInputs(m))!==m.authorizationSha256||
    !Number.isFinite(Date.parse(m.createdAtUtc))||
    Date.now()-Date.parse(m.createdAtUtc)>48*3600_000||
    Date.parse(m.createdAtUtc)>Date.now()+30000)hold();
 return m;
}
function exactDB():{ownerUrl:string;expectedActor:string}{
 const ownerUrl=process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"";
 const runtimeUrl=process.env.V39_DATABASE_RUNTIME_URL??"";
 let a:URL,b:URL;
 try{a=new URL(ownerUrl);b=new URL(runtimeUrl);}catch{return hold();}
 const canonical=(x:URL)=>x.hostname.replace("-pooler.",".")+":"+
  (x.port||"5432")+x.pathname;
 if(!["postgres:","postgresql:"].includes(a.protocol)||
    !["postgres:","postgresql:"].includes(b.protocol)||
    !a.password||!b.password||a.pathname!=="/neondb"||
    canonical(a)!==canonical(b)||
    decodeURIComponent(a.username)===decodeURIComponent(b.username))hold();
 return {ownerUrl,expectedActor:decodeURIComponent(a.username)};
}
async function inspect(db:pg.Client,actor:string,
 expectedReadonly:boolean,after:boolean):Promise<boolean>{
 const info=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('transaction_read_only') AS readonly,"+
  "(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,"+
  "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS role_admin,"+
  "has_schema_privilege(current_user,'clean','CREATE') AS may_ddl"
 )).rows[0];
 if(info?.db!=="neondb"||info.actor!==actor||
    info.readonly!==(expectedReadonly?"on":"off")||
    info.superuser!==false||info.role_admin!==true||
    info.may_ddl!==true)return false;
 const raw=(await db.query(
  "SELECT scope_id::text AS scope,original_wire AS wire,"+
  "original_sha256 AS sha FROM clean.gate4_alert_prebind_original_v39"
 )).rows;
 const bindings=(await db.query(
  "SELECT scope_id::text AS scope,count(*)::int AS n FROM "+
  "clean.gate4_alert_owned_binding_v39 GROUP BY scope_id"
 )).rows;
 if(raw.length!==1||raw[0].scope!==HISTORICAL_SCOPE||
    !Buffer.isBuffer(raw[0].wire)||
    createHash("sha256").update(raw[0].wire).digest("hex")!==raw[0].sha||
    bindings.length!==2||
    bindings.find(x=>x.scope===HISTORICAL_SCOPE)?.n!==1||
    bindings.find(x=>x.scope===SPENT_NEXT1_SCOPE)?.n!==1)return false;
 const metadata=(await db.query(
  "SELECT c.relname AS name,c.relrowsecurity AS rls FROM pg_class c "+
  "JOIN pg_namespace n ON c.relnamespace=n.oid "+
  "WHERE n.nspname='clean' AND c.relname=ANY($1::text[])",
  [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
 )).rows;
 if(metadata.length!==2||metadata.some(x=>x.rls!==true))return false;
 const policies=(await db.query(
  "SELECT tablename,policyname,cmd,permissive,"+
  "cardinality(roles)::int AS role_count,roles[1]::text AS assigned_role,"+
  "qual IS NOT NULL AS has_using,with_check IS NOT NULL AS has_check "+
  "FROM pg_policies WHERE schemaname='clean' AND "+
  "tablename=ANY($1::text[])",
  [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
 )).rows as Gate4PolicyMetadataV39[];
 const original=policies.filter(x=>!NEW_POLICIES.includes(x.policyname as any));
 if(!gate4Next2PoliciesMatchV39(original,"gate4_alert_prebind_original_v39")||
    !gate4Next2PoliciesMatchV39(original,"gate4_alert_owned_binding_v39")||
    policies.length!==(after?11:7))return false;
 const expectedNew=[
  ["gate4_alert_prebind_original_v39",NEW_POLICIES[0],"SELECT",NEXT2_RECEIVER,true,false],
  ["gate4_alert_prebind_original_v39",NEW_POLICIES[1],"INSERT",NEXT2_RECEIVER,false,true],
  ["gate4_alert_owned_binding_v39",NEW_POLICIES[2],"SELECT",NEXT2_WRITER,true,false],
  ["gate4_alert_owned_binding_v39",NEW_POLICIES[3],"INSERT",NEXT2_WRITER,false,true]
 ] as const;
 if(after){
  if(!expectedNew.every(([t,n,c,r,u,w])=>policies.some(p=>
    p.tablename===t&&p.policyname===n&&p.cmd===c&&
    p.assigned_role===r&&p.role_count===1&&
    p.permissive==="PERMISSIVE"&&p.has_using===u&&p.has_check===w)))
   return false;
 }
 const roles=(await db.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,"+
  "rolinherit,rolcreaterole,rolcreatedb,rolreplication "+
  "FROM pg_roles WHERE rolname=ANY($1::text[])",
  [[NEXT2_RECEIVER,NEXT2_WRITER,
    "gate4_receiver_20261022","gate4_receiver_2026_next1",
    "gate4_owner_writer_20261023","gate4_owner_writer_2026_next1",
    "gate4_safety_reader_20261022"]]
 )).rows;
 const exists=(n:string)=>roles.find(x=>x.rolname===n);
 const safe=(n:string,login?:boolean,newRole=false)=>{
  const x=exists(n);
  return !!x&&x.rolsuper===false&&x.rolbypassrls===false&&
   x.rolcreaterole===false&&x.rolcreatedb===false&&
   x.rolreplication===false&&
   (login===undefined||x.rolcanlogin===login)&&
   (!newRole||x.rolinherit===false);
 };
 if(!safe("gate4_receiver_20261022")||
    !safe("gate4_receiver_2026_next1")||
    !safe("gate4_safety_reader_20261022")||
    !safe("gate4_owner_writer_20261023",false)||
    !safe("gate4_owner_writer_2026_next1")||
    (after?!(safe(NEXT2_RECEIVER,true,true)&&safe(NEXT2_WRITER,true,true)):
     !!(exists(NEXT2_RECEIVER)||exists(NEXT2_WRITER))))return false;
 if(after){
  for(const [role,table,other] of [
   [NEXT2_RECEIVER,"gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"],
   [NEXT2_WRITER,"gate4_alert_owned_binding_v39","gate4_alert_prebind_original_v39"]
  ]){
   const rights=(await db.query(
    "SELECT has_schema_privilege($1,'clean','USAGE') AS usage,"+
    "has_schema_privilege($1,'clean','CREATE') AS ddl,"+
    "has_table_privilege($1,'clean.'||$2,'SELECT') AS reading,"+
    "has_table_privilege($1,'clean.'||$2,'INSERT') AS writing,"+
    "has_table_privilege($1,'clean.'||$2,'UPDATE') AS updating,"+
    "has_table_privilege($1,'clean.'||$2,'DELETE') AS deleting,"+
    "has_table_privilege($1,'clean.'||$3,'SELECT') AS cross_read",
    [role,table,other]
   )).rows[0];
   if(rights?.usage!==true||rights.ddl!==false||
      rights.reading!==true||rights.writing!==true||
      rights.updating!==false||rights.deleting!==false||
      rights.cross_read!==false)return false;
  }
 }
 return true;
}
export function gate4Next2RoleDDLV39(role:string,password:string,expiry:string,limit:number):string{
 if(![NEXT2_RECEIVER,NEXT2_WRITER].includes(role as any)||
    !/^[a-f0-9]{80}$/.test(password)||
    !/^\d{4}-\d{2}-\d{2}T.*\.\d{3}Z$/.test(expiry)||
    ![1,4].includes(limit))hold();
 return "CREATE ROLE "+role+
  " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
  "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT "+limit+
  " PASSWORD '"+password+"' VALID UNTIL '"+expiry+"'";
}
export function gate4Next2ScopedStatementsV39(auth:string):string[]{
 if(!/^[a-f0-9]{64}$/.test(auth))hold();
 const raw="clean.gate4_alert_prebind_original_v39";
 const own="clean.gate4_alert_owned_binding_v39";
 const pred="scope_id='"+NEXT2_SCOPE+"'::uuid AND "+
  "authorization_sha256='"+auth+"' AND "+
  "source_commit='"+FROZEN_RECEIVER_SOURCE+"' AND "+
  "airport_icao='WSSS'";
 return [
  "GRANT CONNECT ON DATABASE neondb TO "+NEXT2_RECEIVER,
  "GRANT USAGE ON SCHEMA clean TO "+NEXT2_RECEIVER,
  "GRANT SELECT,INSERT ON TABLE "+raw+" TO "+NEXT2_RECEIVER,
  "CREATE POLICY "+NEW_POLICIES[0]+" ON "+raw+
   " FOR SELECT TO "+NEXT2_RECEIVER+" USING ("+pred+")",
  "CREATE POLICY "+NEW_POLICIES[1]+" ON "+raw+
   " FOR INSERT TO "+NEXT2_RECEIVER+" WITH CHECK ("+pred+")",
  "GRANT CONNECT ON DATABASE neondb TO "+NEXT2_WRITER,
  "GRANT USAGE ON SCHEMA clean TO "+NEXT2_WRITER,
  "GRANT SELECT,INSERT ON TABLE "+own+" TO "+NEXT2_WRITER,
  "CREATE POLICY "+NEW_POLICIES[2]+" ON "+own+
   " FOR SELECT TO "+NEXT2_WRITER+" USING ("+pred+")",
  "CREATE POLICY "+NEW_POLICIES[3]+" ON "+own+
   " FOR INSERT TO "+NEXT2_WRITER+" WITH CHECK ("+pred+")"
 ];
}
function connection(ownerUrl:string,role:string,password:string):string{
 const u=new URL(ownerUrl);
 u.username=role;u.password=password;
 u.searchParams.set("sslmode","verify-full");
 return u.toString();
}
export async function gate4Next2CommissionNoProviderV39(mode:string):Promise<void>{
 let stage="ADMISSION",db:pg.Client|undefined,tx=false,prepared=false;
 try{
  if(!["--prepare","--plan","--apply"].includes(mode))hold();
  const reviewed=process.env.GATE4_NEXT2_REVIEWED_COMMISSION_SHA??"";
  const local=execFileSync("git",["rev-parse","HEAD"],{
   encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  if(!/^[a-f0-9]{40}$/.test(reviewed)||reviewed!==local)hold();
  if(mode==="--prepare"){
   stage="PRIVATE_PREPARE";privateDir();
   if(existsSync(MANIFEST)||existsSync(INTENT))hold();
   const m:Manifest={
    schema:"v39.gate4.next2.private-no-provider.v1",
    scopeId:NEXT2_SCOPE,sourceSha:FROZEN_RECEIVER_SOURCE,
    receiverRole:NEXT2_RECEIVER,writerRole:NEXT2_WRITER,
    nonce:randomBytes(32).toString("hex"),
    createdAtUtc:new Date().toISOString(),
    authorizationSha256:"",
    providerCreateAuthorized:false,providerRefillAuthorized:false
   };
   m.authorizationSha256=hash(manifestInputs(m));
   writeOnce(MANIFEST,m);
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_PRIVATE_NO_PROVIDER_SCOPE_PREPARED",
    scope:NEXT2_SCOPE,source:FROZEN_RECEIVER_SOURCE,
    providerRequests:0,databaseWrites:0
   }));
   return;
  }
  const manifest=readManifest();
  if(mode==="--apply"&&process.env.GATE4_NEXT2_APPLY_CONFIRM!==
     "AUTHORIZE_NEXT2_NEW_SCOPED_ROLES_NO_PROVIDER")hold();
  stage="DATABASE_ADMISSION";
  const {ownerUrl,expectedActor}=exactDB();
  db=new pg.Client({
   connectionString:ownerUrl,connectionTimeoutMillis:6000,
   query_timeout:8000,statement_timeout:8000,
   application_name:"gate4_next2_additive_commission"
  });
  await db.connect();
  await db.query("BEGIN TRANSACTION READ ONLY");tx=true;
  if(!await inspect(db,expectedActor,true,false))hold();
  await db.query("ROLLBACK");tx=false;
  if(mode==="--plan"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_SCOPED_NO_PROVIDER_PLAN_PASS",
    roleCountProposed:2,newPoliciesProposed:4,
    existingPoliciesPreserved:7,originalRowsPreserved:1,
    bindingRowsPreserved:2,providerRequests:0,databaseWrites:0
   }));return;
  }
  stage="PREPARE_SINGLE_COMMISSION";
  privateDir();
  if([INTENT,RECEIVER_CREDENTIAL,WRITER_CREDENTIAL,DEPLOYMENT]
     .some(existsSync))hold();
  const passwordR=randomBytes(40).toString("hex");
  const passwordW=randomBytes(40).toString("hex");
  const expiresUtc=new Date(Date.now()+6*3600_000).toISOString();
  // Intent and BOTH private scoped credentials are durable before database DDL.
  // On any ambiguous commit leave them intact, NEVER auto-retry.
  writeOnce(INTENT,{
   schema:"v39.gate4.next2.one-commission-intent.v1",
   reviewedMainSha:local,scopeId:NEXT2_SCOPE,
   receiverSource:FROZEN_RECEIVER_SOURCE,
   createdAtUtc:new Date().toISOString(),noSecondApply:true,
   providerAuthorized:false
  });prepared=true;
  writeOnce(RECEIVER_CREDENTIAL,{
   schema:"v39.gate4.next2.receiver-private.v1",
   role:NEXT2_RECEIVER,scope:NEXT2_SCOPE,source:FROZEN_RECEIVER_SOURCE,
   authorizationSha256:manifest.authorizationSha256,
   expiresUtc,receiverUrl:connection(ownerUrl,NEXT2_RECEIVER,passwordR)
  });
  writeOnce(WRITER_CREDENTIAL,{
   schema:"v39.gate4.next2.writer-private.v1",
   role:NEXT2_WRITER,scope:NEXT2_SCOPE,source:FROZEN_RECEIVER_SOURCE,
   authorizationSha256:manifest.authorizationSha256,
   expiresUtc,writerUrl:connection(ownerUrl,NEXT2_WRITER,passwordW)
  });
  // Replit production Secret handoff stays in private 0700 directory/0600
  // file. Never log this document, use it as published source code, upload it
  // to GitHub, or confuse values presence with actual deployment readiness.
  writeOnce(DEPLOYMENT,{
   schema:"v39.gate4.next2.private-published-settings.v1",
   scopeId:NEXT2_SCOPE,expectedCompiledSource:FROZEN_RECEIVER_SOURCE,
   values:{
    V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
    ADB_AUTO_COLLECT:"false",
    GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
    GATE4_PREBIND_APPROVED_SOURCE_COMMIT:FROZEN_RECEIVER_SOURCE,
    GATE4_PREBIND_SCOPE_ID:NEXT2_SCOPE,
    GATE4_PREBIND_AUTH_SHA256:manifest.authorizationSha256,
    GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
    GATE4_PREBIND_DATABASE_URL:
      connection(ownerUrl,NEXT2_RECEIVER,passwordR),
    GATE4_PREBIND_APPROVED_DB_HOST:new URL(ownerUrl).hostname,
    GATE4_PREBIND_WEBHOOK_SECRET:randomBytes(40).toString("hex")
   },
   providerCreateAuthorized:false,providerRefillAuthorized:false,
   receiverDeployed:false
  });
  stage="ATOMIC_SCOPED_ROLE_TRANSACTION";
  await db.query("BEGIN");tx=true;
  await db.query("SET LOCAL lock_timeout='2500ms'");
  await db.query("SET LOCAL statement_timeout='7000ms'");
  await db.query("SELECT pg_advisory_xact_lock(3904,20261026)");
  if(!await inspect(db,expectedActor,false,false))hold();
  await db.query(gate4Next2RoleDDLV39(NEXT2_RECEIVER,passwordR,expiresUtc,4));
  await db.query(gate4Next2RoleDDLV39(NEXT2_WRITER,passwordW,expiresUtc,1));
  for(const sql of gate4Next2ScopedStatementsV39(manifest.authorizationSha256))
   await db.query(sql);
  if(!await inspect(db,expectedActor,false,true))hold();
  await db.query("COMMIT");tx=false;
  stage="POST_COMMIT_RECONCILIATION";
  await db.query("BEGIN TRANSACTION READ ONLY");tx=true;
  if(!await inspect(db,expectedActor,true,true))hold();
  await db.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_NEW_ROLES_ADDITIVE_NO_PROVIDER_COMMISSIONED",
   newRoleCount:2,newPolicies:4,allExistingPoliciesPreserved:true,
   oldOriginalRowsPreserved:1,oldOwnerBindingsPreserved:2,
   privateCredentialsWritten:true,privatePublishedSettingsWritten:true,expiresUtc,
   receiverPublished:false,syntheticPosted:false,
   paidAuthorized:false,providerRequests:0,databaseWrites:14
  }));
 }catch{
  if(tx)await db?.query("ROLLBACK").catch(()=>undefined);
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_COMMISSION_HOLD",failedStage:stage,
   privateIntentMayExist:prepared,noAutomaticRetry:true,
   providerRequests:0
  }));
  process.exitCode=2;
 }finally{await db?.end().catch(()=>undefined);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3){console.log("GATE4_NEXT2_COMMISSION_HOLD");process.exitCode=2;}
 else void gate4Next2CommissionNoProviderV39(process.argv[2]);
}
