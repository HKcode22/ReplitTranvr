#!/usr/bin/env bash
# Phase5 one-time zero-AeroDataBox synthetic signed receiver test.
# The Replit workspace may have a PRIVATE descendant of PR #485: never reset it.
# No Git mutation, provider GET, Alert subscription or Phase6 arming.
# After all guards pass, the reviewed TypeScript test creates ONE disposable
# local synthetic session, POSTs one fictitious flight to the published receiver,
# checks durable raw custody, and performs exact session/blob cleanup.
set -Eeuo pipefail
set +x
umask 077

REPO='HKcode22/ReplitTranvr'
LOCAL_PIN='a2d75104cfa4c74d6936da4bc06bf15939671cc0'
REVIEWED_PIN='29544c30e3c9833fd85035e75999ccf2d2e021f6'
TEST_PATH='scripts/v39_phase2g_verify_live_callback_v39.ts'
TEST_BLOB='cbcc4783690e6e2c9acec392ac4e644392f3ac82'
PUBLISHED_PIN='6c187d58e2b1339aace71079e27767523d8ca3ce'
PUBLISHED_ORIGIN='https://replit-tranvr--hk84164.replit.app'
fail(){ printf 'HOLD_P5_SYNTHETIC_SIGNED_POST_NO_ATTEMPT: %s\n' "$1" >&2; exit 2; }
cd "$HOME/workspace" || fail WORKSPACE_MISSING

for tool in gh git node; do
  command -v "$tool" >/dev/null 2>&1 || fail "MISSING_TOOL_$tool"
done
gh auth status --hostname github.com >/dev/null 2>&1 || fail GH_AUTH_MISSING
actual="$(git rev-parse HEAD 2>/dev/null)" || fail HEAD_UNAVAILABLE
[[ "$actual" == "$LOCAL_PIN" ]] || fail OBSERVED_REPLIT_HEAD_CHANGED
git merge-base --is-ancestor "$REVIEWED_PIN" "$LOCAL_PIN" || fail REVIEWED_SOURCE_NOT_ANCESTOR

# Imported server source, shared source and TypeScript/runtime config must be
# identical to the independently reviewed historical release.
protected=(
  server shared .replit package.json package-lock.json
  tsconfig.json tsconfig.node.json tsconfig.server.json
  scripts/v39_phase2g_verify_live_callback_v39.ts
  scripts/v39_phase2g_p25_historical_incident_smoke_scope_v39.ts
)
git diff --quiet "$REVIEWED_PIN" "$LOCAL_PIN" -- "${protected[@]}" ||
  fail LOCAL_COMMIT_MODIFIED_PROTECTED_EXECUTABLES
git diff --quiet HEAD -- "${protected[@]}" ||
  fail PROTECTED_TRACKED_WORKTREE_DIRTY

# Unknown imported files are not trusted. Preserve them; never clean/reset.
if git ls-files --others --exclude-standard |
  grep -Eq '^(server/|shared/|scripts/v39_phase2g_verify_live_callback_v39\.ts$|scripts/v39_phase2g_p25_historical_incident_smoke_scope_v39\.ts$|\.replit$|package(-lock)?\.json$|tsconfig[^/]*\.json$)'; then
  fail UNTRACKED_PROTECTED_SOURCE_PRESENT
fi
[[ "$(git hash-object "$TEST_PATH" 2>/dev/null)" == "$TEST_BLOB" ]] ||
  fail LOCAL_SIGNED_TEST_BLOB_CHANGED
[[ "$(gh api "repos/$REPO/contents/$TEST_PATH?ref=main" --jq .sha 2>/dev/null)" == "$TEST_BLOB" ]] ||
  fail GITHUB_MAIN_SIGNED_TEST_BLOB_CHANGED
[[ -n "${AERODATABOX_WEBHOOK_SECRET:-}" &&
   "${#AERODATABOX_WEBHOOK_SECRET}" -ge 32 ]] || fail SIGNED_WEBHOOK_SECRET_MISSING_OR_SHORT
[[ -n "${V39_DATABASE_RUNTIME_URL:-}" ]] || fail RUNTIME_DB_URL_MISSING
[[ "${V39_PROVIDER_BLOB_MODE:-}" == required ]] || fail BLOB_REQUIRED_MODE_MISSING
[[ "${V39_PROVIDER_BLOB_BUCKET_ID:-}" == replit-objstore-* ]] || fail REPLIT_OBJECT_BUCKET_INVALID
[[ -x node_modules/.bin/tsx ]] || fail TSX_LOCAL_MISSING
[[ "${V39_PHASE6_PROCESS_ARMED:-0}" != 1 &&
   "${V39_PHASE6_OWNER_APPROVED:-0}" != 1 &&
   "${ADB_AUTO_COLLECT:-0}" != 1 ]] || fail PAID_PROCESS_ARMED_IN_ENV

# Atomic local once marker survives errors and crashes; no blind repeat.
mkdir -p artifacts || fail ARTIFACTS_PATH_UNAVAILABLE
LOCK='artifacts/phase5-synthetic-signed-post-a2d75104-once.lock'
[[ ! -e "$LOCK" ]] || fail PREVIOUS_ONCE_ATTEMPT_MARKER_PRESENT
mkdir "$LOCK" 2>/dev/null || fail CONCURRENT_OR_PREVIOUS_ATTEMPT
printf 'source_commit=%s\nscript_blob=%s\nmarker_kind=STARTED_NOT_SUCCESS\n' \
  "$LOCAL_PIN" "$TEST_BLOB" > "$LOCK/attempt.txt" ||
  fail ATTEMPT_MARKER_PERSISTENCE_FAILURE

printf 'P5_SYNTHETIC_ONLY_STARTED; EXACT_LOCAL_SOURCE_VERIFIED; NO_PAID_PROVIDER_CALL\n'
set +e
env V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 ADB_AUTO_COLLECT=0 \
  node_modules/.bin/tsx "$TEST_PATH" \
    --callback-base "$PUBLISHED_ORIGIN" \
    --expected-head "$PUBLISHED_PIN"
code=$?
set -e
if [[ "$code" != 0 ]]; then
  printf 'HOLD_P5_SYNTHETIC_SIGNED_POST_TEST_RETURNED_%s; ONCE_MARKER_PRESERVED; NO_RETRY_UNTIL_AUDIT\n' "$code" >&2
  exit "$code"
fi
printf 'P5_SYNTHETIC_SIGNED_POST_SCRIPT_EXIT_SUCCESS; REVIEW_THE_TEST_RECEIPT; NEVER_RERUN_THIS_ONCE\n'
