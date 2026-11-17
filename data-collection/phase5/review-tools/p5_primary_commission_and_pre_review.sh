#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace"
REPO='HKcode22/ReplitTranvr'
PRE='f6f1d880e57c6ec62da12360fe00f434bcd5f7a3'
TEST='3cad176af12a5d1b046c011b4266fd6185934bdd'
COMMISSION='b8a48ece29a7a0045a2a0b7e8e5e9a42a878b0a0'
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fetch_verified() {
  local blob="$1" digest="$2" path="$3"
  gh api "repos/$REPO/git/blobs/$blob" --jq '.content' | base64 --decode > "$path"
  test "$(git hash-object "$path")" = "$blob"
  printf '%s  %s\n' "$digest" "$path" | sha256sum -c -
}
fetch_verified "$PRE" 'f2548ba9e2c8548bcedc2542b9b0a4a6327628f27a63467cdbc155fdcee2540a' "$TMP/p5_pre_retention_field_inventory.cjs"
fetch_verified "$TEST" 'c1b492aab7f39b8fb3a85ac96d7a96ac8dd1b0b0202d76a341f10cb828ae58df' "$TMP/p5_pre_retention_field_inventory.test.cjs"
fetch_verified "$COMMISSION" '8332cdb55ca4562eb553d43306ae75893a32a3e176ec25be5af6ede96fc381a9' "$TMP/commission.sh"
node --check "$TMP/p5_pre_retention_field_inventory.cjs"
node --test "$TMP/p5_pre_retention_field_inventory.test.cjs"
bash -n "$TMP/commission.sh"
echo '=== PRE FIELD INVENTORY: READ ONLY; ALL ZERO FIELD COUNTS OMITTED ==='
env -u AERODATABOX_API_KEY -u AERODATABOX_WEBHOOK_SECRET -u RAPIDAPI_KEY \
  node "$TMP/p5_pre_retention_field_inventory.cjs" | node -e '
  const x=JSON.parse(require("node:fs").readFileSync(0,"utf8"));
  if(x.status!=="PRE_FIELD_INVENTORY_REVIEW_ONLY_NO_GO"||x.providerCalls!==0||x.databaseWrites!==0||x.fieldValuesExported!==false||x.phase6PaidGo!==false)process.exit(2);
  for(const h of x.horizons)h.fields=h.fields.filter(f=>f.entries!==0);
  x.zeroEntryFieldGroupsOmitted=true;
  console.log(JSON.stringify(x));'
echo '=== EXISTING ONE-TIME RETENTION COMMISSIONING ==='
echo 'Do not repeat if previously commissioned or if an earlier attempt has an ambiguous result.'
bash "$TMP/commission.sh"
