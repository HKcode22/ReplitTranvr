# Phase5→Phase6 — Nov 12 real Neon cold-start and PRE-LAUNCH budget freeze order

**Real owner-run inventory (actual PostgreSQL 16 `neondb`, 2026-11-12T15:27:03.825Z UTC):**

- `missingTables=[]` for all 16 required Phase5/6 table classes. All seven restricted NOLOGIN roles present.
- `tableRowCounts`: calendar **0**, sampling draw **0**, Phase6 authorization **0**, V0079 source/budget/query/bind **0**, V0082 seven-category release/caps/UTC categories **0**, V0083 REST reservations **0**, independent T24 witness **0**. This proves a real uninitialized Phase6 configuration, **not** absence of earlier Phase2–4 evidence.
- `physicalUtcChargeDayCategoryCoverage={ledgerDays:0,categoryRows:0,completeDays:0,incompleteDays:0,allLedgerDaysHaveSevenCategories:false}`. Prelaunch structural holds: `ACTUAL_SIGNED_31_BATCH_DAY_CALENDAR_NOT_PROVEN`, `SEVEN_CATEGORY_SOURCE_BUDGET_NOT_FROZEN`, `FULL_31_DAY_UTC_CHARGE_CATEGORY_COVERAGE_NOT_PROVEN`.
- `phase6AuthorizationEnabled=false`; the table is **empty**—this is different from a prepared authorization row with `enabled=false`.
- Source GETs, first-day four-airport draws, PRE/witness, POST are **post-GO** observations and must not be demanded before paying for Day1. Previously verified SOURCE login Nov8 and SOURCE table privileges Nov12 need **no repetition**.
- `providerCalls=0`, `databaseWrites=0`. Nonfatal Node `pg` future SSL-mode warning.

## Production sequencing defect fixed here — one narrower, existing writer

The already-present [V0082 seven-category budget freeze writer](../../server/lib/disruption/phase5V0082SevenCategoryBudgetFreezeWriter_v39.ts) previously required `clean.adb_phase6_authorization.enabled=true` **before** it would create the full charge-day budget. This inverted the safe prelaunch sequence: an enabled authorization is the paid Phase6 start switch, whereas a seven-category budget is a prelaunch prerequisite.

A single code-level correction changes the writer's admission to:

```sql
SELECT manifest_sha256, calendar_hash, config_hash, enabled, revoked_at_utc
FROM clean.adb_phase6_authorization
WHERE singleton_key = true;
-- REQUIRE exactly one reviewed matching row, enabled = FALSE,
-- revoked_at_utc IS NULL; missing/mismatched/ALREADY-ENABLED fails closed
```

**This does not INSERT the pending authorization itself, and does not relax any other approval.** The V0082 writer still requires a signed independent full Stage22 budget packet, 31 prospective calendar rows, actual physical UTC charge-day V0079 budget ledgers, exact prior budget matching, separate seven REST category caps, restricted budget writer role/ACL and atomic `SERIALIZABLE` transaction. Once these prelaunch inputs are independently reviewed and frozen, a **separate** approved Phase6 GO can enable the existing single authorization row; an arbitrary owner approval or a SHA alone is insufficient.

[Real disposable PostgreSQL16 tests](../../tests/phase5_v0082_seven_rest_freeze_owner_pg16_v39.test.ts) now stage a matching **disabled** authorization for the real 31-day fixture, require V0082 input freeze before paid GO, refuse an already enabled or revoked authorization, refuse wrong role/excess grants, prove an injected late-row failure rolls back release plus categories, then prove one legitimate immutable full-day freeze and replay refusal. All test calendar/UTC prices remain synthetic and **must never** be copied into production as real budgets.

## Correct release order — do NOT confuse this with actual Phase6 start

1. **Independent scientific and source-use review.** Agree on one canonical Amendment E target and what authentic *physical* departure label can be measured; review licensed AeroDataBox Contents treatment/ML purpose, 7-day/default/actual retention and expiry, actual permitted provider FIDS range and cost. Previous Phase4 real schedule-version PRE/POST is valid for its narrower source-timing evidence and should be reused.
2. **Compose and sign a genuinely future 31-batch-day B0062 calendar + single matching inactive authorization record.** Use existing corrected five pair sets, 21 ordinary-day future airport IDs **UNKNOWN until prospective early adaptive draws**, actual dates after readiness, 26×4h / 3×2x2h / 2×up-to-6h assignment, 20/5/6 protected chronological split, six UTC slots, 24h washout and strict T24 lead. Do not treat the old Nov24→Jan5 demonstration dates as release plan. This stage may create calendar rows and the **disabled** authorization after independent review; it must not enable workers, commit early draws or call the provider.
3. **Prepare signed V0079 REST budget input** (one manifest cycle ceiling ≤50K, 31 service day budget rows, physical UTC charge-day budgets including any Day−1 pre-service GET), then freeze V0082's seven REST categories per real UTC charge date **before** enabling Phase6. Non-FIDS categories and Alert SEND spend remain distinct; the protected sample budget must reflect actual current provider account facts rather than 60K marketing entitlement.
4. **Independent read-only full-calendar and seven-category ledger readback** using the existing [Phase5 release inventory](../../scripts/v39_phase5_final_freeze_readonly_release_inventory_once.mjs), enhanced by [PR #600](https://github.com/HKcode22/ReplitTranvr/pull/600) to check every actual physical UTC day has exactly seven categories. An aggregate `blockers=[]` is still NOT legal/scientific GO.
5. **One independently documented Phase5 FREEZE; separate Phase6 paid GO**; only then enable authorization/approved GitHub source/early draw/queued T24/T6/T90/POST/watchdog workers, monitor actual Day1 source/flight PRE/POST quality and STOP. Do not silently backfill missed horizons or interpret `disabled` staging as authorization to pay.

## Engineering status / what still needs implementation or owner data

- Code correction **does not instantiate a signed, real production B0062 calendar, inactive authorization or the V0079 cycle/day/UTC REST ledgers**. They are still empty at the timestamped owner inventory. Those exact **prelaunch content/writer steps** and external scientific/license and budget proof remain concrete tasks.
- Do not reinstall V0079–V0092. Do not repeat SOURCE credentials/ACL proof. Do not manufacture 31 day calendar rows, implied period rights, permissions or charge-day prices from a disposable test fixture.
- The next substantive code integration is a **reviewed, inactive initial calendar/authorization + V0079 charge-day budget input installer** or reuse any existing appropriately verified entrypoint; it should be nonpaid and operate only under signed future flight plan and independent approval.
- Phase5 scientific FREEZE **HOLD** / paid Phase6 GO **NO**. A real prelaunch authorization row may exist while still `enabled=false`; this is normal. Never mark GO from synthetic CI, a spent unit allowance, a GitHub code merge or this read-only owner snapshot.
