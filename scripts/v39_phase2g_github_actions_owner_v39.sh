#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
mkdir -p artifacts

[[ "${GITHUB_ACTIONS:-}" == "true" ]] || {
  echo "REFUSED:GITHUB_ACTIONS_RUNTIME_REQUIRED"
  exit 2
}

AUTH=""
AUTH_FILE=""
AUTH_SHA=""
RUNTIME_FILE=""
RUNTIME_SHA=""
PREPROBE=""
PREPROBE_SHA=""
SMOKE=""
SMOKE_RUNTIME=""
SMOKE_RUNTIME_SHA=""
PREFLIGHT=""
PREFLIGHT_SHA=""
EXPECTED_HEAD=""
BUDGET_DAY=""
EXPECTED_ICAO=""
CALLBACK_BASE=""
PROVIDER_BLOB_BUCKET_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auth) AUTH="${2:-}"; shift 2 ;;
    --auth-file) AUTH_FILE="${2:-}"; shift 2 ;;
    --auth-sha) AUTH_SHA="${2:-}"; shift 2 ;;
    --runtime-file) RUNTIME_FILE="${2:-}"; shift 2 ;;
    --runtime-sha) RUNTIME_SHA="${2:-}"; shift 2 ;;
    --preprobe) PREPROBE="${2:-}"; shift 2 ;;
    --preprobe-sha) PREPROBE_SHA="${2:-}"; shift 2 ;;
    --smoke) SMOKE="${2:-}"; shift 2 ;;
    --smoke-runtime-file) SMOKE_RUNTIME="${2:-}"; shift 2 ;;
    --smoke-runtime-sha) SMOKE_RUNTIME_SHA="${2:-}"; shift 2 ;;
    --preflight) PREFLIGHT="${2:-}"; shift 2 ;;
    --preflight-sha) PREFLIGHT_SHA="${2:-}"; shift 2 ;;
    --expected-head) EXPECTED_HEAD="${2:-}"; shift 2 ;;
    --probe-budget-day-id) BUDGET_DAY="${2:-}"; shift 2 ;;
    --expected-icao) EXPECTED_ICAO="${2:-}"; shift 2 ;;
    --callback-base) CALLBACK_BASE="${2:-}"; shift 2 ;;
    --provider-blob-bucket-id) PROVIDER_BLOB_BUCKET_ID="${2:-}"; shift 2 ;;
    *) echo "REFUSED:UNKNOWN_ARGUMENT=$1"; exit 2 ;;
  esac
done

for pair in   "AUTH:$AUTH"   "AUTH_FILE:$AUTH_FILE"   "AUTH_SHA:$AUTH_SHA"   "RUNTIME_FILE:$RUNTIME_FILE"   "RUNTIME_SHA:$RUNTIME_SHA"   "PREPROBE:$PREPROBE"   "PREPROBE_SHA:$PREPROBE_SHA"   "SMOKE:$SMOKE"   "SMOKE_RUNTIME:$SMOKE_RUNTIME"   "SMOKE_RUNTIME_SHA:$SMOKE_RUNTIME_SHA"   "PREFLIGHT:$PREFLIGHT"   "PREFLIGHT_SHA:$PREFLIGHT_SHA"   "EXPECTED_HEAD:$EXPECTED_HEAD"   "BUDGET_DAY:$BUDGET_DAY"   "EXPECTED_ICAO:$EXPECTED_ICAO"   "CALLBACK_BASE:$CALLBACK_BASE"   "PROVIDER_BLOB_BUCKET_ID:$PROVIDER_BLOB_BUCKET_ID"; do
  name="${pair%%:*}"
  value="${pair#*:}"
  [[ -n "$value" ]] || { echo "REFUSED:MISSING_$name"; exit 2; }
done

[[ "${GITHUB_SHA,,}" == "$EXPECTED_HEAD" ]] || {
  echo "REFUSED:GITHUB_SHA_MISMATCH current=${GITHUB_SHA,,} expected=$EXPECTED_HEAD"
  exit 2
}
[[ "$(git rev-parse HEAD)" == "$EXPECTED_HEAD" ]] || {
  echo "REFUSED:CHECKOUT_HEAD_MISMATCH"
  exit 2
}

for file in "$AUTH_FILE" "$RUNTIME_FILE" "$PREPROBE" "$SMOKE" "$SMOKE_RUNTIME" "$PREFLIGHT"; do
  [[ -f "$file" ]] || { echo "REFUSED:MISSING_FILE=$file"; exit 2; }
done

sha_file() { sha256sum "$1" | awk '{print $1}'; }
[[ "$(sha_file "$AUTH_FILE")" == "$AUTH_SHA" ]] || { echo "REFUSED:AUTH_SHA_MISMATCH"; exit 2; }
[[ "$(sha_file "$RUNTIME_FILE")" == "$RUNTIME_SHA" ]] || { echo "REFUSED:RUNTIME_SHA_MISMATCH"; exit 2; }
[[ "$(sha_file "$PREPROBE")" == "$PREPROBE_SHA" ]] || { echo "REFUSED:PREPROBE_SHA_MISMATCH"; exit 2; }
[[ "$(sha_file "$PREFLIGHT")" == "$PREFLIGHT_SHA" ]] || { echo "REFUSED:PREFLIGHT_SHA_MISMATCH"; exit 2; }

