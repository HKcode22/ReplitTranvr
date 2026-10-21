/**
 * Gate05 DRAFT / UNDEPLOYED: bounded EXPIRED-STOP recovery core.
 * NO executable process, scheduler, LOGIN provisioning, provider calls,
 * production DB access, or human authorization is created by this module.
 *
 * A signed AUTH preview binds the scope and deadline; the independently
 * provisioned STOP identity/process, external trust root and alert delivery
 * STILL require separate evidence. STOP retries are only safe because the
 * database's terminal STOP function is idempotent for the same scope.
 *
 * Critical: retries are NOT an uptime guarantee. The future runtime must
 * impose PG connection/statement timeouts, independently supervise this
 * process, attest alert delivery, and independently re-read the receipt.
 */
import type {Pool} from "pg";
import {
  previewGate05SignedExpiryGuardPlanV39
} from "./gate05SignedExpiryGuardPlan_v39";
import {
  runGate05ExpiryGuardV39,
  stopGate05IndependentlyV39
} from "./gate05ScopedFidsStop_v39";

type SignedInput=Parameters<typeof previewGate05SignedExpiryGuardPlanV39>[0];

export interface Gate05UnconfirmedStopIncidentV39 {
  schema:"v39.gate05.unconfirmed-stop-incident.v1";
  status:"STOP_UNCONFIRMED_OPERATOR_ESCALATION_REQUIRED";
  scopeId:string;
  authorizationSha256:string;
  attemptedStops:number;
  reason:"EXPIRED";
  noDurableStopReceiptVerified:true;
  humanInterventionRequired:true;
  paidPilotAuthorized:false;
  providerRequests:0;
}

function permanentFailure(error:unknown):boolean {
  if(!error||typeof error!=="object")return false;
  const value=error as {message?:unknown;code?:unknown};
  // Accounting/receipt shape or privilege errors require investigation,
  // not retrying until a potentially forged receipt happens to look valid.
  if(typeof value.message==="string"&&
     /^GATE05_STOP_(?:DURABLE_RECEIPT|ACCOUNTING|SCOPE_OR_REASON)_HOLD$/.test(value.message))
    return true;
  return typeof value.code==="string"&&
    ["42501","28P01","28000","42P01","42883"].includes(value.code);
}

export async function rehearseGate05BoundedExpiryStopRecoveryV39(args:{
  signedAuthorization:SignedInput;
  db:Pick<Pool,"query">;
  /**
   * REQUIRED escalation sink injected by future owner-controlled service.
   * This helper cannot prove that alerts are actually delivered or seen.
   */
  onUnconfirmedStop:(incident:Gate05UnconfirmedStopIncidentV39)=>Promise<void>|void;
  nowMs?:()=>number;
  sleepMs?:(ms:number)=>Promise<void>;
}){
  if(!args||typeof args.onUnconfirmedStop!=="function"||
     !args.db||typeof args.db.query!=="function")
    throw Error("GATE05_STOP_RECOVERY_INPUT_HOLD");
  const signed=previewGate05SignedExpiryGuardPlanV39(args.signedAuthorization);
  const sleep=args.sleepMs??((ms:number)=>new Promise<void>(r=>setTimeout(r,ms)));
  let attemptedStops=0;
  let lastError:unknown;
  const maxStopAttempts=3;
  const now=args.nowMs??Date.now;
  const expiryMs=Date.parse(signed.expiresAtUtc);
  // Count real SQL STOP invocations, not merely expiry-guard calls.
  const countedDb={
    query:(sql:string,params:unknown[])=>{
      attemptedStops++;
      return args.db.query(sql,params);
    }
  } as unknown as Pick<Pool,"query">;
  for(let n=1;n<=maxStopAttempts;n++){
    try{
      // First attempt waits for the signed expiry and runs the SQL STOP.
      // Thereafter, only an expired, once-failed STOP is re-attempted.
      // Do NOT silently restart the full wait after a socket failure.
      // A sleeper error before expiry must NEVER trigger a premature
      // EXPIRED STOP on retry. The signed deadline is authoritative input.
      if(n>1){
        const current=now();
        if(!Number.isSafeInteger(current)||current<expiryMs)
          throw Error("GATE05_STOP_RECOVERY_TIME_HOLD");
      }
      const receipt=n===1?
        await runGate05ExpiryGuardV39({
          db:countedDb,scopeId:signed.scopeId,
          expiresAtUtc:signed.expiresAtUtc,
          nowMs:args.nowMs,sleepMs:args.sleepMs
        }):
        await stopGate05IndependentlyV39({
          db:countedDb,scopeId:signed.scopeId,reason:"EXPIRED"
        });
      return {
        schema:"v39.gate05.expiry-stop-recovery-rehearsal.v1" as const,
        status:"DURABLE_STOP_RECEIPT_RETURNED_NO_SUPERVISOR_PROOF" as const,
        scopeId:signed.scopeId,
        authorizationSha256:signed.reviewedAuthorizationSha256,
        attemptedStops,
        receipt,
        independentlyDeployed:false as const,
        supervisorUptimeAttested:false as const,
        productionRoleAuthenticated:false as const,
        ownerSignerAttested:false as const,
        providerRequests:0 as const,
        paidPilotAuthorized:false as const
      };
    }catch(error){
      lastError=error;
      // Errors before the first STOP attempt (invalid clock, bogus deadline,
      // bounded wait) cannot justify calling STOP without expiry evidence.
      const msg=error instanceof Error?error.message:"";
      if(/^GATE05_(?:EXPIRY_GUARD_|STOP_RECOVERY_TIME_HOLD)/.test(msg)||
         permanentFailure(error))break;
      if(n<maxStopAttempts){
        // A retry delay is bounded. Real deployment must impose SQL timeout
        // and an independently supervised alert/restart policy.
        try{await sleep(5000);}
        catch(sleepError){lastError=sleepError;break;}
      }
    }
  }
  const incident:Gate05UnconfirmedStopIncidentV39={
    schema:"v39.gate05.unconfirmed-stop-incident.v1",
    status:"STOP_UNCONFIRMED_OPERATOR_ESCALATION_REQUIRED",
    scopeId:signed.scopeId,
    authorizationSha256:signed.reviewedAuthorizationSha256,
    attemptedStops,reason:"EXPIRED",
    noDurableStopReceiptVerified:true,
    humanInterventionRequired:true,
    paidPilotAuthorized:false,providerRequests:0
  };
  // Never hide uncertainty as STOPPED. Notification delivery isn't proven.
  try{await args.onUnconfirmedStop(incident);}
  catch{/* still fail closed if even the escalation transport fails */}
  throw new Error("GATE05_STOP_UNCONFIRMED_ESCALATE",{
    cause:lastError
  });
}
