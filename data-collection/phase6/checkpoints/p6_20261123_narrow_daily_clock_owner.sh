#!/usr/bin/env bash
# Narrow clock compatibility recovery; never enable paid dispatch or advance epoch.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
E=phase6-protected-runtime
S=c8e065d665ccacb6d2575070e94c5500b7583044
B=071ab654a0dc17f5fd866f5ef9c50ba906a245aa
D="$HOME/.travnr-t24-repair-rY0bGwIN"
ROOT="$(git rev-parse --show-toplevel)"
T="$(mktemp -d)"
phase=verify
paused=0
hold(){ echo "HOLD_P6_CLOCK_$1" >&2; exit 2; }
v(){ gh variable get "$2" -R "$1"; }
setprep(){ gh variable set P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R "$R" --body "$1" >/dev/null && [[ "$(v "$R" P6_NONPAID_SOURCE_SCHEDULE_ENABLED)" == "$1" ]]; }
cleanup(){
  rc=$?
  if [[ "$paused" == 1 && "$phase" == verify ]]; then setprep true || echo HOLD_P6_CLOCK_PREP_RESTORE_UNCERTAIN; fi
  if [[ "$phase" == writing ]]; then echo HOLD_P6_CLOCK_PARTIAL_WRITE_POSSIBLE_DO_NOT_REPLAY; fi
  git -C "$ROOT" worktree remove --force "$T/tree" >/dev/null 2>&1 || true
  rm -rf "$T"
  exit "$rc"
}
trap cleanup EXIT
[[ $# == 1 && "$1" == OWNER_APPROVES_NARROW_59_DAY_DAILY_POLICY_NO_PAID_RESTART ]] || hold CONFIRM
pin(){
  [[ "$(gh api user --jq .login)" == HKcode22 ]]
  [[ "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$S" ]]
}
controls(){
  [[ "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == false &&
     "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == false &&
     "$(v "$R" P6_NATIVE_POST_PRODUCER_ENABLED)" == 0 &&
     "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 0 &&
     "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
     "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == 2026-11-24T04:27:10.000Z &&
     "$(v "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC)" == 2026-11-24T04:27:10.000Z ]]
}
pin || hold PIN
controls || hold CONTROLS
[[ "$(v "$R" P6_NONPAID_SOURCE_SCHEDULE_ENABLED)" == true ]] || hold PREP_EXPECTED_ON
for f in owner-private.pem request.json p6-t24-four-policy-envelope.json; do [[ -f "$D/$f" ]] || hold LOCAL_ARTIFACT_ABSENT; done
git -C "$ROOT" cat-file -e "$S^{commit}" 2>/dev/null || git -C "$ROOT" fetch origin main
git -C "$ROOT" worktree add --detach "$T/tree" "$S" >/dev/null
[[ "$(git -C "$T/tree" rev-parse HEAD)" == "$S" ]] || hold CHECKOUT
gh api "repos/$R/git/blobs/$B" --jq .content | base64 --decode > "$T/helper.cjs"
[[ "$(git hash-object "$T/helper.cjs")" == "$B" ]] || hold HELPER_HASH
cat > "$T/admit.mjs" <<'JS'
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const {admitDirectTick,DIRECT_CONFIRM}=await import(process.argv[2]);
const {oldDaily,newDaily}=JSON.parse(readFileSync(0,"utf8"));
const hash=b=>createHash("sha256").update(b).digest("hex");
const flags=["P6_ROLLING_CONTROLLER_ENABLED","P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_ROLLING_DIRECT_RECOVERY_APPROVED","V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_P5_SEVEN_REST_BUDGET_SIGNED","V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"];
const since="2026-11-24T04:27:10.000Z";
function run(p,now){
 const wire=Buffer.from(JSON.stringify(p));
 const sha=p.approvedCodeSha;
 return admitDirectTick({...Object.fromEntries(flags.map(k=>[k,"1"])),
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"45326507493",GITHUB_SHA:sha,
 V39_P5_APPROVED_CODE_SHA:sha,P6_ROLLING_REQUESTED_MAIN_SHA:sha,P6_ROLLING_SESSION_CONFIRM:DIRECT_CONFIRM,
 P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC:since,P5_CD_GH_PRE_STOP:"0",ADB_AUTO_COLLECT:"0",GITHUB_TOKEN:"synthetic-local-admission-only",
 V39_P5_MANIFEST_SHA256:p.manifestSha256,V39_P5_CALENDAR_HASH:p.calendarSha256,V39_P5_RELEASE_SHA256:p.releaseSha256,V39_P5_RIGHTS_SHA256:p.rightsSha256,
 P6_NONPAID_DAILY_POLICY_BASE64:wire.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:hash(wire)},now,readFileSync);
}
let rejected=false;
try{run(oldDaily,Date.parse("2026-11-24T04:27:30.847Z"));}catch(e){if(e.message!=="HOLD_P6_DIRECT_RECOVERY_POLICY_CLOCK")throw e;rejected=true;}
if(!rejected)throw Error("ORIGINAL_CLOCK_FAILURE_NOT_REPRODUCED");
const out=run(newDaily,Date.now());
if(out.calendar.until-out.calendar.from!==59*86400000)throw Error("CANDIDATE_DURATION");
for(const [days,expected] of [[60,true],[61,false]]){
 const p={...newDaily,validUntilUtc:new Date(Date.parse(newDaily.validFromUtc)+days*86400000).toISOString()};
 let ok=false;try{run(p,Date.now());ok=true;}catch(e){if(e.message!=="HOLD_P6_DIRECT_RECOVERY_POLICY_CLOCK")throw e;}
 if(ok!==expected)throw Error("CLOCK_BOUNDARY_TEST");
}
console.log("P6_ACTUAL_31_PINNED_CALENDAR_DIRECT_ADMISSION_59_60_61_70_DAY_TEST_PASS_NO_DISPATCH");
JS
cat > "$T/patch.txt" <<'JS'
if(mode==="verify"){
  need(repair[names[1]]==="6eca7b05b0174243a47681e72e1bd7810028928d2f5c3dd01e0160779fa90883"&&repair[names[3]]==="02689a23c74638366469ad60fae06e91fee662347dedae9ec7fe8e2644e40804","CURRENT_CORRECTED_DIGESTS");
  const d=json(repair[names[0]]), t=json(repair[names[2]]);
  need(d.validFromUtc==="2026-11-22T00:00:00.000Z"&&d.validUntilUtc==="2027-01-31T00:00:00.000Z"&&d.nativeLaterReview.maximumT24ExecutionLanes===1&&t.dailyPolicySha256===repair[names[1]],"CLOCK_AND_LANE_SCOPE");
  const n={...d,validUntilUtc:"2027-01-20T00:00:00.000Z"}, nt={...t,dailyPolicySha256:digest(n)};
  need(JSON.stringify({...n,validUntilUtc:d.validUntilUtc})===JSON.stringify(d)&&JSON.stringify({...nt,dailyPolicySha256:t.dailyPolicySha256})===JSON.stringify(t),"ONLY_CLOCK_AND_LINK");
  const vals={[names[0]]:b64(JSON.stringify(n)),[names[1]]:digest(n),[names[2]]:b64(JSON.stringify(nt)),[names[3]]:digest(nt)};
  const root=process.env.P6_CLOCK_TREE;
  const test=execFileSync(process.execPath,[process.env.P6_CLOCK_TEST,require("node:url").pathToFileURL(root+"/scripts/v39_phase6_direct_recovery_tick_v39.mjs").href],{cwd:root,input:JSON.stringify({oldDaily:d,newDaily:n}),env:{PATH:process.env.PATH},encoding:"utf8",stdio:["pipe","pipe","pipe"],timeout:30000});
  need(test.trim()==="P6_ACTUAL_31_PINNED_CALENDAR_DIRECT_ADMISSION_59_60_61_70_DAY_TEST_PASS_NO_DISPATCH","PINNED_TEST");
  console.log(test.trim());
  console.log(JSON.stringify({status:"P6_CLOCK_CANDIDATE_VERIFIED",from:n.validFromUtc,until:n.validUntilUtc,days:59,newDailyDigest:vals[names[1]],newTransportDigest:vals[names[3]],secretValuesPrinted:false}));
  if(process.env.P6_CLOCK_APPLY!=="1")return;
  need(gh(["api","user","--jq",".login"])==="HKcode22"&&gh(["api","repos/"+R+"/git/ref/heads/main","--jq",".object.sha"])===PIN,"OWNER_MAIN");
  const v=(r,k)=>gh(["variable","get",k,"-R",r]);
  need(v("HKcode22/TravnrClockRelay","TRAVNR_RELAY_ROLLING_ENABLED")==="0"&&v("HKcode22/TravnrClockRelay","TRAVNR_RELAY_PRIMARY_ENABLED")==="1"&&v(R,"P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED")==="false"&&v(R,"P6_PRIVATE_POST_PARENT_ENABLED")==="false"&&v(R,"P6_NATIVE_POST_PRODUCER_ENABLED")==="0"&&v(R,"P6_NONPAID_SOURCE_SCHEDULE_ENABLED")==="false","ROUTES_PAUSED");
  const repo=new Set(gh(["api","repos/"+R+"/actions/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n"));
  const env=new Set(gh(["api","repos/"+R+"/environments/phase6-protected-runtime/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n"));
  need(names.every(k=>repo.has(k)&&!env.has(k)),"NO_ENV_SHADOW");
  for(const k of names){const ts=Date.parse(gh(["api","repos/"+R+"/actions/secrets/"+k,"--jq",".updated_at"]));need(ts>=Date.parse("2026-11-24T04:25:33Z")&&ts<=Date.parse("2026-11-24T04:26:24Z"),"SECRET_CHANGED_SINCE_J2");}
  fs.writeFileSync(a+".clock.apply.started",JSON.stringify({daily:vals[names[1]],transport:vals[names[3]]}),{flag:"wx",mode:0o600});
  for(const k of names){gh(["secret","set",k,"-R",R],Buffer.from(vals[k]));console.log("P6_CLOCK_WRITE_ACK "+k);}
  console.log("P6_59_DAY_POLICY_AND_TRANSPORT_INSTALLED_PAID_PAUSED");
  return;
}
JS
node - "$T/helper.cjs" "$T/patch.txt" <<'JS'
const fs=require("node:fs"),[p,q]=process.argv.slice(2),s=fs.readFileSync(p,"utf8"),anchor='if(mode==="verify")return;';
if(s.split(anchor).length!==2)throw Error("UNEXPECTED_HELPER");
fs.writeFileSync(p,s.replace(anchor,fs.readFileSync(q,"utf8")),{mode:0o600});
JS
node --check "$T/helper.cjs"
node --check "$T/admit.mjs"
export P6_CLOCK_TREE="$T/tree" P6_CLOCK_TEST="$T/admit.mjs"
P6_CLOCK_APPLY=0 node "$T/helper.cjs" verify "$D/owner-private.pem" "$D/request.json" "$D/p6-t24-four-policy-envelope.json"
# Pause only the daily preparation scheduler while checking/writing linked bytes.
setprep false || hold PREP_PAUSE
paused=1
for status in queued in_progress waiting pending requested; do
 paths="$(gh api "repos/$R/actions/runs?status=$status&per_page=100" --paginate --jq '.workflow_runs[]|select(.head_branch=="main")|.path')"
 if grep -Eq '^\.github/workflows/(phase6-nonpaid-source-day-prepare-publish|phase6-direct-recovery-tick|phase5-source-upcoming-queue|phase5-one-signed-day-source|phase5-one-signed-future-post|phase5-cd-github|phase6-private-later-enrollment)' <<< "$paths"; then hold LIVE_RELEVANT_WORKER; fi
done
node <<'JS'
const {Client}=require("pg");
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});try{
 await c.connect(); await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"); await c.query("SET LOCAL statement_timeout='10s'");
 const q=(await c.query("SELECT clock_timestamp() AS db_clock,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS ro,NOT pg_is_in_recovery() AS primary,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) AS auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) AS cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) AS d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS d2,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39) AS claims,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39) AS indexes,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256=$1) AS packets",["a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e","cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9"])).rows[0];
 await c.query("ROLLBACK"); console.log(JSON.stringify(q));
 if(!q.correct_db||!q.ro||!q.primary||q.auth!==1||q.cost!==1||q.source!==0||q.rest!==0||q.stops!==0||q.d1!==0||q.d2!==4||q.claims!==0||q.indexes!==0||q.packets!==0)throw Error("NONEMPTY_GENESIS");
}finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_CLOCK_CENSUS",e.code||e.name);process.exitCode=2;});
JS
pin || hold PIN_DRIFT
controls || hold CONTROL_DRIFT
phase=writing
P6_CLOCK_APPLY=1 node "$T/helper.cjs" verify "$D/owner-private.pem" "$D/request.json" "$D/p6-t24-four-policy-envelope.json"
phase=installed
setprep true || hold PREP_REENABLE
paused=0
# Independently exercise the actual nonpaid consumers, without any paid or direct dispatch.
dispatch(){
 local wf="$1" before ids
 shift
 before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
 gh workflow run "$wf" -R "$R" --ref main "$@" >&2 || return 1
 for n in $(seq 1 30); do
  ids="$(gh run list -R "$R" --workflow "$wf" --event workflow_dispatch --limit 15 --json databaseId,createdAt,headSha --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"$before\")|.databaseId")" || return 1
  if [[ -n "$ids" ]]; then [[ "$(wc -l <<< "$ids")" == 1 ]] || return 1; printf '%s\n' "$ids"; return 0; fi
  sleep 3
 done
 return 1
}
t24="$(dispatch phase5-cd-github-one-queued-t24-witness-main-manual.yml -f confirm=RUN_CURRENT_SIGNED_T24_WITH_WITNESS_NO_PROVIDER -f frozen_roster='')" || hold T24_DISPATCH_ACK
echo P6_CLOCK_T24_TEST_RUN="$t24"
prep="$(dispatch phase6-nonpaid-source-day-prepare-publish.yml -f run_day_index=2 -f confirm=ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH)" || hold PREP_DISPATCH_ACK
echo P6_CLOCK_PREP_TEST_RUN="$prep"
rc=0
for id in "$t24" "$prep"; do timeout 600 gh run watch "$id" -R "$R" --exit-status || rc=1; done
controls || hold PAID_PAUSE_DRIFT
[[ "$rc" == 0 ]] || hold ACTUAL_NONPAID_TEST_FAILED
gh api "repos/$R/actions/runs/$t24/jobs?per_page=100" | jq -e '([.jobs[]|select(.name=="current-private-native-t24" and .conclusion=="success")]|length)==1' >/dev/null || hold T24_NOT_EXECUTED
gh api "repos/$R/actions/runs/$prep/jobs?per_page=100" | jq -e '([.jobs[]|select(.name=="protected-main-one-day-nonpaid" and .conclusion=="success")]|length)==1' >/dev/null || hold PREP_NOT_EXECUTED
echo P6_CLOCK_CORRECTED_ACTUAL_NONPAID_JOBS_GREEN_PAID_ROUTES_STILL_PAUSED
