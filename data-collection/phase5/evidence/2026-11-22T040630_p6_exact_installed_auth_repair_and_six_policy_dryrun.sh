#!/usr/bin/env bash
# Repair only the scoped SOURCE authorization and validate final policies
# against the already installed stage. No source enable, paid arm or DB write.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
RELAY=HKcode22/TravnrClockRelay
PIN=27074feda386247c4faf3877bd5349e696cde8a9
RELAY_PIN=046d89d341fa9f24524ea11e2778e273e3f39533
STAGE="$HOME/.travnr-phase6-monday-795ace55"
REC="$HOME/.travnr-phase6-six-policy-exact-recovered-27074fed"
OLD_AUTH="$HOME/.travnr-phase6-source-auth-20261122/auth.json"
PRE="$HOME/.travnr-phase6-pre-policy-20261122/pre-policy.json"
RUNTIME="$(pwd -P)/node_modules"
ROOT="$HOME/.travnr-phase6-source-auth-exact-repaired-27074fed"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
hold(){ echo "HOLD_P6_EXACT_AUTH_REPAIR_$1" >&2; exit 2; }
remote(){ gh api "repos/$1/git/ref/heads/main" --jq '.object.sha'; }
sha(){ sha256sum "$1" | awk '{print $1}'; }
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
test "$(remote "$RELAY")" = "$RELAY_PIN" || hold RELAY_MOVED
test -x "$RUNTIME/.bin/tsx" || hold EXISTING_RUNTIME
test -n "${DATABASE_URL:-}" || hold EXISTING_OWNER_DATABASE_URL
test "$(sha "$OLD_AUTH")" = 8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297 || hold OLD_AUTH_HASH
test "$(sha "$PRE")" = 8a9175f746d9ebfcc21deaa963b6b3d452d90e64f71d84061496bbbe4e6040ae || hold PRE_HASH
test "$(sha "$STAGE/new-stage-input.json")" = 8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc || hold STAGE_HASH
test "$(sha "$REC/policy-complete-shape-NOT-RUNTIME.json")" = 7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e || hold WORKPAPER_HASH
test "$(sha "$REC/airport-timezone-catalog-CANDIDATE.json")" = 4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534 || hold CATALOG_HASH
test "$(sha "$REC/public-provider-contract-CANDIDATE.json")" = 63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09 || hold CONTRACT_HASH
KEY="${AERODATABOX_API_KEY:-}"
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS NODE_TLS_REJECT_UNAUTHORIZED
mkdir -m 700 -p "$ROOT"
test -d "$ROOT" && test ! -L "$ROOT" && test "$(stat -c '%a' "$ROOT")" = 700 || hold PRIVATE_DIR
gh repo clone "$REPO" "$TMP/repo" -- --filter=blob:none --no-checkout
cd "$TMP/repo"
git checkout --detach "$PIN"
ln -s "$RUNTIME" node_modules
test "$(git rev-parse HEAD)" = "$PIN"
test "$(remote "$REPO")" = "$PIN"
# Current actual STOP variables, not secret values. Existing committed STOP
# secret attestations and published receiver review remain the adopted basis.
gh variable list -R "$REPO" --json name,value > "$TMP/vars.json"
node --input-type=module - "$TMP/vars.json" <<'JS'
import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const mode=['P6_NONPAID_SOURCE_SCHEDULE_ENABLED','P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED','P6_PRIVATE_POST_PARENT_ENABLED','P6_NATIVE_LATER_RUNTIME_ENABLED','P6_NATIVE_POST_PRODUCER_ENABLED','P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED','P6_PRIVATE_T24_EXECUTION_ENABLED','P6_PRIVATE_LATER_ENROLL_ENABLED','P6_PRIVATE_T24_ENROLL_ENABLED','P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED','P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED','P5_CD_GH_PRE_SCHEDULE_ENABLED','P5_CD_GH_T24_SCHEDULE_ENABLED','P6_ROLLING_CONTROLLER_ENABLED','P5_AUTO_SOURCE_DISPATCH_ENABLED','P5_POST_AUTO_DISPATCH_ENABLED','P5_T24_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_AUTO_DISPATCH_ENABLED','P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED','P6_T24_CUSTODY_ENABLED','P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED','P6_ROLLING_DIRECT_RECOVERY_ENABLED','P6_PHASE7_POST_RECOVERY_ENABLED'];
const active=a.filter(x=>mode.includes(x.name)&&!['','0','false','OFF'].includes(x.value)).map(x=>x.name);
if(active.length){console.log(JSON.stringify({status:'HOLD_P6_ACTIVE_MODE_VARIABLES',names:active}));process.exit(2)}
console.log(JSON.stringify({status:'P6_ACTUAL_COLLECTION_MODE_VARIABLES_INACTIVE',checked:mode.length,secretValueReadback:false,providerPaidGets:0,phase6PaidGo:false}));
JS
# One fresh free account observation. No paid GET or provider mutation.
if [ ! -f "$ROOT/fresh-account.json" ]; then
  test -n "$KEY" || hold EXISTING_PROVIDER_KEY_NOT_IN_ENV
  env -u DATABASE_URL -u V39_DATABASE_RUNTIME_URL -u RAPIDAPI_KEY -u AERODATABOX_WEBHOOK_SECRET \
    AERODATABOX_API_KEY="$KEY" node review-tools/p6_launch_free_account_prearm_current_v39.mjs > "$TMP/account.json"
  mv "$TMP/account.json" "$ROOT/fresh-account.json"
