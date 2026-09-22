#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
mkdir -p artifacts

EXPECTED_HEAD="d13387714c73b26334138dd577a29454457a5961"
AUTH_ID="AUTH-20260922-P2G07"
AUTH_FILE="SEPmd/V3.9_PHASE2G_AUTH_20260922_P2G07.json"
AUTH_SHA="abe286b39c190505dec0bada95908667615848088df050e278a13d79b2a0c703"
RUNTIME_FILE="artifacts/phase2g-gate2-runtime-P2G-S1-20260922-06.json"
RUNTIME_SHA="87182a790851310304db08b30d45d1b1afe24cbe52d942a556805852e1edf41c"
PREPROBE="artifacts/preprobe-reference-freeze-record.json"
PREPROBE_SHA="b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870"
SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"
BUDGET_DAY="P2G-S1-20260922-06"
EXPECTED_ICAO="WSSS"
AUTH_START_UTC="2026-09-22T11:00:00Z"
EARLY_PREFLIGHT_UTC="2026-09-22T10:30:00Z"
LATEST_SAFE_START_UTC="2026-09-22T12:55:00Z"

usage() {
  cat <<'EOF'
Usage:
  PHASE2G_OVERNIGHT_ARM=YES bash scripts/v39_phase2g_overnight_wsss_guard_v39.sh --detach
  bash scripts/v39_phase2g_overnight_wsss_guard_v39.sh --status

Safety:
  - exactly one possible paid WSSS launch
  - no automatic paid retry
  - provider mutation occurs only through the existing hash-bound paid launcher
  - early/final preflights are provider read-only
  - any mismatch/blocker exits without launching
EOF
}

sha_file() {
  sha256sum "$1" | awk '{print $1}'
}

assert_static_bindings() {
  local head
  head="$(git rev-parse HEAD)"
  [[ "$head" == "$EXPECTED_HEAD" ]] || {
    echo "OVERNIGHT_REFUSED:GIT_HEAD_MISMATCH current=$head expected=$EXPECTED_HEAD"
    exit 2
  }

  local protected
  protected="$(git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests)"
  [[ -z "$protected" ]] || {
    echo "OVERNIGHT_REFUSED:PROTECTED_SOURCE_TREE_DIRTY"
    printf '%s\n' "$protected"
    exit 2
  }

  [[ -f "$AUTH_FILE" && "$(sha_file "$AUTH_FILE")" == "$AUTH_SHA" ]] || {
    echo "OVERNIGHT_REFUSED:AUTH_SHA_MISMATCH"
    exit 2
  }
  [[ -f "$RUNTIME_FILE" && "$(sha_file "$RUNTIME_FILE")" == "$RUNTIME_SHA" ]] || {
    echo "OVERNIGHT_REFUSED:RUNTIME_SHA_MISMATCH"
    exit 2
  }
  [[ -f "$PREPROBE" && "$(sha_file "$PREPROBE")" == "$PREPROBE_SHA" ]] || {
    echo "OVERNIGHT_REFUSED:PREPROBE_SHA_MISMATCH"
    exit 2
  }
  [[ -f "$SMOKE_RUNTIME" && "$(sha_file "$SMOKE_RUNTIME")" == "$SMOKE_RUNTIME_SHA" ]] || {
    echo "OVERNIGHT_REFUSED:SMOKE_RUNTIME_SHA_MISMATCH"
    exit 2
  }
}

sleep_until_utc() {
  local target="$1"
  local now target_s delta
  now="$(date -u +%s)"
  target_s="$(date -u -d "$target" +%s)"
  delta=$((target_s-now))
  if (( delta > 0 )); then
    echo "OVERNIGHT_WAIT target=$target seconds=$delta"
    sleep "$delta"
  fi
}

