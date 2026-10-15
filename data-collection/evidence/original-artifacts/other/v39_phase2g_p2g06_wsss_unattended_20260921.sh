#!/usr/bin/env bash
set -euo pipefail

# V3.9 Phase-2G / Gate-2 Stage-1 one-time overnight runner for P2G06 / WSSS.
#
# Purpose:
#   Allow the already-approved WSSS Stage-1 attempt to launch inside the frozen
#   morning time class without requiring the operator to be awake.
#
# Safety:
#   - This wrapper does NOT change git HEAD, deploy, refill, or directly call the
#     provider owner.
#   - It reuses the audited f068 callback-prep, paid-preflight, hash-bound launcher,
#     detached supervisor, and unattended-health owners.
#   - Any mismatch/refusal stops the wrapper. It never launches twice.
#   - Final completion audit and budget-day closure remain manual after wake-up.
#
# Important:
#   Run this file from the existing Replit workspace that is still exactly on
#   EXEC_HEAD below. Do NOT git pull the later documentation/helper commits first.

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

EXEC_HEAD="89d3dd1f859bf17f75ce39b33f91bf9a644a37d9"

AUTH="AUTH-20260921-P2G06"
AUTH_FILE="SEPmd/V3.9_PHASE2G_AUTH_20260921_P2G06.json"
AUTH_SHA="58cc3925daf73f51c64b33e7bb8c059624687fd2dd4b9299ece0c5b01215343b"

RUNTIME_FILE="artifacts/phase2g-gate2-runtime-P2G-S1-20260921-05.json"
RUNTIME_SHA="1a3e176ffa00d3b448371c924d210b0bfaefeebc54f064997f89b16451e05d8d"

PREPROBE="artifacts/preprobe-reference-freeze-record.json"
PREPROBE_SHA="b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870"

SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"

BUDGET_DAY="P2G-S1-20260921-05"

CALLBACK_PREP_UTC="2026-09-21 10:50:00 UTC"   # 03:50 PDT
PREFLIGHT_UTC="2026-09-21 11:00:05 UTC"       # 04:00:05 PDT

RUNNER_LOG="artifacts/phase2g-P2G06-overnight-runner-20260921.log"
mkdir -p artifacts

# Keep the durable runner log in the workspace artifacts directory.
exec >>"$RUNNER_LOG" 2>&1

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

fail() {
  log "OVERNIGHT_RUNNER_REFUSED:$1"
  exit 2
}

sleep_until() {
  local target="$1"
  local now target_epoch wait_seconds
  target_epoch="$(date -u -d "$target" +%s)" || fail "INVALID_TARGET_TIME:$target"
  now="$(date -u +%s)"
  wait_seconds=$((target_epoch - now))
  if (( wait_seconds > 0 )); then
    log "WAITING_UNTIL:$target seconds=$wait_seconds"
    sleep "$wait_seconds"
  else
    log "TARGET_TIME_ALREADY_REACHED:$target"
  fi
}

assert_exact_execution_state() {
  local phase="$1"
  [[ "$(git rev-parse HEAD)" == "$EXEC_HEAD" ]] || fail "GIT_HEAD_MISMATCH:$phase"
  [[ -f "$AUTH_FILE" ]] || fail "AUTH_FILE_MISSING:$phase"
  [[ "$(sha256sum "$AUTH_FILE" | awk '{print $1}')" == "$AUTH_SHA" ]] || fail "AUTH_SHA_MISMATCH:$phase"
  [[ -f "$RUNTIME_FILE" ]] || fail "RUNTIME_FILE_MISSING:$phase"
  [[ "$(sha256sum "$RUNTIME_FILE" | awk '{print $1}')" == "$RUNTIME_SHA" ]] || fail "RUNTIME_SHA_MISMATCH:$phase"
  [[ -f "$PREPROBE" ]] || fail "PREPROBE_FILE_MISSING:$phase"
  [[ "$(sha256sum "$PREPROBE" | awk '{print $1}')" == "$PREPROBE_SHA" ]] || fail "PREPROBE_SHA_MISMATCH:$phase"
  [[ -f "$SMOKE" ]] || fail "SMOKE_FILE_MISSING:$phase"
  [[ -f "$SMOKE_RUNTIME" ]] || fail "SMOKE_RUNTIME_FILE_MISSING:$phase"
  [[ "$(sha256sum "$SMOKE_RUNTIME" | awk '{print $1}')" == "$SMOKE_RUNTIME_SHA" ]] || fail "SMOKE_RUNTIME_SHA_MISMATCH:$phase"
}

