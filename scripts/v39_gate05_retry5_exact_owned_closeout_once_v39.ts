/**
 * One-use, forward-only, DB-only terminalization of the Oct 28 Gate05 retry5.
 * FREE provider balance/LIST are the only AeroDataBox operations.
 * Never CREATE, DELETE, refill, FIDS, or edit a different historical owner.
 * STOPPED means exact provider inactivity verified, NOT full-hour science PASS
 * and NOT final delayed-billing settlement.
 */
import "dotenv/config";
import pg from "pg";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {getBalanceEvidenceStrictWithRetry,listSubscriptionsStrictWithRetry}
  from "../server/lib/disruption/aerodataboxLimiter_v3";

const REPO="HKcode22/ReplitTranvr";
const SCOPE="e69ffa34-d8a6-456f-a49c-9dd459e6d294";
const RECEIVER="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const AUTH="7c3c58076322986b97744c234e25223818f2dcbd73ac525e392f3a0294654061";
const TICKET="aa6d6c9374bcca7af6b6beea7589e42bbb648649ee1d3493bcf75144c5bc6a7f";
const PAID_HEAD="f6094c6b168c2b3bd83800660a034f03aa8c1d95";
const SETTLEMENT_HEAD="9ddac718395eb5c319e706bfea2c6f2f317c039d";
const START="2026-10-28T10:15:00.000Z";
const STOP="2026-10-28T11:15:00.000Z";
const BASELINE=1981;
const errorCode=(code:string):never=>{throw Error("GATE05_EXACT_CLOSEOUT_HOLD_"+code);};
const requireTrue=(value:unknown,code:string):void=>{if(!value)errorCode(code);};
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
type FreeBalance={balance:{creditsRemaining:number};quota:{observedAtUtc:string}};
type FreeInventory=Array<{id:string;isActive:boolean}>;

export function validateRetry5CloseoutEvidenceV39(input:{
  owner:{
    session_id:string;state:string;source_commit:string;
    authorization_sha256:string;reviewed_stop_ticket_sha256:string;
    airport_icao:string;provider_subscription_id:string|null;
    start_at_utc:Date|string;stop_at_utc:Date|string;
    alert_credit_ceiling:number;early_stop_credits:number;
    rest_api_units_ceiling:number;
    exact_owned_delete_verified:boolean|null;
    terminal_at_utc:Date|string|null;terminal_evidence_sha256:string|null;
  };
  firstBalance:number;lastBalance:number;
  firstSubs:FreeInventory;lastSubs:FreeInventory;
}):{providerId:string;netDebit:number}{
  const o=input.owner;
  requireTrue(Boolean(o&&o.session_id===SCOPE&&o.state==="ACTIVE"&&
    o.source_commit===RECEIVER&&o.authorization_sha256===AUTH&&
    o.reviewed_stop_ticket_sha256===TICKET&&o.airport_icao==="WSSS"&&
    o.alert_credit_ceiling===500&&o.early_stop_credits===350&&
    o.rest_api_units_ceiling===12&&
    new Date(o.start_at_utc).toISOString()===START&&
    new Date(o.stop_at_utc).toISOString()===STOP&&
    o.exact_owned_delete_verified===null&&
    o.terminal_at_utc===null&&o.terminal_evidence_sha256===null),
    "EXACT_ACTIVE_OWNER_UNEXPECTED");
  requireTrue(typeof o.provider_subscription_id==="string"&&
    /^[A-Za-z0-9_-]{6,128}$/.test(o.provider_subscription_id),
    "EXACT_PROVIDER_ID_UNKNOWN");
  requireTrue(Number.isSafeInteger(input.firstBalance)&&
    Number.isSafeInteger(input.lastBalance)&&
    input.firstBalance===input.lastBalance&&
    input.lastBalance>=0&&input.lastBalance<=BASELINE,
    "INCONSISTENT_OR_REFILLED_BALANCE");
  const debit=BASELINE-input.lastBalance;
  requireTrue(debit<=500,"AUTHORIZATION_ENVELOPE_REQUIRES_REVIEW");
  for(const subs of [input.firstSubs,input.lastSubs]){
    requireTrue(Array.isArray(subs)&&subs.every(s=>
      typeof s?.id==="string"&&typeof s?.isActive==="boolean"),
      "INVALID_PROVIDER_LIST");
    requireTrue(!subs.some(s=>s.isActive),"SOME_PROVIDER_SUBSCRIPTION_STILL_ACTIVE");
  }
  return {providerId:o.provider_subscription_id!,netDebit:debit};
}
function ghRun(id:number){
  const out=execFileSync("gh",["api",
    "repos/"+REPO+"/actions/runs/"+id],{
    encoding:"utf8",timeout:20000,stdio:["ignore","pipe","ignore"],
    maxBuffer:256000
  });
  return JSON.parse(out) as {
    id:number;head_sha:string;status:string;conclusion:string;
    event:string;
  };
}
/**
 * Same-run authenticated detailed emergency receipt is required in addition
 * to current provider inactivity. The old CLI's generic unconfirmed warning
 * does NOT override the specific positive DELETE receipt.
 */
