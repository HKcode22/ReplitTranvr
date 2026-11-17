#!/usr/bin/env bash
# Review-only coordination wrapper. Existing owner CLI permissions required.
# Engineering merge and existing primary expiry re-pin, never Phase6 GO.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
OLD=de15816bccb867dc17dcd396f8bedec66960e115
HEAD_PIN=cfce6e3693eab1244f8d7fec65d6da676d4471c4
TREE_PIN=b8b8224f07dd1b0bf5696a93e7a170bbd8631e51
HELPER_BLOB=75445a273f2901b603bd1a4e46914c6776dedb22
TEST_BLOB=72d36f1950027649c6bfefbef692ef9c9718a927
WF=phase5-primary-fids-expiry-no-provider.yml
PIN=P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA
APPROVAL=APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
RUNS='[44088415233,44088415075,44088415284,44088415127,44088415058,44088414936,44088415023,44088415252,44088414959,44088415059]'
hold() { printf 'HOLD_P5_COMPACT_MERGE_REPIN: %s\n' "$1" >&2; exit 2; }
[[ "$#" == 0 && "${GITHUB_ACTIONS:-}" != true ]] || hold OWNER_LOCAL_ONLY
for x in gh git node jq base64 mktemp realpath env; do command -v "$x" >/dev/null || hold "MISSING_$x"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
# Preflight local offline compiler before the engineering merge; no owner DB or
# provider credentials are used by the review. Keep the current branch untouched.
ROOT="$(realpath "$(git rev-parse --show-toplevel)")"
OWNER_HOME="$(realpath "$HOME")"
case "$OWNER_HOME/" in "$ROOT/"*) hold HOME_MUST_BE_OUTSIDE_REPOSITORY ;; esac
[[ -x "$ROOT/node_modules/.bin/tsx" && -f "$ROOT/package-lock.json" ]] || hold EXISTING_OFFLINE_DEPENDENCIES_REQUIRED
ORIGIN="$(git -C "$ROOT" remote get-url origin)"
case "$ORIGIN" in
  https://github.com/HKcode22/ReplitTranvr|https://github.com/HKcode22/ReplitTranvr.git|git@github.com:HKcode22/ReplitTranvr.git|git@github.com:HKcode22/ReplitTranvr) ;;
  *) hold UNEXPECTED_LOCAL_ORIGIN ;;
