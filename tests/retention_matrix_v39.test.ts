import { describe, expect, it } from "vitest";
import {
  RETENTION_MATRIX,
  RETENTION_MATRIX_HASH,
  parseRetentionMatrixEvidence,
  resolveRetentionMatrix,
  verifyRetentionMatrix,
  type RetentionMatrixEvidence,
  type RetentionMatrixRow,
} from "../server/lib/disruption/retentionMatrix_v39";

function validEvidenceFor(row: Pick<RetentionMatrixRow, "contentClass" | "contentClassification">) {
  if (row.contentClassification === "raw_api_content") {
    const fids = row.contentClass === "fids_population";
    return {
      retentionVerifiedDate: "2026-09-11",
      retentionSource: "AeroDataBox/provider plan terms verified 2026-09-11",
      retentionLegalBasis: "AeroDataBox Terms Article 5.5 raw_api_content; applicable provider/account plan term",
      retentionPeriodDaysOrCondition: fids
        ? "24 hours maximum under verified provider/account plan term"
        : "7 days maximum or shorter when applicable provider/account plan terms require it",
      expiryAction: "HARD_DELETE provider content at expiry",
    };
  }
  if (row.contentClassification === "derived_work") return {
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
  it("covers unique Phase-2 content classes with a stable hash", () => {
    expect(RETENTION_MATRIX.length).toBeGreaterThanOrEqual(19);
    expect(new Set(RETENTION_MATRIX.map((r) => r.contentClass)).size).toBe(RETENTION_MATRIX.length);
    expect(RETENTION_MATRIX_HASH).toMatch(/^[a-f0-9]{64}$/);
    expect(RETENTION_MATRIX.find((r) => r.contentClass === "coverage_artifacts")?.contentClassification).toBe("non_aerodatabox_metadata");
    expect(RETENTION_MATRIX.find((r) => r.contentClass === "fids_population")?.tables).toContain("clean.fids_query_response");
  });

  it("blocks while any retention evidence is UNVERIFIED", () => {
    const verdict = verifyRetentionMatrix();
    expect(verdict.pass).toBe(false);
    expect(verdict.failures.some((f) => f.startsWith("unverified:"))).toBe(true);
  });

  it("passes only with classification-compatible verified evidence per row", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r) }));
    expect(verifyRetentionMatrix(filled).pass).toBe(true);
  });

  it("passes with a complete runtime evidence overlay while the committed baseline stays UNVERIFIED", () => {
    const evidence: RetentionMatrixEvidence = {};
    for (const r of RETENTION_MATRIX) evidence[r.contentClass] = validEvidenceFor(r);
    const { rows, failures } = resolveRetentionMatrix(parseRetentionMatrixEvidence(JSON.stringify(evidence)));
    expect(failures).toEqual([]);
    expect(verifyRetentionMatrix(rows).pass).toBe(true);
    expect(verifyRetentionMatrix().pass).toBe(false);
  });

  it("rejects overlays with unknown content classes or partial evidence", () => {
    const ingress = RETENTION_MATRIX.find((r) => r.contentClass === "webhook_ingress")!;
    const partial: RetentionMatrixEvidence = {
      webhook_ingress: validEvidenceFor(ingress),
      invented_class: {
        retentionVerifiedDate: "2026-09-11",
        retentionSource: "repository/data-lineage review",
        retentionLegalBasis: "non_aerodatabox_metadata; no provider content",
        retentionPeriodDaysOrCondition: "project metadata lifecycle",
        expiryAction: "project lifecycle deletion",
      },
    };
    const { rows, failures } = resolveRetentionMatrix(partial);
    expect(failures).toContain("unknown-content-class:invented_class");
    expect(verifyRetentionMatrix(rows).pass).toBe(false);
  });

  it("rejects blanket 30-day evidence for raw provider content", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r) }));
    const raw = filled.find((r) => r.contentClass === "webhook_ingress")!;
    raw.retentionPeriodDaysOrCondition = "30 days";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("raw-retention-over-7d-without-provider-basis:webhook_ingress");
  });

  it("rejects FIDS evidence above the owner-verified 24-hour maximum", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r) }));
    const fids = filled.find((r) => r.contentClass === "fids_population")!;
    fids.retentionPeriodDaysOrCondition = "7 days under generic raw cache terms";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("fids-retention-over-24h:fids_population");
  });

  it("rejects FIDS evidence that omits a parseable 24-hour-or-shorter lifetime", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r) }));
    const fids = filled.find((r) => r.contentClass === "fids_population")!;
    fids.retentionPeriodDaysOrCondition = "short-lived according to provider policy";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("fids-retention-24h-unproven:fids_population");
  });

  it("rejects normalization-only Derived-Work claims", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r) }));
    const snapshots = filled.find((r) => r.contentClass === "pre_snapshots")!;
    snapshots.retentionLegalBasis = "AeroDataBox Terms Article 5.6; normalization alone";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("derived-nonreconstructability-unproven:pre_snapshots");
    expect(verdict.failures).toContain("derived-transformation-unproven:pre_snapshots");
  });

  it("rejects metadata claims that do not prove provider independence", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r) }));
    const frame = filled.find((r) => r.contentClass === "sampling_frame")!;
    frame.retentionLegalBasis = "documented basis";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.failures).toContain("metadata-provider-independence-unproven:sampling_frame");
  });
});
