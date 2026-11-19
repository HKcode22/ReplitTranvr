#!/usr/bin/env bash
# Owner-local final-core review materialization only.
# Requires a genuine reviewer decision input. No DB/provider/GitHub mutation.
# Supports BASE evidence or an exact private refresh from a genuine source-use
# evidence-only commit. Executable/runtime drift always HOLDs.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BASE="70580b3749544dfcbeff39da181b2aa42b1b4476"
LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json"
MATERIALIZER_BLOB="7f417fe38eda6082e6448264456af6c3c3b04707"
CORE_VALIDATOR_BLOB="c9adb783f29103fdfdd118472cbcc4d4910374ce"
MECHANICAL_BLOB="961277944f7aa1edd75248f965b62249e6c19465"
CLOSURE_BLOB="0d4170f5e9822a2bf3a6e7dff0845a0b4a2cc440"
LEDGER_BLOB="bdfed63588475f90149a61b0d7cae13ec51cffa9"

hold(){ printf 'HOLD_P5_FINAL_REVIEW_ONCE: %s\n' "$1" >&2; exit 2; }
[[ -n "${P5_FINAL_REVIEW_DIRECTORY:-}" ]] || hold "REVIEW_DIRECTORY_REQUIRED"
[[ -n "${P5_FINAL_REVIEWER_INPUT:-}" && -f "$P5_FINAL_REVIEWER_INPUT" ]] || hold "REVIEWER_INPUT_REQUIRED"
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"

LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold "MAIN_READ_FAILED"
[[ "$LIVE" =~ ^[a-f0-9]{40}$ ]] || hold "MAIN_INVALID"
if [[ "$LIVE" != "$BASE" ]]; then
  while IFS= read -r changed; do
    [[ -n "$changed" ]] || continue
    case "$changed" in
      "$LEDGER") ;;
      data-collection/phase5/evidence/*.json|data-collection/phase5/evidence/*.md) ;;
      *) hold "NON_EVIDENCE_MAIN_DRIFT" ;;
    esac
  done < <(gh api "repos/$REPO/compare/$BASE...$LIVE" --jq '.files[].filename')
fi

secure_dir(){
 node - "$1" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const p=path.resolve(process.argv[2]),s=fs.lstatSync(p);
if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)process.exit(2);
process.stdout.write(fs.realpathSync(p));
NODE
}
DIR="$(secure_dir "$P5_FINAL_REVIEW_DIRECTORY")" || hold "PRIVATE_REVIEW_DIRECTORY"
ROOT="$(pwd -P)"
[[ "$DIR" != "$ROOT" && "$DIR" != "$ROOT"/* ]] || hold "REVIEW_DIRECTORY_INSIDE_WORKSPACE"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fetch_blob(){
  local blob="$1" out="$2"
  gh api "repos/$REPO/git/blobs/$blob" --jq '.content' | base64 --decode > "$out" || hold "FETCH_FAILED"
  [[ "$(git hash-object "$out")" == "$blob" ]] || hold "BLOB_HASH_MISMATCH"
}
fetch_blob "$MATERIALIZER_BLOB" "$TMP/materializer.cjs"
fetch_blob "$CORE_VALIDATOR_BLOB" "$TMP/core.cjs"
node --check "$TMP/materializer.cjs" >/dev/null || hold "MATERIALIZER_SYNTAX"
node --check "$TMP/core.cjs" >/dev/null || hold "CORE_VALIDATOR_SYNTAX"

if [[ -n "${P5_FINAL_CORE_REFRESH_DIRECTORY:-}" ]]; then
  REFRESH="$(secure_dir "$P5_FINAL_CORE_REFRESH_DIRECTORY")" || hold "REFRESH_DIRECTORY"
  [[ "$REFRESH" == "$DIR"/final-core-source-evidence-refresh-* ]] || hold "REFRESH_DIRECTORY_SCOPE"
  for n in final-core-mechanical.json final-core-closure.json source-enable-ledger.json refresh-receipt.json; do
    [[ -f "$REFRESH/$n" && ! -L "$REFRESH/$n" ]] || hold "REFRESH_FILE_MISSING"
  done
  cp "$REFRESH/final-core-mechanical.json" "$TMP/mechanical.json"
  cp "$REFRESH/final-core-closure.json" "$TMP/closure.json"
  cp "$REFRESH/source-enable-ledger.json" "$TMP/ledger.json"
  cp "$REFRESH/refresh-receipt.json" "$TMP/refresh-receipt.json"
  node - "$TMP/mechanical.json" "$TMP/closure.json" "$TMP/ledger.json" "$TMP/refresh-receipt.json" "$LIVE" <<'NODE' || exit 2
const fs=require("node:fs"),crypto=require("node:crypto");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),C=/^[a-f0-9]{40}$/;
const [mp,cp,lp,rp,live]=process.argv.slice(2),mb=fs.readFileSync(mp),cb=fs.readFileSync(cp),lb=fs.readFileSync(lp),rb=fs.readFileSync(rp);
const m=JSON.parse(mb),c=JSON.parse(cb),l=JSON.parse(lb),r=JSON.parse(rb);
if(r?.schema!=="v39.phase5.final-core-source-evidence-refresh-receipt.v1"||r.reviewApproved!==false||r.phase6PaidGo!==false)throw Error("REFRESH_RECEIPT");
if(!C.test(r.evidenceCommit)||m.evidenceCommit!==r.evidenceCommit||c.evidenceCommit!==r.evidenceCommit)throw Error("REFRESH_COMMIT");
if(r.mechanicalSha256!==sha(mb)||r.closureSha256!==sha(cb)||r.ledgerSha256!==sha(lb))throw Error("REFRESH_HASH");
if(m.draftReview?.sourceRightsEvidenceSha256!==null||m.draftReview?.independentSourceUseApproved!==false||m.draftReview?.phase6PaidGo!==false)throw Error("REFRESH_APPROVAL_DRIFT");
if(l?.schema!=="v39.phase6.source-enable-approval-ledger.v1"||!Array.isArray(l.evidence)||!l.evidence.some(x=>x.evidenceId===r.sourceEvidenceId&&x.sha256===r.sourceRightsEvidenceSha256))throw Error("REFRESH_LEDGER");
NODE
  EVIDENCE_COMMIT="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).evidenceCommit)' "$TMP/refresh-receipt.json")"
  STATUS="$(gh api "repos/$REPO/compare/$EVIDENCE_COMMIT...$LIVE" --jq '.status')" || hold "REFRESH_ANCESTRY_READ"
  [[ "$STATUS" == "ahead" || "$STATUS" == "identical" ]] || hold "REFRESH_COMMIT_NOT_ANCESTOR"
else
  [[ "$LIVE" == "$BASE" ]] || hold "SOURCE_EVIDENCE_REFRESH_REQUIRED"
  fetch_blob "$MECHANICAL_BLOB" "$TMP/mechanical.json"
  fetch_blob "$CLOSURE_BLOB" "$TMP/closure.json"
  fetch_blob "$LEDGER_BLOB" "$TMP/ledger.json"
fi

node - "$P5_FINAL_REVIEWER_INPUT" <<'NODE' || exit 2
const fs=require("node:fs"),raw=fs.readFileSync(process.argv[2]),x=JSON.parse(raw);
if(!Buffer.from(JSON.stringify(x)).equals(raw)){console.error("HOLD_P5_FINAL_REVIEW_ONCE_REVIEWER_INPUT_NOT_CANONICAL");process.exit(2)}
NODE

node "$TMP/materializer.cjs" "$TMP/mechanical.json" "$TMP/closure.json" "$TMP/ledger.json" "$P5_FINAL_REVIEWER_INPUT" > "$TMP/review.json" || hold "MATERIALIZER_REFUSED"

node - "$TMP/core.cjs" "$TMP/review.json" <<'NODE' || exit 2
const fs=require("node:fs"),core=require(process.argv[2]),raw=fs.readFileSync(process.argv[3]),x=JSON.parse(raw);
if(!Buffer.from(JSON.stringify(x)).equals(raw))throw Error("NONCANONICAL_OUTPUT");
core.validateReview(x,Date.now());
console.log(JSON.stringify({status:"P5_FINAL_CORE_REVIEW_VALIDATED_PRIVATE_WRITE_PENDING",authorizationId:x.authorizationId,evidenceCommit:x.evidenceCommit,phase6PaidGo:x.phase6PaidGo}));
NODE

OUT="$DIR/reviewed-final-core-scope-decisions.json"
if [[ -e "$OUT" ]]; then cmp -s "$TMP/review.json" "$OUT" || hold "EXISTING_REVIEW_DIFFERS_NO_OVERWRITE"
else install -m 600 "$TMP/review.json" "$OUT"; fi
SHA="$(sha256sum "$OUT" | awk '{print $1}')"
printf '{"status":"P5_FINAL_CORE_REVIEW_MATERIALIZED_PRIVATE_NO_GO","reviewSha256":"%s","path":"%s","liveMain":"%s","providerCalls":0,"databaseWrites":0,"githubMutations":0,"phase6PaidGo":false}\n' "$SHA" "$OUT" "$LIVE"
