#!/usr/bin/env bash
# One-shot owner launcher for the already-reviewed Phase 5 final resume helper.
# It never creates review decisions. Missing/invalid private reviewed inputs HOLD
# before the consolidated helper performs an admitted transition.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
HELPER_BLOB="3fa07ba994069a9495e2e65880bf1954a3444708"
TESTED_RUN="44479965836"
TESTED_HEAD="72b781f0c8f1334c1e06cc3b9a560a07497514f9"

hold(){ printf 'HOLD_P5_FINAL_OWNER_ONCE: %s\n' "$1" >&2; exit 2; }

cd "$HOME/workspace" 2>/dev/null || hold "WORKSPACE_MISSING"
for c in gh git node base64 mktemp; do command -v "$c" >/dev/null || hold "MISSING_$c"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"
[[ -n "${DATABASE_URL:-}" ]] || hold "DATABASE_URL_MISSING"
[[ "${NODE_TLS_REJECT_UNAUTHORIZED:-}" != "0" ]] || hold "TLS_VERIFY_DISABLED"
[[ -d node_modules && -x node_modules/.bin/tsx ]] || hold "PINNED_DEPENDENCIES_MISSING"

read -r RUN_HEAD RUN_RESULT < <(
  gh api "repos/$REPO/actions/runs/$TESTED_RUN" --jq '[.head_sha,.conclusion] | @tsv'
) || hold "TESTED_RUN_UNAVAILABLE"
[[ "$RUN_HEAD" == "$TESTED_HEAD" && "$RUN_RESULT" == "success" ]] ||
  hold "FINAL_HELPER_CI_NOT_EXACT_GREEN"

TESTED_HELPER_BLOB="$(
  gh api "repos/$REPO/contents/review-tools/p5_resume_existing_final_commissioning.cjs?ref=$TESTED_HEAD"     --jq '.sha'
)" || hold "TESTED_HELPER_READ_FAILED"

[[ "$TESTED_HELPER_BLOB" == "$HELPER_BLOB" ]] ||
  hold "TESTED_HELPER_BLOB_MISMATCH"

TMP="$(mktemp --suffix=.cjs 2>/dev/null || mktemp "${TMPDIR:-/tmp}/p5-final-helper.XXXXXX.cjs")"
trap 'rm -f "$TMP"' EXIT

gh api "repos/$REPO/git/blobs/$HELPER_BLOB" --jq '.content' |
  base64 --decode > "$TMP" || hold "HELPER_FETCH_FAILED"
[[ "$(git hash-object "$TMP")" == "$HELPER_BLOB" ]] || hold "HELPER_BLOB_MISMATCH"
node --check "$TMP" >/dev/null || hold "HELPER_SYNTAX"

printf '%s\n' 'P5_FINAL_OWNER_ONCE_EXACT_HELPER_GREEN; entering consolidated no-replay resume'
env   ADB_AUTO_COLLECT=0   V39_PHASE6_PROCESS_ARMED=0   V39_PHASE6_OWNER_APPROVED=0   node "$TMP"
