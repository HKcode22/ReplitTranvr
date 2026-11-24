#!/usr/bin/env bash
# Stage only the exact existing SOURCE actor's missing literal controls.
# Does not set any route enable, dispatch, call provider or write database.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
E=phase6-protected-runtime
S=c8e065d665ccacb6d2575070e94c5500b7583044
hold(){ echo "HOLD_P6_SOURCE_STAGE_$1"; exit 2; }
[[ $# == 1 && "$1" == OWNER_APPROVES_EXISTING_SIGNED_SOURCE_ACTOR_CONTROLS_ONLY_KEEP_ALL_PAID_ROUTES_OFF ]] || hold OWNER_CONFIRM
[[ $(gh api user --jq .login) == HKcode22 ]] || hold OWNER
[[ $(gh api "repos/$R/git/ref/heads/main" --jq .object.sha) == "$S" ]] || hold MAIN
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]] || hold ROLLING
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]] || hold RETENTION
# Source native scheduler could operate independently of the relay; refuse it too.
check_quiet(){
 for scope in "repos/$R/actions/variables" "repos/$R/environments/$E/variables"; do
  v="$(gh api "$scope?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv')"
  if grep -Eq '^(P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED|P5_AUTO_SOURCE_DISPATCH_ENABLED|P6_PRIVATE_POST_PARENT_ENABLED|P5_POST_AUTO_DISPATCH_ENABLED)[[:space:]]+(1|true)$' <<< "$v"; then hold PAID_ROUTE_ENABLED; fi
 done
 for status in queued in_progress waiting requested pending; do
  v="$(gh api "repos/$R/actions/runs?status=$status&per_page=100" --paginate --jq '.workflow_runs[].path')"
  if grep -Eq '^\.github/workflows/(phase6-direct-recovery-tick|phase6-rolling-controller|phase5-source-upcoming-queue|phase5-one-signed-day-source|phase5-one-signed-future-post)' <<< "$v"; then hold ACTIVE_PAID_WORKER; fi
 done
}
check_quiet
[[ $(gh api "repos/$R/actions/runs/45123278530" --jq .conclusion) == success ]] || hold STATIC_POLICY
[[ $(gh api "repos/$R/actions/runs/45298328334" --jq .conclusion) == success ]] || hold NONPAID_ADMISSION
# Prior actual authenticated owner authorization. No new budget.
n="$(gh api "repos/$R/issues/413/comments?per_page=100" --paginate --jq '.[]|select(.user.login=="HKcode22" and (.body|contains("PHASE6 G13 OWNER PAID GO AT")) and (.body|contains("main c8e065d665ccacb6d2575070e94c5500b7583044")))|.id' | wc -l | tr -d ' ')"
[[ "$n" == 1 ]] || hold OWNER_LEDGER
# Extract range evidence from the exact original, pinned plan, not guesswork.
plan="$(gh api "repos/$R/git/blobs/b8f8c82c47a47ef58d376cb516d9a3a7cac1dc59" --jq .content | base64 --decode)"
range="$(jq -er '.reviewedSegmentedSource.verifiedProviderMaxRangeMinutes' <<< "$plan")"
range_sha="$(jq -er '.reviewedSegmentedSource.reviewedProviderRangeEvidenceSha256' <<< "$plan")"
[[ "$range" == 240 && "$range_sha" == cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3 ]] || hold ORIGINAL_RANGE
repo="$(gh api "repos/$R/actions/secrets?per_page=100" --paginate --jq '.secrets[].name')"
env="$(gh api "repos/$R/environments/$E/secrets?per_page=100" --paginate --jq '.secrets[].name')"
names="$repo"$'\n'"$env"
for k in AERODATABOX_API_KEY V39_P5_SOURCE_DATABASE_URL P6_PRIVATE_READER_DATABASE_URL V39_P5_APPROVED_CODE_SHA V39_P5_QUEUE_APPROVED_CODE_SHA P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64 P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED V39_P5_MANIFEST_SHA256 V39_P5_RELEASE_SHA256 V39_P5_RIGHTS_SHA256 V39_P5_PROVIDER_CONTRACT_SHA256 V39_PHASE5_FREEZE_SIGNED V39_PHASE5_SOURCE_RIGHTS_APPROVED V39_PHASE6_PROCESS_ARMED V39_P5_SEVEN_REST_BUDGET_SIGNED; do
 grep -qx "$k" <<< "$names" || hold "EXISTING_POLICY_OR_ACTOR_ABSENT_$k"
done
# Values below correspond to the current stored parent and exact one-GET child.
# Explicit owner confirmation authorizes the flags; not a claim of new independent human review.
for k in V39_P5_SOURCE_QUEUE_OWNER_APPROVED V39_P5_AUTO_SOURCE_DISPATCH_APPROVED V39_P5_SIGNED_DAY_REGISTRY_RELEASE V39_P5_SOURCE_DB_ROLE_REVIEWED P6_PRIVATE_SOURCE_TRANSPORT_APPROVED P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED V39_P5_SOURCE_OWNER_APPROVED V39_P5_REST_UNIT_PRICE_APPROVED V39_P5_VERIFIED_PROVIDER_MAX_RANGE_MINUTES V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256; do
 if grep -qx "$k" <<< "$names"; then echo "PRESENT_UNCHANGED_$k"; continue; fi
 case "$k" in
 V39_P5_REST_UNIT_PRICE_APPROVED) value=2;;
 V39_P5_VERIFIED_PROVIDER_MAX_RANGE_MINUTES) value="$range";;
 V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256) value="$range_sha";;
 *) value=1;;
 esac
 gh secret set "$k" -R "$R" -e "$E" --body "$value" >/dev/null || hold "WRITE_UNKNOWN_$k"
 gh api "repos/$R/environments/$E/secrets/$k" --jq '{name,updated_at}'
done
check_quiet
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]] || hold ROLLING_CHANGED
echo P6_STORED_SOURCE_REQUIRED_CONTROLS_STAGED_NO_ROUTE_NO_DISPATCH
