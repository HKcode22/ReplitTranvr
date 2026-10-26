/**
 * NEXT4 one-time NO-PROVIDER restricted receiver + owner writer commissioner.
 * --prepare: local private manifest/credentials ONLY. --plan: DB READ ONLY.
 * --apply-once: exactly two restricted roles/four RLS policies in 1 tx.
 * --seal-once: after DB proof, AES GCM private Replit object storage write.
 * --verify: READ ONLY owner DB and private storage, never provider.
 *
 * Never print IDs, passwords, URLs, raw originals or full SQL.
 * No automatic retry after --apply-once/--seal-once uncertainty.
 */
import "dotenv/config";
import pg from "pg";
import {createHash,randomBytes,randomUUID,hkdfSync,createDecipheriv,timingSafeEqual} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,
 openSync,writeSync,fsyncSync,closeSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {
 NEXT4_RECEIVER_ROLE_V39,gate4Next4ValidateValuesV39,
 gate4Next4ConfigStorageKeyV39,gate4Next4SealValuesV39,
 gate4Next4OpenSealedValuesV39,type Next4ValuesV39
} from "../server/lib/disruption/gate4Next4SealedBootstrap_v39";
import {NEXT3_ID} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
import {NEXT2_ID} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";
import {gate4CheckAdditivePgRoleV39} from
 "../server/lib/disruption/gate4PrebindAdditiveRoute_v39";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";

