/**
 * Gate 4 NEXT3: source-only, zero-provider next-session receiver bootstrap.
 *
 * A unique, immutable future scope replaces neither spent NEXT1/NEXT2
 * secrets nor their V0071/V0072 evidence. Deployed configs are encrypted
 * with existing server-only stable secrets in private Replit App Storage.
 * No provider, database, GitHub workflow or deployment effects at import.
 *
 * IMPORTANT: the scope below RESERVES AN IDENTIFIER ONLY. It is not an
 * authorization, active subscription, database policy, paid GO or callback
 * source proof. A separate new exact-scope RLS + owned binding is required.
 */
import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from "node:crypto";
import {ReplitProviderBlobStoreV39} from "./replitProviderBlobStore_v39";

export const NEXT3_ID="15bec7e1-8efc-49e7-9ee8-63521a76d71c";
export const NEXT3_RECEIVER_ROLE="gate4_receiver_2026_next3";
const PREFIX="internal/gate4/next3/";
const KEY_PURPOSE="replittranvr:gate4:next3:sealed-config:v1";
export const NEXT3_KEYS=[
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
export type Next3Values=Record<typeof NEXT3_KEYS[number],string>;
type Envelope={
 schema:"v39.gate4.next3.aes256gcm.v1";
 releaseSha:string;scopeId:string;
 salt:string;iv:string;tag:string;ciphertext:string;
};
const hold=():never=>{throw Error("GATE4_NEXT3_SEALED_BOOTSTRAP_HOLD");};
export function gate4Next3StorageKeyV39(sha:string):string{
 if(!/^[a-f0-9]{40}$/.test(sha))return hold();
 return PREFIX+sha+"/receiver-v1.aes256gcm.json";
}
function keyFromStableSecrets(env:NodeJS.ProcessEnv,salt:Buffer):Buffer{
 const url=String(env.V39_DATABASE_RUNTIME_URL??"");
 const secret=String(env.AERODATABOX_WEBHOOK_SECRET??"");
 if(!url.startsWith("postgres")||url.length<60||secret.length<32)hold();
 let u:URL;
 try{u=new URL(url);}catch{return hold();}
 if(!u.password||u.pathname!=="/neondb"||!u.hostname)hold();
 return Buffer.from(hkdfSync("sha256",
  Buffer.from(url+"\0"+secret,"utf8"),salt,Buffer.from(KEY_PURPOSE),32));
}
export function gate4Next3ValidateValuesV39(
 v:unknown,releaseSha:string
):Next3Values{
 gate4Next3StorageKeyV39(releaseSha);
 if(typeof v!=="object"||v===null||Array.isArray(v))hold();
 const obj=v as Record<string,unknown>;
 if(Object.keys(obj).length!==NEXT3_KEYS.length||
    !NEXT3_KEYS.every(k=>typeof obj[k]==="string"))hold();
 const x=obj as Next3Values;
 if(x.V39_GATE4_PREBIND_ADD_ON_PREPAID!=="1"||
    x.ADB_AUTO_COLLECT!=="false"||
    x.GATE4_PREBIND_RELEASE_REVIEW!=="EXPLICIT_NO_PROVIDER_RECEIVER"||
    x.GATE4_PREBIND_APPROVED_SOURCE_COMMIT!==releaseSha||
    x.GATE4_PREBIND_SCOPE_ID!==NEXT3_ID||
    x.GATE4_PREBIND_AIRPORT_ICAO!=="WSSS"||
    !/^[a-f0-9]{64}$/.test(x.GATE4_PREBIND_AUTH_SHA256)||
    !/^[A-Za-z0-9._~-]{32,256}$/.test(x.GATE4_PREBIND_WEBHOOK_SECRET))
   hold();
 let u:URL;
 try{u=new URL(x.GATE4_PREBIND_DATABASE_URL);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !u.password||u.hostname!==x.GATE4_PREBIND_APPROVED_DB_HOST||
    u.pathname!=="/neondb"||
    decodeURIComponent(u.username)!==NEXT3_RECEIVER_ROLE||
    u.searchParams.get("sslmode")!=="verify-full")hold();
 return x;
}
export function gate4Next3SealValuesV39(
 v:Next3Values,releaseSha:string,env:NodeJS.ProcessEnv
):Buffer{
 const values=gate4Next3ValidateValuesV39(v,releaseSha);
 const salt=randomBytes(32),iv=randomBytes(12);
 const key=keyFromStableSecrets(env,salt);
 try{
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from("v39-gate4-next3:"+NEXT3_ID+":"+releaseSha));
  const ciphertext=Buffer.concat([
   cipher.update(Buffer.from(JSON.stringify(values))),cipher.final()
  ]);
  const result:Envelope={
   schema:"v39.gate4.next3.aes256gcm.v1",
   releaseSha,scopeId:NEXT3_ID,
   salt:salt.toString("base64"),iv:iv.toString("base64"),
   tag:cipher.getAuthTag().toString("base64"),
   ciphertext:ciphertext.toString("base64")
  };
  return Buffer.from(JSON.stringify(result));
 }finally{key.fill(0);}
}
export function gate4Next3OpenSealedValuesV39(
 bytes:Uint8Array,releaseSha:string,env:NodeJS.ProcessEnv
):Next3Values{
 gate4Next3StorageKeyV39(releaseSha);
 if(bytes.byteLength>16384||bytes.byteLength<128)hold();
 let e:Envelope;
 try{e=JSON.parse(Buffer.from(bytes).toString("utf8"));}
 catch{return hold();}
 if(e.schema!=="v39.gate4.next3.aes256gcm.v1"||
    e.releaseSha!==releaseSha||e.scopeId!==NEXT3_ID)hold();
 const salt=Buffer.from(e.salt,"base64");
 const iv=Buffer.from(e.iv,"base64");
 const tag=Buffer.from(e.tag,"base64");
 const cipher=Buffer.from(e.ciphertext,"base64");
 if(salt.length!==32||iv.length!==12||tag.length!==16||
    cipher.length<100||cipher.length>8192)hold();
 const key=keyFromStableSecrets(env,salt);
 try{
  const decrypt=createDecipheriv("aes-256-gcm",key,iv);
  decrypt.setAAD(Buffer.from("v39-gate4-next3:"+NEXT3_ID+":"+releaseSha));
  decrypt.setAuthTag(tag);
  const plaintext=Buffer.concat([decrypt.update(cipher),decrypt.final()]);
  return gate4Next3ValidateValuesV39(
   JSON.parse(plaintext.toString("utf8")),releaseSha);
 }catch{return hold();}
 finally{key.fill(0);}
}
/** Published callback-only process only. No write; no plaintext persisted.
 * If an earlier NEXT2 config is loaded at the *same* compiled SHA, refuse
 * silent session takeover rather than override a live endpoint identity. */
export async function gate4Next3LoadPublishedConfigV39(
 env:NodeJS.ProcessEnv,bucketId:string,releaseSha:string
):Promise<NodeJS.ProcessEnv>{
 const storage=new ReplitProviderBlobStoreV39(bucketId);
 const key=gate4Next3StorageKeyV39(releaseSha);
 if(!await storage.exists(key))return env;
 if(env.V39_GATE4_PREBIND_ADD_ON_PREPAID==="1"&&
    env.GATE4_PREBIND_SCOPE_ID!==NEXT3_ID)hold();
 const values=gate4Next3OpenSealedValuesV39(
  await storage.downloadBytes(key),releaseSha,env);
 return {...env,...values};
}
