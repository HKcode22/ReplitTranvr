#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PREPROBE="artifacts/preprobe-reference-freeze-record.json"
SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"

AMENDMENT="artifacts/phase2g-compact6-p2g17-mmun-delivery-gap-recovery-freeze-20261001.json"
EXPECTED_AMENDMENT_SHA="7ace48ceaf4b929189b2d65d97c6de5e6a6d06a7de88470133c197442b9d2568"

CLEANUP="artifacts/phase2g-exact-session-purpose-cleanup-P2G17-MMUN-20260930-1790817643233.json"
EXPECTED_CLEANUP_SHA="7a1fb4622e4adffbda4ba88a04c2243cf702504414d78c7a1bfd862eafe1fd2e"

EXPECTED_ICAO="MMUN"
RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20261001-17.json"
BUDGET="P2G-S1-20261001-17"
AUTH="SEPmd/V3.9_PHASE2G_AUTH_20261001_P2G18.json"
AUTH_ID="AUTH-20261001-P2G18"
AUTH_START="2026-10-01T11:00:00Z"
AUTH_EXPIRES="2026-10-01T15:10:00Z"

require_repo_state() {
  [[ "$(git branch --show-current)" == "main" ]] || {
    echo "REFUSED:WRONG_BRANCH expected=main current=$(git branch --show-current)"
    exit 2
  }

  git fetch origin main >/dev/null 2>&1 || true

  local head remote protected
  head="$(git rev-parse HEAD)"
  remote="$(git rev-parse origin/main 2>/dev/null || true)"
  [[ -n "$remote" && "$head" == "$remote" ]] || {
    echo "REFUSED:LOCAL_MAIN_NOT_SYNCED"
    echo "local_head=$head"
    echo "origin_main=${remote:-<missing>}"
    exit 2
  }

  protected="$(git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests .github/workflows)"
  [[ -z "$protected" ]] || {
    echo "REFUSED:PROTECTED_SOURCE_TREE_DIRTY"
    printf '%s\n' "$protected"
    exit 2
  }

  echo "SOURCE_STATE=PASS"
  echo "GIT_HEAD=$head"
}

verify_recovery_freeze() {
  [[ -f "$AMENDMENT" ]] || {
    echo "REFUSED:P2G17_RECOVERY_FREEZE_MISSING=$AMENDMENT"
    exit 2
  }
  local actual
  actual="$(sha256sum "$AMENDMENT" | awk '{print $1}')"
  [[ "$actual" == "$EXPECTED_AMENDMENT_SHA" ]] || {
    echo "REFUSED:P2G17_RECOVERY_FREEZE_SHA_MISMATCH"
    echo "expected=$EXPECTED_AMENDMENT_SHA"
    echo "actual=$actual"
    exit 2
  }
  echo "P2G17_RECOVERY_FREEZE_SHA=$actual"
}

verify_cleanup_receipt() {
  [[ -f "$CLEANUP" ]] || {
    echo "REFUSED:P2G17_CLEANUP_RECEIPT_MISSING=$CLEANUP"
    exit 2
  }
  local actual
  actual="$(sha256sum "$CLEANUP" | awk '{print $1}')"
  [[ "$actual" == "$EXPECTED_CLEANUP_SHA" ]] || {
    echo "REFUSED:P2G17_CLEANUP_RECEIPT_SHA_MISMATCH"
    echo "expected=$EXPECTED_CLEANUP_SHA"
    echo "actual=$actual"
    exit 2
  }
  echo "P2G17_CLEANUP_RECEIPT_SHA=$actual"
}

