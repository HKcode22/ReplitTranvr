import { describe, expect, it } from "vitest";
import {
  PHASE2_PREPAID_CONTENT_SCOPE_SHA256,
  PHASE2_PREPAID_CONTENT_SCOPE_V39,
  verifyPhase2PrepaidContentScopeDefinitionV39,
} from "../server/lib/disruption/phase2PrepaidContentScope_v39";
import {
  parsePhase2RetentionScopeEvidenceV39,
  verifyPhase2RetentionScopeEvidenceV39,
} from "../server/lib/disruption/phase2RetentionEvidence_v39";
import {
  buildPrepaidSecurityVerificationReceiptV39,
  verifyPrepaidSecurityVerificationReceiptV39,
} from "../server/lib/disruption/prepaidSecurityVerification_v39";

describe("Phase-2 prerequisite-P scope", () => {
  it("has a valid stable scope with no later Phase-6 table masquerading as prerequisite-P", () => {
    const verdict = verifyPhase2PrepaidContentScopeDefinitionV39();
    expect(verdict.pass).toBe(true);
    expect(PHASE2_PREPAID_CONTENT_SCOPE_SHA256).toMatch(/^[a-f0-9]{64}$/);
    expect(PHASE2_PREPAID_CONTENT_SCOPE_V39.map((row) => row.id)).toEqual(expect.arrayContaining([
      "prepaid-provider-raw-blob",
      "prepaid-session-runtime",
      "prepaid-delivery-runtime",
      "prepaid-item-runtime",
      "safe-anchor-probe-research-aggregates",
    ]));
    expect(PHASE2_PREPAID_CONTENT_SCOPE_V39.some((row) => /airborne|outcome|snapshot/i.test(row.id))).toBe(false);
  });

  it("accepts only the exact owner-approved Phase-2 retention topology", () => {
    const raw = JSON.stringify({
      schemaVersion: "v3.9-phase2-retention-scope-evidence-1",
      evidenceId: "RETENTION-PHASE2-20260912-001",
      verifiedAtUtc: "2026-09-12T20:00:00Z",
      providerTermsSource: "owner account-plan evidence + provider terms",
      rawProviderMaxHours: 168,
      liveFidsMaxHours: 24,
      gate1SourceListsTransient: true,
      prepaidRawStorage: "replit_app_storage",
      prepaidRuntimeStorage: "postgres_unlogged",
      postgresPitrContainsPrepaidProviderPlaintext: false,
      dedicatedProviderBucketRequired: true,
      providerBlobDeletionOwner: "providerBlobExpiry_v39",
      prepaidSessionDeletionOwner: "prepaidProbeExpiry_v39",
      ownerApproved: true,
    });
    const evidence = parsePhase2RetentionScopeEvidenceV39(raw);
    expect(verifyPhase2RetentionScopeEvidenceV39(evidence).pass).toBe(true);
    expect(verifyPhase2RetentionScopeEvidenceV39({ ...evidence, rawProviderMaxHours: 169 }).pass).toBe(false);
    expect(verifyPhase2RetentionScopeEvidenceV39({ ...evidence, postgresPitrContainsPrepaidProviderPlaintext: true }).pass).toBe(false);
  });

  it("requires a fresh receipt bound to exact evidence bytes and bucket identity", () => {
    const input = {
      verifiedAtUtc: "2026-09-12T20:00:00Z",
      dbRoleEvidenceRaw: '{"db":"one"}',
      webhookSecurityEvidenceRaw: '{"webhook":"one"}',
      retentionDeploymentEvidenceRaw: '{"deployment":"one"}',
      phase2RetentionScopeEvidenceRaw: '{"phase2":"one"}',
      providerBlobBucketId: "bucket-123",
    };
    const receipt = buildPrepaidSecurityVerificationReceiptV39(input);
    expect(verifyPrepaidSecurityVerificationReceiptV39(receipt, {
      nowUtc: new Date("2026-09-12T20:05:00Z"),
      dbRoleEvidenceRaw: input.dbRoleEvidenceRaw,
      webhookSecurityEvidenceRaw: input.webhookSecurityEvidenceRaw,
      retentionDeploymentEvidenceRaw: input.retentionDeploymentEvidenceRaw,
      phase2RetentionScopeEvidenceRaw: input.phase2RetentionScopeEvidenceRaw,
      providerBlobBucketId: input.providerBlobBucketId,
      maxAgeMinutes: 10,
    })).toBe(true);
    expect(verifyPrepaidSecurityVerificationReceiptV39(receipt, {
      nowUtc: new Date("2026-09-12T20:11:00Z"),
      dbRoleEvidenceRaw: input.dbRoleEvidenceRaw,
      webhookSecurityEvidenceRaw: input.webhookSecurityEvidenceRaw,
      retentionDeploymentEvidenceRaw: input.retentionDeploymentEvidenceRaw,
      phase2RetentionScopeEvidenceRaw: input.phase2RetentionScopeEvidenceRaw,
      providerBlobBucketId: input.providerBlobBucketId,
      maxAgeMinutes: 10,
    })).toBe(false);
    expect(verifyPrepaidSecurityVerificationReceiptV39(receipt, {
      nowUtc: new Date("2026-09-12T20:05:00Z"),
      dbRoleEvidenceRaw: input.dbRoleEvidenceRaw,
      webhookSecurityEvidenceRaw: input.webhookSecurityEvidenceRaw,
      retentionDeploymentEvidenceRaw: input.retentionDeploymentEvidenceRaw,
      phase2RetentionScopeEvidenceRaw: input.phase2RetentionScopeEvidenceRaw,
      providerBlobBucketId: "other-bucket",
      maxAgeMinutes: 10,
    })).toBe(false);
  });
});
