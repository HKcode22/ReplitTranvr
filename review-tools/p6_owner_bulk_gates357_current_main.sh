#!/usr/bin/env bash
# Phase 6 owner-local bulk continuation for fixed Gates 3/5/7.
# No SOURCE enable, no AeroDataBox/RapidAPI call, no paid GO.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
RELAY_REPO="HKcode22/TravnrClockRelay"
RELAY_PIN="214ede4895c6e6cdae5f124a85a323783251ea60"
ROOT="${HOME}/workspace"
DECISION="data-collection/phase5/evidence/2026-11-21_monday_exact_machine_bound_date_decision.json"
PRIMARY_WF="phase5-primary-fids-expiry-no-provider.yml"
RELAY_WF="external-clock.yml"

hold(){ echo "HOLD_P6_OWNER_BULK_$1" >&2; exit 2; }
cleanup(){ rm -f "/tmp/p6-v0107-review.$" "/tmp/p6-v0107-review-err.$" "/tmp/p6-before.$" "/tmp/p6-after.$" "/tmp/p6-new.$" "/tmp/p6-primary.log.$" "/tmp/p6-relay-before.$" "/tmp/p6-relay-after.$" "/tmp/p6-relay-new.$" "/tmp/p6-relay.log.$"; }
trap cleanup EXIT
[[ -d "$ROOT/.git" || -f "$ROOT/.git" ]] || ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$ROOT" && -e "$ROOT/.git" ]] || hold NO_REPO
cd "$ROOT"
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH

remote_main(){ gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha'; }
remote_relay(){ gh api "repos/$RELAY_REPO/git/ref/heads/main" --jq '.object.sha'; }

[[ -z "$(git status --porcelain)" ]] || hold WORKTREE_DIRTY
git fetch --quiet origin main
git switch main >/dev/null 2>&1 || hold SWITCH_MAIN
git merge --ff-only origin/main >/dev/null || hold FAST_FORWARD
PIN="$(git rev-parse HEAD)"
[[ "$PIN" =~ ^[0-9a-f]{40}$ && "$PIN" == "$(remote_main)" ]] || hold MAIN_IDENTITY
[[ "$(remote_relay)" == "$RELAY_PIN" ]] || hold RELAY_MAIN_CHANGED

# Exact-current-main safety proof. Evidence-only main commits may only trigger
# a subset, but the full Offline Safety run must be successful on this PIN.
RUNS="$(gh api "repos/$REPO/actions/runs?head_sha=$PIN&per_page=100")"
node - "$PIN" "$RUNS" <<'NODE'
const [pin,raw]=process.argv.slice(2),x=JSON.parse(raw),w=x.workflow_runs||[];
const rows=w.filter(r=>r.name==="V3.9 Offline Safety"&&r.head_sha===pin&&r.event==="push");
if(!rows.some(r=>r.status==="completed"&&r.conclusion==="success")){
 console.error("HOLD_P6_OWNER_BULK_OFFLINE_SAFETY_NOT_GREEN");process.exit(2);
}
NODE

export ADB_AUTO_COLLECT=0
export V39_PHASE6_PROCESS_ARMED=0
export V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL NODE_TLS_REJECT_UNAUTHORIZED
[[ -n "${DATABASE_URL:-}" ]] || hold DATABASE_URL_MISSING
[[ -f "$DECISION" ]] || hold DATE_DECISION_MISSING
DECISION_SHA="$(sha256sum "$DECISION" | awk '{print $1}')"
[[ "$DECISION_SHA" =~ ^[0-9a-f]{64}$ ]] || hold DATE_DECISION_SHA

OUT="${HOME}/.travnr-phase6-monday-${PIN:0:12}"

# ---------------- Gate 5: exact disabled Monday stage ----------------
if [[ ! -e "$OUT" ]]; then
  npx --no-install tsx review-tools/p6_nov23_prospective_revision_owner_v39.ts     --prepare-reviewed     RECOVER_EXACT_NOV22_FROM_COMMITTED_EVIDENCE     "$DECISION" "$DECISION_SHA" "$OUT"
else
  [[ -d "$OUT" && -f "$OUT/prospective-revision-package.json" && -f "$OUT/new-stage-input.json" ]] || hold PARTIAL_MONDAY_PACKAGE
fi

STAGE_STATE="$(node --input-type=module - "$OUT/new-stage-input.json" <<'NODE'
import pg from "pg";import fs from "node:fs";
const p=process.argv[2],stage=JSON.parse(fs.readFileSync(p,"utf8"));
const c=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:20000});
try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const q=(await c.query(`SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,enabled,revoked_at_utc
 FROM clean.adb_phase6_authorization WHERE singleton_key=true`)).rows;
 const a=q[0];
 if(q.length!==1||a.enabled!==false||a.revoked_at_utc!==null){console.error("HOLD_STAGE_AUTH_NOT_DISABLED");process.exit(2)}
 const exact=a.manifest_sha256===stage.manifestSha256&&a.calendar_hash===stage.calendarSha256&&a.config_hash===stage.configSha256&&a.code_sha===stage.codeSha40;
 console.log(exact?"MONDAY_STAGE_ALREADY_PRESENT":"MONDAY_STAGE_NEEDS_APPLY");
 await c.query("ROLLBACK");
}finally{await c.end().catch(()=>{})}
NODE
)" || hold MONDAY_STAGE_PRECHECK

