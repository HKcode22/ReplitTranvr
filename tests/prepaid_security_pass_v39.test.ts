import { describe, expect, it } from "vitest";
import {
  buildPrepaidSecurityPassArtifact,
  verifyPrepaidSecurityPassArtifact,
} from "../server/lib/disruption/prepaidSecurityPass_v39";

describe("V3.9 prerequisite-P PASS artifact", () => {
  it("is self-hashed and bound to the current Plan and Phase-2 content scope", () => {
    const artifact = buildPrepaidSecurityPassArtifact({
      verifiedAtUtc: "2026-09-12T06:00:00Z",
      retentionDeploymentEvidenceRaw: '{"deployment":"fixture"}',
      phase2RetentionScopeEvidenceRaw: '{"phase2":"fixture"}',
    });
    expect(artifact.schema_version).toBe("v3.9-prepaid-security-retention-pass-2");
    expect(verifyPrepaidSecurityPassArtifact(artifact)).toBe(true);
    expect(artifact.phase2_prepaid_content_scope_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.artifact_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects tampering, stale inventory, or stale Phase-2 scope hashes", () => {
    const artifact = buildPrepaidSecurityPassArtifact({
      verifiedAtUtc: "2026-09-12T06:00:00Z",
      retentionDeploymentEvidenceRaw: '{"deployment":"fixture"}',
      phase2RetentionScopeEvidenceRaw: '{"phase2":"fixture"}',
    });
    expect(verifyPrepaidSecurityPassArtifact({ ...artifact, status: "BLOCKED" })).toBe(false);
    expect(verifyPrepaidSecurityPassArtifact({ ...artifact, provider_content_inventory_sha256: "0".repeat(64) })).toBe(false);
    expect(verifyPrepaidSecurityPassArtifact({ ...artifact, phase2_prepaid_content_scope_sha256: "1".repeat(64) })).toBe(false);
    expect(verifyPrepaidSecurityPassArtifact({ ...artifact, artifact_sha256: "f".repeat(64) })).toBe(false);
  });
});