case "${1:-help}" in
  static)
    require_repo_state
    verify_recovery_freeze
    npx vitest run \
      tests/phase2g_p2g17_mmun_recovery_v39.test.ts \
      tests/phase2g_stage1_rerun_policy_v39.test.ts \
      tests/phase2g_compact6_reconciliation_v39.test.ts \
      tests/phase2g_delivery_gap_schema_v39.test.ts \
      tests/phase2g_stage1_persistent_launch_v39.test.ts \
      tests/phase2g_source_head_auth_binding_v39.test.ts \
      tests/phase2g_wednesday_mmun_v2_prepare_v39.test.ts \
      tests/prepaid_physical_metrics_v39.test.ts
    npx tsc --noEmit
    echo "P2G17_MMUN_RECOVERY_STATIC=PASS"
    ;;

  adjudication-dry)
    require_repo_state
    verify_recovery_freeze
    verify_cleanup_receipt
    echo "provider_call=subscription_list_read_only"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"
    echo "database_mutation=false"
    npx tsx scripts/v39_phase2g_p2g17_mmun_adjudication_v39.ts \
      --cleanup-file "$CLEANUP"
    ;;

  adjudicate)
    require_repo_state
    verify_recovery_freeze
    verify_cleanup_receipt
    [[ "${PHASE2G_CONFIRM_P2G17_ADJUDICATE:-}" == "YES" ]] || {
      echo "REFUSED:EXPLICIT_P2G17_ADJUDICATION_CONFIRMATION_REQUIRED"
      exit 2
    }
    echo "provider_call=subscription_list_read_only"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"
    echo "database_mutation=resolve_only_P2G17_incidents_and_close_only_P2G17_budget"
    npx tsx scripts/v39_phase2g_p2g17_mmun_adjudication_v39.ts \
      --cleanup-file "$CLEANUP" \
      --apply
    ;;

  readonly-preflight)
    require_repo_state
    verify_recovery_freeze
    echo "expected_icao=$EXPECTED_ICAO"
    echo "provider_call=read_only_balance_and_subscription_list"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"
    bash scripts/v39_phase2g_preflight_current_v39.sh
    ;;

  runtime)
    require_repo_state
    verify_recovery_freeze
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
    echo "P2G18_RUNTIME_SHA=$(sha256sum "$RUNTIME" | awk '{print $1}')"
    echo "P2G17_RECOVERY_AMENDMENT_SHA=$(sha256sum "$AMENDMENT" | awk '{print $1}')"
    ;;

  auth-draft)
    require_repo_state
    verify_recovery_freeze
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
    echo "P2G18_AUTH_SHA=$(sha256sum "$AUTH" | awk '{print $1}')"
    echo "DRAFT_ONLY_NOT_AUTHORIZED=true"
    ;;

  auth-approve)
    require_repo_state
    verify_recovery_freeze
    [[ -f "$RUNTIME" && -f "$AUTH" ]] || {
      echo "REFUSED:RUNTIME_OR_AUTH_MISSING"
      exit 2
    }
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
    verify_recovery_freeze
    [[ -n "${REPLIT_DEV_DOMAIN:-}" ]] || {
      echo "REFUSED:REPLIT_DEV_DOMAIN_MISSING"
      exit 2
    }
    echo "expected_icao=$EXPECTED_ICAO"
    echo "provider_call=false"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"
    gh workflow run phase2g-zero-credit-callback-binding.yml \
      --ref main \
      -f callback_base="https://${REPLIT_DEV_DOMAIN}" \
      -f expected_head="$(git rev-parse HEAD)"
    ;;

  *)
    cat <<'EOF'
Usage:
  bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh static
  bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh adjudication-dry
  PHASE2G_CONFIRM_P2G17_ADJUDICATE=YES bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh adjudicate
  bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh readonly-preflight
  bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh runtime
  bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh auth-draft
  PHASE2G_CONFIRM_AUTH_SHA=<exact_sha> bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh auth-approve
  bash scripts/v39_phase2g_thursday_mmun_p2g17_recovery_prepare_v39.sh zero-credit-binding

Recovery target:
  - ICAO: MMUN.
  - Physical identity contract: v39-physical-flight-instance-v2.
  - Technical-invalid source attempt: P2G17 / probe 13 only.
  - P2G17 durable settlement: DELIVERY_GAP, external 65, received 60, gap 5.
  - P2G17 remains immutable and excluded from scoring.
  - Recovery authorization is one additional matched-time attempt only.
  - The recovery attempt consumes the authorization regardless of scientific outcome.
  - A further technical failure does not automatically authorize another attempt.
  - Fresh budget: P2G-S1-20261001-17.
  - Fresh AUTH: AUTH-20261001-P2G18.
  - Matched Stage-1 window: 2026-10-01 11:00–13:00 UTC (04:00–06:00 PDT).
  - Target duration: 120 minutes.
  - Stage-1 reservation: 450 Alert credits.
  - Frozen unsettled margin: 50 Alert credits.

Safety:
  - This helper has NO paid-launch mode.
  - static/runtime/auth-draft/auth-approve/zero-credit-binding spend 0 Alert credits.
  - adjudication-dry performs provider subscription LIST read only and no DB mutation.
  - adjudicate performs provider subscription LIST read only and narrowly resolves P2G17 incident(s)/closes the P2G17 budget.
  - readonly-preflight performs provider balance/subscription LIST reads only and spends 0 Alert credits.
  - Paid execution remains exclusively in phase2g-paid-stage1.yml and requires a separately approved exact AUTH.
EOF
    ;;
esac
