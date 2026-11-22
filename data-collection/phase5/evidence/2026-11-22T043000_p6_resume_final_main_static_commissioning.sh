#!/usr/bin/env bash
# Exact owner-delegated configuration only. No SOURCE enable/paid dispatch,
# role creation, migration, new key, or scientific/calendar change.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
RELAY=HKcode22/TravnrClockRelay
PIN=e058b9d0817151d4b10282c9242c6c8ebeef7814
STAGE="$HOME/.travnr-phase6-monday-795ace55"
REC="$HOME/.travnr-phase6-six-policy-exact-recovered-27074fed"
AUTH="$HOME/.travnr-phase6-source-auth-exact-repaired-27074fed/auth.json"
PRE="$HOME/.travnr-phase6-pre-policy-20261122/pre-policy.json"
KEYDIR="$HOME/.travnr-phase7-reviewer-keys-20261120"
RUNTIME="$(pwd -P)/node_modules"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
hold(){ echo "HOLD_P6_RUNTIME_BINDING_$1" >&2; exit 2; }
main(){ gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha'; }
hash(){ sha256sum "$1" | awk '{print $1}'; }
test "$(main)" = "$PIN" || hold MAIN_MOVED
test -x "$RUNTIME/.bin/tsx" || hold EXISTING_RUNTIME
test -n "${DATABASE_URL:-}" || hold OWNER_DB
test "$(hash "$AUTH")" = 4da414a46138060a66104fa1885a8ba5c32e513908bae1c28a84f51eef2da106
test "$(hash "$PRE")" = 8a9175f746d9ebfcc21deaa963b6b3d452d90e64f71d84061496bbbe4e6040ae
test "$(hash "$REC/policy-complete-shape-NOT-RUNTIME.json")" = 7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e
test "$(hash "$REC/airport-timezone-catalog-CANDIDATE.json")" = 4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534
test "$(hash "$REC/public-provider-contract-CANDIDATE.json")" = 63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09
test "$(hash "$STAGE/new-stage-input.json")" = 8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc
ACCOUNT_READ_KEY="${AERODATABOX_API_KEY:-}"
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS NODE_TLS_REJECT_UNAUTHORIZED
gh repo clone "$REPO" "$TMP/repo" -- --filter=blob:none --no-checkout
cd "$TMP/repo"
git checkout --detach "$PIN"
ln -s "$RUNTIME" node_modules
test "$(git rev-parse HEAD)" = "$PIN"
test "$(main)" = "$PIN"
# Verify actual disabled singleton and one commissioned PRE row; no data reads.
node --input-type=module <<'JS'
import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:8000,query_timeout:15000});
try{
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const a=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,(SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) pre_rows,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subs,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents")).rows[0];
 const z=(await c.query("SELECT manifest_sha256,enabled,revoked_at_utc FROM clean.adb_phase6_authorization")).rows;
 if(a.db!=='neondb'||a.actor!=='neondb_owner'||a.login!==a.actor||a.ro!=='on'||a.replica!==false||a.pre_rows!==1||a.subs!==0||a.batches!==0||a.incidents!==0||z.length!==1||z[0].enabled!==false||z[0].revoked_at_utc!==null||z[0].manifest_sha256!=='a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e')throw Error('HOLD_P6_EXACT_DISABLED_PRE_COMMISSION_STATE');
 await c.query('ROLLBACK');console.log(JSON.stringify({status:'P6_EXACT_DISABLED_PRE_COMMISSION_STATE_PASS',providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
}finally{await c.end()}
JS
# Use exact committed scope review, not a newly invented approval hash.
for spec in '3f20569309057ca818d433e271d7771983e60e0c scope.md' '2155629d90b522bbd5defb7a195697bc2e0a91c8 pre-receipt.md'; do
  read -r blob name <<< "$spec"
  gh api "repos/$REPO/git/blobs/$blob" --jq '.content' | base64 --decode > "$TMP/$name"
  test "$(git hash-object "$TMP/$name")" = "$blob"
done
DEC="$HOME/.travnr-phase6-six-policy-binding-e058b9d0"
mkdir -p -m 700 "$DEC"
# Save a deterministic decision with current actual clock, reviewed exact source
# documentation, and the owner-delegated scope. If an earlier one exists, reuse
# only after rechecking all non-clock fields. No independent human asserted.
node --import tsx --input-type=module - "$REC" "$AUTH" "$STAGE" "$TMP" "$DEC" <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {verifyP6SourceEnableAuthFile} from './scripts/v39_phase6_source_enable_approval_ledger_v39.ts';
const [rec,auth,stage,tmp,out]=process.argv.slice(2);
const main='e058b9d0817151d4b10282c9242c6c8ebeef7814';
const H=/^[0-9a-f]{64}$/,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=f=>fs.readFileSync(f),hash=f=>sha(raw(f)),need=(x,s)=>{if(!x)throw Error('HOLD_P6_BINDING_'+s)};
const a=verifyP6SourceEnableAuthFile(auth,main),release=a.record.releaseActivation;
need(a.verdict.verified===true&&a.record.authorizationId==='AUTH-20261119-P5INERTFREEZE'&&a.artifactHash==='4da414a46138060a66104fa1885a8ba5c32e513908bae1c28a84f51eef2da106','AUTH');
const s=JSON.parse(raw(stage+'/new-stage-input.json')),pre=JSON.parse(raw(process.env.HOME+'/.travnr-phase6-pre-policy-20261122/pre-policy.json'));
const rights='data-collection/phase5/evidence/2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md';
need(hash(rights)===release.sourceRightsEvidenceSha256&&release.sourceRightsEvidenceSha256===pre.review.rightsSha256&&pre.review.manifestSha256===s.manifestSha256&&s.slotBudgetInput.cycleRestCeilingUnits===49468&&s.slotBudgetInput.protectedRestFloorUnits===1000,'EXACT_SETTLED_RIGHTS_BUDGET');
const builder='server/lib/disruption/phase5IndependentLaterPrePacketCompletion_v39.ts';
const builderClock=new Date(execFileSync('git',['log','-1','--format=%cI','--',builder],{encoding:'utf8'}).trim()).toISOString();
const now=new Date().toISOString();
need(now<release.accountEvidenceValidUntilUtc,"FRESH_ACCOUNT_REVIEW_EXPIRED");
need(now<'2026-11-23T23:10:00.000Z'&&builderClock<=now,'CLOCK');
const flags=['independentStudyTrustPinsApproved','delegatedDailyPacketProductionApproved','delegatedAutomatedSourceSigningApproved','independentTransportAndSigningScopeApproved','independentPostReviewerPinsApproved','nativePreFeatureApproved','nativeLaterApproved','privatePublicationApproved','nativeT24ReviewApproved','independentT24WitnessProtocolReviewed','verifiedProviderNativeSchedule','independentT24CustodyTrustApproved','delegatedAutomatedLaterDayAppendApproved','independentPostRequestGeometryApproved','delegatedPostPacketAndDayAppendApproved','independentSourceContentsUseAndRESTReleaseAttested','independentProviderContentRetentionApproved'];
const compatibleUntil='2027-01-31T00:00:00.000Z';
const decision={schema:'v39.phase5.final-six-policy-binding-decisions.v1',phase6PaidGo:false,authorizationId:a.record.authorizationId,authArtifactSha256:a.artifactHash,reviewedMainSha:main,manifestSha256:s.manifestSha256,configSha256:s.configSha256,rightsSha256:release.sourceRightsEvidenceSha256,costSha256:release.costEnvelopeSha256,
reviewedBy:'Owner-delegated technical review (not independent human)',reviewedAtUtc:now,decisions:Object.fromEntries(flags.map(k=>[k,true])),
releaseSha256:hash(tmp+'/scope.md'),externalContentUseReviewSha256:hash(rights),builderSha256:hash(builder),runAndRetentionEvidenceSha256:hash(tmp+'/pre-receipt.md'),
selectedTArtifactHash:hash(rec+'/public-provider-contract-CANDIDATE.json'),selectedTSemanticsEvidenceSha256:hash('data-collection/phase5/2026-11-16_FINAL_EXIT_SCIENCE_AND_COMMISSIONING_CROSSWALK.md'),t24CustodyPolicySha256:hash(tmp+'/scope.md'),
reviewedProviderPriceSha256:hash('data-collection/phase5/evidence/2026-11-19_current_marketplace_fids_range_cost_NOT_RIGHTS_NO_GO.json'),externalPostContentsAndBudgetEvidenceSha256:hash(tmp+'/scope.md'),
validFromUtc:'2026-11-22T00:00:00.000Z',validUntilUtc:compatibleUntil,builderFrozenAtUtc:builderClock,selectedTVersion:'AeroDataBox-OpenAPI-1.15.4.0-native-scheduled-departure',standaloneNoT24ProtocolSha256:null};
need(Object.entries(decision).filter(([k])=>k.endsWith('Sha256')).every(([,v])=>H.test(v)),'DIGEST');
const f=out+'/reviewed-final-policy-binding-decisions.json',safe=fs.lstatSync(out);
need(safe.isDirectory()&&!safe.isSymbolicLink()&&safe.uid===process.getuid()&&(safe.mode&0o077)===0,'PRIVATE_DIR');
if(fs.existsSync(f)){
 const old=JSON.parse(raw(f));const expected={...decision,reviewedAtUtc:old.reviewedAtUtc};
 need(JSON.stringify(old)===JSON.stringify(expected)&&old.reviewedAtUtc<=now,'EXISTING_DECISION_DRIFT');
}else fs.writeFileSync(f,JSON.stringify(decision),{flag:'wx',mode:0o600});
console.log(JSON.stringify({status:'P6_EXACT_OWNER_DELEGATED_RUNTIME_BINDING_DECISION_READY',decisionSha256:hash(f),flags:flags.length,preExistingPolicyVerified:true,independentHumanReview:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
JS
OUT="$HOME/.travnr-phase6-final-policies-e058b9d0"
if [ -e "$OUT" ]; then
 test -f "$OUT/bundle-receipt.json" || hold PARTIAL_BUNDLE_RECONCILE
 echo 'P6_EXISTING_FINAL_BUNDLE_REUSE'
else
./node_modules/.bin/tsx review-tools/p6_nov20_finalize_recovered_policies_v39.ts \
  --prepare-private-monday "$REC" "$STAGE" "$AUTH" \
  4da414a46138060a66104fa1885a8ba5c32e513908bae1c28a84f51eef2da106 \
  "$DEC/reviewed-final-policy-binding-decisions.json" \
  "$(hash "$DEC/reviewed-final-policy-binding-decisions.json")" "$OUT"
fi
unset ACCOUNT_READ_KEY
# Independently validate cross-binding of all emitted bytes and confirm exact
# namespace/capacity. Only config values are written; no arming flags.
export P6_FINAL_BUNDLE_DIR="$OUT"
node --input-type=module <<'JS'
import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const repo='HKcode22/ReplitTranvr',pin='e058b9d0817151d4b10282c9242c6c8ebeef7814',dir=process.env.P6_FINAL_BUNDLE_DIR;
const get=file=>JSON.parse(fs.readFileSync(dir+'/'+file,'utf8'));const v=get('static-values-PRIVATE.json'),w=get('six-policy-objects-PRIVATE.json'),b=get('bundle-receipt.json'),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const gh=(a,input)=>execFileSync('gh',a,{encoding:'utf8',input,stdio:[input===undefined?'ignore':'pipe','pipe','pipe'],timeout:45000,maxBuffer:2*1024*1024});
const need=(x,s)=>{if(!x)throw Error('HOLD_P6_STATIC_'+s)};
const names=['V39_P5_APPROVED_CODE_SHA','P6_NONPAID_SOURCE_APPROVED_MAIN_SHA','V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA','P5_CD_GH_PRE_APPROVED_CODE_SHA','V39_P5_POST_APPROVED_CODE_SHA','P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA','V39_P5_QUEUE_APPROVED_CODE_SHA','V39_P5_MANIFEST_SHA256','V39_P5_CALENDAR_HASH','V39_P5_CONFIG_HASH','V39_P5_FRAME_HASH','V39_P5_RELEASE_SHA256','V39_P5_RIGHTS_SHA256','V39_P5_PROVIDER_CONTRACT_SHA256','P6_INERT_STAGE_INPUT_JSON','P6_INERT_STAGE_INPUT_SHA256','P6_INERT_COST_ENVELOPE_SHA256','P6_PRIVATE_POST_OUTCOME_TAIL_HOURS','V39_P5_POST_PROVIDER_CONTRACT_SHA256','V39_P5_POST_CATEGORY_BUDGET_SHA256','V39_P5_POST_PRICE_SHA256','P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64','P6_NONPAID_DAILY_POLICY_BASE64','P6_NONPAID_SIGNING_POLICY_BASE64','P6_NONPAID_TRANSPORT_TRUST_BASE64','P6_PRIVATE_POST_REVIEWER_TRUST_BASE64','P6_NATIVE_POST_POLICY_BASE64','P6_NONPAID_DAILY_POLICY_SHA256','P6_NONPAID_SIGNING_POLICY_SHA256','P6_NONPAID_TRANSPORT_TRUST_SHA256','P6_NATIVE_POST_POLICY_SHA256'];
need(b.status==='SIX_EXACT_REVISED_POLICY_BYTES_PREPARED_AWAITING_BYTE_REVIEW_NO_GO'&&b.main===pin&&b.staticCount===31&&b.staticValuesSha256===hash(v)&&b.policyBundleSha256===hash(w)&&b.phase6PaidGo===false&&Object.keys(v).length===31&&names.every(n=>Object.hasOwn(v,n)&&typeof v[n]==='string'&&Buffer.byteLength(v[n])<=48000&&v[n].length>0),'BUNDLE_BYTES');
for(const [n,p] of Object.entries(w)){need(Buffer.from(v[n],'base64').toString('utf8')===JSON.stringify(p),'POLICY_STATIC_CROSS_BIND');if(Object.hasOwn(v,n.replace('_BASE64','_SHA256')))need(v[n.replace('_BASE64','_SHA256')]===hash(p),'POLICY_SHA')}
const live=()=>gh(['api','repos/'+repo+'/git/ref/heads/main','--jq','.object.sha']).trim();
need(live()===pin,'MAIN_MOVED');
const vars=JSON.parse(gh(['variable','list','-R',repo,'--json','name,value']));
const dangerouslyArmed=vars.filter(x=>['P6_NONPAID_SOURCE_SCHEDULE_ENABLED','P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED','P6_PRIVATE_POST_PARENT_ENABLED','P6_NATIVE_LATER_RUNTIME_ENABLED','P6_NATIVE_POST_PRODUCER_ENABLED','P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED','P6_PRIVATE_T24_EXECUTION_ENABLED','P6_PRIVATE_LATER_ENROLL_ENABLED','P6_PRIVATE_T24_ENROLL_ENABLED','P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED','P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED','P5_CD_GH_PRE_SCHEDULE_ENABLED','P5_CD_GH_T24_SCHEDULE_ENABLED','P6_ROLLING_CONTROLLER_ENABLED','P5_AUTO_SOURCE_DISPATCH_ENABLED','P5_POST_AUTO_DISPATCH_ENABLED','P5_T24_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED','P6_T24_CUSTODY_ENABLED','P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED','P6_ROLLING_DIRECT_RECOVERY_ENABLED','P6_PHASE7_POST_RECOVERY_ENABLED','V39_PHASE6_PROCESS_ARMED','V39_PHASE6_OWNER_APPROVED'].includes(x.name)&&!['','0','false','OFF'].includes(x.value));
need(!dangerouslyArmed.length,'ACTIVE_RUNTIME_VARIABLES');
const seen=()=>{const a=JSON.parse(gh(['api','repos/'+repo+'/actions/secrets?per_page=100']));need(a.total_count===a.secrets.length,'SECRET_METADATA_INCOMPLETE');return new Map(a.secrets.map(x=>[x.name,x.updated_at]))};
let present=seen();const missing=names.filter(n=>!present.has(n));console.log(JSON.stringify({status:'P6_STATIC_SECRET_CAPACITY_CHECK',existing:present.size,additional:missing.length,maximum:100}));need(present.size+missing.length<=100,'SECRET_CAPACITY_NO_MUTATION');
console.log(JSON.stringify({status:'P6_SIX_POLICY_EXACT_BYTE_CROSS_BIND_REVIEW_PASS',policies:6,staticCount:31,missingStaticNames:missing.length,repoSecretsBefore:present.size,bytesReviewedUnderOwnerDelegation:true,independentHumanReview:false,phase6PaidGo:false}));
const jp=dir+'/static-install-journal.json',j=fs.existsSync(jp)?JSON.parse(fs.readFileSync(jp,'utf8')):{schema:'v39.phase6.static-install-journal.v1',main:pin,valuesSha256:b.staticValuesSha256,installed:{}};
need(j.main===pin&&j.valuesSha256===b.staticValuesSha256,'JOURNAL_SCOPE');
let written=0;
for(const n of names){need(live()===pin,'MAIN_MOVED_DURING_INSTALL');const digest=crypto.createHash('sha256').update(v[n]).digest('hex');if(j.installed[n]){need(j.installed[n].sha256===digest&&j.installed[n].updatedAt===present.get(n),'JOURNAL_DRIFT');continue;}gh(['secret','set',n,'-R',repo],v[n]);present=seen();need(present.has(n),'MISSING_INSTALLED_METADATA');j.installed[n]={sha256:digest,updatedAt:present.get(n)};const tmp=jp+'.'+crypto.randomBytes(6).toString('hex');fs.writeFileSync(tmp,JSON.stringify(j),{flag:'wx',mode:0o600});fs.renameSync(tmp,jp);written++;console.log('P6_STATIC_INSTALLED '+n);}
present=seen();need(names.every(n=>present.has(n))&&live()===pin,'POST_INSTALL_METADATA');
console.log(JSON.stringify({status:'P6_ALL_31_STATIC_VALUES_INSTALLED_METADATA_PASS_NO_GO',written,journalVerified:Object.keys(j.installed).length,policyBundleSha256:b.policyBundleSha256,staticValuesSha256:b.staticValuesSha256,secretValuesReadBack:false,repoSecretsAfter:present.size,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
JS
# Reuse prior exact local keypairs only if the existing public pins can be
# reconciled against the original owner receipt. No key creation or rotation.
node --input-type=module - "$KEYDIR" <<'JS'
import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const d=process.argv[2],repo='HKcode22/ReplitTranvr',pin='e058b9d0817151d4b10282c9242c6c8ebeef7814';
const h=x=>crypto.createHash('sha256').update(x).digest('hex');
const gh=(args,input)=>execFileSync('gh',args,{encoding:'utf8',input,stdio:[input===undefined?'ignore':'pipe','pipe','pipe'],timeout:45000,maxBuffer:2*1024*1024});
const need=(ok,s)=>{if(!ok)throw Error('HOLD_P7_EXISTING_KEYS_'+s)};
const live=()=>gh(['api','repos/'+repo+'/git/ref/heads/main','--jq','.object.sha']).trim();
const read=f=>{const s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&s.nlink===1&&s.size<=20000,'PRIVATE_FILE');return fs.readFileSync(f)};
const inventory=()=>{const x=JSON.parse(gh(['api','repos/'+repo+'/actions/secrets?per_page=100']));need(x.total_count===x.secrets.length,'METADATA');return new Map(x.secrets.map(y=>[y.name,y.updated_at]))};
let m=inventory();
const output={status:'P7_EXISTING_KEY_STAGE_SUMMARY_NO_GO',privateKeysStaged:0,approvalFlagsChanged:false,phase6PaidGo:false};
if(!fs.existsSync(d)){console.log(JSON.stringify({status:'P7_EXISTING_KEY_DIRECTORY_NOT_PRESENT',path:d}));process.exit(0)}
const ds=fs.lstatSync(d);need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&(ds.mode&0o077)===0&&fs.realpathSync(d)===d,'PRIVATE_DIR');
const j=JSON.parse(read(d+'/public-pin-receipt.json'));
need(j.schema==='v39.phase7.inactive-owner-reviewer-public-pins.v1'&&j.repo===repo,'RECEIPT_SCOPE');
const other=new Set(['7639dcd0773f7b21e1194c91e19a941589ac361621a1cadd31edd10c832c7744','80d59db77bec734d4e34eb43ed8dfa92ceb220a1ef82a8f4a06a55a30e08b5b2','60538d4035f3bb3132cad7ccd2b459242e5fa9e949aea43cabe974bb29519e67','de37f2d4f8736cb92c04a31c94d3d252482667f937ce80a0f65b09df5293e733','4c0e85e2834b217eeeb3d96d8f350f6d5c844ea6b29cfa0fb449683db251846b','5d002b5a2cede6da00aab6d3b516aa4766f58858b252ba85e1c67049dd08d23f']);
const desired={};
for(const [name,prefix,privName] of [
 ['pre-proof','P6_PHASE7_PRE_PROOF_REVIEWER','P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64'],
 ['post-outcome','P6_PHASE7_POST_OUTCOME_REVIEWER','P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64'],
 ['pre-lane-authority','P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY','P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64']]){
 const prv=read(d+'/'+name+'.private.pem'),pub=read(d+'/'+name+'.public.pem'),k=crypto.createPrivateKey(prv),q=crypto.createPublicKey(pub),der=q.export({format:'der',type:'spki'}),fp=h(der);
 need(k.asymmetricKeyType==='ed25519'&&q.asymmetricKeyType==='ed25519'&&crypto.createPublicKey(k).export({format:'der',type:'spki'}).equals(der)&&!other.has(fp),'PAIR_OR_ALIAS');other.add(fp);
 const pins=[[prefix+'_FINGERPRINT_SHA256',fp],[prefix+'_PUBLIC_KEY_BASE64',pub.toString('base64')]];
 for(const [n,v] of pins){
   const journal=j.installed?.[n];
   if(name!=='pre-lane-authority')need(journal&&journal.valueSha256===h(v)&&journal.updatedAt===m.get(n),'ORIGINAL_PUBLIC_PIN_DRIFT');
   else if(m.has(n)){const staged=fs.existsSync(d+'/phase6-final-key-staging-receipt.json')?JSON.parse(read(d+'/phase6-final-key-staging-receipt.json')).installed?.[n]:null;need(staged?.valueSha256===h(v)&&staged.updatedAt===m.get(n),'UNKNOWN_LANE_PUBLIC_PIN');}
   else desired[n]=v;
 }
 desired[privName]=prv.toString('base64');
 console.log(JSON.stringify({status:'P7_EXISTING_KEY_PAIR_VALIDATED',key:name,fingerprintSha256:fp,originalPublicPinJournalMatch:name!=='pre-lane-authority'}));
}
desired.P6_PHASE7_PRE_READBACK_ROLE='phase7_pre_reader_prod20261120';
const newNames=Object.keys(desired).filter(n=>!m.has(n));
if(m.size+newNames.length>100){console.log(JSON.stringify({status:'P7_KEY_STAGE_CAPACITY_HOLD',existing:m.size,additional:newNames.length}));process.exit(0)}
const statePath=d+'/phase6-final-key-staging-receipt.json',state=fs.existsSync(statePath)?JSON.parse(read(statePath)):{schema:'v39.phase7.final-key-staging-receipt.v1',installed:{}};
for(const [n,v] of Object.entries(desired)){
 need(live()===pin,'MAIN_MOVED');
 if(state.installed[n]){need(state.installed[n].valueSha256===h(v)&&state.installed[n].updatedAt===m.get(n),'STAGING_RECEIPT_DRIFT');continue;}
 need(!m.has(n),'UNKNOWN_PRIOR_VALUE_NO_OVERWRITE');
 gh(['secret','set',n,'-R',repo],v);m=inventory();
 need(typeof m.get(n)==='string','INSTALL_METADATA');
 state.installed[n]={valueSha256:h(v),updatedAt:m.get(n)};
 const tmp=statePath+'.'+crypto.randomBytes(6).toString('hex');fs.writeFileSync(tmp,JSON.stringify(state),{flag:'wx',mode:0o600});fs.renameSync(tmp,statePath);
 if(n.endsWith('PRIVATE_KEY_BASE64'))output.privateKeysStaged++;
 console.log('P7_EXISTING_KEY_OR_STATIC_VALUE_STAGED '+n);
}
console.log(JSON.stringify({...output,protectedNamesVerified:Object.keys(desired).length,privateKeyValuesReadBack:false,providerCalls:0,databaseWrites:0}));
JS
# List remaining secret names only, no values. No additional arming.
gh secret list -R "$REPO" --json name --jq '.[].name' | sort | grep -E '^(P6_PHASE7_|P6_NONPAID_|P6_PRIVATE_|P6_NATIVE_|V39_P5_)'
echo "P6_RUNTIME_BINDING_OWNER_COMMAND_COMPLETE"
echo "PRIVATE_FINAL_BUNDLE=$OUT"
echo "SOURCE_REMAINS_DISABLED"
echo "PAID_GO=false"
