/**
 * P10: Pure, evidence-fed preflight for a Cloudflare SYNTHETIC hosted rehearsal.
 * NEVER provisions resources, handles live webhook requests, or authorizes paid.
 * Boolean evidence cannot replace operator verification of actual hosted state.
 */
export type P10HostedEvidenceV39=Readonly<{
  mode:"no-provider-synthetic-only";
  accountInventoryFresh:boolean;
  r2SubscriptionEnabled:boolean;
  independentPublishedWorker:boolean;
  sourceBucketExists:boolean;
  queueExists:boolean;
  sourceBucketStandardClass:boolean;
  sourceRetentionLockHours:number|null;
  rawBytesBefore2xxReadbackVerified:boolean;
  queueContainsReceiptKeyOnly:boolean;
  queueRetentionHours:number|null;
  orphanScannerAndDeadLetterRecoveryVerified:boolean;
  originalSourceUtcAndShaRetained:boolean;
  noProductionReceiverOrProviderCredentials:boolean;
  stagingDataPrivacyApproved:boolean;
  signedOperatorStagingApproval:boolean;
  signedZeroIncrementalCostReview:boolean;
  actualAccountFreeHeadroomVerified:boolean;
}>;
export type P10HostedResultV39=Readonly<{
  schema:"v39.p10-hosted-no-provider-evidence.v1";
  failedChecks:readonly string[];
  readyForIsolatedNoCreditHostedRehearsal:boolean;
  canProvisionCloudflareResources:false;
  canChangeProductionWebhook:false;
  canActivateSixPlusSix:false;
  canLaunchPaidYssy:false;
  authenticatedProviderSentAttemptLedgerProven:false;
  liveScienceCompletenessProven:false;
}>;
export function assessP10HostedEvidenceV39(x:P10HostedEvidenceV39):P10HostedResultV39{
  const f:string[]=[];
  if(x.mode!=="no-provider-synthetic-only")throw Error("P10_SYNTHETIC_ONLY_MODE_REQUIRED");
  const checks:[string,boolean][]=[
    ["CURRENT_ACCOUNT_INVENTORY_MISSING",x.accountInventoryFresh===true],
    ["R2_SUBSCRIPTION_NOT_ENABLED",x.r2SubscriptionEnabled===true],
    ["INDEPENDENT_WORKER_NOT_PUBLISHED",x.independentPublishedWorker===true],
    ["INDEPENDENT_ORIGINAL_BUCKET_MISSING",x.sourceBucketExists===true],
    ["REAL_QUEUE_NOT_PROVISIONED",x.queueExists===true],
    ["R2_STANDARD_CLASS_NOT_VERIFIED",x.sourceBucketStandardClass===true],
    ["ORIGINAL_BEFORE_2XX_READBACK_NOT_VERIFIED",x.rawBytesBefore2xxReadbackVerified===true],
    ["QUEUE_MUST_HOLD_REFERENCE_ONLY",x.queueContainsReceiptKeyOnly===true],
    ["ORPHAN_SCANNER_AND_DLQ_RECOVERY_NOT_VERIFIED",x.orphanScannerAndDeadLetterRecoveryVerified===true],
    ["ORIGINAL_SOURCE_UTC_AND_HASH_NOT_VERIFIED",x.originalSourceUtcAndShaRetained===true],
    ["SYNTHETIC_ISOLATION_NOT_PROVEN",x.noProductionReceiverOrProviderCredentials===true],
    ["DATA_RETENTION_PRIVACY_NOT_APPROVED",x.stagingDataPrivacyApproved===true],
    ["EXPLICIT_STAGING_APPROVAL_MISSING",x.signedOperatorStagingApproval===true],
    ["ZERO_INCREMENTAL_COST_REVIEW_MISSING",x.signedZeroIncrementalCostReview===true],
    ["ACCOUNT_FREE_HEADROOM_UNKNOWN",x.actualAccountFreeHeadroomVerified===true]
  ];
  for(const [name,ok] of checks)if(!ok)f.push(name);
  if(!Number.isFinite(x.sourceRetentionLockHours)||
     (x.sourceRetentionLockHours??0)<168)
    f.push("INDEPENDENT_RAW_168H_RETENTION_LOCK_NOT_VERIFIED");
  if(!Number.isFinite(x.queueRetentionHours)||
     !Number.isSafeInteger(x.queueRetentionHours)||
     (x.queueRetentionHours??0)<1)
    f.push("QUEUE_EXPIRY_NOT_VERIFIED");
  // A 24-hour Queue is not a 168-hour source archive. R2 must remain
  // independently readable for >=168h; Queue only carries reference keys.
  return {
    schema:"v39.p10-hosted-no-provider-evidence.v1",
    failedChecks:f,
    readyForIsolatedNoCreditHostedRehearsal:f.length===0,
    canProvisionCloudflareResources:false,
    canChangeProductionWebhook:false,
    canActivateSixPlusSix:false,
    canLaunchPaidYssy:false,
    authenticatedProviderSentAttemptLedgerProven:false,
    liveScienceCompletenessProven:false
  };
}
