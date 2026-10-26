/**
 * NEXT3 exactly scoped SQL credential lifetime repair — NO PROVIDER.
 * One-time: expiry 2026-10-26 04:00Z -> PostgreSQL 'infinity'.
 * No password rotation, grants, RLS, roles, data, provider, or deployment.
 * These two scoped logins must be retired after Gate4.
 * --check: read-only catalog/RLS/AES V2 after expiry.
 * --extend-once: signed reviewed GO; private intent, exactly two ALTER ROLEs
 *                in one transaction, SQL audit, V3 encrypted custody.
 * --verify: read-only catalog, live writer login and V3 encrypted readback.
 * If SQL commits but V3 custody fails, stop; no blind rerun.
 */
import "dotenv/config";
import pg from "pg";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
  NEXT3_ID,NEXT3_RECEIVER_ROLE,gate4Next3StorageKeyV39,
  gate4Next3OpenSealedValuesV39
} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
import {
 NEXT3_SOURCE_V39,NEXT3_OWNER_ROLE_V39,
 NEXT3_OWNER_PREFIX_V39,NEXT3_OWNER_INTENT_V39,NEXT3_OWNER_BLOB_V39,
 openNext3OwnerCustodyV39,sealNext3OwnerCustodyV39
} from "./v39_gate4_next3_no_provider_writer_signer_seal_v39";
import {
 NEXT3_EXPIRY_INTENT_V39,NEXT3_EXPIRY_BLOB_V39,
 NEXT3_EXTENDED_EXPIRES_V39
} from "./v39_gate4_next3_extend_role_validity_to_9pm_v39";

const BEFORE="2026-10-26T04:00:00.000Z";
export const NEXT3_INFINITE_VALIDITY_V39="infinity";
export const NEXT3_NO_TTL_INTENT_V39=NEXT3_OWNER_PREFIX_V39+
 "roles-no-expiry-intent-v1.json";
export const NEXT3_NO_TTL_BLOB_V39=NEXT3_OWNER_PREFIX_V39+
 "writer-stop-signer-custody-no-expiry-v1.aes256gcm.json";
const GO="AUTHORIZE_NEXT3_TWO_RESTRICTED_SQL_PASSWORDS_NO_EXPIRY_NO_PROVIDER";
const hold=(stage:string):never=>{
 throw Error("GATE4_NEXT3_EXPIRE_"+stage+"_HOLD");
};
const utc=(x:string):boolean=>
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 (Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x || x==="infinity");
export function next3InfinitySqlV39(role:string):string{
 if(![NEXT3_RECEIVER_ROLE,NEXT3_OWNER_ROLE_V39].includes(role))
  hold("FOREIGN_ROLE");
 return 'ALTER ROLE "'+role+'" VALID UNTIL '+
   "'"+NEXT3_INFINITE_VALIDITY_V39+"'";
}
type Audit={expiry:string;receiverRole:string;writerRole:string;
 originalCount:number;ownerCount:number};
