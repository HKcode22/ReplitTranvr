/**
 * One-use administrative closeout of the *exact* Oct29 WSSS hour.
 * Source: authenticated GitHub CREATE #40809300136, independent STOP
 * #40809393874, independent immutable custody audit #40821045269.
 *
 * This writes ONLY the V0074 existing LOGGED owner ACTIVE -> STOPPED
 * and an immutable evidence digest. Never edits/deletes V0075 custody,
 * provider blob refs, UNLOGGED prepaid rows, or source data.
 * AeroDataBox operations: strictly FREE balance/LIST GET, no mutation.
 * STOPPED is operational provider control, NOT scientific Gate5 PASS.
 */
import "dotenv/config";
import pg from "pg";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {
  getBalanceEvidenceStrictWithRetry,listSubscriptionsStrictWithRetry
} from "../server/lib/disruption/aerodataboxLimiter_v3";

const REPO="HKcode22/ReplitTranvr";
const SCOPE="618582a3-ea3f-4a10-a756-c974c472af3c";
const RECEIVER="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const OWNER_SOURCE="5e2be8d7e79375e40facd573c3a3ae57fdb98e40";
const AUDIT_SOURCE="1ac0543091d2b03c0d77785ac5cfe2722f0c231e";
const AUTH="1fcded99e76cc974dc518495bd127000a3a7a9cb4344e41b6b89cb9e01b98b23";
const STOP_TICKET="cd93866bc18a2d1368981837d4af8c036094e421c7d30dd03570e0b611f43746";
const PROVIDER_SHA="17d4c239182e42774d79ea55630971724a86249205c44585c59d3c032b0df413";
const START="2026-10-29T03:45:00.000Z",STOP="2026-10-29T04:45:00.000Z";
const BASELINE=1981,OBSERVED_SPENT=151;
const RUNS=[
  {id:40809300136,source:OWNER_SOURCE},
  {id:40809393874,source:OWNER_SOURCE},
  {id:40821045269,source:AUDIT_SOURCE}
] as const;
const CONFIRM="CLOSE_ONLY_OCT29_WSSS_EXACT_INACTIVE_OWNER_NO_PROVIDER_WRITES";
const sha256=(s:string)=>createHash("sha256").update(s).digest("hex");
const hold=(s:string):never=>{throw Error("GATE05_OCT29_EXACT_CLOSEOUT_HOLD_"+s);};
function required(c:unknown,s:string):asserts c{if(!c)hold(s);}
export interface Oct29OwnerEvidence {
  session_id:string;state:string;airport_icao:string;source_commit:string;
  authorization_sha256:string;reviewed_stop_ticket_sha256:string;
  provider_subscription_id:string|null;
  start_at_utc:Date|string;stop_at_utc:Date|string;
  alert_credit_ceiling:number;early_stop_credits:number;rest_api_units_ceiling:number;
  exact_owned_delete_verified:boolean|null;
  terminal_evidence_sha256:string|null;terminal_at_utc:Date|string|null;
}
export function verifyOct29OwnerForCloseout(owner:Oct29OwnerEvidence):string{
  required(owner?.session_id===SCOPE&&owner.state==="ACTIVE"&&
    owner.airport_icao==="WSSS"&&owner.source_commit===RECEIVER&&
    owner.authorization_sha256===AUTH&&owner.reviewed_stop_ticket_sha256===STOP_TICKET&&
    new Date(owner.start_at_utc).toISOString()===START&&
    new Date(owner.stop_at_utc).toISOString()===STOP&&
    owner.alert_credit_ceiling===500&&owner.early_stop_credits===350&&
    owner.rest_api_units_ceiling===12&&
    owner.exact_owned_delete_verified===null&&
    owner.terminal_evidence_sha256===null&&owner.terminal_at_utc===null,
    "OWNER_SCOPE_OR_FROZEN_AUTH_MISMATCH");
  const id=owner.provider_subscription_id;
  required(typeof id==="string"&&/^[A-Za-z0-9_-]{6,128}$/.test(id)&&
    sha256(id)===PROVIDER_SHA,"EXACT_BOUND_PROVIDER_ID_MISMATCH");
  return id;
}
export function verifyOct29StopLog(log:string):string{
  const lines=log.split(/\r?\n/).filter(s=>
    s.includes('"status":"STOP_PROVIDER_EXACT_INACTIVE"'));
  required(lines.length===1,"STOP_TERMINAL_RECEIPT_NOT_UNIQUE");
  const json=lines[0].match(/\{.*\}/)?.[0]??"";
  let receipt:any;
  try{receipt=JSON.parse(json);}catch{hold("STOP_TERMINAL_RECEIPT_PARSE");}
  required(receipt.schema==="v39.gate05.science-actions-stop-terminal.v1"&&
    receipt.scope===SCOPE&&receipt.reason==="TIME_STOP"&&
    receipt.status==="STOP_PROVIDER_EXACT_INACTIVE"&&
    receipt.providerChargedCredits===OBSERVED_SPENT&&
    receipt.exactOwnedProviderIdSeen===true&&
    receipt.ownerFinalizationNotYetProven===true&&
    receipt.fullSciencePassNotYetProven===true&&
    receipt.noProviderCreates===true&&
    receipt.providerDeletesKnownExactOnly===true,
    "STOP_RECEIPT_NOT_EXACT_AND_POSITIVE");
  return sha256(json);
}
export function verifyOct29FreeAccount(a:{
  firstBalance:number;secondBalance:number;
  firstSubs:Array<{id:string;isActive:boolean}>;
  secondSubs:Array<{id:string;isActive:boolean}>;
}):void{
  required(Number.isSafeInteger(a.firstBalance)&&
    a.firstBalance===a.secondBalance&&
    BASELINE-a.secondBalance===OBSERVED_SPENT,
    "BILLING_CHANGED_OR_INCONSISTENT");
  for(const subs of [a.firstSubs,a.secondSubs]){
    required(Array.isArray(subs)&&
      subs.every(s=>typeof s?.id==="string"&&typeof s?.isActive==="boolean")&&
      !subs.some(s=>s.isActive),"ACTIVE_OR_UNRELIABLE_PROVIDER_LIST");
  }
}
function gh(args:string[],max=512000):string{
  return execFileSync("gh",args,{
    encoding:"utf8",timeout:30000,
    maxBuffer:max,stdio:["ignore","pipe","ignore"]
  });
}
function verifyGitHubProof():string{
  for(const run of RUNS){
    const j=JSON.parse(gh(["api","repos/"+REPO+"/actions/runs/"+run.id]));
    required(j.id===run.id&&j.head_sha===run.source&&
      j.status==="completed"&&j.conclusion==="success"&&
      (j.event==="workflow_dispatch"||run.id===40821045269&&j.event==="push"),
      "HISTORICAL_GITHUB_RUN_DISAGREES_"+run.id);
  }
  const stopLog=gh(["run","view","40809393874","--repo",REPO,"--log"],4*1024*1024);
  return verifyOct29StopLog(stopLog);
}
async function main(){
  required(process.env.GITHUB_ACTIONS==="true"&&
    process.env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
    process.env.GITHUB_REF==="refs/heads/main"&&
    process.env.GITHUB_RUN_ATTEMPT==="1"&&
    process.env.GATE05_OCT29_EXACT_CONFIRMATION===CONFIRM,
    "NOT_ONE_USE_PROTECTED_MAIN_DISPATCH");
  const checkout=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  required(/^[a-f0-9]{40}$/.test(checkout)&&
    checkout===process.env.GITHUB_SHA,"CHECKOUT_HEAD_NOT_FROZEN");
  required(Boolean(process.env.DATABASE_URL&&process.env.AERODATABOX_API_KEY),
    "PROTECTED_DATABASE_AND_FREE_PROVIDER_CREDENTIALS_MISSING");
  const stopReceiptSha256=verifyGitHubProof();
  // Two distinct strict provider balance/LIST snapshots, no fallback to []
  // on network/HTTP/schema error. No paid request; do not create/delete.
  const first=await getBalanceEvidenceStrictWithRetry({maxAttempts:2});
  const firstSubs=await listSubscriptionsStrictWithRetry({maxAttempts:2});
  await new Promise(resolve=>setTimeout(resolve,30_000));
  const second=await getBalanceEvidenceStrictWithRetry({maxAttempts:2});
  const secondSubs=await listSubscriptionsStrictWithRetry({maxAttempts:2});
  verifyOct29FreeAccount({
    firstBalance:first.balance.creditsRemaining,
    secondBalance:second.balance.creditsRemaining,
    firstSubs,secondSubs
  });
  required(Date.parse(second.quota.observedAtUtc)>
    Date.parse(first.quota.observedAtUtc),"PROVIDER_READ_TIMESTAMPS_UNORDERED");
  const client=new pg.Client({
    connectionString:process.env.DATABASE_URL,
    connectionTimeoutMillis:9000,statement_timeout:12000,
    query_timeout:12000,application_name:"gate05_oct29_exact_admin_closeout"
  });
  let tx=false,commitAttempted=false;
  try{
    await client.connect();
    const who=(await client.query(
      "SELECT current_database() AS db,current_user AS actor,pg_is_in_recovery() AS replica"
    )).rows[0];
    required(who?.db==="neondb"&&who.actor==="neondb_owner"&&who.replica===false,
      "WRONG_ADMIN_DB");
    await client.query("BEGIN");tx=true;
    await client.query("SET LOCAL lock_timeout='3000ms'");
    await client.query("SELECT pg_advisory_xact_lock(3905,20261029)");
    const ow=await client.query(
      "SELECT session_id::text,state,airport_icao,source_commit,"+
      "authorization_sha256,reviewed_stop_ticket_sha256,provider_subscription_id,"+
      "start_at_utc,stop_at_utc,alert_credit_ceiling,early_stop_credits,"+
      "rest_api_units_ceiling,exact_owned_delete_verified,"+
      "terminal_evidence_sha256,terminal_at_utc "+
      "FROM clean.phase3_gate05_science_owner_v39 "+
      "WHERE session_id=$1::uuid FOR UPDATE",[SCOPE]
    );
    required(ow.rowCount===1,"OWNER_ROW_MISSING");
    const exactProviderId=verifyOct29OwnerForCloseout(ow.rows[0]);
    const receipt=(await client.query(
      "SELECT count(*)::int AS envelopes,coalesce(sum(item_count),0)::int AS items,"+
      "count(*) FILTER (WHERE committed_at_utc>$2::timestamptz)::int AS after_stop "+
      "FROM clean.gate05_science_delivery_custody_v39 WHERE session_id=$1::uuid",
      [SCOPE,STOP]
    )).rows[0];
    required(receipt?.envelopes===28&&receipt.items===151&&
      receipt.after_stop===0,"ORIGINAL_CUSTODY_EVIDENCE_CHANGED");
    const evidence={
      schema:"v39.gate05.oct29-wsss-exact-operational-closeout.v1",
      scope:SCOPE,publishedReceiverSha:RECEIVER,
      paidCreateRun:40809300136,independentStopRun:40809393874,
      independentPostrunAudit:40821045269,
      verifiedStopTerminalJsonSha256:stopReceiptSha256,
      providerBoundIdSha256:sha256(exactProviderId),
      completedStopAtUtc:"2026-10-29T04:45:11.062Z",
      currentProviderInactiveBothReads:true,
      currentActiveForeignCount:0,
      balanceFirstObservedAtUtc:first.quota.observedAtUtc,
      balanceLastObservedAtUtc:second.quota.observedAtUtc,
      alertCreditsRemainingAtCloseout:second.balance.creditsRemaining,
      originalDurableEnvelopes:28,originalNotificationItems:151,
      providerBillingFinal:false,originalGate5ScientificPass:false,
      prePostAndActualRunwayCertified:false,
      historicalRawBytesNotRead:true,sourceContentNotExtended:true
    };
    const digest=sha256(JSON.stringify(evidence));
    const done=await client.query(
      "UPDATE clean.phase3_gate05_science_owner_v39 SET "+
      "state='STOPPED',exact_owned_delete_verified=TRUE,"+
      "terminal_evidence_sha256=$3,terminal_at_utc=clock_timestamp() "+
      "WHERE session_id=$1::uuid AND state='ACTIVE' "+
      "AND provider_subscription_id=$2 "+
      "AND source_commit=$4 AND authorization_sha256=$5 "+
      "AND reviewed_stop_ticket_sha256=$6 "+
      "AND terminal_at_utc IS NULL AND exact_owned_delete_verified IS NULL "+
      "AND terminal_evidence_sha256 IS NULL "+
      "RETURNING state,terminal_evidence_sha256,exact_owned_delete_verified",
      [SCOPE,exactProviderId,digest,RECEIVER,AUTH,STOP_TICKET]
    );
    required(done.rowCount===1&&done.rows[0].state==="STOPPED"&&
      done.rows[0].terminal_evidence_sha256===digest&&
      done.rows[0].exact_owned_delete_verified===true,
      "EXACT_COMPARE_AND_SWAP_NOT_COMMITTED");
    commitAttempted=true;
    await client.query("COMMIT");tx=false;
    const check=(await client.query(
      "SELECT state,terminal_evidence_sha256,exact_owned_delete_verified "+
      "FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid",
      [SCOPE]
    )).rows[0];
    required(check?.state==="STOPPED"&&
      check.terminal_evidence_sha256===digest&&
      check.exact_owned_delete_verified===true,
      "POST_COMMIT_READBACK_UNCONFIRMED_DO_NOT_REPEAT");
    console.log(JSON.stringify({
      status:"GATE05_OCT29_EXACT_PROVIDER_OWNER_STOPPED_PROVEN",
      scopeFingerprint:sha256(SCOPE).slice(0,16),
      terminalEvidenceSha256:digest,providerActiveSubscriptions:0,
      durableEnvelopesPreserved:28,notificationItemsPreserved:151,
      providerMutations:0,paidFidsGets:0,ownerRowsUpdated:1,
      providerBillingFinal:false,scientificGate5Passed:false,
      phase5FreezePassed:false,phase6PaidGo:false
    }));
  }catch(e){
    if(tx&&!commitAttempted)await client.query("ROLLBACK").catch(()=>{});
    console.error(JSON.stringify({
      status:"GATE05_OCT29_EXACT_CLOSEOUT_HOLD",
      reason:e instanceof Error&&/^GATE05_OCT29_EXACT_CLOSEOUT_HOLD_/.test(e.message)
        ?e.message:"QUERY_OR_COMMIT_UNCERTAIN",
      commitMayBeAmbiguous:commitAttempted,doNotRetryWithoutIndependentReadback:true,
      noProviderMutations:true
    }));
    throw e;
  }finally{await client.end().catch(()=>{});}
}
if(process.argv[1]?.endsWith("v39_gate05_oct29_success_exact_owner_closeout_once_v39.ts")){
  void main().catch(()=>{process.exitCode=2;});
}