fi
unset KEY
# Exact reviewed objects (no private bytes fetched from GitHub).
for spec in \
  '3f20569309057ca818d433e271d7771983e60e0c scope.md' \
  '2155629d90b522bbd5defb7a195697bc2e0a91c8 pre-receipt.md' \
  'cf9463ae4c078cf178acd350fbe510cd4d371591 assembler.cjs' \
  '34156ac65811165c0d217e7175f8643eeef55761 validator.cjs'; do
 read -r blob name <<< "$spec"
 gh api "repos/$REPO/git/blobs/$blob" --jq '.content' | base64 --decode > "$TMP/$name"
 test "$(git hash-object "$TMP/$name")" = "$blob" || hold ARCHIVE_BLOB
done
# Import actual compiler and BOTH production authorization verifiers. Validate
# a candidate ledger in memory before any branch/PR mutation.
node --import tsx --input-type=module - "$ROOT" "$STAGE" "$REC" "$OLD_AUTH" "$PRE" "$TMP" <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {verifyP6SourceEnableAuthFile,verifyP6SourceEnableAuthBytes,P6_SOURCE_RELEASE_EVIDENCE_HASH_FIELDS} from './scripts/v39_phase6_source_enable_approval_ledger_v39.ts';
import {admitP6InertOwnerReadback} from './scripts/v39_phase6_inert_release_stage_manual_v39.mjs';
import {verifyP6SourceActivationReview,p6SourceAuthorizationStageContentSha} from './scripts/v39_phase6_enable_source_owner_v39.ts';
import {compileP5V0093CostOnlySevenRestReview} from './server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs';
import {verifyP6MondayRevisedExecutableBridge,P6_MONDAY_BRIDGE_REVIEW_PATH} from './scripts/v39_phase6_revised_stage_executable_bridge_v39.ts';
import {bindMondayPolicyStage,buildRevisedStaticValues} from './review-tools/p6_nov20_finalize_recovered_policies_v39.ts';
const [root,stageDir,rec,oldPath,prePath,tmp]=process.argv.slice(2);
const main='27074feda386247c4faf3877bd5349e696cde8a9';
const H=/^[0-9a-f]{64}$/,sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=x=>sha(JSON.stringify(x));
const raw=f=>fs.readFileSync(f),read=f=>JSON.parse(raw(f)),need=(x,s)=>{if(!x)throw Error('HOLD_P6_EXACT_AUTH_REPAIR_'+s)};
const git=(args)=>execFileSync('git',args,{maxBuffer:4*1024*1024,timeout:30000});
const gitRaw=(p)=>git(['show',main+':'+p]);
const cmd=args=>git(args).toString('utf8').trim();
const ancestor=(a,b)=>{try{git(['merge-base','--is-ancestor',a,b]);return true}catch{return false}};
const diff=h=>cmd(['diff','--no-renames','--name-only',s.codeSha40,h]).split('\n').filter(Boolean);
const ledgerPath='data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json',historyPath='data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md';
const old=verifyP6SourceEnableAuthFile(oldPath,main),oldRel=old.record.releaseActivation;
need(old.verdict.verified&&old.artifactHash==='8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297'&&old.record.authorizationId==='AUTH-20261122-P6SOURCE','OLD_APPROVAL');
const stageRaw=raw(stageDir+'/new-stage-input.json').toString('utf8'),s=JSON.parse(stageRaw),cost='cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9';
const ctx=admitP6InertOwnerReadback({...process.env,V39_P5_APPROVED_CODE_SHA:s.codeSha40},stageRaw,sha(stageRaw),cost,s.codeSha40);
const compiled=compileP5V0093CostOnlySevenRestReview(ctx.input,ctx.review,ctx.freezeReview);
const bind=bindMondayPolicyStage(stageRaw,raw(stageDir+'/new-manifest.json').toString('utf8'),raw(stageDir+'/new-config.json').toString('utf8'),raw(stageDir+'/new-external.json'),raw(stageDir+'/new-timing.json'));
need(compiled.staged.authorizationId==='AUTH-20261119-P5INERTFREEZE'&&compiled.cost.costOnlyCategoryDraftSha256===cost&&bind.costSha===cost&&s.predecessorEvidenceIds.length===27,'INSTALLED_AUTH_SCOPE');
const contentSha=p6SourceAuthorizationStageContentSha(s);
console.log(JSON.stringify({status:'P6_OLD_AUTH_MISMATCH_EXACT_DIAGNOSTIC',oldAuthorizationId:old.record.authorizationId,installedAuthorizationId:compiled.staged.authorizationId,oldPredecessorCount:old.record.predecessorEvidenceIds.length,installedPredecessorCount:s.predecessorEvidenceIds.length,oldCostDigestType:typeof oldRel.costEnvelopeSha256,oldCostDigestLength:typeof oldRel.costEnvelopeSha256==='string'?oldRel.costEnvelopeSha256.length:null,oldCostExact:oldRel.costEnvelopeSha256===cost,oldStageContentExact:oldRel.stageContentSha256===contentSha,phase6PaidGo:false}));
const account=read(root+'/fresh-account.json'),observed=Date.parse(account.observedAtUtc),now=new Date(),deadline=Date.parse('2026-11-23T23:10:00.000Z');
const validity=Math.min(observed+6*3600000,deadline);
need(account.status==='FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER'&&account.providerFreeReads===3&&account.providerPaidGets===0&&account.providerMutations===0&&account.databaseWrites===0&&account.balancesStable===true&&account.activeBillableSubscriptions===0&&account.apiUnitsLimit===60000&&Number.isSafeInteger(account.apiUnitsRemaining)&&account.apiUnitsRemaining>=36740+1000&&Number.isSafeInteger(account.alertCreditsRemaining)&&account.alertCreditsRemaining>=1000&&observed<=now.getTime()&&now.getTime()<validity&&account.phase6PaidGo===false,'FRESH_ACCOUNT_OR_BUDGET');
const observedIso=new Date(observed).toISOString(),stamp=observedIso.replace(/[-:.]/g,''),id='RUN-'+observedIso.slice(0,10).replaceAll('-','')+'-P6FRESH'+stamp.slice(9,18).replace(/[^0-9]/g,'');
const receiptPath='data-collection/phase5/evidence/'+stamp+'_P6_FRESH_FREE_ACCOUNT_NO_PAID_GO.json';
const receiptRaw=Buffer.from(JSON.stringify(account,null,2)+'\n');
const ledger=JSON.parse(gitRaw(ledgerPath));
const previous=[...s.predecessorEvidenceIds,...old.record.predecessorEvidenceIds.filter(x=>!s.predecessorEvidenceIds.includes(x)),id];
need(new Set(previous).size===previous.length&&previous.length<=128&&!ledger.evidence.some(x=>x.evidenceId===id)&&!ledger.approvals.some(x=>x.authorizationId===compiled.staged.authorizationId),'CANDIDATE_LEDGER_SCOPE');
const evidence=Object.fromEntries(P6_SOURCE_RELEASE_EVIDENCE_HASH_FIELDS.map(k=>[k,oldRel[k]]));
need(Object.values(evidence).every(v=>H.test(v)),'ADOPTED_FIVE_EVIDENCE_HASHES');
const candidate={authorizationId:compiled.staged.authorizationId,phaseGate:old.record.phaseGate,airportFilterWindow:old.record.airportFilterWindow,maxAlertCredits:compiled.staged.alertSafety.alertRunSpendCeilingCredits,maxRestUnitsByCategory:Object.fromEntries(compiled.cost.categoryCaps.map(x=>[x.category,x.ceilingUnits])),startNotBeforeUtc:observedIso,expiresAtUtc:new Date(deadline).toISOString(),cleanupOwner:typeof old.record.cleanupOwner==='string'&&old.record.cleanupOwner.trim().length>=6?old.record.cleanupOwner:'HKcode22 existing owner STOP and cleanup',predecessorEvidenceIds:previous,releaseActivation:{schema:'v39.phase6.exact-source-activation-review.v1',stageContentSha256:contentSha,costEnvelopeSha256:cost,...evidence,independentScientificFreezeApproved:true,independentSourceUseApproved:true,independentOperationalReleaseApproved:true,currentAccountAndBudgetApproved:true,legacyPublishedAutoCollectVerifiedOff:true,githubPaidDispatchFlagsVerifiedOff:true,activeBillableSubscriptionsVerifiedZero:true,separatePaidDispatchStillRequired:true,legacyAlertStartApproved:false,accountObservedAtUtc:observedIso,accountEvidenceValidUntilUtc:new Date(validity).toISOString()}};
const candidateRaw=Buffer.from(JSON.stringify(candidate,null,2)+'\n'),artifact=sha(candidateRaw);
ledger.evidence.push({evidenceId:id,path:receiptPath,sha256:sha(receiptRaw)});
ledger.approvals.push({authorizationId:candidate.authorizationId,artifactSha256:artifact,predecessorEvidenceIds:previous});
const ledgerRaw=Buffer.from(JSON.stringify(ledger,null,2)+'\n');
const verified=verifyP6SourceEnableAuthBytes(candidateRaw,ledgerRaw,gitRaw(historyPath),p=>p===receiptPath?receiptRaw:gitRaw(p),now);
const full=verifyP6SourceActivationReview(ctx,verified,now);
need(verified.verdict.verified&&full.authId===candidate.authorizationId&&full.artifactSha256===artifact,'ACTUAL_FULL_ACTIVATION_VERIFIER');
const bridgeRaw=gitRaw(P6_MONDAY_BRIDGE_REVIEW_PATH),bridge=JSON.parse(bridgeRaw),reviewed=bridge.reviewedExecutableCommit;
const bridgeResult=verifyP6MondayRevisedExecutableBridge({stageCode:s.codeSha40,stageSha:sha(stageRaw),costSha:cost,currentHead:main,reviewBytes:bridgeRaw,expectedOperationalEvidenceSha256:evidence.operationalReleaseEvidenceSha256,now,stageIsAncestor:ancestor(s.codeSha40,main),reviewedCommitIsAncestor:ancestor(s.codeSha40,reviewed)&&ancestor(reviewed,main),reviewedDiff:diff(reviewed),currentDiff:diff(main),readReviewedBlob:p=>cmd(['ls-tree',reviewed,'--',p]).split('\t')[0],readCurrentBlob:p=>cmd(['ls-tree',main,'--',p]).split('\t')[0]},stageRaw,contentSha,cost);
need(bridgeResult.stageCode===s.codeSha40,'EXACT_BRIDGE');
for(const f of bind.result.files.slice(0,31))need(sha(gitRaw(f.path))===f.sha256,'EXACT_COMMITTED_DAY_PLANS');
// Mechanical six-policy assembly is exercised BEFORE main ever changes.
const require=createRequire(process.cwd()+'/package.json'),assembler=require(tmp+'/assembler.cjs'),validator=require(tmp+'/validator.cjs');
const rightsPath='data-collection/phase5/evidence/2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md',builder='server/lib/disruption/phase5IndependentLaterPrePacketCompletion_v39.ts';
const pre=read(prePath);
need(pre.review.manifestSha256===s.manifestSha256&&pre.review.rightsSha256===evidence.sourceRightsEvidenceSha256&&sha(gitRaw(rightsPath))===evidence.sourceRightsEvidenceSha256,'EXISTING_PRE_RIGHTS');
const reviewedAtUtc=now.toISOString(),flags=assembler.FLAGS,releaseSha=sha(raw(tmp+'/scope.md'));
const decision={schema:'v39.phase5.final-six-policy-binding-decisions.v1',phase6PaidGo:false,authorizationId:candidate.authorizationId,authArtifactSha256:artifact,reviewedMainSha:main,manifestSha256:s.manifestSha256,configSha256:s.configSha256,rightsSha256:evidence.sourceRightsEvidenceSha256,costSha256:cost,reviewedBy:'Owner-delegated technical review (not independent human)',reviewedAtUtc,decisions:Object.fromEntries(flags.map(k=>[k,true])),releaseSha256:releaseSha,externalContentUseReviewSha256:evidence.sourceRightsEvidenceSha256,builderSha256:sha(gitRaw(builder)),runAndRetentionEvidenceSha256:sha(raw(tmp+'/pre-receipt.md')),selectedTArtifactHash:sha(raw(rec+'/public-provider-contract-CANDIDATE.json')),selectedTSemanticsEvidenceSha256:sha(gitRaw('data-collection/phase5/2026-11-16_FINAL_EXIT_SCIENCE_AND_COMMISSIONING_CROSSWALK.md')),t24CustodyPolicySha256:releaseSha,reviewedProviderPriceSha256:sha(gitRaw('data-collection/phase5/evidence/2026-11-19_current_marketplace_fids_range_cost_NOT_RIGHTS_NO_GO.json')),externalPostContentsAndBudgetEvidenceSha256:releaseSha,validFromUtc:'2026-11-22T00:00:00.000Z',validUntilUtc:'2027-01-31T00:00:00.000Z',builderFrozenAtUtc:new Date(cmd(['log','-1','--format=%cI','--',builder])).toISOString(),selectedTVersion:'AeroDataBox-OpenAPI-1.15.4.0-native-scheduled-departure',standaloneNoT24ProtocolSha256:null};
need(assembler.HASHES.every(k=>H.test(decision[k]??'')),'REVIEW_HASH_TYPES');
const p={authVerified:true,authorizationId:candidate.authorizationId,authArtifactSha256:artifact,codeSha:main,manifestSha256:s.manifestSha256,calendarSha256:s.calendarSha256,configSha256:s.configSha256,frameSha256:s.frameSha256,rightsSha256:evidence.sourceRightsEvidenceSha256,providerContractSha256:decision.selectedTArtifactHash,costSha256:cost,releaseSha256:releaseSha,dayPlanSha256s:bind.result.summary.dayPlanSha256s,airportTimezoneCatalogSha256:'4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534',dailyRestCeiling:1900,cycleRestCeiling:s.slotBudgetInput.cycleRestCeilingUnits,minimumProtectedFloor:s.slotBudgetInput.protectedRestFloorUnits,maxQueriesPerDay:288,nowUtc:reviewedAtUtc,outcomeTailUtc:bind.outcomeTailUtc};
const ops={hash,publicFingerprint:pem=>{const k=crypto.createPublicKey(pem);need(k.asymmetricKeyType==='ed25519','SIGNER_TYPE');return sha(k.export({type:'spki',format:'der'}))},byteLength:Buffer.byteLength};
const w=assembler.assemble(read(rec+'/policy-complete-shape-NOT-RUNTIME.json'),p,decision,ops),checked=validator.validateFinalPolicies(w,p,ops),v=buildRevisedStaticValues(p,w,stageRaw,decision.reviewedProviderPriceSha256,bind);
need(Object.keys(v).length===31&&checked.policyCount===6,'SIX_STATIC_DRY_RUN');
const inventory=JSON.parse(execFileSync('gh',['api','repos/HKcode22/ReplitTranvr/actions/secrets?per_page=100'],{encoding:'utf8',timeout:30000}));
need(inventory.total_count===inventory.secrets.length,'SECRET_INVENTORY_COMPLETE');
const present=new Set(inventory.secrets.map(x=>x.name)),missing=Object.keys(v).filter(n=>!present.has(n));
const summary={status:'P6_EXACT_AUTH_LEDGER_AND_FULL_ACTIVATION_PREFLIGHT_PASS_NO_GO',authorizationId:candidate.authorizationId,authArtifactSha256:artifact,stageContentSha256:contentSha,costEnvelopeSha256:cost,predecessors:previous.length,categoryCaps:candidate.maxRestUnitsByCategory,accountObservedAtUtc:observedIso,accountEvidenceValidUntilUtc:new Date(validity).toISOString(),apiUnitsRemaining:account.apiUnitsRemaining,alertCreditsRemaining:account.alertCreditsRemaining,plansVerified:31,policyCount:6,staticValuesDryRun:31,staticSecretCount:present.size,missingStaticSecretCount:missing.length,staticWithinGitHubCapacity:present.size+missing.length<=100,providerPaidGets:0,databaseWrites:0,phase6PaidGo:false};
const save=(p,b)=>{try{fs.writeFileSync(p,b,{flag:'wx',mode:0o600})}catch(e){if(e.code!=='EEXIST'||!raw(p).equals(Buffer.from(b)))throw e}};
save(root+'/auth.json',candidateRaw);save(root+'/candidate-ledger.json',ledgerRaw);save(root+'/candidate-account-evidence.json',receiptRaw);
const checkpointPath='data-collection/phase5/evidence/'+stamp+'_P6_EXACT_SOURCE_AUTH_CORRECTION_PREFLIGHT_NO_GO.json';
const checkpoint={schema:'v39.phase6.exact-auth-repair-preflight-receipt.v1',observedAtUtc:observedIso,baseMain:main,existingOldApprovalRetained:true,oldArtifactCannotActivateInstalledStage:true,reviewBasis:'Owner-delegated technical review (not independent human); previously committed five approval decisions preserved; fresh actual free account receipt appended; no source enable or paid GO',...summary};
const checkpointRaw=Buffer.from(JSON.stringify(checkpoint,null,2)+'\n');
save(root+'/checkpoint.json',checkpointRaw);
save(root+'/publish-metadata.json',JSON.stringify({receiptPath,checkpointPath,branch:'phase6/'+stamp+'-exact-source-auth-repair',artifact,ledgerPath}));
console.log(JSON.stringify(summary));
console.log(JSON.stringify({status:'P6_SIX_POLICY_DRY_ASSEMBLY_VALIDATED',policyDigests:checked.policyDigests,staticCount:31,baseMain:main,staticInstalled:false,phase6PaidGo:false}));
JS
# GitHub evidence only; never upload private AUTH/policy/keys or DB URLs.
# Verify count and type of the exact three paths, then publish an auditable
# PR for the corrected authorization ledger. No merge while CI unverified.
PUBLISH="$ROOT/publish-metadata.json"
BRANCH="$(node -p "require(process.argv[1]).branch" "$PUBLISH")"
RECEIPT="$(node -p "require(process.argv[1]).receiptPath" "$PUBLISH")"
CHECKPOINT="$(node -p "require(process.argv[1]).checkpointPath" "$PUBLISH")"
LEDGER="$(node -p "require(process.argv[1]).ledgerPath" "$PUBLISH")"
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
test "$LEDGER" = data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json
[[ "$RECEIPT" =~ ^data-collection/phase5/evidence/[0-9]{8}T[0-9]{9}Z_P6_FRESH_FREE_ACCOUNT_NO_PAID_GO\.json$ ]] || hold RECEIPT_PATH
[[ "$CHECKPOINT" =~ ^data-collection/phase5/evidence/[0-9]{8}T[0-9]{9}Z_P6_EXACT_SOURCE_AUTH_CORRECTION_PREFLIGHT_NO_GO\.json$ ]] || hold CHECKPOINT_PATH
git switch -c "$BRANCH"
cp "$ROOT/candidate-ledger.json" "$LEDGER"
cp "$ROOT/candidate-account-evidence.json" "$RECEIPT"
cp "$ROOT/checkpoint.json" "$CHECKPOINT"
git add -- "$LEDGER" "$RECEIPT" "$CHECKPOINT"
test "$(git diff --cached --name-only | wc -l | tr -d ' ')" = 3 || hold ONLY_THREE_REVIEW_METADATA_FILES
git diff --cached --check
git -c user.name='Travnr owner commissioning' -c user.email='HKcode22@users.noreply.github.com' commit -m "Bind exact installed Phase 6 AUTH and fresh free account receipt (NO PAID GO)"
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin "HEAD:refs/heads/$BRANCH"
PR_URL="$(gh pr create -R "$REPO" --base main --head "$BRANCH" \
  --title "Phase 6: exact installed SOURCE AUTH identity and fresh account binding (NO GO)" \
  --body "Only scoped ledger and two sanitized receipts. Exact stage ID, 27 original ordered predecessors extended by the adopted five release decisions and genuine fresh free account observation; actual full activation and bridge preflight, six policy dry assembly and 31 static names validated. No private AUTH bytes, no code change, no source enable, paid dispatch, provider paid GET or DB write. Old approval preserved historically; current stage is untouched.")"
