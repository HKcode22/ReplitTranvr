#!/usr/bin/env bash
# Owner-only readback; no write, workflow dispatch, database/provider access or secret output.
set -Eeuo pipefail
set +x
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
M="${1:-}"
RELAY="${2:-}"
MODE="${3:-}"
[[ "$M" =~ ^[a-f0-9]{40}$ && "$RELAY" =~ ^[a-f0-9]{40}$ && ( "$MODE" == PAUSED || "$MODE" == SOURCE_ONLY ) ]] || { echo "HOLD_READBACK_EXACT_SCOPE"; exit 2; }
[[ "$(gh api user --jq .login)" == HKcode22 ]] || exit 2
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
umask 077
bad=0
check(){ if [[ "$2" == "$3" ]];then printf 'PASS %s=%s\n' "$1" "$2";else printf 'MISMATCH %s expected=%s (observed value withheld)\n' "$1" "$3";bad=$((bad+1));fi; }
load(){
 local repo="$1" env="$2" dest="$3" endpoint
 if [[ "$env" == repo ]];then endpoint="repos/$repo/actions/variables";else endpoint="repos/$repo/environments/$env/variables";fi
 # List authenticated variable metadata; an API failure is never interpreted as absent.
 gh api --paginate "$endpoint?per_page=100" --jq '.variables[] | {name,value}' | jq -s '.' > "$dest"
}
value(){ jq -r --arg k "$2" '[.[]|select(.name==$k)|.value] | if length==0 then "__ABSENT__" elif length==1 then .[0] else error("duplicate variable") end' "$1"; }
required(){ check "$1/$3" "$(value "$2" "$3")" "$4"; }
override(){ local observed; observed="$(value "$2" "$3")";if [[ "$observed" == __ABSENT__ ]];then echo "PASS $1/$3 inherits repository (no override)";else check "$1/$3" "$observed" "$4";fi; }
disabled(){ local observed; observed="$(value "$2" "$3")";if [[ "$observed" == false || "$observed" == __ABSENT__ ]];then echo "PASS $1/$3 disabled or absent";else check "$1/$3" "$observed" false;fi; }
check target-main "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" "$M"
check relay-main "$(gh api "repos/$L/git/ref/heads/main" --jq .object.sha)" "$RELAY"
load "$R" repo "$TMP/target"
load "$R" phase6-protected-runtime "$TMP/target-env"
load "$L" repo "$TMP/relay"
for env in travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal;do load "$L" "$env" "$TMP/$env";done
for k in P6_PHASE5B_RUNTIME_EXECUTABLE_SHA P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA;do
 required target "$TMP/target" "$k" "$M"
 override protected-runtime "$TMP/target-env" "$k" "$M"
done
SOURCE_EXPECTED=false
if [[ "$MODE" == SOURCE_ONLY ]];then SOURCE_EXPECTED=true;fi
required target "$TMP/target" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED "$SOURCE_EXPECTED"
override protected-runtime "$TMP/target-env" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED "$SOURCE_EXPECTED"
required target "$TMP/target" P6_PRIVATE_POST_PARENT_ENABLED false
override protected-runtime "$TMP/target-env" P6_PRIVATE_POST_PARENT_ENABLED false
# New conditional metadata transport must not be accidentally activated by
# a code-only cutover. This is a readiness check, not policy commissioning.
if [[ "$MODE" == SOURCE_ONLY ]];then
 for file in "$TMP/target" "$TMP/target-env";do
  x="$(value "$file" P6_CONDITIONAL_LATER_METADATA_READ_ENABLED)"
  if [[ "$x" != __ABSENT__ && "$x" != 0 ]];then
   echo "HOLD_CONDITIONAL_METADATA_REQUIRES_SEPARATE_REVIEW";bad=$((bad+1))
  fi
 done
