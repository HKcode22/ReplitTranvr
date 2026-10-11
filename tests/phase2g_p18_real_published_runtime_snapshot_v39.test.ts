/**
 * P18 immutable operator-pasted Oct 11 2026 published GET observation
 * plus separately verified PRIMARY historical GitHub source at claimed SHA.
 * These are a SNAPSHOT, NOT a live curl, source-signature, deployment check,
 * credential match, provider origin sender ledger or paid authorization.
 */
import {describe,it,expect} from "vitest";
import {evaluatePublishedBackupParityV39,
  type PublishedBackupEvidenceV39,
  type CrossDeploymentBindingWitnessV39
} from "../experiments/phase2g_rehearsal/synthetic_published_backup_parity_gate_v39";

const ACTUAL_PUBLIC_GET_20261011 = Object.freeze({
  primary:Object.freeze({
    status:200,latencyMs:177,health:"PASS",
    claimedGitHead:"5de44ba66d59c26d9e5ef3b339b7f729ca2f3653",
    prepaidRouteRegistered:true,retentionHours:168,autoscale:true,
    routeOwner:"server/phase2gCallbackOnly.ts+server/routes_v3.ts"
  }),
  backup:Object.freeze({
    status:200,latencyMs:169,health:"PASS",
    claimedGitHead:"56e1bad0861db1c68403e5b4dc8c34adf4e8325a",
    prepaidRouteRegistered:true,retentionHours:168,autoscale:true,
    routeOwner:"server/index.ts+server/routes_v3.ts"
  })
});
const primary=():PublishedBackupEvidenceV39=>({
  role:"primary",
  deploymentStatus:"success",
  deployedRevision:ACTUAL_PUBLIC_GET_20261011.primary.claimedGitHead,
  currentCheckoutRevision:null,
  // The current live binary/source hash is NOT independently signed by GET.
  publishedRevisionVerifiedByRuntime:false,
  // Source inspection at this exact public claimed SHA found the v2 resolver
  // and metric contract. It does not attest the effective running binary.
  publishedPhysicalFlightInstanceV2:null,
  publishedPrepaidCallbackRoute:true,
  originalWireByteArchive:"parsed_canonical_json",
  originalBlobRoundtripBeforeAck:null,
  originalStorageRetentionHours:168,
  independentlyReachableWithoutOtherReceiver:null
});
const backup=():PublishedBackupEvidenceV39=>({
  role:"backup",
  deploymentStatus:"success",
  deployedRevision:ACTUAL_PUBLIC_GET_20261011.backup.claimedGitHead,
  currentCheckoutRevision:null,
  publishedRevisionVerifiedByRuntime:false,
  // Earlier Replit Agent preliminary found v2 absent, but no signed source.
  publishedPhysicalFlightInstanceV2:null,
  publishedPrepaidCallbackRoute:true,
  originalWireByteArchive:"unknown",
  originalBlobRoundtripBeforeAck:null,
  originalStorageRetentionHours:168,
  independentlyReachableWithoutOtherReceiver:null
});
const shared=():CrossDeploymentBindingWitnessV39=>({
  operatorAttestedBothPublishedRevisions:false,
  signedAndIndependentlyVerified:false,
  exactSameScientificPostgresBinding:null,
  exactSameOriginalDedicatedBlobBucket:null,
  exactSameCallbackSecretBinding:null,
  oneOriginalSubscriptionOwnerAndDedup:null,
  exactPhysicalFlightV2AndEightUtcBins:null,
  oneFixedIndependentDurableHttpsIngress:false,
  actualOriginalProviderSenderAttemptLedger:false,
  realHosted120MinNoCreditReplayPassed:false
});
const audit=()=>evaluatePublishedBackupParityV39({
  mode:"offline-evidence-only",
  primary:primary(),backup:backup(),shared:shared()
});

