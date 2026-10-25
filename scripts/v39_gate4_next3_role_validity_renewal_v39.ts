/**
 * NEXT3 source-locked no-provider role-validity extension, ONE TIME.
 * Leaves SAME PostgreSQL passwords and four RLS policies, receiver AES blob,
 * signer Ed25519 private key, callback runtime and original evidence intact.
 *
 * --audit: all read-only; can run before/after original expiry.
 * --renew-once: durable private intent + AES sealed renewal metadata BEFORE
 *                exact two existing-role ALTER VALID UNTIL in one PG transaction.
 * --verify: independent owner pg_roles + restricted receiver/writer logins.
 * An unknown outcome after intent is never automatically retried.
 */
import "dotenv/config";
import pg from "pg";
import {createCipheriv,createDecipheriv,createHash,hkdfSync,randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {NEXT3_ID,NEXT3_RECEIVER_ROLE,gate4Next3StorageKeyV39,
 gate4Next3OpenSealedValuesV39} from
 "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
import {
 NEXT3_SOURCE_V39,NEXT3_OWNER_ROLE_V39,NEXT3_OWNER_BLOB_V39,
 NEXT3_OWNER_INTENT_V39,NEXT3_OWNER_PREFIX_V39,openNext3OwnerCustodyV39
} from "./v39_gate4_next3_no_provider_writer_signer_seal_v39";

export const NEXT3_RENEW_INTENT_V39=NEXT3_OWNER_PREFIX_V39+
 "role-validity-extend-once-intent-v1.json";
export const NEXT3_RENEW_BLOB_V39=NEXT3_OWNER_PREFIX_V39+
 "role-validity-extend-once-v1.aes256gcm.json";
const GO="AUTHORIZE_NEXT3_TWO_ROLE_VALIDITY_EXTENSION_NO_PROVIDER";
const HEX64=/^[a-f0-9]{64}$/;
const hold=():never=>{throw Error("GATE4_NEXT3_ROLE_VALIDITY_HOLD");};
const sha=(x:Uint8Array)=>createHash("sha256").update(x).digest("hex");

export type Next3RenewedValidityV39={
 schema:"v39.gate4.next3.role-validity-extension.v1";
 sourceSha:string;scopeId:string;authorizationSha256:string;
 writerRole:string;receiverRole:string;
 writerExpiresUtc:string;receiverExpiresUtc:string;
 originalWriterCustodySha256:string;originalReceiverCustodySha256:string;
};

function key(salt:Buffer,env:NodeJS.ProcessEnv):Buffer{
 const db=String(env.V39_DATABASE_RUNTIME_URL??"");
 const secret=String(env.AERODATABOX_WEBHOOK_SECRET??"");
 if(db.length<60||secret.length<32)hold();
 let url:URL;
 try{url=new URL(db);}catch{hold();}
 if(!url!.password||url!.pathname!=="/neondb")hold();
 return Buffer.from(hkdfSync("sha256",Buffer.from(db+"\0"+secret),salt,
  Buffer.from("replittranvr:gate4:next3:role-validity-extension:v1"),32));
}
function validate(d:Next3RenewedValidityV39,auth:string):void{
 if(!d||d.schema!=="v39.gate4.next3.role-validity-extension.v1"||
    d.sourceSha!==NEXT3_SOURCE_V39||d.scopeId!==NEXT3_ID||
    d.authorizationSha256!==auth||!HEX64.test(auth)||
    d.receiverRole!==NEXT3_RECEIVER_ROLE||
    d.writerRole!==NEXT3_OWNER_ROLE_V39||
    !HEX64.test(d.originalWriterCustodySha256)||
    !HEX64.test(d.originalReceiverCustodySha256)||
    !Number.isFinite(Date.parse(d.writerExpiresUtc))||
    d.writerExpiresUtc!==d.receiverExpiresUtc||
    new Date(Date.parse(d.writerExpiresUtc)).toISOString()!==
     d.writerExpiresUtc)hold();
}
export function sealNext3RenewedValidityV39(
 d:Next3RenewedValidityV39,env:NodeJS.ProcessEnv
):Buffer{
 validate(d,d.authorizationSha256);
 const salt=randomBytes(32),iv=randomBytes(12),derived=key(salt,env);
 try{
  const cipher=createCipheriv("aes-256-gcm",derived,iv);
  cipher.setAAD(Buffer.from("v39-next3-role-validity:"+
   NEXT3_ID+":"+NEXT3_SOURCE_V39+":"+d.authorizationSha256));
  const ct=Buffer.concat([
   cipher.update(Buffer.from(JSON.stringify(d),"utf8")),cipher.final()
  ]);
  return Buffer.from(JSON.stringify({
   schema:"v39.gate4.next3.role-validity-seal.v1",
   sourceSha:NEXT3_SOURCE_V39,scopeId:NEXT3_ID,
   authorizationSha256:d.authorizationSha256,
   salt:salt.toString("base64"),iv:iv.toString("base64"),
   tag:cipher.getAuthTag().toString("base64"),
   ciphertext:ct.toString("base64")
  }));
 }finally{derived.fill(0);}
}
export function openNext3RenewedValidityV39(
 bytes:Uint8Array,auth:string,env:NodeJS.ProcessEnv
):Next3RenewedValidityV39{
 if(bytes.length<160||bytes.length>8192||!HEX64.test(auth))hold();
 let x:any;
 try{x=JSON.parse(Buffer.from(bytes).toString("utf8"));}catch{hold();}
 if(x.schema!=="v39.gate4.next3.role-validity-seal.v1"||
    x.sourceSha!==NEXT3_SOURCE_V39||x.scopeId!==NEXT3_ID||
    x.authorizationSha256!==auth)hold();
 const salt=Buffer.from(x.salt,"base64"),iv=Buffer.from(x.iv,"base64");
 const tag=Buffer.from(x.tag,"base64");
 if(salt.length!==32||iv.length!==12||tag.length!==16)hold();
 const derived=key(salt,env);
 try{
  const dc=createDecipheriv("aes-256-gcm",derived,iv);
  dc.setAAD(Buffer.from("v39-next3-role-validity:"+
   NEXT3_ID+":"+NEXT3_SOURCE_V39+":"+auth));
  dc.setAuthTag(tag);
  const d=JSON.parse(Buffer.concat([
    dc.update(Buffer.from(x.ciphertext,"base64")),dc.final()
   ]).toString("utf8")) as Next3RenewedValidityV39;
  validate(d,auth);return d;
 }catch{hold();}finally{derived.fill(0);}
}

function ownerURL(receiverUrl:string):string{
 const u=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 let owner:URL,restricted:URL,runtime:URL;
 try{
  owner=new URL(u);restricted=new URL(receiverUrl);
  runtime=new URL(String(process.env.V39_DATABASE_RUNTIME_URL??""));
 }catch{hold();}
 const h=(x:URL)=>x.hostname.replace("-pooler.",".");
 if(!owner!.password||owner!.pathname!=="/neondb"||
    h(owner!)!==h(restricted!)||h(owner!)!==h(runtime!)||
    owner!.username===restricted!.username||
    !["postgres:","postgresql:"].includes(owner!.protocol))hold();
 return u;
}
async function inspectRoles(db:pg.Client,expectedExpires?:string):Promise<{
 actualExpires:Record<string,string>;sameScope:boolean
}>{
 const roles=(await db.query(
  "SELECT rolname,rolvaliduntil,rolcanlogin,rolsuper,rolbypassrls,"+
  "rolinherit,rolcreaterole,rolcreatedb FROM pg_roles "+
  "WHERE rolname=ANY($1::name[])",
  [[NEXT3_RECEIVER_ROLE,NEXT3_OWNER_ROLE_V39]]
 )).rows;
 if(roles.length!==2||roles.some(r=>r.rolcanlogin!==true||
   r.rolsuper!==false||r.rolbypassrls!==false||
   r.rolinherit!==false||r.rolcreaterole!==false||
   r.rolcreatedb!==false))hold();
 const expires:Record<string,string>={};
 for(const r of roles){
  const date=new Date(r.rolvaliduntil);
  if(!Number.isFinite(date.getTime()))hold();
  expires[r.rolname]=date.toISOString();
  if(expectedExpires&&date.getTime()!==Date.parse(expectedExpires))hold();
 }
 return {actualExpires:expires,sameScope:true};
}
async function restrictedReadOnly(url:string,role:string):Promise<void>{
 const client=new pg.Client({connectionString:url,connectionTimeoutMillis:6500,
   query_timeout:8000,options:"-c default_transaction_read_only=on"});
 try{
  await client.connect();
  const q=(await client.query(
   "SELECT current_user AS actor,current_database() AS db,"+
   "current_setting('transaction_read_only') AS ro"
  )).rows[0];
  if(q?.actor!==role||q.db!=="neondb"||q.ro!=="on")hold();
  const table=role===NEXT3_RECEIVER_ROLE?
   "clean.gate4_alert_prebind_original_v39":
   "clean.gate4_alert_owned_binding_v39";
  const rows=await client.query(
   "SELECT count(*)::int AS n FROM "+table+" WHERE scope_id=$1::uuid",
   [NEXT3_ID]);
  if(role===NEXT3_RECEIVER_ROLE){
   if(rows.rows[0]?.n<1)hold(); // original synthetic immutable
  }else if(rows.rows[0]?.n!==0)hold();
 }finally{await client.end().catch(()=>undefined);}
}
export async function next3ReadSealedRoleValidityV39(
 storage:ReplitProviderBlobStoreV39,auth:string,
 originalOwnerBlob:Uint8Array,originalReceiverBlob:Uint8Array
):Promise<string|null>{
 if(!await storage.exists(NEXT3_RENEW_BLOB_V39))return null;
 const d=openNext3RenewedValidityV39(
  await storage.downloadBytes(NEXT3_RENEW_BLOB_V39),auth,process.env);
 if(d.originalWriterCustodySha256!==sha(originalOwnerBlob)||
    d.originalReceiverCustodySha256!==sha(originalReceiverBlob)||
    !await storage.exists(NEXT3_RENEW_INTENT_V39))hold();
 return d.writerExpiresUtc;
}
async function run():Promise<void>{
 let stage="ENTRY",intentWritten=false,blobWritten=false,dbCommitted=false;
 let db:pg.Client|undefined;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
     !["--audit","--renew-once","--verify"].includes(mode))hold();
  if(mode==="--renew-once"){
   const pinned=process.env.GATE4_NEXT3_ROLE_RENEWAL_OPERATOR_SHA??"";
   const actual=execFileSync("git",["rev-parse","HEAD"],{
     encoding:"utf8",stdio:["ignore","pipe","ignore"]
   }).trim();
   if(!/^[a-f0-9]{40}$/.test(pinned)||actual!==pinned||
      process.env.GATE4_NEXT3_ROLE_RENEWAL_GO!==GO)hold();
  }
  const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
  if(!bucket.startsWith("replit-objstore-"))hold();
  const storage=new ReplitProviderBlobStoreV39(bucket);
  const receiverKey=gate4Next3StorageKeyV39(NEXT3_SOURCE_V39);
  if(!await storage.exists(receiverKey)||
     !await storage.exists(NEXT3_OWNER_BLOB_V39)||
     !await storage.exists(NEXT3_OWNER_INTENT_V39))hold();
  const receiverBlob=await storage.downloadBytes(receiverKey);
  const ownerBlob=await storage.downloadBytes(NEXT3_OWNER_BLOB_V39);
  const receiver=gate4Next3OpenSealedValuesV39(
   receiverBlob,NEXT3_SOURCE_V39,process.env);
  const owner=openNext3OwnerCustodyV39(
   ownerBlob,receiver.GATE4_PREBIND_AUTH_SHA256,process.env);
  if(owner.writerUrl.includes("gate4_receiver_")||
     owner.authorizationSha256!==receiver.GATE4_PREBIND_AUTH_SHA256)hold();
  const ownerDb=ownerURL(receiver.GATE4_PREBIND_DATABASE_URL);
  db=new pg.Client({connectionString:ownerDb,
   connectionTimeoutMillis:6500,query_timeout:10000});
  await db.connect();
  stage="OWNER_READONLY_SCOPE_AND_ROLE_AUDIT";
  await db.query("BEGIN READ ONLY");
  await inspectRoles(db);
  const a=(await db.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39 "+
   "WHERE scope_id=$1::uuid",[NEXT3_ID])).rows[0];
  if(a?.n!==0)hold();
  await db.query("ROLLBACK");
  if(mode==="--verify"){
   stage="SEALED_RENEWAL_AND_RESTRICTED_READBACK";
   const expiry=await next3ReadSealedRoleValidityV39(
    storage,receiver.GATE4_PREBIND_AUTH_SHA256,ownerBlob,receiverBlob);
   if(!expiry||Date.parse(expiry)<Date.now()+30*60_000)hold();
   await inspectRoles(db,expiry);
   await restrictedReadOnly(receiver.GATE4_PREBIND_DATABASE_URL,NEXT3_RECEIVER_ROLE);
   await restrictedReadOnly(owner.writerUrl,NEXT3_OWNER_ROLE_V39);
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_TWO_ROLE_VALIDITY_RENEWAL_VERIFIED",
    effectiveExpiryUtc:expiry,sameCredentials:true,
    sealedCustodyUnchanged:true,receiverStillHealthy:true,
    providerCalls:0,dbPolicyChanges:0,stopArmed:false,paidAuthorized:false
   }));return;
  }
  const existsIntent=await storage.exists(NEXT3_RENEW_INTENT_V39);
  const existsBlob=await storage.exists(NEXT3_RENEW_BLOB_V39);
  if(mode==="--audit"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_ROLE_VALIDITY_AUDIT_NO_PROVIDER",
    source:NEXT3_SOURCE_V39,scope:NEXT3_ID,
    existingTwoRolesVerified:true,positiveOwnerBindings:0,
    renewalIntentAlreadyExists:existsIntent,
    renewalBlobAlreadyExists:existsBlob,
    eligibleForOneShot:!existsIntent&&!existsBlob,
    providerCalls:0,databaseWrites:0,storageWrites:0
   }));return;
  }
  if(existsIntent||existsBlob)hold();
  stage="SAVE_PRIVATE_ONE_SHOT_INTENT";
  const newExpiry=new Date(Math.ceil((Date.now()+24*3600_000)/1000)*1000)
   .toISOString();
  const intent=Buffer.from(JSON.stringify({
   schema:"v39.gate4.next3.role-validity-intent.v1",
   sourceSha:NEXT3_SOURCE_V39,scopeId:NEXT3_ID,
   expiresUtc:newExpiry,
   originalOwnerCustodySha256:sha(ownerBlob),
   originalReceiverCustodySha256:sha(receiverBlob),
   noRetry:true,providerAuthorized:false
  })+"\n");
  await storage.uploadBytes(NEXT3_RENEW_INTENT_V39,intent);
  intentWritten=true;
  if(!Buffer.from(await storage.downloadBytes(NEXT3_RENEW_INTENT_V39))
   .equals(intent))hold();
  stage="SEAL_APPEND_ONLY_RENEWAL_EVIDENCE";
  const d:Next3RenewedValidityV39={
   schema:"v39.gate4.next3.role-validity-extension.v1",
   sourceSha:NEXT3_SOURCE_V39,scopeId:NEXT3_ID,
   authorizationSha256:receiver.GATE4_PREBIND_AUTH_SHA256,
   receiverRole:NEXT3_RECEIVER_ROLE,writerRole:NEXT3_OWNER_ROLE_V39,
   receiverExpiresUtc:newExpiry,writerExpiresUtc:newExpiry,
   originalOwnerCustodySha256:sha(ownerBlob),
   originalReceiverCustodySha256:sha(receiverBlob)
  };
  const blob=sealNext3RenewedValidityV39(d,process.env);
  await storage.uploadBytes(NEXT3_RENEW_BLOB_V39,blob);
  blobWritten=true;
  const x=openNext3RenewedValidityV39(
   await storage.downloadBytes(NEXT3_RENEW_BLOB_V39),
   receiver.GATE4_PREBIND_AUTH_SHA256,process.env);
  if(x.writerExpiresUtc!==newExpiry)hold();
  stage="ALTER_ONLY_TWO_ROLE_VALID_UNTIL";
  await db.query("BEGIN");
  try{
   await db.query("SET LOCAL lock_timeout='2500ms'");
   const roleBefore=await inspectRoles(db);
   // Existing named roles ONLY. Same password, grants, RLS and source.
   if(Object.values(roleBefore.actualExpires).some(
     t=>Date.parse(t)>Date.parse(newExpiry)))hold();
   for(const role of [NEXT3_RECEIVER_ROLE,NEXT3_OWNER_ROLE_V39])
    await db.query("ALTER ROLE "+role+" VALID UNTIL '"+newExpiry+"'");
   await inspectRoles(db,newExpiry);
   await db.query("COMMIT");dbCommitted=true;
  }catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e;}
  stage="VERIFY_EXISTING_RESTRICTED_LOGINS";
  await restrictedReadOnly(receiver.GATE4_PREBIND_DATABASE_URL,NEXT3_RECEIVER_ROLE);
  await restrictedReadOnly(owner.writerUrl,NEXT3_OWNER_ROLE_V39);
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_TWO_ROLE_VALIDITY_RENEWAL_PASS",
   effectiveExpiryUtc:newExpiry,rolesExtended:2,passwordsChanged:0,
   policiesChanged:0,publishedReceiverRebuilt:false,
   custodyOriginalsReplaced:false,
   storageWrites:2,providerCalls:0,paidAuthorized:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_TWO_ROLE_VALIDITY_RENEWAL_HOLD",
   stage,intentWritten,blobWritten,dbCommitted,
   noAutomaticRetry:true,providerCalls:0,paidAuthorized:false
  }));
  process.exitCode=2;
 }finally{await db?.end().catch(()=>undefined);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void run();
