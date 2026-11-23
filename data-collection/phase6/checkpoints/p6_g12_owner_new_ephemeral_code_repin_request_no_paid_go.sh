#!/usr/bin/env bash
# G12: one fresh owner-held X25519 key, public request only.
# NO provider, DB, repo production main/secret, cron, or paid GO mutation.
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
BR="phase6/20261122-g8-502-readback-evidence"
MAIN="c8e065d665ccacb6d2575070e94c5500b7583044"
RELAY="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
PRIOR="3bb538896d2023ed1ff54b1b0d914a8a134299eac3a5068827e93d82400864b0"
REQUEST="data-collection/phase6/checkpoints/p6_g12_owner_c8_code_repin_seal_request.json"
hold(){ echo "HOLD_P6_G12_FRESH_OWNER_ENCRYPTION_REQUEST_$1" >&2; exit 2; }
[[ $# == 1 && "$1" == CREATE_ONE_FRESH_G12_OWNER_PUBLIC_KEY_ONLY_AFTER_FULL_VALIDATOR_NO_PAID_GO ]] || hold EXACT_CONFIRM
for x in gh jq node git base64; do command -v "$x" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" == "$MAIN" ]] || hold TARGET_MAIN_DRIFT
[[ "$(gh api "repos/HKcode22/TravnrClockRelay/git/ref/heads/main" --jq .object.sha)" == "$RELAY" ]] || hold RELAY_MAIN_DRIFT
# The public request must be sealed by the exact already-reviewed
# evidence-branch workflow and code, not a silently replaced branch copy.
[[ "$(gh api -X GET "repos/$REPO/contents/.github/workflows/phase6-g12-owner-seal-exact-c8-code-successor-no-provider.yml" -f "ref=$BR" --jq .sha)" == "8136212fc420a0ea290a8975da6c9c6e87f78a2b" ]] || hold SEAL_WORKFLOW_DRIFT
[[ "$(gh api -X GET "repos/$REPO/contents/data-collection/phase6/checkpoints/p6_g12_owner_sealed_exact_code_repin_successor_no_provider.cjs" -f "ref=$BR" --jq .sha)" == "6ee66e47b0db5dc3120713485d41c7df3b6418fe" ]] || hold SEAL_SCRIPT_DRIFT
gh api "repos/$REPO/actions/runs/45118733902" |
 jq -e '.conclusion=="success" and .run_attempt==1 and .head_branch=="phase6/20261122-g8-502-readback-evidence"' >/dev/null || hold ORIGINAL_STRICT_VALIDATOR_MISSING
DIR="$(mktemp -d "$HOME/.travnr-g12-seal-XXXXXXXX")"
chmod 700 "$DIR"
echo "P6_G12_OWNER_PRIVATE_DIR_KEEP_SECRET=$DIR" >&2
node - "$DIR" "$MAIN" "$PRIOR" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const {generateKeyPairSync,randomBytes}=require("node:crypto");
const [dir,sha,prior]=process.argv.slice(2);
const {privateKey,publicKey}=generateKeyPairSync("x25519");
fs.writeFileSync(path.join(dir,"owner-private.pem"),
 privateKey.export({format:"pem",type:"pkcs8"}),{flag:"wx",mode:0o600});
const req={schema:"v39.phase6.g12.owner-code-repin-seal-request.v1",
 mainSha:sha,historicalDigest:prior,nonce:randomBytes(16).toString("hex"),
 recipientPublicSpkiBase64:publicKey.export({format:"der",type:"spki"}).toString("base64"),
 requestedAtUtc:new Date().toISOString()};
fs.writeFileSync(path.join(dir,"request.json"),JSON.stringify(req),{flag:"wx",mode:0o600});
NODE
jq -n --arg branch "$BR" \
 --arg message "p6(g12): one-use fresh public request for exact code-only linked source successor; paid STOP OFF" \
 --arg content "$(base64 -w0 "$DIR/request.json")" \
 '{branch:$branch,message:$message,content:$content}' > "$DIR/create.json"
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" == "$MAIN" ]] || hold MAIN_DRIFT_BEFORE_PUBLIC_REQUEST
COMMIT="$(gh api -X PUT "repos/$REPO/contents/$REQUEST" --input "$DIR/create.json" --jq '.commit.sha')" ||
 hold UNKNOWN_PUBLIC_REQUEST_ACK_DO_NOT_REPEAT
[[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]] || hold PUBLIC_REQUEST_ACK
printf '{"status":"P6_G12_FRESH_OWNER_PUBLIC_ENCRYPTION_REQUEST_COMMITTED_ONLY_NO_PAID_GO","requestCommit":"%s","privateMaterialRetainedByOwner":true,"providerCalls":0,"databaseWrites":0,"productionSecretWrites":0,"paidGo":false}\n' "$COMMIT"
