import { describe, expect, it } from "vitest";
import {
  PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO,
  validatePhase7DerivedReleaseContract,
  validatePhase7DerivedReleaseRow,
  type Phase7DerivedReleaseContract,
} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";

const sha = "a".repeat(64);
const contract = (): Phase7DerivedReleaseContract => ({
  schema: "v39.phase6.phase7-derived-release-contract.v1",
  version: "v1",
  featureDictionarySha256: sha,
  termsReviewSha256: "b".repeat(64),
  derivedWorkReviewSha256: "c".repeat(64),
  sourceToReleaseMappingExpiryHours: 24,
  researchExpiryUtc: "2027-12-31T00:00:00.000Z",
  features: [{ name: "weather_risk_bin", bucketCount: 8, transformEvidenceSha256: "d".repeat(64) }],
  labels: [{ name: "delay_bin", bucketCount: 12, transformEvidenceSha256: "e".repeat(64) }],
  allowedHorizons: ["T-6h", "T-90m"],
});

describe("Phase 6 to Phase 7 derived release contract", () => {
  it("accepts a discretised, non-source-shaped contract and row", () => {
    const c = contract();
    expect(validatePhase7DerivedReleaseContract(c)).toEqual({ pass: true, failures: [] });
    expect(validatePhase7DerivedReleaseRow(c, {
      releaseRowId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      horizon: "T-6h", split: "train",
      featureBuckets: { weather_risk_bin: 3 },
      labelBuckets: { delay_bin: 7 },
      missingness: { weather_risk_bin: false, delay_bin: false },
    })).toEqual({ pass: true, failures: [] });
  });

  it("refuses copied-source-shaped names, unsafe mappings and source-shaped row IDs", () => {
    const c = contract();
    c.features = [{ name: "carrier_iata", bucketCount: 8, transformEvidenceSha256: sha }];
    c.sourceToReleaseMappingExpiryHours = 25;
    const verdict = validatePhase7DerivedReleaseContract(c);
    expect(verdict.failures).toContain("feature-name-forbidden:carrier_iata");
    expect(verdict.failures).toContain("source-to-release-mapping-expiry-invalid");
    const row = validatePhase7DerivedReleaseRow(contract(), {
      releaseRowId: "flight:SQ001:2026-11-20", horizon: "T-6h", split: "test",
      featureBuckets: { weather_risk_bin: 1, carrier_iata: 2 }, labelBuckets: { delay_bin: 1 }, missingness: {},
    });
    expect(row.failures).toContain("release-row-id-not-random-uuid-v4");
    expect(row.failures).toContain("feature-value-not-allowlisted:carrier_iata");
  });

  it("does not grant a paid GO", () => {
    expect(PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO).toEqual({
      sourceRightsApproved: false, authorizationEnabled: false, phase6PaidGo: false,
    });
  });
});
