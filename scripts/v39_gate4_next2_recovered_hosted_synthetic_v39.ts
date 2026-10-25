/**
 * Gate4 NEXT2: one synthetic public POST -> independent restricted PG V0071 readback.
 * The new NEXT2 private credentials were created by the one-shot no-provider
 * recovery; do not reuse the older 29d-receiver rehearsal credentials.
 * No AeroDataBox account calls, no provider subscriptions or refills.
 * Treat claimed synthetic subscription ID as UNTRUSTED and NEVER science data.
 */
import "dotenv/config";
import pg from "pg";
import {spawnSync} from "node:child_process";
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {existsSync,lstatSync,readFileSync,openSync,writeSync,fsyncSync,closeSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
import {pathToFileURL} from "node:url";
import {
 NEXT2_ID,gate4Next2ValidateValuesV39
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";

const SRC="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const HOST="https://replit-tranvr--hk84164.replit.app";
const PRIVATE=join(homedir(),".config","replittranvr","gate4-next2-20261024");
const GO="STORE_ONE_SYNTHETIC_ORIGINAL_NO_PROVIDER";
const INTENT=join(PRIVATE,"next2-hosted-synthetic-intent.json");
const WIRE=join(PRIVATE,"next2-hosted-synthetic-wire.json");
const RECEIPT=join(PRIVATE,"next2-hosted-synthetic-positive.json");

function hold():never{throw Error("GATE4_NEXT2_SYNTHETIC_HOLD");}
function readPrivate(name:string):any{
 const p=join(PRIVATE,name);
 const s=lstatSync(p);
 if(!s.isFile()||(s.mode&0o077)!==0)hold();
 return JSON.parse(readFileSync(p,"utf8"));
}
function privateValues(){
 const dir=lstatSync(PRIVATE);
 if(!dir.isDirectory()||(dir.mode&0o077)!==0)hold();
 const p=readPrivate("published-receiver-settings.json");
 const c=readPrivate("receiver-credential.json");
 const receipt=readPrivate("sealed-release-install-result.json");
 if(p.scopeId!==NEXT2_ID||p.expectedCompiledSource!==SRC||
   c.scope!==NEXT2_ID||c.source!==SRC||receipt.sourceSha!==SRC||
   receipt.scopeId!==NEXT2_ID||receipt.encryptedObject!==true||
   receipt.fourNext2PoliciesRetargeted!==true||
   receipt.twoRolesRotated!==true)hold();
 const v=gate4Next2ValidateValuesV39(p.values,SRC);
 if(c.receiverUrl!==v.GATE4_PREBIND_DATABASE_URL||
   c.authorizationSha256!==v.GATE4_PREBIND_AUTH_SHA256||
   new Date(c.expiresUtc).getTime()<Date.now()+15*60_000)hold();
 return v;
}
export function next2SyntheticWireV39(id:string,utc:string,uuid:string):Buffer{
 if(!/^g4synthetic_[0-9a-f]{24}$/.test(id)||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(utc)||
    !/^[0-9a-f-]{36}$/.test(uuid))hold();
 // Entire envelope is an explicitly non-provider local test, not real flight data.
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
function curl(args:string[],config?:string):{ok:boolean;http:number;body:string}{
 const proc=spawnSync("curl",[
  "--silent","--show-error","--connect-timeout","5","--max-time","15",
  "--retry","0","--proto","=https","--max-redirs","0",
  ...args
 ],{
  input:config,encoding:"utf8",timeout:20000,maxBuffer:65536,
  stdio:["pipe","pipe","pipe"]
 });
 const body=String(proc.stdout??"");
 return {ok:proc.status===0,http:Number(body.trim()),body};
}
export function next2CurlPrivateConfigV39(bearer:string):string{
 if(!/^[A-Za-z0-9._~-]{32,256}$/.test(bearer))hold();
 // Sensitive bearer URL only in curl's stdin config, never process argv/log.
 return "url = "+JSON.stringify(
  HOST+"/api/v1/webhooks/aerodatabox/"+bearer)+"\n";
}
function publishedReady():boolean{
 const x=curl([
  "--request","GET","--output","/dev/null",
  "--write-out","%{http_code}",HOST+"/__v39/workspace-runtime"
 ]);
 return x.ok&&x.http===200;
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
function writePrivateOnce(p:string,contents:Buffer|string):void{
 const fd=openSync(p,"wx",0o600);
 try{
  writeSync(fd,contents);
  fsyncSync(fd);
 }finally{closeSync(fd);}
}
async function run():Promise<void>{
 let stage="ADMISSION",postAttempted=false,intentWritten=false;
 let httpStatus=0,db:pg.Client|undefined;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
    !["--check","--execute-one"].includes(mode))hold();
  if(mode==="--execute-one"&&
     process.env.GATE4_NEXT2_SYNTHETIC_GO!==GO)hold();
  const v=privateValues();
  if(existsSync(INTENT)||existsSync(WIRE)||existsSync(RECEIPT))hold();
  stage="PUBLISHED_INGRESS";
  if(!publishedReady()||!await publishedSourceReady())hold();
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
  const before=(await db.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_prebind_original_v39 "+
   "WHERE scope_id=$1::uuid",[NEXT2_ID]
  )).rows[0];
  if(before?.n!==0)hold();
  if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT2_SYNTHETIC_PREFLIGHT_PASS",
    hosted:true,reviewedSource:true,next2Ingress:true,
    newScopeRows:0,restrictedReadOnly:true,providerCalls:0,databaseWrites:0
   }));
   return;
  }
  stage="PERSIST_ONE_TIME_SYNTHETIC_INTENT";
  const sid="g4synthetic_"+randomBytes(12).toString("hex");
  const utc=new Date().toISOString();
  const wire=next2SyntheticWireV39(sid,utc,randomUUID());
  const sha=createHash("sha256").update(wire).digest("hex");
  writePrivateOnce(WIRE,wire);
  writePrivateOnce(INTENT,JSON.stringify({
   schema:"v39.gate4.next2.hosted-synthetic-intent.v1",
   scopeId:NEXT2_ID,sourceSha:SRC,syntheticSubscriptionId:sid,
   originalSha256:sha,createdAtUtc:utc,
   notProviderDelivered:true,doNotCountInPaidScience:true,noRetry:true
  })+"\n");
  intentWritten=true;
  stage="SINGLE_HOSTED_HTTP_POST";
  // No bearer in argv; curl reads URL with sensitive path from stdin config.
  const result=curl([
   "--config","-","--request","POST",
   "--header","Content-Type: application/json; charset=utf-8",
   "--data-binary","@"+WIRE,
   "--output","/dev/null","--write-out","%{http_code}"
  ],next2CurlPrivateConfigV39(v.GATE4_PREBIND_WEBHOOK_SECRET));
  postAttempted=true;httpStatus=result.http;
  if(!result.ok||result.http!==200)hold();
  stage="INDEPENDENT_V0071_READBACK";
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
  writePrivateOnce(RECEIPT,JSON.stringify({
   schema:"v39.gate4.next2.hosted-synthetic-positive.v1",
   scopeId:NEXT2_ID,sourceSha:SRC,
   originalSha256:sha,syntheticSubscriptionId:sid,
   verifiedAtUtc:new Date().toISOString(),httpStatus:200,
   exactOriginalBytesVerified:true,nonProviderSynthetic:true,
   providerQualifiedOriginal:false
  })+"\n");
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_HOSTED_SYNTHETIC_V0071_DURABLE_PASS",
   hostedHttpStatus:200,scopeId:NEXT2_ID,sourceSha:SRC,
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
 }finally{await db?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void run();
