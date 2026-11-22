#!/usr/bin/env bash
# Narrow Gate8 handoff: ONLY existing GitHub repository variables; no paid GO.
set -Eeuo pipefail
set +x
umask 077
hold(){ printf 'HOLD_P6_G8_DOC_ONLY_NONPAID_REPIN_%s\n' "$1" >&2; exit 2; }
[[ "$#" == 1 && "$1" == "REPIN_ONLY_DOC_SUCCESSOR_RETENTION_RELAY_NO_PAID_GO" ]] || hold CONFIRM
R="HKcode22/ReplitTranvr"
RELAY="HKcode22/TravnrClockRelay"
OLD="dfa7221990e21deacb45fdbacbaadc64a73bc907"
NEW="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RELAY_MAIN="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
ONLY="data-collection/phase6/checkpoints/2026-11-22_PHASE6_GATES_1_THROUGH_8_VERIFIED_PRODUCTION_FREEZE.md"

[[ "$(gh api user --jq .login)" == "HKcode22" ]] || hold OWNER
pin(){
  [[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$NEW" ]] || hold TARGET_MAIN_DRIFT
  [[ "$(gh api "repos/$RELAY/git/ref/heads/main" --jq '.object.sha')" == "$RELAY_MAIN" ]] || hold RELAY_MAIN_DRIFT
}
pin
gh api "repos/$R/compare/$OLD...$NEW" |
  jq -e --arg f "$ONLY" '
    .status == "ahead" and .ahead_by == 1 and .behind_by == 0 and
    ([.files[] | select(.filename == $f and .status == "added" and .additions == 120 and .deletions == 0)] | length) == 1 and
    (.files | length) == 1
  ' >/dev/null || hold NOT_EXACT_DOCS_ONLY_SUCCESSOR

[[ "$(gh variable get P6_PRIVATE_EPOCH_DEADLINE_PROFILE -R "$R")" == "V0108_RECOVERY_METADATA_ONLY" ]] || hold V0108_PROFILE_DRIFT
check(){
  local value
  value="$(gh variable get "$2" -R "$1")" || hold MISSING_EXISTING_VARIABLE
  [[ "$value" == "$OLD" || "$value" == "$NEW" ]] || hold UNREVIEWED_PREVIOUS_BINDING
}
check "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA
check "$R" P7_EXPIRY_APPROVED_MAIN_SHA
check "$RELAY" TRAVNR_APPROVED_TARGET_MAIN_SHA
update(){
  local value
  pin
  value="$(gh variable get "$2" -R "$1")" || hold EXISTING_VARIABLE_DISAPPEARED
  if [[ "$value" == "$OLD" ]]; then
    gh variable set "$2" -R "$1" --body "$NEW"
  elif [[ "$value" != "$NEW" ]]; then
    hold VARIABLE_CHANGED_DURING_UPDATE
  fi
}
update "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA
update "$R" P7_EXPIRY_APPROVED_MAIN_SHA
update "$RELAY" TRAVNR_APPROVED_TARGET_MAIN_SHA
pin
[[ "$(gh variable get P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA -R "$R")" == "$NEW" ]] || hold TARGET_PRIMARY_READBACK
[[ "$(gh variable get P7_EXPIRY_APPROVED_MAIN_SHA -R "$R")" == "$NEW" ]] || hold TARGET_P7_READBACK
[[ "$(gh variable get TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RELAY")" == "$NEW" ]] || hold RELAY_READBACK
printf '{"status":"P6_G8_DOC_ONLY_MAIN_NONPAID_RETENTION_RELAY_REPIN_PASS","targetMain":"%s","paidGo":false,"providerCallsByThisCommand":0,"databaseWritesByThisCommand":0,"productionSecretsModified":false,"cronJobsRecommissioned":false,"protectedPaidPREPOSTBindingsNotModified":true}\n' "$NEW"
