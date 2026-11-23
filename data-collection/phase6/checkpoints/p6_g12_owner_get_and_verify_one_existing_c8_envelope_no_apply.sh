#!/usr/bin/env bash
# G12 existing ONE-use sealed successor, owner held X25519 private key:
# Download the ONE verified AEAD ciphertext, decrypt+validate in-memory ONLY.
# No GH writes, no secret updates, no provider or production DB operations.
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
BR="phase6/20261122-g8-502-readback-evidence"
SHA="c8e065d665ccacb6d2575070e94c5500b7583044"
RELAY="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
RUN=45119501703
COMMIT="b98e02617fd1f49389197071904a38972333643e"
ARTIFACT_ID=14792972040
NAME="p6-g12-owner-encrypted-code-successor-45119501703"
DIGEST="sha256:46dd7bda42d62046c38538cc9d258a0911b4b60436e1fa3106a7fa4142cf0618"
VERIFY_BLOB="ab9d09a4475c2a77943b89d23aaade0a3334603b"
REQ="data-collection/phase6/checkpoints/p6_g12_owner_c8_code_repin_seal_request.json"
hold(){ printf 'HOLD_P6_G12_EXISTING_OWNER_VERIFY_ONLY_%s\n' "$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == VERIFY_FIRST_SUCCESSFUL_G12_C8_OWNER_ENVELOPE_NO_SECRET_WRITE_NO_PAID_GO ]] || hold EXACT_CONFIRM
for x in gh git jq node base64 cmp stat; do command -v "$x" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER_LOGIN
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" == "$SHA" ]] || hold TARGET_MAIN_CHANGED
[[ "$(gh api repos/HKcode22/TravnrClockRelay/git/ref/heads/main --jq .object.sha)" == "$RELAY" ]] || hold RELAY_MAIN_CHANGED
DIR="$HOME/.travnr-g12-seal-jUvJmL5A"
[[ -d "$DIR" && ! -L "$DIR" && "$(stat -c %a "$DIR")" == 700 ]] || hold ORIGINAL_OWNER_PRIVATE_DIR
for f in owner-private.pem request.json; do [[ -f "$DIR/$f" && ! -L "$DIR/$f" ]] || hold ORIGINAL_PRIVATE_FILE; done
[[ "$(stat -c %a "$DIR/owner-private.pem")" == 600 ]] || hold KEY_MODE
TMP="$(mktemp -d "$DIR/review.XXXXXXXX")"
trap 'rm -rf "$TMP"' EXIT
gh api -X GET "repos/$REPO/contents/$REQ" -f "ref=$BR" --jq .content |
 base64 --decode > "$TMP/git-request.json" || hold EXISTING_PUBLIC_REQUEST_FETCH
cmp -s "$DIR/request.json" "$TMP/git-request.json" || hold FIRST_OWNER_KEY_REQUEST_MISMATCH
gh api "repos/$REPO/actions/runs/$RUN" |
 jq -e --arg sha "$COMMIT" --arg branch "$BR" '
 .head_sha==$sha and .head_branch==$branch and .event=="push" and
 .run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null ||
 hold EXACT_SEAL_RUN_NOT_SUCCESS
gh api "repos/$REPO/actions/runs/$RUN/artifacts" |
 jq -e --arg name "$NAME" --arg digest "$DIGEST" --argjson id "$ARTIFACT_ID" '
 [.artifacts[] | select(.id==$id and .name==$name and .digest==$digest and
  .expired==false and .workflow_run.head_sha=="b98e02617fd1f49389197071904a38972333643e")] | length==1' >/dev/null ||
 hold ARTIFACT_METADATA_ID_DIGEST_NOT_MATCH
gh api "repos/$REPO/git/blobs/$VERIFY_BLOB" --jq .content |
 base64 --decode > "$TMP/verify.cjs" || hold VERIFIER_FETCH
test "$(git hash-object "$TMP/verify.cjs")" = "$VERIFY_BLOB" || hold VERIFIER_SHA
node --check "$TMP/verify.cjs" || hold VERIFIER_SYNTAX
mkdir -p "$DIR/artifact"
ENVELOPE="$DIR/artifact/p6-g12-owner-sealed-code-repin-successor.json"
if [[ ! -f "$ENVELOPE" ]]; then
 gh run download "$RUN" -R "$REPO" --name "$NAME" --dir "$DIR/artifact" ||
  hold ARTIFACT_DOWNLOAD_UNKNOWN_DO_NOT_RETRY_BLINDLY
fi
[[ -f "$ENVELOPE" && ! -L "$ENVELOPE" && -s "$ENVELOPE" ]] ||
 hold EXPECTED_ENCRYPTED_ARTIFACT_FILE_MISSING
node "$TMP/verify.cjs" "$DIR/owner-private.pem" "$ENVELOPE" "$DIR/request.json" ||
 hold OWNER_AEAD_OR_POLICY_VERIFY_FAILED_NO_SECRET_MUTATION
echo '{"status":"P6_G12_FIRST_OWNER_C8_ENCRYPTED_SUCCESSOR_AUTHENTICATED_VERIFY_ONLY_NO_PAID_GO","githubSecretWrites":0,"providerCalls":0,"databaseWrites":0,"paidGo":false,"next":"INDEPENDENT_EXACT_17_SCOPE_AND_INSTALL_REVIEW"}'
