/**
 * Gate4 NEXT2: no new Replit deployment secrets.
 *
 * A short-lived scoped receiver URL and webhook bearer are uploaded as ONE
 * AES-256-GCM encrypted object into the app's already configured, private
 * Replit App Storage bucket. The key derives from the already protected
 * V39_DATABASE_RUNTIME_URL + AERODATABOX_WEBHOOK_SECRET values, which are
 * checked against the existing published deployment before encryption.
 *
 * No credentials or derived keys are embedded in code, URLs, GitHub commits,
 * build products, logs, plaintext buckets or public health response.
 * Strictly production server-only. No AeroDataBox API calls.
 */
import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from "node:crypto";
import {ReplitProviderBlobStoreV39} from "./replitProviderBlobStore_v39";

export const NEXT2_ID="16f819c6-7c68-4d5a-82cf-3820e9294dc7";
export const NEXT2_KEYS=[
 "V39_GATE4_PREBIND_ADD_ON_PREPAID",
 "ADB_AUTO_COLLECT",
 "GATE4_PREBIND_RELEASE_REVIEW",
 "GATE4_PREBIND_APPROVED_SOURCE_COMMIT",
 "GATE4_PREBIND_SCOPE_ID",
 "GATE4_PREBIND_AUTH_SHA256",
 "GATE4_PREBIND_AIRPORT_ICAO",
 "GATE4_PREBIND_DATABASE_URL",
 "GATE4_PREBIND_APPROVED_DB_HOST",
 "GATE4_PREBIND_WEBHOOK_SECRET"
] as const;
export type Next2Values=Record<typeof NEXT2_KEYS[number],string>;
type Envelope={
 schema:"v39.gate4.next2.aes256gcm.v1";
 releaseSha:string;scopeId:string;
 salt:string;iv:string;tag:string;ciphertext:string;
};
function nope():never{throw Error("GATE4_NEXT2_SEALED_BOOTSTRAP_HOLD");}
export function gate4Next2StorageKeyV39(sha:string):string{
 if(!/^[a-f0-9]{40}$/.test(sha))nope();
 return "internal/gate4/next2/"+sha+"/receiver-v1.aes256gcm.json";
}
function keyFromStableSecrets(env:NodeJS.ProcessEnv,salt:Buffer):Buffer{
 const url=String(env.V39_DATABASE_RUNTIME_URL??"");
 const secret=String(env.AERODATABOX_WEBHOOK_SECRET??"");
 if(!url.startsWith("postgres")||url.length<60||secret.length<32)nope();
 let u:URL;
 try{u=new URL(url);}catch{return nope();}
 if(!u.password||u.pathname!=="/neondb"||!u.hostname)nope();
 return Buffer.from(hkdfSync("sha256",
  Buffer.from(url+"\0"+secret,"utf8"),salt,
  Buffer.from("replittranvr:gate4:next2:sealed-config:v1"),32));
}
export function gate4Next2ValidateValuesV39(
 v:unknown,sourceSha:string):Next2Values{
 if(typeof v!=="object"||v===null||Array.isArray(v))nope();
 const obj=v as Record<string,unknown>;
 if(Object.keys(obj).length!==NEXT2_KEYS.length||
    !NEXT2_KEYS.every(k=>typeof obj[k]==="string"))nope();
 const x=obj as Next2Values;
 if(x.V39_GATE4_PREBIND_ADD_ON_PREPAID!=="1"||
    x.ADB_AUTO_COLLECT!=="false"||
    x.GATE4_PREBIND_RELEASE_REVIEW!=="EXPLICIT_NO_PROVIDER_RECEIVER"||
    x.GATE4_PREBIND_APPROVED_SOURCE_COMMIT!==sourceSha||
    x.GATE4_PREBIND_SCOPE_ID!==NEXT2_ID||
    x.GATE4_PREBIND_AIRPORT_ICAO!=="WSSS"||
    !/^[a-f0-9]{64}$/.test(x.GATE4_PREBIND_AUTH_SHA256)||
    !/^[A-Za-z0-9._~-]{32,256}$/.test(x.GATE4_PREBIND_WEBHOOK_SECRET))
    nope();
 let url:URL;
 try{url=new URL(x.GATE4_PREBIND_DATABASE_URL);}catch{return nope();}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    !url.password||url.hostname!==x.GATE4_PREBIND_APPROVED_DB_HOST||
    url.pathname!=="/neondb"||
    decodeURIComponent(url.username)!=="gate4_receiver_2026_next2"||
    url.searchParams.get("sslmode")!=="verify-full")nope();
 return x;
}
export function gate4Next2SealValuesV39(
 v:Next2Values,sourceSha:string,env:NodeJS.ProcessEnv):Buffer{
 gate4Next2StorageKeyV39(sourceSha);
 const values=gate4Next2ValidateValuesV39(v,sourceSha);
 const salt=randomBytes(32),iv=randomBytes(12);
 const key=keyFromStableSecrets(env,salt);
 const aad=Buffer.from("v39-gate4-next2:"+NEXT2_ID+":"+sourceSha);
 const encrypt=createCipheriv("aes-256-gcm",key,iv);
 encrypt.setAAD(aad);
 const encrypted=Buffer.concat([
  encrypt.update(Buffer.from(JSON.stringify(values))),encrypt.final()
 ]);
 const out:Envelope={
  schema:"v39.gate4.next2.aes256gcm.v1",releaseSha:sourceSha,scopeId:NEXT2_ID,
  salt:salt.toString("base64"),iv:iv.toString("base64"),
  tag:encrypt.getAuthTag().toString("base64"),
  ciphertext:encrypted.toString("base64")
 };
 key.fill(0);
 return Buffer.from(JSON.stringify(out));
}
export function gate4Next2OpenSealedValuesV39(
 envelopeBytes:Uint8Array,sourceSha:string,env:NodeJS.ProcessEnv
):Next2Values{
 gate4Next2StorageKeyV39(sourceSha);
 if(envelopeBytes.byteLength>16384||envelopeBytes.byteLength<128)nope();
 let e:Envelope;
 try{e=JSON.parse(Buffer.from(envelopeBytes).toString("utf8"));}
 catch{return nope();}
 if(e.schema!=="v39.gate4.next2.aes256gcm.v1"||
    e.releaseSha!==sourceSha||e.scopeId!==NEXT2_ID)nope();
 const salt=Buffer.from(e.salt,"base64");
 const iv=Buffer.from(e.iv,"base64");
 const tag=Buffer.from(e.tag,"base64");
 const cipher=Buffer.from(e.ciphertext,"base64");
 if(salt.length!==32||iv.length!==12||tag.length!==16||
    cipher.length<100||cipher.length>8192)nope();
 const key=keyFromStableSecrets(env,salt);
 try{
  const decrypt=createDecipheriv("aes-256-gcm",key,iv);
  decrypt.setAAD(Buffer.from("v39-gate4-next2:"+NEXT2_ID+":"+sourceSha));
  decrypt.setAuthTag(tag);
  const plaintext=Buffer.concat([decrypt.update(cipher),decrypt.final()]);
  return gate4Next2ValidateValuesV39(
   JSON.parse(plaintext.toString("utf8")),sourceSha);
 }catch{return nope();}
 finally{key.fill(0);}
}
export async function gate4Next2LoadPublishedConfigV39(
 env:NodeJS.ProcessEnv,bucketId:string,sourceSha:string
):Promise<NodeJS.ProcessEnv>{
 const storage=new ReplitProviderBlobStoreV39(bucketId);
 const objectName=gate4Next2StorageKeyV39(sourceSha);
 if(!await storage.exists(objectName))return env;
 const bytes=await storage.downloadBytes(objectName);
 const values=gate4Next2OpenSealedValuesV39(bytes,sourceSha,env);
 // In-memory override ONLY. Does not mutate Replit project/deployment secret
 // stores, touch global process.env, or expose raw values in response/logs.
 return {...env,...values};
}
