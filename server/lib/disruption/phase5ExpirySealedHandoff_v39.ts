/** SHA-bound mode-separated credential handoff for the existing Replit receiver.
 * Reuses the existing protected runtime+webhook key custody but a distinct
 * HKDF purpose per mode. No provider content or startup mutation.
 */
import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from "node:crypto";
import {admitP5ExpiryReceiver} from "./phase5ExpiryReceiverTransport_v39";
import {createRequiredProviderBlobStoreV39} from "./replitProviderBlobStore_v39";
const SHA=/^[a-f0-9]{40}$/,HEX=/^[a-f0-9]{64}$/;
const VERIFY_PURPOSE="replittranvr:phase5:expiry-verify-only:sealed-config:v1";
const APPLY_PURPOSE="replittranvr:phase5:expiry-apply-due-only:sealed-config:v1";
export type P5ExpirySealedMode="VERIFY_ONLY"|"APPLY_DUE_ONLY";
const purpose=(mode:P5ExpirySealedMode)=>mode==="VERIFY_ONLY"?VERIFY_PURPOSE:mode==="APPLY_DUE_ONLY"?APPLY_PURPOSE:hold();
export const P5_EXPIRY_BUCKET="replit-objstore-5aa4d2c4-399b-4933-9acf-0292f79d6d59";
export const P5_EXPIRY_DB_ENDPOINT="54ed2445cebc2748a777ac9fc7be12207c3b58a1a723f80081532cec7d6b5664";
export const P5_EXPIRY_SEALED_KEYS=[
 "P5_RECURRING_EXPIRY_HTTP_ENABLED","P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256",
 "P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA","P5_RECURRING_EXPIRY_MODE",
 "P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID","P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256",
 "P5_RECURRING_EXPIRY_WRITER_ROLE","P5_RECURRING_EXPIRY_READER_ROLE",
 "P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL"
] as const;
type Values=Record<(typeof P5_EXPIRY_SEALED_KEYS)[number],string>&{P5_RECURRING_EXPIRY_APPROVAL?:string;P5_RECURRING_EXPIRY_LIMIT?:string};
const keysFor=(mode:P5ExpirySealedMode)=>mode==="VERIFY_ONLY"?[...P5_EXPIRY_SEALED_KEYS]:[...P5_EXPIRY_SEALED_KEYS,"P5_RECURRING_EXPIRY_APPROVAL","P5_RECURRING_EXPIRY_LIMIT"];
type ReadStore={exists:(key:string)=>Promise<boolean>;downloadBytes:(key:string)=>Promise<Uint8Array>};
const hold=():never=>{throw Error("P5_EXPIRY_SEALED_HANDOFF_HOLD");};
export function p5ExpirySealKey(sha:string,mode:P5ExpirySealedMode="VERIFY_ONLY"):string{
 if(!SHA.test(sha))return hold();
 purpose(mode);
 return "internal/phase5/"+(mode==="VERIFY_ONLY"?"expiry-verify-only":"expiry-apply-due-only")+"/"+sha+"/receiver-v1.aes256gcm.json";
}
export function validateP5ExpirySealedValues(input:unknown,sha:string,mode:P5ExpirySealedMode="VERIFY_ONLY"):Values{
 p5ExpirySealKey(sha,mode);
 if(!input||typeof input!=="object"||Array.isArray(input))return hold();
 const x=input as Record<string,unknown>;
 if(Object.keys(x).sort().join(",")!==keysFor(mode).sort().join(",")||
    !keysFor(mode).every(k=>typeof x[k]==="string"))return hold();
 const v=x as Values;
 if(v.P5_RECURRING_EXPIRY_HTTP_ENABLED!=="1"||v.P5_RECURRING_EXPIRY_MODE!==mode||
    v.P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA!==sha||!HEX.test(v.P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256)||
    v.P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID!==P5_EXPIRY_BUCKET||
    v.P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256!==P5_EXPIRY_DB_ENDPOINT)return hold();
 const config=admitP5ExpiryReceiver({...v,ADB_AUTO_COLLECT:"false",V39_CALLBACK_ONLY_RUNTIME:"1",
  V39_WORKSPACE_RUNTIME_OWNER_MODE:"replit-published-deployment",
  V39_PROVIDER_BLOB_MODE:"required",V39_PROVIDER_BLOB_BUCKET_ID:P5_EXPIRY_BUCKET},sha);
 if(!config||config.scope.apply!==(mode==="APPLY_DUE_ONLY")||
    (mode==="APPLY_DUE_ONLY"&&(v.P5_RECURRING_EXPIRY_APPROVAL!=="APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER"||v.P5_RECURRING_EXPIRY_LIMIT!=="10")))return hold();
 return v;
}
function key(env:NodeJS.ProcessEnv,salt:Buffer,mode:P5ExpirySealedMode){
 let u:URL;
 const runtime=env.V39_DATABASE_RUNTIME_URL??"",webhook=env.AERODATABOX_WEBHOOK_SECRET??"";
 try{u=new URL(runtime);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(u.protocol)||u.pathname!=="/neondb"||
    !u.password||!u.hostname||webhook.length<32)return hold();
 const ikm=Buffer.from(runtime+"\0"+webhook);
 try{return Buffer.from(hkdfSync("sha256",ikm,salt,Buffer.from(purpose(mode)),32));}
 finally{ikm.fill(0);}
}
const aad=(sha:string,mode:P5ExpirySealedMode)=>Buffer.from(purpose(mode)+"\0"+P5_EXPIRY_BUCKET+"\0"+p5ExpirySealKey(sha,mode));
export function sealP5ExpiryValues(input:unknown,sha:string,env:NodeJS.ProcessEnv,mode:P5ExpirySealedMode="VERIFY_ONLY"):Buffer{
 const v=validateP5ExpirySealedValues(input,sha,mode),salt=randomBytes(32),iv=randomBytes(12),k=key(env,salt,mode);
 const data=Buffer.from(JSON.stringify(v));
 try{
  const cipher=createCipheriv("aes-256-gcm",k,iv);cipher.setAAD(aad(sha,mode));
  const ct=Buffer.concat([cipher.update(data),cipher.final()]);
  return Buffer.from(JSON.stringify({schema:purpose(mode),releaseSha:sha,salt:salt.toString("base64"),
   iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),ciphertext:ct.toString("base64")}));
 }finally{k.fill(0);data.fill(0);}
}
function decode(x:unknown,n?:number){
 if(typeof x!=="string"||!x.length||x.length>16384)return hold();
 const b=Buffer.from(x,"base64");
 if(b.toString("base64")!==x||(n!==undefined&&b.length!==n))return hold();
 return b;
}
export function openP5ExpiryValues(bytes:Uint8Array,sha:string,env:NodeJS.ProcessEnv,mode:P5ExpirySealedMode="VERIFY_ONLY"):Values{
 p5ExpirySealKey(sha,mode);
 if(bytes.byteLength<128||bytes.byteLength>16384)return hold();
 let e:Record<string,unknown>;
 try{e=JSON.parse(Buffer.from(bytes).toString("utf8"));}catch{return hold();}
 if(!e||Array.isArray(e)||Object.keys(e).sort().join(",")!=="ciphertext,iv,releaseSha,salt,schema,tag"||
    e.schema!==purpose(mode)||e.releaseSha!==sha)return hold();
 const salt=decode(e.salt,32),iv=decode(e.iv,12),tag=decode(e.tag,16),ct=decode(e.ciphertext);
 if(ct.length<100||ct.length>8192)return hold();
 const k=key(env,salt,mode);let clear:Buffer|undefined;
 try{
  const decipher=createDecipheriv("aes-256-gcm",k,iv);
  decipher.setAAD(aad(sha,mode));decipher.setAuthTag(tag);
  clear=Buffer.concat([decipher.update(ct),decipher.final()]);
  return validateP5ExpirySealedValues(JSON.parse(clear.toString("utf8")),sha,mode);
 }catch{return hold();}
 finally{k.fill(0);clear?.fill(0);}
}
/** Explicit environment disable wins; explicit direct configuration is
 * untouched. The VERIFY v1 bundle can never enable APPLY. Separate APPLY custody is scoped. No mutation
 * at startup, no fallback to owner login; invalid/slow storage fails closed
 * in the optional route's caller without taking down ordinary callbacks.
 */
