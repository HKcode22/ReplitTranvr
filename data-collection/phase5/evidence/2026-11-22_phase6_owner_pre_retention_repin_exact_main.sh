#!/usr/bin/env bash
# Owner completion on the already-installed stage. No restage, new migration,
# provider request, SOURCE enable, paid arming, signing key regeneration.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
RELAY=HKcode22/TravnrClockRelay
PIN=27074feda386247c4faf3877bd5349e696cde8a9
RELAY_PIN=214ede4895c6e6cdae5f124a85a323783251ea60
NEW_MAN=a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e
OLD_MAN=b2a691cb411af61c2bfdc42c55506e0ee86e45bfa3e22b420bbd738dc98ee4e4
STAGE="$HOME/.travnr-phase6-monday-795ace55"
RECOVERY="$HOME/.travnr-phase6-policy-recovery-20261120T044541Z"
POLICY="$HOME/.travnr-phase6-pre-policy-20261122/pre-policy.json"
REF="$HOME/.travnr-phase6-pre-policy-20261122/reference-policy.json"
AUTH="$HOME/.travnr-phase6-source-auth-20261122/auth.json"
WORKSPACE="$(pwd -P)"
RUNTIME="$WORKSPACE/node_modules"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
hold(){ echo "HOLD_P6_FINAL_COMMISSION_$1" >&2; exit 2; }
remote(){ gh api "repos/$1/git/ref/heads/main" --jq '.object.sha'; }
var(){ gh variable get "$1" -R "$2"; }
sha(){ sha256sum "$1" | awk '{print $1}'; }
test -n "${DATABASE_URL:-}" || hold OWNER_DATABASE_SECRET
test -x "$RUNTIME/.bin/tsx" || hold EXISTING_RUNTIME
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
test "$(remote "$RELAY")" = "$RELAY_PIN" || hold RELAY_MAIN_MOVED
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH

# Import the already approved exact bytes only if not present. Clipboard has
# wrapped base64 JSON lines, ends with P6_END_PRIVATE, never echoed. No cloud
# transfer, public file, shell argument or printed policy content.
if [ ! -f "$POLICY" ] || [ ! -f "$REF" ] || [ ! -f "$AUTH" ]; then
  printf '%s\n' 'Paste the PRIVATE clipboard from Mac once into this Replit terminal (input hidden). Do NOT paste into chat.'
  : > "$TMP/transfer.b64"
  total=0
  while IFS= read -r -s line < /dev/tty; do
    line="${line%$'\r'}"
    if [ "$line" = P6_END_PRIVATE ]; then break; fi
    [[ "$line" =~ ^[A-Za-z0-9+/=]+$ ]] || hold CLIPBOARD_FORMAT
    total=$((total+${#line}))
    [ "$total" -le 240000 ] || hold CLIPBOARD_SIZE
    printf '%s' "$line" >> "$TMP/transfer.b64"
  done
  python3 - "$TMP/transfer.b64" <<'PY'
import base64, hashlib, json, os, pathlib, stat, sys
home=pathlib.Path.home()
spec={
 'pre-policy.json':('.travnr-phase6-pre-policy-20261122','8a9175f746d9ebfcc21deaa963b6b3d452d90e64f71d84061496bbbe4e6040ae'),
 'reference-policy.json':('.travnr-phase6-pre-policy-20261122','ce340f1a7d9d496c42d0782823867b427dc4f793fdfcd4d38c8717bf7872ca64'),
 'auth.json':('.travnr-phase6-source-auth-20261122','8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297')}
try:
 bundle=json.loads(base64.b64decode(pathlib.Path(sys.argv[1]).read_bytes(),validate=True))
 assert set(bundle)==set(spec)
 for k,(d,h) in spec.items():
  data=base64.b64decode(bundle[k],validate=True)
  assert 0<len(data)<=48000 and hashlib.sha256(data).hexdigest()==h
  directory=home/d
  directory.mkdir(mode=0o700,exist_ok=True)
  s=directory.lstat()
  assert stat.S_ISDIR(s.st_mode) and s.st_uid==os.getuid() and not s.st_mode&0o077
  p=directory/k
  if p.exists() or p.is_symlink():
   s=p.lstat()
   assert stat.S_ISREG(s.st_mode) and s.st_uid==os.getuid() and s.st_nlink==1 and not s.st_mode&0o077 and p.read_bytes()==data
  else:
   fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   with os.fdopen(fd,'wb') as f: f.write(data)
 print('P6_THREE_PRIVATE_FILES_TRANSFERRED_AND_HASH_VERIFIED')
except Exception:
 sys.exit('HOLD_P6_PRIVATE_TRANSFER_REDACTED')
PY
  rm -f "$TMP/transfer.b64"
fi
test "$(sha "$POLICY")" = 8a9175f746d9ebfcc21deaa963b6b3d452d90e64f71d84061496bbbe4e6040ae || hold PRE_HASH
test "$(sha "$REF")" = ce340f1a7d9d496c42d0782823867b427dc4f793fdfcd4d38c8717bf7872ca64 || hold REF_HASH
test "$(sha "$AUTH")" = 8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297 || hold AUTH_HASH
test "$(sha "$STAGE/new-stage-input.json")" = 8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc || hold STAGE_HASH

export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS NODE_TLS_REJECT_UNAUTHORIZED
gh repo clone "$REPO" "$TMP/repo" -- --filter=blob:none --no-checkout
cd "$TMP/repo"
git checkout --detach "$PIN"
test "$(git rev-parse HEAD)" = "$PIN"
ln -s "$RUNTIME" node_modules
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
gh run watch 44981874120 -R "$REPO" --exit-status
DEC="data-collection/phase5/evidence/2026-11-22_phase7_pre_policy_owner_commission_review.json"
DEC_SHA="$(sha "$DEC")"
test "$DEC_SHA" = b1f627a1bb3771c894acaf0b9879e2a4f94ce0fc915e00fc743cece77c90eac5 || hold PRE_DECISION_BYTES
# Exact row cardinality only; never read private flight values. New install
# only from zero rows; otherwise invoke exact readback, not a second write.
N="$(node --input-type=module <<'JS'
import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:8000,query_timeout:15000});
try{
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const q=(await c.query("SELECT current_database()='neondb' ok,current_user='neondb_owner' owner,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,(SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) n")).rows[0];
 if(!q.ok||!q.owner||q.ro!=='on'||q.replica!==false||![0,1].includes(q.n))throw Error('OWNER_PRE_CARDINALITY');
 await c.query('ROLLBACK');console.log(q.n);
}finally{await c.end()}
JS
)"
case "$N" in
  0)
    P7_PRE_POLICY_OWNER_APPROVAL=APPLY_EXACT_REVIEWED_PRE_POLICY_AND_NARROW_EXECUTE_NO_PROVIDER \
    ./node_modules/.bin/tsx review-tools/p7_commission_pre_policy_owner_v39.ts \
    --apply-reviewed "$STAGE" "$POLICY" "$REF" "$DEC" "$DEC_SHA"
    ;;
  1) echo 'P6_PRE_POLICY_ALREADY_PRESENT_INSPECT_NO_REPLAY' ;;
  *) hold PRE_CARDINALITY ;;
