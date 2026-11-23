#!/usr/bin/env bash
# G12: one-use exact c8 reviewed 17-existing-secret metadata-only SHA successor.
# Never paid GO. Owner holds private key. Protect GH STOP at repo and env.
# Download and verify original ONE authenticated G12 artifact, install exactly
# 17 repo-only changes, require full repo-31 readback and main-only protected
# POST actor preflight. On uncertainty HOLD; NEVER blindly repeat.
set -Eeuo pipefail
set +x
umask 077
R="HKcode22/ReplitTranvr"
BR="phase6/20261122-g8-502-readback-evidence"
MAIN="c8e065d665ccacb6d2575070e94c5500b7583044"
RELAY="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
DIR="$HOME/.travnr-g12-seal-jUvJmL5A"
VERIFY_BLOB="8526274933156ca5d0c3aa9ec23e1e9719fd7efb"
INSTALL_BLOB="6641c5290afbd0a5bbc108177d5a51995c81f9a1"
READBACK_WF=".github/workflows/phase6-g12-c8-installed-code-policy-postinstall-no-provider.yml"
READBACK_WF_BLOB="f0a055696b5a5594baa9861cf90f8f05321235cf"
READBACK_TITLE="P6 G12 exact current c8 policy postinstall readback NO PROVIDER"
READBACK_MARKER="data-collection/phase6/evidence/p6_g12_oneuse_c8_policy_postinstall_readback.json"
POST_WF="phase5-one-signed-future-post-v0083-main-manual.yml"
hold(){ printf 'HOLD_P6_G12_OWNER_CODE_SUCCESSOR_%s\n' "$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == INSTALL_ONE_AUTHENTICATED_G12_C8_LINKED_CODE_SUCCESSOR_ALL_PAID_STOPS_OFF ]] || hold CONFIRM
for bin in gh git jq node base64 cmp comm; do command -v "$bin" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold OWNER
pin(){
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$MAIN" ]] || hold MAIN_MOVED
 [[ "$(gh api "repos/HKcode22/TravnrClockRelay/git/ref/heads/main" --jq .object.sha)" == "$RELAY" ]] || hold RELAY_MAIN_MOVED
}
pin
[[ -f "$PWD/package.json" && -d "$PWD/scripts" ]] || hold ORIGINAL_REPLIT_WORKSPACE
[[ -d "$DIR" && ! -L "$DIR" && -f "$DIR/owner-private.pem" &&
    -f "$DIR/request.json" ]] || hold FIRST_SUCCESSFUL_OWNER_PRIVATE_FILES_ONLY
[[ ! -e "$DIR/g12-install-once.started" ]] || hold ALREADY_ATTEMPTED_DO_NOT_REPEAT
[[ ! -e "$HOME/.travnr-p6-g13-owner-paid-go-once.started" ]] || hold PAID_GO_ALREADY_ATTEMPTED
gh api "repos/$R/actions/runs/45119501703" |
 jq -e '.head_sha=="b98e02617fd1f49389197071904a38972333643e" and .run_attempt==1 and .conclusion=="success"' >/dev/null || hold ORIGINAL_ENCRYPTED_RUN
gh api "repos/$R/actions/runs/45118733902" |
 jq -e '.run_attempt==1 and .conclusion=="success"' >/dev/null || hold ORIGINAL_FULL_VALIDATOR
gh api "repos/$R/actions/runs/45120907935" |
 jq -e '.run_attempt==1 and .conclusion=="success"' >/dev/null || hold INSTALL_SOURCE_OFFLINE_CI
gh api "repos/$R/actions/runs/45118631787" |
 jq -e --arg sha "$MAIN" '.head_sha==$sha and .run_attempt==1 and .conclusion=="success"' >/dev/null || hold AUTONOMOUS_EXTERNAL_RETENTION
[[ "$(gh api -X GET "repos/$R/contents/$READBACK_WF" -f "ref=$BR" --jq .sha)" == "$READBACK_WF_BLOB" ]] ||
 hold REPOSITORY_READBACK_WORKFLOW_CHANGED
TMP="$(mktemp -d "$PWD/scripts/.p6-g12-code-XXXXXXXX")"
trap 'rm -rf -- "$TMP"' EXIT
fetch(){
 local blob="$1" file="$2"
 gh api "repos/$R/git/blobs/$blob" --jq .content | base64 --decode > "$file" || hold SOURCE_DOWNLOAD
 [[ "$(git hash-object "$file")" == "$blob" ]] || hold SCRIPT_CONTENT_DRIFT
}
fetch "$VERIFY_BLOB" "$TMP/verify.sh"
fetch "$INSTALL_BLOB" "$TMP/install.cjs"
bash -n "$TMP/verify.sh" || hold VERIFY_BASH_SYNTAX
node --check "$TMP/install.cjs" || hold INSTALL_JS_SYNTAX
# No mutation in G12 artifact verification or name/scope inventory.
bash "$TMP/verify.sh" VERIFY_FIRST_SUCCESSFUL_G12_C8_OWNER_ENVELOPE_NO_SECRET_WRITE_NO_PAID_GO ||
 hold ORIGINAL_AEAD_OR_EXACT_SCOPE_NOT_VERIFIED_NO_INSTALL
pin
# Re-validate the same authenticated G12 sealed artifact under the code that
# will perform the one-use secret update. No secret value is printed.
node "$TMP/install.cjs" --verify "$DIR/owner-private.pem" \
 "$DIR/artifact/p6-g12-owner-sealed-code-repin-successor.json" \
 "$DIR/request.json" || hold ACTUAL_INSTALLER_VERIFICATION
pin
# This is the ONLY nonpaid policy mutation. Its internal monotone local
# one-use marker precedes any GitHub secret write; it sets both paid STOP
# controls to 0 at BOTH scopes, then EXACT 17 existing repo-only names.
node "$TMP/install.cjs" --apply "$DIR/owner-private.pem" \
 "$DIR/artifact/p6-g12-owner-sealed-code-repin-successor.json" \
 "$DIR/request.json" || hold UNKNOWN_PARTIAL_SECRET_UPDATE_NO_BLIND_RETRY
pin
# Create new public-only marker on evidence branch, no secret material.
printf '{"schema":"v39.phase6.g12.c8-owner-postinstall-readback.v1","reviewedMainSha":"%s","originalSealRunId":45119501703,"candidateStaticSha256":"%s","existingCodeAndPolicySecretUpdates":17,"bothPaidControlsZero":true,"paidGo":false}\n' \
 "$MAIN" "7dc679d27f7d9b3db7d011f1cb53a6b960513a88e5de6c720192ca8b35b01f61" > "$TMP/marker.json"
jq -n --arg branch "$BR" \
 --arg message "g12: read back exact installed c8 source metadata and both paid STOPs no provider" \
 --arg content "$(base64 -w0 "$TMP/marker.json")" \
 '{branch:$branch,message:$message,content:$content}' > "$TMP/put.json"
MARKER_COMMIT="$(gh api -X PUT "repos/$R/contents/$READBACK_MARKER" \
 --input "$TMP/put.json" --jq .commit.sha)" ||
 hold UNKNOWN_MARKER_ACK_DO_NOT_REPEAT
[[ "$MARKER_COMMIT" =~ ^[a-f0-9]{40}$ ]] || hold MARKER_COMMIT_ACK
echo "P6_G12_REPOSITORY_EXACT_READBACK_TRIGGER_COMMIT=$MARKER_COMMIT"
READBACK=""
for i in $(seq 1 65); do
 GH_RUNS="$(gh api "repos/$R/actions/runs?per_page=100")" || hold REPO_READBACK_HISTORY
 READBACK="$(jq -r --arg sha "$MARKER_COMMIT" --arg title "$READBACK_TITLE" '
  [.workflow_runs[]|select(.head_sha==$sha and .name==$title and
    .run_attempt==1 and .event=="push")|.id]|
  if length==1 then .[0] else empty end' <<<"$GH_RUNS")"
 [[ "$READBACK" =~ ^[1-9][0-9]*$ ]] && break
 sleep 2
done
[[ "$READBACK" =~ ^[1-9][0-9]*$ ]] || hold REPO_READBACK_RUN_NOT_OBSERVED
echo "P6_G12_REPO_31_VALUE_READBACK_RUN_ID=$READBACK"
gh run watch "$READBACK" -R "$R" --interval 5 --exit-status ||
 hold REPOSITORY_31_CURRENT_DIGEST_FAILED_PAID_OFF
gh api "repos/$R/actions/runs/$READBACK" |
 jq -e --arg sha "$MARKER_COMMIT" '.head_sha==$sha and .run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null ||
 hold REPOSITORY_READBACK_RUN_SCOPE
gh api "repos/$R/actions/runs/$READBACK/jobs?filter=latest&per_page=100" |
 jq -e '[.jobs[]|select(.name=="repository-secret-readback" and .conclusion=="success" and
  ([.steps[]|select(.name=="Check 31 canonical installed policy values and both OFF switches in THIS scope" and .conclusion=="success")]|length)==1)]|length==1' >/dev/null ||
 hold REPOSITORY_31_ACTUAL_STEP_NOT_PROVEN