export async function loadP5ExpirySealedConfig(env:NodeJS.ProcessEnv,sha:string,store?:ReadStore,mode:P5ExpirySealedMode="VERIFY_ONLY"):Promise<NodeJS.ProcessEnv>{
 if(env.P5_RECURRING_EXPIRY_HTTP_ENABLED!==undefined)return env;
 if(env.V39_WORKSPACE_RUNTIME_OWNER_MODE!=="replit-published-deployment")return env;
 if(env.V39_PROVIDER_BLOB_MODE!=="required"||env.V39_PROVIDER_BLOB_BUCKET_ID!==P5_EXPIRY_BUCKET)return hold();
 const storage=store??createRequiredProviderBlobStoreV39(env),object=p5ExpirySealKey(sha,mode);
 let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error("P5_EXPIRY_SEALED_HANDOFF_HOLD")),8000);});
 try{
  return await Promise.race([timeout,(async()=>{
   const found=await storage.exists(object);
   if(found===false)return env;
   if(found!==true)return hold();
   const v=openP5ExpiryValues(await storage.downloadBytes(object),sha,env,mode);
   if(Object.keys(env).some(k=>k.startsWith("P5_RECURRING_EXPIRY_")&&env[k]!==undefined))return hold();
   return {...env,...v};
  })()]);
 }finally{if(timer)clearTimeout(timer);}
}

/** Separate APPLY requires valid VERIFY, same restricted actors and distinct digest. */
export async function loadP5ExpiryReceiverPair(env:NodeJS.ProcessEnv,sha:string,store?:ReadStore){
 const primary=await loadP5ExpirySealedConfig(env,sha,store);
 if(env.P5_RECURRING_EXPIRY_HTTP_ENABLED!==undefined||
    primary.P5_RECURRING_EXPIRY_MODE!=="VERIFY_ONLY"||
    primary.P5_RECURRING_EXPIRY_HTTP_ENABLED!=="1")return {primary,apply:null};
 try{
  const apply=await loadP5ExpirySealedConfig(env,sha,store,"APPLY_DUE_ONLY");
  if(apply.P5_RECURRING_EXPIRY_MODE!=="APPLY_DUE_ONLY"||
     apply.P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256===primary.P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256||
     ["P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL"].some(k=>apply[k]!==primary[k]))
   return {primary,apply:null};
  return {primary,apply};
 }catch{return {primary,apply:null};}
}
