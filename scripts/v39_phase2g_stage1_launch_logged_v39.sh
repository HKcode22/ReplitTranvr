#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
mkdir -p artifacts

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
    *) echo "REFUSED:UNKNOWN_ARGUMENT=$1"; exit 2 ;;
  esac
done

for pair in \
  "AUTH:$AUTH" \
  "AUTH_FILE:$AUTH_FILE" \
  "AUTH_SHA:$AUTH_SHA" \
  "RUNTIME_FILE:$RUNTIME_FILE" \
  "RUNTIME_SHA:$RUNTIME_SHA" \
  "PREPROBE:$PREPROBE" \
  "PREPROBE_SHA:$PREPROBE_SHA" \
  "SMOKE:$SMOKE" \
  "SMOKE_RUNTIME:$SMOKE_RUNTIME" \
  "SMOKE_RUNTIME_SHA:$SMOKE_RUNTIME_SHA" \
  "PREFLIGHT:$PREFLIGHT" \
  "PREFLIGHT_SHA:$PREFLIGHT_SHA" \
  "EXPECTED_HEAD:$EXPECTED_HEAD" \
  "BUDGET_DAY:$BUDGET_DAY" \
  "EXPECTED_ICAO:$EXPECTED_ICAO"; do
  name="${pair%%:*}"
  value="${pair#*:}"
  if [[ -z "$value" ]]; then
    echo "REFUSED:MISSING_$name"
    exit 2
  fi
done

if [[ ! "$AUTH" =~ ^AUTH-[0-9]{8}-[A-Z0-9]+$ ]]; then echo 'REFUSED:AUTH_ID_INVALID'; exit 2; fi
if [[ ! "$AUTH_SHA" =~ ^[a-f0-9]{64}$ ]]; then echo 'REFUSED:AUTH_SHA_INVALID'; exit 2; fi
if [[ ! "$RUNTIME_SHA" =~ ^[a-f0-9]{64}$ ]]; then echo 'REFUSED:RUNTIME_SHA_INVALID'; exit 2; fi
if [[ ! "$PREPROBE_SHA" =~ ^[a-f0-9]{64}$ ]]; then echo 'REFUSED:PREPROBE_SHA_INVALID'; exit 2; fi
if [[ ! "$SMOKE_RUNTIME_SHA" =~ ^[a-f0-9]{64}$ ]]; then echo 'REFUSED:SMOKE_RUNTIME_SHA_INVALID'; exit 2; fi
if [[ ! "$PREFLIGHT_SHA" =~ ^[a-f0-9]{64}$ ]]; then echo 'REFUSED:PREFLIGHT_SHA_INVALID'; exit 2; fi
if [[ ! "$EXPECTED_HEAD" =~ ^[a-f0-9]{40}$ ]]; then echo 'REFUSED:EXPECTED_HEAD_INVALID'; exit 2; fi
if [[ ! "$EXPECTED_ICAO" =~ ^[A-Z0-9]{4}$ ]]; then echo 'REFUSED:EXPECTED_ICAO_INVALID'; exit 2; fi

CURRENT_HEAD="$(git rev-parse HEAD)"
if [[ "$CURRENT_HEAD" != "$EXPECTED_HEAD" ]]; then
  echo "REFUSED:GIT_HEAD_MISMATCH current=$CURRENT_HEAD expected=$EXPECTED_HEAD"
  exit 2
fi

PROTECTED_STATUS="$(git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests)"
if [[ -n "$PROTECTED_STATUS" ]]; then
  echo 'REFUSED:PROTECTED_SOURCE_TREE_DIRTY'
  printf '%s\n' "$PROTECTED_STATUS"
  exit 2
fi

for file in "$AUTH_FILE" "$RUNTIME_FILE" "$PREPROBE" "$SMOKE" "$SMOKE_RUNTIME" "$PREFLIGHT"; do
  if [[ ! -f "$file" ]]; then echo "REFUSED:MISSING_FILE=$file"; exit 2; fi
done

