/**
 * Manual GitHub Actions WSSS Gate3 SAFETY SIDECAR, not an experiment owner.
 *
 * SOURCE-RELEASE CANDIDATE: manual workflow only, pinned main SHA, exact AUTH,
 * prepared owner, production environment and independently checked host.
 * Sidecar has NO subscription CREATE path; it can only inspect and stop
 * the exact owned subscription after all authorization checks.
 *
 * Once reviewed/released, the sidecar must ARM before the paid-owner CREATE:
 * exact checked-in AUTH SHA, published source, prepared LOGGED owner and
 * UNLOGGED session, zero existing billables, actual baseline GET. Baseline
 * never enters artifact/log/SQL; only memory. The operator must independently
 * see the live GitHub job's ARMED receipt before any paid-owner launch.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {join} from "node:path";
import pg from "pg";
import {approvedArtifactHashesFromLedger,sha256HexString,
  verifyAuthRecord,type AuthRecord} from
  "../server/lib/disruption/authRecord_v39";
import {verifyGate3PublishedPrepaidHostV39} from
  "../server/lib/disruption/gate3OwnedPreExposure_v39";
import {prepaidProbeWebhookUrlV39} from
  "../server/lib/disruption/prepaidProbeRuntime_v39";
import {defaultWebhookUrl,getBalanceEvidenceStrict,
  listSubscriptionsStrictWithRetry,deleteSubscriptionVerifiedStrict}
  from "../server/lib/disruption/aerodataboxLimiter_v3";
import {runGate3IndependentWatchdogTickV39,
  type Gate3WatchdogOwnerRowV39}
  from "../server/lib/disruption/gate3IndependentWatchdogTick_v39";
import {publishGate3WatchdogLeaseV39,
  type Gate3WatchdogLeaseV39}
  from "../server/lib/disruption/gate3WatchdogLiveLease_v39";

/** Must never be an ENV/CLI flag. Requires separate reviewed source change. */
export const GATE3_WATCHDOG_LIVE_RELEASED_V39=true;
const PINNED_BASE="https://replit-tranvr--hk84164.replit.app";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const HEAD=/^[a-f0-9]{40}$/;
function stop(code:string):never{throw Error(code)}
function wait(ms:number):Promise<void>{
  return new Promise(resolve=>setTimeout(resolve,ms));
}
function ids(ledger:string):string[]{
  return Array.from(new Set(Array.from(ledger.matchAll(
    /\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g
  )).map(m=>m[1])));
}
export type Gate3SidecarInputsV39=Readonly<{
  authId:string;authFile:string;authSha:string;sessionId:string;
  expectedGitHead:string;startUtc:string;callbackBase:string;
  confirmed:string;
}>;

/** Pure validation before ANY provider or DB I/O. */
export function validateGate3SidecarInputsV39(
  x:Gate3SidecarInputsV39,now:Date,
):Readonly<{raw:string;start:number}>{
  if(!x||x.confirmed!=="WATCH_G3_WSSS_EXACT_NO_CREATE"||
     !/^AUTH-\d{8}-[A-Z0-9]+$/.test(x.authId)||
     !/^data-collection\/authorizations\/[A-Za-z0-9_.-]+\.json$/.test(x.authFile)||
     x.authFile.includes("..")||!SHA.test(x.authSha)||
     !UUID.test(x.sessionId)||!HEAD.test(x.expectedGitHead)||
     x.callbackBase!==PINNED_BASE||
     !Number.isFinite(now.getTime()))
    stop("GATE3_SIDECAR_INVALID_EXACT_INPUTS");
  const start=Date.parse(x.startUtc);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x.startUtc)||
     !Number.isFinite(start)||start<now.getTime()-15000||
     start>now.getTime()+600000)
    stop("GATE3_SIDECAR_NOT_IMMINENT");
  let raw:string,ledger:string;
  try{
    raw=readFileSync(x.authFile,"utf8");
    ledger=readFileSync(join("data-collection","evidence","ledgers",
      "V3.9_RUN_REPORTS_AND_EVIDENCE.md"),"utf8") + "\n" +
      readFileSync(join("data-collection","phase3",
        "2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md"),"utf8");
  }catch{stop("GATE3_SIDECAR_AUTH_OR_LEDGER_UNAVAILABLE")}
  if(sha256HexString(raw)!==x.authSha)
    stop("GATE3_SIDECAR_AUTH_SHA_MISMATCH");
  let record:AuthRecord;
  try{record=JSON.parse(raw) as AuthRecord}
  catch{stop("GATE3_SIDECAR_AUTH_JSON_INVALID")}
  if(!record||!Array.isArray(record.predecessorEvidenceIds))
    stop("GATE3_SIDECAR_AUTH_SHAPE_INVALID");
  const v=verifyAuthRecord(record,{
    nowUtc:now,expectedPhaseGate:"Phase 3 / Gate 3",
    existingEvidenceIds:ids(ledger),
    artifactHash:x.authSha,
    approvedArtifactHashes:approvedArtifactHashesFromLedger(ledger),
  });
  if(!v.verified||record.authorizationId!==x.authId||
     record.airportFilterWindow!==`WSSS/departures/${x.startUtc}+600s`||
     record.maxAlertCredits!==50||
     !record.cleanupOwner?.trim()||
     (record.maxRestUnitsByCategory!==null&&
       (typeof record.maxRestUnitsByCategory!=="object"||
         Object.values(record.maxRestUnitsByCategory).some(n=>n!==0))))
    stop("GATE3_SIDECAR_AUTH_NOT_APPROVED_FOR_EXACT_WINDOW");
  return {raw,start};
}

