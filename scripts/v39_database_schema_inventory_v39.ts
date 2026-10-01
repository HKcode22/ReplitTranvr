import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

const REQUIRED_CLEAN_TABLES = [
  // Core collection/accounting.
  "adb_collection_batches",
  "adb_collection_subs",
  "adb_probe_budget_day",
  "adb_incident_stop",

  // Raw-before-2xx and semantic pipeline.
  "raw_delivery",
  "raw_delivery_item",
  "processing_attempt",
  "flight_events",
  // Plan's conceptual current flight_state layer is implemented by this table.
  "flight_data_pre_post",

  // FIDS population/provenance.
  "fids_query_response",
  "flight_population",
  "adb_rest_budget_control",
  "adb_rest_attempt_ledger",

  // Airborne and cutoff-safe dataset layers.
  "raw_airborne_events",
  "clean_airborne_points",
  "flight_trajectory",
  "flight_airborne_snapshots",
  "flight_snapshots",
  "flight_outcomes",

  // Sampling frame / references.
  "adb_sampling_frame",
  "adb_sampling_frame_registry",

  // Historical/as-of features.
  "historical_feature_store",
  "historical_readiness",

  // Retention / provider-content / identity provenance.
  "retention_tombstone",
  "provider_content_blob_ref",
  "webhook_flight_identity",
  "webhook_flight_schedule_version",
  "webhook_identity_resolution",
  "population_research_membership",
  "population_research_outcome_link",

  // Phase-2G probe evidence.
  "adb_anchor_probe",
  "adb_probe_reconciliation_evidence",
  "prepaid_probe_session_runtime",
  "prepaid_probe_delivery_runtime",
  "prepaid_probe_item_runtime",

  // Phase-6 frozen calendar/admission/lifecycle/evidence.
  "adb_phase6_calendar_day",
  "adb_airport_sampling_state",
  "adb_sampling_draw",
  "adb_adaptive_state_history",
  "adb_collection_segments",
  "adb_phase6_authorization",
  "adb_phase6_admission_attempt",
  "adb_phase6_safety_heartbeat",
  "adb_phase6_settlement_evidence",
  "adb_budget_day_adjustment",
] as const;

const CRITICAL_COLUMNS: Record<string, readonly string[]> = {
  adb_anchor_probe: [
    "probe_id",
    "stage",
    "icao",
    "status",
    "window_start",
    "window_end",
    "duration_censored",
    "stop_reason",
    "runtime_session_id",
    "runtime_cleanup_verified_at_utc",
    "reconciliation_status",
    "provider_content_safe_mode",
    "confirmed_unique_lower_per_credit",
    "confirmed_plus_ambiguous_upper_per_credit",
    "metric_contract_version",
    "preprobe_artifact_sha256",
    "probe_budget_day_id",
  ],
  adb_probe_reconciliation_evidence: [
    "probe_id",
    "runtime_session_id",
    "stage",
    "icao",
    "evidence_status",
    "external_spend_credits",
    "internal_received_credits",
    "delivery_gap_credits",
    "delivery_completeness",
    "delivery_count",
    "notification_items_received",
    "callback_requests_seen",
    "callback_success_2xx",
    "callback_failures",
    "settlement_reads",
    "delivery_completeness_floor",
    "window_start_utc",
    "window_end_utc",
    "duration_censored",
    "stop_reason",
  ],
  prepaid_probe_session_runtime: [
    "session_id",
    "owner_kind",
    "owner_probe_id",
    "stage",
    "icao",
    "provider_subscription_id",
    "state",
    "created_at_utc",
    "expires_at_utc",
    "callback_requests_seen",
    "callback_success_2xx",
    "callback_failures",
  ],
  prepaid_probe_delivery_runtime: [
    "session_id",
    "delivery_id",
    "blob_ref_id",
    "raw_body_sha256",
    "provider_subscription_id",
    "received_at_utc",
    "delivery_attempt_seq_no",
    "delivery_attempt_utc",
    "delivery_attempt_cost_credits",
    "notification_items",
  ],
  prepaid_probe_item_runtime: [
    "session_id",
    "delivery_id",
    "item_index",
    "raw_item_sha256",
    "received_at_utc",
    "provider_flight_id",
    "callsign",
    "operating_carrier",
    "operating_flight_number",
    "origin_icao",
    "destination_icao",
    "scheduled_gate_out_utc",
    "flight_instance_id",
    "initial_service_date",
    "provisional_identity_key",
    "codeshare_resolution_status",
    "identity_resolution_status",
  ],
  flight_population: [
    "source_airport_icao",
    "window_start_utc",
    "window_end_utc",
    "cutoff_utc",
    "flight_number",
    "source_type",
    "population_query_id",
    "available_at",
  ],
  fids_query_response: [
    "population_query_id",
    "source_airport_icao",
    "query_direction",
    "service_window_start_utc",
    "service_window_end_utc",
    "airport_iana_timezone",
    "fids_retrieval_utc",
    "raw_persisted_at_utc",
    "available_at",
    "response_hash",
    "fids_protocol_version",
    "openapi_sha256",
  ],
  flight_snapshots: [
    "flight_instance_id",
    "prediction_state",
    "horizon",
    "prediction_cutoff_utc",
    "population_query_id",
  ],
  flight_outcomes: [
    "flight_instance_id",
    "flight_operational_state",
    "target",
    "label_status",
    "terminalizer_version",
  ],
  adb_sampling_frame: [
    "icao",
    "tier",
    "tier_source",
    "region",
    "pre_eligible",
    "post_eligible",
    "in_frame",
    "frame_version",
    "frame_hash",
  ],
  adb_phase6_authorization: [
    "authorization_id",
    "manifest_sha256",
    "calendar_hash",
    "config_hash",
    "code_sha",
    "schema_version",
    "phase6_start_date",
  ],
  adb_phase6_settlement_evidence: [
    "segment_id",
    "batch_id",
    "authorization_id",
    "config_hash",
    "evidence_status",
    "external_spend",
  ],
  provider_content_blob_ref: [
    "blob_ref_id",
    "source_kind",
    "source_record_id",
    "deletion_verified_at_utc",
  ],
};

