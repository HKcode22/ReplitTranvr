# Phase 5 — V0083 installed; live READ ONLY critical-path inventory

**Owner-provided production evidence:** 2026-11-07 23:56 PST (Nov 8 UTC). This page supersedes older “V0082 / V0083 NOT DEPLOYED” headings **for the physical schema installation only**. The historical original docs and locked implementation log are retained.

## 1. Production V0083 is now installed and already verified; NEVER replay it

The owner ran the immutable Git-blobs handoff `scripts/phase5_v0083_replit_single_line_owner_once.sh` at merged main SHA `31f0fc61c680aed31a7d2553266f85ec06d95e43`, shell Git blob `79cd092b3727a2215c0e9f6faf6860d77758d86e`. Its printed JSON reported the exact SQL blob `a5e1e9df39ec9b436f0576245f375985a69a3b71`, `status=V0083_EMPTY_OTHER_REST_SCHEMA_AND_SPLIT_NOLOGIN_ROLES_INSTALLED_INERT`, 2 new tables, 1 index, 2 functions, 2 triggers, preserved SOURCE V0082 trigger semantics, separate REST reviewer/reserver NOLOGIN groups, zero runtime LOGIN/members, zero budget/review/source/physical GET rows, zero paid AeroDataBox requests or Alerts, no source-rights clearance/FREEZE/Phase6 GO. Subsequent **second database connection** reported `V0083_INDEPENDENT_SECOND_CONNECTION_READONLY_PASS` and final `V0083_OWNER_VERIFIED_INSTALLED_NO_PROVIDER_CALL; DO_NOT_RUN_AGAIN`.

See issue [#416 Nov 8 owner installation checkpoint](https://github.com/HKcode22/ReplitTranvr/issues/416#issuecomment-6718992883). This is **owner-reported live production evidence**, not an independent GitHub Actions query of current Neon. Do not reinstall V0079, V0080, V0081, V0082, V0083 or their already commissioned worker credentials.

## 2. Live exact-table inventory: only aggregate PostgreSQL counts, no new purchase

The code `scripts/v39_phase5_final_freeze_readonly_release_inventory_once.mjs` performs a single `REPEATABLE READ READ ONLY` transaction on the owner's existing `DATABASE_URL` PostgreSQL16 `neondb` **primary**, and ROLLBACK. It touches **metadata and COUNT(*) only** for 16 named calendar/source/category/physical-reservation/witness tables and reads the existence of exactly seven NOLOGIN groups. It does **not** select flight rows, source Contents, API keys, tokens, record IDs, secrets, tenant IDs, or unexpired/expired blobs. Does not call AeroDataBox, RapidAPI, ADSB.lol or mutate a database.

The wrapper `scripts/phase5_final_freeze_readonly_owner_launcher.sh` is delivered as one short immutable Git-blob command **after all new exact-head CI checks and postmerge main `offline-safety` pass**. It also checks that the target source file SHA is exact on current main. Outputs `PHASE5_OWNER_READONLY_INVENTORY_SUCCESS_NO_PROVIDER_NO_DB_WRITES` only when readback succeeds. No retries or user API-key copy/paste needed.

**How to interpret its output:**
- `tableRowCounts.calendar` counts physically present `adb_phase6_calendar_day` rows: even 31 rows do **not** prove the expected signed actual schedule, 26/3/2 shapes, randomized five crossover pairings, provider coverage or unique four-per-day airport identities.
- `sourceSevenRestRelease`, `sourceCategoryCaps`, `sourceUtcCategoryBudget` are durable plan **row counts**, not a legal spending license, verified account-specific REST unit price or actually paid GET.
- `sourcePhysicalAttempt`, `sourceOriginalBinding`, `independentT24Witness` are actual record-class **counts**, not certified native operated-flight entities or complete independent 3-horizon PRE/POST.
- `phase6AuthorizationEnabled` reads a real database flag but **NEVER** counts as scientific or licensed Phase6 GO; it must remain unarmed until a separate reviewed start.
- `blockers` intentionally always includes legal/content, cross-system pipeline and independent FREEZE checks that a single database COUNT cannot resolve. `0` source/witness rows is an observed count for these exact tables at this readback, **not** proof that historical Phase4 flight cohorts do not exist elsewhere. Missing optional sources are `null`, not false zero.

## 3. Authoritative known AeroDataBox facts — do not ask owner again

Account evidence [Gate 0 Sep 10](../evidence/early-gates/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json) and issue [#300 Nov7 readback](https://github.com/HKcode22/ReplitTranvr/issues/300#issuecomment-6705065125): grandfathered RapidAPI Team Ultra historical $32 renewal, 60,000 subscribed API units, owner-reported **59,968/60,000 units and 1,830 Alerts** at 2026-11-07 09:00Z, zero active Alerts at that time. Historical September opening 2,900 Alert credits, project cycle 50k cap. **Do not repeatedly ask the user for these facts.** Future balance/limit checks only if materially necessary should use one reviewed Replit Shell API-key-backed FREE metadata-only command, not require RapidAPI dashboard access. Provider terms/ML use of normalized Content and actual expiry/backup class still require independent review (#300); old quota is not a license.

## 4. Real remaining Phase 5 exit work, not new Stage-N

- **A:** Approve specific lawful source-use/retention design and a prospective first-cycle target (currently proposal Amendment D). Historical full physical wheels-off Gate5 remains HOLD, Nov6 FIDS-only schedule-change pilot is valid only narrowly and should not be repeated.
- **B:** Freeze one executable actual signed 31 **batch-day** schedule, 26×4h/3×2x2h/2×up-to6h, five exploratory crossover pair assignments, 4 selected airports/day prospectively at least 24h+lead, source request grid with validated actual provider range, all seven REST unit categories and separate Alert floor/STOP. Existing pure CANDIDATE solver and source-grid tests are not real committed dates.
- **C:** Real reviewed GitHub-only timed SOURCE→T24 PRE/witness→T6/T90 PRE→same-cohort POST and receiver/STOP custody, not an extra redundant source-only purchased probe.
- **D:** One independent signed scientific Phase5 FREEZE, followed later by a **separate** Phase6 paid activation decision. No scripted report or production SQL migration substitutes for these scientific proofs.

Owner approval for paid calls already exists, but **no paid call is needed to perform the above readonly inventory**. Do not mislabel an account subscription balance as legal rights and do not rerun finished installers.