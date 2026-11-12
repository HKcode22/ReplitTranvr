# November 12 — Phase5→Phase6: real UTC REST charge-day coverage (existing owner inventory, not another setup)

**Purpose:** distinguish “seven REST categories exist in PostgreSQL” from “each real UTC charge day in the 31-batch-day source plan has all seven budget categories.” This repairs a concrete prelaunch false positive in the **preexisting** release inventory; it does not add a migration, paid collector, login verification, provider GET, or Phase6 GO.

## The problem

V0079 stores per-source charge-day ceilings in `clean.phase5_fids_utc_charge_budget_v39`. V0082 stores **seven distinct immutable category allocations per actual UTC charge day** in `clean.phase5_fids_utc_rest_category_budget_v39`: FIDS base, split, retry, validation, outcome, history bootstrap and diagnostics. The latter has foreign key `(manifest_sha256,charge_day_utc)` to V0079 charge budget; the **physical source reservation transaction** explicitly checks `COUNT(*)=7` for its charged UTC date.

The older [production release inventory](../../scripts/v39_phase5_final_freeze_readonly_release_inventory_once.mjs) merely saw `sevenRestRelease=1`, `categoryCaps=7`, `sourceUtcCategoryBudget>0` and reported no category-budget structural HOLD. **A single UTC date containing seven category rows could pass this check while the remaining prospective charge days had no budget.** The real 31-day pipeline would therefore fail on its first unfunded UTC date. T−24h may incur charges on *Day−1*, not the date of the flight-service window.

## Concrete repair

The same existing inventory now issues **one read-only aggregate** over the V0079 charge-date budget and V0082 seven-category ledgers: for each `(manifest_sha256,charge_day_utc)`, `COUNT(category)` and `COUNT(DISTINCT category)`; then summarize total funded UTC dates, days with exactly seven categories, missing/incomplete days and total category rows. Also check one V0079 cycle budget row and at least **31 actual charge-day envelopes** for this 31-day all-horizon plan; 32 or more dates are valid when additional Day−1/Day+1 dates are needed. **Do not assert exactly 32 dates** or infer the four adaptive airport identities in advance.

The inventory reports new **`physicalUtcChargeDayCategoryCoverage`** alongside the prior counts. When the full matrix is not present it emits `FULL_31_DAY_UTC_CHARGE_CATEGORY_COVERAGE_NOT_PROVEN` in **prelaunchStructuralHolds**. It still does not require Day1 source GET, sampling draw, FIDS original, T24 witness or POST **before GO**; those are recorded separately as post-GO observations.

All SQL runs inside PostgreSQL 16 `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, checks `neondb` and DB read-only state, performs only aggregate budget ledger reads, and ends `ROLLBACK`. No raw flight Contents, flight IDs, secret values or paid provider calls are read. The existing privileged owner-only launcher pins **the new exact inventory Git blob**; no bypassed signature check.

## Tests and what they prove

The existing metadata-only tests now cover: (1) one-day false positive (7 rows) must HOLD; (2) 31 charge days with one missing category (216 of 217 rows) must HOLD; (3) complete 31-day and 32-day funded matrices are structurally acceptable; (4) a fully prepared matrix **does not** grant scientific FREEZE, account ML-use permission or paid Phase6 GO; and (5) all other prior absent-schema, independent role, source/PRE, no data-write and replica refusals remain.

This is a **prelaunch ledger structure** check, not proof that the provider plan really includes 50,000 monthly API units, that 1,900 actual daily units are available in a particular account, that Alert SEND credits are in the same billing pool, that signed 31-day requests match category/physical date budgets, or that ML source use is lawful. It remains necessary to review the actual account/provider contract and independent signed request/source and source-use receipt. A GREEN test is not a real Neon readback.

## Next owner's decisive real-state action

After CI and merge to `main`, the **already existing** `scripts/phase5_final_freeze_readonly_owner_launcher.sh` is the one Replit Shell command for a **current actual 31-day launch-readiness inventory**:

```bash
cd ~/workspace
bash scripts/phase5_final_freeze_readonly_owner_launcher.sh
```

This launcher verifies repository, exact reviewed script blob, `main` ancestry/CI and separate `DATABASE_URL`/`V39_DATABASE_RUNTIME_URL`, then pulls the exact pinned script from GitHub and runs aggregate SQL. The local launcher must be the **current merged version**, not an old Replit working-directory copy; if local checkout is stale, use an independently verified reviewed GitHub blob rather than `git pull` or changing DB roles blindly. If the owner lacks environment variables, report `HOLD`, do not print credentials.

Use the resulting `prelaunchStructuralHolds` and `phase6Day1EvidencePendingAfterGo` to distinguish **what must be completed before releasing Phase6** from **what will only appear after Day1 actually begins**. Existing production SOURCE login already passed Nov8 and Nov12 role privileges; **do not repeat these checks**. V0087–V0092 are already live-installed inert—do not rerun migrations.

**Current state pending owner readback and independent approval:** Phase5 scientific FREEZE HOLD / paid Phase6 GO NO.