esac
./node_modules/.bin/tsx review-tools/p7_commission_pre_policy_owner_v39.ts \
  --inspect "$STAGE" "$POLICY" "$REF" "$DEC" "$DEC_SHA" | tee "$TMP/pre-readback.log"
grep -q '"status":"P7_EXACT_PRE_POLICY_AND_NARROW_GRANT_READBACK_NO_GO"' "$TMP/pre-readback.log" || hold PRE_READBACK

# The source child and post child already consume these four scoped secrets.
# No enable/approve/arm flags or keys are touched.
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
node -e 'process.stdout.write(require("fs").readFileSync(process.argv[1]).toString("base64"))' "$POLICY" |
 gh secret set P6_PHASE7_PRE_POLICY_BASE64 -R "$REPO"
printf %s ddcdedc1553585813b3322db3635ec7803ebb6ca8308e3b8f924ef5f6a34a3e8 |
 gh secret set P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256 -R "$REPO"
node -e 'process.stdout.write(require("fs").readFileSync(process.argv[1]).toString("base64"))' "$REF" |
 gh secret set P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64 -R "$REPO"
printf %s ce340f1a7d9d496c42d0782823867b427dc4f793fdfcd4d38c8717bf7872ca64 |
 gh secret set P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256 -R "$REPO"
echo 'P6_PRE_FOUR_EXACT_PROTECTED_VALUES_WRITTEN_NO_ARM'
node --import tsx --input-type=module - "$AUTH" "$PIN" <<'JS'
import {verifyP6SourceEnableAuthFile} from './scripts/v39_phase6_source_enable_approval_ledger_v39.ts';
const a=verifyP6SourceEnableAuthFile(process.argv[2],process.argv[3]);
console.log(JSON.stringify({status:'P6_EXISTING_AUTH_LEDGER_READBACK_NO_GO',artifactSha256:a.artifactHash,verified:a.verdict.verified,authorizationId:a.record.authorizationId,providerCalls:0,phase6PaidGo:false}));
JS