function ownerUrl():string{
 const a=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const b=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 let x:URL,y:URL;
 try{x=new URL(a);y=new URL(b);}catch{hold("OWNER_URL");}
 const host=(u:URL)=>u.hostname.replace("-pooler.",".")+":"+
  (u.port||"5432")+u.pathname;
 if(!["postgres:","postgresql:"].includes(x!.protocol)||
    !["postgres:","postgresql:"].includes(y!.protocol)||
    x!.pathname!=="/neondb"||y!.pathname!=="/neondb"||
    !x!.password||!y!.password||x!.username===y!.username||
    host(x!)!==host(y!))hold("DB_HOST");
 return a;
}
async function audit(db:pg.Client,auth:string,expected:string):Promise<Audit>{
 if(!/^[a-f0-9]{64}$/.test(auth)||!utc(expected))hold("AUTH");
 const who=(await db.query(
  "SELECT current_database() AS db, current_user AS actor"
 )).rows[0];
 if(who?.db!=="neondb"||
    who.actor!==decodeURIComponent(new URL(ownerUrl()).username))
  hold("OWNER_ID");
 const roles=(await db.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolinherit,rolbypassrls,"+
  "rolcreaterole,rolcreatedb,rolreplication,rolconnlimit,"+
  "CASE WHEN rolvaliduntil='infinity'::timestamptz THEN 'infinity' "+
  "ELSE to_char(rolvaliduntil AT TIME ZONE 'UTC',"+
  "'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') END AS expiry "+
  "FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname",
  [[NEXT3_RECEIVER_ROLE,NEXT3_OWNER_ROLE_V39]]
 )).rows;
 if(roles.length!==2||roles.some(x=>
   x.rolcanlogin!==true||x.rolsuper!==false||
   x.rolinherit!==false||x.rolbypassrls!==false||
   x.rolcreaterole!==false||x.rolcreatedb!==false||
   x.rolreplication!==false||
   x.rolconnlimit!==(x.rolname===NEXT3_OWNER_ROLE_V39?1:4)||
   x.expiry!==expected))hold("ROLE_CATALOG");
 const policies=(await db.query(
  "SELECT policyname,tablename,cmd,"+
  "cardinality(roles)::int AS role_count,"+
  "roles[1]::text AS assigned_role,qual,with_check "+
  "FROM pg_policies WHERE schemaname='clean' AND "+
  "policyname LIKE 'gate4_next3_%_v39'"
 )).rows;
 const expectedPolicies=[
  ["gate4_next3_receiver_select_v39","gate4_alert_prebind_original_v39","SELECT",NEXT3_RECEIVER_ROLE],
  ["gate4_next3_receiver_insert_v39","gate4_alert_prebind_original_v39","INSERT",NEXT3_RECEIVER_ROLE],
  ["gate4_next3_writer_select_v39","gate4_alert_owned_binding_v39","SELECT",NEXT3_OWNER_ROLE_V39],
  ["gate4_next3_writer_insert_v39","gate4_alert_owned_binding_v39","INSERT",NEXT3_OWNER_ROLE_V39]
 ];
 if(policies.length!==4||
    !expectedPolicies.every(([name,table,cmd,role])=>policies.some(p=>
      p.policyname===name&&p.tablename===table&&p.cmd===cmd&&
      p.role_count===1&&p.assigned_role===role&&
      String(cmd==="SELECT"?p.qual:p.with_check).includes(NEXT3_ID)&&
      String(cmd==="SELECT"?p.qual:p.with_check).includes(auth)&&
      String(cmd==="SELECT"?p.qual:p.with_check).includes(NEXT3_SOURCE_V39)&&
      String(cmd==="SELECT"?p.qual:p.with_check).includes("WSSS")
    )))hold("RLS_POLICY_DRIFT");
 const orig=(await db.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_prebind_original_v39 "+
   "WHERE scope_id=$1::uuid",[NEXT3_ID])).rows[0]?.n;
 const owner=(await db.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39 "+
   "WHERE scope_id=$1::uuid",[NEXT3_ID])).rows[0]?.n;
 if(orig!==1||owner!==0)hold("SYNTHETIC_OR_OWNER_DRIFT");
 return {expiry:expected,receiverRole:NEXT3_RECEIVER_ROLE,
  writerRole:NEXT3_OWNER_ROLE_V39,originalCount:orig,ownerCount:owner};
}
async function writerPing(url:string):Promise<void>{
 const db=new pg.Client({connectionString:url,
  connectionTimeoutMillis:5000,query_timeout:6000,
  options:"-c default_transaction_read_only=on"});
 try{
  await db.connect();
  const r=(await db.query(
   "SELECT current_user AS actor,"+
   "(SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39 "+
   "WHERE scope_id=$1::uuid) AS bindings",[NEXT3_ID])).rows[0];
  if(r?.actor!==NEXT3_OWNER_ROLE_V39||r.bindings!==0)
   hold("WRITER_AUTH");
 }finally{await db.end().catch(()=>{});}
}
async function main():Promise<void>{
 let stage="ENTRY",intentWritten=false,rolesExtended=false,blobWritten=false;
 let db:pg.Client|undefined,tx=false;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
     !["--check","--extend-once","--verify"].includes(mode))
   hold("MODE");
  if(mode==="--extend-once"&&(
     process.env.GATE4_NEXT3_EXPIRY_GO!==GO||
     process.env.GATE4_NEXT3_EXPIRY_OPERATOR_SHA!==
      execFileSync("git",["rev-parse","HEAD"],{
       encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim()))
   hold("GO_OR_SHA");
  const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
  if(!bucket.startsWith("replit-objstore-"))hold("PRIVATE_BUCKET");
  const storage=new ReplitProviderBlobStoreV39(bucket);
  const rkey=gate4Next3StorageKeyV39(NEXT3_SOURCE_V39);
  if(!await storage.exists(rkey)||!await storage.exists(NEXT3_OWNER_INTENT_V39)||
     !await storage.exists(NEXT3_OWNER_BLOB_V39))hold("SEALED_OBJECT_MISSING");
  const receiver=gate4Next3OpenSealedValuesV39(
   await storage.downloadBytes(rkey),NEXT3_SOURCE_V39,process.env);
  const auth=receiver.GATE4_PREBIND_AUTH_SHA256;
  if(!await storage.exists(NEXT3_EXPIRY_INTENT_V39)||
     !await storage.exists(NEXT3_EXPIRY_BLOB_V39))
    hold("REQUIRED_PREVIOUS_EXTENSION_ABSENT");
  const base=openNext3OwnerCustodyV39(
   await storage.downloadBytes(NEXT3_OWNER_BLOB_V39),auth,process.env);
  const original=openNext3OwnerCustodyV39(
   await storage.downloadBytes(NEXT3_EXPIRY_BLOB_V39),auth,process.env);
  if(original.writerExpiresUtc!==BEFORE||
     BEFORE!==NEXT3_EXTENDED_EXPIRES_V39||
     original.writerUrl!==base.writerUrl||
     original.signerPrivatePkcs8Base64!==base.signerPrivatePkcs8Base64||
     original.signerPublicSpkiBase64!==base.signerPublicSpkiBase64||
     original.signerSpkiSha256!==base.signerSpkiSha256)
    hold("PREVIOUS_EXTENSION_CUSTODY_DRIFT");
  db=new pg.Client({connectionString:ownerUrl(),
    connectionTimeoutMillis:6000,query_timeout:9000});
  await db.connect();
  const target=mode==="--verify"?NEXT3_INFINITE_VALIDITY_V39:BEFORE;
  stage="OWNER_READONLY_AUDIT";
  await db.query("BEGIN READ ONLY");tx=true;
  await audit(db,auth,target);
  await db.query("ROLLBACK");tx=false;
  // The SQL role has expired; do NOT authenticate as it before ALTER ROLE.
  if(mode==="--verify"){
   stage="EXTENSION_PRIVATE_READBACK";
   if(!await storage.exists(NEXT3_NO_TTL_INTENT_V39)||
      !await storage.exists(NEXT3_NO_TTL_BLOB_V39))hold("EXTENDED_OBJECTS_ABSENT");
   const current=openNext3OwnerCustodyV39(
     await storage.downloadBytes(NEXT3_NO_TTL_BLOB_V39),auth,process.env);
   if(current.writerUrl!==original.writerUrl||
      current.signerPrivatePkcs8Base64!==original.signerPrivatePkcs8Base64||
      current.signerSpkiSha256!==original.signerSpkiSha256||
      current.writerExpiresUtc!==NEXT3_INFINITE_VALIDITY_V39)
     hold("EXTENDED_CUSTODY_MISMATCH");
   await writerPing(original.writerUrl);
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_RESTRICTED_SQL_PASSWORDS_NONEXPIRING_VERIFIED",
    expiresUtc:NEXT3_INFINITE_VALIDITY_V39,
    receiverRoleCatalogValid:true,writerLoginValidity:true,
    sourceAndSignerUnchanged:true,
    scopedSyntheticOriginals:1,ownedProviderBindings:0,
    encryptedExtendedCustodyVerified:true,
    providerCalls:0,databaseWrites:0,paidAuthorized:false
   }));
   return;
  }
  stage="EXISTING_EXTENSION_ABSENT";
  if(await storage.exists(NEXT3_NO_TTL_INTENT_V39)||
     await storage.exists(NEXT3_NO_TTL_BLOB_V39))
   hold("EXTENSION_ALREADY_ATTEMPTED");
  if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_NONEXPIRING_SQL_PREFLIGHT_PASS",
    oldExpiresUtc:BEFORE,newExpiresUtc:NEXT3_INFINITE_VALIDITY_V39,
    rolesToExtend:2,rlsPoliciesUnchanged:4,
    scopedSyntheticOriginals:1,ownedProviderBindings:0,
    existingSealedWriterAndSignerVerified:true,
    expiredWriterLoginNotTested:true,
    providerCalls:0,databaseWrites:0,storageWrites:0,
    paidAuthorized:false
   }));
   return;
  }
  stage="DURABLE_ONE_SHOT_EXTENSION_INTENT";
  const intent=Buffer.from(JSON.stringify({
   schema:"v39.gate4.next3.role-expiry-intent.v1",
   source:NEXT3_SOURCE_V39,scope:NEXT3_ID,
   authorizationSha256:auth,oldExpiresUtc:BEFORE,
   targetExpiresUtc:NEXT3_INFINITE_VALIDITY_V39,
   createdAtUtc:new Date().toISOString(),
   neverRepeat:true,providerCalls:0
  })+"\n");
  await storage.uploadBytes(NEXT3_NO_TTL_INTENT_V39,intent);
  intentWritten=true;
  if(!Buffer.from(await storage.downloadBytes(NEXT3_NO_TTL_INTENT_V39))
     .equals(intent))hold("INTENT_READBACK");
  stage="ALTER_TWO_VALIDITY_FIELDS_ONLY";
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");tx=true;
  await db.query("SET LOCAL lock_timeout='2500ms'");
  await db.query("SET LOCAL statement_timeout='9000ms'");
  await db.query("SELECT pg_advisory_xact_lock(3904,20261025)");
  await audit(db,auth,BEFORE);
  for(const role of [NEXT3_RECEIVER_ROLE,NEXT3_OWNER_ROLE_V39])
   await db.query(next3InfinitySqlV39(role));
  await audit(db,auth,NEXT3_INFINITE_VALIDITY_V39);
  await db.query("COMMIT");tx=false;rolesExtended=true;
  stage="POST_COMMIT_OWNER_AUDIT";
  await db.query("BEGIN READ ONLY");tx=true;
  await audit(db,auth,NEXT3_INFINITE_VALIDITY_V39);
  await db.query("ROLLBACK");tx=false;
  await writerPing(original.writerUrl);
  stage="SEALED_EXTENDED_CUSTODY";
  const extended={...original,writerExpiresUtc:NEXT3_INFINITE_VALIDITY_V39};
  const sealed=sealNext3OwnerCustodyV39(extended,process.env);
  await storage.uploadBytes(NEXT3_NO_TTL_BLOB_V39,sealed);
  blobWritten=true;
  const readback=openNext3OwnerCustodyV39(
    await storage.downloadBytes(NEXT3_NO_TTL_BLOB_V39),auth,process.env);
  if(readback.writerUrl!==original.writerUrl||
     readback.signerSpkiSha256!==original.signerSpkiSha256||
     readback.writerExpiresUtc!==NEXT3_INFINITE_VALIDITY_V39)
   hold("SEALED_READBACK");
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_TWO_RESTRICTED_SQL_PASSWORDS_NONEXPIRING_PASS",
   expiresUtc:NEXT3_INFINITE_VALIDITY_V39,
   existingPasswordsPreserved:true,
   existingPoliciesPreserved:true,
   originalAndOwnerRowsUntouched:true,
   sourceAndSignerUnchanged:true,
   encryptedExtendedCustodyVerified:true,
   databaseRoleAlterations:2,storageWrites:2,
   providerCalls:0,paidAuthorized:false
  }));
 }catch{
  if(tx)await db?.query("ROLLBACK").catch(()=>undefined);
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_NONEXPIRING_SQL_HOLD",stage,
   intentWritten,rolesExtended,blobWritten,noAutomaticRetry:true,
   providerCalls:0,paidAuthorized:false
  }));
  process.exitCode=2;
 }finally{await db?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void main();
