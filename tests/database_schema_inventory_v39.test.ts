import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const audit = readFileSync(
  join(root, "scripts", "v39_database_schema_inventory_v39.ts"),
  "utf8",
);

describe("V3.9 database schema inventory contract", () => {
  it("covers the binding Plan data layers", () => {
    for (const table of [
      "raw_delivery",
      "raw_delivery_item",
      "processing_attempt",
      "flight_events",
      "flight_data_pre_post",
      "fids_query_response",
      "flight_population",
      "raw_airborne_events",
      "clean_airborne_points",
      "flight_trajectory",
      "flight_airborne_snapshots",
      "flight_snapshots",
      "flight_outcomes",
      "adb_sampling_frame",
      "historical_feature_store",
      "retention_tombstone",
      "provider_content_blob_ref",
    ]) {
      expect(audit).toContain(`"${table}"`);
    }
  });

  it("covers Phase-2G probe evidence and requires UNLOGGED scratch tables", () => {
    for (const table of [
      "adb_anchor_probe",
      "adb_probe_reconciliation_evidence",
      "prepaid_probe_session_runtime",
      "prepaid_probe_delivery_runtime",
      "prepaid_probe_item_runtime",
    ]) {
      expect(audit).toContain(`"${table}"`);
    }
    expect(audit).toContain('runtime_tables_are_unlogged');
    expect(audit).toContain('runtimePersistence[name] === "UNLOGGED"');
  });

  it("covers Phase-6 admission, lifecycle, and settlement evidence", () => {
    for (const table of [
      "adb_phase6_calendar_day",
      "adb_collection_segments",
      "adb_phase6_authorization",
      "adb_phase6_admission_attempt",
      "adb_phase6_safety_heartbeat",
      "adb_phase6_settlement_evidence",
      "adb_budget_day_adjustment",
    ]) {
      expect(audit).toContain(`"${table}"`);
    }
  });

  it("maps the Plan's conceptual current flight_state to flight_data_pre_post", () => {
    expect(audit).toContain(
      'conceptual_current_flight_state: "clean.flight_data_pre_post"',
    );
    expect(audit).toContain(
      "Do not create a duplicate flight_state table",
    );
  });

  it("keeps provider/tool-managed schemas outside the project-owned baseline", () => {
    expect(audit).toContain(
      'externally_or_tool_managed_schemas_excluded_from_project_baseline',
    );
    for (const schema of ["_system", "drizzle", "stripe"]) {
      expect(audit).toContain(`"${schema}"`);
    }
  });

  it("inventories tables, columns, constraints, indexes, triggers, functions, sequences and user types", () => {
    for (const token of [
      "relations:",
      "columns:",
      "constraints:",
      "indexes:",
      "triggers:",
      "functions:",
      "sequences:",
      "user_defined_types:",
    ]) {
      expect(audit).toContain(token);
    }
  });
});
