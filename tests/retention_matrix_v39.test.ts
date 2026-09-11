import { describe, expect, it } from "vitest";
import { RETENTION_MATRIX, RETENTION_MATRIX_HASH, parseRetentionMatrixEvidence, resolveRetentionMatrix, verifyRetentionMatrix, type RetentionMatrixEvidence } from "../server/lib/disruption/retentionMatrix_v39";

function validEvidenceFor(classification: string) {
  if (classification === "raw_api_content") return {
    retentionVerifiedDate: "2026-09-11",
    retentionSource: "AeroDataBox Terms verified 2026-09-11",
    retentionLegalBasis: "AeroDataBox Terms Article 5.5 raw_api_content",
    retentionPeriodDaysOrCondition: "7 days or longer only when Cache-Control max-age / applicable Plan Terms explicitly allow it",
    expiryAction: "HARD_DELETE provider raw content at expiry",
  };
  if (classification === "derived_work") return {
    retentionVerifiedDate: "2026-09-11",
    retentionSource: "AeroDataBox Terms verified 2026-09-11",
    retentionLegalBasis: "AeroDataBox Terms Article 5.6; non-trivial computational transformation; individual provider fields are non-reconstructable",
    retentionPeriodDaysOrCondition: "project research retention after verified Derived-Work transformation",
    expiryAction: "project lifecycle deletion",
  };
  return {
    retentionVerifiedDate: "2026-09-11",
    retentionSource: "repository/data-lineage review",
    retentionLegalBasis: "non_aerodatabox_metadata; no provider content",
    retentionPeriodDaysOrCondition: "project metadata lifecycle",
    expiryAction: "project lifecycle deletion",
  };
}

describe("prerequisite-P retention matrix", () => {
  it("covers every Phase-2 content class with a stable hash", () => {
    expect(RETENTION_MATRIX.length).toBe(16);
    expect(RETENTION_MATRIX_HASH).toMatch(/^[a-f0-9]{64}$/);
    expect(RETENTION_MATRIX.find((r) => r.contentClass === "coverage_artifacts")?.contentClassification).toBe("raw_api_content");
  });

  it("blocks while any retention evidence is UNVERIFIED", () => {
    const verdict = verifyRetentionMatrix();
    expect(verdict.pass).toBe(false);
    expect(verdict.failures.some((f) => f.startsWith("unverified:"))).toBe(true);
  });

  it("passes only with classification-compatible verified evidence per row", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    expect(verifyRetentionMatrix(filled).pass).toBe(true);
  });

  it("passes with a complete runtime evidence overlay while the committed baseline stays UNVERIFIED", () => {
    const evidence: RetentionMatrixEvidence = {};
    for (const r of RETENTION_MATRIX) evidence[r.contentClass] = validEvidenceFor(r.contentClassification);
    const { rows, failures } = resolveRetentionMatrix(parseRetentionMatrixEvidence(JSON.stringify(evidence)));
    expect(failures).toEqual([]);
    expect(verifyRetentionMatrix(rows).pass).toBe(true);
    expect(verifyRetentionMatrix().pass).toBe(false);
  });

  it("rejects overlays with unknown content classes or partial evidence", () => {
    const partial: RetentionMatrixEvidence = {
      webhook_raw_delivery: validEvidenceFor("raw_api_content"),
      invented_class: validEvidenceFor("non_aerodatabox_metadata"),
    };
    const { rows, failures } = resolveRetentionMatrix(partial);
    expect(failures).toContain("unknown-content-class:invented_class");
    expect(verifyRetentionMatrix(rows).pass).toBe(false);
  });

  it("rejects blanket 30-day evidence for raw provider content", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    const raw = filled.find((r) => r.contentClass === "webhook_raw_delivery")!;
    raw.retentionPeriodDaysOrCondition = "30 days";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("raw-retention-over-7d-without-provider-basis:webhook_raw_delivery");
  });

  it("rejects normalization-only Derived-Work claims", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    const semantic = filled.find((r) => r.contentClass === "semantic_events")!;
    semantic.retentionLegalBasis = "AeroDataBox Terms Article 5.6; normalization alone";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("derived-nonreconstructability-unproven:semantic_events");
    expect(verdict.failures).toContain("derived-transformation-unproven:semantic_events");
  });

  it("rejects metadata claims that do not prove provider independence", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    const manifest = filled.find((r) => r.contentClass === "manifests")!;
    manifest.retentionLegalBasis = "documented basis";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.failures).toContain("metadata-provider-independence-unproven:manifests");
  });
});
