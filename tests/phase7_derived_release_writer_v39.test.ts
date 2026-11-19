import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPhase7DerivedReleasePacket, writePhase7DerivedReleasePacket, type Phase7ApprovedDerivedInput } from "../server/lib/disruption/phase7DerivedReleaseWriter_v39";
import type { Phase7DerivedReleaseContract } from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const contract = (): Phase7DerivedReleaseContract => ({
  schema: "v39.phase6.phase7-derived-release-contract.v2", version: "v01",
  featureDictionarySha256: sha("dictionary"), termsReviewSha256: sha("terms"), derivedWorkReviewSha256: sha("derived"),
  sourceToReleaseMappingExpiryHours: 24, researchExpiryUtc: "2027-12-31T00:00:00.000Z", cohortBucketCount: 4,
  features: [{ name: "weather_risk_bin", bucketCount: 8, fieldClass: "approved_derived", transformEvidenceSha256: sha("weather"), nonReconstructable: true }],
  labels: [{ name: "delay_bin", bucketCount: 12, fieldClass: "approved_derived", transformEvidenceSha256: sha("delay"), nonReconstructable: true }],
  allowedHorizons: ["T-24h", "T-6h", "T-90m"],
});
const input = (): Phase7ApprovedDerivedInput => ({
  horizon: "T-6h", cohortBucket: 1, split: "train",
  featureBuckets: { weather_risk_bin: 2 }, labelBuckets: { delay_bin: 4 },
  missingness: { weather_risk_bin: false, delay_bin: false }, qualityFlags: 0, censoring: "observed",
});

describe("Phase 7 derived-release writer", () => {
  it("writes only canonical packet bytes and fresh packet-local IDs", async () => {
    const writes: Array<{ key: string; bytes: string }> = [];
    const receipt = await writePhase7DerivedReleasePacket(contract(), [input()], {
      put(key, bytes) { writes.push({ key, bytes }); },
    }, "3f2504e0-4f89-41d3-9a0c-0305e82c3303");
    expect(receipt).toMatchObject({
      schema: "v39.phase7.derived-release-write-receipt.v1", rowCount: 1,
      packetId: "3f2504e0-4f89-41d3-9a0c-0305e82c3303",
      sourceArchive: false, sourceRightsApproved: false, authorizationEnabled: false, phase6PaidGo: false,
    });
    expect(writes).toHaveLength(1);
    expect(writes[0].key).toBe("phase7/derived/v01/packet-3f2504e0-4f89-41d3-9a0c-0305e82c3303.json");
    expect(writes[0].bytes).not.toMatch(/flight|provider|airport|timestamp|response|query|route/i);
    expect(writes[0].bytes).toContain("weather_risk_bin");
  });

  it("rejects raw/source-shaped input before a sink write", async () => {
    const writes: string[] = [];
    const unsafe = { ...input(), flightNumber: "SQ001" } as unknown as Phase7ApprovedDerivedInput;
    expect(() => buildPhase7DerivedReleasePacket(contract(), [unsafe])).toThrow("input-0-must-be-exact-approved-derived-shape");
    await expect(writePhase7DerivedReleasePacket(contract(), [unsafe], { put(key) { writes.push(key); } })).rejects.toThrow("input-0-must-be-exact-approved-derived-shape");
    expect(writes).toEqual([]);
  });

  it("preserves missing/censored labels and never persists linkage", () => {
    const packet = buildPhase7DerivedReleasePacket(contract(), [{ ...input(), labelBuckets: { delay_bin: null }, missingness: { weather_risk_bin: false, delay_bin: true }, censoring: "censored" }]);
    expect(packet.rows[0].labelBuckets).toEqual({ delay_bin: null });
    expect(packet.rows[0]).not.toHaveProperty("flightNumber");
    expect(packet.rows[0]).not.toHaveProperty("sourceId");
  });
});
