#!/usr/bin/env bash
# Owner-only guarded operational repair. No paid manual dispatch, replay, policy
# changes, scientific tier activation, new DB grants, or historical PRE writes.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
OLD=95e9130fbb2ef5dbf67b161fbcf2881a5f358db4
H=982e2806819af13de35f0170ec6433fca7f691d4
L_OLD=879494843b02699ef3e3bebd0acd8f6ddf9551d0
B=8df852a34c08ba91a6b3a0441b2718579901a5ca
ENV=phase6-protected-runtime
RENV=travnr-target-forward
AENV=travnr-cron-audit
stage=ADMISSION
hold(){ echo "HOLD_PHASE5B_NOV25_REPAIR stage=$stage reason=$1" >&2;exit 2; }
trap 'echo "PHASE5B_NOV25_REPAIR_FAILED stage=$stage; inspect actual main and pins before any further APPLY" >&2' ERR
[[ "${1:-}" == APPLY_EXACT_NOV25_OPERATIONAL_PACING_SUCCESSOR ]] || hold MODE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
main(){ gh api "repos/$1/git/ref/heads/main" --jq .object.sha; }
v(){ gh variable get "$2" -R "$1"; }
check_old(){
 [[ "$(main "$R")" == "$OLD" && "$(main "$L")" == "$L_OLD" &&
 "$(v "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA)" == "$OLD" &&
 "$(v "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA)" == "$OLD" &&
 "$(v "$R" P7_EXPIRY_APPROVED_MAIN_SHA)" == "$OLD" &&
 "$(v "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$OLD" &&
 "$(v "$L" P6_RELAY_APPROVED_EXECUTABLE_SHA)" == "$L_OLD" &&
 "$(v "$L" TRAVNR_CRON_AUDIT_LAYOUT)" == RECOVERY_PAIR &&
 "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 &&
 "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
 "$(v "$L" TRAVNR_RELAY_ROLLING_ROUTE)" == INDEPENDENT_WAKE &&
 "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 0 ]] || hold PIN_CONTROL_DRIFT
}
check_old
stage=CI
p="$(gh pr view 975 -R "$R" --json headRefOid,baseRefOid,state,mergeable,isDraft,statusCheckRollup)"
[[ "$(jq -r .headRefOid <<<"$p")" == "$H" && "$(jq -r .baseRefOid <<<"$p")" == "$OLD" && "$(jq -r .state <<<"$p")" == OPEN && "$(jq -r .mergeable <<<"$p")" == MERGEABLE ]] || hold PR_DRIFT_OR_NOT_MERGEABLE
j="$(gh api "repos/$R/actions/runs?head_sha=$H&event=pull_request&per_page=100")"
jq -r '.workflow_runs[]|[.id,.name,.status,.conclusion]|@tsv' <<<"$j"
jq -e '
 .total_count==9 and (.workflow_runs|length)==9 and
 ([.workflow_runs[].id]|sort)==([45726282441,45726282465,45726282439,45726282444,45726282514,45726282488,45726282429,45726282445,45726282463]|sort) and
 all(.workflow_runs[];.status=="completed" and .conclusion=="success" and .run_attempt==1)
