#!/usr/bin/env bash
# Independent nonpaid readiness: neither lane depends on T24 runtime health.
set -Eeuo pipefail
set +x
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
S=c8e065d665ccacb6d2575070e94c5500b7583044
[[ $(gh api user --jq .login) == HKcode22 ]]
[[ $(gh api "repos/$R/git/ref/heads/main" --jq .object.sha) == "$S" ]]
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]]
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]]
[[ $(gh variable get P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED -R "$R") == false ]]
[[ $(gh variable get P6_PRIVATE_POST_PARENT_ENABLED -R "$R") == false ]]
[[ $(gh variable get P6_NATIVE_POST_PRODUCER_ENABLED -R "$R") == 0 ]]
[[ $(gh variable get P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R "$R") == true ]]
# Only no-provider workflow dispatches, not paid routes or secret changes.
# Run both independently; a failing later PRE test must not block Day2 prep.
dispatch(){
 local wf="$1" before ids
 shift
 before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
 gh workflow run "$wf" -R "$R" --ref main "$@" >&2 || return 1
 for n in $(seq 1 30); do
  ids="$(gh run list -R "$R" --workflow "$wf" --event workflow_dispatch --limit 15 --json databaseId,createdAt,headSha --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"$before\")|.databaseId")" || return 1
  if [[ -n "$ids" ]]; then
   [[ $(wc -l <<< "$ids") == 1 ]] || return 1
   printf '%s\n' "$ids"; return 0
  fi
  sleep 3
 done
 return 1
}
prep=; later=
if prep="$(dispatch phase6-nonpaid-source-day-prepare-publish.yml -f run_day_index=2 -f confirm=ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH)"; then
 echo "DAY2_NONPAID_PREP_RUN=$prep"
else echo DAY2_PREP_DISPATCH_UNCERTAIN_DO_NOT_REPEAT; fi
if later="$(dispatch phase5-cd-github-bounded-pre-tick.yml -f private_transport=PRIVATE_CURRENT_SCHEDULE -f current_dispatch_confirm=RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER)"; then
 echo "LATER_PRE_NONPAID_TEST_RUN=$later"
else echo LATER_PRE_DISPATCH_UNCERTAIN_DO_NOT_REPEAT; fi
report(){
 local id="$1"
 [[ "$id" =~ ^[0-9]+$ ]] || return 0
 timeout 600 gh run watch "$id" -R "$R" --exit-status || true
 gh api "repos/$R/actions/runs/$id/jobs?per_page=100" --jq '.jobs[]|{name,conclusion,steps:[.steps[]?|{name,conclusion}]}'
 # Never print full logs. Only exact allowed aggregate status markers.
 gh run view "$id" -R "$R" --log 2>/dev/null | grep -oE 'ONE_PROSPECTIVE_DAY_PREPARED_AND_PUBLISHED_NO_PAID_GO|NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE|NO_DUE_[A-Z0-9_]+|HOLD_[A-Z0-9_]+|REFUSED_[A-Z0-9_]+' | sort -u || true
}
report "$prep"
report "$later"
node <<'P6_DAY2_RO'
const {Client}=require("pg");
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
try{await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='10s'");
const r=(await c.query("SELECT clock_timestamp() AS db_clock,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS read_only,NOT pg_is_in_recovery() AS primary,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS day2_draw,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=2) AS day2_index,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source_attempts,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS rest_reservations,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS unresolved_stops",["a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e"])).rows[0];
await c.query("ROLLBACK");console.log(JSON.stringify(r));if(!r.correct_db||!r.read_only||!r.primary||r.unresolved_stops!==0||r.source_attempts!==0||r.rest_reservations!==0||r.day2_draw!==4)process.exitCode=2;
}finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_DAY2_READONLY_CENSUS",e.code||e.name);process.exitCode=2;});
P6_DAY2_RO
echo P6_INDEPENDENT_DAY2_AND_LATER_TEST_READBACK_COMPLETE_PAID_ROUTES_STILL_PAUSED
