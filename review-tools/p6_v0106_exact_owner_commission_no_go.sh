#!/usr/bin/env bash
# Detached owner helper. Only original V0106, once from stopped empty V0101.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
PIN=e058b9d0817151d4b10282c9242c6c8ebeef7814
MIG=8d00fb5fceb849c83c1fcdd26e1ae19c2580dd4d
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export REPO PIN TMP
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS NODE_TLS_REJECT_UNAUTHORIZED
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" = "$PIN"
gh api "repos/$REPO/git/blobs/$MIG" --jq '.content' | base64 --decode > "$TMP/v0106.sql"
test "$(git hash-object "$TMP/v0106.sql")" = "$MIG"
node --input-type=module <<'JS'
import fs from 'node:fs';
import pg from 'pg';
import {execFileSync} from 'node:child_process';
const e=process.env,repo=e.REPO,pin=e.PIN;
const need=(x,s)=>{if(!x)throw Error('HOLD_V0106_'+s)};
const gh=a=>execFileSync('gh',a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:45000,maxBuffer:4*1024*1024}).trim();
const modes=['P6_NONPAID_SOURCE_SCHEDULE_ENABLED','P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED','P6_PRIVATE_POST_PARENT_ENABLED','P6_NATIVE_LATER_RUNTIME_ENABLED','P6_NATIVE_POST_PRODUCER_ENABLED','P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED','P6_PRIVATE_T24_EXECUTION_ENABLED','P6_PRIVATE_LATER_ENROLL_ENABLED','P6_PRIVATE_T24_ENROLL_ENABLED','P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED','P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED','P5_CD_GH_PRE_SCHEDULE_ENABLED','P5_CD_GH_T24_SCHEDULE_ENABLED','P6_ROLLING_CONTROLLER_ENABLED','P5_AUTO_SOURCE_DISPATCH_ENABLED','P5_POST_AUTO_DISPATCH_ENABLED','P5_T24_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED','P6_T24_CUSTODY_ENABLED','P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED','P6_ROLLING_DIRECT_RECOVERY_ENABLED','P6_PHASE7_POST_RECOVERY_ENABLED','P5_CD_GH_WATCHDOG_ENABLED','P6_ROLLING_SCHEDULED_ROOT_ENABLED','P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED','P6_ROLLING_WINDOW_CUSTODY_ENABLED'];
function stopped(){need(gh(['api','repos/'+repo+'/git/ref/heads/main','--jq','.object.sha'])===pin,'MAIN_DRIFT');const v=JSON.parse(gh(['variable','list','-R',repo,'--json','name,value']));need(!v.some(x=>modes.includes(x.name)&&!['','0','false','OFF'].includes(x.value)),'ACTIVE_COLLECTION_MODE')}
const names=['p6_v0101_kind_allowed','p6_v0101_kind_path_guard','p6_v0101_bytes_guard','p6_v0101_packet_wire_scope'];
const kinds=['PHASE7_SIGNED_REVIEW','PHASE7_RECOVERY_RECEIPT','PHASE7_RECOVERY_FENCE'];
let c,stage='START',attempted=false;
async function inspect(){
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
 const q=(await c.query("SELECT current_user actor,session_user login,current_database() db,current_setting('transaction_read_only') ro,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled) enabled,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE NOT enabled AND revoked_at_utc IS NULL AND manifest_sha256='a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e') stage,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subs,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39) packets")).rows[0];
 need(q.actor==='neondb_owner'&&q.login===q.actor&&q.db==='neondb'&&q.ro==='on'&&q.ver>=160000&&q.ver<170000&&q.replica===false&&q.stage===1&&['enabled','batches','subs','incidents','packets'].every(k=>q[k]===0),'NOT_EMPTY_STOPPED_EXACT_STAGE');
 const z=(await c.query("SELECT conname,convalidated,pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass AND conname=ANY($1::text[])",[names])).rows;
 need(z.length===4&&z.every(x=>x.convalidated)&&names.every(n=>z.some(x=>x.conname===n)),'MISSING_OR_UNVALIDATED_GUARD');
 const by=Object.fromEntries(z.map(x=>[x.conname,x.def]));
 const installed=[names[0],names[1],names[3]].every(n=>kinds.every(k=>by[n].includes(k)))&&by[names[3]].includes('committed-post-recovery-receipt.v2')&&by[names[3]].includes('operational-recovery-issued-fence.v1');
 const old=z.every(x=>kinds.every(k=>!x.def.includes(k)));
 need(installed||old,'PARTIAL_OR_UNKNOWN_SCHEMA_NEVER_REPLAY');
 const acl=(await c.query("SELECT has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.frozen_native_packet_v39','SELECT') r,has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.frozen_native_packet_v39','INSERT,UPDATE,DELETE,TRUNCATE') rw,has_table_privilege('phase6_private_frozen_publisher_v39','phase6_private.frozen_native_packet_v39','SELECT') p,has_table_privilege('phase6_private_frozen_publisher_v39','phase6_private.frozen_native_packet_v39','INSERT') pi,has_table_privilege('phase6_private_frozen_publisher_v39','phase6_private.frozen_native_packet_v39','UPDATE,DELETE,TRUNCATE') pw")).rows[0];
 need(acl.r===true&&acl.rw===false&&acl.p===true&&acl.pi===true&&acl.pw===false,'ACL_DRIFT');
 await c.query('ROLLBACK');
 console.log(JSON.stringify({status:installed?'P7_V0106_GUARDS_PRESENT':'P7_V0101_EMPTY_STOPPED_PREDECESSOR',guards:4,packets:0,providerCalls:0,phase6PaidGo:false}));return installed;
 }catch(err){await c.query('ROLLBACK').catch(()=>{});throw err}
}
try{
 stage='STOP_AND_OWNER';stopped();
 const u=new URL(e.DATABASE_URL??'');need(u.username==='neondb_owner'&&u.pathname==='/neondb'&&u.hostname.endsWith('.neon.tech')&&u.password&&['require','verify-full'].includes(u.searchParams.get('sslmode')),'OWNER_TLS');u.searchParams.set('sslmode','verify-full');
 const open=async()=>{const x=new pg.Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:60000});await x.connect();return x};
 c=await open();stage='PRECHECK';const exists=await inspect();let applied=false;
 if(!exists){stage='ORIGINAL_MIGRATION';stopped();attempted=true;await c.query(fs.readFileSync(e.TMP+'/v0106.sql','utf8'));applied=true;}
 await c.end();c=await open();stage='INDEPENDENT_READBACK';need(await inspect(),'POSTCOMMIT_GUARDS_NOT_PRESENT');stopped();
 console.log(JSON.stringify({status:'P7_V0106_OWNER_COMMISSION_AND_FRESH_READBACK_PASS_NO_GO',applied,providerCalls:0,sourceEnabled:false,phase6PaidGo:false}));
}catch(err){console.error('HOLD_V0106_'+stage+(attempted?'_INSPECT_COMMIT_STATE_BEFORE_ANY_REPLAY':''));process.exitCode=2;}
finally{if(c)await c.end().catch(()=>{});}
JS
# Fresh actor preflight only. Distinct digest from failed predecessor, no replay.
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" = "$PIN"
DIGEST="$(printf 'P7_ACTOR_PREFLIGHT_ONLY_AFTER_V0106:%s' "$PIN" | sha256sum | awk '{print $1}')"
API="repos/$REPO/actions/workflows/phase5-one-signed-day-source-child-dispatch.yml/runs?event=workflow_dispatch&branch=main&per_page=100"
get_run(){ gh api "$API" --jq ".workflow_runs[] | select(.head_sha==\"$PIN\" and .run_attempt==1 and .display_title==\"P5 SOURCE $DIGEST\") | .id"; }
get_run > "$TMP/runs"
mapfile -t IDS < "$TMP/runs"
test "$(printf '%s\n' "${#IDS[@]}")" -le 1
if [ "${#IDS[@]}" = 0 ]; then
 gh workflow run phase5-one-signed-day-source-child-dispatch.yml -R "$REPO" --ref main \
 -f confirm=ONLY_PRE_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER -f private_transport=stored -f run_day_index=1 \
 -f query_digest="$DIGEST" -f signed_registry_file=ACTOR_PREFLIGHT_ONLY -f frozen_release_file=ACTOR_PREFLIGHT_ONLY
 for _ in $(seq 1 40); do get_run > "$TMP/runs"; mapfile -t IDS < "$TMP/runs"; test "${#IDS[@]}" -le 1; if [ "${#IDS[@]}" = 1 ]; then break; fi; sleep 2; done
fi
test "${#IDS[@]}" = 1 || { echo HOLD_ACTOR_PREFLIGHT_ACK_UNKNOWN_NO_REPLAY; exit 2; }
echo "P7_ACTUAL_DISARMED_ACTOR_PREFLIGHT_AFTER_V0106_RUN=${IDS[0]}"
gh run watch "${IDS[0]}" -R "$REPO" --exit-status
echo SOURCE_REMAINS_DISABLED
echo PAID_GO=false
