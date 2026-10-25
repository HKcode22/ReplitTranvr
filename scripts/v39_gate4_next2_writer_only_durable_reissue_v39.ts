/**
 * Gate4 NEXT2 reused synthetic-receiver: restore ONLY the missing V0072
 * owner-writer password into durable, AES-256-GCM private App Storage.
 *
 * --audit: 100% READ ONLY (PG SELECT, App Storage reads, public GET)
 * --reissue-once: separately authorized, NO PROVIDER CALLS: write immutable
 * intent + encrypted writer secret blob, ALTER PASSWORD of the existing
 * isolated NEXT2 V0072 writer role ONLY, verify exact new login/readback.
 *
 * NEVER rotate receiver, retarget RLS, change published endpoint, create
 * provider subscription, reset synthetic data, overwrite NEXT2 sealed values
 * or retry after any ambiguous/partial mutation. No secrets to stdout.
 *
 * Because crypto/PG/AppStorage cannot commit atomically together, any HOLD
 * after the sealed intent exists requires manual recovery, never a retry.
 */
import "dotenv/config";
import pg from "pg";
import {
 createCipheriv,createDecipheriv,hkdfSync,randomBytes,createHash
} from "node:crypto";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 gate4Next2StorageKeyV39,gate4Next2OpenSealedValuesV39,NEXT2_ID
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";

const SRC="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const ROLE="gate4_owner_writer_2026_next2";
const PREFIX="internal/gate4/next2/"+SRC+"/";
const INTENT=PREFIX+"writer-one-shot-reissue-intent-v1.json";
const WRITER=PREFIX+"writer-one-shot-reissue-v1.aes256gcm.json";
const GO="AUTHORIZE_ONE_NEXT2_WRITER_ONLY_NO_PROVIDER_REISSUE";
const HEX40=/^[a-f0-9]{40}$/;
const hold=():never=>{throw Error("GATE4_NEXT2_WRITER_REISSUE_HOLD");};
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");

