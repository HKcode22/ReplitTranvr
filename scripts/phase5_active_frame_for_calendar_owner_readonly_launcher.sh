#!/usr/bin/env bash
# Immutable GitHub-verified owner-only B0062 active frame READ ONLY scan.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo 'HOLD_P5_FRAME_WORKSPACE_MISSING'; exit 2; }
R='HKcode22/ReplitTranvr'
BASE='5f7f073539ca8cc9a84a6854cc24d17721e5c9f4'
SOURCE='scripts/v39_phase5_active_frame_for_calendar_readonly_once.mjs'
BLOB='4bf7f52c07c48fbfaa09811674f549d79d4aa336'
hold(){ echo "HOLD_P5_FRAME_READONLY: $1" >&2; exit 2; }
for c in gh git node base64 mktemp; do command -v "$c" >/dev/null 2>&1 || hold "MISSING_$c"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
[[ -n "${DATABASE_URL:-}" && -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || hold DB_ENV_MISSING
[[ "$DATABASE_URL" != "$V39_DATABASE_RUNTIME_URL" ]] || hold OWNER_RUNTIME_DB_URLS_IDENTICAL
[[ -d scripts && -d node_modules/pg ]] || hold LOCAL_PG_RUNTIME_MISSING
LIVE="$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_UNAVAILABLE
DESC="$(gh api "repos/$R/compare/$BASE...$LIVE" --jq '.status')" || hold MAIN_ANCESTRY_UNKNOWN
[[ "$DESC" == ahead || "$DESC" == identical ]] || hold MAIN_NOT_REVIEWED_DESCENDANT
SOURCE_SHA="$(gh api "repos/$R/contents/$SOURCE?ref=$LIVE" --jq '.sha')" || hold SOURCE_NOT_MERGED
[[ "$SOURCE_SHA" == "$BLOB" ]] || hold EXACT_FRAME_SOURCE_CHANGED
CHECKS="$(gh api "repos/$R/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[] | select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")] | length')" || hold MAIN_CI_UNAVAILABLE
[[ "$CHECKS" -ge 1 ]] || hold OFFLINE_SAFETY_NOT_GREEN
TMP="$(mktemp "$PWD/scripts/.p5_frame_verified_XXXXXXXX.mjs")" || hold TMP_FAILED
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP" || hold IMMUTABLE_BLOB_DOWNLOAD_FAILED
[[ "$(git hash-object "$TMP")" == "$BLOB" ]] || hold IMMUTABLE_BLOB_HASH_MISMATCH
echo 'PHASE5_ACTIVE_FRAME_EXACT_GITHUB_MAIN_AND_SOURCE_VERIFIED; NO_PROVIDER_HTTP'
env ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP"
