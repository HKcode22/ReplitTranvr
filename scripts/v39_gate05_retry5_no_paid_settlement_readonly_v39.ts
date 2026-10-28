/**
 * FREE READ-ONLY settled-account triage of the exact Oct28 Gate05 retry5.
 * Does not create, delete, refill, FIDS GET, or change DB/owner state.
 * A successful exact owned provider DELETE in an old GitHub job is still
 * not independently confirmed balance settlement or a 60-minute science PASS.
 */
import "dotenv/config";
import pg from "pg";
import {execFileSync} from "node:child_process";
import {getBalanceEvidenceStrictWithRetry,listSubscriptionsStrictWithRetry} from
  "../server/lib/disruption/aerodataboxLimiter_v3";
import {gate05ProviderReadFailureTransientV39} from
  "../server/lib/disruption/gate05ProviderTelemetrySafety_v39";

const REPO="HKcode22/ReplitTranvr";
const SCOPE="e69ffa34-d8a6-456f-a49c-9dd459e6d294";
const RECEIVER="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const AUTH="7c3c58076322986b97744c234e25223818f2dcbd73ac525e392f3a0294654061";
const TICKET="aa6d6c9374bcca7af6b6beea7589e42bbb648649ee1d3493bcf75144c5bc6a7f";
const START="2026-10-28T10:15:00.000Z";
const STOP="2026-10-28T11:15:00.000Z";
const BASELINE=1981;
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const withFreeProviderReadRecovery=async<T>(fn:()=>Promise<T>):Promise<T>=>{
  // Account balance is read-only. Permit 3 spaced recovery windows so
  // a transient GitHub egress/provider fault does not require user timing.
  // Never turn this pattern into a non-idempotent CREATE/DELETE retry.
  let lastError:unknown;
  for(let i=0;i<3;i++){
    try{return await fn();}
    catch(error){
      lastError=error;
      const message=error instanceof Error?error.message:"";
      if(!gate05ProviderReadFailureTransientV39(message)||i===2)break;
      console.warn(JSON.stringify({
        status:"GATE05_FREE_SETTLEMENT_TELEMETRY_RETRY",
        completedFailedReadWindow:i+1,
        noProviderMutation:true,noCreditsAssumed:true
      }));
      await sleep(30_000);
    }
  }
  throw lastError instanceof Error?lastError:
    Error("GATE05_FREE_SETTLEMENT_READ_UNAVAILABLE");
};
const expect=(x:boolean,code:string)=>{if(!x)throw Error("GATE05_READONLY_SETTLEMENT_HOLD_"+code);};
async function main(){
  expect(process.env.GITHUB_ACTIONS==="true"&&
    process.env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
    process.env.GITHUB_REF==="refs/heads/main"&&
    process.env.GITHUB_RUN_ATTEMPT==="1",
    "GITHUB_DISPATCH_ONLY");
  const head=execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  expect(head===process.env.GITHUB_SHA,"CHECKOUT_SOURCE_PIN");
  const url=process.env.DATABASE_URL;
  expect(Boolean(url&&process.env.AERODATABOX_API_KEY),"PROTECTED_SECRETS");
  const db=new pg.Client({
    connectionString:url,connectionTimeoutMillis:8000,
    statement_timeout:12000,query_timeout:12000,
    application_name:"gate05_no_paid_settlement_readonly"
  });
  db.on("error",()=>console.warn("GATE05_SETTLEMENT_DB_READ_INTERRUPTED"));
  try{
    await db.connect();
    const identity=await db.query("SELECT current_database() AS db,current_user AS actor");
    expect(identity.rows[0]?.db==="neondb"&&identity.rows[0]?.actor==="neondb_owner",
      "DATABASE_IDENTITY");
    await db.query("BEGIN READ ONLY");
    const q=await db.query(`SELECT session_id::text,source_commit,
      authorization_sha256,reviewed_stop_ticket_sha256,airport_icao,state,
      provider_subscription_id,start_at_utc,stop_at_utc,
      exact_owned_delete_verified,terminal_at_utc
      FROM clean.phase3_gate05_science_owner_v39
      WHERE session_id=$1::uuid`,[SCOPE]);
    await db.query("ROLLBACK");
    const o=q.rows[0];
    expect(q.rowCount===1&&o?.source_commit===RECEIVER&&
      o?.authorization_sha256===AUTH&&o?.reviewed_stop_ticket_sha256===TICKET&&
      o?.airport_icao==="WSSS"&&
      new Date(o.start_at_utc).toISOString()===START&&
      new Date(o.stop_at_utc).toISOString()===STOP,
      "EXACT_OLD_OWNER_IDENTITY");
    expect(["ACTIVE","STOPPED","FAILED"].includes(o.state),"OWNER_STATE_NOT_BOUND");
    expect(typeof o.provider_subscription_id==="string"&&
      o.provider_subscription_id.length>=6,"OWNED_ID_NOT_LOGGED");
    // Both FREE provider calls are separate authenticated current evidence.
    const balanceFirst=await withFreeProviderReadRecovery(()=>
      getBalanceEvidenceStrictWithRetry({maxAttempts:3}));
    const subs=await withFreeProviderReadRecovery(()=>
      listSubscriptionsStrictWithRetry({maxAttempts:3}));
    // Repeat the FREE account reading after a real spacing interval:
    // stable counters are evidence, not a guaranteed final bill ledger.
    await sleep(30_000);
    const balance=await withFreeProviderReadRecovery(()=>
      getBalanceEvidenceStrictWithRetry({maxAttempts:3}));
    const secondSubs=await withFreeProviderReadRecovery(()=>
      listSubscriptionsStrictWithRetry({maxAttempts:3}));
    const creditsStableAcrossReads=
      balanceFirst.balance.creditsRemaining===balance.balance.creditsRemaining;

    const active=subs.filter(x=>x.isActive);
    const activeLatest=secondSubs.filter(x=>x.isActive);
    const exactStillActive=active.some(x=>x.id===o.provider_subscription_id)||
      activeLatest.some(x=>x.id===o.provider_subscription_id);
    const foreignActive=active.filter(x=>x.id!==o.provider_subscription_id).length+
      activeLatest.filter(x=>x.id!==o.provider_subscription_id).length;
    const remaining=balance.balance.creditsRemaining;
    const spent=BASELINE-remaining;
    expect(Number.isSafeInteger(spent)&&spent>=0,"CREDIT_COUNTER_INVALID_OR_REFILLED");
    const status=exactStillActive?"PAID_EXACT_ID_STILL_ACTIVE_NO_RETRY":
      foreignActive>0?"FOREIGN_ACTIVE_PROVIDER_NO_RETRY":
      !creditsStableAcrossReads?"PROVIDER_CREDIT_POSTING_IN_PROGRESS_NO_RETRY":
      "EXACT_OWNED_SUBSCRIPTION_INACTIVE_ACCOUNTING_PROVISIONAL";
    console.log(JSON.stringify({
      schema:"v39.gate05.retry5-readonly-settlement.v1",
      status,
      scope:SCOPE,providerIdVerifiedInDatabase:true,
      exactOwnedSubscriptionActive:exactStillActive,
      foreignActiveSubscriptions:foreignActive,
      observedAlertCreditsRemaining:remaining,
      twoFreeBalanceReadsStable:creditsStableAcrossReads,
      firstBalanceObservedAtUtc:balanceFirst.quota.observedAtUtc,
      netAccountDebitSincePreCreateBaseline:spent,
      cannotAttributeAllNetDebitToThisPilot:true,
      providerBalanceObservedAtUtc:balance.quota.observedAtUtc,
      exact60MinutePilotSucceeded:false,
      strictSciencePassed:false,
      observedWindowShortened:true,
      finalBillingSettlementMayLag:true,
      ownerState:o.state,
      ownerTerminalizationStillNeeded:o.state==="ACTIVE",
      noProviderMutation:true,
      noBlindCreateRetry:true
    }));
    expect(!exactStillActive&&foreignActive===0,"ACTIVE_SUBSCRIPTION_NO_RETRY");
    expect(creditsStableAcrossReads,"BILLING_COUNTER_STILL_MOVING_NO_PAID_RETRY");
    expect(spent<=500,"SPENT_OVER_AUTHORIZED_ENVELOPE_REQUIRES_REVIEW");
  }finally{await db.end().catch(()=>undefined);}
}
if(process.argv[1]?.endsWith("v39_gate05_retry5_no_paid_settlement_readonly_v39.ts"))
  void main().catch(e=>{
    console.error(JSON.stringify({
      status:"GATE05_NO_PAID_ACCOUNT_SETTLEMENT_UNRESOLVED",
      reason:e instanceof Error?e.message:"UNKNOWN",
      noProviderCreate:true,noDelete:true,noRefill:true,
      doNotRetryPaidPilot:true
    }));
    process.exitCode=2;
  });
