#!/usr/bin/env bash
# Phase5 reviewed one-off owner READ ONLY post-selection scientific scope adjudication.
# No paid provider, no DB writes, no batch-day calendar freeze, no Git reset/pull.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo HOLD_OWNER_WORKSPACE_MISSING; exit 2; }
REPO="HKcode22/ReplitTranvr"
BASE="76dfb55bc2b0b35c8d2163e66fdbda7e5d1ca189"
SOURCE="scripts/v39_phase5_fullframe_five_pair_preselection_readonly_once.mjs"
PIN="e6e98ed576c33f8093eb3e8b0554a31a36aec952"
hold(){ printf "HOLD_P5_SCOPE_REVIEW_READONLY_NO_RUN: %s\n" "$1" >&2; exit 2; }
for c in gh git node base64 mktemp; do command -v "$c" >/dev/null 2>&1 || hold "MISSING_$c"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GITHUB_AUTH_MISSING
[[ -n "${DATABASE_URL:-}" && -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || hold TWO_DATABASE_URLS_MISSING
[[ "$DATABASE_URL" != "$V39_DATABASE_RUNTIME_URL" ]] || hold OWNER_DATABASE_URL_NOT_DISTINCT
[[ -d node_modules/pg && -d scripts ]] || hold LOCAL_PG_DEPENDENCY_MISSING
LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_MISSING
LINEAGE="$(gh api "repos/$REPO/compare/$BASE...$LIVE" --jq '.status')" || hold REVIEWED_ANCESTRY_UNKNOWN
[[ "$LINEAGE" == "identical" || "$LINEAGE" == "ahead" ]] || hold MAIN_NOT_DESCENDANT
ACTUAL="$(gh api "repos/$REPO/contents/$SOURCE?ref=$LIVE" --jq '.sha')" || hold SOURCE_NOT_FOUND
[[ "$ACTUAL" == "$PIN" ]] || hold SOURCE_PIN_DRIFT
GREEN="$(gh api "repos/$REPO/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[]|select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")]|length')" || hold SAFETY_LOOKUP_FAILED
[[ "$GREEN" -ge 1 ]] || hold MAIN_SAFETY_NOT_COMPLETED_SUCCESS
TMP="$(mktemp "$PWD/scripts/.p5_scopereview_XXXXXXXX.mjs")" || hold SAFE_TEMP_CREATION_FAILED
trap 'rm -f "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$PIN" --jq '.content' | base64 --decode > "$TMP" || hold SOURCE_BLOB_FETCH_FAILED
[[ "$(git hash-object "$TMP")" == "$PIN" ]] || hold GITHUB_BLOB_HASH_MISMATCH
echo "P5_PAIR3_KTEB_EXOGENOUS_SCOPE_ADJUDICATION_EXACT_SOURCE_AND_MAIN_VERIFIED"
env ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP"
