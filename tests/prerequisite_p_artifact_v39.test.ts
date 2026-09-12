import { describe, expect, it } from "vitest";
import {
  PREREQUISITE_P_REQUIRED_CHECKS,
  buildPrerequisitePArtifact,
  prerequisitePSecurityContractHash,
  verifyPrerequisitePArtifact,
} from "../server/lib/disruption/prerequisitePArtifact_v39";
import { RETENTION_MATRIX_HASH } from "../server/lib/disruption/retentionMatrix_v39";

const checks = PREREQUISITE_P_REQUIRED_CHECKS.map((name) => ({ name, pass: true, detail: `verified:${name}` }));

function artifact(contract = "a".repeat(64)) {
  return buildPrerequisitePArtifact({
    verifiedAtUtc: "2026-09-11T23:59:00Z",
    codeSha: "b".repeat(40),
    securityContractSha256: contract,
    retentionMatrixSha256: RETENTION_MATRIX_HASH,
    checks,
  });
}

describe("prerequisite-P durable closure artifact", () => {
  it("binds all five required checks and verifies its own hash", () => {
    const a = artifact();
    expect(a.schema_version).toBe("v3.9-prepaid-security-retention-2");
    expect(a.checks.map((c) => c.name)).toEqual([...PREREQUISITE_P_REQUIRED_CHECKS]);
    expect(verifyPrerequisitePArtifact(a, {
      securityContractSha256: "a".repeat(64),
      retentionMatrixSha256: RETENTION_MATRIX_HASH,
    }).pass).toBe(true);
  });

  it("fails closed if the security contract changes", () => {
    const verdict = verifyPrerequisitePArtifact(artifact(), {
      securityContractSha256: "c".repeat(64),
      retentionMatrixSha256: RETENTION_MATRIX_HASH,
    });
    expect(verdict.failures).toContain("security-contract-hash-mismatch");
  });

  it("does not invalidate only because an evidence/doc commit changes HEAD", () => {
    const a = artifact();
    const changedHeadOnly = { ...a, code_sha: "c".repeat(40) };
    // Changing the stored provenance SHA without recomputing the artifact hash
    // is still tampering and must fail.
    expect(verifyPrerequisitePArtifact(changedHeadOnly).failures).toContain("artifact-hash-mismatch");
    // The verifier intentionally has no expected code-SHA admission field;
    // admission is bound to the security-contract + matrix hashes instead.
    expect(verifyPrerequisitePArtifact(a, { securityContractSha256: "a".repeat(64) }).failures).not.toContain("code-sha-mismatch");
  });

  it("rejects a missing check or a tampered field", () => {
    const a = artifact();
    const missing = { ...a, checks: a.checks.slice(0, -1) };
    expect(verifyPrerequisitePArtifact(missing).pass).toBe(false);
    const tampered = { ...a, retention_matrix_sha256: "d".repeat(64) };
    expect(verifyPrerequisitePArtifact(tampered).failures).toContain("artifact-hash-mismatch");
  });

  it("computes a real contract hash over the current security owner files", () => {
    expect(prerequisitePSecurityContractHash()).toMatch(/^[a-f0-9]{64}$/);
  });
});