type Settings=ReturnType<typeof gate4Next2OpenSealedValuesV39>;
type Audit={authorizationSha256:string;rolesValid:boolean};
function derivedKey(salt:Buffer):Buffer{
 const u=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 const s=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 if(u.length<60||s.length<32)hold();
 return Buffer.from(hkdfSync("sha256",
  Buffer.from(u+"\u0000"+s),salt,
  Buffer.from("replittranvr:gate4:next2:writer-reissue:v1"),32));
}
export function sealWriterOnlyV39(data:{
 writerUrl:string;sourceSha:string;scopeId:string;
 authorizationSha256:string;expiresUtc:string
}):Buffer{
 if(data.sourceSha!==SRC||data.scopeId!==NEXT2_ID||
    !/^[a-f0-9]{64}$/.test(data.authorizationSha256)||
    !Number.isFinite(Date.parse(data.expiresUtc)))hold();
 const uri=new URL(data.writerUrl);
 if(!["postgres:","postgresql:"].includes(uri.protocol)||
    decodeURIComponent(uri.username)!==ROLE||!uri.password||
    uri.searchParams.get("sslmode")!=="verify-full")hold();
 const salt=randomBytes(32),iv=randomBytes(12),key=derivedKey(salt);
 try{
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from(
   "v39-gate4-next2-writer:"+NEXT2_ID+":"+SRC+":"+
   data.authorizationSha256));
  const ciphertext=Buffer.concat([
   cipher.update(Buffer.from(JSON.stringify(data))),cipher.final()]);
  return Buffer.from(JSON.stringify({
   schema:"v39.gate4.next2.writer-only-reissue.v1",
   sourceSha:SRC,scopeId:NEXT2_ID,
   authorizationSha256:data.authorizationSha256,
   salt:salt.toString("base64"),iv:iv.toString("base64"),
   tag:cipher.getAuthTag().toString("base64"),
   ciphertext:ciphertext.toString("base64")
  }));
 }finally{key.fill(0);}
}
export function openWriterOnlyV39(encrypted:Buffer,auth:string):
 {writerUrl:string;expiresUtc:string}{
 if(encrypted.length<120||encrypted.length>12000||!
 /^[a-f0-9]{64}$/.test(auth))hold();
 let x:any;try{x=JSON.parse(encrypted.toString("utf8"));}catch{hold();}
 if(x.schema!=="v39.gate4.next2.writer-only-reissue.v1"||
    x.scopeId!==NEXT2_ID||x.sourceSha!==SRC||
    x.authorizationSha256!==auth)hold();
 const salt=Buffer.from(x.salt,"base64");
 const iv=Buffer.from(x.iv,"base64");
 const tag=Buffer.from(x.tag,"base64");
 if(salt.length!==32||iv.length!==12||tag.length!==16)hold();
 const key=derivedKey(salt);
 try{
  const dec=createDecipheriv("aes-256-gcm",key,iv);
  dec.setAAD(Buffer.from(
   "v39-gate4-next2-writer:"+NEXT2_ID+":"+SRC+":"+auth));
  dec.setAuthTag(tag);
  const d=JSON.parse(Buffer.concat([
   dec.update(Buffer.from(x.ciphertext,"base64")),dec.final()
  ]).toString("utf8"));
  if(d.scopeId!==NEXT2_ID||d.sourceSha!==SRC||
   d.authorizationSha256!==auth||!d.writerUrl||
   !Number.isFinite(Date.parse(d.expiresUtc)))hold();
  const u=new URL(d.writerUrl);
  if(decodeURIComponent(u.username)!==ROLE||
   u.searchParams.get("sslmode")!=="verify-full")hold();
  return {writerUrl:d.writerUrl,expiresUtc:d.expiresUtc};
 }catch{hold();}finally{key.fill(0);}
}
async function inspect(client:pg.Client,auth:string):Promise<Audit>{
 const rows=await client.query(
  "SELECT original_wire,original_sha256,source_commit,"+
  "authorization_sha256,airport_icao,claimed_provider_subscription_id "+
  "FROM clean.gate4_alert_prebind_original_v39 WHERE scope_id=$1::uuid",
  [NEXT2_ID]);
 const owners=await client.query(
  "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39 "+
  "WHERE scope_id=$1::uuid",[NEXT2_ID]);
 const roles=await client.query(
  "SELECT rolname,rolcanlogin,rolvaliduntil,rolsuper,rolcreaterole,"+
  "rolcreatedb,rolbypassrls FROM pg_roles "+
  "WHERE rolname=ANY($1::name[])",
  [["gate4_receiver_2026_next2",ROLE]]);
 const policies=await client.query(
  "SELECT policyname,tablename,cmd,roles::text AS roles "+
  "FROM pg_policies WHERE schemaname='clean' AND "+
  "policyname=ANY($1::name[])",
  [[
   "gate4_next2_receiver_select_v39",
   "gate4_next2_receiver_insert_v39",
   "gate4_next2_writer_select_v39",
   "gate4_next2_writer_insert_v39"
  ]]);
 const r=rows.rows[0];
 if(rows.rows.length!==1||owners.rows[0]?.n!==0||
  !Buffer.isBuffer(r?.original_wire)||
  sha(r.original_wire)!==r.original_sha256||
  r.source_commit!==SRC||r.authorization_sha256!==auth||
  r.airport_icao!=="WSSS"||
  !/^g4synthetic_[a-f0-9]{24}$/.test(
   String(r.claimed_provider_subscription_id??"")))hold();
 if(roles.rows.length!==2||roles.rows.some((x:any)=>
   !x.rolcanlogin||x.rolsuper||x.rolcreaterole||
   x.rolcreatedb||x.rolbypassrls||
   Date.parse(x.rolvaliduntil)<Date.now()+20*60_000))hold();
 // The existing 4 policy names must still be scoped to NEXT2 roles.
 if(policies.rows.length!==4)hold();
 const expected=[
  ["gate4_next2_receiver_select_v39","SELECT","gate4_receiver_2026_next2"],
  ["gate4_next2_receiver_insert_v39","INSERT","gate4_receiver_2026_next2"],
  ["gate4_next2_writer_select_v39","SELECT",ROLE],
  ["gate4_next2_writer_insert_v39","INSERT",ROLE]
 ] as const;
 for(const [name,cmd,role] of expected){
  const p=policies.rows.find((x:any)=>x.policyname===name);
  if(!p||p.cmd!==cmd||!String(p.roles).includes(role))hold();
 }
 return {authorizationSha256:auth,rolesValid:true};
}
function ownerUrl():string{
 const s=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const u=new URL(s);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
   !u.password||u.pathname!=="/neondb")hold();
 return s;
}
async function main():Promise<void>{
 let stage="ADMISSION",intentWritten=false,sealedStored=false;
 let dbCommitted=false,client:pg.Client|undefined;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||!["--audit","--reissue-once"].includes(mode))
   hold();
  if(mode==="--reissue-once"){
   if(process.env.GATE4_NEXT2_WRITER_REISSUE_GO!==GO||
    !HEX40.test(String(process.env.GATE4_NEXT2_WRITER_REISSUE_OPERATOR_SHA??"")))
    hold();
   const actual=execFileSync("git",["rev-parse","HEAD"],
     {encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
   if(actual!==process.env.GATE4_NEXT2_WRITER_REISSUE_OPERATOR_SHA)hold();
  }
  const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
  if(!bucket.startsWith("replit-objstore-"))hold();
  const storage=new ReplitProviderBlobStoreV39(bucket);
  if(!await storage.exists(gate4Next2StorageKeyV39(SRC)))hold();
  const v:Settings=gate4Next2OpenSealedValuesV39(
   await storage.downloadBytes(gate4Next2StorageKeyV39(SRC)),SRC,process.env);
  if(await storage.exists(INTENT)||await storage.exists(WRITER))hold();
  const own=ownerUrl();
  client=new pg.Client({connectionString:own,
   connectionTimeoutMillis:6000,query_timeout:8500,statement_timeout:8500});
  await client.connect();
  stage="STRICT_SCOPED_READONLY_AUDIT";
  await client.query("BEGIN READ ONLY");
  await inspect(client,v.GATE4_PREBIND_AUTH_SHA256);
  await client.query("ROLLBACK");
  if(mode==="--audit"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_WRITER_ONLY_REISSUE_READONLY_READY",
    reviewedReceiverSource:SRC,scopeId:NEXT2_ID,
    syntheticRows:1,providerOriginalRows:0,
    ownerBindings:0,writerRoleExists:true,
    receiverRoleUnchanged:true,writerSealedObjectAbsent:true,
    providerCalls:0,databaseWrites:0,appStorageWrites:0,
    paidAuthorized:false
   }));
   return;
  }
  stage="PERSIST_ONE_TIME_WRITER_INTENT";
  const nonce=randomBytes(24).toString("hex");
  const intent=Buffer.from(JSON.stringify({
   schema:"v39.gate4.next2.writer-reissue-intent.v1",
   sourceSha:SRC,scopeId:NEXT2_ID,
   authorizationSha256:v.GATE4_PREBIND_AUTH_SHA256,
   intentNonceSha256:sha(Buffer.from(nonce)),
   createdAtUtc:new Date().toISOString(),paidAuthorized:false,noRetry:true
  })+"\n");
  if(await storage.exists(INTENT))hold();
  await storage.uploadBytes(INTENT,intent);
  intentWritten=true;
  if(!Buffer.from(await storage.downloadBytes(INTENT)).equals(intent))hold();
  stage="WRITE_PRIVATE_SEALED_WRITER";
  const oldOwner=new URL(own);
  const pass=randomBytes(40).toString("hex");
  const newWriter=new URL(own);
  newWriter.username=ROLE;
  newWriter.password=pass;
  newWriter.searchParams.set("sslmode","verify-full");
  const expires=new Date(Date.now()+48*3600_000).toISOString();
  const blob=sealWriterOnlyV39({
   writerUrl:newWriter.toString(),sourceSha:SRC,scopeId:NEXT2_ID,
   authorizationSha256:v.GATE4_PREBIND_AUTH_SHA256,
   expiresUtc:expires
  });
  await storage.uploadBytes(WRITER,blob);
  sealedStored=true;
  const sealed=Buffer.from(await storage.downloadBytes(WRITER));
  const opened=openWriterOnlyV39(sealed,v.GATE4_PREBIND_AUTH_SHA256);
  if(opened.writerUrl!==newWriter.toString()||
     opened.expiresUtc!==expires)hold();
  stage="CHANGE_WRITER_PASSWORD_ONLY";
  await client.query("BEGIN");
  try{
   await client.query("SET LOCAL lock_timeout='2500ms'");
   await inspect(client,v.GATE4_PREBIND_AUTH_SHA256);
   // Existing fixed DB role name, never derived from a callback/provider ID.
   await client.query(
    "ALTER ROLE "+ROLE+" PASSWORD '"+pass+"' VALID UNTIL '"+expires+"'");
   await client.query("COMMIT");
   dbCommitted=true;
  }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}
  stage="RESTRICTED_WRITER_LOGIN_READBACK";
  const writer=new pg.Client({connectionString:opened.writerUrl,
   connectionTimeoutMillis:6000,query_timeout:6500,
   options:"-c default_transaction_read_only=on"});
  try{
   await writer.connect();
   const r=(await writer.query(
    "SELECT current_user AS actor,current_database() AS db"
   )).rows[0];
   if(r?.actor!==ROLE||r?.db!=="neondb")hold();
  }finally{await writer.end().catch(()=>{});}
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_WRITER_ONLY_DURABLE_REISSUE_PASS",
   scopeId:NEXT2_ID,sourceSha:SRC,
   writerRoleOnlyRotated:true,receiverRoleUnchanged:true,
   existingFourPoliciesUnchanged:true,
   writerEncryptedAppStorageVerified:true,
   writerExpiresUtc:expires,
   providerCalls:0,providerCreates:0,
   paidAuthorized:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_WRITER_ONLY_REISSUE_HOLD",failedStage:stage,
   intentWritten,sealedStored,dbCommitted,noAutomaticRetry:true,
   providerCalls:0,paidAuthorized:false
  }));
  process.exitCode=2;
 }finally{await client?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void main();
