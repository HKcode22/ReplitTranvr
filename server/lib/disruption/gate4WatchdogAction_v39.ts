/**
 * Gate4 watchdog response to a SEND-budget decision.
 * This is used by the actual V3.9 watchdog and takes injected dependencies
 * so failure handling can be exercised without a billable provider/DB.
 *
 * STOP_ATTEMPT_RETURNED is NOT a remotely verified provider deletion:
 * post-STOP account/subscription/SQL readback and an independent supervisor
 * remain mandatory for an actual Gate4 certificate.
 */
import type {Gate4SpendDecisionV39} from "./gate4SendAwareDecision_v39";

export interface Gate4StopObservedV39 {
  batchId: string;
  status: string;
}
export interface Gate4ActionDependenciesV39 {
  expectedBatchId: string;
  writeIncident: (reason:string) => Promise<void>;
  stopOwned: (reason:string) => Promise<Gate4StopObservedV39|null>;
  proceed: () => Promise<void>;
}
export interface Gate4ActionResultV39 {
  status: "CONTINUED"|"STOP_ATTEMPT_RETURNED"|"STOP_UNCONFIRMED";
  action: Gate4SpendDecisionV39["action"];
  reason: string;
  incidentRecorded: boolean|null;
  providerRequestsByHelper: 0;
  independentTerminalStopVerified: false;
}
export async function executeGate4SafetyActionV39(
  decision:Gate4SpendDecisionV39,
  deps:Gate4ActionDependenciesV39
):Promise<Gate4ActionResultV39> {
  if(!deps || !deps.expectedBatchId ||
     !/^[a-zA-Z0-9_.-]{1,128}$/.test(deps.expectedBatchId))
    throw Error("GATE4_ACTION_UNSAFE_BATCH_ID");
  if(!decision || !["CONTINUE","STOP","HOLD_STOP"].includes(decision.action))
    throw Error("GATE4_ACTION_INVALID_DECISION");
  const base={action:decision.action, reason:decision.reason,
    providerRequestsByHelper:0 as const,
    independentTerminalStopVerified:false as const};
  if(decision.action==="CONTINUE"){
    await deps.proceed();
    return {status:"CONTINUED",incidentRecorded:null,...base};
  }
  let incidentRecorded:null|boolean=null;
  if(decision.action==="HOLD_STOP"){
    try {
      await deps.writeIncident(decision.reason);
      incidentRecorded=true;
    } catch {
      incidentRecorded=false;
      // Even if the durable incident cannot be recorded, STOP must be tried.
    }
  }
  try {
    const stopped=await deps.stopOwned("gate4_"+decision.reason);
    if(stopped?.status!=="CLOSED"||stopped.batchId!==deps.expectedBatchId)
      return {status:"STOP_UNCONFIRMED",incidentRecorded,...base};
    return {status:"STOP_ATTEMPT_RETURNED",incidentRecorded,...base};
  } catch {
    return {status:"STOP_UNCONFIRMED",incidentRecorded,...base};
  }
}
