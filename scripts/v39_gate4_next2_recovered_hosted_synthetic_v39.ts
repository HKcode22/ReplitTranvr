/**
 * Gate4 NEXT2: one NO-PROVIDER hosted synthetic JSON POST and exact V0071
 * original-wire readback. No dependence on transient Replit owner Shell HOME.
 *
 * Existing AES-256-GCM settings are decrypted IN MEMORY from the already
 * reviewed, published NEXT2 object in private Replit App Storage. No second
 * role rotation, App Storage overwrite of the sealed receiver object, or
 * deployment secret change. The synthetic one-shot intent is stored DURABLY
 * in a separate private App Storage object BEFORE sending. Do not retry.
 */
import "dotenv/config";
import pg from "pg";
import {spawnSync} from "node:child_process";
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {
 mkdtempSync,openSync,writeSync,fsyncSync,closeSync,rmSync
} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 NEXT2_ID,gate4Next2StorageKeyV39,gate4Next2OpenSealedValuesV39,
 type Next2Values
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";

const SRC="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const HOST="https://replit-tranvr--hk84164.replit.app";
const GO="STORE_ONE_SYNTHETIC_ORIGINAL_NO_PROVIDER";
// Separate private bucket keys. Never overwrite the sealed receiver config.
const PREFIX="internal/gate4/next2/"+SRC+"/";
const INTENT=PREFIX+"synthetic-one-shot-intent-v1.json";
const RECEIPT=PREFIX+"synthetic-one-shot-positive-v1.json";
function hold():never{throw Error("GATE4_NEXT2_SYNTHETIC_HOLD");}
function storageFromExistingEnv():ReplitProviderBlobStoreV39{
 const b=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
 if(!b.startsWith("replit-objstore-"))hold();
 return new ReplitProviderBlobStoreV39(b);
}
async function sealedValues(storage:ReplitProviderBlobStoreV39):
 Promise<Next2Values>{
 const key=gate4Next2StorageKeyV39(SRC);
 // Existing published receiver proves this exact object can load. The owner
 // Shell must also possess the original two stable key-derivation secrets.
 if(!await storage.exists(key))hold();
 return gate4Next2OpenSealedValuesV39(
  await storage.downloadBytes(key),SRC,process.env);
}
export function next2SyntheticWireV39(id:string,utc:string,uuid:string):Buffer{
 if(!/^g4synthetic_[0-9a-f]{24}$/.test(id)||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(utc)||
    !/^[0-9a-f-]{36}$/.test(uuid))hold();
 return Buffer.from(JSON.stringify({
  id:uuid,timestampUtc:utc,
  subscription:{
   id,isActive:true,createdOnUtc:utc,
   subject:{type:"FlightByAirportIcao",id:"WSSS"},
   subscriber:{type:"Webhook",id:"gate4-next2-no-provider-synthetic"}
  },
  deliveryAttempt:{seqNo:0,costCredits:0,timestampUtc:utc},
  flights:[{
   number:"TEST0001",status:"Expected",departure:{},arrival:{},
   lastUpdatedUtc:utc,codeshareStatus:"Unknown",isCargo:false
  }]
 }));
}
function curl(args:string[],config?:string):{ok:boolean;http:number}{
 const proc=spawnSync("curl",[
  "--silent","--show-error","--connect-timeout","5","--max-time","15",
  "--retry","0","--proto","=https","--max-redirs","0",...args
 ],{input:config,encoding:"utf8",timeout:20000,maxBuffer:65536,
    stdio:["pipe","pipe","pipe"]});
 return {ok:proc.status===0,http:Number(String(proc.stdout??"").trim())};
}
export function next2CurlPrivateConfigV39(bearer:string):string{
 if(!/^[A-Za-z0-9._~-]{32,256}$/.test(bearer))hold();
 // Secret-bearing URL MUST NOT appear in command-line argv or logs.
 return "url = "+JSON.stringify(
  HOST+"/api/v1/webhooks/aerodatabox/"+bearer)+"\n";
}
async function publishedSourceReady():Promise<boolean>{
 const proc=spawnSync("curl",[
  "--silent","--fail","--connect-timeout","5","--max-time","15",
  "--retry","0",HOST+"/__v39/workspace-runtime"
 ],{encoding:"utf8",timeout:20000,maxBuffer:65536,
   stdio:["pipe","pipe","pipe"]});
 if(proc.status!==0)return false;
 try{
  const x=JSON.parse(String(proc.stdout));
  return x.status==="PASS"&&x.git_head===SRC&&
   x.published_deployment===true&&
   x.prepaid_route_registered===true&&
   x.gate4_alert_ingress_registered===true;
 }catch{return false;}
}
function writeTempBytes(path:string,contents:Buffer):void{
 const fd=openSync(path,"wx",0o600);
 try{writeSync(fd,contents);fsyncSync(fd);}
 finally{closeSync(fd);}
}
async function run():Promise<void>{
 let stage="ADMISSION",intentWritten=false,postAttempted=false;
 let httpStatus=0,db:pg.Client|undefined,tempDir:string|undefined;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
     !["--check","--execute-one"].includes(mode))hold();
  if(mode==="--execute-one"&&
    process.env.GATE4_NEXT2_SYNTHETIC_GO!==GO)hold();
  const storage=storageFromExistingEnv();
  const v=await sealedValues(storage);
  // The marker survives Replit Shell resets, unlike ~/.config files.
  if(await storage.exists(INTENT)||await storage.exists(RECEIPT))hold();
  stage="PUBLISHED_INGRESS";
  if(!await publishedSourceReady())hold();
  stage="RESTRICTED_READONLY_PREFLIGHT";
  db=new pg.Client({
   connectionString:v.GATE4_PREBIND_DATABASE_URL,
   connectionTimeoutMillis:6000,query_timeout:7000,statement_timeout:7000,
   options:"-c default_transaction_read_only=on"
  });
  await db.connect();
  const state=(await db.query(
   "SELECT current_user AS role,"+
   "current_setting('default_transaction_read_only') AS ro"
  )).rows[0];
  if(state?.role!=="gate4_receiver_2026_next2"||state?.ro!=="on")hold();
  const existing=(await db.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_prebind_original_v39 "+
   "WHERE scope_id=$1::uuid",[NEXT2_ID]
  )).rows[0];
  if(existing?.n!==0)hold();
  if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_SYNTHETIC_PREFLIGHT_PASS",
    sourceSha:SRC,scopeId:NEXT2_ID,
    sealedAppStorageReadback:true,
    hosted:true,next2Ingress:true,restrictedReadOnly:true,
    next2OriginalRows:0,durableSyntheticIntentAbsent:true,
    providerCalls:0,databaseWrites:0,appStorageWrites:0
   }));
   return;
  }
  stage="DURABLE_ONE_SHOT_INTENT";
  const sid="g4synthetic_"+randomBytes(12).toString("hex");
  const utc=new Date().toISOString();
  const wire=next2SyntheticWireV39(sid,utc,randomUUID());
  const sha=createHash("sha256").update(wire).digest("hex");
  // Store the harmless fake payload in the same PRIVATE bucket, so a lost
  // shell cannot erase the only clue for a possibly ambiguous HTTP result.
  const intentBytes=Buffer.from(JSON.stringify({
   schema:"v39.gate4.next2.synthetic-once-intent.v2",
   scopeId:NEXT2_ID,sourceSha:SRC,originalSha256:sha,
   syntheticSubscriptionId:sid,createdAtUtc:utc,
   syntheticWireBase64:wire.toString("base64"),
   providerDelivered:false,paidScienceExcluded:true,noRetry:true
  })+"\n");
  if(await storage.exists(INTENT))hold();
  await storage.uploadBytes(INTENT,intentBytes);
  intentWritten=true;
  const stored=Buffer.from(await storage.downloadBytes(INTENT));
  if(!stored.equals(intentBytes))hold();
  stage="SINGLE_HOSTED_SYNTHETIC_POST";
  tempDir=mkdtempSync(join(tmpdir(),"gate4-next2-synthetic-"));
  const wirePath=join(tempDir,"synthetic-wire.json");
  writeTempBytes(wirePath,wire);
  // No bearer in argv. Curl receives URL config through stdin; fixture from
  // a temporary mode-0600 file. No retries, no redirects.
  postAttempted=true;
  const result=curl([
   "--config","-","--request","POST",
   "--header","Content-Type: application/json; charset=utf-8",
   "--data-binary","@"+wirePath,
   "--output","/dev/null","--write-out","%{http_code}"
  ],next2CurlPrivateConfigV39(v.GATE4_PREBIND_WEBHOOK_SECRET));
  httpStatus=result.http;
  if(!result.ok||result.http!==200)hold();
  stage="EXACT_V0071_READBACK";
  const matches=await db.query(
   "SELECT original_wire,original_sha256,source_commit,"+
   "authorization_sha256,airport_icao,claimed_provider_subscription_id "+
   "FROM clean.gate4_alert_prebind_original_v39 "+
   "WHERE scope_id=$1::uuid AND original_sha256=$2",
   [NEXT2_ID,sha]
  );
  const row=matches.rows[0];
  if(matches.rows.length!==1||!Buffer.isBuffer(row?.original_wire)||
     !row.original_wire.equals(wire)||row.original_sha256!==sha||
     createHash("sha256").update(row.original_wire).digest("hex")!==sha||
     row.source_commit!==SRC||
     row.authorization_sha256!==v.GATE4_PREBIND_AUTH_SHA256||
     row.airport_icao!=="WSSS"||
     row.claimed_provider_subscription_id!==sid)hold();
  stage="DURABLE_POSITIVE_RECEIPT";
  await storage.uploadBytes(RECEIPT,Buffer.from(JSON.stringify({
   schema:"v39.gate4.next2.synthetic-positive.v2",
   scopeId:NEXT2_ID,sourceSha:SRC,originalSha256:sha,
   verifiedAtUtc:new Date().toISOString(),httpStatus:200,
   exactOriginalBytesVerified:true,
   nonProviderSynthetic:true,providerQualifiedOriginal:false
  })+"\n"));
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_HOSTED_SYNTHETIC_V0071_DURABLE_PASS",
   hostedHttpStatus:200,sourceSha:SRC,scopeId:NEXT2_ID,
   sha256ReadbackMatch:true,byteForByteVerified:true,
   nonProviderSynthetic:true,providerQualifiedOriginal:false,
   providerCalls:0,databaseWritesViaPublishedReceiver:1
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_HOSTED_SYNTHETIC_HOLD",
   failedStage:stage,intentWritten,postAttempted,
   hostedHttpStatus:httpStatus||null,
   noAutomaticRetry:true,providerCalls:0,paidAuthorized:false
  }));
  process.exitCode=2;
 }finally{
  if(tempDir)rmSync(tempDir,{recursive:true,force:true});
  await db?.end().catch(()=>undefined);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void run();
