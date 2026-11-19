#!/usr/bin/env bash
# Refresh private final-core review aids after a genuine source-use evidence
# record + ledger append has been committed on an evidence-only main.
# No approval, DB/provider call, secret write, or paid GO.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BASE="70580b3749544dfcbeff39da181b2aa42b1b4476"
LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json"
REFRESH_BLOB="6bea6dae3e212a2886487f5167690410ea676f24"
MECHANICAL_BLOB="961277944f7aa1edd75248f965b62249e6c19465"
CLOSURE_BLOB="0d4170f5e9822a2bf3a6e7dff0845a0b4a2cc440"
OLD_LEDGER_BLOB="bdfed63588475f90149a61b0d7cae13ec51cffa9"

hold(){ printf 'HOLD_P5_SOURCE_REFRESH_ONCE: %s\n' "$1" >&2; exit 2; }
[[ -n "${P5_FINAL_REVIEW_DIRECTORY:-}" ]] || hold "REVIEW_DIRECTORY_REQUIRED"
[[ "${P5_SOURCE_EVIDENCE_COMMIT:-}" =~ ^[a-f0-9]{40}$ ]] || hold "SOURCE_COMMIT_REQUIRED"
[[ "${P5_SOURCE_EVIDENCE_ID:-}" =~ ^(RUN|GATE|AUTH|ISS|DEC)-[0-9]{8}-[0-9A-Z]+$ ]] || hold "SOURCE_ID_REQUIRED"
[[ "${P5_SOURCE_EVIDENCE_PATH:-}" =~ ^data-collection/phase5/evidence/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.json$ ]] || hold "SOURCE_PATH_REQUIRED"
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"

LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold "MAIN_READ_FAILED"
[[ "$LIVE" =~ ^[a-f0-9]{40}$ ]] || hold "MAIN_INVALID"

# Both source evidence commit and live main must be evidence-only descendants of BASE.
for REF in "$P5_SOURCE_EVIDENCE_COMMIT" "$LIVE"; do
  while IFS= read -r changed; do
    [[ -n "$changed" ]] || continue
    case "$changed" in
      "$LEDGER") ;;
      data-collection/phase5/evidence/*.json|data-collection/phase5/evidence/*.md) ;;
      *) hold "NON_EVIDENCE_MAIN_DRIFT" ;;
    esac
  done < <(gh api "repos/$REPO/compare/$BASE...$REF" --jq '.files[].filename')
done
STATUS="$(gh api "repos/$REPO/compare/$P5_SOURCE_EVIDENCE_COMMIT...$LIVE" --jq '.status')" || hold "ANCESTRY_READ_FAILED"
[[ "$STATUS" == "ahead" || "$STATUS" == "identical" ]] || hold "SOURCE_COMMIT_NOT_ANCESTOR_OF_LIVE_MAIN"

DIR="$(node - "$P5_FINAL_REVIEW_DIRECTORY" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const p=path.resolve(process.argv[2]),s=fs.lstatSync(p);
if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)process.exit(2);
process.stdout.write(fs.realpathSync(p));
NODE
)" || hold "PRIVATE_REVIEW_DIRECTORY"
ROOT="$(pwd -P)"
[[ "$DIR" != "$ROOT" && "$DIR" != "$ROOT"/* ]] || hold "REVIEW_DIRECTORY_INSIDE_WORKSPACE"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fetch_blob(){
 local b="$1" p="$2"
 gh api "repos/$REPO/git/blobs/$b" --jq '.content' | base64 --decode > "$p" || hold "BLOB_FETCH_FAILED"
 [[ "$(git hash-object "$p")" == "$b" ]] || hold "BLOB_HASH_MISMATCH"
}
fetch_commit_file(){
 local ref="$1" p="$2" out="$3"
 gh api "repos/$REPO/contents/$p?ref=$ref" --jq '.content' | base64 --decode > "$out" || hold "COMMIT_FILE_FETCH_FAILED"
}

fetch_blob "$REFRESH_BLOB" "$TMP/refresh.cjs"
fetch_blob "$MECHANICAL_BLOB" "$TMP/mechanical.json"
fetch_blob "$CLOSURE_BLOB" "$TMP/closure.json"
fetch_blob "$OLD_LEDGER_BLOB" "$TMP/old-ledger.json"
node --check "$TMP/refresh.cjs" >/dev/null || hold "REFRESH_SYNTAX"

fetch_commit_file "$P5_SOURCE_EVIDENCE_COMMIT" "$LEDGER" "$TMP/new-ledger.json"
fetch_commit_file "$P5_SOURCE_EVIDENCE_COMMIT" "$P5_SOURCE_EVIDENCE_PATH" "$TMP/source-evidence.json"

node - "$TMP/new-ledger.json" "$TMP/source-evidence.json" "$P5_SOURCE_EVIDENCE_ID" "$P5_SOURCE_EVIDENCE_PATH" <<'NODE' || exit 2
const fs=require("node:fs"),crypto=require("node:crypto");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const lr=fs.readFileSync(process.argv[2]),l=JSON.parse(lr),er=fs.readFileSync(process.argv[3]),e=JSON.parse(er);
if(Buffer.from(JSON.stringify(l,null,2)+"\n").compare(lr)!==0)throw Error("LEDGER_NOT_CANONICAL");
const row=l.evidence.find(x=>x.evidenceId===process.argv[4]);
if(!row||row.path!==process.argv[5]||row.sha256!==sha(er))throw Error("SOURCE_ROW_OR_HASH");
if(e?.schema!=="v39.phase5.genuine-source-use-review-evidence.v1"||e.independentSourceUseApproved!==true||e.phase6PaidGo!==false)throw Error("SOURCE_EVIDENCE_SCOPE");
NODE

OUT="$DIR/final-core-source-evidence-refresh-${P5_SOURCE_EVIDENCE_COMMIT:0:12}"
if [[ -e "$OUT" ]]; then
  [[ -d "$OUT" ]] || hold "REFRESH_OUTPUT_NOT_DIRECTORY"
  hold "REFRESH_OUTPUT_ALREADY_EXISTS_RECONCILE"
fi

node "$TMP/refresh.cjs"   "$TMP/mechanical.json"   "$TMP/closure.json"   "$TMP/old-ledger.json"   "$TMP/new-ledger.json"   "$P5_SOURCE_EVIDENCE_COMMIT"   "$P5_SOURCE_EVIDENCE_ID"   "$OUT" || hold "REFRESH_REFUSED"

printf '{"status":"P5_FINAL_CORE_SOURCE_EVIDENCE_REFRESH_PRIVATE_NO_GO","sourceEvidenceCommit":"%s","sourceEvidenceId":"%s","directory":"%s","providerCalls":0,"databaseWrites":0,"githubMutations":0,"phase6PaidGo":false}\n'   "$P5_SOURCE_EVIDENCE_COMMIT" "$P5_SOURCE_EVIDENCE_ID" "$OUT"
