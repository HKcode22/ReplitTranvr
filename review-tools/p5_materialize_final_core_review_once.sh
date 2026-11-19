#!/usr/bin/env bash
# Owner-local final-core review materialization only.
# Requires a genuine reviewer decision input. No DB/provider/GitHub mutation.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
MAIN="70580b3749544dfcbeff39da181b2aa42b1b4476"
MATERIALIZER_BLOB="7f417fe38eda6082e6448264456af6c3c3b04707"
CORE_VALIDATOR_BLOB="c9adb783f29103fdfdd118472cbcc4d4910374ce"
MECHANICAL_BLOB="961277944f7aa1edd75248f965b62249e6c19465"
CLOSURE_BLOB="0d4170f5e9822a2bf3a6e7dff0845a0b4a2cc440"
LEDGER_BLOB="bdfed63588475f90149a61b0d7cae13ec51cffa9"

hold(){ printf 'HOLD_P5_FINAL_REVIEW_ONCE: %s\n' "$1" >&2; exit 2; }

[[ -n "${P5_FINAL_REVIEW_DIRECTORY:-}" ]] || hold "REVIEW_DIRECTORY_REQUIRED"
[[ -n "${P5_FINAL_REVIEWER_INPUT:-}" ]] || hold "REVIEWER_INPUT_REQUIRED"
[[ -f "$P5_FINAL_REVIEWER_INPUT" ]] || hold "REVIEWER_INPUT_FILE_MISSING"
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"

LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold "MAIN_READ_FAILED"
[[ "$LIVE" == "$MAIN" ]] || hold "MAIN_CHANGED_REVIEW_REQUIRED"

