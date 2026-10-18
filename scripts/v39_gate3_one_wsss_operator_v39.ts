/**
 * Gate3 ONLY — prospective single WSSS canary owner. Production executable
 * is SOURCE-RELEASED for a separately reviewed exact paid run only.
 *
 * No paid CREATE is permitted without an exact ledger-pinned AUTH, published
 * source parity, real clean provider inventory, and authenticated watchdog. Never use legacy credit_canary.
 *
 * The provider API has no server-side maximum-credit subscription parameter.
 * A local 5s watchdog and independent safety owner can REDUCE exposure but
 * cannot enforce a provider-side 50-credit hard cap. The user explicitly
 * authorized a 50-credit SOFT stopping target with possible overrun, not an
 * unlimited subscription. Launch still fails closed until the independent GitHub watchdog is
 * genuinely running with a fresh exact-match lease.
 * Source enablement and existing AUTH hash check are necessary, NOT sufficient.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {Pool} from "pg";
import {execFileSync} from "node:child_process";
import {v39Pool} from "../server/lib/disruption/db_v39";
import {readGate3PrecreateContinuityV39} from
  "../server/lib/disruption/gate3PrecreateContinuity_v39";
import {terminateUnpaidGate3PrecreateRealV39} from
  "../server/lib/disruption/gate3UnpaidPrecreateAbort_v39";
import {performance} from "node:perf_hooks";
import {
  GATE3_CALLBACK_POLL_MS_V39,GATE3_CALLBACK_MAX_CHECKS_V39,
  GATE3_CALLBACK_WALL_MS_V39,GATE3_CALLBACK_POLICY_V39,
  checkGate3PublishedCallbackHealthV39,
  advanceGate3CallbackHealthV39,
  initialGate3CallbackHealthStateV39,
} from "../server/lib/disruption/gate3CallbackSixPlusSix_v39";
import {autoArmGate3WatchdogV39} from
  "../server/lib/disruption/gate3WatchdogAutoArm_v39";
import {GATE3_PROVIDER_EXPOSURE_RELEASED_V39} from
  "../server/lib/disruption/prepaidProbeWindow_v39";
import {prepareGate3AfterLiveReadOnlyEvidenceV39} from
  "../server/lib/disruption/gate3OwnedPreExposure_v39";
import {executeGate3ActualWindowV39} from
  "../server/lib/disruption/gate3ActualExecutionOwner_v39";
import {deleteSubscriptionVerifiedStrict} from
  "../server/lib/disruption/aerodataboxLimiter_v3";
import {reviewGate3CurrentProviderAccountV39} from
  "../server/lib/disruption/gate3OwnedPreExposure_v39";
import {verifyGate3WatchdogLiveLeaseFromGitHubV39} from
  "../server/lib/disruption/gate3WatchdogLiveLease_v39";
import {
  assertGate3TwoStagePreparationTimingV39,
  awaitGate3LiveWatchdogAndStartV39,
  assertGate3BeforeCreateUtcV39,
} from "../server/lib/disruption/gate3TwoStageWatchdogAdmission_v39";

const REVIEWED=/^[0-9a-f]{40}$/;
export const GATE3_OPERATOR_ONE_CANARY_SCOPE_V39=Object.freeze({
  icao:"WSSS",seconds:600,ceiling:50,maxPaidCreates:1
});
const FLAGS=["--auth-id","--auth-file","--window","--icao",
  "--credits","--seconds","--expected-published-head"] as const;
export type Gate3OperatorArgsV39=Readonly<{
  authId:string;authFile:string;airportFilterWindow:string;
  icao:string;credits:number;seconds:number;head:string;
}>;
export function parseGate3OperatorArgsV39(argv:readonly string[]):Gate3OperatorArgsV39{
  if(argv.length!==FLAGS.length*2)throw Error("GATE3_CLI_SEVEN_EXACT_OPTIONS_REQUIRED");
  const m=new Map<string,string>();
  for(let i=0;i<argv.length;i+=2){
    const k=argv[i],v=argv[i+1];
    if(!(FLAGS as readonly string[]).includes(k)||m.has(k)||
       !v||v.startsWith("--"))throw Error("GATE3_CLI_INVALID_OPTION");
    m.set(k,v);
  }
  if(m.size!==FLAGS.length)throw Error("GATE3_CLI_MISSING_OPTION");
  const authId=m.get("--auth-id")!,authFile=m.get("--auth-file")!,
    airportFilterWindow=m.get("--window")!,icao=m.get("--icao")!,
    credits=Number(m.get("--credits")),seconds=Number(m.get("--seconds")),
    head=m.get("--expected-published-head")!;
  if(!/^AUTH-\d{8}-[A-Z0-9]+$/.test(authId)||authFile.trim()!==authFile||
     !authFile||authFile.startsWith("-")||
     icao!==GATE3_OPERATOR_ONE_CANARY_SCOPE_V39.icao||
     seconds!==GATE3_OPERATOR_ONE_CANARY_SCOPE_V39.seconds||
     credits!==GATE3_OPERATOR_ONE_CANARY_SCOPE_V39.ceiling||
     !REVIEWED.test(head)||
     !/^WSSS\/departures\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\+600s$/.test(airportFilterWindow))
    throw Error("GATE3_CLI_WSSS_600S_50C_EXACT_SCOPE_REQUIRED");
  return {authId,authFile,airportFilterWindow,icao,credits,seconds,head};
}

function stop(code:string):never {throw Error(code)}
/**
 * Not executable until a reviewed independent process can observe/DELETE the
 * exact owned subscription. The 50-credit value remains a SOFT stop threshold
 * and an overrun may still FAIL exact <=50 Gate3 scoreability.
 */
