#!/usr/bin/env bash
# Read-only Phase5 production inventory; exact reviewed Git blob.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo 'HOLD_P5_READONLY_WORKSPACE_MISSING'; exit 2; }
REPO='HKcode22/ReplitTranvr'
REVIEWED='31f0fc61c680aed31a7d2553266f85ec06d95e43'
SOURCE='scripts/v39_phase5_final_freeze_readonly_release_inventory_once.mjs'
BLOB='0be5d015455e646ed15a24232622afe091da6027'
hold(){ echo "HOLD_P5_READONLY: $1" >&2; exit 2; }
for c in gh git base64 node mktemp; do command -v "$c" >/dev/null || hold "MISSING_$c"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_NOT_AUTHENTICATED
[[ -n "${DATABASE_URL:-}" && -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || hold DB_ENV_MISSING
[[ "$DATABASE_URL" != "$V39_DATABASE_RUNTIME_URL" ]] || hold OWNER_RUNTIME_DB_IDENTICAL
[[ -d scripts && -d node_modules/pg ]] || hold RUNTIME_DEPENDENCIES_MISSING
LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_UNAVAILABLE
STATUS="$(gh api "repos/$REPO/compare/$REVIEWED...$LIVE" --jq .status)" || hold MAIN_ANCESTRY_UNKNOWN
[[ "$STATUS" == ahead || "$STATUS" == identical ]] || hold UNREVIEWED_BRANCH_ANCESTRY
ACTUAL="$(gh api "repos/$REPO/contents/$SOURCE?ref=$LIVE" --jq '.sha')" || hold SCRIPT_ABSENT
[[ "$ACTUAL" == "$BLOB" ]] || hold READONLY_SCRIPT_CHANGED
CI="$(gh api "repos/$REPO/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[] | select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")] | length')" || hold GITHUB_MAIN_CI_UNAVAILABLE
[[ "$CI" -ge 1 ]] || hold MAIN_OFFLINE_SAFETY_NOT_GREEN
TMP="$(mktemp "$PWD/scripts/.p5_release_readonly_XXXXXXXX.mjs")" || hold TEMP_FAILED
trap 'rm -f "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$BLOB" --jq .content | base64 --decode > "$TMP" || hold GH_BLOB_FETCH_FAILED
[[ "$(git hash-object "$TMP")" == "$BLOB" ]] || hold GH_BLOB_HASH_CHANGED
echo 'PHASE5_READONLY_RELEASE_INVENTORY_EXACT_MAIN_PIN_OK; NO_PROVIDER_HTTP'
env ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP"
