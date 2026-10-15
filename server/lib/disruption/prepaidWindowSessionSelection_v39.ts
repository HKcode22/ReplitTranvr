/**
 * Versioned selection of a historical freshly-armed Phase2 session versus a
 * PREARMED Phase3 Gate3 session. Provider-free helper, injectable for tests.
 * No one may pass a boolean "authorized" to bypass the Gate3 review.
 *
 * This is NOT the paid Gate3 owner and intentionally cannot create a
 * provider subscription, infer published-host parity or spend a credit.
 */
import type {PrepaidProbeOwnerKindV39,PrepaidProbeSessionV39}
  from "./prepaidProbeRuntime_v39";

export type Gate3PrearmedSessionV39=Readonly<{
  sessionId:string;
  icao:string;
  fixedExposureSeconds:number;
  canaryCreditCeiling:number;
  authorizationEvidenceSha256:string;
  authArtifactRaw:string;
  expectedAuthId:string;
  expectedAirportFilterWindow:string;
}>;
type HistoricalSessionInputV39=Readonly<{
  ownerKind:"phase2_safety_smoke"|"anchor_probe";
  ownerProbeId:number|null;
  stage:1|2|null;
  icao:string|null;
  lifetimeHours:24;
}>;
export interface PrepaidSessionSelectionRequestV39{
  ownerKind:PrepaidProbeOwnerKindV39;
  ownerProbeId?:number|null;
  stage?:1|2|null;
  icao:string;
  targetHours:number;
  hardCapCredits:number;
  settledOtherCredits:number;
  prearmedGate3?:Gate3PrearmedSessionV39;
}
export type SelectedPrepaidWindowSessionV39=Pick<PrepaidProbeSessionV39,
  "sessionId"|"ownerKind"|"ownerProbeId"|"stage"|"icao"|"state">;
export interface PrepaidSessionSelectionHooksV39{
  armHistorical:(input:HistoricalSessionInputV39)=>Promise<PrepaidProbeSessionV39>;
  reviewPrearmedGate3:(expected:Gate3PrearmedSessionV39)=>
    Promise<{status:"HOLD"|"OFFLINE_AUTH_SESSION_CONSISTENT";reasons:readonly string[]}>;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
export async function selectPrepaidWindowSessionV39(
  input:PrepaidSessionSelectionRequestV39,
  hooks:PrepaidSessionSelectionHooksV39,
):Promise<SelectedPrepaidWindowSessionV39>{
  if(input.ownerKind!=="phase3_credit_canary"){
    if(input.prearmedGate3!==undefined)
      throw Error("GATE3_PREARMED_MODE_FORBIDDEN_FOR_PHASE2");
    if(input.ownerKind!=="phase2_safety_smoke"&&input.ownerKind!=="anchor_probe")
      throw Error("PREPAID_WINDOW_OWNER_KIND_UNRECOGNIZED");
    return hooks.armHistorical({
      ownerKind:input.ownerKind,
      ownerProbeId:input.ownerProbeId??null,
      stage:input.stage??null,
      icao:input.ownerKind==="anchor_probe"?input.icao.toUpperCase():null,
      lifetimeHours:24,
    });
  }
  const gate3=input.prearmedGate3;
  if(!gate3 || input.ownerProbeId!=null || input.stage!=null ||
    !UUID.test(gate3.sessionId)||
    !/^[A-Z]{4}$/.test(input.icao)||
    gate3.icao!==input.icao||
    !SHA.test(gate3.authorizationEvidenceSha256)||
    !Number.isSafeInteger(gate3.fixedExposureSeconds)||
    gate3.fixedExposureSeconds<1||gate3.fixedExposureSeconds>3600||
    !Number.isSafeInteger(gate3.canaryCreditCeiling)||
    gate3.canaryCreditCeiling<1||gate3.canaryCreditCeiling>100||
    input.targetHours!==gate3.fixedExposureSeconds/3600||
    input.hardCapCredits!==gate3.canaryCreditCeiling||
    input.settledOtherCredits!==0)
      throw Error("GATE3_PREARMED_EXACT_SESSION_SCOPE_REQUIRED");
  // Never call armHistorical here. The matching SQL owner and same-ID
  // session were already created atomically by the Gate3 preparer.
  const reviewed=await hooks.reviewPrearmedGate3(gate3);
  if(reviewed.status!=="OFFLINE_AUTH_SESSION_CONSISTENT")
    throw Error("GATE3_PREARMED_OWNER_AUTH_HOLD");
  return {
    sessionId:gate3.sessionId,ownerKind:"phase3_credit_canary",
    ownerProbeId:null,stage:null,icao:gate3.icao,
    state:"armed",
  };
}
