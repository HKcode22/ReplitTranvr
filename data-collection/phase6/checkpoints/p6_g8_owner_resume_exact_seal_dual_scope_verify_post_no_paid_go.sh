#!/usr/bin/env bash
# Phase 6 G8: resume ONLY the existing successful X25519 owner envelope.
# Do not send another public-key request or run the previous helper again.
# Exact owner-private decrypted source remains on OWNER machine. No provider/DB.
set -Eeuo pipefail
set +x
umask 077

R="HKcode22/ReplitTranvr"
BR="phase6/20261122-g8-502-readback-evidence"
MAIN="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RELAY="HKcode22/TravnrClockRelay"
RELAY_MAIN="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
SEAL_COMMIT="18b8b506ab21c09d30c7f56d4970fa0cb70d3ead"
SEAL_RUN="45026584506"
DECODER_BLOB="ddc7e497f019b881d7dc41e636fae2dd01c36b1f"
READBACK_WF=".github/workflows/phase6-g8-exact-main-secret-scopes-postinstall-no-provider.yml"
READBACK_WF_BLOB="e3fcd143e10a4935b652b2f00e17f5bc3c36fa49"
TRIGGER="data-collection/phase6/evidence/p6_g8_oneuse_postinstall_readback.json"
REQUEST="data-collection/phase6/checkpoints/p6_g8_owner_seal_request.json"
READBACK_TITLE="P6 G8 exact current repository policy postinstall readback NO PROVIDER"
POST_WF="phase5-one-signed-future-post-v0083-main-manual.yml"

