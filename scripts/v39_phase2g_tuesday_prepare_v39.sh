#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

BRANCH="phase2g-weekend-hardening-20260918"
SESSION="e45ef007-6129-4b95-bd29-80a1d700be6e"
RECON="artifacts/P2G06-WSSS-reconstruction-precleanup-20260922T064215Z.json"
RECON_SHA="635aec4f6da80d4ebe5cd314eecf4fe27b20442e0fd6994129ba7389b646aa0d"
CLEANUP="artifacts/phase2g-exact-session-purpose-cleanup-p2g06-wsss-final-1790059551714.json"
CLEANUP_SHA="ee4fce51d932a93a69fd0fe8a349ff95106742530a88412b540aee7735588bf3"

SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"
PREPROBE="artifacts/preprobe-reference-freeze-record.json"
COMPACT6="artifacts/phase2g-compact6-amendment-freeze-20260921.json"
FRESH_RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20260922-06.json"
FRESH_BUDGET_DAY="P2G-S1-20260922-06"
FRESH_AUTH="SEPmd/V3.9_PHASE2G_AUTH_20260922_P2G07.json"
FRESH_AUTH_ID="AUTH-20260922-P2G07"
FRESH_AUTH_START="2026-09-22T11:00:00Z"
FRESH_AUTH_EXPIRES="2026-09-22T15:00:00Z"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh status
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh static
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh p2g06-dry-run
  PHASE2G_CONFIRM_P2G06_APPLY=YES bash scripts/v39_phase2g_tuesday_prepare_v39.sh p2g06-apply
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh callback-verify
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh post-close
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh fresh-runtime
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh auth-draft
  PHASE2G_CONFIRM_AUTH_SHA=<64hex> bash scripts/v39_phase2g_tuesday_prepare_v39.sh auth-approve
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh preflight

Safety:
  - This helper NEVER launches a paid Stage-1 probe.
  - status/static: no provider calls, no provider mutations, no Alert credits.
  - p2g06-dry-run: provider subscription LIST read only; no provider mutation; 0 Alert credits.
  - p2g06-apply: provider subscription LIST read + historical DB adjudication only;
    no provider subscription mutation; 0 Alert credits.
  - callback-verify: synthetic Replit callback/storage verification only;
    no AeroDataBox provider call; 0 Alert credits.
  - fresh-runtime/auth-draft/auth-approve: local evidence/ledger writes only; no provider call.
  - preflight: provider balance/subscription READS only; no provider mutation; 0 Alert credits.
  - This helper has no paid-launch mode.
EOF
}

require_repo_state() {
  local current_branch
  current_branch="$(git branch --show-current)"
  [[ "$current_branch" == "$BRANCH" ]] || {
    echo "REFUSED:WRONG_BRANCH current=$current_branch expected=$BRANCH"
    exit 2
  }

  local protected
  protected="$(git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests)"
  if [[ -n "$protected" ]]; then
    echo "REFUSED:PROTECTED_SOURCE_TREE_DIRTY"
    printf '%s\n' "$protected"
    exit 2
  fi

  echo "SOURCE_STATE=PASS"
  echo "GIT_HEAD=$(git rev-parse HEAD)"
}

verify_artifact() {
  local file="$1"
  local expected="$2"
  local label="$3"

  [[ -f "$file" ]] || {
    echo "REFUSED:${label}_MISSING file=$file"
    exit 2
  }

  local actual
  actual="$(sha256sum "$file" | awk '{print $1}')"
  if [[ "$actual" != "$expected" ]]; then
    echo "REFUSED:${label}_SHA_MISMATCH expected=$expected actual=$actual"
    exit 2
  fi
  echo "${label}_SHA=PASS"
}

status_db() {
  SESSION="$SESSION" node --input-type=module <<'NODE'
import "dotenv/config";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("REFUSED:DATABASE_URL_MISSING");
  process.exit(2);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
});

