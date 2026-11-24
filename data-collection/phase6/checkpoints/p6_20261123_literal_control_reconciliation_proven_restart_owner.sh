#!/usr/bin/env bash
# Reconcile exact currently authorized literal controls together, no guessing one flag at a time.
# Pause paid dispatch first. Re-enable only after actual current nonpaid worker
# admission, no-provider Day2 preparation attempt and fresh incident census.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
E=phase6-protected-runtime
S=c8e065d665ccacb6d2575070e94c5500b7583044
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
OLD=2026-11-24T01:00:52.000Z
hold(){ echo "HOLD_P6_LITERAL_RECONCILE_$1" >&2; exit 2; }
[[ $# == 1 && "$1" == OWNER_APPROVES_EXACT_LITERAL_CONTROL_RECONCILIATION_AND_PROVEN_NORMAL_RESTART ]] || hold OWNER_CONFIRM
pin(){
 [[ $(gh api user --jq .login) == HKcode22 ]] || hold OWNER
 [[ $(gh api "repos/$R/git/ref/heads/main" --jq .object.sha) == "$S" ]] || hold MAIN
 [[ $(gh api "repos/$L/git/ref/heads/main" --jq .object.sha) == "$LS" ]] || hold RELAY_MAIN
}
pin
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]] || hold RETENTION
[[ $(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L") == "$OLD" ]] || hold RELAY_EPOCH
[[ $(gh variable get P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC -R "$R") == "$OLD" ]] || hold TARGET_EPOCH
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ROUTE -R "$L") == DIRECT_TICK ]] || hold RELAY_ROUTE
[[ $(gh variable get TRAVNR_RELAY_DIRECT_TICK_APPROVED -R "$L") == 1 ]] || hold RELAY_APPROVAL
[[ $(gh variable get TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$L") == "$S" ]] || hold RELAY_TARGET
[[ $(gh variable get P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R "$R") == true ]] || hold DAILY_PREP
gh api "repos/$R/issues/comments/7118665193" | jq -e --arg s "$S" --arg t "$OLD" '.user.login=="HKcode22" and (.body|contains("PHASE6 OWNER PROSPECTIVE NORMAL CALENDAR RESTART AUTHORIZATION")) and (.body|contains($s)) and (.body|contains($t))' >/dev/null || hold ORIGINAL_RESTART
# Pause only existing paid parent routes and rolling relay. Retention, future-day
# preparation and the existing no-provider PRE workers are not disabled.
setv(){ gh variable set "$1" -R "$R" --body "$2" >/dev/null && [[ $(gh variable get "$1" -R "$R") == "$2" ]]; }
pause(){
 gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$L" --body 0 >/dev/null || return 1
 setv P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false || return 1
 setv P6_PRIVATE_POST_PARENT_ENABLED false || return 1
 setv P6_NATIVE_POST_PRODUCER_ENABLED 0 || return 1
 [[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]]
}
pause || hold PAUSE_UNKNOWN
echo P6_ROLLING_AND_PAID_PARENTS_PAUSED_RETENTION_UNCHANGED
finished=0
trap 'rc=$?; if [[ "$finished" != 1 ]]; then set +e; pause; echo "P6_PAID_PAUSE_RECHECK_ATTEMPTED_NO_REPLAY"; fi; exit "$rc"' EXIT
# No alternative paid routes, no environment shadows for toggles we change.
rv="$(gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv')"
ev="$(gh api "repos/$R/environments/$E/variables?per_page=100" --paginate --jq '.variables[].name')"
for k in P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED P6_PRIVATE_POST_PARENT_ENABLED P6_NATIVE_POST_PRODUCER_ENABLED P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC P5_AUTO_SOURCE_DISPATCH_ENABLED P5_POST_AUTO_DISPATCH_ENABLED; do
 if grep -qx "$k" <<< "$ev"; then hold "ENV_SHADOW_$k"; fi
done
if grep -Eq '^(P5_AUTO_SOURCE_DISPATCH_ENABLED|P5_POST_AUTO_DISPATCH_ENABLED|P5_T24_AUTO_DISPATCH_ENABLED|P5_LATER_PRE_AUTO_DISPATCH_ENABLED|P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED|P6_ROLLING_SCHEDULED_ROOT_ENABLED|P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED|P6_ROLLING_WINDOW_CUSTODY_ENABLED)[[:space:]]+(1|true)$' <<< "$rv"; then hold CONFLICTING_ROUTE; fi
for k in P6_PRIVATE_T24_EXECUTION_ENABLED P5_CD_GH_T24_SCHEDULE_ENABLED P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED P5_CD_GH_PRE_SCHEDULE_ENABLED P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED P6_T24_CUSTODY_ENABLED P6_NATIVE_LATER_RUNTIME_ENABLED P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED; do
 [[ $(gh variable get "$k" -R "$R") == 1 ]] || hold "EXISTING_MODE_$k"
done
[[ $(gh variable get P5_CD_GH_PRE_MODE -R "$R") == PHASE6_APPROVED ]] || hold PRE_MODE
quiet_paid(){
 for status in queued in_progress waiting requested pending; do
  paths="$(gh api "repos/$R/actions/runs?status=$status&per_page=100" --paginate --jq '.workflow_runs[].path')"
  if grep -Eq '^\.github/workflows/(phase6-direct-recovery-tick|phase6-rolling-controller|phase5-source-upcoming-queue|phase5-one-signed-day-source|phase5-one-signed-future-post)' <<< "$paths"; then hold ACTIVE_PAID_OR_PARENT; fi
 done
}
quiet_paid
# Reconcile all exact failed attempts in current epoch. Root had no POST;
# both PRE attempts stopped at shell admission, before npm/database.
for id in 45302763595 45307333953 45307652365 45321496617; do
 gh api "repos/$R/actions/runs/$id" | jq -e --arg s "$S" '.head_sha==$s and .head_branch=="main" and .run_attempt==1 and .conclusion=="failure"' >/dev/null || hold FAILED_RUN_IDENTITY
done
[[ $(gh api "repos/$R/actions/runs/45302763595/artifacts" --jq .total_count) == 0 ]] || hold ROOT_ARTIFACT
log="$(gh run view 45302763595 -R "$R" --job 138139112228 --log)"
grep -q 'HOLD_P6_DIRECT_RECOVERY_NO_EXACT_SEPARATE_APPROVAL_OR_CONFLICTING_ROOT' <<< "$log" || hold ROOT_ADMISSION_LOG
unset log
for pair in '45307333953 138154266743 Separate STOP-default T24 current registry scheduler' '45307652365 138155302591 STOP gate before dependencies and before any database connection' '45321496617 138200886569 Separate STOP-default T24 current registry scheduler'; do
 read -r run job step <<< "$pair"
 gh api "repos/$R/actions/runs/$run/jobs?per_page=100" | jq -e --argjson j "$job" --arg n "$step" '
  [.jobs[]|select(.id==$j and .conclusion=="failure")|.steps[]|select(.name==$n and .conclusion=="failure")]|length==1' >/dev/null || hold PRE_FAILURE_NOT_ADMISSION
done
history(){
 local h id p job gate
 h="$(gh api "repos/$R/actions/runs?branch=main&created=%3E%3D2026-11-24T01%3A00%3A52Z&per_page=100")"
 jq -e '.total_count==(.workflow_runs|length) and all(.workflow_runs[];
   (.id==45302763595 or .id==45307333953 or .id==45307652365) or
   (.path|IN(".github/workflows/phase5-primary-fids-expiry-no-provider.yml",
   ".github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml",
   ".github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml",
   ".github/workflows/phase5-autonomous-clock-canary-no-provider.yml",
   ".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",
   ".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",
   ".github/workflows/phase5-cd-github-bounded-pre-tick.yml",
   ".github/workflows/phase6-private-later-enrollment.yml",
   ".github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml")) or
   (.path==".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml" and .conclusion=="skipped"))' <<< "$h" >/dev/null || hold UNRECONCILED_NEW_HISTORY
 # Allow independent nonpaid running jobs. Every additional negative PRE
 # result must have the same exact pre-dependency failure; no unknown failures.
 while IFS=$'\t' read -r id p; do
  [[ -n "$id" ]] || continue
  case "$p" in
   .github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml) job=current-private-native-t24; gate='Separate STOP-default T24 current registry scheduler';;
   .github/workflows/phase5-cd-github-bounded-pre-tick.yml) job=bounded-reviewed-real-pre; gate='STOP gate before dependencies and before any database connection';;
   *) hold "UNRECONCILED_FAILURE_$id";;
  esac
  gh api "repos/$R/actions/runs/$id/jobs?per_page=100" | jq -e --arg j "$job" --arg g "$gate" --arg s "$S" '
    .total_count==(.jobs|length) and ([.jobs[]|select(.name==$j and .head_sha==$s and .run_attempt==1 and .conclusion=="failure")|.steps[]|select(.name==$g and .conclusion=="failure")]|length)==1 and
    all(.jobs[]|select(.name!=$j); .conclusion=="skipped")' >/dev/null || hold "NEW_PRE_FAILURE_NOT_ADMISSION_$id"
  echo "P6_RECONCILED_ADDITIONAL_NONPAID_GATE_FAILURE=$id"
 done < <(jq -r '.workflow_runs[]|select(.status=="completed" and .conclusion!="success" and .conclusion!="skipped" and (.id!=45302763595 and .id!=45307333953 and .id!=45307652365))|[.id,.path]|@tsv' <<< "$h")
}
history

