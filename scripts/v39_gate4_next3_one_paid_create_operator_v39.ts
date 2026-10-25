/**
 * NEXT3 ONE paid AeroDataBox WSSS CREATE, only after fully reviewed independent
 * GitHub STOP+6/6 jobs are RUNNING, trusted bot STOP-ARMED receipt, current
 * scoped source/signer/window/floor pins and explicit owner approved risk.
 *
 * --check does not call the provider or write DB or App Storage.
 * --execute-one is a separate GO-gated operation. Before CREATE, a durable
 * private one-shot App Storage intent prevents another CREATE after a crash
 * or unknown provider response. No arbitrary subscription LIST-derived ID.
 *
 * This script does not by itself establish provider callback success,
 * settlement, delivery reliability or a hard 1900-credit cap.
 */
import "dotenv/config";
import pg from "pg";
import {execFileSync} from "node:child_process";
import {createHash,createPrivateKey,sign} from "node:crypto";
import {pathToFileURL} from "node:url";
import {
 NEXT3_SRC_V39 as SRC,NEXT3_SCOPE_V39 as SCOPE,
 NEXT3_INTENT_V39 as INTENT,NEXT3_POSITIVE_V39 as POSITIVE,
 next3LoadPrivateV39,next3ProtectedVariablesV39,next3ProtectedScopeV39,
 next3StopArmedV39,next3ObserverRunningV39,next3PutOnceV39
} from "./v39_gate4_next3_paid_trial_custody_v39";
import {runGate4OnePositiveOwnerV39} from
 "../server/lib/disruption/gate4LiveCreateOperator_v39";
import {createGate4OwnedBindingPgStoreV39} from
 "../server/lib/disruption/gate4OwnedBindingPgStore_v39";
