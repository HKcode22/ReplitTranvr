# Phase 5 — Nov 12 B0062 initial calendar + disabled authorization + V0079 UTC REST budget stage

**Status:** CODE REVIEW, NO PRODUCTION INSTALL. This is a proposed, reusable **single restricted, atomic, inert** cold-start writer, **not** a real signed calendar or provider-account rights proof, and **not** Phase5 scientific FREEZE or Phase6 paid GO.

## Actual input problem that this closes *at code level*

[The owner’s real Nov12 15:27Z Neon readback](2026-11-12_ACTUAL_ZERO_ROW_COLD_START_INACTIVE_AUTHORIZATION_BEFORE_V0082_BUDGET_FREEZE.md) recorded existing B0062/V0079/V0082/queue tables and roles, but **zero configured Phase6 rows**. Earlier [#601](https://github.com/HKcode22/ReplitTranvr/pull/601) corrected a V0082 freeze order bug: REST categories must be prepared while Phase6 authorization is **disabled**. [#602](https://github.com/HKcode22/ReplitTranvr/pull/602) established a **pure cost-only** full-31-day source-slot budget, because the genuine 21 ordinary-day airport identities **must remain unknown** until each future DB-clock draw; the old strict Stage22 exact-flight grid cannot be used as a fake pre-GO all-ICAO plan.

New [`phase5B0062InertCalendarUtcBudgetStage_v39.mjs`](../../server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs) is a narrowly scoped **candidate DB writer** for the exact physically empty first-stage tables. It does **not** replace the exact-source Stage22/v0082 review, nor treat a candidate SHA or user approval as source rights.

## What the writer requires

A pre-existing, **independently reviewed, dated** 31-parent-day B0062 input: five complete crossover pairs, same four reviewed sites per pair replay, valid paired UTC slot/weekday class, 24h known-paired-site **END→START** washout, 21 ordinary days with **no** prechosen four-airport set, 26×4h/3×2×2h/2×up-to-6h, 20/5/6 chronological split, and six UTC start slots. Real ordinary-day washout still must be enforced at each later prospective draw. The previously derived corrected five pair candidates and their independent treatment-order seed **must be reviewed and pinned**; this code does not generate or sign them.

The exact same 31 dates/shapes must match the already implemented pure #602 source-slot budget, with **7 explicit REST categories per physical UTC charge date**, actual provider range/prices, bounded pagination/refreshes, cycle ceiling and protected floor. The code demands the existing V0079 fixed **2 REST units per physical FIDS GET**, an independently signed **stage packet digest** and budget-envelope digest, and complete Alert safety values. All such input rights, prices, and hashes **remain externally unverified** in production until a real reviewer supplies evidence.

The database port is intentionally restricted to a **new, separately commissioned** `phase5_b0062_prelaunch_stage_...` login. The production role **has not been created by this PR**. At execution, the writer demands the exact current and session actor, actual `neondb`, primary PostgreSQL, READ WRITE only for one single transaction, SELECT rights for B0062/V0079/V0082 structural cold start, INSERT only on **four** staging tables, **no UPDATE/DELETE/TRUNCATE**, and no raw FIDS/population data rights. It rejects any nonempty/partial Phase6 configuration globally, a too-close first T−24h/early-draw cutoff, and every repeat attempt. A failed SQL insert rolls back all four table families, including on the last actual UTC date.

## Exactly what one successful transaction would create (after separate release review)

| Table | Prelaunch rows | Why |
| --- | ---: | --- |
| `clean.adb_phase6_calendar_day` | 31 | Future dated/paired/region/UTC shapes, 21 ordinary airport identities still unselected |
| `clean.adb_phase6_authorization` | 1, **enabled=false** | A matching inert, nonrevoked authorization identity; never a paid GO |
| `clean.phase5_fids_cycle_budget_v39` | 1 | Reviewed cycle REST cap, five non-FIDS category envelope, protected floor |
| `clean.phase5_fids_utc_charge_budget_v39` | one per *actual* physically chargeable UTC date | Per-date REST cap and non-FIDS reservation; may include pre-Day1 |

**Explicitly zero:** `phase5_fids_day_budget_v39` (requires real `early_draw_sha256`), V0079 source-query/physical attempt/original-binding rows, V0082 seven-category **freeze/release** rows, V0083 reservations, PRE snapshots, Flight Alerts, provider GETs. Importantly, one calendar batch-day is **not** the same thing as one physical charge date.

The returned `INERT_31_DAY_CALENDAR_DISABLED_AUTH_AND_UTC_REST_STAGED_NO_GO` is a database-write **receipt**, **not** independent science or operational authorization. Ambiguous COMMIT is quarantined pending independent READ ONLY audit; do not blindly rerun the installer.

## Disposable tests and unfinished production work

A new **no-provider GitHub PostgreSQL 16** test reuses the repository's real boot B0062 and existing V0079/V0082 DDL, creates a synthetic **non-superuser** staging role, and tests invalid prospective calendar, invented ordinary airport, missing REST charge day, wrong actor, injected failure on the final UTC ledger row, all-or-nothing legitimate insert, **enabled=false** readback, and replay refusal. Its test airports/dates/provider limits are **synthetic only** and are **not permissible production input**.

**Still required before any Neon run:**
- Independently dated/signed actual B0062 31-day packet and review of known paired-site viability, treatment order, seasonality, and strict first-day lead; retain rolling *earliest feasible* start, do not intentionally wait until an arbitrary Nov24 example.
- Authentic current AeroDataBox source GET range, page/refresh timing, price and account limits; provider Content ML-use/retention/expiry, remaining 5 REST categories, distinct Alert balance and STOP proof. Do not block safe offline work waiting on vendor email, but cannot assert rights that lack evidence.
- Review and commission only the new narrowly scoped prelaunch writer role/credential, plus an exact hash-pinned **one-use owner launcher**. That is separate future work. **Do not run a generic script against `DATABASE_URL` now.**
- Independently READ ONLY verify 31 B0062 days, disabled authorization, complete actual physical UTC V0079 cycle ledger. Then separately review the **V0082** cost-envelope/real-airport strict-identity reconciliation and freeze categories before paid GO; #602's symbolic slot budget cannot be presented to the existing Stage22 all-ICAO release writer as if it were actual flights.
- After independent Phase5 science FREEZE and **separate Phase6 GO**, genuine early draws bind real flight airports and per-day `early_draw_sha256`, prospective T24/T6/T90 sources/witness, later POST and STOP; no post-cutoff PRE backfill.

**Source of truth:** GitHub main after PR merge, not this feature branch alone. **No migration reinstall, Source login smoke, real Neon writes, provider calls or new paid commitments in this PR.** Phase5 scientific **HOLD**, Phase6 paid **NO-GO**.
