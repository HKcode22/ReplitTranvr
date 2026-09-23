#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PREPROBE="artifacts/preprobe-reference-freeze-record.json"
SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"
AMENDMENT="artifacts/phase2g-compact6-p2g10-secret-mismatch-recovery-freeze-20260923.json"
RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20260924-10.json"
BUDGET="P2G-S1-20260924-10"
AUTH="SEPmd/V3.9_PHASE2G_AUTH_20260924_P2G11.json"
AUTH_ID="AUTH-20260924-P2G11"
AUTH_START="2026-09-24T11:00:00Z"
AUTH_EXPIRES="2026-09-24T15:10:00Z"

require_repo_state() {
  [[ "$(git branch --show-current)" == "main" ]] || {
    echo "REFUSED:WRONG_BRANCH expected=main current=$(git branch --show-current)"
    exit 2
  }
  local protected
  protected="$(git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests)"
  [[ -z "$protected" ]] || {
    echo "REFUSED:PROTECTED_SOURCE_TREE_DIRTY"
    printf '%s\n' "$protected"
    exit 2
  }
  echo "SOURCE_STATE=PASS"
  echo "GIT_HEAD=$(git rev-parse HEAD)"
}

case "${1:-help}" in
  static)
    require_repo_state
    npx vitest run \
      tests/phase2g_same_app_dev_callback_contingency_v39.test.ts \
      tests/phase2g_stage1_persistent_launch_v39.test.ts \
      tests/phase2g_stage1_rerun_policy_v39.test.ts \
      tests/phase2g_compact6_reconciliation_v39.test.ts \
      tests/phase2g_zero_credit_secret_binding_workflow_v39.test.ts \
      tests/phase2g_p2g10_secret_mismatch_adjudication_v39.test.ts
    npx tsc --noEmit
    echo "THURSDAY_STATIC=PASS"
    ;;

  adjudicate-p2g10)
    require_repo_state
    [[ "${PHASE2G_CONFIRM_P2G10_ADJUDICATE:-}" == "YES" ]] || {
      echo "REFUSED:EXPLICIT_P2G10_ADJUDICATION_CONFIRMATION_REQUIRED"
      exit 2
    }
    echo "provider_call=subscription_list_read_only"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"
    echo "database_mutation=resolve_exact_P2G10_incident_and_close_exact_budget_only"
    npx tsx scripts/v39_phase2g_p2g10_secret_mismatch_adjudication_v39.ts
    ;;

  runtime)
    require_repo_state
    [[ ! -e "$RUNTIME" ]] || {
      echo "RUNTIME_ALREADY_EXISTS=$RUNTIME"
      sha256sum "$RUNTIME"
      exit 0
    }
    npx tsx scripts/v39_prepare_gate2_runtime_v39.ts \
      --preprobe "$PREPROBE" \
      --smoke "$SMOKE" \
      --smoke-runtime-file "$SMOKE_RUNTIME" \
      --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
      --out "$RUNTIME" \
      --probe-budget-day-id "$BUDGET" \
      --min-stability-buckets 6 \
      --stage1-reservation 450 \
      --stage2-reservation 450 \
      --stage1-amendment-file "$AMENDMENT"
    echo "THURSDAY_RUNTIME_SHA=$(sha256sum "$RUNTIME" | awk '{print $1}')"
    echo "THURSDAY_AMENDMENT_SHA=$(sha256sum "$AMENDMENT" | awk '{print $1}')"
    ;;

  auth-draft)
    require_repo_state
    [[ -f "$RUNTIME" ]] || { echo "REFUSED:RUNTIME_MISSING"; exit 2; }
    runtime_sha="$(sha256sum "$RUNTIME" | awk '{print $1}')"
    [[ ! -e "$AUTH" ]] || {
      echo "AUTH_ALREADY_EXISTS=$AUTH"
      sha256sum "$AUTH"
      exit 0
    }
    npx tsx scripts/v39_prepare_phase2g_auth_v39.ts \
      --auth "$AUTH_ID" \
      --alert-ceiling 500 \
      --start "$AUTH_START" \
      --expires "$AUTH_EXPIRES" \
      --cleanup-owner "scripts/v39_phase2g_github_actions_owner_v39.sh" \
      --out "$AUTH" \
      --runtime-file "$RUNTIME" \
      --runtime-sha "$runtime_sha" \
      --smoke "$SMOKE" \
      --smoke-runtime-file "$SMOKE_RUNTIME" \
      --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
      --preprobe "$PREPROBE"
    echo "THURSDAY_AUTH_SHA=$(sha256sum "$AUTH" | awk '{print $1}')"
    echo "DRAFT_ONLY_NOT_AUTHORIZED=true"
    ;;

  auth-approve)
    require_repo_state
    [[ -f "$RUNTIME" && -f "$AUTH" ]] || { echo "REFUSED:RUNTIME_OR_AUTH_MISSING"; exit 2; }
    runtime_sha="$(sha256sum "$RUNTIME" | awk '{print $1}')"
    auth_sha="$(sha256sum "$AUTH" | awk '{print $1}')"
    [[ "${PHASE2G_CONFIRM_AUTH_SHA:-}" == "$auth_sha" ]] || {
      echo "REFUSED:AUTH_SHA_CONFIRMATION_REQUIRED"
      echo "actual_auth_sha=$auth_sha"
      exit 2
    }
    npx tsx scripts/v39_approve_phase2g_auth_v39.ts \
      --expected-sha "$auth_sha" \
      --auth-file "$AUTH" \
      --runtime-file "$RUNTIME" \
      --runtime-sha "$runtime_sha" \
      --smoke "$SMOKE" \
      --smoke-runtime-file "$SMOKE_RUNTIME" \
      --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
      --preprobe "$PREPROBE"
    ;;

  zero-credit-binding)
    require_repo_state
    [[ -n "${REPLIT_DEV_DOMAIN:-}" ]] || { echo "REFUSED:REPLIT_DEV_DOMAIN_MISSING"; exit 2; }
    echo "provider_call=false"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"
    gh workflow run phase2g-zero-credit-secret-binding.yml \
      --ref main \
      -f callback_base="https://${REPLIT_DEV_DOMAIN}" \
      -f expected_head="$(git rev-parse HEAD)"
    ;;

  *)
    cat <<'EOF'
Usage:
  bash scripts/v39_phase2g_thursday_prepare_v39.sh static
  PHASE2G_CONFIRM_P2G10_ADJUDICATE=YES bash scripts/v39_phase2g_thursday_prepare_v39.sh adjudicate-p2g10
  bash scripts/v39_phase2g_thursday_prepare_v39.sh runtime
  bash scripts/v39_phase2g_thursday_prepare_v39.sh auth-draft
  PHASE2G_CONFIRM_AUTH_SHA=<exact_sha> bash scripts/v39_phase2g_thursday_prepare_v39.sh auth-approve
  bash scripts/v39_phase2g_thursday_prepare_v39.sh zero-credit-binding

Safety:
  - This helper has NO paid-launch mode.
  - static/runtime/auth-draft/auth-approve/zero-credit-binding create no provider subscription.
  - adjudicate-p2g10 performs provider LIST read only and exact DB closeout only.
  - zero-credit-binding makes no AeroDataBox provider call and spends 0 Alert credits.
EOF
    ;;
esac
