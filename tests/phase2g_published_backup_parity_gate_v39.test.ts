import {describe,it,expect} from "vitest";
import {evaluatePublishedBackupParityV39,
  type PublishedBackupEvidenceV39,
  type CrossDeploymentBindingWitnessV39
} from "../experiments/phase2g_rehearsal/synthetic_published_backup_parity_gate_v39";
const primary=():PublishedBackupEvidenceV39=>({
  role:"primary",deploymentStatus:"success",
  deployedRevision:"a".repeat(40),currentCheckoutRevision:"a".repeat(40),
  publishedRevisionVerifiedByRuntime:true,
  publishedPhysicalFlightInstanceV2:true,
  publishedPrepaidCallbackRoute:true,
  originalWireByteArchive:"literal_wire",
  originalBlobRoundtripBeforeAck:true,
  originalStorageRetentionHours:168,
  independentlyReachableWithoutOtherReceiver:true
});
const backup=():PublishedBackupEvidenceV39=>({
  ...primary(),role:"backup",deployedRevision:"b".repeat(40),
  currentCheckoutRevision:"b".repeat(40)
});
const signed=():CrossDeploymentBindingWitnessV39=>({
  operatorAttestedBothPublishedRevisions:true,signedAndIndependentlyVerified:true,
  exactSameScientificPostgresBinding:true,
  exactSameOriginalDedicatedBlobBucket:true,
  exactSameCallbackSecretBinding:true,
  oneOriginalSubscriptionOwnerAndDedup:true,
  exactPhysicalFlightV2AndEightUtcBins:true,
  oneFixedIndependentDurableHttpsIngress:true,
  actualOriginalProviderSenderAttemptLedger:true,
  realHosted120MinNoCreditReplayPassed:true
});
const call=(p:PublishedBackupEvidenceV39=primary(),
  b:PublishedBackupEvidenceV39=backup(),
  w:CrossDeploymentBindingWitnessV39=signed())=>
    evaluatePublishedBackupParityV39({
      mode:"offline-evidence-only",primary:p,backup:b,shared:w
    });
