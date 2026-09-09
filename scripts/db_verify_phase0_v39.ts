/**
 * Phase-0 DB verification for current V3.9-f.8 schema 0047.
 * Read-only except a rolled-back proof transaction. Never performs a provider call.
 */
import pg from "pg";

interface Check { name: string; pass: boolean; detail: string }
const checks: Check[] = [];
function record(name: string, pass: boolean, detail: string): void {
  checks.push({ name, pass, detail });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ${name} — ${detail}`);
}

const REQUIRED_TABLES = [
  "clean.raw_delivery",
  "clean.raw_delivery_item",
  "clean.processing_attempt",
  "clean.webhook_identity_resolution",
  "clean.webhook_flight_identity",
  "clean.webhook_flight_schedule_version",
  "clean.flight_population",
  "clean.flight_events",
  "clean.flight_data_pre_post",
  "clean.flight_snapshots",
  "clean.flight_airborne_snapshots",
  "clean.flight_outcomes",
  "clean.historical_feature_store",
  "clean.adb_ingest_events",
  "clean.adb_collection_batches",
  "clean.adb_collection_segments",
  "clean.adb_sampling_frame",
  "clean.adb_sampling_frame_registry",
  "clean.adb_phase6_calendar_day",
  "clean.adb_airport_sampling_state",
  "clean.adb_sampling_draw",
  "clean.adb_adaptive_state_history",
  "clean.adb_phase6_authorization",
  "clean.adb_phase6_admission_attempt",
  "clean.adb_phase6_safety_heartbeat",
  "clean.adb_phase6_settlement_evidence",
  "clean.adb_budget_day_adjustment",
  "clean.adb_anchor_probe",
  "clean.adb_probe_budget_day",
  "clean.airborne_quarantine",
  "clean.airborne_eligibility_evidence",
  "clean.adb_incident_stop",
];

const REQUIRED_COLUMNS = [
  "clean.raw_delivery:delivery_id",
  "clean.raw_delivery:raw_body_sha256",
  "clean.raw_delivery:received_at_utc",
  "clean.raw_delivery:notification_id",
  "clean.raw_delivery:provider_notification_generated_utc",
  "clean.raw_delivery:delivery_attempt_seq_no",
  "clean.raw_delivery:delivery_attempt_utc",
  "clean.raw_delivery:delivery_attempt_cost_credits",
  "clean.raw_delivery:adb_cost_credits",
  "clean.raw_delivery_item:delivery_id",
  "clean.raw_delivery_item:item_index",
  "clean.processing_attempt:delivery_id",
  "clean.webhook_identity_resolution:resolution_status",
  "clean.webhook_identity_resolution:flight_instance_id",
  "clean.webhook_identity_resolution:initial_service_date",
  "clean.flight_trajectory:flight_instance_id",
  "clean.flight_airborne_snapshots:flight_instance_id",
  "clean.flight_airborne_snapshots:prediction_cutoff_utc",
  "clean.flight_airborne_snapshots:trajectory_prefix_hash",
  "clean.airborne_eligibility_evidence:population_query_id",
  "clean.airborne_eligibility_evidence:evidence_available_at",
  "clean.adb_phase6_calendar_day:scheduled_start_utc",
  "clean.adb_phase6_calendar_day:active_duration_minutes",
  "clean.adb_phase6_calendar_day:frame_hash",
  "clean.adb_phase6_authorization:start_admission_tolerance_seconds",
  "clean.adb_phase6_authorization:phase6_alert_spend_ceiling",
  "clean.adb_phase6_authorization:daily_soft_stop_margin_credits",
  "clean.adb_phase6_authorization:production_reconcile_tolerance_credits",
  "clean.adb_phase6_authorization:safety_watchdog_poll_ms",
  "clean.adb_phase6_authorization:settlement_initial_wait_seconds",
  "clean.adb_phase6_authorization:settlement_poll_interval_seconds",
  "clean.adb_phase6_authorization:settlement_stable_read_count",
  "clean.adb_phase6_authorization:settlement_timeout_seconds",
  "clean.adb_collection_batches:phase6_authorization_id",
  "clean.adb_collection_batches:sampling_state_hash",
  "clean.adb_collection_subs:segment_id",
  "clean.adb_phase6_safety_heartbeat:updated_at_utc",
  "clean.adb_phase6_settlement_evidence:evidence_status",
  "clean.adb_phase6_settlement_evidence:reconcile_tolerance",
  "clean.adb_budget_day_adjustment:overshoot_credits",
  "clean.adb_anchor_probe:confirmed_unique_lower",
  "clean.adb_anchor_probe:confirmed_plus_ambiguous_upper",
  "clean.adb_anchor_probe:preprobe_artifact_sha256",
  "clean.adb_anchor_probe:probe_budget_day_id",
  "clean.adb_anchor_probe:reserved_credits",
  "clean.adb_anchor_probe:internal_send_credits",
  "clean.adb_anchor_probe:stability_status",
];

const REQUIRED_TRIGGERS = [
  "trg_webhook_identity_resolution_immutable",
  "trg_guard_phase6_parent_start_time",
  "trg_probe_create_uncertainty_stop",
  "trg_phase6_create_uncertainty_stop",
  "trg_phase6_settlement_evidence_immutable",
  "trg_require_phase6_settlement_evidence",
  "trg_apply_phase6_budget_limits",
  "trg_mark_phase6_hard_cap_mismatch",
  "trg_record_phase6_hard_cap_overshoot",
  "trg_propagate_incident_to_phase6_failure",
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set — refusing to run.");
    process.exit(2);
  }
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 15000 });
  try {
    const v = await pool.query("SELECT version()");
    record("connectivity", true, v.rows[0].version.split(" ").slice(0, 2).join(" "));

    const tables = await pool.query(
      "SELECT schemaname || '.' || tablename AS fqn FROM pg_tables WHERE schemaname IN ('clean','public') ORDER BY 1",
    );
    const names = new Set<string>(tables.rows.map((r: any) => r.fqn));
    record("table-inventory", true, `${names.size} tables`);
    for (const table of REQUIRED_TABLES) record(`table:${table}`, names.has(table), names.has(table) ? "present" : "MISSING");

    const cols = await pool.query(
      "SELECT table_schema || '.' || table_name AS t,column_name FROM information_schema.columns WHERE table_schema='clean'",
    );
    const colSet = new Set(cols.rows.map((r: any) => `${r.t}:${r.column_name}`));
    for (const need of REQUIRED_COLUMNS) record(`column:${need}`, colSet.has(need), colSet.has(need) ? "present" : "MISSING");

    const idx = await pool.query(
      "SELECT schemaname||'.'||tablename AS t,indexname,indexdef FROM pg_indexes WHERE schemaname='clean'",
    );
    const indexText = idx.rows.map((r: any) => `${r.indexname}:${r.indexdef}`).join(" | ");
    record("unique:trajectory-canonical", /uq_flight_trajectory_canonical.*flight_instance_id/i.test(indexText), "canonical trajectory unique index");
    record("unique:airborne-snapshot-canonical", /uq_airborne_snapshot_canonical_observation.*flight_instance_id.*event_timestamp/i.test(indexText), "canonical observation unique index");
    record("unique:webhook-notification-attempt", /uq_raw_delivery_notification_attempt.*notification_id.*delivery_attempt_seq_no/i.test(indexText), "provider notification/attempt retry identity");
    record("unique:budget-adjustment-target", /uq_budget_adjustment_target.*target_run_day_index/i.test(indexText), "one compensating adjustment per target run day");

    const old = await pool.query(
      "SELECT conname FROM pg_constraint WHERE conname IN ('flight_trajectory_key','airborne_snapshot_key')",
    );
    record("legacy-airborne-unique-removed", old.rowCount === 0, old.rowCount === 0 ? "removed" : "legacy constraints still active");

    const triggers = await pool.query(
      `SELECT tgname FROM pg_trigger t
        JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='clean' AND NOT t.tgisinternal`,
    );
    const triggerSet = new Set<string>(triggers.rows.map((r: any) => r.tgname));
    for (const trigger of REQUIRED_TRIGGERS) record(`trigger:${trigger}`, triggerSet.has(trigger), triggerSet.has(trigger) ? "present" : "MISSING");

    const cause = await pool.query(
      `SELECT pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid='clean.adb_incident_stop'::regclass
          AND conname='adb_incident_stop_cause_check_v3'`,
    );
    const causeDef = String(cause.rows[0]?.def ?? "");
    const causesOk = ["authentication","raw-persistence","persistence","reconciliation","deletion","segment_activation"]
      .every((x) => causeDef.includes(x));
    record("incident-cause-contract", causesOk, causesOk ? "all current incident classes accepted" : causeDef || "constraint missing");

    const safetyConstraint = await pool.query(
      `SELECT conname,pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid='clean.adb_phase6_authorization'::regclass
          AND conname IN ('adb_phase6_authorization_safety_values','adb_phase6_soft_margin_covers_unsettled','adb_phase6_authorization_base_cap_1900')`,
    );
    const safetyText = safetyConstraint.rows.map((x: any) => `${x.conname}:${x.def}`).join(" | ");
    record("phase6-safety-constraint-set", safetyConstraint.rowCount === 3, safetyText || "missing constraints");
    record("phase6-run-cap-max-57900", safetyText.includes("57900"), safetyText || "missing 57900 bound");
    record("phase6-daily-base-cap-1900", safetyText.includes("1900"), safetyText || "missing 1900 bound");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const id = `verify_${Date.now()}`;
      await client.query(
        `INSERT INTO clean.raw_delivery
         (delivery_id,subscription_id,http_method,raw_body,raw_body_sha256,processing_outcome,notification_items)
         VALUES($1,'verify','POST','{}'::jsonb,$2,'pending',0)`,
        [id, "a".repeat(64)],
      );
      await client.query(
        `INSERT INTO clean.raw_delivery_item
         (delivery_id,item_index,raw_item,raw_item_sha256,parsing_outcome)
         VALUES($1,0,'{}'::jsonb,$2,'pending')`,
        [id, "b".repeat(64)],
      );
      await client.query(
        `INSERT INTO clean.processing_attempt
         (delivery_id,attempt_index,parser_version,outcome,items_received,items_parsed,
          items_stored,items_skipped,items_failed,research_events_appended,ingest_event_written)
         VALUES($1,0,'verify','success',1,1,1,0,0,false,false)`,
        [id],
      );
      await client.query(
        `INSERT INTO clean.webhook_identity_resolution
         (delivery_id,item_index,raw_item_sha256,resolution_status,reason)
         VALUES($1,0,$2,'quarantined','verification-row')`,
        [id, "b".repeat(64)],
      );
      const [a, b, p, q] = await Promise.all([
        client.query("SELECT 1 FROM clean.raw_delivery WHERE delivery_id=$1", [id]),
        client.query("SELECT 1 FROM clean.raw_delivery_item WHERE delivery_id=$1", [id]),
        client.query("SELECT 1 FROM clean.processing_attempt WHERE delivery_id=$1", [id]),
        client.query("SELECT 1 FROM clean.webhook_identity_resolution WHERE delivery_id=$1", [id]),
      ]);
      record("raw-before-semantic-ordering", a.rowCount === 1 && b.rowCount === 1 && p.rowCount === 1 && q.rowCount === 1, "delivery→item→identity/attempt readable inside rolled-back proof transaction");

      let immutable = false;
      try {
        await client.query("UPDATE clean.webhook_identity_resolution SET reason='changed' WHERE delivery_id=$1 AND item_index=0", [id]);
      } catch { immutable = true; }
      record("identity-resolution-append-only", immutable, immutable ? "mutation rejected" : "MUTATION WAS ALLOWED");

      await client.query("ROLLBACK");
      record("rollback-no-junk-rows", true, "rolled back proof transaction");
    } catch (e: any) {
      try { await client.query("ROLLBACK"); } catch {}
      record("raw-before-semantic-ordering", false, e?.message ?? String(e));
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  const failed = checks.filter((x) => !x.pass);
  console.log(`\nRESULT: ${checks.length - failed.length}/${checks.length} checks PASS`);
  if (failed.length) {
    for (const x of failed) console.log(`  - ${x.name}: ${x.detail}`);
    process.exit(1);
  }
  console.log("ALL DB CHECKS PASS for current Phase-0 schema 0047.");
}

main().catch((e: any) => {
  console.error("db_verify_phase0_v39 failed:", e?.message ?? e);
  process.exit(1);
});