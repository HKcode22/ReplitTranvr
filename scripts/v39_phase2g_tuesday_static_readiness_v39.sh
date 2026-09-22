#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

EXPECTED_COMPACT6_SHA="07c474f8440e3fdb222a18c660ed61a5fc25d018487fe0171aff6642637a5c45"
COMPACT6="artifacts/phase2g-compact6-amendment-freeze-20260921.json"

echo "=== PHASE2G TUESDAY STATIC READINESS ==="
echo "provider_call=false"
echo "provider_mutation=false"
echo "alert_credits_spent=0"

echo "=== GIT HEAD ==="
git rev-parse HEAD

echo "=== COMPACT6 HASH ==="
ACTUAL_COMPACT6_SHA="$(sha256sum "$COMPACT6" | awk '{print $1}')"
echo "$ACTUAL_COMPACT6_SHA  $COMPACT6"
if [[ "$ACTUAL_COMPACT6_SHA" != "$EXPECTED_COMPACT6_SHA" ]]; then
  echo "REFUSED:COMPACT6_HASH_MISMATCH"
  exit 2
fi

echo "=== PROTECTED SOURCE TREE ==="
PROTECTED_STATUS="$(git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests)"
if [[ -n "$PROTECTED_STATUS" ]]; then
  echo "REFUSED:PROTECTED_SOURCE_TREE_DIRTY"
  printf '%s\n' "$PROTECTED_STATUS"
  exit 2
fi
echo "PROTECTED_SOURCE_TREE_CLEAN"

echo "=== LAUNCHER SYNTAX ==="
bash -n scripts/v39_phase2g_stage1_launch_logged_v39.sh
echo "LAUNCHER_SYNTAX_PASS"

echo "=== TARGETED TESTS ==="
npx vitest run   tests/phase2g_compact6_reconciliation_v39.test.ts   tests/phase2g_runtime_survival_v39.test.ts   tests/phase2g_stage1_persistent_launch_v39.test.ts   tests/phase2g_stage1_rerun_policy_v39.test.ts   tests/phase2g_zero_credit_soak_v39.test.ts   tests/phase2g_exact_session_purpose_cleanup_v39.test.ts   tests/phase2g_probe_guard_band_v39.test.ts   tests/prepaid_probe_runtime_v39.test.ts

echo "=== TYPESCRIPT ==="
npx tsc --noEmit

echo "=== RESULT ==="
echo "PASS_PHASE2G_TUESDAY_STATIC_READINESS"
