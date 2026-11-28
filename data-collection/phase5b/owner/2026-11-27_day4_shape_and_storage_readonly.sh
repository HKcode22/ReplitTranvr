#!/usr/bin/env bash
# I124/T118 exact previously CI-tested owner inventory; no deploy or provider.
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
BLOB="ee80cdf0a299ecf9203a93f66a40a0f4bbe628dc"
P5B_TMP="$(mktemp -d)"
trap 'rm -rf "$P5B_TMP"' EXIT
test -n "${DATABASE_URL:-}"
test "$(gh api user --jq '.login')" = "HKcode22"
node -e 'require("pg")'
gh api "repos/$REPO/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$P5B_TMP/inventory.mjs"
test "$(git hash-object "$P5B_TMP/inventory.mjs")" = "$BLOB"
node --check "$P5B_TMP/inventory.mjs"
node "$P5B_TMP/inventory.mjs" --native-shape-day=4
node "$P5B_TMP/inventory.mjs"