log "P2G06_OVERNIGHT_RUNNER_START"
assert_exact_execution_state "ARM"

# 05:20 PDT: prepare/re-verify only the existing workspace .replit.dev callback.
# The helper performs no deployment and no AeroDataBox paid mutation.
sleep_until "$CALLBACK_PREP_UTC"
assert_exact_execution_state "PRE_CALLBACK"
log "CALLBACK_PREP_BEGIN"
bash scripts/v39_prepare_phase2f_workspace_callback_v39.sh
assert_exact_execution_state "POST_CALLBACK"
log "CALLBACK_PREP_PASS"

# 05:30:05 PDT: the approved AUTH has started. Create a fresh paid preflight.
sleep_until "$PREFLIGHT_UTC"
assert_exact_execution_state "PRE_PREFLIGHT"

# Final scientific sequencing guard. Refuse rather than launch if the durable
# Stage-1 state has changed from the reviewed WSSS-rerun state.
[[ "$(jq -r '.shortlist[0].icao // empty' "$PREPROBE")" == "WSSS" ]] \
  || fail "FROZEN_FIRST_PRIMARY_NOT_WSSS"

SEQUENCE_GUARD="$(psql "$DATABASE_URL" -Atc "
WITH s AS (
  SELECT probe_id, icao, status, duration_censored,
         reconciliation_status, COALESCE(stop_reason,'') AS stop_reason
  FROM clean.adb_anchor_probe
  WHERE stage=1
)
SELECT CASE WHEN
  (SELECT count(*) FROM s) = 3
  AND EXISTS (
    SELECT 1 FROM s
    WHERE probe_id=1 AND icao='WSSS'
      AND status='failed'
      AND duration_censored=true
      AND reconciliation_status='UNRESOLVED'
      AND stop_reason LIKE 'supervisor_child_exit%'
  )
  AND EXISTS (
    SELECT 1 FROM s
    WHERE probe_id=2 AND icao='OMAA'
      AND status='completed'
      AND duration_censored=false
      AND reconciliation_status='MATCH'
  )
  AND EXISTS (
    SELECT 1 FROM s
    WHERE probe_id=3 AND icao='MMUN'
      AND status='failed'
      AND duration_censored=true
      AND reconciliation_status='UNRESOLVED'
      AND stop_reason LIKE 'supervisor_child_exit%'
  )
THEN 'PASS' ELSE 'FAIL' END;
")" || fail "WSSS_SEQUENCE_DB_QUERY_FAILED"

[[ "$SEQUENCE_GUARD" == "PASS" ]] \
  || fail "WSSS_SEQUENCE_STATE_DRIFT"

log "WSSS_SEQUENCE_GUARD_PASS"

PREFLIGHT="artifacts/phase2g-stage1-paid-preflight-P2G06-$(date -u +%Y%m%dT%H%M%SZ).json"
log "PAID_PREFLIGHT_BEGIN out=$PREFLIGHT"

npx tsx scripts/v39_phase2g_stage1_paid_preflight_v39.ts \
  --preprobe "$PREPROBE" \
  --smoke "$SMOKE" \
  --smoke-runtime-file "$SMOKE_RUNTIME" \
  --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
  --runtime-file "$RUNTIME_FILE" \
  --runtime-sha "$RUNTIME_SHA" \
  --auth-file "$AUTH_FILE" \
  --auth-sha "$AUTH_SHA" \
  --expected-head "$EXEC_HEAD" \
  --out "$PREFLIGHT"

# Refuse unless the receipt itself says exact paid readiness with no blockers.
if ! node - "$PREFLIGHT" "$EXEC_HEAD" "$AUTH" "$AUTH_SHA" "$RUNTIME_SHA" "$BUDGET_DAY" <<'NODE'
const fs = require("fs");
const [file, head, authId, authSha, runtimeSha, budgetDay] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, "utf8"));
const bad =
  r.schema !== "v39.phase2g-stage1-paid-preflight.v1" ||
  r.status !== "PASS_READY_FOR_PAID_STAGE1" ||
  r.git_head !== head ||
  r.auth?.authorization_id !== authId ||
  r.auth?.sha256 !== authSha ||
  r.gate2_runtime?.file_sha256 !== runtimeSha ||
  r.gate2_runtime?.probe_budget_day_id !== budgetDay ||
  !Array.isArray(r.blockers) ||
  r.blockers.length !== 0;
if (bad) process.exit(2);
NODE
then
  fail "PREFLIGHT_RECEIPT_NOT_EXACT_READY"
fi

