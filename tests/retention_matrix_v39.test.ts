import { describe, expect, it } from "vitest";
import { RETENTION_MATRIX, RETENTION_MATRIX_HASH, parseRetentionMatrixEvidence, resolveRetentionMatrix, verifyRetentionMatrix, type RetentionMatrixEvidence } from "../server/lib/disruption/retentionMatrix_v39";

function validEvidenceFor(classification: string) {
  if (classification === "raw_api_content") return {
    retentionVerifiedDate: "2026-09-11", retentionSource: "AeroDataBox Terms verified 2026-09-11",
    retentionLegalBasis: "AeroDataBox Terms Article 5.5 raw_api_content",
    retentionPeriodDaysOrCondition: "7 days or longer only when Cache-Control max-age / applicable Plan Terms explicitly allow it",
    expiryAction: "HARD_DELETE provider raw content at expiry",
  };
  if (classification === "derived_work") return {
    retentionVerifiedDate: "2026-09-11", retentionSource: "AeroDataBox Terms verified 2026-09-11",
    retentionLegalBasis: "AeroDataBox Terms Article 5.6; non-trivial computational transformation; individual provider fields are non-reconstructable",
    retentionPeriodDaysOrCondition: "project research retention after verified Derived-Work transformation",
    expiryAction: "project lifecycle deletion",
  };
  if (classification === "external_source_content") return {
    retentionVerifiedDate: "2026-09-11", retentionSource: "external weather source terms verified",
    retentionLegalBasis: "source license permits research use and retention",
    retentionPeriodDaysOrCondition: "per source license/terms",
    expiryAction: "delete when source license or project lifecycle requires",
  };
  return {
    retentionVerifiedDate: "2026-09-11", retentionSource: "repository/data-lineage review",
    retentionLegalBasis: "non_aerodatabox_metadata; no provider content",
    retentionPeriodDaysOrCondition: "project metadata lifecycle", expiryAction: "project lifecycle deletion",
  };
}

describe("prerequisite-P retention matrix", () => {
  it("covers the corrected Phase-2 classes with stable hash and real FIDS owner", () => {
    expect(RETENTION_MATRIX.length).toBe(17);
    expect(RETENTION_MATRIX_HASH).toMatch(/^[a-f0-9]{64}$/);
    expect(RETENTION_MATRIX.find((r) => r.contentClass === "coverage_artifacts")?.contentClassification).toBe("non_aerodatabox_metadata");
    expect(RETENTION_MATRIX.find((r) => r.contentClass === "fids_population")?.tables).toContain("clean.fids_query_response");
    expect(RETENTION_MATRIX.find((r) => r.contentClass === "weather_source_content")?.contentClassification).toBe("external_source_content");
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

  it("passes complete evidence overlay while committed baseline stays UNVERIFIED", () => {
    const evidence: RetentionMatrixEvidence = {};
    for (const r of RETENTION_MATRIX) evidence[r.contentClass] = validEvidenceFor(r.contentClassification);
    const { rows, failures } = resolveRetentionMatrix(parseRetentionMatrixEvidence(JSON.stringify(evidence)));
    expect(failures).toEqual([]);
    expect(verifyRetentionMatrix(rows).pass).toBe(true);
    expect(verifyRetentionMatrix().pass).toBe(false);
  });

  it("rejects unknown/partial overlays", () => {
    const partial: RetentionMatrixEvidence = { webhook_raw_delivery: validEvidenceFor("raw_api_content"), invented_class: validEvidenceFor("non_aerodatabox_metadata") };
    const { rows, failures } = resolveRetentionMatrix(partial);
    expect(failures).toContain("unknown-content-class:invented_class");
    expect(verifyRetentionMatrix(rows).pass).toBe(false);
  });

  it("runtime evidence cannot override frozen content class, tables, or classification", () => {
    const evidence: any = {};
    for (const r of RETENTION_MATRIX) evidence[r.contentClass] = validEvidenceFor(r.contentClassification);
    evidence.webhook_raw_delivery = {
      ...evidence.webhook_raw_delivery,
      contentClass: "invented",
      tables: ["clean.fake"],
      contentClassification: "non_aerodatabox_metadata",
    };
    const { rows, failures } = resolveRetentionMatrix(evidence);
    expect(failures).toEqual([]);
    const row = rows.find((r) => r.contentClass === "webhook_raw_delivery")!;
    expect(row.contentClass).toBe("webhook_raw_delivery");
    expect(row.tables).toEqual(["clean.raw_delivery", "clean.raw_delivery_item"]);
    expect(row.contentClassification).toBe("raw_api_content");
  });

  it("rejects blanket 30-day evidence for raw provider content", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    filled.find((r) => r.contentClass === "webhook_raw_delivery")!.retentionPeriodDaysOrCondition = "30 days";
    expect(verifyRetentionMatrix(filled).failures).toContain("raw-retention-over-7d-without-provider-basis:webhook_raw_delivery");
  });

  it("rejects normalization-only Derived-Work claims", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    filled.find((r) => r.contentClass === "semantic_events")!.retentionLegalBasis = "AeroDataBox Terms Article 5.6; normalization alone";
    const verdict = verifyRetentionMatrix(filled);
    expect(verdict.failures).toContain("derived-nonreconstructability-unproven:semantic_events");
    expect(verdict.failures).toContain("derived-transformation-unproven:semantic_events");
  });

  it("rejects external source content without source license basis", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    filled.find((r) => r.contentClass === "weather_source_content")!.retentionLegalBasis = "documented somehow";
    expect(verifyRetentionMatrix(filled).failures).toContain("external-license-basis-unproven:weather_source_content");
  });

  it("rejects metadata claims that do not prove provider independence", () => {
    const filled = RETENTION_MATRIX.map((r) => ({ ...r, ...validEvidenceFor(r.contentClassification) }));
    filled.find((r) => r.contentClass === "manifests")!.retentionLegalBasis = "documented basis";
    expect(verifyRetentionMatrix(filled).failures).toContain("metadata-provider-independence-unproven:manifests");
  });
});
