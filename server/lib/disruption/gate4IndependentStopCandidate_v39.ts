/**
 * Gate4 proposed external STOP supervisor's *decision and exact-owned action*.
 * Draft/injected only: there is NO deployed process, credential, signed-ticket
 * validator, persistent subscription custody, liveness attestation, or alert.
 *
 * This module cannot CREATE a subscription or invoke Phase6. A future separate
 * safety process must independently establish immutable, signed authorization,
 * source identity, exact ID provenance and clock/liveness before supplying the
 * independently reviewed pins below. Never form pins from the untrusted ticket.
 */
import {stopGate4ExactOwnedV39,
  type Gate4ExactOwnedStopDepsV39,
  type Gate4StopResultV39} from "./gate4StandaloneSafety_v39";

export type Gate4IndependentStopTicketV39=Readonly<{
  schema:"v39.gate4.independent-stop-ticket.v1";
  sourceCommit:string;
  scopeId:string;
  authorizationSha256:string;
  subscriptionId:string|null;
  subjectType:"FlightByAirportIcao";
  subjectId:string;
  startAtUtc:string;
  stopAtUtc:string;
  controllerHeartbeatUtc:string|null;
}>;

/** Independently verified and durably pinned; never derive from ticket alone. */
export type Gate4IndependentStopPinsV39=Readonly<{
  sourceCommit:string;
  scopeId:string;
  authorizationSha256:string;
  exactOwnedSubscriptionId:string;
  subjectId:string;
}>;

export type Gate4IndependentStopDecisionV39=Readonly<{
  action:"HOLD"|"WATCH"|"STOP";
  reason:string;
  independentSupervisorArmed:false;
  paidAuthorization:false;
  liveGate4Certified:false;
}>;

const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const OWNED_ID=/^[a-zA-Z0-9_-]{6,128}$/;
const ICAO=/^[A-Z]{4}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_WINDOW_MS=40*60*1000;
const MAX_HEARTBEAT_AGE_MS=30*1000;
const MAX_FUTURE_HEARTBEAT_MS=5*1000;

function time(s:unknown):number|null{
  if(typeof s!=="string"||!UTC.test(s))return null;
  const ms=Date.parse(s);
  return Number.isFinite(ms)&&new Date(ms).toISOString()===s ? ms:null;
}
const decision=(action:Gate4IndependentStopDecisionV39["action"],reason:string):
Gate4IndependentStopDecisionV39=>({
  action,reason,independentSupervisorArmed:false,
  paidAuthorization:false,liveGate4Certified:false
});

/**
 * The only output capable of asking the injected caller to DELETE is STOP,
 * and only with independent, exact ticket/owner-ID pins. This policy by
 * itself NEVER authorizes a paid CREATE or certifies independent deployment.
 */
export function assessGate4IndependentStopCandidateV39(
  ticket:Gate4IndependentStopTicketV39,
  pins:Gate4IndependentStopPinsV39,
  nowUtc:string
):Gate4IndependentStopDecisionV39 {
  if(!ticket||!pins||ticket.schema!=="v39.gate4.independent-stop-ticket.v1"||
    !SHA40.test(ticket.sourceCommit)||!SHA40.test(pins.sourceCommit)||
    !SHA256.test(ticket.authorizationSha256)||
    !SHA256.test(pins.authorizationSha256)||
    !UUID.test(ticket.scopeId)||!UUID.test(pins.scopeId)||
    !OWNED_ID.test(ticket.subscriptionId??"")||
    !OWNED_ID.test(pins.exactOwnedSubscriptionId)||
    ticket.subjectType!=="FlightByAirportIcao"||
    !ICAO.test(ticket.subjectId)||!ICAO.test(pins.subjectId)||
    ticket.sourceCommit!==pins.sourceCommit||
    ticket.scopeId!==pins.scopeId||
    ticket.authorizationSha256!==pins.authorizationSha256||
    ticket.subscriptionId!==pins.exactOwnedSubscriptionId||
    ticket.subjectId!==pins.subjectId)
    return decision("HOLD","SIGNED_SCOPE_OR_EXACT_OWNER_PIN_UNCONFIRMED");

  const start=time(ticket.startAtUtc),stop=time(ticket.stopAtUtc);
  const now=time(nowUtc);
  if(start===null||stop===null||now===null||
     stop<=start||stop-start>MAX_WINDOW_MS)
    return decision("HOLD","WINDOW_OR_CLOCK_INVALID");

  // A valid expired ticket with a positively owned ID still requires STOP.
  if(now>=stop)return decision("STOP","SIGNED_STOP_DEADLINE_REACHED");
  if(now<start)return decision("WATCH","BEFORE_SIGNED_START");

  // During the signed window, loss of controller heartbeat mandates STOP,
  // rather than indefinite WATCH. A future-dated heartbeat also fails safe.
  const heartbeat=ticket.controllerHeartbeatUtc===null
    ? null:time(ticket.controllerHeartbeatUtc);
  if(heartbeat===null)return decision("STOP","CONTROLLER_HEARTBEAT_MISSING");
  if(heartbeat>now+MAX_FUTURE_HEARTBEAT_MS)
    return decision("STOP","CONTROLLER_CLOCK_SKEW");
  if(now-heartbeat>MAX_HEARTBEAT_AGE_MS)
    return decision("STOP","CONTROLLER_HEARTBEAT_STALE");

  return decision("WATCH","WITHIN_WINDOW_HEARTBEAT_RECENT");
}

export type Gate4IndependentStopCandidateResultV39=Readonly<{
  decision:Gate4IndependentStopDecisionV39;
  stopResult:Gate4StopResultV39|null;
  independentSupervisorArmed:false;
  creditSettlementVerified:false;
  liveGate4Certified:false;
  paidAuthorization:false;
}>;

/** Dependency-injected candidate. No static provider key, DB, process or timer. */
export async function executeGate4IndependentStopCandidateV39(
  ticket:Gate4IndependentStopTicketV39,
  pins:Gate4IndependentStopPinsV39,
  nowUtc:string,
  deps:Gate4ExactOwnedStopDepsV39
):Promise<Gate4IndependentStopCandidateResultV39> {
  const d=assessGate4IndependentStopCandidateV39(ticket,pins,nowUtc);
  let stopResult:Gate4StopResultV39|null=null;
  if(d.action==="STOP"){
    // All five exact-owner, authorization and source bindings were verified
    // above; the downstream helper STRICTLY checks pre/post inventory and
    // subject match before deleting this ONE subscription ID.
    try{
      stopResult=await stopGate4ExactOwnedV39({
        subscriptionId:pins.exactOwnedSubscriptionId,
        subjectType:"FlightByAirportIcao",
        subjectId:pins.subjectId
      },deps);
    }catch{
      stopResult={
        status:"HOLD_UNCONFIRMED",reason:"EXACT_STOP_DEPENDENCY_FAILED",
        independentAccountReadbackVerified:false,
        creditSettlementVerified:false,liveGate4Certified:false
      };
    }
  }
  return {
    decision:d,stopResult,independentSupervisorArmed:false,
    creditSettlementVerified:false,liveGate4Certified:false,
    paidAuthorization:false
  };
}