esac
TMP="$(mktemp -d)"
CREATED=0
CHECKOUT="$TMP/reviewed"
SUCCESS=0
OUT=""
cleanup() {
  if [[ "$CREATED" == 1 ]]; then git -C "$ROOT" worktree remove --force "$CHECKOUT" >/dev/null 2>&1 || true; fi
  rm -rf -- "$TMP"
  if [[ "$SUCCESS" != 1 && -n "$OUT" ]]; then rm -rf -- "$OUT"; fi
}
trap cleanup EXIT
api() { gh api "repos/$REPO/$1"; }
variable() { gh variable get "$1" -R "$REPO"; }
main_sha() { api git/ref/heads/main | jq -er '.object.sha'; }
require_config() {
  [[ "$(main_sha)" == "$OLD" ]] || hold MAIN_CHANGED_REVIEW_REQUIRED
  [[ "$(variable "$PIN")" == "$OLD" ]] || hold EXISTING_PRIMARY_PIN_CHANGED
  [[ "$(variable P5_PRIMARY_FIDS_EXPIRY_ENABLED)" == true ]] || hold PRIMARY_NOT_ENABLED
  [[ "$(variable P5_PRIMARY_FIDS_EXPIRY_APPROVAL)" == "$APPROVAL" ]] || hold PRIMARY_APPROVAL_CHANGED
  [[ "$(variable P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256)" == "$ENDPOINT" ]] || hold ENDPOINT_CHANGED
  [[ "$(api "actions/workflows/$WF" | jq -er '.state')" == active ]] || hold PRIMARY_WORKFLOW_NOT_ACTIVE
  # Missing scheduling variables are STOP defaults; never print their values.
  local listed value flag
  listed="$(gh variable list -R "$REPO" --json name)"
  jq -e 'type=="array" and all(.[]; (.name|type)=="string") and ((map(.name)|unique|length)==length)' <<<"$listed" >/dev/null || hold SCHEDULE_VARIABLE_LIST_INVALID
  for flag in P5_AUTO_SOURCE_DISPATCH_ENABLED P5_POST_AUTO_DISPATCH_ENABLED P5_T24_AUTO_DISPATCH_ENABLED P5_LATER_PRE_AUTO_DISPATCH_ENABLED P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED P6_PRIVATE_POST_PARENT_ENABLED P6_ROLLING_CONTROLLER_ENABLED; do
    if jq -e --arg n "$flag" 'any(.[]; .name==$n)' <<<"$listed" >/dev/null; then
      value="$(variable "$flag")" || hold SCHEDULE_VARIABLE_READ_UNKNOWN
      [[ "$value" == false || "$value" == 0 || -z "$value" ]] || hold "UNEXPECTED_PAID_OR_LEGACY_ENABLE_$flag"
    fi
  done
}
ENDPOINT="$(variable P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256)"
[[ "$ENDPOINT" =~ ^[a-f0-9]{64}$ ]] || hold ENDPOINT_PIN_MISSING
require_config
names="$(gh secret list -R "$REPO" --json name)"
jq -e '([.[].name] | (index("P5_PRIMARY_FIDS_SWEEP_DATABASE_URL") != null and index("P5_RETENTION_READER_DATABASE_URL") != null))' <<<"$names" >/dev/null || hold EXISTING_SECRET_NAMES_MISSING
fetch_blob() {
  local blob="$1" dest="$2"
  api "git/blobs/$blob" | jq -er '.content' | base64 --decode > "$dest"
  [[ "$(git hash-object "$dest")" == "$blob" ]] || hold REVIEW_BLOB_MISMATCH
}
fetch_blob "$HELPER_BLOB" "$TMP/p5_compact_expiry_repin_owner.cjs"
fetch_blob "$TEST_BLOB" "$TMP/p5_compact_expiry_repin_owner.test.cjs"
node --check "$TMP/p5_compact_expiry_repin_owner.cjs"
node --test "$TMP/p5_compact_expiry_repin_owner.test.cjs"
verify_pr() {
  local p synthetic
  p="$(api pulls/862)"
  jq -e --arg h "$HEAD_PIN" --arg b "$OLD" '.state=="open" and .merged==false and .mergeable==true and .head.sha==$h and .base.sha==$b and .base.ref=="main"' <<<"$p" >/dev/null || hold EXACT_PR_NOT_MERGEABLE
  synthetic="$(jq -er '.merge_commit_sha' <<<"$p")"
  [[ "$synthetic" =~ ^[a-f0-9]{40}$ ]] || hold PR_TEST_MERGE_SHA_MISSING
  api "git/commits/$synthetic" | jq -e --arg t "$TREE_PIN" --arg b "$OLD" --arg h "$HEAD_PIN" '.tree.sha==$t and ([.parents[].sha]==[$b,$h])' >/dev/null || hold TEST_MERGE_TREE_DRIFT
  [[ "$(git hash-object "$ROOT/package-lock.json")" == "$(api "contents/package-lock.json?ref=$HEAD_PIN" | jq -er '.sha')" ]] || hold EXISTING_DEPENDENCY_LOCKFILE_MISMATCH
  jq -r '.draft' <<<"$p"
}
verify_ci() {
  local rows
  rows="$(gh api --method GET "repos/$REPO/actions/runs" -f head_sha="$HEAD_PIN" -f per_page=100)"
  jq -e --arg h "$HEAD_PIN" --argjson expected "$RUNS" '(.total_count==10) and (([.workflow_runs[].id]|sort)==($expected|sort)) and all(.workflow_runs[]; .head_sha==$h and .event=="pull_request" and .run_attempt==1 and .status=="completed" and .conclusion=="success")' <<<"$rows" >/dev/null || hold EXACT_COMBINED_CI_NOT_GREEN
}
draft="$(verify_pr)"
verify_ci
require_config
printf '\nReviewed compact engineering tree: %s\nEngineering merge only; no provider/DB/paid activation.\n' "$TREE_PIN"
# Explicitly invoking this hash-pinned owner wrapper is the one operator action.
# All machine gates remain; no extra typed password or confirmation phrase.
require_config
verify_ci
[[ "$(verify_pr)" == "$draft" ]] || hold PR_STATE_CHANGED
if [[ "$draft" == true ]]; then
  gh pr ready 862 -R "$REPO" >/dev/null || hold READY_ACK_UNKNOWN_INSPECT_NO_REPLAY