census(){
node <<'P6_RO'
const {Client}=require("pg");
const m="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e",cost="cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9";
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='10s'");
 const r=(await c.query("SELECT clock_timestamp() AS db_clock,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS read_only,NOT pg_is_in_recovery() AS primary,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) AS auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) AS cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) AS d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS d2,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=2) AS d2_index",[m,cost])).rows[0];
 await c.query("ROLLBACK");console.log(JSON.stringify(r));
 if(!r.correct_db||!r.read_only||!r.primary||r.auth!==1||r.cost!==1||r.source!==0||r.rest!==0||r.stops!==0||r.d1!==0||r.d2!==4)throw Error("LIVE_RECONCILIATION_HOLD");
 }finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_SHARED_STOP_DB",e.code||e.name);process.exitCode=2;});
P6_RO
}
census
# Existing live V0108 expiry owner census, same previously reviewed blob;
# zero pending expiry / deletion STOP required, no provider calls.
TMP="$(mktemp -d "$PWD/scripts/.p6_shared_stop_XXXXXXXX")"
trap 'rc=$?; rm -rf -- "$TMP"; if [[ "$finished" != 1 ]]; then set +e; pause; echo P6_PAID_PAUSE_RECHECK_ATTEMPTED_NO_REPLAY; fi; exit "$rc"' EXIT
CENSUS=b4c3395eb985f9b3ef408e79827900a4c0331a59
gh api "repos/$R/git/blobs/$CENSUS" --jq .content | base64 --decode > "$TMP/expiry.mjs"
[[ $(git hash-object "$TMP/expiry.mjs") == "$CENSUS" ]] || hold EXPIRY_BLOB
ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP/expiry.mjs" > "$TMP/expiry.json" || hold EXPIRY_CHECK
jq -e '.status=="P6_GATE3_OWNER_READONLY_ACTUAL_CENSUS_NO_GO" and .productionDatabase=="neondb" and .sourceAuthorizationEnabled==true and .privateExpiryProfile=="V0108" and .unresolvedDeletionStops==0 and .duePackets==0 and .indexes.due==0 and .providerCalls==0 and .databaseWrites==0' "$TMP/expiry.json" >/dev/null || hold EXPIRY_STOP
echo P6_FRESH_V0108_RETENTION_NO_DUE_OR_STOP
# All of these are previously reviewed literal admission controls, not
# secrets containing credentials or policy bytes. Existing name != value.
# Reconcile them together in the exact environment used by the real jobs.
# Parent/relay routes remain paused. No DB STOP resolved or overridden.
for pair in \
 P5_CD_GH_PRE_STOP:0 P5_CD_GH_PRE_ARMED:1 P5_CD_GH_PREPARE_ARMED:1 \
 P5_CD_GH_T24_WITNESS_APPROVED:1 P5_CD_GH_T24_PREPARE_APPROVED:1 \
 P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED:1 P5_CD_GH_PRIVATE_CURRENT_APPROVED:1 \
 P5_CD_GH_E_ROUTE_FEATURES_APPROVED:1 P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED:1 P6_T24_CUSTODY_APPROVED:1 \
 V39_PHASE5_FREEZE_SIGNED:1 V39_PHASE5_SOURCE_RIGHTS_APPROVED:1 \
 V39_P5_SEVEN_REST_BUDGET_SIGNED:1 V39_PHASE6_PROCESS_ARMED:1 V39_PHASE6_OWNER_APPROVED:1 \
 P6_ROLLING_DIRECT_RECOVERY_APPROVED:1; do
 k="${pair%:*}"; value="${pair##*:}"
 gh secret set "$k" -R "$R" -e "$E" --body "$value" >/dev/null || hold "LITERAL_WRITE_UNKNOWN_$k"
 gh api "repos/$R/environments/$E/secrets/$k" --jq '{name,updated_at}'
