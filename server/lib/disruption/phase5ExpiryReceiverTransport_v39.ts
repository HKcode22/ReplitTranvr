/** Existing published callback-only receiver: opt-in fixed expiry transport.
 * No public object selector, no provider credentials in the worker projection,
 * no startup work, no deployment/paid activation. Reuse the existing scoped
 * expiry worker and its cross-instance advisory lock.
 */
import {createHash,timingSafeEqual} from "node:crypto";
import type {RequestHandler} from "express";
import {Pool} from "pg";
import {admitP5RecurringExpiryRuntime,executeP5RecurringExpiryRuntime} from "./phase5RecurringExpiryRuntime_v39";
import {createRequiredProviderBlobStoreV39} from "./replitProviderBlobStore_v39";

export const P5_EXPIRY_RECEIVER_PATH="/__v39/phase5/recurring-expiry";
const SHA=/^[a-f0-9]{40}$/,HEX=/^[a-f0-9]{64}$/;
const hold=():never=>{throw Error("P5_EXPIRY_RECEIVER_CONFIG_HOLD");};
type Scope=ReturnType<typeof admitP5RecurringExpiryRuntime>;
type Receiver={sha:string;mode:"VERIFY_ONLY"|"APPLY_DUE_ONLY";authSha256:string;scope:Scope;bucketEnv:NodeJS.ProcessEnv};
const PROJECT_KEYS=[
 "P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA","P5_RECURRING_EXPIRY_MODE","P5_RECURRING_EXPIRY_APPROVAL",
 "P5_RECURRING_EXPIRY_LIMIT","P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID",
 "P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256","P5_RECURRING_EXPIRY_WRITER_ROLE",
 "P5_RECURRING_EXPIRY_READER_ROLE","P5_RECURRING_EXPIRY_WRITER_URL","P5_RECURRING_EXPIRY_READER_URL",
 "V39_PROVIDER_BLOB_MODE","V39_PROVIDER_BLOB_BUCKET_ID"
] as const;
export function admitP5ExpiryReceiver(env:NodeJS.ProcessEnv,deployedSource:string):Receiver|null{
 if(env.P5_RECURRING_EXPIRY_HTTP_ENABLED===undefined||env.P5_RECURRING_EXPIRY_HTTP_ENABLED==="0")return null;
 // The callback entry passes the actual build-embedded source identity.
 // Passing process.env alone would bypass esbuild's direct-property define.
 const sha=deployedSource,mode=env.P5_RECURRING_EXPIRY_MODE,auth=env.P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256;
 if(env.P5_RECURRING_EXPIRY_HTTP_ENABLED!=="1"||
    env.V39_CALLBACK_ONLY_RUNTIME!=="1"||
    env.V39_WORKSPACE_RUNTIME_OWNER_MODE!=="replit-published-deployment"||
    env.ADB_AUTO_COLLECT!=="false"||env.GITHUB_ACTIONS==="true"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    !sha||!SHA.test(sha)||
    (env.V39_DEPLOYED_GIT_HEAD!==undefined&&env.V39_DEPLOYED_GIT_HEAD!==sha)||!auth||!HEX.test(auth)||
    (mode!=="VERIFY_ONLY"&&mode!=="APPLY_DUE_ONLY")||
    env.P5_RECURRING_EXPIRY_WRITER_ROLE!=="phase5_recurring_expiry_writer_prod"||
    env.P5_RECURRING_EXPIRY_READER_ROLE!=="phase5_recurring_expiry_reader_prod")return hold();
 // Construct an allowlisted projection; never spread the receiver's broad
 // DB/provider/webhook secrets into expiry admission, and never mutate env.
 const scoped:NodeJS.ProcessEnv={ADB_AUTO_COLLECT:"0"};
 for(const key of PROJECT_KEYS)scoped[key]=env[key];
 const scope=admitP5RecurringExpiryRuntime(scoped,sha);
 const bucketEnv={V39_PROVIDER_BLOB_MODE:scoped.V39_PROVIDER_BLOB_MODE,V39_PROVIDER_BLOB_BUCKET_ID:scoped.V39_PROVIDER_BLOB_BUCKET_ID};
 return {sha,mode,authSha256:auth,scope,bucketEnv};
}
function authorized(header:string|undefined,expected:string):boolean{
 if(!header||!/^Bearer [a-f0-9]{64}$/.test(header))return false;
 const digest=createHash("sha256").update(header.slice(7),"utf8").digest();
 return timingSafeEqual(digest,Buffer.from(expected,"hex"));
}
async function execute(config:Receiver):Promise<unknown>{
 const s=config.scope;
 const writer=new Pool({connectionString:s.writerUrl,max:2,connectionTimeoutMillis:7000,query_timeout:15000,
  options:"-c statement_timeout=10000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=60000"});
 const reader=new Pool({connectionString:s.readerUrl,max:1,connectionTimeoutMillis:7000,query_timeout:15000,
  options:"-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=5000"});
 try{
  return await executeP5RecurringExpiryRuntime({...s,writer,reader,automatic:true,
   stores:{writer:createRequiredProviderBlobStoreV39(config.bucketEnv),reader:createRequiredProviderBlobStoreV39(config.bucketEnv)}});
 }finally{await Promise.all([writer.end().catch(()=>{}),reader.end().catch(()=>{})]);}
}
const COUNT_KEYS=["selectedCount","verifiedNowCount","alreadyVerifiedCount","independentlyReadBackCount",
 "recoveredReadbackCount","remainingAtCutoff","remainingUnwitnessedMarkersAtCutoff"] as const;