DIR="$(node - "$P5_FINAL_REVIEW_DIRECTORY" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const p=path.resolve(process.argv[2]),s=fs.lstatSync(p);
if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)process.exit(2);
process.stdout.write(fs.realpathSync(p));
NODE
)" || hold "PRIVATE_REVIEW_DIRECTORY"
[[ "$DIR" != "$(pwd -P)" && "$DIR" != "$(pwd -P)"/* ]] || hold "REVIEW_DIRECTORY_INSIDE_WORKSPACE"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fetch_blob(){
  local blob="$1" out="$2"
  gh api "repos/$REPO/git/blobs/$blob" --jq '.content' |
    base64 --decode > "$out" || hold "FETCH_FAILED"
  [[ "$(git hash-object "$out")" == "$blob" ]] || hold "BLOB_HASH_MISMATCH"
}

fetch_blob "$MATERIALIZER_BLOB" "$TMP/materializer.cjs"
fetch_blob "$CORE_VALIDATOR_BLOB" "$TMP/core.cjs"

if [[ -n "${P5_FINAL_CORE_REFRESH_DIRECTORY:-}" ]]; then
  REFRESH_DIR="$(node - "$P5_FINAL_CORE_REFRESH_DIRECTORY" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const p=path.resolve(process.argv[2]),s=fs.lstatSync(p);
if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)process.exit(2);
process.stdout.write(fs.realpathSync(p));
NODE
)" || hold "REFRESH_DIRECTORY_INVALID"
  [[ "$REFRESH_DIR" != "$(pwd -P)" && "$REFRESH_DIR" != "$(pwd -P)"/* ]] ||
    hold "REFRESH_DIRECTORY_INSIDE_WORKSPACE"
  for pair in     "final-core-mechanical.json:$TMP/mechanical.json"     "final-core-closure.json:$TMP/closure.json"     "source-enable-ledger.json:$TMP/ledger.json"     "refresh-receipt.json:$TMP/refresh-receipt.json"
  do
    src="${pair%%:*}"; dst="${pair#*:}"
    [[ -f "$REFRESH_DIR/$src" && ! -L "$REFRESH_DIR/$src" ]] || hold "REFRESH_FILE_MISSING"
    cp "$REFRESH_DIR/$src" "$dst"
  done
  node - "$TMP/mechanical.json" "$TMP/closure.json" "$TMP/ledger.json" "$TMP/refresh-receipt.json" <<'NODE' || exit 2
const fs=require("node:fs"),crypto=require("node:crypto");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
const mb=fs.readFileSync(process.argv[2]),cb=fs.readFileSync(process.argv[3]),lb=fs.readFileSync(process.argv[4]),rr=fs.readFileSync(process.argv[5]);
const m=JSON.parse(mb),c=JSON.parse(cb),l=JSON.parse(lb),r=JSON.parse(rr);
if(Buffer.from(JSON.stringify(m,null,2)+"\n").compare(mb)!==0||
   Buffer.from(JSON.stringify(c,null,2)+"\n").compare(cb)!==0||
   Buffer.from(JSON.stringify(l,null,2)+"\n").compare(lb)!==0||
   Buffer.from(JSON.stringify(r)).compare(rr)!==0)throw Error("REFRESH_NONCANONICAL");
if(r.schema!=="v39.phase5.final-core-source-evidence-refresh-receipt.v1"||
   r.evidenceCommit!==m.evidenceCommit||c.evidenceCommit!==m.evidenceCommit||
   r.mechanicalSha256!==sha(mb)||r.closureSha256!==sha(cb)||r.ledgerSha256!==sha(lb)||
   m.ledgerBlob!==gitBlob(lb)||r.predecessorCount!==m.draftReview?.predecessorEvidenceIds?.length||
   l.evidence?.length!==r.predecessorCount||m.draftReview?.independentSourceUseApproved!==false||
   m.draftReview?.sourceRightsEvidenceSha256!==null)
 throw Error("REFRESH_IDENTITY");
NODE
else
  fetch_blob "$MECHANICAL_BLOB" "$TMP/mechanical.json"
  fetch_blob "$CLOSURE_BLOB" "$TMP/closure.json"
  fetch_blob "$LEDGER_BLOB" "$TMP/ledger.json"
fi

node --check "$TMP/materializer.cjs" >/dev/null || hold "MATERIALIZER_SYNTAX"
node --check "$TMP/core.cjs" >/dev/null || hold "CORE_VALIDATOR_SYNTAX"

# Reviewer input itself must already be canonical JSON bytes.
node - "$P5_FINAL_REVIEWER_INPUT" <<'NODE' || exit 2
const fs=require("node:fs");
const p=process.argv[2],raw=fs.readFileSync(p),x=JSON.parse(raw);
if(!Buffer.from(JSON.stringify(x)).equals(raw)) {
  console.error("HOLD_P5_FINAL_REVIEW_ONCE_REVIEWER_INPUT_NOT_CANONICAL");
  process.exit(2);
}
NODE

node "$TMP/materializer.cjs"   "$TMP/mechanical.json"   "$TMP/closure.json"   "$TMP/ledger.json"   "$P5_FINAL_REVIEWER_INPUT" > "$TMP/review.json" ||
  hold "MATERIALIZER_REFUSED"

# Exercise the exact production review validator before any private write.
node - "$TMP/core.cjs" "$TMP/review.json" <<'NODE' || exit 2
const fs=require("node:fs");
const core=require(process.argv[2]);
const raw=fs.readFileSync(process.argv[3]);
const x=JSON.parse(raw);
if(!Buffer.from(JSON.stringify(x)).equals(raw)) throw Error("NONCANONICAL_OUTPUT");
core.validateReview(x,Date.now());
console.log(JSON.stringify({
  status:"P5_FINAL_CORE_REVIEW_VALIDATED_PRIVATE_WRITE_PENDING",
  authorizationId:x.authorizationId,
  evidenceCommit:x.evidenceCommit,
  phase6PaidGo:x.phase6PaidGo
}));
NODE

OUT="$DIR/reviewed-final-core-scope-decisions.json"
if [[ -e "$OUT" ]]; then
  cmp -s "$TMP/review.json" "$OUT" || hold "EXISTING_REVIEW_DIFFERS_NO_OVERWRITE"
else
  install -m 600 "$TMP/review.json" "$OUT"
fi

SHA="$(sha256sum "$OUT" | awk '{print $1}')"
printf '{"status":"P5_FINAL_CORE_REVIEW_MATERIALIZED_PRIVATE_NO_GO","reviewSha256":"%s","path":"%s","providerCalls":0,"databaseWrites":0,"githubMutations":0,"phase6PaidGo":false}\n' "$SHA" "$OUT"
