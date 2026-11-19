import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createPhase7DerivedReleasePacket,
  hashPhase7DerivedReleasePacket,
  newPhase7ReleaseRowId,
  PHASE7_DERIVED_PACKET_NO_SOURCE_ARCHIVE_OR_PAID_GO,
  serializePhase7DerivedReleasePacket,
  validatePhase7DerivedReleasePacket,
} from "../server/lib/disruption/phase6DerivedTrainingReleasePacket_v39";
import type { Phase7DerivedReleaseContract, Phase7DerivedReleaseRow } from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const c = (): Phase7DerivedReleaseContract => ({
  schema: "v39.phase6.phase7-derived-release-contract.v2", version: "v01",
  featureDictionarySha256: sha("dictionary"), termsReviewSha256: sha("terms"), derivedWorkReviewSha256: sha("derived"),
  sourceToReleaseMappingExpiryHours: 24, researchExpiryUtc: "2027-12-31T00:00:00.000Z", cohortBucketCount: 4,
  features: [{ name: "weather_risk_bin", bucketCount: 8, fieldClass: "approved_derived", transformEvidenceSha256: sha("weather"), nonReconstructable: true }],
  labels: [{ name: "delay_bin", bucketCount: 12, fieldClass: "approved_derived", transformEvidenceSha256: sha("delay"), nonReconstructable: true }],
  allowedHorizons: ["T-24h", "T-6h", "T-90m"],
});
const r = (id: string, split: "train" | "validation" | "test", cohortBucket = 1): Phase7DerivedReleaseRow => ({
  releaseRowId: id, horizon: "T-6h", cohortBucket, split,
  featureBuckets: { weather_risk_bin: 2 }, labelBuckets: { delay_bin: 4 },
  missingness: { weather_risk_bin: false, delay_bin: false }, qualityFlags: 0, censoring: "observed",
});

describe("Phase 6 to Phase 7 derived release packet", () => {
  it("creates stable second-packet bytes without source-shaped fields", () => {
    const contract = c();
    const packet = createPhase7DerivedReleasePacket(contract, [
      r("3f2504e0-4f89-41d3-9a0c-0305e82c3301", "train"),
      r("3f2504e0-4f89-41d3-9a0c-0305e82c3302", "test", 2),
    ], "3f2504e0-4f89-41d3-9a0c-0305e82c3303");
    const first = serializePhase7DerivedReleasePacket(contract, packet);
    const second = serializePhase7DerivedReleasePacket(contract, packet);
    expect(first).toBe(second);
    expect(hashPhase7DerivedReleasePacket(packet)).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toMatch(/SQ001|airport|timestamp|response_hash|provider/i);
    expect(validatePhase7DerivedReleasePacket(contract, packet).pass).toBe(true);
  });

  it("rejects a cohort split crossing and duplicate row identity", () => {
    const contract = c();
    const packet = {
      schema: "v39.phase6.phase7-derived-release-packet.v1" as const,
      packetId: "3f2504e0-4f89-41d3-9a0c-0305e82c3303",
      contractVersion: "v01", featureDictionarySha256: contract.featureDictionarySha256,
      rows: [r("3f2504e0-4f89-41d3-9a0c-0305e82c3301", "train"), r("3f2504e0-4f89-41d3-9a0c-0305e82c3301", "test")],
    };
    const verdict = validatePhase7DerivedReleasePacket(contract, packet);
    expect(verdict.failures).toContain("duplicate-release-row-id:3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    expect(verdict.failures).toContain("cohort-crosses-split:1");
  });

  it("generates UUID-v4 row IDs and never becomes a source archive or paid GO", () => {
    expect(newPhase7ReleaseRowId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(PHASE7_DERIVED_PACKET_NO_SOURCE_ARCHIVE_OR_PAID_GO).toEqual({
      sourceArchive: false, sourceRetentionExtension: false, sourceRightsApproved: false,
      authorizationEnabled: false, phase6PaidGo: false,
    });
  });
});