describe("P09/P18 exact published backup evidence fail closed; no inferred Replit parity",()=>{
  it("published Travnr agent-reported older SHA missing physical-flight-v2 is NOT eligible",()=>{
    const b={
      ...backup(),
      deployedRevision:"56e1bad0861db1c68403e5b4dc8c34adf4e8325a",
      currentCheckoutRevision:"7164bfb77ce53d387b9c9536b3a33341a5dec146",
      publishedPhysicalFlightInstanceV2:false,
      originalWireByteArchive:"parsed_canonical_json" as const
    };
    const p={
      ...primary(),deployedRevision:null,publishedRevisionVerifiedByRuntime:false,
      publishedPhysicalFlightInstanceV2:null,
      originalWireByteArchive:"unknown" as const
    };
    const w={
      ...signed(),operatorAttestedBothPublishedRevisions:false,
      signedAndIndependentlyVerified:false,
      exactSameScientificPostgresBinding:null,
      exactSameOriginalDedicatedBlobBucket:null,
      exactSameCallbackSecretBinding:null,
      oneFixedIndependentDurableHttpsIngress:false,
      actualOriginalProviderSenderAttemptLedger:false,
      realHosted120MinNoCreditReplayPassed:false
    };
    const a=call(p,b,w);
    expect(a.readyForIsolatedNoProviderCreditHostedRehearsal).toBe(false);
    expect(a.failedChecks).toContain("BACKUP_PUBLISHED_PHYSICAL_FLIGHT_V2_NOT_PROVEN");
    expect(a.failedChecks).toContain("BACKUP_LITERAL_ORIGINAL_WIRE_NOT_ARCHIVED");
    expect(a.failedChecks).toContain("PRIMARY_EXACT_LIVE_CODE_REVISION_NOT_ATTESTED");
    expect(a.failedChecks).toContain("CROSS_DEPLOYMENT_DB_BINDING_UNVERIFIED");
    expect(a.failedChecks).toContain("CROSS_DEPLOYMENT_DEDICATED_BUCKET_UNVERIFIED");
    expect(a.failedChecks).toContain("INDEPENDENT_FIRST_HOP_NOT_VERIFIED");
    expect(a.paidYssyLaunchAuthorized).toBe(false);
  });
  it("local checkout newer than deployed does NOT prove revised receiver was actually published",()=>{
    const b={...backup(),deployedRevision:"1".repeat(40),
      currentCheckoutRevision:"2".repeat(40),
      publishedRevisionVerifiedByRuntime:false};
    expect(call(primary(),b).failedChecks)
      .toContain("BACKUP_EXACT_LIVE_CODE_REVISION_NOT_ATTESTED");
  });
  it("deployed status success does NOT demonstrate common scientific DB, secret or original bucket",()=>{
    const q=call(primary(),backup(),{
      ...signed(),exactSameScientificPostgresBinding:null,
      exactSameOriginalDedicatedBlobBucket:null,
      exactSameCallbackSecretBinding:null
    });
    expect(q.failedChecks).toEqual(expect.arrayContaining([
      "CROSS_DEPLOYMENT_DB_BINDING_UNVERIFIED",
      "CROSS_DEPLOYMENT_DEDICATED_BUCKET_UNVERIFIED",
      "CROSS_DEPLOYMENT_CALLBACK_SECRET_UNVERIFIED"
    ]));
    expect(q.readyForIsolatedNoProviderCreditHostedRehearsal).toBe(false);
  });
  it("storage roundtrip of normalized JSON is not original literal wire byte preservation",()=>{
    const q=call(primary(),{
      ...backup(),originalWireByteArchive:"parsed_canonical_json"
    });
    expect(q.failedChecks).toContain("BACKUP_LITERAL_ORIGINAL_WIRE_NOT_ARCHIVED");
    expect(q.publishedBackupVerified).toBe(false);
  });
  it("missing physical instance v2 or 8-bin contract cannot be bypassed",()=>{
    const a=call(primary(),{...backup(),publishedPhysicalFlightInstanceV2:false});
    expect(a.failedChecks).toContain("BACKUP_PUBLISHED_PHYSICAL_FLIGHT_V2_NOT_PROVEN");
    const b=call(primary(),backup(),{
      ...signed(),exactPhysicalFlightV2AndEightUtcBins:false
    });
    expect(b.failedChecks).toContain("PHYSICAL_V2_EIGHT_BIN_PARITY_UNVERIFIED");
  });
  it("two published endpoints alone do NOT constitute one independently durable front door",()=>{
    const a=call(primary(),backup(),{
      ...signed(),oneFixedIndependentDurableHttpsIngress:false
    });
    expect(a.failedChecks).toContain("INDEPENDENT_FIRST_HOP_NOT_VERIFIED");
    expect(a.paidYssyLaunchAuthorized).toBe(false);
  });
  it("an actual absent provider item/billing source ledger blocks completeness regardless of app parity",()=>{
    const a=call(primary(),backup(),{
      ...signed(),actualOriginalProviderSenderAttemptLedger:false
    });
    expect(a.failedChecks).toContain("ORIGINAL_PROVIDER_ATTEMPT_LEDGER_UNVERIFIED");
    expect(a.independentSourceItemContinuityProven).toBe(false);
  });
  it("prospectively fully signed published hypothetical parity is at MOST eligible for hosted rehearsal, NEVER paid GO",()=>{
    const a=call();
    expect(a.failedChecks).toEqual([]);
    expect(a.readyForIsolatedNoProviderCreditHostedRehearsal).toBe(true);
    expect(a.publishedBackupVerified).toBe(true);
    expect(a.realSixPlusSixEnabled).toBe(false);
    expect(a.paidYssyLaunchAuthorized).toBe(false);
    expect(a.originalF8ScienceComplete).toBe(false);
  });
  it("unsuccessful/suspended deployment cannot accidentally be treated as live published parity",()=>{
    for(const status of ["failed","suspended","unknown"] as const){
      const a=call(primary(),{...backup(),deploymentStatus:status});
      expect(a.failedChecks).toContain("BACKUP_PUBLISHED_NOT_SUCCESS");
      expect(a.publishedBackupVerified).toBe(false);
    }
  });
  it("unsigned human-reported bucket/DB equality cannot certify a backup",()=>{
    const a=call(primary(),backup(),{
      ...signed(),signedAndIndependentlyVerified:false
    });
    expect(a.failedChecks).toContain("DEPLOYMENT_PAIR_ATTESTATION_NOT_VERIFIED");
    expect(a.publishedBackupVerified).toBe(false);
  });
  it("missing two-hour real hosted rehearsal cannot be conflated with our accelerated 8-bin simulator",()=>{
    const a=call(primary(),backup(),{
      ...signed(),realHosted120MinNoCreditReplayPassed:false
    });
    expect(a.failedChecks).toContain("REAL_HOSTED_120MIN_REHEARSAL_NOT_COMPLETE");
    expect(a.publishedBackupVerified).toBe(false);
    expect(a.paidYssyLaunchAuthorized).toBe(false);
  });
  it("bad role/mode evidence rejected",()=>{
    expect(()=>evaluatePublishedBackupParityV39({
      mode:"paid" as any,primary:primary(),backup:backup(),shared:signed()
    })).toThrow("BACKUP_PUBLISHED_EVIDENCE_MODE_OR_ROLE_INVALID");
    expect(()=>evaluatePublishedBackupParityV39({
      mode:"offline-evidence-only",primary:backup(),backup:primary(),shared:signed()
    })).toThrow("BACKUP_PUBLISHED_EVIDENCE_MODE_OR_ROLE_INVALID");
  });
});
