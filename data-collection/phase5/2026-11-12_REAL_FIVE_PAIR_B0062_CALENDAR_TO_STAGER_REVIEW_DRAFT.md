# Nov 12 — Build B0062 31-day calendar *review draft* from existing five actual paired sites

**State: CODE CANDIDATE ONLY.** No real Phase6 calendar is independently signed. No Neon writes; no new provider request; no fabricated ordinary MID/REGIONAL sites; no user Shell action now.

## Why add this after the #604 production-region correction

The existing [actual five-pair B0062 owner snapshot](evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json) establishes 5 *candidate*, already-corrected paired four-airport sets and six real geographic regions (19 unique airports; KBUF corrected, KTEB excluded). The existing `phase5Prospective31DayShapeEnvelope_v39.ts` proves **provisional** 31-day date/shapes and independent-seed-claim parity, but neither component alone produces the 31 database-shaped B0062 calendar row objects accepted by [`phase5B0062InertCalendarUtcBudgetStage_v39.mjs`](../../server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs).

Instead of recreating pair solvers, [`phase5RealFivePairB0062CalendarOnlyDraft_v39.ts`](../../server/lib/disruption/phase5RealFivePairB0062CalendarOnlyDraft_v39.ts) calls the preexisting **real** five-pair date/shape algorithm. It binds the actual 10 pair-day sites into nested exact `{icao,region}` B0062 JSON, maps the 21 ordinary-day `pairAirportSet=null`, the 31 26/3/2 time shapes, crossover pair IDs, 6 UTC start slots and 20/5/6 evaluation partitions. It calls the **exact same pure 31-day/known-anchor/paired-site/washout validator** as the PR #604 production stager rather than introducing different scientific geometry rules.

The function **cannot choose** a real experiment's treatment assignment, any future airport in ordinary MID_A/MID_B/REGIONAL, any provider quota or usage permission. The input must supply:
- The unchanged corrected Nov9 owner packet, an **explicit prospective first UTC date** (not Nov24 by default), and externally claimed independent treatment seed/commitment. A claimed seed/receipt is not independent witness proof.
- Exactly **21** predeclared ordinary-day **HUB anchor + four real region cells**. The four eligible HUBs are WSSS/OMAA/SKBO/YSSY, with literal `Asia-Pacific/Gulf-Africa/South America/Oceania` mappings; the 24h known HUB washout is checked across **all 31 dates**. The other three ordinary airport identities remain unselected.
- Exactly **31** externally frozen, distinct SHA256 per-day regional draw seeds. Do not copy one seed across all dates; no PR-generated randomized source decisions or user-account entropy claims.
- An informative `assembledAtUtc` string only. Real independent git/DB timestamps and signed release SHA remain separate.

It emits **`REAL_FIVE_PAIR_31_DAY_CALENDAR_ROWS_DRAFT_NOT_SIGNED`**, calendar rows + deterministic review digest, and all the correct false evidence flags. It does not supply `manifestSha256`, B0062 `calendarSha256`, V0079 cost categories, provider rights or a B0062 enabled authorization. The next production review combines this shape-only draft with *real independently reviewed* #602/#605 seven-category UTC cost bounds and separate credentials. Do **not** treat this as a finished Stage603 signed input or live calendar.

## Tests and safety

Dedicated nonpaid CI loads the actual archived B0062 corrected owner JSON by SHA (not fictitious ICAO/region names) and uses separately designated synthetic future dates, external-like but **not independently witnessed** treatment/draw seeds and illustrative ordinary HUB-region plans. It verifies 31 shapes, five genuine frozen pair sites, 21 NULL future ordinary site sets, six official region strings, malformed/missing/duplicate seeds, made-up airport rejection, archived pair tamper rejection, 24h known-HUB validation and explicit NO-GO. Source rights, actual flight population and current account quota are unproven. No SQL is executed. No existing Source worker, V0079–V0092 schema or login requires reinstallation.

## Remaining concrete work

1. Assemble *genuinely reviewed* calendar/region rotation, independent prospectively committed seed and earliest feasible UTC date; do not pass illustrative test values.
2. Complete genuine current provider GET range/cost/account balance and each five non-FIDS REST category reservation/rights; read-only account check may be useful but source login was already proven.
3. Type the reviewed date/shape plan into #603 Stage candidate and pure #605 cost-only cap candidate, then commission exact narrow stager/one-use owner after scientific review. Verify **disabled** B0062 auth and exact UTC ledger with independent read-only Neon.
4. Do not feed unknown ordinary airport placeholders to old Stage22 exact-source V0082 writer or weaken its installed equality trigger; an additive typed prelaunch cost-only release and exact after-draw query admission remain distinct needed engineering.
5. Scientific Phase5 FREEZE HOLD / Phase6 paid GO NO until independent evidence; no fabricated retrospective PRE or external paid booking.

**Main source of truth** is repository main after CI/merge. GitHub candidate hash is a fingerprint, not a signed permit.
