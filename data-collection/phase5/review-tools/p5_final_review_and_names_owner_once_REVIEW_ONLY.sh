#!/usr/bin/env bash
# Recover existing owner review; GET-only current release names. No DB, paid calls or stage.
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
PIN="6f518add10d00567a95fbcaf3650ebf608da8a60"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export GH_PROMPT_DISABLED=1
for c in gh git node base64; do command -v "$c" >/dev/null || { echo "HOLD_P5_REVIEW_MISSING_$c"; exit 2; }; done
main_sha() { gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha'; }
test "$(main_sha)" = "$PIN" || { echo HOLD_P5_REVIEW_MAIN_CHANGED; exit 2; }
fetch_blob() {
 local id="$1" dest="$2"
 gh api "repos/$REPO/git/blobs/$id" --jq '.content' | base64 --decode > "$dest"
 test "$(git hash-object "$dest")" = "$id" || { echo HOLD_P5_REVIEW_BLOB_MISMATCH; exit 2; }
 case "$dest" in *.cjs) node --check "$dest";; esac
}
fetch_blob "62ffb5537748e4d50ed5c2d54be92e5d16c51814" "$TMP/recover.cjs"
fetch_blob "2b35661157b14128d3816bd929501ff97a731adb" "$TMP/names.cjs"
fetch_blob "6b626c5f34a0891d1322eb150d97456a7ed95d02" "$TMP/compact-index.json"
fetch_blob "d0097f8e8afc63f981a96c2de945339c4e498b35" "$TMP/static-names.json"
# Independent operations. A failed recovery must not suppress the name-only read.
rc=0
node "$TMP/recover.cjs" "$TMP/compact-index.json" || rc=2
node "$TMP/names.cjs" "$TMP/static-names.json" "$TMP/compact-index.json" || rc=2
test "$(main_sha)" = "$PIN" || { echo HOLD_P5_REVIEW_MAIN_CHANGED; exit 2; }
if [[ "$rc" -eq 0 ]]; then
 echo P5_EXISTING_MANIFEST_AND_CURRENT_RELEASE_NAMES_REVIEW_COMPLETE_NO_GO
fi
exit "$rc"