hold(){ printf 'HOLD_P6_G8_EXISTING_SEAL_DUAL_SCOPE_%s\n' "$1" >&2; exit 2; }
[[ $# -eq 2 && "$1" == "RESUME_ORIGINAL_OWNER_SEAL_EXACT_11_REPO_AND_2_BOTH_SCOPES_NO_PAID_GO" ]] ||
  hold CONFIRM_AND_PRIVATE_DIRECTORY
DIR="$2"
[[ "$DIR" == "$HOME"/.travnr-g8-seal-* && -d "$DIR" && ! -L "$DIR" ]] ||
  hold EXISTING_OWNER_DIR_SCOPE
[[ -f "$DIR/owner-private.pem" && ! -L "$DIR/owner-private.pem" &&
   -f "$DIR/request.json" && ! -L "$DIR/request.json" &&
   -f "$DIR/artifact/p6-g8-owner-sealed-policy-successor.json" ]] ||
  hold ORIGINAL_OWNER_FILES_MISSING
[[ "$(stat -c %a "$DIR")" == "700" ]] || hold PRIVATE_DIRECTORY_PERMISSIONS
[[ "$(stat -c %a "$DIR/owner-private.pem")" == "600" ]] || hold PRIVATE_KEY_PERMISSIONS
[[ ! -e "$DIR/g8-resume-once.started" ]] || hold ALREADY_ATTEMPTED_DO_NOT_REPEAT

assert_main(){
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$MAIN" ]] || hold MAIN_DRIFT
 [[ "$(gh api "repos/$RELAY/git/ref/heads/main" --jq '.object.sha')" == "$RELAY_MAIN" ]] ||
  hold RELAY_DRIFT
}
[[ "$(gh api user --jq '.login')" == "HKcode22" ]] || hold OWNER
assert_main
gh api "repos/$R/actions/runs/$SEAL_RUN" |
 jq -e --arg sha "$SEAL_COMMIT" '
 .head_sha==$sha and .head_branch=="phase6/20261122-g8-502-readback-evidence" and
 .event=="push" and .run_attempt==1 and .status=="completed" and .conclusion=="success"
 ' >/dev/null || hold ORIGINAL_SEAL_RUN_NOT_VERIFIED
[[ "$(gh api -X GET "repos/$R/contents/$READBACK_WF" -f "ref=$BR" --jq .sha)" == "$READBACK_WF_BLOB" ]] ||
 hold READBACK_WORKFLOW_CHANGED
# Public request must be byte-exact with the EXISTING locally retained owner key.
TMP="$(mktemp -d "$DIR/owner-resume.XXXXXXXX")"
trap 'rm -rf "$TMP"' EXIT
gh api -X GET "repos/$R/contents/$REQUEST" -f "ref=$BR" --jq '.content' |
 base64 --decode > "$TMP/original-public-request.json" || hold REQUEST_UNREADABLE
cmp -s "$TMP/original-public-request.json" "$DIR/request.json" || hold REQUEST_MISMATCH
# Never assume that a marker is absent from an HTTP 404: GitHub's create-only
# PUT without sha will refuse an already created trigger, even on unknown POST.
gh api "repos/$R/git/blobs/$DECODER_BLOB" --jq '.content' |
 base64 --decode > "$TMP/resume-decoder.cjs" || hold DECODER_FETCH
[[ "$(git hash-object "$TMP/resume-decoder.cjs")" == "$DECODER_BLOB" ]] || hold DECODER_BLOB_MISMATCH
node --check "$TMP/resume-decoder.cjs" || hold DECODER_SYNTAX
ENVELOPE="$DIR/artifact/p6-g8-owner-sealed-policy-successor.json"
node "$TMP/resume-decoder.cjs" --verify "$DIR/owner-private.pem" "$ENVELOPE" "$DIR/request.json" ||
 hold ORIGINAL_OWNER_CIPHERTEXT_NOT_VALID
assert_main

# One-use intent marker BEFORE any write. If interrupted, inspect readback;
# do not generate a second seal or blindly redo partially succeeded gh writes.
( set -C; printf '%s\n' "sealRun=$SEAL_RUN; main=$MAIN; controlled dual-scope resume" > "$DIR/g8-resume-once.started" ) ||
 hold LOCAL_ONEUSE_MARKER_FAILED

node "$TMP/resume-decoder.cjs" --apply "$DIR/owner-private.pem" "$ENVELOPE" "$DIR/request.json" ||
 hold UNKNOWN_OR_PARTIAL_SECRET_INSTALL_PAID_OFF_NO_BLIND_REPLAY
assert_main

# Read back all 31 actual repository policy values and repo STOP=0 with a
# branch-only no-provider job. Protected environment refuses evidence-branch
# jobs (run 45027633216, failure before any steps); the existing main-only
# POST actor preflight below is the effective protected-env verifier, and
# explicitly enforces BOTH paid STOP flags 0 there.
printf '{"schema":"v39.phase6.g8.postinstall-scope-readback.v1","approvedMainSha":"%s","sealedRunId":%s,"expectedStaticSha256":"%s","expectedPostSha256":"%s","paidGo":false}\n' \
 "$MAIN" "$SEAL_RUN" \
 "3bb538896d2023ed1ff54b1b0d914a8a134299eac3a5068827e93d82400864b0" \
 "0916015a99b379d4ff703f59530794577c5c5ab2404e6cdfc1112921f165b54d" > "$TMP/trigger.json"
jq -n --arg branch "$BR" \
 --arg message "p6(g8): read back 11 installed policies and two dual-scope OFF controls" \
 --arg content "$(base64 -w0 "$TMP/trigger.json")" \
 '{branch:$branch,message:$message,content:$content}' > "$TMP/request.json"
COMMIT="$(gh api -X PUT "repos/$R/contents/$TRIGGER" --input "$TMP/request.json" --jq '.commit.sha')" ||
 hold UNKNOWN_READBACK_TRIGGER_ACK_NO_REPLAY
[[ "$COMMIT" =~ ^[a-f0-9]{40}$ ]] || hold UNKNOWN_READBACK_TRIGGER_COMMIT
echo "P6_G8_POSTINSTALL_READBACK_TRIGGER_COMMIT=$COMMIT"

READBACK=""
for i in $(seq 1 65); do
 DATA="$(gh api "repos/$R/actions/runs?per_page=100")" || hold READBACK_HISTORY_GET
 READBACK="$(jq -r --arg sha "$COMMIT" --arg title "$READBACK_TITLE" '
  [.workflow_runs[]|select(.head_sha==$sha and .name==$title and
    .event=="push" and .run_attempt==1)|.id]|
  if length==1 then .[0] else empty end' <<<"$DATA")"
 [[ "$READBACK" =~ ^[1-9][0-9]*$ ]] && break
 sleep 2
done
[[ "$READBACK" =~ ^[1-9][0-9]*$ ]] || hold READBACK_ACTION_UNKNOWN
echo "P6_G8_EXACT_REPO_AND_PROTECTED_ENV_READBACK_RUN_ID=$READBACK"
gh run watch "$READBACK" -R "$R" --interval 5 --exit-status ||
 hold INSTALLED_SCOPE_READBACK_FAILED_KEEP_PAID_OFF
gh api "repos/$R/actions/runs/$READBACK" |
 jq -e --arg sha "$COMMIT" '
 .head_sha==$sha and .head_branch=="phase6/20261122-g8-502-readback-evidence" and
 .run_attempt==1 and .event=="push" and .status=="completed" and .conclusion=="success"
 ' >/dev/null || hold READBACK_MAIN_IDENTITY
gh api "repos/$R/actions/runs/$READBACK/jobs?filter=latest&per_page=100" |
 jq -e '
 .total_count==1 and (.jobs|length)==1 and
 ([.jobs[]|select(.name=="repository-secret-readback" and
   .status=="completed" and .conclusion=="success" and
   ([.steps[]|select(.name=="Check 31 canonical installed policy values and both OFF switches in THIS scope" and .conclusion=="success")]|length)==1)]|length)==1
 ' >/dev/null || hold REPOSITORY_CURRENT_POLICY_NOT_ACTUALLY_PROVEN
assert_main
echo "P6_G8_REPOSITORY_CURRENT_31_POLICY_DIGEST_AND_REPO_PAID_STOPS_PASS_PENDING_PROTECTED_MAIN_ACTOR_PREFLIGHT"

# One existing MAIN-only protected actor workflow verifies effective ENV STOP=0
# and the actual bound POST reviewer/publisher/storage with no provider GET.
Q="repos/$R/actions/workflows/$POST_WF/runs?branch=main&event=workflow_dispatch&per_page=100"
gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$TMP/post-before" || hold POST_BEFORE_INVENTORY
gh workflow run "$POST_WF" -R "$R" --ref main \
 -f confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER \
 -f frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY \
 -f private_transport=checkout ||
 hold UNKNOWN_POST_DISPATCH_DO_NOT_REPEAT
POST=""
for i in $(seq 1 60); do
 gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$TMP/post-after" || hold POST_AFTER_INVENTORY
 comm -13 "$TMP/post-before" "$TMP/post-after" > "$TMP/post-new"
 N="$(wc -l < "$TMP/post-new" | tr -d ' ')"
 [[ "$N" -le 1 ]] || hold MULTIPLE_POST_RUNS_NO_BLIND_REPLAY
 if [[ "$N" == "1" ]]; then POST="$(cat "$TMP/post-new")"; break; fi
 sleep 2
done
[[ "$POST" =~ ^[1-9][0-9]*$ ]] || hold UNKNOWN_POST_RUN_ACK
echo "P6_G8_EXACT_MAIN_PROTECTED_POST_ACTOR_PREFLIGHT_RUN_ID=$POST"
gh run watch "$POST" -R "$R" --interval 5 --exit-status ||
 hold CURRENT_MAIN_POST_ACTORS_HOLD_KEEP_PAID_OFF
gh api "repos/$R/actions/runs/$POST" |
 jq -e --arg sha "$MAIN" '
 .head_sha==$sha and .head_branch=="main" and
 .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY" and
 .event=="workflow_dispatch" and .run_attempt==1 and
 .status=="completed" and .conclusion=="success"
 ' >/dev/null || hold POST_RUN_IDENTITY
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
 ' >/dev/null || hold ALL_FOUR_POST_ACTOR_STEPS_NOT_VERIFIED
assert_main
echo "{\"status\":\"P6_G8_EXISTING_SEAL_REPOSITORY_POLICY_DIGEST_AND_MAIN_PROTECTED_ENV_POST_ACTORS_PASS_PAID_OFF\",\"sealedRunId\":$SEAL_RUN,\"repoReadbackRunId\":$READBACK,\"protectedMainPostRunId\":$POST,\"providerCalls\":0,\"paidGo\":false}"
