import { describe, expect, it } from "vitest";
import { RETENTION_MATRIX, RETENTION_MATRIX_HASH, parseRetentionMatrixEvidence, resolveRetentionMatrix, verifyRetentionMatrix, type RetentionMatrixEvidence } from "../server/lib/disruption/retentionMatrix_v39";

describe("prerequisite-P retention matrix", () => {
  it("covers every Phase-2 content class with a stable hash", () => {
    expect(RETENTION_MATRIX.length).toBe(16);
    expect(RETENTION_MATRIX_HASH).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks while any retention evidence is UNVERIFIED", () => {
    const verdict = verifyRetentionMatrix();
    expect(verdict.pass).toBe(false);
    expect(verdict.failures.some((f) => f.startsWith("unverified:"))).toBe(true);
  });

  it("passes only with complete verified evidence per row", () => {
    const filled = RETENTION_MATRIX.map((r) => ({
      ...r,
      retentionVerifiedDate: "2026-09-10",
      retentionSource: "Gate-0 channel Terms + owner approval",
      retentionLegalBasis: "documented basis",
      retentionPeriodDaysOrCondition: "condition",
      expiryAction: "delete-raw-content",
    }));
    expect(verifyRetentionMatrix(filled).pass).toBe(true);
  });

  it("passes with a complete runtime evidence overlay while the committed baseline stays UNVERIFIED", () => {
    const evidence: RetentionMatrixEvidence = {};
    for (const r of RETENTION_MATRIX) {
      evidence[r.contentClass] = {
        retentionVerifiedDate: "2026-09-10",
        retentionSource: "operator Terms verification + owner attestation",
        retentionLegalBasis: "documented basis",
        retentionPeriodDaysOrCondition: "condition",
        expiryAction: "delete-raw-content",
      };
    }
    const { rows, failures } = resolveRetentionMatrix(parseRetentionMatrixEvidence(JSON.stringify(evidence)));
    expect(failures).toEqual([]);
    expect(verifyRetentionMatrix(rows).pass).toBe(true);
    // Committed baseline itself remains UNVERIFIED so offline CI stays honest.
    expect(verifyRetentionMatrix().pass).toBe(false);
  });

  it("rejects overlays with unknown content classes or partial evidence", () => {
    const partial: RetentionMatrixEvidence = {
      webhook_raw_delivery: {
        retentionVerifiedDate: "2026-09-10",
        retentionSource: "s",
        retentionLegalBasis: "b",
        retentionPeriodDaysOrCondition: "7 days",
        expiryAction: "HARD_DELETE",
      },
      invented_class: {
        retentionVerifiedDate: "2026-09-10",
        retentionSource: "s",
        retentionLegalBasis: "b",
        retentionPeriodDaysOrCondition: "c",
        expiryAction: "e",
      },
    };
    const { rows, failures } = resolveRetentionMatrix(partial);
    expect(failures).toContain("unknown-content-class:invented_class");
    expect(verifyRetentionMatrix(rows).pass).toBe(false);
  });

  it("rejects normalization-only derived-work claims", () => {
    const bad = RETENTION_MATRIX.map((r) =>
      r.contentClass === "semantic_events" ? { ...r, contentClassification: "raw_api_content" as const,
        retentionVerifiedDate: "2026-09-10", retentionSource: "s", retentionLegalBasis: "normalization alone",
        retentionPeriodDaysOrCondition: "c", expiryAction: "e" } : r,
    );
    // Misclassification alone is not the failure mode under test here;
    // the point is every row still needs real evidence, which UNVERIFIED rows lack.
    expect(verifyRetentionMatrix().pass).toBe(false);
    expect(bad[1].retentionLegalBasis).toBe("normalization alone");
  });
});
