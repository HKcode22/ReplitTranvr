/**
 * Gate3 ONLY — prospective single WSSS canary owner. Production executable
 * is SEALED pending a separately reviewed exact paid-source release.
 *
 * NO paid CREATE, session reservation, or even provider GET is possible while
 * GATE3_PROVIDER_EXPOSURE_RELEASED_V39=false. Never use legacy credit_canary.
 *
 * The provider API has no server-side maximum-credit subscription parameter.
 * A local 5s watchdog and independent safety owner can REDUCE exposure but
 * cannot enforce a provider-side 50-credit hard cap. The user explicitly
 * authorized a 50-credit SOFT stopping target with possible overrun, not an
 * unlimited subscription. Launch remains separately sealed until the actual
 * independent watchdog is implemented, reviewed and started.
 * Source enablement and existing AUTH hash check are necessary, NOT sufficient.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {v39Pool} from "../server/lib/disruption/db_v39";
import {GATE3_PROVIDER_EXPOSURE_RELEASED_V39} from
  "../server/lib/disruption/prepaidProbeWindow_v39";
import {prepareGate3AfterLiveReadOnlyEvidenceV39} from
  "../server/lib/disruption/gate3OwnedPreExposure_v39";
import {executeGate3ActualWindowV39} from
  "../server/lib/disruption/gate3ActualExecutionOwner_v39";
import {deleteSubscriptionVerifiedStrict} from
  "../server/lib/disruption/aerodataboxLimiter_v3";

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
export const GATE3_INDEPENDENT_WATCHDOG_RELEASED_V39=false;
export async function executeOneWsssGate3OperatorV39(argv:readonly string[]):Promise<Readonly<{
  status:string;sessionId:string|null;paidCanaryCertified:false;
  anotherRunAuthorized:false;
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
  let sourceTree:string,headTree:string;
  try{
    const git=(...a:string[])=>execFileSync("git",a,{encoding:"utf8"}).trim();
    sourceTree=git("rev-parse","HEAD^{tree}");
    headTree=git("rev-parse",`${args.head}^{tree}`);
  }catch{stop("GATE3_OPERATOR_SOURCE_TREE_UNAVAILABLE")}
  if(sourceTree!==headTree)stop("GATE3_OPERATOR_UNREVIEWED_SOURCE_TREE_HOLD");

  const raw=readFileSync(args.authFile,"utf8");
  let requestedStop:string|null=null;
  process.once("SIGINT",()=>{requestedStop="operator_SIGINT"});
  process.once("SIGTERM",()=>{requestedStop="operator_SIGTERM"});

  const input={
    authArtifactRaw:raw,expectedAuthId:args.authId,
    expectedAirportFilterWindow:args.airportFilterWindow,
    icao:args.icao,canaryCreditCeiling:args.credits,
    fixedExposureSeconds:args.seconds,
    expectedPublishedGitHead:args.head,
  };
  // Reads provider strictly and PREPARES the one UUID (mutating SQL) only
  // after all source and AUTH validations. Never retries ambiguous commits.
  const prepared=await prepareGate3AfterLiveReadOnlyEvidenceV39(v39Pool,input);
  const externalStopCheck=async():Promise<string|null>=>{
    if(requestedStop)return requestedStop;
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
      externalStopCheck
    });
    return {status:outcome.status,sessionId:prepared.sessionId,
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
