import { describe, expect, it } from "vitest";
import {
  buildPrepaidSecurityPassArtifact,
  verifyPrepaidSecurityPassArtifact,
} from "../server/lib/disruption/prepaidSecurityPass_v39";

describe("V3.9 prerequisite-P PASS artifact", () => {
  it("is self-hashed and bound to the current Plan/static retention definitions", () => {
    const artifact = buildPrepaidSecurityPassArtifact({
      verifiedAtUtc: "2026-09-12T06:00:00Z",
      retentionDeploymentEvidenceRaw: '{"deployment":"fixture"}',
      retentionMatrixEvidenceRaw: '{"matrix":"fixture"}',
    });
    expect(verifyPrepaidSecurityPassArtifact(artifact)).toBe(true);
    expect(artifact.artifact_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects tampering or stale definition hashes", () => {
    const artifact = buildPrepaidSecurityPassArtifact({
      verifiedAtUtc: "2026-09-12T06:00:00Z",
      retentionDeploymentEvidenceRaw: '{"deployment":"fixture"}',
      retentionMatrixEvidenceRaw: '{"matrix":"fixture"}',
    });
    expect(verifyPrepaidSecurityPassArtifact({ ...artifact, status: "BLOCKED" })).toBe(false);
    expect(verifyPrepaidSecurityPassArtifact({ ...artifact, provider_content_inventory_sha256: "0".repeat(64) })).toBe(false);
    expect(verifyPrepaidSecurityPassArtifact({ ...artifact, artifact_sha256: "f".repeat(64) })).toBe(false);
  });
});
