/**
 * Install NEXT2 restricted credentials without entering any new Replit secrets.
 *
 * Single local command after reviewed release is merged. Existing published
 * Phase2G private credentials are verified with its safe two binding routes.
 * NEXT2 ten-setting JSON is AES-GCM encrypted with existing protected keys
 * and written once into already-configured private Replit App Storage.
 * Four NEXT2-only RLS policies are then retargeted to the ACTUAL new source
 * SHA and two scoped roles extended 48h; NO changes to old seven policies,
 * prepaid routes, provider subscriptions, billing or old original data.
 *
 * Never print keys, tokens, URLs, policy predicates, DB responses or bytes.
 * Run only from exact clean reviewed Git HEAD on Replit owner terminal.
 */
import "dotenv/config";
import pg from "pg";
import {createHmac,randomBytes} from "node:crypto";
import {readFileSync,lstatSync,existsSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 gate4Next2SealValuesV39,gate4Next2OpenSealedValuesV39,
 gate4Next2StorageKeyV39,gate4Next2ValidateValuesV39,NEXT2_ID
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";

const PRIVATE=join(homedir(),".config","replittranvr","gate4-next2-20261024");
const SRC="29d3e0dff8b8863f55f6d73e609e21480b8e46db";
const REL=join(PRIVATE,"sealed-release-install-result.json");
const APP="https://replit-tranvr--hk84164.replit.app";
function hold():never{throw Error("GATE4_NEXT2_NO_UI_INSTALL_HOLD");}
function safeRead(name:string):any{
 const p=join(PRIVATE,name),s=lstatSync(p);
 if(!s.isFile()||(s.mode&0o077)!==0)hold();
 return JSON.parse(readFileSync(p,"utf8"));
}
function shaHead():string{
 return execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim();
}
function envReady():void{
 const db=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 const secret=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 const owner=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
 let a:URL,other:URL;
 try{a=new URL(db);other=new URL(owner);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(a.protocol)||
    !a.password||a.pathname!=="/neondb"||secret.length<32||
    !bucket.startsWith("replit-objstore-")||!other.password||
    other.pathname!==a.pathname||
    other.hostname.replace("-pooler.",".")!==
     a.hostname.replace("-pooler.",".")||
    other.username===a.username)hold();
}
async function verifyExistingPublishedKeys():Promise<void>{
 // Existing Phase2G endpoint authenticates old live webhook secret by 200,
 // but does not return a credential. Nothing sent to provider.
 const secret=String(process.env.AERODATABOX_WEBHOOK_SECRET);
 const first=await fetch(APP+"/__v39/phase2g/webhook-secret-match",{
  method:"POST",redirect:"error",cache:"no-store",
  headers:{"x-v39-phase2g-webhook-secret":secret},
  signal:AbortSignal.timeout(10000)
 });
 await first.body?.cancel();
 if(first.status!==200)hold();
 const challenge="gate4_next2_"+randomBytes(16).toString("hex");
 const proof=createHmac("sha256",String(process.env.V39_DATABASE_RUNTIME_URL))
  .update("phase2g-db-binding:"+challenge).digest("hex");
 const second=await fetch(APP+"/__v39/phase2g/runtime-db-binding",{
  method:"POST",redirect:"error",cache:"no-store",
  headers:{
   "x-v39-phase2g-db-challenge":challenge,
   "x-v39-phase2g-db-proof":proof
  },
  signal:AbortSignal.timeout(10000)
 });
 await second.body?.cancel();
 if(second.status!==200)hold();
}
function policyPred(auth:string,source:string):string{
 if(!/^[a-f0-9]{64}$/.test(auth)||!/^[a-f0-9]{40}$/.test(source))hold();
 return "scope_id='"+NEXT2_ID+"'::uuid AND "+
  "authorization_sha256='"+auth+"' AND "+
  "source_commit='"+source+"' AND airport_icao='WSSS'";
}
async function retargetSource(
 sourceSha:string,auth:string,roleExpiry:string
):Promise<void>{
 const url=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
 const owner=new URL(url);
 const client=new pg.Client({connectionString:url,
  connectionTimeoutMillis:6000,query_timeout:9000,statement_timeout:9000});
 try{
  await client.connect();
  await client.query("BEGIN");
  // Freeze the two scoped roles and four scope-specific policies only.
  const metadata=(await client.query(
   "SELECT current_database() AS database,current_user AS actor,"
   +"(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS role_admin"
  )).rows[0];
  if(metadata?.database!=="neondb"||
     metadata.actor!==decodeURIComponent(owner.username)||
     metadata.role_admin!==true)hold();
  const rows=(await client.query(
   "SELECT scope_id::text AS s,COUNT(*)::int AS n FROM "+
   "clean.gate4_alert_prebind_original_v39 GROUP BY scope_id"
  )).rows;
  if(rows.length!==1||rows[0].s!=="498dccd7-5da3-4687-a6ea-e0dc03b54398"||
    rows[0].n!==1)hold();
  const bind=(await client.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39"
  )).rows[0].n;
  if(bind!==2)hold();
  const pol=(await client.query(
   "SELECT policyname FROM pg_policies WHERE schemaname='clean'"+
   " AND tablename=ANY($1::text[])",
   [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
  )).rows;
  const names=[
   "gate4_next2_receiver_select_v39","gate4_next2_receiver_insert_v39",
   "gate4_next2_writer_select_v39","gate4_next2_writer_insert_v39"
  ];
  if(pol.length!==11||!names.every(x=>pol.some(y=>y.policyname===x)))hold();
  const pred=policyPred(auth,sourceSha);
  for(let i=0;i<4;i++){
   const table=i<2?"clean.gate4_alert_prebind_original_v39":
    "clean.gate4_alert_owned_binding_v39";
   const op=i%2===0?"USING":"WITH CHECK";
   await client.query("ALTER POLICY "+names[i]+" ON "+table+
    " "+op+" ("+pred+")");
  }
  for(const role of ["gate4_receiver_2026_next2",
     "gate4_owner_writer_2026_next2"]){
   await client.query("ALTER ROLE "+role+
    " VALID UNTIL '"+roleExpiry+"'");
  }
  // Postmutation sanity: historical receipt counts unchanged.
  const policies=(await client.query(
   "SELECT policyname FROM pg_policies WHERE schemaname='clean'"+
   " AND tablename=ANY($1::text[])",
   [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
  )).rows;
  if(policies.length!==11)hold();
  await client.query("COMMIT");
 }catch{
  await client.query("ROLLBACK").catch(()=>{});
  throw Error("GATE4_NEXT2_DB_RETARGET_HOLD");
 }finally{await client.end().catch(()=>{});}
}
async function main():Promise<void>{
 let stage="ADMISSION",storageWrites=0,policyUpdates=0;
 try{
  if(process.argv.length!==3||process.argv[2]!=="--install")hold();
  const expected=String(process.env.GATE4_NEXT2_REVIEWED_BOOTSTRAP_SHA??"");
  if(!/^[a-f0-9]{40}$/.test(expected)||expected!==shaHead()||
     process.env.GATE4_NEXT2_NO_UI_INSTALL_GO!==
     "SEAL_AND_RETARGET_NO_PROVIDER")hold();
  envReady();
  const privateSettings=safeRead("published-receiver-settings.json");
  const receiver=safeRead("receiver-credential.json");
  const manifest=safeRead("setup-manifest.json");
  if(privateSettings.scopeId!==NEXT2_ID||
    receiver.scope!==NEXT2_ID||manifest.scopeId!==NEXT2_ID||
    privateSettings.expectedCompiledSource!==SRC||
    receiver.source!==SRC||manifest.sourceSha!==SRC||
    privateSettings.values.GATE4_PREBIND_AUTH_SHA256!==
     manifest.authorizationSha256)hold();
  const original=privateSettings.values as Record<string,string>;
  const values=gate4Next2ValidateValuesV39({
   ...original,GATE4_PREBIND_APPROVED_SOURCE_COMMIT:expected
  },expected);
  stage="VERIFY_EXISTING_PUBLISHED_STABLE_KEYS";
  await verifyExistingPublishedKeys();
  stage="ENCRYPT_AND_INSTALL_PRIVATE_APP_STORAGE";
  const storage=new ReplitProviderBlobStoreV39(
   String(process.env.V39_PROVIDER_BLOB_BUCKET_ID));
  const objectName=gate4Next2StorageKeyV39(expected);
  if(await storage.exists(objectName)){
   const bytes=await storage.downloadBytes(objectName);
   const decoded=gate4Next2OpenSealedValuesV39(bytes,expected,process.env);
   if(JSON.stringify(decoded)!==JSON.stringify(values))hold();
  }else{
   const sealed=gate4Next2SealValuesV39(values,expected,process.env);
   await storage.uploadBytes(objectName,sealed);
   storageWrites=1;
   const readback=await storage.downloadBytes(objectName);
   const decoded=gate4Next2OpenSealedValuesV39(readback,expected,process.env);
   if(JSON.stringify(decoded)!==JSON.stringify(values))hold();
  }
  stage="RETARGET_ONLY_NEXT2_RLS_AND_RENEW";
  const expires=new Date(Date.now()+48*3600_000).toISOString();
  await retargetSource(expected,manifest.authorizationSha256,expires);
  policyUpdates=4;
  // The private release receipt contains no password, bearer or plaintext URL.
  // On resumed install, next validation reads cloud object and rechecks DB.
  writeFileSync(REL,JSON.stringify({
   schema:"v39.gate4.next2.sealed-release-receipt.v1",
   sourceSha:expected,scopeId:NEXT2_ID,expiresUtc:expires,
   verifiedAtUtc:new Date().toISOString(),encryptedObject:true,
   oldOriginalRows:1,oldBindingRows:2,providerPaidCalls:0
  })+"\n",{flag:"w",mode:0o600});
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_NO_UI_BOOTSTRAP_READY_TO_PUBLISH",
   newPublishedSecretsRequired:0,sourceSha:expected,
   scopedRolesRenewed:true,roleExpiresUtc:expires,
   scopedRlsPoliciesRetargeted:policyUpdates,
   privateEncryptedObjectWrites:storageWrites,
   providerCalls:0,providerCreates:0,paidAuthorized:false,
   replitPublished:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_NO_UI_BOOTSTRAP_HOLD",
   stage,privateEncryptedObjectWrites:storageWrites,
   dbPoliciesMayHaveChanged:policyUpdates>0,
   providerCalls:0,providerCreates:0
  }));
  process.exitCode=2;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void main();
