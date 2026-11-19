#!/usr/bin/env bash
# Canonical owner-local materialization of genuine downstream reviewer decisions.
# Modes: POLICY, PRIVATE, STATIC. Final FREEZE uses the dedicated live-main wrapper. No DB/provider/secret/GO mutation.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BASE="70580b3749544dfcbeff39da181b2aa42b1b4476"
POLICY_BLOB="2c2f45efad55b12d595773dd51b07e27d7a43b61"
PRIVATE_BLOB="27100b8a67d2ecdd50c39eabf338a72d8982c48a"
STATIC_BLOB="6bfa98eb3e75fd1136e86a28ab0b7e4c9c5bb2e8"

hold(){ printf 'HOLD_P5_DOWNSTREAM_REVIEW_ONCE: %s\n' "$1" >&2; exit 2; }
[[ -n "${P5_REVIEW_MODE:-}" ]] || hold "MODE_REQUIRED"
[[ -n "${P5_FINAL_REVIEW_DIRECTORY:-}" ]] || hold "REVIEW_DIRECTORY_REQUIRED"
[[ -n "${P5_REVIEWER_INPUT:-}" && -f "$P5_REVIEWER_INPUT" ]] || hold "REVIEWER_INPUT_REQUIRED"
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"
LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold "MAIN_READ_FAILED"
[[ "$LIVE" =~ ^[a-f0-9]{40}$ ]] || hold "MAIN_INVALID"
LIVE12="${LIVE:0:12}"

# Final-core AUTH approval is an evidence-only main transition. Downstream
# reviews must follow that live reviewed main rather than hard-pin the old
# executable base. Any executable/runtime drift remains a hard HOLD.
if [[ "$LIVE" != "$BASE" ]]; then
  while IFS= read -r changed; do
    [[ -n "$changed" ]] || continue
    case "$changed" in
      data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json) ;;
      data-collection/phase5/evidence/*.json|data-collection/phase5/evidence/*.md) ;;
      *) hold "NON_EVIDENCE_MAIN_DRIFT" ;;
    esac
  done < <(gh api "repos/$REPO/compare/$BASE...$LIVE" --jq '.files[].filename')
fi

DIR="$(node - "$P5_FINAL_REVIEW_DIRECTORY" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const p=path.resolve(process.argv[2]),s=fs.lstatSync(p);
if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)process.exit(2);
process.stdout.write(fs.realpathSync(p));
NODE
)" || hold "PRIVATE_REVIEW_DIRECTORY"

node - "$P5_REVIEWER_INPUT" <<'NODE' || exit 2
const fs=require("node:fs"),raw=fs.readFileSync(process.argv[2]),x=JSON.parse(raw);
if(!Buffer.from(JSON.stringify(x)).equals(raw)){console.error("HOLD_P5_DOWNSTREAM_REVIEW_ONCE_REVIEWER_INPUT_NOT_CANONICAL");process.exit(2)}
NODE

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fetch_blob(){
 local b="$1" p="$2"
 gh api "repos/$REPO/git/blobs/$b" --jq '.content' | base64 --decode > "$p" || hold "FETCH_FAILED"
 [[ "$(git hash-object "$p")" == "$b" ]] || hold "BLOB_HASH_MISMATCH"
 node --check "$p" >/dev/null || hold "MATERIALIZER_SYNTAX"
}
write_once(){
 local src="$1" dest="$2"
 if [[ -e "$dest" ]]; then cmp -s "$src" "$dest" || hold "EXISTING_REVIEW_DIFFERS_NO_OVERWRITE"
 else install -m 600 "$src" "$dest"
 fi
}

case "$P5_REVIEW_MODE" in
 POLICY)
   fetch_blob "$POLICY_BLOB" "$TMP/materializer.cjs"
   node "$TMP/materializer.cjs" "$DIR" "$P5_REVIEWER_INPUT" > "$TMP/out.json" || hold "POLICY_REVIEW_REFUSED"
   DEST="$DIR/reviewed-final-policy-binding-decisions.json"
   ;;
 PRIVATE)
   fetch_blob "$PRIVATE_BLOB" "$TMP/materializer.cjs"
   node "$TMP/materializer.cjs" "$DIR" "$P5_REVIEWER_INPUT" > "$TMP/out.json" || hold "PRIVATE_REVIEW_REFUSED"
   DEST="$DIR/approved-private-policy-review.json"
   ;;
 STATIC)
   SUB="$DIR/exact-final-commissioning-$LIVE12"
   [[ -d "$SUB" ]] || hold "COMMISSIONING_DIRECTORY_MISSING"
   fetch_blob "$STATIC_BLOB" "$TMP/materializer.cjs"
   node "$TMP/materializer.cjs" "$SUB/static-install-review-workpaper-NOT-APPROVED.json" "$P5_REVIEWER_INPUT" > "$TMP/out.json" || hold "STATIC_REVIEW_REFUSED"
   DEST="$SUB/static-install-review.json"
   ;;
 *) hold "UNKNOWN_MODE" ;;
esac

node - "$TMP/out.json" <<'NODE' || exit 2
const fs=require("node:fs"),raw=fs.readFileSync(process.argv[2]),x=JSON.parse(raw);
if(!Buffer.from(JSON.stringify(x)).equals(raw)){console.error("HOLD_P5_DOWNSTREAM_REVIEW_ONCE_NONCANONICAL_OUTPUT");process.exit(2)}
NODE
write_once "$TMP/out.json" "$DEST"
SHA="$(sha256sum "$DEST" | awk '{print $1}')"
printf '{"status":"P5_DOWNSTREAM_REVIEW_MATERIALIZED_PRIVATE_NO_GO","mode":"%s","sha256":"%s","path":"%s","providerCalls":0,"databaseWrites":0,"githubMutations":0,"phase6PaidGo":false}\n' "$P5_REVIEW_MODE" "$SHA" "$DEST"
