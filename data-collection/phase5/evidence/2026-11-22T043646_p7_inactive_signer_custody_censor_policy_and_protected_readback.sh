#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
PIN="e058b9d0817151d4b10282c9242c6c8ebeef7814"
AUDIT_BRANCH="phase6/20261122-protected-final-readback-no-go"
AUDIT_HEAD="f839d00ecba53082625b06c6728ada0adbce6c20"
ROOT="$(pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
test -d "$ROOT/node_modules/pg"
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" = "$PIN"
test "$(gh api "repos/$REPO/git/ref/heads/$AUDIT_BRANCH" --jq '.object.sha')" = "$AUDIT_HEAD"
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS NODE_TLS_REJECT_UNAUTHORIZED
export ROOT PIN REPO
# Only trusted, fixed review checkpoint bytes; no actual flight data.
REVIEW_BLOB=beeb6d90162d7549b59d6ab3f39e73a41e8ce1be
gh api "repos/$REPO/git/blobs/$REVIEW_BLOB" --jq '.content' | base64 --decode > "$TMP/review.md"
test "$(git hash-object "$TMP/review.md")" = "$REVIEW_BLOB"
export P7_REVIEW_FILE="$TMP/review.md"
node --input-type=module <<'JS'
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
const home=fs.realpathSync(process.env.HOME),repo=process.env.REPO,main=process.env.PIN,root=process.env.ROOT;
const require=createRequire(root+'/package.json'),pg=require('pg');
const need=(x,s)=>{if(!x)throw Error('HOLD_P7_FINAL_COMMISSION_'+s)};
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
const hash=x=>sha(canonical(x));
const gh=(args,input)=>execFileSync('gh',args,{encoding:'utf8',input,stdio:[input===undefined?'ignore':'pipe','pipe','pipe'],timeout:45000,maxBuffer:2*1024*1024}).trim();
const live=()=>gh(['api','repos/'+repo+'/git/ref/heads/main','--jq','.object.sha']);
const inventory=()=>{const q=JSON.parse(gh(['api','repos/'+repo+'/actions/secrets?per_page=100']));need(q.total_count===q.secrets.length,'SECRET_BOUND');return new Map(q.secrets.map(x=>[x.name,x.updated_at]))};
const safeRead=f=>{const s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=2000000,'PRIVATE_FILE');return fs.readFileSync(f)};
const read=f=>JSON.parse(safeRead(f)),write=(f,b)=>fs.writeFileSync(f,b,{flag:'wx',mode:0o600});
const safeDir=d=>{const s=fs.lstatSync(d);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&fs.realpathSync(d)===d,'PRIVATE_DIRECTORY')};
const jwrite=(f,x)=>{const t=f+'.'+crypto.randomBytes(6).toString('hex');write(t,JSON.stringify(x));fs.renameSync(t,f)};
const bundleDir=home+'/.travnr-phase6-final-policies-e058b9d0',prePath=home+'/.travnr-phase6-pre-policy-20261122/pre-policy.json';
const bundle=read(bundleDir+'/bundle-receipt.json'),v=read(bundleDir+'/static-values-PRIVATE.json'),j=read(bundleDir+'/static-install-journal.json'),preRaw=safeRead(prePath),pre=JSON.parse(preRaw);
need(live()===main&&bundle.main===main&&bundle.staticValuesSha256==='a1637fa624ec3a85c3eb21b9f68f9978f078b4f9911197a5fcd640fdcfb1c66f'&&sha(JSON.stringify(v))===bundle.staticValuesSha256&&Object.keys(j.installed).length===31&&j.main===main&&sha(preRaw)==='8a9175f746d9ebfcc21deaa963b6b3d452d90e64f71d84061496bbbe4e6040ae','INSTALLED_BUNDLE');
let seen=inventory();
need(Object.keys(v).every(k=>j.installed[k]?.sha256===sha(v[k])&&j.installed[k].updatedAt===seen.get(k)),'STATIC_METADATA_DRIFT');
const mode=['P6_NONPAID_SOURCE_SCHEDULE_ENABLED','P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED','P6_PRIVATE_POST_PARENT_ENABLED','P6_NATIVE_LATER_RUNTIME_ENABLED','P6_NATIVE_POST_PRODUCER_ENABLED','P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED','P6_PRIVATE_T24_EXECUTION_ENABLED','P6_PRIVATE_LATER_ENROLL_ENABLED','P6_PRIVATE_T24_ENROLL_ENABLED','P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED','P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED','P5_CD_GH_PRE_SCHEDULE_ENABLED','P5_CD_GH_T24_SCHEDULE_ENABLED','P6_ROLLING_CONTROLLER_ENABLED','P5_AUTO_SOURCE_DISPATCH_ENABLED','P5_POST_AUTO_DISPATCH_ENABLED','P5_T24_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED','P6_T24_CUSTODY_ENABLED','P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED','P6_ROLLING_DIRECT_RECOVERY_ENABLED','P6_PHASE7_POST_RECOVERY_ENABLED','V39_PHASE6_PROCESS_ARMED','V39_PHASE6_OWNER_APPROVED'];
const stop=()=>{need(live()===main,'MAIN_MOVED');const a=JSON.parse(gh(['variable','list','-R',repo,'--json','name,value']));need(!a.some(x=>mode.includes(x.name)&&!['','0','false','OFF'].includes(x.value)),'ACTIVE_COLLECTION_VARIABLE')};
stop();
let u;try{u=new URL(process.env.DATABASE_URL??'')}catch{need(false,'OWNER_URL')}
need(u.username==='neondb_owner'&&u.pathname==='/neondb'&&u.hostname.endsWith('.neon.tech')&&['require','verify-full'].includes(u.searchParams.get('sslmode')),'OWNER_SCOPE');u.searchParams.set('sslmode','verify-full');
const c=new pg.Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000,options:'-c default_transaction_read_only=on'});
let db;try{
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 db=(await c.query("SELECT current_user actor,session_user login,current_database() db,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled) enabled,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE manifest_sha256 = $1 AND NOT enabled AND revoked_at_utc IS NULL) stage,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subs,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,(SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) policy,(SELECT count(*)::int FROM phase7_private.pre_fragment_v39) fragments,(SELECT count(*)::int FROM phase7_private.pre_source_link_v39) links,(SELECT count(*)::int FROM phase7_private.derived_release_bundle_v39) bundles,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39 WHERE kind::text LIKE 'PHASE7_%') signed_rows",[v.V39_P5_MANIFEST_SHA256])).rows[0];
 need(db.actor==='neondb_owner'&&db.login===db.actor&&db.db==='neondb'&&db.ro==='on'&&db.replica===false&&db.stage===1&&db.policy===1&&['enabled','subs','batches','incidents','fragments','links','bundles','signed_rows'].every(k=>db[k]===0),'DISABLED_UNUSED_P7_SCOPE');
 await c.query('ROLLBACK');
}finally{await c.end().catch(()=>{})}
console.log(JSON.stringify({status:'P7_DISABLED_STAGE_AND_ZERO_SIGNED_USE_PASS',fragments:db.fragments,links:db.links,bundles:db.bundles,signedRows:db.signed_rows,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
const keys=[['pre-proof','P6_PHASE7_PRE_PROOF_REVIEWER','P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64'],['post-outcome','P6_PHASE7_POST_OUTCOME_REVIEWER','P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64'],['pre-lane-authority','P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY','P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64']];
const oldNames=keys.slice(0,2).flatMap(([_,p])=>[p+'_FINGERPRINT_SHA256',p+'_PUBLIC_KEY_BASE64']);
const forbidden=new Set(['7639dcd0773f7b21e1194c91e19a941589ac361621a1cadd31edd10c832c7744','80d59db77bec734d4e34eb43ed8dfa92ceb220a1ef82a8f4a06a55a30e08b5b2','60538d4035f3bb3132cad7ccd2b459242e5fa9e949aea43cabe974bb29519e67','de37f2d4f8736cb92c04a31c94d3d252482667f937ce80a0f65b09df5293e733','4c0e85e2834b217eeeb3d96d8f350f6d5c844ea6b29cfa0fb449683db251846b','5d002b5a2cede6da00aab6d3b516aa4766f58858b252ba85e1c67049dd08d23f']);
const historical=home+'/.travnr-phase7-reviewer-keys-20261120',reissued=home+'/.travnr-phase7-reviewer-keys-reissued-e058b9d0';
const known=['pre-proof.private.pem','post-outcome.private.pem','pre-lane-authority.private.pem'];
// Search only exact known names and directory names, no private contents leave host.
const matches=execFileSync('find',[home,'-maxdepth','5','-xdev','(','-type','d','-name','.travnr-phase7-reviewer-keys-20261120','-o','-type','f','(','-name',known[0],'-o','-name',known[1],'-o','-name',known[2],')',')','-print'],{encoding:'utf8',timeout:25000,maxBuffer:256*1024,stdio:['ignore','pipe','pipe']}).split('\n').filter(Boolean).filter(f=>!f.startsWith(reissued+'/'));
const dirs=[...new Set(matches.map(f=>known.includes(path.basename(f))?path.dirname(f):f))];
need(dirs.length<=1,'AMBIGUOUS_OLD_CUSTODY');
let dir=dirs[0],kind=dir?'recovered-original':'reissued-unused',statePath,state;
const approvalNames=[...seen.keys()].filter(n=>n.startsWith('P6_PHASE7_')&&n.endsWith('_APPROVED'));
need(approvalNames.length===0,'EXISTING_APPROVAL_NAMES_RECONCILE');
const expectedNew=[...keys.flatMap(([_,p,k])=>[p+'_FINGERPRINT_SHA256',p+'_PUBLIC_KEY_BASE64',k]),'P6_PHASE7_PRE_READBACK_ROLE','P6_PHASE7_POST_CONTRACT_SHA256','P6_PHASE7_POST_PROFILE_SHA256','P6_PHASE7_POST_PRESERVATION_POLICY_BASE64','P6_PHASE7_POST_PRESERVATION_POLICY_SHA256'];
need(seen.size+expectedNew.filter(n=>!seen.has(n)).length<=100,'SECRET_CAPACITY');
if(dir){
 safeDir(dir);need(!fs.existsSync(reissued),'REISSUE_EXISTS_WITH_OLD_CUSTODY');
 const receipt=read(dir+'/public-pin-receipt.json');need(receipt.schema==='v39.phase7.inactive-owner-reviewer-public-pins.v1'&&receipt.repo===repo,'ORIGINAL_RECEIPT');
 statePath=dir+'/phase7-final-commissioning-journal.json';state=fs.existsSync(statePath)?read(statePath):{schema:'v39.phase7.final-commissioning-journal.v1',main,kind,previousPublicPinMetadata:Object.fromEntries(oldNames.map(n=>[n,seen.get(n)])),installed:{}};
 for(const [name,p] of keys.slice(0,2)){
  const pub=safeRead(dir+'/'+name+'.public.pem'),fp=sha(crypto.createPublicKey(pub).export({type:'spki',format:'der'}));
  for(const [n,value] of [[p+'_FINGERPRINT_SHA256',fp],[p+'_PUBLIC_KEY_BASE64',pub.toString('base64')]])need(receipt.installed[n]?.valueSha256===sha(value)&&receipt.installed[n].updatedAt===seen.get(n),'ORIGINAL_PUBLIC_PIN_DRIFT');
 }
}else{
 dir=reissued;statePath=dir+'/phase7-final-commissioning-journal.json';
 if(fs.existsSync(dir)){safeDir(dir);state=read(statePath)}
 else{
  // Prior November 20 receipt privately uploaded zero keys. No private
  // signer name or approval exists now; no active stage or signed data.
  // Only reissue the three never-activated P7 keys; six existing keys untouched.
  need(keys.every(([_,p,k])=>!seen.has(k))&&oldNames.every(n=>seen.has(n))&&!seen.has('P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256')&&!seen.has('P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64'),'OLD_SIGNER_USE_OR_UNEXPECTED_PIN');
  fs.mkdirSync(dir,{mode:0o700});safeDir(dir);
  state={schema:'v39.phase7.final-commissioning-journal.v1',main,kind,previousPublicPinMetadata:Object.fromEntries(oldNames.map(n=>[n,seen.get(n)])),installed:{}};
  for(const [name] of keys){const k=crypto.generateKeyPairSync('ed25519');write(dir+'/'+name+'.private.pem',k.privateKey.export({type:'pkcs8',format:'pem'}));write(dir+'/'+name+'.public.pem',k.publicKey.export({type:'spki',format:'pem'}))}
  write(statePath,JSON.stringify(state));
  console.log(JSON.stringify({status:'P7_THREE_PREVIOUSLY_UNUSED_SIGNERS_REISSUED',priorKeysRecovered:false,priorPrivateUploads:0,oldCustodyCandidates:0,privateKeysPrinted:false,databaseWrites:0,phase6PaidGo:false}));
 }
}
need(state.schema==='v39.phase7.final-commissioning-journal.v1'&&state.main===main&&state.kind===kind,'JOURNAL_SCOPE');
if(!fs.existsSync(statePath))write(statePath,JSON.stringify(state));
const desired={};for(const [name,p,k] of keys){const privateBytes=safeRead(dir+'/'+name+'.private.pem'),pubBytes=safeRead(dir+'/'+name+'.public.pem'),priv=crypto.createPrivateKey(privateBytes),pub=crypto.createPublicKey(pubBytes),der=pub.export({type:'spki',format:'der'}),fp=sha(der);
 need(priv.asymmetricKeyType==='ed25519'&&pub.asymmetricKeyType==='ed25519'&&crypto.createPublicKey(priv).export({type:'spki',format:'der'}).equals(der)&&!forbidden.has(fp),'KEY_IDENTITY');forbidden.add(fp);
 if(kind==='reissued-unused'||name==='pre-lane-authority'){desired[p+'_FINGERPRINT_SHA256']=fp;desired[p+'_PUBLIC_KEY_BASE64']=pubBytes.toString('base64')}
 desired[k]=privateBytes.toString('base64');
}
const review=sha(fs.readFileSync(process.env.P7_REVIEW_FILE));
const end=new Date(Math.min(Date.parse(pre.contract.researchExpiryUtc),Date.parse('2027-01-31T00:00:00.000Z'))).toISOString();
need(hash(pre.review)===pre.reviewSha256&&pre.reviewSha256==='ddcdedc1553585813b3322db3635ec7803ebb6ca8308e3b8f924ef5f6a34a3e8'&&pre.review.manifestSha256===v.V39_P5_MANIFEST_SHA256&&pre.review.rightsSha256===v.V39_P5_RIGHTS_SHA256&&hash(pre.contract)===pre.review.contractSha256&&hash(pre.profile)===pre.review.profileSha256&&Date.parse(end)>Date.parse('2026-12-29T04:00:00.000Z'),'PRE_POST_CONTRACT');
const p={schema:'v39.phase7.independent-post-settlement-policy.v1',manifestSha256:v.V39_P5_MANIFEST_SHA256,rightsSha256:v.V39_P5_RIGHTS_SHA256,prePolicySha256:pre.reviewSha256,contractSha256:hash(pre.contract),profileSha256:hash(pre.profile),nativePostPolicySha256:v.P6_NATIVE_POST_POLICY_SHA256,validFromUtc:'2026-11-22T00:00:00.000Z',validUntilUtc:end,unverifiedLabelDisposition:'CENSOR_AFTER_REVIEWED_POST_OBSERVATION',independentBoundedSettlementApproved:true,sourceParityReviewSha256:review,reconstructionReviewSha256:pre.profile.derivedWorkReviewSha256,fieldReviewSha256:pre.review.dispositionsSha256,associationReviewSha256:review,continuousTargetReviewSha256:review,minTargetMinutes:-60,maxTargetMinutes:1440};
need(Object.entries(p).filter(([k])=>k.endsWith('Sha256')).every(([_,x])=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)),'POST_POLICY_DIGESTS');
const policy=Buffer.from(JSON.stringify(p)),policyPath=dir+'/post-censor-only-policy.json';
if(fs.existsSync(policyPath))need(safeRead(policyPath).equals(policy),'P7_POLICY_LOCAL_DRIFT');else write(policyPath,policy);
Object.assign(desired,{P6_PHASE7_PRE_READBACK_ROLE:'phase7_pre_reader_prod20261120',P6_PHASE7_POST_CONTRACT_SHA256:p.contractSha256,P6_PHASE7_POST_PROFILE_SHA256:p.profileSha256,P6_PHASE7_POST_PRESERVATION_POLICY_BASE64:policy.toString('base64'),P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:sha(policy)});
let written=0;
for(const [n,value] of Object.entries(desired)){
 need(live()===main,'MAIN_CHANGED');seen=inventory();
 if(state.installed[n]){need(state.installed[n].sha256===sha(value)&&state.installed[n].updatedAt===seen.get(n),'JOURNAL_METADATA_DRIFT');continue}
 const replace=kind==='reissued-unused'&&oldNames.includes(n)&&seen.get(n)===state.previousPublicPinMetadata[n];
 need(!seen.has(n)||replace,'UNEXPECTED_EXISTING_VALUE_'+n);
 gh(['secret','set',n,'-R',repo],value);seen=inventory();need(seen.has(n),'WRITE_METADATA');
 state.installed[n]={sha256:sha(value),updatedAt:seen.get(n)};jwrite(statePath,state);written++;console.log('P7_PROTECTED_VALUE_STAGED '+n);
}
stop();seen=inventory();need(Object.keys(desired).every(n=>state.installed[n]?.updatedAt===seen.get(n)),'FINAL_INSTALL_METADATA');
console.log(JSON.stringify({status:'P7_CENSOR_POLICY_AND_SIGNER_PROTECTED_METADATA_PASS_NO_GO',keyMode:kind,written,journalVerified:Object.keys(desired).length,contractSha256:p.contractSha256,profileSha256:p.profileSha256,postPolicySha256:sha(policy),nativePostPolicySha256:p.nativePostPolicySha256,repoSecrets:seen.size,privateCustodyDirectory:dir,actualObservationSigned:false,numericalLabelsCertified:false,approvalFlagsChanged:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
JS
# Dispatch one detached, exact reviewed no-provider/no-write workflow.
# Its jobs receive only step-scoped secret values; no source/paid authority.
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" = "$PIN"
test "$(gh api "repos/$REPO/git/ref/heads/$AUDIT_BRANCH" --jq '.object.sha')" = "$AUDIT_HEAD"
# Do not replay an already acknowledged protected readback of this exact audit head.
API="repos/$REPO/actions/workflows/phase6-private-transport-two-login-readonly-manual.yml/runs?event=workflow_dispatch&branch=$AUDIT_BRANCH&per_page=100"
find_readback() {
 gh api "$API" --jq ".workflow_runs[] | select(.head_sha==\"$AUDIT_HEAD\" and .run_attempt==1) | .id"
}
mapfile -t EXISTING < <(find_readback)
if [ "${#EXISTING[@]}" -gt 1 ]; then echo 'HOLD_MULTIPLE_PROTECTED_READBACK_RUNS_NO_REPLAY'; exit 2; fi
if [ "${#EXISTING[@]}" = 1 ]; then RID="${EXISTING[0]}"; else
 gh workflow run phase6-private-transport-two-login-readonly-manual.yml -R "$REPO" --ref "$AUDIT_BRANCH" -f confirm=VERIFY_EXACT_FINAL_STATIC_AND_REVIEWER_ACTORS_NO_PROVIDER_NO_WRITE -f approved_main_sha="$PIN"
 RID=""
 for _ in $(seq 1 40); do
  mapfile -t MATCHES < <(find_readback)
  [ "${#MATCHES[@]}" -le 1 ] || { echo 'HOLD_MULTIPLE_PROTECTED_READBACK_RUNS_NO_REPLAY'; exit 2; }
  if [ "${#MATCHES[@]}" = 1 ]; then RID="${MATCHES[0]}"; break; fi
  sleep 2
 done
fi
[[ "$RID" =~ ^[0-9]+$ ]] || { echo 'HOLD_PROTECTED_READBACK_ACK_UNKNOWN_NO_REPLAY'; exit 2; }
echo "P7_PROTECTED_READBACK_RUN=$RID"
if gh run watch "$RID" -R "$REPO" --exit-status; then
 echo "P7_PROTECTED_READBACK_WORKFLOW_SUCCESS=$RID"
else
 echo "HOLD_P7_PROTECTED_READBACK_RUN_REQUIRES_EXACT_JOB_REVIEW=$RID"
 exit 2
fi
echo SOURCE_REMAINS_DISABLED
echo PAID_GO=false