echo "$PR_URL"
echo "P6_EXACT_AUTH_REPAIR_PR_CREATED_NO_GO"
echo "P6_CORRECTED_PRIVATE_AUTH=$ROOT/auth.json"
echo "P6_CORRECTED_AUTH_SHA=$(sha "$ROOT/auth.json")"
echo "P6_REVIEW_BRANCH=$BRANCH"
echo "SOURCE_REMAINS_DISABLED"
echo "PAID_GO=false"

# Bulk continuation: one evidence-only merge, no executable drift, then
# current-main due-only retention backstop, direct-readonly clock, exact statics.
HEAD="$(git rev-parse HEAD)"
TREE="$(git rev-parse HEAD^{tree})"
test "$(gh pr view "$PR_URL" -R "$REPO" --json headRefOid --jq '.headRefOid')" = "$HEAD"
test "$(remote "$REPO")" = "$PIN"
wait_offline(){
 local commit="$1" run="" count
 for _ in $(seq 1 36); do
  gh run list -R "$REPO" --commit "$commit" --limit 50 --json databaseId,headSha,workflowName --jq ".[] | select(.headSha==\"$commit\" and .workflowName==\"V3.9 Offline Safety\") | .databaseId" > "$TMP/offline-run"
  count="$(wc -l < "$TMP/offline-run" | tr -d ' ')"
  [ "$count" -le 1 ] || return 2
  if [ "$count" = 1 ]; then run="$(cat "$TMP/offline-run")"; break; fi
  sleep 5
 done
 [[ "$run" =~ ^[0-9]+$ ]] || return 2
 gh run watch "$run" -R "$REPO" --exit-status >&2
 printf '%s\n' "$run"
}
PR_CI="$(wait_offline "$HEAD")" || hold PR_OFFLINE_NOT_PASS
echo "P6_AUTH_PR_OFFLINE_PASS=$PR_CI"
gh pr checks "$PR_URL" -R "$REPO" --watch --fail-fast
test "$(remote "$REPO")" = "$PIN" || hold MAIN_MOVED
test "$(gh pr view "$PR_URL" -R "$REPO" --json headRefOid --jq '.headRefOid')" = "$HEAD"
gh pr merge "$PR_URL" -R "$REPO" --merge --match-head-commit "$HEAD"
git fetch origin main
NEW="$(remote "$REPO")"
test "$NEW" = "$(git rev-parse origin/main)"
test "$NEW" = "$(gh pr view "$PR_URL" -R "$REPO" --json mergeCommit --jq '.mergeCommit.oid')"
test "$(git rev-parse "$NEW^{tree}")" = "$TREE" || hold MERGED_TREE_DRIFT
echo "P6_CORRECTED_LEDGER_MERGED_MAIN=$NEW"

