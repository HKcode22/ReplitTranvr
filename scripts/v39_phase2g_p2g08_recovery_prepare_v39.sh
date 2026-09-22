#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
BRANCH="phase2g-weekend-hardening-20260918"
PREPROBE="artifacts/preprobe-reference-freeze-record.json"
SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json"
SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json"
SMOKE_RUNTIME_SHA="58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232"
AMENDMENT="artifacts/phase2g-compact6-p2g08-balance502-recovery-freeze-20260922.json"
RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20260922-08.json"
BUDGET="P2G-S1-20260922-08"
AUTH="SEPmd/V3.9_PHASE2G_AUTH_20260922_P2G09.json"
AUTH_ID="AUTH-20260922-P2G09"
AUTH_START="2026-09-22T12:00:00Z"
AUTH_EXPIRES="2026-09-22T15:00:00Z"

require_repo_state() {
  [[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo "REFUSED:WRONG_BRANCH"; exit 2; }
  local protected
  protected="$(git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests)"
  [[ -z "$protected" ]] || { echo "REFUSED:PROTECTED_SOURCE_TREE_DIRTY"; printf '%s\n' "$protected"; exit 2; }
  echo "SOURCE_STATE=PASS"
  echo "GIT_HEAD=$(git rev-parse HEAD)"
}

case "${1:-help}" in
  static)
    require_repo_state
    npx vitest run tests/phase2g_stage1_rerun_policy_v39.test.ts tests/phase2g_stage1_persistent_launch_v39.test.ts tests/phase2g_compact6_reconciliation_v39.test.ts tests/phase2g_probe_guard_band_v39.test.ts tests/prepaid_probe_runtime_v39.test.ts
    npx tsc --noEmit
    echo "P2G09_STATIC=PASS"
    ;;
  runtime)
    require_repo_state
    [[ ! -e "$RUNTIME" ]] || { echo "RUNTIME_ALREADY_EXISTS=$RUNTIME"; sha256sum "$RUNTIME"; exit 0; }
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
    echo "P2G09_RUNTIME_SHA=$(sha256sum "$RUNTIME" | awk '{print $1}')"
    echo "P2G09_AMENDMENT_SHA=$(sha256sum "$AMENDMENT" | awk '{print $1}')"
    ;;
  auth-draft)
    require_repo_state
    [[ -f "$RUNTIME" ]] || { echo "REFUSED:RUNTIME_MISSING"; exit 2; }
    runtime_sha="$(sha256sum "$RUNTIME" | awk '{print $1}')"
    [[ ! -e "$AUTH" ]] || { echo "AUTH_ALREADY_EXISTS=$AUTH"; sha256sum "$AUTH"; cat "$AUTH"; exit 0; }
    npx tsx scripts/v39_prepare_phase2g_auth_v39.ts \
      --auth "$AUTH_ID" \
      --alert-ceiling 500 \
      --start "$AUTH_START" \
      --expires "$AUTH_EXPIRES" \
      --cleanup-owner "scripts/v39_probe_stage1_owner_v39.ts" \
      --out "$AUTH" \
      --runtime-file "$RUNTIME" \
      --runtime-sha "$runtime_sha" \
      --smoke "$SMOKE" \
      --smoke-runtime-file "$SMOKE_RUNTIME" \
      --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
      --preprobe "$PREPROBE"
    echo "P2G09_AUTH_SHA=$(sha256sum "$AUTH" | awk '{print $1}')"
    ;;
  auth-approve)
    require_repo_state
    runtime_sha="$(sha256sum "$RUNTIME" | awk '{print $1}')"
    auth_sha="$(sha256sum "$AUTH" | awk '{print $1}')"
    [[ "${PHASE2G_CONFIRM_AUTH_SHA:-}" == "$auth_sha" ]] || { echo "REFUSED:AUTH_SHA_CONFIRMATION_REQUIRED"; echo "actual_auth_sha=$auth_sha"; exit 2; }
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
  preflight)
    require_repo_state
    callback_base="${PHASE2G_PUBLISHED_CALLBACK_BASE:-}"
    [[ -n "$callback_base" ]] || { echo "REFUSED:PHASE2G_PUBLISHED_CALLBACK_BASE_REQUIRED"; exit 2; }
    runtime_sha="$(sha256sum "$RUNTIME" | awk '{print $1}')"
    auth_sha="$(sha256sum "$AUTH" | awk '{print $1}')"
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    out="artifacts/phase2g-stage1-paid-preflight-P2G09-${stamp}.json"
    npx tsx scripts/v39_phase2g_stage1_paid_preflight_v39.ts \
      --preprobe "$PREPROBE" \
      --smoke "$SMOKE" \
      --smoke-runtime-file "$SMOKE_RUNTIME" \
      --smoke-runtime-sha "$SMOKE_RUNTIME_SHA" \
      --runtime-file "$RUNTIME" \
      --runtime-sha "$runtime_sha" \
      --auth-file "$AUTH" \
      --auth-sha "$auth_sha" \
      --expected-head "$(git rev-parse HEAD)" \
      --expected-icao WSSS \
      --callback-base "$callback_base" \
      --owner-executor github-actions \
      --out "$out"
    echo "PREFLIGHT_RECEIPT=$out"
    echo "PREFLIGHT_SHA=$(sha256sum "$out" | awk '{print $1}')"
    ;;
  *)
    echo "Usage: static | runtime | auth-draft | auth-approve | preflight"
    ;;
esac