export async function executeGate3WatchdogSidecarV39(
  x:Gate3SidecarInputsV39,
):Promise<Readonly<{status:string;providerCreateCount:0}>>{
  // Absolute BEFORE-I/O stop, even when a manual GitHub workflow is invoked.
  if(!GATE3_WATCHDOG_LIVE_RELEASED_V39)
    stop("GATE3_SIDECAR_SOURCE_NOT_RELEASED_BEFORE_ANY_IO");

  if(process.env.GITHUB_ACTIONS!=="true"||
     !process.env.GITHUB_RUN_ID||
     !process.env.V39_DATABASE_RUNTIME_URL||
     !process.env.AERODATABOX_API_KEY||
     !process.env.AERODATABOX_WEBHOOK_SECRET||
     !process.env.GITHUB_TOKEN||
     !process.env.GITHUB_SHA||
     process.env.V39_DATABASE_TARGET_CONFIRM!=="production"||
     process.env.WEBHOOK_BASE_URL!==PINNED_BASE)
    stop("GATE3_SIDECAR_GITHUB_OR_PRODUCTION_CONFIG_MISSING");

  const reviewed=execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8"
  }).trim();
  if(reviewed!==x.expectedGitHead||
     process.env.GITHUB_SHA!==x.expectedGitHead)
    stop("GATE3_SIDECAR_REVIEWED_SOURCE_NOT_PINNED");

  const current=new Date();
  const auth=validateGate3SidecarInputsV39(x,current);
  await verifyGate3PublishedPrepaidHostV39(x.expectedGitHead);
  const callback=prepaidProbeWebhookUrlV39(defaultWebhookUrl(),x.sessionId);
  if(!callback.startsWith(PINNED_BASE+"/api/v1/webhooks/aerodatabox/")||
     !callback.endsWith("/prepaid/"+x.sessionId))
    stop("GATE3_SIDECAR_CALLBACK_URL_MISMATCH");

  const pool=new pg.Pool({
    connectionString:process.env.V39_DATABASE_RUNTIME_URL,
    max:1,connectionTimeoutMillis:6000,query_timeout:10000,
    options:"-c default_transaction_read_only=on -c statement_timeout=8000 -c lock_timeout=1000"
  });
  async function readOwner():Promise<Gate3WatchdogOwnerRowV39|null>{
    const c=await pool.connect();
    let begun=false,discard=false;
    try{
      await c.query("BEGIN TRANSACTION READ ONLY");begun=true;
      const r=await c.query(`
        SELECT o.session_id::text AS session_id,o.state AS owner_state,
               o.icao,o.authorization_evidence_sha256,
               o.fixed_exposure_seconds,o.canary_credit_ceiling,
               s.session_id::text AS runtime_session_id,
               s.owner_kind,s.state AS runtime_state,s.provider_subscription_id
        FROM clean.phase3_gate3_canary_owner_v39 o
        LEFT JOIN clean.prepaid_probe_session_runtime s ON s.session_id=o.session_id
        WHERE o.session_id=$1::uuid
      `,[x.sessionId]);
      if(r.rows.length!==1)return null;
      const z=r.rows[0];
      return {
        sessionId:String(z.session_id),
        ownerState:z.owner_state,
        icao:String(z.icao),
        authorizationEvidenceSha256:String(z.authorization_evidence_sha256),
        fixedExposureSeconds:Number(z.fixed_exposure_seconds),
        canaryCreditCeiling:Number(z.canary_credit_ceiling),
        // A persisted UNLOGGED row in failed/settling state is not an
        // ACTIVE receiver. Treat it as lost while a paid sub remains alive.
        runtimeSessionVisible:z.runtime_session_id===x.sessionId&&
          z.owner_kind==="phase3_credit_canary"&&
          ["armed","active"].includes(String(z.runtime_state)),
        boundProviderSubscriptionId:z.provider_subscription_id===null
          ?null:String(z.provider_subscription_id),
      };
    }finally{
      if(begun)try{await c.query("ROLLBACK")}catch{discard=true}
      c.release(discard);
    }
  }

  try{
    // Before account GET/ARM, durable owner and source must match EXACTLY.
    const o=await readOwner();
    if(!o||o.sessionId!==x.sessionId||
       o.ownerState!=="PREPARED"||o.icao!=="WSSS"||
       o.authorizationEvidenceSha256!==x.authSha||
       o.fixedExposureSeconds!==600||o.canaryCreditCeiling!==50||
       !o.runtimeSessionVisible||o.boundProviderSubscriptionId!==null)
      stop("GATE3_SIDECAR_OWNER_NOT_PREPARED");
    const inventory=await listSubscriptionsStrictWithRetry();
    if(inventory.some(z=>z.isActive&&z.billingType==="CreditBased"))
      stop("GATE3_SIDECAR_ACCOUNT_HAS_ACTIVE_BILLABLE");
    const balance=await getBalanceEvidenceStrict();
    const baseline=balance.balance.creditsRemaining;
    if(!Number.isSafeInteger(baseline)||baseline<1500||
       baseline-50<1000||balance.quota.apiUnitsRemaining<1)
      stop("GATE3_SIDECAR_BASELINE_INVALID");

    // The Actions BOT creates one durable metadata-only lease comment after
    // exact prearm checks. The paid owner independently verifies the bot actor,
    // exact AUTH/session/run/SHA, freshness AND in_progress GitHub job.
    // No provider account values, raw IDs or secret URL are ever published.
    const runId=Number(process.env.GITHUB_RUN_ID);
    if(!Number.isSafeInteger(runId)||runId<=0)
      stop("GATE3_SIDECAR_GITHUB_RUN_ID_INVALID");
    const lease=(status:Gate3WatchdogLeaseV39["status"]):Gate3WatchdogLeaseV39=>({
      schema:"v39.gate3.wsss-watchdog-lease.v1",
      status,githubRunId:runId,expectedGitHead:x.expectedGitHead,
      authSha256:x.authSha,sessionId:x.sessionId,startUtc:x.startUtc,
      heartbeatUtc:new Date().toISOString(),
      providerCreatesByWatchdog:0,hardCreditLimitGuaranteed:false,
    });
    const token=process.env.GITHUB_TOKEN;
    let leaseCommentId=await publishGate3WatchdogLeaseV39(token,lease("ARMED"));
    let lastHeartbeatAt=Date.now();
    console.log(JSON.stringify({
      schema:"v39.gate3.independent-watchdog-armed.v2",
      status:"ARMED_MONITOR_ONLY_NO_CREATE",
      github_run_id:runId,github_comment_id:leaseCommentId,
      source_sha:x.expectedGitHead,auth_id:x.authId,
      session_id:x.sessionId,start_utc:x.startUtc,
      paid_create_by_sidecar:0,
      hard_credit_cap_guaranteed:false
    }));
    const heartbeat=async(state:Gate3WatchdogLeaseV39["status"])=>{
      leaseCommentId=await publishGate3WatchdogLeaseV39(token,lease(state),
        leaseCommentId);
      lastHeartbeatAt=Date.now();
    };
    const scope={
      sessionId:x.sessionId,authSha256:x.authSha,
      callbackUrl:callback,startUtc:x.startUtc,
      baselineCredits:baseline
    };
    // Grace AFTER target 600s allows continuing recovery if owner disappears;
    // GitHub workflow has a separate 25-minute total job timeout.
    // UTC start is the earliest allowed CREATE. The 30s bounded activation
    // jitter permits a full 600s owner-controlled subscribed interval without
    // marking a normal network/BIND lag as early rescue. Total rescue grace
    // remains 300s, and this watchdog NEVER creates a subscription.
    const stopAfter=auth.start+930_000;
    let lastStatus="",haveSeenOwned=false;
    while(Date.now()<stopAfter){
      const tick=await runGate3IndependentWatchdogTickV39(scope,{
        readOwner,
        list:listSubscriptionsStrictWithRetry,
        balance:async()=>{
          const b=await getBalanceEvidenceStrict();
          return b.balance.creditsRemaining;
        },
        deleteExact:deleteSubscriptionVerifiedStrict,
        now:()=>new Date()
      });
      if(tick.status!==lastStatus){
        console.log(JSON.stringify({
          schema:tick.schema,status:tick.status,
          reason:tick.reason,
          verified_exact_subscription_absent:
            tick.verifiedExactSubscriptionAbsent,
          provider_delete_attempted:tick.providerDeleteAttempted,
          guarantees_credit_ceiling:false,
          authorizes_another_create:false
        }));
        lastStatus=tick.status;
      }
      if(tick.ownsProviderSubscription)haveSeenOwned=true;
      // GH API heartbeat failure cannot change subscription ownership. It
      // makes the paid owner's 25s lease stale and must cause it to STOP; the
      // independent sidecar itself keeps monitoring and attempting safe DELETE.
      if(Date.now()-lastHeartbeatAt>=15000){
        await heartbeat("ACTIVE").catch(()=>{
          console.error(JSON.stringify({status:"HOLD",
            reason:"GATE3_WATCHDOG_LEASE_HEARTBEAT_UNAVAILABLE"}));
        });
      }
      if(tick.status==="STOP_VERIFIED"){
        await heartbeat("STOPPED").catch(()=>undefined);
        return {status:"STOP_VERIFIED_NOT_PAID_GATE3_PASS",providerCreateCount:0};
      }
      if(tick.status==="ZERO_EXACT_SUBSCRIPTIONS"&&haveSeenOwned){
        await heartbeat("STOPPED").catch(()=>undefined);
        // Do not claim settlement. Owner may have performed its own DELETE.
        return {status:"OWNED_NOT_ACTIVE_SETTLEMENT_SEPARATE",providerCreateCount:0};
      }
      await wait(5_000);
    }
    // End only on time limit, NEVER assume no provider exposure from a timeout.
    const final=await runGate3IndependentWatchdogTickV39(scope,{
      readOwner,list:listSubscriptionsStrictWithRetry,
      balance:async()=>(await getBalanceEvidenceStrict()).balance.creditsRemaining,
      deleteExact:deleteSubscriptionVerifiedStrict,now:()=>new Date()
    });
    if(final.status==="STOP_VERIFIED"||
       final.status==="ZERO_EXACT_SUBSCRIPTIONS"){
      await heartbeat("STOPPED").catch(()=>undefined);
      return {status:"WATCH_ENDED_EXACT_ABSENCE_NOT_SETTLEMENT",providerCreateCount:0};
    }
    stop("GATE3_SIDECAR_EXPIRED_WITH_UNCONFIRMED_SUBSCRIPTION");
  }finally{await pool.end()}
}