if [[ "$STAGE_STATE" == "MONDAY_STAGE_NEEDS_APPLY" ]]; then
  export P6_MONDAY_OWNER_APPLY_APPROVAL="APPLY_EXACT_REVIEWED_DISABLED_MONDAY_STAGE_ONLY_NO_PROVIDER"
  npx --no-install tsx review-tools/p6_nov23_prospective_revision_owner_v39.ts     --apply-reviewed     RECOVER_EXACT_NOV22_FROM_COMMITTED_EVIDENCE     "$DECISION" "$DECISION_SHA" "$OUT"
  unset P6_MONDAY_OWNER_APPLY_APPROVAL
elif [[ "$STAGE_STATE" != "MONDAY_STAGE_ALREADY_PRESENT" ]]; then
  hold MONDAY_STAGE_PRECHECK_RESULT
fi

node --input-type=module - "$OUT/new-stage-input.json" <<'NODE'
import pg from "pg";import fs from "node:fs";import crypto from "node:crypto";
const stageRaw=fs.readFileSync(process.argv[2]),stage=JSON.parse(stageRaw);
const c=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:20000});
try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const a=(await c.query(`SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,enabled,revoked_at_utc
 FROM clean.adb_phase6_authorization WHERE singleton_key=true`)).rows[0];
 const x=(await c.query(`SELECT
  (SELECT count(*) FROM clean.adb_collection_subs WHERE ended_at IS NULL)::int subs,
  (SELECT count(*) FROM clean.adb_collection_batches WHERE status='ACTIVE')::int batches,
  (SELECT count(*) FROM clean.adb_incident_stop WHERE NOT resolved)::int incidents`)).rows[0];
 if(!a||a.enabled!==false||a.revoked_at_utc!==null||a.manifest_sha256!==stage.manifestSha256||
    a.calendar_hash!==stage.calendarSha256||a.config_hash!==stage.configSha256||a.code_sha!==stage.codeSha40||
    Object.values(x).some(v=>v!==0))throw Error("HOLD_GATE5_READBACK");
 console.log(JSON.stringify({status:"GATE5_DISABLED_MONDAY_STAGE_EXACT_READBACK_PASS",stageSha256:crypto.createHash("sha256").update(stageRaw).digest("hex"),calendarSha256:stage.calendarSha256,manifestSha256:stage.manifestSha256,authorizationEnabled:false,...x,providerCalls:0,phase6PaidGo:false}));
 await c.query("ROLLBACK");
}finally{await c.end().catch(()=>{})}
NODE

# ---------------- Gate 3: V0107 exact stopped commission/readback ----------------
export P5_V0107_OWNER_APPROVED_MAIN_SHA="$PIN"
set +e
node scripts/v39_phase5_v0107_owner_upgrade_v39.mjs review >"/tmp/p6-v0107-review.$$" 2>"/tmp/p6-v0107-review-err.$$"
RC=$?
set -e
if [[ "$RC" -eq 0 ]]; then
  REVIEW="$(cat "/tmp/p6-v0107-review.$$")"
  REVIEW_SHA="$(node - "$REVIEW" <<'NODE'
