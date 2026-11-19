#!/usr/bin/env bash
# Materialize a genuine reviewer-authored source-use evidence record plus an
# updated scoped evidence ledger locally. Does not commit, approve AUTH, touch
# the DB/provider, write secrets, arm collection, or enable paid GO.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BASE="70580b3749544dfcbeff39da181b2aa42b1b4476"
LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json"
MATERIALIZER_BLOB="480970e85b123ef35895cd696b9ea198fb856012"
EVIDENCE_HEAD="a4b385907149f5b99ef8f85a11c554c583707916"
EVIDENCE_LEDGER_BLOB="bdfed63588475f90149a61b0d7cae13ec51cffa9"

hold(){ printf 'HOLD_P5_SOURCE_USE_REVIEW_ONCE: %s\n' "$1" >&2; exit 2; }
[[ -n "${P5_SOURCE_REVIEWER_INPUT:-}" && -f "$P5_SOURCE_REVIEWER_INPUT" ]] || hold "REVIEWER_INPUT_REQUIRED"
[[ "${P5_SOURCE_EVIDENCE_ID:-}" =~ ^(RUN|GATE|AUTH|ISS|DEC)-[0-9]{8}-[0-9A-Z]+$ ]] || hold "EVIDENCE_ID_REQUIRED"
[[ "${P5_SOURCE_EVIDENCE_PATH:-}" =~ ^data-collection/phase5/evidence/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.json$ ]] || hold "EVIDENCE_PATH_REQUIRED"
[[ -n "${P5_SOURCE_OUTPUT_DIRECTORY:-}" ]] || hold "OUTPUT_DIRECTORY_REQUIRED"
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

OUT="$(node - "$P5_SOURCE_OUTPUT_DIRECTORY" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const p=path.resolve(process.argv[2]);
if(fs.existsSync(p))process.exit(2);
const parent=path.dirname(p),s=fs.lstatSync(parent);
if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)process.exit(2);
process.stdout.write(p);
NODE
)" || hold "OUTPUT_DIRECTORY_SCOPE"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$MATERIALIZER_BLOB" --jq '.content' | base64 --decode > "$TMP/materializer.cjs" || hold "FETCH_FAILED"
[[ "$(git hash-object "$TMP/materializer.cjs")" == "$MATERIALIZER_BLOB" ]] || hold "MATERIALIZER_BLOB"
node --check "$TMP/materializer.cjs" >/dev/null || hold "MATERIALIZER_SYNTAX"
# Source-use evidence extends the exact final evidence-review ledger, not
# production main's older 12-record ledger. Verify the evidence head itself is
# evidence-only relative to the frozen executable base before using it.
while IFS= read -r changed; do
  [[ -n "$changed" ]] || continue
  case "$changed" in
    "$LEDGER") ;;
    data-collection/phase5/evidence/*.json|data-collection/phase5/evidence/*.md) ;;
    *) hold "EVIDENCE_HEAD_NON_EVIDENCE_DRIFT" ;;
  esac
done < <(gh api "repos/$REPO/compare/$BASE...$EVIDENCE_HEAD" --jq '.files[].filename')

ACTUAL_LEDGER_BLOB="$(gh api "repos/$REPO/contents/$LEDGER?ref=$EVIDENCE_HEAD" --jq '.sha')" ||
  hold "EVIDENCE_LEDGER_IDENTITY_READ_FAILED"
[[ "$ACTUAL_LEDGER_BLOB" == "$EVIDENCE_LEDGER_BLOB" ]] ||
  hold "EVIDENCE_LEDGER_BLOB_MISMATCH"

gh api "repos/$REPO/contents/$LEDGER?ref=$EVIDENCE_HEAD" --jq '.content' |
  base64 --decode > "$TMP/ledger.json" || hold "LEDGER_FETCH"

node "$TMP/materializer.cjs"   "$TMP/ledger.json"   "$P5_SOURCE_REVIEWER_INPUT"   "$P5_SOURCE_EVIDENCE_ID"   "$P5_SOURCE_EVIDENCE_PATH"   "$OUT" || hold "MATERIALIZER_REFUSED"

printf '{"status":"P5_SOURCE_USE_EVIDENCE_LOCAL_PACKAGE_READY_NOT_COMMITTED_NO_GO","liveMain":"%s","evidenceHead":"%s","evidenceLedgerBlob":"%s","evidenceId":"%s","evidencePath":"%s","directory":"%s","providerCalls":0,"databaseWrites":0,"githubMutations":0,"phase6PaidGo":false}\n' \
  "$LIVE" "$EVIDENCE_HEAD" "$EVIDENCE_LEDGER_BLOB" "$P5_SOURCE_EVIDENCE_ID" "$P5_SOURCE_EVIDENCE_PATH" "$OUT"