# Rebind only already-enabled retention controls to the exact reviewed tree.
# All SOURCE and paid controls remain STOPPED; no retention mode is disabled.
var(){ gh variable get "$1" -R "$2"; }
test "$(var P5_PRIMARY_FIDS_EXPIRY_ENABLED "$REPO")" = true
test "$(var P5_PRIMARY_FIDS_EXPIRY_APPROVAL "$REPO")" = APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
test "$(var P5_PRIMARY_FIDS_BACKSTOP_ENABLED "$REPO")" = true
test "$(var P6_FULL_RETENTION_BACKSTOP_ENABLED "$REPO")" = true
test "$(var P6_PRIVATE_EPOCH_EXPIRY_MODE "$REPO")" = APPLY_DUE_ONLY
test "$(var P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256 "$REPO")" = a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e
test "$(var P6_PRIVATE_EPOCH_EXPIRY_APPROVAL "$REPO")" = APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER
test "$(var P7_EXPIRY_ENABLED "$REPO")" = true
test "$(var P7_EXPIRY_APPROVAL "$REPO")" = APPLY_P7_DUE_ONLY_NO_PROVIDER
test "$(var P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$REPO")" = "$PIN"
test "$(var P7_EXPIRY_APPROVED_MAIN_SHA "$REPO")" = "$PIN"
test "$(remote "$REPO")" = "$NEW"
gh variable set P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA -R "$REPO" --body "$NEW"
gh variable set P7_EXPIRY_APPROVED_MAIN_SHA -R "$REPO" --body "$NEW"
test "$(var P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$REPO")" = "$NEW"
test "$(var P7_EXPIRY_APPROVED_MAIN_SHA "$REPO")" = "$NEW"
test "$(remote "$RELAY")" = "$RELAY_PIN"
A="$(var TRAVNR_CRON_RELAY_SHA "$RELAY")"
case "$A" in 214ede4895c6e6cdae5f124a85a323783251ea60|"$RELAY_PIN") ;; *) hold RELAY_AUDIT_UNKNOWN_PIN;; esac
gh variable set TRAVNR_CRON_RELAY_SHA -R "$RELAY" --body "$RELAY_PIN"
echo 'P6_EXISTING_RETENTION_AND_RELAY_AUDIT_PINS_READBACK_PASS'

