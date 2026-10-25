/**
 * Gate4 NEXT genuine-provider trial: pure readiness/math review.
 * ZERO network, provider, DB, GitHub STOP dispatch, secret or publish side effects.
 *
 * Input booleans are OPERATOR ASSERTIONS, not independently attested custody.
 * A "READY_FOR_EXTERNAL_VERIFICATION" verdict never authorizes paid CREATE.
 * Separate real signed scope, actual protected ARMED STOP and fresh approval
 * must be verified by the live paid owner immediately before any subscription.
 */
import {
 GATE4_CALLBACK_PRIMARY_CHECKS_V39,
 GATE4_CALLBACK_BACKUP_CHECKS_V39,
 GATE4_CALLBACK_POLL_MS_V39,
 GATE4_CALLBACK_MAX_WALL_MS_V39,
} from "./gate4CallbackHealthSixPlusSix_v39";

const HEX40=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HISTORICAL_NEXT1="d6c0fcac-798e-4913-bfd1-a561adb3dd82";
const HISTORICAL_NEXT2="16f819c6-7c68-4d5a-82cf-3820e9294dc7";
export const GATE4_CURRENT_VERIFIED_RECEIVER_SHA_V39=
 "087dc948c29d004f88eca141e1fc8e83c2844e3f";

export type Gate4ProspectiveOwnerReadinessV39=Readonly<{
 newScopeId:string;
 reviewedReceiverSha:string;
 publishedReceiverSha:string;
 reviewedStopRunnerSha:string;
 reviewedPaidOperatorSha:string;
 airportIcao:"WSSS";
 startingCredits:number;
 activeSubscriptions:number;
 softCreditTarget:number;
 protectedFloor:number;
 providerMaxDeliveryRetries:number;
 schedulesStatus:string;
 liveStatus:string;
 adsbStatus:string;
 // These are intentionally distinct from synthetic NEXT2 acceptance.
 exactNewScopeReceiverMounted:boolean;
 exactNewScopeScopedRlsInstalled:boolean;
 exactNewScopePositiveOwnerBinderReady:boolean;
 exactNewScopeRawOriginalReadbackReady:boolean;
 independentProtectedStopArmed:boolean;
 independentProtectedStopHeartbeatFresh:boolean;
 liveSixPlusSixCallbackObserverAttached:boolean;
 freshExplicitOwnerPaidAuthorization:boolean;
 explicitBurstOvershootRiskAccepted:boolean;
}>;

export type Gate4ProspectiveOwnerReviewV39=Readonly<{
 schema:"v39.gate4.prospective-real-provider-readiness.v1";
 status:"NEEDS_PREPARATION"|"READY_FOR_EXTERNAL_VERIFICATION_ONLY";
 missing:readonly string[];
 watchdogPolicy:Readonly<{
   primaryChecks:6;backupChecks:6;pollMilliseconds:15000;
   maximumOutageMilliseconds:180000;
 }>;
 providerMaxDeliveryRetries:number;
 softStopIsHardCreditCap:false;
 genuineProviderOriginalsProven:false;
 liveCreateAuthorized:false;
 phase4Authorized:false;
 providerCalls:0;
 databaseWrites:0;
}>;

const integer=(x:unknown):x is number=>
 typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
