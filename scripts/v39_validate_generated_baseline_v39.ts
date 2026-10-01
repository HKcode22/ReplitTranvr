import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 ? String(process.argv[i + 1] ?? fallback) : fallback;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fail(errors: string[]): never {
  console.error(JSON.stringify({
    schema: "v39.schema-baseline-static-validation.v1",
    verdict: "FAIL",
    errors,
  }, null, 2));
  process.exit(1);
}

const root = process.cwd();
const baselinePath = path.resolve(root, arg("--baseline", "migrations/baseline/B0062__v39_schema_baseline_20261001.sql"));
const manifestPath = path.resolve(root, arg("--manifest", "migrations/baseline/B0062__manifest.json"));
const inventoryPath = path.resolve(root, arg("--inventory", "artifacts/database-baseline/live-schema-inventory-20261001.json"));

const errors: string[] = [];
for (const p of [baselinePath, manifestPath, inventoryPath]) {
  if (!fs.existsSync(p)) errors.push(`missing_file:${path.relative(root, p)}`);
}
if (errors.length) fail(errors);

const baseline = fs.readFileSync(baselinePath, "utf8");
const manifestRaw = fs.readFileSync(manifestPath);
const inventoryRaw = fs.readFileSync(inventoryPath);
const manifest = JSON.parse(manifestRaw.toString("utf8"));
const inventory = JSON.parse(inventoryRaw.toString("utf8"));

const baselineSha = sha256(baseline);
const inventorySha = sha256(inventoryRaw);

if (manifest.schema !== "v39.schema-baseline-manifest.v1") errors.push("manifest_schema_mismatch");
if (manifest.baseline_version !== 62) errors.push("baseline_version_mismatch");
if (manifest.baseline_file !== path.basename(baselinePath)) errors.push("baseline_filename_mismatch");
if (manifest.assumes_standard_public_schema_exists !== true) errors.push("public_schema_assumption_missing");
if (manifest.baseline_sha256 !== baselineSha) errors.push("baseline_sha256_mismatch");
if (manifest.live_schema_inventory_sha256 !== inventorySha) errors.push("inventory_sha256_mismatch");
if (!/^[0-9a-f]{40}$/.test(String(manifest.source_git_head ?? ""))) errors.push("source_git_head_invalid");
if (inventory.verdict !== "PASS_CORE_V39_SCHEMA_INVENTORY") errors.push("inventory_not_pass");
if ((inventory.missing_required_clean_tables ?? []).length !== 0) errors.push("inventory_missing_tables");
if ((inventory.missing_critical_columns ?? []).length !== 0) errors.push("inventory_missing_columns");

const requiredUnlogged = [
  "clean.prepaid_probe_session_runtime",
  "clean.prepaid_probe_delivery_runtime",
  "clean.prepaid_probe_item_runtime",
];
for (const table of requiredUnlogged) {
  if (!baseline.includes(`CREATE UNLOGGED TABLE ${table} (`)) errors.push(`missing_unlogged:${table}`);
}

const requiredTables = [
  "clean.adb_anchor_probe",
  "clean.adb_probe_reconciliation_evidence",
  "clean.raw_delivery",
  "clean.raw_delivery_item",
  "clean.processing_attempt",
  "clean.flight_events",
  "clean.flight_population",
  "clean.fids_query_response",
  "clean.flight_snapshots",
  "clean.flight_airborne_snapshots",
  "clean.flight_outcomes",
  "clean.adb_sampling_frame",
  "clean.historical_feature_store",
  "clean.provider_content_blob_ref",
  "clean.adb_phase6_authorization",
  "clean.adb_phase6_settlement_evidence",
];
for (const table of requiredTables) {
  const logged = `CREATE TABLE ${table} (`;
  const unlogged = `CREATE UNLOGGED TABLE ${table} (`;
  if (!baseline.includes(logged) && !baseline.includes(unlogged)) errors.push(`missing_required_table:${table}`);
}

for (const schema of ["_system", "drizzle", "stripe"]) {
  const re = new RegExp(`(^|[^A-Za-z0-9_])${schema.replace("_", "\\_")}\\.`, "m");
  if (re.test(baseline)) errors.push(`managed_schema_reference:${schema}`);
}

if (/^CREATE SCHEMA public;$/m.test(baseline)) errors.push("baseline_recreates_public_schema");

const forbidden: Array<[string, RegExp]> = [
  ["owner_statement", /\bOWNER\s+TO\b/i],
  ["grant_statement", /^\s*GRANT\b/im],
  ["revoke_statement", /^\s*REVOKE\b/im],
  ["session_authorization", /\bSET\s+SESSION\s+AUTHORIZATION\b/i],
  ["create_database", /\bCREATE\s+DATABASE\b/i],
  ["drop_database", /\bDROP\s+DATABASE\b/i],
  ["psql_connect", /^\\connect\b/im],
  ["create_extension", /\bCREATE\s+EXTENSION\b/i],
];
for (const [name, re] of forbidden) if (re.test(baseline)) errors.push(name);

if (/\bv39_meta\./i.test(baseline)) errors.push("migration_history_schema_leaked_into_baseline");

if (errors.length) fail(errors);

console.log(JSON.stringify({
  schema: "v39.schema-baseline-static-validation.v1",
  verdict: "PASS",
  baseline_sha256: baselineSha,
  inventory_sha256: inventorySha,
  source_git_head: manifest.source_git_head,
  baseline_line_count: baseline.split(/\r?\n/).length - 1,
  required_unlogged_tables: requiredUnlogged,
  managed_schema_references: 0,
  forbidden_ownership_or_privilege_statements: 0,
}, null, 2));