# Existing reviewed full-retention mode, not an expansion of deletion scope.
# Dispatch once and prove both job executions and their actual receipts.
API="repos/$REPO/actions/workflows/phase5-primary-fids-expiry-no-provider.yml/runs?event=workflow_dispatch&branch=main&per_page=100"
gh api "$API" --jq '.workflow_runs[].id' | sort -n > "$TMP/before-runs"
test "$(remote "$REPO")" = "$NEW"
gh workflow run phase5-primary-fids-expiry-no-provider.yml -R "$REPO" --ref main \
  -f confirm=APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER -f approved_main_sha="$NEW"
FULL=""
for _ in $(seq 1 45); do
 gh api "$API" --jq ".workflow_runs[] | select(.head_sha==\"$NEW\" and .run_attempt==1 and .display_title==\"P5 FULL RETENTION BACKSTOP CHILD\") | .id" | sort -n > "$TMP/current-runs"
 comm -13 "$TMP/before-runs" "$TMP/current-runs" > "$TMP/new-runs"
 N="$(wc -l < "$TMP/new-runs" | tr -d ' ')"
 [ "$N" -le 1 ] || hold MULTIPLE_RETENTION_DISPATCHES
 if [ "$N" = 1 ]; then FULL="$(cat "$TMP/new-runs")"; break; fi
 sleep 2
