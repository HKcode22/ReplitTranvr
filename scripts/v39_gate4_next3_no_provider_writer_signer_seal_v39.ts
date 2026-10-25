/**
 * NEXT3: store existing 0600 owner-writer credential + NEW Ed25519 STOP signer
 * together in one source/scope/auth-bound AES-256-GCM Replit App Storage object.
 * NO provider requests, DB writes, GitHub setting changes or deployments.
 * --check: local private admission, read-only writer connection, empty binding
 * --seal-once: irrevocable private intent THEN ONE encrypted storage upload
 * --verify: decrypt stored custody, verify sign/verify + restricted SQL SELECT
 * Never repeat --seal-once following unknown outcome or recorded intent.
 */
import "dotenv/config";
import pg from "pg";
import {
 createCipheriv,createDecipheriv,createHash,createPrivateKey,
 createPublicKey,generateKeyPairSync,hkdfSync,randomBytes,sign,verify
} from "node:crypto";
import {execFileSync} from "node:child_process";
import {join} from "node:path";
import {homedir} from "node:os";
import {readFileSync,lstatSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 NEXT3_ID,gate4Next3StorageKeyV39,gate4Next3OpenSealedValuesV39
} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";
import {next3EffectiveWriterExpiryV39} from
 "./v39_gate4_next3_role_expiry_only_20261025";

export const NEXT3_SOURCE_V39="5878b90eed04b2edfe2b226735ff0f02d9be25f3";
export const NEXT3_OWNER_ROLE_V39="gate4_owner_writer_2026_next3";
export const NEXT3_OWNER_PREFIX_V39=
 "internal/gate4/next3/"+NEXT3_SOURCE_V39+"/";
export const NEXT3_OWNER_INTENT_V39=NEXT3_OWNER_PREFIX_V39+
 "writer-stop-signer-custody-intent-v1.json";
export const NEXT3_OWNER_BLOB_V39=NEXT3_OWNER_PREFIX_V39+
 "writer-stop-signer-custody-v1.aes256gcm.json";
const GO="SEAL_NEXT3_WRITER_SIGNER_NO_PROVIDER_ONCE";
const HEX64=/^[a-f0-9]{64}$/;
const hold=():never=>{throw Error("GATE4_NEXT3_OWNER_CUSTODY_HOLD");};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const DIR=join(homedir(),".config","replittranvr","gate4-next3");

export type Next3OwnerCustodyV39={
 sourceSha:string;scopeId:string;authorizationSha256:string;
 writerUrl:string;writerExpiresUtc:string;
 signerPrivatePkcs8Base64:string;signerPublicSpkiBase64:string;
 signerSpkiSha256:string;
};