# Gate 6 local inputs: exact receipt and known path, no regeneration.
# Print hash matches and safe decision paths only, no private JSON.
python3 - "$RECOVERY" <<'PY'
import pathlib, hashlib, json, sys
home=pathlib.Path.home(); p=pathlib.Path(sys.argv[1])
spec={'policy-complete-shape-NOT-RUNTIME.json':'7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e','airport-timezone-catalog-CANDIDATE.json':'4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534','public-provider-contract-CANDIDATE.json':'63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09'}
for name,h in spec.items():
 f=p/name
 print(json.dumps({'status':'P6_GATE6_EXISTING_INPUT','file':name,'exact':f.is_file() and hashlib.sha256(f.read_bytes()).hexdigest()==h}))
for pattern in ('reviewed-final-policy-binding-decisions.json','reviewed-final-core-scope-decisions.json','approved-private-policy-review.json','static-values-PRIVATE.json','six-policy-objects-PRIVATE.json','bundle-receipt.json'):
 files=[f for d in home.glob('.travnr-*') if d.is_dir() for f in d.glob(pattern) if f.is_file()]
 print(json.dumps({'status':'P6_GATE6_EXISTING_DECISION_INVENTORY','file':pattern,'matches':[str(f) for f in files]}))
PY

# Gate 3: repin existing protected expiry controls. No new enablement and
# no new deletion permission; old Monday stage was independently virgin.
test "$(var P5_PRIMARY_FIDS_EXPIRY_ENABLED "$REPO")" = true || hold PRIMARY_DISABLED
test "$(var P5_PRIMARY_FIDS_EXPIRY_APPROVAL "$REPO")" = APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER || hold PRIMARY_APPROVAL
test "$(var P5_PRIMARY_FIDS_DEADLINE_PROFILE "$REPO")" = V0107_VERIFIED_FUTURE_POST_23H_MARGIN || hold DEADLINE_PROFILE
test "$(var P7_EXPIRY_ENABLED "$REPO")" = true || hold P7_EXPIRY_DISABLED
test "$(var P7_EXPIRY_APPROVAL "$REPO")" = APPLY_P7_DUE_ONLY_NO_PROVIDER || hold P7_EXPIRY_APPROVAL
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
gh variable set P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA -R "$REPO" --body "$PIN"
gh variable set P7_EXPIRY_APPROVED_MAIN_SHA -R "$REPO" --body "$PIN"
test "$(var P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$REPO")" = "$PIN"
test "$(var P7_EXPIRY_APPROVED_MAIN_SHA "$REPO")" = "$PIN"
MODE="$(var P6_PRIVATE_EPOCH_EXPIRY_MODE "$REPO")"
if [ "$MODE" = APPLY_DUE_ONLY ]; then
  test "$(var P6_PRIVATE_EPOCH_EXPIRY_APPROVAL "$REPO")" = APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER || hold PRIVATE_EXPIRY_APPROVAL
  M="$(var P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256 "$REPO")"
  if [ "$M" = "$OLD_MAN" ]; then
    gh variable set P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256 -R "$REPO" --body "$NEW_MAN"
  elif [ "$M" != "$NEW_MAN" ]; then
    echo "P6_PRIVATE_EPOCH_EXISTING_DIFFERENT_MANIFEST=$M"
    hold PRIVATE_EXPIRY_MANIFEST_RECONCILE
  fi
  test "$(var P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256 "$REPO")" = "$NEW_MAN"
else
  echo "P6_PRIVATE_EPOCH_MODE=$MODE"
  hold PRIVATE_EXPIRY_NOT_APPLY_DUE_ONLY
