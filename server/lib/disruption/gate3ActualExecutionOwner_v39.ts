/**
 * Gate3 ACTUAL execution-owner composition for existing prepaid runtime.
 *
 * Source-level paid seal currently FALSE, with no ENV/CLI boolean bypass:
 * BEFORE provider, DB or webhook IO. The pre-exposure source owner must not
 * reserve a new PREPARED session when this path is still unavailable.
 *
 * The exact plan is derived from one already-approved AUTH/session + observed
 * provider balance (in process only); no second Phase2 session may be armed.
 * Failed real windows -> immutable FAILED SQL. "Successful" windows remain
 * on HOLD until independently authenticated original SHA / signed callback
 * source and published receiver proof exist. No caller-provided success flags.
 */
import {sha256HexString} from "./authRecord_v39";
import type {Pool} from "pg";
import type {SettlementConfig} from "./settlement_v3";
import {
  GATE3_PROVIDER_EXPOSURE_RELEASED_V39,
  runPrepaidLiveWindowV39,
  type PrepaidLiveWindowInputV39,
  type PrepaidLiveWindowResultV39,
} from "./prepaidProbeWindow_v39";
import {
  commitGate3TerminalDispositionV39,
  type Gate3TerminalOwnerReceiptV39,
} from "./gate3CanaryTerminalOwner_v39";
import type {Gate3OwnedPreExposureEvidenceV39}
  from "./gate3OwnedPreExposure_v39";

export type Gate3ActualOwnerInputV39=Readonly<{
  prepared:Gate3OwnedPreExposureEvidenceV39;
  authArtifactRaw:string;
  expectedAuthId:string;
  expectedAirportFilterWindow:string;
  deletionRunId:string;
  settlement:SettlementConfig;
  externalStopCheck:()=>Promise<string|null>;
}>;
export type Gate3ActualOwnerOutcomeV39=Readonly<{
  schema:"v39.phase3.gate3.actual-owner-outcome.v1";
  status:"FAILED_DURABLY_RECORDED"|"HOLD_SUCCESS_REQUIRES_SOURCE_AUTHENTICITY";
  sessionId:string;
  liveGate3Certified:false;
  authorizesAnotherPaidRun:false;
  terminalReceipt?:Gate3TerminalOwnerReceiptV39;
}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTH=/^AUTH-\d{8}-[A-Z0-9]+$/;
const windowRegex=/^([A-Z]{4})\/departures\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\+(\d+)s$/;

/** Provider-free exact handoff into the ACTUAL, existing prepaid owner. */
export function buildGate3ExactPaidWindowV39(
  input:Gate3ActualOwnerInputV39,
):PrepaidLiveWindowInputV39{
  const p=input?.prepared;
  const raw=input?.authArtifactRaw;
  if(!p||p.state!=="PREPARED"||p.runtimeState!=="armed"||
     p.status!=="SOURCE_PREPARED_LEDGER_MATCH_NOT_PAID_AUTH"||
     p.independentLedgerHashMatched!==true||
     !UUID.test(p.sessionId)||
     !/^[A-Z]{4}$/.test(p.icao)||
     !Number.isSafeInteger(p.canaryCreditCeiling)||
     p.canaryCreditCeiling<1||p.canaryCreditCeiling>100||
     !Number.isSafeInteger(p.fixedExposureSeconds)||
     p.fixedExposureSeconds<1||p.fixedExposureSeconds>3600||
     typeof raw!=="string"||!AUTH.test(input.expectedAuthId)||
     sha256HexString(raw)!==p.authArtifactSha256||
     !Number.isSafeInteger(p.balanceBeforeInMemory)||
     p.balanceBeforeInMemory<1500||
     p.balanceBeforeInMemory-p.canaryCreditCeiling<1000||
     !input.deletionRunId?.trim()||
     typeof input.externalStopCheck!=="function"||
     !input.settlement||
     !Number.isFinite(input.settlement.timeoutSeconds)||
     input.settlement.timeoutSeconds<=0||
     !Number.isSafeInteger(input.settlement.stableReadCount)||
     input.settlement.stableReadCount<3||
     !Number.isFinite(input.settlement.pollIntervalSeconds)||
     input.settlement.pollIntervalSeconds<=0||
     !Number.isFinite(input.settlement.initialWaitSeconds)||
     input.settlement.initialWaitSeconds<0||
     input.settlement.timeoutSeconds<=input.settlement.initialWaitSeconds)
    throw Error("GATE3_OWNER_EXACT_PREPARED_WINDOW_AND_SETTLEMENT_REQUIRED");
  let parsed:Record<string,unknown>;
  try{parsed=JSON.parse(raw) as Record<string,unknown>;}
  catch{throw Error("GATE3_OWNER_AUTH_ARTIFACT_INVALID_HOLD");}
  const m=windowRegex.exec(input.expectedAirportFilterWindow);
  if(parsed.authorizationId!==input.expectedAuthId||
     parsed.phaseGate!=="Phase 3 / Gate 3"||
     parsed.airportFilterWindow!==input.expectedAirportFilterWindow||
     parsed.maxAlertCredits!==p.canaryCreditCeiling||
     !m||m[1]!==p.icao||
     Number(m[2])!==p.fixedExposureSeconds)
    throw Error("GATE3_OWNER_AUTH_OR_PREARMED_SESSION_SCOPE_MISMATCH");
  return {
    ownerKind:"phase3_credit_canary",
    prearmedGate3:{
      sessionId:p.sessionId,icao:p.icao,
      fixedExposureSeconds:p.fixedExposureSeconds,
      canaryCreditCeiling:p.canaryCreditCeiling,
      authorizationEvidenceSha256:p.authArtifactSha256,
      authArtifactRaw:raw,expectedAuthId:input.expectedAuthId,
      expectedAirportFilterWindow:input.expectedAirportFilterWindow,
    },
    ownerProbeId:null,stage:null,icao:p.icao,
    targetHours:p.fixedExposureSeconds/3600,
    hardCapCredits:p.canaryCreditCeiling,
    balanceBefore:p.balanceBeforeInMemory,
    settledOtherCredits:0,
    deletionRunId:input.deletionRunId,
    settlement:input.settlement,
    watchdogPollMs:5000,
    externalStopCheck:input.externalStopCheck,
    deferCleanup:true,
  };
}

