#!/usr/bin/env bash
# Phase 6 G8, existing DIRECT_VERIFY route: ONE fresh 120m clock rehearsal.
# No paid provider, database, PRE/POST, SOURCE or production-main edits.
# The only configuration write is the existing relay's rolling-since UTC variable.
set -Eeuo pipefail
set +x
umask 077

TARGET="HKcode22/ReplitTranvr"
RELAY="HKcode22/TravnrClockRelay"
TARGET_PIN="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RELAY_PIN="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
WF="external-clock.yml"
hold(){ echo "HOLD_P6_G8_READONLY_RELAY_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == "ONE_CURRENT_MAIN_DIRECT_VERIFY_RELAY_NO_PROVIDER_NO_DB_NO_PAID_GO" ]] || hold CONFIRM
[[ "$(gh api user --jq '.login')" == "HKcode22" ]] || hold OWNER
check_sha(){
  [[ "$(gh api "repos/$TARGET/git/ref/heads/main" --jq '.object.sha')" == "$TARGET_PIN" ]] || hold TARGET_MAIN_DRIFT
  [[ "$(gh api "repos/$RELAY/git/ref/heads/main" --jq '.object.sha')" == "$RELAY_PIN" ]] || hold RELAY_MAIN_DRIFT
}
expect_relay(){
  local got
  got="$(gh variable get "$1" -R "$RELAY")" || hold "RELAY_VAR_UNREADABLE_$1"
  [[ "$got" == "$2" ]] || hold "RELAY_VAR_MISMATCH_$1"
}
check_sha
expect_relay TRAVNR_RELAY_MODE MULTI_LANE
expect_relay TRAVNR_RELAY_ROLLING_ENABLED 1
expect_relay TRAVNR_RELAY_ROLLING_ROUTE DIRECT_VERIFY
expect_relay TRAVNR_RELAY_DIRECT_TICK_APPROVED 0
expect_relay TRAVNR_TARGET_FORWARD_ENV_READY 1
expect_relay TRAVNR_APPROVED_TARGET_MAIN_SHA "$TARGET_PIN"

# Actual target read-only branch must remain selected. Missing variable is
# accepted only after independent names-list confirmation; a GitHub 502 isn't.
URL="repos/$TARGET/actions/variables/P6_ROLLING_DIRECT_RECOVERY_ENABLED"
if direct="$(gh api "$URL" --jq '.value' 2>/dev/null)"; then
  [[ "$direct" != "1" ]] || hold TARGET_READONLY_ROUTE_DISABLED
else
  names="$(gh api "repos/$TARGET/actions/variables?per_page=100" --paginate --jq '.variables[].name')" ||
    hold TARGET_VAR_INVENTORY_UNREADABLE
  if grep -Fxq P6_ROLLING_DIRECT_RECOVERY_ENABLED <<<"$names"; then
    hold TARGET_VAR_LOOKUP_INCONSISTENT
  fi
fi

OLD="$(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$RELAY")" || hold OLD_SINCE_MISSING
[[ "$OLD" == "2026-11-22T04:22:29.221Z" ]] || hold OLD_SINCE_CHANGED_REVIEW_PRIOR_WORK
# No reset of a prior ambiguous relay failure/quarantine: stop on ANY failed
# clock-lane workflow after the old since, even a different lane.
for status in failure cancelled timed_out action_required stale; do
  total="$(gh api -X GET "repos/$RELAY/actions/workflows/$WF/runs" \
    -f branch=main -f event=workflow_dispatch -f "created=>=$OLD" \
    -f "status=$status" -f per_page=1 --jq '.total_count')" ||
    hold HISTORY_UNREADABLE
  [[ "$total" =~ ^[0-9]+$ && "$total" == "0" ]] || hold PRIOR_UNRECONCILED_RELAY_FAILURE
done
Q="repos/$RELAY/actions/workflows/$WF/runs?branch=main&event=workflow_dispatch&per_page=100"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "$Q" --jq '.workflow_runs[] | select(.display_title=="TRAVNR EXTERNAL CLOCK ROLLING_ROOT" and .head_sha=="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed") | .id' | sort -n > "$TMP/before" ||
  hold PRE_DISPATCH_INVENTORY
check_sha
NOW="$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')"
[[ "$NOW" > "$OLD" ]] || hold NEW_UTC_NOT_FORWARD
# Idempotence: the old observed since is required above. A 502 after this
# set becomes an UNKNOWN partial mutation, never blindly rerun this helper.
gh variable set TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$RELAY" --body "$NOW" ||
  hold UNKNOWN_SINCE_UPDATE_DO_NOT_RETRY
