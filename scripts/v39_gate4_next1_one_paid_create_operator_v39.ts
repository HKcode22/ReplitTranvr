/**
 * One WSSS NEXT-SCOPE provider Alert CREATE operator — NOT automatic.
 * No network/provider/database actions at import; --check reads only.
 * --execute-one is a distinct owner-driven paid command guarded by:
 *  - exact reviewed GH main and published receiver SHA
 *  - protected GH trial vars, separately pinned STOP-runner SHA/window
 *  - recently posted GH Actions bot ARMED proof + currently executing job
 *  - independently pinned Ed25519 public signer fingerprint
 *  - private new six-hour V0072 INSERT+SELECT credential and no prior intent
 *  - fresh strict provider baseline and one explicit owner GO phrase
 *
 * Does not claim provider hard billing cap, external CAS trust, or settlement.
 * Positive provider ID is never printed. An UNKNOWN CREATE outcome must be
 * manually rescued. NEVER invoke --execute-one twice for this scope.
 */
import "dotenv/config";
import {readGate4ApprovedManifestV39} from "./v39_gate4_approved_no_provider_scope_v39";
import {execFileSync} from "node:child_process";
import {createHash,createPrivateKey,createPublicKey,sign} from "node:crypto";
import {readFileSync,writeFileSync,statSync,existsSync,
  openSync,writeSync,fsyncSync,closeSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import pg from "pg";
import {createGate4OwnedBindingPgStoreV39} from
 "../server/lib/disruption/gate4OwnedBindingPgStore_v39";
import {runGate4OnePositiveOwnerV39} from
 "../server/lib/disruption/gate4LiveCreateOperator_v39";
import {gate4ReviewIndependentArmedProofV39} from
 "../server/lib/disruption/gate4ArmedRunProof_v39";
import {gate4StopTicketSigningMessageV39,
 inspectGate4SignedStopCustodyV39} from
 "../server/lib/disruption/gate4SignedStopCustody_v39";
import {reviewGate4ActionsWatchScopeV39} from
 "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";
import {
 createGate4SingleWithRawReceiptV39,listSubscriptionsStrict,
 getBalanceEvidenceStrict,deleteSubscriptionVerifiedStrict
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import type {Gate4ActionsWatchScopeV39} from
 "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";
import type {Gate4PositiveCreateReceiptTransportV39} from
 "../server/lib/disruption/aerodataboxLimiter_v3";

const REPO="HKcode22/ReplitTranvr",ENV="gate4-safety";
const RECEIVER="97ed05bfcc8b34bd607a80dbcfec6945ffd0d11a";
const SCOPE="d6c0fcac-798e-4913-bfd1-a561adb3dd82";
const PRIVATE=join(homedir(),".config","replittranvr","gate4-owner-20261022");
const WRITER=join(PRIVATE,"writer-gate4_owner_writer_2026_next1.json");
const DEPLOYMENT=join(PRIVATE,"next-wsss-deployment-values.json");
const SIGNER=join(PRIVATE,"owner-stop-ed25519.pem");
const INTENT=join(PRIVATE,"gate4-wsss-next1-one-create-intent.json");
const POSITIVE=join(PRIVATE,"gate4-wsss-next1-positive-create-receipt.json");
const INCIDENT=join(PRIVATE,"gate4-wsss-next1-create-incident.jsonl");
const sha=/^[0-9a-f]{40}$/,hex=/^[0-9a-f]{64}$/;
const EXPIRY_MINIMUM_MS=25*60*1000;
const GO="EXECUTE_ONE_NEXT1_WSSS_ALERT_20MIN_SOFT5_NO_RETRY";
const hold=(s:string):never=>{throw Error("GATE4_PAID_OPERATOR_"+s+"_HOLD");};
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
type WriterPrivate={role:string;writerUrl:string;reviewedHead:string;
 scope:string;authorizationSha256:string;receiverSource:string;
 expiresUtc:string};
function gh(path:string):any{
 // Only static GitHub API endpoints constructed from validated run IDs.
 const b=execFileSync("gh",["api",path],{encoding:"utf8",
   timeout:10000,maxBuffer:2*1024*1024,stdio:["ignore","pipe","ignore"]});
 return JSON.parse(b);
}
function gitHead():string{
 return execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
}
function safePrivateFile(path:string):boolean{
 try{
  const f=statSync(path);
  return f.isFile()&&(f.mode&0o077)===0;
 }catch{return false;}
}
function writeOnce(path:string,value:unknown):void{
 const fd=openSync(path,"wx",0o600);
 try{
  writeSync(fd,JSON.stringify(value)+"\n");
  fsyncSync(fd);
 }finally{closeSync(fd);}
}
function reportIncident(reason:string,known:boolean):void{
 const fd=openSync(INCIDENT,"a",0o600);
 try{
  writeSync(fd,JSON.stringify({
   schema:"v39.gate4.paid-operator-incident.v1",
   timeUtc:new Date().toISOString(),reason,positiveIdKnown:known,
   scopeId:SCOPE,paidTrialComplete:false
  })+"\n");
  fsyncSync(fd);
 }finally{closeSync(fd);}
}
function protectedVars():Record<string,string>{
 const raw=gh(`repos/${REPO}/environments/${ENV}/variables?per_page=100`);
 if(!Array.isArray(raw?.variables))hold("PROTECTED_GH_VARIABLES_UNAVAILABLE");
 return Object.fromEntries(raw.variables.map((x:any)=>[x.name,x.value]));
}
function checkGitHubProof(scope:Gate4ActionsWatchScopeV39,
 runner:string,runId:number):boolean{
 try{
  const run=gh(`repos/${REPO}/actions/runs/${runId}`);
  const workflow=gh(`repos/${REPO}/actions/workflows/${run.workflow_id}`);
  if(workflow?.path!==
   ".github/workflows/phase3-gate4-live-exact-stop-candidate.yml")
   return false;
  const jobs=gh(`repos/${REPO}/actions/runs/${runId}/jobs?per_page=100`);
  const since=encodeURIComponent(new Date(Date.now()-120_000).toISOString());
  const comments=gh(`repos/${REPO}/issues/38/comments?since=${since}&per_page=100`);
  return gate4ReviewIndependentArmedProofV39({
   scope,runnerSha:runner,runId,workflowId:run.workflow_id,
   nowUtc:new Date().toISOString(),run,jobs:jobs.jobs??[],comments
  });
 }catch{return false;}
}
function receiverConfig():{auth:string;secret:string;writer:WriterPrivate}{
 // Never read deployment credentials from GitHub or stdout.
 // This source is for one private WSSS scope only, not future routine builds.
 let approved:ReturnType<typeof readGate4ApprovedManifestV39>;
 try{approved=readGate4ApprovedManifestV39();}
 catch{hold("APPROVED_PRIVATE_SETUP_MANIFEST");}
 if(approved.scopeId!==SCOPE||
    approved.proposedPublishedSourceSha!==RECEIVER||
    approved.writerRole!=="gate4_owner_writer_2026_next1"||
    approved.paidSubscriptionAuthorized!==false||
    approved.providerRequestsAuthorized!==false)
   hold("EXACT_PRIVATE_SCOPE");
 if(!safePrivateFile(DEPLOYMENT)||!safePrivateFile(WRITER))
   hold("PRIVATE_DEPLOYMENT_OR_WRITER_MISSING");
 let deployment:any,writer:WriterPrivate;
 try{
  deployment=JSON.parse(readFileSync(DEPLOYMENT,"utf8"));
  writer=JSON.parse(readFileSync(WRITER,"utf8"));
 }catch{hold("PRIVATE_DATA_UNAVAILABLE");}
 const values=deployment?.values??{};
 if(deployment.scopeId!==SCOPE||
    deployment.expectedCompiledSource!==RECEIVER||
    values.GATE4_PREBIND_SCOPE_ID!==SCOPE||
    values.GATE4_PREBIND_AUTH_SHA256!==approved.authorizationSha256||
    values.GATE4_PREBIND_AIRPORT_ICAO!=="WSSS"||
    values.V39_GATE4_PREBIND_ADD_ON_PREPAID!=="1"||
    values.ADB_AUTO_COLLECT!=="false"||
    values.GATE4_PREBIND_RELEASE_REVIEW!=="EXPLICIT_NO_PROVIDER_RECEIVER"||
    values.GATE4_PREBIND_APPROVED_SOURCE_COMMIT!==RECEIVER||
    !/^[A-Za-z0-9._~-]{32,256}$/.test(
      values.GATE4_PREBIND_WEBHOOK_SECRET??"")||
    !hex.test(approved.authorizationSha256))
   hold("PRIVATE_PUBLISHED_RECEIVER_SCOPE");
 if(writer.role!==approved.writerRole||
    writer.scope!==SCOPE||
    writer.receiverSource!==RECEIVER||
    writer.authorizationSha256!==approved.authorizationSha256||
    !Number.isFinite(Date.parse(writer.expiresUtc))||
    Date.parse(writer.expiresUtc)<Date.now()+EXPIRY_MINIMUM_MS)
   hold("WRITER_SCOPE_OR_EXPIRY");
 try{
  const u=new URL(writer.writerUrl);
  if(decodeURIComponent(u.username)!==writer.role||
     u.protocol!=="postgresql:"&&u.protocol!=="postgres:"||
     u.searchParams.get("sslmode")!=="verify-full")
    hold("WRITER_DB_IDENTITY");
 }catch{hold("WRITER_DB_IDENTITY");}
 return {auth:approved.authorizationSha256,
  secret:values.GATE4_PREBIND_WEBHOOK_SECRET,writer};
}
async function verifyPublishedReceiver():Promise<void>{
 try{
  const response=await fetch(
   "https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime",
   {method:"GET",redirect:"error",cache:"no-store",
    signal:AbortSignal.timeout(8000)});
  if(!response.ok)hold("PUBLIC_RECEIVER_STATUS");
  const h=await response.json() as Record<string,unknown>;
  if(h.status!=="PASS"||h.git_head!==RECEIVER||
     h.published_deployment!==true||
     h.prepaid_route_registered!==true||
     h.gate4_alert_ingress_registered!==true)
   hold("PUBLIC_RECEIVER_SOURCE_OR_ROUTE");
 }catch{hold("PUBLIC_RECEIVER_UNAVAILABLE");}
}
function scopeAndPins(
 vars:Record<string,string>,writer:WriterPrivate
):{scope:Gate4ActionsWatchScopeV39;runner:string}{
 const runner=vars.GATE4_SAFETY_APPROVED_RUNNER_SHA??"";
 const source=vars.GATE4_SAFETY_APPROVED_SOURCE??"";
 if(source!==RECEIVER||!sha.test(runner)||runner!==gitHead()||
    vars.GATE4_SAFETY_APPROVED_SCOPE!==SCOPE||
    vars.GATE4_SAFETY_APPROVED_AUTH!==writer.authorizationSha256||
    vars.GATE4_SAFETY_APPROVED_ICAO!=="WSSS"||
    vars.GATE4_SAFETY_APPROVED_SOFT_TARGET!=="5"||
    vars.GATE4_SAFETY_APPROVED_PROTECTED_FLOOR!=="2000")
    hold("INDEPENDENT_PROTECTED_PIN_MISMATCH");
 const start=vars.GATE4_SAFETY_APPROVED_START_UTC??"";
 const stop=vars.GATE4_SAFETY_APPROVED_STOP_UTC??"";
 if(!start||!stop||Date.parse(stop)-Date.parse(start)!==20*60_000)
    hold("EXACT_TWENTY_MINUTE_WINDOW_NOT_APPROVED");
 return {runner,scope:{
  sourceCommit:RECEIVER,scopeId:SCOPE,
  authorizationSha256:writer.authorizationSha256,airportIcao:"WSSS",
  startUtc:start,stopUtc:stop,
  observedStartingCredits:Number(
   process.env.GATE4_APPROVED_STARTING_CREDITS),
  softCreditTarget:5,protectedCreditFloor:2000
 }};
}
async function execute():Promise<void>{
 const mode=process.argv[2];
 if(!["--check","--execute-one"].includes(mode)||
    process.argv.length!==3)hold("EXACT_CLI_MODE");
 const {auth,secret,writer}=receiverConfig();
 const st=statSync(PRIVATE);
 if(!st.isDirectory()||(st.mode&0o077)!==0||
    !safePrivateFile(WRITER)||!safePrivateFile(SIGNER))
   hold("PRIVATE_CUSTODY_OR_SIGNER_MISSING");
 if(writer.authorizationSha256!==auth)hold("WRITER_AUTH_MISMATCH");
 const key=createPrivateKey(readFileSync(SIGNER,"utf8"));
 const publicKey=createPublicKey(key);
 if(key.asymmetricKeyType!=="ed25519")hold("SIGNER_NOT_ED25519");
 const spki=Buffer.from(publicKey.export({format:"der",type:"spki"}));
 const vars=protectedVars();
 if(vars.GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256!==hash(spki))
   hold("PROTECTED_PUBLIC_SIGNER_PIN_MISSING");
 const {scope,runner}=scopeAndPins(vars,writer);
 if(!reviewGate4ActionsWatchScopeV39(scope))
   hold("CREDIT_OR_UTC_SCOPE_INVALID");
 // A standalone --check is NEVER a paid CREATE and makes no provider GET.
 if(mode==="--check"){
   console.log(JSON.stringify({
    status:"GATE4_OPERATOR_OFFLINE_CONFIGURATION_PASS",
    scopeId:SCOPE,receiverSha:RECEIVER,runnerSha:runner,
    durationMinutes:20,softCreditTarget:5,protectedFloor:2000,
    providerRequests:0,databaseWrites:0,stopArmed:false
   }));
   return;
 }
 if(process.env.GATE4_CONFIRM_ONE_PAID_CREATE!==GO)
   hold("EXPLICIT_PAID_GO_MISSING");
 await verifyPublishedReceiver();
 const now=Date.now();
 if(now<Date.parse(scope.startUtc)||
    now>=Date.parse(scope.stopUtc)-60_000)
   hold("PAID_START_OUTSIDE_APPROVED_WINDOW");
 const runId=Number(process.env.GATE4_STOP_RUN_ID??"");
 if(!Number.isSafeInteger(runId)||runId<=0)hold("STOP_RUN_ID_MISSING");
 if(existsSync(INTENT)||existsSync(POSITIVE))
   hold("ALREADY_ATTEMPTED_NO_SECOND_CREATE");
 // Prove live external STOP against GitHub, not merely user-provided RUN_ID.
 if(!checkGitHubProof(scope,runner,runId))
   hold("INDEPENDENT_STOP_ARMED_PROOF_FAILED");
 const pool=new pg.Pool({
   connectionString:writer.writerUrl,max:1,
   connectionTimeoutMillis:6000,
   statement_timeout:6000,query_timeout:6000
 });
 try{
   const preflight=await pool.query(
     "SELECT current_user AS actor, (SELECT count(*)::int FROM "+
     "clean.gate4_alert_owned_binding_v39 WHERE scope_id=$1::uuid) AS n",
     [SCOPE]);
   if(preflight.rows[0]?.actor!==writer.role||
      preflight.rows[0]?.n!==0)
     hold("SCOPED_WRITER_PREFLIGHT_CHANGED");
   // A private durable intent BEFORE the paid HTTP request blocks second
   // attempts even on unknown provider responses or process crashes.
   writeOnce(INTENT,{
    schema:"v39.gate4.one-create-intent.v1",runId,scopeId:SCOPE,
    startUtc:scope.startUtc,stopUtc:scope.stopUtc,
    startedAtUtc:new Date().toISOString(),
    status:"CREATE_POSSIBLE_UNKNOWN_UNTIL_POSITIVE_RESPONSE",
    ownerBindingCountBefore:0,
    noSecondCreate:true
   });
   const url="https://replit-tranvr--hk84164.replit.app"+
     "/api/v1/webhooks/aerodatabox/"+encodeURIComponent(secret);
   const result=await runGate4OnePositiveOwnerV39(scope,{
    proveActualExternalStopArmed:async()=>
       checkGitHubProof(scope,runner,runId),
    strictBalance:async()=>(
      await getBalanceEvidenceStrict()).balance.creditsRemaining,
    strictInventory:()=>listSubscriptionsStrict(),
    createExactlyOne:()=>createGate4SingleWithRawReceiptV39(
      "WSSS",{url,maxDeliveryRetries:0}),
    persistPositiveIdPrivately:async(r:Gate4PositiveCreateReceiptTransportV39)=>{
       writeOnce(POSITIVE,{
        schema:"v39.gate4.positive-provider-create-receipt.v1",
        exactProviderId:r.subscription.id,
        rawResponseSha256:r.rawCreateResponseSha256,
        scopeId:SCOPE,receiverSource:RECEIVER,
        capturedAtUtc:new Date().toISOString(),
        immutableOneAttempt:true
       });
    },
    signedStopEvidence:async(r:Gate4PositiveCreateReceiptTransportV39)=>{
     const ticket={
      schema:"v39.gate4.independent-stop-ticket.v1",
      sourceCommit:RECEIVER,scopeId:SCOPE,
      authorizationSha256:scope.authorizationSha256,
      subscriptionId:r.subscription.id,
      subjectType:"FlightByAirportIcao",subjectId:"WSSS",
      startAtUtc:scope.startUtc,stopAtUtc:scope.stopUtc
     };
     const bytes=Buffer.from(JSON.stringify(ticket));
     const sig=sign(null,gate4StopTicketSigningMessageV39(bytes),key);
     const pins={
       independentlyReviewedTicketSha256:hash(bytes),
       independentlyReviewedSignerSpkiSha256:hash(spki),
       expectedSourceCommit:RECEIVER,expectedScopeId:SCOPE,
       expectedAuthorizationSha256:scope.authorizationSha256,
       expectedSubscriptionId:r.subscription.id,expectedSubjectId:"WSSS",
       expectedStartAtUtc:scope.startUtc,expectedStopAtUtc:scope.stopUtc
     };
     const check=inspectGate4SignedStopCustodyV39({
       ticketBytes:bytes,detachedSignatureBase64:sig.toString("base64"),
       signerSpkiDerBase64:spki.toString("base64"),independentPins:pins
     });
     if(check.cryptographicSignatureVerified!==true)
       hold("SIGNED_TICKET_VERIFY_FAILED");
     return {
       signedTicketSha256:hash(bytes),
       signedTicketVerifiedAgainstProtectedSigner:true
     };
    },
    store:createGate4OwnedBindingPgStoreV39(pool),
    deleteKnownExact:(id:string)=>deleteSubscriptionVerifiedStrict(id,{
      maxAttempts:3
    }),
    recordSafetyIncident:async(reason:string,known:boolean)=>{
      reportIncident(reason,known);
    }
   });
   console.log(JSON.stringify({
    status:result.status,
    positiveProviderIdCaptured:true,
    exactScopedV0072ReadBack:result.exactOwnerReadBack,
    providerCreates:result.createAttempts,
    paidTrialComplete:false,
    externalCasAnchorCertified:false,
    threeBalanceSettlementVerified:false,
    next:"INDEPENDENT_STOP_AND_SETTLEMENT"
   }));
 }finally{await pool.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 execute().catch(e=>{
   const message=e instanceof Error?e.message:"";
   console.error(/^GATE4_PAID_OPERATOR_[A-Z0-9_]+_HOLD$/.test(message)
     ?message:"GATE4_PAID_OPERATOR_UNCERTAIN_OUTCOME_MANUAL_RESCUE_HOLD");
   process.exitCode=2;
 });
}