pin
echo "P6_G12_REPOSITORY_31_STATIC_AND_LINKED_POST_PASSED_PAID_OFF"
# After the full repository-secret readback only, use the existing production
# MAIN protected POST actor preflight (no data or provider call).
Q="repos/$R/actions/workflows/$POST_WF/runs?branch=main&event=workflow_dispatch&per_page=100"
gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$TMP/before" || hold POST_RUN_INVENTORY
gh workflow run "$POST_WF" -R "$R" --ref main \
 -f confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER \
 -f frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY \
 -f private_transport=checkout || hold UNKNOWN_POST_DISPATCH_DO_NOT_REPEAT
POST=""
for i in $(seq 1 60); do
 gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$TMP/after" || hold POST_RUN_HISTORY
 comm -13 "$TMP/before" "$TMP/after" > "$TMP/new"
 N="$(wc -l < "$TMP/new" | tr -d ' ')"
 [[ "$N" -le 1 ]] || hold MULTIPLE_PROTECTED_POST_RUNS
 if [[ "$N" == 1 ]]; then POST="$(cat "$TMP/new")"; break; fi
 sleep 2
done
[[ "$POST" =~ ^[1-9][0-9]*$ ]] || hold PROTECTED_POST_ACK_UNKNOWN
echo "P6_G12_CURRENT_C8_MAIN_PROTECTED_POST_ACTOR_RUN_ID=$POST"
gh run watch "$POST" -R "$R" --interval 5 --exit-status ||
 hold PROTECTED_POST_ACTOR_FAILED_PAID_OFF