run_preflight_capture() {
  local label="$1"
  local stamp stdout receipt receipt_sha
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  stdout="artifacts/phase2g-overnight-${label}-preflight-${stamp}.stdout.log"

  set +e
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh preflight 2>&1 | tee "$stdout"
  local rc=${PIPESTATUS[0]}
  set -e

  if (( rc != 0 )); then
    echo "OVERNIGHT_STOP:${label}_PREFLIGHT_COMMAND_FAILED rc=$rc"
    return "$rc"
  fi

  receipt="$(grep '^PREFLIGHT_RECEIPT=' "$stdout" | tail -1 | cut -d= -f2-)"
  [[ -n "$receipt" && -f "$receipt" ]] || {
    echo "OVERNIGHT_STOP:${label}_PREFLIGHT_RECEIPT_MISSING"
    return 2
  }
  receipt_sha="$(sha_file "$receipt")"

  PREFLIGHT_FILE="$receipt" PREFLIGHT_SHA="$receipt_sha" EXPECTED_HEAD="$EXPECTED_HEAD" node <<'NODE'
const fs = require("fs");
const file = process.env.PREFLIGHT_FILE;
const r = JSON.parse(fs.readFileSync(file, "utf8"));
console.log(JSON.stringify({
  status: r.status,
  blockers: r.blockers,
  next_candidate: r.gate2_runtime?.next_candidate,
  expected_icao: r.gate2_runtime?.expected_icao,
  compact6_validated: r.gate2_runtime?.compact6_validated,
  git_head: r.git_head,
  callback: r.callback,
}, null, 2));
NODE

  printf '%s\n' "$receipt"
  printf '%s\n' "$receipt_sha"
}

assert_final_pass_receipt() {
  local receipt="$1"
  local receipt_sha="$2"
  PREFLIGHT="$receipt" PREFLIGHT_SHA="$receipt_sha" EXPECTED_HEAD="$EXPECTED_HEAD" AUTH_SHA="$AUTH_SHA" RUNTIME_SHA="$RUNTIME_SHA" BUDGET_DAY="$BUDGET_DAY" EXPECTED_ICAO="$EXPECTED_ICAO" node <<'NODE'
const fs = require("fs");
const crypto = require("crypto");
const file = process.env.PREFLIGHT;
const raw = fs.readFileSync(file);
const sha = crypto.createHash("sha256").update(raw).digest("hex");
const r = JSON.parse(raw.toString("utf8"));
const fail = (m) => { console.error("OVERNIGHT_STOP:" + m); process.exit(2); };
if (sha !== process.env.PREFLIGHT_SHA) fail("PREFLIGHT_SHA_CHANGED");
if (r.schema !== "v39.phase2g-stage1-paid-preflight.v1") fail("PREFLIGHT_SCHEMA");
if (r.status !== "PASS_READY_FOR_PAID_STAGE1") fail("PREFLIGHT_NOT_READY_" + r.status);
if (!Array.isArray(r.blockers) || r.blockers.length !== 0) fail("PREFLIGHT_BLOCKERS");
if (r.git_head !== process.env.EXPECTED_HEAD) fail("PREFLIGHT_HEAD");
if (r.auth?.sha256 !== process.env.AUTH_SHA) fail("PREFLIGHT_AUTH_SHA");
if (r.gate2_runtime?.file_sha256 !== process.env.RUNTIME_SHA) fail("PREFLIGHT_RUNTIME_SHA");
if (r.gate2_runtime?.probe_budget_day_id !== process.env.BUDGET_DAY) fail("PREFLIGHT_BUDGET");
if (r.gate2_runtime?.next_candidate !== process.env.EXPECTED_ICAO) fail("PREFLIGHT_NEXT_CANDIDATE");
if (r.gate2_runtime?.expected_icao !== process.env.EXPECTED_ICAO) fail("PREFLIGHT_EXPECTED_ICAO");
if (r.gate2_runtime?.compact6_validated !== true) fail("PREFLIGHT_COMPACT6");
if (r.callback?.reachable !== true || r.callback?.exact_contract !== true || r.callback?.source_compatible_with_current_head !== true) {
  fail("PREFLIGHT_CALLBACK");
}
const generated = Date.parse(String(r.generated_at_utc || ""));
const age = Date.now() - generated;
if (!Number.isFinite(generated) || age < -30000 || age > 10 * 60 * 1000) fail("PREFLIGHT_STALE");
console.log("OVERNIGHT_FINAL_PREFLIGHT=PASS");
NODE
}

