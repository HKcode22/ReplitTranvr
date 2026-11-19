#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
PREP_BLOB="962c95907fc2c6f7f2252afbcad4df202036bc36"
COMMISSION_BLOB="29fb18a4f55300e3a1be82fcadb4204551c2c9f7"

hold(){ printf 'HOLD_P5_RIGHTS_DEFERRED_OWNER_ONCE: %s\n' "$1" >&2; exit 2; }

cd "$HOME/workspace" 2>/dev/null || hold "WORKSPACE_MISSING"
for c in gh git node base64 mktemp; do command -v "$c" >/dev/null || hold "MISSING_$c"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold "GITHUB_AUTH_MISSING"
[[ -n "${DATABASE_URL:-}" ]] || hold "OWNER_DATABASE_URL_MISSING"
[[ "${NODE_TLS_REJECT_UNAUTHORIZED:-}" != "0" ]] || hold "TLS_VERIFY_DISABLED"
[[ -x node_modules/.bin/tsx ]] || hold "PINNED_TSX_MISSING"
[[ -d node_modules/pg ]] || hold "PINNED_PG_MISSING"

[[ -z "$(git status --porcelain --untracked-files=no)" ]] || hold "TRACKED_WORKTREE_NOT_CLEAN"
git fetch origin main >/dev/null 2>&1 || hold "FETCH_MAIN_FAILED"
git switch main >/dev/null 2>&1 || hold "SWITCH_MAIN_FAILED"
git merge --ff-only origin/main >/dev/null 2>&1 || hold "MAIN_NOT_FAST_FORWARDABLE"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || hold "MAIN_NOT_CLEAN_AFTER_FAST_FORWARD"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fetch_blob(){
  local blob="$1" dest="$2"
  gh api "repos/$REPO/git/blobs/$blob" --jq '.content' |
    base64 --decode > "$dest" || hold "BLOB_FETCH_FAILED"
  [[ "$(git hash-object "$dest")" == "$blob" ]] || hold "BLOB_HASH_MISMATCH"
}

fetch_blob "$PREP_BLOB" "$TMP/prepare.cjs"
fetch_blob "$COMMISSION_BLOB" "$TMP/commission.cjs"
node --check "$TMP/prepare.cjs" >/dev/null || hold "PREPARE_SYNTAX"
node --check "$TMP/commission.cjs" >/dev/null || hold "COMMISSION_SYNTAX"

printf '%s\n' '=== Phase5 rights-deferred final preparation (no DB/provider/GitHub mutation) ==='

PREP_OUT="$(
  env     -u DATABASE_URL     -u V39_DATABASE_RUNTIME_URL     -u AERODATABOX_API_KEY     -u AERODATABOX_WEBHOOK_SECRET     -u RAPIDAPI_KEY     -u NODE_OPTIONS     ADB_AUTO_COLLECT=0     V39_PHASE6_PROCESS_ARMED=0     V39_PHASE6_OWNER_APPROVED=0     node_modules/.bin/tsx "$TMP/prepare.cjs" PREPARE_PHASE5_RIGHTS_DEFERRED_NO_GO
)" || hold "PREPARE_FAILED"

printf '%s\n' "$PREP_OUT"
PREP_DIR="$(
  printf '%s\n' "$PREP_OUT" |
    node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        const lines=s.trim().split(/\r?\n/).filter(Boolean);
        let x=null;
        for(let i=lines.length-1;i>=0;i--){try{x=JSON.parse(lines[i]);break}catch{}}
        if(!x||x.status!=="PHASE5_RIGHTS_DEFERRED_FINAL_INPUTS_PREPARED_NO_GO"||
           typeof x.directory!=="string"||!x.directory.startsWith(process.env.HOME+"/.phase5-final-review-"))
          process.exit(2);
        process.stdout.write(x.directory);
      });
    '
)" || hold "PREPARE_RECEIPT_PARSE"

[[ -d "$PREP_DIR" ]] || hold "PREPARED_DIRECTORY_MISSING"

printf '%s\n' '=== Phase5 inert production commission: manifest -> B0062 -> readback -> V0093 -> readback -> freeze ==='

env   -u V39_DATABASE_RUNTIME_URL   -u AERODATABOX_API_KEY   -u AERODATABOX_WEBHOOK_SECRET   -u RAPIDAPI_KEY   -u NODE_OPTIONS   ADB_AUTO_COLLECT=0   V39_PHASE6_PROCESS_ARMED=0   V39_PHASE6_OWNER_APPROVED=0   P5_PHASE5_COMMISSION_OWNER_APPROVED=1   P5_PHASE5_PREPARED_DIRECTORY="$PREP_DIR"   node "$TMP/commission.cjs" COMMISSION_PHASE5_RIGHTS_DEFERRED_NO_GO

printf '%s\n' 'P5_RIGHTS_DEFERRED_OWNER_ONCE_COMPLETE'