done
echo P6_EXACT_PROTECTED_LITERAL_CONTROLS_RECONCILED_NOT_RUNTIME_PROOF
# Use exact existing no-provider workflows; first attempt only. No reruns.
dispatch_check(){
 local wf="$1" jobname="$2" gate="$3"; shift 3
 local before ids id data
 before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
 gh workflow run "$wf" -R "$R" --ref main "$@" >&2 || hold DISPATCH_UNKNOWN
 id=""
 for n in $(seq 1 30); do
  ids="$(gh run list -R "$R" --workflow "$wf" --event workflow_dispatch --limit 10 --json databaseId,createdAt,headSha --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"$before\")|.databaseId")"
  if [[ -n "$ids" ]]; then [[ $(wc -l <<< "$ids") == 1 ]] || hold MULTIPLE_NEW_RUNS; id="$ids"; break; fi
  sleep 4
 done
 [[ "$id" =~ ^[0-9]+$ ]] || hold NEW_RUN_ID_UNKNOWN
 echo "P6_NONPAID_VERIFY_RUN=$id $wf" >&2
 timeout 600 gh run watch "$id" -R "$R" --exit-status >&2 || hold NONPAID_VERIFY_FAILED_NO_REPLAY
 gh api "repos/$R/actions/runs/$id" | jq -e --arg s "$S" '.head_sha==$s and .head_branch=="main" and .event=="workflow_dispatch" and .run_attempt==1 and .actor.login=="HKcode22" and .conclusion=="success"' >/dev/null || hold VERIFY_RUN_ID
 data="$(gh api "repos/$R/actions/runs/$id/jobs?per_page=100")"
 jq -e --arg n "$jobname" --arg g "$gate" '.total_count==(.jobs|length) and ([.jobs[]|select(.name==$n and .conclusion=="success")]|length)==1 and ([.jobs[]|select(.name==$n)|.steps[]|select(.name==$g and .conclusion=="success")]|length)==1' <<< "$data" >/dev/null || hold VERIFY_JOB_OR_GATE
 printf '%s\n' "$id"
}
t24="$(dispatch_check phase5-cd-github-one-queued-t24-witness-main-manual.yml current-private-native-t24 'Separate STOP-default T24 current registry scheduler' -f confirm=RUN_CURRENT_SIGNED_T24_WITH_WITNESS_NO_PROVIDER -f frozen_roster='')"
later="$(dispatch_check phase5-cd-github-bounded-pre-tick.yml bounded-reviewed-real-pre 'STOP gate before dependencies and before any database connection' -f private_transport=PRIVATE_CURRENT_SCHEDULE -f current_dispatch_confirm=RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER)"
echo "P6_ACTUAL_PRE_GATES_PASS_T24=$t24 LATER=$later"
# Day2 nonpaid prepare is independent of the failed Day1 draw.
# Use existing exact explicit day2 workflow; runtime may correctly defer
# before its signed maximum lookahead. No replay of uncertain genesis.
prep="$(dispatch_check phase6-nonpaid-source-day-prepare-publish.yml protected-main-one-day-nonpaid 'Prepare and publish at most one eligible independently reviewed future day' -f run_day_index=2 -f confirm=ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH)"
echo "P6_DAY2_NONPAID_RUN=$prep"
prep_log="$(gh run view "$prep" -R "$R" --log)"
if grep -q ONE_PROSPECTIVE_DAY_PREPARED_AND_PUBLISHED_NO_PAID_GO <<< "$prep_log"; then
 echo P6_DAY2_PREPARATION_PUBLISHED_RECEIPT