try {
  const session = process.env.SESSION;

  const result = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS open_incidents,
      (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status='probing') AS active_probes,
      (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime) AS runtime_sessions,
      (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime) AS runtime_deliveries,
      (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime) AS runtime_items,
      (SELECT count(*)::int FROM clean.provider_content_blob_ref
        WHERE source_kind='webhook'
          AND source_record_id LIKE $1
          AND deletion_verified_at_utc IS NULL) AS p2g06_live_blobs
  `, [`prepaid:${session}:%`]);

  const probe = await pool.query(`
    SELECT probe_id,icao,status,duration_censored,reconciliation_status,stop_reason,
           probe_budget_day_id,runtime_session_id,runtime_cleanup_verified_at_utc
      FROM clean.adb_anchor_probe
     WHERE probe_id=4
  `);

  const budget = await pool.query(`
    SELECT probe_budget_day_id,state,cap_credits,closed_at
      FROM clean.adb_probe_budget_day
     WHERE probe_budget_day_id='P2G-S1-20260921-05'
  `);

  const incident = await pool.query(`
    SELECT id,cause,resolved,resolved_at_utc
      FROM clean.adb_incident_stop
     WHERE id=16
  `);

  console.log(JSON.stringify({
    state: result.rows[0],
    p2g06_probe: probe.rows[0] ?? null,
    p2g06_budget: budget.rows[0] ?? null,
    p2g06_incident: incident.rows[0] ?? null,
  }, null, 2));
} finally {
  await pool.end();
}
NODE
}

run_status() {
  echo "=== PHASE2G TUESDAY STATUS ==="
  echo "provider_call=false"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  require_repo_state
  verify_artifact "$RECON" "$RECON_SHA" "P2G06_RECONSTRUCTION"
  verify_artifact "$CLEANUP" "$CLEANUP_SHA" "P2G06_CLEANUP"
  status_db
}

run_dry_run() {
  echo "=== P2G06 ADJUDICATION DRY RUN ==="
  echo "provider_call=subscription_list_read_only"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  echo "database_mutation=false"
  require_repo_state
  verify_artifact "$RECON" "$RECON_SHA" "P2G06_RECONSTRUCTION"
  verify_artifact "$CLEANUP" "$CLEANUP_SHA" "P2G06_CLEANUP"

  npx tsx scripts/v39_phase2g_p2g06_mismatch_adjudication_v39.ts \
    --reconstruction "$RECON" \
    --cleanup-evidence "$CLEANUP"
}

run_apply() {
  [[ "${PHASE2G_CONFIRM_P2G06_APPLY:-}" == "YES" ]] || {
    echo "REFUSED:EXPLICIT_CONFIRMATION_REQUIRED"
    echo "Run exactly:"
    echo "PHASE2G_CONFIRM_P2G06_APPLY=YES bash scripts/v39_phase2g_tuesday_prepare_v39.sh p2g06-apply"
    exit 2
  }

  echo "=== P2G06 ADJUDICATION APPLY ==="
  echo "provider_call=subscription_list_read_only"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  echo "database_mutation=historical_incident_budget_closeout_only"
  require_repo_state
  verify_artifact "$RECON" "$RECON_SHA" "P2G06_RECONSTRUCTION"
  verify_artifact "$CLEANUP" "$CLEANUP_SHA" "P2G06_CLEANUP"

  npx tsx scripts/v39_phase2g_p2g06_mismatch_adjudication_v39.ts \
    --reconstruction "$RECON" \
    --cleanup-evidence "$CLEANUP" \
    --apply

  echo
  echo "=== POST-APPLY STATE ==="
  status_db
}

run_callback_verify() {
  echo "=== WORKSPACE CALLBACK SYNTHETIC VERIFY ==="
  echo "provider_call=false"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  echo "note=creates_and_cleans_one_synthetic_Replit_callback_object"
  require_repo_state
  bash scripts/v39_prepare_phase2f_workspace_callback_v39.sh
}

run_post_close() {
  run_status
  echo
  run_callback_verify
}

run_fresh_runtime() {
  echo "=== FRESH TUESDAY GATE2 RUNTIME ==="
  echo "provider_call=false"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  echo "database_mutation=false"
  require_repo_state

  if [[ -f "$FRESH_RUNTIME" ]]; then
    echo "FRESH_RUNTIME_ALREADY_EXISTS=$FRESH_RUNTIME"
    sha256sum "$FRESH_RUNTIME"
    return
  fi

  npx tsx scripts/v39_prepare_gate2_runtime_v39.ts \
    --preprobe "$PREPROBE" \
    --smoke "$SMOKE" \
    --smoke-runtime-file "$SMOKE_RUNTIME" \
    --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
    --out "$FRESH_RUNTIME" \
    --probe-budget-day-id "$FRESH_BUDGET_DAY" \
    --min-stability-buckets 6 \
    --stage1-reservation 450 \
    --stage2-reservation 450 \
    --stage1-amendment-file "$COMPACT6"

  echo "FRESH_RUNTIME_SHA256=$(sha256sum "$FRESH_RUNTIME" | awk '{print $1}')"
}

run_auth_draft() {
  echo "=== FRESH TUESDAY AUTH DRAFT ==="
  echo "provider_call=false"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  echo "database_mutation=false"
  require_repo_state
  [[ -f "$FRESH_RUNTIME" ]] || {
    echo "REFUSED:FRESH_RUNTIME_MISSING"
    exit 2
  }

  local runtime_sha
  runtime_sha="$(sha256sum "$FRESH_RUNTIME" | awk '{print $1}')"

  if [[ -f "$FRESH_AUTH" ]]; then
    echo "FRESH_AUTH_ALREADY_EXISTS=$FRESH_AUTH"
    echo "FRESH_AUTH_SHA256=$(sha256sum "$FRESH_AUTH" | awk '{print $1}')"
    cat "$FRESH_AUTH"
    return
  fi

  npx tsx scripts/v39_prepare_phase2g_auth_v39.ts \
    --auth "$FRESH_AUTH_ID" \
    --alert-ceiling 500 \
    --start "$FRESH_AUTH_START" \
    --expires "$FRESH_AUTH_EXPIRES" \
    --cleanup-owner "scripts/v39_probe_stage1_owner_v39.ts" \
    --out "$FRESH_AUTH" \
    --runtime-file "$FRESH_RUNTIME" \
    --runtime-sha "$runtime_sha" \
    --smoke "$SMOKE" \
    --smoke-runtime-file "$SMOKE_RUNTIME" \
    --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
    --preprobe "$PREPROBE"

  echo "FRESH_AUTH_SHA256=$(sha256sum "$FRESH_AUTH" | awk '{print $1}')"
  echo "AUTH_REVIEW_REQUIRED_BEFORE_APPROVAL=true"
}

run_auth_approve() {
  echo "=== FRESH TUESDAY AUTH APPROVAL ==="
  echo "provider_call=false"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  echo "database_mutation=false"
  require_repo_state

  [[ -f "$FRESH_RUNTIME" && -f "$FRESH_AUTH" ]] || {
    echo "REFUSED:FRESH_RUNTIME_OR_AUTH_MISSING"
    exit 2
  }

  local runtime_sha auth_sha confirmed
  runtime_sha="$(sha256sum "$FRESH_RUNTIME" | awk '{print $1}')"
  auth_sha="$(sha256sum "$FRESH_AUTH" | awk '{print $1}')"
  confirmed="${PHASE2G_CONFIRM_AUTH_SHA:-}"

  [[ "$confirmed" == "$auth_sha" ]] || {
    echo "REFUSED:AUTH_SHA_CONFIRMATION_REQUIRED"
    echo "actual_auth_sha=$auth_sha"
    echo "Run after human review:"
    echo "PHASE2G_CONFIRM_AUTH_SHA=$auth_sha bash scripts/v39_phase2g_tuesday_prepare_v39.sh auth-approve"
    exit 2
  }

  npx tsx scripts/v39_approve_phase2g_auth_v39.ts \
    --expected-sha "$auth_sha" \
    --auth-file "$FRESH_AUTH" \
    --runtime-file "$FRESH_RUNTIME" \
    --runtime-sha "$runtime_sha" \
    --smoke "$SMOKE" \
    --smoke-runtime-file "$SMOKE_RUNTIME" \
    --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
    --preprobe "$PREPROBE"
}

run_preflight() {
  echo "=== FRESH TUESDAY PAID-STAGE1 PREFLIGHT ==="
  echo "provider_call=balance_and_subscription_reads_only"
  echo "provider_mutation=false"
  echo "alert_credits_spent=0"
  require_repo_state

  [[ -f "$FRESH_RUNTIME" && -f "$FRESH_AUTH" ]] || {
    echo "REFUSED:FRESH_RUNTIME_OR_AUTH_MISSING"
    exit 2
  }

  local runtime_sha auth_sha now_s start_s seconds_until_start
  runtime_sha="$(sha256sum "$FRESH_RUNTIME" | awk '{print $1}')"
  auth_sha="$(sha256sum "$FRESH_AUTH" | awk '{print $1}')"
  now_s="$(date -u +%s)"
  start_s="$(date -u -d "$FRESH_AUTH_START" +%s)"
  seconds_until_start=$((start_s-now_s))

  if (( seconds_until_start > 1800 )); then
    echo "REFUSED:PREFLIGHT_TOO_EARLY seconds_until_auth_start=$seconds_until_start"
    echo "Earliest useful final preflight is 30 minutes before $FRESH_AUTH_START"
    exit 2
  fi

  local stamp out
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  out="artifacts/phase2g-stage1-paid-preflight-P2G07-${stamp}.json"

  npx tsx scripts/v39_phase2g_stage1_paid_preflight_v39.ts \
    --preprobe "$PREPROBE" \
    --smoke "$SMOKE" \
    --smoke-runtime-file "$SMOKE_RUNTIME" \
    --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
    --runtime-file "$FRESH_RUNTIME" \
    --runtime-sha "$runtime_sha" \
    --auth-file "$FRESH_AUTH" \
    --auth-sha "$auth_sha" \
    --expected-head "$(git rev-parse HEAD)" \
    --expected-icao WSSS \
    --out "$out"

  echo "PREFLIGHT_RECEIPT=$out"
}

mode="${1:-help}"
case "$mode" in
  help|-h|--help) usage ;;
  status) run_status ;;
  static)
    require_repo_state
    bash scripts/v39_phase2g_tuesday_static_readiness_v39.sh
    ;;
  p2g06-dry-run) run_dry_run ;;
  p2g06-apply) run_apply ;;
  callback-verify) run_callback_verify ;;
  post-close) run_post_close ;;
  fresh-runtime) run_fresh_runtime ;;
  auth-draft) run_auth_draft ;;
  auth-approve) run_auth_approve ;;
  preflight) run_preflight ;;
  *)
    echo "REFUSED:UNKNOWN_MODE=$mode"
    usage
    exit 2
    ;;
esac