const x=JSON.parse(process.argv[2]);
if(x.status!=="V0107_OWNER_REVIEW_ONLY_NO_GO"||!/^[a-f0-9]{64}$/.test(x.reviewSha256||"")||x.providerCalls!==0||x.databaseWrites!==0)process.exit(2);
process.stdout.write(x.reviewSha256);
NODE
)" || hold V0107_REVIEW
  export P5_V0107_OWNER_APPROVAL="COMMISSION_EXACT_REVIEWED_V0107_STOPPED_NO_GO"
  export P5_V0107_OWNER_REVIEW_SHA256="$REVIEW_SHA"
  node scripts/v39_phase5_v0107_owner_upgrade_v39.mjs commission
  unset P5_V0107_OWNER_APPROVAL P5_V0107_OWNER_REVIEW_SHA256
else
  ERR="$(cat "/tmp/p6-v0107-review-err.$$")"
  [[ "$ERR" == "HOLD_V0107_OWNER_ALREADY_UPGRADED_DO_NOT_REPLAY" ]] || { printf '%s
' "$ERR" >&2; hold V0107_REVIEW; }
  node --input-type=module <<'NODE'
import pg from "pg";import fs from "node:fs";
import {expectedV0107Bodies} from "./scripts/v39_phase5_v0107_owner_upgrade_v39.mjs";
const sql=fs.readFileSync("migrations/staged/V0107__phase5_verified_future_post_primary_expiry_margin_v39.sql","utf8"),e=expectedV0107Bodies(sql);
const c=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:20000});
try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const f=(await c.query(`SELECT proname,prosrc FROM pg_proc WHERE oid=ANY(ARRAY[
 'clean.phase5_primary_fids_expiry_status_v39()'::regprocedure,
 'clean.phase5_primary_fids_expiry_sweep_v39(integer)'::regprocedure])`)).rows;
 const m=Object.fromEntries(f.map(x=>[x.proname.endsWith("status_v39")?"status":"sweep",x.prosrc]));
 if(m.status!==e.status||m.sweep!==e.sweep)throw Error("HOLD_V0107_BODY_DRIFT");
 console.log(JSON.stringify({status:"GATE3_V0107_ALREADY_COMMISSIONED_EXACT_READBACK_PASS",providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
 await c.query("ROLLBACK");
}finally{await c.end().catch(()=>{})}
NODE
fi
rm -f "/tmp/p6-v0107-review.$$" "/tmp/p6-v0107-review-err.$$"
unset P5_V0107_OWNER_APPROVED_MAIN_SHA

# ---------------- Gate 3/7: exact current-main primary retention VERIFY ----------------
var(){ gh variable get "$1" -R "$2"; }
[[ "$(var P5_PRIMARY_FIDS_EXPIRY_ENABLED "$REPO")" == "true" ]] || hold PRIMARY_EXPIRY_DISABLED
[[ "$(var P5_PRIMARY_FIDS_BACKSTOP_ENABLED "$REPO")" == "true" ]] || hold PRIMARY_BACKSTOP_DISABLED
gh variable set P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA -R "$REPO" --body "$PIN"
[[ "$(var P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$REPO")" == "$PIN" ]] || hold PRIMARY_PIN_READBACK

API="repos/$REPO/actions/workflows/$PRIMARY_WF/runs?event=workflow_dispatch&branch=main&per_page=100"
gh api "$API" --jq '.workflow_runs[].id' | sort -n >"/tmp/p6-before.$$"
gh workflow run "$PRIMARY_WF" -R "$REPO" --ref main   -f confirm=VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES   -f approved_main_sha="$PIN"
RUN=""
for _ in $(seq 1 45); do
  gh api "$API" --jq ".workflow_runs[] | select(.head_sha==\"$PIN\" and .run_attempt==1) | .id" | sort -n >"/tmp/p6-after.$$"
  comm -13 "/tmp/p6-before.$$" "/tmp/p6-after.$$" >"/tmp/p6-new.$$"
  N="$(wc -l <"/tmp/p6-new.$$" | tr -d ' ')"
  [[ "$N" -le 1 ]] || hold PRIMARY_VERIFY_AMBIGUOUS
  if [[ "$N" -eq 1 ]]; then RUN="$(cat "/tmp/p6-new.$$")"; break; fi
  sleep 2
done
[[ "$RUN" =~ ^[1-9][0-9]*$ ]] || hold PRIMARY_VERIFY_NOT_FOUND
gh run watch "$RUN" -R "$REPO" --interval 5 --exit-status
JOBS="$(gh api "repos/$REPO/actions/runs/$RUN/jobs?filter=latest&per_page=100")"
JOB="$(node - "$PIN" "$RUN" "$JOBS" <<'NODE'
const [pin,id,raw]=process.argv.slice(2),x=JSON.parse(raw),a=x.jobs.filter(j=>j.name==="primary-fids-expiry");
if(a.length!==1||a[0].head_sha!==pin||a[0].status!=="completed"||a[0].conclusion!=="success")process.exit(2);
process.stdout.write(String(a[0].id));
NODE
)" || hold PRIMARY_VERIFY_JOB
gh run view "$RUN" -R "$REPO" --job "$JOB" --log >"/tmp/p6-primary.log.$$"
node - "$PIN" "$RUN" "/tmp/p6-primary.log.$$" <<'NODE'
const fs=require("fs"),[pin,id,f]=process.argv.slice(2),rows=[];
for(const l of fs.readFileSync(f,"utf8").split(/\\r?\\n/)){const i=l.indexOf("{");if(i<0)continue;try{const x=JSON.parse(l.slice(i).trim());if(x?.status==="PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES")rows.push(x)}catch{}}
if(rows.length!==1)process.exit(2);
const x=rows[0],b=x.before,keys=["liveOriginals","eligibleOriginals","hardDueOriginals","eligibleNextHour","hardDueNextHour","unboundLiveOriginals","markedExpiredPayloadPresent","unlinkedUnexpiredPopulation","unexpiredPopulationWithoutLiveOriginal"];
if(x.reviewedMainSha!==pin||x.providerCalls!==0||x.databaseWrites!==0||x.objectDeletions!==0||x.phase6PaidGo!==false||
 !b||keys.some(k=>b[k]!==0)||b.deletionStopUnresolved!==false)process.exit(2);
console.log(JSON.stringify({status:"GATE3_CURRENT_MAIN_PRIMARY_RETENTION_VERIFY_PASS",runId:Number(id),reviewedMainSha:pin,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
NODE

# ---------------- Gate 7: current target + relay pins, bounded no-provider observation ----------------
[[ "$(var TRAVNR_RELAY_MODE "$RELAY_REPO")" == "MULTI_LANE" ]] || hold RELAY_MODE
[[ "$(var TRAVNR_RELAY_PRIMARY_ENABLED "$RELAY_REPO")" == "1" ]] || hold RELAY_PRIMARY_DISABLED
[[ "$(var TRAVNR_RELAY_ROLLING_ENABLED "$RELAY_REPO")" == "1" ]] || hold RELAY_ROLLING_DISABLED
gh variable set TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID -R "$RELAY_REPO" --body "$RUN"
gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RELAY_REPO" --body "$PIN"
gh variable set TRAVNR_CRON_RELAY_SHA -R "$RELAY_REPO" --body "$RELAY_PIN"
[[ "$(var TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID "$RELAY_REPO")" == "$RUN" ]] || hold RELAY_VERIFY_RUN_READBACK
[[ "$(var TRAVNR_APPROVED_TARGET_MAIN_SHA "$RELAY_REPO")" == "$PIN" ]] || hold RELAY_TARGET_READBACK
[[ "$(var TRAVNR_CRON_RELAY_SHA "$RELAY_REPO")" == "$RELAY_PIN" ]] || hold RELAY_SHA_READBACK

RAPI="repos/$RELAY_REPO/actions/workflows/$RELAY_WF/runs?event=workflow_dispatch&branch=main&per_page=100"
gh api "$RAPI" --jq '.workflow_runs[].id' | sort -n >"/tmp/p6-relay-before.$$"
gh workflow run "$RELAY_WF" -R "$RELAY_REPO" --ref main -f lane=PRIMARY_BACKSTOP
RRUN=""
for _ in $(seq 1 45); do
  gh api "$RAPI" --jq ".workflow_runs[] | select(.head_sha==\"$RELAY_PIN\" and .run_attempt==1 and .display_title==\"TRAVNR EXTERNAL CLOCK PRIMARY_BACKSTOP\") | .id" | sort -n >"/tmp/p6-relay-after.$$"
  comm -13 "/tmp/p6-relay-before.$$" "/tmp/p6-relay-after.$$" >"/tmp/p6-relay-new.$$"
  N="$(wc -l <"/tmp/p6-relay-new.$$" | tr -d ' ')"
  [[ "$N" -le 1 ]] || hold RELAY_RUN_AMBIGUOUS
  if [[ "$N" -eq 1 ]]; then RRUN="$(cat "/tmp/p6-relay-new.$$")"; break; fi
  sleep 2
done
[[ "$RRUN" =~ ^[1-9][0-9]*$ ]] || hold RELAY_RUN_NOT_FOUND
gh run watch "$RRUN" -R "$RELAY_REPO" --interval 5 --exit-status
RJOBS="$(gh api "repos/$RELAY_REPO/actions/runs/$RRUN/jobs?filter=latest&per_page=100")"
RJOB="$(node - "$RJOBS" <<'NODE'
const x=JSON.parse(process.argv[2]),a=x.jobs.filter(j=>j.name==="target-forward"&&j.status==="completed");
if(a.length!==1||!["success","skipped"].includes(a[0].conclusion))process.exit(2);
process.stdout.write(String(a[0].id));
NODE
)" || hold RELAY_JOB
if node - "$RJOBS" <<'NODE'
const x=JSON.parse(process.argv[2]),a=x.jobs.find(j=>j.name==="target-forward");
process.exit(a?.conclusion==="success"?0:1);
NODE
then
  gh run view "$RRUN" -R "$RELAY_REPO" --job "$RJOB" --log >"/tmp/p6-relay.log.$$"
  node - "$PIN" "$RRUN" "/tmp/p6-relay.log.$$" <<'NODE'
const fs=require("fs"),[pin,id,f]=process.argv.slice(2),rows=[];
for(const l of fs.readFileSync(f,"utf8").split(/\\r?\\n/)){const i=l.indexOf("{");if(i<0)continue;try{const x=JSON.parse(l.slice(i).trim());if(x&&Object.hasOwn(x,"providerCallsByRelay"))rows.push(x)}catch{}}
if(rows.length!==1)process.exit(2);const x=rows[0];
if(x.relayRunId!==Number(id)||x.mode!=="PRIMARY_BACKSTOP"||x.providerCallsByRelay!==0||x.databaseReadsByRelay!==0||x.databaseWritesByRelay!==0||x.paidAuthorityGranted!==false)process.exit(2);
const allowed=["TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF","DEFER_RECENT_PRIMARY_STEP_NOT_DELETION_PROOF","DEFER_TARGET_ALREADY_ACTIVE","EXTERNAL_WAKE_PREFLIGHT_DEFERRED_NO_POST"];
if(!allowed.includes(x.status))process.exit(2);
console.log(JSON.stringify({status:"GATE7_CURRENT_MAIN_RELAY_PIN_AND_NO_PROVIDER_OBSERVATION_PASS",relayDisposition:x.status,relayRunId:Number(id),targetRunId:x.targetRunId??null,targetMain:pin,providerCallsByRelay:0,databaseWritesByRelay:0,phase6PaidGo:false}));
NODE
else
  echo '{"status":"GATE7_RELAY_FORWARD_SKIPPED_REVIEW_REQUIRED","providerCallsByRelay":0,"databaseWritesByRelay":0,"phase6PaidGo":false}'
fi

rm -f "/tmp/p6-before.$$" "/tmp/p6-after.$$" "/tmp/p6-new.$$" "/tmp/p6-primary.log.$$"       "/tmp/p6-relay-before.$$" "/tmp/p6-relay-after.$$" "/tmp/p6-relay-new.$$" "/tmp/p6-relay.log.$$"

echo "P6_OWNER_BULK_COMPLETE"
echo "MAIN=$PIN"
echo "MONDAY_PACKAGE=$OUT"
echo "PRIMARY_VERIFY_RUN=$RUN"
echo "RELAY_OBSERVATION_RUN=$RRUN"
echo "NO_SOURCE_ENABLE_NO_PROVIDER_CALL_NO_PAID_GO"
