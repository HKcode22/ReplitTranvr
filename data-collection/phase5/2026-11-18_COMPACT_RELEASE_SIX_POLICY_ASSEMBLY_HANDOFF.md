# Phase 5 — compact release executable policy handoff (Nov 18 Pacific)

Continuation of #413 and current exact production main `70580b3749544dfcbeff39da181b2aa42b1b4476`. The review branch deliberately does not advance main or disrupt its existing scheduler/cleanup pins. This is actual offline engineering evidence, not a scoped AUTH or a production stage.

## Completed in this continuation

- Recovered the real original GitHub Actions review ZIP (artifact 14212961986, SHA256 53ad64037ab06194e6f4d4e2f40e91e07e0d42cb0acc44ffabdc545c576a8ff5). Native Node reproduced the original calendar, changed dates only per the committed compact receipt, and exactly reproduced the compact calendar and the airport scope (19 fixed ICAOs, 12 adaptive MID/REGIONAL cells). The original private timezone mapping therefore covers the same selection scope, provided its original exact private bytes are reused.
- Recompiled all 31 SOURCE plans from recovered calendar/shape/timing: 31/31 raw Git blob identities match current main, 6,144 query templates, 2,048 per horizon, 144 partition/slot groups, max 288/day. Independently reproduced all 38 UTC budget dates, 266 category rows, 37,388 reserved units, max 1,280/day. No reseeding, new paid retrieval, retrospective time assignment or arbitrary airport removal. The existing crossover window digest was obtained from the committed current day-6 plan, not independently rederived. Evidence: commit e215fe8695e21fc1b5e881a5053c7dca18010222.
- Five previous policy shapes omitted native PRE feature use, later/T24 native review and custody, and the distinct sixth POST policy. All six review-only shapes now appear in commit aa668cc310a326884912b911fe977f4fba682f1b; actual existing six public signer identities reused, no new keys or roles. All substantive approval booleans stay false and unresolved evidence digests stay null. Daily policy estimated candidate size with private catalog under 21,050 bytes (limit 35,000); actual size checked by owner script.
- Exact official public AeroDataBox OpenAPI v1.15.4.0 advertises GET /flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}. It does not certify actual-only gate-out labels, account price/range or training/retention rights. Raw public contract bytes could not be downloaded in the chat container; owner downloads without provider credentials and retains exact bytes with their SHA256 privately. Proposed internal application version P6-FIDS-CD-v39-20261119 is an application label, not a provider guarantee.
- Explicit proposed policy bounds (not independently approved): 96h operational private packet retention, max index revision 1024, 2700s population staleness, POST 3600s followup/1200s dispatch window, two units per GET. Validity must cover the entire approved horizon and outcome tail. These are not changes to original 24h raw TTL or permissions.
- Cost identity correction: actual V0093 writer places the exact same `costOnlyCategoryDraftSha256` into reviewed_category_budget_sha256 and reviewed_cost_envelope_sha256. Do not substitute category rows SHA a49720f28ce10019ee049436086e1734ac6ee2ec0f24189621aab2e32583ad6a or coverage grid SHA 371ce938669dc4c0ec8723d89f58c44507900c3eb18306f5ed7de56f6a95539b. In COST_UPPER_BOUND mode the exact source-grid field remains null.

## One existing-owner command — no new DB query or key handling

Run in the established Replit owner shell where the previously verified .phase5-review-* and .phase5-final-review-* directories reside. This supersedes the earlier five-policy assembly, not a production workflow. It does not select/modify secrets, dispatch Actions, write the DB, call paid endpoints or authorize any operation.

```bash
cd ~/workspace
bash <<'P5_SIX_POLICY_LOCAL'
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
BLOB=616960797f5f2d91f7a57e644a2f54c6a349d364
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP/assemble.cjs"
test "$(git hash-object "$TMP/assemble.cjs")" = "$BLOB"
printf '%s  %s\n' '4134d806a7e07805667567e2f6c2c8cc05fb85b56c52825618d62e7f2f7c5375' "$TMP/assemble.cjs" | sha256sum -c -
node --check "$TMP/assemble.cjs"
curl -fsSL --proto '=https' --max-time 90 'https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json' > "$TMP/contract.json"
node "$TMP/assemble.cjs" "$TMP/contract.json"
P5_SIX_POLICY_LOCAL
```

Output: exact non-runtime six-policy candidate `policy-complete-shape-NOT-RUNTIME.json` and `public-provider-contract-CANDIDATE.json` in the existing private candidate directory, both mode 0600; only redacted digest/count receipt printed. No raw mapping or provider content pasted into chat. Existing identical files are safely reused; changed existing files are refused. Native Node 22.16.0 syntax checked against exact Git blob; 15/15 core cases (real calendar and synthetic catalog/contract positive and negative checks) and 6/6 durable write checks pass. No full owner-private end-to-end execution took place here because the private files and owner environment are not present in this chat.

## Existing final release sequence (no new gate)

1. Genuine explicit scientific/operational/rights/account review inputs and final manifest bytes; native and POST scopes reviewed; current account/STOP evidence. Maintain original conditional T6 actual gate-out, T90 paired update, T24 comparator and distinct airborne ETA. No provider rights claim from silence; support follow-up remains separate. Final evidence and AUTH use existing scoped ledger binding, not candidates.
2. Reuse existing exporter with COMPACT_NOV21 and actual reviewed inputs, separately bind final main and approved manifest. Compile exact canonical stage and V0093 cost envelope once. Approved manifest stored at existing clean.adb_collection_meta key. No new schema or database.
3. Exact finalized six policy byte payloads, corresponding protected SHA values and existing key aliases, review and install under the same final manifest/calendar/config/frame/rights/release/code pins. No use of the current candidate digest or false approval switches as if final.
4. Existing B0062 calendar workflow with confirmation STAGE_EXACT_31_DAY_CALENDAR_DISABLED_AUTH_NO_PROVIDER, actual independent calendar readback. Existing V0093 seven-category cost workflow with separate cost/rights review and confirmation STAGE_EXACT_SEVEN_COST_UPPER_BOUNDS_DISABLED_AUTH_NO_PROVIDER, actual independent full readback. Keep authorization disabled and paid flags off. Never replay unknown commit.
5. Existing owner exact authorization transition only when verified scoped AUTH and final manifest and current account/STOP plus exact live stage/readback; separate paid dispatch authorization remains required. First planned SOURCE Nov 19 23:45 UTC / 15:45 Pacific, strict enable before 23:10 UTC / 15:10 Pacific. Existing target operational wake 14:00 Pacific. No promise that the deadline can be met absent actual review.

No production main changed, no DB writes, no secrets uploaded, no paid provider call, no scoped approval fabricated. This handoff closes the concrete compact-scope and missing policy-structure work, not actual owner-private release commissioning.