if(import.meta.url===`file://${process.argv[1]}`){
  const a=process.argv.slice(2);
  const opts=new Map<string,string>();
  for(let i=0;i<a.length;i+=2){
    if(!a[i]?.startsWith("--")||!a[i+1]||opts.has(a[i]))
      throw Error("GATE3_SIDECAR_INVALID_OPTIONS");
    opts.set(a[i],a[i+1]);
  }
  executeGate3WatchdogSidecarV39({
    authId:opts.get("--auth-id")??"",
    authFile:opts.get("--auth-file")??"",
    authSha:opts.get("--auth-sha")??"",
    sessionId:opts.get("--session-id")??"",
    startUtc:opts.get("--start-utc")??"",
    expectedGitHead:opts.get("--head")??"",
    callbackBase:opts.get("--callback-base")??"",
    confirmed:opts.get("--confirm")??""
  }).then(res=>console.log(JSON.stringify(res)))
  .catch(e=>{
    const msg=String(e instanceof Error?e.message:"");
    const safe=/^GATE3_[A-Z0-9_]+$/.test(msg)?msg:"GATE3_SIDECAR_HOLD_UNEXPECTED";
    console.error(JSON.stringify({status:"HOLD",reason:safe,
      provider_create_count:0,automatic_retry:false}));
    process.exitCode=2;
  });
}