ACTUAL_AUTH_SHA="$(sha256sum "$AUTH_FILE" | awk '{print $1}')"
ACTUAL_RUNTIME_SHA="$(sha256sum "$RUNTIME_FILE" | awk '{print $1}')"
ACTUAL_PREPROBE_SHA="$(sha256sum "$PREPROBE" | awk '{print $1}')"
ACTUAL_PREFLIGHT_SHA="$(sha256sum "$PREFLIGHT" | awk '{print $1}')"
if [[ "$ACTUAL_AUTH_SHA" != "$AUTH_SHA" ]]; then echo "REFUSED:AUTH_SHA_MISMATCH actual=$ACTUAL_AUTH_SHA"; exit 2; fi
if [[ "$ACTUAL_RUNTIME_SHA" != "$RUNTIME_SHA" ]]; then echo "REFUSED:RUNTIME_SHA_MISMATCH actual=$ACTUAL_RUNTIME_SHA"; exit 2; fi
if [[ "$ACTUAL_PREPROBE_SHA" != "$PREPROBE_SHA" ]]; then echo "REFUSED:PREPROBE_SHA_MISMATCH actual=$ACTUAL_PREPROBE_SHA"; exit 2; fi
if [[ "$ACTUAL_PREFLIGHT_SHA" != "$PREFLIGHT_SHA" ]]; then echo "REFUSED:PREFLIGHT_SHA_MISMATCH actual=$ACTUAL_PREFLIGHT_SHA"; exit 2; fi

AUTH="$AUTH" AUTH_SHA="$AUTH_SHA" RUNTIME_SHA="$RUNTIME_SHA" EXPECTED_HEAD="$EXPECTED_HEAD" BUDGET_DAY="$BUDGET_DAY" EXPECTED_ICAO="$EXPECTED_ICAO" PREFLIGHT="$PREFLIGHT" \
node <<'NODE'
const fs = require('fs');
const receipt = JSON.parse(fs.readFileSync(process.env.PREFLIGHT, 'utf8'));
const fail = (reason) => { console.error(`REFUSED:PREFLIGHT_RECEIPT_${reason}`); process.exit(2); };
if (receipt.schema !== 'v39.phase2g-stage1-paid-preflight.v1') fail('SCHEMA');
if (receipt.status !== 'PASS_READY_FOR_PAID_STAGE1') fail(`STATUS_${receipt.status}`);
if (receipt.git_head !== process.env.EXPECTED_HEAD) fail('HEAD');
if (receipt.auth?.authorization_id !== process.env.AUTH) fail('AUTH_ID');
if (receipt.auth?.sha256 !== process.env.AUTH_SHA) fail('AUTH_SHA');
if (receipt.gate2_runtime?.file_sha256 !== process.env.RUNTIME_SHA) fail('RUNTIME_SHA');
if (receipt.gate2_runtime?.probe_budget_day_id !== process.env.BUDGET_DAY) fail('BUDGET_DAY');
if (receipt.gate2_runtime?.next_candidate !== process.env.EXPECTED_ICAO) fail('NEXT_CANDIDATE');
if (receipt.gate2_runtime?.expected_icao !== process.env.EXPECTED_ICAO) fail('EXPECTED_ICAO');
if (receipt.gate2_runtime?.compact6_validated !== true) fail('COMPACT6_NOT_VALIDATED');
if (!/^[a-f0-9]{64}$/.test(String(receipt.gate2_runtime?.stage1_amendment_sha256 || ''))) fail('AMENDMENT_SHA');
if (Array.isArray(receipt.blockers) && receipt.blockers.length !== 0) fail('BLOCKERS');
const generated = Date.parse(String(receipt.generated_at_utc || ''));
if (!Number.isFinite(generated)) fail('TIMESTAMP');
const ageMs = Date.now() - generated;
if (ageMs < -30_000 || ageMs > 10 * 60_000) fail(`STALE_${ageMs}`);
NODE

