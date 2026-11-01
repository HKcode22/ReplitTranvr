/**
 * V3.9 Phase4 Gate5: current account read-only evidence + historical recall.
 * Never replace the legacy Team Ultra evidence with "unknown", yet never
 * reuse the 2026-09-10 quota as proof of today's billing cycle or rights.
 * Caller makes one provider-documented FREE balance GET separately.
 */
export const P4_ACCOUNT_RECALL_SCHEMA_V39=
 "v39.phase4.historical-ultra-and-current-free-account-evidence.v1" as const;
export const P4_GATE0_HISTORICAL_PATH_V39=
 "data-collection/evidence/early-gates/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json" as const;
export const P4_P2_RETENTION_HISTORICAL_PATH_V39=
 "data-collection/evidence/original-artifacts/other/retention-deployment-evidence-20260911.json" as const;

type ObjectRecord=Record<string,unknown>;
function rec(value:unknown,why:string):ObjectRecord {
 if(!value||typeof value!=="object"||Array.isArray(value))
  throw Error("P4_ACCOUNT_RECALL_INVALID:"+why);
 return value as ObjectRecord;
}
function val(v:unknown,why:string):number{
 if(typeof v!=="number"||!Number.isSafeInteger(v)||v<0)
  throw Error("P4_ACCOUNT_RECALL_INVALID:"+why);
 return v;
}
export interface P4CurrentFreeProviderBalanceV39{
 observedAtUtc:string;
 apiUnitsLimit:number;
 apiUnitsRemaining:number;
 apiUnitsResetAtUtc:string;
 requestsLimit:number;
 requestsRemaining:number;
 alertCreditsRemaining:number;
}
function verifiedUtc(x:unknown,why:string):string{
 if(typeof x!=="string"||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x)||
  !Number.isFinite(Date.parse(x))||
  new Date(Date.parse(x)).toISOString()!==
   (x.includes(".")?x:x.replace("Z",".000Z")))
  throw Error("P4_ACCOUNT_RECALL_INVALID:"+why);
 return x;
}
export function assessP4LegacyUltraAccountRecallV39(
 historicalGate0:unknown,historicalRetention:unknown,
 currentFreeBalance?:P4CurrentFreeProviderBalanceV39
){
 const old=rec(historicalGate0,"gate0");
 const ret=rec(historicalRetention,"retention");
 const owner=rec(ret.ownerAttestation,"retention-owner");
 const retention=rec(owner.rapidApiUltraRetentionTerms,"retention-term");
 const backup=rec(rec(ret.surfaces,"surfaces").backup,"backup");
 if(old.schema_version!=="v3.9-gate0-account-evidence-3"||
  old.subscription_channel!=="rapidapi"||
  old.active_subscribed_plan!==
   "RapidAPI Ultra (grandfathered existing subscription; user-reported team plan provenance)"||
  old.plan_version_basis!=="grandfathered"||
  old.account_identity_verified!==true||
  old.entitlement_verified_for_active_subscription!==true||
  old.gathered_at_utc!=="2026-09-10T06:47:29.000Z"||
  val(old.cycle_entitlement_units,"baseline-entitlement")!==60000||
  val(old.api_units_remaining,"baseline-remaining")!==59994||
  val(old.api_units_consumed_before_freeze,"baseline-consumed")!==6||
  val(old.project_cycle_api_unit_ceiling,"project-ceiling")!==50000||
  val(old.opening_nonexpiring_alert_balance,"baseline-alert")!==2900||
  ret.evidenceId!=="RETENTION-DEPLOYMENT-20260911-001"||
  retention.rawApiPayloadAndWebhookDelivery!=="hard delete after 7 days max"||
  retention.liveFidsQueryCache!=="hard delete after 24 hours max"||
  ret.status!=="BLOCKED_BACKUP_RECOVERY_AND_UNVERIFIED_SURFACES"||
  val(backup.recoveryWindowHours,"pitr-hours")!==168)
  throw Error("P4_ACCOUNT_RECALL_ORIGINAL_EVIDENCE_DRIFT_HOLD");
 let now:null|P4CurrentFreeProviderBalanceV39=null;
 if(currentFreeBalance){
  const x=currentFreeBalance;
  const observed=verifiedUtc(x.observedAtUtc,"current-observed");
  const reset=verifiedUtc(x.apiUnitsResetAtUtc,"current-reset");
  if(Date.parse(reset)<=Date.parse(observed)||
   val(x.apiUnitsLimit,"current-entitlement")===0||
   val(x.apiUnitsRemaining,"current-remaining")>x.apiUnitsLimit||
   val(x.requestsLimit,"current-request-limit")===0||
   val(x.requestsRemaining,"current-request-remaining")>x.requestsLimit||
   val(x.alertCreditsRemaining,"current-alert")<0)
   throw Error("P4_ACCOUNT_RECALL_CURRENT_QUOTA_INVALID");
  now={
   observedAtUtc:observed,apiUnitsLimit:x.apiUnitsLimit,
   apiUnitsRemaining:x.apiUnitsRemaining,
   apiUnitsResetAtUtc:reset,requestsLimit:x.requestsLimit,
   requestsRemaining:x.requestsRemaining,
   alertCreditsRemaining:x.alertCreditsRemaining
  };
 }
 return {
  schema:P4_ACCOUNT_RECALL_SCHEMA_V39,
  status:now?
   "HISTORICAL_TEAM_ULTRA_AND_CURRENT_FREE_QUOTA_SEPARATELY_RECORDED_HOLD":
   "HISTORICAL_TEAM_ULTRA_VERIFIED_CURRENT_CYCLE_NOT_RECHECKED",
  originalAccountEvidenceRecorded:true,
  historicalAccount:{
   evidenceAtUtc:old.gathered_at_utc,
   subscribedChannel:"rapidapi",
   plan:"Team Ultra / legacy Ultra (owner attested)",
   planVersionBasis:"grandfathered (Sept 2026 attestation)",
   observedEntitlementUnits:60000,
   observedRemainingUnits:59994,
   independentProjectCeilingUnits:50000,
   observedAlertCredits:2900,
   originalBillingCycleEndUtc:old.billing_cycle_end_utc
  },
  originalRetention:{
   ownerAttestedRawMaxHours:168,
   ownerAttestedLiveFidsMaxHours:24,
   pitrRecoveryHours:168,
   backupRetentionReviewStatus:
    "BLOCKED_BACKUP_RECOVERY_AND_UNVERIFIED_SURFACES",
   planSpecificRightIndependentlyReverifiedToday:false
  },
  currentFreeProviderQuota:now,
  currentQuotaDiffersFromSeptemberHistorical:
   now?now.apiUnitsLimit!==60000:null,
  currentQuotaNotProofOfPlanOrCachingRights:true,
  newProspectivePaidGate5Authorized:false,
  independentOriginalSelectedTMilestoneCertified:false,
  independentlyActualOnlyWheelsOffCertified:false,
  phase5FreezeAuthorized:false,
  phase6Authorized:false,
  databaseWrites:0,
  paidProviderCalls:0
 } as const;
}
