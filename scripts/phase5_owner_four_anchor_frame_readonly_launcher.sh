#!/usr/bin/env bash
# One immutable reviewed READ ONLY production frame comparison for exactly:
# WSSS, OMAA, SKBO, YSSY. No account calls / provider / webhook / DB writes.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo HOLD_P5_FOUR_OWNER_FRAME_NO_WORKSPACE; exit 2; }
R='HKcode22/ReplitTranvr'
BASE='a0a92194f78a8283a0fda6ea1e20423d1dba1de7'
SOURCE='scripts/v39_phase5_owner_four_anchor_active_frame_readonly_once.mjs'
BLOB='2480a4c0869fd6a2388284734b7c065b14be751c'
hold(){ echo "HOLD_P5_FOUR_OWNER_FRAME_READONLY: $1" >&2; exit 2; }
for c in gh git node base64 mktemp; do command -v "$c" >/dev/null 2>&1 || hold "MISSING_$c"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
[[ -n "${DATABASE_URL:-}" && -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || hold DB_ENV_MISSING
[[ "$DATABASE_URL" != "$V39_DATABASE_RUNTIME_URL" ]] || hold OWNER_RUNTIME_DB_URLS_IDENTICAL
[[ -d scripts && -d node_modules/pg ]] || hold LOCAL_PG_RUNTIME_MISSING
LIVE="$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_UNAVAILABLE
DESC="$(gh api "repos/$R/compare/$BASE...$LIVE" --jq '.status')" || hold MAIN_ANCESTRY_UNKNOWN
[[ "$DESC" == 'ahead' || "$DESC" == 'identical' ]] || hold MAIN_NOT_REVIEWED_DESCENDANT
SOURCE_SHA="$(gh api "repos/$R/contents/$SOURCE?ref=$LIVE" --jq '.sha')" || hold SOURCE_NOT_MERGED
[[ "$SOURCE_SHA" == "$BLOB" ]] || hold EXACT_SOURCE_CHANGED
CHECKS="$(gh api "repos/$R/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[] | select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")] | length')" || hold LIVE_MAIN_CHECK_UNAVAILABLE
[[ "$CHECKS" -ge 1 ]] || hold LIVE_MAIN_OFFLINE_SAFETY_NOT_GREEN
TMP="$(mktemp "$PWD/scripts/.p5_four_owner_checked_XXXXXXXX.mjs")" || hold TMP_FAILED
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP" || hold IMMUTABLE_BLOB_READ_FAILED
[[ "$(git hash-object "$TMP")" == "$BLOB" ]] || hold IMMUTABLE_BLOB_SHA_MISMATCH
echo 'P5_OWNER_FOUR_ANCHOR_PINNED_SOURCE_AND_MAIN_VERIFIED_NO_PROVIDER_HTTP'
env ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP"