CURRENT_BUCKET="${V39_PROVIDER_BLOB_BUCKET_ID:-}"
case "$CURRENT_BUCKET" in
  replit-objstore-*) CORRECT_BUCKET="$CURRENT_BUCKET" ;;
  eplit-objstore-*) CORRECT_BUCKET="r${CURRENT_BUCKET}" ;;
  *) echo 'REFUSED:V39_PROVIDER_BLOB_BUCKET_ID_UNEXPECTED_OR_MISSING'; exit 2 ;;
esac

DOMAIN=""
if [[ -n "${REPLIT_DEV_DOMAIN:-}" ]]; then
  DOMAIN="${REPLIT_DEV_DOMAIN#https://}"
  DOMAIN="${DOMAIN#http://}"
  DOMAIN="${DOMAIN%%/*}"
fi
if [[ -z "$DOMAIN" && -n "${REPLIT_DOMAINS:-}" ]]; then
  IFS=',' read -ra DOMAINS <<< "$REPLIT_DOMAINS"
  for raw in "${DOMAINS[@]}"; do
    d="${raw#https://}"
    d="${d#http://}"
    d="${d%%/*}"
    if [[ "$d" == *.replit.dev ]]; then DOMAIN="$d"; break; fi
  done
fi
if [[ -z "$DOMAIN" || "$DOMAIN" != *.replit.dev ]]; then echo 'REFUSED:NO_REPLIT_WORKSPACE_PUBLIC_DOMAIN'; exit 2; fi
if [[ "$DOMAIN" == "travnr.com" || "$DOMAIN" == "www.travnr.com" ]]; then echo 'REFUSED:PRODUCTION_DOMAIN_NOT_ALLOWED'; exit 2; fi
BASE="https://${DOMAIN}"