fi
[[ "$(verify_pr)" == false ]] || hold PR_STILL_DRAFT
verify_ci
require_config
# GitHub enforces repository merge rules; no admin or force override.
if ! merge_result="$(gh api --method PUT "repos/$REPO/pulls/862/merge" -f sha="$HEAD_PIN" -f merge_method=merge)"; then
  hold MERGE_ACK_UNKNOWN_INSPECT_MAIN_AND_PIN_NO_REPLAY
fi
jq -e '.merged==true and (.sha|test("^[a-f0-9]{40}$"))' <<<"$merge_result" >/dev/null || hold MERGE_NOT_CONFIRMED_INSPECT_MAIN_AND_PIN
NEW="$(jq -er '.sha' <<<"$merge_result")"
[[ "$(main_sha)" == "$NEW" ]] || hold MERGED_MAIN_CHANGED_INSPECT_PIN
[[ "$(api "git/commits/$NEW" | jq -er '.tree.sha')" == "$TREE_PIN" ]] || hold MERGED_TREE_DRIFT_INSPECT_PIN
printf 'P5_COMPACT_ENGINEERING_MERGE_OBSERVED %s\n' "$NEW"
# Coordinated exact-main re-pin uses the existing approval, not a new paid release.
# If any step below fails, inspect pin/run state; never replay APPLY or revert blindly.
P5_COMPACT_OWNER_WRAPPER_EXECUTED=1 node "$TMP/p5_compact_expiry_repin_owner.cjs" --repin "$NEW"

# Only after the existing retention pin and VERIFY succeed: regenerate the
# same exact candidate at the actual merged main, not the historical Nov22 default.
PIN="$NEW"
remote_main() { main_sha; }
[[ "$(remote_main)" == "$PIN" ]] || hold MAIN_CHANGED_BEFORE_OFFLINE_REVIEW
OUT="$(mktemp -d "$OWNER_HOME/.phase5-compact-review-XXXXXXXX")"
# Exact immutable object, without checking out/resetting the owner's branch.
git -C "$ROOT" fetch --no-tags origin "$PIN" >&2
[[ "$(git -C "$ROOT" rev-parse FETCH_HEAD)" == "$PIN" ]] || hold 'FETCH_IDENTITY_CHANGED'
git -C "$ROOT" worktree add --detach "$CHECKOUT" "$PIN" >&2
CREATED=1
[[ "$(git -C "$CHECKOUT" rev-parse HEAD)" == "$PIN" ]] || hold 'WORKTREE_IDENTITY_CHANGED'
[[ "$(git hash-object "$ROOT/package-lock.json")" == "$(git -C "$CHECKOUT" rev-parse HEAD:package-lock.json)" ]] || hold 'EXISTING_DEPENDENCY_LOCKFILE_MISMATCH'
ln -s "$ROOT/node_modules" "$CHECKOUT/node_modules"
TREE="$(git -C "$CHECKOUT" rev-parse 'HEAD^{tree}')"
# Only minimal nonsecret environment reaches the existing offline exporter.
# No DATABASE_URL, provider keys, GH token, NODE_OPTIONS or live arm flags.
(
  cd "$CHECKOUT"
  env -i PATH="$PATH" HOME="$OWNER_HOME" TMPDIR="${TMPDIR:-/tmp}" \
    ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
    ./node_modules/.bin/tsx scripts/v39_phase6_actual_release_candidate_export_v39.ts --review-only-compact-nov21-no-refill "$PIN"
) > "$OUT/review-only.json"

