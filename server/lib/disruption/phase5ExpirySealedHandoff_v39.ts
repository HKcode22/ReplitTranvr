/** SHA-bound VERIFY_ONLY credential handoff for the existing Replit receiver.
 * Reuses the existing protected runtime+webhook key custody but a distinct
 * HKDF purpose. This is not provider content, a new secret service or APPLY.
 */
import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from "node:crypto";
import {admitP5ExpiryReceiver} from "./phase5ExpiryReceiverTransport_v39";
import {createRequiredProviderBlobStoreV39} from "./replitProviderBlobStore_v39";
const SHA=/^[a-f0-9]{40}$/,HEX=/^[a-f0-9]{64}$/;
const PURPOSE="replittranvr:phase5:expiry-verify-only:sealed-config:v1";
export const P5_EXPIRY_BUCKET="replit-objstore-5aa4d2c4-399b-4933-9acf-0292f79d6d59";
export const P5_EXPIRY_DB_ENDPOINT="54ed2445cebc2748a777ac9fc7be12207c3b58a1a723f80081532cec7d6b5664";
export const P5_EXPIRY_SEALED_KEYS=[
 "P5_RECURRING_EXPIRY_HTTP_ENABLED","P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256",
 "P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA","P5_RECURRING_EXPIRY_MODE",
 "P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID","P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256",
 "P5_RECURRING_EXPIRY_WRITER_ROLE","P5_RECURRING_EXPIRY_READER_ROLE",
 "P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL"
] as const;
type Values=Record<(typeof P5_EXPIRY_SEALED_KEYS)[number],string>;
type ReadStore={exists:(key:string)=>Promise<boolean>;downloadBytes:(key:string)=>Promise<Uint8Array>};
const hold=():never=>{throw Error("P5_EXPIRY_SEALED_HANDOFF_HOLD");};
export function p5ExpirySealKey(sha:string):string{
 if(!SHA.test(sha))return hold();
 return "internal/phase5/expiry-verify-only/"+sha+"/receiver-v1.aes256gcm.json";
}
export function validateP5ExpirySealedValues(input:unknown,sha:string):Values{
 p5ExpirySealKey(sha);
 if(!input||typeof input!=="object"||Array.isArray(input))return hold();
 const x=input as Record<string,unknown>;
 if(Object.keys(x).sort().join(",")!==[...P5_EXPIRY_SEALED_KEYS].sort().join(",")||
    !P5_EXPIRY_SEALED_KEYS.every(k=>typeof x[k]==="string"))return hold();
 const v=x as Values;
 if(v.P5_RECURRING_EXPIRY_HTTP_ENABLED!=="1"||v.P5_RECURRING_EXPIRY_MODE!=="VERIFY_ONLY"||
    v.P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA!==sha||!HEX.test(v.P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256)||
    v.P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID!==P5_EXPIRY_BUCKET||
    v.P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256!==P5_EXPIRY_DB_ENDPOINT)return hold();
 const config=admitP5ExpiryReceiver({...v,ADB_AUTO_COLLECT:"false",V39_CALLBACK_ONLY_RUNTIME:"1",
  V39_WORKSPACE_RUNTIME_OWNER_MODE:"replit-published-deployment",
  V39_PROVIDER_BLOB_MODE:"required",V39_PROVIDER_BLOB_BUCKET_ID:P5_EXPIRY_BUCKET},sha);
 if(!config||config.scope.apply)return hold();
 return v;
}
function key(env:NodeJS.ProcessEnv,salt:Buffer){
 let u:URL;
 const runtime=env.V39_DATABASE_RUNTIME_URL??"",webhook=env.AERODATABOX_WEBHOOK_SECRET??"";
 try{u=new URL(runtime);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(u.protocol)||u.pathname!=="/neondb"||
    !u.password||!u.hostname||webhook.length<32)return hold();
 const ikm=Buffer.from(runtime+"\0"+webhook);
 try{return Buffer.from(hkdfSync("sha256",ikm,salt,Buffer.from(PURPOSE),32));}
 finally{ikm.fill(0);}
}
const aad=(sha:string)=>Buffer.from(PURPOSE+"\0"+P5_EXPIRY_BUCKET+"\0"+p5ExpirySealKey(sha));
export function sealP5ExpiryValues(input:unknown,sha:string,env:NodeJS.ProcessEnv):Buffer{
 const v=validateP5ExpirySealedValues(input,sha),salt=randomBytes(32),iv=randomBytes(12),k=key(env,salt);
 const data=Buffer.from(JSON.stringify(v));
 try{
  const cipher=createCipheriv("aes-256-gcm",k,iv);cipher.setAAD(aad(sha));
  const ct=Buffer.concat([cipher.update(data),cipher.final()]);
  return Buffer.from(JSON.stringify({schema:PURPOSE,releaseSha:sha,salt:salt.toString("base64"),
   iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),ciphertext:ct.toString("base64")}));
 }finally{k.fill(0);data.fill(0);}
}
function decode(x:unknown,n?:number){
 if(typeof x!=="string"||!x.length||x.length>16384)return hold();
 const b=Buffer.from(x,"base64");
 if(b.toString("base64")!==x||(n!==undefined&&b.length!==n))return hold();
 return b;
}
export function openP5ExpiryValues(bytes:Uint8Array,sha:string,env:NodeJS.ProcessEnv):Values{
 p5ExpirySealKey(sha);
 if(bytes.byteLength<128||bytes.byteLength>16384)return hold();
 let e:Record<string,unknown>;
 try{e=JSON.parse(Buffer.from(bytes).toString("utf8"));}catch{return hold();}
 if(!e||Array.isArray(e)||Object.keys(e).sort().join(",")!=="ciphertext,iv,releaseSha,salt,schema,tag"||
    e.schema!==PURPOSE||e.releaseSha!==sha)return hold();
 const salt=decode(e.salt,32),iv=decode(e.iv,12),tag=decode(e.tag,16),ct=decode(e.ciphertext);
 if(ct.length<100||ct.length>8192)return hold();
 const k=key(env,salt);let clear:Buffer|undefined;
 try{
  const decipher=createDecipheriv("aes-256-gcm",k,iv);
  decipher.setAAD(aad(sha));decipher.setAuthTag(tag);
  clear=Buffer.concat([decipher.update(ct),decipher.final()]);
  return validateP5ExpirySealedValues(JSON.parse(clear.toString("utf8")),sha);
 }catch{return hold();}
 finally{k.fill(0);clear?.fill(0);}
}
/** Explicit environment disable wins; explicit direct configuration is
 * untouched. A sealed v1 bundle can ONLY enable VERIFY_ONLY. No mutation
 * at startup, no fallback to owner login; invalid/slow storage fails closed
 * in the optional route's caller without taking down ordinary callbacks.
 */
export async function loadP5ExpirySealedConfig(env:NodeJS.ProcessEnv,sha:string,store?:ReadStore):Promise<NodeJS.ProcessEnv>{
 if(env.P5_RECURRING_EXPIRY_HTTP_ENABLED!==undefined)return env;
 if(env.V39_WORKSPACE_RUNTIME_OWNER_MODE!=="replit-published-deployment")return env;
 if(env.V39_PROVIDER_BLOB_MODE!=="required"||env.V39_PROVIDER_BLOB_BUCKET_ID!==P5_EXPIRY_BUCKET)return hold();
 const storage=store??createRequiredProviderBlobStoreV39(env),object=p5ExpirySealKey(sha);
 let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error("P5_EXPIRY_SEALED_HANDOFF_HOLD")),8000);});
 try{
  return await Promise.race([timeout,(async()=>{
   const found=await storage.exists(object);
   if(found===false)return env;
   if(found!==true)return hold();
   const v=openP5ExpiryValues(await storage.downloadBytes(object),sha,env);
   if(Object.keys(env).some(k=>k.startsWith("P5_RECURRING_EXPIRY_")&&env[k]!==undefined))return hold();
   return {...env,...v};
  })()]);
 }finally{if(timer)clearTimeout(timer);}
}
