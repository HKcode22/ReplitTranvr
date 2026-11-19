#!/usr/bin/env bash
# Owner-local post-commissioning Phase5 FREEZE materialization only.
# Requires the genuine reviewer decision input and exact completed workpaper.
# No DB/provider/secret/GitHub mutation and no Phase6 paid GO.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
FREEZE_BLOB="607886ff73c1c342873d66820ca16be18f803210"

hold(){ printf 'HOLD_P5_FINAL_FREEZE_ONCE: %s\n' "$1" >&2; exit 2; }

[[ -n "${P5_FINAL_REVIEW_DIRECTORY:-}" ]] || hold "REVIEW_DIRECTORY_REQUIRED"
[[ -n "${P5_FINAL_FREEZE_REVIEWER_INPUT:-}" ]] || hold "FREEZE_REVIEWER_INPUT_REQUIRED"
[[ -f "$P5_FINAL_FREEZE_REVIEWER_INPUT" ]] || hold "FREEZE_REVIEWER_INPUT_MISSING"
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"

LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold "MAIN_READ_FAILED"
[[ "$LIVE" =~ ^[a-f0-9]{40}$ ]] || hold "MAIN_INVALID"

DIR="$(node - "$P5_FINAL_REVIEW_DIRECTORY" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const p=path.resolve(process.argv[2]),s=fs.lstatSync(p);
if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)process.exit(2);
process.stdout.write(fs.realpathSync(p));
NODE
)" || hold "PRIVATE_REVIEW_DIRECTORY"

ROOT="$(pwd -P)"
[[ "$DIR" != "$ROOT" && "$DIR" != "$ROOT"/* ]] || hold "REVIEW_DIRECTORY_INSIDE_WORKSPACE"
OUT="$DIR/exact-final-commissioning-${LIVE:0:12}"
[[ -d "$OUT" ]] || hold "COMMISSIONING_OUTPUT_DIRECTORY_MISSING"
WORK="$OUT/final-freeze-review-workpaper-NOT-APPROVED.json"
[[ -f "$WORK" ]] || hold "FINAL_FREEZE_WORKPAPER_MISSING"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

gh api "repos/$REPO/git/blobs/$FREEZE_BLOB" --jq '.content' |
  base64 --decode > "$TMP/freeze.cjs" || hold "FREEZE_HELPER_FETCH_FAILED"
[[ "$(git hash-object "$TMP/freeze.cjs")" == "$FREEZE_BLOB" ]] || hold "FREEZE_HELPER_HASH_MISMATCH"
node --check "$TMP/freeze.cjs" >/dev/null || hold "FREEZE_HELPER_SYNTAX"

# Both workpaper and reviewer decision are private canonical JSON inputs.
node - "$WORK" "$P5_FINAL_FREEZE_REVIEWER_INPUT" <<'NODE' || exit 2
const fs=require("node:fs");
for(const p of process.argv.slice(2)){
 const raw=fs.readFileSync(p),x=JSON.parse(raw);
 if(!Buffer.from(JSON.stringify(x)).equals(raw)){
  console.error("HOLD_P5_FINAL_FREEZE_ONCE_NONCANONICAL_INPUT");
  process.exit(2);
 }
}
NODE

node "$TMP/freeze.cjs" "$WORK" "$P5_FINAL_FREEZE_REVIEWER_INPUT" > "$TMP/final-freeze.json" ||
  hold "FREEZE_REVIEW_REFUSED"

node - "$TMP/freeze.cjs" "$WORK" "$TMP/final-freeze.json" "$LIVE" <<'NODE' || exit 2
const fs=require("node:fs");
const mod=require(process.argv[2]);
const work=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));
const raw=fs.readFileSync(process.argv[4]),decision=JSON.parse(raw);
if(!Buffer.from(JSON.stringify(decision)).equals(raw))throw Error("NONCANONICAL_FREEZE_OUTPUT");
mod.validateDecision(work,decision,Date.now());
if(decision.reviewedMainSha!==process.argv[5]||decision.phase6PaidGo!==false||
   decision.finalSchedulerRepinApproved!==true||
   decision.separatePhase6PaidGoRequired!==true)
 throw Error("FREEZE_MAIN_OR_SCOPE");
NODE

DEST="$OUT/approved-final-phase5-freeze.json"
if [[ -e "$DEST" ]]; then
  cmp -s "$TMP/final-freeze.json" "$DEST" || hold "EXISTING_FREEZE_DECISION_DIFFERS_NO_OVERWRITE"
else
  install -m 600 "$TMP/final-freeze.json" "$DEST"
fi

SHA="$(sha256sum "$DEST" | awk '{print $1}')"
printf '{"status":"P5_FINAL_PHASE5_FREEZE_MATERIALIZED_PRIVATE_NO_PAID_GO","main":"%s","freezeSha256":"%s","path":"%s","providerCalls":0,"databaseWrites":0,"githubMutations":0,"phase6PaidGo":false}\n' "$LIVE" "$SHA" "$DEST"
