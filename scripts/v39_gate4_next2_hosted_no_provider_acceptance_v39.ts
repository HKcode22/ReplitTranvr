/**
 * Gate 4 fresh-scope HOSTED real JSON -> V0071 acceptance.
 *
 * This is a one-shot SYNTHETIC webhook probe only. It NEVER calls the
 * AeroDataBox provider, performs CREATE/DELETE, refills balance, or grants
 * PostgreSQL privileges. Do not run against an already spent paid scope.
 *
 * Requires independently reviewed new scope, restricted V0071 receiver login,
 * actual published compiled receiver sha and secret, and 0700 private custody.
 * --check does no I/O beyond local parameter parsing.
 * --execute-one writes a private intent FIRST, then performs exactly one
 * synthetic public POST with an explicitly non-provider subscription ID.
 *
 * No flight data, bearer, URL, DB details, raw JSON or ID is printed.
 * The synthetic row must NEVER count as a provider-delivered original.
 */
import "dotenv/config";
import pg from "pg";
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {existsSync,lstatSync,openSync,writeSync,fsyncSync,closeSync} from "node:fs";
import {join,resolve,sep} from "node:path";
import {homedir} from "node:os";
import {pathToFileURL} from "node:url";
import {checkGate4PrebindScopeV39,type Gate4PrebindScopeV39} from
 "../server/lib/disruption/gate4PrebindIngress_v39";

const REVIEWED_RECEIVER_SHA="29d3e0dff8b8863f55f6d73e609e21480b8e46db";
const HOST="replit-tranvr--hk84164.replit.app";
const BASE="https://"+HOST;
const FORBIDDEN_SCOPES=new Set([
 "d6c0fcac-798e-4913-bfd1-a561adb3dd82",
 "498dccd7-5da3-4687-a6ea-e0dc03b54398"
]);
const GO="STORE_ONE_SYNTHETIC_ORIGINAL_NO_PROVIDER";
const SECRET=/^[A-Za-z0-9._~-]{32,256}$/;
const SHA64=/^[a-f0-9]{64}$/;
const DB_ROLE=/^gate4_receiver_[a-z0-9_]{4,60}$/;
type Config=Readonly<{
 scope:Gate4PrebindScopeV39;
 bearer:string;dbUrl:string;dbRole:string;dbHost:string;privateDir:string;
}>;

function hold():never{throw Error("GATE4_HOSTED_ACCEPTANCE_HOLD");}
function exactConfig(env:NodeJS.ProcessEnv):Config{
 const scope:Gate4PrebindScopeV39={
  scopeId:String(env.GATE4_REHEARSAL_SCOPE_ID??""),
  sourceCommit:String(env.GATE4_REHEARSAL_SOURCE_SHA??""),
  authorizationSha256:String(env.GATE4_REHEARSAL_AUTH_SHA256??""),
  airportIcao:"WSSS"
 };
 const bearer=String(env.GATE4_REHEARSAL_WEBHOOK_BEARER??"");
 const dbUrl=String(env.GATE4_REHEARSAL_RECEIVER_DATABASE_URL??"");
 const dbHost=String(env.GATE4_REHEARSAL_EXPECTED_DB_HOST??"");
 const privateDir=String(env.GATE4_REHEARSAL_PRIVATE_DIR??"");
 if(!checkGate4PrebindScopeV39(scope)||
    scope.sourceCommit!==REVIEWED_RECEIVER_SHA||
    FORBIDDEN_SCOPES.has(scope.scopeId)||
    !SHA64.test(scope.authorizationSha256)||
    !SECRET.test(bearer)||!privateDir)hold();
 let url:URL;
 try{url=new URL(dbUrl);}catch{return hold();}
 const dbRole=decodeURIComponent(url.username);
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    !url.password||url.hostname!==dbHost||
    url.pathname!=="/neondb"||
    url.searchParams.get("sslmode")!=="verify-full"||
    !DB_ROLE.test(dbRole))hold();
 const base=resolve(homedir(),".config","replittranvr");
 const target=resolve(privateDir);
 if(!target.startsWith(base+sep))hold();
 return {scope,bearer,dbUrl,dbRole,dbHost,privateDir:target};
}

export function gate4SyntheticWireV39(
 subscriptionId:string,nowUtc:string,notificationId:string
):Buffer{
 if(!/^g4synthetic_[a-f0-9]{24}$/.test(subscriptionId)||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(nowUtc)||
    !/^[a-f0-9-]{36}$/.test(notificationId))hold();
 // No real flight, tail, route or timestamp data; field shapes follow
 // AeroDataBox FlightNotificationContract OpenAPI v1.15.4.0.
 return Buffer.from(JSON.stringify({
  id:notificationId,timestampUtc:nowUtc,
  subscription:{
   id:subscriptionId,isActive:true,createdOnUtc:nowUtc,
   subject:{type:"FlightByAirportIcao",id:"WSSS"},
   subscriber:{type:"Webhook",id:"no-provider-acceptance-fixture"}
  },
  deliveryAttempt:{seqNo:0,costCredits:0,timestampUtc:nowUtc},
  flights:[{
   number:"TEST0001",status:"Expected",departure:{},arrival:{},
   lastUpdatedUtc:nowUtc,codeshareStatus:"Unknown",isCargo:false
  }]
 }));
}

function writeOnce(path:string,record:unknown):void{
 const fd=openSync(path,"wx",0o600);
 try{
  writeSync(fd,JSON.stringify(record)+"\n");
  fsyncSync(fd);
 }finally{closeSync(fd);}
}