done
[[ "$FULL" =~ ^[0-9]+$ ]] || hold RETENTION_DISPATCH_ACK_UNKNOWN_NO_REPLAY
echo "P6_FULL_RETENTION_BASELINE_RUN=$FULL"
gh run watch "$FULL" -R "$REPO" --exit-status
gh api "repos/$REPO/actions/runs/$FULL/jobs?per_page=100" > "$TMP/retention-jobs.json"
node --input-type=module - "$TMP/retention-jobs.json" "$NEW" <<'JS' > "$TMP/retention-job-ids"
import fs from 'node:fs';
const q=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),pin=process.argv[3];
if(q.total_count!==2||q.jobs.length!==2||q.jobs.some(x=>x.head_sha!==pin||x.run_attempt!==1||x.status!=='completed'||x.conclusion!=='success'))throw Error('HOLD_P6_FULL_RETENTION_JOB_IDENTITY');
for(const name of ['primary-fids-expiry','phase7-expiry']){const a=q.jobs.filter(x=>x.name===name);if(a.length!==1)throw Error('HOLD_P6_FULL_RETENTION_JOB_NAME');console.log(a[0].id)}
JS
mapfile -t JOBS < "$TMP/retention-job-ids"
gh run view "$FULL" -R "$REPO" --job "${JOBS[0]}" --log > "$TMP/primary.log"
gh run view "$FULL" -R "$REPO" --job "${JOBS[1]}" --log > "$TMP/p7.log"
node --input-type=module - "$TMP/primary.log" "$TMP/p7.log" "$NEW" "$FULL" <<'JS'
import fs from 'node:fs';
const [p,q,pin,rid]=process.argv.slice(2);
const parse=f=>fs.readFileSync(f,'utf8').split(/\r?\n/).flatMap(l=>{const i=l.indexOf('{');if(i<0)return [];try{return [JSON.parse(l.slice(i))]}catch{return []}});
const only=(a,s)=>{const z=a.filter(x=>x?.status===s);if(z.length!==1)throw Error('HOLD_P6_RETENTION_RECEIPT_'+s);return z[0]};
const a=only(parse(p),'PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED'),b=only(parse(p),'PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED'),c=only(parse(q),'P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK');
if([a,b,c].some(x=>x.providerCalls!==0||x.phase6PaidGo!==false)||a.reviewedMainSha!==pin||b.reviewedMainSha!==pin||a.deadlineEvidenceHold===true||b.deadlineDueObservedAtInitialRead!==false||a.after?.deletionStopUnresolved!==false||b.after?.deletionStopUnresolved!==false||a.after?.eligibleOriginals!==0||a.after?.hardDueOriginals!==0||['duePackets','dueIndexes','expiredHeads','foreignDuePackets','foreignDueIndexes'].some(k=>b.after?.[k]!==0)||['dueLinks','dueBundles','dueFragments','liveLinksOnDueFragments'].some(k=>c.after?.[k]!==0))throw Error('HOLD_P6_RETENTION_CURRENT_BASELINE_READBACK');
console.log(JSON.stringify({status:'P6_CURRENT_MAIN_FULL_RETENTION_BASELINE_PASS',runId:Number(rid),providerCalls:0,hardDuePrimary:0,duePrivate:0,dueResearch:0,phase6PaidGo:false}));
JS
# Opt in to the previously reviewed relay full-scope lane only now that
# exact-current-main full-retention proof exists. Keep original lane history.
test "$(remote "$REPO")" = "$NEW"
test "$(remote "$RELAY")" = "$RELAY_PIN"
test "$(var TRAVNR_RELAY_MODE "$RELAY")" = MULTI_LANE
test "$(var TRAVNR_RELAY_PRIMARY_ENABLED "$RELAY")" = 1
test "$(var TRAVNR_RELAY_ROLLING_ENABLED "$RELAY")" = 1
test "$(var TRAVNR_APPROVED_TARGET_MAIN_SHA "$RELAY")" = "$PIN"
gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RELAY" --body "$NEW"
gh variable set TRAVNR_RELAY_FULL_RETENTION_APPROVED -R "$RELAY" --body 1
test "$(var TRAVNR_APPROVED_TARGET_MAIN_SHA "$RELAY")" = "$NEW"
test "$(var TRAVNR_RELAY_FULL_RETENTION_APPROVED "$RELAY")" = 1
echo "P6_EXISTING_FULL_RETENTION_RELAY_CONFIGURED_NO_PAID_GO"
# Only the expired readonly clock verification route, never a paid tick.
if [ "$(var TRAVNR_RELAY_ROLLING_ROUTE "$RELAY")" = DIRECT_VERIFY ] && [ "$(var TRAVNR_RELAY_DIRECT_TICK_APPROVED "$RELAY")" = 0 ] && [ "$(var P6_ROLLING_DIRECT_RECOVERY_ENABLED "$REPO" 2>/dev/null || true)" != 1 ]; then
 CURRENT_SINCE="$(var TRAVNR_RELAY_ROLLING_SINCE_UTC "$RELAY")"
 test "$CURRENT_SINCE" = 2026-11-19T01:36:16.466Z || hold UNCERTAIN_DIRECT_VERIFY_EPOCH
 SINCE="$(node -e 'console.log(new Date().toISOString())')"
 gh variable set TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$RELAY" --body "$SINCE"
 gh workflow run external-clock.yml -R "$RELAY" --ref main -f lane=ROLLING_ROOT
 echo "P6_DIRECT_READONLY_CLOCK_RENEWED=$SINCE"