export function reviewGate4ProspectivePaidReadinessV39(
 input:Gate4ProspectiveOwnerReadinessV39
):Gate4ProspectiveOwnerReviewV39{
 const missing:string[]=[];
 const require=(ok:boolean,reason:string)=>{
   if(!ok)missing.push(reason);
 };
 require(UUID.test(input.newScopeId)&&
  input.newScopeId!==HISTORICAL_NEXT1&&
  input.newScopeId!==HISTORICAL_NEXT2,"NEW_UNSPENT_SCOPE_REQUIRED");
 require(HEX40.test(input.reviewedReceiverSha)&&
  input.reviewedReceiverSha===input.publishedReceiverSha,
  "EXACT_REVIEWED_RECEIVER_SOURCE_NOT_VERIFIED");
 require(HEX40.test(input.reviewedStopRunnerSha)&&
  HEX40.test(input.reviewedPaidOperatorSha),
  "TWO_SEPARATELY_REVIEWED_OPERATOR_SHA_REQUIRED");
 require(input.airportIcao==="WSSS"&&
  input.schedulesStatus==="OK"&&input.liveStatus==="OK"&&
  ["OK","OKPartial"].includes(input.adsbStatus),
  "WSSS_FEED_HEALTH_NOT_ESTABLISHED");
 require(integer(input.startingCredits)&&input.startingCredits>0&&
  input.activeSubscriptions===0,"FRESH_PROVIDER_ACCOUNT_BASELINE_OR_ACTIVE_SUBS");
 require(integer(input.softCreditTarget)&&input.softCreditTarget>=1&&
  input.softCreditTarget<=100&&integer(input.protectedFloor)&&
  input.protectedFloor>=1000&&
  input.startingCredits-input.softCreditTarget>=input.protectedFloor,
  "CREDIT_SOFT_POLICY_EXCEEDS_STARTING_BALANCE");
 require([0,1,2].includes(input.providerMaxDeliveryRetries),
  "INVALID_PROVIDER_RETRY_SETTING_NOT_6PLUS6");
 // Paid provider retries 1-2 may be valid technically, but would need
 // dedicated extra billable-send approval and fresh projected exposure.
 require(input.providerMaxDeliveryRetries===0,
  "PAID_PROVIDER_RETRIES_NOT_SEPARATELY_AUTHORIZED");
 require(input.exactNewScopeReceiverMounted===true,
  "NEW_PAID_SCOPE_RECEIVER_NOT_MOUNTED");
 require(input.exactNewScopeScopedRlsInstalled===true,
  "NEW_SCOPE_RLS_NOT_COMMISSIONED");
 require(input.exactNewScopePositiveOwnerBinderReady===true,
  "NEW_V0072_PROVENANCE_BINDER_NOT_READY");
 require(input.exactNewScopeRawOriginalReadbackReady===true,
  "NEW_V0071_RAW_SHA_AUDITOR_NOT_READY");
 require(input.independentProtectedStopArmed===true&&
  input.independentProtectedStopHeartbeatFresh===true,
  "GITHUB_STOP_NOT_INDEPENDENTLY_ARMED");
 require(input.liveSixPlusSixCallbackObserverAttached===true,
  "LIVE_6PLUS6_OBSERVER_NOT_YET_ATTACHED");
 require(input.explicitBurstOvershootRiskAccepted===true,
  "BURST_CREDIT_OVERSHOOT_NOT_ACCEPTED");
 require(input.freshExplicitOwnerPaidAuthorization===true,
  "FRESH_ONE_CREATE_OWNER_PERMISSION_MISSING");
 return {
  schema:"v39.gate4.prospective-real-provider-readiness.v1",
  status:missing.length?"NEEDS_PREPARATION":
   "READY_FOR_EXTERNAL_VERIFICATION_ONLY",
  missing,
  watchdogPolicy:{
   primaryChecks:GATE4_CALLBACK_PRIMARY_CHECKS_V39,
   backupChecks:GATE4_CALLBACK_BACKUP_CHECKS_V39,
   pollMilliseconds:GATE4_CALLBACK_POLL_MS_V39,
   maximumOutageMilliseconds:GATE4_CALLBACK_MAX_WALL_MS_V39
  },
  providerMaxDeliveryRetries:input.providerMaxDeliveryRetries,
  softStopIsHardCreditCap:false,
  genuineProviderOriginalsProven:false,
  liveCreateAuthorized:false,
  phase4Authorized:false,
  providerCalls:0,databaseWrites:0
 };
}

/** EXACT two-sided 95% Clopper-Pearson lower bound, special case n successes
 * out of n independent Bernoulli SENDs: (alpha/2)^(1/n).
 * Not valid as reliability evidence unless the EXTERNAL sender denominator
 * and independence/sampling assumptions were independently established.
 */
export function illustrationAllDeliveredExact95LowerBoundV39(
 independentProviderSends:number
):number|null{
 if(!Number.isSafeInteger(independentProviderSends)||
  independentProviderSends<1)return null;
 return Math.pow(0.025,1/independentProviderSends);
}