fi
for k in P5_AUTO_SOURCE_DISPATCH_ENABLED P5_POST_AUTO_DISPATCH_ENABLED;do
 disabled target "$TMP/target" "$k"
 disabled protected-runtime "$TMP/target-env" "$k"
done
for k in P6_FULL_RETENTION_BACKSTOP_ENABLED P5_PRIMARY_FIDS_BACKSTOP_ENABLED P5_PRIMARY_FIDS_EXPIRY_ENABLED P7_EXPIRY_ENABLED;do
 required target "$TMP/target" "$k" true
 override protected-runtime "$TMP/target-env" "$k" true
done
required target "$TMP/target" P5_PRIMARY_FIDS_EXPIRY_APPROVAL APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
required target "$TMP/target" P6_PRIVATE_EPOCH_EXPIRY_MODE APPLY_DUE_ONLY
required target "$TMP/target" P6_PRIVATE_EPOCH_EXPIRY_APPROVAL APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER
required target "$TMP/target" P7_EXPIRY_APPROVAL APPLY_P7_DUE_ONLY_NO_PROVIDER
required target "$TMP/target" P6_ROLLING_CONTROLLER_ENABLED 1
required target "$TMP/target" P6_ROLLING_DIRECT_RECOVERY_ENABLED 0
# Effective environment approval values are just as material as repo values.
override protected-runtime "$TMP/target-env" P5_PRIMARY_FIDS_EXPIRY_APPROVAL APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
override protected-runtime "$TMP/target-env" P6_PRIVATE_EPOCH_EXPIRY_MODE APPLY_DUE_ONLY
override protected-runtime "$TMP/target-env" P6_PRIVATE_EPOCH_EXPIRY_APPROVAL APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER
override protected-runtime "$TMP/target-env" P7_EXPIRY_APPROVAL APPLY_P7_DUE_ONLY_NO_PROVIDER
override protected-runtime "$TMP/target-env" P6_ROLLING_CONTROLLER_ENABLED 1
override protected-runtime "$TMP/target-env" P6_ROLLING_DIRECT_RECOVERY_ENABLED 0
required relay "$TMP/relay" TRAVNR_APPROVED_TARGET_MAIN_SHA "$M"
required relay "$TMP/relay" P6_RELAY_APPROVED_EXECUTABLE_SHA "$RELAY"
required relay "$TMP/relay" TRAVNR_RELAY_ROLLING_ENABLED 1
required relay "$TMP/relay" TRAVNR_RELAY_PRIMARY_ENABLED 1
required relay "$TMP/relay" TRAVNR_RELAY_ROLLING_ROUTE INDEPENDENT_WAKE
for env in travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal;do
 override "$env" "$TMP/$env" TRAVNR_APPROVED_TARGET_MAIN_SHA "$M"
done
for env in travnr-target-forward travnr-cron-audit;do
 override "$env" "$TMP/$env" P6_RELAY_APPROVED_EXECUTABLE_SHA "$RELAY"
done
for env in travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal;do
 for k in TRAVNR_RELAY_PRIMARY_ENABLED TRAVNR_RELAY_ROLLING_ENABLED;do override "$env" "$TMP/$env" "$k" 1;done
done
echo "=== Exact new-main retention and worker runs ==="
gh run list -R "$R" --branch main --commit "$M" --limit 30 --json databaseId,name,displayTitle,status,conclusion,createdAt
echo "=== Independent relay runs ==="
gh run list -R "$L" --branch main --commit "$RELAY" --limit 8 --json databaseId,name,displayTitle,status,conclusion,createdAt
check final-target-main "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" "$M"
check final-relay-main "$(gh api "repos/$L/git/ref/heads/main" --jq .object.sha)" "$RELAY"
if (( bad > 0 ));then echo "HOLD_POST_CUTOVER_VARIABLE_MISMATCH count=$bad";exit 2;fi
echo "P6_POST_CUTOVER_VARIABLE_READBACK_PASS_${MODE}_NO_WRITES"
