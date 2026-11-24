#!/usr/bin/env bash
# Existing nonpaid daily preparation only. No paid worker dispatch.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
E=phase6-protected-runtime
S=c8e065d665ccacb6d2575070e94c5500b7583044
W=phase6-nonpaid-source-day-prepare-publish.yml
hold(){ echo "HOLD_P6_DAY2_$1"; exit 2; }
[[ $(gh api user --jq .login) == HKcode22 ]] || hold OWNER
[[ $(gh api "repos/$R/git/ref/heads/main" --jq .object.sha) == "$S" ]] || hold MAIN
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]] || hold ROLLING
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]] || hold RETENTION
[[ $(date -u +%s) -lt $(date -u -d '2026-11-25 00:45:00Z' +%s) ]] || hold CONSERVATIVE_DAY2_PREP_BOUNDARY
# The exact accepted installed 31-value policy run, not an old candidate.
[[ $(gh api "repos/$R/actions/runs/45123278530" --jq .conclusion) == success ]] || hold POLICY_RECEIPT
gh api "repos/$R/issues/413/comments?per_page=100" --paginate --jq '.[] | select(.user.login=="HKcode22" and (.body|contains("PHASE6 G13 OWNER PAID GO AT")) and (.body|contains("main c8e065d665ccacb6d2575070e94c5500b7583044"))) | .id' | grep -qE '^[0-9]+$' || hold OWNER_GO_LEDGER
# Do not race a live or queued preparation or controller run.
for state in queued in_progress waiting requested pending; do
  active="$(gh api "repos/$R/actions/runs?status=$state&per_page=100" --paginate --jq '.workflow_runs[].path')"
  if grep -Eq 'phase6-nonpaid-source-day-prepare-publish|phase6-direct-recovery-tick|phase6-rolling-controller|phase5-source-upcoming-queue|phase5-one-signed-day-source|phase5-one-signed-future-post|phase5-cd-github' <<< "$active"; then hold ACTIVE_WORKER; fi
done
repo="$(gh api "repos/$R/actions/secrets?per_page=100" --paginate --jq '.secrets[].name')"
env="$(gh api "repos/$R/environments/$E/secrets?per_page=100" --paginate --jq '.secrets[].name')"
names="$repo"$'\n'"$env"
for key in P6_NONPAID_SOURCE_APPROVED_MAIN_SHA V39_PHASE5_FREEZE_SIGNED V39_PHASE5_SOURCE_RIGHTS_APPROVED V39_P5_MANIFEST_SHA256 V39_P5_CALENDAR_HASH V39_P5_CONFIG_HASH V39_P5_FRAME_HASH V39_P5_RELEASE_SHA256 V39_P5_RIGHTS_SHA256 V39_P5_PROVIDER_CONTRACT_SHA256 P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64 P6_NONPAID_DAILY_POLICY_BASE64 P6_NONPAID_DAILY_POLICY_SHA256 P6_NONPAID_SIGNING_POLICY_BASE64 P6_NONPAID_SIGNING_POLICY_SHA256 P6_NONPAID_TRANSPORT_TRUST_BASE64 P6_NONPAID_TRANSPORT_TRUST_SHA256 P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64 P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64 P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64 P5_V39_PREPARE_DATABASE_URL P6_PRIVATE_READER_DATABASE_URL P6_PRIVATE_PUBLISHER_DATABASE_URL; do
  grep -qx "$key" <<< "$names" || hold "EXISTING_POLICY_OR_ACTOR_NAME_ABSENT_$key"
done
# Explicit owner authorization for the existing signed nonpaid preparation actor only.
for key in P6_NONPAID_SOURCE_RUNTIME_APPROVED V39_P5_PREPARE_OWNER_APPROVED; do
  if ! grep -qx "$key" <<< "$names"; then
    gh secret set "$key" -R "$R" -e "$E" --body 1 >/dev/null || hold "WRITE_UNKNOWN_$key"
    gh api "repos/$R/environments/$E/secrets/$key" --jq '{name,updated_at}'
  else
    echo "EXISTING_NAME_UNCHANGED_$key"
  fi
done
# No schedule is enabled before the first manual receipt.
schedule="$(gh variable list -R "$R" --json name,value --jq '.[]|select(.name=="P6_NONPAID_SOURCE_SCHEDULE_ENABLED")|.value')"
[[ "$schedule" == "" || "$schedule" == false || "$schedule" == 0 ]] || hold SCHEDULE_ALREADY_ENABLED
# Preserve exact prior history. A previous manual attempt requires explicit review.
previous="$(gh run list -R "$R" --workflow "$W" --event workflow_dispatch --limit 100 --json databaseId,createdAt,headSha,conclusion,status --jq '[.[] | select(.headSha=="c8e065d665ccacb6d2575070e94c5500b7583044" and .createdAt >= "2026-11-24T00:32:00Z")] | length')"
[[ "$previous" == 0 ]] || hold PRIOR_RECOVERY_ATTEMPT_REVIEW_NO_REPLAY
before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gh workflow run "$W" -R "$R" --ref main -f run_day_index=2 -f confirm=ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH || hold DISPATCH_ACK_UNKNOWN_NO_REPLAY
id=""
for n in $(seq 1 24); do
  ids="$(gh run list -R "$R" --workflow "$W" --event workflow_dispatch --limit 20 --json databaseId,createdAt,headSha --jq ".[] | select(.headSha==\"$S\" and .createdAt >= \"$before\") | .databaseId")"
  if [[ -n "$ids" ]]; then
    [[ $(wc -l <<< "$ids") == 1 ]] || hold AMBIGUOUS_RUN_NO_REPLAY
    id="$ids"; break
  fi
  sleep 5
done
[[ "$id" =~ ^[0-9]+$ ]] || hold NO_RUN_ID_NO_REPLAY
echo "P6_DAY2_NONPAID_RUN_ID=$id"
gh run watch "$id" -R "$R" --exit-status || hold RUN_FAILED_NO_REPLAY
gh run view "$id" -R "$R" --json jobs --jq '.jobs[]|{name,conclusion,steps:[.steps[]|{name,conclusion}]}'
# Read the actual status, not just workflow color. Print only approved tokens.
log="$(gh run view "$id" -R "$R" --log)"
receipt="$(printf '%s\n' "$log" | grep -oE 'ONE_PROSPECTIVE_DAY_PREPARED_AND_PUBLISHED_NO_PAID_GO|NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE' | sort -u || true)"
unset log
[[ "$receipt" == ONE_PROSPECTIVE_DAY_PREPARED_AND_PUBLISHED_NO_PAID_GO || "$receipt" == NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE ]] || hold NO_EXACT_RECEIPT
echo "$receipt"
# Only this no-provider actor's existing native schedule, not paid routes.
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]] || hold ROLLING_CHANGED
gh variable set P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R "$R" --body true >/dev/null || hold SCHEDULE_WRITE_UNKNOWN
[[ $(gh variable get P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R "$R") == true ]] || hold SCHEDULE_READBACK
echo P6_NONPAID_PREPARATION_SCHEDULE_ENABLED_PAID_ROLLING_STILL_PAUSED
