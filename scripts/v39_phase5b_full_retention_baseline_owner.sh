#!/usr/bin/env bash
# Reusable owner-only exact-current-main retention commissioning.
# Run immediately after each coordinated pin cutover, before monitoring.
# No policy rewrite, provider calls, paid dispatch, or replay.
set -Eeuo pipefail
set +x
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
WF=phase5-primary-fids-expiry-no-provider.yml
H="${2:-}"
hold(){ echo "HOLD_FULL_RETENTION_BASELINE_$1" >&2; exit 2; }
[[ "${1:-}" == ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE && "$H" =~ ^[a-f0-9]{40}$ ]] || hold SCOPE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
v(){ gh variable get "$2" -R "$1"; }
check(){
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$H" &&
 "$(v "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA)" == "$H" &&
 "$(v "$R" P7_EXPIRY_APPROVED_MAIN_SHA)" == "$H" &&
 "$(v "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$H" &&
 "$(v "$R" P5_PRIMARY_FIDS_BACKSTOP_ENABLED)" == true &&
 "$(v "$R" P6_FULL_RETENTION_BACKSTOP_ENABLED)" == true &&
 "$(v "$R" P7_EXPIRY_ENABLED)" == true &&
 "$(v "$R" P5_PRIMARY_FIDS_EXPIRY_ENABLED)" == true &&
 "$(v "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVAL)" == APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER &&
 "$(v "$R" P6_PRIVATE_EPOCH_EXPIRY_MODE)" == APPLY_DUE_ONLY &&
 "$(v "$R" P6_PRIVATE_EPOCH_EXPIRY_APPROVAL)" == APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER &&
 "$(v "$R" P7_EXPIRY_APPROVAL)" == APPLY_P7_DUE_ONLY_NO_PROVIDER ]] || hold PIN_OR_EXISTING_APPROVAL_DRIFT
}
check
runs(){ gh run list -R "$R" --workflow "$WF" --branch main --limit 40 --json databaseId,headSha,displayTitle,status,conclusion,createdAt; }
q="$(runs)"
rid="$(jq -r --arg h "$H" '[.[]|select(.headSha==$h and .displayTitle=="P5 FULL RETENTION BACKSTOP CHILD")][0].databaseId // empty' <<<"$q")"
if [[ -z "$rid" ]];then
 # No current-main full APPLY exists. If a native APPLY is active, avoid overlap.
 jq -e 'all(.[]; .status=="completed")' <<<"$q" >/dev/null || hold RETENTION_ALREADY_ACTIVE
 check
 gh workflow run "$WF" -R "$R" --ref main -f confirm=APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER -f approved_main_sha="$H"
 for i in $(seq 1 30);do
  q="$(runs)"
  rid="$(jq -r --arg h "$H" '[.[]|select(.headSha==$h and .displayTitle=="P5 FULL RETENTION BACKSTOP CHILD")][0].databaseId // empty' <<<"$q")"
  [[ -z "$rid" ]] || break
  sleep 5
 done
fi
[[ -n "$rid" ]] || hold NO_ACK
timeout 360 gh run watch "$rid" -R "$R" --exit-status || hold FAILED_OR_PENDING_NO_REPLAY
check
j="$(gh api "repos/$R/actions/runs/$rid/jobs?filter=latest&per_page=100")"
jq -e --arg h "$H" --argjson id "$rid" '
 .total_count==2 and (.jobs|length)==2 and
 all(.jobs[];.head_sha==$h and .run_id==$id and .run_attempt==1 and .conclusion=="success" and .status=="completed") and
 any(.jobs[];.name=="primary-fids-expiry" and any(.steps[];.name=="Verify exact main and execute only bounded primary FIDS expiry" and .conclusion=="success")) and
 any(.jobs[];.name=="phase7-expiry" and any(.steps[];.name=="Bounded derived research and temporary link due-only expiry" and .conclusion=="success"))
' <<<"$j" >/dev/null || hold EXACT_DUAL_JOB_EVIDENCE
echo "CURRENT_MAIN_FULL_RETENTION_BASELINE_VERIFIED main=$H run=$rid"