run_health_check() {
  local status="$1" heartbeat="$2" pid_file="$3" log="$4"
  npx tsx scripts/v39_phase2g_stage1_sleep_check_v39.ts \
    --auth "$AUTH_ID" \
    --expected-head "$EXPECTED_HEAD" \
    --probe-budget-day-id "$BUDGET_DAY" \
    --status "$status" \
    --heartbeat "$heartbeat" \
    --pid-file "$pid_file" \
    --log "$log"
}

run_guard() {
  assert_static_bindings

  local now_s latest_s
  now_s="$(date -u +%s)"
  latest_s="$(date -u -d "$LATEST_SAFE_START_UTC" +%s)"
  if (( now_s >= latest_s )); then
    echo "OVERNIGHT_STOP:TOO_LATE_TO_ARM_OR_LAUNCH"
    exit 2
  fi

  echo "OVERNIGHT_GUARD_ARMED=YES"
  echo "EXPECTED_HEAD=$EXPECTED_HEAD"
  echo "AUTH=$AUTH_ID"
  echo "BUDGET_DAY=$BUDGET_DAY"
  echo "EXPECTED_ICAO=$EXPECTED_ICAO"
  echo "EARLY_PREFLIGHT_UTC=$EARLY_PREFLIGHT_UTC"
  echo "AUTH_START_UTC=$AUTH_START_UTC"
  echo "LATEST_SAFE_START_UTC=$LATEST_SAFE_START_UTC"

  # While waiting, do not mutate provider state.
  sleep_until_utc "$EARLY_PREFLIGHT_UTC"
  assert_static_bindings

  # Early read-only preflight is diagnostic. It may legitimately say
  # PASS_WAIT_FOR_AUTH_START. A command failure/blocker stops the overnight run.
  local early_out
  set +e
  early_out="$(run_preflight_capture early)"
  local early_rc=$?
  set -e
  printf '%s\n' "$early_out"
  if (( early_rc != 0 )); then
    echo "OVERNIGHT_STOP:EARLY_PREFLIGHT_FAILED"
    exit "$early_rc"
  fi

  sleep_until_utc "$AUTH_START_UTC"
  assert_static_bindings

  now_s="$(date -u +%s)"
  latest_s="$(date -u -d "$LATEST_SAFE_START_UTC" +%s)"
  if (( now_s >= latest_s )); then
    echo "OVERNIGHT_STOP:LATEST_SAFE_START_EXCEEDED"
    exit 2
  fi

  # Final fresh preflight. Only exact PASS_READY permits the existing paid launcher.
  local final_capture final_receipt final_sha
  set +e
  final_capture="$(run_preflight_capture final)"
  local final_rc=$?
  set -e
  printf '%s\n' "$final_capture"
  if (( final_rc != 0 )); then
    echo "OVERNIGHT_STOP:FINAL_PREFLIGHT_FAILED"
    exit "$final_rc"
  fi
  final_receipt="$(printf '%s\n' "$final_capture" | tail -2 | head -1)"
  final_sha="$(printf '%s\n' "$final_capture" | tail -1)"
  [[ -f "$final_receipt" && "$final_sha" =~ ^[a-f0-9]{64}$ ]] || {
    echo "OVERNIGHT_STOP:FINAL_PREFLIGHT_CAPTURE_INVALID"
    exit 2
  }
  assert_final_pass_receipt "$final_receipt" "$final_sha"

  local launch_out launch_log
  launch_log="artifacts/phase2g-overnight-paid-launch-$(date -u +%Y%m%dT%H%M%SZ).stdout.log"
  bash scripts/v39_phase2g_stage1_launch_logged_v39.sh \
    --auth "$AUTH_ID" \
    --auth-file "$AUTH_FILE" \
    --auth-sha "$AUTH_SHA" \
    --runtime-file "$RUNTIME_FILE" \
    --runtime-sha "$RUNTIME_SHA" \
    --preprobe "$PREPROBE" \
    --preprobe-sha "$PREPROBE_SHA" \
    --smoke "$SMOKE" \
    --smoke-runtime-file "$SMOKE_RUNTIME" \
    --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
    --preflight "$final_receipt" \
    --preflight-sha "$final_sha" \
    --expected-head "$EXPECTED_HEAD" \
    --probe-budget-day-id "$BUDGET_DAY" \
    --expected-icao "$EXPECTED_ICAO" \
    | tee "$launch_log"

  # Extract exact paid artifacts from launch JSON.
  local status heartbeat pid_file log
  status="$(node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8");const m=s.match(/"status_file":\s*"([^"]+)"/);if(m)process.stdout.write(m[1])' "$launch_log")"
  heartbeat="$(node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8");const m=s.match(/"heartbeat_file":\s*"([^"]+)"/);if(m)process.stdout.write(m[1])' "$launch_log")"
  pid_file="$(node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8");const m=s.match(/"pid_file":\s*"([^"]+)"/);if(m)process.stdout.write(m[1])' "$launch_log")"
  log="$(node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8");const m=s.match(/"log_file":\s*"([^"]+)"/);if(m)process.stdout.write(m[1])' "$launch_log")"
  for f in "$status" "$heartbeat" "$pid_file" "$log"; do
    [[ -n "$f" ]] || { echo "OVERNIGHT_STOP:LAUNCH_ARTIFACT_PATH_PARSE_FAILED"; exit 2; }
  done

  echo "OVERNIGHT_PAID_LAUNCH=STARTED_ONCE"
  echo "STATUS_FILE=$status"
  echo "HEARTBEAT_FILE=$heartbeat"
  echo "PID_FILE=$pid_file"
  echo "LOG_FILE=$log"

  # Give owner time to create and bind the provider subscription.
  sleep 90

  # Read-only health proof. Never relaunch.
  set +e
  run_health_check "$status" "$heartbeat" "$pid_file" "$log"
  local health_rc=$?
  set -e
  if (( health_rc != 0 )); then
    echo "OVERNIGHT_MONITOR=BLOCKED_DO_NOT_RELAUNCH"
    exit "$health_rc"
  fi

  # Continue read-only monitoring every 5 minutes while supervisor says RUNNING.
  while true; do
    sleep 300
    local state
    state="$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(j.state||""))}catch{}' "$status")"
    if [[ "$state" == "RUNNING" || "$state" == "STARTING" ]]; then
      set +e
      run_health_check "$status" "$heartbeat" "$pid_file" "$log"
      health_rc=$?
      set -e
      if (( health_rc != 0 )); then
        echo "OVERNIGHT_MONITOR=BLOCKED_DO_NOT_RELAUNCH"
        exit "$health_rc"
      fi
      continue
    fi

    echo "OVERNIGHT_SUPERVISOR_FINAL_STATE=$state"
    cat "$status" || true
    tail -120 "$log" || true
    exit 0
  done
}