function receipt(value:unknown,config:Receiver):Record<string,unknown>{
 if(!value||typeof value!=="object")throw Error("P5_EXPIRY_RECEIVER_BAD_RECEIPT");
 const x=value as Record<string,unknown>;
 if(x.providerCalls!==0||x.objectDownloads!==0||x.distinctDbActorsVerified!==true||
    x.separateStorageReadRequests!==true||x.independentStorageIamVerified!==false||
    x.backupRetentionVerified!==false||x.phase6PaidGo!==false)throw Error("P5_EXPIRY_RECEIVER_BAD_RECEIPT");
 const base={status:x.status,reviewedSourceSha:config.sha,mode:config.mode,
  providerCalls:0,objectDownloads:0,distinctDbActorsVerified:true,separateStorageReadRequests:true,
  independentStorageIamVerified:false,backupRetentionVerified:false,phase6PaidGo:false};
 if(!config.scope.apply){
  if(x.status!=="SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES"||x.databaseWrites!==0||x.objectDeletions!==0)
   throw Error("P5_EXPIRY_RECEIVER_BAD_RECEIPT");
  return {...base,databaseWrites:0,objectDeletions:0};
 }
 if((x.status!=="DUE_AT_CUTOFF_CLEARED"&&x.status!=="BACKLOG_REMAINS_AT_CUTOFF")||
    x.declaredExpiryOnly!==true||!COUNT_KEYS.every(k=>typeof x[k]==="number"&&Number.isSafeInteger(x[k])&&Number(x[k])>=0)||
    Number(x.selectedCount)>config.scope.limit||
    Number(x.verifiedNowCount)+Number(x.alreadyVerifiedCount)>Number(x.selectedCount)||
    Number(x.independentlyReadBackCount)!==Number(x.verifiedNowCount)+Number(x.alreadyVerifiedCount)||
    Number(x.recoveredReadbackCount)>Number(x.alreadyVerifiedCount)||
    (x.status==="DUE_AT_CUTOFF_CLEARED")!==(x.remainingAtCutoff===0&&x.remainingUnwitnessedMarkersAtCutoff===0))
  throw Error("P5_EXPIRY_RECEIVER_BAD_RECEIPT");
 return {...base,declaredExpiryOnly:true,...Object.fromEntries(COUNT_KEYS.map(k=>[k,x[k]]))};
}
/** The raw token is never returned or logged. The request cannot select
 * objects, limit, database, time, or apply mode. Mode and source must match
 * the reviewed deployment. The worker owns cross-instance locking; local
 * busy rejection avoids unnecessary concurrent probes within this process.
 */
export function createP5ExpiryReceiverHandler(env:NodeJS.ProcessEnv,deployedSource:string,run:typeof execute=execute):RequestHandler|null{
 const config=admitP5ExpiryReceiver(env,deployedSource);
 if(!config)return null;
 let busy=false;
 return async(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!authorized(req.get("authorization"),config.authSha256)){res.status(404).json({error:"Not found"});return;}
  if(req.method!=="POST"||req.originalUrl!==P5_EXPIRY_RECEIVER_PATH||
     (req.get("content-length")!==undefined&&req.get("content-length")!=="0")||
     req.get("transfer-encoding")!==undefined||
     req.get("x-p5-expiry-reviewed-sha")!==config.sha||
     req.get("x-p5-expiry-mode")!==config.mode){
   res.status(400).json({status:"EXPIRY_REQUEST_SCOPE_REJECTED"});return;
  }
  if(busy){res.status(409).json({status:"EXPIRY_RECEIVER_BUSY_NO_NEW_WORK"});return;}
  busy=true;
  try{
   const safe=receipt(await run(config),config);
   res.status(200).json(safe);
  }catch(e){
   const message=e instanceof Error?e.message:"";
   const status=message==="HOLD_P5_RECURRING_EXPIRY_AUTOMATIC_DELETION_STOP_UNRESOLVED"?
    "EXPIRY_AUTOMATIC_DELETION_STOP_UNRESOLVED":
    message==="HOLD_P5_RECURRING_EXPIRY_RECURRING_BATCH_ALREADY_ACTIVE"?
    "EXPIRY_RECEIVER_BUSY_NO_NEW_WORK":"EXPIRY_RECEIVER_OUTCOME_UNKNOWN_NO_RETRY";
   res.status(status==="EXPIRY_RECEIVER_BUSY_NO_NEW_WORK"?409:503).json({status});
  }finally{busy=false;}
 };
}
