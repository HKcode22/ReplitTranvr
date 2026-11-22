#!/usr/bin/env bash
# Exact current main. NO SOURCE enable, payment, collection, provider GET or DB mutation.
# Stage only existing reviewed nonpaid actor gates and run the real existing actor-only path.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
PIN=e058b9d0817151d4b10282c9242c6c8ebeef7814
ENV_NAME=phase6-protected-runtime
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" = "$PIN"
export REPO PIN
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS NODE_TLS_REJECT_UNAUTHORIZED
node --input-type=module <<'JS'
import fs from 'node:fs';import pg from 'pg';import {createHash,randomBytes} from 'node:crypto';import {execFileSync} from 'node:child_process';
const repo=process.env.REPO,main=process.env.PIN,home=fs.realpathSync(process.env.HOME);
const need=(x,s)=>{if(!x)throw Error('HOLD_P6_REAL_ACTOR_PREFLIGHT_'+s)};
const gh=(a,input)=>execFileSync('gh',a,{input,encoding:'utf8',stdio:[input===undefined?'ignore':'pipe','pipe','pipe'],timeout:45000,maxBuffer:2*1024*1024}).trim();
const inventory=()=>{const a=JSON.parse(gh(['api','repos/'+repo+'/actions/secrets?per_page=100']));need(a.total_count===a.secrets.length,'SECRET_INVENTORY');return new Map(a.secrets.map(x=>[x.name,x.updated_at]))};
const live=()=>gh(['api','repos/'+repo+'/git/ref/heads/main','--jq','.object.sha']);
const modes=['P6_NONPAID_SOURCE_SCHEDULE_ENABLED','P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED','P6_PRIVATE_POST_PARENT_ENABLED','P6_NATIVE_LATER_RUNTIME_ENABLED','P6_NATIVE_POST_PRODUCER_ENABLED','P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED','P6_PRIVATE_T24_EXECUTION_ENABLED','P6_PRIVATE_LATER_ENROLL_ENABLED','P6_PRIVATE_T24_ENROLL_ENABLED','P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED','P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED','P5_CD_GH_PRE_SCHEDULE_ENABLED','P5_CD_GH_T24_SCHEDULE_ENABLED','P6_ROLLING_CONTROLLER_ENABLED','P5_AUTO_SOURCE_DISPATCH_ENABLED','P5_POST_AUTO_DISPATCH_ENABLED','P5_T24_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED','P6_T24_CUSTODY_ENABLED','P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED','P6_ROLLING_DIRECT_RECOVERY_ENABLED','P6_PHASE7_POST_RECOVERY_ENABLED','P5_CD_GH_WATCHDOG_ENABLED','P6_ROLLING_SCHEDULED_ROOT_ENABLED','P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED','P6_ROLLING_WINDOW_CUSTODY_ENABLED'];
function stop(){need(live()===main,'MAIN_DRIFT');const a=JSON.parse(gh(['variable','list','-R',repo,'--json','name,value']));need(!a.some(x=>modes.includes(x.name)&&!['','0','false','OFF'].includes(x.value)),'COLLECTION_MODE_ACTIVE')}
stop();
const u=new URL(process.env.DATABASE_URL??'');need(u.username==='neondb_owner'&&u.pathname==='/neondb'&&u.hostname.endsWith('.neon.tech')&&['require','verify-full'].includes(u.searchParams.get('sslmode')),'OWNER_DB_SCOPE');u.searchParams.set('sslmode','verify-full');
const c=new pg.Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000});
try{await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const q=(await c.query("SELECT current_user actor,session_user login,current_setting('transaction_read_only') ro,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled) enabled,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE NOT enabled AND revoked_at_utc IS NULL AND manifest_sha256='a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e') stage,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subs,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents")).rows[0];need(q.actor==='neondb_owner'&&q.login===q.actor&&q.ro==='on'&&q.stage===1&&['enabled','batches','subs','incidents'].every(k=>q[k]===0),'DISABLED_EXACT_STAGE');await c.query('ROLLBACK');}finally{await c.end().catch(()=>{})}
// Exact protected readback 44985990359 already verified all keys and policies.
// These gates only admit disarmed actor-readiness; paid arm/owner remain zero.
// Global freeze/rights were already owner-adopted and scoped ledger verified.
const vals={V39_PHASE6_PROCESS_ARMED:'0',V39_PHASE6_OWNER_APPROVED:'0',V39_PHASE5_FREEZE_SIGNED:'1',V39_PHASE5_SOURCE_RIGHTS_APPROVED:'1',P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:'1',P6_PHASE7_PRE_SAME_RUNNER_HANDOFF_APPROVED:'1',P6_PHASE7_PRE_PROOF_ISSUER_APPROVED:'1',P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED:'1',P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED:'1',P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED:'1',V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED:'1',P6_NATIVE_LATER_RUNTIME_APPROVED:'1'};
const dir=home+'/.travnr-phase7-reviewer-keys-reissued-e058b9d0';
const ds=fs.lstatSync(dir);need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&!(ds.mode&0o077),'PRIVATE_CUSTODY_DIR');
let m=inventory(),missing=Object.keys(vals).filter(n=>!m.has(n));need(m.size+missing.length<=100,'CAPACITY_NO_WRITES');
const journalPath=dir+'/disarmed-actor-preflight-flags-journal.json';
let j=fs.existsSync(journalPath)?JSON.parse(fs.readFileSync(journalPath,'utf8')):{schema:'v39.phase6.disarmed-actor-preflight-flags.v1',main,metadata:{}};
need(j.main===main,'JOURNAL_SCOPE');
for(const [n,v] of Object.entries(vals)){
 stop();m=inventory();if(j.metadata[n]){need(j.metadata[n].value===v&&j.metadata[n].updatedAt===m.get(n),'FLAG_METADATA_DRIFT');continue}
 gh(['secret','set',n,'-R',repo],v);m=inventory();need(m.has(n),'SECRET_WRITE_ACK');
 j.metadata[n]={value:v,updatedAt:m.get(n)};const t=journalPath+'.'+randomBytes(6).toString('hex');fs.writeFileSync(t,JSON.stringify(j),{mode:0o600,flag:'wx'});fs.renameSync(t,journalPath);
}
stop();
console.log(JSON.stringify({status:'P6_DISARMED_ACTOR_PREFLIGHT_GATES_STAGED',repoSecrets:inventory().size,armed:false,ownerPaidApproved:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
JS
# Provision an EMPTY environment restricted to main only, never override existing unexpected configuration.
EAPI="repos/$REPO/environments/$ENV_NAME"
if ! gh api "$EAPI" > "$TMP/env.json" 2>"$TMP/env.err"; then
 grep -Eq 'HTTP 404|Not Found' "$TMP/env.err" || { echo HOLD_ENVIRONMENT_API_UNKNOWN; exit 2; }
 printf '%s' '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' |
   gh api -X PUT "$EAPI" --input - > "$TMP/env.json"
fi
node - "$TMP/env.json" <<'JS'
const e=require(process.argv[2]);if(e.name!=='phase6-protected-runtime'||e.deployment_branch_policy?.protected_branches!==false||e.deployment_branch_policy?.custom_branch_policies!==true||(e.protection_rules??[]).some(x=>x.type!=='branch_policy'))throw Error('HOLD_ENVIRONMENT_UNEXPECTED_POLICY');
JS
gh api "$EAPI/deployment-branch-policies?per_page=100" > "$TMP/branches.json"
N="$(node -p 'require(process.argv[1]).total_count' "$TMP/branches.json")"
if [ "$N" = 0 ]; then
 gh api -X POST "$EAPI/deployment-branch-policies" -f name=main -f type=branch >/dev/null
fi
gh api "$EAPI/deployment-branch-policies?per_page=100" > "$TMP/branches.json"
gh api "$EAPI/secrets?per_page=100" > "$TMP/env-secrets.json"
node - "$TMP/branches.json" "$TMP/env-secrets.json" <<'JS'
const a=require(process.argv[2]),s=require(process.argv[3]);if(a.total_count!==1||a.branch_policies.length!==1||a.branch_policies[0].name!=='main'||a.branch_policies[0].type!=='branch'||s.total_count!==0)throw Error('HOLD_ENVIRONMENT_MAIN_ONLY_EMPTY_READBACK');console.log(JSON.stringify({status:'P6_EMPTY_RUNTIME_ENVIRONMENT_MAIN_ONLY_PASS',environment:'phase6-protected-runtime',secretCount:0,phase6PaidGo:false}))
JS
# Disarmed diagnostic-only scope, NOT a real flight/query or signed registry.
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" = "$PIN"
DIGEST="$(printf 'P7_ACTOR_PREFLIGHT_ONLY_NO_OBSERVATION:%s' "$PIN" | sha256sum | awk '{print $1}')"
API="repos/$REPO/actions/workflows/phase5-one-signed-day-source-child-dispatch.yml/runs?event=workflow_dispatch&branch=main&per_page=100"
get_run(){ gh api "$API" --jq ".workflow_runs[] | select(.head_sha==\"$PIN\" and .run_attempt==1 and .display_title==\"P5 SOURCE $DIGEST\") | .id"; }
get_run > "$TMP/runs"
mapfile -t IDS < "$TMP/runs"
test "${#IDS[@]}" -le 1
if [ "${#IDS[@]}" = 0 ]; then
 gh workflow run phase5-one-signed-day-source-child-dispatch.yml -R "$REPO" --ref main \
   -f confirm=ONLY_PRE_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER \
   -f private_transport=stored -f run_day_index=1 \
   -f query_digest="$DIGEST" -f signed_registry_file=ACTOR_PREFLIGHT_ONLY \
   -f frozen_release_file=ACTOR_PREFLIGHT_ONLY
 for _ in $(seq 1 40); do get_run > "$TMP/runs"; mapfile -t IDS < "$TMP/runs"; test "${#IDS[@]}" -le 1; if [ "${#IDS[@]}" = 1 ]; then break; fi; sleep 2; done
fi
test "${#IDS[@]}" = 1 || { echo HOLD_ACTOR_PREFLIGHT_ACK_UNKNOWN_NO_REPLAY; exit 2; }
RID="${IDS[0]}"
echo "P7_ACTUAL_DISARMED_ACTOR_PREFLIGHT_RUN=$RID"
gh run watch "$RID" -R "$REPO" --exit-status
echo "P7_ACTUAL_DISARMED_ACTOR_PREFLIGHT_WORKFLOW_SUCCESS=$RID"
echo SOURCE_REMAINS_DISABLED
echo PAID_GO=false
