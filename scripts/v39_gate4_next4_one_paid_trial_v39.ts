/**
 * NEXT4 one-scoped paid WSSS trial. Owner explicitly authorized Oct26 2026:
 * one CREATE, 5-credit SOFT target, protected floor 1900; SEND may overshoot.
 * Preserves private prior trial evidence. Only performs paid CREATE after
 * genuine independent protected GitHub STOP ARMED bot proof + running observer.
 * Unknown CREATE outcome is terminal, never a second CREATE.
 */
import "dotenv/config";
import pg from "pg";
import {execFileSync} from "node:child_process";
import {readFileSync,existsSync,lstatSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {createHash,createPrivateKey,generateKeyPairSync,randomBytes,hkdfSync,createCipheriv,createDecipheriv,sign} from "node:crypto";
import {ReplitProviderBlobStoreV39} from "../server/lib/disruption/replitProviderBlobStore_v39";
import {gate4Next4ConfigStorageKeyV39,gate4Next4OpenSealedValuesV39} from "../server/lib/disruption/gate4Next4SealedBootstrap_v39";
import {NEXT4_WRITER_ROLE_V39} from "./v39_gate4_next4_receiver_commission_v39";
import {getBalanceEvidenceStrict,listSubscriptionsStrict,
 createGate4SingleWithRawReceiptV39,deleteSubscriptionVerifiedStrict,
 type Gate4PositiveCreateReceiptTransportV39} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {runGate4OnePositiveOwnerV39} from "../server/lib/disruption/gate4LiveCreateOperator_v39";
import {createGate4OwnedBindingPgStoreV39} from "../server/lib/disruption/gate4OwnedBindingPgStore_v39";
import {reviewGate4ActionsWatchScopeV39,type Gate4ActionsWatchScopeV39} from "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";
import {gate4StopTicketSigningMessageV39,inspectGate4SignedStopCustodyV39} from "../server/lib/disruption/gate4SignedStopCustody_v39";
import {next3StopArmedV39} from "./v39_gate4_next3_paid_trial_custody_v39";

const REPO="HKcode22/ReplitTranvr";
const SRC="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const HOME="https://replit-tranvr--hk84164.replit.app";
const BASE="internal/gate4/next4/"+SRC+"/";
const SIGNER_KEY=BASE+"next4-trial-signer-v1.aes256gcm.json";
const PLAN_KEY=BASE+"paid-plan-v1.json";
const INTENT_KEY=BASE+"paid-one-create-intent-v1.json";
const POSITIVE_KEY=BASE+"paid-positive-create-v1.json";
const HEALTH_WORKFLOW="phase3-gate4-next4-live-health.yml";
const STOP_WORKFLOW="phase3-gate4-live-exact-stop-candidate.yml";
const STOP_CONFIRM="WATCH_G4_EXACT_ID_STOP_NO_CREATE";
const HEALTH_CONFIRM="WATCH_NEXT4_NO_PROVIDER_6PLUS6";
const GO="OWNER_APPROVED_ONE_NEXT4_WSSS_TRIAL_SOFT5_FLOOR1900_WITH_BURST_RISK";
const snooze=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const sha256=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const hold=(s:string):never=>{throw Error("NEXT4_PAID_"+s+"_HOLD");};
const safe=(name:string,fn:()=>unknown)=>{try{return fn();}catch{hold(name);}};
const gh=(path:string):any=>JSON.parse(execFileSync("gh",["api",path],
 {encoding:"utf8",timeout:15000,maxBuffer:4*1024*1024,
 stdio:["ignore","pipe","ignore"]}));
function ghQuiet(args:string[]):void{
 execFileSync("gh",args,{timeout:15000,stdio:"ignore"});
}
async function putOnce(s:ReplitProviderBlobStoreV39,key:string,data:unknown):Promise<void>{
 if(await s.exists(key))hold("SPENT_ONE_SHOT");
 const bytes=Buffer.from(JSON.stringify(data)+"\n");
 await s.uploadBytes(key,bytes);
 if(!Buffer.from(await s.downloadBytes(key)).equals(bytes))
  hold("PRIVATE_INTENT_UNCONFIRMED");
}
function checkedHead():string{
 const wanted=String(process.env.GATE4_NEXT4_PAID_OPERATOR_SHA??"");
 const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 const main=execFileSync("git",["ls-remote","origin","refs/heads/main"],{
  encoding:"utf8",timeout:15000}).trim().split(/\s+/)[0];
 if(!/^[a-f0-9]{40}$/.test(wanted)||wanted!==head||wanted!==main)
  hold("REVIEWED_MAIN_HEAD");
 const build=JSON.parse(readFileSync("dist/v39-build-meta.json","utf8"));
 if(build.git_head!==SRC)hold("REVIEWED_CALLBACK_SOURCE");
 return head;
}
function hkdfPurpose(salt:Buffer):Buffer{
 const url=String(process.env.V39_DATABASE_RUNTIME_URL??"");
 const secret=String(process.env.AERODATABOX_WEBHOOK_SECRET??"");
 if(!url||secret.length<32)hold("ENCRYPTION_PREREQUISITES");
 return Buffer.from(hkdfSync("sha256",Buffer.from(url+"\0"+secret),
  salt,Buffer.from("replittranvr:gate4:next4:paid-signer:v1"),32));
}
type Signer={privateDer:Buffer;publicDer:Buffer;spki:string};
async function signerLoad(s:ReplitProviderBlobStoreV39):Promise<Signer>{
 if(!await s.exists(SIGNER_KEY)){
  const pair=generateKeyPairSync("ed25519");
  const privateDer=pair.privateKey.export({format:"der",type:"pkcs8"}) as Buffer;
  const publicDer=pair.publicKey.export({format:"der",type:"spki"}) as Buffer;
  const salt=randomBytes(32),iv=randomBytes(12),key=hkdfPurpose(salt);
  try{
   const c=createCipheriv("aes-256-gcm",key,iv);
   c.setAAD(Buffer.from(SRC+":NEXT4:PAID_SIGNER"));
   const ct=Buffer.concat([c.update(privateDer),c.final()]);
   await putOnce(s,SIGNER_KEY,{
    schema:"v39.gate4.next4.paid-signer.v1",
    source:SRC,salt:salt.toString("base64"),iv:iv.toString("base64"),
    tag:c.getAuthTag().toString("base64"),
    ciphertext:ct.toString("base64"),
    publicSpki:publicDer.toString("base64"),
    spki:sha256(publicDer)
   });
  }finally{key.fill(0);privateDer.fill(0);}
 }
 const enc=JSON.parse(Buffer.from(await s.downloadBytes(SIGNER_KEY)).toString());
 if(enc.schema!=="v39.gate4.next4.paid-signer.v1"||enc.source!==SRC)
  hold("SIGNER_ENVELOPE");
 const publicDer=Buffer.from(enc.publicSpki,"base64");
 if(sha256(publicDer)!==enc.spki)hold("SIGNER_PUBLIC_FINGERPRINT");
 const key=hkdfPurpose(Buffer.from(enc.salt,"base64"));
 try{
  const d=createDecipheriv("aes-256-gcm",key,Buffer.from(enc.iv,"base64"));
  d.setAAD(Buffer.from(SRC+":NEXT4:PAID_SIGNER"));
  d.setAuthTag(Buffer.from(enc.tag,"base64"));
  const privateDer=Buffer.concat([d.update(Buffer.from(enc.ciphertext,"base64")),d.final()]);
  const publicFromPrivate=createPrivateKey({key:privateDer,format:"der",type:"pkcs8"})
   .asymmetricKeyType;
  if(publicFromPrivate!=="ed25519")hold("SIGNER_PRIVATE_KEY");
  return {privateDer,publicDer,spki:enc.spki};
 }finally{key.fill(0);}
}
async function loadScope(s:ReplitProviderBlobStoreV39){
 const key=gate4Next4ConfigStorageKeyV39(SRC);
 if(!await s.exists(key))hold("RECEIVER_NOT_SEALED");
 const v=gate4Next4OpenSealedValuesV39(await s.downloadBytes(key),SRC,process.env);
 const url=new URL(String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??""));
 if(url.pathname!=="/neondb"||!url.password)hold("DATABASE_OWNER_URL");
 const file=join(homedir(),".config","replittranvr","gate4-next4","commission.json");
 if(!existsSync(file))hold("PRIVATE_MANIFEST_NOT_PRESENT");
 const st=lstatSync(file);
 if(!st.isFile()||(st.mode&0o077)!==0)hold("MANIFEST_PERMISSIONS");
 const m=JSON.parse(readFileSync(file,"utf8"));
 if(m.source!==SRC||m.scope!==v.GATE4_PREBIND_SCOPE_ID||
    m.authorizationSha256!==v.GATE4_PREBIND_AUTH_SHA256||
    m.webhookSecret!==v.GATE4_PREBIND_WEBHOOK_SECRET||
    m.roleWriter!==NEXT4_WRITER_ROLE_V39||
    !/^[a-f0-9]{80}$/.test(m.writerPassword))
  hold("RECEIVER_MANIFEST_MISMATCH");
 const writer=new URL(url);
 writer.username=NEXT4_WRITER_ROLE_V39;writer.password=m.writerPassword;
 writer.searchParams.set("sslmode","verify-full");
 const present=await fetch(HOME+"/__v39/workspace-runtime",{method:"GET",
  redirect:"error",signal:AbortSignal.timeout(10000)});
 if(present.status!==200)hold("PUBLISHED_RUNTIME_HTTP");
 const health=await present.json() as Record<string,unknown>;
 if(health.status!=="PASS"||health.git_head!==SRC||
    health.gate4_alert_ingress_registered!==true||
    health.published_deployment!==true)
  hold("PUBLISHED_RUNTIME_SCOPE");
 return {m,writerUrl:writer.toString()};
}
function setProtected(name:string,value:string):void{
 const uri="repos/"+REPO+"/environments/gate4-safety/variables/"+name;
 try{
  ghQuiet(["api","--method","PATCH",uri,"-f","name="+name,"-f","value="+value]);
 }catch{
  ghQuiet(["api","--method","POST",
   "repos/"+REPO+"/environments/gate4-safety/variables",
   "-f","name="+name,"-f","value="+value]);
 }
}
function protectedPins(p:Record<string,string>){
 for(const [key,value] of Object.entries(p))setProtected(key,value);
 const v=gh("repos/"+REPO+"/environments/gate4-safety/variables?per_page=100");
 const saved=Object.fromEntries((v.variables??[]).map((x:any)=>[x.name,x.value]));
 if(Object.entries(p).some(([key,value])=>saved[key]!==value))
  hold("PROTECTED_PINS_READBACK");
}
function dispatch(w:string,params:Record<string,string>){
 const args=["workflow","run",w,"--ref","main"];
 for(const [k,v] of Object.entries(params)){args.push("-f",k+"="+v);}
 ghQuiet(args);
}
function runId(w:string,head:string,since:number):number{
 const info=gh("repos/"+REPO+"/actions/workflows/"+w+
  "/runs?event=workflow_dispatch&branch=main&per_page=10");
 const matching=(info.workflow_runs??[]).filter((r:any)=>
  r.head_sha===head&&Date.parse(r.created_at)>=since-15000);
 if(matching.length!==1) return 0;
 return Number(matching[0].id);
}
function healthIsRunning(id:number,head:string):boolean{
 if(!Number.isSafeInteger(id)||id<=0)return false;
 try{
  const r=gh("repos/"+REPO+"/actions/runs/"+id);
  if(r.status!=="in_progress"||r.head_sha!==head||
     r.event!=="workflow_dispatch"||r.head_branch!=="main")return false;
  const jobs=gh("repos/"+REPO+"/actions/runs/"+id+"/jobs?per_page=100");
  return (jobs.jobs??[]).some((j:any)=>
   j.name==="gate4-next4-health"&&j.status==="in_progress"&&
   j.steps?.some((x:any)=>x.name==="Run NEXT4 public GET health observation"&&
    x.status==="in_progress"));
 }catch{return false;}
}
function signedTicket(
 r:Gate4PositiveCreateReceiptTransportV39,signer:Signer,
 scope:Gate4ActionsWatchScopeV39
){
 const t={
  schema:"v39.gate4.independent-stop-ticket.v1",
  sourceCommit:SRC,scopeId:scope.scopeId,authorizationSha256:scope.authorizationSha256,
  subscriptionId:r.subscription.id,subjectType:"FlightByAirportIcao",subjectId:"WSSS",
  startAtUtc:scope.startUtc,stopAtUtc:scope.stopUtc
 };
 const bytes=Buffer.from(JSON.stringify(t));
 const privateKey=createPrivateKey({key:signer.privateDer,format:"der",type:"pkcs8"});
 const signature=sign(null,gate4StopTicketSigningMessageV39(bytes),privateKey);
 const digest=sha256(bytes);
 const checked=inspectGate4SignedStopCustodyV39({
  ticketBytes:bytes,detachedSignatureBase64:signature.toString("base64"),
  signerSpkiDerBase64:signer.publicDer.toString("base64"),
  independentPins:{
   independentlyReviewedTicketSha256:digest,
   independentlyReviewedSignerSpkiSha256:signer.spki,
   expectedSourceCommit:SRC,expectedScopeId:scope.scopeId,
   expectedAuthorizationSha256:scope.authorizationSha256,
   expectedSubscriptionId:r.subscription.id,
   expectedSubjectId:"WSSS",expectedStartAtUtc:scope.startUtc,
   expectedStopAtUtc:scope.stopUtc
  }
 });
 if(checked.cryptographicSignatureVerified!==true)hold("SIGNED_STOP_TICKET");
 return {signedTicketSha256:digest,signedTicketVerifiedAgainstProtectedSigner:true};
}
async function run():Promise<void>{
 let stage="ADMISSION",intent=false,createAttempt=false;
 let pool:pg.Pool|undefined;
 let signer:Signer|undefined;
 try{
  if(process.argv.length!==3||process.argv[2]!=="--run"||
     process.env.GATE4_NEXT4_PAID_GO!==GO)
   hold("EXACT_OWNER_AUTHORIZATION");
  const runner=checkedHead();
  const s=new ReplitProviderBlobStoreV39(String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??""));
  if(await s.exists(INTENT_KEY)||await s.exists(POSITIVE_KEY))hold("ONE_PAID_ATTEMPT_SPENT");
  const {m,writerUrl}=await loadScope(s);
  signer=await signerLoad(s);
  stage="FRESH_ACCOUNT";
  const balance=(await getBalanceEvidenceStrict()).balance.creditsRemaining;
  const inventory=await listSubscriptionsStrict();
  if(!Number.isSafeInteger(balance)||balance<1905||
     inventory.some(x=>x.isActive&&x.billingType==="CreditBased"))
   hold("BALANCE_OR_ACTIVE_BILLABLE");
  stage="SCOPED_WRITER";
  pool=new pg.Pool({connectionString:writerUrl,max:1,
   connectionTimeoutMillis:6000,query_timeout:8000});
  const ident=(await pool.query("SELECT current_user AS actor,"+
   "(SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39 WHERE scope_id=$1::uuid) AS n",
   [m.scope])).rows[0];
  if(ident.actor!==NEXT4_WRITER_ROLE_V39||ident.n!==0)hold("OWNER_BINDING_ALREADY_PRESENT");
  const now=Date.now();
  const start=new Date(now+5*60000).toISOString();
  const stop=new Date(now+17*60000).toISOString();
  const scope:Gate4ActionsWatchScopeV39={
   scopeId:m.scope,sourceCommit:SRC,authorizationSha256:m.authorizationSha256,
   airportIcao:"WSSS",startUtc:start,stopUtc:stop,
   observedStartingCredits:balance,softCreditTarget:5,protectedCreditFloor:1900
  };
  if(!reviewGate4ActionsWatchScopeV39(scope))hold("PAID_WINDOW_RISK");
  stage="PROTECTED_GH_SCOPE_AND_SIGNER";
  protectedPins({
   GATE4_SAFETY_APPROVED_RUNNER_SHA:runner,
   GATE4_SAFETY_APPROVED_SOURCE:SRC,
   GATE4_SAFETY_APPROVED_SCOPE:m.scope,
   GATE4_SAFETY_APPROVED_AUTH:m.authorizationSha256,
   GATE4_SAFETY_APPROVED_ICAO:"WSSS",
   GATE4_SAFETY_APPROVED_START_UTC:start,
   GATE4_SAFETY_APPROVED_STOP_UTC:stop,
   GATE4_SAFETY_APPROVED_SOFT_TARGET:"5",
   GATE4_SAFETY_APPROVED_PROTECTED_FLOOR:"1900",
   GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256:signer.spki
  });
  await putOnce(s,PLAN_KEY,{
   schema:"v39.gate4.next4.single-trial-plan.v1",scope:m.scope,
   auth:m.authorizationSha256,source:SRC,runner,
   start,stop,balance,soft:5,floor:1900,signerSpki:signer.spki,
   financialAuthorizationRecordedOnIssue38:true,neverSecondPaidTrial:true
  });
  stage="DISPATCH_STOP_AND_OBSERVER";
  const mark=Date.now();
  dispatch(STOP_WORKFLOW,{
   expected_head:runner,scope_id:m.scope,authorization_sha256:m.authorizationSha256,
   airport_icao:"WSS",start_utc:start,stop_utc:stop,
   starting_credits:String(balance),soft_target:"5",protected_floor:"1900",
   confirmation:STOP_CONFIRM
  });
  dispatch(HEALTH_WORKFLOW,{
   runner_sha:runner,stop_utc:stop,confirmation:HEALTH_CONFIRM
  });
  console.log(JSON.stringify({status:"NEXT4_INDEPENDENT_JOBS_DISPATCHED",
   protectedGitHubReviewMayBeRequired:true,onePaidCreateAttempted:false,
   softCreditTarget:5,hardCreditCap:false}));
  let stopId=0,healthId=0,armed=false;
  stage="WAIT_INDEPENDENT_STOP_ARMED";
  while(Date.now()<Date.parse(stop)-90_000){
   if(!stopId)stopId=runId(STOP_WORKFLOW,runner,mark);
   if(!healthId)healthId=runId(HEALTH_WORKFLOW,runner,mark);
   if(Date.now()>=Date.parse(start)&&stopId&&healthId){
    armed=next3StopArmedV39(scope,runner,stopId)&&
      healthIsRunning(healthId,runner);
    if(armed)break;
   }
   await snooze(8000);
  }
  if(!armed)hold("GITHUB_STOP_OR_OBSERVER_NOT_ARMED");
  stage="IMMEDIATE_PROVIDER_RECHECK";
  const fresh=(await getBalanceEvidenceStrict()).balance.creditsRemaining;
  const listed=await listSubscriptionsStrict();
  if(fresh!==balance||listed.some(x=>x.isActive&&x.billingType==="CreditBased"))
   hold("BALANCE_DRIFT_OR_ACTIVE");
  stage="ONE_POSITIVE_CREATE";
  const result=await runGate4OnePositiveOwnerV39(scope,{
   proveActualExternalStopArmed:async()=>
    next3StopArmedV39(scope,runner,stopId)&&healthIsRunning(healthId,runner),
   strictBalance:async()=>(
    await getBalanceEvidenceStrict()).balance.creditsRemaining,
   strictInventory:()=>listSubscriptionsStrict(),
   reserveOneShotImmediatelyBeforeCreate:async()=>{
    stage="WRITE_DURABLE_ONE_SHOT_INTENT";
    await putOnce(s,INTENT_KEY,{
     schema:"v39.gate4.next4.one-paid-create-intent.v1",source:SRC,
     scope:m.scope,auth:m.authorizationSha256,runner,stopId,healthId,
     start,stop,startingCredits:balance,soft:5,floor:1900,
     authorizedOnIssue38:true,createOutcomeMayBeUnknown:true,
     neverSecondCreate:true
    });
    intent=true;
   },
   createExactlyOne:async()=>{
    stage="ONE_AERODATABOX_CREATE_TRANSPORT";createAttempt=true;
    return createGate4SingleWithRawReceiptV39("WSSS",{
     url:HOME+"/api/v1/webhooks/aerodatabox/"+
      encodeURIComponent(m.webhookSecret),maxDeliveryRetries:0
    });
   },
   persistPositiveIdPrivately:async(r)=>{
    await putOnce(s,POSITIVE_KEY,{
     schema:"v39.gate4.next4.positive-create.v1",source:SRC,scope:m.scope,
     providerAssignedId:r.subscription.id,
     reviewedRawCreateSha256:r.rawCreateResponseSha256,neverRepeat:true
    });
   },
   signedStopEvidence:(r)=>Promise.resolve(signedTicket(r,signer!,scope)),
   store:createGate4OwnedBindingPgStoreV39(pool),
   deleteKnownExact:id=>deleteSubscriptionVerifiedStrict(id,{maxAttempts:3}),
   recordSafetyIncident:async(reason,positiveIdKnown)=>{
    const key=BASE+"incident-"+Date.now()+".json";
    await s.uploadBytes(key,Buffer.from(JSON.stringify({
     schema:"v39.gate4.next4.paid-incident.v1",reason,positiveIdKnown,
     source:SRC,scope:m.scope,recordedAt:new Date().toISOString()
    })));
   }
  });
  console.log(JSON.stringify({
   status:result.status,oneProviderCreateAttempt:result.createAttempts===1,
   verifiedPositiveOwnedIdBinding:result.exactOwnerReadBack,
   paidTrialComplete:false,sciencePassed:false,
   next:"WAIT_INDEPENDENT_STOP_AND_VERIFY_RAW_SETTLEMENT"
  }));
  // No automatic second CREATE, no assumption that published route guarantees SEND.
 }catch(e){
  const reason=e instanceof Error?e.message:"UNKNOWN";
  console.log(JSON.stringify({status:"NEXT4_ONE_PAID_OPERATOR_HOLD",stage,
   code:/^(NEXT4_PAID_|GATE4_REAL_OWNER_)[A-Z0-9_]+_HOLD$/.test(reason)
    ?reason:"REDACTED",
   spentOneShotIntent:intent,providerCreateAttempted:createAttempt,
   noAutomaticRetry:true}));
  process.exitCode=2;
 }finally{
  signer?.privateDer.fill(0);
  await pool?.end().catch(()=>{});
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void run();
