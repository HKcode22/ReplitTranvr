#!/usr/bin/env bash
# Exact P6 G11+G12 nonpaid owner pre-GO check. No paid GET, no DB write,
# no GitHub mutation, no application-credential or source-content output.
set -Eeuo pipefail
set +x
umask 077
T="HKcode22/ReplitTranvr"
R="HKcode22/TravnrClockRelay"
PIN="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RPIN="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
FREE="bf6dff6e0f654836069b4cc289e5c7e750b28213"
CENSUS="b4c3395eb985f9b3ef408e79827900a4c0331a59"
hold(){ echo "HOLD_P6_G11_G12_FRESH_READONLY_$1" >&2; exit 2; }
[[ $# == 1 && "$1" == READ_FRESH_ACCOUNT_AND_EXISTING_PRODUCTION_RETENTION_NO_PAID_GO ]] || hold CONFIRM
for c in gh git node jq base64; do command -v "$c" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold OWNER
[[ "$(gh api "repos/$T/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN
[[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$RPIN" ]] || hold RELAY_MAIN
printenv AERODATABOX_API_KEY >/dev/null || hold FREE_PROVIDER_KEY_ENV_MISSING
printenv DATABASE_URL >/dev/null || hold OWNER_DB_URL_ENV_MISSING
[[ -f "$PWD/package.json" && -f "$PWD/node_modules/pg/package.json" && -d "$PWD/scripts" ]] || hold WORKSPACE_DEPENDENCIES
TMP="$(mktemp -d "$PWD/scripts/.p6_g11_g12_XXXXXXXX")"
trap 'rm -rf -- "$TMP"' EXIT
fetch(){
 local blob="$1" out="$2"
 gh api "repos/$T/git/blobs/$blob" --jq '.content' | base64 --decode > "$out" || hold SOURCE_FETCH
 [[ "$(git hash-object "$out")" == "$blob" ]] || hold SOURCE_BLOB
 node --check "$out" >/dev/null || hold JS_SYNTAX
}
fetch "$FREE" "$TMP/free.mjs"
fetch "$CENSUS" "$TMP/census.mjs"
env -u DATABASE_URL -u V39_DATABASE_RUNTIME_URL \
  ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
  node "$TMP/free.mjs" > "$TMP/free.json" || hold PROVIDER_FREE_CHECK
jq -e '
 .schema=="v39.phase6.launch-free-account-prearm.v2" and
 .status=="FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER" and
 .activeBillableSubscriptions==0 and .balancesStable==true and
 .providerPaidGets==0 and .providerMutations==0 and .sourceFidsCalls==0 and
 .databaseWrites==0 and .sourceContentsRetrieved==false and .phase6PaidGo==false and
 .apiUnitsLimit==60000 and .apiUnitsRemaining>=36740 and
 .alertCreditsRemaining>=1000 and .requestsRemaining>0
' "$TMP/free.json" >/dev/null || hold QUOTA_OR_FLOOR
ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
  node "$TMP/census.mjs" > "$TMP/census.json" || hold PG16_CENSUS
jq -e '
 .status=="P6_GATE3_OWNER_READONLY_ACTUAL_CENSUS_NO_GO" and
 .productionDatabase=="neondb" and
 .relayCompatibilityOnMain==true and .sourceAuthorizationEnabled==true and
 .privateExpiryProfile=="V0108" and .sourceBearingDeadlineClassificationProductionVerified==true and
 .unresolvedDeletionStops==0 and .duePackets==0 and .indexes.due==0 and
 .noProviderDataRead==true and .providerCalls==0 and .databaseWrites==0 and .paidGo==false
' "$TMP/census.json" >/dev/null || hold LIVE_EXPIRY_OR_STOP
gh api "repos/$T/actions/runs/45028157406" |
 jq -e '.conclusion=="success" and .run_attempt==1' >/dev/null || hold PRIOR_POLICY_PROOF
gh api "repos/$T/actions/runs/45028187506" |
 jq -e --arg s "$PIN" '.conclusion=="success" and .head_sha==$s and .run_attempt==1' >/dev/null || hold PRIOR_POST_PROOF
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/relay.tsv" || hold RELAY_VAR_READ
gh api "repos/$T/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/target.tsv" || hold TARGET_VAR_READ
v(){ awk -F '\t' -v k="$2" '$1==k {print $2}' "$1" | head -n1; }
[[ "$(v "$TMP/relay.tsv" TRAVNR_ROLLING_POLICY_FROM_UTC)" == 2026-11-23T23:45:00.000Z &&
   "$(v "$TMP/relay.tsv" TRAVNR_ROLLING_POLICY_UNTIL_UTC)" == 2026-12-29T04:00:00.000Z &&
   "$(v "$TMP/target.tsv" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == 2026-11-23T23:45:00.000Z &&
   "$(v "$TMP/target.tsv" P6_ROLLING_CONTROLLER_ENABLED)" == 1 &&
   "$(v "$TMP/target.tsv" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 1 ]] || hold STAGED_RUNTIME_DRIFT
[[ "$(gh api "repos/$T/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN_MOVED
jq -n --slurpfile a "$TMP/free.json" --slurpfile d "$TMP/census.json" '
 {status:"P6_G11_G12_FRESH_ACCOUNT_AND_LIVE_EXPIRY_READONLY_PASS_NOT_GO",
 accountObservedUtc:$a[0].observedAtUtc,
 apiUnitsRemaining:$a[0].apiUnitsRemaining,plannedApiUnits:36740,
 apiUnitHeadroom:($a[0].apiUnitsRemaining-36740),
 alertCreditsRemaining:$a[0].alertCreditsRemaining,protectedAlertFloor:1000,
 activeSubscriptions:$a[0].activeBillableSubscriptions,
 providerFreeReads:$a[0].providerFreeReads,
 observedDbClockUtc:$d[0].observedDbClockUtc,
 privateExpiryProfile:$d[0].privateExpiryProfile,
 duePackets:$d[0].duePackets,dueIndexes:$d[0].indexes.due,
 unresolvedDeletionStops:$d[0].unresolvedDeletionStops,
 backupProcedureSource:"2026-11-19_replit_pitr_recovery_control_review.md",
 actualFuturePopulatedPurgeProved:false,
 paidGo:false,explicitGate13PaidGoStillRequired:true }'
