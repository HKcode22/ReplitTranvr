/**
 * Gate4 forward-only receiver configuration for a NEW unspent NEXT4 scope.
 * This does not create/authorize subscriptions or grant PostgreSQL privileges.
 * A private, SHA-bound AES-GCM blob in existing dedicated Replit Object Storage
 * is read by the published callback-only process. It is not a generic secret
 * store, and it never silently reuses spent NEXT1/NEXT2/NEXT3 custody.
 */
import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from "node:crypto";
import {ReplitProviderBlobStoreV39} from "./replitProviderBlobStore_v39";
import {NEXT3_ID} from "./gate4Next3SealedBootstrap_v39";
import {NEXT2_ID} from "./gate4Next2SealedBootstrap_v39";

export const NEXT4_RECEIVER_ROLE_V39="gate4_receiver_2026_next4";
const PREFIX="internal/gate4/next4/";
const PURPOSE="replittranvr:gate4:next4:sealed-config:v1";
const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BANNED_SCOPES=new Set([
 NEXT2_ID,NEXT3_ID,
 "d6c0fcac-798e-4913-bfd1-a561adb3dd82",
 "498dccd7-5da3-4687-a6ea-e0dc03b54398"
]);
export const NEXT4_KEYS_V39=[
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
export type Next4ValuesV39=Record<(typeof NEXT4_KEYS_V39)[number],string>;
type Envelope={
 schema:"v39.gate4.next4.aes256gcm.v1";
 releaseSha:string;scopeId:string;
 salt:string;iv:string;tag:string;ciphertext:string;
};
const hold=():never=>{throw Error("GATE4_NEXT4_SEALED_RECEIVER_HOLD");};
export function gate4Next4ConfigStorageKeyV39(sha:string):string{
 if(!HEX40.test(sha))return hold();
 return PREFIX+sha+"/receiver-v1.aes256gcm.json";
}
export function gate4Next4ValidateValuesV39(
 input:unknown,releaseSha:string
):Next4ValuesV39{
 gate4Next4ConfigStorageKeyV39(releaseSha);
 if(!input||typeof input!=="object"||Array.isArray(input))return hold();
 const x=input as Record<string,unknown>;
 if(JSON.stringify(Object.keys(x).sort())!==
    JSON.stringify([...NEXT4_KEYS_V39].sort())||
    !NEXT4_KEYS_V39.every(k=>typeof x[k]==="string"))return hold();
 const v=x as Next4ValuesV39;
 if(v.V39_GATE4_PREBIND_ADD_ON_PREPAID!=="1"||
    v.ADB_AUTO_COLLECT!=="false"||
    v.GATE4_PREBIND_RELEASE_REVIEW!=="EXPLICIT_NO_PROVIDER_RECEIVER"||
    v.GATE4_PREBIND_APPROVED_SOURCE_COMMIT!==releaseSha||
    !UUID.test(v.GATE4_PREBIND_SCOPE_ID)||
    BANNED_SCOPES.has(v.GATE4_PREBIND_SCOPE_ID)||
    !HEX64.test(v.GATE4_PREBIND_AUTH_SHA256)||
    v.GATE4_PREBIND_AIRPORT_ICAO!=="WSSS"||
    !/^[A-Za-z0-9._~-]{32,256}$/.test(v.GATE4_PREBIND_WEBHOOK_SECRET))
    return hold();
 let u:URL;
 try{u=new URL(v.GATE4_PREBIND_DATABASE_URL);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !u.password||u.pathname!=="/neondb"||
    !u.hostname||u.hostname!==v.GATE4_PREBIND_APPROVED_DB_HOST||
    decodeURIComponent(u.username)!==NEXT4_RECEIVER_ROLE_V39||
    u.searchParams.get("sslmode")!=="verify-full")
   return hold();
 return v;
}
function deriveKeyV39(env:NodeJS.ProcessEnv,salt:Buffer):Buffer{
 const url=String(env.V39_DATABASE_RUNTIME_URL??"");
 const secret=String(env.AERODATABOX_WEBHOOK_SECRET??"");
 let u:URL;
 try{u=new URL(url);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !u.password||u.pathname!=="/neondb"||!u.hostname||
    secret.length<32)return hold();
 return Buffer.from(hkdfSync("sha256",Buffer.from(url+"\0"+secret,"utf8"),
   salt,Buffer.from(PURPOSE),32));
}
export function gate4Next4SealValuesV39(
 input:Next4ValuesV39,sha:string,env:NodeJS.ProcessEnv
):Buffer{
 const v=gate4Next4ValidateValuesV39(input,sha);
 const salt=randomBytes(32),iv=randomBytes(12),key=deriveKeyV39(env,salt);
 try{
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(Buffer.from("v39-gate4-next4:"+v.GATE4_PREBIND_SCOPE_ID+":"+sha));
  const ct=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(v))),cipher.final()]);
  const out:Envelope={
   schema:"v39.gate4.next4.aes256gcm.v1",
   releaseSha:sha,scopeId:v.GATE4_PREBIND_SCOPE_ID,
   salt:salt.toString("base64"),iv:iv.toString("base64"),
   tag:cipher.getAuthTag().toString("base64"),
   ciphertext:ct.toString("base64")
  };
  return Buffer.from(JSON.stringify(out));
 }finally{key.fill(0);}
}
export function gate4Next4OpenSealedValuesV39(
 bytes:Uint8Array,sha:string,env:NodeJS.ProcessEnv
):Next4ValuesV39{
 gate4Next4ConfigStorageKeyV39(sha);
 if(bytes.byteLength<128||bytes.byteLength>16384)return hold();
 let e:Envelope;
 try{e=JSON.parse(Buffer.from(bytes).toString("utf8"));}
 catch{return hold();}
 if(e.schema!=="v39.gate4.next4.aes256gcm.v1"||
    e.releaseSha!==sha||!UUID.test(e.scopeId)||
    BANNED_SCOPES.has(e.scopeId))return hold();
 const salt=Buffer.from(e.salt,"base64");
 const iv=Buffer.from(e.iv,"base64");
 const tag=Buffer.from(e.tag,"base64");
 const ct=Buffer.from(e.ciphertext,"base64");
 if(salt.length!==32||iv.length!==12||tag.length!==16||
    ct.length<100||ct.length>8192)return hold();
 const key=deriveKeyV39(env,salt);
 try{
  const decipher=createDecipheriv("aes-256-gcm",key,iv);
  decipher.setAAD(Buffer.from("v39-gate4-next4:"+e.scopeId+":"+sha));
  decipher.setAuthTag(tag);
  const clear=Buffer.concat([decipher.update(ct),decipher.final()]);
  const v=gate4Next4ValidateValuesV39(
    JSON.parse(clear.toString("utf8")),sha);
  if(v.GATE4_PREBIND_SCOPE_ID!==e.scopeId)return hold();
  return v;
 }catch{return hold();}
 finally{key.fill(0);}
}
export async function gate4Next4LoadPublishedConfigV39(
 env:NodeJS.ProcessEnv,bucketId:string,sha:string
):Promise<NodeJS.ProcessEnv>{
 const store=new ReplitProviderBlobStoreV39(bucketId);
 const key=gate4Next4ConfigStorageKeyV39(sha);
 if(!await store.exists(key))return env;
 // An already-active preceding scope must never be silently superseded.
 if(env.V39_GATE4_PREBIND_ADD_ON_PREPAID==="1")return hold();
 const v=gate4Next4OpenSealedValuesV39(
  await store.downloadBytes(key),sha,env);
 return {...env,...v};
}
