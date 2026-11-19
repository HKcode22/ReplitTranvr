# November 18 Pacific — six-policy owner-local input recovery correction

Owner command using assembler blob 616960797f5f2d91f7a57e644a2f54c6a349d364 passed script hash and syntax, then returned HOLD_P5_PRIVATE_POLICY_EXISTING_PRIVATE_INPUT_NOT_FOUND. That code only accepted an old Nov16 review-only.json and exact timezone catalog in the same .phase5-review-* directory. Actual prior recovery of the current unsigned manifest used a different directory layout. The generic error did not prove which file was absent, whether its bytes differed, or whether its permissions were unacceptable. No subsequent policy output or production write followed the error.

Replacement blob **3402d8c11b5c3d333b4fd216ca5398f1c4ae92c6**, SHA256 **3d796d44190a73db32441c6b82b924016df63398206af5a8939ccbba5b6230fd**, review commit 94e41be93c514748334e11e1d21315057b4a1937, leaves production main 70580b3749544dfcbeff39da181b2aa42b1b4476 unchanged.

- Search only bounded project-private directories under existing owner HOME, without following symlinks or relaxing permissions. Manifest and config must be exact matching files together; catalog is independently located by its original SHA256, regardless of the private directory holding it.
- Retain the already verified date-independent 31-row selection projection obtained from actual historical GitHub Actions artifact 14212961986 (archive SHA256 53ad64037ab06194e6f4d4e2f40e91e07e0d42cb0acc44ffabdc545c576a8ff5). Projection SHA256 4b298ed185aab5938f8de32c3a80231ccc1069a00359ffb55df67d11a9548cfe, aggregate selection scope ce9bd17c2011564dd6c9d941acfdb0eee47bf18e6a503b10f4353f588ca5bd38; 19 fixed airports and 12 ordinary adaptive cells. Only date-independent selection fields, not seeds, private catalog, credentials or raw flight data are embedded. Cross-check all 31 fixed sets and anchors against the existing compact receipt. This reuses the earlier full-calendar proof; it is not a new calendar or airport draw.
- If the exact manifest/config candidate really cannot be located, invoke the already used hash-pinned original offline recovery/rebind helper and compare expected bytes. Otherwise do not reconstruct it.
- If the original local timezone catalog is truly unavailable among inspected private paths, reuse original scoped timezone retry helper (blob 7adbd255fae4aa1921a8489dcecf10d903541bab) on current existing production DATABASE_URL in a strictly READ ONLY transaction, with the original frame/reference guards, distinct runtime credential check, existing KTEB exclusion, and exact prior output digest/1017 airports/168 groups. Write recovered local file only if its hash exactly equals 4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534. No changed catalog accepted; no DB write. No DB connection when existing catalog is found.
- Actual exact fetched replacement source parses under V8; eight checks passed using mocked filesystem and a separately implemented SHA256 checked against a known test vector: exact historical projection, exact scope digest, counts, distinct private-directory locations, matching catalog lookup, different file count, missing manifest separate from existing catalog, all 31 actual compact fixed sets. Native Node independently reproduced original scope digest from real downloaded historical archive. Full owner execution and DB-fallback execution remain unobserved here. Refusal/recovery is intentionally narrow, not another production inventory.

Owner command (one invocation):
```bash
cd ~/workspace
bash <<'P5_SIX_POLICY_RECOVER'
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
BLOB=3402d8c11b5c3d333b4fd216ca5398f1c4ae92c6
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP/assemble.cjs"
test "$(git hash-object "$TMP/assemble.cjs")" = "$BLOB"
printf '%s  %s\n' '3d796d44190a73db32441c6b82b924016df63398206af5a8939ccbba5b6230fd' "$TMP/assemble.cjs" | sha256sum -c -
node --check "$TMP/assemble.cjs"
curl -fsSL --proto '=https' --max-time 90 'https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json' > "$TMP/contract.json"
env -u NODE_OPTIONS node "$TMP/assemble.cjs" "$TMP/contract.json"
P5_SIX_POLICY_RECOVER
```

Returned receipt distinguishes EXISTING_EXACT vs RECOVERED_EXACT for manifest and EXISTING_EXACT vs RECOVERED_EXACT_PRIOR_BYTES_READONLY for catalog. No private data printed. Six policy workpaper and exact public contract saved in current private candidate folder. No change to paid flags, AUTH, source rights or science decisions. 