describe("P18 real published HTTP 200 snapshot cannot masquerade as release attestation",()=>{
  it("pins exact operator-observed primary and Travnr 200s, SHA claims, and Autoscale - not current GitHub head",()=>{
    expect(ACTUAL_PUBLIC_GET_20261011.primary.status).toBe(200);
    expect(ACTUAL_PUBLIC_GET_20261011.backup.status).toBe(200);
    expect(ACTUAL_PUBLIC_GET_20261011.primary.latencyMs).toBe(177);
    expect(ACTUAL_PUBLIC_GET_20261011.backup.latencyMs).toBe(169);
    expect(ACTUAL_PUBLIC_GET_20261011.primary.autoscale).toBe(true);
    expect(ACTUAL_PUBLIC_GET_20261011.backup.autoscale).toBe(true);
    expect(ACTUAL_PUBLIC_GET_20261011.primary.claimedGitHead)
      .toBe("5de44ba66d59c26d9e5ef3b339b7f729ca2f3653");
    expect(ACTUAL_PUBLIC_GET_20261011.backup.claimedGitHead)
      .toBe("56e1bad0861db1c68403e5b4dc8c34adf4e8325a");
  });
  it("the known primary GitHub SHA contains v2 SOURCE, but GET does NOT sign physical-v2 of actual deployed image",()=>{
    // The exact source at 5de44ba contains v2 and 3-strike supervisor;
    // health self-report supplies no independently authenticated image.
    const result=audit();
    expect(result.failedChecks).toContain(
      "PRIMARY_EXACT_LIVE_CODE_REVISION_NOT_ATTESTED");
    expect(result.failedChecks).toContain(
      "PRIMARY_PUBLISHED_PHYSICAL_FLIGHT_V2_NOT_PROVEN");
    expect(result.paidYssyLaunchAuthorized).toBe(false);
  });
  it("Travnr's claimed SHA unavailable in project repo and unverified physical-v2 prevents scientific backup",()=>{
    const result=audit();
    expect(result.failedChecks).toContain(
      "BACKUP_EXACT_LIVE_CODE_REVISION_NOT_ATTESTED");
    expect(result.failedChecks).toContain(
      "BACKUP_PUBLISHED_PHYSICAL_FLIGHT_V2_NOT_PROVEN");
    expect(result.readyForIsolatedNoProviderCreditHostedRehearsal).toBe(false);
    expect(result.publishedBackupVerified).toBe(false);
  });
  it("two live Autoscale HTTP GET successes cannot establish immutable provider first-hop or item-credit ledger",()=>{
    const result=audit();
    expect(result.failedChecks).toEqual(expect.arrayContaining([
      "INDEPENDENT_FIRST_HOP_NOT_VERIFIED",
      "ORIGINAL_PROVIDER_ATTEMPT_LEDGER_UNVERIFIED",
      "REAL_HOSTED_120MIN_REHEARSAL_NOT_COMPLETE",
      "CROSS_DEPLOYMENT_DB_BINDING_UNVERIFIED",
      "CROSS_DEPLOYMENT_DEDICATED_BUCKET_UNVERIFIED",
      "CROSS_DEPLOYMENT_CALLBACK_SECRET_UNVERIFIED"
    ]));
    expect(result.independentSourceItemContinuityProven).toBe(false);
    expect(result.originalF8ScienceComplete).toBe(false);
    expect(result.realSixPlusSixEnabled).toBe(false);
  });
  it("even if the unknown primary binary's v2 field becomes positively verified, no paid standby or GO without all other evidence",()=>{
    const validPrimary={...primary(),
      publishedRevisionVerifiedByRuntime:true,
      publishedPhysicalFlightInstanceV2:true};
    const result=evaluatePublishedBackupParityV39({
      mode:"offline-evidence-only",primary:validPrimary,
      backup:backup(),shared:shared()
    });
    expect(result.paidYssyLaunchAuthorized).toBe(false);
    expect(result.publishedBackupVerified).toBe(false);
    expect(result.failedChecks).toContain("INDEPENDENT_FIRST_HOP_NOT_VERIFIED");
  });
});
