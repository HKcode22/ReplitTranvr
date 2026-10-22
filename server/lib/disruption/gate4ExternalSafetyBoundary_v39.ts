/**
 * DRAFT/UNDEPLOYED Gate4 external STOP service trust-boundary configuration.
 * Pure review. NO networking, credentials issued, SQL, provider calls,
 * deployment, signing authority, or independent process liveness.
 *
 * The STOP worker should have read-only external custody and a separate,
 * exact-owned STOP capability; it must NOT inherit general AeroDataBox/API,
 * application/PG/CREATE permissions, the mutable controller's lifecycle,
 * or independent custody-anchor CAS write credentials.
 *
 * Input pins must originate in a separately reviewed, trusted release
 * process, NOT in the same untrusted launch arguments. Passing this function
 * DOES NOT prove real capability scopes, credentials, service identity,
 * ownership or durable independent supervision.
 */
export type Gate4ExternalSafetyReviewPinsV39=Readonly<{
  approvedSourceCommit:string;
  approvedScopeId:string;
  approvedControllerOrigin:string;
  approvedStopGatewayOrigin:string;
  approvedCustodyOrigin:string;
  approvedServiceIdentity:string;
}>;
export type Gate4ExternalSafetyCandidateV39=Readonly<{
  expectedSourceCommit:string;
  expectedScopeId:string;
  controllerOrigin:string;
  stopGatewayUrl:string;
  custodyReadUrl:string;
  serviceIdentity:string;
  inheritedEnvironment:Readonly<Record<string,string|undefined>>;
}>;
export type Gate4ExternalSafetyBoundaryVerdictV39=Readonly<{
  status:"ISOLATION_CONFIGURATION_CANDIDATE_ONLY"|"HOLD";
  reason:string;
  configShapeMatched:boolean;
  capabilityScopeIndependentlyAttested:false;
  deploymentIdentityIndependentlyAttested:false;
  restrictedCredentialsProven:false;
  externalSupervisorArmed:false;
  authenticatedHeartbeatProven:false;
  alertAcknowledged:false;
  liveGate4Certified:false;
  paidAuthorization:false;
  providerRequests:0;
  databaseWrites:0;
}>;
const SHA=/^[0-9a-f]{40}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const ID=/^gate4-safety-[a-z0-9-]{8,80}$/;
const VERSIONED_STOP_PATH="/v39/gate4/safety/exact-owned-stop";
const VERSIONED_CUSTODY_PATH="/v39/gate4/safety/custody-read";
const deny=(reason:string):Gate4ExternalSafetyBoundaryVerdictV39=>({
  status:"HOLD",reason,configShapeMatched:false,
  capabilityScopeIndependentlyAttested:false,
  deploymentIdentityIndependentlyAttested:false,
  restrictedCredentialsProven:false,
  externalSupervisorArmed:false,authenticatedHeartbeatProven:false,
  alertAcknowledged:false,liveGate4Certified:false,
  paidAuthorization:false,providerRequests:0,databaseWrites:0
});
function origin(value:unknown):string|null{
  if(typeof value!=="string"||value.length>250)return null;
  try{
    const u=new URL(value);
    if(u.protocol!=="https:"||u.username||u.password||
      u.search||u.hash||u.pathname!=="/")return null;
    if(u.hostname==="localhost"||u.hostname==="127.0.0.1"||
      u.hostname==="0.0.0.0"||!u.hostname.includes("."))
      return null;
    // Exact canonical https://host[:nondefaultport]/ required.
    return u.origin+"/"===value ? u.origin:null;
  }catch{return null;}
}
function exactUrl(raw:unknown,pinnedOrigin:string,path:string):boolean{
  if(typeof raw!=="string"||raw.length>400)return false;
  const pinned=origin(pinnedOrigin);
  if(!pinned)return false;
  try{
    const u=new URL(raw);
    return u.origin===pinned&&u.protocol==="https:"&&
      !u.username&&!u.password&&!u.search&&!u.hash&&
      u.pathname===path&&raw===pinned+path;
  }catch{return false;}
}
const RESERVED_SECRETS=[
  "GATE4_EXTERNAL_STOP_GATEWAY_TOKEN",
  "GATE4_EXTERNAL_CUSTODY_READ_TOKEN"
];
const BANNED=[
  "DATABASE_URL","DATABASE_RUNTIME_URL","V39_DATABASE_RUNTIME_URL",
  "GATE05_SAFETY_DATABASE_URL","GATE05_DISPATCH_DATABASE_URL",
  "GATE05_COMMISSION_DATABASE_URL","AERODATABOX_API_KEY",
  "RAPIDAPI_KEY","GITHUB_TOKEN","GH_TOKEN",
  "GATE4_EXTERNAL_CUSTODY_CAS_TOKEN","GATE4_EXTERNAL_CREATE_TOKEN"
];
export function reviewGate4ExternalSafetyBoundaryV39(
  candidate:Gate4ExternalSafetyCandidateV39,
  pins:Gate4ExternalSafetyReviewPinsV39
):Gate4ExternalSafetyBoundaryVerdictV39 {
  if(!candidate||!pins||!SHA.test(pins.approvedSourceCommit)||
    !UUID.test(pins.approvedScopeId)||
    !ID.test(pins.approvedServiceIdentity)||
    !origin(pins.approvedControllerOrigin)||
    !origin(pins.approvedStopGatewayOrigin)||
    !origin(pins.approvedCustodyOrigin))
    return deny("INDEPENDENT_REVIEW_PINS_INVALID");
  if(pins.approvedControllerOrigin===pins.approvedStopGatewayOrigin||
    pins.approvedControllerOrigin===pins.approvedCustodyOrigin||
    pins.approvedStopGatewayOrigin===pins.approvedCustodyOrigin)
    return deny("NONINDEPENDENT_ENDPOINT_ORIGINS");
  if(candidate.expectedSourceCommit!==pins.approvedSourceCommit||
    candidate.expectedScopeId!==pins.approvedScopeId||
    candidate.serviceIdentity!==pins.approvedServiceIdentity||
    candidate.controllerOrigin!==pins.approvedControllerOrigin||
    !exactUrl(candidate.stopGatewayUrl,pins.approvedStopGatewayOrigin,
      VERSIONED_STOP_PATH)||
    !exactUrl(candidate.custodyReadUrl,pins.approvedCustodyOrigin,
      VERSIONED_CUSTODY_PATH))
    return deny("TRUSTED_RELEASE_BINDING_MISMATCH");
  const env=candidate.inheritedEnvironment;
  if(!env||typeof env!=="object"||Array.isArray(env))
    return deny("EXTERNAL_ENVIRONMENT_MISSING");
  // This is a conservative *name* deny-list. External credentials still
  // need server-side capability policies verified by an independent reviewer.
  if(Object.entries(env).some(([key,val])=>
    val!==undefined && val!=="" && (BANNED.includes(key)||
      /^GATE05_|^GATE3_|^GATE2_|^REPLIT_.*(SECRET|TOKEN|API_KEY)/.test(key))))
    return deny("INHERITED_APP_OR_WRITE_CREDENTIALS");
  const keys=Object.keys(env).filter(k=>k.startsWith("GATE4_EXTERNAL_"));
  if(keys.some(k=>!RESERVED_SECRETS.includes(k)))
    return deny("UNREVIEWED_EXTERNAL_CAPABILITY");
  const stopToken=env.GATE4_EXTERNAL_STOP_GATEWAY_TOKEN;
  const custodyToken=env.GATE4_EXTERNAL_CUSTODY_READ_TOKEN;
  if(!stopToken||!custodyToken||stopToken.length<32||
     custodyToken.length<32||stopToken.length>1024||
     custodyToken.length>1024||stopToken===custodyToken)
    return deny("MISSING_OR_REUSED_SAFETY_CREDENTIALS");
  return {
    status:"ISOLATION_CONFIGURATION_CANDIDATE_ONLY",
    reason:"SHAPE_ACCEPTED_EXTERNAL_PROOFS_REQUIRED",
    configShapeMatched:true,
    capabilityScopeIndependentlyAttested:false,
    deploymentIdentityIndependentlyAttested:false,
    restrictedCredentialsProven:false,
    externalSupervisorArmed:false,
    authenticatedHeartbeatProven:false,
    alertAcknowledged:false,
    liveGate4Certified:false,
    paidAuthorization:false,
    providerRequests:0,
    databaseWrites:0
  };
}
