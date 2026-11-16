cd ~/workspace
bash <<'P5_DIAG_RESUME'
set -Eeuo pipefail
set +x
umask 077
REPO='HKcode22/ReplitTranvr'
PIN='e108ef81d3598632fbce5f81a87fd73b48313b61'
SOURCE='bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac'
VERIFIED_MAIN='20dc5a31a58ebc85aacf22a7e6164510dedc3b6a'
ENV_NAME='phase5-expiry-one-batch'
SCRIPT='scripts/v39_phase5_expiry_v4_apply_handoff_owner_v39.mjs'
ROOT="$(pwd -P)"
hold(){ echo "HOLD_V4: $1"; exit 2; }
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN_CHANGED
[[ "$(gh run view 43827573802 -R "$REPO" --json headSha,conclusion --jq '.headSha + ":" + .conclusion')" == "$PIN:success" ]] || hold MAIN_SAFETY_NOT_PASSED

echo '=== ENVIRONMENT DIAGNOSIS ==='
GATE_OK=0
if REPO="$REPO" ENV_NAME="$ENV_NAME" node <<'NODE'
const {execFileSync}=require('node:child_process');
const get=p=>JSON.parse(execFileSync('gh',['api',p],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:20000}));
try {
 const root='repos/'+process.env.REPO;
 const e=get(root+'/environments/'+process.env.ENV_NAME);
 const policy=e.deployment_branch_policy;
 const rules=(e.protection_rules||[]).filter(x=>x.type==='required_reviewers');
 const review=rules[0];
 const owner=(review?.reviewers||[]).some(x=>x.type==='User'&&x.reviewer?.id===139022998);
 const selected=policy?.custom_branch_policies===true&&policy?.protected_branches===false;
 const b=selected?get(root+'/environments/'+process.env.ENV_NAME+'/deployment-branch-policies?per_page=100'):null;
 const branches=b?.branch_policies||[];
 const mainOnly=b?.total_count===1&&branches.length===1&&branches[0].name==='main'&&[undefined,null,'branch'].includes(branches[0].type);
 const issues=[];
 if(e.name!==process.env.ENV_NAME)issues.push('WRONG_ENVIRONMENT');
 if(rules.length!==1||!owner)issues.push('REQUIRED_REVIEWER_HKCODE22_NOT_SAVED');
 if(review?.prevent_self_review!==false)issues.push('PREVENT_SELF_REVIEW_NOT_CONFIRMED_OFF');
 if(!selected)issues.push('SELECTED_BRANCHES_AND_TAGS_NOT_SAVED');
 else if(!mainOnly)issues.push('EXACT_MAIN_BRANCH_RULE_NOT_SAVED');
 if(e.can_admins_bypass===true)issues.push('ADMIN_BYPASS_ENABLED');
 console.log(JSON.stringify({environment:e.name,reviewerRuleCount:rules.length,ownerReviewerPresent:owner,preventSelfReview:review?.prevent_self_review??null,branchPolicy:policy??null,branchRules:branches.map(x=>({name:x.name,type:x.type??null})),adminBypassReported:e.can_admins_bypass??null,issues},null,2));
 process.exitCode=issues.length?2:0;
} catch { console.log('ENVIRONMENT_METADATA_READ_FAILED'); process.exitCode=2; }
NODE
then GATE_OK=1
fi

echo '=== EXISTING RELEASE CONFIGURATION ==='
git fetch --no-tags origin "$PIN" "$VERIFIED_MAIN"
TMP="$(mktemp -d)"
CHECKOUT="$TMP/reviewed"
cleanup(){ cd "$ROOT"; if [[ -d "$CHECKOUT" ]]; then git worktree remove "$CHECKOUT"; fi; rmdir "$TMP"; }
trap cleanup EXIT
git worktree add --detach "$CHECKOUT" "$PIN"
cd "$CHECKOUT"
[[ "$(git rev-parse HEAD)" == "$PIN" && -z "$(git status --porcelain)" ]] || hold CHECKOUT_MISMATCH
INV='scripts/v39_phase6_release_inventory_readonly.mjs'
DB_INV='scripts/phase5_final_freeze_readonly_owner_launcher.sh'
[[ "$(git hash-object "$INV")" == 4902a3646633d9042888d3f38b90819be4f578d3 ]] || hold INVENTORY_HASH_MISMATCH
if ! P6_INVENTORY_REVIEWED_MAIN="$PIN" node "$INV" | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const j=JSON.parse(s);console.log(JSON.stringify({status:j.status,initialInertStageConfiguration:j.initialInertStageConfiguration,retentionMonitorEnabled:j.retentionMonitorEnabled},null,2))})'; then
 echo 'RELEASE_NAME_INVENTORY_UNAVAILABLE_NO_WRITES'
fi

echo '=== ACTUAL DATABASE STAGING COUNTS (READ ONLY) ==='
[[ "$(git hash-object "$DB_INV")" == 6307c7092f5439821d2584781a1463b8e5dcc7fb ]] || hold DB_INVENTORY_HASH_MISMATCH
if ! bash "$DB_INV"; then echo 'DATABASE_INVENTORY_UNAVAILABLE_NO_WRITES'; fi

[[ "$GATE_OK" == 1 ]] || hold ENVIRONMENT_ISSUES_LISTED_ABOVE_NO_APPLY_DISPATCH
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN_CHANGED
[[ "$(gh variable get P5_EXPIRY_RECEIVER_DEPLOYED_SOURCE_SHA -R "$REPO")" == "$SOURCE" ]] || hold DEPLOYED_SOURCE_MISMATCH
[[ "$(git hash-object "$SCRIPT")" == aa7e7a68ccb602ff3f9cbfa1ee62ea6620c6ce5f ]] || hold HELPER_HASH_MISMATCH
[[ ! -e "$HOME/.travnr-phase5-expiry/v4-protected-apply-intent-$SOURCE.json" && ! -e "$HOME/.travnr-phase5-expiry/v4-protected-apply-ack-$SOURCE.json" ]] || hold EXISTING_LOCAL_INTENT_OR_ACK_NO_REPLAY

echo '=== PREPARE ONE PROTECTED RUN; NO AUTO APPROVAL ==='
env -u DATABASE_URL -u V39_DATABASE_RUNTIME_URL \
 -u AERODATABOX_API_KEY -u AERODATABOX_WEBHOOK_SECRET -u RAPIDAPI_KEY \
 -u P5_EXPIRY_RECEIVER_AUTH_TOKEN -u P5_EXPIRY_APPLY_AUTH_TOKEN \
 -u P5_RECURRING_EXPIRY_WRITER_URL -u P5_RECURRING_EXPIRY_READER_URL \
 ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
 P5_V4_APPLY_HANDOFF_MAIN_SHA="$PIN" \
 P5_V4_APPLY_HANDOFF_VERIFIED_MAIN_SHA="$VERIFIED_MAIN" \
 P5_V4_APPLY_HANDOFF_VERIFIED_RUN_ID=43817297081 \
 P5_V4_APPLY_HANDOFF_CONFIRM=PREPARE_ONE_WAITING_V4_DECLARED_EXPIRY_BATCH_NO_AUTO_APPROVAL_NO_GO \
 node "$SCRIPT"
echo 'PROTECTED_HANDOFF_STAGED_NO_AUTO_APPROVAL_NO_PAID_GO'
P5_DIAG_RESUME