# Final launch-time health check must validate the exact JSON contract. A Vite
# catch-all HTML 200 is not a callback health pass.
CALLBACK_BASE="$BASE" EXPECTED_HEAD="$EXPECTED_HEAD" node <<'NODE'
(async () => {
  const base = String(process.env.CALLBACK_BASE || '').replace(/\/+$/, '');
  const expectedHead = String(process.env.EXPECTED_HEAD || '').toLowerCase();
  const response = await fetch(`${base}/__v39/workspace-runtime`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  const ok = response.status === 200 &&
    json?.schema === 'v39.phase2f-workspace-runtime.v1' &&
    json?.status === 'PASS' &&
    json?.prepaid_route_registered === true &&
    json?.provider_mutation === false &&
    json?.managed_replit_workflow === true &&
    String(json?.git_head || '').toLowerCase() === expectedHead;
  if (!ok) {
    console.error(JSON.stringify({
      status: 'REFUSED',
      reason: 'WORKSPACE_CALLBACK_HEALTH_CONTRACT_FAILED_AT_LAUNCH',
      http_status: response.status,
      content_type: response.headers.get('content-type'),
      expected_git_head: expectedHead,
      observed: json ?? text.slice(0, 240),
    }, null, 2));
    process.exit(2);
  }
  console.log(JSON.stringify({
    status: 'PASS',
    check: 'WORKSPACE_CALLBACK_HEALTH_AT_LAUNCH',
    git_head: json.git_head,
    route_owner: json.route_owner,
  }));
})().catch((error) => {
  console.error(JSON.stringify({
    status: 'REFUSED',
    reason: 'WORKSPACE_CALLBACK_HEALTH_REQUEST_FAILED_AT_LAUNCH',
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(2);
});
NODE

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE_AUTH="${AUTH//[^A-Za-z0-9_-]/_}"
LOG="artifacts/phase2g-stage1-${SAFE_AUTH}-${STAMP}.log"
STATUS="artifacts/phase2g-stage1-${SAFE_AUTH}-${STAMP}.status.json"
HEARTBEAT="artifacts/phase2g-stage1-${SAFE_AUTH}-${STAMP}.heartbeat.json"
PID_FILE="artifacts/phase2g-stage1-${SAFE_AUTH}-${STAMP}.pid"

printf '{"schema":"v39.phase2g-stage1-launch.v1","state":"LAUNCH_REQUESTED","generated_at_utc":"%s","authorization_id":"%s","git_head":"%s","preflight_receipt":"%s","log_path":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$AUTH" "$CURRENT_HEAD" "$PREFLIGHT" "$LOG" > "$LOG"

# Spawn the supervisor in a new OS session/process group. Unlike a plain
# background/nohup job, this detaches it from the interactive terminal job
# group while preserving the same exact environment and paid front-door guard.
env \
  ADB_PREPROBE_ARTIFACT_PATH="$PREPROBE" \
  ADB_PREPROBE_ARTIFACT_SHA256="$PREPROBE_SHA" \
  ADB_PROBE_RUNTIME_ARTIFACT_PATH="$RUNTIME_FILE" \
  ADB_PROBE_RUNTIME_ARTIFACT_SHA256="$RUNTIME_SHA" \
  ADB_PHASE2_SMOKE_ARTIFACT_PATH="$SMOKE" \
  ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_PATH="$SMOKE_RUNTIME" \
  ADB_PHASE2_SMOKE_RUNTIME_ARTIFACT_SHA256="$SMOKE_RUNTIME_SHA" \
  V39_PROVIDER_BLOB_BUCKET_ID="$CORRECT_BUCKET" \
  V39_PROVIDER_BLOB_MODE="required" \
  V39_PUBLIC_WEBHOOK_BASE_URL="$BASE" \
  WEBHOOK_BASE_URL="$BASE" \
  node --import tsx scripts/v39_phase2g_spawn_detached_supervisor_v39.ts \
    --log "$LOG" \
    --pid-file "$PID_FILE" \
    -- \
    scripts/v39_phase2g_stage1_logged_supervisor_v39.ts \
    --auth "$AUTH" \
    --auth-file "$AUTH_FILE" \
    --auth-sha "$AUTH_SHA" \
    --runtime-sha "$RUNTIME_SHA" \
    --probe-budget-day-id "$BUDGET_DAY" \
    --expected-head "$EXPECTED_HEAD" \
    --callback-base "$BASE" \
    --log "$LOG" \
    --status "$STATUS" \
    --heartbeat "$HEARTBEAT" \
    --expected-icao "$EXPECTED_ICAO"

if [[ ! -s "$PID_FILE" ]]; then
  echo 'REFUSED:DETACHED_SUPERVISOR_PID_FILE_MISSING'
  exit 1
fi
SUPERVISOR_PID="$(tr -d '[:space:]' < "$PID_FILE")"
if [[ ! "$SUPERVISOR_PID" =~ ^[0-9]+$ ]]; then
  echo 'REFUSED:DETACHED_SUPERVISOR_PID_INVALID'
  exit 1
fi

sleep 3
if ! kill -0 "$SUPERVISOR_PID" 2>/dev/null; then
  echo 'REFUSED:STAGE1_SUPERVISOR_EXITED_DURING_LAUNCH'
  echo "STATUS_FILE=$STATUS"
  echo "LOG_FILE=$LOG"
  [[ -f "$STATUS" ]] && cat "$STATUS" || true
  tail -120 "$LOG" || true
  exit 1
fi

cat <<EOF
{
  "schema": "v39.phase2g-stage1-launch.v1",
  "status": "LAUNCHED_PERSISTENT_SUPERVISOR",
  "authorization_id": "$AUTH",
  "git_head": "$CURRENT_HEAD",
  "probe_budget_day_id": "$BUDGET_DAY",
  "expected_icao": "$EXPECTED_ICAO",
  "supervisor_pid": $SUPERVISOR_PID,
  "log_file": "$LOG",
  "status_file": "$STATUS",
  "heartbeat_file": "$HEARTBEAT",
  "pid_file": "$PID_FILE",
  "workspace_callback_base": "$BASE",
  "deployment_performed": false,
  "note": "Do not launch a second Stage-1 command. Inspect status/heartbeat/log if the terminal disconnects."
}
EOF