/** Authenticate neither provider nor source from a fabricated bool. */
export async function recordGate3ActualWindowOutcomeV39(
  pool:Pick<Pool,"connect">,
  plan:PrepaidLiveWindowInputV39,
  result:PrepaidLiveWindowResultV39,
):Promise<Gate3ActualOwnerOutcomeV39>{
  const p=plan.prearmedGate3;
  if(plan.ownerKind!=="phase3_credit_canary"||!p||
     result.runtimeSessionId!==p.sessionId)
    throw Error("GATE3_OWNER_RESULT_SESSION_MISMATCH_HOLD");
  // A return status of completed/settling and caller-supplied source booleans
  // can never independently prove signed source and Blob SHA. Preserve
  // PREPARED for a separate reviewed source evidence/terminal decision.
  if(result.status!=="failed")
    return {
      schema:"v39.phase3.gate3.actual-owner-outcome.v1",
      status:"HOLD_SUCCESS_REQUIRES_SOURCE_AUTHENTICITY",
      sessionId:p.sessionId,liveGate3Certified:false,
      authorizesAnotherPaidRun:false,
    };
  const receipt=await commitGate3TerminalDispositionV39(pool,{
    sessionId:p.sessionId,icao:p.icao,
    authorizationEvidenceSha256:p.authorizationEvidenceSha256,
    canaryCreditCeiling:p.canaryCreditCeiling,
    fixedExposureSeconds:p.fixedExposureSeconds,
    sourceReadbackVerified:false,publishedReceiverParityVerified:false,
    foreignActiveBillableCount:0,
    result,
  });
  if(receipt.disposition!=="FAILED_DURABLY_RECORDED")
    throw Error("GATE3_OWNER_FAILURE_DISPOSITION_MISMATCH_HOLD");
  return {
    schema:"v39.phase3.gate3.actual-owner-outcome.v1",
    status:"FAILED_DURABLY_RECORDED",sessionId:p.sessionId,
    liveGate3Certified:false,authorizesAnotherPaidRun:false,
    terminalReceipt:receipt,
  };
}

/**
 * This is the assembled REAL owner call path (not a test fixture), but
 * remains sealed by an invariant source constant. We check it BEFORE any
 * session- or provider-side operation, to avoid orphaning PREPARED rows.
 * A later reviewed paid release must authenticate actual source custody and
 * operator authority before changing BOTH this seal and the runner seal.
 */
export async function executeGate3ActualWindowV39(
  pool:Pick<Pool,"connect">,input:Gate3ActualOwnerInputV39,
):Promise<Gate3ActualOwnerOutcomeV39>{
  if(!GATE3_PROVIDER_EXPOSURE_RELEASED_V39)
    throw Error("GATE3_OWNER_PAID_PATH_NOT_RELEASED_BEFORE_ANY_IO");
  const plan=buildGate3ExactPaidWindowV39(input);
  const result=await runPrepaidLiveWindowV39(plan);
  return recordGate3ActualWindowOutcomeV39(pool,plan,result);
}
