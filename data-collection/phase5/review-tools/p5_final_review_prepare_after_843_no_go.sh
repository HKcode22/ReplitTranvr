#!/usr/bin/env bash
# Replit owner-local: one private review-only rebuild on exact reviewed main.
# No provider, database, workflow dispatch, secret/variable change or approval.
# Usage: bash p5_final_review_prepare_no_go.sh <explicit-reviewed-main-sha>
set -Eeuo pipefail
set +x
umask 077
REPO='HKcode22/ReplitTranvr'
PIN="${1:-}"
EXPECTED_MANIFEST='a592d2f56c97fc4fc8332f42af6e713eb0e8bb81c0856a26d1c0bef70a01ff35'
EXPECTED_INVENTORY='6490132036668ac91a63c6acdadd799b0aeb7b7c3bc73ba6b75e809d7542357c'
hold() { printf 'HOLD_P5_REVIEW_PREPARATION: %s\n' "$1" >&2; exit 2; }
[[ $# -eq 1 && "$PIN" =~ ^[a-f0-9]{40}$ ]] || hold 'EXPLICIT_REVIEWED_MAIN_REQUIRED'
for cmd in gh git node env mktemp realpath; do command -v "$cmd" >/dev/null || hold "MISSING_$cmd"; done
[[ "${GITHUB_ACTIONS:-}" != true ]] || hold 'OWNER_LOCAL_ONLY'
ROOT="$(git rev-parse --show-toplevel)"
ROOT="$(realpath "$ROOT")"
[[ -x "$ROOT/node_modules/.bin/tsx" ]] || hold 'EXISTING_TSX_DEPENDENCY_REQUIRED'
[[ -f "$ROOT/package-lock.json" ]] || hold 'EXISTING_LOCKFILE_REQUIRED'
gh auth status --hostname github.com >/dev/null 2>&1 || hold 'GITHUB_AUTH_MISSING'
remote_main() { gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha'; }
[[ "$(remote_main)" == "$PIN" ]] || hold 'MAIN_CHANGED_REVIEW_REQUIRED'
# Prevent running against an unrelated or misconfigured local origin. The
# authenticated GitHub fetch URL is explicit; no remote is changed.
ORIGIN="$(git -C "$ROOT" remote get-url origin)"
case "$ORIGIN" in
  https://github.com/HKcode22/ReplitTranvr|https://github.com/HKcode22/ReplitTranvr.git|git@github.com:HKcode22/ReplitTranvr.git|git@github.com:HKcode22/ReplitTranvr) ;;
  *) hold 'UNEXPECTED_LOCAL_ORIGIN' ;;
esac
# Keep output outside current workspace; no automatic deletion of existing
# artifacts, no secret files. Cleanup only removes our fresh worktree/output.
OWNER_HOME="$(realpath "$HOME")"
case "$OWNER_HOME/" in "$ROOT/"*) hold 'HOME_MUST_BE_OUTSIDE_REPOSITORY' ;; esac
OUT="$(mktemp -d "$OWNER_HOME/.phase5-review-XXXXXXXX")"
WORKROOT="$(mktemp -d)"
CHECKOUT="$WORKROOT/reviewed"
CREATED=0
SUCCESS=0
cleanup() {
  if [[ "$CREATED" == 1 ]]; then git -C "$ROOT" worktree remove --force "$CHECKOUT" >/dev/null 2>&1 || true; fi
  rm -rf -- "$WORKROOT"
  if [[ "$SUCCESS" != 1 ]]; then rm -rf -- "$OUT"; fi
}
trap cleanup EXIT
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
    ./node_modules/.bin/tsx scripts/v39_phase6_actual_release_candidate_export_v39.ts --review-only "$PIN"
) > "$OUT/review-only.json"
# Validate exact digest identities, actual candidate shape and all no-GO flags.
# This constructs an intentionally incomplete review draft, never stage input.
env -i PATH="$PATH" HOME="$OWNER_HOME" node - "$OUT" "$PIN" "$TREE" "$EXPECTED_MANIFEST" "$EXPECTED_INVENTORY" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [out,pin,tree,wantManifest,wantInventory]=process.argv.slice(2);
const hold=s=>{throw Error('HOLD_P5_REVIEW_PREPARATION_'+s)};
const requireThat=(ok,s)=>{if(!ok)hold(s)};
const raw=fs.readFileSync(path.join(out,'review-only.json'));
requireThat(raw.length>=100&&raw.length<2*1024*1024,'REVIEW_SIZE');
let j;try{j=JSON.parse(raw)}catch{hold('REVIEW_JSON')}
const r=j.releaseIdentityReview,rec=j.concreteReviewRecommendation;
const h=b=>crypto.createHash('sha256').update(b).digest('hex');
const exact=o=>JSON.stringify(o);
const write=(name,o)=>{const bytes=Buffer.from(exact(o));fs.writeFileSync(path.join(out,name),bytes,{flag:'wx',mode:0o600});return h(bytes)};
requireThat(j.reviewedCodeCandidate===pin&&r?.checkout?.codeSha===pin&&r?.checkout?.treeSha===tree,'CHECKOUT_IDENTITY');
requireThat(j.phase6PaidGo===false&&j.sourceRightsApproved===false&&j.actualBudgetReviewApproved===false&&j.providerCalls===0&&j.databaseWrites===0&&j.githubMutations===0,'REVIEW_NOT_INERT');
requireThat(r.status==='EXACT_CONTENT_DIGESTS_AND_GEOMETRY_REVIEW_ONLY_NOT_RELEASE'&&r.actualAuthorizationId===null&&r.finalPredecessorEvidenceIds===null&&r.candidateDigestsApproved===false&&r.stagePacketExported===false&&r.sourceRightsApproved===false&&r.scientificFreezeApproved===false&&r.phase6PaidGo===false,'AUTH_OR_APPROVAL_DRIFT');
requireThat(rec.status==='REVIEW_PROPOSAL_ONLY_NOT_SIGNED_NOT_APPROVED'&&rec.independentReviewerApproved===false&&rec.stageAuthorizationGranted===false&&rec.futureRefillConfirmed===false,'FINANCIAL_REVIEW_NOT_INERT');
const known={manifestCandidate:wantManifest,configCandidate:'e348f15d824364361929ce4a9184eec469df4df34ecf8960f76c55f46af5c665',timingEvidenceCandidate:'88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5',rangeEvidenceCandidate:'cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3'};
for(const [key,expected] of Object.entries(known)) requireThat(r[key]?.sha256===expected&&h(exact(r[key].content))===expected,'EXACT_'+key.toUpperCase()+'_DRIFT');
requireThat(r.sourceInventory?.length===2167&&h(exact(r.sourceInventory))===wantInventory&&r.manifestCandidate.content.sourceInventorySha256===wantInventory,'SOURCE_INVENTORY_DRIFT');
const rows=j.calendarDraft?.calendarDays;
requireThat(rows?.length===31&&h(exact(rows))==='45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c'&&r.calendarRowsDigestCandidate===h(exact(rows)),'ORIGINAL_CALENDAR_DRIFT');
requireThat(r.geometry?.dayPlanCount===31&&r.geometry?.totalQueries===6144&&r.geometry?.totalReservedUnits===41960&&r.geometry?.coverageGridSha256==='125988a1b7bdb08972e6029a46871d75e9dba65085f114dee811e27f8466b851','GEOMETRY_DRIFT');
requireThat(rec.netRestCeilingUnits===46468&&rec.proposedAlertSafety?.alertRunSpendCeilingCredits===3680&&rec.jointBudgetReview?.authorizedFutureRefillApiUnits===3000,'EXACT_BUDGET_PROPOSAL_DRIFT');
const external=j.externalCandidate;
requireThat(external.phase6AuthorizationId===null&&external.predecessorEvidenceIds===null&&external.manifestSha256===null&&external.configSha256===null,'EXTERNAL_CANDIDATE_ALREADY_FILLED');
const ext={...external,manifestSha256:wantManifest,calendarSha256:r.calendarRowsDigestCandidate,configSha256:known.configCandidate,codeSha40:pin,alertSafety:rec.proposedAlertSafety,providerRangeEvidenceSha256:known.rangeEvidenceCandidate,timingEvidenceSha256:known.timingEvidenceCandidate,cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
const missing=Object.entries(ext).filter(([,v])=>v===null).map(([k])=>k);
requireThat(exact(missing)===exact(['phase6AuthorizationId','predecessorEvidenceIds']),'UNEXPECTED_UNREVIEWED_FIELD_SET');
const timing={...j.timingCandidate,timingEvidenceSha256:known.timingEvidenceCandidate};
const receipt={status:'P5_EXACT_MAIN_PRIVATE_REVIEW_PREPARED_NOT_STAGE_OR_AUTH',mainSha:pin,treeSha:tree,reviewOnlySha256:h(raw),sourceInventorySha256:wantInventory,manifestCandidateSha256:wantManifest,configCandidateSha256:known.configCandidate,rangeEvidenceCandidateSha256:known.rangeEvidenceCandidate,timingEvidenceCandidateSha256:known.timingEvidenceCandidate,calendarRowsSha256:r.calendarRowsDigestCandidate,plannedSourceQueries:6144,plannedRestUnits:41960,calendarRows:31,externalReviewDraftSha256:write('external-input-offline-review-NOT-STAGE.json',ext),timingInputDraftSha256:write('timing-input-offline-review.json',timing),unfilledFields:missing,independentFinalApprovalRequired:true,sourceRightsApproved:false,scientificFreezeApproved:false,actualAuthorizationId:null,stagePacketExported:false,providerCalls:0,databaseWrites:0,githubSecretOrVariableChanges:0,workflowDispatches:0,phase6PaidGo:false,privateReviewDirectory:out};
write('manifest-candidate.json',r.manifestCandidate.content);write('config-candidate.json',r.configCandidate.content);write('timing-evidence-candidate.json',r.timingEvidenceCandidate.content);write('range-evidence-candidate.json',r.rangeEvidenceCandidate.content);
write('review-preparation-receipt.json',receipt);
NODE
[[ "$(remote_main)" == "$PIN" ]] || hold 'MAIN_CHANGED_AFTER_REVIEW'
[[ -z "$(git -C "$CHECKOUT" status --porcelain --untracked-files=no)" ]] || hold 'TRACKED_CHECKOUT_CHANGED'
SUCCESS=1
cat "$OUT/review-preparation-receipt.json"
printf '\nPRIVATE_REVIEW_READY_NO_STAGE_NO_AUTH_NO_PROVIDER\n'