PREFLIGHT_SHA="$(sha256sum "$PREFLIGHT" | awk '{print $1}')"
log "PAID_PREFLIGHT_PASS file=$PREFLIGHT sha256=$PREFLIGHT_SHA"

# Exactly one launch through the existing hash-bound launcher.
# If it refuses, this wrapper stops. There is no retry loop.
LAUNCH_OUT="artifacts/phase2g-P2G06-overnight-launch-$(date -u +%Y%m%dT%H%M%SZ).txt"
log "LAUNCH_BEGIN output=$LAUNCH_OUT"

if ! bash scripts/v39_phase2g_stage1_launch_logged_v39.sh \
  --auth "$AUTH" \
  --auth-file "$AUTH_FILE" \
  --auth-sha "$AUTH_SHA" \
  --runtime-file "$RUNTIME_FILE" \
  --runtime-sha "$RUNTIME_SHA" \
  --preprobe "$PREPROBE" \
  --preprobe-sha "$PREPROBE_SHA" \
  --smoke "$SMOKE" \
  --smoke-runtime-file "$SMOKE_RUNTIME" \
  --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
  --preflight "$PREFLIGHT" \
  --preflight-sha "$PREFLIGHT_SHA" \
  --expected-head "$EXEC_HEAD" \
  --probe-budget-day-id "$BUDGET_DAY" \
  >"$LAUNCH_OUT" 2>&1; then
  cat "$LAUNCH_OUT" || true
  fail "LAUNCH_REFUSED_OR_FAILED"
fi

cat "$LAUNCH_OUT"
log "LAUNCH_COMMAND_PASS"

# The launcher returned only after proving the detached supervisor stayed alive.
# Give runtime/provider state additional time to become fully active, then use the
# existing read-only unattended-health gate. Never relaunch on a bad health result.
sleep 120

STATUS="$(ls -1t artifacts/phase2g-stage1-AUTH-20260921-P2G06-*.status.json 2>/dev/null | head -n1 || true)"
[[ -n "$STATUS" && -f "$STATUS" ]] || fail "STATUS_ARTIFACT_NOT_FOUND"

BASE="${STATUS%.status.json}"
[[ -f "${BASE}.heartbeat.json" ]] || fail "HEARTBEAT_ARTIFACT_NOT_FOUND"
[[ -f "${BASE}.pid" ]] || fail "PID_ARTIFACT_NOT_FOUND"
[[ -f "${BASE}.log" ]] || fail "SUPERVISOR_LOG_NOT_FOUND"

HEALTH_OUT="${BASE}.overnight-health.json"
log "UNATTENDED_HEALTH_BEGIN output=$HEALTH_OUT"

set +e
npx tsx scripts/v39_phase2g_stage1_sleep_check_v39.ts \
  --auth "$AUTH" \
  --expected-head "$EXEC_HEAD" \
  --probe-budget-day-id "$BUDGET_DAY" \
  --status "${BASE}.status.json" \
  --heartbeat "${BASE}.heartbeat.json" \
  --pid-file "${BASE}.pid" \
  --log "${BASE}.log" \
  >"$HEALTH_OUT" 2>&1
HEALTH_RC=$?
set -e

cat "$HEALTH_OUT"

if (( HEALTH_RC != 0 )); then
  log "OVERNIGHT_HEALTH_BLOCKED_DO_NOT_RELAUNCH"
  exit 2
fi

if ! node - "$HEALTH_OUT" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const r = JSON.parse(fs.readFileSync(file, "utf8"));
if (r.status !== "RUNNING_HEALTHY_UNATTENDED_WINDOW" ||
    !Array.isArray(r.blockers) ||
    r.blockers.length !== 0) {
  process.exit(2);
}
NODE
then
  fail "HEALTH_RECEIPT_NOT_HEALTHY"
fi

log "OVERNIGHT_HEALTH_PASS_DO_NOT_RELAUNCH"

# Do not interfere with the paid run. Merely keep this wrapper alive until the
# already-running detached supervisor terminates, then print its terminal status.
SUP_PID="$(tr -d '[:space:]' < "${BASE}.pid")"
[[ "$SUP_PID" =~ ^[0-9]+$ ]] || fail "SUPERVISOR_PID_INVALID"

while kill -0 "$SUP_PID" 2>/dev/null; do
  sleep 300
done

log "SUPERVISOR_TERMINAL"
if [[ -f "${BASE}.status.json" ]]; then
  cat "${BASE}.status.json"
fi

log "P2G06_OVERNIGHT_RUNNER_FINISHED"
log "FINAL_AUDIT_AND_BUDGET_DAY_CLOSURE_NOT_AUTOMATED"
