/**
 * Gate 4 NEXT2: recover unpublished private credentials after Replit home reset.
 * --audit: DB read only, no provider calls.
 * --rotate-and-seal: one explicitly authorized no-provider scoped rotation.
 * KEEP previously published Phase2G and NEXT1 identities, rows, policies intact.
 * DO NOT print credentials, policy SQL/predicates, URLs, hashes or payloads.
 */
import "dotenv/config";
import pg from "pg";
import {
 createHash,createHmac,randomBytes
} from "node:crypto";
import {
 existsSync,lstatSync,mkdirSync,openSync,writeSync,fsyncSync,closeSync
} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
import {execFileSync,spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 NEXT2_ID,gate4Next2StorageKeyV39,gate4Next2SealValuesV39,
 gate4Next2OpenSealedValuesV39,gate4Next2ValidateValuesV39
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";
import {
 NEXT2_RECEIVER,NEXT2_WRITER,HISTORICAL_SCOPE,FROZEN_RECEIVER_SOURCE,
 gate4Next2PoliciesMatchV39
} from "./v39_gate4_next2_production_readonly_inventory_v39";

const SOURCE="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const APP="https://replit-tranvr--hk84164.replit.app";
const ROOT=join(homedir(),".config","replittranvr");
const DIR=join(ROOT,"gate4-next2-20261024");
const ORIGINAL="clean.gate4_alert_prebind_original_v39";
const BINDING="clean.gate4_alert_owned_binding_v39";
const POLICIES=[
 {name:"gate4_next2_receiver_select_v39",table:ORIGINAL,cmd:"SELECT",role:NEXT2_RECEIVER,clause:"qual"},
 {name:"gate4_next2_receiver_insert_v39",table:ORIGINAL,cmd:"INSERT",role:NEXT2_RECEIVER,clause:"with_check"},
 {name:"gate4_next2_writer_select_v39",table:BINDING,cmd:"SELECT",role:NEXT2_WRITER,clause:"qual"},
 {name:"gate4_next2_writer_insert_v39",table:BINDING,cmd:"INSERT",role:NEXT2_WRITER,clause:"with_check"}
] as const;

function hold():never{throw Error("GATE4_NEXT2_CUSTODY_ROTATION_HOLD");}
function sameHost(a:URL,b:URL):boolean{
 return a.hostname.replace("-pooler.",".")===b.hostname.replace("-pooler.",".") &&
  a.pathname===b.pathname && (a.port||"5432")===(b.port||"5432");
}
export function recoverNext2PredicateV39(
 expression:unknown,oldSource=FROZEN_RECEIVER_SOURCE
):string|null {
 if(typeof expression!=="string"||expression.length>1200 ||
   /\b(OR|NOT|EXISTS|SELECT)\b/i.test(expression))return null;
 // pg_policies.qual/with_check is PostgreSQL-deparsed SQL: VARCHAR
 // comparisons often appear as ((field)::text = 'value'::text), not as
 // field = 'value'. Accept only the exact four AND-ed equalities; no OR,
 // extra conditions, functions, unknown casts or loosened predicates.
 const normalized=expression.replace(/::(?:text|uuid)\b/gi,"")
  .replace(/[()]/g,"").replace(/\s+/g,"");
 const clauses=normalized.split(/AND/i);
 if(clauses.length!==4)return null;
 const wanted=[
  ["scope_id","[0-9a-f-]{36}"],["authorization_sha256","[a-f0-9]{64}"],
  ["source_commit","[a-f0-9]{40}"],["airport_icao","[A-Z]{4}"]
 ] as const;
 const found=new Map<string,string>();
 for(const clause of clauses){
  let matched=false;
  for(const [field,pattern] of wanted){
   const m=clause.match(new RegExp("^"+field+"='("+pattern+")'$"));
   if(m){
    if(found.has(field))return null;
    found.set(field,m[1]);matched=true;break;
   }
  }
  if(!matched)return null;
 }
 if(found.size!==4||found.get("scope_id")!==NEXT2_ID||
  found.get("source_commit")!==oldSource||
  found.get("airport_icao")!=="WSSS")return null;
 return found.get("authorization_sha256")??null;
}
function envReady():{ownerUrl:string;ownerActor:string;bucket:string}{
 const stable=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 const owner=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const secret=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
 let a:URL,b:URL;
 try{a=new URL(stable);b=new URL(owner);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(a.protocol)||
  !["postgres:","postgresql:"].includes(b.protocol)||
  !a.password||!b.password||a.pathname!=="/neondb"||!sameHost(a,b)||
  a.username===b.username||secret.length<32||
  !bucket.startsWith("replit-objstore-"))hold();
 return {ownerUrl:owner,ownerActor:decodeURIComponent(b.username),bucket};
}
function reviewed():void{
 const expected=String(process.env.GATE4_NEXT2_RECOVERY_OPERATOR_SHA??"");
 const head=execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim();
 if(!/^[a-f0-9]{40}$/.test(expected)||head!==expected ||
  process.env.GATE4_NEXT2_ROTATE_GO!=="RECOVER_LOST_NEXT2_NO_PROVIDER")
  hold();
}
/**
 * curl succeeds from the Replit owner shell where Node fetch can time out.
 * Sensitive authentication headers are passed only through stdin (curl
 * --config -), never CLI argv, GitHub, logs, URLs or error output.
 * This exclusively queries two existing no-provider, read-only host routes.
 */
export function gate4Next2SafeCurlConfigV39(headers:string[]):string{
 if(headers.length<1||headers.length>2)hold();
 for(const h of headers){
  if(!/^x-v39-phase2g-[a-z-]+: [\x21-\x7e]{32,256}$/.test(h)||
     /[\r\n\\"]/.test(h))hold();
 }
 return headers.map(h=>"header = "+JSON.stringify(h)).join("\n")+"\n";
}
function publishedKeyStatusV39(path:string,headers:string[]):boolean{
 if(![
  "/__v39/phase2g/webhook-secret-match",
  "/__v39/phase2g/runtime-db-binding"
 ].includes(path))hold();
 const config=gate4Next2SafeCurlConfigV39(headers);
 const result=spawnSync("curl",[
  "--silent","--request","POST",
  "--output","/dev/null","--write-out","%{http_code}",
  "--connect-timeout","5","--max-time","12",
  "--retry","0","--proto","=https",
  "--config","-",APP+path
 ],{
  input:config,encoding:"utf8",timeout:15000,maxBuffer:1024,
  stdio:["pipe","pipe","pipe"]
 });
 // Never expose child stderr/stdout other than comparing the private status.
 return result.status===0&&String(result.stdout??"").trim()==="200";
}
async function verifyPublishedOldKeys():Promise<void>{
 const secret=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 if(!publishedKeyStatusV39("/__v39/phase2g/webhook-secret-match",[
  "x-v39-phase2g-webhook-secret: "+secret
 ]))hold();
 const challenge="gate4_custody_"+randomBytes(16).toString("hex");
 const proof=createHmac("sha256",String(process.env.V39_DATABASE_RUNTIME_URL))
  .update("phase2g-db-binding:"+challenge).digest("hex");
 if(!publishedKeyStatusV39("/__v39/phase2g/runtime-db-binding",[
  "x-v39-phase2g-db-challenge: "+challenge,
  "x-v39-phase2g-db-proof: "+proof
 ]))hold();
}
async function catalog(db:pg.Client,actor:string,readonly:boolean,
 mark:(guard:string)=>void=()=>{}):
 Promise<{authorization:string}> {
 mark("OWNER_SESSION");
 const info=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('transaction_read_only') AS readonly,"+
  "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS admin"
 )).rows[0];
 if(info?.db!=="neondb"||info.actor!==actor||
  info.readonly!==(readonly?"on":"off")||info.admin!==true)hold();
 mark("RLS_TABLE_FLAGS");
 const flags=(await db.query(
  "SELECT c.relname,c.relrowsecurity FROM pg_class c "+
  "JOIN pg_namespace n ON n.oid=c.relnamespace "+
  "WHERE n.nspname='clean' AND c.relname=ANY($1::text[])",
  [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
 )).rows;
 if(flags.length!==2||flags.some(x=>x.relrowsecurity!==true))hold();
 mark("ORIGINAL_ROW_COUNT");
 const records=(await db.query(
  "SELECT scope_id::text AS s,count(*)::int AS n FROM "+ORIGINAL+
  " GROUP BY scope_id"
 )).rows;
 if(records.length!==1||records[0].s!==HISTORICAL_SCOPE||
  records[0].n!==1)hold();
 mark("BINDING_ROW_COUNT");
 const bindings=(await db.query("SELECT count(*)::int AS n FROM "+BINDING)).rows;
 if(bindings.length!==1||bindings[0].n!==2)hold();
 mark("RLS_POLICY_METADATA");
 const rows=(await db.query(
  "SELECT tablename,policyname,cmd,permissive,"+
  "cardinality(roles)::int AS role_count,roles[1]::text AS assigned_role,"+
  "qual,with_check,(qual IS NOT NULL) AS has_using,"+
  "(with_check IS NOT NULL) AS has_check "+
  "FROM pg_policies WHERE schemaname='clean'"+
  " AND tablename=ANY($1::text[])",
  [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
 )).rows;
 if(rows.length!==11)hold();
 mark("LEGACY_SEVEN_POLICIES");
 for(const table of ["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]){
  if(!gate4Next2PoliciesMatchV39(
   rows.filter(p=>!p.policyname.startsWith("gate4_next2_")),table
  ))hold();
 }
 let authorization:string|undefined;
 mark("NEXT2_POLICY_SHAPES");
 for(const required of POLICIES){
  const found=rows.filter(p=>p.policyname===required.name);
  if(found.length!==1)hold();
  const p=found[0];
  if("clean."+p.tablename!==required.table||p.cmd!==required.cmd||
   p.assigned_role!==required.role||p.role_count!==1||
   p.permissive!=="PERMISSIVE"||
   (required.clause==="qual" ? p.with_check!==null : p.qual!==null))hold();
  mark("NEXT2_PREDICATE_DEPARSE");
  const digest=recoverNext2PredicateV39(p[required.clause]);
  if(!digest||(authorization!==undefined&&authorization!==digest))hold();
  authorization=digest;
 }
 mark("NEXT2_ROLE_FLAGS");
 const roles=(await db.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolbypassrls FROM pg_roles "+
  "WHERE rolname=ANY($1::text[])",[[NEXT2_RECEIVER,NEXT2_WRITER]]
 )).rows;
 if(roles.length!==2||roles.some(x=>!x.rolcanlogin||x.rolinherit||
  x.rolbypassrls))hold();
 if(!authorization)hold();
 return {authorization};
}
function writePrivate(name:string,data:unknown):void{
 const fd=openSync(join(DIR,name),"wx",0o600);
 try{writeSync(fd,JSON.stringify(data)+"\n");fsyncSync(fd);}
 finally{closeSync(fd);}
}
function protectedDirectory(path:string):void{
 if(!existsSync(path))mkdirSync(path,{mode:0o700});
 const s=lstatSync(path);
 if(!s.isDirectory()||(s.mode&0o077)!==0)hold();
}
function connection(ownerUrl:string,role:string,password:string):string{
 const u=new URL(ownerUrl);
 u.username=role;u.password=password;
 u.searchParams.set("sslmode","verify-full");
 return u.toString();
}
async function main():Promise<void>{
 let db:pg.Client|undefined,stage="ADMISSION",storageWrites=0;
 let dbChanged=false,auditMode=false,auditGuard="OWNER_CONNECTION";
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
   !["--audit","--rotate-and-seal"].includes(mode))hold();
  const cfg=envReady();
  auditMode=mode==="--audit";
  if(mode==="--rotate-and-seal")reviewed();
  stage="DB_READONLY";
  db=new pg.Client({connectionString:cfg.ownerUrl,
   connectionTimeoutMillis:6000,query_timeout:10000,statement_timeout:10000});
  await db.connect();
  await db.query("BEGIN TRANSACTION READ ONLY");
  let audit;
  try{audit=await catalog(db,cfg.ownerActor,true,g=>{auditGuard=g;});}
  finally{await db.query("ROLLBACK").catch(()=>{});}
  if(mode==="--audit"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_EXISTING_SCOPE_RECOVERY_READONLY_PASS",
    existingScopedRoles:2,existingNext2Policies:4,
    oldPoliciesPreserved:7,legacyOriginalRows:1,
    previousOwnerBindings:2,providerCalls:0,databaseWrites:0
   }));
   return;
  }
  stage="PUBLISHED_OLD_KEY_PARITY";
  await verifyPublishedOldKeys();
  stage="PRIVATE_CUSTODY_ADMISSION";
  if(existsSync(DIR))hold();
  const storage=new ReplitProviderBlobStoreV39(cfg.bucket);
  const objectName=gate4Next2StorageKeyV39(SOURCE);
  if(await storage.exists(objectName))hold();
  const receiverPassword=randomBytes(40).toString("hex");
  const writerPassword=randomBytes(40).toString("hex");
  const bearer=randomBytes(40).toString("hex");
  const ownerUrl=new URL(cfg.ownerUrl);
  const recvUrl=connection(cfg.ownerUrl,NEXT2_RECEIVER,receiverPassword);
  const writerUrl=connection(cfg.ownerUrl,NEXT2_WRITER,writerPassword);
  const expiry=new Date(Date.now()+48*3600_000).toISOString();
  const values=gate4Next2ValidateValuesV39({
   V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
   ADB_AUTO_COLLECT:"false",
   GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
   GATE4_PREBIND_APPROVED_SOURCE_COMMIT:SOURCE,
   GATE4_PREBIND_SCOPE_ID:NEXT2_ID,
   GATE4_PREBIND_AUTH_SHA256:audit.authorization,
   GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
   GATE4_PREBIND_DATABASE_URL:recvUrl,
   GATE4_PREBIND_APPROVED_DB_HOST:ownerUrl.hostname,
   GATE4_PREBIND_WEBHOOK_SECRET:bearer
  },SOURCE);
  mkdirSync(join(homedir(),".config"),{recursive:true,mode:0o700});
  protectedDirectory(ROOT);
  protectedDirectory(DIR);
  writePrivate("recovery-intent.json",{
   schema:"v39.gate4.next2.custody-recovery-intent.v1",
   sourceSha:SOURCE,scopeId:NEXT2_ID,
   originalCompiledSource:FROZEN_RECEIVER_SOURCE,
   recoveredAtUtc:new Date().toISOString(),roleExpiryUtc:expiry,
   noAutomaticRetry:true,providerPaidAuthorized:false
  });
  writePrivate("receiver-credential.json",{
   schema:"v39.gate4.next2.receiver-private.v1",
   scope:NEXT2_ID,role:NEXT2_RECEIVER,source:SOURCE,
   authorizationSha256:audit.authorization,expiresUtc:expiry,
   receiverUrl:recvUrl
  });
  writePrivate("writer-credential.json",{
   schema:"v39.gate4.next2.writer-private.v1",
   scope:NEXT2_ID,role:NEXT2_WRITER,source:SOURCE,
   authorizationSha256:audit.authorization,expiresUtc:expiry,
   writerUrl:writerUrl
  });
  writePrivate("published-receiver-settings.json",{
   schema:"v39.gate4.next2.private-published-settings.recovery.v1",
   scopeId:NEXT2_ID,expectedCompiledSource:SOURCE,
   values,providerCreateAuthorized:false,providerRefillAuthorized:false,
   receiverDeployed:false
  });
  stage="ENCRYPTED_OBJECT_STORAGE";
  const encrypted=gate4Next2SealValuesV39(values,SOURCE,process.env);
  await storage.uploadBytes(objectName,encrypted);
  storageWrites=1;
  const roundtrip=gate4Next2OpenSealedValuesV39(
   await storage.downloadBytes(objectName),SOURCE,process.env);
  if(JSON.stringify(roundtrip)!==JSON.stringify(values))hold();
  stage="SCOPED_DATABASE_ROTATION";
  await db.query("BEGIN");
  try{
   await db.query("SET LOCAL lock_timeout='2500ms'");
   await db.query("SET LOCAL statement_timeout='10000ms'");
   await catalog(db,cfg.ownerActor,false);
   for(const item of [
    [NEXT2_RECEIVER,receiverPassword],[NEXT2_WRITER,writerPassword]
   ] as const){
    await db.query("ALTER ROLE "+item[0]+" PASSWORD '"+item[1]+
     "' VALID UNTIL '"+expiry+"'");
   }
   const predicate="scope_id='"+NEXT2_ID+"'::uuid AND "+
    "authorization_sha256='"+audit.authorization+"' AND "+
    "source_commit='"+SOURCE+"' AND airport_icao='WSSS'";
   for(const item of POLICIES){
    const clause=item.clause==="qual"?"USING":"WITH CHECK";
    await db.query("ALTER POLICY "+item.name+" ON "+item.table+
     " "+clause+" ("+predicate+")");
   }
   await db.query("COMMIT");
   dbChanged=true;
  }catch(e){await db.query("ROLLBACK").catch(()=>{});throw e;}
  stage="SCOPED_READBACK";
  const recv=new pg.Client({connectionString:recvUrl,connectionTimeoutMillis:6000,
   query_timeout:6000,statement_timeout:6000,
   options:"-c default_transaction_read_only=on"});
  try{
   await recv.connect();
   const x=(await recv.query(
    "SELECT current_user AS actor,current_database() AS db"
   )).rows[0];
   if(x?.actor!==NEXT2_RECEIVER||x?.db!=="neondb")hold();
  }finally{await recv.end().catch(()=>{});}
  writePrivate("sealed-release-install-result.json",{
   schema:"v39.gate4.next2.lost-home-recovery.v1",
   sourceSha:SOURCE,scopeId:NEXT2_ID,
   roleExpiresUtc:expiry,encryptedObject:true,
   fourNext2PoliciesRetargeted:true,twoRolesRotated:true,
   oldSevenPoliciesPreserved:true,providerCalls:0
  });
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_LOST_PRIVATE_RECOVERY_READY_TO_PUBLISH",
   sourceSha:SOURCE,scopeId:NEXT2_ID,newPublishedSecretsRequired:0,
   scopedRolesRotated:2,scopedPoliciesRetargeted:4,
   encryptedObjectVerified:true,roleExpiresUtc:expiry,
   providerCalls:0,providerCreates:0,paidAuthorized:false,
   published:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_LOST_PRIVATE_RECOVERY_HOLD",
   stage,...(auditMode?{failedGuard:auditGuard}:{}),
   privateEncryptedObjectWrites:storageWrites,
   dbMutationCommitted:dbChanged,providerCalls:0,providerCreates:0,
   noAutomaticRetry:true
  }));
  process.exitCode=2;
 }finally{await db?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void main();
