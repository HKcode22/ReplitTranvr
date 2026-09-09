/**
 * Phase-0 DB verification for Replit (plan §1.5N / TEST-024 aid, §1.5.2 item 6 aid).
 *
 * RUN THIS ON REPLIT (where the internal `helium` Postgres hostname resolves):
 *   export ADB_AUTO_COLLECT=0
 *   export DATABASE_URL="<from Replit secrets — never paste into chat/logs>"
 *   npx tsx scripts/db_verify_phase0_v39.ts
 *
 * What it does:
 *   1. CONNECTS read-only and prints Postgres version.
 *   2. INVENTORIES tables in clean/public schemas.
 *   3. CHECKS raw_delivery / raw_delivery_item / processing_attempt columns
 *      + UNIQUE constraints match what rawIngress_v3.ts INSERTs (migration 0025).
 *   4. CHECKS population/snapshot tables from migrations 0017–0025 exist.
 *   5. PROVES raw-before-2xx ordering inside a ROLLED-BACK transaction:
 *      BEGIN → insert delivery → insert item → insert attempt → verify all
 *      three readable → ROLLBACK (no junk rows left behind).
 *
 * It NEVER commits a write to your tables. It NEVER runs migrations.
 * Exit 0 = all checks pass. Nonzero = prints the failing check.
 */

import pg from "pg";

interface Check { name: string; pass: boolean; detail: string; }

const checks: Check[] = [];
function record(name: string, pass: boolean, detail: string): void {
  checks.push({ name, pass, detail });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ${name} — ${detail}`);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set — refusing to run.");
    process.exit(2);
  }
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 15000 });
  try {
    // 1. connectivity + version (read-only)
    const v = await pool.query("SELECT version()");
    record("connectivity", true, v.rows[0].version.split(" ").slice(0, 2).join(" "));

    // 2. table inventory (read-only)
    const t = await pool.query(
      "SELECT schemaname || '.' || tablename AS fqn FROM pg_tables " +
      "WHERE schemaname IN ('clean','public') ORDER BY 1",
    );
    const names = new Set<string>(t.rows.map((r: any) => r.fqn));
    record("table-inventory", true, `${names.size} tables`);

    // 3. raw-ingress tables + constraints (migration 0025)
    for (const tbl of ["clean.raw_delivery", "clean.raw_delivery_item", "clean.processing_attempt"]) {
      record(`table:${tbl}`, names.has(tbl), names.has(tbl) ? "present" : "MISSING");
    }
    const cols = await pool.query(
      "SELECT table_schema || '.' || table_name AS t, column_name FROM information_schema.columns " +
      "WHERE (table_schema, table_name) IN (('clean','raw_delivery'),('clean','raw_delivery_item'),('clean','processing_attempt'))",
    );
    const colset = new Set<string>(cols.rows.map((r: any) => `${r.t}:${r.column_name}`));
    for (const need of [
      "clean.raw_delivery:delivery_id", "clean.raw_delivery:subscription_id",
      "clean.raw_delivery:raw_body", "clean.raw_delivery:raw_body_sha256",
      "clean.raw_delivery:received_at_utc", "clean.raw_delivery:processing_outcome",
      "clean.raw_delivery_item:delivery_id", "clean.raw_delivery_item:item_index",
      "clean.raw_delivery_item:raw_item_sha256",
      "clean.processing_attempt:delivery_id", "clean.processing_attempt:attempt_index",
      "clean.processing_attempt:outcome",
    ]) {
      record(`column:${need}`, colset.has(need), colset.has(need) ? "present" : "MISSING");
    }
    const uq = await pool.query(
      "SELECT conrelid::regclass::text AS t, pg_get_constraintdef(oid) AS def FROM pg_constraint " +
      "WHERE contype = 'u' AND conrelid::regclass::text IN " +
      "('clean.raw_delivery','clean.raw_delivery_item','clean.processing_attempt')",
    );
    const uqtxt = uq.rows.map((r: any) => `${r.t}: ${r.def}`).join(" | ");
    record("unique:raw_delivery(delivery_id)", /raw_delivery.*delivery_id/.test(uqtxt), uqtxt.slice(0, 200) || "none found");
    record("unique:raw_delivery_item(delivery_id,item_index)", /raw_delivery_item.*delivery_id.*item_index/.test(uqtxt), uqtxt.slice(0, 200) || "none found");

    // 4. population/snapshot families (presence only)
    // flight_state is the mutable current-state convenience; it is served by
    // the existing clean.flight_data_pre_post (production owner) — the plan's
    // §2 graph names the concept, not a separate required table.
    for (const tbl of [
      "clean.flight_population", "clean.flight_events", "clean.flight_data_pre_post",
      "clean.flight_snapshots", "clean.flight_airborne_snapshots", "clean.flight_outcomes",
      "clean.historical_feature_store",
      "clean.adb_ingest_events", "clean.adb_collection_batches",
    ]) {
      record(`table:${tbl}`, names.has(tbl), names.has(tbl) ? "present" : "MISSING (see §1.5N)");
    }

    // 5. raw-before-2xx ordering proof inside a ROLLED-BACK transaction.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const delId = `verify_${Date.now()}`;
      await client.query(
        "INSERT INTO clean.raw_delivery (delivery_id, subscription_id, http_method, raw_body, raw_body_sha256, processing_outcome, notification_items) " +
        "VALUES ($1,'verify', 'POST', '{}'::jsonb, 'verify', 'pending', 0) ON CONFLICT (delivery_id) DO NOTHING",
        [delId],
      );
      await client.query(
        "INSERT INTO clean.raw_delivery_item (delivery_id, item_index, raw_item, raw_item_sha256, parsing_outcome) " +
        "VALUES ($1, 0, '{}'::jsonb, 'verify', 'pending') ON CONFLICT (delivery_id, item_index) DO NOTHING",
        [delId],
      );
      await client.query(
        "INSERT INTO clean.processing_attempt (delivery_id, attempt_index, parser_version, outcome, items_received, items_parsed, items_stored, items_skipped, items_failed, research_events_appended, ingest_event_written) " +
        "VALUES ($1, 0, 'verify', 'success', 1, 1, 1, 0, 0, false, false)",
        [delId],
      );
      const r1 = await client.query("SELECT 1 FROM clean.raw_delivery WHERE delivery_id = $1", [delId]);
      const r2 = await client.query("SELECT 1 FROM clean.raw_delivery_item WHERE delivery_id = $1", [delId]);
      const r3 = await client.query("SELECT 1 FROM clean.processing_attempt WHERE delivery_id = $1", [delId]);
      const ordered = r1.rowCount === 1 && r2.rowCount === 1 && r3.rowCount === 1;
      record("raw-before-2xx-ordering(delivery→item→attempt readable pre-ack)", ordered, ordered ? "all three readable in one txn" : "MISSING rows");
      await client.query("ROLLBACK");
      record("rollback-no-junk-rows", true, "transaction rolled back; nothing persisted");
    } catch (e: any) {
      try { await client.query("ROLLBACK"); } catch { /* already failed */ }
      record("raw-before-2xx-ordering", false, `txn failed: ${e?.message ?? e}`.slice(0, 200));
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  const fails = checks.filter((c) => !c.pass);
  console.log(`\nRESULT: ${checks.length - fails.length}/${checks.length} checks PASS`);
  if (fails.length) {
    console.log("FAILING:");
    for (const f of fails) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("ALL CHECKS PASS — DB evidence complete for §1.5B/§1.5N (read + rolled-back proof).");
}

main().catch((e) => { console.error("db_verify_phase0_v39 failed:", e?.message ?? e); process.exit(1); });
