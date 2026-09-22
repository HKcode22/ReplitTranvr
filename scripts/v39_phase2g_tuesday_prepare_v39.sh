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

usage() {
  cat <<'EOF'
Usage:
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh status
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh static
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh p2g06-dry-run
  PHASE2G_CONFIRM_P2G06_APPLY=YES bash scripts/v39_phase2g_tuesday_prepare_v39.sh p2g06-apply
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh callback-verify
  bash scripts/v39_phase2g_tuesday_prepare_v39.sh post-close

Safety:
  - This helper NEVER launches a paid Stage-1 probe.
  - status/static: no provider calls, no provider mutations, no Alert credits.
  - p2g06-dry-run: provider subscription LIST read only; no provider mutation; 0 Alert credits.
  - p2g06-apply: provider subscription LIST read + historical DB adjudication only;
    no provider subscription mutation; 0 Alert credits.
  - callback-verify: synthetic Replit callback/storage verification only;
    no AeroDataBox provider call; 0 Alert credits.
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
  *)
    echo "REFUSED:UNKNOWN_MODE=$mode"
    usage
    exit 2
    ;;
esac
