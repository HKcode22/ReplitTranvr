# Phase 6 — owner recovery dependency repair and live stage identity (NO GO)

Owner Replit transcript 2026-11-22T03:28Z: historical checkout 795ace55 successful; npm ci failed E403 from Replit Socket Security Policy for vite 7.3.1. Recovery compiler and production SQL never ran. Do not disable or bypass the policy. The historical pure compiler is not a frontend build. Its minimal lockfile roots are tsx 4.21.0, pg 8.18.0, zod 3.25.76. The closure was independently enumerated from the exact historical lockfile: 46 package entries, including OS-specific optional binaries, no vite. The recovery still requires exact stage/cost/manifest/config/31-plan parity. This is a repair of the existing procedure, not a new gate.

The wrapper below reuses the exact prior recovery blob (362625a0477ba24c9b196395c203ba405d3e2878), replacing ONLY its application-wide npm ci line with a minimal, lockfile-pinned isolated runtime. It also reads the actual disabled authorization identity and cost metadata in an independent READ ONLY transaction even if the compiler fails, provided the minimal pg runtime was successfully prepared. No provider access, no SQL writes, no secret change. No guarantee of runtime success is claimed before owner execution. Do not run the superseded full npm ci command again.

```bash
bash <<'P6_RECOVER_MINIMAL_AND_READONLY'
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
ORIGINAL=362625a0477ba24c9b196395c203ba405d3e2878
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export P6_RECOVERY_RUNTIME="$TMP/runtime"
export P6_RECOVERY_WORKSPACE="$(pwd -P)"
mkdir -p "$P6_RECOVERY_RUNTIME"
gh auth status --hostname github.com >/dev/null
gh api "repos/$REPO/git/blobs/$ORIGINAL" --jq '.content' |
  node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>process.stdout.write(Buffer.from(s,"base64")));' > "$TMP/original.md"
test "$(git hash-object "$TMP/original.md")" = "$ORIGINAL"
awk '/^bash <<.*P6_RECOVER_EXACT_STAGE/ {p=1} p {print} /^P6_RECOVER_EXACT_STAGE$/ {exit}' "$TMP/original.md" > "$TMP/original.sh"
test -s "$TMP/original.sh"
cat > "$TMP/minimal-runtime.sh" <<'MINIMAL'
set -Eeuo pipefail
set +x
umask 077
node --input-type=module <<'JS'
import fs from 'node:fs';
import path from 'node:path';
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const expected={tsx:'4.21.0',pg:'8.18.0',zod:'3.25.76'};
if(lock.lockfileVersion!==3)throw Error('HOLD_LOCKFILE_VERSION');
for(const [n,v] of Object.entries(expected))if(lock.packages['node_modules/'+n]?.version!==v)throw Error('HOLD_LOCKFILE_ROOT_DRIFT');
const keep=new Set();
function find(k,n){
 let base=k;
 for(;;){
  const p=(base?base+'/':'')+'node_modules/'+n;
  if(lock.packages[p])return p;
  const i=base.lastIndexOf('/node_modules/');
  if(i<0){if(!base)return null;base='';}else base=base.slice(0,i);
 }
}
function visit(k){
 if(keep.has(k))return;
 keep.add(k);
 const x=lock.packages[k];
 for(const n of Object.keys({...x.dependencies,...x.optionalDependencies,...x.peerDependencies})){
  const p=find(k,n);
  if(!p){if(x.optionalDependencies?.[n]||x.peerDependenciesMeta?.[n]?.optional)continue;throw Error('HOLD_LOCKFILE_REQUIRED_DEPENDENCY');}
  visit(p);
 }
}
for(const n of Object.keys(expected))visit('node_modules/'+n);
if(keep.size!==46||[...keep].some(k=>k.endsWith('/vite')))throw Error('HOLD_MINIMAL_DEPENDENCY_CLOSURE');
const d=process.env.P6_RECOVERY_RUNTIME;
const pkg={name:'travnr-p6-recovery-runtime',version:'1.0.0',private:true,dependencies:expected};
const packages={'':{name:pkg.name,version:pkg.version,dependencies:expected}};
for(const k of [...keep].sort()){
 const x={...lock.packages[k]};delete x.dev;delete x.devOptional;packages[k]=x;
}
fs.writeFileSync(path.join(d,'package.json'),JSON.stringify(pkg,null,2)+'\n');
fs.writeFileSync(path.join(d,'package-lock.json'),JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,requires:true,packages},null,2)+'\n');
console.log(JSON.stringify({status:'MINIMAL_LOCK_PREPARED',packages:keep.size,viteIncluded:false,roots:expected}));
JS
# Prefer the repository's already-installed runtime only if exact root versions
# match. No unrelated frontend package is loaded. Otherwise honor normal Replit
# npm registry/firewall and install only the pinned isolated closure.
EXISTING="$P6_RECOVERY_WORKSPACE/node_modules"
if node - "$EXISTING" <<'JS'
const fs=require('node:fs'),p=require('node:path'),d=process.argv[2];
try{
 for(const [n,v] of Object.entries({tsx:'4.21.0',pg:'8.18.0',zod:'3.25.76'})){
  if(JSON.parse(fs.readFileSync(p.join(d,n,'package.json'))).version!==v)process.exit(1);
 }
 fs.accessSync(p.join(d,'.bin','tsx'),fs.constants.X_OK);
 require(p.join(d,'pg'));require(p.join(d,'zod'));
}catch{process.exit(1)}
JS
then
  ln -s "$EXISTING" "$P6_RECOVERY_RUNTIME/node_modules"
  echo 'P6_EXISTING_EXACT_ROOT_RUNTIME_REUSED'
else
  npm --prefix "$P6_RECOVERY_RUNTIME" ci --include=optional --ignore-scripts --no-audit --no-fund
fi
test ! -e node_modules
ln -s "$P6_RECOVERY_RUNTIME/node_modules" node_modules
./node_modules/.bin/tsx --version
echo 'P6_MINIMAL_RUNTIME_READY'
MINIMAL
export P6_MINIMAL_SETUP="$TMP/minimal-runtime.sh"
node - "$TMP/original.sh" "$TMP/recover.sh" <<'JS'
const fs=require('node:fs');
const src=fs.readFileSync(process.argv[2],'utf8');
const exact='npm ci --include=dev --no-audit --no-fund';
if(src.split(exact).length!==2)throw Error('HOLD_ORIGINAL_INSTALL_LINE_DRIFT');
fs.writeFileSync(process.argv[3],src.replace(exact,'bash "$P6_MINIMAL_SETUP"'),{mode:0o600,flag:'wx'});
JS
bash -n "$TMP/recover.sh"
RECOVERY_EXIT=0
bash "$TMP/recover.sh" || RECOVERY_EXIT=$?
echo "P6_RECOVERY_EXIT=$RECOVERY_EXIT"
if [ -n "${DATABASE_URL:-}" ] && [ -f "$P6_RECOVERY_RUNTIME/node_modules/pg/package.json" ]; then
  (
  unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS
  export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
  node --input-type=commonjs <<'JS'
const path=require('node:path');
const {Client}=require(path.join(process.env.P6_RECOVERY_RUNTIME,'node_modules','pg'));
const old='781140cde71af3b72376c2db9f0fdb84204a2b7c',next='795ace55984b44a3d0bffa886d33a5ec11d31927';
(async()=>{
 const u=new URL(process.env.DATABASE_URL);
 if(!['postgres:','postgresql:'].includes(u.protocol)||decodeURIComponent(u.username)!=='neondb_owner'||u.pathname!=='/neondb'||!u.hostname.endsWith('.neon.tech')||!u.password||u.searchParams.getAll('sslmode').length!==1||!['require','verify-full'].includes(u.searchParams.get('sslmode'))||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('OWNER_PRIMARY_TLS_REQUIRED');
 const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000,options:'-c default_transaction_read_only=on',application_name:'p6_exact_stage_identity_reconcile'});
 try{
  await c.connect();
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const identity=(await c.query("SELECT current_user=session_user AS same_actor, current_user='neondb_owner' AS expected_actor, current_database()='neondb' AS expected_db, current_setting('transaction_read_only') AS ro, current_setting('server_version_num')::int AS ver, pg_is_in_recovery() AS replica")).rows[0];
  if(!identity.same_actor||!identity.expected_actor||!identity.expected_db||identity.ro!=='on'||identity.replica!==false||identity.ver<160000||identity.ver>=170000)throw Error('READONLY_IDENTITY');
  const rows=(await c.query('SELECT code_sha,manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc IS NOT NULL AS revoked FROM clean.adb_phase6_authorization')).rows;
  if(rows.length!==1)throw Error('AUTH_CARDINALITY');
  const a=rows[0];
  const cost=(await c.query('SELECT reviewed_cost_envelope_sha256,budget_release_mode FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1',[a.manifest_sha256])).rows;
  const counts=(await c.query("SELECT (SELECT count(*)::int FROM clean.adb_phase6_calendar_day) AS calendar_days,(SELECT count(*)::int FROM clean.adb_sampling_draw) AS draws,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39) AS day_budget,(SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39) AS allowed_queries,(SELECT count(*)::int FROM clean.phase5_fids_exact_query_partition_v39) AS partitions,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39) AS attempts,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39) AS other_attempts,(SELECT count(*)::int FROM clean.adb_collection_batches) AS batches,(SELECT count(*)::int FROM clean.adb_collection_subs) AS subscriptions")).rows[0];
  await c.query('ROLLBACK');
  const classification=a.code_sha===old?'PREVIOUS_MONDAY':a.code_sha===next?'REVIEWED_SUCCESSOR':'OTHER_STAGE';
  console.log(JSON.stringify({status:'P6_OWNER_STAGE_IDENTITY_READONLY_NO_GO',identity,classification,authorization:a,cost,counts,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
 }finally{await c.end().catch(()=>{});}
})().catch(e=>{const safe=['OWNER_PRIMARY_TLS_REQUIRED','READONLY_IDENTITY','AUTH_CARDINALITY'];console.error('HOLD_P6_STAGE_READONLY_'+(safe.includes(e.message)?e.message:'REDACTED'));process.exitCode=2});
JS
  ) || echo 'P6_STAGE_IDENTITY_READONLY_HOLD'
else
  echo 'P6_STAGE_IDENTITY_READONLY_NOT_RUN_NO_PG_OR_DB_URL'
fi
exit "$RECOVERY_EXIT"
P6_RECOVER_MINIMAL_AND_READONLY
```

This wrapper does not replace the reviewed compiler or adjust its output hash. A successful exact package recovery and current database identity readback are separate observations. If production remains on 781140c with the same calendar, do not replay the original prospective-date revision: it expects the earlier Nov22 predecessor and requires a date shift. Reconcile the live stage through a narrowly reviewed same-calendar successor or retain the commissioned identity and bind the policy to it; neither path is a new scientific calendar. Do not perform an unreviewed UPDATE. If the policy packages are only on the owner's Mac, use those exact local files rather than reconstructing unreviewed private policy values.

PR #959 initial head fbe9ff23: four completed checks successful, offline safety 44980698588 still in progress at observation. Original current main 4dbfb285 unchanged. No paid GO or gate closure inferred from the dependency repair.
