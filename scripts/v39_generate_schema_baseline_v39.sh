#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/migrations/baseline"
OUT_SQL="$OUT_DIR/B0062__v39_schema_baseline_20261001.sql"
OUT_MANIFEST="$OUT_DIR/B0062__manifest.json"
INVENTORY="$ROOT/artifacts/database-baseline/live-schema-inventory-20261001.json"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "REFUSED: DATABASE_URL is not set" >&2
  exit 2
fi

mkdir -p "$OUT_DIR"

if [[ -e "$OUT_SQL" || -e "$OUT_MANIFEST" ]]; then
  echo "REFUSED: baseline output already exists; do not overwrite a baseline in place" >&2
  exit 3
fi

if [[ ! -f "$INVENTORY" ]]; then
  echo "REFUSED: required read-only schema inventory missing: $INVENTORY" >&2
  exit 4
fi

VERDICT="$(node --input-type=module - "$INVENTORY" <<'NODE'
import fs from "node:fs";
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
process.stdout.write(String(j.verdict ?? ""));
NODE
)"

if [[ "$VERDICT" != "PASS_CORE_V39_SCHEMA_INVENTORY" ]]; then
  echo "REFUSED: live schema inventory verdict is not PASS_CORE_V39_SCHEMA_INVENTORY" >&2
  exit 5
fi

echo "Generating project-owned schema baseline..."
echo "included_schemas=clean,public"
echo "excluded_managed_schemas=_system,drizzle,stripe"

pg_dump "$DATABASE_URL" \
  --schema-only \
  --schema=clean \
  --schema=public \
  --no-owner \
  --no-privileges \
  --format=plain \
  > "$OUT_SQL"

if grep -Eq '^CREATE SCHEMA (_system|drizzle|stripe);' "$OUT_SQL"; then
  echo "REFUSED: managed schema leaked into project baseline" >&2
  rm -f "$OUT_SQL"
  exit 6
fi

if ! grep -q '^CREATE SCHEMA clean;' "$OUT_SQL"; then
  echo "REFUSED: clean schema missing from generated baseline" >&2
  rm -f "$OUT_SQL"
  exit 7
fi

if ! grep -q '^CREATE UNLOGGED TABLE clean.prepaid_probe_session_runtime' "$OUT_SQL"; then
  echo "REFUSED: prepaid_probe_session_runtime is not preserved as UNLOGGED" >&2
  rm -f "$OUT_SQL"
  exit 8
fi

if ! grep -q '^CREATE UNLOGGED TABLE clean.prepaid_probe_delivery_runtime' "$OUT_SQL"; then
  echo "REFUSED: prepaid_probe_delivery_runtime is not preserved as UNLOGGED" >&2
  rm -f "$OUT_SQL"
  exit 9
fi

if ! grep -q '^CREATE UNLOGGED TABLE clean.prepaid_probe_item_runtime' "$OUT_SQL"; then
  echo "REFUSED: prepaid_probe_item_runtime is not preserved as UNLOGGED" >&2
  rm -f "$OUT_SQL"
  exit 10
fi

BASELINE_SHA="$(sha256sum "$OUT_SQL" | awk '{print $1}')"
INVENTORY_SHA="$(sha256sum "$INVENTORY" | awk '{print $1}')"
HEAD_SHA="$(git -C "$ROOT" rev-parse HEAD)"
LINE_COUNT="$(wc -l < "$OUT_SQL" | tr -d " ")"

node --input-type=module - "$OUT_MANIFEST" "$BASELINE_SHA" "$INVENTORY_SHA" "$HEAD_SHA" "$LINE_COUNT" <<'NODE'
import fs from "node:fs";
const [out, baselineSha, inventorySha, headSha, lineCount] = process.argv.slice(2);
const manifest = {
  schema: "v39.schema-baseline-manifest.v1",
  baseline_version: 62,
  baseline_file: "B0062__v39_schema_baseline_20261001.sql",
  baseline_sha256: baselineSha,
  live_schema_inventory_file: "artifacts/database-baseline/live-schema-inventory-20261001.json",
  live_schema_inventory_sha256: inventorySha,
  source_git_head: headSha,
  included_schemas: ["clean", "public"],
  excluded_managed_schemas: ["_system", "drizzle", "stripe"],
  schema_only: true,
  owner_statements_included: false,
  privilege_statements_included: false,
  line_count: Number(lineCount),
  generated_at_utc: new Date().toISOString(),
};
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
NODE

echo "baseline_sql=$OUT_SQL"
echo "baseline_sha256=$BASELINE_SHA"
echo "manifest=$OUT_MANIFEST"
echo "inventory_sha256=$INVENTORY_SHA"
echo "source_git_head=$HEAD_SHA"
echo "line_count=$LINE_COUNT"
echo "BASELINE_GENERATION=PASS"