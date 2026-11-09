#!/usr/bin/env bash
# Owner-only full-frame five crossover pair candidate PRESELECTION READ ONLY.
# No provider HTTP, no payments, no PostgreSQL writes, no pair/calendar freeze.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo HOLD_P5_FULLFRAME_PAIR_NO_WORKSPACE; exit 2; }
REPO="HKcode22/ReplitTranvr"
BASE="bb1baf1ae3a2c5e99b0ccc12304d9d43ee22bfe0"
SOURCE="scripts/v39_phase5_fullframe_five_pair_preselection_readonly_once.mjs"
PIN="1e68ffd70b177476d598f42646ffb9976088de01"
hold(){ printf "HOLD_P5_FULLFRAME_PAIR_NO_EXECUTION: %s\n" "$1" >&2; exit 2; }
for c in gh git node base64 mktemp; do command -v "$c" >/dev/null 2>&1 || hold "MISSING_$c"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
[[ -n "${DATABASE_URL:-}" && -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || hold OWNER_DATABASE_MISSING
[[ "$DATABASE_URL" != "$V39_DATABASE_RUNTIME_URL" ]] || hold RUNTIME_DB_NOT_SEPARATE
[[ -d scripts && -d node_modules/pg ]] || hold LOCAL_NODE_PG_MISSING
LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold GITHUB_MAIN_MISSING
LINEAGE="$(gh api "repos/$REPO/compare/$BASE...$LIVE" --jq '.status')" || hold REVIEWED_ANCESTRY_UNKNOWN
[[ "$LINEAGE" == "ahead" || "$LINEAGE" == "identical" ]] || hold MAIN_NOT_DESCENDANT
ACTUAL="$(gh api "repos/$REPO/contents/$SOURCE?ref=$LIVE" --jq '.sha')" || hold REVIEWED_SOURCE_ABSENT
[[ "$ACTUAL" == "$PIN" ]] || hold EXACT_SOURCE_SHA_CHANGED
PASS="$(gh api "repos/$REPO/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[]|select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")]|length')" || hold MAIN_SAFETY_READ_FAILED
[[ "$PASS" -ge 1 ]] || hold MAIN_SAFETY_NOT_SUCCESS
TMP="$(mktemp "$PWD/scripts/.p5_pair_readonly_XXXXXXXX.mjs")" || hold LOCAL_TMP_FAILED
trap 'rm -f "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$PIN" --jq '.content' | base64 --decode > "$TMP" || hold GITHUB_BLOB_UNAVAILABLE
[[ "$(git hash-object "$TMP")" == "$PIN" ]] || hold DOWNLOADED_BLOB_DIGEST_DIFFERENT
echo "PHASE5_FIVE_PAIR_FULL_FRAME_SEEDED_SELECTION_SOURCE_AND_MAIN_VERIFIED_READONLY"
env ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP"
