#!/usr/bin/env bash
# Phase 5: non-mutating explanation of the historical exact-HEAD preflight HOLD.
# Never sends a signed POST, accesses SQL, invokes a provider, or changes Git.
set -Eeuo pipefail
set +x
cd "$HOME/workspace" 2>/dev/null || {
  printf 'HOLD WORKSPACE_DIRECTORY_MISSING; NO_POST_NO_DB_NO_PROVIDER\n'
  exit 2
}

REPO='HKcode22/ReplitTranvr'
REVIEWED_PIN='29544c30e3c9833fd85035e75999ccf2d2e021f6'
SIGNED_TEST='scripts/v39_phase2g_verify_live_callback_v39.ts'
SIGNED_TEST_BLOB='cbcc4783690e6e2c9acec392ac4e644392f3ac82'
failures=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf 'PASS %s\n' "$name"
  else
    printf 'HOLD %s\n' "$name"
    failures=$((failures + 1))
  fi
}
# Omit branches and filenames from output: no local application secrets are disclosed.
public_sha() { [[ "$1" =~ ^[0-9a-f]{40}$ ]]; }
reviewed_ancestor() { git merge-base --is-ancestor "$REVIEWED_PIN" "$LOCAL_HEAD"; }
remote_ancestor() {
  local relation
  relation="$(gh api "repos/$REPO/compare/$LOCAL_HEAD...main" --jq .status 2>/dev/null)" || return 1
  [[ "$relation" == ahead || "$relation" == identical ]]
}
protected_source_unchanged() {
  # All imported server logic, signed callback test, dependency tree and release
  # build metadata must be the same as at reviewed PR #485 source.
  git diff --quiet "$REVIEWED_PIN" "$LOCAL_HEAD" -- \
    server shared package.json package-lock.json .replit \
    scripts/v39_phase2g_verify_live_callback_v39.ts \
    scripts/v39_phase2g_p25_historical_incident_smoke_scope_v39.ts
}
protected_worktree_clean() {
  git diff --quiet "$LOCAL_HEAD" -- \
    server shared package.json package-lock.json .replit \
    scripts/v39_phase2g_verify_live_callback_v39.ts \
    scripts/v39_phase2g_p25_historical_incident_smoke_scope_v39.ts
}
local_test_exact() { [[ "$(git hash-object "$SIGNED_TEST" 2>/dev/null)" == "$SIGNED_TEST_BLOB" ]]; }
github_test_exact() {
  local hash
  hash="$(gh api "repos/$REPO/contents/$SIGNED_TEST?ref=main" --jq .sha 2>/dev/null)" || return 1
  [[ "$hash" == "$SIGNED_TEST_BLOB" ]]
}

LOCAL_HEAD="$(git rev-parse HEAD 2>/dev/null)" || {
  printf 'HOLD LOCAL_GIT_HEAD_UNAVAILABLE; NO_POST_NO_DB_NO_PROVIDER\n'
  exit 2
}
MAIN_HEAD="$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha 2>/dev/null)" || {
  printf 'HOLD GITHUB_MAIN_UNAVAILABLE; NO_POST_NO_DB_NO_PROVIDER\n'
  exit 2
}
public_sha "$LOCAL_HEAD" && public_sha "$MAIN_HEAD" || {
  printf 'HOLD SHA_FORMAT_INVALID; NO_POST_NO_DB_NO_PROVIDER\n'
  exit 2
}
printf 'LOCAL_HEAD=%s\nGITHUB_MAIN_HEAD=%s\nHISTORICAL_EXACT_HEAD=%s\n' \
  "$LOCAL_HEAD" "$MAIN_HEAD" "$REVIEWED_PIN"
check LOCAL_HEAD_IS_HISTORICAL_EXACT_PIN test "$LOCAL_HEAD" = "$REVIEWED_PIN"
# This first condition intentionally reports HOLD for any newer commit;
# it is historical context, not part of the descendant safety verdict.
historical_exact="$([[ "$LOCAL_HEAD" == "$REVIEWED_PIN" ]] && echo YES || echo NO)"
failures=0
check HISTORICAL_PIN_IS_ANCESTOR_OF_LOCAL reviewed_ancestor
check LOCAL_COMMIT_IS_GITHUB_MAIN_ANCESTOR remote_ancestor
check PROTECTED_SOURCE_UNCHANGED_FROM_HISTORICAL_PIN protected_source_unchanged
check PROTECTED_WORKTREE_CLEAN protected_worktree_clean
check LOCAL_SIGNED_TEST_EXACT_HASH local_test_exact
check GITHUB_MAIN_SIGNED_TEST_EXACT_HASH github_test_exact

if [[ "$failures" == 0 ]]; then
  printf 'PHASE5_CHECKOUT_REVIEWED_DESCENDANT_SOURCE_DIAGNOSIS_PASS; HISTORICAL_EXACT=%s; READONLY_ONLY_NO_POST_NO_DB_NO_PROVIDER\n' "$historical_exact"
else
  printf 'PHASE5_CHECKOUT_DIAGNOSIS_HOLD_%s; DO_NOT_SEND_SIGNED_POST; NO_DB_NO_PROVIDER\n' "$failures"
  exit 2
fi
# A PASS here is only a checkout/source diagnostic. The historical one-shot
# POST command still has an exact-pin guard and has NOT been executed.
