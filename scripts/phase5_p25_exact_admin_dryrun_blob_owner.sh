#!/usr/bin/env bash
# Phase5 P25 exact administrative closeout: reviewed DRY-RUN ONLY.
# Immutable Git blobs -> exclusive ephemeral TS files; no checkout/pull/reset,
# no provider mutation, webhook, SQL writes, object read/delete, or paid GO.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo "HOLD_P25_ADMIN_DRYRUN_NO_WORKSPACE"; exit 2; }
REPO='HKcode22/ReplitTranvr'
LOCAL_PIN='a2d75104cfa4c74d6936da4bc06bf15939671cc0'
OLD_PIN='29544c30e3c9833fd85035e75999ccf2d2e021f6'
LIMITER_BLOB='c6438e63181fe76c7aa0217504a8d5888ad00ec3'
DB_BLOB='6986e2467b9df6da9715e8890730979da8acf204'
GUARD_BLOB='653fd19a464e5d08bf349867cd51a0bbb44a40aa'
RUNNER_BLOB='df66b9c4c68096fd0722eb23f5dbe413ca198906'
GUARD='server/lib/disruption/phase2gP25PairedAdministrativeCloseout_v39.ts'
TMP_SCRIPT=''
HELPER_CREATED=0
cleanup(){
  if [[ -n "$TMP_SCRIPT" && -f "$TMP_SCRIPT" ]]; then rm -f -- "$TMP_SCRIPT"; fi
  if [[ "$HELPER_CREATED" == 1 && -f "$GUARD" ]]; then rm -f -- "$GUARD"; fi
}
trap cleanup EXIT
hold(){ echo "HOLD_P25_EXACT_ADMIN_DRYRUN_NOT_PERFORMED: $1" >&2; exit 2; }
for t in gh git node; do command -v "$t" >/dev/null || hold "MISSING_$t"; done
[[ -x node_modules/.bin/tsx ]] || hold TSX_MISSING
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
[[ "$(git rev-parse HEAD 2>/dev/null)" == "$LOCAL_PIN" ]] || hold LOCAL_REPLIT_HEAD_CHANGED
git merge-base --is-ancestor "$OLD_PIN" "$LOCAL_PIN" || hold REVIEWED_ANCESTRY_MISSING
[[ "$(git hash-object server/lib/disruption/aerodataboxLimiter_v3.ts 2>/dev/null)" == "$LIMITER_BLOB" ]] || hold PROVIDER_STRICT_LIST_SOURCE_CHANGED
[[ "$(git hash-object server/lib/disruption/db_v39.ts 2>/dev/null)" == "$DB_BLOB" ]] || hold RUNTIME_DB_SOURCE_CHANGED
[[ -n "${AERODATABOX_API_KEY:-}" ]] || hold PROVIDER_LIST_KEY_MISSING
[[ -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || hold RUNTIME_DB_URL_MISSING
[[ ! -e "$GUARD" ]] || hold NEW_HELPER_PATH_COLLISION_PRESERVE_LOCAL
TMP_SCRIPT="$(mktemp --suffix=.ts "$PWD/scripts/.p25-admin-dryrun-XXXXXXXX")" ||
  hold TEMP_RUNNER_CREATE_FAILED
touch "$GUARD" || hold HELPER_FILE_CREATE_FAILED
HELPER_CREATED=1
gh api "repos/$REPO/git/blobs/$GUARD_BLOB" --jq .content |
  base64 --decode > "$GUARD" || hold HELPER_DOWNLOAD_FAILED
gh api "repos/$REPO/git/blobs/$RUNNER_BLOB" --jq .content |
  base64 --decode > "$TMP_SCRIPT" || hold RUNNER_DOWNLOAD_FAILED
[[ "$(git hash-object "$GUARD")" == "$GUARD_BLOB" ]] ||
  hold REVIEWED_HELPER_HASH_MISMATCH
[[ "$(git hash-object "$TMP_SCRIPT")" == "$RUNNER_BLOB" ]] ||
  hold REVIEWED_RUNNER_HASH_MISMATCH
printf 'P25_EXACT_ADMIN_DRYRUN_SOURCE_VERIFIED_NO_APPLY; STRICT_PROVIDER_LIST_READ_POSSIBLE\n'
node_modules/.bin/tsx "$TMP_SCRIPT" --dry-run
printf 'P25_EXACT_ADMIN_DRYRUN_RETURNED; NO_SQL_MUTATIONS_NO_WEBHOOK_NO_PROVIDER_WRITES\n'