AUTH="$AUTH" AUTH_SHA="$AUTH_SHA" RUNTIME_SHA="$RUNTIME_SHA" EXPECTED_HEAD="$EXPECTED_HEAD" BUDGET_DAY="$BUDGET_DAY" EXPECTED_ICAO="$EXPECTED_ICAO" PREFLIGHT="$PREFLIGHT" CALLBACK_BASE="$CALLBACK_BASE" node --input-type=module <<'NODE'
import fs from "node:fs";
const r = JSON.parse(fs.readFileSync(process.env.PREFLIGHT, "utf8"));
const fail = (x) => { console.error("REFUSED:PREFLIGHT_RECEIPT_" + x); process.exit(2); };
if (r.schema !== "v39.phase2g-stage1-paid-preflight.v1") fail("SCHEMA");
if (r.status !== "PASS_READY_FOR_PAID_STAGE1") fail("STATUS");
if (r.git_head !== process.env.EXPECTED_HEAD) fail("HEAD");
if (r.auth?.authorization_id !== process.env.AUTH) fail("AUTH_ID");
if (r.auth?.sha256 !== process.env.AUTH_SHA) fail("AUTH_SHA");
if (r.gate2_runtime?.file_sha256 !== process.env.RUNTIME_SHA) fail("RUNTIME_SHA");
if (r.gate2_runtime?.probe_budget_day_id !== process.env.BUDGET_DAY) fail("BUDGET");
if (r.gate2_runtime?.expected_icao !== process.env.EXPECTED_ICAO) fail("ICAO");
if (r.owner_executor !== "github-actions") fail("OWNER_EXECUTOR");
if (r.callback?.origin !== process.env.CALLBACK_BASE) fail("CALLBACK_BASE");
if (r.callback?.reachable !== true || r.callback?.exact_contract !== true) fail("CALLBACK");
if (Array.isArray(r.blockers) && r.blockers.length !== 0) fail("BLOCKERS");
const generated = Date.parse(String(r.generated_at_utc || ""));
const age = Date.now() - generated;
if (!Number.isFinite(generated) || age < -30000 || age > 10 * 60_000) fail("STALE");
NODE

for required_secret in V39_DATABASE_RUNTIME_URL AERODATABOX_API_KEY AERODATABOX_WEBHOOK_SECRET V39_REMOTE_BLOB_CLEANUP_SECRET; do
  [[ -n "${!required_secret:-}" ]] || {
    echo "REFUSED:MISSING_SECRET_ENV=$required_secret"
    exit 2
  }
done

BASE="${CALLBACK_BASE%/}"
[[ "$BASE" =~ ^https://[^/]+$ ]] || { echo "REFUSED:CALLBACK_BASE_INVALID"; exit 2; }
[[ "${BASE#https://}" != *.replit.dev ]] || { echo "REFUSED:REPLIT_DEV_CALLBACK_NOT_ALLOWED"; exit 2; }

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE_AUTH="${AUTH//[^A-Za-z0-9_-]/_}"
LOG="artifacts/phase2g-github-owner-${SAFE_AUTH}-${STAMP}.log"
STATUS="artifacts/phase2g-github-owner-${SAFE_AUTH}-${STAMP}.status.json"
HEARTBEAT="artifacts/phase2g-github-owner-${SAFE_AUTH}-${STAMP}.heartbeat.json"

echo "GITHUB_ACTIONS_OWNER=STARTING"
echo "GITHUB_RUN_ID=${GITHUB_RUN_ID:-unknown}"
echo "EXPECTED_HEAD=$EXPECTED_HEAD"
echo "CALLBACK_BASE=$BASE"
echo "PROVIDER_MUTATION=AUTHORIZED_ONLY_BY_EXISTING_AUTH"

export ADB_PREPROBE_ARTIFACT_PATH="$PREPROBE"
export ADB_PREPROBE_ARTIFACT_SHA256="$PREPROBE_SHA"
export ADB_PROBE_RUNTIME_ARTIFACT_PATH="$RUNTIME_FILE"
export ADB_PROBE_RUNTIME_ARTIFACT_SHA256="$RUNTIME_SHA"
export ADB_PHASE2_SMOKE_ARTIFACT_PATH="$SMOKE"
export ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_PATH="$SMOKE_RUNTIME"
export ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_SHA256="$SMOKE_RUNTIME_SHA"
export V39_PROVIDER_BLOB_BUCKET_ID="$PROVIDER_BLOB_BUCKET_ID"
export V39_PROVIDER_BLOB_MODE="required"
export V39_PUBLIC_WEBHOOK_BASE_URL="$BASE"
export WEBHOOK_BASE_URL="$BASE"
export V39_REMOTE_BLOB_CLEANUP_BASE="$BASE"
export V39_OWNER_EXECUTOR="github-actions"

set +e
node --import tsx scripts/v39_phase2g_stage1_logged_supervisor_v39.ts   --auth "$AUTH"   --auth-file "$AUTH_FILE"   --auth-sha "$AUTH_SHA"   --runtime-sha "$RUNTIME_SHA"   --probe-budget-day-id "$BUDGET_DAY"   --expected-head "$EXPECTED_HEAD"   --callback-base "$BASE"   --log "$LOG"   --status "$STATUS"   --heartbeat "$HEARTBEAT"   --expected-icao "$EXPECTED_ICAO"   --owner-executor github-actions
RC=$?
set -e

echo "OWNER_EXIT_CODE=$RC"
echo "OWNER_LOG=$LOG"
echo "OWNER_STATUS=$STATUS"
echo "OWNER_HEARTBEAT=$HEARTBEAT"
exit "$RC"