expect_relay TRAVNR_RELAY_ROLLING_SINCE_UTC "$NOW"
check_sha
echo "P6_G8_NEW_120M_DIRECT_VERIFY_SCOPE_ACK_NO_PAID_GO: $NOW"

# ONE owner-approved external clock wake; target's existing admitted verify
# path has all provider keys/DB URLs empty and performs no target dispatch.
gh workflow run "$WF" -R "$RELAY" --ref main -f lane=ROLLING_ROOT ||
  hold UNKNOWN_RELAY_DISPATCH_DO_NOT_RETRY

RID=""
for i in $(seq 1 30); do
  gh api "$Q" --jq '.workflow_runs[] | select(.display_title=="TRAVNR EXTERNAL CLOCK ROLLING_ROOT" and .head_sha=="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed") | .id' | sort -n > "$TMP/after" ||
    hold RELAY_ACK_READBACK
  comm -13 "$TMP/before" "$TMP/after" > "$TMP/new"
  N="$(wc -l < "$TMP/new" | tr -d ' ')"
  [[ "$N" -le 1 ]] || hold MULTIPLE_RELAY_ACKS_AMBIGUOUS
  if [[ "$N" == "1" ]]; then RID="$(cat "$TMP/new")"; break; fi
  sleep 3
done
[[ "$RID" =~ ^[1-9][0-9]*$ ]] || hold RELAY_ACK_UNKNOWN_DO_NOT_RETRY
echo "P6_G8_RELAY_RUN_ID=$RID"
gh run watch "$RID" -R "$RELAY" --interval 5 --exit-status ||
  hold RELAY_RUN_FAILED_NO_BLIND_REPLAY

# Green relay is not forwarding proof: require the exact unique structured
# relay disposition, exact source run and independently successful target run.
gh run view "$RID" -R "$RELAY" --log > "$TMP/relay-log" ||
  hold RELAY_LOG_UNREADABLE
grep -F '"status":"TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF"' "$TMP/relay-log" |
  sed -n 's/^[^{]*\({.*}\)$/\1/p' > "$TMP/status-lines" || true
[[ "$(wc -l < "$TMP/status-lines" | tr -d ' ')" == "1" ]] ||
  hold NO_SINGLE_GENUINE_TARGET_ACK
TARGET_RUN="$(jq -er --argjson rid "$RID" '
  select(.status=="TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF"
         and .relayRunId==$rid and .mode=="ROLLING_ROOT"
         and .relayDispatches==1 and .providerCallsByRelay==0
         and .paidAuthorityGranted==false
         and .targetWorkflow=="phase6-direct-recovery-tick.yml")
  |.targetRunId' "$TMP/status-lines")" || hold INVALID_ACK_DISPOSITION
[[ "$TARGET_RUN" =~ ^[1-9][0-9]*$ ]] || hold TARGET_RUN_ID
echo "P6_G8_READONLY_TARGET_ACK_RUN_ID=$TARGET_RUN"

gh run watch "$TARGET_RUN" -R "$TARGET" --interval 5 --exit-status ||
  hold TARGET_VERIFY_FAILED_NO_REPLAY
gh api "repos/$TARGET/actions/runs/$TARGET_RUN" |
  jq -e --arg sha "$TARGET_PIN" '
    .head_sha==$sha and .path==".github/workflows/phase6-direct-recovery-tick.yml" and
    .display_title=="P6 DIRECT RECOVERY VERIFY" and .event=="workflow_dispatch" and
    .run_attempt==1 and .status=="completed" and .conclusion=="success"
  ' >/dev/null || hold TARGET_IDENTITY
gh api "repos/$TARGET/actions/runs/$TARGET_RUN/jobs?filter=latest&per_page=100" |
  jq -e '
    .total_count==3 and (.jobs|length)==3 and
    ([.jobs[].name]|sort)==["direct-protected-recovery-tick","direct-readonly-verify","offline-direct-recovery"] and
    ([.jobs[]|select(.name=="direct-readonly-verify" and .conclusion=="success" and
      ([.steps[]|select(.name=="Verify exact direct wake and existing workflow metadata NO POST" and
         .conclusion=="success")]|length)==1)]|length)==1 and
    ([.jobs[]|select(.name!="direct-readonly-verify" and .conclusion=="skipped")]|length)==2
  ' >/dev/null || hold TARGET_READONLY_STEP_NOT_VERIFIED
check_sha
echo "{\"status\":\"P6_G8_RELAY_DIRECT_VERIFY_CURRENT_MAIN_TARGET_ACK_AND_READONLY_JOB_PASS\",\"relayRunId\":$RID,\"targetRunId\":$TARGET_RUN,\"paidGo\":false,\"providerCalls\":0,\"databaseWrites\":0}"