' <<<"$j" >/dev/null || hold EXACT_CI_NOT_GREEN
jq -e '[.statusCheckRollup[]|select(.status=="COMPLETED" and .conclusion=="SUCCESS")|.name] as $n | ["offline-safety","role-admission","phase5b-runtime-compatibility","fixed-metadata-only"]|all(. as $x|$n|index($x)!=null)' <<<"$p" >/dev/null || hold CRITICAL_JOB_NOT_GREEN
jq -e 'all(.statusCheckRollup[];.status=="COMPLETED" and (.conclusion=="SUCCESS" or .conclusion=="SKIPPED" or .conclusion=="NEUTRAL"))' <<<"$p" >/dev/null || hold OTHER_CHECK_NOT_GREEN
stage=NO_ACTIVE_SOURCE_OR_POST
quiet(){
 local wf q state
 for wf in phase5-one-signed-day-source-child-dispatch.yml phase5-one-signed-future-post-v0083-main-manual.yml phase5-source-upcoming-queue-main-scheduled-readonly.yml;do
  for state in queued in_progress waiting requested pending;do
   q="$(gh api "repos/$R/actions/workflows/$wf/runs?branch=main&status=$state&per_page=1")"
   jq -e '.total_count==0 and (.workflow_runs|length)==0' <<<"$q" >/dev/null || hold ACTIVE_SOURCE_POST_OR_PARENT_DO_NOT_INTERRUPT
  done
 done
}
quiet
# A separate owner check is mandatory just before merge; this command does
# not freeze the relay or promise atomic exclusion of newly created jobs.
# Check signed future dispatch and original retention from the actual DB.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$R/git/blobs/$B" --jq .content | base64 --decode > "$TMP/baseline.sh"
[[ "$(git hash-object "$TMP/baseline.sh")" == "$B" ]] || hold BASELINE_BLOB
bash -n "$TMP/baseline.sh"
stage=EXACT_DB_QUIET_WINDOW
cat > "$TMP/quiet.cjs" <<'NODE'
const {createRequire}=require("node:module"),{join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
async function main(){
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  if(!process.env.DATABASE_URL)throw Error("MISSING_DSN");
  await c.connect();await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='15s'");
  const g=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!g.db||!g.owner||!g.primary||!g.ro)throw Error("DB_IDENTITY");
  const a=await c.query("SELECT DISTINCT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL");
  if(a.rowCount!==1||!/^[a-f0-9]{64}$/.test(a.rows[0].manifest_sha256))throw Error("MANIFEST");
  const m=a.rows[0].manifest_sha256;
  const q=(await c.query("SELECT count(*)::int near_queries FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND hard_latest_dispatch_utc>transaction_timestamp() AND planned_dispatch_utc<transaction_timestamp()+interval '120 minutes'",[m])).rows[0];
  const s=(await c.query("SELECT count(*)::int unresolved FROM clean.adb_incident_stop WHERE NOT resolved")).rows[0];
  console.log(JSON.stringify({status:"P5B_CUTOVER_DB_WINDOW",at:g.at,nearQueries:q.near_queries,unresolvedStops:s.unresolved,providerCalls:0,productionWrites:0}));
  if(q.near_queries!==0||s.unresolved!==0)throw Error("NOT_QUIET_OR_STOP");
 }finally{await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
main().catch(()=>{console.error("HOLD_P5B_DB_QUIET_WINDOW");process.exitCode=2;});
NODE
node --check "$TMP/quiet.cjs"
node "$TMP/quiet.cjs"
stage=RETENTION_BASELINE_CURRENT
bash "$TMP/baseline.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$OLD"
stage=FINAL_PREMERGE
check_old
quiet
node "$TMP/quiet.cjs"
[[ "$(gh pr view 975 -R "$R" --json headRefOid --jq .headRefOid)" == "$H" ]] || hold PR_CHANGED
stage=EXACT_MERGE
if [[ "$(jq -r .isDraft <<<"$p")" == true ]];then gh pr ready 975 -R "$R";fi
if [[ "$(gh api "repos/$R" --jq .allow_merge_commit)" == true ]];then gh pr merge 975 -R "$R" --merge --match-head-commit "$H";else gh pr merge 975 -R "$R" --squash --match-head-commit "$H";fi
NEW="$(main "$R")"
[[ "$NEW" =~ ^[a-f0-9]{40}$ && "$NEW" != "$OLD" && "$(gh pr view 975 -R "$R" --json mergeCommit --jq .mergeCommit.oid)" == "$NEW" && "$(gh api "repos/$R/git/commits/$NEW" --jq .tree.sha)" == "$(gh api "repos/$R/git/commits/$H" --jq .tree.sha)" ]] || hold MERGE_RECEIPT
echo "P5B_EXACT_MAIN_MERGED $NEW"
pin(){
 local repo="$1" name="$2" value="$3";shift 3
 gh variable set "$name" -R "$repo" --body "$value"
 [[ "$(v "$repo" "$name")" == "$value" ]] || hold REPO_PIN_READBACK
 local env
 for env in "$@";do
  if gh variable get "$name" -R "$repo" --env "$env" >/dev/null 2>&1;then
   gh variable set "$name" -R "$repo" --env "$env" --body "$value"
   [[ "$(gh variable get "$name" -R "$repo" --env "$env")" == "$value" ]] || hold ENV_PIN_READBACK
  fi
 done
}
stage=EXISTING_EXECUTABLE_PINS
pin "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$NEW" "$ENV"
pin "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$NEW" "$ENV"
pin "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$NEW" "$ENV"
pin "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$NEW" "$RENV" "$AENV"
[[ "$(main "$R")" == "$NEW" && "$(main "$L")" == "$L_OLD" ]] || hold MAIN_DRIFT
stage=MANDATORY_NEW_RETENTION_BASELINE
bash "$TMP/baseline.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$NEW"
echo "P5B_OPERATIONAL_SUCCESSOR_AND_RETENTION_BASELINE_DEPLOYED target=$NEW relay=$L_OLD noPaidReplay=1 noScientificTierActivation=1 liveSourceEffectUnverified=1"
stage=NONPAID_HEARTBEAT
gh workflow run phase6-autonomous-gh-controller-heartbeat-no-provider.yml -R "$R" --ref main -f confirm=READONLY_GITHUB_CONTROLLER_HEALTH_NO_PROVIDER_NO_GO -f approved_main_sha="$NEW"
echo "P5B_POST_CUTOVER_HEARTBEAT_REQUESTED_NOT_VERIFIED"