async function publishedReady(scope:Gate4PrebindScopeV39):Promise<boolean>{
 const response=await fetch(BASE+"/__v39/workspace-runtime",{
  method:"GET",redirect:"error",cache:"no-store",
  signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)return false;
 const h=await response.json() as Record<string,unknown>;
 return h.status==="PASS"&&h.git_head===scope.sourceCommit&&
  h.published_deployment===true&&
  h.gate4_alert_ingress_registered===true&&
  h.prepaid_route_registered===true&&
  h.runtime_owner_mode==="replit-published-deployment";
}

async function run():Promise<void>{
 let stage="PARAMETERS",providerRequests=0;
 let db:pg.Client|undefined;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
     !["--check","--execute-one"].includes(mode))hold();
  const config=exactConfig(process.env);
  const scope=config.scope;
  if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_HOSTED_NO_PROVIDER_ACCEPTANCE_PREPARED",
    proposedScope:scope.scopeId,
    receiverSource:scope.sourceCommit,
    syntheticOnly:true,providerRequests,databaseWrites:0
   }));
   return;
  }
  if(process.env.GATE4_NO_PROVIDER_REHEARSAL_GO!==GO)hold();
  stage="PRIVATE_INTENT";
  const s=lstatSync(config.privateDir);
  if(!s.isDirectory()||(s.mode&0o077)!==0)hold();
  const intent=join(config.privateDir,"gate4-hosted-synthetic-intent.json");
  const receipt=join(config.privateDir,"gate4-hosted-synthetic-positive-readback.json");
  if(existsSync(intent)||existsSync(receipt))hold();

  stage="PUBLISHED_RECEIVER_HEALTH";
  if(!await publishedReady(scope))hold();
  stage="RESTRICTED_DB_PREFLIGHT";
  db=new pg.Client({
   connectionString:config.dbUrl,connectionTimeoutMillis:6000,
   statement_timeout:7000,query_timeout:7000,
   options:"-c default_transaction_read_only=on"
  });
  await db.connect();
  const actor=(await db.query(
   "SELECT current_user AS actor,"+
   "current_setting('default_transaction_read_only') AS ro"
  )).rows[0];
  if(actor?.actor!==config.dbRole||actor?.ro!=="on")hold();
  // A brand-new isolated approval has no existing scoped original.
  const before=await db.query(
   "SELECT count(*)::int AS n FROM clean.gate4_alert_prebind_original_v39 "+
   "WHERE scope_id=$1::uuid",[scope.scopeId]
  );
  if(before.rows.length!==1||before.rows[0].n!==0)hold();

  const syntheticId="g4synthetic_"+randomBytes(12).toString("hex");
  const nowUtc=new Date().toISOString();
  const wire=gate4SyntheticWireV39(syntheticId,nowUtc,randomUUID());
  const sha=createHash("sha256").update(wire).digest("hex");

  // Write intent before a possibly ambiguous HTTP result: NEVER auto-retry.
  writeOnce(intent,{
   schema:"v39.gate4.synthetic-hosted-intent.v1",
   scopeId:scope.scopeId,sourceSha:scope.sourceCommit,
   originalSha256:sha,syntheticSubscriptionId:syntheticId,
   sentAtUtc:nowUtc,notProviderDelivered:true,
   doNotCountTowardPaidScience:true,noSecondPost:true
  });
  stage="SINGLE_HOSTED_SYNTHETIC_POST";
  const response=await fetch(
   BASE+"/api/v1/webhooks/aerodatabox/"+encodeURIComponent(config.bearer),{
    method:"POST",redirect:"error",
    headers:{"content-type":"application/json; charset=utf-8"},
    body:wire,signal:AbortSignal.timeout(12000)
   }
  );
  await response.body?.cancel();
  if(response.status!==200)hold();

  stage="EXACT_V0071_READBACK";
  const readback=await db.query(
   "SELECT original_wire,original_sha256,source_commit,"+
   "authorization_sha256,airport_icao,claimed_provider_subscription_id "+
   "FROM clean.gate4_alert_prebind_original_v39 "+
   "WHERE scope_id=$1::uuid AND original_sha256=$2",
   [scope.scopeId,sha]
  );
  const row=readback.rows[0];
  if(readback.rows.length!==1||!Buffer.isBuffer(row.original_wire)||
     !row.original_wire.equals(wire)||
     row.original_sha256!==sha||
     createHash("sha256").update(row.original_wire).digest("hex")!==sha||
     row.source_commit!==scope.sourceCommit||
     row.authorization_sha256!==scope.authorizationSha256||
     row.airport_icao!=="WSSS"||
     row.claimed_provider_subscription_id!==syntheticId)hold();
  writeOnce(receipt,{
   schema:"v39.gate4.synthetic-hosted-readback.v1",
   scopeId:scope.scopeId,sourceSha:scope.sourceCommit,
   originalSha256:sha,syntheticSubscriptionId:syntheticId,
   verifiedAtUtc:new Date().toISOString(),httpStatus:200,
   exactOriginalBytesVerified:true,
   nonProviderSynthetic:true,qualifiedPaidOriginal:false
  });
  console.log(JSON.stringify({
   status:"GATE4_PUBLISHED_VALID_JSON_V0071_DURABLE_PASS",
   scopeId:scope.scopeId,receiverSource:scope.sourceCommit,
   httpStatus:200,sha256ReadbackMatch:true,
   nonProviderSynthetic:true,qualifiedPaidOriginal:false,
   providerRequests,databaseWritesViaReceiver:1
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_HOSTED_ACCEPTANCE_HOLD",
   failedStage:stage,providerRequests,
   paidCreates:0,providerDeletes:0,noAutomaticRetry:true,
   qualifiedPaidOriginal:false
  }));
  process.exitCode=2;
 }finally{
  await db?.end().catch(()=>undefined);
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void run();