function stableKey(salt:Buffer,env:NodeJS.ProcessEnv):Buffer{
 const u=String(env.V39_DATABASE_RUNTIME_URL??"");
 const s=String(env.AERODATABOX_WEBHOOK_SECRET??"");
 if(!u.startsWith("postgres")||u.length<60||s.length<32)hold();
 const url=new URL(u);
 if(url.pathname!=="/neondb"||!url.password)hold();
 return Buffer.from(hkdfSync("sha256",Buffer.from(u+"\0"+s),
  salt,Buffer.from("replittranvr:gate4:next3:owner-writer-stop-signer:v1"),32));
}
function validate(data:Next3OwnerCustodyV39):void{
 if(!data||data.sourceSha!==NEXT3_SOURCE_V39||
    data.scopeId!==NEXT3_ID||!HEX64.test(data.authorizationSha256)||
    !HEX64.test(data.signerSpkiSha256))hold();
 let url:URL;
 try{url=new URL(data.writerUrl);}catch{hold();}
 if(!["postgres:","postgresql:"].includes(url!.protocol)||
    decodeURIComponent(url!.username)!==NEXT3_OWNER_ROLE_V39||
    !url!.password||url!.pathname!=="/neondb"||
    url!.searchParams.get("sslmode")!=="verify-full"||
    !Number.isFinite(Date.parse(data.writerExpiresUtc)))hold();
 const pk=Buffer.from(data.signerPrivatePkcs8Base64,"base64");
 const spki=Buffer.from(data.signerPublicSpkiBase64,"base64");
 if(pk.length<40||pk.length>512||spki.length<40||spki.length>512||
    sha(spki)!==data.signerSpkiSha256)hold();
 try{
  const privateKey=createPrivateKey({key:pk,format:"der",type:"pkcs8"});
  const publicKey=createPublicKey({key:spki,format:"der",type:"spki"});
  const reconstructed=Buffer.from(createPublicKey(privateKey)
    .export({format:"der",type:"spki"}));
  if(privateKey.asymmetricKeyType!=="ed25519"||
     publicKey.asymmetricKeyType!=="ed25519"||
     !reconstructed.equals(spki))hold();
  const msg=randomBytes(24);
  if(!verify(null,msg,publicKey,sign(null,msg,privateKey)))hold();
 }catch{hold();}
}
export function sealNext3OwnerCustodyV39(
 data:Next3OwnerCustodyV39,env:NodeJS.ProcessEnv
):Buffer{
 validate(data);
 const salt=randomBytes(32),iv=randomBytes(12);
 const key=stableKey(salt,env);
 try{
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from("v39-next3-owner-custody:"+
   NEXT3_ID+":"+NEXT3_SOURCE_V39+":"+data.authorizationSha256));
  const raw=Buffer.from(JSON.stringify(data));
  const ciphertext=Buffer.concat([cipher.update(raw),cipher.final()]);
  return Buffer.from(JSON.stringify({
   schema:"v39.gate4.next3.owner-custody.aes256gcm.v1",
   sourceSha:NEXT3_SOURCE_V39,scopeId:NEXT3_ID,
   authSha256:data.authorizationSha256,
   signerSpkiSha256:data.signerSpkiSha256,
   salt:salt.toString("base64"),iv:iv.toString("base64"),
   tag:cipher.getAuthTag().toString("base64"),
   ciphertext:ciphertext.toString("base64")
  }));
 }finally{key.fill(0);}
}
export function openNext3OwnerCustodyV39(
 blob:Uint8Array,auth:string,env:NodeJS.ProcessEnv
):Next3OwnerCustodyV39{
 if(blob.length<250||blob.length>8192||!HEX64.test(auth))hold();
 let e:any;
 try{e=JSON.parse(Buffer.from(blob).toString("utf8"));}catch{hold();}
 if(e.schema!=="v39.gate4.next3.owner-custody.aes256gcm.v1"||
    e.sourceSha!==NEXT3_SOURCE_V39||e.scopeId!==NEXT3_ID||
    e.authSha256!==auth||!HEX64.test(e.signerSpkiSha256))hold();
 const salt=Buffer.from(e.salt,"base64"),iv=Buffer.from(e.iv,"base64");
 const tag=Buffer.from(e.tag,"base64");
 if(salt.length!==32||iv.length!==12||tag.length!==16)hold();
 const key=stableKey(salt,env);
 try{
  const cipher=createDecipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from("v39-next3-owner-custody:"+
   NEXT3_ID+":"+NEXT3_SOURCE_V39+":"+auth));
  cipher.setAuthTag(tag);
  const bytes=Buffer.concat([
   cipher.update(Buffer.from(e.ciphertext,"base64")),cipher.final()
  ]);
  const data=JSON.parse(bytes.toString("utf8")) as Next3OwnerCustodyV39;
  validate(data);
  if(data.authorizationSha256!==auth||
     data.signerSpkiSha256!==e.signerSpkiSha256)hold();
  return data;
 }catch{hold();}finally{key.fill(0);}
}
function localFile(name:string):any{
 const root=lstatSync(DIR);
 if(!root.isDirectory()||(root.mode&0o077)!==0)hold();
 const path=join(DIR,name),s=lstatSync(path);
 if(!s.isFile()||(s.mode&0o077)!==0||s.size>8192)hold();
 return JSON.parse(readFileSync(path,"utf8"));
}
function localPrivate():{auth:string;writerUrl:string;expires:string}{
 const m=localFile("private-commission-manifest.json");
 const w=localFile("writer-credential.json");
 const d=localFile("published-receiver-private-values.json");
 if(m.source!==NEXT3_SOURCE_V39||m.scope!==NEXT3_ID||
    !HEX64.test(m.authorizationSha256)||
    w.role!==NEXT3_OWNER_ROLE_V39||
    w.source!==NEXT3_SOURCE_V39||w.scope!==NEXT3_ID||
    d.source!==NEXT3_SOURCE_V39||d.scope!==NEXT3_ID||
    d.values?.GATE4_PREBIND_AUTH_SHA256!==m.authorizationSha256||
    Date.parse(w.expiresUtc)<Date.now()+30*60_000)hold();
 return {auth:m.authorizationSha256,writerUrl:w.writerUrl,
  expires:w.expiresUtc};
}
async function writerReadOnly(url:string):Promise<void>{
 const db=new pg.Client({connectionString:url,
  connectionTimeoutMillis:6000,query_timeout:7000,
  options:"-c default_transaction_read_only=on"});
 try{
  await db.connect();
  const r=(await db.query(
   "SELECT current_user AS actor, (SELECT count(*)::int FROM "+
   "clean.gate4_alert_owned_binding_v39 WHERE scope_id=$1::uuid) AS n",
   [NEXT3_ID])).rows[0];
  if(r?.actor!==NEXT3_OWNER_ROLE_V39||r.n!==0)hold();
 }finally{await db.end().catch(()=>{});}
}
async function run():Promise<void>{
 let stage="ENTRY",intentWritten=false,blobWritten=false;
 let storage:ReplitProviderBlobStoreV39|undefined;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
     !["--check","--seal-once","--verify"].includes(mode))hold();
  if(mode==="--seal-once"){
   if(process.env.GATE4_NEXT3_OWNER_CUSTODY_GO!==GO||
      process.env.GATE4_NEXT3_OWNER_CUSTODY_OPERATOR_SHA!==
       execFileSync("git",["rev-parse","HEAD"],{
        encoding:"utf8",stdio:["ignore","pipe","ignore"]
       }).trim())hold();
  }
  const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
  if(!bucket.startsWith("replit-objstore-"))hold();
  storage=new ReplitProviderBlobStoreV39(bucket);
  const receiverKey=gate4Next3StorageKeyV39(NEXT3_SOURCE_V39);
  if(!await storage.exists(receiverKey))hold();
  const receiver=gate4Next3OpenSealedValuesV39(
   await storage.downloadBytes(receiverKey),NEXT3_SOURCE_V39,process.env);
  const auth=receiver.GATE4_PREBIND_AUTH_SHA256;
  if(mode==="--verify"){
   stage="SEALED_READBACK";
   if(!await storage.exists(NEXT3_OWNER_INTENT_V39)||
      !await storage.exists(NEXT3_OWNER_BLOB_V39))hold();
   const data=openNext3OwnerCustodyV39(
    await storage.downloadBytes(NEXT3_OWNER_BLOB_V39),auth,process.env);
   const effectiveExpiry=await next3EffectiveWriterExpiryV39(data.writerUrl);
   await writerReadOnly(data.writerUrl);
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_WRITER_SIGNER_CUSTODY_VERIFIED",
    signerSpkiSha256:data.signerSpkiSha256,
    writerExpiresUtc:effectiveExpiry,
    writerAuthenticatedReadOnly:true,encryptedReadback:true,
    providerCalls:0,databaseWrites:0,stopArmed:false,paidAuthorized:false
   }));
   return;
  }
  stage="PRIVATE_WRITER_READONLY";
  const local=localPrivate();
  if(local.auth!==auth)hold();
  await writerReadOnly(local.writerUrl);
  stage="DURABLE_CUSTODY_ADMISSION";
  if(await storage.exists(NEXT3_OWNER_INTENT_V39)||
     await storage.exists(NEXT3_OWNER_BLOB_V39))hold();
  if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_WRITER_SIGNER_CUSTODY_READY_NO_PROVIDER",
    source:NEXT3_SOURCE_V39,scope:NEXT3_ID,
    privateWriterPresent:true,writerReadOnlyPass:true,
    writerExpiresUtc:local.expires,
    sealedReceiverVerified:true,writerCustodyIntentAbsent:true,
    providerCalls:0,databaseWrites:0,storageWrites:0,stopArmed:false
   }));
   return;
  }
  stage="SAVE_DURABLE_ONCE_INTENT";
  const intent=Buffer.from(JSON.stringify({
   schema:"v39.gate4.next3.writer-signer-intent.v1",
   sourceSha:NEXT3_SOURCE_V39,scopeId:NEXT3_ID,
   authSha256:auth,createdAtUtc:new Date().toISOString(),
   noSecondSeal:true,providerCalls:0
  })+"\n");
  await storage.uploadBytes(NEXT3_OWNER_INTENT_V39,intent);
  intentWritten=true;
  if(!Buffer.from(await storage.downloadBytes(NEXT3_OWNER_INTENT_V39))
      .equals(intent))hold();
  stage="SEAL_WRITER_AND_SIGNER";
  const pair=generateKeyPairSync("ed25519");
  const privateDer=Buffer.from(pair.privateKey.export({
   format:"der",type:"pkcs8"}));
  const publicDer=Buffer.from(pair.publicKey.export({
   format:"der",type:"spki"}));
  const data:Next3OwnerCustodyV39={
   sourceSha:NEXT3_SOURCE_V39,scopeId:NEXT3_ID,
   authorizationSha256:auth,writerUrl:local.writerUrl,
   writerExpiresUtc:local.expires,
   signerPrivatePkcs8Base64:privateDer.toString("base64"),
   signerPublicSpkiBase64:publicDer.toString("base64"),
   signerSpkiSha256:sha(publicDer)
  };
  const blob=sealNext3OwnerCustodyV39(data,process.env);
  await storage.uploadBytes(NEXT3_OWNER_BLOB_V39,blob);
  blobWritten=true;
  const opened=openNext3OwnerCustodyV39(
   await storage.downloadBytes(NEXT3_OWNER_BLOB_V39),auth,process.env);
  if(opened.signerSpkiSha256!==data.signerSpkiSha256||
     opened.writerUrl!==data.writerUrl)hold();
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_WRITER_SIGNER_SEALED_NO_PROVIDER",
   signerSpkiSha256:opened.signerSpkiSha256,
   writerExpiresUtc:opened.writerExpiresUtc,
   encryptedAppStorageReadback:true,
   storageWrites:2,providerCalls:0,databaseWrites:0,
   stopArmed:false,paidAuthorized:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_WRITER_SIGNER_CUSTODY_HOLD",
   stage,intentWritten,blobWritten,noAutomaticRetry:true,
   providerCalls:0,databaseWrites:0
  }));
  process.exitCode=2;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void run();