export function verifyHistoricalExactDeleteLogV39(log:string):string{
  const receipts=log.split(/\r?\n/).filter(x=>
    x.includes('"status":"GATE05_EMERGENCY_EXACT_STOP_ATTEMPT"'));
  requireTrue(receipts.length===1,"EXACT_HISTORICAL_DELETE_RECEIPT_NOT_UNIQUE");
  const json=receipts[0].match(/\{.*\}/)?.[0];
  requireTrue(Boolean(json),"EXACT_HISTORICAL_DELETE_RECEIPT_PARSE");
  let value:any;
  try{value=JSON.parse(json!);}
  catch{errorCode("EXACT_HISTORICAL_DELETE_RECEIPT_INVALID");}
  requireTrue(value?.status==="GATE05_EMERGENCY_EXACT_STOP_ATTEMPT"&&
    value.exactOwnedIdEstablished===true&&
    value.exactOwnedDeleteAttempted===true&&
    value.exactOwnedDeleteVerified===true&&
    value.databaseReadbackUnavailable===false,
    "HISTORICAL_EXACT_DELETE_NOT_VERIFIED");
  return createHash("sha256").update(json!).digest("hex");
}

async function main(){
  requireTrue(process.env.GITHUB_ACTIONS==="true"&&
    process.env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
    process.env.GITHUB_REF==="refs/heads/main"&&
    process.env.GITHUB_RUN_ATTEMPT==="1"&&
    process.env.GATE05_EXACT_CLOSEOUT_CONFIRMATION===
      "TERMINALIZE_ONLY_RETRY5_EXACT_INACTIVE_OWNER_NO_PAID_PROVIDER_MUTATION",
    "REVIEWED_ONE_USE_DISPATCH");
  const head=execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  requireTrue(head===process.env.GITHUB_SHA,"CHECKOUT_SHA");
  requireTrue(Boolean(process.env.DATABASE_URL&&
    process.env.AERODATABOX_API_KEY&&process.env.GH_TOKEN),
    "PROTECTED_CREDENTIALS_ABSENT");
  const paid=ghRun(40667765747);
  const oldStop=ghRun(40667867823);
  const audited=ghRun(40675181436);
  requireTrue(paid.head_sha===PAID_HEAD&&paid.status==="completed"&&
    paid.conclusion==="success"&&paid.event==="workflow_dispatch"&&
    oldStop.head_sha===PAID_HEAD&&oldStop.status==="completed"&&
    oldStop.conclusion==="failure"&&
    audited.head_sha===SETTLEMENT_HEAD&&
    audited.status==="completed"&&audited.conclusion==="success"&&
    audited.event==="workflow_dispatch",
    "HISTORICAL_RUNS_CHANGED");
  // Independently retrieve the detailed original STOP evidence, not merely
  // the failed workflow's summary. The source-owning GitHub job is immutable.
  const oldLog=execFileSync("gh",["run","view","40667867823",
    "--repo",REPO,"--log"],{
    encoding:"utf8",timeout:30000,stdio:["ignore","pipe","ignore"],
    maxBuffer:4*1024*1024
  });
  const verifiedHistoricalDeleteReceiptSha256=
    verifyHistoricalExactDeleteLogV39(oldLog);
  // Establish independent FREE provider facts BEFORE beginning any write TX.
  const first=await getBalanceEvidenceStrictWithRetry({maxAttempts:3}) as FreeBalance;
  const firstList=await listSubscriptionsStrictWithRetry({maxAttempts:3}) as FreeInventory;
  await sleep(30_000);
  const second=await getBalanceEvidenceStrictWithRetry({maxAttempts:3}) as FreeBalance;
  const secondList=await listSubscriptionsStrictWithRetry({maxAttempts:3}) as FreeInventory;
  requireTrue(
    Number.isFinite(Date.parse(first.quota.observedAtUtc))&&
    Number.isFinite(Date.parse(second.quota.observedAtUtc))&&
    Date.parse(second.quota.observedAtUtc)>
      Date.parse(first.quota.observedAtUtc),
    "PROVIDER_EVIDENCE_CLOCK_INVALID"
  );
  const db=new pg.Client({
    connectionString:process.env.DATABASE_URL,
    connectionTimeoutMillis:8000,statement_timeout:12000,
    query_timeout:12000,
    application_name:"gate05_retry5_db_only_exact_terminal_closeout"
  });
  db.on("error",()=>console.warn("GATE05_CLOSEOUT_DB_CONNECTION_INTERRUPTED"));
  let transaction=false;
  let commitAttempted=false;
  try{
    await db.connect();
    const ident=await db.query("SELECT current_database() AS db,current_user AS actor");
    requireTrue(ident.rows[0]?.db==="neondb"&&
      ident.rows[0]?.actor==="neondb_owner","DB_ADMIN_IDENTITY");
    await db.query("BEGIN");
    transaction=true;
    await db.query("SELECT pg_advisory_xact_lock(3905,20261028)");
    const owner=await db.query(
      "SELECT session_id::text,state,source_commit,authorization_sha256,"+
      "reviewed_stop_ticket_sha256,airport_icao,provider_subscription_id,"+
      "start_at_utc,stop_at_utc,alert_credit_ceiling,early_stop_credits,"+
      "rest_api_units_ceiling,exact_owned_delete_verified,terminal_at_utc,"+
      "terminal_evidence_sha256 FROM clean.phase3_gate05_science_owner_v39 "+
      "WHERE session_id=$1::uuid FOR UPDATE",[SCOPE]
    );
    requireTrue(owner.rowCount===1,"EXACT_OWNER_ROW_MISSING");
    const decision=validateRetry5CloseoutEvidenceV39({
      owner:owner.rows[0],
      firstBalance:first.balance.creditsRemaining,
      lastBalance:second.balance.creditsRemaining,
      firstSubs:firstList,lastSubs:secondList
    });
    // Historical STOP timestamp is 10:19:14Z. terminal_at_utc
    // below is deliberately the DATABASE CLOSEOUT time, not a
    // fabricated subscription deletion timestamp.
    const ledger={
      schema:"v39.gate05.retry5-early-exact-stop-db-closeout.v1",
      paidRun:40667765747,stopRun:40667867823,
      priorSettlementRun:40675181436,scope:SCOPE,
      verifiedHistoricalDeleteReceiptSha256,
      providerIdSha256:createHash("sha256").update(decision.providerId).digest("hex"),
      exactProviderInactiveBothReads:true,
      noForeignActiveBothReads:true,
      firstBalanceObservedAtUtc:first.quota.observedAtUtc,
      lastBalanceObservedAtUtc:second.quota.observedAtUtc,
      credits:first.balance.creditsRemaining,
      netAccountDebitAtRead:decision.netDebit,
      finalProviderBillingUnproven:true,
      fullHourSciencePassed:false,
      actualProviderDeleteAtUtc:"2026-10-28T10:19:14.245Z"
    };
    const evidenceHash=createHash("sha256").update(JSON.stringify(ledger)).digest("hex");
    const changed=await db.query(
      "UPDATE clean.phase3_gate05_science_owner_v39 "+
      "SET state='STOPPED',exact_owned_delete_verified=TRUE,"+
      "terminal_evidence_sha256=$3,terminal_at_utc=now() "+
      "WHERE session_id=$1::uuid AND state='ACTIVE' "+
      "AND provider_subscription_id=$2 AND exact_owned_delete_verified IS NULL "+
      "AND terminal_at_utc IS NULL AND terminal_evidence_sha256 IS NULL "+
      "RETURNING session_id::text,state,exact_owned_delete_verified,"+
      "terminal_evidence_sha256,terminal_at_utc",
      [SCOPE,decision.providerId,evidenceHash]
    );
    requireTrue(changed.rowCount===1&&changed.rows[0]?.state==="STOPPED"&&
      changed.rows[0]?.exact_owned_delete_verified===true,
      "COMPARE_AND_SWAP_TERMINALIZATION_FAILED");
    commitAttempted=true;
    await db.query("COMMIT");
    transaction=false;
    const check=await db.query(
      "SELECT state,exact_owned_delete_verified,terminal_evidence_sha256 "+
      "FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid",
      [SCOPE]
    );
    requireTrue(check.rowCount===1&&check.rows[0]?.state==="STOPPED"&&
      check.rows[0]?.exact_owned_delete_verified===true&&
      check.rows[0]?.terminal_evidence_sha256===evidenceHash,
      "COMMITTED_READBACK_UNCONFIRMED_REVIEW_BEFORE_ANY_REPEAT");
    console.log(JSON.stringify({
      status:"GATE05_RETRY5_EXACT_OWNER_DB_STOPPED_CENSORED_SCIENCE",
      scope:SCOPE,terminalEvidenceSha256:evidenceHash,
      balanceAtLastRead:second.balance.creditsRemaining,
      netAccountDebitAtRead:decision.netDebit,
      providerInactiveTwice:true,foreignActive:0,
      billingFinal:false,sciencePassed:false,
      ownerTerminalized:true,unloggedCallbackRowsUntouched:true,
      noProviderCreate:true,noProviderDelete:true,noFids:true,noRefill:true
    }));
  }catch(e){
    if(transaction&&!commitAttempted)
      await db.query("ROLLBACK").catch(()=>undefined);
    console.error(JSON.stringify({
      status:"GATE05_RETRY5_DB_CLOSEOUT_UNCONFIRMED",
      reason:e instanceof Error?e.message:"UNKNOWN",
      commitMayBeAmbiguous:commitAttempted,
      noPaidProviderMutation:true,noBlindRepeat:true
    }));
    throw e;
  }finally{
    await db.end().catch(()=>undefined);
  }
}
if(process.argv[1]?.endsWith("v39_gate05_retry5_exact_owned_closeout_once_v39.ts"))
  void main().catch(e=>{
    console.error(JSON.stringify({
      status:"GATE05_RETRY5_EXACT_CLOSEOUT_HOLD",
      reason:e instanceof Error?e.message:"UNKNOWN",
      doNotRerunIfCommitAmbiguous:true,noPaidProviderMutation:true
    }));
    process.exitCode=2;
  });