fi

# Current-main full safety for the exact reviewed merged tree.
MAIN_CI="$(wait_offline "$NEW")" || hold MERGED_MAIN_OFFLINE_NOT_PASS
echo "P6_FINAL_MAIN_OFFLINE_PASS=$MAIN_CI"
test "$(remote "$REPO")" = "$NEW"
# Reuse the original exact reviewed statics installer, changing only
# verified main and AUTH pins and removing already-completed account/relay
# operations. It will independently run the actual finalizer on final main.
OLD_HELPER=9de13178bf55411108aa5b8eed99039b4bf5c65b
gh api "repos/$REPO/git/blobs/$OLD_HELPER" --jq '.content' | base64 --decode > "$TMP/previous-static.sh"
test "$(git hash-object "$TMP/previous-static.sh")" = "$OLD_HELPER"
python3 - "$TMP/previous-static.sh" "$TMP/new-static.sh" "$NEW" "$ROOT/auth.json" "$(sha "$ROOT/auth.json")" <<'PY'
import sys,pathlib,re
src,dst,new,auth,digest=sys.argv[1:]
assert re.fullmatch('[0-9a-f]{40}',new) and re.fullmatch('[0-9a-f]{64}',digest)
s=pathlib.Path(src).read_text()
a=s.index('# Gate 8 fresh free-read check')
b=s.index('# Independently validate cross-binding',a)
s=s[:a]+s[b:]
old='AUTH="$HOME/.travnr-phase6-source-auth-20261122/auth.json"'
assert s.count(old)==1 and auth.endswith('/auth.json') and "'" not in auth and '\n' not in auth
s=s.replace(old,"AUTH='"+auth+"'")
s=s.replace('27074feda386247c4faf3877bd5349e696cde8a9',new)
s=s.replace('27074fed',new[:8])
# Keep the recovered six-candidate location exactly as previously verified.
s=s.replace('.travnr-phase6-six-policy-exact-recovered-'+new[:8],'.travnr-phase6-six-policy-exact-recovered-27074fed')
s=s.replace('8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297',digest).replace('AUTH-20261122-P6SOURCE','AUTH-20261119-P5INERTFREEZE')
pathlib.Path(dst).write_text(s)
PY
bash -n "$TMP/new-static.sh"
cd "${RUNTIME%/node_modules}"
bash "$TMP/new-static.sh"
echo "P6_FINAL_LEDGER_AND_STATIC_COMMISSIONING_COMMAND_COMPLETE"
echo "FINAL_MAIN=$NEW"
echo "SOURCE_REMAINS_DISABLED"
echo "PAID_GO=false"
