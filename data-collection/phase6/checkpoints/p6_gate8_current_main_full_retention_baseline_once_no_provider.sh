#!/usr/bin/env bash
# Gate 8 narrow continuation: preserve previous G3 closeout and a verified
# historical full-retention APPLY. Only make ONE missing current-main APPLY,
# no provider. The approved due-only expiry jobs MAY delete already-due records.
set -Eeuo pipefail
set +x
umask 077

TARGET="HKcode22/ReplitTranvr"
RELAY="HKcode22/TravnrClockRelay"
PIN="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RELAY_PIN="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
WF="phase5-primary-fids-expiry-no-provider.yml"
TITLE="P5 FULL RETENTION BACKSTOP CHILD"
CONFIRM="APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER"
API="repos/$TARGET"
hold(){ printf 'HOLD_P6_G8_EXISTING_FULL_RETENTION_%s\n' "$1" >&2; exit 2; }

[[ $# -eq 1 && "$1" == "EXISTING_CURRENT_MAIN_FULL_RETENTION_BASELINE_ONCE_NO_PROVIDER" ]] || hold CONFIRM
[[ "$(gh api user --jq '.login')" == "HKcode22" ]] || hold OWNER

pin(){
  [[ "$(gh api "$API/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN_CHANGED
  [[ "$(gh api "repos/$RELAY/git/ref/heads/main" --jq '.object.sha')" == "$RELAY_PIN" ]] || hold RELAY_CHANGED
}
var_is(){
  local actual
  actual="$(gh variable get "$1" -R "$TARGET")" || hold "VAR_UNREADABLE_$1"
  [[ "$actual" == "$2" ]] || hold "VAR_MISMATCH_$1"
}
var_nonempty(){
  local actual
  actual="$(gh variable get "$1" -R "$TARGET")" || hold "VAR_UNREADABLE_$1"
  [[ -n "$actual" ]] || hold "VAR_EMPTY_$1"
}

pin
var_is P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$PIN"
var_is P7_EXPIRY_APPROVED_MAIN_SHA "$PIN"
[[ "$(gh variable get TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RELAY")" == "$PIN" ]] || hold RELAY_TARGET
var_is P6_PRIVATE_EPOCH_DEADLINE_PROFILE V0108_RECOVERY_METADATA_ONLY
var_is P5_PRIMARY_FIDS_BACKSTOP_ENABLED true
var_is P5_PRIMARY_FIDS_EXPIRY_ENABLED true
var_is P5_PRIMARY_FIDS_EXPIRY_APPROVAL APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
var_is P6_FULL_RETENTION_BACKSTOP_ENABLED true
var_is P6_PRIVATE_EPOCH_EXPIRY_MODE APPLY_DUE_ONLY
var_is P6_PRIVATE_EPOCH_EXPIRY_APPROVAL APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER
var_nonempty P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256
var_is P7_EXPIRY_ENABLED true
var_is P7_EXPIRY_APPROVAL APPLY_P7_DUE_ONLY_NO_PROVIDER

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Exact main was created on Nov 22 at 12:05Z; list all later runs to
# distinguish a confirmed success from an attempted, incomplete or failed APPLY.
Q="$API/actions/workflows/$WF/runs?branch=main&created=%3E%3D2026-11-22T12%3A05%3A22Z&per_page=100"
inventory(){
  gh api "$Q" --paginate --jq '.workflow_runs[] | [.id,.head_sha,.display_title,.status,(.conclusion // ""),.run_attempt,.event] | @tsv' > "$1" || hold RUN_INVENTORY_HTTP
}
inventory "$tmp/before"
awk -F '\t' -v p="$PIN" -v title="$TITLE" '$2==p && $3==title {print}' "$tmp/before" > "$tmp/current"
n="$(wc -l < "$tmp/current" | tr -d ' ')"
[[ "$n" -le 1 ]] || hold MULTIPLE_EXACT_APPLY_ATTEMPTS_NO_REPLAY

readback(){
  local run="$1" j
  # Check immutable exact run identity and BOTH jobs/steps.
  gh api "$API/actions/runs/$run" |
    jq -e --arg p "$PIN" --arg t "$TITLE" --arg w ".github/workflows/$WF" '
      .head_sha==$p and .head_branch=="main" and .path==$w and
      .display_title==$t and .event=="workflow_dispatch" and
      .run_attempt==1 and .status=="completed" and .conclusion=="success"
    ' >/dev/null || hold RUN_NOT_EXACT_SUCCESS

  gh api "$API/actions/runs/$run/jobs?filter=latest&per_page=100" |
    jq -e --argjson run "$run" '
      .total_count==2 and (.jobs|length)==2 and
      ([.jobs[]|.name]|sort)==["phase7-expiry","primary-fids-expiry"] and
      all(.jobs[];
        .run_id==$run and .run_attempt==1 and .status=="completed" and
        .conclusion=="success" and
        ((.name=="primary-fids-expiry" and
          ([.steps[]|select(.name=="Verify exact main and execute only bounded primary FIDS expiry" and .conclusion=="success")]|length)==1) or
         (.name=="phase7-expiry" and
          ([.steps[]|select(.name=="Bounded derived research and temporary link due-only expiry" and .conclusion=="success")]|length)==1))
      )
    ' >/dev/null || hold BOTH_JOBS_AND_STEPS_NOT_VERIFIED
}

if [[ "$n" == 1 ]]; then
  existing="$(cut -f1 "$tmp/current")"
  readback "$existing"
  printf '{"status":"P6_CURRENT_MAIN_FULL_RETENTION_BASELINE_ALREADY_DONE_NO_REPLAY","runId":%s,"paidGo":false}\n' "$existing"
  exit 0
fi

# Only make a new attempt when no prior exact-main APPLY exists.
# Any 502 or unknown acknowledgement after dispatch means STOP, never rerun blindly.
pin
inventory "$tmp/second"
awk -F '\t' -v p="$PIN" -v title="$TITLE" '$2==p && $3==title {print}' "$tmp/second" > "$tmp/second-current"
[[ ! -s "$tmp/second-current" ]] || hold APPEARED_BEFORE_POST_NO_REPLAY

gh workflow run "$WF" -R "$TARGET" --ref main \
  -f "confirm=$CONFIRM" -f "approved_main_sha=$PIN" || hold UNKNOWN_DISPATCH_DO_NOT_RETRY
echo "P6_FULL_RETENTION_CURRENT_MAIN_DISPATCH_SENT_NO_PROVIDER_NOT_YET_VERIFIED"

run=""
for i in $(seq 1 45); do
  inventory "$tmp/after"
  awk -F '\t' -v p="$PIN" -v title="$TITLE" '$2==p && $3==title {print $1}' "$tmp/after" > "$tmp/ids"
  n="$(wc -l < "$tmp/ids" | tr -d ' ')"
  [[ "$n" -le 1 ]] || hold AMBIGUOUS_DISPATCH_ACK
  if [[ "$n" == 1 ]]; then run="$(cat "$tmp/ids")"; break; fi
  sleep 3
done
[[ "$run" =~ ^[1-9][0-9]*$ ]] || hold UNOBSERVED_ACK_DO_NOT_RETRY
printf 'P6_FULL_RETENTION_CURRENT_MAIN_ACK_RUN_ID=%s\n' "$run"

gh run watch "$run" -R "$TARGET" --interval 5 --exit-status ||
  hold APPLY_FAILED_OR_UNKNOWN_DO_NOT_RETRY
readback "$run"
pin
printf '{"status":"P6_G8_CURRENT_MAIN_FULL_RETENTION_DUAL_JOB_PASS_NO_PROVIDER","runId":%s,"providerCallsByThisHelper":0,"paidGo":false,"dueOnlyDatabaseCleanupMayHaveExecuted":true}\n' "$run"
