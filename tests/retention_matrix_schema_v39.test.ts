import { describe, expect, it } from "vitest";
import { RETENTION_MATRIX } from "../server/lib/disruption/retentionMatrix_v39";

const byClass = new Map(RETENTION_MATRIX.map((row) => [row.contentClass, row]));
const allTables = RETENTION_MATRIX.flatMap((row) => [...row.tables]);

describe("V3.9 retention matrix schema contract", () => {
  it("contains no superseded or nonexistent storage names discovered by the P audit", () => {
    expect(allTables).not.toContain("clean.flight_state");
    expect(allTables).not.toContain("clean.raw_fids_query");
    expect(allTables).not.toContain("clean.anchor_probe_results");
    expect(allTables).not.toContain("clean.final_manifest");

    expect(byClass.get("fids_population")?.tables).toContain("clean.fids_query_response");
    expect(byClass.get("probe_ledger_mixed")?.tables).toContain("clean.adb_anchor_probe");
  });

  it("keeps mixed tables raw at table level until copied provider columns have their own expiry", () => {
    for (const contentClass of [
      "webhook_ingest_ledger_mixed",
      "semantic_events_mixed",
      "airborne_clean_mixed",
      "airborne_snapshots_mixed",
      "probe_ledger_mixed",
      "collection_batch_ledger_mixed",
    ]) {
      expect(byClass.get(contentClass)?.contentClassification).toBe("raw_api_content");
    }
  });

  it("uses Derived Work only for explicit candidate output classes", () => {
    const derived = RETENTION_MATRIX
      .filter((row) => row.contentClassification === "derived_work")
      .map((row) => row.contentClass)
      .sort();
    expect(derived).toEqual(["history_weather", "outcomes", "pre_snapshots"]);
  });

  it("keeps project metadata classes separate from provider-bearing account/probe rows", () => {
    expect(byClass.get("sampling_frame")?.contentClassification).toBe("non_aerodatabox_metadata");
    expect(byClass.get("rest_attempt_ledger")?.contentClassification).toBe("non_aerodatabox_metadata");
    expect(byClass.get("retention_audit")?.contentClassification).toBe("non_aerodatabox_metadata");
    expect(byClass.get("probe_ledger_mixed")?.contentClassification).not.toBe("non_aerodatabox_metadata");
    expect(byClass.get("collection_batch_ledger_mixed")?.contentClassification).not.toBe("non_aerodatabox_metadata");
  });
});