function optional(name: string): string | null {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  return value || null;
}

async function main(): Promise<void> {
  const outArg = optional("--out");

  const relations = await pool.query(`
    SELECT
      n.nspname AS schema_name,
      c.relname AS relation_name,
      c.relkind,
      c.relpersistence,
      CASE c.relpersistence
        WHEN 'u' THEN 'UNLOGGED'
        WHEN 't' THEN 'TEMP'
        ELSE 'LOGGED'
      END AS persistence
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p','v','m')
      AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
    ORDER BY n.nspname,c.relname
  `);

  const columns = await pool.query(`
    SELECT
      table_schema,
      table_name,
      ordinal_position,
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema,table_name,ordinal_position
  `);

  const constraints = await pool.query(`
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      con.conname,
      con.contype,
      con.convalidated,
      pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class c ON c.oid=con.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY n.nspname,c.relname,con.conname
  `);

  const indexes = await pool.query(`
    SELECT schemaname,tablename,indexname,indexdef
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog','information_schema')
    ORDER BY schemaname,tablename,indexname
  `);

  const triggers = await pool.query(`
    SELECT
      event_object_schema AS schema_name,
      event_object_table AS table_name,
      trigger_name,
      event_manipulation,
      action_timing,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY event_object_schema,event_object_table,trigger_name,event_manipulation
  `);

  const functions = await pool.query(`
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_function_result(p.oid) AS result_type
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY n.nspname,p.proname,arguments
  `);

  const cleanTables = new Set(
    relations.rows
      .filter((r: any) => r.schema_name === "clean" && ["r","p"].includes(String(r.relkind)))
      .map((r: any) => String(r.relation_name)),
  );

  const missingTables = REQUIRED_CLEAN_TABLES.filter((name) => !cleanTables.has(name));

  const columnSets = new Map<string, Set<string>>();
  for (const row of columns.rows) {
    if (row.table_schema !== "clean") continue;
    if (!columnSets.has(row.table_name)) columnSets.set(row.table_name, new Set());
    columnSets.get(row.table_name)!.add(String(row.column_name));
  }

  const missingCriticalColumns: Array<{table:string; column:string}> = [];
  for (const [table, required] of Object.entries(CRITICAL_COLUMNS)) {
    const actual = columnSets.get(table) ?? new Set<string>();
    for (const column of required) {
      if (!actual.has(column)) missingCriticalColumns.push({ table, column });
    }
  }

  const runtimePersistence = Object.fromEntries(
    relations.rows
      .filter((r: any) =>
        r.schema_name === "clean" &&
        [
          "prepaid_probe_session_runtime",
          "prepaid_probe_delivery_runtime",
          "prepaid_probe_item_runtime",
        ].includes(String(r.relation_name)),
      )
      .map((r: any) => [String(r.relation_name), String(r.persistence)]),
  );

  const runtimeTablesAreUnlogged = [
    "prepaid_probe_session_runtime",
    "prepaid_probe_delivery_runtime",
    "prepaid_probe_item_runtime",
  ].every((name) => runtimePersistence[name] === "UNLOGGED");

  const managedSchemasObserved = [...new Set(
    relations.rows
      .map((r: any) => String(r.schema_name))
      .filter((s: string) => ["_system","drizzle","stripe"].includes(s)),
  )].sort();

  const report = {
    schema: "v39.database-schema-inventory.v1",
    generated_at_utc: new Date().toISOString(),
    read_only: true,
    plan_mapping: {
      conceptual_current_flight_state: "clean.flight_data_pre_post",
      note: "Do not create a duplicate flight_state table; migration 0025 maps the conceptual current-state layer to migration 0010.",
    },
    baseline_ownership: {
      project_owned_primary_schemas: ["clean","public"],
      externally_or_tool_managed_schemas_excluded_from_project_baseline: ["_system","drizzle","stripe"],
      managed_schemas_observed: managedSchemasObserved,
    },
    required_clean_table_count: REQUIRED_CLEAN_TABLES.length,
    missing_required_clean_tables: missingTables,
    missing_critical_columns: missingCriticalColumns,
    runtime_table_persistence: runtimePersistence,
    runtime_tables_are_unlogged: runtimeTablesAreUnlogged,
    verdict:
      missingTables.length === 0 &&
      missingCriticalColumns.length === 0 &&
      runtimeTablesAreUnlogged
        ? "PASS_CORE_V39_SCHEMA_INVENTORY"
        : "BLOCKED_SCHEMA_GAPS_OR_RUNTIME_PERSISTENCE",
    relations: relations.rows,
    columns: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
    triggers: triggers.rows,
    functions: functions.rows,
  };

  const raw = JSON.stringify(report, null, 2) + "\n";
  if (outArg) {
    const out = path.resolve(outArg);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, raw, "utf8");
    console.log(JSON.stringify({
      schema: report.schema,
      verdict: report.verdict,
      missing_required_clean_tables: missingTables,
      missing_critical_columns: missingCriticalColumns,
      runtime_table_persistence: runtimePersistence,
      report_file: path.relative(process.cwd(), out),
    }, null, 2));
  } else {
    console.log(raw);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.database-schema-inventory.v1",
    verdict: "AUDIT_FAILED",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => undefined);
});
