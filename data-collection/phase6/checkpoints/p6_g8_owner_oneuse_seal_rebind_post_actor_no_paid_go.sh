#!/usr/bin/env bash
# Exact owner-only, no-provider, no-DB Gate8 protected-policy recovery.
# Writes 11 already-present repo secrets, plus 2 global STOP=0 values.
# No SOURCE/cron/new DB/main commit/paid GO. Do not rerun after unknown ACK.
set -Eeuo pipefail
set +x
umask 077
R="HKcode22/ReplitTranvr"
BR="phase6/20261122-g8-502-readback-evidence"
PIN="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RELAY="HKcode22/TravnrClockRelay"
RELAY_SHA="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
PRIOR="7e07047d7173cbcf84e966ab869d66477efef36df38c83c58325396f31b83728"
REQUEST="data-collection/phase6/checkpoints/p6_g8_owner_seal_request.json"
SEALED="P6 G8 owner sealed existing policy successor (NO PROVIDER)"
DECODER_BLOB="f54bb91138fba5ca22c4b16caac695d365ba0670"
POST_WF="phase5-one-signed-future-post-v0083-main-manual.yml"
hold(){ echo "HOLD_P6_G8_OWNER_ENCRYPTED_REBIND_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == EXACT_EXISTING_POLICY_OWNER_SEALED_REBIND_AND_POST_PREFLIGHT_NO_PAID_GO ]] || hold CONFIRM
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
pin(){
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$PIN" ]] || hold MAIN_CHANGED
 [[ "$(gh api "repos/$RELAY/git/ref/heads/main" --jq .object.sha)" == "$RELAY_SHA" ]] || hold RELAY_CHANGED
}
pin
[[ "$(gh api "repos/$R/actions/runs/45024854391" --jq .conclusion)" == success ]] || hold PREVIOUS_31_VALUE_PROOF
[[ "$(gh api -X GET "repos/$R/contents/.github/workflows/phase6-g8-seal-existing-repo-policy-successor-owner-only.yml" -f "ref=$BR" --jq .sha)" == f93b205384940c490e29e37d15ec1e1694a2fcfe ]] || hold WORKFLOW_CHANGED
[[ "$(gh api -X GET "repos/$R/contents/data-collection/phase6/checkpoints/p6_g8_seal_existing_policy_successor_no_paid_go.cjs" -f "ref=$BR" --jq .sha)" == f962af815026bcaa689d7e6ecfba15d2b0150328 ]] || hold SEAL_TRANSFORM_CHANGED
names="$(gh api -X GET "repos/$R/contents/data-collection/phase6/checkpoints" -f "ref=$BR" --jq '.[].name')" || hold BRANCH_LIST_UNREADABLE
! grep -Fxq p6_g8_owner_seal_request.json <<< "$names" || hold REQUEST_ALREADY_EXISTS_NO_REPLAY

PRIVATE="$(mktemp -d "$HOME/.travnr-g8-seal-XXXXXXXX")"
chmod 700 "$PRIVATE"
DONE=0
cleanup(){
 if [[ "$DONE" == 1 ]]; then rm -rf "$PRIVATE"
 else
  echo "P6_G8_PRIVATE_OWNER_RECOVERY_DIR=$PRIVATE" >&2
  echo "Retain privately for recovery. DO NOT share private key or rerun request." >&2
 fi
}
trap cleanup EXIT
node - "$PRIVATE" "$PIN" "$PRIOR" <<'JS'
const fs=require('node:fs'),path=require('node:path');
const {generateKeyPairSync,randomBytes}=require('node:crypto');
const [dir,sha,historical]=process.argv.slice(2);
const {privateKey,publicKey}=generateKeyPairSync('x25519');
fs.writeFileSync(path.join(dir,'owner-private.pem'),
 privateKey.export({format:'pem',type:'pkcs8'}),{flag:'wx',mode:0o600});
const request={schema:'v39.phase6.gate8.owner-seal-request.v1',
 mainSha:sha,historicalDigest:historical,nonce:randomBytes(16).toString('hex'),
 recipientPublicSpkiBase64:publicKey.export({format:'der',type:'spki'}).toString('base64'),
 requestedAtUtc:new Date().toISOString()};
fs.writeFileSync(path.join(dir,'request.json'),JSON.stringify(request),{flag:'wx',mode:0o600});
JS
jq -n --arg branch "$BR" --arg message "g8 owner encrypted one-use policy successor no paid" \
 --arg content "$(base64 -w0 "$PRIVATE/request.json")" \
 '{branch:$branch,message:$message,content:$content}' > "$PRIVATE/put.json"
pin
COMMIT="$(gh api -X PUT "repos/$R/contents/$REQUEST" --input "$PRIVATE/put.json" --jq .commit.sha)" ||
 hold UNKNOWN_REQUEST_COMMIT_NO_REPLAY
[[ "$COMMIT" =~ ^[a-f0-9]{40}$ ]] || hold REQUEST_COMMIT_ACK
echo "P6_G8_SEALED_REQUEST_COMMIT=$COMMIT"

RUN=""
for i in $(seq 1 70); do
 data="$(gh api "repos/$R/actions/runs?per_page=100")" || hold SEALED_RUNS_READ
 RUN="$(jq -r --arg sha "$COMMIT" --arg name "$SEALED" '
 [.workflow_runs[]|select(.head_sha==$sha and .name==$name and .event=="push" and .run_attempt==1)|.id]|
 if length==1 then .[0] else empty end' <<<"$data")"
 if [[ "$RUN" =~ ^[1-9][0-9]*$ ]]; then break; fi
 sleep 2
done
[[ "$RUN" =~ ^[1-9][0-9]*$ ]] || hold NO_OWNER_SEALED_RUN
echo "P6_G8_SEALED_ACTION_RUN_ID=$RUN"
gh run watch "$RUN" -R "$R" --interval 5 --exit-status || hold SEALED_JOB_FAILED_NO_SECRET_WRITES
gh api "repos/$R/actions/runs/$RUN" | jq -e --arg sha "$COMMIT" '
 .head_sha==$sha and .head_branch=="phase6/20261122-g8-502-readback-evidence" and
 .name=="P6 G8 owner sealed existing policy successor (NO PROVIDER)" and
 .run_attempt==1 and .conclusion=="success"' >/dev/null || hold SEALED_RUN_IDENTITY
gh api "repos/$R/actions/runs/$RUN/jobs?filter=latest&per_page=100" |
 jq -e '.total_count==1 and ([.jobs[]|select(.name=="one-owner-sealed-successor" and .conclusion=="success")]|length)==1' >/dev/null ||
 hold SEALED_JOB_IDENTITY
gh run download "$RUN" -R "$R" --name "p6-g8-owner-encrypted-successor-$RUN" --dir "$PRIVATE/artifact" ||
 hold SEALED_ARTIFACT_DOWNLOAD
ENVELOPE="$PRIVATE/artifact/p6-g8-owner-sealed-policy-successor.json"
test -s "$ENVELOPE" || hold SEALED_ARTIFACT_NOT_PRESENT
gh api "repos/$R/git/blobs/$DECODER_BLOB" --jq '.content' |
 base64 --decode > "$PRIVATE/decode.cjs" || hold DECODER_DOWNLOAD
test "$(git hash-object "$PRIVATE/decode.cjs")" = "$DECODER_BLOB" || hold DECODER_HASH
node --check "$PRIVATE/decode.cjs" || hold DECODER_SYNTAX
node "$PRIVATE/decode.cjs" --verify "$PRIVATE/owner-private.pem" "$ENVELOPE" "$PRIVATE/request.json" ||
 hold DECRYPT_OR_POLICY_VERIFY_FAILED_NO_WRITES
pin
node "$PRIVATE/decode.cjs" --apply "$PRIVATE/owner-private.pem" "$ENVELOPE" "$PRIVATE/request.json" ||
 hold SECRET_SET_UNKNOWN_KEEP_PAID_STOP_AND_PRIVATE_DIR
pin

# AFTER 11 exact successor secrets have been acknowledged, perform exactly
# one disarmed protected reviewer/publisher/storage preflight on frozen main.
Q="repos/$R/actions/workflows/$POST_WF/runs?branch=main&event=workflow_dispatch&per_page=100"
gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$PRIVATE/before" || hold POST_INVENTORY
gh workflow run "$POST_WF" -R "$R" --ref main \
 -f confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER \
 -f frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY -f private_transport=checkout ||
 hold POST_DISPATCH_UNKNOWN_NO_REPLAY
POST=""
for i in $(seq 1 60); do
 gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$PRIVATE/after" || hold POST_ACK_INVENTORY
 comm -13 "$PRIVATE/before" "$PRIVATE/after" > "$PRIVATE/new"
 N="$(wc -l < "$PRIVATE/new" | tr -d ' ')"
 [[ "$N" -le 1 ]] || hold MULTIPLE_POST_RUN_ACKS
 if [[ "$N" == 1 ]]; then POST="$(cat "$PRIVATE/new")"; break; fi
 sleep 2
done
[[ "$POST" =~ ^[1-9][0-9]*$ ]] || hold POST_ACK_UNKNOWN_NO_REPLAY
echo "P6_G8_CURRENT_MAIN_PROTECTED_POST_RUN_ID=$POST"
gh run watch "$POST" -R "$R" --interval 5 --exit-status ||
 hold PROTECTED_POST_ACTOR_FAILED_PAID_OFF_NO_REPLAY
gh api "repos/$R/actions/runs/$POST" | jq -e --arg sha "$PIN" '
 .head_sha==$sha and .head_branch=="main" and
 .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY" and .event=="workflow_dispatch" and
 .run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null ||
 hold POST_RUN_IDENTITY
gh api "repos/$R/actions/runs/$POST/jobs?filter=latest&per_page=100" |
 jq -e --arg sha "$PIN" '
 ([.jobs[]|select(.name=="exact-main-post-actors-only" and .head_sha==$sha and
   .run_attempt==1 and .conclusion=="success")]|length)==1 and
 ([.jobs[]|select(.name=="exact-main-post-actors-only")][0].steps|map(select(
   .name=="Verify exact disarmed POST actor admission" or
   .name=="Preflight actual independent POST reviewer no observation" or
   .name=="Preflight actual restricted POST publisher and deadline clock" or
   .name=="Preflight exact independent bundle storage actors")|
   select(.conclusion=="success"))|length)==4
 ' >/dev/null || hold POST_ALL_FOUR_STEPS
pin
echo "{\"status\":\"P6_G8_INSTALLED_HISTORIC_PROVENANCE_POLICY_SUCCESSOR_AND_THREE_PROTECTED_POST_ACTORS_EXACT_MAIN_PASS_NO_PAID_GO\",\"sealedRunId\":$RUN,\"postRunId\":$POST,\"phase6PaidGo\":false,\"providerCalls\":0}"
DONE=1