elif grep -q NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE <<< "$prep_log"; then
 echo P6_DAY2_PREPARATION_NOT_DUE_OR_ALREADY_INDEXED_NO_WRITE
else hold PREP_RECEIPT_UNKNOWN; fi
unset prep_log
# Independent cron audit used obsolete 046d relay pin, while actual 02:49Z
# PRIMARY pulse was c5. Repair audit-only metadata, not cron jobs/credentials.
if gh api "repos/$L/compare/046d89d341fa9f24524ea11e2778e273e3f39533...$LS" | jq -e '.status=="ahead" and .ahead_by==3 and .behind_by==0 and ([.files[].filename]|sort)==["relay.mjs","relay.test.mjs"]' >/dev/null &&
   gh api "repos/$L/actions/runs/45315135919" | jq -e --arg s "$LS" '.head_sha==$s and .run_attempt==1 and .conclusion=="success" and .display_title=="TRAVNR EXTERNAL CLOCK PRIMARY_BACKSTOP"' >/dev/null; then
  ap="$(gh variable get TRAVNR_CRON_RELAY_SHA -R "$L" 2>/dev/null || true)"
  ae="$(gh api "repos/$L/environments/travnr-cron-audit/variables?per_page=100" --paginate --jq '.variables[].name')" || hold AUDIT_ENV_READ
  if grep -qx TRAVNR_CRON_RELAY_SHA <<< "$ae"; then
   echo P6_CRON_AUDIT_PIN_ENV_SHADOW_REVIEW_SEPARATELY
  elif [[ "$ap" == 046d89d341fa9f24524ea11e2778e273e3f39533 ]]; then
   gh variable set TRAVNR_CRON_RELAY_SHA -R "$L" --body "$LS" >/dev/null || hold AUDIT_PIN_WRITE_UNKNOWN
   [[ $(gh variable get TRAVNR_CRON_RELAY_SHA -R "$L") == "$LS" ]] || hold AUDIT_PIN_READBACK
   echo P6_CRON_AUDIT_ONLY_PIN_RECONCILED_NO_CRON_MUTATION
  elif [[ "$ap" == "$LS" ]]; then echo P6_CRON_AUDIT_PIN_ALREADY_CURRENT
  else echo P6_CRON_AUDIT_PIN_UNKNOWN_REVIEW_SEPARATELY; fi
