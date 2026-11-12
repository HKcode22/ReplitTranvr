# Phase 5 — November 12 real six-region B0062 staging admission and known-HUB 24h washout

**Status:** proposed code correction, no production writes, no provider call, no Phase5 FREEZE, no paid Phase6 GO.

## Concrete production evidence mismatch found after PR #603

The real [November 9 corrected five-pair owner readback](evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json) preserves the actual frozen B0062 region strings: **`Asia-Pacific`, `Europe`, `Gulf/Africa`, `North America`, `Oceania`, `South America`**. The initial #603 staging writer had been exercised with fixture-like names `FIXTURE_REGION` / `FIXTURE_MIDA` and erroneously enforced `/^[A-Z0-9_-]{2,40}$/`, rejecting **valid live paired source inputs** containing lowercase, hyphens, slashes or spaces.

The corrected writer now accepts **only the six exact real source-frame region names**, not a permissive free-form string, and validates the **four known HUB anchor ↔ region** pairs:

| Fixed HUB | Genuine B0062 region |
| --- | --- |
| OMAA | Gulf/Africa |
| WSSS | Asia-Pacific |
| SKBO | South America |
| YSSY | Oceania |

It preserves all four regional slots and existing nested `{icao,region}` paired-airport frozen JSON shapes, rejects inconsistent HUB region and invented/fake region names, and does not rewrite the immutable owner frame or reselect KTEB/KBUF.

## Another scientific error prevented: ordinary-day HUB anchors are already known

The 21 ordinary days' *MID_A*, *MID_B* and *REGIONAL* choices are **unknown until their prospective independent early draws**. But the B0062 calendar contains an explicit `anchor_icao` for **every one of the 31 future parent days**, including those 21 ordinary days.

Therefore the initial #603 code was too narrow when it checked only ten known paired days for 24h airport END→START washout. Example of real risk: Pair5 uses SKBO, the immediately following ordinary day can be scheduled only four hours after Pair5 ends; if its frozen anchor were also SKBO, the 24h repeat constraint would be violated before any ordinary-day adaptive draw could rectify it.

The corrected validator now records the known HUB anchor exposure on **every parent day**, checks strict 24h END→START washout across *all* ordinary and paired days, and separately checks fixed paired MID/REGIONAL sites across both crossover periods. It deliberately does **not** claim to prevalidate the unknown ordinary MID/REGIONAL selections: that remains the early-draw owner's DB-clock washout responsibility.

## Independent regression now anchored in actual repo source data

The existing disposable PostgreSQL16 atomic staging test reads the **archived Nov9 corrected owner JSON directly** and checks its frozen selected-airport SHA, reusing all five real pairs and their six actual region labels. Dates, independent randomization, source budgets, role, database, treatment and alert parameters remain **deliberately synthetic and clearly not production-authorizing**. The tests now reject fake regions, actual-HUB/wrong-region mismatches, wrong paired regional bindings, and an ordinary-day SKBO 24h washout violation, while retaining rollback/replay/disabled-authorization/no-GET assurances.

This is more informative than repeating synthetic `FIXTURE_REGION` checks, but **a green test is still not real calendar or provider source population coverage evidence**. The [Nov12 initial staging checkpoint](2026-11-12_B0062_INERT_PRELAUNCH_CALENDAR_UTC_BUDGET_ATOMIC_STAGING.md) remains valid after this correction; the writer still requires authentic prospective 31-day calendar/treatment and financial/rights review before any exact role commissioning or one-use live staging.

No new migration; no V0079–V0092 reinstall; no SOURCE re-login test; no Neon write; no FIDS/Alert paid spend. **Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.**