export const GATE3_INDEPENDENT_WATCHDOG_RELEASED_V39=true;
export async function executeOneWsssGate3OperatorV39(argv:readonly string[]):Promise<Readonly<{
  status:string;sessionId:string|null;paidCanaryCertified:false;
  anotherRunAuthorized:false;
  callbackWatchdogPolicy?:"six-plus-six";
  callbackHealthAuditPending?:boolean;
}>>{
  // ZERO I/O when source seal is CLOSED.
  if(!GATE3_PROVIDER_EXPOSURE_RELEASED_V39)
    stop("GATE3_OPERATOR_SOURCE_SEAL_CLOSED_BEFORE_IO");
  // User accepted possible overrun, but one isolated watchdog PROCESS must be
  // running and reviewed first. This source-level stop is NOT an ENV override.
  if(!GATE3_INDEPENDENT_WATCHDOG_RELEASED_V39)
    stop("GATE3_OPERATOR_INDEPENDENT_WATCHDOG_NOT_RELEASED_HOLD");

  // Even after watchdog release, full human AUTH/source and session checks
  // remain mandatory; no extra subscription or retry is permitted.
  const args=parseGate3OperatorArgsV39(argv);
  if(process.env.V39_DATABASE_TARGET_CONFIRM!=="production"||
     !process.env.V39_DATABASE_RUNTIME_URL||
     !process.env.AERODATABOX_API_KEY)
    stop("GATE3_OPERATOR_ENVIRONMENT_NOT_READY");
  // Two GitHub REST reads every 5s for up to ~18min exceed the public
  // unauthenticated 60-request/hour limit. Require a real token BEFORE
  // creating a durable PREPARED row, not after a paid run has begun.
  // Read the already-authenticated gh token privately if an environment
  // token was not explicitly provided. Never echo or persist credentials.
  if(![process.env.GITHUB_TOKEN,process.env.GH_TOKEN]
      .some(v=>typeof v==="string"&&v.trim().length>=10)){
    try{
      const t=execFileSync("gh",["auth","token"],{encoding:"utf8",
        timeout:6000,stdio:["ignore","pipe","pipe"]}).trim();
      if(t.length>=10)process.env.GH_TOKEN=t;
    }catch{}
  }
  if(![process.env.GITHUB_TOKEN,process.env.GH_TOKEN]
      .some(v=>typeof v==="string"&&v.trim().length>=10))
    stop("GATE3_OPERATOR_AUTHENTICATED_GITHUB_API_REQUIRED");
  let sourceTree:string,headTree:string;
  try{
    const git=(...a:string[])=>execFileSync("git",a,{encoding:"utf8"}).trim();
    sourceTree=git("rev-parse","HEAD^{tree}");
    headTree=git("rev-parse",`${args.head}^{tree}`);
  }catch{stop("GATE3_OPERATOR_SOURCE_TREE_UNAVAILABLE")}
  if(sourceTree!==headTree)stop("GATE3_OPERATOR_UNREVIEWED_SOURCE_TREE_HOLD");

  const raw=readFileSync(args.authFile,"utf8");
  let requestedStop:string|null=null;
  const signalStop=(code:string):void=>{requestedStop=code};
  process.once("SIGINT",()=>signalStop("operator_SIGINT"));
  process.once("SIGTERM",()=>signalStop("operator_SIGTERM"));

  const input={
    authArtifactRaw:raw,expectedAuthId:args.authId,
    expectedAirportFilterWindow:args.airportFilterWindow,
    icao:args.icao,canaryCreditCeiling:args.credits,
    fixedExposureSeconds:args.seconds,
    expectedPublishedGitHead:args.head,
  };
  // Stage A: source-only (not provider CREATE) reservation. Require a bounded
  // 3-8 minute lead so a cold GitHub Actions runner has startup time AND
  // remains alive for the full 600s window + 300s rescue.
  const startUtc=args.airportFilterWindow.split("/")[2].split("+")[0];
  assertGate3TwoStagePreparationTimingV39(
    startUtc,new Date(Date.now()+2_100_000).toISOString(),new Date());
  const prepared=await prepareGate3AfterLiveReadOnlyEvidenceV39(v39Pool,input);
  // All operations from this point until the paid execution owner are
  // confirmed pre-CREATE. Recover an UNUSED source only after two fresh,
  // identical, clean provider inventories and an immutable SQL readback.
  // A failed/unknown COMMIT during initial preparation has NO trustworthy
  // sessionId here and deliberately remains manual-recovery HOLD.
  const abortBeforePaidExecution=async():Promise<never>=>{
    try{
      const digest=await terminateUnpaidGate3PrecreateRealV39(v39Pool,{
        sessionId:prepared.sessionId,icao:"WSSS",
        authSha256:prepared.authArtifactSha256,
        credits:50,seconds:600,startUtc,
        baselineCredits:prepared.balanceBeforeInMemory
      });
      console.log(JSON.stringify({
        status:"GATE3_UNPAID_PRECREATE_DURABLY_ABORTED",
        session_id:prepared.sessionId,evidence_sha256:digest,
        provider_create_by_this_owner:0,another_run_authorized:false
      }));
    }catch{
      stop("GATE3_OPERATOR_PRECREATE_ABORT_UNRECONCILED_HOLD");
    }
    stop("GATE3_OPERATOR_PRECREATE_ABORTED_NO_CREATE");
  };
  try{
    assertGate3TwoStagePreparationTimingV39(
      startUtc,prepared.sessionExpiresAtUtc,new Date());
  }catch{
    return await abortBeforePaidExecution();
  }

  // Keep a read-only Neon connection active and demand stable postmaster
  // identity and the same original UNLOGGED armed source. Initialization
  // itself can fail AFTER PREPARED: route that through exact unused recovery.
  let witnessPool:Pool;
  try{
    witnessPool=new Pool({
      connectionString:process.env.V39_DATABASE_RUNTIME_URL,
      max:1,connectionTimeoutMillis:5000,query_timeout:7000,
      options:"-c default_transaction_read_only=on -c statement_timeout=6000",
    });
  }catch{
    return await abortBeforePaidExecution();
  }
  let monitorFault:string|null=null;
  let monitorInFlight:Promise<void>|null=null;
  let monitorTimer:ReturnType<typeof setInterval>|null=null;
  try{
    let epoch:Awaited<ReturnType<typeof readGate3PrecreateContinuityV39>>;
    try{
      epoch=await readGate3PrecreateContinuityV39(
        witnessPool,prepared.sessionId,null);
    }catch{
      return await abortBeforePaidExecution();
    }
    const verifyContinuity=async():Promise<void>=>{
      if(monitorFault)stop(monitorFault);
      if(requestedStop)stop("GATE3_OPERATOR_STOP_REQUESTED_BEFORE_CREATE");
      await readGate3PrecreateContinuityV39(
        witnessPool,prepared.sessionId,epoch);
    };
    const heartbeat=():void=>{
      if(monitorFault||monitorInFlight!==null)return;
      monitorInFlight=verifyContinuity().catch(()=>{
        monitorFault="GATE3_OPERATOR_PRECREATE_CONTINUITY_LOST_HOLD";
        signalStop("gate3_precreate_continuity_lost");
      }).finally(()=>{monitorInFlight=null});
    };
    monitorTimer=setInterval(heartbeat,10_000);

  // SINGLE-PROCESS, NONINTERACTIVE handoff. Independent GitHub Actions
  // watchdog still verifies the session and posts its own authenticated
  // fresh bot lease. Neither RUN_ID nor COMMENT_ID is user input.
  console.log(JSON.stringify({
    schema:"v39.gate3.two-stage-owner-prepared.v1",status:"PREPARED_NO_CREATE",
    session_id:prepared.sessionId,auth_sha256:prepared.authArtifactSha256,
    expected_head:args.head,start_utc:startUtc,
    independent_watchdog_required:true,provider_created:false
  }));
  // Everything below remains strictly PRE-PROVIDER until the boundary
  // before executeGate3ActualWindowV39. A watchdog failure, stale lease,
  // owner STOP, or account drift can therefore be closed safely, provided
  // two fresh provider inventories and the exact UNUSED source still match.
  // An ambiguous account/source must stay PREPARED for human reconciliation.
  let scope:Awaited<ReturnType<typeof autoArmGate3WatchdogV39>>;
  try{
    await verifyContinuity();
    scope=await autoArmGate3WatchdogV39({
      sessionId:prepared.sessionId,
      authId:args.authId,authFile:args.authFile,
      authSha256:prepared.authArtifactSha256,
      startUtc,expectedGitHead:args.head
    },undefined,()=>requestedStop!==null);
    await verifyContinuity();
    // Verify the same four endpoint/secret/DB callback contracts as P2G
    // before entering the paid source window. This is a ZERO provider
    // CREATE/DELETE check and is covered by guarded unpaid closeout.
    const callbackPreflight=await checkGate3PublishedCallbackHealthV39(args.head);
    if(!callbackPreflight.healthy)
      stop("GATE3_CALLBACK_HEALTH_PRESTART_HOLD");
    console.log(JSON.stringify({
      status:"GATE3_AUTOMATIC_INDEPENDENT_WATCHDOG_ARMED",
      session_id:prepared.sessionId,provider_created:false,
      independent_lease_authenticated:true
    }));
    await awaitGate3LiveWatchdogAndStartV39(
      scope,prepared.balanceBeforeInMemory,{
        now:()=>new Date(),
        sleep:async(ms)=>{
          await new Promise<void>(resolve=>setTimeout(resolve,ms));
          await verifyContinuity();
        },
        verifyLease:verifyGate3WatchdogLiveLeaseFromGitHubV39,
        readCleanProviderBalance:()=>reviewGate3CurrentProviderAccountV39(50),
        shouldStop:()=>requestedStop!==null,
      });
    if(monitorTimer!==null){clearInterval(monitorTimer);monitorTimer=null;}
    if(monitorInFlight!==null)await monitorInFlight;
    await verifyContinuity();
  }catch{
    if(monitorTimer!==null){clearInterval(monitorTimer);monitorTimer=null;}
    if(monitorInFlight!==null)await monitorInFlight;
    return await abortBeforePaidExecution();
  }
  // Stage B only: retained independent GH stop and payment controls,
  // PLUS the same P2G six primary + six contingency published callback
  // health policy, sampled every 15s (180s combined wall ceiling).
  // Health recovery never asserts scientifically complete notification
  // delivery: the original source/credit evidence must still be reconciled.
  let callbackHealth=initialGate3CallbackHealthStateV39();
  let callbackStop:string|null=null;
  let callbackNextAt=performance.now();
  let callbackInflight:Promise<void>|null=null;
  const pollCallbackHealth=():void=>{
    const now=performance.now();
    if(callbackStop||callbackInflight!==null||now<callbackNextAt)return;
    callbackNextAt=now+GATE3_CALLBACK_POLL_MS_V39;
    callbackInflight=checkGate3PublishedCallbackHealthV39(args.head)
      .then(health=>{
        const decision=advanceGate3CallbackHealthV39(
          callbackHealth,health,performance.now());
        callbackHealth=decision.state;
        if(decision.action==="STOP_OWNER")
          callbackStop="gate3_six_plus_six_callback_watchdog_stop";
        if(!health.healthy||decision.phase==="RECOVERING")
          console.log(JSON.stringify({
            schema:"v39.gate3.callback-health-six-plus-six.v1",
            policy:GATE3_CALLBACK_POLICY_V39,
            interval_ms:GATE3_CALLBACK_POLL_MS_V39,
            primary_checks:6,contingency_checks:6,
            max_consecutive:GATE3_CALLBACK_MAX_CHECKS_V39,
            max_wall_ms:GATE3_CALLBACK_WALL_MS_V39,
            phase:decision.phase,action:decision.action,
            reason:decision.reason,
            consecutive_failures:decision.state.consecutiveFailures,
            scientific_audit_pending:
              decision.state.recoveredHealthAwaitingScienceAudit,
            provider_mutations_by_monitor:0
          }));
      }).catch(()=>{
        callbackStop="gate3_callback_watchdog_internal_failure";
      }).finally(()=>{callbackInflight=null;});
  };
  const externalStopCheck=async():Promise<string|null>=>{
    pollCallbackHealth();
    if(callbackStop)return callbackStop;
    if(requestedStop)return requestedStop;
    try{await verifyGate3WatchdogLiveLeaseFromGitHubV39(scope)}
    catch{return "gate3_independent_watchdog_lease_lost"}
    const q=await v39Pool.query(`
      SELECT state FROM clean.phase3_gate3_canary_owner_v39
      WHERE session_id=$1::uuid
    `,[prepared.sessionId]);
    if(q.rows.length!==1||q.rows[0].state!=="PREPARED")
      return "gate3_durable_owner_stop";
    return null;
  };
  try{
    const outcome=await executeGate3ActualWindowV39(v39Pool,{
      prepared,authArtifactRaw:raw,expectedAuthId:args.authId,
      expectedAirportFilterWindow:args.airportFilterWindow,
      expectedPublishedGitHead:args.head,
      deletionRunId:`gate3-one-${args.authId}`,
      settlement:{
        initialWaitSeconds:20,pollIntervalSeconds:15,
        stableReadCount:3,timeoutSeconds:240
      },
      externalStopCheck,
      beforeProviderCreate:async()=>{
        if(requestedStop)
          stop("GATE3_OPERATOR_STOP_REQUESTED_BEFORE_CREATE");
        assertGate3BeforeCreateUtcV39(startUtc,new Date());
        await verifyGate3WatchdogLiveLeaseFromGitHubV39(scope);
        const current=await reviewGate3CurrentProviderAccountV39(50);
        if(current!==prepared.balanceBeforeInMemory)
          stop("GATE3_OPERATOR_ACCOUNT_CHANGED_BEFORE_CREATE");
        // The final reversible gate before HTTP CREATE. A resumed Neon
        // compute with lost UNLOGGED runtime must NEVER initiate paid work.
        await verifyContinuity();
        assertGate3BeforeCreateUtcV39(startUtc,new Date());
        if(requestedStop)
          stop("GATE3_OPERATOR_STOP_REQUESTED_BEFORE_CREATE");
      }
    });
    return {status:outcome.status,sessionId:prepared.sessionId,
      callbackWatchdogPolicy:GATE3_CALLBACK_POLICY_V39,
      callbackHealthAuditPending:
        callbackHealth.recoveredHealthAwaitingScienceAudit,
      paidCanaryCertified:false,anotherRunAuthorized:false};
  }catch{
    // Compensate ONLY a provider id already durably bound to our exact new
    // session. Never delete a foreign id or re-CREATE another subscription.
    try{
      const q=await v39Pool.query(`
        SELECT provider_subscription_id
        FROM clean.prepaid_probe_session_runtime
        WHERE session_id=$1::uuid AND owner_kind='phase3_credit_canary'
      `,[prepared.sessionId]);
      if(q.rows.length===1 &&
         typeof q.rows[0].provider_subscription_id==="string" &&
         q.rows[0].provider_subscription_id.length>0)
        await deleteSubscriptionVerifiedStrict(q.rows[0].provider_subscription_id);
    }catch{/* Account recovery remains separately required, no retries. */}
    stop("GATE3_OPERATOR_OUTCOME_HOLD_EXACT_ACCOUNT_RECOVERY_REQUIRED");
  }
  }finally{
    if(monitorTimer!==null)clearInterval(monitorTimer);
    if(monitorInFlight!==null)await monitorInFlight;
    await witnessPool.end().catch(()=>undefined);
  }
}

if(import.meta.url===`file://${process.argv[1]}`){
  void executeOneWsssGate3OperatorV39(process.argv.slice(2))
    .then(x=>{console.log(JSON.stringify(x))})
    .catch(e=>{
      const code=typeof e?.message==="string"&&
        /^GATE3_[A-Z0-9_]+$/.test(e.message)
        ?e.message:"GATE3_OPERATOR_HOLD_UNEXPECTED_ERROR";
      console.error(JSON.stringify({status:"HOLD",code,
        providerCreateConfirmed:false,anotherRunAuthorized:false}));
      process.exitCode=2;
    }).finally(()=>v39Pool.end().catch(()=>undefined));
}
