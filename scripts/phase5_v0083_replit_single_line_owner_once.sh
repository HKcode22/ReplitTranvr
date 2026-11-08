#!/usr/bin/env bash
# One-shot inert V0083 owner installer. No paid/provider calls or Phase6 start.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo 'HOLD_V0083_WORKSPACE_MISSING'; exit 2; }
R='HKcode22/ReplitTranvr'
REVIEWED='49989d0e87c85fe9c92bae0dcda09be2cebf728e'
I='scripts/v39_phase5_v0083_inert_other_rest_schema_nologin_owner_once.mjs'
IB='35b6cbeee37b31e86a56ad42c3752be411f97646'
M='migrations/staged/V0083__phase5_nonfids_five_category_physical_rest_reservation_v39.sql'
MB='a5e1e9df39ec9b436f0576245f375985a69a3b71'
hold(){ echo "HOLD_V0083_DO_NOT_RETRY: $1" >&2; exit 2; }
for t in gh git node base64 mktemp grep; do command -v "$t" >/dev/null || hold "MISSING_$t"; done
[[ -n "${DATABASE_URL:-}" && -n "${V39_DATABASE_RUNTIME_URL:-}" && "$DATABASE_URL" != "$V39_DATABASE_RUNTIME_URL" ]] || hold OWNER_DB_NOT_SEPARATE
[[ -d scripts && -d node_modules/pg ]] || hold PG_OR_SCRIPTS_MISSING
gh auth status --hostname github.com >/dev/null 2>&1 || hold GITHUB_AUTH_MISSING
LIVE="$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_UNAVAILABLE
STATUS="$(gh api "repos/$R/compare/$REVIEWED...$LIVE" --jq '.status')" || hold MAIN_ANCESTRY_UNAVAILABLE
[[ "$STATUS" == ahead || "$STATUS" == identical ]] || hold MAIN_ANCESTRY_UNEXPECTED
CHECKS="$(gh api "repos/$R/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[] | select(.status=="completed" and .conclusion=="success") | .name] | join("\n")')" || hold MAIN_CHECKS_UNAVAILABLE
printf '%s\n' "$CHECKS" | grep -Fxq offline-safety || hold OFFLINE_SAFETY_NOT_GREEN
# The atomic PG16 workflow is path-filtered: it ran on REVIEWED, not on this launcher commit.
# Exact installer + SQL blob verification below guarantees the earlier PG16 proof still applies.
REVIEWED_CHECKS="$(gh api "repos/$R/commits/$REVIEWED/check-runs?per_page=100" --jq '[.check_runs[] | select(.status=="completed" and .conclusion=="success") | .name] | join("\\n")')" || hold REVIEWED_POSTGRES_CHECKS_UNAVAILABLE
printf '%s\n' "$REVIEWED_CHECKS" | grep -Fxq atomic-other-rest-ddl-and-role-acl || hold REVIEWED_PG16_PROOF_NOT_GREEN
verify(){
  local got
  got="$(gh api "repos/$R/contents/$1?ref=$LIVE" --jq '.sha')" || hold FILE_MISSING
  [[ "$got" == "$2" ]] || hold REVIEWED_FILE_CHANGED
}
verify "$I" "$IB"
verify "$M" "$MB"
OWNER="$(node <<'NODE'
const {Pool}=require('pg');
(async()=>{
 const p=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:12000});
 let c;
 try{
  c=await p.connect();await c.query('BEGIN READ ONLY');
  const q="SELECT current_user actor,current_database() db,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,to_regclass('clean.phase5_fids_seven_rest_release_v39') IS NOT NULL old_schema,to_regclass('clean.phase5_other_rest_reviewed_call_v39') IS NOT NULL new_schema";
  const v=(await c.query(q)).rows[0];
  if(!v||v.db!=='neondb'||v.ver<160000||v.replica||!v.old_schema||v.new_schema||!/^[a-z_][a-z0-9_]{2,63}$/.test(v.actor))throw Error('PREFLIGHT_HOLD');
  await c.query('ROLLBACK');process.stdout.write(v.actor+'\n');
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});console.error('V0083_READONLY_PRIMARY_PREFLIGHT_HOLD');process.exitCode=2;}
 finally{if(c)c.release();await p.end().catch(()=>{});}
})().catch(()=>process.exit(2));
NODE
)" || hold PRIMARY_PREFLIGHT_FAILED
TMP="$(mktemp -d "${TMPDIR:-/tmp}/phase5_v0083_verified_XXXXXXXX")" || hold TEMP_ROOT_FAILED
INST="$(mktemp "$PWD/scripts/.p5_v0083_verified_XXXXXXXX.mjs")" || hold TEMP_SCRIPT_FAILED
trap 'rm -f "$INST"; rm -rf "$TMP"' EXIT
mkdir -p "$TMP/migrations/staged"
grab(){
 gh api "repos/$R/git/blobs/$1" --jq '.content' | base64 --decode > "$2" || hold EXACT_BLOB_FETCH_FAILED
 [[ "$(git hash-object "$2")" == "$1" ]] || hold EXACT_GIT_BLOB_HASH_MISMATCH
}
grab "$IB" "$INST"
grab "$MB" "$TMP/$M"
[[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$LIVE" ]] || hold MAIN_CHANGED_DURING_PREFLIGHT
echo 'V0083_PINNED_MAIN_AND_READONLY_PREFLIGHT_PASS; INERT_SCHEMA_INSTALL'
(
 cd "$TMP"
 env GITHUB_ACTIONS=false ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
 P5_V0083_REVIEWED_MAIN_SHA="$LIVE" \
 P5_V0083_EXPECTED_OWNER_ROLE="$OWNER" \
 P5_V0083_EMPTY_INSTALL_ONCE=INSTALL_EMPTY_V0083_OTHER_REST_NOLOGIN_ROLES_NO_PROVIDER \
 node "$INST"
) || hold INSTALL_REFUSED_OR_AMBIGUOUS_COMMIT
node <<'NODE'
const {Pool}=require('pg');
(async()=>{
 const p=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:12000});let c;
 try{
  c=await p.connect();await c.query('BEGIN READ ONLY');
  const q=[
   "SELECT to_regclass('clean.phase5_other_rest_reviewed_call_v39') IS NOT NULL reviewed,",
   "to_regclass('clean.phase5_other_rest_physical_reservation_v39') IS NOT NULL reserved,",
   "(SELECT COUNT(*)::int FROM pg_catalog.pg_roles WHERE rolname IN ('phase5_other_rest_review_prod_20261108','phase5_other_rest_reserve_prod_20261108') AND rolcanlogin=false) scoped_roles,",
   "(SELECT COUNT(*)::int FROM clean.phase5_other_rest_reviewed_call_v39) review_rows,",
   "(SELECT COUNT(*)::int FROM clean.phase5_other_rest_physical_reservation_v39) spend_rows,",
   "has_table_privilege('phase5_other_rest_review_prod_20261108','clean.phase5_other_rest_reviewed_call_v39','INSERT') review_insert,",
   "has_function_privilege('phase5_other_rest_reserve_prod_20261108','clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)','EXECUTE') spend_exec,",
   "has_function_privilege('phase5_fids_source_prod_20261107','clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)','EXECUTE') source_exec"
  ].join(" ");
  const v=(await c.query(q)).rows[0];
  if(!v||!v.reviewed||!v.reserved||v.scoped_roles!==2||v.review_rows!==0||v.spend_rows!==0||
   !v.review_insert||!v.spend_exec||v.source_exec)throw Error('VERIFY_HOLD');
  await c.query('ROLLBACK');
  console.log('V0083_INDEPENDENT_SECOND_CONNECTION_READONLY_PASS');
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});console.error('HOLD_V0083_COMMIT_OR_ACL_UNCERTAIN_DO_NOT_RETRY');process.exitCode=2;}
 finally{if(c)c.release();await p.end().catch(()=>{});}
})().catch(()=>process.exit(2));
NODE
echo 'V0083_OWNER_VERIFIED_INSTALLED_NO_PROVIDER_CALL; DO_NOT_RUN_AGAIN'