mode="${1:-}"
case "$mode" in
  --detach)
    [[ "${PHASE2G_OVERNIGHT_ARM:-}" == "YES" ]] || {
      echo "REFUSED:PHASE2G_OVERNIGHT_ARM=YES_REQUIRED"
      exit 2
    }
    assert_static_bindings
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    out="artifacts/phase2g-overnight-guard-${stamp}.log"
    pid_file="artifacts/phase2g-overnight-guard-${stamp}.pid"
    setsid bash "$0" --run >"$out" 2>&1 < /dev/null &
    pid=$!
    printf '%s\n' "$pid" >"$pid_file"
    sleep 2
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "REFUSED:OVERNIGHT_GUARD_EXITED_EARLY"
      cat "$out" || true
      exit 2
    fi
    echo "OVERNIGHT_GUARD=ARMED"
    echo "OVERNIGHT_GUARD_PID=$pid"
    echo "OVERNIGHT_GUARD_PID_FILE=$pid_file"
    echo "OVERNIGHT_GUARD_LOG=$out"
    echo "IMPORTANT=This guard may launch exactly one paid WSSS probe only after exact PASS_READY_FOR_PAID_STAGE1. It never retries."
    ;;
  --run)
    run_guard
    ;;
  --status)
    latest="$(ls -1t artifacts/phase2g-overnight-guard-*.log 2>/dev/null | head -1 || true)"
    [[ -n "$latest" ]] || { echo "OVERNIGHT_GUARD_STATUS=NOT_ARMED"; exit 2; }
    echo "OVERNIGHT_GUARD_LOG=$latest"
    tail -120 "$latest"
    ;;
  *)
    usage
    exit 2
    ;;
esac
