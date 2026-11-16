#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace"
ROOT="$(pwd -P)"
REPO='HKcode22/ReplitTranvr'
PIN='e108ef81d3598632fbce5f81a87fd73b48313b61'
ENV_NAME='phase5-expiry-one-batch'
WF='phase5-published-expiry-protected-one-batch.yml'
SOURCE='bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac'
VERIFIED_MAIN='20dc5a31a58ebc85aacf22a7e6164510dedc3b6a'
SCRIPT='scripts/v39_phase5_expiry_v4_apply_handoff_owner_v39.mjs'
hold(){ echo "HOLD_V4_SETUP: $1"; exit 2; }
for c in gh git node mktemp; do command -v "$c" >/dev/null || hold "MISSING_$c"; done
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN_CHANGED
[[ "$(gh run view 43827573802 -R "$REPO" --json headSha,conclusion --jq '.headSha + ":" + .conclusion')" == "$PIN:success" ]] || hold MAIN_SAFETY_NOT_PASSED
[[ "$(gh variable get P5_EXPIRY_RECEIVER_DEPLOYED_SOURCE_SHA -R "$REPO")" == "$SOURCE" ]] || hold DEPLOYED_SOURCE_MISMATCH
[[ ! -e "$HOME/.travnr-phase5-expiry/v4-protected-apply-intent-$SOURCE.json" && ! -e "$HOME/.travnr-phase5-expiry/v4-protected-apply-ack-$SOURCE.json" ]] || hold EXISTING_LOCAL_INTENT_OR_ACK_NO_REPLAY
REPO="$REPO" PIN="$PIN" ENV_NAME="$ENV_NAME" WF="$WF" node <<'NODE'
const {execFileSync}=require('node:child_process');
const root='repos/'+process.env.REPO;
const ep=root+'/environments/'+process.env.ENV_NAME;
const bp=ep+'/deployment-branch-policies';
const expectedId=139022998;
const hold=x=>{throw Error('HOLD_V4_SETUP_'+x);};
function call(method,path,body) {
 const args=['api','--method',method,path];
 if(body!==undefined)args.push('--input','-');
 const raw=execFileSync('gh',args,{encoding:'utf8',input:body===undefined?undefined:JSON.stringify(body),stdio:[body===undefined?'ignore':'pipe','pipe','inherit'],timeout:30000});
 return JSON.parse(raw);
}
const get=p=>call('GET',p);
const exactMain=()=>{if(get(root+'/git/ref/heads/main').object.sha!==process.env.PIN)hold('MAIN_CHANGED');};
const noHistory=()=>{
 const h=get(root+'/actions/workflows/'+process.env.WF+'/runs?event=workflow_dispatch&branch=main&per_page=100');
 if(h.total_count!==0||!Array.isArray(h.workflow_runs)||h.workflow_runs.length!==0)hold('PREVIOUS_OR_UNCERTAIN_APPLY_HISTORY_NO_REPLAY');
 const s=get(ep+'/secrets?per_page=100');
 if(s.total_count!==0||!Array.isArray(s.secrets)||s.secrets.length!==0)hold('EXISTING_ENVIRONMENT_SECRETS_REVIEW_NO_OVERWRITE');
};
const baseReady=e=>{
 const r=e.protection_rules?.filter(x=>x.type==='required_reviewers');
 const p=e.deployment_branch_policy;
 return e.name===process.env.ENV_NAME&&e.can_admins_bypass===false&&r?.length===1&&r[0].prevent_self_review===false&&r[0].reviewers?.length===1&&r[0].reviewers[0].type==='User'&&r[0].reviewers[0].reviewer?.id===expectedId&&p?.protected_branches===false&&p?.custom_branch_policies===true&&e.protection_rules.every(x=>['required_reviewers','branch_policy'].includes(x.type));
};
const blank=e=>e.name===process.env.ENV_NAME&&Array.isArray(e.protection_rules)&&e.protection_rules.length===0&&e.deployment_branch_policy===null&&e.can_admins_bypass===true;
const mainRule=b=>b.total_count===1&&b.branch_policies?.length===1&&b.branch_policies[0].name==='main'&&['branch',null,undefined].includes(b.branch_policies[0].type);
try {
 exactMain();noHistory();
 if(get(root).owner?.id!==expectedId)hold('REPO_OWNER_MISMATCH');
 // If owner fixed the settings independently, leave them alone. Do not
 // replace an unexpected partial or stronger protection configuration.
 let e=get(ep);
 const originalId=e.id;
 if(!Number.isSafeInteger(originalId)||originalId<=0)hold('ENVIRONMENT_ID');
 if(blank(e)) {
  call('PUT',ep,{wait_timer:0,prevent_self_review:false,can_admins_bypass:false,reviewers:[{type:'User',id:expectedId}],deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}});
  e=get(ep);
 } else if(!baseReady(e)) hold('UNEXPECTED_NONDEFAULT_CONFIGURATION_REVIEW');
 if(e.id!==originalId||!baseReady(e))hold('PROTECTION_SETTINGS_NOT_SAVED_OR_UNSUPPORTED');
 const b=get(bp+'?per_page=100');
 if(b.total_count===0&&Array.isArray(b.branch_policies)&&b.branch_policies.length===0) {
  call('POST',bp,{name:'main',type:'branch'});
 } else if(!mainRule(b)) hold('UNEXPECTED_BRANCH_RULES_DO_NOT_DELETE');
 e=get(ep);
 if(e.id!==originalId||!baseReady(e)||!mainRule(get(bp+'?per_page=100')))hold('FINAL_ENVIRONMENT_READBACK');
 noHistory();exactMain();
 console.log(JSON.stringify({status:'PROTECTED_ENVIRONMENT_CONFIGURED_AND_READ_BACK',reviewer:'HKcode22',preventSelfReview:false,adminBypass:false,mainOnly:true,providerCalls:0,dbWrites:0,applyDispatched:false}));
} catch(e) {
 const m=String(e.message||'');
 console.error(/^HOLD_V4_SETUP_[A-Z0-9_]+$/.test(m)?m:'HOLD_V4_SETUP_GITHUB_API_FAILED_CHECK_PERMISSION_OR_PARTIAL_SETTINGS');
 process.exitCode=2;
}
NODE
git fetch --no-tags origin "$PIN" "$VERIFIED_MAIN"
TMP="$(mktemp -d)"
CHECKOUT="$TMP/reviewed"
cleanup(){ cd "$ROOT"; if [[ -d "$CHECKOUT" ]]; then git worktree remove "$CHECKOUT"; fi; rmdir "$TMP"; }
trap cleanup EXIT
git worktree add --detach "$CHECKOUT" "$PIN"
cd "$CHECKOUT"
[[ "$(git rev-parse HEAD)" == "$PIN" && -z "$(git status --porcelain)" ]] || hold CHECKOUT_MISMATCH
[[ "$(git hash-object "$SCRIPT")" == aa7e7a68ccb602ff3f9cbfa1ee62ea6620c6ce5f ]] || hold HELPER_HASH_MISMATCH
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