fi
# Existing manual verification workflows, no provider. Identify only unique
# first-attempt runs created by this dispatch; no replay if ambiguous.
dispatch_verify(){
 local confirmation="$1" want_job="$2" api run="" count
 api="repos/$REPO/actions/workflows/phase5-primary-fids-expiry-no-provider.yml/runs?event=workflow_dispatch&branch=main&per_page=100"
 gh api "$api" --jq '.workflow_runs[].id' | sort -n > "$TMP/old"
 test "$(remote "$REPO")" = "$PIN" || return 2
 gh workflow run phase5-primary-fids-expiry-no-provider.yml -R "$REPO" --ref main -f confirm="$confirmation" -f approved_main_sha="$PIN" >&2
 for _ in $(seq 1 45); do
  gh api "$api" --jq ".workflow_runs[] | select(.head_sha==\"$PIN\" and .run_attempt==1) | .id" | sort -n > "$TMP/current"
  comm -13 "$TMP/old" "$TMP/current" > "$TMP/new"
  count="$(wc -l < "$TMP/new" | tr -d ' ')"
  [ "$count" -le 1 ] || return 2
  if [ "$count" -eq 1 ]; then run="$(cat "$TMP/new")"; break; fi
  sleep 2
 done
 [[ "$run" =~ ^[0-9]+$ ]] || return 2
 gh run watch "$run" -R "$REPO" --exit-status >&2
 gh api "repos/$REPO/actions/runs/$run/jobs?per_page=100" --jq ".jobs[] | select(.name==\"$want_job\" and .status==\"completed\" and .conclusion==\"success\") | .id" > "$TMP/job"
 [ "$(wc -l < "$TMP/job" | tr -d ' ')" = 1 ] || return 2
 gh run view "$run" -R "$REPO" --job "$(cat "$TMP/job")" --log > "$TMP/$want_job.log"
 printf '%s\n' "$run"
}
PRIMARY_RUN="$(dispatch_verify VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES primary-fids-expiry)" || hold PRIMARY_VERIFY
P7_RUN="$(dispatch_verify VERIFY_P7_RESEARCH_EXPIRY_ONLY_NO_WRITES phase7-expiry)" || hold P7_VERIFY
node - "$PIN" "$PRIMARY_RUN" "$P7_RUN" "$TMP/primary-fids-expiry.log" "$TMP/phase7-expiry.log" <<'JS'
const fs=require('node:fs'),[pin,pid,p7id,pf,qf]=process.argv.slice(2);
function get(f,status){const a=[];for(const l of fs.readFileSync(f,'utf8').split(/\r?\n/)){const i=l.indexOf('{');if(i<0)continue;try{const x=JSON.parse(l.slice(i));if(x.status===status)a.push(x)}catch{}}if(a.length!==1)throw Error('RECEIPT_CARDINALITY');return a[0]}
const p=get(pf,'PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES');
const keys=['liveOriginals','eligibleOriginals','hardDueOriginals','eligibleNextHour','hardDueNextHour','unboundLiveOriginals','markedExpiredPayloadPresent','unlinkedUnexpiredPopulation','unexpiredPopulationWithoutLiveOriginal'];
if(p.reviewedMainSha!==pin||p.providerCalls!==0||p.databaseWrites!==0||p.phase6PaidGo!==false||!p.before||keys.some(k=>p.before[k]!==0)||p.before.deletionStopUnresolved!==false)throw Error('PRIMARY_VERIFY_RECEIPT');
console.log(JSON.stringify({status:'P6_CURRENT_PRIMARY_VERIFY_PASS',runId:Number(pid),providerCalls:0,phase6PaidGo:false}));
const q=fs.readFileSync(qf,'utf8').split(/\r?\n/).flatMap(l=>{const i=l.indexOf('{');if(i<0)return [];try{const x=JSON.parse(l.slice(i));return typeof x.status==='string'&&x.status.startsWith('P7_EXPIRY_')?[x]:[]}catch{return []}});
if(q.length!==1||q[0].providerCalls!==0||q[0].phase6PaidGo!==false||q[0].status.includes('HOLD')||!q[0].before||['dueLinks','dueBundles','dueFragments','liveLinksOnDueFragments'].some(k=>q[0].before[k]!==0))throw Error('P7_VERIFY_RECEIPT');
console.log(JSON.stringify({status:'P6_CURRENT_P7_EXPIRY_VERIFY_PASS',runId:Number(p7id),receiptStatus:q[0].status,providerCalls:0,phase6PaidGo:false}));
JS
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
test "$(remote "$RELAY")" = "$RELAY_PIN" || hold RELAY_MOVED
test "$(var TRAVNR_RELAY_MODE "$RELAY")" = MULTI_LANE || hold RELAY_MODE
test "$(var TRAVNR_RELAY_PRIMARY_ENABLED "$RELAY")" = 1 || hold RELAY_PRIMARY_DISABLED
test "$(var TRAVNR_RELAY_ROLLING_ENABLED "$RELAY")" = 1 || hold RELAY_ROLLING_DISABLED
gh variable set TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID -R "$RELAY" --body "$PRIMARY_RUN"
gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RELAY" --body "$PIN"
test "$(var TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID "$RELAY")" = "$PRIMARY_RUN"
test "$(var TRAVNR_APPROVED_TARGET_MAIN_SHA "$RELAY")" = "$PIN"
echo "PRIMARY_VERIFY_RUN=$PRIMARY_RUN"
echo "P7_VERIFY_RUN=$P7_RUN"
echo "P6_RETENTION_AND_EXISTING_RELAY_TARGET_PINS_READBACK_PASS"
# A real scheduled relay wake can now provide independent target receipt.
# Do not dispatch the rolling paid route or enable SOURCE in this helper.
echo "FINAL_MAIN=$PIN"
echo 'P6_OWNER_FINAL_COMMISSIONING_PARTIAL_COMPLETE_SOURCE_DISABLED_NO_PAID_GO'