fi
# Fresh physical ledger / no uncertain attempt after both real PRE tests.
pin
quiet_paid
history
census
new="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
[[ $(date -u +%s) -lt $(date -u -d '2026-11-25T00:45:00Z' +%s) ]] || hold DAY2_PREPARATION_BOUNDARY
gh issue comment 413 -R "$R" --body "PHASE6 OWNER RECONCILED EXACT LITERAL ADMISSION SUCCESSOR: previous epoch $OLD failures 45302763595 direct pre-POST admission, 45307333953 T24 shell admission, 45307652365 later PRE shell admission and 45321496617 second T24 shell admission preserved; fresh owner PG16 zero SOURCE/REST/STOP and exact COST_UPPER_BOUND, V0108 no due/deletion STOP. Exact reviewed protected literal admission control reconciliation, actual first-attempt nonpaid PRE gate checks $t24 and $later PASS, nonpaid day2 preparation $prep verified job. No provider replay or changed budget/calendar/rights. Explicit successor epoch $new main $S relay $LS; no Day1 exceptional registration." >/dev/null || hold LEDGER
setv P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC "$new" || hold TARGET_EPOCH_WRITE
gh variable set TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L" --body "$new" >/dev/null || hold RELAY_EPOCH_WRITE
[[ $(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L") == "$new" ]] || hold RELAY_EPOCH_READBACK
setv P6_NATIVE_POST_PRODUCER_ENABLED 1 || hold POST_PRODUCER_ENABLE
setv P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true || hold SOURCE_ENABLE
setv P6_PRIVATE_POST_PARENT_ENABLED true || hold POST_ENABLE
# Actual direct root must execute once before relay resumes. This is an
# approved new prospective tick, never a rerun. Existing signed workers can
# spend under their own budget/cutoff gates if a genuine query is due.
# If uncertain, pause and reconcile; do not advance epoch again automatically.
before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gh workflow run phase6-direct-recovery-tick.yml -R "$R" --ref main -f confirm=RUN_ONE_REVIEWED_DIRECT_RECOVERY_TICK_AFTER_SEPARATE_PHASE6_GO -f approved_main_sha="$S" >&2 || hold DIRECT_DISPATCH_UNKNOWN
id=""
for n in $(seq 1 30); do
 ids="$(gh run list -R "$R" --workflow phase6-direct-recovery-tick.yml --event workflow_dispatch --limit 10 --json databaseId,createdAt,headSha --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"$before\")|.databaseId")"
 if [[ -n "$ids" ]]; then [[ $(wc -l <<< "$ids") == 1 ]] || hold DIRECT_ACK_AMBIGUOUS; id="$ids"; break; fi
 sleep 4
done
[[ "$id" =~ ^[0-9]+$ ]] || hold DIRECT_ACK_UNKNOWN
echo "P6_FIRST_NEW_DIRECT_RUN=$id"
timeout 660 gh run watch "$id" -R "$R" --exit-status || hold ACTUAL_DIRECT_FAILURE_NO_REPLAY
gh api "repos/$R/actions/runs/$id" | jq -e --arg s "$S" '.head_sha==$s and .head_branch=="main" and .event=="workflow_dispatch" and .run_attempt==1 and .actor.login=="HKcode22" and .conclusion=="success"' >/dev/null || hold DIRECT_IDENTITY
j="$(gh api "repos/$R/actions/runs/$id/jobs?per_page=100")"
jq -e '.total_count==(.jobs|length) and ([.jobs[]|select(.name=="direct-protected-recovery-tick" and .conclusion=="success")]|length)==1 and ([.jobs[]|select(.name=="direct-protected-recovery-tick")|.steps[]|select(.name=="Execute one direct recovery wave and reconcile exact parent ACKs" and .conclusion=="success")]|length)==1 and ([.jobs[]|select(.name=="direct-protected-recovery-tick")|.steps[]|select((.name=="Direct outcome TERMINAL_PARENT_ACKS_RECONCILED" or .name=="Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED") and .conclusion=="success")]|length)==1' <<< "$j" >/dev/null || hold DIRECT_DID_NOT_PROVE_WAVE_OR_CUSTODY
gh api "repos/$R/actions/runs/$id/artifacts" | jq -e --arg n "p6-direct-terminal-$id" '.total_count==1 and (.artifacts|length)==1 and .artifacts[0].name==$n and .artifacts[0].expired==false' >/dev/null || hold DIRECT_RECEIPT_ARTIFACT
pin
gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$L" --body 1 >/dev/null || hold RELAY_ENABLE
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 1 ]] || hold RELAY_READBACK
finished=1
echo "P6_ACTUAL_DIRECT_WAVE_VERIFIED=$id"
echo "P6_RECONCILED_PROSPECTIVE_EPOCH=$new"
echo P6_ACTUAL_PRE_AND_DIRECT_WAVE_PASS_AUTONOMOUS_NORMAL_ROUTES_RESUMED
