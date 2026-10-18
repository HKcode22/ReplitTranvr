/**
 * Independent GitHub Actions safety lease must NOT advertise ACTIVE when
 * actual separate provider/SQL watchdog inspection returned HOLD.
 * Once a watchdog loses authority to attest, it cannot re-arm within the
 * same job/session merely because a later poll looks healthy.
 *
 * This is deliberately independent from the 6+6 callback-health policy:
 * transient callback HTTP failures have bounded tolerance, but blind
 * independent provider/ownership oversight never grants paid permission.
 */
import type {Gate3WatchdogTickResultV39} from
  "./gate3IndependentWatchdogTick_v39";
export type Gate3IndependentLeaseDecisionV39=Readonly<{
  revoked:boolean;
  status:"ACTIVE"|"STOPPED";
  reason:"INDEPENDENT_MONITOR_VALID"|"INDEPENDENT_PROOF_LOST_LATCHED";
}>;
export function decideGate3IndependentLeaseAfterTickV39(
  previouslyRevoked:boolean,
  tickStatus:Gate3WatchdogTickResultV39["status"],
  otherBillablePresent:boolean|null,
):Gate3IndependentLeaseDecisionV39{
  if(typeof previouslyRevoked!=="boolean"||
    !(otherBillablePresent===null||typeof otherBillablePresent==="boolean")||
    !["HOLD","MONITOR","ZERO_EXACT_SUBSCRIPTIONS","STOP_VERIFIED"].includes(tickStatus))
    throw Error("GATE3_INDEPENDENT_LEASE_TICK_INVALID_HOLD");
  const revoked=previouslyRevoked||otherBillablePresent===true||
    tickStatus==="HOLD"||tickStatus==="STOP_VERIFIED";
  return revoked?
    {revoked:true,status:"STOPPED",reason:"INDEPENDENT_PROOF_LOST_LATCHED"}:
    {revoked:false,status:"ACTIVE",reason:"INDEPENDENT_MONITOR_VALID"};
}
