import {describe,expect,it} from "vitest";
import {assessP10HostedEvidenceV39,type P10HostedEvidenceV39}
  from "../experiments/phase2g_cf_sandbox_ingress/p10_readonly_hosted_evidence_gate_v39";

const synthetic=():P10HostedEvidenceV39=>({
  mode:"no-provider-synthetic-only",
  accountInventoryFresh:true,r2SubscriptionEnabled:true,
  independentPublishedWorker:true,sourceBucketExists:true,queueExists:true,
  sourceBucketStandardClass:true,sourceRetentionLockHours:168,
  rawBytesBefore2xxReadbackVerified:true,queueContainsReceiptKeyOnly:true,
  queueRetentionHours:24,orphanScannerAndDeadLetterRecoveryVerified:true,
  originalSourceUtcAndShaRetained:true,noProductionReceiverOrProviderCredentials:true,
  stagingDataPrivacyApproved:true,signedOperatorStagingApproval:true,
  signedZeroIncrementalCostReview:true,actualAccountFreeHeadroomVerified:true
});
describe("P10 Cloudflare published sandbox readiness: pure fail-closed evidence only",()=>{
  it("actual connected inventory is BLOCK: zero Queues/Workers and R2 disabled",()=>{
    const v=assessP10HostedEvidenceV39({...synthetic(),
      r2SubscriptionEnabled:false,independentPublishedWorker:false,
      sourceBucketExists:false,queueExists:false,
      sourceRetentionLockHours:null,signedOperatorStagingApproval:false,
      signedZeroIncrementalCostReview:false,actualAccountFreeHeadroomVerified:false
    });
    expect(v.readyForIsolatedNoCreditHostedRehearsal).toBe(false);
    expect(v.failedChecks).toEqual(expect.arrayContaining([
      "R2_SUBSCRIPTION_NOT_ENABLED","REAL_QUEUE_NOT_PROVISIONED",
      "INDEPENDENT_RAW_168H_RETENTION_LOCK_NOT_VERIFIED",
      "EXPLICIT_STAGING_APPROVAL_MISSING",
      "ZERO_INCREMENTAL_COST_REVIEW_MISSING"
    ]));
    expect(v.canProvisionCloudflareResources).toBe(false);
    expect(v.canLaunchPaidYssy).toBe(false);
  });
  it("24h Queue with an independently locked 168h original R2 source is an eligible *synthetic rehearsal candidate* only",()=>{
    const v=assessP10HostedEvidenceV39(synthetic());
    expect(v.failedChecks).toEqual([]);
    expect(v.readyForIsolatedNoCreditHostedRehearsal).toBe(true);
    expect(v.canProvisionCloudflareResources).toBe(false);
    expect(v.canActivateSixPlusSix).toBe(false);
    expect(v.canLaunchPaidYssy).toBe(false);
    expect(v.authenticatedProviderSentAttemptLedgerProven).toBe(false);
    expect(v.liveScienceCompletenessProven).toBe(false);
  });
  it.each([
    ["without 168h lock",{sourceRetentionLockHours:24},"INDEPENDENT_RAW_168H_RETENTION_LOCK_NOT_VERIFIED"],
    ["missing original bytes",{rawBytesBefore2xxReadbackVerified:false},"ORIGINAL_BEFORE_2XX_READBACK_NOT_VERIFIED"],
    ["Queue-only full bytes",{queueContainsReceiptKeyOnly:false},"QUEUE_MUST_HOLD_REFERENCE_ONLY"],
    ["scanner skip risk",{orphanScannerAndDeadLetterRecoveryVerified:false},"ORPHAN_SCANNER_AND_DLQ_RECOVERY_NOT_VERIFIED"],
    ["invalid queue expiration",{queueRetentionHours:0},"QUEUE_EXPIRY_NOT_VERIFIED"],
    ["not privacy-reviewed",{stagingDataPrivacyApproved:false},"DATA_RETENTION_PRIVACY_NOT_APPROVED"],
    ["no human approval",{signedOperatorStagingApproval:false},"EXPLICIT_STAGING_APPROVAL_MISSING"],
    ["no financial attestation",{signedZeroIncrementalCostReview:false},"ZERO_INCREMENTAL_COST_REVIEW_MISSING"],
    ["unknown usage headroom",{actualAccountFreeHeadroomVerified:false},"ACCOUNT_FREE_HEADROOM_UNKNOWN"],
    ["source UTC not verified",{originalSourceUtcAndShaRetained:false},"ORIGINAL_SOURCE_UTC_AND_HASH_NOT_VERIFIED"],
    ["production key contamination",{noProductionReceiverOrProviderCredentials:false},"SYNTHETIC_ISOLATION_NOT_PROVEN"]
  ] as const)("blocks %s",(_,change,reason)=>{
    const v=assessP10HostedEvidenceV39({...synthetic(),...change});
    expect(v.failedChecks).toContain(reason);
    expect(v.readyForIsolatedNoCreditHostedRehearsal).toBe(false);
    expect(v.canLaunchPaidYssy).toBe(false);
  });
  it("unrecognized execution mode hard rejects",()=>{
    expect(()=>assessP10HostedEvidenceV39({...synthetic(),
      mode:"paid" as P10HostedEvidenceV39["mode"]}))
      .toThrow("P10_SYNTHETIC_ONLY_MODE_REQUIRED");
  });
});
