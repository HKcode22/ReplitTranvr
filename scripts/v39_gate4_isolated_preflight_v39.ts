/**
 * Gate4 isolated canary READONLY source/account foundation.
 * This deliberately DOES NOT start a subscription or run Phase6.
 *
 * node --import tsx scripts/v39_gate4_isolated_preflight_v39.ts \
 *   --dry-run --published-head <40-hex> --cap 20 --reserve 10
 *
 * Requires an exact published-host git head. The published route check is
 * PREPAID callback compatibility only, not Gate4 live SEND/receiver proof.
 */
import "dotenv/config";
import pg from "pg";
import {pathToFileURL} from "node:url";
import {
  getBalanceEvidenceStrict,listSubscriptionsStrictWithRetry,
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {verifyGate3PublishedPrepaidHostV39} from
  "../server/lib/disruption/gate3OwnedPreExposure_v39";
import {assessGate4StandaloneAccountV39} from
  "../server/lib/disruption/gate4StandaloneSafety_v39";

type Params={head:string;cap:number;reserve:number};
export function parseGate4StandaloneArgsV39(argv:readonly string[]):Params {
 if(argv.length!==7||argv[0]!=="--dry-run"||
   argv[1]!=="--published-head"||
   !/^[a-f0-9]{40}$/.test(argv[2])||
   argv[3]!=="--cap"||!/^\d{1,3}$/.test(argv[4])||
   argv[5]!=="--reserve"||!/^\d{1,3}$/.test(argv[6]))
    throw Error("GATE4_STANDALONE_USAGE_DRY_RUN_ONLY");
 const cap=Number(argv[4]),reserve=Number(argv[6]);
 if(cap<1||cap>100||reserve<1||reserve>100)
   throw Error("GATE4_STANDALONE_SMALL_SCOPE_INVALID");
 return {head:argv[2],cap,reserve};
}
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
/**
 * The account/host providers may raise messages with HTTP response details.
 * NEVER serialize them. Only disclose approved, fixed-prefix failure codes.
 */
export function gate4ReadonlySafeFailureCodeV39(error:unknown):string{
 const msg=error instanceof Error?error.message:"";
 if(msg.startsWith("GATE3_OWNER_PUBLISHED_HOST_"))
   return "PUBLISHED_HOST_IDENTITY_OR_AVAILABILITY_HOLD";
 if(msg.startsWith("BALANCE_UNAVAILABLE"))
   return "STRICT_PROVIDER_BALANCE_GET_HOLD";
 if(msg.startsWith("R1_LIST_UNAVAILABLE")||
    msg.startsWith("R1_LIST_RETRY"))
   return "STRICT_PROVIDER_INVENTORY_GET_HOLD";
 if(msg==="GATE4_DATABASE_URL_REQUIRED")
   return "LOCAL_DATABASE_CONFIGURATION_MISSING";
 if(msg==="GATE4_WRONG_DATABASE_IDENTITY")
   return "PRODUCTION_DATABASE_IDENTITY_MISMATCH";
 if(msg.startsWith("GATE4_STANDALONE_"))
   return "GATE4_READONLY_ARGUMENTS_INVALID";
 return "REDACTED_STAGE_FAILURE";
}
export async function runGate4StandalonePreflightV39(
 argv:readonly string[]=process.argv.slice(2)
):Promise<number>{
 let db:pg.Client|null=null;
 let stage="ARGUMENT_VALIDATION";
 try {
   const args=parseGate4StandaloneArgsV39(argv);
   if(!process.env.DATABASE_URL)
     throw Error("GATE4_DATABASE_URL_REQUIRED");
   // Production deployment, identity and prepaid receiving status. This GET
   // does NOT verify a future Gate4 paid owner or its exact callback identity.
   stage="PUBLISHED_HOST_IDENTITY";
   await verifyGate3PublishedPrepaidHostV39(args.head);
   // STRICT GET: no UI listSubscriptions() fallback-to-empty.
   stage="STRICT_PROVIDER_LIST";
   const subs=await listSubscriptionsStrictWithRetry();
   const activeCreditBased=subs.filter(s=>
     s.isActive && s.billingType==="CreditBased").length;
   const balanceEvidence=[];
   for(let k=0;k<3;k++){
     if(k>0)await sleep(1200);
     stage="STRICT_BALANCE_READ_"+(k+1);
     balanceEvidence.push(await getBalanceEvidenceStrict());
   }
   db=new pg.Client({
     connectionString:process.env.DATABASE_URL,
     connectionTimeoutMillis:7000,statement_timeout:12000,
     query_timeout:14000
   });
   stage="PRODUCTION_DB_CONNECT";
   await db.connect();
   await db.query("BEGIN TRANSACTION READ ONLY");
   stage="PRODUCTION_DB_IDENTITY";
   const identity=(await db.query(
     "SELECT current_database() AS db,current_user AS actor,pg_is_in_recovery() AS replica"
   )).rows[0];
   if(identity?.db!=="neondb"||identity?.actor!=="neondb_owner"||
      identity?.replica!==false)
     throw Error("GATE4_WRONG_DATABASE_IDENTITY");
   stage="PRODUCTION_BATCH_AND_SUBS_READ";
   const status=(await db.query(
     "SELECT "+
       "(SELECT count(*)::int FROM clean.adb_collection_batches "+
        "WHERE status IN ('ACTIVE','STARTING','BLOCKED')) AS active_batches,"+
       "(SELECT count(*)::int FROM clean.adb_collection_subs "+
        "WHERE ended_at IS NULL) AS unended_subs"
   )).rows[0];
   await db.query("ROLLBACK");
   stage="GATE4_ACCOUNT_SAFETY_EVALUATION";
   const verdict=assessGate4StandaloneAccountV39({
     balances:balanceEvidence.map(v=>v.balance.creditsRemaining),
     quotaRemaining:balanceEvidence.map(v=>v.quota.apiUnitsRemaining),
     activeCreditBased,
     activePhase6Batches:
       Number(status.active_batches)+Number(status.unended_subs),
     canaryCap:args.cap,unsettledBurstReserve:args.reserve,
     protectedCreditFloor:1000
   });
   console.log(JSON.stringify({
     schema:"v39.gate4.isolated-preflight.v1",
     status:verdict.readyForSeparateAuthorization?
       "ACCOUNT_AND_PREPAID_HOST_READONLY_READY":
       "ACCOUNT_SAFETY_HOLD",
     reason:verdict.reason,
     preflightCanaryCap:args.cap,extraUnsettledReserve:args.reserve,
     protectedFloor:1000,
     observedBalance:verdict.observedBalance,
     plannedExposurePlusReserve:verdict.maximumPlannedExposure,
     strictProviderActiveBillable:activeCreditBased,
     livePhase6OrUnendedLocalRows:
       Number(status.active_batches)+Number(status.unended_subs),
     publishedRuntimeGitHeadMatched:true,
     publishedPrepaidCallbackCompatibilityChecked:true,
     gate4CanaryCallbackRouteProven:false,
     independentStopProcessArmed:false,
     actualProviderHardCapCertified:false,
     gate4LivePassed:false,paidAuthorization:false,
     paidFidsRequests:0,alertCreateRequests:0,
     providerDeleteRequests:0,databaseWrites:0
   },null,2));
   return verdict.readyForSeparateAuthorization?0:2;
 }catch(error){
   // Report the step and a fixed known code; never raw error, HTTP body,
   // provider subscriber IDs, connection URL or authenticated host URL.
   console.error(JSON.stringify({
     schema:"v39.gate4.isolated-preflight.v2",
     status:"HOLD_READONLY_FOUNDATION_FAILED",
     failedStage:stage,
     failureCode:gate4ReadonlySafeFailureCodeV39(error),
     action:"REVIEW_EXACT_FAILED_STAGE_NO_OVERRIDE",
     gate4LivePassed:false,paidAuthorization:false,
     alertCreateRequests:0,databaseWrites:0
   }));
   return 2;
 }finally{
   if(db){
     await db.query("ROLLBACK").catch(()=>{});
     await db.end().catch(()=>{});
   }
 }
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
 runGate4StandalonePreflightV39().then(c=>{process.exitCode=c})
   .catch(()=>{console.error("GATE4_READONLY_UNHANDLED_HOLD");process.exitCode=2});
}
