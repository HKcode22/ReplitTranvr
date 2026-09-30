#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PREPROBE="artifacts/preprobe-reference-freeze-record.json"
SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"
AMENDMENT="artifacts/phase2g-compact6-identity-v2-recovery-freeze-20260925.json"
EXPECTED_AMENDMENT_SHA="d8798dbc23d5bce45f62a255e98da0d00c5cbce9d669529fff6b34b2733d6741"

EXPECTED_ICAO="MMUN"
RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20260930-15.json"
BUDGET="P2G-S1-20260930-15"
AUTH="SEPmd/V3.9_PHASE2G_AUTH_20260930_P2G16.json"
AUTH_ID="AUTH-20260930-P2G16"
AUTH_START="2026-09-30T11:00:00Z"
AUTH_EXPIRES="2026-09-30T15:10:00Z"

require_repo_state() {
  [[ "$(git branch --show-current)" == "main" ]] || {
    echo "REFUSED:WRONG_BRANCH expected=main current=$(git branch --show-current)"
    exit 2
  }

  local head remote protected
  head="$(git rev-parse HEAD)"
  remote="$(git rev-parse origin/main 2>/dev/null || true)"
  [[ -n "$remote" && "$head" == "$remote" ]] || {
    echo "REFUSED:LOCAL_MAIN_NOT_SYNCED"
    echo "local_head=$head"
    echo "origin_main=${remote:-<missing>}"
    echo "Run: git fetch origin main && git pull --ff-only origin main"
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

verify_v2_freeze() {
  [[ -f "$AMENDMENT" ]] || {
    echo "REFUSED:V2_RECOVERY_FREEZE_MISSING=$AMENDMENT"
    exit 2
  }
  local actual
  actual="$(sha256sum "$AMENDMENT" | awk '{print $1}')"
  [[ "$actual" == "$EXPECTED_AMENDMENT_SHA" ]] || {
    echo "REFUSED:V2_RECOVERY_FREEZE_SHA_MISMATCH"
    echo "expected=$EXPECTED_AMENDMENT_SHA"
    echo "actual=$actual"
    exit 2
  }
  echo "V2_RECOVERY_FREEZE_SHA=$actual"
}

case "${1:-help}" in
  static)
    require_repo_state
    verify_v2_freeze
    npx vitest run \
      tests/phase2g_stage1_persistent_launch_v39.test.ts \
      tests/phase2g_stage1_rerun_policy_v39.test.ts \
      tests/phase2g_compact6_reconciliation_v39.test.ts \
      tests/phase2g_zero_credit_callback_binding_v39.test.ts \
      tests/phase2g_historical_failure_regressions_v39.test.ts \
      tests/phase2g_boot_migration_v39.test.ts \
      tests/phase2g_scientific_health_v39.test.ts \
      tests/phase2g_scientific_observability_wiring_v39.test.ts \
      tests/prepaid_identity_adapter_v39.test.ts \
      tests/prepaid_identity_persistence_v39.test.ts \
      tests/prepaid_identity_resolution_v39.test.ts \
      tests/prepaid_physical_metrics_v39.test.ts \
      tests/anchor_promotion_v39.test.ts \
      tests/phase2g_tuesday_omaa_v2_prepare_v39.test.ts \
      tests/phase2g_wednesday_mmun_v2_prepare_v39.test.ts
    npx tsc --noEmit
    echo "WEDNESDAY_MMUN_V2_STATIC=PASS"
    ;;

  readonly-preflight)
    require_repo_state
    verify_v2_freeze
    echo "expected_icao=$EXPECTED_ICAO"
    echo "provider_call=read_only_balance_and_subscription_list"
    echo "provider_mutation=false"
    echo "alert_credits_spent=0"
    bash scripts/v39_phase2g_preflight_current_v39.sh
    ;;

  runtime)
    require_repo_state
    verify_v2_freeze
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
    echo "WEDNESDAY_MMUN_RUNTIME_SHA=$(sha256sum "$RUNTIME" | awk '{print $1}')"
    echo "WEDNESDAY_MMUN_V2_AMENDMENT_SHA=$(sha256sum "$AMENDMENT" | awk '{print $1}')"
    ;;

  auth-draft)
    require_repo_state
    verify_v2_freeze
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
    echo "WEDNESDAY_MMUN_AUTH_SHA=$(sha256sum "$AUTH" | awk '{print $1}')"
    echo "DRAFT_ONLY_NOT_AUTHORIZED=true"
    ;;

  auth-approve)
    require_repo_state
    verify_v2_freeze
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
    verify_v2_freeze
    [[ -n "${REPLIT_DEV_DOMAIN:-}" ]] || { echo "REFUSED:REPLIT_DEV_DOMAIN_MISSING"; exit 2; }
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
  bash scripts/v39_phase2g_wednesday_mmun_v2_prepare_v39.sh static
  bash scripts/v39_phase2g_wednesday_mmun_v2_prepare_v39.sh readonly-preflight
  bash scripts/v39_phase2g_wednesday_mmun_v2_prepare_v39.sh runtime
  bash scripts/v39_phase2g_wednesday_mmun_v2_prepare_v39.sh auth-draft
  PHASE2G_CONFIRM_AUTH_SHA=<exact_sha> bash scripts/v39_phase2g_wednesday_mmun_v2_prepare_v39.sh auth-approve
  bash scripts/v39_phase2g_wednesday_mmun_v2_prepare_v39.sh zero-credit-binding

Wednesday MMUN-v2 target:
  - Expected frozen candidate: MMUN.
  - Physical identity contract: v39-physical-flight-instance-v2.
  - Eligible Stage-1 class: weekday, centered at 12:00 UTC (eligible ±1h).
  - 2026-09-30 execution window: 11:00–13:00 UTC.
  - California translation on 2026-09-30: 04:00–06:00 PDT.
  - Preferred start: 11:00 UTC / 04:00 PDT.
  - Target duration: 120 minutes.
  - Stage-1 reservation: 450 Alert credits.
  - Frozen unsettled margin: 50 Alert credits.
  - Protected residual balance floor enforced by paid preflight: 1000 credits.
  - Required balance before start under current guard: at least 1500 credits.

Safety:
  - This helper has NO paid-launch mode.
  - It cannot create or delete an AeroDataBox subscription.
  - static/runtime/auth-draft/auth-approve/zero-credit-binding spend 0 Alert credits.
  - readonly-preflight performs provider balance/subscription LIST reads only and spends 0 Alert credits.
  - The helper refuses if local main is not equal to origin/main.
  - The final paid workflow must explicitly supply expected_icao=MMUN.
  - Do not launch MMUN unless WSSS-v2 and OMAA-v2 are terminal under the frozen recovery, all prior budgets are CLOSED, active/settling probes are 0, open incidents are 0, provider balance is sufficient, fresh callback binding is valid, and the exact paid preflight returns PASS_READY_FOR_PAID_STAGE1.
EOF
    ;;
esac
