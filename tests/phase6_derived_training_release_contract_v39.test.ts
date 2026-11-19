import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO,
  validatePhase7DerivedReleaseContract,
  validatePhase7DerivedReleaseRow,
  type Phase7DerivedReleaseContract,
  type Phase7DerivedReleaseRow,
} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

const contract = (): Phase7DerivedReleaseContract => ({
  schema: "v39.phase6.phase7-derived-release-contract.v2",
  version: "v01",
  featureDictionarySha256: sha("dictionary"),
  termsReviewSha256: sha("terms"),
  derivedWorkReviewSha256: sha("derived-work"),
  sourceToReleaseMappingExpiryHours: 24,
  researchExpiryUtc: "2027-12-31T00:00:00.000Z",
  cohortBucketCount: 32,
  features: [{
    name: "weather_risk_bin", bucketCount: 8, fieldClass: "approved_derived",
    transformEvidenceSha256: sha("weather"), nonReconstructable: true,
  }],
  labels: [{
    name: "delay_bin", bucketCount: 12, fieldClass: "approved_derived",
    transformEvidenceSha256: sha("delay"), nonReconstructable: true,
  }],
  allowedHorizons: ["T-6h", "T-90m"],
});

const row = (overrides: Record<string, unknown> = {}): Phase7DerivedReleaseRow => ({
  releaseRowId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  horizon: "T-6h" as const,
  cohortBucket: 7,
  split: "train" as const,
  featureBuckets: { weather_risk_bin: 3 },
  labelBuckets: { delay_bin: 7 },
  missingness: { weather_risk_bin: false, delay_bin: false },
  qualityFlags: 0,
  censoring: "observed" as const,
  ...overrides,
} as Phase7DerivedReleaseRow);

describe("Phase 6 to Phase 7 derived release contract", () => {
  it("accepts a bucketed, non-source-shaped contract and row", () => {
    const c = contract();
    expect(validatePhase7DerivedReleaseContract(c)).toEqual({ pass: true, failures: [] });
    expect(validatePhase7DerivedReleaseRow(c, row())).toEqual({ pass: true, failures: [] });
  });

  it("refuses copied-source-shaped names, placeholder evidence and unsafe mappings", () => {
    const c = contract();
    c.features = [{
      name: "carrier_iata", bucketCount: 8, fieldClass: "approved_derived",
      transformEvidenceSha256: "a".repeat(64), nonReconstructable: true,
    }];
    c.sourceToReleaseMappingExpiryHours = 25;
    const verdict = validatePhase7DerivedReleaseContract(c);
    expect(verdict.failures).toContain("feature-name-forbidden:carrier_iata");
    expect(verdict.failures).toContain("feature-transform-evidence-invalid:carrier_iata");
    expect(verdict.failures).toContain("source-to-release-mapping-expiry-invalid");
    const unsafe = validatePhase7DerivedReleaseRow(contract(), row({
      releaseRowId: "flight:SQ001:2026-11-20",
      featureBuckets: { weather_risk_bin: 1, carrier_iata: 2 },
    }));
    expect(unsafe.failures).toContain("release-row-id-not-random-uuid-v4");
    expect(unsafe.failures).toContain("feature-value-not-allowlisted:carrier_iata");
  });

  it("requires exact row keys and preserves missingness instead of inventing labels", () => {
    const c = contract();
    const extra = validatePhase7DerivedReleaseRow(c, row({ flightId: "must-not-exist" }));
    expect(extra.failures).toContain("row-extra-or-missing-keys");
    const contradictory = validatePhase7DerivedReleaseRow(c, row({
      labelBuckets: { delay_bin: null },
      missingness: { weather_risk_bin: false, delay_bin: false },
    }));
    expect(contradictory.failures).toContain("missingness-mismatch:delay_bin");
    const censored = validatePhase7DerivedReleaseRow(c, row({ censoring: "censored" }));
    expect(censored.failures).toContain("censored-row-label-must-be-null");
  });

  it("keeps activation and retention decisions false", () => {
    expect(PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO).toEqual({
      sourceRightsApproved: false,
      authorizationEnabled: false,
      phase6PaidGo: false,
      retentionExtensionGranted: false,
      sourceToReleaseMappingPersisted: false,
    });
  });
});