import {
 createGate4SingleWithRawReceiptV39,getBalanceEvidenceStrict,
 listSubscriptionsStrict,deleteSubscriptionVerifiedStrict,
 type Gate4PositiveCreateReceiptTransportV39
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {
 gate4StopTicketSigningMessageV39,inspectGate4SignedStopCustodyV39
} from "../server/lib/disruption/gate4SignedStopCustody_v39";

const HOST="https://replit-tranvr--hk84164.replit.app";
const GO="AUTHORIZE_EXACTLY_ONE_NEXT3_WSSS_PAID_CREATE_WITH_BURST_RISK";
const sha=/^[a-f0-9]{40}$/;
const hash=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
const hold=(s:string):never=>{throw Error("GATE4_NEXT3_PAID_"+s+"_HOLD");};
function pinnedHead():boolean{
 const h=String(process.env.GATE4_NEXT3_PAID_OPERATOR_SHA??"");
 if(!sha.test(h))return false;
 return execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim()===h;
}
async function hostedReady():Promise<boolean>{
 try{
  const res=await fetch(HOST+"/__v39/workspace-runtime",{
   method:"GET",redirect:"error",
   signal:AbortSignal.timeout(10000)
  });
  if(res.status!==200)return false;
  const body=await res.json() as Record<string,unknown>;
  return body.status==="PASS"&&body.git_head===SRC&&
   body.published_deployment===true&&
   body.prepaid_route_registered===true&&
   body.gate4_alert_ingress_registered===true;
 }catch{return false;}
}
function signedTicket(
 r:Gate4PositiveCreateReceiptTransportV39,
 x:{auth:string;signerPrivateDer:Buffer;signerPublicDer:Buffer;
    signerSpkiSha256:string},
 scope:{startUtc:string;stopUtc:string}
):{signedTicketSha256:string;signedTicketVerifiedAgainstProtectedSigner:true}{
 const t={
  schema:"v39.gate4.independent-stop-ticket.v1",
  sourceCommit:SRC,scopeId:SCOPE,authorizationSha256:x.auth,
  subscriptionId:r.subscription.id,
  subjectType:"FlightByAirportIcao",subjectId:"WSSS",
  startAtUtc:scope.startUtc,stopAtUtc:scope.stopUtc
 };
 const bytes=Buffer.from(JSON.stringify(t));
 const privateKey=createPrivateKey({
  key:x.signerPrivateDer,format:"der",type:"pkcs8"
 });
 const sig=sign(null,gate4StopTicketSigningMessageV39(bytes),privateKey);
 const review=inspectGate4SignedStopCustodyV39({
  ticketBytes:bytes,detachedSignatureBase64:sig.toString("base64"),
  signerSpkiDerBase64:x.signerPublicDer.toString("base64"),
  independentPins:{
   independentlyReviewedTicketSha256:hash(bytes),
   independentlyReviewedSignerSpkiSha256:x.signerSpkiSha256,
   expectedSourceCommit:SRC,expectedScopeId:SCOPE,
   expectedAuthorizationSha256:x.auth,
   expectedSubscriptionId:r.subscription.id,
   expectedSubjectId:"WSSS",expectedStartAtUtc:scope.startUtc,
   expectedStopAtUtc:scope.stopUtc
  }
 });
 if(review.cryptographicSignatureVerified!==true)
  hold("STOP_TICKET_SIGNATURE");
 return {signedTicketSha256:hash(bytes),
  signedTicketVerifiedAgainstProtectedSigner:true};
}
async function execute():Promise<void>{
 let stage="ADMISSION",intentWritten=false,createAttempted=false;
 let pool:pg.Pool|undefined;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||!["--check","--execute-one"].includes(mode))
   hold("MODE");
  if(mode==="--execute-one"&&
     (process.env.GATE4_NEXT3_PAID_GO!==GO||!pinnedHead()))
   hold("EXACT_PAID_GO_OR_SHA");
  const x=await next3LoadPrivateV39();
  if(await x.storage.exists(INTENT)||await x.storage.exists(POSITIVE))
   hold("SPENT_ONE_SHOT_INTENT");
  const initial=Number(process.env.GATE4_NEXT3_PAID_STARTING_CREDITS);
  const vars=next3ProtectedVariablesV39();
  const {scope,runnerSha}=next3ProtectedScopeV39(vars,x,initial);
  if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_NEXT3_ONE_PAID_PREFLIGHT_NO_PROVIDER_READY",
    scopeId:SCOPE,sourceSha:SRC,
    exactProtectedSignerMatch:true,writerSealed:true,
    writerExpiresUtc:x.writerExpiresUtc,
    startingCredits:initial,
    softTarget:scope.softCreditTarget,
    protectedFloor:scope.protectedCreditFloor,
    paidCreateAuthorized:false,stopArmed:false,
    providerCalls:0,databaseWrites:0
   }));
   return;
  }
  stage="FUTURE_WINDOW_AND_OBSERVER";
  if(Date.now()<Date.parse(scope.startUtc)||
     Date.now()>=Date.parse(scope.stopUtc)-60_000)
   hold("APPROVED_UTC_WINDOW_NOT_ACTIVE");
  if(!await hostedReady())hold("PUBLISHED_RECEIVER_IDENTITY");
  const stopRunId=Number(process.env.GATE4_NEXT3_STOP_RUN_ID??"");
  const healthRunId=Number(process.env.GATE4_NEXT3_HEALTH_RUN_ID??"");
  if(!next3StopArmedV39(scope,runnerSha,stopRunId))
   hold("INDEPENDENT_STOP_NOT_LIVE_ARMED");
  if(!next3ObserverRunningV39(healthRunId,runnerSha))
   hold("SIX_PLUS_SIX_HEALTH_OBSERVER_NOT_LIVE");
  stage="FRESH_PROVIDER_BASELINE_AND_ZERO_ACTIVE";
  const balance=await getBalanceEvidenceStrict();
  const inventory=await listSubscriptionsStrict();
  if(balance.balance.creditsRemaining!==initial||
     !Array.isArray(inventory)||
     inventory.some(s=>s.isActive&&s.billingType==="CreditBased"))
   hold("PROVIDER_BASELINE_CHANGED_OR_ACTIVE");
  stage="EXACT_SCOPED_WRITER";
  pool=new pg.Pool({connectionString:x.writerUrl,max:1,
   connectionTimeoutMillis:6000,query_timeout:7000,
   statement_timeout:7000});
  const w=(await pool.query(
   "SELECT current_user AS actor,"+
   "(SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39"+
   " WHERE scope_id=$1::uuid) AS bindings",[SCOPE])).rows[0];
  if(w?.actor!=="gate4_owner_writer_2026_next3"||
     w.bindings!==0)hold("SCOPED_WRITER_OR_OWNER_BINDING");
  // The shared one-owner helper repeats STOP + strict balance/LIST checks.
  // Leave the one-shot unused if one of those final checks fails.
  stage="FINAL_PRE_CREATE_ADMISSION";
  const result=await runGate4OnePositiveOwnerV39(scope,{
   proveActualExternalStopArmed:async()=>
    next3StopArmedV39(scope,runnerSha,stopRunId)&&
    next3ObserverRunningV39(healthRunId,runnerSha),
   strictBalance:async()=>(await getBalanceEvidenceStrict()).balance.creditsRemaining,
   strictInventory:()=>listSubscriptionsStrict(),
   reserveOneShotImmediatelyBeforeCreate:async()=>{
    stage="DURABLE_ONE_SHOT_INTENT";
    await next3PutOnceV39(x.storage,INTENT,{
     schema:"v39.gate4.next3.paid-one-create-intent.v1",
     createdAtUtc:new Date().toISOString(),
     sourceSha:SRC,scopeId:SCOPE,
     authorizationSha256:x.auth,
     reviewedRunnerSha:runnerSha,
     independentStopRunId:stopRunId,
     sixPlusSixObserverRunId:healthRunId,
     startUtc:scope.startUtc,stopUtc:scope.stopUtc,
     startingCredits:initial,softTarget:scope.softCreditTarget,
     protectedFloor:scope.protectedCreditFloor,
     providerCreateOutcomeMayBeUnknown:true,
     neverSecondCreate:true
    });
    intentWritten=true;
   },
   createExactlyOne:()=>{
    stage="PROVIDER_CREATE_TRANSPORT";
    createAttempted=true; // transport invoked; HTTP dispatch/acceptance unknown
    return createGate4SingleWithRawReceiptV39("WSSS",{
     url:HOST+"/api/v1/webhooks/aerodatabox/"+
       encodeURIComponent(x.secret),
     maxDeliveryRetries:0
    });
   },
   persistPositiveIdPrivately:async(r:Gate4PositiveCreateReceiptTransportV39)=>{
    await next3PutOnceV39(x.storage,POSITIVE,{
     schema:"v39.gate4.next3.positive-create-receipt.v1",
     sourceSha:SRC,scopeId:SCOPE,providerAssignedId:r.subscription.id,
     rawResponseSha256:r.rawCreateResponseSha256,
     capturedAtUtc:new Date().toISOString(),neverRepeat:true
    });
   },
   signedStopEvidence:async(r:Gate4PositiveCreateReceiptTransportV39)=>
    signedTicket(r,x,scope),
   store:createGate4OwnedBindingPgStoreV39(pool),
   deleteKnownExact:(id:string)=>deleteSubscriptionVerifiedStrict(
    id,{maxAttempts:3}),
   recordSafetyIncident:async(reason:string,positiveIdKnown:boolean)=>{
    await x.storage.uploadBytes(
     "internal/gate4/next3/"+SRC+"/paid-incident-"+Date.now()+".json",
     Buffer.from(JSON.stringify({
      schema:"v39.gate4.next3.incident.v1",
      sourceSha:SRC,scopeId:SCOPE,reason,positiveIdKnown,
      capturedAtUtc:new Date().toISOString()
     })+"\n"));
   }
  });
  console.log(JSON.stringify({
   status:result.status,scopeId:SCOPE,
   onePositiveCreateAttempt:result.createAttempts===1,
   exactV0072OwnerReadback:result.exactOwnerReadBack,
   scientificProviderDeliveryEstablished:false,
   stopExecutedAndSettled:false,
   noProviderIdPrinted:true,
   next:"VERIFY_GENUINE_V0071_STOP_THREE_SETTLEMENT_READS"
  }));
 }catch(err){
  // No untrusted exception text, URLs, raw response or provider IDs in logs.
  const message=err instanceof Error?err.message:"";
  const safeReason=/^GATE4_(?:REAL_OWNER|NEXT3_PAID)_[A-Z0-9_]+_HOLD$/.test(message)
    ?message:/^BALANCE_UNAVAILABLE: HTTP (?:429|5\d\d)$/.test(message)
      ?message.replace("BALANCE_UNAVAILABLE: ","")
      :"REDACTED_OR_UNKNOWN";
  console.log(JSON.stringify({
   status:"GATE4_NEXT3_ONE_PAID_CREATE_HOLD",stage,safeReason,
   intentWritten,createAttempted,
   providerHttpPostAcceptanceUnconfirmed:true,
   neverRetryCreate:true,providerIdUnknownUnlessSealed:true
  }));
  process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void execute();
