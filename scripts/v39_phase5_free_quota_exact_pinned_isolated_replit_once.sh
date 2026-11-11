#!/usr/bin/env bash
# Owner Replit-shell ONE-SHOT / free AeroDataBox balance only.
#
# Solves HOLD_LOCAL_CODE_NOT_REVIEWED without overwriting any owner local file.
# Downloads immutable reviewed source blobs into a NEW PRIVATE TEMP DIRECTORY.
# No checkout/reset, npm install, pg, paid FIDS, Alert mutation, refill, or SQL.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
# Main SHA after earlier independent PRs #562 and #563; these source files
# are reviewed unchanged at this stable commit.
PIN="d095548b276fe0700f9bf1c7c93579ed7cac3af7"

hold(){ printf 'HOLD_FREE_QUOTA_ISOLATED_NO_PROVIDER_SPEND_INFERRED: %s\n' "$1"; exit 2; }
command -v gh >/dev/null 2>&1 || hold "GH_MISSING"
command -v git >/dev/null 2>&1 || hold "GIT_MISSING"
command -v base64 >/dev/null 2>&1 || hold "BASE64_MISSING"
command -v mktemp >/dev/null 2>&1 || hold "MKTEMP_MISSING"
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"

ROOT="$(pwd -P)"
test -f "$ROOT/package.json" || hold "RUN_IN_REPLIT_WORKSPACE_ROOT"
test -x "$ROOT/node_modules/.bin/tsx" || hold "LOCAL_TSX_DEPENDENCY_MISSING_DO_NOT_INSTALL"
test -d "$ROOT/node_modules/dotenv" || hold "DOTENV_MODULE_MISSING_DO_NOT_INSTALL"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/p5-free-quota-exact.XXXXXXXX")" ||
  hold "TEMP_DIRECTORY_UNAVAILABLE"
cleanup(){ if [[ -n "${TMP:-}" && -d "$TMP" ]]; then rm -rf -- "$TMP"; fi; }
trap cleanup EXIT

download_checked(){
  local path="$1" expected="$2" target="$TMP/$1" actual
  mkdir -p -- "$(dirname "$target")"
  if ! gh api "repos/$REPO/contents/$path?ref=$PIN" --jq '.content' \
    | tr -d '\n' | base64 --decode > "$target"; then
    hold "PINNED_SOURCE_DOWNLOAD_FAILED"
  fi
  actual="$(git hash-object "$target")" || hold "GIT_HASH_UNAVAILABLE"
  if [[ "$actual" != "$expected" ]]; then
    hold "PINNED_SOURCE_BLOB_CHANGED_OR_DOWNLOAD_INCOMPLETE"
  fi
}

printf '=== ISOLATED EXACT GITHUB BLOBS (NO LOCAL REPLIT EDITS) ===\n'
download_checked "scripts/v39_phase4_account_quota_readonly_once.ts" \
  "7a7951f09b730fa60105d9e99e5b885ff78848ba"
download_checked "server/lib/disruption/phase4Gate5LegacyUltraAccountRecall_v39.ts" \
  "5b9e2ef66c38e45dbbb4fde1ee7cf89f6a0bc07c"
download_checked "server/lib/disruption/aerodataboxLimiter_v3.ts" \
  "bf960455d883e16bb569f648981593d5290d1009"
download_checked "data-collection/evidence/early-gates/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json" \
  "fcf19009bf3974e7fcfc82a1f70cdff744781953"
download_checked "data-collection/evidence/original-artifacts/other/retention-deployment-evidence-20260911.json" \
  "cff4f2ec575fab019916780e76a0336e3d6ea38d"

ln -s -- "$ROOT/node_modules" "$TMP/node_modules"
# dotenv's explicit path is needed only when the user's Replit account
# keeps its key in the ORIGINAL private workspace .env instead of env vars.
if [[ -f "$ROOT/.env" ]]; then export DOTENV_CONFIG_PATH="$ROOT/.env"; fi

printf 'PINNED_FIVE_FILES_VERIFIED_NO_WORKSPACE_OVERWRITE\n'
cd "$TMP"
printf '=== FREE AERODATABOX ACCOUNT METADATA (NO FIDS, NO ALERT MUTATION) ===\n'
"$ROOT/node_modules/.bin/tsx" \
  scripts/v39_phase4_account_quota_readonly_once.ts
printf 'P5_FREE_QUOTA_ISOLATED_CHECK_COMPLETED\n'