[[ "$TREE" == "$TREE_PIN" ]] || hold POSTMERGE_REVIEW_TREE_DRIFT
env -i PATH="$PATH" HOME="$OWNER_HOME" node - "$OUT" "$PIN" "$TREE" "$CHECKOUT" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [out,pin,tree,repo]=process.argv.slice(2);
const hold=s=>{throw Error('HOLD_P5_COMPACT_REVIEW_'+s)};
const req=(ok,s)=>{if(!ok)hold(s)};
const h=b=>crypto.createHash('sha256').update(b).digest('hex');
const exact=o=>JSON.stringify(o);
const write=(name,o)=>{const bytes=Buffer.from(exact(o));fs.writeFileSync(path.join(out,name),bytes,{flag:'wx',mode:0o600});return h(bytes)};
const raw=fs.readFileSync(path.join(out,'review-only.json'));
req(raw.length>=100&&raw.length<2*1024*1024,'SIZE');
const j=JSON.parse(raw),r=j.releaseIdentityReview,rec=j.concreteReviewRecommendation,rev=j.calendarRevisionReview;
req(j.reviewedCodeCandidate===pin&&r?.checkout?.codeSha===pin&&r?.checkout?.treeSha===tree,'CHECKOUT');
req(j.phase6PaidGo===false&&j.sourceRightsApproved===false&&j.actualBudgetReviewApproved===false&&j.providerCalls===0&&j.databaseWrites===0&&j.githubMutations===0,'REVIEW_NOT_INERT');
req(r.status==='EXACT_CONTENT_DIGESTS_AND_GEOMETRY_REVIEW_ONLY_NOT_RELEASE'&&r.actualAuthorizationId===null&&r.finalPredecessorEvidenceIds===null&&r.candidateDigestsApproved===false&&r.stagePacketExported===false&&r.sourceRightsApproved===false&&r.scientificFreezeApproved===false&&r.phase6PaidGo===false,'AUTH_OR_APPROVAL_DRIFT');
req(rec.independentReviewerApproved===false&&rec.stageAuthorizationGranted===false&&rec.futureRefillConfirmed===false,'FINANCIAL_REVIEW_NOT_INERT');
req(rev?.independentDateRevisionApproved===false&&rev.phase6PaidGo===false&&rev.firstServiceUtc==='2026-11-21T00:00:00.000Z'&&rev.firstSourceUtc==='2026-11-19T23:45:00.000Z'&&rev.lastServiceEndUtc==='2026-12-24T04:00:00.000Z'&&rev.allocatedOutcomeTailUtc==='2026-12-26T04:00:00.000Z','DATE_REVISION');
const m='65a78e00f0d2a0a4809286ef189d1161634a08d7c86b653d4d4f230b221f2d60',cfg='4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb',rows='7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c',grid='371ce938669dc4c0ec8723d89f58c44507900c3eb18306f5ed7de56f6a95539b';
for(const [key,want] of [['manifestCandidate',m],['configCandidate',cfg]])req(r[key]?.sha256===want&&h(exact(r[key].content))===want,'EXACT_'+key.toUpperCase());
for(const key of ['timingEvidenceCandidate','rangeEvidenceCandidate'])req(/^[a-f0-9]{64}$/.test(r[key]?.sha256??'')&&h(exact(r[key].content))===r[key].sha256,'EXACT_'+key.toUpperCase());
const sourceInventorySha256=h(exact(r.sourceInventory));
req(Array.isArray(r.sourceInventory)&&r.sourceInventory.length===r.manifestCandidate.content.executableFileCount&&sourceInventorySha256===r.manifestCandidate.content.sourceInventorySha256,'SOURCE_INVENTORY');
req(j.calendarDraft?.calendarDays?.length===31&&h(exact(j.calendarDraft.calendarDays))===rows&&r.calendarRowsDigestCandidate===rows,'COMPACT_CALENDAR');
req(r.geometry?.dayPlanCount===31&&r.geometry.totalQueries===6144&&r.geometry.totalReservedUnits===37388&&r.geometry.coverageGridSha256===grid&&r.geometry.dayPlanSha256s?.length===31,'GEOMETRY');
for(const [i,d] of r.geometry.dayPlanSha256s.entries()){
 const name='data-collection/phase5/planning/phase6-source-day-'+String(i+1).padStart(2,'0')+'.json';
 req(d.runDayIndex===i+1&&h(fs.readFileSync(path.join(repo,name)))===d.sha256,'DAY_PLAN_'+(i+1));
}
req(rec.netRestCeilingUnits===49468&&rec.proposedAlertSafety?.alertRunSpendCeilingCredits===680&&rec.jointBudgetReview?.authorizedFutureRefillApiUnits===0&&rec.jointBudgetReview?.authorizedFutureRefillAlertCredits===0,'NO_REFILL_BUDGET');
const ext=j.externalCandidate;
req(ext.phase6AuthorizationId===null&&ext.predecessorEvidenceIds===null&&ext.manifestSha256===null&&ext.configSha256===null,'EXTERNAL_DRAFT_ALREADY_FILLED');
const draft={...ext,manifestSha256:m,calendarSha256:rows,configSha256:cfg,codeSha40:pin,alertSafety:rec.proposedAlertSafety,providerRangeEvidenceSha256:r.rangeEvidenceCandidate.sha256,timingEvidenceSha256:r.timingEvidenceCandidate.sha256,cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
const missing=Object.entries(draft).filter(([,v])=>v===null).map(([k])=>k);
req(exact(missing)===exact(['phase6AuthorizationId','predecessorEvidenceIds']),'UNEXPECTED_MISSING_FIELDS');
const timing={...j.timingCandidate,timingEvidenceSha256:r.timingEvidenceCandidate.sha256};
const receipt={status:'P5_COMPACT_EXACT_MAIN_PRIVATE_REVIEW_PREPARED_NOT_STAGE_OR_AUTH',mainSha:pin,treeSha:tree,reviewOnlySha256:h(raw),sourceInventorySha256,executableFileCount:r.sourceInventory.length,manifestCandidateSha256:m,configCandidateSha256:cfg,rangeEvidenceCandidateSha256:r.rangeEvidenceCandidate.sha256,timingEvidenceCandidateSha256:r.timingEvidenceCandidate.sha256,calendarRowsSha256:rows,calendarRows:31,plannedSourceQueries:6144,plannedRestUnits:37388,verifiedMetadataDayPlans:31,externalReviewDraftSha256:write('external-input-offline-review-NOT-STAGE.json',draft),timingInputDraftSha256:write('timing-input-offline-review.json',timing),unfilledFields:missing,independentFinalApprovalRequired:true,sourceRightsApproved:false,scientificFreezeApproved:false,actualAuthorizationId:null,stagePacketExported:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false,privateReviewDirectory:out};
write('manifest-candidate.json',r.manifestCandidate.content);write('config-candidate.json',r.configCandidate.content);write('timing-evidence-candidate.json',r.timingEvidenceCandidate.content);write('range-evidence-candidate.json',r.rangeEvidenceCandidate.content);
write('review-preparation-receipt.json',receipt);
NODE
[[ "$(remote_main)" == "$PIN" ]] || hold MAIN_CHANGED_AFTER_OFFLINE_REVIEW
[[ -z "$(git -C "$CHECKOUT" status --porcelain --untracked-files=no)" ]] || hold TRACKED_CHECKOUT_CHANGED
SUCCESS=1
cat "$OUT/review-preparation-receipt.json"
printf '\nCOMPACT_PRIVATE_REVIEW_READY_NO_STAGE_NO_AUTH_NO_PROVIDER\n'
