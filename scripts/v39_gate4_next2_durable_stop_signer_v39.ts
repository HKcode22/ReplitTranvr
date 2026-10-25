/**
 * Gate4 NEXT2 signing key escrow in existing encrypted PRIVATE Replit App Storage.
 * ONE Ed25519 signing identity for future exact-positive provider ID STOP tickets.
 * Does not write GitHub env variables, authorize provider CREATE, arm STOP,
 * rotate DB roles, or replace the proven live NEXT2 receiver.
 *
 * --check: readonly existing sealed NEXT2 receiver/writer validation + absence
 * --commission-one: persist one-shot intent, encrypted signer and verify
 * --verify: readonly open, Ed25519 sign/verify private test, print only SPKI SHA
 * Never re-run --commission-one after any intent/unknown outcome.
 */
import "dotenv/config";
import {
 generateKeyPairSync,createPrivateKey,createPublicKey,
 createCipheriv,createDecipheriv,createHash,hkdfSync,
 randomBytes,sign,verify
} from "node:crypto";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 NEXT2_ID,gate4Next2StorageKeyV39,gate4Next2OpenSealedValuesV39
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";
import {openWriterOnlyV39} from
 "./v39_gate4_next2_writer_only_durable_reissue_v39";

export const SIGNER_SOURCE_V39="087dc948c29d004f88eca141e1fc8e83c2844e3f";
export const SIGNER_PREFIX_V39="internal/gate4/next2/"+SIGNER_SOURCE_V39+"/";
export const SIGNER_INTENT_V39=SIGNER_PREFIX_V39+"stop-signer-intent-v1.json";
export const SIGNER_BLOB_V39=SIGNER_PREFIX_V39+"stop-signer-v1.aes256gcm.json";
const WRITER_BLOB=SIGNER_PREFIX_V39+"writer-one-shot-reissue-v1.aes256gcm.json";
const GO="COMMISSION_ONE_NEXT2_NO_PROVIDER_STOP_SIGNER";
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
const hold=():never=>{throw Error("GATE4_NEXT2_SIGNER_HOLD");};
function derive(salt:Buffer):Buffer{
 const u=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 const s=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 if(u.length<60||s.length<32)hold();
 return Buffer.from(hkdfSync("sha256",
  Buffer.from(u+"\0"+s),salt,
  Buffer.from("replittranvr:gate4:next2:stop-signer:v1"),32));
}
export function sealGate4Next2SignerV39(
 privateDer:Buffer,spki:Buffer,auth:string
):Buffer{
 if(!Buffer.isBuffer(privateDer)||privateDer.length<40||
  privateDer.length>512||!Buffer.isBuffer(spki)||
  spki.length<40||spki.length>512||!/^[a-f0-9]{64}$/.test(auth))
  hold();
 let p;try{
  p=createPrivateKey({key:privateDer,format:"der",type:"pkcs8"});
 }catch{hold();}
 if(p.asymmetricKeyType!=="ed25519"||
  !Buffer.from(createPublicKey(p).export({format:"der",type:"spki"})).equals(spki))
  hold();
 const pub=sha(spki),salt=randomBytes(32),iv=randomBytes(12);
 const key=derive(salt);
 try{
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from(
   "v39-gate4-next2-stop-signer:"+NEXT2_ID+":"+SIGNER_SOURCE_V39+
   ":"+auth+":"+pub));
  const ciphertext=Buffer.concat([cipher.update(privateDer),cipher.final()]);
  return Buffer.from(JSON.stringify({
   schema:"v39.gate4.next2.stop-signer.v1",
   scopeId:NEXT2_ID,sourceSha:SIGNER_SOURCE_V39,
   authorizationSha256:auth,signerSpkiSha256:pub,
   salt:salt.toString("base64"),iv:iv.toString("base64"),
   tag:cipher.getAuthTag().toString("base64"),
   ciphertext:ciphertext.toString("base64")
  }));
 }finally{key.fill(0);}
}
export function openGate4Next2SignerV39(blob:Buffer,auth:string):{
 privateDer:Buffer;publicDer:Buffer;spkiSha256:string
}{
 if(blob.length<170||blob.length>8192||!/^[a-f0-9]{64}$/.test(auth))
  hold();
 let x:any;try{x=JSON.parse(blob.toString("utf8"));}catch{hold();}
 if(x.schema!=="v39.gate4.next2.stop-signer.v1"||
    x.scopeId!==NEXT2_ID||x.sourceSha!==SIGNER_SOURCE_V39||
    x.authorizationSha256!==auth||
    !/^[a-f0-9]{64}$/.test(x.signerSpkiSha256))hold();
 const salt=Buffer.from(x.salt,"base64"),iv=Buffer.from(x.iv,"base64"),
  tag=Buffer.from(x.tag,"base64");
 if(salt.length!==32||iv.length!==12||tag.length!==16)hold();
 const key=derive(salt);
 try{
  const c=createDecipheriv("aes-256-gcm",key,iv);
  c.setAAD(Buffer.from(
   "v39-gate4-next2-stop-signer:"+NEXT2_ID+":"+SIGNER_SOURCE_V39+
   ":"+auth+":"+x.signerSpkiSha256));
  c.setAuthTag(tag);
  const privateDer=Buffer.concat([
   c.update(Buffer.from(x.ciphertext,"base64")),c.final()
  ]);
  const pk=createPrivateKey({key:privateDer,format:"der",type:"pkcs8"});
  if(pk.asymmetricKeyType!=="ed25519")hold();
  const publicDer=Buffer.from(createPublicKey(pk).export({
   format:"der",type:"spki"
  }));
  if(sha(publicDer)!==x.signerSpkiSha256)hold();
  const challenge=randomBytes(20),sig=sign(null,challenge,pk);
  if(!verify(null,challenge,createPublicKey(pk),sig))hold();
  return {privateDer,publicDer,spkiSha256:x.signerSpkiSha256};
 }catch{hold();}finally{key.fill(0);}
}
async function main(){
 let stage="ADMISSION",intentWritten=false,blobWritten=false;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
     !["--check","--verify","--commission-one"].includes(mode))hold();
  if(mode==="--commission-one"){
   const pin=String(process.env.GATE4_NEXT2_SIGNER_OPERATOR_SHA??"");
   if(!/^[a-f0-9]{40}$/.test(pin)||
    process.env.GATE4_NEXT2_SIGNER_GO!==GO||
    execFileSync("git",["rev-parse","HEAD"],{
     encoding:"utf8",stdio:["ignore","pipe","ignore"]
    }).trim()!==pin)hold();
  }
  const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
  if(!bucket.startsWith("replit-objstore-"))hold();
  const storage=new ReplitProviderBlobStoreV39(bucket);
  const key=gate4Next2StorageKeyV39(SIGNER_SOURCE_V39);
  if(!await storage.exists(key)||!await storage.exists(WRITER_BLOB))
   hold();
  const v=gate4Next2OpenSealedValuesV39(
   await storage.downloadBytes(key),SIGNER_SOURCE_V39,process.env);
  const writer=openWriterOnlyV39(
   Buffer.from(await storage.downloadBytes(WRITER_BLOB)),
   v.GATE4_PREBIND_AUTH_SHA256
  );
  if(Date.parse(writer.expiresUtc)<Date.now()+2*3600_000)hold();
  if(mode==="--verify"){
   stage="VERIFY_EXISTING_PRIVATE_SIGNER";
   if(!await storage.exists(SIGNER_INTENT_V39)||
      !await storage.exists(SIGNER_BLOB_V39))hold();
   const opened=openGate4Next2SignerV39(
    Buffer.from(await storage.downloadBytes(SIGNER_BLOB_V39)),
    v.GATE4_PREBIND_AUTH_SHA256);
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_DURABLE_STOP_SIGNER_VERIFIED",
    scopeId:NEXT2_ID,sourceSha:SIGNER_SOURCE_V39,
    signerSpkiSha256:opened.spkiSha256,
    writerAvailableForFutureBinding:true,
    providerCalls:0,providerCreates:0,databaseWrites:0,
    appStorageWrites:0,stopArmed:false,paidAuthorized:false
   }));
   return;
  }
  stage="EXISTING_INTENT_ADMISSION";
  if(await storage.exists(SIGNER_INTENT_V39)||
     await storage.exists(SIGNER_BLOB_V39))hold();
  if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_DURABLE_SIGNER_READONLY_READY",
    writerSealedCredentialsReady:true,
    intentAbsent:true,signerAbsent:true,
    providerCalls:0,databaseWrites:0,appStorageWrites:0,
    stopArmed:false,paidAuthorized:false
   }));
   return;
  }
  stage="PERSIST_ONE_SHOT_SIGNER_INTENT";
  const intent=Buffer.from(JSON.stringify({
   schema:"v39.gate4.next2.stop-signer-intent.v1",
   sourceSha:SIGNER_SOURCE_V39,scopeId:NEXT2_ID,
   authorizationSha256:v.GATE4_PREBIND_AUTH_SHA256,
   createdAtUtc:new Date().toISOString(),
   neverSecondCommission:true,providerCalls:0
  })+"\n");
  await storage.uploadBytes(SIGNER_INTENT_V39,intent);
  intentWritten=true;
  if(!Buffer.from(await storage.downloadBytes(SIGNER_INTENT_V39))
   .equals(intent))hold();
  stage="PERSIST_ENCRYPTED_SIGNER";
  const pair=generateKeyPairSync("ed25519");
  const privateDer=Buffer.from(pair.privateKey.export({
   format:"der",type:"pkcs8"
  }));
  const publicDer=Buffer.from(pair.publicKey.export({
   format:"der",type:"spki"
  }));
  const sealed=sealGate4Next2SignerV39(
   privateDer,publicDer,v.GATE4_PREBIND_AUTH_SHA256);
  await storage.uploadBytes(SIGNER_BLOB_V39,sealed);
  blobWritten=true;
  const stored=Buffer.from(await storage.downloadBytes(SIGNER_BLOB_V39));
  if(!stored.equals(sealed))hold();
  const opened=openGate4Next2SignerV39(
   stored,v.GATE4_PREBIND_AUTH_SHA256);
  if(!opened.publicDer.equals(publicDer))hold();
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_DURABLE_STOP_SIGNER_COMMISSION_PASS",
   scopeId:NEXT2_ID,sourceSha:SIGNER_SOURCE_V39,
   signerSpkiSha256:opened.spkiSha256,
   encryptedPrivateAppStorageVerified:true,
   providerCalls:0,providerCreates:0,databaseWrites:0,
   stopArmed:false,paidAuthorized:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_DURABLE_STOP_SIGNER_HOLD",failedStage:stage,
   intentWritten,blobWritten,noAutomaticRetry:true,
   providerCalls:0,paidAuthorized:false
  }));process.exitCode=2;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void main();