gh api "repos/$R/actions/runs/$POST" | jq -e --arg sha "$MAIN" '
 .head_sha==$sha and .head_branch=="main" and
 .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY" and .run_attempt==1 and
 .status=="completed" and .conclusion=="success" and .event=="workflow_dispatch"' >/dev/null ||
 hold PROTECTED_CURRENT_MAIN_RUN_IDENTITY
gh api "repos/$R/actions/runs/$POST/jobs?filter=latest&per_page=100" |
 jq -e --arg sha "$MAIN" '
 [.jobs[]|select(.name=="exact-main-post-actors-only" and .head_sha==$sha and
   .run_attempt==1 and .conclusion=="success")] as $a |
 ($a|length)==1 and
 (([$a[0].steps[]|select(.conclusion=="success" and
   (.name=="Verify exact disarmed POST actor admission" or
    .name=="Preflight actual independent POST reviewer no observation" or
    .name=="Preflight actual restricted POST publisher and deadline clock" or
    .name=="Preflight exact independent bundle storage actors"))]|length)==4)
 ' >/dev/null || hold PROTECTED_MAIN_FOUR_STEP_EVIDENCE
pin
printf '{"status":"P6_G12_CURRENT_C8_31_POLICY_AND_PROTECTED_POST_ACTORS_PASS_PAID_OFF","main":"%s","repoReadbackRunId":%s,"protectedMainPostRunId":%s,"reviewedExistingSecretWrites":17,"providerCalls":0,"databaseWrites":0,"paidGo":false,"futureExplicitOwnerG13StillRequired":true}\n' \
 "$MAIN" "$READBACK" "$POST"