export const NEXT4_WRITER_ROLE_V39="gate4_owner_writer_2026_next4";
const ROLES=[NEXT4_RECEIVER_ROLE_V39,NEXT4_WRITER_ROLE_V39] as const;
const RAW="gate4_alert_prebind_original_v39";
const OWNED="gate4_alert_owned_binding_v39";
const POLICY=[
 "gate4_next4_receiver_select_v39","gate4_next4_receiver_insert_v39",
 "gate4_next4_writer_select_v39","gate4_next4_writer_insert_v39"
] as const;
const ROOT=join(homedir(),".config","replittranvr","gate4-next4");
const FILE=join(ROOT,"commission.json");
const APPLY=join(ROOT,"apply-once-intent.json");
const RECOVER=join(ROOT,"recover-once-intent.json");
const SEAL=join(ROOT,"seal-once-intent.json");
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA40=/^[a-f0-9]{40}$/,HEX64=/^[a-f0-9]{64}$/;
const hold=():never=>{throw Error("GATE4_NEXT4_COMMISSION_HOLD");};
type Manifest={
 schema:"v39.gate4.next4.commission.v1";
 scope:string;source:string;authorizationSha256:string;
 nonce:string;roleReceiver:string;roleWriter:string;
 receiverPassword:string;writerPassword:string;webhookSecret:string;
 createdAt:string;paidAuthorized:false;
};
const hash=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
function privateRoot(){
 const parent=join(homedir(),".config","replittranvr");
 if(!existsSync(parent))mkdirSync(parent,{recursive:true,mode:0o700});
 if(!existsSync(ROOT))mkdirSync(ROOT,{mode:0o700});
 for(const p of [parent,ROOT]){
  const stat=lstatSync(p);
  if(!stat.isDirectory()||(stat.mode&0o077)!==0)hold();
 }
}
function privateWrite(path:string,data:unknown){
 const fd=openSync(path,"wx",0o600);
 try{writeSync(fd,JSON.stringify(data)+"\n");fsyncSync(fd);}
 finally{closeSync(fd);}
}
async function verifyExistingEncryptedRecoveryV39(source:string):Promise<void>{
 const bucket=new ReplitProviderBlobStoreV39(
  String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??""));
 const backupKey="internal/gate4/next4/recovery/"+source+
  "/commission-v1.aes256gcm.json";
 if(!await bucket.exists(backupKey)||
    await bucket.exists(gate4Next4ConfigStorageKeyV39(source)))hold();
 const envelope=JSON.parse(Buffer.from(
  await bucket.downloadBytes(backupKey)).toString("utf8"));
 if(envelope.schema!=="v39.gate4.next4.commission-recovery.v1"||
    envelope.source!==source)hold();
 const runtime=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 const secret=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 if(!runtime||secret.length<32)hold();
 const ikm=Buffer.from(runtime+"\\0"+secret);
 const key=Buffer.from(hkdfSync("sha256",ikm,
  Buffer.from(envelope.salt,"base64"),
  Buffer.from("replittranvr:gate4:next4:commission-recovery:v1"),32));
 try{
  const decipher=createDecipheriv("aes-256-gcm",key,
   Buffer.from(envelope.iv,"base64"));
  decipher.setAAD(Buffer.from("next4-recovery:"+source));
  decipher.setAuthTag(Buffer.from(envelope.tag,"base64"));
  const recovered=Buffer.concat([
   decipher.update(Buffer.from(envelope.ciphertext,"base64")),
   decipher.final()
  ]);
  const original=readFileSync(FILE);
  try{
   if(original.length!==recovered.length||
      !timingSafeEqual(original,recovered))hold();
  }finally{original.fill(0);recovered.fill(0);}
 }finally{key.fill(0);ikm.fill(0);}
}
function privateLoad():Manifest{
 const st=lstatSync(FILE);
 if(!st.isFile()||(st.mode&0o077)!==0||st.size>16384)hold();
 const x=JSON.parse(readFileSync(FILE,"utf8")) as Manifest;
 if(x.schema!=="v39.gate4.next4.commission.v1"||
  !UUID.test(x.scope)||!SHA40.test(x.source)||
  !HEX64.test(x.nonce)||!HEX64.test(x.authorizationSha256)||
  x.authorizationSha256!==hash({
    scope:x.scope,source:x.source,nonce:x.nonce,
    receiver:NEXT4_RECEIVER_ROLE_V39,writer:NEXT4_WRITER_ROLE_V39
  })||x.roleReceiver!==NEXT4_RECEIVER_ROLE_V39||
  x.roleWriter!==NEXT4_WRITER_ROLE_V39||
  !/^[a-f0-9]{80}$/.test(x.receiverPassword)||
  !/^[a-f0-9]{80}$/.test(x.writerPassword)||
  !/^[a-f0-9]{80}$/.test(x.webhookSecret)||
  x.paidAuthorized!==false||
  !Number.isFinite(Date.parse(x.createdAt))||
  Date.parse(x.createdAt)>Date.now()+30000)hold();
 return x;
}
function checkedOperatorSha():string{
 const reviewed=String(process.env.GATE4_NEXT4_REVIEWED_SOURCE_SHA??"");
 const operator=String(process.env.GATE4_NEXT4_OPERATOR_SHA??"");
 const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 if(!SHA40.test(reviewed)||!SHA40.test(operator)||head!==operator)hold();
 const build=JSON.parse(readFileSync("dist/v39-build-meta.json","utf8"));
 if(build.git_head!==reviewed)hold();
 return reviewed;
}
function connections(){
 const a=new URL(String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??""));
 const b=new URL(String(process.env.V39_DATABASE_RUNTIME_URL??""));
 const norm=(u:URL)=>u.hostname.replace("-pooler.",".")+
  ":"+(u.port||"5432")+u.pathname;
 if(!["postgres:","postgresql:"].includes(a.protocol)||
    !["postgres:","postgresql:"].includes(b.protocol)||
    !a.password||!b.password||a.pathname!=="/neondb"||
    norm(a)!==norm(b)||a.username===b.username)hold();
 return {owner:a.toString(),ownerRole:decodeURIComponent(a.username),host:a.hostname};
}
function roleUrl(owner:string,role:string,password:string):string{
 const u=new URL(owner);
 u.username=role;u.password=password;
 u.searchParams.set("sslmode","verify-full");
 return u.toString();
}
function privateSettings(m:Manifest,owner:string,host:string):Next4ValuesV39{
 return {
  V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
  ADB_AUTO_COLLECT:"false",
  GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
  GATE4_PREBIND_APPROVED_SOURCE_COMMIT:m.source,
  GATE4_PREBIND_SCOPE_ID:m.scope,
  GATE4_PREBIND_AUTH_SHA256:m.authorizationSha256,
  GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
  GATE4_PREBIND_DATABASE_URL:
   roleUrl(owner,NEXT4_RECEIVER_ROLE_V39,m.receiverPassword),
  GATE4_PREBIND_APPROVED_DB_HOST:host,
  GATE4_PREBIND_WEBHOOK_SECRET:m.webhookSecret
 };
}
export function next4PolicySQLV39(m:Pick<Manifest,"scope"|"source"|"authorizationSha256">):string[]{
 if(!UUID.test(m.scope)||m.scope===NEXT3_ID||m.scope===NEXT2_ID||
    m.scope==="d6c0fcac-798e-4913-bfd1-a561adb3dd82"||
    m.scope==="498dccd7-5da3-4687-a6ea-e0dc03b54398"||
    !SHA40.test(m.source)||!HEX64.test(m.authorizationSha256))hold();
 const pred="scope_id='"+m.scope+"'::uuid AND "+
  "authorization_sha256='"+m.authorizationSha256+"' AND "+
  "source_commit='"+m.source+"' AND airport_icao='WSSS'";
 const raw="clean."+RAW,owner="clean."+OWNED;
 return [
  "GRANT CONNECT ON DATABASE neondb TO "+NEXT4_RECEIVER_ROLE_V39,
  "GRANT USAGE ON SCHEMA clean TO "+NEXT4_RECEIVER_ROLE_V39,
  "GRANT SELECT,INSERT ON TABLE "+raw+" TO "+NEXT4_RECEIVER_ROLE_V39,
  "CREATE POLICY "+POLICY[0]+" ON "+raw+" FOR SELECT TO "+
   NEXT4_RECEIVER_ROLE_V39+" USING ("+pred+")",
  "CREATE POLICY "+POLICY[1]+" ON "+raw+" FOR INSERT TO "+
   NEXT4_RECEIVER_ROLE_V39+" WITH CHECK ("+pred+")",
  "GRANT CONNECT ON DATABASE neondb TO "+NEXT4_WRITER_ROLE_V39,
  "GRANT USAGE ON SCHEMA clean TO "+NEXT4_WRITER_ROLE_V39,
  "GRANT SELECT,INSERT ON TABLE "+owner+" TO "+NEXT4_WRITER_ROLE_V39,
  "CREATE POLICY "+POLICY[2]+" ON "+owner+" FOR SELECT TO "+
   NEXT4_WRITER_ROLE_V39+" USING ("+pred+")",
  "CREATE POLICY "+POLICY[3]+" ON "+owner+" FOR INSERT TO "+
   NEXT4_WRITER_ROLE_V39+" WITH CHECK ("+pred+")"
 ];
}
export function next4RoleSQLV39(role:string,password:string,limit:1|4):string{
 if(!ROLES.includes(role as (typeof ROLES)[number])||
    !/^[a-f0-9]{80}$/.test(password)||
    (role===NEXT4_RECEIVER_ROLE_V39&&limit!==4)||
    (role===NEXT4_WRITER_ROLE_V39&&limit!==1))hold();
 return "CREATE ROLE "+role+
 " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
 "NOREPLICATION NOBYPASSRLS CONNECTION LIMIT "+limit+
 " PASSWORD '"+password+"' VALID UNTIL 'infinity'";
}
async function audit(db:pg.Client,actor:string,m:Manifest,phase:"before"|"after"){
 const cur=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS super,"+
  "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS admin,"
  +"has_schema_privilege(current_user,'clean','CREATE') AS ddl"
 )).rows[0];
 if(cur?.db!=="neondb"||cur.actor!==actor||
   cur.super!==false||cur.admin!==true||cur.ddl!==true)hold();
 const tables=(await db.query(
  "SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON "+
  "c.relnamespace=n.oid WHERE n.nspname='clean' AND "+
  "c.relname=ANY($1::text[])",[[RAW,OWNED]]
 )).rows;
 if(tables.length!==2||tables.some(x=>x.relrowsecurity!==true))hold();
 const items=(await db.query(
  "SELECT scope_id::text AS scope,original_sha256 AS sha,original_wire AS wire "+
  "FROM clean."+RAW
 )).rows;
 if(items.some(x=>x.scope===m.scope||
    !Buffer.isBuffer(x.wire)||
    createHash("sha256").update(x.wire).digest("hex")!==x.sha))hold();
 const bindings=(await db.query(
  "SELECT * FROM clean."+OWNED
 )).rows;
 if(bindings.some(x=>String(x.scope_id)===m.scope))hold();
 const roles=(await db.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolinherit,"+
  "rolcreaterole,rolcreatedb,rolreplication FROM pg_roles "+
  "WHERE rolname=ANY($1::text[])",[[...ROLES]]
 )).rows;
 const policies=(await db.query(
  "SELECT tablename,policyname,cmd,permissive,roles::text[] AS roles,qual,with_check "+
  "FROM pg_policies WHERE schemaname='clean' AND "+
  "tablename=ANY($1::text[]) ORDER BY tablename,policyname",
  [[RAW,OWNED]]
 )).rows;
 const theirs=policies.filter(x=>POLICY.includes(x.policyname));
 if(phase==="before"&&(roles.length||theirs.length))hold();
 if(phase==="after"){
  if(roles.length!==2||roles.some(x=>x.rolcanlogin!==true||
      x.rolsuper!==false||x.rolbypassrls!==false||
      x.rolinherit!==false||x.rolcreaterole!==false||
      x.rolcreatedb!==false||x.rolreplication!==false)||
     theirs.length!==4)hold();
  const expected=[
   [RAW,POLICY[0],"SELECT",NEXT4_RECEIVER_ROLE_V39],
   [RAW,POLICY[1],"INSERT",NEXT4_RECEIVER_ROLE_V39],
   [OWNED,POLICY[2],"SELECT",NEXT4_WRITER_ROLE_V39],
   [OWNED,POLICY[3],"INSERT",NEXT4_WRITER_ROLE_V39]
  ];
  for(const [table,name,cmd,role] of expected){
   const p=theirs.find(p=>p.tablename===table&&p.policyname===name);
   const guard=String(cmd==="SELECT"?p?.qual:p?.with_check);
   if(!p||p.cmd!==cmd||p.permissive!=="PERMISSIVE"||
      p.roles?.length!==1||p.roles[0]!==role||
      !guard.includes(m.scope)||!guard.includes(m.source)||
      !guard.includes(m.authorizationSha256))hold();
  }
  for(const [role,table,other] of [
   [NEXT4_RECEIVER_ROLE_V39,RAW,OWNED],
   [NEXT4_WRITER_ROLE_V39,OWNED,RAW]
  ]){
   const perm=(await db.query(
    "SELECT has_schema_privilege($1,'clean','USAGE') AS use,"+
    "has_schema_privilege($1,'clean','CREATE') AS ddl,"+
    "has_table_privilege($1,'clean.'||$2,'SELECT') AS read,"+
    "has_table_privilege($1,'clean.'||$2,'INSERT') AS ins,"+
    "has_table_privilege($1,'clean.'||$2,'UPDATE') AS upd,"+
    "has_table_privilege($1,'clean.'||$2,'DELETE') AS del,"+
    "has_table_privilege($1,'clean.'||$3,'SELECT') AS cross",
    [role,table,other]
   )).rows[0];
   if(!perm||perm.use!==true||perm.ddl!==false||
      perm.read!==true||perm.ins!==true||
      perm.upd!==false||perm.del!==false||perm.cross!==false)hold();
  }
 }
 return {signature:hash({
  oldOriginals:items.map(x=>[x.scope,x.sha]).sort(),
  oldBindings:bindings.map(x=>hash(x)).sort(),
  oldPolicies:policies.filter(x=>!POLICY.includes(x.policyname))
 }),originals:items.length,bindings:bindings.length,policies:policies.length};
}
export async function gate4Next4CommissionV39(
 mode:"--prepare"|"--plan"|"--apply-once"|"--recover-once"|"--seal-once"|"--verify"
):Promise<void>{
 let stage="INIT",db:pg.Client|undefined,tx=false,intent=false;
 try{
  const source=checkedOperatorSha();
  privateRoot();
  if(mode==="--prepare"){
   stage="PREPARE_PRIVATE_ONLY";
   if([FILE,APPLY,RECOVER,SEAL].some(existsSync))hold();
   const m:Manifest={
    schema:"v39.gate4.next4.commission.v1",
    scope:randomUUID(),source,nonce:randomBytes(32).toString("hex"),
    authorizationSha256:"",roleReceiver:NEXT4_RECEIVER_ROLE_V39,
    roleWriter:NEXT4_WRITER_ROLE_V39,
    receiverPassword:randomBytes(40).toString("hex"),
    writerPassword:randomBytes(40).toString("hex"),
    webhookSecret:randomBytes(40).toString("hex"),
    createdAt:new Date().toISOString(),paidAuthorized:false
   };
   m.authorizationSha256=hash({
    scope:m.scope,source:m.source,nonce:m.nonce,
    receiver:NEXT4_RECEIVER_ROLE_V39,writer:NEXT4_WRITER_ROLE_V39
   });
   privateWrite(FILE,m);
   console.log(JSON.stringify({status:"GATE4_NEXT4_PRIVATE_SCOPE_PREPARED",
    newScopeGenerated:true,privateCredentialsSealedLocally:true,
    providerCalls:0,databaseWrites:0,storageWrites:0,paidAuthorized:false}));
   return;
  }
  const m=privateLoad();
  if(m.source!==source)hold();
  const c=connections();
  stage="DATABASE_READONLY_ADMISSION";
  db=new pg.Client({connectionString:c.owner,
   connectionTimeoutMillis:6000,query_timeout:8000,
   application_name:"gate4_next4_no_provider_commission"});
  await db.connect();
  await db.query("BEGIN READ ONLY");tx=true;
  const before=await audit(db,c.ownerRole,m,
   mode==="--recover-once"?"before":existsSync(APPLY)?"after":"before");
  await db.query("ROLLBACK");tx=false;
  if(mode==="--plan"){
   if(existsSync(APPLY))hold();
   console.log(JSON.stringify({status:"GATE4_NEXT4_NO_PROVIDER_SQL_PLAN_READY",
    rolesToAdd:2,policiesToAdd:4,
    historicalOriginalsPreserved:before.originals,
    historicalBindingsPreserved:before.bindings,
    providerCalls:0,databaseWrites:0,storageWrites:0,paidAuthorized:false}));
   return;
  }
  if(mode==="--apply-once"||mode==="--recover-once"){
   const recovery=mode==="--recover-once";
   stage=recovery?"RECOVERY_CHECKS":"APPLY_ONLY_WITH_EXPLICIT_NO_PROVIDER_GO";
   if(recovery){
    if(process.env.GATE4_NEXT4_RECOVERY_GO!==
       "AUTHORIZE_NEXT4_RECOVER_ROLLED_BACK_SQL_NO_PROVIDER"||
       !existsSync(APPLY)||existsSync(RECOVER)||existsSync(SEAL))hold();
    const st=lstatSync(APPLY);
    if(!st.isFile()||(st.mode&0o077)!==0||st.size>1024)hold();
    const prior=JSON.parse(readFileSync(APPLY,"utf8"));
    if(prior.scope!==m.scope||prior.source!==source||
       prior.neverReapply!==true)hold();
    await verifyExistingEncryptedRecoveryV39(source);
    privateWrite(RECOVER,{scope:m.scope,source,
     createdAt:new Date().toISOString(),neverRetry:true});
   }else{
    if(process.env.GATE4_NEXT4_COMMISSION_GO!==
      "AUTHORIZE_NEXT4_NEW_SCOPED_SQL_ROLES_NO_PROVIDER"||
       [APPLY,RECOVER,SEAL].some(existsSync))hold();
    privateWrite(APPLY,{scope:m.scope,source,
     createdAt:new Date().toISOString(),neverReapply:true});
   }
   intent=true;
   stage="PRODUCTION_TRANSACTION_BEGIN";
   await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");tx=true;
   await db.query("SET LOCAL lock_timeout='2500ms'");
   await db.query("SET LOCAL statement_timeout='8000ms'");
   await db.query("SELECT pg_advisory_xact_lock(3904,20261026)");
   stage="PRODUCTION_TRANSACTION_BASELINE_AUDIT";
   const current=await audit(db,c.ownerRole,m,"before");
   if(current.signature!==before.signature)hold();
   stage="PRODUCTION_TRANSACTION_CREATE_RECEIVER";
   await db.query(next4RoleSQLV39(
    NEXT4_RECEIVER_ROLE_V39,m.receiverPassword,4));
   stage="PRODUCTION_TRANSACTION_CREATE_WRITER";
   await db.query(next4RoleSQLV39(
    NEXT4_WRITER_ROLE_V39,m.writerPassword,1));
   let sqlIndex=0;
   for(const sql of next4PolicySQLV39(m)){
    stage="PRODUCTION_TRANSACTION_SQL_"+(++sqlIndex);
    await db.query(sql);
   }
   stage="PRODUCTION_TRANSACTION_POST_AUDIT";
   await audit(db,c.ownerRole,m,"after");
   stage="PRODUCTION_TRANSACTION_COMMIT";
   await db.query("COMMIT");tx=false;
   stage="VERIFY_DB_POSTCOMMIT";
   await db.query("BEGIN READ ONLY");tx=true;
   await audit(db,c.ownerRole,m,"after");
   await db.query("ROLLBACK");tx=false;
   console.log(JSON.stringify({status:"GATE4_NEXT4_ROLE_AND_RLS_READY_NO_PROVIDER",
    rolesAdded:2,policiesAdded:4,
    protectedHistoricalEvidence:true,providerCalls:0,
    paidAuthorized:false,storageWrites:0}));
   return;
  }
  if(!existsSync(APPLY))hold();
  stage="VERIFY_RECEIVER_LOGIN_AND_SCOPE";
  const rv=roleUrl(c.owner,NEXT4_RECEIVER_ROLE_V39,m.receiverPassword);
  const receiver=new pg.Client({connectionString:rv,
   connectionTimeoutMillis:6000,query_timeout:8000});
  try{
   await receiver.connect();
   await gate4CheckAdditivePgRoleV39(receiver,NEXT4_RECEIVER_ROLE_V39);
  }finally{await receiver.end().catch(()=>undefined);}
  stage="CHECK_PRIVATE_OBJECT";
  const v=privateSettings(m,c.owner,c.host);
  gate4Next4ValidateValuesV39(v,source);
  const bucket=new ReplitProviderBlobStoreV39(
   String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??""));
  const key=gate4Next4ConfigStorageKeyV39(source);
  if(mode==="--seal-once"){
   if(process.env.GATE4_NEXT4_SEAL_GO!==
     "AUTHORIZE_NEXT4_ENCRYPTED_CONFIG_STORAGE_NO_PROVIDER"||
      existsSync(SEAL)||await bucket.exists(key))hold();
   privateWrite(SEAL,{scope:m.scope,source,
    createdAt:new Date().toISOString(),neverRewrite:true});
   intent=true;
   stage="ENCRYPT_PRIVATE_APP_STORAGE";
   const bytes=gate4Next4SealValuesV39(v,source,process.env);
   await bucket.uploadBytes(key,bytes);
  }else if(mode!=="--verify")hold();
  stage="VERIFY_PRIVATE_APP_STORAGE_READBACK";
  if(!await bucket.exists(key))hold();
  const actual=gate4Next4OpenSealedValuesV39(
   await bucket.downloadBytes(key),source,process.env);
  if(JSON.stringify(actual)!==JSON.stringify(v))hold();
  console.log(JSON.stringify({
   status:"GATE4_NEXT4_NEW_SOURCE_CONFIG_READY_NO_PROVIDER",
   receiverRoleAuthenticated:true,newScopeProtected:true,
   privateConfigCryptographicReadback:true,
   statusOnly:true,providerCalls:0,paidAuthorized:false,
   publishedDeploymentModified:false
  }));
 }catch(e){
  if(tx)await db?.query("ROLLBACK").catch(()=>undefined);
  console.log(JSON.stringify({
   status:"GATE4_NEXT4_COMMISSION_HOLD",failedStage:stage,
   oneShotIntentMayExist:intent,noAutomaticRetry:true,
   sqlstate:/^[A-Z0-9]{5}$/.test(String((e as {code?:unknown})?.code??""))
    ?String((e as {code?:unknown}).code):"NONE",
   providerCalls:0,paidAuthorized:false
  }));
  process.exitCode=2;
 }finally{await db?.end().catch(()=>undefined);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const mode=process.argv[2];
 if(process.argv.length!==3||![
  "--prepare","--plan","--apply-once","--recover-once","--seal-once","--verify"
 ].includes(mode)){
  console.log("GATE4_NEXT4_COMMISSION_HOLD");process.exitCode=2;
 }else void gate4Next4CommissionV39(
  mode as "--prepare"|"--plan"|"--apply-once"|"--recover-once"|"--seal-once"|"--verify"
 );
}
