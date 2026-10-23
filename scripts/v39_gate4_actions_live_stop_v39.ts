/**
 * Reviewed opt-in exact-ID STOP watcher for ONE Gate4 trial.
 * SOURCE RELEASED: still requires protected GH environment reviewer,
 * exact two-source pins, approved narrow window and manual dispatch. It
 * performs strict free GET/LIST and only exact-owned provider DELETE.
 * No subscription CREATE code; no cron and no Phase6 owner.
 *
 * Caveats: Github runner can stop unexpectedly; callbacks may be charged on
 * provider SEND even during a 5s polling cycle. Unknown CREATE ID requires
 * human rescue; this is NOT a provider hard credit cap.
 */
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import pg from "pg";
import {
  getBalanceEvidenceStrict,listSubscriptionsStrictWithRetry,
  deleteSubscriptionVerifiedStrict
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {
  runGate4ActionsStopTickV39,type Gate4StopOwnerV39,
  type Gate4StopTickResultV39
} from "../server/lib/disruption/gate4ActionsStopIntegration_v39";
import {
  reviewGate4ActionsWatchScopeV39,type Gate4ActionsWatchScopeV39
} from "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";

// This ONLY unlocks protected manual STOP admission, NOT CREATE permission.
// A workflow_dispatch input or environment variable cannot change source.
export const GATE4_ACTIONS_LIVE_STOP_RELEASED_V39=true;
const EXACT_CONFIRM="WATCH_G4_EXACT_ID_STOP_NO_CREATE";
/** A missing or disputed owner after CREATE is an emergency human
 * reconciliation incident. No ID is guessed or deleted. No second CREATE.
 * This pure result gate makes indefinite logging-without-escalation impossible.
 */
export function gate4StopRunnerTerminalHoldV39(
 result:Pick<Gate4StopTickResultV39,"status"|"reason">
):"EXACT_OWNER_RESCUE_REQUIRED"|"EXACT_STOP_UNCONFIRMED"|null{
 if(result.status==="HOLD_OWNER_REQUIRED")
   return "EXACT_OWNER_RESCUE_REQUIRED";
 if(result.status==="STOP_UNCONFIRMED")
   return "EXACT_STOP_UNCONFIRMED";
 return null;
}
/**
 * The published Replit Alert receiver pins its prebind scope to its built
 * source SHA, while this GitHub STOP job pins V0072 to its reviewed main SHA.
 * A mismatch could make real callbacks impossible to reconcile to the owned
 * subscription. Public status is ONLY a route/source consistency witness,
 * not proof a real provider Alert callback has arrived.
 */
export function gate4PublishedReceiverMatchesStopScopeV39(
 observed:unknown,expectedSource:string
):boolean{
 if(!/^[a-f0-9]{40}$/.test(expectedSource)||
    !observed||typeof observed!=="object"||Array.isArray(observed))
   return false;
 const x=observed as Record<string,unknown>;
 return x.status==="PASS"&&
   x.git_head===expectedSource&&
   x.published_deployment===true&&
   x.prepaid_route_registered===true&&
   x.gate4_alert_ingress_registered===true&&
   x.runtime_owner_mode==="replit-published-deployment"&&
   x.provider_mutation===false;
}
// No user-controlled URL or credential is sent to the public health endpoint.
const RECEIVER_STATUS_URL=
 "https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
/**
 * The CREATE HTTP response and the owner-only V0072 INSERT are not atomic.
 * A STOP that sees the billable subscription in this brief gap must allow
 * a short database-only readback window instead of exiting immediately.
 * After the bound, hard deadline or failed DB read: fail closed; never infer
 * an owner ID from the provider LIST.
 */
export const GATE4_POSITIVE_OWNER_BIND_GRACE_MS=8_000;
export function gate4MayWaitForPositiveOwnerBindingV39(
  result:Pick<Gate4StopTickResultV39,"status"|"reason">,
  nowMs:number,stopMs:number
):boolean{
 return result.status==="HOLD_OWNER_REQUIRED"&&
   result.reason==="BILLABLE_ACTIVE_WITHOUT_OWNER_ID"&&
   Number.isSafeInteger(nowMs)&&Number.isSafeInteger(stopMs)&&
   nowMs<stopMs;
}
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const name=/^gate4_safety_reader_[a-z0-9_]{4,60}$/;
function hold(reason:string):never{throw Error("GATE4_ACTIONS_"+reason+"_HOLD");}
function requireEnv(env:NodeJS.ProcessEnv,key:string):string{
  const x=env[key];if(!x)return hold("ENV_"+key);
  return x;
}
/** Admission pins are independent of the workflow-dispatch payload.
 * This pure check is testable while the live STOP source seal stays closed.
 * The actual provisioning authority is the protected GitHub environment.
 */
export function gate4IndependentApprovalPinsMatchV39(
 scope:Gate4ActionsWatchScopeV39,env:NodeJS.ProcessEnv
):boolean{
 return !!scope&&!!env&&
   env.GATE4_SAFETY_APPROVED_SOURCE===scope.sourceCommit&&
   env.GATE4_SAFETY_APPROVED_SCOPE===scope.scopeId&&
   env.GATE4_SAFETY_APPROVED_AUTH===scope.authorizationSha256&&
   env.GATE4_SAFETY_APPROVED_ICAO===scope.airportIcao&&
   env.GATE4_SAFETY_APPROVED_START_UTC===scope.startUtc&&
   env.GATE4_SAFETY_APPROVED_STOP_UTC===scope.stopUtc&&
   env.GATE4_SAFETY_APPROVED_SOFT_TARGET===String(scope.softCreditTarget)&&
   env.GATE4_SAFETY_APPROVED_PROTECTED_FLOOR===String(scope.protectedCreditFloor);
}
/**
 * Separately pinned GitHub Actions runner SHA. The published Replit receiver
 * SHA is the independently approved scope.sourceCommit, NOT the runner SHA.
 * Without this dual review a legitimate STOP-code release changes main and
 * invalidates receiver attribution. Neither value may approve the other.
 */
export function gate4IndependentRunnerSourcePinnedV39(
 env:NodeJS.ProcessEnv
):boolean{
 return /^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")&&
   env.GATE4_SAFETY_APPROVED_RUNNER_SHA===env.GITHUB_SHA;
}
export function reviewGate4LiveWatchLaunchV39(
 scope:Gate4ActionsWatchScopeV39,
 confirmation:string,
 env:NodeJS.ProcessEnv
):boolean{
  if(!GATE4_ACTIONS_LIVE_STOP_RELEASED_V39) return false;
  if(!reviewGate4ActionsWatchScopeV39(scope)||
     confirmation!==EXACT_CONFIRM||
     env.GITHUB_ACTIONS!=="true"||
     env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
     env.GITHUB_REF!=="refs/heads/main"||
     !gate4IndependentRunnerSourcePinnedV39(env)||
     !gate4IndependentApprovalPinsMatchV39(scope,env)||
     env.GATE4_SAFETY_ENV_NAME!=="gate4-safety"||
     !env.GITHUB_RUN_ID||
     !env.AERODATABOX_API_KEY||
     !env.GATE4_SAFETY_READONLY_DATABASE_URL||
     !env.GATE4_SAFETY_EXPECTED_DB_HOST||
     env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
     env.GATE4_PROVIDER_CREATE_ALLOWED)
    return false;
  try{
    const u=new URL(env.GATE4_SAFETY_READONLY_DATABASE_URL);
    const actor=decodeURIComponent(u.username);
    return ["postgres:","postgresql:"].includes(u.protocol)&&
      name.test(actor)&&!!u.password&&
      u.hostname===env.GATE4_SAFETY_EXPECTED_DB_HOST&&
      u.searchParams.get("sslmode")==="verify-full";
  }catch{return false;}
}
const query=
 "SELECT scope_id::text,source_commit,authorization_sha256,"+
 "airport_icao,subscription_id FROM clean.gate4_alert_owned_binding_v39 "+
 "WHERE scope_id=$1::uuid";
export async function runGate4LiveStopWatchV39(
 scope:Gate4ActionsWatchScopeV39,confirm:string,
 env:NodeJS.ProcessEnv=process.env
):Promise<void>{
 // A missing/false release is rejected before DB connection or API GET.
 if(!reviewGate4LiveWatchLaunchV39(scope,confirm,env))
   hold("RELEASE_OR_ENV_NOT_APPROVED");
 if(execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]
   }).trim()!==env.GITHUB_SHA)
   hold("REVIEWED_RUNNER_CHECKOUT_SHA");
 const start=Date.parse(scope.startUtc),stop=Date.parse(scope.stopUtc);
 const now=Date.now();
 if(start<now-60_000||start>now+10*60_000||stop<=now+30_000)
   hold("WINDOW_NOT_IMMINENT");
 // This network request is public, read-only, and occurs BEFORE DB or
 // AeroDataBox GET/LIST. Fail closed if source or ingress is not aligned.
 let published:unknown=null;
 try{
   const response=await fetch(RECEIVER_STATUS_URL,{
     method:"GET",redirect:"error",cache:"no-store",
     headers:{Accept:"application/json"},
     signal:AbortSignal.timeout(6000)
   });
   if(!response.ok)hold("RECEIVER_HTTP_NOT_OK");
   const body=await response.text();
   if(body.length>8192)hold("RECEIVER_HEALTH_TOO_LARGE");
   published=JSON.parse(body);
 }catch{hold("RECEIVER_PUBLIC_HEALTH_UNAVAILABLE");}
 if(!gate4PublishedReceiverMatchesStopScopeV39(
   published,scope.sourceCommit))
   hold("RECEIVER_SOURCE_OR_INGRESS_MISMATCH");
 const client=new pg.Client({
   connectionString:requireEnv(env,"GATE4_SAFETY_READONLY_DATABASE_URL"),
   connectionTimeoutMillis:6000,query_timeout:9000,
   statement_timeout:9000,application_name:"gate4_actions_safety_readonly",
   options:"-c default_transaction_read_only=on"
 });
 await client.connect();
 try{
   const who=(await client.query(
     "SELECT current_database() AS db,current_user AS actor,"+
     "current_setting('default_transaction_read_only') AS readonly"
   )).rows[0];
   const expectedActor=new URL(
      requireEnv(env,"GATE4_SAFETY_READONLY_DATABASE_URL")
   ).username;
   if(who?.db!=="neondb"||
      who?.actor!==decodeURIComponent(expectedActor)||
      who?.readonly!=="on")hold("RESTRICTED_DB_IDENTITY");
   const priv=(await client.query(
     "SELECT has_table_privilege(current_user,"+
     "'clean.gate4_alert_owned_binding_v39','SELECT') AS can_select,"+
     "has_table_privilege(current_user,"+
     "'clean.gate4_alert_owned_binding_v39','INSERT') AS can_insert,"+
     "has_table_privilege(current_user,"+
     "'clean.gate4_alert_owned_binding_v39','UPDATE') AS can_update,"+
     "has_table_privilege(current_user,"+
     "'clean.gate4_alert_owned_binding_v39','DELETE') AS can_delete"
   )).rows[0];
   if(priv?.can_select!==true||priv?.can_insert!==false||
       priv?.can_update!==false||priv?.can_delete!==false)
      hold("OWNER_DB_ROLE_NOT_READONLY");
   const initList=await listSubscriptionsStrictWithRetry();
   if(initList.some(x=>x.isActive&&x.billingType==="CreditBased"))
      hold("PREARM_BILLABLE_ALREADY_ACTIVE");
   const initBalance=(await getBalanceEvidenceStrict()).balance.creditsRemaining;
   if(initBalance!==scope.observedStartingCredits)
      hold("PREARM_BALANCE_CHANGED");
   console.log(JSON.stringify({
      status:"GATE4_ACTIONS_ARMED_NO_CREATE",
      scope:scope.scopeId,source:scope.sourceCommit,
      softCreditTarget:scope.softCreditTarget,
      stopUtc:scope.stopUtc,hardProviderCreditCap:false
   }));
   // Pre-arm must be separately inspected by the human CREATE operator;
   // merely launching this job is NEVER sufficient.
   const until=stop+120_000;
   while(Date.now()<until){
     const outcome=await runGate4ActionsStopTickV39(scope,
       new Date().toISOString(),{
         readExactOwned:async():Promise<Gate4StopOwnerV39|null>=>{
           const r=await client.query(query,[scope.scopeId]);
           if(r.rows.length===0)return null;
           if(r.rows.length!==1)hold("AMBIGUOUS_OWNER_ROWS");
           const row=r.rows[0];
           return {
             scopeId:row.scope_id,
             sourceCommit:row.source_commit,
             authorizationSha256:row.authorization_sha256,
             airportIcao:row.airport_icao,
             subscriptionId:row.subscription_id
           };
         },
         strictCredits:async()=>(
           await getBalanceEvidenceStrict()).balance.creditsRemaining,
         strictInventory:()=>listSubscriptionsStrictWithRetry({maxAttempts:1}),
         deleteOwnedExact:id=>deleteSubscriptionVerifiedStrict(id,{
           maxAttempts:3
         })
       });
     if(gate4MayWaitForPositiveOwnerBindingV39(outcome,Date.now(),stop)){
       // At most eight seconds. No extra provider LIST, balance GET, CREATE,
       // or DELETE; only exact-scope V0072 SELECT on restricted safety role.
       const graceEnd=Math.min(
         Date.now()+GATE4_POSITIVE_OWNER_BIND_GRACE_MS,stop);
       console.warn(JSON.stringify({
         status:"GATE4_POSITIVE_OWNER_BIND_GRACE_NO_PROVIDER",
         maxGraceMs:GATE4_POSITIVE_OWNER_BIND_GRACE_MS
       }));
       let ownerAppeared=false;
       while(Date.now()<graceEnd){
         await sleep(1_000);
         const r=await client.query(query,[scope.scopeId]);
         if(r.rows.length>1)hold("AMBIGUOUS_OWNER_ROWS_IN_BIND_GRACE");
         if(r.rows.length===1){ownerAppeared=true;break;}
       }
       // Next tick must independently verify all pinned owner fields and
       // strict provider state before it may STOP any exact-owned ID.
       if(ownerAppeared)continue;
     }
     if(outcome.status==="STOPPED_EXACT_PENDING_SETTLEMENT"){
       console.log(JSON.stringify({
         status:outcome.status,exactStopVerified:true,
         threeBalanceSettlementVerified:false,
         scientificGate4Passed:false
       }));
       return;
     }
     if(outcome.status!=="WATCH"){
       console.error(JSON.stringify({
         status:outcome.status,reason:outcome.reason,
         exactStopVerified:false,operatorRescueRequired:true
       }));
       // A discovered billable subscription with no positive owned ID,
       // failed owner-custody read, or unknown DELETE outcome is terminal
       // and requires immediate operator incident response. Never remain
       // silently in a 5-second poll loop while exposure can accumulate.
       const terminal=gate4StopRunnerTerminalHoldV39(outcome);
       if(terminal)hold(terminal);
     }
     await sleep(5_000);
   }
   hold("WINDOW_EXPIRED_WITHOUT_CERTIFIED_STOP");
 }finally{await client.end().catch(()=>undefined);}
}
function parseArg(args:readonly string[],key:string):string{
 const hits=args.filter(x=>x==="--"+key);
 const i=args.indexOf("--"+key);
 if(hits.length!==1||i===-1||!args[i+1])hold("BAD_CLI_"+key);
 return args[i+1];
}
if(process.argv[1]&&
 import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 try{
  if(args.length!==20)hold("BAD_CLI_LENGTH");
  const scope:Gate4ActionsWatchScopeV39={
   scopeId:parseArg(args,"scope"),
   sourceCommit:parseArg(args,"head"),
   authorizationSha256:parseArg(args,"auth"),
   airportIcao:parseArg(args,"icao"),
   startUtc:parseArg(args,"start"),
   stopUtc:parseArg(args,"stop"),
   observedStartingCredits:Number(parseArg(args,"balance")),
   softCreditTarget:Number(parseArg(args,"soft")),
   protectedCreditFloor:Number(parseArg(args,"floor"))
  };
  void runGate4LiveStopWatchV39(scope,parseArg(args,"confirm"))
   .catch(()=>{
     console.error("GATE4_LIVE_STOP_NOT_ARMED_OR_UNCONFIRMED");
     process.exitCode=2;
   });
 }catch{
   console.error("GATE4_LIVE_STOP_CLI_REJECTED");
   process.exitCode=2;
 }
}
